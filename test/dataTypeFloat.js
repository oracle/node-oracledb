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
 *   28. dataTypeFloat.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - FLOAT.
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
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('28. dataTypeFloat.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }  
  
  var connection = null;
  var tableName = "oracledb_float";
  var numbers = assist.data.numbers;
      
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

  describe('28.1 testing FLOAT data type', function() {
    
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

    it('28.1.1 works well with SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, numbers, done);
    })

    it('28.1.2 works well with result set', function(done) {
      assist.verifyResultSet(connection, tableName, numbers, done);
    })

    it('28.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, numbers, done);
    })
  })

  describe('28.2 stores null value correctly', function() {
    it('28.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })
})
