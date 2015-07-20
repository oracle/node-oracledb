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
 *   24. dataTypeVarchar2.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - VARCHAR2.
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

describe('24. dataTypeVarchar2.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  
  var tableName = "oracledb_datatype_varchar2";
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
           "           content VARCHAR2(4000) "  +
           "       )" +
           "   '); " +
           "END; ";
  var sqlDrop = "DROP table " + tableName;
  before( function(done){
    oracledb.getConnection(credential, function(err, conn){
      if(err) { console.error(err.message); return; }
      connection = conn;
      connection.execute(
        sqlCreate,
        function(err) {
          if(err) { console.error(err.message); return; }
          done();
        }
      );
    });
  })
  
  after( function(done){
    connection.execute(
      sqlDrop,
      function(err) {
        if(err) { console.error(err.message); return; }
        connection.release( function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      }
    );
  })
  
  it('supports VARCHAR2 data type', function(done) {
    connection.should.be.ok;
    
    var strLen = [10 ,100, 1000, 2000, 3000, 4000]; // char string length
    var strs = [];
    for(var i = 0; i < strLen.length; i++) 
      strs[i] = assist.createCharString(strLen[i]); 
    
    var sqlInsert = "INSERT INTO " + tableName + " VALUES(:no, :bindValue)";
    
    async.forEach(strs, function(str, callback) {
      connection.execute(
        sqlInsert,
        { no: strs.indexOf(str), bindValue: str },
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    }, function(err) {
      should.not.exist(err);
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          //console.log(result);
          
          for(var j = 0; j < strLen.length; j++) {
            result.rows[j].CONTENT.trim().should.eql(strs[result.rows[j].NUM]);
            result.rows[j].CONTENT.trim().length.should.be.exactly(strLen[result.rows[j].NUM]);
          }
		  done();
        }
      );
    });
  })
})
