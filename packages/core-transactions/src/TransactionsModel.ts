import {
  IBlocksModule,
  ITransactionsModel,
  Symbols,
} from '@risevision/core-interfaces';
import { BaseModel, ModelSymbols } from '@risevision/core-models';
import {
  IBaseTransaction,
  ITransportTransaction,
  TransactionType,
} from '@risevision/core-types';
import {
  Column,
  DataType,
  ForeignKey,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { IBuildOptions } from 'sequelize-typescript/lib/interfaces/IBuildOptions';
import { FilteredModelAttributes } from 'sequelize-typescript/lib/models/Model';

@Table({ tableName: 'trs' })
// tslint:disable-next-line max-line-length
export class TransactionsModel<Asset = any>
  extends BaseModel<TransactionsModel<Asset>>
  implements ITransactionsModel<Asset> {
  public static toTransportTransaction<Asset>(
    t: IBaseTransaction<Asset>
  ): ITransportTransaction<Asset> & { confirmations?: number } {
    const blocksModule: IBlocksModule = this.container.get(
      Symbols.modules.blocks
    );
    let obj;
    if (t instanceof TransactionsModel) {
      obj = { ...t.toJSON(), asset: t.asset };
    } else {
      obj = { ...t };
    }
    ['senderPublicKey', 'signature'].forEach((k) => {
      if (typeof obj[k] !== 'undefined' && obj[k] !== null) {
        obj[k] = obj[k].toString('hex');
      }
    });
    if (obj.height) {
      obj.confirmations = 1 + blocksModule.lastBlock.height - obj.height;
    }
    if (typeof obj.amount === 'bigint') {
      obj.amount = `${obj.amount}`;
    }
    if (typeof obj.fee === 'bigint') {
      obj.fee = `${obj.fee}`;
    }
    return obj as any;
  }
  @PrimaryKey
  @Column
  public id: string;

  @Column
  public rowId: number;

  @Column
  public height: number;

  @ForeignKey(() =>
    this.TransactionsModel.container.getNamed(
      ModelSymbols.model,
      Symbols.models.blocks
    )
  )
  @Column
  public blockId: string;

  @Column(DataType.INTEGER)
  public type: TransactionType;

  @Column
  public timestamp: number;

  @Column(DataType.BLOB)
  public senderPubData: Buffer;

  @Column
  public senderId: string;

  @Column
  public recipientId: string;

  @Column(DataType.BIGINT)
  public amount: bigint;

  @Column(DataType.BIGINT)
  public fee: bigint;

  @Column(DataType.ARRAY(DataType.BLOB))
  public signatures: Buffer[];

  @Column(DataType.INTEGER)
  public version: number = 0;

  public asset: Asset = null;

  constructor(
    values?: FilteredModelAttributes<TransactionsModel<Asset>>,
    options?: IBuildOptions
  ) {
    super(values, options);
    if (values && values.asset) {
      this.asset = values.asset as any;
    }
  }

  public toTransport(): ITransportTransaction<Asset> {
    return TransactionsModel.toTransportTransaction(this);
  }
}
