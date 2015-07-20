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
 *   27. dataTypeNumber2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NUMBER(p, s).
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

describe('27. dataTypeNumber2.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  var tableName = "oracledb_datatype_number2";
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
           "           content NUMBER(9, 5) "  +
           "       )" +
           "   '); " +
           "END; ";
  var numbers = [
        1,
        0,
        8,
        -8,
        1234,
        -1234,
        9876.54321,
        -9876.54321,
        0.01234,
        -0.01234,
        0.00000123
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
  
  it('27.1 supports NUMBER(p, s) data type', function(done) {
    connection.should.be.ok;
    connection.execute(
      "SELECT * FROM " + tableName,
      [],
      { outFormat: oracledb.OBJECT },
      function(err, result) {
        should.not.exist(err);
        // console.log(result);
        for(var j = 0; j < numbers.length; j++) {
          if(numbers[result.rows[j].NUM] == 0.00000123) 
            result.rows[j].CONTENT.should.be.exactly(0);
          else            
           result.rows[j].CONTENT.should.be.exactly(numbers[result.rows[j].NUM]);
        }
        done();
      }
    );
  })
  
  it('27.2 resultSet stores NUMBER(p, s) data correctly', function(done) {
    connection.should.be.ok;
    var numRows = 3; // number of rows to return from each call to getRows()
    connection.execute(
      "SELECT * FROM " + tableName,
      [],
      { resultSet: true, outFormat: oracledb.OBJECT },
      function(err, result) {
        should.not.exist(err);
        (result.resultSet.metaData[0]).name.should.eql('NUM');
        (result.resultSet.metaData[1]).name.should.eql('CONTENT');
        fetchRowsFromRS(result.resultSet);
      }
    );
    
    function fetchRowsFromRS(rs) {
      rs.getRows(numRows, function(err, rows) {
        should.not.exist(err);
        if(rows.length > 0) {
          for(var i = 0; i < rows.length; i++) {
            if(numbers[rows[i].NUM] == 0.00000123) 
              rows[i].CONTENT.should.be.exactly(0);
            else              
             rows[i].CONTENT.should.be.exactly(numbers[rows[i].NUM]);         
          }
          return fetchRowsFromRS(rs);
        } else if(rows.length == 0) {
          rs.close(function(err) {
            should.not.exist(err);
            done();
          });
        } else {
          var lengthLessThanZero = true;
          should.not.exist(lengthLessThanZero);
          done();
        }
      });
    }
  })
  
  it('27.3 stores null value correctly', function(done) {
    assist.nullValueSupport(connection, tableName, done);
  })  
})
