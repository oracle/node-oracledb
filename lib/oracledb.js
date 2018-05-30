/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
var binaryReleasePath = '../build/Release/oracledb.node';
var binaryDebugPath = '../build/Debug/oracledb.node';

// Load the node-oracledb binary add-on that was built when 'npm
// install' invoked node-gyp.
// The Debug version of node-oracledb will only exist if 'npm install
// --debug oracledb' was used.  Typically only the maintainers of
// node-oracledb do this.
try {
  oracledbCLib =  require(binaryReleasePath);
} catch (err) {
  var nodeInfo = process.versions.node + ' (' + process.platform + ', ' + process.arch +')\n';
  var fullReleasePath = require('path').resolve(__dirname, binaryReleasePath);
  if (err.code === 'MODULE_NOT_FOUND') {
    try {
      oracledbCLib = require(binaryDebugPath);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        // Neither Release or Debug binary was found but assume users wanted Release binary
        nodeInfo += 'Cannot find module ' + fullReleasePath + '\n' + getInfo();
        throw new Error(nodbUtil.getErrorMessage('NJS-045', nodeInfo));
      } else {
        nodeInfo += 'Cannot load ' + binaryDebugPath + '\n';
        nodeInfo += 'Node.js require() error was: \n  ' + err.message + '\n' + getInfo();
        throw new Error(nodbUtil.getErrorMessage('NJS-045', nodeInfo));
      }
    }
  } else {
    if (err.message.startsWith('DPI-1047:')) {
      // Release add-on binary loaded OK, but ODPI-C can't load Oracle client
      nodeInfo += 'Node.js require() error was: \n  ' + err.message + '\n';
      nodeInfo += 'Node.js require() mapped to ' + fullReleasePath + '\n' + getInfo();
      throw new Error(nodbUtil.getErrorMessage('NJS-045', nodeInfo));
    } else {
      nodeInfo += 'Cannot load ' + fullReleasePath + '\n' + err.message + '\n' + getInfo();
      throw new Error(nodbUtil.getErrorMessage('NJS-045', nodeInfo));
    }
  }
}

oracledbCLib.Oracledb.prototype.newLob = function(iLob) {
  return new Lob(iLob, null, oracledbInst);
};


// Return a string with installation usage tips that may be helpful
function getInfo() {
  var arch, url, mesg = '';
  mesg = 'Node-oracledb installation instructions: ';
  mesg += 'https://oracle.github.io/node-oracledb/INSTALL.html\n';
  if (process.platform === 'linux') {
    if (process.arch === 'x64') {
      url = 'http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html\n';
      arch = '64-bit';
    } else if (process.arch === 'x32') {
      url = 'http://www.oracle.com/technetwork/topics/linuxsoft-082809.html\n';
      arch = '32-bit';
    } else {
      url = 'http://www.oracle.com/technetwork/database/database-technologies/instant-client/overview/index.html\n';
      arch = process.arch;
    }
    mesg += 'You must have ' + arch + ' Oracle client libraries in LD_LIBRARY_PATH, or configured with ldconfig.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install the Instant Client Basic or Basic Light package from \n';
    mesg += url;
  } else if (process.platform === 'darwin') {
    if (process.arch === 'x64') {
      url = 'http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html';
      arch = '64-bit';
    } else if (process.arch === 'x32') {
      url = 'http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html';
      arch = '32-bit';
    } else {
      url = 'http://www.oracle.com/technetwork/database/database-technologies/instant-client/overview/index.html\n';
      arch = process.arch;
    }
    mesg += 'You must have the ' + arch + ' Oracle Instant Client Basic or Basic Light package in ~/lib or /usr/local/lib\n';
    mesg += 'They can be downloaded from ' + url;
  } else if (process.platform === 'win32') {
    if (process.arch === 'x64') {
      url = 'http://www.oracle.com/technetwork/topics/winx64soft-089540.html\n';
      arch = '64-bit';
    } else if (process.arch === 'x32') {
      url = 'http://www.oracle.com/technetwork/topics/winsoft-085727.html\n';
      arch = '32-bit';
    } else {
      url = 'http://www.oracle.com/technetwork/database/database-technologies/instant-client/overview/index.html\n';
      arch = process.arch;
    }
    mesg += 'You must have ' + arch + ' Oracle client libraries in your PATH environment variable.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install the Instant Client Basic or Basic Light package from\n';
    mesg += url;
    mesg += 'A Microsoft Visual Studio Redistributable suitable for your Oracle client library version must be available.\n';
  } else {
    url = 'http://www.oracle.com/technetwork/database/database-technologies/instant-client/overview/index.html\n';
    mesg += 'You must have ' + process.arch + ' Oracle client libraries in your operating system library search path.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install an Instant Client Basic or Basic Light package from: \n';
    mesg += url;
  }
  return mesg;
}

// This createPool function is used the override the createPool method of the
// Oracledb class, which is defined in the C layer. The override allows us to do
// things like extend out the pool instance prior to passing it to the caller.
function createPool(poolAttrs, createPoolCb) {
  var self = this;
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

      createPoolCb(err);

      return;
    }

    if (poolAlias) {
      poolCache[poolAlias] = poolInst;

      // It's now safe to remove this alias from the tempUsedPoolAliases.
      delete tempUsedPoolAliases[poolAlias];
    }

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
  var connAttrs;
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

    pool.getConnection(getConnectionCb);
  } else {
    // Allow user to use connectionString as an alias for connectString.
    if (connAttrs.connectString === undefined) {
      connAttrs.connectString = connAttrs.connectionString;
    }

    self._getConnection(connAttrs, function(err, connInst) {
      if (err) {
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
      queueRequests: {
        value: true,
        enumerable: true,
        writable: true
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
