/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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

var oracledbCLib;
var oracledbInst;
var Lob = require('./lob.js').Lob;
var pool = require('./pool.js');
var connection = require('./connection.js');

try {
  oracledbCLib =  require('../build/Release/oracledb');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    oracledbCLib = require('../build/Debug/oracledb');
  } else {
    throw err;
  }
}

oracledbCLib.Oracledb.prototype.newLob = function(iLob) {
  return new Lob(iLob, null);
};

// This createPool function is used the override the createPool method of the
// Oracledb class, which is defined in the C layer. The override allows us to do
// things like extend out the pool instance prior to passing it to the caller.
function createPool(poolAttrs, createPoolCb) {
  var self = this;

  self._createPool(poolAttrs, function(err, poolInst) {
    if (err) {
      createPoolCb(err);
      return;
    }

    pool.extend(poolInst, poolAttrs, self);

    createPoolCb(undefined, poolInst);
  });
}

// This getConnection function is used the override the getConnection method of the
// Oracledb class, which is defined in the C layer. The override allows us to do
// things like extend out the connection instance prior to passing it to the caller.
function getConnection(connAttrs, createConnectionCb) {
  var self = this;

  self._getConnection(connAttrs, function(err, connInst) {
    if (err) {
      createConnectionCb(err);
      return;
    }

    connection.extend(connInst);

    createConnectionCb(undefined, connInst);
  });
}

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
      DEFAULT: {
        value: 0,
        enumerable: true
      },
      STRING: {
        value: 2001,
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
        value: createPool,
        enumerable: true,
        writable: true
      },
      _getConnection: {
        value: oracledb.getConnection
      },
      getConnection: {
        value: getConnection,
        enumerable: true,
        writable: true
      }
    }
  );
}

oracledbInst = new oracledbCLib.Oracledb;

extend(oracledbInst);

module.exports = oracledbInst;
