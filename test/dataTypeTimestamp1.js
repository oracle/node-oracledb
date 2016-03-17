/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   33. dataTypeTimestamp1.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - TIMESTAMP.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests 
 * 
 *****************************************************************************/
"use strict";

var oracledb = require('oracledb');
var should = require('should');
var async = require('async');
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('33. dataTypeTimestamp1.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_timestamp1";
  
  before('get one connection', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  })

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  })

  describe('33.1 Testing JavaScript Date with database TIMESTAMP', function() {
    var dates = assist.data.dates;

    before('create table, insert data',function(done) {
      assist.setUp(connection, tableName, dates, done);
    })

    after(function(done) {
      connection.execute(
        "DROP table " + tableName,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    })

    it('33.1.1 works well with SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, dates, done);
    }) 

    it('33.1.2 works well with result set', function(done) {
      assist.verifyResultSet(connection, tableName, dates, done);
    }) 
    
    it('33.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, dates, done);
    }) 
    
  }) // end of 33.1 suite

  describe('33.2 stores null value correctly', function() {
    it('33.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })

  describe('33.3 testing TIMESTAMP without TIME ZONE', function() {
    var timestamps = assist.TIMESTAMP_STRINGS;
    
    before(function(done) {
      assist.setUp4sql(connection, tableName, timestamps, done);
    })

    after(function(done) {
      connection.execute(
        "DROP table " + tableName,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }) // after

    it('32.3.1 SELECT query - original data', function(done) {
      assist.selectOriginalData(connection, tableName, timestamps, done);
    })

    it('33.3.2 SELECT query - formatted data for comparison', function(done) {
      async.forEach(timestamps, function(timestamp, cb) {
        var bv = timestamps.indexOf(timestamp);
        connection.execute(
          "SELECT num, TO_CHAR(content, 'DD-MM-YYYY HH24:MI:SS.FF') AS TS_DATA FROM " + tableName + " WHERE num = :no",
          { no: bv },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            // console.log(result.rows);
            (result.rows[0].TS_DATA).should.equal(assist.content.timestamps1[bv]);
            cb();
          } 
        );
      }, function(err) {
          should.not.exist(err);
          done();
      });
    })

    it('33.3.3 returns scalar types from PL/SQL block', function(done) {
      var sql = "BEGIN SELECT systimestamp into :bv from dual; END;"; 
      var binds = { bv: { dir: oracledb.BIND_OUT, type: oracledb.STRING } };
      var options = { outFormat: oracledb.OBJECT };

      connection.execute(
        sql,
        binds,
        options,
        function(err, result) {
          should.not.exist(err);
          (result.outBinds.bv).should.be.a.String;
          done();
        }
      );
      
    })

  }) // end of 33.3 suite

})
