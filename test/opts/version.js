/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   version.js
 *
 * DESCRIPTION
 *   Shows the node-oracledb version attributes
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const dbConfig = require('../dbconfig.js');

async function run() {
  console.log("Run at: " + new Date());
  console.log("Node.js version: " + process.version + " (" + process.platform, process.arch + ")");

  // console.log("Node-oracledb version:", oracledb.version); // numeric version format is useful for comparisons
  // console.log("Node-oracledb version suffix:", oracledb.versionSuffix); // e.g. "-beta.1", or empty for production releases
  console.log("Node-oracledb version:", oracledb.versionString); // version (including the suffix)

  //console.log("Oracle Client library version:", oracledb.oracleClientVersion); // numeric version format
  if (dbConfig.test.mode === 'thick') {
    console.log("Oracle Client library version:", oracledb.oracleClientVersionString);
  }

  const conn = await oracledb.getConnection(dbConfig);
  // console.log("Oracle Database version:", connection.oracleServerVersion); // numeric version format
  console.log("Oracle Database version:", conn.oracleServerVersionString);
  await conn.close();
}

run();
