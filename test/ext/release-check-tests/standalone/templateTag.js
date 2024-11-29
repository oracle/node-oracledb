/* Copyright (c) 2024 Oracle and/or its affiliates. */

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
 *   templateTag.js
 *
 * DESCRIPTION
 *  It will test the syntax allowed by sql-template-tag
 *  module. Please install sql-template-tag module before running.
 *
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');
const testsUtil = require('../../../testsUtil.js');

async function run() {
  // sql-template-tag doesnt allow require.
  const sqlTemplate = await import('sql-template-tag');
  const sql = sqlTemplate.default;

  const TABLE = 'nodb_tab_template';

  const connection = await oracledb.getConnection(dbConfig);

  // Setup
  const createQuery =
            `CREATE TABLE ${TABLE} (ID NUMBER, NAME VARCHAR2(50))`;
  let query = testsUtil.sqlCreateTable(TABLE, createQuery);
  await connection.execute(query);

  // Insert
  let id = 20;
  const name = 'SCOTT';

  // doesn't work as this causes TABLE as bind argument.
  //query = sql`insert into ${TABLE} values(${id}, ${name})`;

  //It generates the following query object.
  //query.statement; //=> "insert into nodb_tab_template values(:1, :2)"
  //query.values; //=> [20, "SCOTT",]
  query = sql`insert into nodb_tab_template values(${id}, ${name})`;
  let result = await connection.execute(query);
  console.log("Rows inserted: " + result.rowsAffected);  // 1

  //It generates the following into query object.
  //query.statement; //=> "SELECT * FROM nodb_tab_template WHERE id = :1"
  //query.values; //=> [12]
  id = 20;
  const options = { maxRows: 1 };
  query = sql`SELECT * FROM nodb_tab_template WHERE id = ${id}`;
  result = await connection.execute(query, options);
  console.log("Query metadata:", result.metaData);
  console.log("Query rows:", result.rows);

  // without binds
  query = sql`SELECT * FROM nodb_tab_template WHERE id = 20`;
  result = await connection.execute(query, options);
  console.log("Query metadata:", result.metaData);
  console.log("Query rows:", result.rows);

  // update test
  query = sql`update nodb_tab_template set name = 'JOHN' where id = ${id}`;
  result = await connection.execute(query);

  // After update
  query = sql`SELECT * FROM nodb_tab_template WHERE id = 20`;
  result = await connection.execute(query, options);
  console.log("Query metadata:", result.metaData);
  console.log("Query rows:", result.rows);
  /*
         * REUTRNING INTO Clause doesn't work
         * DML insert with RETURNING INTO clause doesn't work as positional binds in 'INTO'
         * clause are treated as inbinds
         * const dmlinsert = sql`insert into emp values(2, 'JONHN1') RETURNING EMPID, EMPNAME into ${id}, ${id}`;
         * console.log(dmlinsert);
         */

  /* DML bulk insert doesn't work
           const binds = [
            [13, "Test 1"],
            [13, "Test 2"],
            [14, "Test 3"],
            [15, "Test 4"],
            [15, "Test 5 "]
           ];

           options = {
            autoCommit: true,
            bindDefs: [
                { type: oracledb.NUMBER },
                { type: oracledb.STRING, maxSize: 15 }
            ]
            };
            const dml = sql`INSERT INTO emp VALUES ${bulk(binds)} `;
        */

  if (connection) {
    await testsUtil.dropTable(connection, TABLE);
    await connection.close();
  }
}

run();
