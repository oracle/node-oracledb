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
var dbConfig = require('./dbconfig.js');

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
    
    it('1.1.4 Negative test - invalid outFormat value', function(done){
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
                  employee_id NUMBER,  \
                  employee_name VARCHAR2(20) \
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
    var rowsAmount = 107;

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
        {}, { maxRows: 25 },
        function(err, result){
          should.not.exist(err);
          should.exist(result);
          // Return 25 records according to execution setting
          (result.rows).should.have.length(25);
          done();
        }
      );
    })
    
    it('1.2.3 can not set maxRows to be 0', function(done){
      connection.should.be.ok;
      connection.execute(
        "SELECT * FROM oracledb_employees", 
        {}, { maxRows: 0 },
        function(err, result){
          should.exist(err);
          err.message.should.startWith('NJS-026:');  // NJS-026: maxRows must be greater than zero
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

    it('1.2.5 sets maxRows to be very large value', function(done) {
      connection.execute(
        "SELECT * FROM oracledb_employees", 
        {}, 
        {maxRows: 500000},
        function(err, result){
          should.not.exist(err);
          (result.rows.length).should.eql(rowsAmount);
          done();
        }  
      );
    })

    it('1.2.6 shows 12c new way to limit the number of records fetched by queries', function(done) {
      connection.should.be.ok;

      var myoffset     = 2;  // number of rows to skip
      var mymaxnumrows = 6;  // number of rows to fetch
      var sql = "SELECT employee_id, employee_name FROM oracledb_employees ORDER BY employee_id";

      if (connection.oracleServerVersion >= 1201000000) {
        // 12c row-limiting syntax
        sql += " OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY";
      } else {
        // Pre-12c syntax [could also customize the original query and use row_number()]
        sql = "SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM"
            + "(" + sql + ") A "
            + "WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset";
      }

      connection.execute(
        sql, 
        { offset: myoffset, maxnumrows: mymaxnumrows },
        { maxRows: 150 },
        function(err, result) {
          should.not.exist(err);    
          (result.rows.length).should.eql(mymaxnumrows); 
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
    
    it('1.3.1 bind parameters in various ways', function(done){
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
  
  describe('1.4 statementCacheSize controls statement caching', function() {
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
    
    var connection = false;
    var defaultStmtCache = oracledb.stmtCacheSize; // 30
    
    beforeEach('get connection and prepare table', function(done) {
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
    
    afterEach('drop table and release connection', function(done) {
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

    it('1.4.1 stmtCacheSize = 0, which disable statement caching', function(done) {
      connection.should.be.ok;
      oracledb.stmtCacheSize = 0;   

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
    
    it('1.4.2 works well when statement cache enabled (stmtCacheSize > 0) ', function(done) {
      connection.should.be.ok;
      oracledb.stmtCacheSize = 100;  

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
  
  describe('1.5 Testing commit() & rollback() functions', function() {
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
                   (1001,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   VALUES \
                   (1002, ''Karen Morton'') \
            '); \
        END; ";
    
    var conn1 = false;
    var conn2 = false;
    beforeEach('get 2 connections and create the table', function(done) {
      async.series([
        function(callback) {
          oracledb.getConnection(credential, function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          });
        },
        function(callback) {
          oracledb.getConnection(credential, function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          });
        },
        function(callback) {
          conn1.should.be.ok;
          conn1.execute(
            makeTable,
            [],
            { autoCommit: true }, 
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
    
    afterEach('drop table and release connections', function(done) {
      conn1.should.be.ok;
      conn2.should.be.ok;
      async.series([
        function(callback) {
          conn2.execute(
            "DROP TABLE oracledb_employees",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          conn1.release(function(err) {
            should.not.exist(err);
            callback();
          });
        },
        function(callback) {
          conn2.release(function(err) {
            should.not.exist(err);
            callback();
          });
        }
      ], done);  
    })
    
  
    it('1.5.1 commit() function works well', function(done) {
      async.series([
        function(callback) {
          conn2.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1003, str: 'Patrick Engebresson' },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          conn1.execute(
            "SELECT COUNT(*) FROM oracledb_employees",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(2);
              callback();
            }
          );
        },
        function(callback) {
          conn2.execute(
            "SELECT COUNT(*) FROM oracledb_employees",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(3);
              callback();
            }
          );
        },
        function(callback) {
          conn2.commit(function(err) {
            should.not.exist(err);
            callback();
          });
        },
        function(callback) {
          conn1.execute(
            "SELECT COUNT(*) FROM oracledb_employees",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(3);
              callback();
            }
          );
        },
      ], done);
    
    })
    
    it('1.5.2 rollback() function works well', function(done) {
      async.series([
        function(callback) {
          conn2.execute(
            "INSERT INTO oracledb_employees VALUES (:num, :str)",
            { num: 1003, str: 'Patrick Engebresson' },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          conn1.execute(
            "SELECT COUNT(*) FROM oracledb_employees",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(2);
              callback();
            }
          );
        },
        function(callback) {
          conn2.execute(
            "SELECT COUNT(*) FROM oracledb_employees",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(3);
              callback();
            }
          );
        },
        function(callback) {
          conn2.rollback(function(err) {
            should.not.exist(err);
            callback();
          });
        },
        function(callback) {
          conn2.execute(
            "SELECT COUNT(*) FROM oracledb_employees",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(2);
              callback();
            }
          );
        },
      ], done);
    })
  })
  
  describe('1.6 Testing parameter assertions', function() {
    var conn1;
    var sql = 'select 1 from dual';
    
    beforeEach('get connection ready', function(done) {
      oracledb.getConnection(credential, function(err, conn) {
        should.not.exist(err);
        conn1 = conn;
        done();
      });
    });
    
    afterEach('release connection', function(done) {
      conn1.release(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('1.6.1 too few params without a callback should throw error', function(done) {
      try {
        conn1.execute(sql);
      } catch (err) {
        should.exist(err);
        done();
      }
    });

    it('1.6.2 too few params with a callback should pass error in callback', function(done) {
      conn1.execute(function(err, result) {
        should.exist(err);
        done();
      });
    });

    it('1.6.3 too many params without a callback should throw error', function(done) {
      try {
        conn1.execute(1, 2, 3, 4, 5);
      } catch (err) {
        should.exist(err);
        done();
      }
    });

    it('1.6.4 too many params with a callback should pass error in callback', function(done) {
      conn1.execute(1, 2, 3, 4, function(err, result) {
        should.exist(err);
        done();
      });
    });
  })
  
})




















