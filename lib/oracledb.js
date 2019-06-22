// Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved

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

// This version of node-oracledb works with Node.js 8.16, 10.16 or
// later.  The test stops hard-to-interpret runtime errors and crashes
// with older Node.js versions.  Also Node.js 8.16 and 10.16 (and
// 12.0) contain an important N-API performance regression fix.  If
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
const ResultSet = require('./resultset.js');
const SodaDatabase = require('./sodaDatabase.js');
const SodaCollection = require('./sodaCollection.js');
const SodaDocCursor = require('./sodaDocCursor.js');
const SodaDocument = require('./sodaDocument.js');
const SodaOperation = require('./sodaOperation.js');

let poolCache = {};
let tempUsedPoolAliases = {};
const defaultPoolAlias = 'default';

//  Load the Oracledb binary

const binaryLocations = [
  '../' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE,  // pre-built binary
  '../' + nodbUtil.RELEASE_DIR + '/' + 'oracledb.node',       // binary built from source
  '../build/Debug/oracledb.node'                              // debug binary
];

let oracledbCLib;
for (let i = 0; i < binaryLocations.length; i++) {
  try {
    oracledbCLib = require(binaryLocations[i]);
    break;
  } catch(err) {
    if (err.code !== 'MODULE_NOT_FOUND' || i == binaryLocations.length - 1) {
      let nodeInfo;
      if (err.code === 'MODULE_NOT_FOUND') {
        // none of the three binaries could be found
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
    this.Promise = global.Promise;
  }

  // extend class with promisified functions
  _extend(oracleDbInst) {
    this.getConnection = nodbUtil.promisify(oracleDbInst, getConnection);
    this.createPool = nodbUtil.promisify(oracleDbInst, createPool);
  }

  // retrieves a pool from the pool cache (synchronous method)
  getPool(poolAlias) {
    let pool;

    nodbUtil.assert(arguments.length < 2, 'NJS-009');

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

}

// Oracledb functions and classes

// oracledbCLib.OracleDb.prototype.newLob = function(iLob) {
//   return new Lob(iLob, null, oracledbInst);
// };

// This createPool function is used the override the createPool method of the
// Oracledb class, which is defined in the C layer. The override allows us to do
// things like extend out the pool instance prior to passing it to the caller.
function createPool(poolAttrs, createPoolCb) {
  const self = this;
  let sessionCallback;
  let poolAlias;

  // Initial argument count and type checks are done first and throw in the same
  // call stack.
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(poolAttrs), 'NJS-005', 1);
  nodbUtil.assert(typeof createPoolCb === 'function', 'NJS-005', 2);

  // Additional validations should pass errors via the callback. Need to ensure
  // that errors are raised prior to actually creating the pool via _createPool.
  if (poolAttrs.poolAlias !== undefined) {
    if (typeof poolAttrs.poolAlias !== 'string' || poolAttrs.poolAlias.length === 0) {
      createPoolCb(new Error(nodbUtil.getErrorMessage('NJS-004', 'poolAttrs.poolAlias')));
      return;
    }

    poolAlias = poolAttrs.poolAlias;
  } else if (poolAttrs.poolAlias === undefined
    && !poolCache[defaultPoolAlias]
    && !tempUsedPoolAliases[defaultPoolAlias]
  ) {
    poolAlias = defaultPoolAlias;
  }

  if (poolCache[poolAlias] || tempUsedPoolAliases[poolAlias]) {
    createPoolCb(new Error(nodbUtil.getErrorMessage('NJS-046', poolAlias)));
    return;
  }

  // Retain local callback for fixing up tags on connections acquired from the
  // pool, if applicable; this value can either be a function which will be
  // called when a connection is acquired from the pool which doesn't have the
  // requested tag or will be a string defining a PL/SQL procedure which will
  // be called by the database when a connection acquired from the pool doesn't
  // have the requested tag
  sessionCallback = poolAttrs.sessionCallback;
  if (typeof poolAttrs.sessionCallback === 'function') {
    poolAttrs = Object.assign({}, poolAttrs);
    delete poolAttrs.sessionCallback;
  }

  // Need to prevent another call in the same stack from succeeding, otherwise
  // two pools could be created with the same poolAlias and the second one that
  // comes back would overwrite the first in the cache.
  if (poolAlias) {
    tempUsedPoolAliases[poolAlias] = true;
  }

  self._createPool(poolAttrs, function(err, poolInst) {
    if (err) {
      // We need to free this up since the creation of the pool failed.
      if (poolAlias) {
        delete tempUsedPoolAliases[poolAlias];
      }

      if (err.message.match(/DPI-1047/)) {
        err.message += "\n" + nodbUtil.getInstallHelp();
      }
      createPoolCb(err);

      return;
    }

    if (poolAlias) {
      poolCache[poolAlias] = poolInst;

      // It's now safe to remove this alias from the tempUsedPoolAliases.
      delete tempUsedPoolAliases[poolAlias];
    }

    poolAttrs.sessionCallback = sessionCallback;
    poolInst._setup(poolAttrs, poolAlias, self);

    poolInst.on('_after_close', function() {
      const pool = this;

      if (pool.poolAlias) {
        delete poolCache[pool.poolAlias];
      }
    });

    createPoolCb(null, poolInst);
  });
}

// This getConnection function is used the override the getConnection method of the
// Oracledb class, which is defined in the C layer. The override allows us to do
// things like extend out the connection instance prior to passing it to the caller.
function getConnection(a1, a2) {
  const self = this;
  let pool;
  let poolAlias;
  let connAttrs = {};
  let getConnectionCb;

  nodbUtil.assert(arguments.length < 3, 'NJS-009');

  // Verify the number and types of arguments, then initialize the local poolAlias,
  // connAttrs, and getConnectionCb variables based on the arguments.
  switch (arguments.length) {
    case 1:
      nodbUtil.assert(typeof a1 === 'function', 'NJS-005', 1);

      poolAlias = defaultPoolAlias;
      getConnectionCb = a1;

      break;
    case 2:
      nodbUtil.assert(typeof a1 === 'string' || nodbUtil.isObject(a1), 'NJS-005', 1);
      nodbUtil.assert(typeof a2 === 'function', 'NJS-005', 2);

      if (typeof a1 === 'string') {
        poolAlias = a1;
      } else if (nodbUtil.isObject(a1)) {
        connAttrs = a1;

        if (connAttrs.poolAlias) {
          poolAlias = connAttrs.poolAlias;
        }
      }

      getConnectionCb = a2;

      break;
  }

  // Proceed to execution based on values in local variables. Look for the poolAlias
  // first and only attempt to use connAttrs if the poolAlias isn't set.
  if (poolAlias) {
    pool = poolCache[poolAlias];

    if (!pool) {
      getConnectionCb(new Error(nodbUtil.getErrorMessage('NJS-047', poolAlias)));
      return;
    }

    pool.getConnection(connAttrs, getConnectionCb);
  } else {
    self._getConnection(connAttrs, function(err, connInst) {
      if (err) {
        if (err.message.match(/DPI-1047/)) {
          err.message += "\n" + nodbUtil.getInstallHelp();
        }
        getConnectionCb(err);
        return;
      }

      getConnectionCb(null, connInst);
    });
  }
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
proto.ResultSet = ResultSet;
proto.SodaDatabase = SodaDatabase;
proto.SodaCollection = SodaCollection;
proto.SodaDocCursor = SodaDocCursor;
proto.SodaDocument = SodaDocument;
proto.SodaOperation = SodaOperation;

// call C to extend classes
oracledbCLib.init(oracleDbInst);

module.exports = oracleDbInst;
