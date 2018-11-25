import { ITransactionLogic, Symbols } from '@risevision/core-interfaces';
import {
  BaseProtobufTransportMethod,
  Peer,
  ProtoIdentifier,
  SingleTransportPayload,
} from '@risevision/core-p2p';
import { ConstantsType, IBaseTransaction } from '@risevision/core-types';
import { inject, injectable } from 'inversify';
import { TransactionPool } from '../TransactionPool';
import { TXSymbols } from '../txSymbols';

// tslint:disable-next-line
export type GetTransactionsRequestDataType = {
  transactions: Array<IBaseTransaction<any>>;
};

@injectable()
export class GetTransactionsRequest extends BaseProtobufTransportMethod<
  null,
  null,
  GetTransactionsRequestDataType
> {
  public readonly method: 'GET' = 'GET';
  public readonly baseUrl = '/v2/peer/transactions';

  public protoResponse: ProtoIdentifier<GetTransactionsRequestDataType> = {
    messageType: 'transportTransactions',
    namespace: 'transactions.transport',
  };

  public schemaResponse = {
    properties: {
      transactions: {
        type: 'array',
      },
    },
    required: ['transactions'],
    type: 'object',
  };

  @inject(Symbols.logic.transaction)
  private transactionLogic: ITransactionLogic;

  @inject(TXSymbols.pool)
  private pool: TransactionPool;

  // TODO: lerna remove me and use tx type constants.
  @inject(Symbols.generic.constants)
  private constants: ConstantsType;

  protected async produceResponse(
    request: SingleTransportPayload<null, null>
  ): Promise<GetTransactionsRequestDataType> {
    let limit = this.constants.maxSharedTxs;

    const unconfirmed = this.pool.unconfirmed.list({ limit }).map((t) => t.tx);
    limit -= unconfirmed.length;

    const pending = this.pool.pending.list({ limit }).map((t) => t.tx);
    limit -= pending.length;

    const ready = this.pool.ready.list({ limit }).map((t) => t.tx);

    return { transactions: unconfirmed.concat(pending).concat(ready) };
  }

  // Necessary to keep types easy to use by consumers.
  protected encodeResponse(
    data: GetTransactionsRequestDataType,
    req: SingleTransportPayload<null, null>
  ): Promise<Buffer> {
    return super.encodeResponse(
      {
        transactions: data.transactions.map((tx) =>
          this.transactionLogic.toProtoBuffer(tx)
        ),
      } as any,
      null
    );
  }

  protected async decodeResponse(
    res: Buffer,
    peer: Peer
  ): Promise<GetTransactionsRequestDataType> {
    const superRes: { transactions: Buffer[] } = (await super.decodeResponse(
      res,
      peer
    )) as any;
    return {
      transactions: (superRes.transactions || []).map((bufTx) =>
        this.transactionLogic.fromProtoBuffer(bufTx)
      ),
    };
  }
}