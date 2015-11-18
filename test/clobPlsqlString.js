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
 *   60. clobPlsqlString.js
 *
 * DESCRIPTION
 *
 *   PL/SQL OUT CLOB parameters can also be bound as `STRING`
 *   The returned length is limited to the maximum size of maxSize option.
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
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbConfig.js');
var assist   = require('./dataTypeAssist.js');

describe('60. clobPlsqlString.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_myclobs";

  before('get one connection, prepare table', function(done) {
    async.series([
      function(callback) {
        oracledb.getConnection(
          credential, 
          function(err, conn) {
          should.not.exist(err);
          connection = conn;
          callback();
          }
        );
      },
      function(callback) {
        assist.createTable(connection, tableName, callback);
      },
      function(callback) {
        connection.execute(
          "INSERT INTO oracledb_myclobs (num, content) VALUES (1, 'abcdefghijklmnopqrstuvwxyz')",
           function(err) {
            should.not.exist(err);
            callback();
           }
        );
      }
    ], done);

  })
  
  after('release connection', function(done) {
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE oracledb_myclobs",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.release( function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);

  })

  it('60.1 PL/SQL OUT CLOB parameters can also be bound as STRING', function(done) {
    connection.execute(
      "BEGIN SELECT content INTO :cbv FROM oracledb_myclobs WHERE num = :id; END;",
      {
        id: 1,
        cbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT}
      },
      function(err, result) {
        should.not.exist(err);
        (result.outBinds.cbv).should.be.a.String;
        (result.outBinds.cbv).should.eql('abcdefghijklmnopqrstuvwxyz');
        done();
      }
    );
  })

  it('60.2 The returned length is limited to the maximum size', function(done) {
    connection.execute(
      "BEGIN SELECT content INTO :cbv FROM oracledb_myclobs WHERE num = :id; END;",
      {
        id: 1,
        cbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5 }
      },
      function(err, result) {
        should.exist(err);
        (err.message).should.startWith('ORA-06502'); // PL/SQL: numeric or value error
        done();
      }
    );
  })
})
