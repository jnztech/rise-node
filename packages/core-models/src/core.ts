import { BaseCoreModule } from '@risevision/core-launchpad';
import * as cls from 'cls-hooked';
import { Container } from 'inversify';
import { Model, Sequelize } from 'sequelize-typescript';
import { DbAppConfig, DBHelper, ModelSymbols } from './helpers/';
import {
  BaseModel,
  ForksStatsModel,
  InfoModel,
  MigrationsModel,
} from './models';

export class CoreModule extends BaseCoreModule<DbAppConfig> {
  public configSchema = require('../schema/config.json');
  public constants    = {};
  private sequelize: Sequelize;

  public addElementsToContainer(): void {
    const namespace = cls.createNamespace('sequelize-namespace');

    (Sequelize as any).__proto__.useCLS(namespace);

    this.sequelize = new Sequelize({
      database: this.config.db.database,
      dialect : 'postgres',
      host    : this.config.db.host,
      logging : false,
      password: this.config.db.password,
      pool    : {
        idle: this.config.db.poolIdleTimeout,
        max : this.config.db.poolSize,
      },
      port    : this.config.db.port,
      username: this.config.db.user,
    });

    this.container.bind(ModelSymbols.sequelize).toConstantValue(this.sequelize);
    this.container.bind(ModelSymbols.sequelizeNamespace).toConstantValue(namespace);
    this.container.bind(ModelSymbols.helpers.db).to(DBHelper).inSingletonScope();

    this.container.bind(ModelSymbols.model).toConstructor(ForksStatsModel)
      .whenTargetNamed(ModelSymbols.names.forkStats);
    this.container.bind(ModelSymbols.model).toConstructor(InfoModel)
      .whenTargetNamed(ModelSymbols.names.info);
    this.container.bind(ModelSymbols.model).toConstructor(MigrationsModel)
      .whenTargetNamed(ModelSymbols.names.migrations);
    // container.bind(ModelSymbols.model).toConstructor(PeersModel)
    //   .whenTargetNamed(ModelSymbols.names.peers); TODO:
    // container.bind(ModelSymbols.model).toConstructor(TransactionsModel)
    //   .whenTargetNamed(ModelSymbols.names.transactions);
  }

  public initAppElements() {
    const models = this.container.getAll<typeof BaseModel>(ModelSymbols.model);
    models.forEach((m) => m.container = this.container);
    this.sequelize.addModels(models);
    models.forEach((m) => {
      console.log(m.getTableName());
    });
  }

  public afterConfigValidation<T extends DbAppConfig>(config: T): T {
    return config;
  }
}
