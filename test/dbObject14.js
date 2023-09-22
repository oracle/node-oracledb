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
 *   213. dbObject14.js
 *
 * DESCRIPTION
 *   examples/plsqlvarray.js
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('213. dbObject14.js', () => {
  let conn;

  const TABLE = 'NODB_TAB_SPORTS';
  const PLAYER_T = 'NODB_TYP_PLAYERTYPE';
  const TEAM_T = 'NODB_TYP_TEAMTYPE';

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);

    let sql = `
      CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
        shirtnumber NUMBER,
        zipcode     NUMBER(12,0),
        rating      NUMBER(22,0),
        joindate    DATE,
        name        VARCHAR2(20)
      );
    `;
    await testsUtil.createType(conn, PLAYER_T, sql);

    sql = `
      CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T};
    `;
    await testsUtil.createType(conn, TEAM_T, sql);

    sql = `
      CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
    `;
    await testsUtil.createTable(conn, TABLE, sql);
  }); // before()

  after(async () => {
    await testsUtil.dropTable(conn, TABLE);
    await testsUtil.dropType(conn, TEAM_T);
    await testsUtil.dropType(conn, PLAYER_T);

    await conn.close();
  }); // after()

  it('213.1 examples/selectvarray.js', async () => {

    const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
    const date = new Date(1989, 3, 4);
    const nextDay = function() {
      date.setDate(date.getDate() + 1);
      const tempDate = new Date(date.getTime());
      return tempDate;
    };

    // Insert with explicit constructor and wrong value 1 for a type VARCHAR2(20)
    let hockeyPlayers = [
      { SHIRTNUMBER: 11, ZIPCODE: 94016, RATING: 3, JOINDATE: nextDay(), NAME: 1 },
    ];
    assert.rejects(
      () => {
        new TeamTypeClass(hockeyPlayers);
      },
      // NJS-134:/
    );

    // Insert with explicit constructor with
    // valid values and a null
    hockeyPlayers = [
      {SHIRTNUMBER: 11, ZIPCODE: 94016, RATING: 3, JOINDATE: nextDay(), NAME: 'Elizabeth'},
      {SHIRTNUMBER: 22, ZIPCODE: 94017, RATING: 4, JOINDATE: nextDay(), NAME: 'Frank'},
      {SHIRTNUMBER: null, ZIPCODE: null, RATING: null, JOINDATE: null, NAME: null},
    ];
    const hockeyTeam = new TeamTypeClass(hockeyPlayers);

    let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
    let binds = { sn: "Hockey", t: hockeyTeam };
    const result1 = await conn.execute(sql, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    // Insert with direct binding
    const badmintonPlayers = [
      { SHIRTNUMBER: 10, ZIPCODE: 94016, RATING: 3, JOINDATE: nextDay(), NAME: 'Alison' },
      { SHIRTNUMBER: 20, ZIPCODE: 94017, RATING: 4, JOINDATE: nextDay(),
        NAME: 'Bob' },
      { SHIRTNUMBER: 30, ZIPCODE: 94018, RATING: 6, JOINDATE: nextDay(),
        NAME: 'Charlie' },
      { SHIRTNUMBER: 40, ZIPCODE: 94019, RATING: 5, JOINDATE: nextDay(),
        NAME: 'Doug' }
    ];
    binds = { sn: "Badminton", t: { type: TeamTypeClass, val: badmintonPlayers } };
    const result2 = await conn.execute(sql, binds);
    assert.strictEqual(result2.rowsAffected, 1);

    // Query the data back
    sql = `SELECT * FROM ${TABLE}`;
    const result3 = await conn.execute(sql, [], { outFormat:oracledb.OUT_FORMAT_OBJECT });
    assert.strictEqual(result3.rows[0].SPORTNAME, 'Hockey');
    assert.strictEqual(result3.rows[1].SPORTNAME, 'Badminton');
    for (let i = 0; i < hockeyPlayers.length; i++) {
      assert.strictEqual(result3.rows[0].TEAM[i].SHIRTNUMBER, hockeyPlayers[i].SHIRTNUMBER);
      assert.strictEqual(result3.rows[0].TEAM[i].ZIPCODE, hockeyPlayers[i].ZIPCODE);
      assert.strictEqual(result3.rows[0].TEAM[i].RATING, hockeyPlayers[i].RATING);
      assert.deepStrictEqual(result3.rows[0].TEAM[i].JOINDATE, hockeyPlayers[i].JOINDATE);
      assert.strictEqual(result3.rows[0].TEAM[i].NAME, hockeyPlayers[i].NAME);
    }

    for (let i = 0; i < badmintonPlayers.length; i++) {
      assert.strictEqual(result3.rows[1].TEAM[i].SHIRTNUMBER, badmintonPlayers[i].SHIRTNUMBER);
      assert.strictEqual(result3.rows[1].TEAM[i].ZIPCODE, badmintonPlayers[i].ZIPCODE);
      assert.strictEqual(result3.rows[1].TEAM[i].RATING, badmintonPlayers[i].RATING);
      assert.deepStrictEqual(result3.rows[1].TEAM[i].JOINDATE, badmintonPlayers[i].JOINDATE);
      assert.strictEqual(result3.rows[1].TEAM[i].NAME, badmintonPlayers[i].NAME);
    }
  }); // 213.1
});

