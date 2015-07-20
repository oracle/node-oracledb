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
 *   22. dataTypeChar.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - CHAR.
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

describe('22. dataTypeChar.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  before( function(done){
    oracledb.getConnection(credential, function(err, conn){
      if(err) { console.error(err.message); return; }
      connection = conn;
      done();
    });
  })
  
  after( function(done){
    connection.release( function(err){
      if(err) { console.error(err.message); return; }
      done();
    });
  })
  
  it('supports CHAR data type', function(done){
    connection.should.be.ok;
    
    // The capacity of Oracle CHAR is 2000
    var strLen = [100, 1000, 2000];  // char string length
    var strs = [
               assist.createCharString(strLen[0]),
               assist.createCharString(strLen[1]),
               assist.createCharString(strLen[2]),
             ];
    var tableName = "oracledb_datatype_char";
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
          "           content CHAR(2000) "  +
          "       )" +
          "   '); " +
          "END; ";
    var sqlDrop = "DROP table " + tableName;
    var sqlInsert = "INSERT INTO " + tableName + " VALUES(:no, :bindValue)";
    
    async.series([ 
      function(callback){
        connection.execute(
          sqlCreate,
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          sqlInsert,
          {no: 0, bindValue: strs[0]},
          function(err, result) {
            should.not.exist(err);
            //console.log(result);
            result.rowsAffected.should.be.exactly(1);
            callback();
          }
        );
      }, 
      function(callback){
        connection.execute(
          sqlInsert,
          {no: 1, bindValue: strs[1]},
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          sqlInsert,
          {no: 2, bindValue: strs[2]},
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "SELECT * FROM " + tableName,
          [],
          {outFormat: oracledb.OBJECT},
          function(err, result) {
            should.not.exist(err);
            //console.log(result);
            result.rows[0].NUM.should.be.exactly(0);
            result.rows[0].CONTENT.trim().should.eql(strs[0]);
            result.rows[0].CONTENT.trim().length.should.be.exactly(strLen[0]);
            
            result.rows[1].NUM.should.be.exactly(1);
            result.rows[1].CONTENT.trim().should.eql(strs[1]);
            result.rows[1].CONTENT.trim().length.should.be.exactly(strLen[1]);
            
            result.rows[2].NUM.should.be.exactly(2);
            result.rows[2].CONTENT.trim().should.eql(strs[2]);
            result.rows[2].CONTENT.trim().length.should.be.exactly(strLen[2]);
            callback();
          }
        );
      },
      
      function(callback){
        connection.execute(
          sqlDrop,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
    
  })
})
