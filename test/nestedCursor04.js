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
 *   235. nestedCursor04.js
 *
 * DESCRIPTION
 *   Fetching a query that contains multiple nested cursors which each
 *   fetches zero, one or multiple rows (with and without resultSet)
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('235. nestedCursor04.js', () => {

  let conn;
  const peopleTab = 'nodb_nc04_people';
  const addrTab   = 'nodb_nc04_addr';
  const foodTab   = 'nodb_nc04_food';

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

    sql =
      `create table ${foodTab} (
        addresskey number,
        food varchar2(20)
      )`;
    plsql = testsUtil.sqlCreateTable(foodTab, sql);
    await conn.execute(plsql);

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

    const binds3 = [
      [201, "Barbeque"],
      [201, "Lamington"],
      [201, "Pavlova"],
      [202, "Moqueca"],
      [202, "Brigadeiro"],
      [202, "Quindim"],
      [203, "Asado"],
      [203, "Pastel de Choclo"],
      [203, "Cazuela"]
    ];
    const opt3 = {
      autoCommit: true,
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 }
      ]
    };
    const sql3 = `INSERT INTO ${foodTab} VALUES (:1, :2)`;
    const result3 = await conn.executeMany(sql3, binds3, opt3);
    assert.strictEqual(result3.rowsAffected, binds3.length);

  }); // before()

  after(async () => {
    let sql = `drop table ${peopleTab} purge`;
    await conn.execute(sql);

    sql = `drop table ${addrTab} purge`;
    await conn.execute(sql);

    sql = `drop table ${foodTab} purge`;
    await conn.execute(sql);

    await conn.close();
  }); // after

  async function traverse_results(resultSet) {
    const fetchedRows = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const row = await resultSet.getRow();
      if (!row) {
        await resultSet.close();
        break;
      }
      for (const i in row) {
        if (row[i] instanceof oracledb.ResultSet) {
          row[i] = await traverse_results(row[i]);
        }
      }
      fetchedRows.push(row);
    }
    return fetchedRows;
  } // traverse_results()

  const sqlOne = `
    SELECT country,
    CURSOR(SELECT name
           FROM ${peopleTab} p
           WHERE p.addresskey = a.addresskey
           ORDER by name
    ) as nc1,
    CURSOR(SELECT food
           FROM ${foodTab} f
           WHERE f.addresskey = a.addresskey
           ORDER BY food
    ) as nc2
    FROM ${addrTab} a
    WHERE country = 'Denmark'
    ORDER BY country
  `;

  it('235.1 fetch multiple nested cursors which each fetches zero row directly', async () => {
    const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    const result = await conn.execute(sqlOne, [], options);
    assert.strictEqual(result.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result.metaData[1].name, 'NC1');
    assert.strictEqual(result.metaData[2].name, 'NC2');
    assert.strictEqual(result.rows.length, 0);
  }); // 235.1

  it('235.2 fetch zero row with resultSet', async () => {
    const options = {
      resultSet: true,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };
    const result = await conn.execute(sqlOne, [], options);
    const rows = await traverse_results(result.resultSet);
    assert.strictEqual(result.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result.metaData[1].name, 'NC1');
    assert.strictEqual(result.metaData[2].name, 'NC2');
    assert.strictEqual(rows.length, 0);
  }); // 235.2

  const sqlTwo = `
    SELECT country,
    CURSOR(SELECT name
           FROM ${peopleTab} p
           WHERE p.addresskey = a.addresskey
           ORDER by name
    ) as nc1,
    CURSOR(SELECT food
           FROM ${foodTab} f
           WHERE f.addresskey = a.addresskey
           ORDER BY food
    ) as nc2
    FROM ${addrTab} a
    WHERE country = 'Brazil'
    ORDER BY country
  `;

  it('235.3 fetch one row directly', async () => {
    const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    const result = await conn.execute(sqlTwo, [], options);

    assert.strictEqual(result.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result.metaData[1].name, 'NC1');
    assert.strictEqual(result.metaData[1].metaData[0].name, 'NAME');
    assert.strictEqual(result.metaData[2].name, 'NC2');
    assert.strictEqual(result.metaData[2].metaData[0].name, 'FOOD');

    assert.strictEqual(result.rows[0].COUNTRY, 'Brazil');
    assert.strictEqual(result.rows[0].NC1[0].NAME, 'Frank');

    assert.strictEqual(result.rows[0].NC2[0].FOOD, 'Brigadeiro');
    assert.strictEqual(result.rows[0].NC2[1].FOOD, 'Moqueca');
    assert.strictEqual(result.rows[0].NC2[2].FOOD, 'Quindim');
  }); // 235.3

  it('235.4 fetch one row with resultSet', async () => {
    const options = {
      resultSet: true,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };
    const result = await conn.execute(sqlTwo, [], options);
    const rows = await traverse_results(result.resultSet);

    assert.strictEqual(result.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result.metaData[1].name, 'NC1');
    assert.strictEqual(result.metaData[2].name, 'NC2');

    assert.strictEqual(rows[0].COUNTRY, 'Brazil');
    assert.strictEqual(rows[0].NC1[0].NAME, 'Frank');

    assert.strictEqual(rows[0].NC2[0].FOOD, 'Brigadeiro');
    assert.strictEqual(rows[0].NC2[1].FOOD, 'Moqueca');
    assert.strictEqual(rows[0].NC2[2].FOOD, 'Quindim');
  }); // 235.4

  const sqlThree = `
    SELECT country,
    CURSOR(SELECT name
           FROM ${peopleTab} p
           WHERE p.addresskey = a.addresskey
           ORDER by name
    ) as nc1,
    CURSOR(SELECT food
           FROM ${foodTab} f
           WHERE f.addresskey = a.addresskey
           ORDER BY food
    ) as nc2
    FROM ${addrTab} a
    WHERE country = 'Chile'
    ORDER BY country
  `;

  it('235.5 fetch multiple rows directly', async () => {
    const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    const result = await conn.execute(sqlThree, [], options);

    assert.strictEqual(result.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result.metaData[1].name, 'NC1');
    assert.strictEqual(result.metaData[1].metaData[0].name, 'NAME');
    assert.strictEqual(result.metaData[2].name, 'NC2');
    assert.strictEqual(result.metaData[2].metaData[0].name, 'FOOD');

    assert.strictEqual(result.rows[0].COUNTRY, 'Chile');

    assert.strictEqual(result.rows[0].NC1[0].NAME, 'Bruce');
    assert.strictEqual(result.rows[0].NC1[1].NAME, 'Christine');
    assert.strictEqual(result.rows[0].NC1[2].NAME, 'Erica');

    assert.strictEqual(result.rows[0].NC2[0].FOOD, 'Asado');
    assert.strictEqual(result.rows[0].NC2[1].FOOD, 'Cazuela');
    assert.strictEqual(result.rows[0].NC2[2].FOOD, 'Pastel de Choclo');
  }); // 235.5

  it('235.6 fetch multiple rows with resultSet', async () => {
    const options = {
      resultSet: true,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };
    const result = await conn.execute(sqlThree, [], options);
    const rows = await traverse_results(result.resultSet);

    assert.strictEqual(result.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result.metaData[1].name, 'NC1');
    assert.strictEqual(result.metaData[2].name, 'NC2');

    assert.strictEqual(rows[0].COUNTRY, 'Chile');

    assert.strictEqual(rows[0].NC1[0].NAME, 'Bruce');
    assert.strictEqual(rows[0].NC1[1].NAME, 'Christine');
    assert.strictEqual(rows[0].NC1[2].NAME, 'Erica');

    assert.strictEqual(rows[0].NC2[0].FOOD, 'Asado');
    assert.strictEqual(rows[0].NC2[1].FOOD, 'Cazuela');
    assert.strictEqual(rows[0].NC2[2].FOOD, 'Pastel de Choclo');
  }); // 235.6

  const sqlFour = `
    SELECT country,
    CURSOR(SELECT food
           FROM ${foodTab} f
           WHERE f.addresskey = 201
           ORDER BY food
    ) as nc
    FROM ${addrTab} a
    WHERE country = 'Demmark'
    ORDER BY country
  `;

  it('235.7 query rows that contain null values and a nested cursor', async () => {
    const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    const result = await conn.execute(sqlFour, [], options);

    assert.strictEqual(result.metaData[0].name, 'COUNTRY');
    assert.strictEqual(result.metaData[1].name, 'NC');
    assert.strictEqual(result.rows.length, 0);
  }); // 235.7

  it('235.8 maxRows option is respected at all levels of nested cursors', async () => {
    const LIMIT = 1;
    const options = {
      maxRows: LIMIT,
      outFormat: oracledb.OUT_FORMAT_OBJECT
    };
    const result = await conn.execute(sqlThree, [], options);

    assert.strictEqual(result.rows[0].COUNTRY, 'Chile');
    assert.deepEqual(result.rows[0].NC1, [ { NAME: 'Bruce' } ]);
    assert.deepEqual(result.rows[0].NC2, [ { FOOD: 'Asado' } ]);
  }); // 235.8

});
