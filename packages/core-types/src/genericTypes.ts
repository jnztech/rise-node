// tslint:disable-next-line interface-name
import { Model } from 'sequelize-typescript';
import { FilteredModelAttributes } from 'sequelize-typescript/lib/models/Model';
import { DestroyOptions, UpdateOptions, UpsertOptions } from 'sequelize';

// tslint:disable-next-line interface-name
export interface AppConfig {
  port: number;
  address: string;
  version: string;
  minVersion: string;
  fileLogLevel: string;
  firewalled?: boolean;
  consoleLogLevel: string;
  logFileName: string;
  cacheEnabled: boolean;
  topAccounts: boolean;

  peers: {
    list: Array<{
      ip: string;
      port: number;
    }>;
    options: {
      limits: {
        max: number;
        delayMs: number;
        delayAfter: number;
        windowMs: number;
      };
      timeout: number;
    };
  };

  transactions: {
    maxTxsPerQueue: number;
    bundledInterval: number;
    bundleLimit: number;
  };

  loading: {
    verifyOnLoading: false;
    snapshot?: number | true;
    loadPerIteration: number;
  };

  modules: string[];
  nethash: string;
}