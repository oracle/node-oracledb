/* Copyright (c) 2020, 2022, Oracle and/or its affiliates. */

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
 *   232. nestedCursor01.js
 *
 * DESCRIPTION
 *   Nested Cursor.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('232. nestedCursor01.js', () => {

  let conn;
  const peopleTab = 'nodb_nc01_people';
  const addrTab   = 'nodb_nc01_addr';

  before(async () => {
    conn = await oracledb.getConnection(dbconfig);
    let sql =
      `create table ${peopleTab} (
         id number,
         name varchar2(20),
         addresskey number
      )`;
    let plsql = testsUtil.sqlCreateTable(peopleTab, sql);
    await conn.execute(plsql);

    sql =
      `create table ${addrTab} (
        addresskey number,
        country varchar2(20)
      )`;
    plsql = testsUtil.sqlCreateTable(addrTab, sql);
    await conn.execute(plsql);
  }); // before()

  after(async () => {
    let sql = `drop table ${peopleTab} purge`;
    await conn.execute(sql);

    sql = `drop table ${addrTab} purge`;
    await conn.execute(sql);

    await conn.close();
  }); // after

  it('232.1 example/selectnestedcursor.js', async () => {

    const binds1 = [
      [101, "Alice",     201 ],
      [102, "Bruce",     203 ],
      [103, "Christine", 203 ],
      [104, "David",     201 ],
      [105, "Erica",     203 ],
      [106, "Frank",     202 ]
    ];
    const opt1 = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 },
        { type: oracledb.NUMBER },
      ]
    };
    const sql1 = `INSERT INTO ${peopleTab} VALUES (:1, :2, :3)`;
    const result1 = await conn.executeMany(sql1, binds1, opt1);
    assert.strictEqual(result1.rowsAffected, binds1.length);

    const binds2 = [
      [201, "Austria" ],
      [202, "Brazil" ],
      [203, "Chile" ]
    ];
    const opt2 = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 }
      ]
    };
    const sql2 = `INSERT INTO ${addrTab} VALUES (:1, :2)`;
    const result2 = await conn.executeMany(sql2, binds2, opt2);
    assert.strictEqual(result2.rowsAffected, binds2.length);

    // For each country, show who lives there
    const sql3 = `
      SELECT country,
          CURSOR(SELECT name
                 FROM ${peopleTab} p
                 WHERE p.addresskey = a.addresskey
                 ORDER by name
          ) as NC
      FROM ${addrTab} a
      ORDER BY country
    `;
    const binds3 = {};
    const opt3 = {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };
    const result3 = await conn.execute(sql3, binds3, opt3);
    assert.strictEqual(result3.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result3.metaData[1].name, 'NC');
    assert.strictEqual(result3.metaData[1].metaData[0].name, 'NAME');
    assert.strictEqual(result3.rows[0].COUNTRY, 'Austria');
    assert.strictEqual(result3.rows[0].NC[0].NAME, 'Alice');
    assert.strictEqual(result3.rows[0].NC[1].NAME, 'David');
    assert.strictEqual(result3.rows[1].COUNTRY, 'Brazil');
    assert.strictEqual(result3.rows[1].NC[0].NAME, 'Frank');
    assert.strictEqual(result3.rows[2].COUNTRY, 'Chile');
    assert.strictEqual(result3.rows[2].NC[0].NAME, 'Bruce');
    assert.strictEqual(result3.rows[2].NC[1].NAME, 'Christine');
    assert.strictEqual(result3.rows[2].NC[2].NAME, 'Erica');

  }); // 232.1
});
