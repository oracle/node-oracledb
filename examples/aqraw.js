/* Copyright (c) 2019, 2024, Oracle and/or its affiliates. */

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
 *   aqraw.js
 *
 * DESCRIPTION
 *   Basic Oracle Advanced Queuing (AQ) example passing text messages.
 *
 *   Warning: Creates and drops a new user for running AQ operations.
 *   Requires NODE_ORACLEDB_DBA_USER and NODE_ORACLE_DBA_PASSWORD env variables
 *   to be set for the AQ user to be created and dropped.
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const aqUtil = require('./aqutil.js');

// This example requires node-oracledb Thick mode.
//
// Thick mode requires Oracle Client or Oracle Instant Client libraries.  On
// Windows and macOS you can specify the directory containing the
// libraries at runtime or before Node.js starts.  On other platforms (where
// Oracle libraries are available) the system library search path must always
// include the Oracle library path before Node.js starts.  If the search path
// is not correct, you will get a DPI-1047 error.  See the node-oracledb
// installation documentation.
let clientOpts = {};
// On Windows and macOS platforms, set the environment variable
// NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
if (process.platform === 'win32' || process.platform === 'darwin') {
  clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
}
oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode

const queueName = "DEMO_RAW_QUEUE";
const RAW_TABLE = "NODB_RAW_QUEUE_TAB";
const AQ_USER = "NODB_SCHEMA_AQTEST1";
const AQ_USER_PWD = aqUtil.generateRandomPassword();

let connection;

const credentials = {
  user: AQ_USER,
  password: AQ_USER_PWD,
  connectString: dbConfig.connectString
};

async function aqSetup() {
  await aqUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);
  connection = await oracledb.getConnection(credentials);

  const plsql = `
    BEGIN
      DBMS_AQADM.CREATE_QUEUE_TABLE(
        QUEUE_TABLE        =>  '${AQ_USER}.${RAW_TABLE}',
        QUEUE_PAYLOAD_TYPE =>  'RAW'
      );
      DBMS_AQADM.CREATE_QUEUE(
        QUEUE_NAME         =>  '${AQ_USER}.${queueName}',
        QUEUE_TABLE        =>  '${AQ_USER}.${RAW_TABLE}'
      );
      DBMS_AQADM.START_QUEUE(
        QUEUE_NAME         => '${AQ_USER}.${queueName}'
      );
    END;
  `;
  await connection.execute(plsql);
  await connection.close();
}

async function enq() {
  try {
    connection = await oracledb.getConnection(credentials);
    const queue = await connection.getQueue(queueName);
    const messageString = 'This is my message';
    console.log('Enqueuing: ' + messageString);
    await queue.enqOne(messageString);
    await connection.commit();
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

async function deq() {
  let connection;

  try {
    connection = await oracledb.getConnection(credentials);
    const queue = await connection.getQueue(queueName);
    const msg = await queue.deqOne();  // wait for a message
    await connection.commit();
    if (msg) {
      console.log('Dequeued:  ' + msg.payload.toString());
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

async function run() {
  await aqSetup();
  await enq();
  await deq();
  await aqUtil.dropAQtestUser(AQ_USER);
}

run();
