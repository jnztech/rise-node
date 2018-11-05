import { createFilterDecorator } from '@risevision/core-utils';
import {
  DBOp,
  SignedAndChainedBlockType,
  SignedBlockType,
} from '@risevision/core-types';

export const CommonHeightsToQuery = createFilterDecorator<
  (heights: number[], height: number) => Promise<number[]>
>('core/blocks/utils/commonHeightList');

// tslint:disable-next-line
type VR = { errors: string[]; verified: boolean };

export const VerifyReceipt = createFilterDecorator<
  (a: VR, block?: SignedBlockType) => Promise<VR>
>('core/blocks/verify/verifyReceipt');
export const VerifyBlock = createFilterDecorator<
  (a: VR, block?: SignedBlockType, lastBlock?: SignedBlockType) => Promise<VR>
>('core/blocks/verify/verifyBlock');
export const ApplyBlockDBOps = createFilterDecorator<
  (
    dbOps: Array<DBOp<any>>,
    block?: SignedAndChainedBlockType,
    saveBlock?: boolean
  ) => Promise<Array<DBOp<any>>>
>('core/blocks/chain/applyBlockDBOps');
export const RollbackBlockDBOps = createFilterDecorator<
  (
    dbOps: Array<DBOp<any>>,
    from?: SignedAndChainedBlockType,
    to?: SignedAndChainedBlockType
  ) => Promise<Array<DBOp<any>>>
>('core/blocks/chain/rollbackBlockDBOps');
