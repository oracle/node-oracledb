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
 *   3. examples.js
 *
 * DESCRIPTION
 *   Testing the example programs in examples directory.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests 
 * 
 *****************************************************************************/

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('3. examples.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  describe('3.1 connect.js', function(){
    it('3.1.1 tests a basic connection to the database', function(done){
      oracledb.getConnection(credential, function(error, connection){
        should.not.exist(error);
        connection.should.be.ok;
        connection.release( function(err){
          should.not.exist(err);
          done();
        });
      });
    })
  })
  
  describe('3.2 version.js', function(){
    it('3.2.1 shows the oracledb version attribute', function(){
      (oracledb.version).should.be.a.Number;
      (oracledb.version).should.be.greaterThan(0);
      // console.log("Driver version number is " + oracledb.version);
      
      major = Math.floor(oracledb.version/10000);
      minor = Math.floor(oracledb.version/100) % 100;
      patch = oracledb.version % 100;
      // console.log("Driver version text is " + major + "." + minor + "." + patch);      
    })
  })
  
  describe('3.3 select1.js & select2.js', function(){
    var connection = false;
                
    before(function(done){
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    })
  
    after(function(done){
      if(connection){
        connection.release( function(err){
        if(err) { console.error(err.message); return; }
        done();
        });
      }
    })
    
    it('3.3.1. execute a basic query', function(done){
      var script1 = 
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
                   (180, ''Construction'') \
            '); \
        END; ";
      
      async.series([
        function(callback){
          connection.execute( script1, function(err){
            should.not.exist(err);
            callback();
          });
        },
        function(callback){
          connection.execute(
              "SELECT department_id, department_name "
            + "FROM oracledb_departments "
            + "WHERE department_id = :did",
            [180],
            function(err, result) {
              should.not.exist(err);
              (result.rows).should.eql([[ 180, 'Construction' ]]);
               callback();
            }
          );
        }
      ], done);
      
    })
    
    it('3.3.2. execute queries to show array and object formats', function(done){
      var script2 = 
        "BEGIN \
            DECLARE \
                e_table_exists EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE oracledb_locations'); \
            EXCEPTION \
                WHEN e_table_exists \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE oracledb_locations ( \
                    location_id NUMBER,  \
                    city VARCHAR2(20) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_locations  \
                   (location_id, city) VALUES \
                   (9999,''Shenzhen'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_locations  \
                   (location_id, city) VALUES \
                   (2300, ''Singapore'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_locations  \
                   (location_id, city) VALUES \
                   (1500, ''South San Francisco'') \
            '); \
        END; ";
      
      async.series([
        function(callback){
          connection.execute( script2, function(err){
            should.not.exist(err);
            callback();
          });
        },
        function(callback){
          connection.execute(
              "SELECT location_id, city "
            + "FROM oracledb_locations "
            + "WHERE city LIKE 'S%' "
            + "ORDER BY city",
            function(err, result) {
              should.not.exist(err);
              // Cities beginning with 'S' (default ARRAY output format)
              // console.log(result);
              (result.rows).should.containEql([2300, 'Singapore']);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
              "SELECT location_id, city "
            + "FROM oracledb_locations "
            + "WHERE city LIKE 'S%' "
            + "ORDER BY city",
            {}, 
            // A bind variable parameter is needed to disambiguate the following options parameter
            // otherwise you will get Error: ORA-01036: illegal variable name/number
            {outFormat: oracledb.OBJECT}, // outFormat can be OBJECT and ARRAY.  The default is ARRAY
            function(err, result){
              should.not.exist(err);
              // Cities beginning with 'S' (OBJECT output format)
              // console.log(result);
              (result.rows).should.containEql({ LOCATION_ID: 1500, CITY: 'South San Francisco' });
              callback();
            }
          );
        }
      ], done);
      
    })
  
  })
  
  /* Oracle Database 12.1.0.2 has extensive JSON datatype support */
  describe('3.4 selectjson.js - 12.1.0.2 feature', function(){
    var connection = false;
    
    before(function(done){
      oracledb.getConnection(credential, function(err, conn){
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    })
    
    after(function(done){
      connection.release( function(err){
        if(err) { console.error(err.message); return; }
        done();
      });
    })
    
    it('3.4.1 executes a query from a JSON table', function(done){
      if (connection.oracleServerVersion < 1201000200) 
      {
        // This example only works with Oracle Database 12.1.0.2 or greater
        done();
      }
      else  
      {
        var data = { "userId": 1, "userName": "Chris" };
        var s = JSON.stringify(data);
        var script = 
          "BEGIN " +
          "   DECLARE " +
          "       e_table_exists EXCEPTION; " +
          "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
          "   BEGIN " +
          "       EXECUTE IMMEDIATE ('DROP TABLE j_purchaseorder'); " +
          "   EXCEPTION " +
          "       WHEN e_table_exists " +
          "       THEN NULL; " +
          "   END; " +
          "   EXECUTE IMMEDIATE (' " +
          "       CREATE TABLE j_purchaseorder ( " +
          "           po_document VARCHAR2(4000) CONSTRAINT ensure_json CHECK (po_document IS JSON) " +
          "       )" +
          "   '); " +
          "END; ";
        
        connection.should.be.ok;
        async.series([
          function(callback){
            connection.execute(
              script,
              function(err){
                should.not.exist(err);
                callback();
              }
            );
          },
          function(callback){
            connection.execute(
              "INSERT INTO j_purchaseorder (po_document) VALUES (:bv)",
              [s],
              function(err, result){
                should.not.exist(err);
                (result.rowsAffected).should.be.exactly(1);
                callback();
              }
            );
          },
          function(callback){
            connection.execute(
              "SELECT po_document FROM j_purchaseorder",
              function(err, result){
                should.not.exist(err);
                
                var js = JSON.parse(result.rows[0][0]);
                // console.log(js);
                js.should.eql(data);
                
                callback();
              }
            );
          },
          function(callback){
            connection.execute(
              "DROP TABLE j_purchaseorder",
              function(err){
                should.not.exist(err);
                callback();
              }
            );
          }
        ], done);

      } // else
      
    })
    
  })
  
  describe('3.5 date.js', function(){
    var connection = false;
    var script =
      "BEGIN " +
      "   DECLARE " +
      "       e_table_exists EXCEPTION; " +
      "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
      "   BEGIN " +
      "       EXECUTE IMMEDIATE ('DROP TABLE datetest'); " +
      "   EXCEPTION " +
      "       WHEN e_table_exists " +
      "       THEN NULL; " +
      "   END; " +
      "   EXECUTE IMMEDIATE (' " +
      "       CREATE TABLE datetest ( " +
      "           timestampcol TIMESTAMP, " +
      "           datecol DATE " +
      "       )" +
      "   '); " +
      "END; ";
    
    var date = new Date();
    
    before(function(done){
      oracledb.getConnection(credential, function(err, conn){
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    })
    
    after(function(done){
      connection.release( function(err){
        if(err) { console.error(err.message); return; }
        done();
      });
    })
    
    it('3.5.1 inserts and query DATE and TIMESTAMP columns', function(done){
      async.series([
        function(callback){  // create table
          connection.execute(
            script,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback){   // insert data
          connection.execute(
            "INSERT INTO datetest (timestampcol, datecol) VALUES (:ts, :td)",
            { ts: date, td: date },
            { autoCommit: false },
            function(err){
              should.not.exist(err);
              callback();
            }
          );          
        },
        function(callback){    // select data
          connection.execute(
            "SELECT timestampcol, datecol FROM datetest",
            function(err, result){
              should.not.exist(err);
              var ts = result.rows[0][0];
              ts.setDate(ts.getDate() + 5);
              // console.log(ts);
              
              var d = result.rows[0][1];
              d.setDate(d.getDate() - 5);
              // console.log(d);
              callback();
            }
          );
        },
        function(callback){
          connection.rollback( function(err){
            should.not.exist(err);
            callback();
          });
        },
        function(callback){
          connection.execute(
            "DROP TABLE datetest",
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
    
  })
  
  describe('3.6 rowlimit.js', function(){
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
      oracledb.getConnection(credential, function(err, conn){
        if(err) { console.error(err.message); return; }
        connection = conn;
        connection.execute(createTable, function(err){
          if(err) { console.error(err.message); return; }
          connection.execute(insertRows, function(err){
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
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      ); 
    })
    
    it('3.6.1 by default, the number is 100', function(done){
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
    
    it('3.6.2 can also specify for each execution', function(done){
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
  
  })
  
  describe('3.7 plsql.js', function(){
    var connection = false;
    
    before(function(done){
      oracledb.getConnection(credential, function(err, conn){
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    })
    
    after(function(done){
      connection.release( function(err){
        if(err) { console.error(err.message); return; }
        done();
      });
    })
    
    it('3.7.1 can call PL/SQL procedure and binding parameters in various ways', function(done){
      var proc = 
        "CREATE OR REPLACE PROCEDURE testproc (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER) \
           AS \
           BEGIN \
             p_inout := p_in || p_inout; \
             p_out := 101; \
           END; ";
      var bindVars = {
        i:  'Chris',  // bind type is determined from the data type
        io: { val: 'Jones', dir : oracledb.BIND_INOUT },
        o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
      }
      
      async.series([
        function(callback){
          connection.execute(
            proc, 
            function(err){
              should.not.exist(err);
              callback();
            }
          );             
        },
        function(callback){
          connection.execute(
            "BEGIN testproc(:i, :io, :o); END;",
            bindVars,
            function(err, result){
              should.not.exist(err);
              (result.outBinds.o).should.be.exactly(101);
              (result.outBinds.io).should.equal('ChrisJones');
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "DROP PROCEDURE testproc",
            function(err, result){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
    
    it('3.7.2 can call PL/SQL function', function(done) {
      var proc = 
        "CREATE OR REPLACE FUNCTION testfunc (p1_in IN VARCHAR2, p2_in IN VARCHAR2) RETURN VARCHAR2 \
           AS \
           BEGIN \
             return p1_in || p2_in; \
           END; ";
      var bindVars = {
        p1: 'Chris',
        p2: 'Jones',
        ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 }     
      };
      
      async.series([
        function(callback){
          connection.execute(
            proc, 
            function(err){
              should.not.exist(err);
              callback();
            }
          );             
        },
        function(callback){
          connection.execute(
            "BEGIN :ret := testfunc(:p1, :p2); END;",
            bindVars,
            function(err, result){
              should.not.exist(err);
              // console.log(result);
              (result.outBinds.ret).should.equal('ChrisJones');
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "DROP FUNCTION testfunc",
            function(err, result){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
  
  })
  
  describe('3.8 insert1.js', function(){
    var connection = false;
    var script =
      "BEGIN " +
      "   DECLARE " +
      "       e_table_exists EXCEPTION; " +
      "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
      "   BEGIN " +
      "       EXECUTE IMMEDIATE ('DROP TABLE test_insert'); " +
      "   EXCEPTION " +
      "       WHEN e_table_exists " +
      "       THEN NULL; " +
      "   END; " +
      "   EXECUTE IMMEDIATE (' " +
      "       CREATE TABLE test_insert ( " +
      "           id NUMBER,  " +
      "           name VARCHAR2(20) " +
      "       )" +
      "   '); " +
      "END; ";
      
    before(function(done){
      oracledb.getConnection(credential, function(err, conn){
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    })
    
    after(function(done){
      connection.release( function(err){
        if(err) { console.error(err.message); return; }
        done();
      });
    })
    
    it('3.8.1 creates a table and inserts data', function(done){
      async.series([
        function(callback){
          connection.execute(
            script,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "INSERT INTO test_insert VALUES (:id, :nm)",
            [1, 'Chris'],  // Bind values
            function(err, result){
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "INSERT INTO test_insert VALUES (:id, :nm)",
            [2, 'Alison'],  // Bind values
            function(err, result){
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "UPDATE test_insert SET name = 'Bambi'",
            function(err, result){
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(2);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "DROP TABLE test_insert",
            function(err){
              should.not.exist(err);
              callback();     
            }
          );
        }
      ], done);
    })
  })
  
  describe('3.9 insert2.js', function(){
    var conn1 = false;
    var conn2 = false;
    var script =
      "BEGIN " +
      "   DECLARE " +
      "       e_table_exists EXCEPTION; " +
      "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
      "   BEGIN " +
      "       EXECUTE IMMEDIATE ('DROP TABLE test_commit'); " +
      "   EXCEPTION " +
      "       WHEN e_table_exists " +
      "       THEN NULL; " +
      "   END; " +
      "   EXECUTE IMMEDIATE (' " +
      "       CREATE TABLE test_commit ( " +
      "           id NUMBER,  " +
      "           name VARCHAR2(20) " +
      "       )" +
      "   '); " +
      "END; ";
    
    before(function(done){
      oracledb.getConnection(credential, function(err, conn){
        if(err) { console.error(err.message); return; }
        conn1 = conn;
        oracledb.getConnection(credential, function(err, conn){
          if(err) { console.error(err.message); return; }
          conn2 = conn;
          done();
        });
      });
    })
    
    after(function(done){
      conn1.release( function(err){
        if(err) { console.error(err.message); return; }
        conn2.release( function(err){
          if(err) { console.error(err.message); return; }
          done();         
        });
      });
    })
    
    it('3.9.1 tests the auto commit behavior', function(done){
      async.series([
        function(callback){
          conn1.execute(
            script,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback){
          conn1.execute(
            "INSERT INTO test_commit VALUES (:id, :nm)",
            [1, 'Chris'],  // Bind values
            { autoCommit: true },
            function(err, result){
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
              callback();
            }
          );
        },
        function(callback){
          conn1.execute(
            "INSERT INTO test_commit VALUES (:id, :nm)",
            [2, 'Alison'],  // Bind values
            // { autoCommit: true },
            function(err, result){
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
              callback();
            }
          );
        },
        function(callback){
          conn2.execute(
            "SELECT * FROM test_commit",
            function(err, result){
              should.not.exist(err);
              // This will only show 'Chris' because inserting 'Alison' is not commited by default.
              // Uncomment the autoCommit option above and you will see both rows
              // console.log(result.rows);
              (result.rows).should.eql([ [ 1, 'Chris' ] ]);
              callback();
            }
          );
        },
        function(callback){
          conn1.execute(
            "DROP TABLE test_commit",
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
        
    })
  })
  
  describe('3.10 resultset.js', function() {
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
          FOR i IN 1..207 LOOP \
             x := x + 1; \
             n := 'staff ' || x; \
             INSERT INTO oracledb_employees VALUES (x, n); \
          END LOOP; \
       END; ";
    
    before(function(done){
      oracledb.getConnection(credential, function(err, conn){
        if(err) { console.error(err.message); return; }
        connection = conn;
        connection.execute(createTable, function(err){
          if(err) { console.error(err.message); return; }
          connection.execute(insertRows, function(err){
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
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      ); 
    })

    it('3.10.1 resultset1.js - getRow() function', function(done) {
      connection.should.be.ok;
      var rowCount = 1;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 50 },
        function(err, result) {
          should.not.exist(err);
          (result.resultSet.metaData[0]).name.should.eql('EMPLOYEES_NAME');
          fetchRowFromRS(connection, result.resultSet);
        }
      );
      
      function fetchRowFromRS(connection, rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          
          if(row) {
            // console.log(row);
            row[0].should.be.exactly('staff ' + rowCount);
            rowCount++;
            return fetchRowFromRS(connection, rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          }
        });
      }
    })
    
    it('3.10.2 resultset2.js - getRows() function', function(done) {
      connection.should.be.ok;
      var numRows = 10;  // number of rows to return from each call to getRows()
      
      connection.execute(
        "SELECT * FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 110 },
        function(err, result) {
          should.not.exist(err);
          (result.resultSet.metaData[0]).name.should.eql('EMPLOYEES_ID');
          (result.resultSet.metaData[1]).name.should.eql('EMPLOYEES_NAME');
          fetchRowsFromRS(connection, result.resultSet);
        }
      );
      
      function fetchRowsFromRS(conn, rs) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          if(rows.length > 0) {
            //console.log("length of rows " + rows.length);
            //for(var i = 0; i < rows.length; i++) 
            //  console.log(rows[i]);
  
            return fetchRowsFromRS(conn, rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          }
        });
      }
    })
      
  })
  
  describe('3.11 refcursor.js', function() {
    var connection = false;
    var script = 
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
                    name VARCHAR2(40),  \
                    salary NUMBER, \
                    hire_date DATE \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   (name, salary, hire_date) VALUES \
                   (''Steven'',24000, TO_DATE(''20030617'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   (name, salary, hire_date) VALUES \
                   (''Neena'',17000, TO_DATE(''20050921'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   (name, salary, hire_date) VALUES \
                   (''Lex'',17000, TO_DATE(''20010112'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   (name, salary, hire_date) VALUES \
                   (''Nancy'',12008, TO_DATE(''20020817'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   (name, salary, hire_date) VALUES \
                   (''Karen'',14000, TO_DATE(''20050104'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_employees  \
                   (name, salary, hire_date) VALUES \
                   (''Peter'',9000, TO_DATE(''20100525'', ''yyyymmdd'')) \
            '); \
        END; ";
        
    var proc = 
        "CREATE OR REPLACE PROCEDURE get_emp_rs (p_sal IN NUMBER, p_recordset OUT SYS_REFCURSOR) \
           AS \
           BEGIN \
             OPEN p_recordset FOR  \
               SELECT * FROM oracledb_employees \
               WHERE salary > p_sal; \
           END; ";
           
    before(function(done){
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
          connection.execute(
            script,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
    
    after(function(done){
      connection.execute(
        'DROP TABLE oracledb_employees',
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      ); 
    })
    
    it('3.11.1 REF CURSOR', function(done) {
      connection.should.be.ok;
      var numRows = 100;  // number of rows to return from each call to getRows()
      
      connection.execute(
        "BEGIN get_emp_rs(:sal, :cursor); END;",
        {
          sal: 12000, 
          cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);
          result.outBinds.cursor.metaData[0].name.should.eql('NAME');
          result.outBinds.cursor.metaData[1].name.should.eql('SALARY');
          result.outBinds.cursor.metaData[2].name.should.eql('HIRE_DATE');
          fetchRowsFromRS(result.outBinds.cursor);
        }
      );
      
      function fetchRowsFromRS(resultSet) {
        resultSet.getRows(
          numRows,
          function(err, rows) {
            should.not.exist(err);
            if(rows.length > 0) {
              // console.log("fetchRowsFromRS(): Got " + rows.length + " rows");
              // console.log(rows);
              rows.length.should.be.exactly(5);
              fetchRowsFromRS(resultSet);
            } else {
              resultSet.close( function(err) {
                should.not.exist(err);
                done();
              });
            }
          }
        );
      }
    })
  })
  
})
