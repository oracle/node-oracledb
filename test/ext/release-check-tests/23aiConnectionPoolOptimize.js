/* Copyright (c) 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   23aiConnectionPoolOptimize.js
 *
 * DESCRIPTION
 *  It will test the 23ai Connection optimization feature.
 *  23ai Connection Establishment reduces round trips and improves Performance.
 *  This test will create a maxConn standalone connections and measure the time taken
 *  with 23ai Connect string(NODE_ORACLEDB_CONNECTIONSTRING) and
 *  Pre-23ai Connect string (NODE_ORACLEDB_CONNECTIONSTRING_PRE23ai).
 *  We assert if 23ai connect string takes more time than Pre-23ai.
 *  RENEG message type is also tested when runtime capability, client_statistics_level
 *  is changed after a initial connection establishment.
 *  For thick mode, Please ensure 23ai client is used.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('../../dbconfig.js');

async function createCloseConns(num) {
  const promises = [];
  const startTime = performance.now();
  for (let i = 0; i < num; i++) {
    promises.push(oracledb.getConnection(dbConfig));
  }
  const conns = await Promise.all(promises);
  const endTime = performance.now();
  const timeTaken = endTime - startTime;
  await closeConns(conns);
  return timeTaken;
}

async function closeConns(conns) {
  const promises = [];
  const num = conns.length;
  for (let i = 0; i < num; i++) {
    promises.push(conns[i].close());
  }
  await Promise.all(promises);
}

async function checkRENEG() {

  const credential = { ...dbConfig, privilege: oracledb.SYSDBA };
  credential.user = dbConfig.test.DBA_user;
  credential.password = dbConfig.test.DBA_password;

  const connection1 = await oracledb.getConnection(dbConfig);

  // save default client_statistics_level
  const sysConn = await oracledb.getConnection(credential);
  const result = await sysConn.execute(`select value from v$parameter where name LIKE '%client_statistics_level%'`);
  const defaultClientStatsLevel = result.rows[0][0];

  // Change runtime capability, client_statistics_level
  let clientStatsLevel;
  if (defaultClientStatsLevel === 'TYPICAL') {
    clientStatsLevel = 'OFF';
  } else {
    clientStatsLevel = 'TYPICAL';
  }
  const query = `alter system set client_statistics_level = ` + `"${clientStatsLevel}" ` + 'DEFERRED';
  await sysConn.execute(query);

  // check second connnection is established successfully after RENEG received
  // as runtime capabilities are changed.
  const connection2 = await oracledb.getConnection(dbConfig);

  //restore runtime capability, client_statistics_level.
  const defaultClientStatsLevelQuery = `alter system set client_statistics_level = ` + `"${defaultClientStatsLevel}" ` + 'DEFERRED';
  await sysConn.execute(defaultClientStatsLevelQuery);

  //cleanup
  await sysConn.close();
  await connection1.close();
  await connection2.close();
}

async function init() {
  try {
    if (!process.env.NODE_ORACLEDB_CONNECTIONSTRING_PRE23ai) {
      throw new Error(`Please set NODE_ORACLEDB_CONNECTIONSTRING to 23ai DB release and
        NODE_ORACLEDB_CONNECTIONSTRING_PRE23ai to Pre-23ai DB release.`);
    }

    const maxConn = 20;
    const time23ai = await createCloseConns(maxConn);
    dbConfig.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING_PRE23ai;
    const timePre23ai = await createCloseConns(maxConn);

    const errorMsg = "23ai Connection Establishments are taking more time than Pre23ai";
    console.assert(timePre23ai > time23ai, "%o", { time23ai, timePre23ai, errorMsg });

    dbConfig.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING;
    await checkRENEG();
  } catch (err) {
    console.error('init() error: ' + err.message);
  }
}

init();
