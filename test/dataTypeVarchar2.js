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
 *   24. dataTypeVarchar2.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - VARCHAR2.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('24. dataTypeVarchar2.js', function() {

  var connection = null;
  var tableName = "nodb_varchar2";

  var strLen = [10, 100, 1000, 2000, 3000, 4000]; // char string length
  var strs = [];
  for (var i = 0; i < strLen.length; i++)
    strs[i] = assist.createCharString(strLen[i]);

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
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('24.1 testing VARCHAR2 data in various lengths', function() {

    before('create table, insert data', function(done) {
      assist.setUp(connection, tableName, strs, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('24.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, strs, done);
    });

    it('24.1.2 resultSet stores VARCHAR2 data correctly', function(done) {
      assist.verifyResultSet(connection, tableName, strs, done);
    });

    it('24.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, strs, done);
    });

    it('24.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      assist.verifyRefCursorWithFetchInfo(connection, tableName, strs, done);
    });
  });

  describe('24.2 stores null value correctly', function() {
    it('24.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

});
