/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   26. dataTypeNumber.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NUMBER.
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
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('26. dataTypeNumber.js', function() {

  var connection = null;
  var tableName = "nodb_number";
  var numbers = assist.data.numbers;

  before('get one connection', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
      }
    );
  });

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('26.1 testing NUMBER data', function() {

    before('create table, insert data',function(done) {
      assist.setUp(connection, tableName, numbers, done);
    });

    after(function(done) {
      oracledb.fetchAsString = [];
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('26.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, numbers, done);
    });

    it('26.1.2 resultSet stores NUMBER data correctly', function(done) {
      assist.verifyResultSet(connection, tableName, numbers, done);
    });

    it('26.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, numbers, done);
    });

    it('26.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      assist.verifyRefCursorWithFetchInfo(connection, tableName, numbers, done);
    });

    it('26.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.NUMBER ];
      assist.verifyRefCursorWithFetchAsString(connection, tableName, numbers, done);
    });

  });

  describe('26.2 stores null value correctly', function() {
    it('26.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

});
