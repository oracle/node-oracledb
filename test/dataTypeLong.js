/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   103. dataTypeLong.js
 *
 * DESCRIPTION
 *    Test LONG type support.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const random   = require('./random.js');

describe('103. dataTypeLong.js', function() {

  let connection = null;
  const tableName = "nodb_long";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('103.1 LONG data type support', function() {

    // Generate test data
    const strLen = [1000, 4000, 10000, 100000, 1000000];
    const strs = [];
    const specialStr = "103.1";
    for (let i = 0; i < strLen.length; i++)
      strs[i] = random.getRandomString(strLen[i], specialStr);

    before(async function() {
      await assist.setUp(connection, tableName, strs);
    });

    after(async function() {
      await connection.execute("drop table " + tableName + " purge");
    });

    it('103.1.1 SELECT query', async function() {
      await assist.dataTypeSupport(connection, tableName, strs);
    });

    it('103.1.2 works well with result set', async function() {
      await assist.verifyResultSet(connection, tableName, strs);
    });

    it('103.1.3 works well with REF Cursor', async function() {
      await assist.verifyRefCursor(connection, tableName, strs);
    });

  }); // 103.1

  describe('103.2 stores null values correctly', function() {
    it('103.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });
});
