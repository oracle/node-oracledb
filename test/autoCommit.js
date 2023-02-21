/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   7. autoCommit.js
 *
 * DESCRIPTION
 *   Testing general autoCommit feature.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('7. autoCommit.js', function() {

  let pool = null;
  let connection  = null;

  before('create pool, get one connection, create table', async function() {
    let script =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_commit_dept purge'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_commit_dept ( \
                    department_id NUMBER,  \
                    department_name VARCHAR2(20) \
                ) \
            '); \
        END; ";

    pool = await oracledb.createPool(
      {
        user          : dbConfig.user,
        password      : dbConfig.password,
        connectString : dbConfig.connectString,
        poolMin       : 3,
        poolMax       : 7,
        poolIncrement : 1
      });

    connection = await pool.getConnection();
    await connection.execute(script);
  });

  after('drop table, release connection, terminate pool', async function() {
    await connection.execute("DROP TABLE nodb_commit_dept purge");
    await connection.release();
    await pool.terminate();
  });

  afterEach('truncate table, reset the oracledb properties', async function() {
    oracledb.autoCommit = false;  /* Restore to default value */
    await connection.execute("TRUNCATE TABLE nodb_commit_dept");
  });

  it('7.1 autoCommit takes effect when setting oracledb.autoCommit before connecting', async function() {
    let conn1 = null;
    let conn2 = null;
    let result = null;

    oracledb.autoCommit = true;
    conn1 = await pool.getConnection();
    await conn1.execute("INSERT INTO nodb_commit_dept VALUES (82, 'Security')");

    // get another connection
    conn2 = await pool.getConnection();

    try {
      result = await conn2.execute(
        "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err) {
      assert.ifError(err);
      assert.strictEqual(result.rows[0].DEPARTMENT_ID, 82);
      assert.strictEqual(typeof (result.rows[0].DEPARTMENT_ID), "number");
    }

    await conn1.execute(
      "UPDATE nodb_commit_dept SET department_id = 101 WHERE department_name = 'Security'");

    try {
      result = await conn2.execute(
        "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err) {
      assert.ifError(err);
      assert.strictEqual(result.rows[0].DEPARTMENT_ID, 101);
      assert.strictEqual(typeof (result.rows[0].DEPARTMENT_ID), "number");
    }

    await conn1.release();
    await conn2.release();

  });

  it('7.2 autoCommit takes effect when setting oracledb.autoCommit after connecting', async function() {
    let conn1 = null;
    let conn2 = null;
    let result = null;

    conn1 = await pool.getConnection();

    oracledb.autoCommit = true;   // change autoCommit after connection
    await conn1.execute("INSERT INTO nodb_commit_dept VALUES (82, 'Security')");

    conn2 = await pool.getConnection();

    try {
      result = await conn2.execute(
        "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err) {
      assert.ifError(err);
      assert.strictEqual(result.rows[0].DEPARTMENT_ID, 82);
      assert.strictEqual(typeof (result.rows[0].DEPARTMENT_ID), "number");
    }

    await conn1.execute("UPDATE nodb_commit_dept SET department_id = 101 WHERE department_name = 'Security'");


    try {
      result = await conn2.execute(
        "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err) {
      assert.ifError(err);
      assert.strictEqual(result.rows[0].DEPARTMENT_ID, 101);
      assert.strictEqual(typeof (result.rows[0].DEPARTMENT_ID), "number");
    }

    await conn1.release();
    await conn2.release();

  });

  it('7.3 autoCommit setting does not affect previous SQL result', async function() {
    let conn1 = null;
    let conn2 = null;
    let result = null;

    conn1 = await pool.getConnection();

    await conn1.execute("INSERT INTO nodb_commit_dept VALUES (82, 'Security')");

    conn2 = await pool.getConnection();

    try {
      oracledb.autoCommit = true;   // change autoCommit after connection
      result = await conn2.execute(
        "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err) {
      assert.ifError(err);
      assert.strictEqual(result.rows, []);
    }

    await conn2.execute(
      "INSERT INTO nodb_commit_dept VALUES (99, 'Marketing')");

    try {
      result = await conn2.execute(
        "SELECT COUNT(*) as amount FROM nodb_commit_dept",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err) {
      assert.ifError(err);
      assert.strictEqual(result.rows[0].AMOUNT, 1);
    }

    try {
      result = await conn1.execute(
        "SELECT COUNT(*) as amount FROM nodb_commit_dept",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT });
    } catch (err) {
      assert.ifError(err);
      assert.strictEqual(result.rows[0].AMOUNT, 2);   // autoCommit for SELECT
    }

    await conn1.release();
    await conn2.release();
  });

  describe('7.4 global option - oracledb.autoCommit', function() {
    let defaultValue;
    beforeEach(function() {
      defaultValue = oracledb.autoCommit;
    });
    afterEach(function() {
      oracledb.autoCommit = defaultValue;
    });

    it('7.4.1 Negative - 0', async function() {
      await setAsGlobalOption(0);
    });

    it('7.4.2 Negative - negative number', async function() {
      await setAsGlobalOption(-1);
    });

    it('7.4.3 Negative - positive number', async function() {
      await setAsGlobalOption(-1);
    });

    it('7.4.4 Negative - NaN', async function() {
      await setAsGlobalOption(NaN);
    });

    it('7.4.5 Negative - undefined', async function() {
      await setAsGlobalOption(undefined);
    });

    let setAsGlobalOption = function(setValue) {
      assert.throws(
        function() {
          oracledb.autoCommit = setValue;
        },
        /NJS-004:*/
      );
    };
  });

  describe('7.5 set autoCommit as an execute() option', function() {

    it('7.5.1 Negative - 0', function() {
      setAsExecOption(0);
    });

    it('7.5.2 Negative - negative number', function() {
      setAsExecOption(-1);
    });

    it('7.5.3 Negative - positive number', function() {
      setAsExecOption(-1);
    });

    it('7.5.4 Negative - NaN', function() {
      setAsExecOption(NaN);
    });

    it("7.5.5 works as 'false' when setting to 'undefined'", function() {
      let result = null;

      result = connection.execute(
        "select user from dual",
        [],
        { autoCommit: undefined });

      assert(result);
    });

    let setAsExecOption = async function(setValue) {
      let result = null;
      try {
        result = await connection.execute(
          "select user from dual",
          {},
          { autoCommit: setValue });
      } catch (err) {
        assert.ifError(result);
        assert(err);
        assert.strictEqual(err.message, "NJS-007: invalid value for \"autoCommit\" in parameter 3");
      }
    };
  });

});
