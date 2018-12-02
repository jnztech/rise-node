import { FilterAPIGetAccount } from '@risevision/core-accounts';
import {
  ICrypto,
  ITransactionLogic,
  Symbols,
} from '@risevision/core-interfaces';
import {
  TXBytes,
  TxLogicStaticCheck,
  TxLogicVerify,
  TXSymbols,
} from '@risevision/core-transactions';
import { IBaseTransaction } from '@risevision/core-types';
import * as crypto from 'crypto';
import { decorate, inject, injectable } from 'inversify';
import { WordPressHookSystem, WPHooksSubscriber } from 'mangiafuoco';
import { AccountsModelWith2ndSign } from '../AccountsModelWith2ndSign';

const ExtendableClass = WPHooksSubscriber(Object);
decorate(injectable(), ExtendableClass);

@injectable()
export class SignHooksListener extends ExtendableClass {
  @inject(Symbols.generic.hookSystem)
  public hookSystem: WordPressHookSystem;

  @inject(Symbols.logic.transaction)
  private txLogic: ITransactionLogic;
  @inject(TXSymbols.txBytes)
  private txBytes: TXBytes;

  @inject(Symbols.generic.crypto)
  private crypto: ICrypto;

  @TxLogicStaticCheck()
  public async txStaticCheck(
    tx: IBaseTransaction<any> & { signSignature?: Buffer },
    sender: AccountsModelWith2ndSign
  ) {
    if (sender.secondSignature && !tx.signSignature) {
      throw new Error('Missing second signature');
    }
    if (!sender.secondSignature && tx.signSignature) {
      throw new Error(
        'Second Signature provided but account does not have one registered'
      );
    }
  }

  @TxLogicVerify()
  public async txLogicVerify(
    tx: IBaseTransaction<any, bigint> & { signSignature?: Buffer },
    sender: AccountsModelWith2ndSign
  ) {
    if (sender.secondSignature) {
      const hash = crypto
        .createHash('sha256')
        .update(this.txBytes.signableBytes(tx, true))
        .digest();
      const verified = this.crypto.verify(
        hash,
        tx.signSignature,
        sender.secondPublicKey
      );
      if (!verified) {
        throw new Error('Invalid second signature');
      }
    }
  }

  @FilterAPIGetAccount()
  public add2ndSignatureToAccount(
    accData: any,
    model: AccountsModelWith2ndSign
  ) {
    return {
      ...accData,
      secondPublicKey: model.secondPublicKey
        ? model.secondPublicKey.toString('hex')
        : null,
      secondSignature: model.secondSignature,
      unconfirmedSignature: model.u_secondSignature,
    };
  }
}
