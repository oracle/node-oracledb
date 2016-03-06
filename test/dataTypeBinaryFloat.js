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
 *   30. dataTypeBinaryFloat.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - BINARY_FLOAT.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests  
 * 
 *****************************************************************************/
"use strict"

var oracledb = require('oracledb');
var should = require('should');
var async = require('async');
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('30. dataTypeBinaryFloat.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_binary_float";

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

  describe('30.1 testing BINARY_FLOAT data', function() {

    var numbers = assist.data.numbersForBinaryFloat;

    before('create table, insert data',function(done) {
      assist.setUp(connection, tableName, numbers, done);
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

    it('30.1.1 works well with SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, numbers, done);
    })

    it('30.1.2 works well with result set', function(done) {
      assist.verifyResultSet(connection, tableName, numbers, done);
    })

    it('30.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, numbers, done);
    })
    
  })  // 30.1

  describe('30.2 stores null value correctly', function() {
    it('30.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })
  
  describe('30.3 testing floating-point numbers which cannot be precisely represent', function() {
    var nums =
    [
      2345.67,
      9876.54321,
      0.01234,
      0.00000123
    ];

    before('create table, insert data',function(done) {
      assist.setUp(connection, tableName, nums, done);
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

    it('30.3.1 rounding numbers', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          
          for(var i = 0; i < nums.length; i++) {
            result.rows[i].CONTENT.should.not.be.exactly(nums[ result.rows[i].NUM ]);
            approxeq(result.rows[i].CONTENT, nums[ result.rows[i].NUM ]).should.be.ok;
          }
          done();
        }
      );
    })

    function approxeq(v1, v2)
    {
      var precision = 0.001;
      return Math.abs(v1 - v2) < precision;
    }
  }) // 30.3
})
