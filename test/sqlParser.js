/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 * Licensed under the Apache License, Version 2.0 (the `License`);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an `AS IS` BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   289. sqlParser.js
 *
 * DESCRIPTION
 *   This test verifies the SQL Parser written for the thin mode
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('289. sqlParser.js', function() {

  let conn;
  let isRunnable = false;
  before(async function() {
    if (!oracledb.thin) {
      this.skip();
    }
    isRunnable = true;
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async () => {
    if (!isRunnable) {
      return;
    }
    await conn.close();
  });

  it('289.1 parse SQL containing json_object()', async function() {
    if (conn.oracleServerVersion < 2100000000) {
      this.skip();
    }
    const sql = `SELECT json_object('id':2),:bv1, json {'key': 2} FROM DUAL`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['BV1']);
  }); // 289.1

  it('289.2 bind variables between quoted string', async () => {
    const sql = `select
      :a,
      q'{This contains ' and " and : just fine}',
      :b,
      q'[This contains ' and " and : just fine]',
      :c,
      q'<This contains ' and " and : just fine>',
      :d,
      q'(This contains ' and " and : just fine)',
      :e,
      q'$This contains ' and " and : just fine$',
      :f
      from dual`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["A", "B", "C", "D", "E", "F"]);
  }); // 289.2

  it('289.3 single line comment', async () => {
    const sql = `--begin :value2 := :a + :b + :c +:a +3; end;
                begin :value2 := :a + :c +3; end;`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["VALUE2", "A", "C"]);
  }); // 289.3

  it('289.4 constant string', async () => {
    const sql = `begin
                  :value := to_date('20021231 12:31:00', :format);
                 end;`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["VALUE", "FORMAT"]);
  }); // 289.4

  it('289.5 multiple division operation', async () => {
    const sql = `select :a / :b, :c / :d from dual`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["A", "B", "C", "D"]);
  }); // 289.5

  it('289.6 SQL statement starting with parentheses', async () => {
    const sql = `(select :a from dual) union (select :b from dual)`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["A", "B"]);
  }); // 289.6

  it('289.7 statement containing simple strings', async () => {
    const sql = `select '"string_1"', :bind_1, ':string_2' from dual`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["BIND_1"]);
  }); // 289.7

  it('289.8 binds between comments', async () => {
    const sql = `select
                /* comment 1 with /* */
                :a,
                /* comment 2 with another /* */
                :b
                /* comment 3 * * * / */,
                :c
                from dual`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["A", "B", "C"]);
  }); // 289.8

  it('289.9 non-ascii character in the bind name', async () => {
    const sql = `select :méil$ from dual`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ["MÉIL$"]);
  }); // 289.9

  // GitHub issue 1605
  // https://github.com/oracle/node-oracledb/issues/1605
  it('289.10 apostrophe in single line comment', async () => {
    const sql = `
                -- Example with ' in comment
                SELECT :test, 'String' FROM DUAL`;
    const info = await conn.getStatementInfo(sql);
    assert.deepStrictEqual(info.bindNames, ['TEST']);
  }); // 289.10
});
