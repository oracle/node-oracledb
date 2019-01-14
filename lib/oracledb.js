/* Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *****************************************************************************/

'use strict';

var oracledbCLib;
var oracledbInst;
var Lob = require('./lob.js').Lob;
var pool = require('./pool.js');
var connection = require('./connection.js');
var nodbUtil = require('./util.js');
var createPoolPromisified;
var getConnectionPromisified;
var poolCache = {};
var tempUsedPoolAliases = {};
var defaultPoolAlias = 'default';

//  Load the Oracledb binary

var binaryLocations = [
  '../' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE,  // pre-built binary
  '../' + nodbUtil.RELEASE_DIR + '/' + 'oracledb.node',       // binary built from source
  '../build/Debug/oracledb.node'                              // debug binary
];

for (var i = 0; i < binaryLocations.length; i++) {
  try {
    oracledbCLib = require(binaryLocations[i]);
    break;
  } catch(err) {
    if (err.code !== 'MODULE_NOT_FOUND' || i == binaryLocations.length - 1) {
      var nodeInfo;
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

// Oracledb functions and classes

oracledbCLib.Oracledb.prototype.newLob = function(iLob) {
  return new Lob(iLob, null, oracledbInst);
};

// This createPool function is used the override the createPool method of the
// Oracledb class, which is defined in the C layer. The override allows us to do
// things like extend out the pool instance prior to passing it to the caller.
function createPool(poolAttrs, createPoolCb) {
  var self = this;
  var sessionCallback;
  var poolAlias;

  // Initial argument count and type checks are done first and throw in the same
  // call stack.
  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(nodbUtil.isObject(poolAttrs), 'NJS-006', 1);
  nodbUtil.assert(typeof createPoolCb === 'function', 'NJS-006', 2);

  // Allow user to use connectionString as an alias for connectString.
  if (poolAttrs.connectString === undefined) {
    poolAttrs.connectString = poolAttrs.connectionString;
  }

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
    pool.extend(poolInst, poolAttrs, poolAlias, self);

    poolInst.on('_after_close', function() {
      var pool = this;

      if (pool.poolAlias) {
        delete poolCache[pool.poolAlias];
      }
    });

    createPoolCb(null, poolInst);
  });
}

createPoolPromisified = nodbUtil.promisify(createPool);

// The getPool function is a synchronous method used to retrieve pools from the
// pool cache.
function getPool(poolAlias) {
  var pool;

  nodbUtil.assert(arguments.length < 2, 'NJS-009');

  if (poolAlias) {
    nodbUtil.assert(typeof poolAlias === 'string' || typeof poolAlias === 'number', 'NJS-006', 1);
  }

  poolAlias = poolAlias || defaultPoolAlias;

  pool = poolCache[poolAlias];

  if (!pool) {
    throw new Error(nodbUtil.getErrorMessage('NJS-047', poolAlias));
  }

  return pool;
}

// This getConnection function is used the override the getConnection method of the
// Oracledb class, which is defined in the C layer. The override allows us to do
// things like extend out the connection instance prior to passing it to the caller.
function getConnection(a1, a2) {
  var self = this;
  var pool;
  var poolAlias;
  var connAttrs = {};
  var getConnectionCb;

  nodbUtil.assert(arguments.length < 3, 'NJS-009');

  // Verify the number and types of arguments, then initialize the local poolAlias,
  // connAttrs, and getConnectionCb variables based on the arguments.
  switch (arguments.length) {
    case 1:
      nodbUtil.assert(typeof a1 === 'function', 'NJS-006', 1);

      poolAlias = defaultPoolAlias;
      getConnectionCb = a1;

      break;
    case 2:
      nodbUtil.assert(typeof a1 === 'string' || nodbUtil.isObject(a1), 'NJS-006', 1);
      nodbUtil.assert(typeof a2 === 'function', 'NJS-006', 2);

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
    // Allow user to use connectionString as an alias for connectString.
    if (connAttrs.connectString === undefined) {
      connAttrs.connectString = connAttrs.connectionString;
    }

    self._getConnection(connAttrs, function(err, connInst) {
      if (err) {
        if (err.message.match(/DPI-1047/)) {
          err.message += "\n" + nodbUtil.getInstallHelp();
        }
        getConnectionCb(err);
        return;
      }

      connection.extend(connInst, self);

      getConnectionCb(null, connInst);
    });
  }
}

getConnectionPromisified = nodbUtil.promisify(getConnection);

// The extend method is used to extend the Oracledb instance from the C layer with
// custom properties and method overrides. References to the original methods are
// maintained so they can be invoked by the overriding method at the right time.
function extend(oracledb) {
  // Using Object.defineProperties to add properties to the Oracledb instance with
  // special properties, such as enumerable but not writable. A number of constants
  // (uppercase names) are added for use in various method calls.
  Object.defineProperties(
    oracledb,
    {
      _oracledb: { // Known to be used in util.js' promisify function.
        value: oracledb
      },
      DEFAULT: {
        value: 0,
        enumerable: true
      },
      CQN_OPCODE_ALL_OPS: {
        value: 0,
        enumerable: true
      },
      CQN_OPCODE_ALL_ROWS: {
        value: 1,
        enumerable: true
      },
      CQN_OPCODE_ALTER: {
        value: 16,
        enumerable: true
      },
      CQN_OPCODE_DELETE: {
        value: 8,
        enumerable: true
      },
      CQN_OPCODE_DROP: {
        value: 32,
        enumerable: true
      },
      CQN_OPCODE_INSERT: {
        value: 2,
        enumerable: true
      },
      CQN_OPCODE_UPDATE: {
        value: 4,
        enumerable: true
      },
      DB_TYPE_VARCHAR: {
        value: 1,
        enumerable: true
      },
      DB_TYPE_NUMBER: {
        value: 2,
        enumerable: true
      },
      DB_TYPE_LONG: {
        value: 8,
        enumerable: true
      },
      DB_TYPE_DATE: {
        value: 12,
        enumerable: true
      },
      DB_TYPE_RAW: {
        value: 23,
        enumerable: true
      },
      DB_TYPE_LONG_RAW: {
        value: 24,
        enumerable: true
      },
      DB_TYPE_CHAR: {
        value: 96,
        enumerable: true
      },
      DB_TYPE_BINARY_FLOAT: {
        value: 100,
        enumerable: true
      },
      DB_TYPE_BINARY_DOUBLE: {
        value: 101,
        enumerable: true
      },
      DB_TYPE_ROWID: {
        value: 104,
        enumerable: true
      },
      DB_TYPE_CLOB: {
        value: 112,
        enumerable: true
      },
      DB_TYPE_BLOB: {
        value: 113,
        enumerable: true
      },
      DB_TYPE_TIMESTAMP: {
        value: 187,
        enumerable: true
      },
      DB_TYPE_TIMESTAMP_TZ: {
        value: 188,
        enumerable: true
      },
      DB_TYPE_TIMESTAMP_LTZ: {
        value: 232,
        enumerable: true
      },
      DB_TYPE_NVARCHAR: {
        value : 1001,
        enumerable : true
      },
      DB_TYPE_NCHAR: {
        value : 1096,
        enumerable : true
      },
      DB_TYPE_NCLOB: {
        value : 1112,
        enumerable : true
      },
      STMT_TYPE_UNKNOWN: {
        value : 0,
        enumerable : true
      },
      STMT_TYPE_SELECT: {
        value : 1,
        enumerable : true
      },
      STMT_TYPE_UPDATE: {
        value : 2,
        enumerable : true
      },
      STMT_TYPE_DELETE: {
        value : 3,
        enumerable : true
      },
      STMT_TYPE_INSERT: {
        value : 4,
        enumerable : true
      },
      STMT_TYPE_CREATE: {
        value : 5,
        enumerable : true
      },
      STMT_TYPE_DROP: {
        value : 6,
        enumerable : true
      },
      STMT_TYPE_ALTER: {
        value : 7,
        enumerable : true
      },
      STMT_TYPE_BEGIN: {
        value : 8,
        enumerable : true
      },
      STMT_TYPE_DECLARE: {
        value : 9,
        enumerable : true
      },
      STMT_TYPE_CALL: {
        value : 10,
        enumerable : true
      },
      STMT_TYPE_EXPLAIN_PLAN: {
        value : 15,
        enumerable : true
      },
      STMT_TYPE_MERGE: {
        value : 16,
        enumerable : true
      },
      STMT_TYPE_ROLLBACK: {
        value : 17,
        enumerable : true
      },
      STMT_TYPE_COMMIT: {
        value : 21,
        enumerable : true
      },
      STRING: {
        value: 2001,
        enumerable: true
      },
      SUBSCR_EVENT_TYPE_DEREG: {
        value: 5,
        enumerable: true
      },
      SUBSCR_EVENT_TYPE_OBJ_CHANGE: {
        value: 6,
        enumerable: true
      },
      SUBSCR_EVENT_TYPE_QUERY_CHANGE: {
        value: 7,
        enumerable: true
      },
      SUBSCR_EVENT_TYPE_AQ: {
        value: 100,
        enumerable: true
      },
      SUBSCR_GROUPING_CLASS_TIME: {
        value: 1,
        enumerable: true
      },
      SUBSCR_GROUPING_TYPE_SUMMARY: {
        value: 1,
        enumerable: true
      },
      SUBSCR_GROUPING_TYPE_LAST: {
        value: 2,
        enumerable: true
      },
      SUBSCR_NAMESPACE_AQ: {
        value: 1,
        enumerable: true
      },
      SUBSCR_NAMESPACE_DBCHANGE: {
        value: 2,
        enumerable: true
      },
      SUBSCR_QOS_BEST_EFFORT: {
        value: 16,
        enumerable: true
      },
      SUBSCR_QOS_DEREG_NFY: {
        value: 2,
        enumerable: true
      },
      SUBSCR_QOS_QUERY: {
        value: 8,
        enumerable: true
      },
      SUBSCR_QOS_RELIABLE: {
        value: 1,
        enumerable: true
      },
      SUBSCR_QOS_ROWIDS: {
        value: 4,
        enumerable: true
      },
      NUMBER: {
        value: 2002,
        enumerable: true
      },
      DATE: {
        value: 2003,
        enumerable: true
      },
      CURSOR: {
        value: 2004,
        enumerable: true
      },
      BUFFER: {
        value: 2005,
        enumerable: true
      },
      CLOB: {
        value: 2006,
        enumerable: true
      },
      BLOB: {
        value: 2007,
        enumerable: true
      },
      SYSDBA: {
        value: 2,
        enumerable: true
      },
      SYSOPER: {
        value: 4,
        enumerable: true
      },
      SYSASM: {
        value: 32768,
        enumerable: true
      },
      SYSBACKUP: {
        value: 131072,
        enumerable: true
      },
      SYSDG: {
        value: 262144,
        enumerable: true
      },
      SYSKM: {
        value: 524288,
        enumerable: true
      },
      SYSRAC: {
        value: 1048576,
        enumerable: true
      },
      BIND_IN: {
        value: 3001,
        enumerable: true
      },
      BIND_INOUT: {
        value: 3002,
        enumerable: true
      },
      BIND_OUT: {
        value: 3003,
        enumerable: true
      },
      ARRAY: {
        value: 4001,
        enumerable: true
      },
      OBJECT: {
        value: 4002,
        enumerable: true
      },
      SODA_COLL_MAP_MODE: {
        value: 5001,
        enumerable : true
      },
      POOL_STATUS_OPEN: {
        value: 6000,
        enumerable: true
      },
      POOL_STATUS_DRAINING: {
        value: 6001,
        enumerable: true
      },
      POOL_STATUS_CLOSED: {
        value: 6002,
        enumerable: true
      },
      Promise: {
        value: global.Promise,
        enumerable: true,
        writable: true
      },
      Oracledb: {
        value: oracledbCLib.Oracledb,
        enumerable: true
      },
      Connection: {
        value: oracledbCLib.Connection,
        enumerable: true
      },
      Lob: {
        value: Lob,
        enumerable: true
      },
      Pool: {
        value: oracledbCLib.Pool,
        enumerable: true
      },
      ResultSet: {
        value: oracledbCLib.ResultSet,
        enumerable: true
      },
      queueTimeout: {
        value: 60000,
        enumerable: true,
        writable: true
      },
      _createPool: {
        value: oracledb.createPool
      },
      createPool: {
        value: createPoolPromisified,
        enumerable: true,
        writable: true
      },
      getPool: {
        value: getPool,
        enumerable: true,
        writable: true
      },
      _getConnection: {
        value: oracledb.getConnection
      },
      getConnection: {
        value: getConnectionPromisified,
        enumerable: true,
        writable: true
      }
    }
  );
}

oracledbInst = new oracledbCLib.Oracledb();

extend(oracledbInst);

module.exports = oracledbInst;
