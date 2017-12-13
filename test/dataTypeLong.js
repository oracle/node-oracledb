/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   103. dataTypeLong.js
 *
 * DESCRIPTION
 *    Test LONG type support.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');
var random   = require('./random.js');

describe('103. dataTypeLong.js', function() {

  var connection = null;
  var tableName = "nodb_long";

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('103.1 LONG data type support', function() {

    // Generate test data
    var strLen = [1000, 4000, 10000, 100000, 1000000];
    var strs = [];
    var specialStr = "103.1";
    for(var i = 0; i < strLen.length; i++)
      strs[i] = random.getRandomString(strLen[i], specialStr);

    before(function(done) {
      assist.setUp(connection, tableName, strs, done);
    });

    after(function(done) {
      connection.execute(
        "drop table " + tableName + " purge",
        function(err) {
          should.not.exist(err);
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
