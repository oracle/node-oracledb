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
 *   59. lobResultSet.js
 *
 * DESCRIPTION
 *
 *   Inspired by https://github.com/oracle/node-oracledb/issues/210
 *   Testing Lob data and result set. 
 *   Create a table contains Lob data. Read the Lob to result set. Get 
 *     rows one by one. Read the lob data on each row.
 * 
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests  
 * 
 *****************************************************************************/
"use strict";

var oracledb = require('oracledb');
var fs       = require('fs');
var async    = require('async');
var should   = require('should');
var stream = require('stream');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

var inFileName = './test/clobexample.txt'; 

describe('59. lobResultSet.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
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

  describe('59.1 CLOB data', function() {
    
    var tableName = "oracledb_myclobs";
    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
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

    it('59.1.1 reads clob data one by one row from result set', function(done) {
      async.series([
        function(callback) {
          insertClob(1, callback);
        },  
        function(callback) {
          insertClob(2, callback);
        },
        function(callback) {
          insertClob(3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName,
            [],
            { resultSet: true }, 
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              fetchOneRowFromRS(result.resultSet, callback);
            }
          );
        }
      ], done);
    })
    
    function fetchOneRowFromRS(resultSet, callback)
    {
      resultSet.getRow( function(err, row) {
        should.not.exist(err);
        if (!row) {
          resultSet.close( function(err) {
            should.not.exist(err);
            callback();
          });
        } 
        else {
          var lob = row[1];
          lob.setEncoding('utf8');
          
          var text = '';
          lob.on('data', function(chunk) {
            text += chunk;
          });

          lob.on('end', function() {
            fetchOneRowFromRS(resultSet, callback);
          });

          lob.on('error', function(err) {
            console.log("lob.on 'error' event");
            console.error(err.message);
          });
        }

      });
    }
  
    function insertClob(id, cb) 
    {
      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, EMPTY_CLOB()) RETURNING content INTO :lobbv",
        { n: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } },
        function(err, result) {
          should.not.exist(err);
          var lob = result.outBinds.lobbv[0];
          var inStream = fs.createReadStream(inFileName);
          
          inStream.pipe(lob);

          inStream.on('end', function() {
            connection.commit( function(err) {
              should.not.exist(err);
              cb(); // insertion done
            });
          });

          inStream.on('error', function(err) {
            should.not.exist(err);
          });
 
        }
      );
    }

  }) // 59.1

}) // 59

