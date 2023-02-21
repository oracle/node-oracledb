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
 *   8. autoCommitForSelect.js
 *
 * DESCRIPTION
 *   Testing autoCommit feature for SELECTs feature.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('8. autoCommitForSelect.js', function() {

  let connection = null;
  let anotherConnection = null;

  let script =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_commit4_dept PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_commit4_dept ( \
                  department_id NUMBER,  \
                  department_name VARCHAR2(20) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_commit4_dept  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_commit4_dept  \
                   (department_id, department_name) VALUES \
                   (20, ''Marketing'') \
          '); \
      END; ";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    anotherConnection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
    await anotherConnection.release();
  });

  beforeEach(async function() {
    await connection.execute(script);

    // DML 'insert' statement does not commit automatically.
    // So the explicit commit is added.
    await connection.commit();
  });

  afterEach(async function() {
    await connection.execute('DROP TABLE nodb_commit4_dept purge');
  });

  it('8.1 should return previous value when autoCommit is false', async function() {
    assert.ok(connection);
    oracledb.autoCommit = false;
    let result = null;

    await connection.execute(
      "INSERT INTO nodb_commit4_dept VALUES (180, 'Construction')");

    await connection.execute(
      "UPDATE nodb_commit4_dept SET department_id = 99 WHERE department_name = 'Marketing'");

    result = await connection.execute(
      "SELECT * FROM nodb_commit4_dept ORDER BY department_id");
    assert((result.rows[2]).includes(180, 'Construction'));

    result = await anotherConnection.execute(
      "SELECT * FROM nodb_commit4_dept ORDER BY department_id");
    assert.strictEqual((result.rows).includes(180, 'Construction'), false);

    result = await connection.execute(
      "SELECT department_id FROM nodb_commit4_dept WHERE department_name = 'Marketing'");
    assert.strictEqual(result.rows[0][0], 99);

    result = await anotherConnection.execute(
      "SELECT department_id FROM nodb_commit4_dept WHERE department_name = 'Marketing'");
    assert.strictEqual(result.rows[0][0], 20);
  });

  it('8.2 can use explicit commit() to keep data consistent', async function() {
    assert.ok(connection);
    oracledb.autoCommit = false;
    let result = null;
    await connection.execute(
      "INSERT INTO nodb_commit4_dept VALUES (180, 'Construction')");

    await connection.execute(
      "UPDATE nodb_commit4_dept SET department_id = 99 WHERE department_name = 'Marketing'");

    await connection.commit();

    result = await connection.execute(
      "SELECT * FROM nodb_commit4_dept ORDER BY department_id");
    assert((result.rows[2]).includes(180, 'Construction'));

    result = await anotherConnection.execute(
      "SELECT * FROM nodb_commit4_dept ORDER BY department_id");
    assert((result.rows[2]).includes(180, 'Construction'));

    result = await connection.execute(
      "SELECT department_id FROM nodb_commit4_dept WHERE department_name = 'Marketing'");
    assert.strictEqual(result.rows[0][0], 99);

    result = await anotherConnection.execute(
      "SELECT department_id FROM nodb_commit4_dept WHERE department_name = 'Marketing'");
    assert.strictEqual(result.rows[0][0], 99);
  });

  it('8.3 can also use the autoCommit for SELECTs feature', async function() {
    assert.ok(connection);
    oracledb.autoCommit = false;
    let result = null;

    await connection.execute(
      "INSERT INTO nodb_commit4_dept VALUES (180, 'Construction')");

    await connection.execute(
      "UPDATE nodb_commit4_dept SET department_id = 99 WHERE department_name = 'Marketing'");

    await connection.commit();

    result = await connection.execute(
      "SELECT * FROM nodb_commit4_dept ORDER BY department_id",
      {},
      {autoCommit: true});
    assert((result.rows[2]).includes(180, 'Construction'));

    result = await anotherConnection.execute(
      "SELECT * FROM nodb_commit4_dept ORDER BY department_id");
    assert((result.rows[2]).includes(180, 'Construction'));

    result = await connection.execute(
      "SELECT department_id FROM nodb_commit4_dept WHERE department_name = 'Marketing'");
    assert.strictEqual(result.rows[0][0], 99);

    result = await anotherConnection.execute(
      "SELECT department_id FROM nodb_commit4_dept WHERE department_name = 'Marketing'");
    assert.strictEqual(result.rows[0][0], 99);
  });
});
