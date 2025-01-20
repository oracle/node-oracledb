/* Copyright (c) 2021, 2025, Oracle and/or its affiliates. */

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
 *   214. dbObject15.js
 *
 * DESCRIPTION
 *   Test DB Object collection methods.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('214. dbObject15.js', () => {

  let conn, FrisbeeTeam;

  const PLAYER_T = 'NODB_TYP_PLAYERTYPE';
  const TEAM_T   = 'NODB_TYP_TEAMTYPE';

  const FrisbeePlayers = [
    { SHIRTNUMBER: 10, NAME: 'Emma' },
    { SHIRTNUMBER: 11, NAME: 'Alex' },
    { SHIRTNUMBER: 12, NAME: 'Dave' },
    { SHIRTNUMBER: 13, NAME: 'Jack' },
    { SHIRTNUMBER: 14, NAME: 'Emmet' }
  ];

  describe('214.1 VARRAY DbObject collection type', function() {

    before(async () => {
      conn = await oracledb.getConnection(dbConfig);

      let plsql = `
        CREATE OR REPLACE TYPE ${PLAYER_T} AS OBJECT (
          shirtnumber NUMBER,
          name        VARCHAR2(20)
        );
      `;
      await conn.execute(plsql);

      plsql = `
        CREATE OR REPLACE TYPE ${TEAM_T} AS VARRAY(5) OF ${PLAYER_T};
      `;
      await conn.execute(plsql);

      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
      FrisbeeTeam = new TeamTypeClass(FrisbeePlayers);
    }); // before()

    after(async () => {
      let sql = `DROP TYPE ${TEAM_T} FORCE`;
      await conn.execute(sql);

      sql = `DROP TYPE ${PLAYER_T} FORCE`;
      await conn.execute(sql);

      await conn.close();
      conn = null;
    }); // after()

    it('214.1.1 Getter() - access collection elements directly', function() {
      for (let i = 0, element; i < FrisbeePlayers.length; i++) {
        element = FrisbeeTeam[i];
        assert.strictEqual(element.SHIRTNUMBER, FrisbeePlayers[i].SHIRTNUMBER);
        assert.strictEqual(element.NAME, FrisbeePlayers[i].NAME);
      }
      assert.equal(FrisbeeTeam.length, 5);
    }); // 214.1.1

    it('214.1.2 Setter() - access collection element directly', function() {
      const substitute = {SHIRTNUMBER: 15, NAME: 'Chris'};
      FrisbeeTeam[0] = substitute;
      assert.strictEqual(FrisbeeTeam[0].SHIRTNUMBER, substitute.SHIRTNUMBER);
      assert.strictEqual(FrisbeeTeam[0].NAME, substitute.NAME);

      // Verify that the other elements are not impacted
      for (let i = 1, element; i < FrisbeePlayers.length; i++) {
        element = FrisbeeTeam[i];
        assert.strictEqual(element.SHIRTNUMBER, FrisbeePlayers[i].SHIRTNUMBER);
        assert.strictEqual(element.NAME, FrisbeePlayers[i].NAME);
      }
    }); // 214.1.2

    it('214.1.3 Negative - cannot add more than maximum number of elements', function() {
      assert.throws(
        () => FrisbeeTeam.append({SHIRTNUMBER: 9, NAME: 'Diogo'}),
        /NJS-131:/
      );
    }); // 214.1.3

    it('214.1.4 Negative - cannot delete the VARRAY collection element directly', function() {
      assert.throws(
        () => delete FrisbeeTeam[1],
        /NJS-133:/
      );
    }); // 214.1.4

    it('214.1.5 Negative - collection.deleteElement()', function() {
      assert.throws(
        function() {
          const firstIndex = FrisbeeTeam.getFirstIndex();
          FrisbeeTeam.deleteElement(firstIndex);
        },
        /NJS-133:/
      );
    }); // 214.1.5
  }); // 214.1

  describe('214.2 Copy function with VARRAY DbObject collection type', function() {
    let isRunnable = true;
    before(async function() {
      // Skip the copy tests for varrays for Oracle  Client libraries <= 12.1
      // as the contents are not copied correctly.
      if (testsUtil.getClientVersion() < 1202000000) {
        isRunnable = false;
        this.skip();
      }

      conn = await oracledb.getConnection(dbConfig);

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

      const TeamTypeClass = await conn.getDbObjectClass(TEAM_T);
      FrisbeeTeam = new TeamTypeClass(FrisbeePlayers);
    }); // before()

    after(async () => {
      if (!isRunnable) return;

      let sql = `DROP TYPE ${TEAM_T} FORCE`;
      await conn.execute(sql);

      sql = `DROP TYPE ${PLAYER_T} FORCE`;
      await conn.execute(sql);

      await conn.close();
    }); // after()

    it('214.2.1 Copy collection into another object and check all methods and properties', function() {
      const FrisbeeTeam2 = FrisbeeTeam.copy();
      assert.strictEqual(JSON.stringify(FrisbeeTeam), JSON.stringify(FrisbeeTeam2));

      for (let i = 0; i < FrisbeePlayers.length; i++) {
        assert.strictEqual(FrisbeeTeam2[i].SHIRTNUMBER, FrisbeeTeam[i].SHIRTNUMBER);
        assert.strictEqual(FrisbeeTeam2[i].NAME, FrisbeeTeam[i].NAME);
      }
      assert.strictEqual(FrisbeeTeam.length, FrisbeePlayers.length);
      assert.strictEqual(FrisbeeTeam2.length, FrisbeeTeam.length);

      // Try removing the 1st player from the copied 'FrisbeeTeam' object
      // Will throw NJS-133 error as elements of VARRAY cannot be deleted
      assert.throws(
        function() {
          FrisbeeTeam2.deleteElement(FrisbeeTeam2.getFirstIndex());
        },
        /NJS-133:/
      );
      FrisbeeTeam2.append({SHIRTNUMBER: 9, NAME: 'Diogo'});
      assert.strictEqual(FrisbeeTeam2[FrisbeePlayers.length].SHIRTNUMBER, 9);
      assert.strictEqual(FrisbeeTeam2[FrisbeePlayers.length].NAME, 'Diogo');

      // Ensure that old object length does not change!
      assert.strictEqual(FrisbeeTeam2.length, FrisbeeTeam.length + 1);

    }); // 214.2.1

    it('214.2.2 Update collection and then copy it and check all methods and properties', function() {
      FrisbeeTeam.append({SHIRTNUMBER: 9, NAME: 'Diogo'});
      assert.strictEqual(FrisbeeTeam[FrisbeePlayers.length].SHIRTNUMBER, 9);
      assert.strictEqual(FrisbeeTeam[FrisbeePlayers.length].NAME, 'Diogo');

      // check if the copy method works correctly after append
      const FrisbeeTeam2 = FrisbeeTeam.copy();
      assert.strictEqual(JSON.stringify(FrisbeeTeam), JSON.stringify(FrisbeeTeam2));

      for (let i = 0; i < FrisbeeTeam.length; i++) {
        assert.strictEqual(FrisbeeTeam2[i].SHIRTNUMBER, FrisbeeTeam[i].SHIRTNUMBER);
        assert.strictEqual(FrisbeeTeam2[i].NAME, FrisbeeTeam[i].NAME);
      }
      assert.strictEqual(FrisbeeTeam2.length, FrisbeeTeam.length);
      assert.strictEqual(FrisbeeTeam.length, FrisbeePlayers.length + 1);

      // Try removing the 1st player from the copied 'FrisbeeTeam' object
      // Will throw NJS-133 error as elements of VARRAY cannot be deleted
      assert.throws(
        function() {
          FrisbeeTeam2.deleteElement(FrisbeeTeam2.getFirstIndex());
        },
        /NJS-133:/
      );

    }); // 214.2.2
  }); // 214.2

});