describe('213.2 Object Collection with BLOB fields', () => {
  let conn;
  const TABLE = 'NODB_TAB_BUF_COLLECTION_14_1';
  const BUF_TYPE = 'NODB_TYP_BUFFER_14_1';
  const BUF_TYPE_COLLECTION = 'NODB_TYP_BUFFER_COLLECTION_14_1';
  const TEST_PROC = 'NODB_PROC_14_1';

  before(async function() {
    if (oracledb.thin) {
      return this.skip();
    }
    conn = await oracledb.getConnection(dbConfig);

    let sql = `
      CREATE OR REPLACE TYPE ${BUF_TYPE} AS OBJECT (
        ID BLOB
      );
    `;
    await testsUtil.createType(conn, BUF_TYPE, sql);

    sql = `
      CREATE OR REPLACE TYPE ${BUF_TYPE_COLLECTION} AS TABLE OF ${BUF_TYPE}`;
    await testsUtil.createType(conn, BUF_TYPE_COLLECTION, sql);

    sql = `
      CREATE TABLE ${TABLE} (buff_col ${BUF_TYPE_COLLECTION})
        NESTED TABLE buff_col STORE AS ${TABLE}_col
    `;
    await testsUtil.createTable(conn, TABLE, sql);

    const plsql = `CREATE OR REPLACE PROCEDURE ${TEST_PROC} (buff_coll IN
        ${BUF_TYPE_COLLECTION})
        AS
        BEGIN
            INSERT INTO ${TABLE} values (buff_coll);
        END;`;
    await conn.execute(plsql);
  }); // before()

  after(async function() {
    if (conn) {
      const sql = `DROP PROCEDURE ${TEST_PROC}`;
      await conn.execute(sql);

      await testsUtil.dropTable(conn, TABLE);
      await testsUtil.dropType(conn, BUF_TYPE);
      await testsUtil.dropType(conn, BUF_TYPE_COLLECTION);

      await conn.close();
    }
  }); // after()

  it('213.2.1 insert and verify the collection data', async () => {
    const bufTypeCollectionClass = await conn.getDbObjectClass(BUF_TYPE_COLLECTION);
    const bufArray = [
      { ID: Buffer.from('A'.repeat(50000)) },
      { ID: Buffer.from('B'.repeat(50000)) },
      { ID: null }
    ];
    const bufTypeCollection = new bufTypeCollectionClass(bufArray);

    // insert data into table
    let sql = `BEGIN ${TEST_PROC}(:buff_collection); END;`;
    const binds = { buff_collection: bufTypeCollection };
    let result = await conn.execute(sql, binds);

    // read from the table and verify
    let lob;
    let lobData;
    sql = `select * from ${TABLE}`;
    result = await conn.execute(sql);
    for (let i = 0; i < bufArray.length; i++) {
      lob = result.rows[0][0][i].ID;
      if (!lob) {
        lobData = null;
      } else {
        lobData = await lob.getData();
      }
      assert.deepStrictEqual(bufArray[i].ID, lobData);
    }
  });
});
