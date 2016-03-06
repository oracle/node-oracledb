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
 *   61. checkClassesTypes.js
 *
 * DESCRIPTION
 *
 *   Check the types of all the classes we defined.
 * 
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests  
 * 
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var fs       = require('fs');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('61. checkClassesTypes.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  it('61.1 Oracledb class', function() {
    var type = Object.prototype.toString.call(oracledb);
    type.should.eql('[object Oracledb]');
  })

  it('61.2 Connection class', function(done) {
    async.waterfall(
      [
        function(callback) 
        {
          oracledb.getConnection(credential, callback);
        },
        function(connection, callback) 
        {
          var type = Object.prototype.toString.call(connection);
          type.should.eql('[object Connection]');
          callback(null, connection);
        },
        function(connection, callback)
        {
          connection.release( callback );
        }
      ],
      function(err) 
      {
        should.not.exist(err);
        done();
      }
    );
  })

  it('61.3 Lob Class', function(done) {
    var connection = null;
    var clobTableName = "oracledb_myclobs";
    
    async.series([
      function getConn(callback) {
        oracledb.getConnection(credential, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          callback();
        });
      },
      function createTab(callback) {
        assist.createTable(connection, clobTableName, callback);
      },
      function insertLobData(callback) {
        var sqlInsert = "INSERT INTO " + clobTableName + " VALUES (:n, EMPTY_CLOB()) " 
                        + " RETURNING content INTO :clob";
        var bindVar = { n:1, clob: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} };
        var clobFileName = './test/clobexample.txt';

        connection.execute(
          sqlInsert,
          bindVar,
          function(err, result) {
            should.not.exist(err);

            var lob = result.outBinds.clob[0];
            var clobStream = fs.createReadStream(clobFileName);

            clobStream.on('error', function(err) {
              should.not.exist();
            });

            lob.on('error', function(err) {
              should.not.exist(err);
            });

            clobStream.on('end', function() {
              connection.commit( function(err) {
                should.not.exist(err);
                callback();
              });
            });

            clobStream.pipe(lob);
          }
        );
      },
      function checking(callback) {
        var sqlSelect = "SELECT * FROM " + clobTableName + " WHERE num = :n";
        connection.execute(
          sqlSelect,
          { n: 1 },
          function(err, result) {
            should.not.exist(err);
            var lob = result.rows[0][1];

            var type = Object.prototype.toString.call(lob);
            type.should.eql('[object Object]');
            
            callback();
          }
        );
      },
      function dropTab(callback) {
        connection.execute(
          "DROP TABLE " + clobTableName,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function releaseConn(callback) {
        connection.release( function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done); 
  }) // 61.3

  it('61.4 Pool Class', function(done) {
    async.waterfall(
      [
        function(callback) {
          oracledb.createPool(credential, callback);
        },
        function(pool, callback) {
          var type = Object.prototype.toString.call(pool);
          type.should.eql('[object Pool]');

          return callback(null, pool);
        },
        function(pool, callback) {
          pool.terminate(callback);
        }
      ], 
      function(err) {
        should.not.exist(err);
        done();
      }
    );
  }) // 61.4

  it('61.5 ResultSet Class', function(done) {
    async.waterfall(
      [
        function(callback) {
          oracledb.getConnection(credential, callback);
        },
        function(connection, callback) {
          connection.execute(
            "SELECT 'abcde' FROM dual",
            [],
            { resultSet: true },
            function(err, result) {
              if (err)
                return callback(err);
              else {
                var type = Object.prototype.toString.call(result.resultSet);
                type.should.eql('[object ResultSet]');
                return callback(null, connection);
              }
            }
          );
        },
        function(connection, callback) {
          connection.release(callback);
        }
      ], 
      function(err) {
        should.not.exist(err);
        done();
      }
    );
  }) // 61.5

})

