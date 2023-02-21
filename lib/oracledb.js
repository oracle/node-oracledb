// Copyright (c) 2015, 2022, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const constants = require('./constants.js');
const nodbUtil = require('./util.js');
const util = require('util');

// This version of node-oracledb works with Node.js 14 or later.  The test
// stops hard-to-interpret runtime errors and crashes with older Node.js
// versions.
let vs = process.version.substring(1).split(".").map(Number);
if (vs[0] < 14) {
  throw new Error(nodbUtil.getErrorMessage('NJS-069', nodbUtil.PACKAGE_JSON_VERSION, "14.0"));
}

const AqDeqOptions = require('./aqDeqOptions.js');
const AqEnqOptions = require('./aqEnqOptions.js');
const AqMessage = require('./aqMessage.js');
const AqQueue = require('./aqQueue.js');
const BaseDbObject = require('./dbObject.js');
const Connection = require('./connection.js');
const Lob = require('./lob.js');
const Pool = require('./pool.js');
const PoolStatistics = require('./poolStatistics.js');
const ResultSet = require('./resultset.js');
const settings = require('./settings.js');
const SodaDatabase = require('./sodaDatabase.js');
const SodaCollection = require('./sodaCollection.js');
const SodaDocCursor = require('./sodaDocCursor.js');
const SodaDocument = require('./sodaDocument.js');
const SodaOperation = require('./sodaOperation.js');

const poolCache = {};
const tempUsedPoolAliases = {};
const defaultPoolAlias = 'default';

// save arguments for call to initOracleClient()
let _initOracleClientArgs;


// Load the Oracledb binary

/*global __non_webpack_require__*/  // quieten eslint
const requireBinary = (typeof __non_webpack_require__ === 'function') ? __non_webpack_require__ : require; // See Issue 1156

const binaryLocations = [
  '../' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE,  // pre-built binary
  '../' + nodbUtil.RELEASE_DIR + '/' + 'oracledb.node',       // binary built from source
  '../build/Debug/oracledb.node',                             // debug binary
  // For Webpack.  A Webpack copy plugin is still needed to copy 'node_modules/oracledb/build/' to the output directory
  // See https://github.com/oracle/node-oracledb/issues/1156
  './node_modules/oracledb/' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE,
  './node_modules/oracledb/' + nodbUtil.RELEASE_DIR + '/' + 'oracledb.node'
];

let oracledbCLib;
for (let i = 0; i < binaryLocations.length; i++) {
  try {
    oracledbCLib = requireBinary(binaryLocations[i]);
    break;
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND' || i == binaryLocations.length - 1) {
      let nodeInfo;
      if (err.code === 'MODULE_NOT_FOUND') {
        // A binary was not found in any of the search directories.
        // Note this message may not be accurate for Webpack users since Webpack changes __dirname
        nodeInfo = `\n  Looked for ${binaryLocations.map(x => require('path').resolve(__dirname, x)).join(', ')}\n  ${nodbUtil.getInstallURL()}\n`;
      } else {
        nodeInfo = `\n  Node.js require('oracledb') error was:\n  ${err.message}\n  ${nodbUtil.getInstallHelp()}\n`;
      }
      throw new Error(nodbUtil.getErrorMessage('NJS-045', nodeInfo));
    }
  }
}

// top-level functions

