/* Copyright (c) 2019, 2026, Oracle and/or its affiliates. */

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

describe('216. dbObject17.js', () => {

  let conn;
  let dbTimeZoneIsRegionInThinMode = false;

  const TABLE = 'NODB_TAB_SPORTS';
  const PLAYER_T = 'NODB_TYP_PLAYER_17';
  const TEAM_T   = 'NODB_TYP_TEAM_17';

  function formatLocalTimestamp(date) {
    const pad = (value, length = 2) => String(value).padStart(length, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${
      pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${
      pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);
    dbTimeZoneIsRegionInThinMode = oracledb.thin &&
      await testsUtil.isDbTimeZoneRegion(conn);

    let sql = `
      CREATE TYPE ${PLAYER_T} AS OBJECT (
        shirtnumber NUMBER,
        name        VARCHAR2(20),
        ts          TIMESTAMP,
        tsz         TIMESTAMP WITH TIME ZONE,
        ltz         TIMESTAMP WITH LOCAL TIME ZONE
      )
    `;
    await conn.execute(testsUtil.sqlCreateType(PLAYER_T, sql));

    sql = `
      CREATE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T}
    `;
    await conn.execute(testsUtil.sqlCreateType(TEAM_T, sql));

    sql = `
      CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
    `;
    await conn.execute(testsUtil.sqlCreateTable(TABLE, sql));
  }); // before()

  after(async () => {
    try {
      await conn.execute(testsUtil.sqlDropTable(TABLE));
      await conn.execute(testsUtil.sqlDropType(TEAM_T));
      await conn.execute(testsUtil.sqlDropType(PLAYER_T));
    } finally {
      await conn.close();
    }
  }); // after()

  it('216.1 VARRAY Collection. Object columns contain TS, TSZ and LTZ', async () => {
    const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);

    // Insert with explicit constructor
    const FrisbeePlayers = [
      {
        SHIRTNUMBER: 11,
        NAME: 'Elizabeth',
        TS: new Date(1986, 8, 18, 12, 14, 27, 0),
        TSZ: new Date(1989, 3, 4, 10, 27, 16, 201),
        LTZ: new Date(1999, 5, 4, 11, 23, 5, 45)
      },
      {
        SHIRTNUMBER: 22,
        NAME: 'Frank',
        TS: new Date(1987, 8, 18, 12, 14, 27, 0),
        TSZ: new Date(1990, 3, 4, 10, 27, 16, 201),
        LTZ: new Date(2000, 5, 4, 11, 23, 5, 45)
      }
    ];
    const FrisbeeTeam = new TeamTypeClass(FrisbeePlayers);

    let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
    const binds = { sn: "Frisbee", t: FrisbeeTeam };
    if (dbTimeZoneIsRegionInThinMode) {
      await assert.rejects(conn.execute(sql, binds), /NJS-201:/);
      return;
    }

    const result1 = await conn.execute(sql, binds);
    assert.strictEqual(result1.rowsAffected, 1);

    // Verify the values Oracle stored independently of the driver's fetch
    // paths. A bind/fetch-only check can hide matching errors in both paths.
    sql = `
      SELECT TO_CHAR(p.ts, 'YYYY-MM-DD"T"HH24:MI:SS.FF3'),
        TO_CHAR(SYS_EXTRACT_UTC(p.tsz), 'YYYY-MM-DD"T"HH24:MI:SS.FF3'),
        TO_CHAR(SYS_EXTRACT_UTC(p.ltz), 'YYYY-MM-DD"T"HH24:MI:SS.FF3')
      FROM ${TABLE} t, TABLE(t.team) p
      WHERE t.sportname = :sportName
      ORDER BY p.shirtnumber
    `;
    const storedValues = await conn.execute(sql, { sportName: 'Frisbee' });
    for (let i = 0; i < FrisbeePlayers.length; i++) {
      const player = FrisbeePlayers[i];
      assert.strictEqual(storedValues.rows[i][0],
        formatLocalTimestamp(player.TS));
      assert.strictEqual(storedValues.rows[i][1],
        player.TSZ.toISOString().slice(0, -1));
      assert.strictEqual(storedValues.rows[i][2],
        player.LTZ.toISOString().slice(0, -1));
    }

    sql = `SELECT * FROM ${TABLE}`;
    const result = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

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
