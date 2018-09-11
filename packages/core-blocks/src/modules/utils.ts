import {
  IAccountsModel,
  IBlockLogic,
  IBlocksModel,
  IBlocksModule,
  ILogger, ISequence,
  ITransactionLogic,
  ITransactionsModel, Symbols
} from '@risevision/core-interfaces';
import { ModelSymbols } from '@risevision/core-models';
import { ConstantsType, SignedAndChainedBlockType } from '@risevision/core-types';
import { BlockProgressLogger, catchToLoggerAndRemapError } from '@risevision/core-utils';
import { inject, injectable, named } from 'inversify';
import { WordPressHookSystem } from 'mangiafuoco';
import { Op } from 'sequelize';

import { CommonHeightsToQuery } from '../hooks';

@injectable()
export class BlocksModuleUtils {

  // Generic
  @inject(Symbols.generic.genesisBlock)
  private genesisBlock: SignedAndChainedBlockType;
  @inject(Symbols.generic.hookSystem)
  private hookSystem: WordPressHookSystem;

  // Helpers
  @inject(Symbols.generic.constants)
  private constants: ConstantsType;
  @inject(Symbols.helpers.sequence)
  @named(Symbols.names.helpers.dbSequence)
  private dbSequence: ISequence;
  @inject(Symbols.helpers.logger)
  private logger: ILogger;

  // Logic
  @inject(Symbols.logic.block)
  private blockLogic: IBlockLogic;
  @inject(Symbols.logic.transaction)
  private transactionLogic: ITransactionLogic;

  // models
  @inject(ModelSymbols.model)
  @named(Symbols.models.accounts)
  private AccountsModel: typeof IAccountsModel;
  @inject(ModelSymbols.model)
  @named(Symbols.models.blocks)
  private BlocksModel: typeof IBlocksModel;
  @inject(ModelSymbols.model)
  @named(Symbols.models.transactions)
  private TransactionsModel: typeof ITransactionsModel;

  // Modules
  @inject(Symbols.modules.blocks)
  private blocksModule: IBlocksModule;

  /**
   * Loads blocks from database and normalize them
   *
   */
  public async loadBlocksPart(filter: { limit?: number, id?: string, lastId?: string }) {
    return this.loadBlocksData(filter);
  }

  /**
   * Loads the last block from db and normalizes it.
   * @return {Promise<BlocksModel>}
   */
  public async loadLastBlock(): Promise<IBlocksModel> {
    const b = await this.BlocksModel.findOne({
      include: [this.TransactionsModel],
      order  : [['height', 'DESC']],
      limit  : 1,
    });
    // attach transaction assets
    await this.transactionLogic.attachAssets(b.transactions);

    this.blocksModule.lastBlock = b;
    return b;
  }

  /**
   * Gets block IDs sequence - last block id, ids of first blocks of last 5 rounds and genesis block id.
   * @param {number} height
   */
  public async getIdSequence(height: number): Promise<{ firstHeight: number, ids: string[] }> {
    const lastBlock = this.blocksModule.lastBlock;

    const heightsToQuery: number[] = await this.hookSystem
      .apply_filters(CommonHeightsToQuery.name, [], height);

    const blocks: Array<{ id: string, height: number }> = await this.BlocksModel
      .findAll({
        attributes: ['id', 'height'],
        order     : [['height', 'DESC']],
        raw       : true,
        where     : { height: heightsToQuery },
      });

    if (blocks.length === 0) {
      throw new Error(`Failed to get id sequence for height ${height}`);
    }

    // Add genesis block at the end if the set doesn't contain it already
    if (this.genesisBlock) {
      if (!blocks.find((v) => v.id === this.genesisBlock.id)) {
        blocks.push({
          height: this.genesisBlock.height,
          id    : this.genesisBlock.id,
        });
      }
    }

    // Add last block at the beginning if the set doesn't contain it already
    if (lastBlock && !blocks.find((v) => v.id === lastBlock.id)) {
      blocks.unshift({
        height: lastBlock.height,
        id    : lastBlock.id,
      });
    }

    const ids: string[] = blocks.map((r) => r.id);

    return { firstHeight: blocks[0].height, ids };
  }

  // tslint:disable-next-line max-line-length
  public async loadBlocksData(filter: { limit?: number, id?: string, lastId?: string }): Promise<IBlocksModel[]> {
    const params: any = { limit: filter.limit || 1 };
    if (filter.id && filter.lastId) {
      throw new Error('Invalid filter: Received both id and lastId');
    } else if (filter.id) {
      params.id = filter.id;
    } else if (filter.lastId) {
      params.lastId = filter.lastId;
    }
    return await this.dbSequence.addAndPromise<IBlocksModel[]>(async () => {
      const block = await this.BlocksModel.findOne({
        include: [this.TransactionsModel],
        where  : { id: filter.lastId || filter.id || null },
      });

      const height = block !== null ? block.height : 0;
      // Calculate max block height for database query

      if (typeof(params.lastId) !== 'undefined') {
        const limit = height + (parseInt(`${filter.limit}`, 10) || 1);
        return await this.BlocksModel.findAll({
          include: [this.TransactionsModel],
          order  : ['height', 'rowId'],
          where  : { height: { [Op.gt]: height, [Op.lt]: limit } },
        });
      }
      return [block];
    })
    // Attach assets to each block transaction.
      .then((blocks) => Promise.all(
        blocks.map((b) => this.transactionLogic.attachAssets(b.transactions)
          .then(() => b))
        )
      )
      .catch(catchToLoggerAndRemapError<IBlocksModel[]>('Blocks#loadBlockData error', this.logger));
  }

  public getBlockProgressLogger(txCount: number, logsFrequency: number, msg: string) {
    return new BlockProgressLogger(txCount, logsFrequency, msg, this.logger);
  }

}
