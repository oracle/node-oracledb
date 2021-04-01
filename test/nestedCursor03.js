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
 *   234. nestedCursor03.js
 *
 * DESCRIPTION
 *   Fetching a query that contains a single nested cursor which in turn
 *   fetches zero, one or multiple rows (with and without resultSet)
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('234. nestedCursor03.js', () => {

  let conn;
  const peopleTab = 'nodb_nc03_people';
  const addrTab   = 'nodb_nc03_addr';

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
    ) as NC
    FROM ${addrTab} a
    WHERE country = 'Denmark'
    ORDER BY country
  `;

  it('234.1 fetch zero row without resultSet option', async () => {
    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlOne, [], options);
      should.strictEqual(result.rows.length, 0);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.1

  it('234.2 fetch zero row with resultSet', async () => {
    try {
      const options = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlOne, [], options);
      const rows = await traverse_results(result.resultSet);
      should.strictEqual(rows.length, 0);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.2

  const sqlTwo = `
    SELECT country,
    CURSOR(SELECT name
           FROM ${peopleTab} p
           WHERE p.addresskey = a.addresskey
           ORDER by name
    ) as NC
    FROM ${addrTab} a
    WHERE country = 'Brazil'
    ORDER BY country
  `;
  it('234.3 fetch one row without resultSet option', async () => {
    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlTwo, [], options);

      should.strictEqual(result.rows[0].COUNTRY, 'Brazil');
      should.strictEqual(result.rows[0].NC[0].NAME, 'Frank');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.3

  it('234.4 fetch one row with resultSet option', async () => {
    try {
      const options = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlTwo, [], options);
      const rows = await traverse_results(result.resultSet);
      should.strictEqual(rows[0].COUNTRY, 'Brazil');
      should.strictEqual(rows[0].NC[0].NAME, 'Frank');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.4

  const sqlThree = `
    SELECT country,
    CURSOR(SELECT name
           FROM ${peopleTab} p
           WHERE p.addresskey = a.addresskey
           ORDER by name
    ) as NC
    FROM ${addrTab} a
    WHERE country = 'Chile'
    ORDER BY country
  `;
  it('234.5 fetch multiple rows directly', async () => {
    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlThree, [], options);
      should.strictEqual(result.rows[0].COUNTRY, 'Chile');
      should.strictEqual(result.rows[0].NC[0].NAME, 'Bruce');
      should.strictEqual(result.rows[0].NC[1].NAME, 'Christine');
      should.strictEqual(result.rows[0].NC[2].NAME, 'Erica');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.5

  it('234.6 fetch multiple rows with resultSet', async () => {
    try {
      const options = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlThree, [], options);
      const rows = await traverse_results(result.resultSet);
      should.strictEqual(rows[0].COUNTRY, 'Chile');
      should.strictEqual(rows[0].NC[0].NAME, 'Bruce');
      should.strictEqual(rows[0].NC[1].NAME, 'Christine');
      should.strictEqual(rows[0].NC[2].NAME, 'Erica');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.6

  const sqlFour = `
    SELECT country,
    CURSOR(SELECT name
           FROM ${peopleTab} p
           WHERE p.addresskey = a.addresskey
           ORDER by name
    ) as NC
    FROM ${addrTab} a
    ORDER BY country
  `;
  it('234.7 directly fetch multiple rows with each contains a nested cursor', async () => {
    try {
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlFour, [], options);

      should.strictEqual(result.metaData[0].name, 'COUNTRY');
      should.strictEqual(result.metaData[1].name, 'NC');

      should.strictEqual(result.metaData[1].metaData[0].name, 'NAME');

      should.strictEqual(result.rows[0].COUNTRY, 'Austria');
      should.strictEqual(result.rows[1].COUNTRY, 'Brazil');
      should.strictEqual(result.rows[2].COUNTRY, 'Chile');

      should.strictEqual(result.rows[0].NC[0].NAME, 'Alice');
      should.strictEqual(result.rows[0].NC[1].NAME, 'David');

      should.strictEqual(result.rows[1].NC[0].NAME, 'Frank');

      should.strictEqual(result.rows[2].NC[0].NAME, 'Bruce');
      should.strictEqual(result.rows[2].NC[1].NAME, 'Christine');
      should.strictEqual(result.rows[2].NC[2].NAME, 'Erica');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.7

  it('234.8 fetch multiple rows with each contains a nested cursor in resultSet', async () => {
    try {
      const options = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlFour, [], options);
      const rows = await traverse_results(result.resultSet);

      should.strictEqual(rows[0].COUNTRY, 'Austria');
      should.strictEqual(rows[1].COUNTRY, 'Brazil');
      should.strictEqual(rows[2].COUNTRY, 'Chile');

      should.strictEqual(rows[0].NC[0].NAME, 'Alice');
      should.strictEqual(rows[0].NC[1].NAME, 'David');

      should.strictEqual(rows[1].NC[0].NAME, 'Frank');

      should.strictEqual(rows[2].NC[0].NAME, 'Bruce');
      should.strictEqual(rows[2].NC[1].NAME, 'Christine');
      should.strictEqual(rows[2].NC[2].NAME, 'Erica');


    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.8

  // verifying that the option maxRows is respected at all levels of nested cursors
  it('234.9 maxRows option', async () => {
    try {
      const LIMIT = 1;
      const options = {
        maxRows: LIMIT,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlFour, [], options);

      should.strictEqual(result.rows.length, LIMIT);
      should.strictEqual(result.rows[0].NC.length, LIMIT);
      should.strictEqual(result.rows[0].NC[0].NAME, 'Alice');

    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.9

  it('234.10 maxRows option is ignored when resultSet option is true', async () => {
    try {
      const LIMIT = 1;
      const options = {
        maxRows: LIMIT,
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlFour, [], options);
      const rows = await traverse_results(result.resultSet);

      should.strictEqual(rows[0].COUNTRY, 'Austria');
      should.strictEqual(rows[1].COUNTRY, 'Brazil');
      should.strictEqual(rows[2].COUNTRY, 'Chile');

      should.strictEqual(rows[0].NC[0].NAME, 'Alice');
      should.strictEqual(rows[0].NC[1].NAME, 'David');

      should.strictEqual(rows[1].NC[0].NAME, 'Frank');

      should.strictEqual(rows[2].NC[0].NAME, 'Bruce');
      should.strictEqual(rows[2].NC[1].NAME, 'Christine');
      should.strictEqual(rows[2].NC[2].NAME, 'Erica');

    } catch (err) {
      should.not.exist(err);
    }
  }); // 234.10
});
