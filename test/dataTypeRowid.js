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
 *   39. dataTypeRowid.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - ROWID.
 *
 * NOTE
 *   Native ROWID support is still under enhancement request.
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
var should   = require('should');
var async    = require('async');
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('39. dataTypeRowid.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_rowid";

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

  describe('39.1 testing ROWID data type', function() {
    before(function(done) {
      async.series([
        function makeTable(callback) {
          assist.createTable(connection, tableName, done);
        },
        function insertOneRow(callback) {
          connection.execute(
            "INSERT INTO " + tableName + "(num) VALUES(1)", 
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function fillRowid(callback) {
          connection.execute(
            "UPDATE " + tableName + " T SET content = T.ROWID",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
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

    it('39.1.1 is still unsupported data type', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        function(err, result) {
          should.exist(err);
          err.message.should.startWith('NJS-010:'); // unsupported data type in select list
          done();
        }
      );
    })
  })

}) 
