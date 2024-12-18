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
 *   276. deadConnDetection.js
 *
 * DESCRIPTION
 *   Dead connection detection
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('../../dbconfig.js');

describe('276. deadConnDetection.js', function() {

  let dbaConn = null;
  before(async function() {
    dbaConn = await oracledb.getConnection({
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA,
    });
  });

  after(async function() {
    await dbaConn.close();
  });

  it('276.1 dead connection detection in pool', async function() {
    const pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 2,
      poolMax: 2,
      poolIncrement: 2
    });

    // acquire connections from the pool and kill all the sessions
    const conn1 = await pool.getConnection();
    const conn2 = await pool.getConnection();
    const connections = [conn1, conn2];

    for (const conn of connections) {
      const result = await conn.execute(`select dbms_debug_jdwp.current_session_id,
                                dbms_debug_jdwp.current_session_serial from dual`);
      const sid = result.rows[0][0];
      const serial = result.rows[0][1];
      const sql = `alter system kill session '${sid},${serial}'`;
      await dbaConn.execute(sql);
      await conn.close();
    }

    assert.strictEqual(pool.connectionsInUse, 0);
    assert.strictEqual(pool.connectionsOpen, 2);

    // when try to re-use the killed sessions error will be raised;
    // release all such connections
    for (let i = 0; i < connections.length; i++) {
      connections[i] = await pool.getConnection();
    }
    for (const conn of connections) {
      await assert.rejects(
        async () => await conn.execute(`select user from dual`),
        /NJS-500:/
      );
      await conn.close();
    }

    assert.strictEqual(pool.connectionsInUse, 0);
    assert.strictEqual(pool.connectionsOpen, 0);
    await pool.close(0);
  });

  it('276.2 test case to check after handling error (terminated session) pool', async function() {
    const config = {
      ...dbConfig,
      poolMin: 2,
      poolMax: 2,
      poolIncrement: 2
    };

    const connection = await oracledb.getConnection(dbConfig);
    const serverVersion = connection.oracleServerVersion;
    /*
       Minimum pool connection in case of Dead Connection Detection (DCD)
       is not backported in 21C database
    */
    if (serverVersion >= 2100000000 && serverVersion <= 2190000000) return;
    await connection.close();

    const pool = await oracledb.createPool(config);
    const conn1 = await pool.getConnection();
    const conn2 = await pool.getConnection();
    assert.strictEqual(pool.connectionsInUse, 2);
    assert.strictEqual(pool.connectionsOpen, 2);
    const connections = [conn1, conn2];
    for (const conn of connections) {
      const result = await conn.execute(`select dbms_debug_jdwp.current_session_id,
                                dbms_debug_jdwp.current_session_serial from dual`);
      const sid = result.rows[0][0];
      const serial = result.rows[0][1];
      const sql = `alter system kill session '${sid},${serial}'`;
      await dbaConn.execute(sql);
      await conn.close();
    }
    assert.strictEqual(pool.connectionsInUse, 0);
    assert.strictEqual(pool.connectionsOpen, 2);
    for (let i = 0; i < 2 * connections.length; i++) {
      const conn = await pool.getConnection();
      if (i < 2) {
        await assert.rejects(
          async () => await conn.execute(`select user from dual`),
          /NJS-500:/
        );
        await conn.close();
        /* The minimum connection in the pool was not maintained
           in case "while doing acquire connection, if validation fails,
           and many connections in the freeConnection list got popped out
           due to validation failure, the minimum connection is not maintained".
        */
        assert.strictEqual(pool.connectionsInUse, 0);

        if (i == 0) assert.strictEqual(pool.connectionsOpen, 1);
        else assert.strictEqual(pool.connectionsOpen, 0);
      } else  {
        await conn.execute(`select user from dual`);
        await conn.close();
        assert.strictEqual(pool.connectionsInUse, 0);
        assert.strictEqual(pool.connectionsOpen, 2);
      }
    }
    await pool.close(0);
  });
});
