/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   Test the example programs in examples/ directory.
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
var dbConfig = require('./dbconfig.js');

describe('3. examples.js', function() {

  describe('3.1 connect.js', function() {
    it('3.1.1 tests a basic connection to the database', function(done){
      oracledb.getConnection(
        dbConfig,
        function(err, connection){
          should.not.exist(err);
          connection.should.be.ok();
          connection.release( function(err){
            should.not.exist(err);
            done();
          });
        });
    });
  }); // 3.1

  describe('3.2 version.js', function(){
    it('3.2.1 shows the node-oracledb version attributes', function(done){

      var addonVer, clientVer, serverVer;

      addonVer = oracledb.version;
      (addonVer).should.be.a.Number();
      (addonVer).should.be.greaterThan(0);

      clientVer = oracledb.oracleClientVersion;
      (clientVer).should.be.a.Number();
      (clientVer).should.be.greaterThan(0);

      oracledb.getConnection(
        dbConfig,
        function(err, connection) {
          should.not.exist(err);

          serverVer = connection.oracleServerVersion;
          (serverVer).should.be.a.Number();

          connection.close(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );

    });
  });

  describe('3.3 select1.js & select2.js', function(){
    var connection = false;

    before(function(done){
      oracledb.getConnection(
        dbConfig,
        function(err, conn) {
          should.not.exist(err);
          connection = conn;
          done();
        }
      );
    });

    after(function(done){
      connection.close(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('3.3.1. execute a basic query', function(done){
      var script1 =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_dept PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_eg_dept ( \
                    department_id NUMBER,  \
                    department_name VARCHAR2(20) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_dept  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_dept  \
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
            + "FROM nodb_eg_dept "
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

    });

    it('3.3.2. execute queries to show array and object formats', function(done){
      var script2 =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_locations PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_locations ( \
                    location_id NUMBER,  \
                    city VARCHAR2(20) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_locations  \
                   (location_id, city) VALUES \
                   (9999,''Shenzhen'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_locations  \
                   (location_id, city) VALUES \
                   (2300, ''Singapore'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_locations  \
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
            + "FROM nodb_locations "
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
            + "FROM nodb_locations "
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

    });

  });

  /* Oracle Database 12.1.0.2 has extensive JSON datatype support */
  describe('3.4 selectjson.js - 12.1.0.2 feature', function(){

    var connection = null;
    var testData = { "userId": 1, "userName": "Chris", "location": "Australia" };
    var featureAvailable = true;

    before(function(done) {
      async.series([
        function(cb) {
          oracledb.getConnection(dbConfig, function(err, conn) {
            should.not.exist(err);
            connection = conn;
            if (connection.oracleServerVersion < 1201000200)
              featureAvailable = false;

            cb();
          });
        },
        function createTable(cb) {
          if (!featureAvailable) {
            cb();
          } else {
            var sql = "BEGIN \n" +
                      "   DECLARE \n" +
                      "       e_table_missing EXCEPTION; \n" +
                      "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                      "   BEGIN \n" +
                      "       EXECUTE IMMEDIATE ('DROP TABLE nodb_purchaseorder PURGE'); \n" +
                      "   EXCEPTION \n" +
                      "       WHEN e_table_missing \n" +
                      "       THEN NULL; \n" +
                      "   END; \n" +
                      "   EXECUTE IMMEDIATE (' \n" +
                      "       CREATE TABLE nodb_purchaseorder ( \n" +
                      "           po_document VARCHAR2(4000) CONSTRAINT ensure_json CHECK (po_document IS JSON) \n" +
                      "       ) \n" +
                      "   '); \n" +
                      "END; ";
            connection.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          }
        },
        function insertData(cb) {
          if (!featureAvailable) {
            cb();
          } else {
            var s = JSON.stringify(testData);
            var sql = "INSERT INTO nodb_purchaseorder (po_document) VALUES (:bv)";
            connection.execute(
              sql,
              [s],
              function(err, result) {
                should.not.exist(err);
                should.exist(result);
                should.strictEqual(result.rowsAffected, 1);
                cb();
              }
            );
          }
        }
      ], done);
    }); // before

    after(function(done) {
      async.series([
        function(cb) {
          if (!featureAvailable) {
            cb();
          } else {
            var sql = "DROP TABLE nodb_purchaseorder PURGE";
            connection.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          }
        },
        function(cb) {
          connection.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }); // after

    it('3.4.1 Selecting JSON stored in a VARCHAR2 column', function(done) {

      if (!featureAvailable) {
        done();
      } else {
        var sql = "SELECT po_document FROM nodb_purchaseorder WHERE JSON_EXISTS (po_document, '$.location')";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var js = JSON.parse(result.rows[0][0]);  // just show first record
            //console.log('Query results: ', js);
            should.deepEqual(js, testData);
            done();
          }
        );
      }
    });

    it('3.4.2 Using JSON_VALUE to extract a value from a JSON column', function(done) {

      if (!featureAvailable) {
        done();
      } else {
        var sql = "SELECT JSON_VALUE(po_document, '$.location') FROM nodb_purchaseorder";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            //console.log('Query results: ', result.rows[0][0]);
            should.strictEqual(result.rows[0][0], "Australia");
            done();
          }
        );
      }
    });

    it('3.4.3 Using JSON_OBJECT to extract relational data as JSON', function(done) {
      // JSON_OBJECT is new in Oracle Database 12.2
      if (connection.oracleServerVersion < 1202000000) {
        done();
      } else {
        var sql = "SELECT JSON_OBJECT ('doc' IS d.po_document) department \n" +
                  "FROM nodb_purchaseorder d";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            //console.log(result.rows[0][0]);
            var js = JSON.parse(result.rows[0][0]);
            should.deepEqual(js.doc, testData);
            done();
          }
        );
      }
    });

  });

  describe('3.5 date.js', function() {

    it('3.5.1 inserts and query DATE and TIMESTAMP columns', function(done){
      var conn = null;

      var doConnect = function(cb) {
        oracledb.getConnection(
          dbConfig,
          function(err, connection) {
            should.not.exist(err);
            conn = connection;
            cb();
          }
        );
      };

      var doRelease = function(cb) {
        conn.close( function(err) {
          should.not.exist(err);
          cb();
        });
      };

      var doCreateTable = function(cb) {

        var sql = "BEGIN \n" +
                  "   DECLARE \n" +
                  "       e_table_missing EXCEPTION; \n" +
                  "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                  "   BEGIN \n" +
                  "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_testdate PURGE'); \n" +
                  "   EXCEPTION \n" +
                  "       WHEN e_table_missing \n" +
                  "       THEN NULL; \n" +
                  "   END; \n" +
                  "   EXECUTE IMMEDIATE (' \n" +
                  "       CREATE TABLE nodb_eg_testdate ( \n" +
                  "           timestampcol TIMESTAMP, \n" +
                  "           datecol DATE \n" +
                  "       ) \n" +
                  "   '); \n" +
                  "END; \n";

        conn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function(cb) {
        var sql = "DROP TABLE nodb_eg_testdate PURGE";
        conn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      // Setting a local timezone in applications is recommended.
      // Note setting the environment variable ORA_SDTZ is an efficient alternative.
      var doAlter = function(cb) {
        //console.log('Altering session time zone');
        conn.execute(
          "ALTER SESSION SET TIME_ZONE='UTC'",
          function(err) {
            should.not.exist(err);
            cb();
          });
      };

      var doInsert = function(cb) {
        var date = new Date();
        //console.log("Inserting JavaScript date: " + date);

        var sql = "INSERT INTO nodb_eg_testdate (timestampcol, datecol) VALUES (:ts, :td)";
        conn.execute(
          sql,
          { ts: date, td: date },
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, 1);
            cb();
          }
        );
      };

      var doselect = function(cb) {
        var sql = "SELECT timestampcol, datecol FROM nodb_eg_testdate";
        conn.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            //console.log("Query Results:");
            //console.log(result.rows);

            // Show the queried dates are of type Date
            //console.log("Result Manipulation in JavaScript:");
            var ts = result.rows[0][0];
            ts.setDate(ts.getDate() + 5);
            //console.log(ts);

            var d = result.rows[0][1];
            d.setDate(d.getDate() - 5);
            //console.log(d);

            cb();
          }
        );
      };

      async.series([
        doConnect,
        doCreateTable,
        doInsert,
        doselect,
        doAlter,
        doselect,
        doDropTable,
        doRelease
      ], done);
    });

  });

  describe('3.6 rowlimit.js', function() {

    it("3.6.1 shows ways to limit the number of records fetched by queries", function(done) {

      var conn;
      var doConnect = function(cb) {
        oracledb.getConnection(
          dbConfig,
          function(err, connection) {
            should.not.exist(err);
            conn = connection;
            cb();
          }
        );
      };

      var doRelease = function(cb) {
        conn.close( function(err) {
          should.not.exist(err);
          cb();
        });
      };

      var doCreateTable = function(cb) {
        var sql = "BEGIN \n" +
                  "   DECLARE \n" +
                  "       e_table_missing EXCEPTION; \n" +
                  "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                  "   BEGIN \n" +
                  "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_emp6 PURGE'); \n" +
                  "   EXCEPTION \n" +
                  "       WHEN e_table_missing \n" +
                  "       THEN NULL; \n" +
                  "   END; \n" +
                  "   EXECUTE IMMEDIATE (' \n" +
                  "       CREATE TABLE nodb_eg_emp6 ( \n" +
                  "           id NUMBER, \n" +
                  "           name VARCHAR2(20) \n" +
                  "       ) \n" +
                  "   '); \n" +
                  "END; \n";

        conn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function(cb) {
        var sql = "DROP TABLE nodb_eg_emp6 PURGE";
        conn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function(cb) {
        var sql = "DECLARE \n" +
                  "    x NUMBER := 0; \n" +
                  "    n VARCHAR2(20); \n" +
                  "BEGIN \n" +
                  "    FOR i IN 1..107 LOOP \n" +
                  "        x := x +1; \n" +
                  "        n := 'staff ' || x; \n" +
                  "        INSERT INTO nodb_eg_emp6 VALUES (x, n); \n" +
                  "    END LOOP; \n" +
                  "END; ";
        conn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doSelect = function(cb) {

        var myoffset     = 2;  // number of rows to skip
        var mymaxnumrows = 6;  // number of rows to fetch

        var sql = "SELECT id, name FROM nodb_eg_emp6 ORDER BY id";
        if (conn.oracleServerVersion >= 1201000000) {
          // 12c row-limiting syntax
          sql += " OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY";
        } else {
          // Pre-12c syntax [could also customize the original query and use row_number()]
          sql = "SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM"
              + "(" + sql + ") A "
              + "WHERE ROWNUM <= :maxnumrows + :offset) WHERE MY_RNUM > :offset";
        }

        conn.execute(
          sql,
          { offset: myoffset, maxnumrows: mymaxnumrows },
          { maxRows: 25 },
          function(err, result) {
            should.not.exist(err);
            //console.log("Executed: " + sql);
            //console.log("Number of rows returned: " + result.rows.length);
            //console.log(result.rows);

            should.strictEqual(result.rows.length, 6);
            should.deepEqual(
              result.rows,
              [ [ 3, 'staff 3' ],
                [ 4, 'staff 4' ],
                [ 5, 'staff 5' ],
                [ 6, 'staff 6' ],
                [ 7, 'staff 7' ],
                [ 8, 'staff 8' ] ]
            );
            cb();
          }
        );

      };

      async.series([
        doConnect,
        doCreateTable,
        doInsert,
        doSelect,
        doDropTable,
        doRelease
      ], done);

    }); // 3.6.1
  }); // 3.6

  describe('3.7 plsqlproc.js and plsqlfun.js', function(){

    var connection = false;

    before(function(done){
      oracledb.getConnection(dbConfig, function(err, conn){
        should.not.exist(err);
        connection = conn;
        done();
      });
    });

    after(function(done){
      connection.release( function(err){
        should.not.exist(err);
        done();
      });
    });

    it('3.7.1 calling PL/SQL procedure and binding parameters in various ways', function(done){

      var proc = "CREATE OR REPLACE PROCEDURE nodb_eg_proc7 (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER) \n" +
                 "    AS \n" +
                 "    BEGIN \n" +
                 "        p_inout := p_in || p_inout; \n" +
                 "        p_out := 101; \n" +
                 "    END; ";
      var bindVars = {
        i:  'Chris',  // bind type is determined from the data type
        io: { val: 'Jones', dir : oracledb.BIND_INOUT },
        o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
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
            "BEGIN nodb_eg_proc7(:i, :io, :o); END;",
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
            "DROP PROCEDURE nodb_eg_proc7",
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('3.7.2 calling PL/SQL function', function(done) {

      var proc = "CREATE OR REPLACE FUNCTION nodb_eg_func7 (p1_in IN VARCHAR2, p2_in IN VARCHAR2) RETURN VARCHAR2 \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "   return p1_in || p2_in; \n" +
                 "END; ";
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
            "BEGIN :ret := nodb_eg_func7(:p1, :p2); END;",
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
            "DROP FUNCTION nodb_eg_func7",
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

  });

  describe('3.8 insert1.js', function(){
    var connection = false;
    var script =
      "BEGIN " +
      "   DECLARE " +
      "       e_table_missing EXCEPTION; " +
      "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
      "   BEGIN " +
      "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_insert8 PURGE'); " +
      "   EXCEPTION " +
      "       WHEN e_table_missing " +
      "       THEN NULL; " +
      "   END; " +
      "   EXECUTE IMMEDIATE (' " +
      "       CREATE TABLE nodb_eg_insert8 ( " +
      "           id NUMBER,  " +
      "           name VARCHAR2(20) " +
      "       )" +
      "   '); " +
      "END; ";

    before(function(done){
      oracledb.getConnection(dbConfig, function(err, conn){
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    });

    after(function(done){
      connection.release( function(err){
        if(err) { console.error(err.message); return; }
        done();
      });
    });

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
            "INSERT INTO nodb_eg_insert8 VALUES (:id, :nm)",
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
            "INSERT INTO nodb_eg_insert8 VALUES (:id, :nm)",
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
            "UPDATE nodb_eg_insert8 SET name = 'Bambi'",
            function(err, result){
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(2);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "DROP TABLE nodb_eg_insert8 PURGE",
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });
  });

  describe('3.9 insert2.js', function(){
    var conn1 = false;
    var conn2 = false;
    var script =
      "BEGIN " +
      "   DECLARE " +
      "       e_table_missing EXCEPTION; " +
      "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
      "   BEGIN " +
      "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_commit9 PURGE'); " +
      "   EXCEPTION " +
      "       WHEN e_table_missing " +
      "       THEN NULL; " +
      "   END; " +
      "   EXECUTE IMMEDIATE (' " +
      "       CREATE TABLE nodb_eg_commit9 ( " +
      "           id NUMBER,  " +
      "           name VARCHAR2(20) " +
      "       )" +
      "   '); " +
      "END; ";

    before(function(done){
      oracledb.getConnection(dbConfig, function(err, conn){
        if(err) { console.error(err.message); return; }
        conn1 = conn;
        oracledb.getConnection(dbConfig, function(err, conn){
          if(err) { console.error(err.message); return; }
          conn2 = conn;
          done();
        });
      });
    });

    after(function(done){
      conn1.release( function(err){
        if(err) { console.error(err.message); return; }
        conn2.release( function(err){
          if(err) { console.error(err.message); return; }
          done();
        });
      });
    });

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
            "INSERT INTO nodb_eg_commit9 VALUES (:id, :nm)",
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
            "INSERT INTO nodb_eg_commit9 VALUES (:id, :nm)",
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
            "SELECT * FROM nodb_eg_commit9  ORDER BY id",
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
            "DROP TABLE nodb_eg_commit9 PURGE",
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);

    });
  });

  describe('3.10 resultset.js', function() {
    var connection = false;

    var createTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_emp10 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_eg_emp10 ( \
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
             INSERT INTO nodb_eg_emp10 VALUES (x, n); \
          END LOOP; \
       END; ";

    before(function(done){
      oracledb.getConnection(dbConfig, function(err, conn){
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
    });

    after(function(done){
      connection.execute(
        'DROP TABLE nodb_eg_emp10 PURGE',
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    });

    it('3.10.1 resultset1.js - getRow() function', function(done) {
      connection.should.be.ok();
      var rowCount = 1;

      connection.execute(
        "SELECT employees_name FROM nodb_eg_emp10",
        [],
        { resultSet: true, fetchArraySize: 50 },
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
    });

    it('3.10.2 resultset2.js - getRows() function', function(done) {
      connection.should.be.ok();
      var numRows = 10;  // number of rows to return from each call to getRows()

      connection.execute(
        "SELECT * FROM nodb_eg_emp10 ORDER BY employees_id",
        [],
        { resultSet: true, fetchArraySize: 110 },
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
    });

  });

  describe('3.11 refcursor.js', function() {
    var connection = false;
    var script =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_emp11 PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_eg_emp11 ( \
                    name VARCHAR2(40),  \
                    salary NUMBER, \
                    hire_date DATE \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Steven'',24000, TO_DATE(''20030617'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Neena'',17000, TO_DATE(''20050921'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Lex'',17000, TO_DATE(''20010112'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Nancy'',12008, TO_DATE(''20020817'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Karen'',14000, TO_DATE(''20050104'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Peter'',9000, TO_DATE(''20100525'', ''yyyymmdd'')) \
            '); \
        END; ";

    var proc =
        "CREATE OR REPLACE PROCEDURE get_emp_rs11 (p_sal IN NUMBER, p_recordset OUT SYS_REFCURSOR) \
           AS \
           BEGIN \
             OPEN p_recordset FOR  \
               SELECT * FROM nodb_eg_emp11\
               WHERE salary > p_sal; \
           END; ";

    before(function(done){
      async.series([
        function(callback) {
          oracledb.getConnection(
            dbConfig,
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
    });

    after(function(done){

      async.series([
        function(cb) {
          connection.execute(
            "DROP PROCEDURE get_emp_rs11",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            'DROP TABLE nodb_eg_emp11 PURGE',
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.release( function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);

    }); // after

    it('3.11.1 REF CURSOR', function(done) {
      connection.should.be.ok();
      var numRows = 100;  // number of rows to return from each call to getRows()

      connection.execute(
        "BEGIN get_emp_rs11(:sal, :cursor); END;",
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
    });
  });

});
