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
 *   31. dataTypeBinaryDouble.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BINARY_DOUBLE.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('31. dataTypeBinaryDouble.js', function() {

  var connection = null;
  var tableName = "nodb_double";

  before('get one connection', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        assert.ifError(err);
        connection = conn;
        done();
      }
    );
  });

  after('release connection', function(done) {
    connection.release(function(err) {
      assert.ifError(err);
      done();
    });
  });

  describe('31.1 testing BINARY_DOUBLE data', function() {

    var numbers = assist.data.numbersForBinaryFloat.concat(assist.data.numbersForBinaryDouble);

    before('create table, insert data', function(done) {
      assist.setUp(connection, tableName, numbers, done);
    });

    after(function(done) {
      oracledb.fetchAsString = [];
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          assert.ifError(err);
          done();
        }
      );
    });

    it('31.1.1 works well with SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, numbers, done);
    });

    it('31.1.2 works well with result set', function(done) {
      assist.verifyResultSet(connection, tableName, numbers, done);
    });

    it('31.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, numbers, done);
    });

    it('31.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      assist.verifyRefCursorWithFetchInfo(connection, tableName, numbers, done);
    });

    it('31.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.NUMBER ];
      assist.verifyRefCursorWithFetchAsString(connection, tableName, numbers, done);
    });

  });

  describe('31.2 stores null value correctly', function() {
    it('31.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

  describe('31.3 testing floating-point numbers which can be precisely represent', function() {
    var nums =
      [
        0.0000000000000000000123,
        98.7654321
      ];

    before('create table, insert data', function(done) {
      assist.setUp(connection, tableName, nums, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          assert.ifError(err);
          done();
        }
      );
    });

    it('31.3.1 testing floating-point numbers', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
        function(err, result) {
          assert.ifError(err);

          for (var i = 0; i < nums.length; i++) {
            result.rows[i].CONTENT.should.be.exactly(nums[result.rows[i].NUM]);
          }
          done();
        }
      );
    });

  }); // 31.3


});
