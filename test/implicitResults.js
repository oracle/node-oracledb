/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
 *   192. implicitResults.js
 *
 * DESCRIPTION
 *   Test the Implicit Results feauture.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('192. implicitResults.js', function() {

  let isRunnable = false;

  const tab1 = 'nodb_tab_impres1';
  const tab2 = 'nodb_tab_impres2';
  const queryImpres = `
        declare
            c1 sys_refcursor;
            c2 sys_refcursor;
        begin
            open c1 for
            select * from ${tab1};

            dbms_sql.return_result(c1);

            open c2 for
            select * from ${tab2};

            dbms_sql.return_result(c2);
        end;`;

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites();

    if (!isRunnable || dbConfig.test.isCmanTdm) {
      this.skip();
    } else {
      const conn = await oracledb.getConnection(dbConfig);

      let sql =
        `create table ${tab1} (
          id number(9) not null,
          value varchar2(100) not null
        )`;
      let plsql = testsUtil.sqlCreateTable(tab1, sql);
      await conn.execute(plsql);

      let sqlInsertValues =
        `DECLARE \n` +
        `    x NUMBER := 0; \n` +
        `    n VARCHAR2(100); \n` +
        `BEGIN \n` +
        `    FOR i IN 1..23 LOOP \n` +
        `        x := x + 1; \n` +
        `        n := 'Staff ' || x; \n` +
        `        INSERT INTO ${tab1} VALUES (x, n); \n` +
        `    END LOOP; \n` +
        `END; `;
      await conn.execute(sqlInsertValues);

      sql = `create table ${tab2} (
              id    number(9) not null,
              tsval timestamp not null
            )`;
      plsql = testsUtil.sqlCreateTable(tab2, sql);
      await conn.execute(plsql);

      sqlInsertValues =
        `DECLARE \n` +
        `    x NUMBER := 0; \n` +
        `    n TIMESTAMP; \n` +
        `BEGIN \n` +
        `    FOR i IN 1..5 LOOP \n` +
        `        x := x + 1; \n` +
        `        n := systimestamp + (i / 10); \n` +
        `        INSERT INTO ${tab2} VALUES (x, n); \n` +
        `    END LOOP; \n` +
        `END; `;
      await conn.execute(sqlInsertValues);

      await conn.commit();
      await conn.close();
    }

  }); // before()

  after(async function() {

    if (!isRunnable || dbConfig.test.isCmanTdm) {
      return;
    } else {
      const conn = await oracledb.getConnection(dbConfig);

      let sql = `DROP TABLE ${tab1} PURGE`;
      await conn.execute(sql);

      sql = `DROP TABLE ${tab2} PURGE`;
      await conn.execute(sql);

      await conn.close();
    }

  }); // after()

  it('192.1 implicit results with rows fetched', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const results = await conn.execute(queryImpres);

    let rows = results.implicitResults[0];
    for (let j = 0; j < rows.length; j++) {
      assert.strictEqual(rows[j][1], `Staff ${j + 1}`);
    }

    rows = results.implicitResults[1];
    const tab2Len = 5;
    assert.strictEqual(rows.length, tab2Len);

    await conn.close();
  }); // 192.1

  it('192.2 implicit Results with Result Sets', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const results = await conn.execute(queryImpres, [], { resultSet: true });

    // Assert the content of table 1
    let rs = await results.implicitResults[0].getRows(100);
    for (let j = 0; j < rs.length; j++) {
      assert.strictEqual(rs[j][1], `Staff ${j + 1}`);
    }

    // Assert the content of table 2
    rs = await results.implicitResults[1];
    let row, len = 0;
    while ((row = await rs.getRow())) {
      assert(testsUtil.isDate(row[1]));
      len++;
    }
    const tab2Len = 5;
    assert.strictEqual(len, tab2Len);

    await rs.close();
    await conn.close();
  }); // 192.2

  it('192.3 multiple options, outFormat is OUT_FORMAT_OBJECT', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const opts = { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT };
    const results = await conn.execute(queryImpres, [], opts);

    let rs = await results.implicitResults[0].getRows(100);
    for (let j = 0; j < rs.length; j++) {
      assert.strictEqual(rs[j].VALUE, `Staff ${j + 1}`);
    }

    rs = await results.implicitResults[1];
    let row, len = 0;
    while ((row = await rs.getRow())) {
      assert(testsUtil.isDate(row.TSVAL));
      len++;
    }
    const tab2Len = 5;
    assert.strictEqual(len, tab2Len);

    await rs.close();
    await conn.close();
  }); // 192.3

});