//-----------------------------------------------------------------------------
// createPool()
//   Create a pool with the specified options and return it to the caller.
//-----------------------------------------------------------------------------
async function createPool(poolAttrs) {
  let poolAlias;

  // check arguments
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(poolAttrs), 'NJS-005', 1);
  if (poolAttrs.poolAlias !== undefined) {
    if (typeof poolAttrs.poolAlias !== 'string' ||
        poolAttrs.poolAlias.length === 0) {
      throw new Error(nodbUtil.getErrorMessage('NJS-004',
        'poolAttrs.poolAlias'));
    }
    poolAlias = poolAttrs.poolAlias;
  } else if (poolAttrs.poolAlias === undefined
      && !poolCache[defaultPoolAlias]
      && !tempUsedPoolAliases[defaultPoolAlias]) {
    poolAlias = defaultPoolAlias;
  }
  if (poolCache[poolAlias] || tempUsedPoolAliases[poolAlias]) {
    throw new Error(nodbUtil.getErrorMessage('NJS-046', poolAlias));
  }
  if (poolAttrs.accessToken !== undefined) {
    // cannot set username or password for token based authentication
    if (poolAttrs.user !== undefined ||
        poolAttrs.password !== undefined) {
      throw new Error(nodbUtil.getErrorMessage('NJS-084'));
    }

    // homogeneous and externalAuth must be set to true for token based
    // authentication
    if (poolAttrs.homogeneous === false ||
        poolAttrs.externalAuth === false) {
      throw new Error(nodbUtil.getErrorMessage('NJS-085'));
    }
  }

  // create an adjusted set of pool attributes to pass to the C layer; the
  // session callback must be removed if it is a JavaScript function and the
  // queue timeout is used to specify the maximum amount of time that the C
  // layer will wait for a connection to be returned; ordinarily since the
  // JavaScript layer never calls the C layer to get a connection unless one is
  // known to be available, this should not be needed, but in some cases (such
  // as when the maximum for a particular shard is specified) this may not be
  // known, so this prevents an unnecessarily long wait from taking place
  const adjustedPoolAttrs = Object.defineProperties({},
    Object.getOwnPropertyDescriptors(poolAttrs));
  if (typeof poolAttrs.sessionCallback === 'function') {
    delete adjustedPoolAttrs.sessionCallback;
  }
  if (adjustedPoolAttrs.queueTimeout === undefined) {
    adjustedPoolAttrs.queueTimeout = this.queueTimeout;
  }

  // token based authentication
  if (poolAttrs.accessToken !== undefined) {
    // accessTokenCallback is depricated from node-oracledb 5.5
    if (poolAttrs.accessTokenCallback !== undefined &&
        typeof poolAttrs.accessToken === 'function') {
      throw new Error(nodbUtil.getErrorMessage('NJS-088'));
    }

    await nodbUtil.checkToken(adjustedPoolAttrs);
    if (typeof poolAttrs.accessToken === 'function') {
      adjustedPoolAttrs.accessTokenCallback = poolAttrs.accessToken;
    }
  }

  // initialize the Oracle client, if necessary
  if (_initOracleClientArgs === undefined) {
    initOracleClient();
  }

  // Need to prevent another call in the same stack from succeeding, otherwise
  // two pools could be created with the same poolAlias and the second one that
  // comes back would overwrite the first in the cache.
  if (poolAlias) {
    tempUsedPoolAliases[poolAlias] = true;
  }

  // create the pool, ensuring that the temporary pool alias cache is removed
  // once this has completed (either successfully or unsuccessfully)
  const pool = new Pool();
  try {
    await pool._create(adjustedPoolAttrs);
  } finally {
    if (poolAlias) {
      delete tempUsedPoolAliases[poolAlias];
    }
  }

  if (poolAlias) {
    poolCache[poolAlias] = pool;
  }

  pool._setup(poolAttrs, poolAlias);
  pool.on('_afterPoolClose', () => {
    if (pool.poolAlias) {
      delete poolCache[pool.poolAlias];
    }
  });

  return pool;
}


//-----------------------------------------------------------------------------
// getConnection()
//   Gets either a standalone connection, or a connection from a pool cache
//-----------------------------------------------------------------------------
async function getConnection(a1) {
  let pool;
  let poolAlias;
  let connAttrs = {};

  // verify the number and types of arguments
  nodbUtil.checkArgCount(arguments, 0, 1);
  if (arguments.length == 0) {
    poolAlias = defaultPoolAlias;
  } else {
    nodbUtil.assert(typeof a1 === 'string' || nodbUtil.isObject(a1),
      'NJS-005', 1);
    if (typeof a1 === 'string') {
      poolAlias = a1;
    } else {
      connAttrs = a1;
      if (connAttrs.poolAlias) {
        poolAlias = connAttrs.poolAlias;
      }
    }
  }

  // if a pool alias is available, acquire a connection from the specified pool
  if (poolAlias) {
    pool = poolCache[poolAlias];
    if (!pool) {
      throw new Error(nodbUtil.getErrorMessage('NJS-047', poolAlias));
    }
    return await pool.getConnection(connAttrs);

  // otherwise, create a new standalone connection
  } else {
    if (connAttrs.accessToken !== undefined) {
      // cannot set username or password for token based authentication
      if (connAttrs.user !== undefined ||
          connAttrs.password !== undefined) {
        throw new Error(nodbUtil.getErrorMessage('NJS-084'));
      }

      // externalAuth must be set to true for token based authentication
      if (connAttrs.externalAuth === false) {
        throw new Error(nodbUtil.getErrorMessage('NJS-086'));
      }

      await nodbUtil.checkToken(connAttrs);
    }

    if (_initOracleClientArgs === undefined) {
      initOracleClient();
    }
    const conn = new Connection();
    await conn._connect(connAttrs);
    return conn;
  }
}


