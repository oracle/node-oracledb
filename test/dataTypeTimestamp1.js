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

var oracledb = require('oracledb');
var should = require('should');
var async = require('async');
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbConfig.js');

describe('33. dataTypeTimestamp1.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_timestamp1";
  var dates = assist.data.dates;
      
  before(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;

      var sqlCreate = assist.sqlCreateTable(tableName);
      assist.setup(connection, tableName, sqlCreate, dates, done);
    });
  })
  
  after( function(done){
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
  })
  
  it('33.1 supports TIMESTAMP data type', function(done) {
    assist.dataTypeSupport(connection, tableName, dates, done);
  })
  
  it('33.2 resultSet stores TIMESTAMP data correctly', function(done) {
    assist.resultSetSupport(connection, tableName, dates, done);
  })
  
  it('33.3 stores null value correctly', function(done) {
    assist.nullValueSupport(connection, tableName, done);
  }) 

  it('33.4 inserts TIMESTAMP data via sql', function(done) {
    var array = assist.TIMESTAMP_STRINGS;

    async.series([
      function insertData(callback) {
        async.forEach(array, function(element, cb) {
          var sql = "INSERT INTO " + tableName + " VALUES(:no, " + element + " )";
          var bv  = array.indexOf(element) + dates.length;
          connection.execute(
            sql,
            { no: bv },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }, function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function verifyData(callback) {
        async.forEach(array, function(element, cb) {
          var bv  = array.indexOf(element) + dates.length;
          connection.execute(
            "SELECT * FROM " + tableName + " WHERE num = :no",
            { no: bv },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              //console.log(bv - dates.length);
              //console.log(result.rows[0].CONTENT.toUTCString());
              //console.log(assist.content.timestamps[bv - dates.length]);
              (result.rows[0].CONTENT.toUTCString()).should.equal(assist.content.timestamps[bv - dates.length]);
              cb();
            } 
          );
        }, function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  })
})
