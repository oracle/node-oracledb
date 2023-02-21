/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

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
 **
 * NAME
 *   66. writableProperties1.js
 *
 * DESCRIPTION
 *   Testing writable properties.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('66. writableProperties1.js', function() {

  it('66.1 allows overwriting of public methods on pool instances', async function() {
    var pool = await oracledb.createPool(dbConfig);
    assert(pool);
    var keys;
    var keysIdx;
    var originalFunction;
    keys = Object.keys(pool);

    for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof pool[keys[keysIdx]] === 'function') {
        originalFunction = pool[keys[keysIdx]];

        pool[keys[keysIdx]] = function() {};

        pool[keys[keysIdx]] = originalFunction;
      }
    }

    await pool.terminate();

  });

  it('66.2 allows overwriting of public methods on connection instances', async function() {

    var conn = await oracledb.getConnection(dbConfig);
    var keys;
    var keysIdx;
    var originalFunction;

    keys = Object.keys(conn);

    for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof conn[keys[keysIdx]] === 'function') {
        originalFunction = conn[keys[keysIdx]];

        conn[keys[keysIdx]] = function() {};

        conn[keys[keysIdx]] = originalFunction;
      }
    }

    await conn.release();

  });

  it('66.3 allows overwriting of public methods on resultset instances', async function() {

    var conn = await oracledb.getConnection(dbConfig);
    var result = await conn.execute(
      'select 1 from dual union select 2 from dual',
      [], // no binds
      {
        resultSet: true
      });

    var keys;
    var keysIdx;
    var originalFunction;

    keys = Object.keys(result.resultSet);

    for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof result.resultSet[keys[keysIdx]] === 'function') {
        originalFunction = result.resultSet[keys[keysIdx]];

        result.resultSet[keys[keysIdx]] = function() {};

        result.resultSet[keys[keysIdx]] = originalFunction;
      }
    }

    await result.resultSet.close();
    await conn.release();
  });

  it('66.4 allows overwriting of public methods on lob instances', async function() {

    var conn = await oracledb.getConnection(dbConfig);
    assert(conn);
    var result = await conn.execute('select to_clob(dummy) from dual');
    var keys;
    var keysIdx;
    var originalFunction;
    var lob;

    lob = result.rows[0][0];

    keys = Object.keys(lob);

    for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof lob[keys[keysIdx]] === 'function') {
        originalFunction = lob[keys[keysIdx]];

        lob[keys[keysIdx]] = function() {};

        lob[keys[keysIdx]] = originalFunction;
      }
    }

    lob.on("finish", function(err) {
      assert.fail(err);
    });

    lob.on("error", function(err) {
      assert.fail(err, "lob.on 'error' event.");
    });

    lob.destroy();


  }); // 66.4

  it('66.5 allows overwriting of public methods on oracledb instances', function(done) {
    var keys = Object.keys(oracledb);
    for (var keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
      if (typeof oracledb[keys[keysIdx]] === 'function') {
        var originalFunction = oracledb[keys[keysIdx]];
        oracledb[keys[keysIdx]] = function() {};
        oracledb[keys[keysIdx]] = originalFunction;
      }
    }
    done();
  }); // 66.5

});
