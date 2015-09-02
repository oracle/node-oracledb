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
 *   24. dataTypeVarchar2.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - VARCHAR2.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests  
 * 
 *****************************************************************************/
 
var oracledb = require('oracledb');
var should = require('should');
var async = require('async');
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbConfig.js');

describe('24. dataTypeVarchar2.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_varchar2";

  var strLen = [10 ,100, 1000, 2000, 3000, 4000]; // char string length
  var strs = [];
  for(var i = 0; i < strLen.length; i++) 
    strs[i] = assist.createCharString(strLen[i]);
  
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

 /* before(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;
      //assist.setup(connection, tableName, sqlCreate, strs, done);
      assist.setUp(connection, tableName, strs, done);
    });
  })*/
  
  /*after(function(done) {
    connection.execute(
      "DROP table " + tableName,
      function(err) {
        if(err) { console.error(err.message); return; }
        connection.release( function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      }
    );
  })*/
  
  describe('24.1 testing VARCHAR2 data in various lengths', function() {
    
    before('create table, insert data',function(done) {
      assist.setUp(connection, tableName, strs, done);
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

    it('24.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, strs, done);
    })

    it('24.1.2 resultSet stores VARCHAR2 data correctly', function(done) {
      assist.verifyResultSet(connection, tableName, strs, done);
    })
  })

  /*it('24.1 supports VARCHAR2 data in various lengths', function(done) {
    assist.dataTypeSupport(connection, tableName, strs, done);
  })
  
  it('24.2 resultSet stores VARCHAR2 data correctly', function(done) {
    //assist.resultSetSupport(connection, tableName, strs, done);
    assist.verifyResultSet(connection, tableName, strs, done);
  })*/
  
  describe('24.3 stores null value correctly', function() {
    it('24.3.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })

/*  it('24.3 stores null value correctly', function(done) {
    assist.verifyNullValues(connection, tableName, done);
  })*/
})