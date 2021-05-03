/* Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   256. executeQueue.js
 *   Tests for oracledb.errorOnConcurrentExecute
 *
 *****************************************************************************/

'use strict';

const assert    = require('assert');
const oracledb  = require('oracledb');
const dbconfig  = require('./dbconfig.js');

describe("256. executeQueue.js", function() {
  let connection;
  let errorOnConcurrentExecuteBak = oracledb.errorOnConcurrentExecute;

  before(async function() {
    connection = await oracledb.getConnection(dbconfig);
  }); //before()

  after(async function() {
    if (connection) {
      await connection.close();
    }
  }); //after()

  afterEach(function() {
    oracledb.errorOnConcurrentExecute = errorOnConcurrentExecuteBak;
  }); //afterEach()

  describe("256.1 oracledb.errorOnConcurrentExecute", function() {

    // causes a break to be issued; this must be done *after* an execute has
    // already taken place; otherwise, the break() is ignored; a sleep of 200
    // ms should be sufficient for the prepare phase of the execution to be
    // completed (probably less than 1 ms in most instances but better to err
    // on the side of caution)
    async function doBreak(connection) {
      await new Promise(resolve => {
        setTimeout(resolve, 200);
      });
      await connection.break();
    }

    async function doSleep(connection) {
      const sql = `begin dbms_session.sleep(5); end;`;
      await connection.execute(sql);
    }

    async function query(connection) {
      const result = await connection.execute(`select * from dual`);
      return (result.rows[0][0]);
    }

    it('256.1.1 property set to false', async function() {
      oracledb.errorOnConcurrentExecute = false;
      const promises = [];
      const loopCount = 2;
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = query(connection);
      }
      let values = await Promise.allSettled(promises);
      for (let i = 0; i < loopCount; i++) {
        assert.strictEqual(values[i].status, 'fulfilled');
        assert.strictEqual(values[i].value, 'X');
      }
    }); // 256.1.1

    it('256.1.2 property set to true', async function() {
      oracledb.errorOnConcurrentExecute = true;
      const promises = [];
      const loopCount = 2;
      for (let i = 0 ; i < loopCount; i++) {
        promises[i] = query(connection);
      }
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[1].status, 'rejected');
      assert.match(values[1].reason.message, /NJS-081:/);
    }); // 256.1.2

    it('256.1.3 break() not constrained by queue', async function() {

      // This test uses dbms_session.sleep which needs 18c
      if (connection.oracleServerVersion < 1800000000) {
        this.skip();
        return;
      }

      oracledb.errorOnConcurrentExecute = true;
      const promises = [doSleep(connection), doBreak(connection)];
      const values = await Promise.allSettled(promises);
      assert.strictEqual(values[0].status, 'rejected');
      assert.match(values[0].reason.message, /ORA-01013:/);
    }); // 256.1.2

  }); // 256.1

}); // 256
