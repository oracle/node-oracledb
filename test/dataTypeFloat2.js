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
 *   29. dataTypeFloat2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - FLOAT(p).
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests 
 * 
 *****************************************************************************/
  
var oracledb = require('oracledb');
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbConfig.js');

describe('29. dataTypeFloat2.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  var tableName = "oracledb_datatype_float";
  var sqlCreate = 
        "BEGIN " +
           "   DECLARE " +
           "       e_table_exists EXCEPTION; " +
           "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
           "   BEGIN " +
           "       EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); " +
           "   EXCEPTION " +
           "       WHEN e_table_exists " +
           "       THEN NULL; " +
           "   END; " +
           "   EXECUTE IMMEDIATE (' " +
           "       CREATE TABLE " + tableName +" ( " +
           "           num NUMBER, " + 
           "           content FLOAT(90) "  +
           "       )" +
           "   '); " +
           "END; ";
  var numbers = [
        1,
        0,
        8,
        -8,
        123456789,
        -123456789,
        9876.54321,
        -9876.54321,
        0.01234,
        -0.01234,
        123456789.0123,
        -123456789.0123
      ];
      
  before(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;
      assist.setup(connection, tableName, sqlCreate, numbers, done);
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
  
  it('29.1 supports FLOAT(p) data type', function(done) {
    assist.dataTypeSupport(connection, tableName, numbers, done);
  })
  
  it('29.2 resultSet stores FLOAT(p) data correctly', function(done) {
    assist.resultSetSupport(connection, tableName, numbers, done);
  })
  
  it('29.3 stores null value correctly', function(done) {
    assist.nullValueSupport(connection, tableName, done);
  })
})
