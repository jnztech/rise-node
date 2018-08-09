import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { WordPressHookSystem, WPHooksSubscriber } from 'mangiafuoco';
import { Container } from 'inversify';
import * as sinon from 'sinon';
import { SinonSandbox, SinonStub } from 'sinon';
// import { AccountsModuleStub, DelegatesModuleStub, SystemModuleStub, } from '../../stubs';
import { AccountsAPI, AccountsModule, AccountsSymbols, CoreModule, FilterAPIGetAccount } from '../../src';
import { APISymbols } from '../../../core-apis/dist/helpers';
import { createContainer } from '@risevision/core-launchpad/tests/utils/createContainer';
import 'reflect-metadata';
import { Symbols } from '../../../core-interfaces/src';
import { ModelSymbols } from '../../../core-models/src/helpers';
import { AppConfig } from '../../../core-types/src';
import { IAccountsModel } from '../../../core-interfaces/src/models';

chai.use(chaiAsPromised);

// tslint:disable no-unused-expression max-line-length
describe('apis/accountsAPI', () => {

  let sandbox: SinonSandbox;
  let instance: AccountsAPI;
  let container: Container;
  beforeEach(async () => {
    sandbox   = sinon.createSandbox();
    container = await createContainer([
      'core-accounts',
      'core',
      'core-helpers',
    ]);

  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getAccount', () => {
    it('should validate schema', async () => {
      instance = container.getNamed(APISymbols.api, AccountsSymbols.api);
      await expect(instance.getAccount({ address: 'meow' })).rejectedWith('address - Object didn\'t pass');
      await expect(instance.getAccount({ publicKey: 'meow' })).rejectedWith('publicKey - Object didn\'t pass');
      await expect(instance.getAccount({} as any)).rejectedWith('Missing required property: address or publicKey');
      await expect(instance.getAccount({ address: '1R', extra: 'data' } as any)).rejectedWith('Additional properties not allowed: extra');
    });

    it('should validate against generated address if both pubKey and address are provided', async () => {
      instance = container.getNamed(APISymbols.api, AccountsSymbols.api);
      await expect(instance.getAccount({ address: '1R', publicKey: '69bcf81be8a34393507d3d371c551325a8d48f6e92284633bd7043030f5c6a26' })).rejectedWith('Account publicKey does not match address');
    });

    it('should query accountsModule', async () => {
      const accModule = container.get<AccountsModule>(AccountsSymbols.module);
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      const stub      = sandbox.stub(accModule, 'getAccount').resolves(null);
      await expect(instance.getAccount({ address: '1R' })).rejectedWith('Account not found');

      expect(stub.calledOnce).is.true;
      expect(stub.firstCall.args[0]).deep.eq({ address: '1R' });
      stub.resetHistory();

      // It should also query by calculated address
      await expect(instance.getAccount({ publicKey: '69bcf81be8a34393507d3d371c551325a8d48f6e92284633bd7043030f5c6a26' })).rejectedWith('Account not found');
      expect(stub.calledOnce).is.true;
      expect(stub.firstCall.args[0]).deep.eq({
        address  : '4736561281125553123R',
        publicKey: Buffer.from('69bcf81be8a34393507d3d371c551325a8d48f6e92284633bd7043030f5c6a26', 'hex')
      });
    });

    it('should applyFilter for return response', async () => {
      const hookSystem: WordPressHookSystem = container.get(Symbols.generic.hookSystem);

      class FilterAccountResponse extends WPHooksSubscriber(Object) {
        public hookSystem = hookSystem;

        @FilterAPIGetAccount()
        public async filterAccount(acc: any) {
          return { ...acc, meow: true };
        }
      }

      const filterInstance = new FilterAccountResponse();
      await filterInstance.hookMethods();

      const accModule = container.get<AccountsModule>(AccountsSymbols.module);
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      sandbox.stub(accModule, 'getAccount').resolves({ address: '1R', balance: 10, hexPublicKey: 'hey', u_balance: 11 });

      const res = await instance.getAccount({ address: '1R' });
      expect(res).deep.eq({
        account: {
          address: '1R', balance: '10', publicKey: 'hey', unconfirmedBalance: '11',
          meow   : true
        },
      });

      await filterInstance.unHook();
    });
  });
  describe('getBalance', () => {
    it('should reject if input does not pass validation schema', async () => {
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      await expect (instance.getBalance({address: 'meow'})).to.rejectedWith('address - Object didn\'t pass validation');

    });
    it('should query accountsModule and return balance and unconfirmedBalance', async () => {
      const accModule = container.get<AccountsModule>(AccountsSymbols.module);
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      const stub = sandbox.stub(accModule, 'getAccount').resolves({ address: '1R', balance: 10, hexPublicKey: 'hey', u_balance: 11 });

      expect(await instance.getBalance({address: '1R'})).deep.eq({balance: '10', unconfirmedBalance: '11'});
      expect(stub.calledWith({address: '1R'})).true;
    });
    it('should throw if accountsModule throws', async () => {
      const accModule = container.get<AccountsModule>(AccountsSymbols.module);
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      sandbox.stub(accModule, 'getAccount').rejects(new Error('hey'));
      await expect (instance.getBalance({address: '1R'})).to.rejectedWith('hey');
    });
  });
  describe('getPublicKey', () => {
    it('should reject if input does not pass validation schema', async () => {
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      await expect (instance.getPublickey({address: 'meow'})).to.rejectedWith('address - Object didn\'t pass validation');

    });
    it('should query accountsModule and return hexPublicKey', async () => {
      const accModule = container.get<AccountsModule>(AccountsSymbols.module);
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      const AccountsModel = container.getNamed<any>(ModelSymbols.model, AccountsSymbols.model);
      const stub = sandbox.stub(accModule, 'getAccount').resolves(new AccountsModel({
        publicKey: Buffer.alloc(32).fill(0xaa),
      }));

      expect(await instance.getPublickey({address: '1R'})).deep.eq({publicKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
      expect(stub.calledWith({address: '1R'})).true;
    });
    it('should throw if accountsModule throws', async () => {
      const accModule = container.get<AccountsModule>(AccountsSymbols.module);
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
      sandbox.stub(accModule, 'getAccount').rejects(new Error('hey'));
      await expect (instance.getPublickey({address: '1R'})).to.rejectedWith('hey');
    });
  });

  // TODO: in consensus-dpos
  // describe('getDelegates', () => {
  //
  //   let params;
  //   let account;
  //
  //   beforeEach(() => {
  //     params  = { address: 'address' };
  //     account = { publicKey: '1' };
  //
  //     accountsModule.enqueueResponse('getAccount', Promise.resolve(account));
  //   });
  //
  //   it('should call accountsModule.getAccount', async () => {
  //     await instance.getDelegates(params);
  //
  //     expect(accountsModule.stubs.getAccount.calledOnce).to.be.true;
  //     expect(accountsModule.stubs.getAccount.firstCall.args.length).to.be.equal(1);
  //     expect(accountsModule.stubs.getAccount.firstCall.args[0]).to.be.deep.equal({ address: 'address' });
  //   });
  //
  //   it('should throw error if account not found', async () => {
  //     accountsModule.reset();
  //     accountsModule.enqueueResponse('getAccount', Promise.resolve());
  //
  //     await expect(instance.getDelegates(params)).to.be.rejectedWith('Account not found');
  //   });
  //
  //   describe('account.delegates is not null', () => {
  //
  //     let delegatesFromQuery;
  //     let del1;
  //     let del2;
  //
  //     beforeEach(() => {
  //       del1               = { publicKey: '1' };
  //       del2               = { publicKey: '3' };
  //       account.delegates  = ['1', '2'];
  //       delegatesFromQuery = [del1, del2].map((d, idx) => ({
  //         delegate: new AccountsModel(d), info: {
  //           rate        : idx,
  //           rank        : idx,
  //           approval    : 100,
  //           productivity: 100,
  //         },
  //       }));
  //       accountsModule.reset();
  //       accountsModule.enqueueResponse('getAccount', Promise.resolve(new AccountsModel(account)));
  //       delegatesModule.enqueueResponse('getDelegates', Promise.resolve({ delegates: delegatesFromQuery }));
  //     });
  //
  //     it('should call delegatesModule.getDelegates', async () => {
  //       await instance.getDelegates(params);
  //
  //       expect(delegatesModule.stubs.getDelegates.calledOnce).to.be.true;
  //       expect(delegatesModule.stubs.getDelegates.firstCall.args.length).to.be.equal(1);
  //       expect(delegatesModule.stubs.getDelegates.firstCall.args[0]).to.be.deep.equal({ orderBy: 'rank:desc' });
  //     });
  //
  //     it('should return object with same delegates from account"s delegates', async () => {
  //       const ret = await instance.getDelegates(params);
  //
  //       expect(ret).to.be.deep.equal({
  //         delegates: [
  //           {
  //             address: null,
  //             approval: 100,
  //             missedblocks: undefined,
  //             producedblocks: undefined,
  //             productivity: 100,
  //             rank: 0,
  //             rate: 0,
  //             username: undefined,
  //             vote: undefined,
  //             publicKey: '1',
  //           },
  //         ],
  //       });
  //     });
  //
  //   });
  //
  //   it('should return object with publicKey if account.delegates is null', async () => {
  //     const ret = await instance.getDelegates(params);
  //
  //     expect(ret).to.be.deep.equal({ publicKey: '1' });
  //   });
  //
  // });
  //
  // describe('getDelegatesFee', () => {
  //
  //   let params;
  //   let fee;
  //
  //   beforeEach(() => {
  //     fee    = {
  //       fees: {
  //         delegate: 1,
  //       },
  //     };
  //     params = { height: 1 };
  //     systemModule.enqueueResponse('getFees', fee);
  //   });
  //
  //   it('should call systemModule.getFees', async () => {
  //     await instance.getDelegatesFee(params);
  //
  //     expect(systemModule.stubs.getFees.calledOnce).to.be.true;
  //     expect(systemModule.stubs.getFees.firstCall.args.length).to.be.equal(1);
  //     expect(systemModule.stubs.getFees.firstCall.args[0]).to.be.equal(params.height);
  //   });
  //
  //   it('should return delegates fee from height', async () => {
  //     const ret = await instance.getDelegatesFee(params);
  //
  //     expect(ret).to.be.deep.equal({ fee: fee.fees.delegate });
  //   });
  //
  // });
  //
  // describe('open', () => {
  //
  //   it('should throw error', async () => {
  //     await expect(instance.open({ secret: 'sds' })).to.be.rejectedWith('Method is deprecated');
  //   });
  //
  // });
  // describe('addDelegate', () => {
  //
  //   it('should throw error', async () => {
  //     await expect(instance.addDelegate()).to.be.rejectedWith('Method is deprecated');
  //   });
  //
  // });
  // describe('generatePublicKey', () => {
  //
  //   it('should throw error', async () => {
  //     await expect(instance.generatePublicKey()).to.be.rejectedWith('Method is deprecated');
  //   });
  //
  // });
  //
  describe('topAccounts', () => {
    let appConfig: AppConfig;
    let getAccountsStub: SinonStub;
    let AccountsModel: typeof IAccountsModel;
    beforeEach(() => {
      appConfig = container.get(Symbols.generic.appConfig);
      appConfig.topAccounts = true; // Enable it.
      const accountsModule = container.get<AccountsModule>(AccountsSymbols.module);
      getAccountsStub = sinon.stub(accountsModule, 'getAccounts');
      AccountsModel = container.getNamed<any>(ModelSymbols.model, AccountsSymbols.model);;
      instance        = container.getNamed(APISymbols.api, AccountsSymbols.api);
    });

    it('should reject with appConfig.topAccounts not defined', async () => {
      delete appConfig.topAccounts;
      await expect(instance.topAccounts({})).to.be.rejectedWith('Top Accounts is not enabled');
      expect(getAccountsStub.called).is.false;
    });
    it('should reject with appConfig.topAccounts set to false', async () => {
      appConfig.topAccounts = false;
      await expect(instance.topAccounts({})).to.be.rejectedWith('Top Accounts is not enabled');
      expect(getAccountsStub.called).is.false;
    });
    it('should propagate request correctly with default params when not provided', async () => {
      appConfig.topAccounts = true;
      getAccountsStub.resolves([]);

      await instance.topAccounts({});
      expect(getAccountsStub.calledOnce).is.true;
      expect(getAccountsStub.firstCall.args[0]).deep.eq({
        sort: { balance: -1 },
        limit: 100,
        offset: 0
      });
    });
    it('should query accountsModule.getAccounts with proper params', async () => {
      getAccountsStub.resolves([]);
      const res = await instance.topAccounts({limit: 1, offset: 10});
      expect(getAccountsStub.calledOnce).is.true;
      expect(getAccountsStub.firstCall.args[0]).deep.eq({
        sort: { balance: -1 },
        limit: 1,
        offset: 10
      });
      expect(res).to.be.deep.eq({accounts: []});
    });
    it('should remap getAccountsResult properly', async () => {
      getAccountsStub.resolves([
        new AccountsModel({ address: '1', balance: 10, u_balance: 11} as any),
        new AccountsModel({ address: '2', balance: 12, publicKey: Buffer.alloc(32).fill(0xab)}),
      ]);
      const res = await instance.topAccounts({});
      expect(res).to.be.deep.eq({
        accounts: [
          {address: '1', balance: 10},
          {address: '2', balance: 12, publicKey: 'abababababababababababababababababababababababababababababababab'},
        ],
      });
    });
  });
});