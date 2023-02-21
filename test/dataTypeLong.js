/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   103. dataTypeLong.js
 *
 * DESCRIPTION
 *    Test LONG type support.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');
const random   = require('./random.js');

describe('103. dataTypeLong.js', function() {

  var connection = null;
  var tableName = "nodb_long";

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      assert.ifError(err);
      connection = conn;
      done();
    });
  });

  after('release connection', function(done) {
    connection.release(function(err) {
      assert.ifError(err);
      done();
    });
  });

  describe('103.1 LONG data type support', function() {

    // Generate test data
    var strLen = [1000, 4000, 10000, 100000, 1000000];
    var strs = [];
    var specialStr = "103.1";
    for (var i = 0; i < strLen.length; i++)
      strs[i] = random.getRandomString(strLen[i], specialStr);

    before(function(done) {
      assist.setUp(connection, tableName, strs, done);
    });

    after(function(done) {
      connection.execute(
        "drop table " + tableName + " purge",
        function(err) {
          assert.ifError(err);
          done();
        }
      );
    });

    it('103.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, strs, done);
    });

    it('103.1.2 works well with result set', function(done) {
      assist.verifyResultSet(connection, tableName, strs, done);
    });

    it('103.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, strs, done);
    });

  }); // 103.1

  describe('103.2 stores null values correctly', function() {
    it('103.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });
});
