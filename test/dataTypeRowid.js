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
 
var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbConfig.js');

describe('39. dataTypeRowid.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  before(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;
      done();  
    });
  })
  
  after(function(done) {
    connection.release(function(err) {
      if(err) { console.error(err.message); return; }
      done(); 
    });
  })
  
  it('39.1 supports ROWID data type', function(done) {
    connection.should.be.ok;
    var createTable = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE oracledb_row'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE oracledb_row ( \
                  ID NUMBER,  \
                  RID ROWID \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_row(ID) VALUES(1) \
          '); \
          EXECUTE IMMEDIATE (' \
              UPDATE oracledb_row T SET RID = T.ROWID \
          '); \
      END; ";
      
    async.series([
      function(callback) {
        connection.execute(
          createTable,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "SELECT * FROM oracledb_row",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.exist(err);
            err.message.should.startWith('NJS-010:'); // unsupported data type in select list
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP TABLE oracledb_row",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
}) 
