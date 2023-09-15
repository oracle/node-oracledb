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

    let plsql = `
      CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
        shirtnumber NUMBER,
        zipcode     NUMBER(12,0),
        rating      NUMBER(22,0),
        joindate    DATE,
        name        VARCHAR2(20)
      );
    `;
    await conn.execute(plsql);

    plsql = `
      CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T};
    `;
    await conn.execute(plsql);

    const sql = `
      CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
    `;
    plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await conn.execute(plsql);
  }); // before()

  after(async () => {
    let sql = `DROP TABLE ${TABLE} PURGE`;
    await conn.execute(sql);

    sql = `DROP TYPE ${TEAM_T} FORCE`;
    await conn.execute(sql);

    sql = `DROP TYPE ${PLAYER_T} FORCE`;
    await conn.execute(sql);

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
    // Insert with explicit constructor
    const hockeyPlayers = [
      {SHIRTNUMBER: 11, ZIPCODE: 94016, RATING: 3, JOINDATE: nextDay(), NAME: 'Elizabeth'},
      {SHIRTNUMBER: 22, ZIPCODE: 94017, RATING: 4, JOINDATE: nextDay(), NAME: 'Frank'},
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
