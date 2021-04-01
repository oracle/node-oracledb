/* Copyright (c) 2020, 2021, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
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
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('235. nestedCursor04.js', () => {

  let conn;
  const peopleTab = 'nodb_nc04_people';
  const addrTab   = 'nodb_nc04_addr';
  const foodTab   = 'nodb_nc04_food';

  before(async () => {
    try {
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
      should.strictEqual(result1.rowsAffected, binds1.length);

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
      should.strictEqual(result2.rowsAffected, binds2.length);

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
      should.strictEqual(result3.rowsAffected, binds3.length);

    } catch (err) {
      should.not.exist(err);
    }
  }); // before()

  after(async () => {
    try {
      let sql = `drop table ${peopleTab} purge`;
      await conn.execute(sql);

      sql = `drop table ${addrTab} purge`;
      await conn.execute(sql);

      sql = `drop table ${foodTab} purge`;
      await conn.execute(sql);

      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  }); // after

  async function traverse_results(resultSet) {
    const fetchedRows = [];
    try {
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
    } catch (err) {
      should.not.exist(err);
    }

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

    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlOne, [], options);
      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC1');
      should.strictEqual(result.metaData[2].name, 'NC2');
      should.strictEqual(result.rows.length, 0);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 235.1

  it('235.2 fetch zero row with resultSet', async () => {
    try {
      const options = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlOne, [], options);
      const rows = await traverse_results(result.resultSet);
      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC1');
      should.strictEqual(result.metaData[2].name, 'NC2');
      should.strictEqual(rows.length, 0);
    } catch (err) {
      should.not.exist(err);
    }
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
    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlTwo, [], options);

      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC1');
      should.strictEqual(result.metaData[1].metaData[0].name, 'NAME');
      should.strictEqual(result.metaData[2].name, 'NC2');
      should.strictEqual(result.metaData[2].metaData[0].name, 'FOOD');

      should.strictEqual(result.rows[0].COUNTRY, 'Brazil');
      should.strictEqual(result.rows[0].NC1[0].NAME, 'Frank');

      should.strictEqual(result.rows[0].NC2[0].FOOD, 'Brigadeiro');
      should.strictEqual(result.rows[0].NC2[1].FOOD, 'Moqueca');
      should.strictEqual(result.rows[0].NC2[2].FOOD, 'Quindim');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 235.3

  it('235.4 fetch one row with resultSet', async () => {
    try {
      const options = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlTwo, [], options);
      const rows = await traverse_results(result.resultSet);

      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC1');
      should.strictEqual(result.metaData[2].name, 'NC2');

      should.strictEqual(rows[0].COUNTRY, 'Brazil');
      should.strictEqual(rows[0].NC1[0].NAME, 'Frank');

      should.strictEqual(rows[0].NC2[0].FOOD, 'Brigadeiro');
      should.strictEqual(rows[0].NC2[1].FOOD, 'Moqueca');
      should.strictEqual(rows[0].NC2[2].FOOD, 'Quindim');

    } catch (err) {
      should.not.exist(err);
    }
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
    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlThree, [], options);

      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC1');
      should.strictEqual(result.metaData[1].metaData[0].name, 'NAME');
      should.strictEqual(result.metaData[2].name, 'NC2');
      should.strictEqual(result.metaData[2].metaData[0].name, 'FOOD');

      should.strictEqual(result.rows[0].COUNTRY, 'Chile');

      should.strictEqual(result.rows[0].NC1[0].NAME, 'Bruce');
      should.strictEqual(result.rows[0].NC1[1].NAME, 'Christine');
      should.strictEqual(result.rows[0].NC1[2].NAME, 'Erica');

      should.strictEqual(result.rows[0].NC2[0].FOOD, 'Asado');
      should.strictEqual(result.rows[0].NC2[1].FOOD, 'Cazuela');
      should.strictEqual(result.rows[0].NC2[2].FOOD, 'Pastel de Choclo');

    } catch (err) {
      should.not.exist(err);
    }
  }); // 235.5

  it('235.6 fetch multiple rows with resultSet', async () => {
    try {
      const options = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlThree, [], options);
      const rows = await traverse_results(result.resultSet);

      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC1');
      should.strictEqual(result.metaData[2].name, 'NC2');

      should.strictEqual(rows[0].COUNTRY, 'Chile');

      should.strictEqual(rows[0].NC1[0].NAME, 'Bruce');
      should.strictEqual(rows[0].NC1[1].NAME, 'Christine');
      should.strictEqual(rows[0].NC1[2].NAME, 'Erica');

      should.strictEqual(rows[0].NC2[0].FOOD, 'Asado');
      should.strictEqual(rows[0].NC2[1].FOOD, 'Cazuela');
      should.strictEqual(rows[0].NC2[2].FOOD, 'Pastel de Choclo');
    } catch (err) {
      should.not.exist(err);
    }
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
    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlFour, [], options);

      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC');
      should.strictEqual(result.rows.length, 0);

    } catch (err) {
      should.not.exist(err);
    }
  }); // 235.7

  it('235.8 maxRows option is respected at all levels of nested cursors', async () => {
    try {
      const LIMIT = 1;
      const options = {
        maxRows: LIMIT,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlThree, [], options);

      should.strictEqual(result.rows[0].COUNTRY, 'Chile');
      should.deepEqual(result.rows[0].NC1, [ { NAME: 'Bruce' } ]);
      should.deepEqual(result.rows[0].NC2, [ { FOOD: 'Asado' } ]);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 235.8

});