//-----------------------------------------------------------------------------
// getPool()
//
// Returns a pool for the given alias.
//-----------------------------------------------------------------------------
function getPool(poolAlias) {
  let pool;

  nodbUtil.checkArgCount(arguments, 0, 1);

  if (poolAlias) {
    nodbUtil.assert(typeof poolAlias === 'string' || typeof poolAlias === 'number', 'NJS-005', 1);
  }

  poolAlias = poolAlias || defaultPoolAlias;

  pool = poolCache[poolAlias];

  if (!pool) {
    throw new Error(nodbUtil.getErrorMessage('NJS-047', poolAlias));
  }

  return pool;
}

//-----------------------------------------------------------------------------
// initOracleClient()
//
// Initializes the Oracle Client.
//-----------------------------------------------------------------------------
function initOracleClient(arg1) {
  let options = {};
  nodbUtil.checkArgCount(arguments, 0, 1);
  if (arg1 !== undefined) {
    nodbUtil.assert(nodbUtil.isObject(arg1), 'NJS-005', 1);
    options = arg1;
  }
  if (_initOracleClientArgs === undefined) {
    const adjustedOptions = Object.defineProperties({},
      Object.getOwnPropertyDescriptors(options));
    if (options.driverName === undefined)
      adjustedOptions.driverName = constants.DEFAULT_DRIVER_NAME;
    if (options.errorUrl === undefined)
      adjustedOptions.errorUrl = constants.DEFAULT_ERROR_URL;
    try {
      oracledbCLib.initOracleClient(adjustedOptions, module.exports, settings);
    } catch (err) {
      if (err.message.match(/DPI-1047/)) {
        err.message += "\n" + nodbUtil.getInstallHelp();
      }
      throw err;
    }
    _initOracleClientArgs = options;
  } else if (!util.isDeepStrictEqual(_initOracleClientArgs, options)) {
    throw new Error("initOracleClient() must have same arguments!");
  }
}


//-----------------------------------------------------------------------------
// shutdown()
//
// Shuts down the database.
//-----------------------------------------------------------------------------
async function shutdown(a1, a2) {
  let connAttr = {};
  let shutdownMode = constants.SHUTDOWN_MODE_DEFAULT;

  // verify the number and types of arguments
  nodbUtil.checkArgCount(arguments, 0, 2);
  if (arguments.length == 2) {
    nodbUtil.assert(typeof a1 === 'object', 'NJS-005', 1);
    nodbUtil.assert(typeof a2 === 'number', 'NJS-005', 2);
    connAttr = a1;
    shutdownMode = a2;
  } else if (arguments.length == 1) {
    nodbUtil.assert(typeof a1 === 'object', 'NJS-005', 1);
    connAttr = a1;
  }

  // only look for the keys that are used for shutting down the database
  // use SYSOPER privilege
  const dbConfig = {
    user: connAttr.user,
    password: connAttr.password,
    connectString: connAttr.connectString,
    connectionString: connAttr.connectionString,
    externalAuth: connAttr.externalAuth,
    privilege: constants.SYSOPER
  };

  const conn = await this.getConnection(dbConfig);
  await conn.shutdown(shutdownMode);
  if (shutdownMode != this.SHUTDOWN_MODE_ABORT) {
    await conn.execute("ALTER DATABASE CLOSE");
    await conn.execute("ALTER DATABASE DISMOUNT");
    await conn.shutdown(this.SHUTDOWN_MODE_FINAL);
  }
  await conn.close();
}


