/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
* Licensed under the Apache License, Version 2.0 (the `License`);
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    https://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an `AS IS` BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
* NAME
*   implicitPool.js
*
* DESCRIPTION
*   Testing implicit pooling
*   stop and start pool before starting test to reset stats for comparision.
*
*  NODE_ORACLEDB_CONNECTIONSTRING1
*    'host/servicename:POOLED?POOL_CONNECTION_CLASS=classname & POOL_BOUNDARY=STATEMENT'
*    '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=hostname)(PORT=port))(CONNECT_DATA=(SERVICE_NAME=servicename)(SERVER=POOLED)(POOL_BOUNDARY=STATEMENT)))'
*
*  NODE_ORACLEDB_CONNECTIONSTRING2
*    'host/servicename:POOLED?POOL_CONNECTION_CLASS=classname & POOL_BOUNDARY=TRANSACTION'
*    '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=hostname)(PORT=port))(CONNECT_DATA=(SERVICE_NAME=servicename)(SERVER=POOLED)(POOL_BOUNDARY=TRANSACTION)))'
*
*  NODE_ORACLEDB_CONNECTIONSTRING3
*    'host/servicename:POOLED?POOL_CONNECTION_CLASS=classname & POOL_BOUNDARY=STATEMENT & POOL_PURITY=NEW'
*    '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=hostname)(PORT=port))(CONNECT_DATA=(SERVICE_NAME=servicename)(SERVER=POOLED)(POOL_BOUNDARY=STATEMENT)(POOL_PURITY=NEW)))'
*
*  NODE_ORACLEDB_CONNECTIONSTRING4
*    'host/servicename:POOLED?POOL_CONNECTION_CLASS=classname & POOL_BOUNDARY=TRANSACTION & POOL_PURITY=NEW'
*    '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=hostname)(PORT=port))(CONNECT_DATA=(SERVICE_NAME=servicename)(SERVER=POOLED)(POOL_BOUNDARY=TRANSACTION)(POOL_PURITY=NEW)))'
*
*  NODE_ORACLEDB_CONNECTIONSTRING5
*    'host/servicename:POOLED?POOL_CONNECTION_CLASS=classname & POOL_BOUNDARY=XYZ & POOL_PURITY=NEW'
*    '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=hostname)(PORT=port))(CONNECT_DATA=(SERVICE_NAME=servicename)(POOL_BOUNDARY=XYZ)))'
******************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('1. implicitPool.js', function() {

  let connection = null;
  let dbaConn = null;
  let pool = null;
  before(async function() {

    const dbaCredential = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA,
    };
    dbaConn = await oracledb.getConnection(dbaCredential);
    await dbaConn.execute(`alter session set container=CDB$ROOT`);
  });

  after(async function() {
    await dbaConn.close();
  });

  it('1.1 pool: execute multiple queries with purity=SELF and POOL_BOUNDARY=TRANSACTION', async function() {
    oracledb.connectionClass = 'obj1';
    // connect string with SERVER=POOLED, purity=SELF and POOL_BOUNDARY=TRANSACTION
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING1
    };
    pool = await oracledb.createPool(config);
    connection = await pool.getConnection();
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj1'`);
    assert.deepStrictEqual(result.rows[0][2], 5);
    await connection.close();
    await pool.close(0);
  });

  it('1.2 pool: execute multiple queries with purity=SELF and POOL_BOUNDARY=STATEMENT', async function() {
    oracledb.connectionClass = 'obj2';
    // connect string with SERVER=POOLED, purity=SELF and POOL_BOUNDARY=STATEMENT
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING2
    };
    pool = await oracledb.createPool(config);
    connection = await pool.getConnection();
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj2'`);
    assert.deepStrictEqual(result.rows[0][2], 5);

    await connection.close();
    await pool.close(0);
  });

  it('1.3 pool: execute multiple queries with purity=NEW and POOL_BOUNDARY=STATEMENT', async function() {
    oracledb.connectionClass = 'obj3';
    // connect string with SERVER=POOLED, purity=NEW and POOL_BOUNDARY=STATEMENT
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING3
    };
    pool = await oracledb.createPool(config);
    connection = await pool.getConnection();
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj3'`);
    assert.deepStrictEqual(result.rows[0][3], 6);

    await connection.close();
    await pool.close(0);
  });

  it('1.4 pool: execute multiple queries with purity=NEW and POOL_BOUNDARY=TRANSACTION', async function() {
    oracledb.connectionClass = 'obj4';
    // connect string with SERVER=POOLED, purity=NEW and POOL_BOUNDARY=STATEMENT
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING4
    };
    pool = await oracledb.createPool(config);
    connection = await pool.getConnection();
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj4'`);
    assert.deepStrictEqual(result.rows[0][3], 6);
    await connection.close();
    await pool.close(0);
  });

  it('1.5 standalone: execute multiple queries with purity=NEW and POOL_BOUNDARY=STATEMENT', async function() {
    oracledb.connectionClass = 'obj5';
    // connect string with SERVER=POOLED, purity=NEW and POOL_BOUNDARY=STATEMENT
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING3
    };
    connection = await oracledb.getConnection(config);
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj5'`);
    assert.deepStrictEqual(result.rows[0][3], 6);
    await connection.close();
  });

  it('1.6 standalone: execute multiple queries with purity=NEW and POOL_BOUNDARY=TRANSACTION', async function() {
    oracledb.connectionClass = 'obj6';
    // connect string with SERVER=POOLED, purity=NEW and POOL_BOUNDARY=TRANSACTION
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING4
    };
    connection = await oracledb.getConnection(config);
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj6'`);
    assert.deepStrictEqual(result.rows[0][3], 6);

    await connection.close();
  });

  it('1.7 standalone: execute multiple queries with purity=SELF and POOL_BOUNDARY=TRANSACTION', async function() {
    oracledb.connectionClass = 'obj7';
    // connect string with SERVER=POOLED, purity=SELF and POOL_BOUNDARY=TRANSACTION
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING1
    };
    connection = await oracledb.getConnection(config);
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj7'`);
    assert.deepStrictEqual(result.rows[0][2], 5);

    await connection.close();
  });

  it('1.8 standalone: execute multiple queries with purity=SELF and POOL_BOUNDARY=STATEMENT', async function() {
    oracledb.connectionClass = 'obj8';
    // connect string with SERVER=POOLED, purity=SELF and POOL_BOUNDARY=STATEMENT
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING2
    };
    connection = await oracledb.getConnection(config);
    let i = 6;
    while (i-- > 0) {
      await connection.execute("SELECT 1 FROM DUAL");
    }
    const user = config.user.toUpperCase();
    const result = await dbaConn.execute(`select cclass_name, num_requests, num_hits, num_misses from v$cpool_cc_stats where cclass_name='${user}.obj8'`);
    assert.deepStrictEqual(result.rows[0][2], 5);

    await connection.close();
  });

  it('1.9 standalone: invalid pool boundary', async function() {
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING5
    };

    await assert.rejects(
      async () => await oracledb.getConnection(config),
      /ORA-24545:/);
  });

  it('1.10 pool: invalid pool boundary', async function() {
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING5
    };

    const pool = await oracledb.createPool(config);
    await assert.rejects(
      async () => await pool.getConnection(), /ORA-24545:/);
  });
});
