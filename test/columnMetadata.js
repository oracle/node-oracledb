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
 *   9. columnMetadata.js
 *
 * DESCRIPTION
 *   Testing properties of column meta data.
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
var dbConfig = require('./dbconfig.js');

describe('9. columnMetadata.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  beforeEach('get connection & create table', function(done){
    var makeTable = 
      "BEGIN \
            DECLARE \
                e_table_exists EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE oracledb_departments'); \
            EXCEPTION \
                WHEN e_table_exists \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE oracledb_departments ( \
                    department_id NUMBER,  \
                    department_name VARCHAR2(20), \
                    manager_id NUMBER, \
                    location_id NUMBER \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   VALUES \
                   (40,''Human Resources'', 203, 2400) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   VALUES \
                   (50,''Shipping'', 121, 1500) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   VALUES \
                   (90, ''Executive'', 100, 1700) \
            '); \
        END; ";
    oracledb.getConnection(credential, function(err, conn){
      if(err) { console.error(err.message); return; }
      connection = conn;
      conn.execute(
        makeTable,
        function(err){
          if(err) { console.error(err.message); return; }
          done(); 
        }
      );
    });
  })
  
  afterEach('drop table and release connection', function(done){
    connection.execute(
      "DROP TABLE oracledb_departments",
      function(err){
        if(err) { console.error(err.message); return; }
        connection.release( function(err){
          if(err) { console.error(err.message); return; }
          done();
        });
      }
    );
  })
  
  it('9.1 shows metaData correctly when retrieving 1 column from a 4-column table', function(done){
    connection.should.be.ok;
    connection.execute(
      "SELECT location_id FROM oracledb_departments WHERE department_id = :did",
      [50],
      function(err, result){
        should.not.exist(err);
        (result.rows[0][0]).should.be.exactly(1500);
        (result.metaData[0].name).should.eql('LOCATION_ID');
        done();
      }
    );
  })
  
  it('9.2 shows metaData when retrieving 2 columns. MetaData is correct in content and sequence', function(done){
    connection.should.be.ok;
    connection.execute(
      "SELECT department_id, department_name FROM oracledb_departments WHERE location_id = :lid",
      [1700],
      function(err, result){
        should.not.exist(err);
        (result.rows[0]).should.eql([ 90, 'Executive' ]);
        (result.metaData[0].name).should.eql('DEPARTMENT_ID');
        (result.metaData[1].name).should.eql('DEPARTMENT_NAME');
        done();
      }
    );
  })
  
  it('9.3 shows metaData correctly when retrieve 3 columns', function(done){
    connection.should.be.ok;
    connection.execute(
      "SELECT department_id, department_name, manager_id FROM oracledb_departments WHERE location_id = :lid",
      [2400],
      function(err, result){
        should.not.exist(err);
        (result.rows[0]).should.eql([ 40, 'Human Resources', 203 ]);
        (result.metaData[0].name).should.eql('DEPARTMENT_ID');
        (result.metaData[1].name).should.eql('DEPARTMENT_NAME');
        (result.metaData[2].name).should.eql('MANAGER_ID');
        done();
      }
    );
  })
  
  it('9.4 shows metaData correctly when retrieving all columns with [SELECT * FROM table] statement', function(done){
    connection.should.be.ok;
    connection.execute(
      "SELECT * FROM oracledb_departments",
      function(err, result){
        should.not.exist(err);
        result.rows.length.should.be.exactly(3);
        result.metaData.length.should.be.exactly(4);
        result.metaData[0].name.should.eql('DEPARTMENT_ID');
        result.metaData[1].name.should.eql('DEPARTMENT_NAME');
        result.metaData[2].name.should.eql('MANAGER_ID');
        result.metaData[3].name.should.eql('LOCATION_ID');
        done();
      }
    );
  })
  
  it('9.5 works for SELECT count(*)', function(done){
    connection.should.be.ok;
    connection.execute(
      "SELECT count(*) FROM oracledb_departments", 
      function(err, result){
        should.not.exist(err);
        result.rows[0][0].should.be.exactly(3);
        result.metaData.should.be.ok;
        result.metaData[0].name.should.eql('COUNT(*)');
        done();
      }
    );
  })
  
  it('9.6 works when a query returns no rows', function(done){
    connection.should.be.ok;
    connection.execute(
      "SELECT * FROM oracledb_departments WHERE department_id = :did",
      [100],
      function(err, result){
        should.not.exist(err);
        (result.rows.length).should.be.exactly(0);
        result.metaData[0].name.should.eql('DEPARTMENT_ID');
        result.metaData[1].name.should.eql('DEPARTMENT_NAME');
        result.metaData[2].name.should.eql('MANAGER_ID');
        result.metaData[3].name.should.eql('LOCATION_ID');
        done();
      }
    );
  })
  
  it('9.7 works for tables whose column names were created case sensitively', function(done){
    connection.should.be.ok;
    
    async.series([
      function(callback){
        
        var dummyTable = 
          "BEGIN " +
          "   DECLARE " +
          "       e_table_exists EXCEPTION; " +
          "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
          "   BEGIN " +
          "       EXECUTE IMMEDIATE ('DROP TABLE dummy_table'); " +
          "   EXCEPTION " +
          "       WHEN e_table_exists " +
          "       THEN NULL; " +
          "   END; " +
          "   EXECUTE IMMEDIATE (' " +
          "       CREATE TABLE dummy_table ( " +
          "           id NUMBER,  " +
          '           "nAme" VARCHAR2(20) ' +
          "       )" +
          "   '); " +
          "END; ";
        
        connection.execute(
          dummyTable,
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "SELECT * FROM dummy_table",
          function(err, result){
            should.not.exist(err);
            (result.rows.length).should.be.exactly(0);
            result.metaData[0].name.should.eql('ID');
            result.metaData[1].name.should.eql('nAme');
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "DROP TABLE dummy_table",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('9.8 only works for SELECT statement, does not work for INSERT', function(done){
    connection.should.be.ok;
    connection.execute(
      "INSERT INTO oracledb_departments VALUES (99, 'FACILITY', 456, 1700)",
      function(err, result){
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        should.not.exist(result.metaData);
        
        connection.execute(
          'SELECT * FROM oracledb_departments WHERE department_id = :1',
          [99],
          function(err, result){
            should.not.exist(err);
            result.metaData.should.be.ok;
            result.metaData.length.should.be.exactly(4);
            result.metaData[0].name.should.eql('DEPARTMENT_ID');
            result.metaData[1].name.should.eql('DEPARTMENT_NAME');
            result.metaData[2].name.should.eql('MANAGER_ID');
            result.metaData[3].name.should.eql('LOCATION_ID');
            result.rows[0].should.eql([ 99, 'FACILITY', 456, 1700 ]);
            done();
          }
        );
      }
    );
  })
  
  it('9.9 only works for SELECT statement, does not work for UPDATE', function(done){
    connection.should.be.ok;
    connection.execute(
      "UPDATE oracledb_departments SET department_name = 'Finance' WHERE department_id = :did",
      { did: 40 },
      function(err, result){
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        should.not.exist(result.metaData);
        
        connection.execute(
          "SELECT department_name FROM oracledb_departments WHERE department_id = :1",
          [40],
          function(err, result){
            should.not.exist(err);
            result.metaData.should.be.ok;
            result.metaData[0].name.should.eql('DEPARTMENT_NAME');
            result.rows[0][0].should.eql('Finance');
            done();
          }
        );
      }
    );
  })
  
  it('9.10 works with a large number of columns', function(done){
    connection.should.be.ok;
    // create a 100-column table
    var column_size = 100;
    var columns_string = genColumns(column_size);
    
    function genColumns(size) {
      var buffer = [];
      for(var i = 0; i < size; i++) {
        buffer[i] = " column_" + i + " NUMBER";
      }
      return buffer.join();
    }
    
    var table_name = "oracledb_large_columns";
    var sqlCreate = "CREATE TABLE " + table_name + " ( " + columns_string + " )";
    var sqlSelect = "SELECT * FROM " + table_name;
    var sqlDrop = "DROP TABLE " + table_name;
    
    async.series([
      function(callback) {
        connection.execute(
          sqlCreate,
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          sqlSelect,
          function(err, result) {
            should.not.exist(err);
            for(var i = 0; i < column_size; i++){
              result.metaData[i].name.should.eql('COLUMN_' + i);
            }
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          sqlDrop,
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('9.11 works with column names consisting of single characters', function(done){
    connection.should.be.ok;
    var tableName = "oracledb_single_char";
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
          "           a VARCHAR2(20),  " +
          '           b VARCHAR2(20) ' +
          "       )" +
          "   '); " +
          "END; ";
    var sqlSelect = "SELECT * FROM " + tableName;
    var sqlDrop = "DROP TABLE " + tableName;

    async.series([
      function(callback) {
        connection.execute(
          sqlCreate,
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          sqlSelect,
          function(err, result){
            should.not.exist(err);
            result.metaData[0].name.should.eql('A');
            result.metaData[1].name.should.eql('B');
            callback();
          }
        );
      },
      function(callback) {
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
  
  it('9.12 works with a SQL WITH statement', function(done){
    connection.should.be.ok;
    
    var sqlWith = "WITH oracledb_dep AS " + 
                  "(SELECT * FROM oracledb_departments WHERE location_id < 2000) " + 
                  "SELECT * FROM oracledb_dep WHERE department_id > 50";
    
    connection.execute(
      sqlWith,
      function(err, result) {
        should.not.exist(err);
        result.rows[0].should.eql([ 90, 'Executive', 100, 1700 ]);
        result.metaData[0].name.should.eql('DEPARTMENT_ID');
        result.metaData[1].name.should.eql('DEPARTMENT_NAME');
        result.metaData[2].name.should.eql('MANAGER_ID');
        result.metaData[3].name.should.eql('LOCATION_ID');
        done();
      }
    );
  })
})
