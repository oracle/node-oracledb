/* Copyright (c) 2021, 2022, Oracle and/or its affiliates. */

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
 *   242. dbObject18.js
 *
 * DESCRIPTION
 *   Test fetching database objects as POJOs (Plain Old JavaScript Objects).
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('242. dbObject18.js', () => {

  describe('242.1 set oracledb.dbObjectAsPojo', () => {

    before(function() {
      // Default value of oracledb.dbObjectAsPojo should be false
      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // before()

    after(function() {
      // Restore to default value
      oracledb.dbObjectAsPojo = false;
      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // after()

    it('242.1.1 oracledb.dbObjectAsPojo could be set without connection', function() {
      try {
        oracledb.dbObjectAsPojo = true;
        assert.strictEqual(oracledb.dbObjectAsPojo, true);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.1

    it('242.1.2 oracledb.dbObjectAsPojo could be set without connection', function() {
      try {
        oracledb.dbObjectAsPojo = false;
        assert.strictEqual(oracledb.dbObjectAsPojo, false);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.2

    it('242.1.3 set oracledb.dbObjectAsPojo to value of oracledb.autoCommit', function() {
      try {
        oracledb.dbObjectAsPojo = oracledb.autoCommit;
        assert.strictEqual(oracledb.dbObjectAsPojo, oracledb.autoCommit);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.3

    it('242.1.4 set oracledb.dbObjectAsPojo to value of Boolean("false")', function() {
      const value = Boolean("false");
      console.dir(value);
      try {
        oracledb.dbObjectAsPojo = value;
        assert.strictEqual(oracledb.dbObjectAsPojo, true);
      } catch (err) {
        assert.fail(err);
        // console.log(oracledb.dbObjectAsPojo);
      }
    }); // 242.1.4

    it('242.1.5 set oracledb.dbObjectAsPojo to value of JSON.parse(\'true\')', function() {
      try {
        oracledb.dbObjectAsPojo = JSON.parse('true');
        assert.strictEqual(oracledb.dbObjectAsPojo, true);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.5

    it('242.1.6 set oracledb.dbObjectAsPojo to value of JSON.parse(\'false\')', function() {
      try {
        oracledb.dbObjectAsPojo = JSON.parse('false');
        assert.strictEqual(oracledb.dbObjectAsPojo, false);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.6

    it('242.1.7 set oracledb.dbObjectAsPojo to value of Boolean(true)', function() {
      try {
        oracledb.dbObjectAsPojo = Boolean(true);
        assert.strictEqual(oracledb.dbObjectAsPojo, true);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.7

    it('242.1.8 set oracledb.dbObjectAsPojo to value of Boolean(\'false\')', function() {
      try {
        oracledb.dbObjectAsPojo = Boolean('false');
        assert.strictEqual(oracledb.dbObjectAsPojo, true);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.8

    it('242.1.9 set oracledb.dbObjectAsPojo to value of Boolean(false)', function() {
      try {
        oracledb.dbObjectAsPojo = Boolean(false);
        assert.strictEqual(oracledb.dbObjectAsPojo, false);
      } catch (err) {
        assert.fail(err);
      }
    }); // 242.1.9

    it('242.1.10 negative: set oracledb.dbObjectAsPojo to invalid value: null', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = null;
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.10

    it('242.1.11 negative: set oracledb.dbObjectAsPojo to invalid value: 0', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = 0;
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.11

    it('242.1.12 negative: set oracledb.dbObjectAsPojo to invalid value: number', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = -1234567890.0123;
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.12

    it('242.1.3 negative: set oracledb.dbObjectAsPojo to invalid value: string true', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = 'true';
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.13

    it('242.1.14 negative: set oracledb.dbObjectAsPojo to invalid value: string false', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = 'false';
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.14

    it('242.1.15 negative: set oracledb.dbObjectAsPojo to invalid value: undefined', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = undefined;
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.15

    it('242.1.16 negative: set oracledb.dbObjectAsPojo to invalid value: NaN', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = NaN;
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.16

    it('242.1.17 negative: set oracledb.dbObjectAsPojo to invalid value: empty string', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = '';
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.17

    it('242.1.18 negative: set oracledb.dbObjectAsPojo to invalid value: empty json', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = {};
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.18

    it('242.1.19 negative: set oracledb.dbObjectAsPojo to invalid value: oracledb.DATE type', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = oracledb.DATE;
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.19

    it('242.1.20 negative: set oracledb.dbObjectAsPojo to invalid value: array', async () => {
      await assert.rejects(
        async () => { //eslint-disable-line
          oracledb.dbObjectAsPojo = [ true ];
        },
        /NJS-004/
      );
      // NJS-004: invalid value for property dbObjectAsPojo

      assert.strictEqual(oracledb.dbObjectAsPojo, false);
    }); // 242.1.20

  });

  describe('242.2 set dbObjectAsPojo in bind option', () => {
    let conn;

    const TABLE = 'NODB_TAB_SPORTS_18';
    const PLAYER_T = 'NODB_TYP_PLAYER_18';
    const TEAM_T = 'NODB_TYP_TEAM_18';

    before(async () => {
      // Default value of oracledb.dbObjectAsPojo should be false
      assert.strictEqual(oracledb.dbObjectAsPojo, false);

      conn = await oracledb.getConnection(dbconfig);

      let sql = `
        CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
          shirtnumber NUMBER,
          name        VARCHAR2(20)
        );
      `;
      await conn.execute(sql);

      sql = `
        CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T};
      `;
      await conn.execute(sql);

      sql = `
        CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
      `;
      sql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(sql);

    }); // before()

    after(async () => {

      let sql = testsUtil.sqlDropTable(TABLE);
      await conn.execute(sql);

      sql = testsUtil.sqlDropType(TEAM_T);
      await conn.execute(sql);

      sql = testsUtil.sqlDropType(PLAYER_T);
      await conn.execute(sql);

      await conn.close();

    }); // after()

    it('242.2.1 dbObjectAsPojo returns database objects as plain old JavaScript objects', async () => {
      // insert some data
      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
      const players = [
        {
          SHIRTNUMBER: 11,
          NAME: 'Elizabeth'
        },
        {
          SHIRTNUMBER: 22,
          NAME: 'Frank'
        }
      ];
      const team = new TeamTypeClass(players);
      let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
      const binds = { sn: "Frisbee", t: team };
      await conn.execute(sql, binds);

      // fetch data and verify it is returned correctly
      sql = `SELECT * FROM ${TABLE}`;
      const opts = { dbObjectAsPojo: true, outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sql, [], opts);
      const row = result.rows[0];
      assert.strictEqual(row.SPORTNAME, 'Frisbee');
      assert.deepEqual(row.TEAM, players);
      // console.dir(row.TEAM, { depth: null }); -- Output should be: [
      //                                                                  { SHIRTNUMBER: 11, NAME: 'Elizabeth' },
      //                                                                  { SHIRTNUMBER: 22, NAME: 'Frank' }
      //                                                                ]


    }); // 242.2.1

  });

  describe('242.3 set dbObjectAsPojo in both oracledb.dbObjectAsPojo and bind option', () => {
    let conn;

    const TABLE = 'NODB_TAB_SPORTS_18';
    const PLAYER_T = 'NODB_TYP_PLAYER_18';
    const TEAM_T = 'NODB_TYP_TEAM_18';

    before(async () => {
      // default value should be false
      assert.strictEqual(oracledb.dbObjectAsPojo, false);
      // set oracledb.dbObjectAsPojo
      oracledb.dbObjectAsPojo = true;

      conn = await oracledb.getConnection(dbconfig);

      let sql = `
        CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
          shirtnumber NUMBER,
          name        VARCHAR2(20)
        );
      `;
      await conn.execute(sql);

      sql = `
        CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T};
      `;
      await conn.execute(sql);

      sql = `
        CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
      `;
      sql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(sql);

    }); // before()

    after(async () => {

      let sql = testsUtil.sqlDropTable(TABLE);
      await conn.execute(sql);

      sql = testsUtil.sqlDropType(TEAM_T);
      await conn.execute(sql);

      sql = testsUtil.sqlDropType(PLAYER_T);
      await conn.execute(sql);

      await conn.close();

      oracledb.dbObjectAsPojo = false;

    }); // after()

    it('242.3.1 set oracledb.dbObjectAsPojo = true and dbObjectAsPojo:false in bind option', async () => {
      // insert some data
      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
      const players = [
        {
          SHIRTNUMBER: 11,
          NAME: 'Elizabeth'
        },
        {
          SHIRTNUMBER: 22,
          NAME: 'Frank'
        }
      ];
      const team = new TeamTypeClass(players);
      let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
      const binds = { sn: "Frisbee", t: team };
      await conn.execute(sql, binds);

      // fetch data and verify it is returned correctly
      sql = `SELECT * FROM ${TABLE}`;
      const opts = { dbObjectAsPojo: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sql, [], opts);
      const row = result.rows[0];
      assert.strictEqual(row.SPORTNAME, 'Frisbee');
      assert.strictEqual(row.TEAM[0]['SHIRTNUMBER'], 11);
      assert.strictEqual(row.TEAM[0]['NAME'], 'Elizabeth');
      assert.strictEqual(row.TEAM[1]['SHIRTNUMBER'], 22);
      assert.strictEqual(row.TEAM[1]['NAME'], 'Frank');
      // console.dir(row.TEAM, { depth: null }); -- Output should be: DbObject [SYSTEM.NODB_TYP_TEAM_18] {}

    }); // 242.3.1

    it('242.3.2 connection must remain open when accessing a DbObject', async () => {
      // insert some data
      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
      const players = [
        {
          SHIRTNUMBER: 11,
          NAME: 'Elizabeth'
        },
        {
          SHIRTNUMBER: 22,
          NAME: 'Frank'
        }
      ];
      const team = new TeamTypeClass(players);
      let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
      const binds = { sn: "Frisbee", t: team };
      await conn.execute(sql, binds);

      // fetch data and verify it is returned correctly
      sql = `SELECT * FROM ${TABLE}`;
      const opts = { dbObjectAsPojo: false, outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sql, [], opts);

      // close the connection
      await conn.close();

      const row = result.rows[0];
      assert.strictEqual(row.SPORTNAME, 'Frisbee');

      await assert.rejects(
        async () => {  //eslint-disable-line
          const x = row.TEAM[0];  //eslint-disable-line
        },
        /DPI-1010/
      );
      // DPI-1010: not connected

      // restore the connection
      conn = await oracledb.getConnection(dbconfig);

    }); // 242.3.2

  });

  describe('242.4 set dbObjectAsPojo using oracledb.dbObjectAsPojo', () => {
    let conn;

    const TABLE = 'NODB_TAB_SPORTS_18';
    const PLAYER_T = 'NODB_TYP_PLAYER_18';
    const TEAM_T = 'NODB_TYP_TEAM_18';

    before(async () => {
      // default value should be false
      assert.strictEqual(oracledb.dbObjectAsPojo, false);
      // set oracledb.dbObjectAsPojo
      oracledb.dbObjectAsPojo = true;

      conn = await oracledb.getConnection(dbconfig);

      let sql = `
        CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
          shirtnumber NUMBER,
          name        VARCHAR2(20)
        );
      `;
      await conn.execute(sql);

      sql = `
        CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(10) OF ${PLAYER_T};
      `;
      await conn.execute(sql);

      sql = `
        CREATE TABLE ${TABLE} (sportname VARCHAR2(20), team ${TEAM_T})
      `;
      sql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(sql);

    }); // before()

    after(async () => {

      let sql = testsUtil.sqlDropTable(TABLE);
      await conn.execute(sql);

      sql = testsUtil.sqlDropType(TEAM_T);
      await conn.execute(sql);

      sql = testsUtil.sqlDropType(PLAYER_T);
      await conn.execute(sql);

      await conn.close();

      oracledb.dbObjectAsPojo = false;

    }); // after()

    it('242.4.1 dbObjectAsPojo returns database objects as plain old JavaScript objects', async () => {
      // insert some data
      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
      const players = [
        {
          SHIRTNUMBER: 11,
          NAME: 'Elizabeth'
        },
        {
          SHIRTNUMBER: 22,
          NAME: 'Frank'
        }
      ];
      const team = new TeamTypeClass(players);
      let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
      const binds = { sn: "Frisbee", t: team };
      await conn.execute(sql, binds);

      // fetch data and verify it is returned correctly
      sql = `SELECT * FROM ${TABLE}`;
      const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sql, [], opts);
      const row = result.rows[0];
      assert.strictEqual(row.SPORTNAME, 'Frisbee');
      assert.deepEqual(row.TEAM, players);
      // console.dir(row.TEAM, { depth: null });

    }); // 242.4.1

    it('242.4.2 connection can be closed when accessing the plain old JavaScript objects', async () => {
      // insert some data
      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
      const players = [
        {
          SHIRTNUMBER: 11,
          NAME: 'Elizabeth'
        },
        {
          SHIRTNUMBER: 22,
          NAME: 'Frank'
        }
      ];
      const team = new TeamTypeClass(players);
      let sql = `INSERT INTO ${TABLE} VALUES (:sn, :t)`;
      const binds = { sn: "Frisbee", t: team };
      await conn.execute(sql, binds);

      // fetch data and verify it is returned correctly
      sql = `SELECT * FROM ${TABLE}`;
      const opts = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sql, [], opts);

      // close the connection
      await conn.close();

      // accessing results
      const row = result.rows[0];
      assert.strictEqual(row.SPORTNAME, 'Frisbee');
      assert.deepEqual(row.TEAM, players);
      // console.dir(row.TEAM, { depth: null });

      // restore the connection
      conn = await oracledb.getConnection(dbconfig);

    }); // 242.4.2

  });

});
