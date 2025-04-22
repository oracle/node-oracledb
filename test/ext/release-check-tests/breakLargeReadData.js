/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   279. breakLargeReadData.js
 *
 * DESCRIPTION
 *
 *   We will verify the behaviour when a marker packet is received during
 *   multi packet read data. The timing for break has to be
 *   adjusted based on network latency so that a break is received in middle
 *   of reading multiple packets.
 *   Proper error return value to user is expected.
 *
 *****************************************************************************/
'use strict';
const oracledb = require('oracledb');
const dbConfig = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');
const random = require('../../random.js');
const assert = require('assert');

describe('279.1 simulate break while reading Multiple packets', function() {
  let connection = null;
  let connectionSys = null;
  let sid;
  let serial;
  const tableNameLargeData = 'nodb_large_Data_table';
  const dbaCredential = {
    user: dbConfig.test.DBA_user,
    password: dbConfig.test.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  };

  const createSQlCLOBFn = function() {
    return `create table ${tableNameLargeData} (FIELD CLOB)`;
  };

  const sqlDrop = testsUtil.sqlDropTable(tableNameLargeData);
  const sqlCreate = testsUtil.sqlCreateTable(tableNameLargeData, createSQlCLOBFn());
  const selectSql = `select * from ${tableNameLargeData}`;


  async function breakFromServer() {
    const sql = `alter system kill session '${sid},${serial}'`;
    await connectionSys.execute(sql);
  }

  before(async function() {
    oracledb.fetchAsString = [oracledb.DB_TYPE_CLOB];
    connection = await oracledb.getConnection(dbConfig);

    await connection.execute(sqlDrop);
    await connection.execute(sqlCreate);

    // Create a large CLOB to ensure multi-packet reads
    const values = [];
    const len = 3145728; // 3 * 1024 * 1024
    const specialStr = "279.1";
    const clobStr = random.getRandomString(len, specialStr);
    values.push(clobStr);
    await connection.execute(`insert into ${tableNameLargeData} values(:1)`, values);

    connectionSys = await oracledb.getConnection(dbaCredential);
    const resultSID = await connection.execute(
      `select dbms_debug_jdwp.current_session_id,
              dbms_debug_jdwp.current_session_serial
       from dual`
    );
    sid = resultSID.rows[0][0];
    serial = resultSID.rows[0][1];
  });

  after(async function() {
    oracledb.fetchAsString = [];
    if (connectionSys) {
      await connectionSys.execute(sqlDrop);
      await connectionSys.close();
    }
    if (connection && connection.isHealthy()) {
      await connection.close();
    }
    connection = null;
    connectionSys = null;
  });

  it('279.1.1 Issue break from Server', async function() {
    const selectPromise = connection.execute(selectSql); // Start query first

    // Schedule break to happen during execution
    setTimeout(async () => {
      await breakFromServer();
    }, 10); // Reduced delay to better catch mid-execution

    await assert.rejects(() => selectPromise, /NJS-003:|NJS-500:/);
  });

  it('279.1.2 Issue break from Client', async function() {
    const clientConn = await oracledb.getConnection(dbConfig);

    const selectPromise = clientConn.execute(selectSql);

    const breakPromise = new Promise(resolve => {
      setTimeout(async () => {
        try {
          await clientConn.breakExecution();
        } finally {
          resolve();
        }
      }, 10); // Reduced delay
    });

    await Promise.allSettled([
      assert.rejects(() => selectPromise, /NJS-500:|NJS-003:/),
      breakPromise
    ]);

    if (clientConn && clientConn.isHealthy()) {
      await clientConn.close();
    }
  });
});
