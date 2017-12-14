export const Symbols = {
  generic: {
    appConfig   : Symbol('appConfig'),
    db          : Symbol('db'),
    expressApp  : Symbol('expressApp'),
    genesisBlock: Symbol('genesisBlock'),
    lastCommit  : Symbol('lastCommit'),
    nonce       : Symbol('nonce'),
    redisClient : Symbol('redisClient'),
    socketIO    : Symbol('socketIO'),
    versionBuild: Symbol('versionBuild'),
    zschema     : Symbol('z_schema'),
  },
  helpers: {
    bus      : Symbol('bus'),
    constants: Symbol('constants'),
    ed       : Symbol('ed'),
    logger   : Symbol('logger'),
    sequence : Symbol('sequence'),
    slots    : Symbol('slots'),
  },
  logic  : {
    account        : Symbol('accountLogic'),
    appState       : Symbol('appState'),
    block          : Symbol('blockLogic'),
    blockReward    : Symbol('blockRewardL'),
    broadcaster    : Symbol('broadcasterL'),
    peer           : Symbol('peerL'),
    peers          : Symbol('peersL'),
    // round          : Symbol('round'),
    rounds         : Symbol('roundsL'),
    transaction    : Symbol('transactionL'),
    transactionPool: Symbol('transactionPoolL'),
    transactions   : {
      createmultisig : Symbol('createMultisigTxL'),
      delegate       : Symbol('delegateTxL'),
      secondSignature: Symbol('secondSignatureTxL'),
      send           : Symbol('sendTxL'),
      vote           : Symbol('voteTxL'),
    },
  },
  modules: {
    accounts        : Symbol('accountsM'),
    blocks          : Symbol('blocksM'),
    blocksSubModules: {
      chain  : Symbol('blocks_submodule_chain'),
      process: Symbol('blocks_submodule_process'),
      utils  : Symbol('blocks_submodule_utils'),
      verify : Symbol('blocks_submodule_verify'),
    },
    cache           : Symbol('cacheM'),
    delegates       : Symbol('delegatesM'),
    forge           : Symbol('forgeM'),
    fork            : Symbol('forkM'),
    loader          : Symbol('loaderM'),
    multisignatures : Symbol('multisignaturesM'),
    peers           : Symbol('peersM'),
    rounds          : Symbol('roundsM'),
    system          : Symbol('systemM'),
    transactions    : Symbol('transactionsM'),
    transport       : Symbol('transportM'),
  },

  tags: {
    helpers: {
      balancesSequence: Symbol('balanceSequence'),
      dbSequence      : Symbol('dbSequence'),
      defaultSequence : Symbol('defaultSequence'),
    },
  },
};
