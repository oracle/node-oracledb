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
 *   38. dataTypeTimestamp6.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - TIMESTAMP (9) WITH LOCAL TIME ZONE.
 *
 * NOTE
 *   TIMESTAMP support is still under enhancement request. This test is suspended.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('38. dataTypeTimestamp6.js', function() {

  var connection = null;
  var tableName = "nodb_timestamp6";

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig,
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

  describe('38.1 Testing JavaScript Date with database TIMESTAMP(9) WITH LOCAL TIME ZONE', function() {
    var dates = assist.data.dates;

    before('create table, insert data', function(done) {
      assist.setUp(connection, tableName, dates, done);
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

    it('38.1.1 works well with SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, dates, done);
    });

    it('38.1.2 works well with result set', function(done) {
      assist.verifyResultSet(connection, tableName, dates, done);
    });

    it('38.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, dates, done);
    });

    it('38.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      assist.verifyRefCursorWithFetchInfo(connection, tableName, dates, done);
    });

    it('38.1.5 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      assist.verifyRefCursorWithFetchAsString(connection, tableName, dates, done);
    });

  }); // end of 37.1 suite

  describe('38.2 stores null value correctly', function() {
    it('38.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

  describe('38.3 testing TIMESTAMP WITH LOCAL TIME ZONE', function() {
    var timestamps = assist.TIMESTAMP_TZ_STRINGS_2;

    before(function(done) {
      assist.setUp4sql(connection, tableName, timestamps, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    it('38.3.1 SELECT query - original data', function(done) {
      assist.selectOriginalData(connection, tableName, timestamps, done);
    });

    it('38.3.2 SELECT query - formatted data for comparison', function(done) {
      var sql = "SELECT num, TO_CHAR(content AT TIME ZONE '-8:00', 'DD-MM-YYYY HH24:MI:SS.FF TZR') AS TS_DATA FROM "
                 + tableName + " WHERE num = :no";

      async.eachSeries(timestamps, function(timestamp, cb) {
        var bv = timestamps.indexOf(timestamp);
        connection.execute(
          sql,
          { no: bv },
          {
            outFormat: oracledb.OUT_FORMAT_OBJECT
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result.rows);
            (result.rows[0].TS_DATA).should.equal(assist.content.timestamps6[bv]);
            cb();
          }
        );
      }, function(err) {
        should.not.exist(err);
        done();
      });
    });
  }); // end of 38.3 suite
});
