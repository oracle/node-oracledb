/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   148. fetchArraySize1.js
 *
 * DESCRIPTION
 *   Check the value settings of "fetchArraySize" property.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe("148. fetchArraySize1.js", function() {

  let connection = null;
  const defaultVal = oracledb.fetchArraySize;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    assert.strictEqual(defaultVal, 100);
  });

  after(async function() {
    await connection.close();
  });

  describe("148.1 oracledb.fetchArraySize", function() {

    afterEach(function() {
      oracledb.fetchArraySize = defaultVal;
    });

    it("148.1.1 oracledb.fetchArraySize = 0", function() {
      checkError(0);
    });

    it("148.1.2 oracledb.fetchArraySize = 1", async function() {
      await checkGlobalOptionValue(1, 1);
    });

    it("148.1.3 Negative: oracledb.fetchArraySize = undefined", function() {
      checkError(undefined);
    });

    it("148.1.4 Negative: oracledb.fetchArraySize = null", function() {
      checkError(null);
    });

    it("148.1.5 Negative: oracledb.fetchArraySize = random string", function() {
      checkError("random string");
    });

    it("148.1.6 Negative: oracledb.fetchArraySize = Boolean", function() {
      checkError(true);
    });

    it("148.1.7 Negative: oracledb.fetchArraySize = NaN", function() {
      checkError(NaN);
    });

    it("148.1.8 oracledb.fetchArraySize = big number", async function() {
      await checkGlobalOptionValue(1000000, 1000000);
    });

  });

  describe("148.2 execute() option fetchArraySize", function() {

    it("148.2.1 fetchArraySize = 0", async function() {
      await queryExpectsError(0);
    });

    it("148.2.2 fetchArraySize = 1", async function() {
      await checkExecOptionValue(1);
    });

    it("148.2.3 fetchArraySize = undefined works as default value 100", async function() {
      await checkExecOptionValue(undefined);
    });

    it("148.2.4 Negative: fetchArraySize = null", async function() {
      await queryExpectsError(null);
    });

    it("148.2.5 Negative: fetchArraySize = random string", async function() {
      await queryExpectsError("random string");
    });

    it("148.2.6 Negative: fetchArraySize = Boolean", async function() {
      await queryExpectsError(false);
    });

    it("148.2.7 Negative: fetchArraySize = NaN", async function() {
      await queryExpectsError(NaN);
    });

    it("148.2.8 fetchArraySize = big number", async function() {
      await checkExecOptionValue(1000000);
    });

  });

  const checkGlobalOptionValue = async function(values, expectedFetchArraySize) {
    assert.doesNotThrow(
      function() {
        oracledb.fetchArraySize = values;
      }
    );

    const result = await connection.execute(
      "select 'oracledb.fetchArraySize' from dual"
    );
    assert.strictEqual(result.rows[0][0], "oracledb.fetchArraySize");
    assert.strictEqual(oracledb.fetchArraySize, expectedFetchArraySize);
  };

  const checkError = function(values) {
    assert.throws(
      function() {
        oracledb.fetchArraySize = values;
      },
      /NJS-004:/
    );
  };

  const checkExecOptionValue = async function(values) {
    const result = await connection.execute(
      "select 'fetchArraySize' from dual",
      [],
      { fetchArraySize: values }
    );
    assert.strictEqual(oracledb.fetchArraySize, 100);
    assert.strictEqual(result.rows[0][0], "fetchArraySize");
  };

  const queryExpectsError = async function(values) {
    const sql = "select 'fetchArraySize' from dual";
    const options = { fetchArraySize: values };
    await assert.rejects(
      async () => await connection.execute(sql, [], options),
      /NJS-007:/
    );
  };

});
