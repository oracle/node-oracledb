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
const dbConfig = require('../../../dbconfig.js');
const testsUtil = require('../../../testsUtil.js');
const random = require('../../../random.js');
const assert = require('assert');

describe('279.1 simulate break while reading Multiple packets', function() {

  let connection = null;
  let connectionSys = null;
  let sid;
  let serial;
  const forceClose = 0x0040;
  const tableNameLargeData = 'nodb_large_Data_table';
  const dbaCredential = {
    username: process.env.NODE_ORACLEDB_DBA_USER,
    password: process.env.NODE_ORACLEDB_DBA_PASSWORD,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  };
  const createSQlCLOBFn = function() {
    return `create table ${tableNameLargeData} (FIELD CLOB)`;
  };
  const sqlDrop = testsUtil.sqlDropTable(tableNameLargeData);
  const sqlCreate = testsUtil.sqlCreateTable(tableNameLargeData, createSQlCLOBFn());
  const selectSql = `select * from ${tableNameLargeData}`;

  async function breakFromClient() {
    await connection.breakExecution();
  }

  async function breakFromServer() {
    const sql = `alter system kill session ` + `'${sid},${serial}'`;
    await connectionSys.execute(sql);
  }

  before(async function() {
    oracledb.fetchAsString = [oracledb.DB_TYPE_CLOB];
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(sqlCreate);
    const values = [];
    const len = 2097152; // 2 * 1024 * 1024
    const specialStr = "279.1";
    const clobStr = random.getRandomString(len, specialStr);
    values.push(clobStr);
    await connection.execute(`insert into ${tableNameLargeData} values(:1)`, values);
    connectionSys = await oracledb.getConnection(dbaCredential);
    const resultSID = await connection.execute(`select dbms_debug_jdwp.current_session_id,
    dbms_debug_jdwp.current_session_serial from dual`);
    sid = resultSID.rows[0][0];
    serial = resultSID.rows[0][1];
  });

  after(async function() {
    oracledb.fetchAsString = [];
    if (connection.isHealthy()) {
      await connection.execute(sqlDrop);
      await connection.close();
    } else {
      connection._impl.nscon.disconnect(forceClose);
    }
    await connectionSys.close();
    connection = null;
    connectionSys = null;
  });

  it('279.1.1 Issue break from Server ', async function() {
    setTimeout(breakFromServer, 1000);
    await assert.rejects(
      async () => await connection.execute(selectSql),
      /ORA-00028:/
    );
  });

  it('279.1.2 Issue break from Client', async function() {
    setTimeout(breakFromClient, 1000);
    await assert.rejects(
      async () => await connection.execute(selectSql),
      /NJS-500:/
    );
  });
});