//-----------------------------------------------------------------------------
// startup()
//
// Starts up the database.
//-----------------------------------------------------------------------------
async function startup(a1, a2) {
  let connAttr = {};
  let startupAttr = {};

  // verify the number and types of arguments
  nodbUtil.checkArgCount(arguments, 0, 2);
  if (arguments.length == 2) {
    nodbUtil.assert (typeof a1 === 'object', 'NJS-005', 1);
    nodbUtil.assert (typeof a2 === 'object', 'NJS-005', 2);
    connAttr = a1;
    startupAttr = a2;
  } else if (arguments.length == 1) {
    nodbUtil.assert(typeof a1 === 'object', 'NJS-005', 1);
    connAttr = a1;
  }

  // only look for the keys that are used for starting up the database
  // use SYSOPER and SYSPRELIM privileges
  const dbConfig = {
    user: connAttr.user,
    password: connAttr.password,
    connectString: connAttr.connectString,
    connectionString: connAttr.connectionString,
    externalAuth: connAttr.externalAuth,
    privilege: this.SYSOPER | this.SYSPRELIM
  };

  let conn = await this.getConnection(dbConfig);
  await conn.startup(startupAttr);
  await conn.close();

  dbConfig.privilege = this.SYSOPER;
  conn = await this.getConnection(dbConfig);
  await conn.execute("ALTER DATABASE MOUNT");
  await conn.execute("ALTER DATABASE OPEN");
  await conn.close();
}

