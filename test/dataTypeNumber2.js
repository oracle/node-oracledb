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
 *   27. dataTypeNumber2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NUMBER(p, s).
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

describe('27. dataTypeNumber2.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_number2";
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

  describe('27.1 testing NUMBER(p, s) data', function() {

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

    it('27.1.1 SELECT query', function(done) {
      connection.should.be.ok;
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          for(var j = 0; j < numbers.length; j++) {
            if(Math.abs( numbers[result.rows[j].NUM] ) == 0.00000123) 
              result.rows[j].CONTENT.should.be.exactly(0);
            else            
              result.rows[j].CONTENT.should.be.exactly(numbers[result.rows[j].NUM]);
          }
          done();
        }
      );
    }) // 27.1.1

    it('27.1.2 resultSet stores NUMBER(p, s) data correctly', function(done) {
      connection.should.be.ok;
      var numRows = 3; // number of rows to return from each call to getRows()
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          (result.resultSet.metaData[0]).name.should.eql('NUM');
          (result.resultSet.metaData[1]).name.should.eql('CONTENT');
          fetchRowsFromRS(result.resultSet);
        }
      );
    
      function fetchRowsFromRS(rs) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          if(rows.length > 0) {
            for(var i = 0; i < rows.length; i++) {
              if(Math.abs( numbers[rows[i].NUM] ) == 0.00000123) 
                rows[i].CONTENT.should.be.exactly(0);
             else              
               rows[i].CONTENT.should.be.exactly(numbers[rows[i].NUM]);         
            }
            return fetchRowsFromRS(rs);
          } else if(rows.length == 0) {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          } else {
            var lengthLessThanZero = true;
            should.not.exist(lengthLessThanZero);
            done();
          }
        });
      }    
    })

  }) // 27.1
  
  describe('27.2 stores null value correctly', function() {
    it('27.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })

})
