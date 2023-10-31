/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   291. dbSchema.js
 *
 * DESCRIPTION
 *    Testing column metadata schema and annotations.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('291. dbSchema.js', function() {

  let connection = null;
  const TABLE = "nodb_schema_annotations_291";
  const DOMAIN_NAME = 'SIMPLEDOMAIN_291';

  before('get one connection', async function() {
    if (!await testsUtil.isDbDomainRunnable()) {
      this.skip();
    }
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    if (connection) {
      await connection.close();
    }
  });

  describe('291.1 dbSchema and Annotations', function() {
    before('create table', async function() {
      let sql = `create domain ${DOMAIN_NAME} as number(3, 0) NOT NULL `;
      await testsUtil.createDomain(connection, DOMAIN_NAME, sql);

      sql = `create table ${TABLE} (
        id number(9) not null,
        age number(3, 0) domain ${DOMAIN_NAME}
        annotations (
          Anno_1 ''first annotation'',
          Anno_2 ''second annotation'',
          Anno_3
        )
      )`;
      await testsUtil.createTable(connection, TABLE, sql);

      sql = `INSERT INTO ${TABLE} VALUES (1, 25)`;
      await connection.execute(sql);
    });

    after(async function() {
      await testsUtil.dropTable(connection, TABLE);
      await testsUtil.sqlDropDomain(DOMAIN_NAME);
    });

    it('291.1.1 check domain and Annotations', async function() {
      const sql = `select * from ${TABLE}`;
      const expectedAnnotations = {ANNO_1: 'first annotation', ANNO_2:
        'second annotation', ANNO_3: ''};

      const result = await connection.execute(sql);
      assert.deepStrictEqual(result.rows[0], [1, 25]);
      assert.strictEqual(result.metaData[0].domainSchema, undefined);
      assert.strictEqual(result.metaData[0].domainName, undefined);
      assert.strictEqual(result.metaData[0].annotations, undefined);
      assert.strictEqual(result.metaData[1].domainSchema,
        dbConfig.user.toUpperCase());
      assert.strictEqual(result.metaData[1].domainName,
        DOMAIN_NAME);
      assert.deepStrictEqual(result.metaData[1].annotations,
        expectedAnnotations);
    }); // 291.1.1

  }); // 291.1

});
