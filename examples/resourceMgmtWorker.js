/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   resourceMgmtWorker.js
 *
 * DESCRIPTION
 *   Helper for resourceMgmt.js to demonstrate Explicit Resource Management.
 *   This file is only loaded in Node.js 24 or later.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

async function run() {
  await using connection = await oracledb.getConnection(dbConfig);

  await demoSetup.setupBf(connection);  // create the demo table

  const { resultSet } = await connection.execute(
    `SELECT id, farmer
      FROM no_banana_farmer
      ORDER BY id`,
    [], // no bind variables
    {
      resultSet: true,             // return a ResultSet (default is false)
      // fetchArraySize: 100       // internal buffer allocation size for tuning
    }
  );
  await using rs = resultSet;
  let row;
  let i = 1;

  while ((row = await rs.getRow())) {
    console.log("getRow(): row " + i++);
    console.log(row);
  }
}

module.exports = { run };
