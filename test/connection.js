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
 *   1. connection.js
 *
 * DESCRIPTION
 *   Testing a basic connection to the database.
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
var dbConfig = require('./dbConfig.js');

describe('1. connection.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  describe('1.1 can run SQL query with different output formats', function(){
    var connection = false;
    
    var script = 
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
                  department_name VARCHAR2(20) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   (department_id, department_name) VALUES \
                   (20, ''Marketing'') \
          '); \
      END; ";

    before(function(done){
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        connection.execute(script, function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      });      
    })
    
    after(function(done){
      connection.execute(
        'DROP TABLE oracledb_departments',
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err) {
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    })
    
    var query = "SELECT department_id, department_name " +
                "FROM oracledb_departments " +
                "WHERE department_id = :id";
    
    it('1.1.1 ARRAY format by default', function(done) {
      var defaultFormat = oracledb.outFormat;
      defaultFormat.should.be.exactly(oracledb.ARRAY);
      
      connection.should.be.ok;
      connection.execute(query, [40], function(err, result){
        should.not.exist(err);
        (result.rows).should.eql([[ 40, 'Human Resources' ]]);
        done();
      });
    })
    
    it('1.1.2 ARRAY format explicitly', function(done) {
      connection.should.be.ok;
       connection.execute(
         query, {id: 20}, {outFormat: oracledb.ARRAY},
         function(err, result){
           should.not.exist(err);
           (result.rows).should.eql([[ 20, 'Marketing' ]]);
           done();
         }
       );
    })
  
    it('1.1.3 OBJECT format', function(done){   
      connection.should.be.ok;
      connection.execute(
        query, {id: 20}, {outFormat: oracledb.OBJECT}, 
        function(err, result){
          should.not.exist(err);
          (result.rows).should.eql([{ DEPARTMENT_ID: 20, DEPARTMENT_NAME: 'Marketing' }]);
          done();
        }
      );
    })
    
    it('1.1.4 Negatve test - invalid outFormat value', function(done){
      connection.should.be.ok;
      connection.execute(
        query, {id: 20}, {outFormat:0 },
        function(err, result){
          should.exist(err);
          (err.message).should.equal('NJS-004: invalid value for property outFormat');
          done();
        }
      );
    })
  })
  
  describe('1.2 limits the number of rows fetched', function(){ 
    var connection = false;
    var createTable = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE oracledb_employees'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE oracledb_employees ( \
                  employees_id NUMBER,  \
                  employees_name VARCHAR2(20) \
              ) \
          '); \
      END; "; 
    
    var insertRows = 
      "DECLARE \
          x NUMBER := 0; \
          n VARCHAR2(20); \
       BEGIN \
          FOR i IN 1..107 LOOP \
             x := x + 1; \
             n := 'staff ' || x; \
             INSERT INTO oracledb_employees VALUES (x, n); \
          END LOOP; \
       END; ";

    before(function(done){
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        connection.execute(createTable, function(err) {
          if(err) { console.error(err.message); return; }
          connection.execute(insertRows, function(err) {
            if(err) { console.error(err.message); return; }
            done();
          });
        });
      });     
 
    })
    
    after(function(done){
      connection.execute(
        'DROP TABLE oracledb_employees',
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err) {
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    })
    
    it('1.2.1 by default, the number is 100', function(done){
      var defaultLimit = oracledb.maxRows;
      defaultLimit.should.be.exactly(100);
    
      connection.should.be.ok;
      connection.execute(
        "SELECT * FROM oracledb_employees",
        function(err, result){
          should.not.exist(err);
          should.exist(result);
          // Return 100 records although the table has 107 rows.
          (result.rows).should.have.length(100); 
          done();
        }
      );
    })
  
    it('1.2.2 can also specify for each execution', function(done){
      connection.should.be.ok;
      connection.execute(
        "SELECT * FROM oracledb_employees", 
        {}, {maxRows: 25},
        function(err, result){
          should.not.exist(err);
          should.exist(result);
          // Return 25 records according to execution setting
          (result.rows).should.have.length(25);
          done();
        }
      );
    })
    
    it('1.2.3 can set maxRows to be 0', function(done){
      connection.should.be.ok;
      connection.execute(
        "SELECT * FROM oracledb_employees", 
        {}, {maxRows: 0},
        function(err, result){
          should.not.exist(err);
          should.exist(result);
          // Return 25 records according to execution setting
          (result.rows).should.have.length(0);
          done();
        }
      );
    })
    
    it('1.2.4 cannot set maxRows to be a negative number', function(done){
      connection.should.be.ok;
      connection.execute(
        "SELECT * FROM oracledb_employees", 
        {}, {maxRows: -5},
        function(err, result){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  })

  describe('1.3 can call PL/SQL procedures', function(){
    var connection = false;
    
    var proc = "CREATE OR REPLACE PROCEDURE binding_test (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT VARCHAR2) "
                + "AS "
                + "BEGIN "
                + "  p_out := p_in || ' ' || p_inout; "
                + "END; ";
    
    before(function(done){
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        connection.execute(proc, function(err, result) {
          if(err) { console.error(err.message); return; }
          done();
        });
      });
    })
    
    after(function(done){
      connection.execute(
        "DROP PROCEDURE binding_test",
        function(err, result){
          if(err) { console.error(err.message); return; }
          connection.release(function(err) {
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    })
    
    it('bind parameters in various ways', function(done){
      var bindValues = {
        i: 'Alan', // default is type STRING and direction Infinity
        io: { val: 'Turing', type: oracledb.STRING, dir: oracledb.BIND_INOUT },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      connection.should.be.ok;
      connection.execute(
        "BEGIN binding_test(:i, :io, :o); END;",
        bindValues,
        function(err, result){
          should.not.exist(err);
          (result.outBinds.io).should.equal('Turing');
          (result.outBinds.o).should.equal('Alan Turing');
          done();
        }
      );
    })
  })
  
  describe('1.4 stmtCacheSize = 0, which disable statement caching', function() {
    var connection = false;
    
    var makeTable = 
        "BEGIN \
            DECLARE \
                e_table_exists EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE oracledb_employees'); \
            EXCEPTION \
                WHEN e_table_exists \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE oracledb_employees ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   VALUES \
                   (1001,''Chris Jones'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   VALUES \
                   (1002,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   VALUES \
                   (2001, ''Karen Morton'') \
            '); \
          END; ";
    
    var defaultStmtCache = oracledb.stmtCacheSize; // 30

    before('get connection and prepare table', function(done) {
      oracledb.stmtCacheSize = 0;
      oracledb.getConnection(credential, function(err, conn) {
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
    
    after('drop table and release connection', function(done) {
      oracledb.stmtCacheSize = defaultStmtCache;
      connection.execute(
        "DROP TABLE oracledb_employees",
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    })
    
    it('works well when statement cache disabled', function(done) {
      connection.should.be.ok;
      (oracledb.stmtCacheSize).should.be.exactly(0);   

      async.series([
        function(callback) {
          connection.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1003, str: 'Robyn Sands' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1004, str: 'Bryant Lin' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1005, str: 'Patrick Engebresson' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
  })
  
  describe('1.5 stmtCacheSize > 0', function() {
    var connection = false;
    
    var makeTable = 
        "BEGIN \
            DECLARE \
                e_table_exists EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE oracledb_employees'); \
            EXCEPTION \
                WHEN e_table_exists \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE oracledb_employees ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   VALUES \
                   (1001,''Chris Jones'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   VALUES \
                   (1002,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   VALUES \
                   (2001, ''Karen Morton'') \
            '); \
          END; ";
    
    var defaultStmtCache = oracledb.stmtCacheSize; // 30

    before('get connection and prepare table', function(done) {
      oracledb.stmtCacheSize = 100;
      oracledb.getConnection(credential, function(err, conn) {
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
    
    after('drop table and release connection', function(done) {
      oracledb.stmtCacheSize = defaultStmtCache;
      connection.execute(
        "DROP TABLE oracledb_employees",
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    })
    
    it('works well when statement cache enabled', function(done) {
      connection.should.be.ok;
      (oracledb.stmtCacheSize).should.be.exactly(100);   

      async.series([
        function(callback) {
          connection.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1003, str: 'Robyn Sands' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1004, str: 'Bryant Lin' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1005, str: 'Patrick Engebresson' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
  })
  
})




















