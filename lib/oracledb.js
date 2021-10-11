// Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved

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

const nodbUtil = require('./util.js');
const util = require('util');

// This version of node-oracledb works with Node.js 8.16, 10.16 or
// later.  The test stops hard-to-interpret runtime errors and crashes
// with older Node.js versions.  Also Node.js 8.16 and 10.16 (and
// 12.0) contain an important Node-API performance regression fix.  If
// you're using the obsolete Node.js 9 or 11 versions, you're on your
// own regarding performance and functionality
let vs = process.version.substring(1).split(".").map(Number);
if (vs[0] < 8 || (vs[0] === 8 && vs[1] < 16)) {
  throw new Error(nodbUtil.getErrorMessage('NJS-069', nodbUtil.PACKAGE_JSON_VERSION, "8.16"));
} else if ((vs[0] === 10 && vs[1] < 16)) {
  throw new Error(nodbUtil.getErrorMessage('NJS-069', nodbUtil.PACKAGE_JSON_VERSION, "10.16"));
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
const SodaDatabase = require('./sodaDatabase.js');
const SodaCollection = require('./sodaCollection.js');
const SodaDocCursor = require('./sodaDocCursor.js');
const SodaDocument = require('./sodaDocument.js');
const SodaOperation = require('./sodaOperation.js');

let poolCache = {};
let tempUsedPoolAliases = {};
const defaultPoolAlias = 'default';

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


class OracleDb {

  constructor() {
    this.queueTimeout = 60000;
    this.queueMax     = 500;
    this.errorOnConcurrentExecute = false;
  }

  // extend class with promisified functions
  _extend(_oracledb) {
    this.getConnection = nodbUtil.callbackify(getConnection).bind(_oracledb);
    this.createPool = nodbUtil.callbackify(createPool).bind(_oracledb);
    this.shutdown = nodbUtil.callbackify(shutdown).bind(_oracledb);
    this.startup = nodbUtil.callbackify(startup).bind(_oracledb);
  }

  // temporary method for determining if an object is a date until
  // napi_is_date() can be used (when Node-API v5 can be used)
  _isDate(val) {
    return util.isDate(val);
  }

  // retrieves a pool from the pool cache (synchronous method)
  getPool(poolAlias) {
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

  initOracleClient(arg1) {
    let options = {};
    nodbUtil.checkArgCount(arguments, 0, 1);
    if (arg1 !== undefined) {
      nodbUtil.assert(nodbUtil.isObject(arg1), 'NJS-005', 1);
      options = arg1;
    }
    this._initOracleClient(options);
  }

}

// Oracledb functions and classes

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

  // Need to prevent another call in the same stack from succeeding, otherwise
  // two pools could be created with the same poolAlias and the second one that
  // comes back would overwrite the first in the cache.
  if (poolAlias) {
    tempUsedPoolAliases[poolAlias] = true;
  }

  try {
    const pool = await this._createPool(adjustedPoolAttrs);

    if (poolAlias) {
      poolCache[poolAlias] = pool;

      // It's now safe to remove this alias from the tempUsedPoolAliases.
      delete tempUsedPoolAliases[poolAlias];
    }

    pool._setup(poolAttrs, poolAlias, this);
    pool.on('_afterPoolClose', () => {
      if (pool.poolAlias) {
        delete poolCache[pool.poolAlias];
      }
    });

    return pool;

  } catch (err) {

    // We need to free this up since the creation of the pool failed.
    if (poolAlias) {
      delete tempUsedPoolAliases[poolAlias];
    }

    // add installation help instructions to error message, if applicable
    if (err.message.match(/DPI-1047/)) {
      err.message += "\n" + nodbUtil.getInstallHelp();
    }

    throw err;
  }
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
    try {
      return await this._getConnection(connAttrs);
    } catch (err) {
      if (err.message.match(/DPI-1047/)) {
        err.message += "\n" + nodbUtil.getInstallHelp();
      }
      throw err;
    }
  }
}


//-----------------------------------------------------------------------------
// shutdown()
//   Shuts down the database.
//-----------------------------------------------------------------------------
async function shutdown(a1, a2) {
  let connAttr = {};
  let shutdownMode = this.SHUTDOWN_MODE_DEFAULT;

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
    privilege: this.SYSOPER
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
//   Starts up the database.
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


// create instance which will be exported
let oracleDbInst = new OracleDb();

// add classes to prototype
let proto = Object.getPrototypeOf(oracleDbInst);
proto.OracleDb = OracleDb;
proto.AqDeqOptions = AqDeqOptions;
proto.AqEnqOptions = AqEnqOptions;
proto.AqMessage = AqMessage;
proto.AqQueue = AqQueue;
proto.BaseDbObject = BaseDbObject;
proto.Connection = Connection;
proto.Lob = Lob;
proto.Pool = Pool;
proto.PoolStatistics = PoolStatistics;
proto.ResultSet = ResultSet;
proto.SodaDatabase = SodaDatabase;
proto.SodaCollection = SodaCollection;
proto.SodaDocCursor = SodaDocCursor;
proto.SodaDocument = SodaDocument;
proto.SodaOperation = SodaOperation;

// call C to extend classes
oracledbCLib.init(oracleDbInst);

module.exports = oracleDbInst;
