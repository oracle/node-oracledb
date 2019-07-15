/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   215. dbObject16.js
 *
 * DESCRIPTION
 *   Test DB Object collection with DATE column.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('215. dbObject16.js', () => {

  let conn;

  const TABLE = 'NODB_TAB_SPORTS';
  const PLAYER_T = 'NODB_TYP_PLAYERTYPE';
  const TEAM_T   = 'NODB_TYP_TEAMTYPE';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let plsql =`
        CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
          shirtnumber NUMBER,
          name        VARCHAR2(20),
          draft       DATE
        );
      `;
      await conn.execute(plsql);

      plsql =`
        CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T};
      `;
      await conn.execute(plsql);

      let sql =`
        CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
      `;
      plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

    } catch(err) {
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
    } catch(err) {
      should.not.exist(err);
    }
  }); // after()

  it('215.1 Collection of DATE, named Oracle type binds', async () => {
    try {
      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);

      // Insert with explicit constructor
      const FrisbeePlayers = [
        { SHIRTNUMBER: 11, NAME: 'Elizabeth', DRAFT: new Date(2008, 11, 17) },
        { SHIRTNUMBER: 22, NAME: 'Frank',     DRAFT: new Date(2011, 2, 4) },
        { SHIRTNUMBER: 30, NAME: 'Charlie',   DRAFT: new Date(2010, 9, 1) }
      ];
      const FrisbeeTeam = new TeamTypeClass(FrisbeePlayers);

      let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
      let binds = { sn: "Frisbee", t: FrisbeeTeam };
      const result1 = await conn.execute(sql, binds);
      should.strictEqual(result1.rowsAffected, 1);

      // Insert with direct binding
      const hockeyPlayers = [
        { SHIRTNUMBER: 11, NAME: 'Elizabeth', DRAFT: new Date(1997, 3, 25) },
        { SHIRTNUMBER: 22, NAME: 'Frank',     DRAFT: new Date(1999, 7, 8)},
      ];
      binds = { sn: "Hockey", t: { type: TeamTypeClass, val: hockeyPlayers } };
      const result2 = await conn.execute(sql, binds);
      should.strictEqual(result2.rowsAffected, 1);

      // Use the Oracle type name
      const TennisPlayers = [
        { SHIRTNUMBER: 21, NAME: 'John', DRAFT: new Date(1995, 2, 5) },
        { SHIRTNUMBER: 23, NAME: 'Michael', DRAFT: new Date(2000, 6, 6) }
      ];
      binds = { sn: "Tennis", t: { type: TEAM_T, val: TennisPlayers } };
      const result3 = await conn.execute(sql, binds);
      should.strictEqual(result3.rowsAffected, 1);

      sql = `SELECT * FROM ${TABLE}`;
      const result4 = await conn.execute(sql, [], { outFormat:oracledb.OUT_FORMAT_OBJECT });
      should.strictEqual(result4.rows[0].SPORTNAME, 'Frisbee');
      should.strictEqual(result4.rows[1].SPORTNAME, 'Hockey');

      for (let i = 0; i < result4.rows[0].TEAM.length; i++) {
        should.strictEqual(result4.rows[0].TEAM[i].SHIRTNUMBER, FrisbeePlayers[i].SHIRTNUMBER);
        should.strictEqual(result4.rows[0].TEAM[i].NAME, FrisbeePlayers[i].NAME);
        should.strictEqual(result4.rows[0].TEAM[i].DRAFT.getTime(), FrisbeePlayers[i].DRAFT.getTime());
      }

      for (let i = 0; i < result4.rows[1].TEAM.length; i++) {
        should.strictEqual(result4.rows[1].TEAM[i].SHIRTNUMBER, hockeyPlayers[i].SHIRTNUMBER);
        should.strictEqual(result4.rows[1].TEAM[i].NAME, hockeyPlayers[i].NAME);
        should.strictEqual(result4.rows[1].TEAM[i].DRAFT.getTime(), hockeyPlayers[i].DRAFT.getTime());
      }

      for (let i = 0; i < result4.rows[2].TEAM.length; i++) {
        should.strictEqual(result4.rows[2].TEAM[i].SHIRTNUMBER, TennisPlayers[i].SHIRTNUMBER);
        should.strictEqual(result4.rows[2].TEAM[i].NAME, TennisPlayers[i].NAME);
        should.strictEqual(result4.rows[2].TEAM[i].DRAFT.getTime(), TennisPlayers[i].DRAFT.getTime());
      }

    } catch (err) {
      should.not.exist(err);
    }

  }); // 215.1

});