// module exports
module.exports = {

  // classes
  AqDeqOptions,
  AqEnqOptions,
  AqMessage,
  AqQueue,
  BaseDbObject,
  Connection,
  Lob,
  Pool,
  PoolStatistics,
  ResultSet,
  SodaDatabase,
  SodaCollection,
  SodaDocCursor,
  SodaDocument,
  SodaOperation,

  // top-level functions
  getConnection: nodbUtil.callbackify(getConnection),
  createPool: nodbUtil.callbackify(createPool),
  getPool,
  initOracleClient,
  shutdown: nodbUtil.callbackify(shutdown),
  startup: nodbUtil.callbackify(startup),

  // CQN operation codes
  CQN_OPCODE_ALL_OPS: constants.CQN_OPCODE_ALL_OPS,
  CQN_OPCODE_ALL_ROWS: constants.CQN_OPCODE_ALL_ROWS,
  CQN_OPCODE_ALTER: constants.CQN_OPCODE_ALTER,
  CQN_OPCODE_DELETE: constants.CQN_OPCODE_DELETE,
  CQN_OPCODE_DROP: constants.CQN_OPCODE_DROP,
  CQN_OPCODE_INSERT: constants.CQN_OPCODE_INSERT,
  CQN_OPCODE_UPDATE: constants.CQN_OPCODE_UPDATE,

  // database types
  DB_TYPE_BFILE: constants.DB_TYPE_BFILE,
  DB_TYPE_BINARY_DOUBLE: constants.DB_TYPE_BINARY_DOUBLE,
  DB_TYPE_BINARY_FLOAT: constants.DB_TYPE_BINARY_FLOAT,
  DB_TYPE_BINARY_INTEGER: constants.DB_TYPE_BINARY_INTEGER,
  DB_TYPE_BLOB: constants.DB_TYPE_BLOB,
  DB_TYPE_BOOLEAN: constants.DB_TYPE_BOOLEAN,
  DB_TYPE_CHAR: constants.DB_TYPE_CHAR,
  DB_TYPE_CLOB: constants.DB_TYPE_CLOB,
  DB_TYPE_CURSOR: constants.DB_TYPE_CURSOR,
  DB_TYPE_DATE: constants.DB_TYPE_DATE,
  DB_TYPE_INTERVAL_DS: constants.DB_TYPE_INTERVAL_DS,
  DB_TYPE_INTERVAL_YM: constants.DB_TYPE_INTERVAL_YM,
  DB_TYPE_JSON: constants.DB_TYPE_JSON,
  DB_TYPE_LONG: constants.DB_TYPE_LONG,
  DB_TYPE_LONG_RAW: constants.DB_TYPE_LONG_RAW,
  DB_TYPE_NCHAR: constants.DB_TYPE_NCHAR,
  DB_TYPE_NCLOB: constants.DB_TYPE_NCLOB,
  DB_TYPE_NUMBER: constants.DB_TYPE_NUMBER,
  DB_TYPE_NVARCHAR: constants.DB_TYPE_NVARCHAR,
  DB_TYPE_OBJECT: constants.DB_TYPE_OBJECT,
  DB_TYPE_RAW: constants.DB_TYPE_RAW,
  DB_TYPE_ROWID: constants.DB_TYPE_ROWID,
  DB_TYPE_TIMESTAMP: constants.DB_TYPE_TIMESTAMP,
  DB_TYPE_TIMESTAMP_LTZ: constants.DB_TYPE_TIMESTAMP_LTZ,
  DB_TYPE_TIMESTAMP_TZ: constants.DB_TYPE_TIMESTAMP_TZ,
  DB_TYPE_VARCHAR: constants.DB_TYPE_VARCHAR,

  // fetchInfo type defaulting
  DEFAULT: constants.DEFAULT,

  // statement types
  STMT_TYPE_UNKNOWN: constants.STMT_TYPE_UNKNOWN,
  STMT_TYPE_SELECT: constants.STMT_TYPE_SELECT,
  STMT_TYPE_UPDATE: constants.STMT_TYPE_UPDATE,
  STMT_TYPE_DELETE: constants.STMT_TYPE_DELETE,
  STMT_TYPE_INSERT: constants.STMT_TYPE_INSERT,
  STMT_TYPE_CREATE: constants.STMT_TYPE_CREATE,
  STMT_TYPE_DROP: constants.STMT_TYPE_DROP,
  STMT_TYPE_ALTER: constants.STMT_TYPE_ALTER,
  STMT_TYPE_BEGIN: constants.STMT_TYPE_BEGIN,
  STMT_TYPE_DECLARE: constants.STMT_TYPE_DECLARE,
  STMT_TYPE_CALL: constants.STMT_TYPE_CALL,
  STMT_TYPE_EXPLAIN_PLAN: constants.STMT_TYPE_EXPLAIN_PLAN,
  STMT_TYPE_MERGE: constants.STMT_TYPE_MERGE,
  STMT_TYPE_ROLLBACK: constants.STMT_TYPE_ROLLBACK,
  STMT_TYPE_COMMIT: constants.STMT_TYPE_COMMIT,

  // shutdown modes
  SHUTDOWN_MODE_DEFAULT: constants.SHUTDOWN_MODE_DEFAULT,
  SHUTDOWN_MODE_TRANSACTIONAL: constants.SHUTDOWN_MODE_TRANSACTIONAL,
  SHUTDOWN_MODE_TRANSACTIONAL_LOCAL:
      constants.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL,
  SHUTDOWN_MODE_IMMEDIATE: constants.SHUTDOWN_MODE_IMMEDIATE,
  SHUTDOWN_MODE_ABORT: constants.SHUTDOWN_MODE_ABORT,
  SHUTDOWN_MODE_FINAL: constants.SHUTDOWN_MODE_FINAL,

  // startup modes
  STARTUP_MODE_DEFAULT: constants.STARTUP_MODE_DEFAULT,
  STARTUP_MODE_FORCE: constants.STARTUP_MODE_FORCE,
  STARTUP_MODE_RESTRICT: constants.STARTUP_MODE_RESTRICT,

  // subscription event types
  SUBSCR_EVENT_TYPE_SHUTDOWN: constants.SUBSCR_EVENT_TYPE_SHUTDOWN,
  SUBSCR_EVENT_TYPE_SHUTDOWN_ANY: constants.SUBSCR_EVENT_TYPE_SHUTDOWN_ANY,
  SUBSCR_EVENT_TYPE_STARTUP: constants.SUBSCR_EVENT_TYPE_STARTUP,
  SUBSCR_EVENT_TYPE_DEREG: constants.SUBSCR_EVENT_TYPE_DEREG,
  SUBSCR_EVENT_TYPE_OBJ_CHANGE: constants.SUBSCR_EVENT_TYPE_OBJ_CHANGE,
  SUBSCR_EVENT_TYPE_QUERY_CHANGE: constants.SUBSCR_EVENT_TYPE_QUERY_CHANGE,
  SUBSCR_EVENT_TYPE_AQ: constants.SUBSCR_EVENT_TYPE_AQ,

  // subscription grouping classes
  SUBSCR_GROUPING_CLASS_TIME: constants.SUBSCR_GROUPING_CLASS_TIME,

  // subscription grouping types
  SUBSCR_GROUPING_TYPE_SUMMARY: constants.SUBSCR_GROUPING_TYPE_SUMMARY,
  SUBSCR_GROUPING_TYPE_LAST: constants.SUBSCR_GROUPING_TYPE_LAST,

  // subscription namespaces
  SUBSCR_NAMESPACE_AQ: constants.SUBSCR_NAMESPACE_AQ,
  SUBSCR_NAMESPACE_DBCHANGE: constants.SUBSCR_NAMESPACE_DBCHANGE,

  // subscription quality of service flags
  SUBSCR_QOS_BEST_EFFORT: constants.SUBSCR_QOS_BEST_EFFORT,
  SUBSCR_QOS_DEREG_NFY: constants.SUBSCR_QOS_DEREG_NFY,
  SUBSCR_QOS_QUERY: constants.SUBSCR_QOS_QUERY,
  SUBSCR_QOS_RELIABLE: constants.SUBSCR_QOS_RELIABLE,
  SUBSCR_QOS_ROWIDS: constants.SUBSCR_QOS_ROWIDS,

  // privileges
  SYSASM: constants.SYSASM,
  SYSBACKUP: constants.SYSBACKUP,
  SYSDBA: constants.SYSDBA,
  SYSDG: constants.SYSDG,
  SYSKM: constants.SYSKM,
  SYSOPER: constants.SYSOPER,
  SYSPRELIM: constants.SYSPRELIM,
  SYSRAC: constants.SYSRAC,

  // bind directions
  BIND_IN: constants.BIND_IN,
  BIND_INOUT: constants.BIND_INOUT,
  BIND_OUT: constants.BIND_OUT,

  // outFormat values
  OUT_FORMAT_ARRAY: constants.OUT_FORMAT_ARRAY,
  OUT_FORMAT_OBJECT: constants.OUT_FORMAT_OBJECT,

  // SODA collection creation modes
  SODA_COLL_MAP_MODE: constants.SODA_COLL_MAP_MODE,

  // pool statuses
  POOL_STATUS_OPEN: constants.POOL_STATUS_OPEN,
  POOL_STATUS_DRAINING: constants.POOL_STATUS_DRAINING,
  POOL_STATUS_CLOSED: constants.POOL_STATUS_CLOSED,
  POOL_STATUS_RECONFIGURING: constants.POOL_STATUS_RECONFIGURING,

  // AQ dequeue wait options
  AQ_DEQ_NO_WAIT: constants.AQ_DEQ_NO_WAIT,
  AQ_DEQ_WAIT_FOREVER: constants.AQ_DEQ_WAIT_FOREVER,

  // AQ dequeue modes
  AQ_DEQ_MODE_BROWSE: constants.AQ_DEQ_MODE_BROWSE,
  AQ_DEQ_MODE_LOCKED: constants.AQ_DEQ_MODE_LOCKED,
  AQ_DEQ_MODE_REMOVE: constants.AQ_DEQ_MODE_REMOVE,
  AQ_DEQ_MODE_REMOVE_NO_DATA: constants.AQ_DEQ_MODE_REMOVE_NO_DATA,

  // AQ dequeue navigation flags
  AQ_DEQ_NAV_FIRST_MSG: constants.AQ_DEQ_NAV_FIRST_MSG,
  AQ_DEQ_NAV_NEXT_TRANSACTION: constants.AQ_DEQ_NAV_NEXT_TRANSACTION,
  AQ_DEQ_NAV_NEXT_MSG: constants.AQ_DEQ_NAV_NEXT_MSG,

  // AQ message delivery modes
  AQ_MSG_DELIV_MODE_PERSISTENT: constants.AQ_MSG_DELIV_MODE_PERSISTENT,
  AQ_MSG_DELIV_MODE_BUFFERED: constants.AQ_MSG_DELIV_MODE_BUFFERED,
  AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED:
      constants.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED,

  // AQ message states
  AQ_MSG_STATE_READY: constants.AQ_MSG_STATE_READY,
  AQ_MSG_STATE_WAITING: constants.AQ_MSG_STATE_WAITING,
  AQ_MSG_STATE_PROCESSED: constants.AQ_MSG_STATE_PROCESSED,
  AQ_MSG_STATE_EXPIRED: constants.AQ_MSG_STATE_EXPIRED,

  // AQ visibility flags
  AQ_VISIBILITY_IMMEDIATE: constants.AQ_VISIBILITY_IMMEDIATE,
  AQ_VISIBILITY_ON_COMMIT: constants.AQ_VISIBILITY_ON_COMMIT,

  // TPC/XA begin flags Constants
  TPC_BEGIN_JOIN: constants.TPC_BEGIN_JOIN,
  TPC_BEGIN_NEW: constants.TPC_BEGIN_NEW,
  TPC_BEGIN_PROMOTE: constants.TPC_BEGIN_PROMOTE,
  TPC_BEGIN_RESUME: constants.TPC_BEGIN_RESUME,

  // TPC/XA two-phase commit flags
  TPC_END_NORMAL: constants.TPC_END_NORMAL,
  TPC_END_SUSPEND: constants.TPC_END_SUSPEND,

  // database type aliases
  BLOB: constants.DB_TYPE_BLOB,
  BUFFER: constants.DB_TYPE_RAW,
  CLOB: constants.DB_TYPE_CLOB,
  CURSOR: constants.DB_TYPE_CURSOR,
  DATE: constants.DB_TYPE_TIMESTAMP_LTZ,
  NCLOB: constants.DB_TYPE_NCLOB,
  NUMBER: constants.DB_TYPE_NUMBER,
  STRING: constants.DB_TYPE_VARCHAR,

  // outFormat aliases
  ARRAY: constants.OUT_FORMAT_ARRAY,
  OBJECT: constants.OUT_FORMAT_OBJECT,

  // property getters
  get autoCommit() {
    return settings.autoCommit;
  },

  get connectionClass() {
    return settings.connectionClass;
  },

  get dbObjectAsPojo() {
    return settings.dbObjectAsPojo;
  },

  get edition() {
    return settings.edition;
  },

  get errorOnConcurrentExecute() {
    return settings.errorOnConcurrentExecute;
  },

  get events() {
    return settings.events;
  },

  get externalAuth() {
    return settings.externalAuth;
  },

  get fetchArraySize() {
    return settings.fetchArraySize;
  },

  get fetchAsBuffer() {
    return settings.fetchAsBuffer;
  },

  get fetchAsString() {
    return settings.fetchAsString;
  },

  get lobPrefetchSize() {
    return settings.lobPrefetchSize;
  },

  get maxRows() {
    return settings.maxRows;
  },

  get oracleClientVersion() {
    if (_initOracleClientArgs === undefined) {
      initOracleClient();
    }
    return settings.oracleClientVersion;
  },

  get oracleClientVersionString() {
    if (_initOracleClientArgs === undefined) {
      initOracleClient();
    }
    return settings.oracleClientVersionString;
  },

  get outFormat() {
    return settings.outFormat;
  },

  get poolIncrement() {
    return settings.poolIncrement;
  },

  get poolMax() {
    return settings.poolMax;
  },

  get poolMaxPerShard() {
    return settings.poolMaxPerShard;
  },

  get poolMin() {
    return settings.poolMin;
  },

  get poolPingInterval() {
    return settings.poolPingInterval;
  },

  get poolTimeout() {
    return settings.poolTimeout;
  },

  get prefetchRows() {
    return settings.prefetchRows;
  },

  get stmtCacheSize() {
    return settings.stmtCacheSize;
  },

  get version() {
    return constants.VERSION_MAJOR * 10000 + constants.VERSION_MINOR * 100 +
        constants.VERSION_PATCH;
  },

  get versionString() {
    return constants.VERSION_STRING;
  },

  get versionSuffix() {
    return constants.VERSION_SUFFIX;
  },

  // property setters
  set autoCommit(value) {
    nodbUtil.assert(typeof value === 'boolean', 'NJS-004', "autoCommit");
    settings.autoCommit = value;
  },

  set connectionClass(value) {
    nodbUtil.assert(typeof value === 'string', 'NJS-004', "connectionClass");
    settings.connectionClass = value;
  },

  set dbObjectAsPojo(value) {
    nodbUtil.assert(typeof value === 'boolean', 'NJS-004', "dbObjectAsPojo");
    settings.dbObjectAsPojo = value;
  },

  set edition(value) {
    nodbUtil.assert(typeof value === 'string', 'NJS-004', "edition");
    settings.edition = value;
  },

  set errorOnConcurrentExecute(value) {
    nodbUtil.assert(typeof value === 'boolean', 'NJS-004',
      "errorOnConcurrentExecute");
    settings.errorOnConcurrentExecute = value;
  },

  set events(value) {
    nodbUtil.assert(typeof value === 'boolean', 'NJS-004', "events");
    settings.events = value;
  },

  set externalAuth(value) {
    nodbUtil.assert(typeof value === 'boolean', 'NJS-004', "externalAuth");
    settings.externalAuth = value;
  },

  set fetchArraySize(value) {
    nodbUtil.assert(Number.isInteger(value) && value > 0, 'NJS-004',
      "fetchArraySize");
    settings.fetchArraySize = value;
  },

  set fetchAsBuffer(value) {
    nodbUtil.assert(Array.isArray(value), 'NJS-004', "fetchAsBuffer");
    for (const element of value) {
      nodbUtil.assert(Number.isInteger(element) && element > 0, 'NJS-004',
        "fetchAsBuffer");
      if (element !== constants.DB_TYPE_BLOB) {
        throw new Error(nodbUtil.getErrorMessage('NJS-021'));
      }
    }
    settings.fetchAsBuffer = value;
  },

  set fetchAsString(value) {
    nodbUtil.assert(Array.isArray(value), 'NJS-004', "fetchAsString");
    for (const element of value) {
      nodbUtil.assert(Number.isInteger(element) && element > 0, 'NJS-004',
        "fetchAsString");
      if (element != constants.DB_TYPE_NUMBER &&
          element != constants.DB_TYPE_TIMESTAMP_LTZ &&
          element != constants.DB_TYPE_RAW &&
          element != constants.DB_TYPE_CLOB &&
          element != constants.DB_TYPE_NCLOB &&
          element != constants.DB_TYPE_JSON) {
        throw new Error(nodbUtil.getErrorMessage('NJS-021'));
      }
    }
    settings.fetchAsString = value;
  },

  set lobPrefetchSize(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "lobPrefetchSize");
    settings.lobPrefetchSize = value;
  },

  set maxRows(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "maxRows");
    settings.maxRows = value;
  },

  set outFormat(value) {
    if (value !== constants.OUT_FORMAT_ARRAY &&
        value !== constants.OUT_FORMAT_OBJECT) {
      throw new Error(nodbUtil.getErrorMessage('NJS-004', "outFormat"));
    }
    settings.outFormat = value;
  },

  set poolIncrement(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "poolIncrement");
    settings.poolIncrement = value;
  },

  set poolMax(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "poolMax");
    settings.poolMax = value;
  },

  set poolMaxPerShard(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "poolMaxPerShard");
    settings.poolMaxPerShard = value;
  },

  set poolMin(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "poolMin");
    settings.poolMin = value;
  },

  set poolPingInterval(value) {
    nodbUtil.assert(Number.isInteger(value) && value < 2 ** 31 &&
        value >= (-2) ** 31, 'NJS-004', "poolPingInterval");
    settings.poolPingInterval = value;
  },

  set poolTimeout(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "poolTimeout");
    settings.poolTimeout = value;
  },

  set prefetchRows(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "prefetchRows");
    settings.prefetchRows = value;
  },

  set stmtCacheSize(value) {
    nodbUtil.assert(Number.isInteger(value) && value >= 0, 'NJS-004',
      "stmtCacheSize");
    settings.stmtCacheSize = value;
  },

};
