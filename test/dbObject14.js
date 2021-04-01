/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   213. dbObject14.js
 *
 * DESCRIPTION
 *   examples/plsqlvarray.js
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('213. dbObject14.js', () => {
  let conn;

  const TABLE = 'NODB_TAB_SPORTS';
  const PLAYER_T = 'NODB_TYP_PLAYERTYPE';
  const TEAM_T = 'NODB_TYP_TEAMTYPE';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let plsql = `
        CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
          shirtnumber NUMBER,
          name        VARCHAR2(20)
        );
      `;
      await conn.execute(plsql);

      plsql = `
        CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T};
      `;
      await conn.execute(plsql);

      let sql = `
        CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
      `;
      plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

    } catch (err) {
      should.not.exist(err);
    }
  }); // before()

  after(async () => {
    try {
      let sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);

      sql = `DROP TYPE ${TEAM_T} FORCE`;
      await conn.execute(sql);

      sql = `DROP TYPE ${PLAYER_T} FORCE`;
      await conn.execute(sql);

      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  }); // after()

  it('213.1 examples/selectvarray.js', async () => {

    try {
      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);

      // Insert with explicit constructor
      const hockeyPlayers = [
        {SHIRTNUMBER: 11, NAME: 'Elizabeth'},
        {SHIRTNUMBER: 22, NAME: 'Frank'},
      ];
      const hockeyTeam = new TeamTypeClass(hockeyPlayers);

      let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
      let binds = { sn: "Hockey", t: hockeyTeam };
      const result1 = await conn.execute(sql, binds);
      should.strictEqual(result1.rowsAffected, 1);

      // Insert with direct binding
      const badmintonPlayers = [
        { SHIRTNUMBER: 10, NAME: 'Alison' },
        { SHIRTNUMBER: 20, NAME: 'Bob' },
        { SHIRTNUMBER: 30, NAME: 'Charlie' },
        { SHIRTNUMBER: 40, NAME: 'Doug' }
      ];
      binds = { sn: "Badminton", t: { type: TeamTypeClass, val: badmintonPlayers } };
      const result2 = await conn.execute(sql, binds);
      should.strictEqual(result2.rowsAffected, 1);

      // Query the data back
      sql = `SELECT * FROM ${TABLE}`;
      const result3 = await conn.execute(sql, [], { outFormat:oracledb.OUT_FORMAT_OBJECT });
      should.strictEqual(result3.rows[0].SPORTNAME, 'Hockey');
      should.strictEqual(result3.rows[1].SPORTNAME, 'Badminton');

      for (let i = 0; i < result3.rows[0].TEAM.length; i++) {
        should.strictEqual(result3.rows[0].TEAM[i].SHIRTNUMBER, hockeyPlayers[i].SHIRTNUMBER);
        should.strictEqual(result3.rows[0].TEAM[i].NAME, hockeyPlayers[i].NAME);
      }

      for (let i = 0; i < result3.rows[1].TEAM.length; i++) {
        should.strictEqual(result3.rows[1].TEAM[i].SHIRTNUMBER, badmintonPlayers[i].SHIRTNUMBER);
        should.strictEqual(result3.rows[1].TEAM[i].NAME, badmintonPlayers[i].NAME);
      }
    } catch (err) {
      should.not.exist(err);
    }
  }); // 213.1
});
