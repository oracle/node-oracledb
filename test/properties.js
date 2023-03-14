/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   58. properties.js
 *
 * DESCRIPTION
 *   Testing getters and setters for oracledb and pool classes.
 *   This test aims to increase the code coverage rate.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('58. properties.js', function() {

  describe('58.1 Oracledb Class', function() {

    const defaultValues = {};

    before('save the default values', function() {
      defaultValues.poolMin          = oracledb.poolMin;
      defaultValues.poolMax          = oracledb.poolMax;
      defaultValues.poolIncrement    = oracledb.poolIncrement;
      defaultValues.poolTimeout      = oracledb.poolTimeout;
      defaultValues.maxRows          = oracledb.maxRows;
      defaultValues.fetchArraySize   = oracledb.fetchArraySize;
      defaultValues.autoCommit       = oracledb.autoCommit;
      defaultValues.dbObjectAsPojo   = oracledb.dbObjectAsPojo;
      defaultValues.connectionClass  = oracledb.connectionClass;
      defaultValues.externalAuth     = oracledb.externalAuth;
      defaultValues.fetchAsString    = oracledb.fetchAsString;
      defaultValues.outFormat        = oracledb.outFormat;
      defaultValues.lobPrefetchSize  = oracledb.lobPrefetchSize;
      defaultValues.queueTimeout     = oracledb.queueTimeout;
      defaultValues.queueMax         = oracledb.queueMax;
      defaultValues.stmtCacheSize    = oracledb.stmtCacheSize;
      defaultValues.poolPingInterval = oracledb.poolPingInterval;
      defaultValues.fetchAsBuffer    = oracledb.fetchAsBuffer;
      defaultValues.edition          = oracledb.edition;
      defaultValues.events           = oracledb.events;
    });

    after('restore the values', function() {
      oracledb.poolMin          = defaultValues.poolMin;
      oracledb.poolMax          = defaultValues.poolMax;
      oracledb.poolIncrement    = defaultValues.poolIncrement;
      oracledb.poolTimeout      = defaultValues.poolTimeout;
      oracledb.maxRows          = defaultValues.maxRows;
      oracledb.fetchArraySize   = defaultValues.fetchArraySize;
      oracledb.autoCommit       = defaultValues.autoCommit;
      oracledb.dbObjectAsPojo   = defaultValues.dbObjectAsPojo;
      oracledb.connectionClass  = defaultValues.connectionClass;
      oracledb.externalAuth     = defaultValues.externalAuth;
      oracledb.fetchAsString    = defaultValues.fetchAsString;
      oracledb.outFormat        = defaultValues.outFormat;
      oracledb.lobPrefetchSize  = defaultValues.lobPrefetchSize;
      oracledb.queueTimeout     = defaultValues.queueTimeout;
      oracledb.queueMax         = defaultValues.queueMax;
      oracledb.stmtCacheSize    = defaultValues.stmtCacheSize;
      oracledb.poolPingInterval = defaultValues.poolPingInterval;
      oracledb.fetchAsBuffer    = defaultValues.fetchAsBuffer;
      oracledb.edition          = defaultValues.edition;
      oracledb.events           = defaultValues.events;
    });

    it('58.1.1 poolMin', function() {
      const t = oracledb.poolMin;
      oracledb.poolMin = t + 1;

      assert.equal(t, defaultValues.poolMin);
      assert.equal(oracledb.poolMin, defaultValues.poolMin + 1);
    });

    it('58.1.2 poolMax', function() {
      const t = oracledb.poolMax;
      oracledb.poolMax = t + 1;

      assert.equal(t, defaultValues.poolMax);
      assert.equal(oracledb.poolMax, defaultValues.poolMax + 1);
    });

    it('58.1.3 poolIncrement', function() {
      const t = oracledb.poolIncrement;
      oracledb.poolIncrement = t + 1;

      assert.equal(t, defaultValues.poolIncrement);
      assert.equal(oracledb.poolIncrement, defaultValues.poolIncrement + 1);
    });

    it('58.1.4 poolTimeout', function() {
      const t = oracledb.poolTimeout;
      oracledb.poolTimeout = t + 1;

      assert.equal(t, defaultValues.poolTimeout);
      assert.equal(oracledb.poolTimeout, defaultValues.poolTimeout + 1);
    });

    it('58.1.5 maxRows', function() {
      const t = oracledb.maxRows;
      oracledb.maxRows = t + 1;

      assert.equal(t, defaultValues.maxRows);
      assert.equal(oracledb.maxRows, defaultValues.maxRows + 1);
    });

    it('58.1.6 fetchArraySize', function() {
      const t = oracledb.fetchArraySize;
      oracledb.fetchArraySize = t + 1;

      assert.equal(t, defaultValues.fetchArraySize);
      assert.equal(oracledb.fetchArraySize, defaultValues.fetchArraySize + 1);
    });

    it('58.1.7 autoCommit', function() {
      const t = oracledb.autoCommit;
      oracledb.autoCommit = !t;

      assert.equal(t, defaultValues.autoCommit);
      assert.equal(oracledb.autoCommit, !defaultValues.autoCommit);

    });

    it('58.1.8 version (read-only)', function() {
      assert.equal(typeof oracledb.version, 'number');
      assert.throws(
        function() {
          oracledb.version = 5;
        },
        "TypeError: Cannot assign to read only property 'version' of object '#<OracleDb>"
      );
    });

    it('58.1.9 connectionClass', function() {
      const t = oracledb.connectionClass;
      oracledb.connectionClass = 'DEVPOOL';
      const cclass = oracledb.connectionClass;

      assert.equal(t, '');
      assert.strictEqual(cclass, 'DEVPOOL');
    });

    it('58.1.10 externalAuth', function() {
      const t = oracledb.externalAuth;
      oracledb.externalAuth = !t;

      assert.equal(t, defaultValues.externalAuth);
      assert.equal(oracledb.externalAuth, !defaultValues.externalAuth);
    });

    it('58.1.11 fetchAsString', function() {
      const t = oracledb.fetchAsString;
      oracledb.fetchAsString = [oracledb.DATE];

      assert.deepEqual(t, defaultValues.fetchAsString);
      assert.notEqual(oracledb.fetchAsString, defaultValues.fetchAsString);
    });

    it('58.1.12 outFormat', function() {
      const t = oracledb.outFormat;
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

      assert.equal(t, oracledb.OUT_FORMAT_ARRAY);
      assert.notEqual(oracledb.outFormat, defaultValues.outFormat);
    });

    it('58.1.13 lobPrefetchSize', function() {
      const t = oracledb.lobPrefetchSize;
      oracledb.lobPrefetchSize = t + 1;

      assert.equal(t, defaultValues.lobPrefetchSize);
      assert.equal(oracledb.lobPrefetchSize, defaultValues.lobPrefetchSize + 1);
    });

    it('58.1.14 oracleClientVersion (read-only)', function() {
      const t = oracledb.oracleClientVersion;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          oracledb.oracleClientVersion = t + 1;
        },
        "TypeError: Cannot assign to read only property 'oracleClientVersion' of object '#<OracleDb>"
      );
    });

    it('58.1.15 queueTimeout', function() {
      const t = oracledb.queueTimeout;
      oracledb.queueTimeout = t + 1000;

      assert.equal(t, defaultValues.queueTimeout);
      assert.notEqual(oracledb.queueTimeout, defaultValues.queueTimeout);
    });

    it('58.1.16 queueMax', function() {
      const t = oracledb.queueMax;
      oracledb.queueMax = t + 1000;

      assert.equal(t, defaultValues.queueMax);
      assert.notEqual(oracledb.queueMax, defaultValues.queueMax);
    });

    it('58.1.17 stmtCacheSize', function() {
      const t = oracledb.stmtCacheSize;
      oracledb.stmtCacheSize = t + 5;

      assert.equal(t, defaultValues.stmtCacheSize);
      assert.notEqual(oracledb.stmtCacheSize, defaultValues.stmtCacheSize);
    });

    it('58.1.18 poolPingInterval', function() {
      const t = oracledb.poolPingInterval;
      oracledb.poolPingInterval = t + 100;

      assert.equal(t, defaultValues.poolPingInterval);
      assert.notEqual(oracledb.poolPingInterval, defaultValues.poolPingInterval);
    });

    it('58.1.19 fetchAsBuffer', function() {
      const t = oracledb.fetchAsBuffer;
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];

      assert.deepEqual(t, defaultValues.fetchAsBuffer);
      assert.notEqual(oracledb.fetchAsBuffer, defaultValues.fetchAsBuffer);
    });

    it('58.1.20 Negative - connectionClass ', function() {
      assert.throws(
        function() {
          oracledb.connectionClass = NaN;
        },
        /NJS-004:/
      );
    });

    it('58.1.21 Negative - autoCommit', function() {
      assert.throws(
        function() {
          oracledb.autoCommit = 2017;
        },
        /NJS-004:/
      );
    });

    it('58.1.22 Negative - outFormat', function() {
      assert.throws(
        function() {
          oracledb.outFormat = 'abc';
        },
        /NJS-004:/
      );
    });

    it('58.1.23 Negative - externalAuth', function() {
      assert.throws(
        function() {
          oracledb.externalAuth = 2017;
        },
        /NJS-004:/
      );
    });

    it('58.1.24 versionString (read-only)', function() {
      const t = oracledb.versionString;
      assert.equal(typeof t, 'string');

      assert.throws(
        function() {
          oracledb.versionString = t + "foobar";
        },
        "TypeError: Cannot assign to read only property 'versionString' of object '#<OracleDb>"
      );
    });

    it('58.1.25 versionSuffix (read-only)', function() {
      const t = oracledb.versionSuffix;

      if (t) // it could be a String, or undefined
        assert.equal(typeof t, 'string');

      assert.throws(
        function() {
          oracledb.versionSuffix = t + "foobar";
        },
        "TypeError: Cannot assign to read only property 'versionSuffix' of object '#<OracleDb>"
      );
    });

    it('58.1.26 oracleClientVersionString (read-only)', function() {
      const t = oracledb.oracleClientVersionString;
      assert.equal(typeof t, 'string');

      assert.throws(
        function() {
          oracledb.oracleClientVersion = t + "foobar";
        },
        "TypeError: Cannot assign to read only property 'oracleClientVersionString' of object '#<OracleDb>"
      );
    });

    it('58.1.27 edition', function() {
      const t = oracledb.edition;
      oracledb.edition = 'foobar';
      const e = oracledb.edition;

      assert.equal(t, '');
      assert.strictEqual(e, 'foobar');
    });

    it('58.1.28 Negative - edition', function() {
      assert.throws(
        function() {
          oracledb.edition = 123;
        },
        /NJS-004: */
      );
    });

    it('58.1.29 events', function() {
      const t = oracledb.events;
      oracledb.events = true;

      assert.strictEqual(t, false);
      assert.strictEqual(oracledb.events, true);
    });

    it('58.1.30 Negative - events', function() {
      assert.throws(
        function() {
          oracledb.events = 'hello';
        },
        /NJS-004: */
      );
    });

    it('58.1.31 dbObjectAsPojo', function() {
      const t = oracledb.dbObjectAsPojo;
      oracledb.dbObjectAsPojo = !t;

      assert.equal(t, defaultValues.dbObjectAsPojo);
      assert.equal(oracledb.dbObjectAsPojo, !defaultValues.dbObjectAsPojo);

    });

    it('58.1.32 Negative - fetchArraySize', function() {
      assert.throws(
        function() {
          oracledb.fetchArraySize = -2017;
        },
        /NJS-004:/
      );
    });

    it('58.1.33 Negative - dbObjectAsPojo', function() {
      assert.throws(
        function() {
          oracledb.dbObjectAsPojo = "oracle";
        },
        /NJS-004:/
      );
    });

    it('58.1.34 Negative - fetchAsString', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = 2022;
        },
        /NJS-004:/
      );

      assert.throws(
        function() {
          oracledb.fetchAsString = [2022];
        },
        /NJS-021:/
      );
    });

    it('58.1.35 Negative - lobPrefetchSize', function() {
      assert.throws(
        function() {
          oracledb.lobPrefetchSize = -2022;
        },
        /NJS-004:/
      );
    });

    it('58.1.36 Negative - maxRows', function() {
      assert.throws(
        function() {
          oracledb.maxRows = -2022;
        },
        /NJS-004:/
      );
    });

    it('58.1.37 Negative - poolIncrement', function() {
      assert.throws(
        function() {
          oracledb.poolIncrement = -2022;
        },
        /NJS-004:/
      );
    });

    it('58.1.38 Negative - poolMin', function() {
      assert.throws(
        function() {
          oracledb.poolMin = -2022;
        },
        /NJS-004:/
      );
    });

    it('58.1.39 Negative - poolMax', function() {
      assert.throws(
        function() {
          oracledb.poolMax = -2022;
        },
        /NJS-004:/
      );
    });

    it('58.1.40 Negative - poolTimeout', function() {
      assert.throws(
        function() {
          oracledb.poolTimeout = -2022;
        },
        /NJS-004:/
      );
    });

    it('58.1.41 Negative - stmtCacheSize', function() {
      assert.throws(
        function() {
          oracledb.stmtCacheSize = -2022;
        },
        /NJS-004:/
      );
    });
  }); // 58.1

  describe('58.2 Pool Class', function() {
    let pool;

    before(async function() {
      pool = await oracledb.createPool(dbConfig);
    });

    after(async function() {
      if (pool) {
        await pool.close(0);
      }
    });

    it('58.2.1 poolMin', function() {
      const t = pool.poolMin;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.poolMin = t + 1;
        },
        "TypeError: Cannot assign to read only property 'poolMin' of object '#<Pool>"
      );
    });

    it('58.2.2 poolMax', function() {
      const t = pool.poolMax;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.poolMax = t + 1;
        },
        "TypeError: Cannot assign to read only property 'poolMax' of object '#<Pool>"
      );
    });

    it('58.2.3 poolIncrement', function() {
      const t = pool.poolIncrement;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.poolIncrement = t + 1;
        },
        "TypeError: Cannot assign to read only property 'poolIncrement' of object '#<Pool>"
      );
    });

    it('58.2.4 poolTimeout', function() {
      const t = pool.poolTimeout;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.poolTimeout = t + 1;
        },
        "TypeError: Cannot assign to read only property 'poolTimeout' of object '#<Pool>"
      );
    });

    it('58.2.5 stmtCacheSize', function() {
      const t = pool.stmtCacheSize;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.stmtCacheSize = t + 1;
        },
        "TypeError: Cannot assign to read only property 'stmtCacheSize' of object '#<Pool>"
      );
    });

    it('58.2.6 connectionsInUse', function() {
      const t = pool.connectionsInUse;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.connectionsInUse = t + 1;
        },
        "TypeError: Cannot assign to read only property 'connectionsInUse' of object '#<Pool>"
      );
    });

    it('58.2.7 connectionsOpen', function() {
      const t = pool.connectionsOpen;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.connectionsOpen = t + 1;
        },
        "TypeError: Cannot assign to read only property 'connectionsOpen' of object '#<Pool>"
      );
    });

    it('58.2.8 queueTimeout', function() {
      const t = pool.queueTimeout;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.queueTimeout = t + 1000;
        },
        "TypeError: Cannot assign to read only property 'queueTimeout' of object '#<Pool>"
      );
    });

    it('58.2.9 poolPingInterval', function() {
      const t = pool.poolPingInterval;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.poolPingInterval = t + 100;
        },
        "TypeError: Cannot assign to read only property 'poolPingInterval' of object '#<Pool>"
      );
    });

    it('58.2.10 queueMax', function() {
      const t = pool.queueMax;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          pool.queueMax = t + 1000;
        },
        "TypeError: Cannot assign to read only property 'queueMax' of object '#<Pool>"
      );
    });

  }); // 58.2

  describe('58.3 Connection Class', function() {
    let connection;

    before('get one connection', async function() {
      connection = await oracledb.getConnection(dbConfig);
    });

    after('release connection', async function() {
      if (connection) {
        await connection.close();
      }
    });

    it('58.3.1 Connection object initial toString values', function() {
      assert.equal(typeof connection, 'object');

      assert.equal(connection.action, null);
      assert.equal(connection.module, null);
      assert.equal(connection.clientId, null);

      assert.equal(typeof connection.stmtCacheSize, 'number');
      assert.ok(connection.stmtCacheSize > 0);
    });

    it('58.3.2 stmtCacheSize (read-only)', function() {
      const t = connection.stmtCacheSize;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          connection.stmtCacheSize = t + 1;
        },
        "TypeError: Cannot assign to read only property 'stmtCacheSize' of object '#<Connection>"
      );
    });

    it('58.3.3 clientId (write-only)', function() {
      const t = connection.clientId;
      assert.strictEqual(t, null);

      assert.throws(
        function() {
          connection.clientId = 4;
        },
        /NJS-004:/
      );

      assert.doesNotThrow(
        function() {
          connection.clientId = "103.3";
        }
      );
    });

    it('58.3.4 action (write-only)', function() {
      const t = connection.action;
      assert.strictEqual(t, null);

      assert.throws(
        function() {
          connection.action = 4;
        },
        /NJS-004:/
      );

      assert.doesNotThrow(
        function() {
          connection.action = "103.3 action";
        }
      );
    });

    it('58.3.5 module (write-only)', function() {
      const t = connection.module;
      assert.strictEqual(t, null);

      assert.throws(
        function() {
          connection.module = 4;
        },
        /NJS-004:/
      );

      assert.doesNotThrow(
        function() {
          connection.clientId = "103.3 module";
        }
      );
    });

    it('58.3.6 oracleServerVersion (read-only)', function() {
      const t = connection.oracleServerVersion;
      assert.equal(typeof t, 'number');

      assert.throws(
        function() {
          connection.oracleServerVersion = t + 1;
        },
        "TypeError: Cannot assign to read only property 'oracleServerVersion' of object '#<Connection>"
      );
    });

    it('58.3.7 oracleServerVersionString (read-only)', function() {
      const t = connection.oracleServerVersionString;
      assert.equal(typeof t, 'string');

      assert.throws(
        function() {
          connection.oracleServerVersion = t + "foobar";
        },
        "TypeError: Cannot assign to read only property 'oracleServerVersion' of object '#<Connection>"
      );
    });

    it('58.3.8 currentSchema', function() {
      const t = connection.currentSchema;
      assert.strictEqual(t, '');

      assert.throws(
        function() {
          connection.currentSchema = 4;
        },
        /NJS-004:/
      );

      assert.doesNotThrow(
        function() {
          connection.currentSchema = dbConfig.user;
        }
      );
    });

  }); // 58.3

  describe('58.4 ResultSet Class', function() {

    const tableName = "nodb_number";
    const numbers = assist.data.numbers;
    let connection;
    let resultSet;
    let result;

    before('get resultSet class', async function() {
      connection = await oracledb.getConnection(dbConfig);
      await assist.setUp(connection, tableName, numbers);
      result = await connection.execute(
        "SELECT * FROM " + tableName + " ORDER BY num",
        [],
        { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
      resultSet = result.resultSet;
    });

    after(async function() {
      await connection.execute("DROP TABLE " + tableName + " PURGE");
      await connection.close();
    });

    it('58.4.1 metaData (read-only)', async function() {
      assert(resultSet.metaData);
      const t = resultSet.metaData;
      assert.equal(t[0].name, 'NUM');
      assert.equal(t[1].name, 'CONTENT');

      assert.throws(
        function() {
          resultSet.metaData = {"foo": "bar"};
        },
        "TypeError: Cannot assign to read only property 'metaData' of object '#<ResultSet>"
      );
      await resultSet.close();
    });

  }); // 58.4
});
