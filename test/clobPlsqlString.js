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
 *   When the types of bind out variables are not STRING or BUFFER, 
 *   maxSize option will not take effect.
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
var stream   = require('stream');
var dbConfig = require('./dbconfig.js');
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
      }
    ], done);
  }) // before

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
  }) // after

  describe('60.1 BIND OUT as STRING', function() {
    before('insert data', function(done) {
      connection.execute(
        "INSERT INTO oracledb_myclobs (num, content) VALUES (1, 'abcdefghijklmnopqrstuvwxyz')",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }) // before
  
    it('60.1.1 PL/SQL OUT CLOB parameters can also be bound as STRING', function(done) {
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
    }) // 60.1.1

    it('60.1.2 The returned length is limited to the maximum size', function(done) {
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
    }) // 60.1.2
  }) // 60.1

  describe('60.2 BIND OUT as CLOB', function() {
    var dataLength = 1000000;
    var rawData = assist.createCharString(dataLength);

    it('60.2.1 maxSize option does not take effect when bind out type is clob', function(done) {
      async.series([
        function doInsert(callback) {
          connection.execute(
            "INSERT INTO " + tableName + " VALUES (2, EMPTY_CLOB()) RETURNING content INTO :lobbv",
            { lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
            { autoCommit: false }, 
            function(err, result) {
              should.not.exist(err);
              
              var lob = result.outBinds.lobbv[0];
              lob.on('error', function(err) {
                should.not.exist(err);
                return callback(err);
              });
 
              var inStream = new stream.Readable();
              inStream._read = function noop() {};
              inStream.push(rawData);
              inStream.push(null);

              inStream.on('error', function(err) { 
                should.not.exist(err);
                return callback(err);
              });

              inStream.on('end', function() {
                connection.commit(function(err) {
                  should.not.exist(err);
                  callback();
                });
              });

              inStream.pipe(lob);
            }
          );
        },
        function doQuery(callback) {
          connection.execute(
            "BEGIN SELECT content INTO :bv FROM " + tableName + " WHERE num = 2; END;",
            { bv: {dir: oracledb.BIND_OUT, type: oracledb.CLOB} },
            { maxRows: 500 },
            function(err, result) {
              should.not.exist(err);

              var content = '';
              var lob = result.outBinds.bv;
              lob.setEncoding('utf8');

              lob.on('data', function(chunk) {
                content += chunk;
              });

              lob.on('end', function() {
                (content.length).should.be.exactly(dataLength); 
                (content).should.eql(rawData);
                callback();
              });

              lob.on('error', function(err) {
                should.not.exist(err);
              });
            }
          );
        }
      ], done);
    })
  }) // 60.2
  
})
