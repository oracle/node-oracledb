/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   73. poolPing.js
 *
 * DESCRIPTION
 *   Testing connection ping feature of Pool object.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe("73. poolPing.js", function() {

  const defaultInterval = oracledb.poolPingInterval;

  afterEach("reset poolPingInterval to default", function() {
    oracledb.poolPingInterval = defaultInterval;
  });

  it("73.1 the default value of poolPingInterval is 60", async function() {
    const defaultValue = 60;
    assert.strictEqual(oracledb.poolPingInterval, defaultValue);
    const pool = await oracledb.createPool(dbConfig);
    assert.strictEqual(pool.poolPingInterval, defaultValue);
    await pool.close(0);
  }); // 73.1

  it("73.2 does not change after the pool has been created", async function() {
    const userSetInterval = 20;
    oracledb.poolPingInterval = userSetInterval;
    const pool = await oracledb.createPool(dbConfig);
    assert.strictEqual(pool.poolPingInterval, userSetInterval);
    const newInterval = userSetInterval * 2;
    oracledb.poolPingInterval = newInterval;
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.strictEqual(pool.poolPingInterval, userSetInterval);
    await pool.close(0);
  }); // 73.2

  it("73.3 can not be changed on pool object", async function() {
    const userSetInterval = 30;
    oracledb.poolPingInterval = userSetInterval;
    const pool = await oracledb.createPool(dbConfig);
    assert.strictEqual(pool.poolPingInterval, userSetInterval);
    const newInterval = userSetInterval * 2;
    assert.throws(
      () => pool.poolPingInterval = newInterval,
      /TypeError/
    );
    await pool.close(0);
  }); // 73.3

  it("73.4 can not be accessed on connection object", async function() {
    const pool = await oracledb.createPool(dbConfig);
    const conn = await pool.getConnection();
    assert.strictEqual(conn.poolPingInterval, undefined);
    await conn.close();
    await pool.close(0);
  }); // 73.4

  // helper function for below test cases
  const testDefine = async function(userSetInterval) {
    oracledb.poolPingInterval = userSetInterval;
    const pool = await oracledb.createPool(dbConfig);
    assert.strictEqual(pool.poolPingInterval, userSetInterval);
    await pool.close(0);
  }; // testDefine()

  it("73.5 can be set to 0, means always ping", async function() {
    await testDefine(0);
  }); // 73.5

  it("73.6 can be set to negative values, means never ping", async function() {
    await testDefine(-80);
  }); // 73.6

  it("73.7 Negative: Number.MAX_SAFE_INTEGER", function() {
    assert.throws(
      () => oracledb.poolPingInterval = Number.MAX_SAFE_INTEGER,
      /NJS-004:/
    );
  }); // 73.7

  it("73.8 cannot surpass the upper limit", async function() {
    const upperLimit = 2147483647; // 2GB
    await testDefine(upperLimit);
    assert.throws(
      () => oracledb.poolPingInterval = upperLimit + 1,
      /NJS-004:/
    );
  }); // 73.8

  it("73.9 cannot surpass the lower Limit", async function() {
    const lowerLimit = -2147483648;
    await testDefine(lowerLimit);
    assert.throws(
      () => oracledb.poolPingInterval = lowerLimit - 1,
      /NJS-004:/
    );
  }); // 73.9

  it("73.10 Negative: null", function() {
    assert.throws(
      () => oracledb.poolPingInterval = null,
      /NJS-004:/
    );
  }); // 73.10

  it("73.11 Negative: NaN", function() {
    assert.throws(
      () => oracledb.poolPingInterval = NaN,
      /NJS-004:/
    );
  }); // 73.11

  it("73.12 Negative: undefined", function() {
    assert.throws(
      () => oracledb.poolPingInterval = undefined,
      /NJS-004:/
    );
  }); // 73.12

  it("73.13 Negative: 'random-string'", function() {
    assert.throws(
      () => oracledb.poolPingInterval = "random-string",
      /NJS-004:/
    );
  }); // 73.13

  const testPoolDefine = async function(userSetInterval, expectedValue) {
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolPingInterval: userSetInterval
    };
    const pool = await oracledb.createPool(config);
    assert.strictEqual(pool.poolPingInterval, expectedValue);
    await pool.close(0);
  }; // testPoolDefine

  it("73.14 can be set at pool creation, e.g. positive value 1234", async function() {
    const userSetValue = 1234;
    await testPoolDefine(userSetValue, userSetValue);
  });

  it("73.15 can be set at pool creation, e.g. negative value -4321", async function() {
    const userSetValue = -4321;
    await testPoolDefine(userSetValue, userSetValue);
  });

  it("73.16 can be set at pool creation, e.g. 0 means always ping", async function() {
    const userSetValue = 0;
    await testPoolDefine(userSetValue, userSetValue);
  });

  it("73.17 Negative: null", async function() {
    oracledb.poolPingInterval = 789;
    const config = {...dbConfig, poolPingInterval: null};
    await assert.rejects(
      async () => await oracledb.createPool(config),
      /NJS-007:/
    );
  });

  it("73.18 Setting to 'undefined' will use current value from oracledb", async function() {
    oracledb.poolPingInterval = 9876;
    const userSetValue = undefined;
    await testPoolDefine(userSetValue, oracledb.poolPingInterval);
  });

  it("73.19 can be set at pool creation. Negative: NaN", async function() {
    const config = {...dbConfig, poolPingInterval: NaN};
    await assert.rejects(
      async () => await oracledb.createPool(config),
      /NJS-007:/
    );
  }); // 73.19

  it("73.20 can be set at pool creation. Negative: 'random-string'", async function() {
    const config = {...dbConfig, poolPingInterval: "random-string"};
    await assert.rejects(
      async () => await oracledb.createPool(config),
      /NJS-007:/
    );
  }); // 73.20

  it("73.21 cannot surpass the upper limit at pool creation", async function() {
    const upperLimit = 2147483647; // 2GB
    await testPoolDefine(upperLimit, upperLimit);
    const config = {...dbConfig, poolPingInterval: upperLimit + 1};
    await assert.rejects(
      async () => await oracledb.createPool(config),
      /NJS-007:/
    );
  }); // 73.21

  it("73.22 cannot surpass the lower limit at pool creation", async function() {
    const lowerLimit = -2147483648;
    await testPoolDefine(lowerLimit, lowerLimit);
    const config = {...dbConfig, poolPingInterval: lowerLimit - 1};
    await assert.rejects(
      async () => await oracledb.createPool(config),
      /NJS-007:/
    );
  }); // 73.22

});
