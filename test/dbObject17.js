/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   216. dbObject17.js
 *
 * DESCRIPTION
 *   Test DB Object collection with columns TIMESTAMP, TIMESTAMP WITH TIME ZONE
 *    and TIMESTAMP WITH LOCAL TIME ZONE.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

(!oracledb.thin ? describe : describe.skip)('216. dbObject17.js', () => {

  let conn;

  const TABLE = 'NODB_TAB_SPORTS';
  const PLAYER_T = 'NODB_TYP_PLAYER_17';
  const TEAM_T   = 'NODB_TYP_TEAM_17';

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);

    let plsql = `
      CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
        shirtnumber NUMBER,
        name        VARCHAR2(20),
        ts          TIMESTAMP,
        tsz         TIMESTAMP WITH TIME ZONE,
        ltz         TIMESTAMP WITH LOCAL TIME ZONE
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

  it('216.1 VARRAY Collection. Object columns contain TS, TSZ and LTZ', async () => {
    const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);

    // Insert with explicit constructor
    const FrisbeePlayers = [
      {
        SHIRTNUMBER: 11,
        NAME: 'Elizabeth',
        TS:  new Date(1986, 8, 18, 12, 14, 27, 0),
        TSZ: new Date(1989, 3, 4, 10, 27, 16, 201),
        LTZ: new Date(1999, 5, 4, 11, 23, 5, 45)
      },
      {
        SHIRTNUMBER: 22,
        NAME: 'Frank',
        TS:  new Date(1987, 8, 18, 12, 14, 27, 0),
        TSZ: new Date(1990, 3, 4, 10, 27, 16, 201),
        LTZ: new Date(2000, 5, 4, 11, 23, 5, 45)
      }
    ];
    const FrisbeeTeam = new TeamTypeClass(FrisbeePlayers);

    let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
    const binds = { sn: "Frisbee", t: FrisbeeTeam };
    const result1 = await conn.execute(sql, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    sql = `SELECT * FROM ${TABLE}`;
    const result = await conn.execute(sql, [], { outFormat:oracledb.OUT_FORMAT_OBJECT });

    assert.strictEqual(result.rows[0].SPORTNAME, 'Frisbee');

    for (let i = 0; i < result.rows[0].TEAM.length; i++) {
      assert.strictEqual(result.rows[0].TEAM[i].SHIRTNUMBER, FrisbeePlayers[i].SHIRTNUMBER);
      assert.strictEqual(result.rows[0].TEAM[i].NAME, FrisbeePlayers[i].NAME);
      // assert.strictEqual(result.rows[0].TEAM[i].TS.getTime(), FrisbeePlayers[i].TS.getTime());
      assert.strictEqual(result.rows[0].TEAM[i].TSZ.getTime(), FrisbeePlayers[i].TSZ.getTime());
      assert.strictEqual(result.rows[0].TEAM[i].LTZ.getTime(), FrisbeePlayers[i].LTZ.getTime());
    }
  }); // 216.1
});
