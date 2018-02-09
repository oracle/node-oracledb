/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   55. resultSet2.js
 *
 * DESCRIPTION
 *   Testing driver resultSet feature.
 *
 *****************************************************************************/
"use strict";

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('55. resultSet2.js', function() {

  var connection = null;
  var tableName = "nodb_rs2_emp";
  var rowsAmount = 300;

  before('get one connection', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
      }
    );
  });

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('55.1 query a RDBMS function', function() {

    it('55.1.1 LPAD function', function(done) {
      connection.should.be.ok();
      connection.execute(
        "select lpad('a',100,'x') from dual",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet);
        }
      );

      function fetchRowFromRS(rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            // console.log(row);
            row[0].length.should.be.exactly(100);
            return fetchRowFromRS(rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          }
        });
      }
    });
  }); // 55.1

  describe('55.2 binding variables', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    it('55.2.1 query with one binding variable', function(done) {
      connection.should.be.ok();
      var rowCount = 0;
      connection.execute(
        "SELECT * FROM nodb_rs2_emp WHERE employees_id > :1",
        [200],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result.resultSet);
          fetchRowFromRS(result.resultSet);
        }
      );

      function fetchRowFromRS(rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            rowCount++;
            return fetchRowFromRS(rs);
          } else {
            rs.close(function(err) {
              rowCount.should.be.exactly(100);
              should.not.exist(err);
              done();
            });
          }
        });
      }
    });

  });

  describe('55.3 alternating getRow() & getRows() function', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    it('55.3.1 result set', function(done) {
      connection.should.be.ok();
      var accessCount = 0;
      var numRows = 4;
      var flag = 1; // 1 - getRow(); 2 - getRows(); 3 - to close resultSet.
      connection.execute(
        "SELECT * FROM nodb_rs2_emp WHERE employees_id > :1",
        [200],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result.resultSet);
          fetchRowFromRS(result.resultSet);
        }
      );

      function fetchRowFromRS(rs) {
        if(flag === 1) {
          rs.getRow(function(err, row) {
            should.not.exist(err);
            if(row) {
              flag = 2;
              accessCount++;
              return fetchRowFromRS(rs);
            } else {
              flag = 3;
              return fetchRowFromRS(rs);
            }
          });
        }
        else if(flag === 2) {
          rs.getRows(numRows, function(err, rows) {
            should.not.exist(err);
            if(rows.length > 0) {
              flag = 1;
              accessCount++;
              return fetchRowFromRS(rs);
            } else {
              flag = 3;
              return fetchRowFromRS(rs);
            }
          });
        }
        else if(flag === 3) {
          // console.log("resultSet is empty!");
          rs.close(function(err) {
            should.not.exist(err);
            // console.log("Total access count is " + accessCount);
            accessCount.should.be.exactly((100/(numRows + 1)) * 2);
            done();
          });
        }
      }
    });

    it('55.3.2 REF Cursor', function(done) {
      connection.should.be.ok();
      var accessCount = 0;
      var numRows = 4;
      var flag = 1; // 1 - getRow(); 2 - getRows(); 3 - to close resultSet.

      connection.execute(
        "BEGIN nodb_rs2_get_emp(:in, :out); END;",
        {
          in: 200,
          out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.outBinds.out, done);
        }
      );

      function fetchRowFromRS(rs, cb) {
        if(flag === 1) {
          rs.getRow(function(err, row) {
            should.not.exist(err);
            if(row) {
              flag = 2;
              accessCount++;
              return fetchRowFromRS(rs, cb);
            } else {
              flag = 3;
              return fetchRowFromRS(rs, cb);
            }
          });
        }
        else if(flag === 2) {
          rs.getRows(numRows, function(err, rows) {
            should.not.exist(err);
            if(rows.length > 0) {
              flag = 1;
              accessCount++;
              return fetchRowFromRS(rs, cb);
            } else {
              flag = 3;
              return fetchRowFromRS(rs, cb);
            }
          });
        }
        else if(flag === 3) {
          // console.log("resultSet is empty!");
          rs.close(function(err) {
            should.not.exist(err);
            // console.log("Total access count is " + accessCount);
            accessCount.should.be.exactly((100/(numRows + 1)) * 2);
            cb();
          });
        }
      }
    });
  });

  describe('55.4 automatically close result sets and LOBs when the connection is closed', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    var testConn = null;
    beforeEach(function(done) {
      oracledb.getConnection(
        dbConfig,
        function(err, conn) {
          should.not.exist(err);
          testConn = conn;
          done();
        }
      );
    });

    function fetchRowFromRS(rs, cb) {

      rs.getRow(function(err, row) {
        if(row) {
          return fetchRowFromRS(rs, cb);
        } else {
          testConn.release(function(err) {
            should.not.exist(err);
            rs.close(function(err) {
              should.exist(err);
              should.strictEqual(
                err.message,
                "NJS-018: invalid ResultSet"
              );
              cb();
            });
          });
        }
      });
    }

    it('55.4.1 resultSet gets closed automatically', function(done) {
      testConn.should.be.ok();
      testConn.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, done);
        }
      );
    });

    it('55.4.2 REF Cursor gets closed automatically', function(done) {
      testConn.should.be.ok();
      testConn.execute(
        "BEGIN nodb_rs2_get_emp(:in, :out); END;",
        {
          in: 200,
          out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.outBinds.out, done);
        }
      );
    });
  });

  describe('55.5 the content of resultSet should be consistent', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    it('55.5.1 (1) get RS (2) modify data in that table and commit (3) check RS', function(done) {
      connection.should.be.ok();
      var rowsCount = 0;
      var rs = false;
      async.series([
        function(callback) {
          connection.execute(
            "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              rs = result.resultSet;
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "TRUNCATE TABLE nodb_rs2_emp",
            [],
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          fetchRowFromRS(rs, callback);
        }
      ], done);

      function fetchRowFromRS(rset, cb) {
        rset.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            rowsCount++;
            return fetchRowFromRS(rset, cb);
          } else {
            rset.close(function(err) {
              should.not.exist(err);
              rowsCount.should.eql(rowsAmount);
              cb();
            });
          }
        });
      }

    });

  });

  describe('55.6 access resultSet simultaneously', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    function fetchRowsFromRS(resultset, callback) {

      var numRows = 10;  // number of rows to return from each call to getRows()
      resultset.getRows(numRows, function(err, rows) {
        if(err) {
          return callback(err);
        } else {
          if(rows.length > 0) {
            return fetchRowsFromRS(resultset, callback);
          } else {
            return resultset.close(callback);
          }
        }
      });

    }

    it('55.6.1 concurrent operations on resultSet are not allowed', function(done) {

      var rset;
      async.series([
        function(cb) {
          connection.execute(
            "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              rset = result.resultSet;
              cb();
            }
          );
        },
        function(cb) {
          async.parallel([
            function(callback) {
              fetchRowsFromRS(rset, callback);
            },
            function(callback) {
              fetchRowsFromRS(rset, callback);
            }
          ],
          function(err) {
            should.exist(err);
            (err.message).should.startWith('NJS-017:');
            // NJS-017: concurrent operations on ResultSet are not allowed

            cb();
          });
        }
      ], done);

    });

    it('55.6.2 concurrent operation on REF Cursor are not allowed', function(done) {

      var rcur;
      async.series([
        function(cb) {
          connection.execute(
            "BEGIN nodb_rs2_get_emp(:in, :out); END;",
            {
              in: 0,
              out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            },
            function(err, result) {
              should.not.exist(err);
              rcur = result.outBinds.out;
              return cb();
            }
          );
        },
        function(cb) {
          async.parallel([
            function(callback) {
              fetchRowsFromRS(rcur, callback);
            },
            function(callback) {
              fetchRowsFromRS(rcur, callback);
            }
          ],
          function(err) {
            should.exist(err);
            (err.message).should.startWith('NJS-017:');
            // NJS-017: concurrent operations on ResultSet are not allowed

            cb();
          });
        }
      ], done);

    });

  });

  describe('55.7 getting multiple resultSets', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    var numRows = 10;  // number of rows to return from each call to getRows()

    function fetchRowFromRS(rs, cb) {
      rs.getRow(function(err, row) {
        should.not.exist(err);
        if(row) {
          return fetchRowFromRS(rs, cb);
        } else {
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    function fetchRowsFromRS(rs, cb) {
      rs.getRows(numRows, function(err, rows) {
        should.not.exist(err);
        if(rows.length > 0) {
          return fetchRowsFromRS(rs, cb);
        } else {
          rs.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      });
    }

    it('55.7.1 can access multiple resultSet on one connection', function(done) {
      connection.should.be.ok();
      async.parallel([
        function(callback) {
          connection.execute(
            "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              fetchRowFromRS(result.resultSet, callback);
            }
          );
        },
        function(callback) {
          connection.execute(
            "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              fetchRowsFromRS(result.resultSet, callback);
            }
          );
        }
      ], function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('55.7.2 can access multiple REF Cursor', function(done) {
      connection.should.be.ok();

      async.parallel([
        function(callback) {
          connection.execute(
            "BEGIN nodb_rs2_get_emp(:in, :out); END;",
            {
              in: 200,
              out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            },
            function(err, result) {
              should.not.exist(err);
              fetchRowFromRS(result.outBinds.out, callback);
            }
          );
        },
        function(callback) {
          connection.execute(
            "BEGIN nodb_rs2_get_emp(:in, :out); END;",
            {
              in: 100,
              out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            },
            function(err, result) {
              should.not.exist(err);
              fetchRowsFromRS(result.outBinds.out, callback);
            }
          );
        }
      ], function(err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('55.8 Negative - resultSet is only for query statement', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    it('55.8.1 resultSet cannot be returned for non-query statements', function(done) {
      connection.should.be.ok();
      connection.execute(
        "UPDATE nodb_rs2_emp SET employees_name = 'Alan' WHERE employees_id = 100",
        [],
        { resultSet: true },
        function(err) {
          should.exist(err);
          // console.log(err);
          err.message.should.startWith('NJS-019:');
          done();
        }
      );

    });
  });

  describe('55.9 test querying a PL/SQL function', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    it('55.9.1 ', function(done) {
      var proc =
        "CREATE OR REPLACE FUNCTION nodb_rs2_testfunc RETURN VARCHAR2 \
           IS \
             emp_name VARCHAR2(20);   \
           BEGIN \
             SELECT 'Clark Kent' INTO emp_name FROM dual; \
             RETURN emp_name;  \
           END; ";

      async.series([
        function(callback) {
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "SELECT nodb_rs2_testfunc FROM dual",
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              (result.resultSet.metaData[0].name).should.eql('NODB_RS2_TESTFUNC');
              fetchRowFromRS(result.resultSet, callback);
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP FUNCTION nodb_rs2_testfunc",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);

      function fetchRowFromRS(rs, cb) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            row[0].should.eql('Clark Kent');
            return fetchRowFromRS(rs, cb);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              cb();
            });
          }
        });
      }
    });
  });

  describe('55.10 calls getRows() once and then close RS before getting more rows', function() {
    before(function(done){
      setUp(connection, tableName, done);
    });

    after(function(done) {
      clearUp(connection, tableName, done);
    });

    it('55.10.1 ', function(done) {
      connection.should.be.ok();
      var numRows = 10;

      connection.execute(
        "SELECT * FROM nodb_rs2_emp ORDER BY employees_id",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          result.resultSet.getRows(
            numRows,
            function(err) {
              should.not.exist(err);
              result.resultSet.close(function(err) {
                should.not.exist(err);
                fetchRowsFromRS(result.resultSet, numRows, done);
              });
            }
          );
        }
      );

      function fetchRowsFromRS(rs, numRows, done) {
        rs.getRows(numRows, function(err) {
          should.exist(err);
          err.message.should.startWith('NJS-018:'); // invalid result set
          done();
        });
      }
    });
  });

  describe('55.11 result set with unsupported data types', function() {
    it('55.11.1 INTERVAL YEAR TO MONTH data type', function(done) {
      connection.execute(
        "SELECT dummy, to_yminterval('1-3') FROM dual",
        [],
        { resultSet: true },
        function(err, result) {
          should.strictEqual(
            err.message,
            "NJS-010: unsupported data type 2016 in column 2"
          );
          should.not.exist(result);
          done();
        }
      );
    });

  }); // 55.11

  describe('55.12 bind a cursor BIND_INOUT', function() {

    before('prepare table nodb_rs2_emp', function(done) {
      setUp(connection, tableName, done);
    });

    after('drop table', function(done) {
      clearUp(connection, tableName, done);
    });

    it('55.12.1 has not supported binding a cursor with BIND_INOUT', function(done) {
      var proc =
          "CREATE OR REPLACE PROCEDURE nodb_rs2_get_emp_inout (p_in IN NUMBER, p_out IN OUT SYS_REFCURSOR) \
             AS \
             BEGIN \
               OPEN p_out FOR  \
                 SELECT * FROM nodb_rs2_emp \
                 WHERE employees_id > p_in; \
             END; ";

      async.series([
        function(callback) {
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "BEGIN nodb_rs2_get_emp_inout(:in, :out); END;",
            {
              in: 200,
              out: { type: oracledb.CURSOR, dir: oracledb.BIND_INOUT }
            },
            function(err) {
              should.exist(err);
              (err.message).should.startWith('NJS-007:');
              // NJS-007: invalid value for "type" in parameter 2
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PROCEDURE nodb_rs2_get_emp_inout",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

  }); // 55.12

  describe('55.13 Invalid Ref Cursor', function() {
    var proc =
      "CREATE OR REPLACE PROCEDURE get_invalid_refcur ( p OUT SYS_REFCURSOR) " +
      "  AS " +
      "  BEGIN " +
      "    NULL; " +
      "  END;";

    before(function(done){
      async.series([
        function(callback) {
          setUp(connection, tableName, callback);
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

    after(function(done) {
      async.series([
        function(callback) {
          connection.execute(
            "DROP PROCEDURE get_invalid_refcur",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          clearUp(connection, tableName, callback);
        }
      ], done);
    });

    it('55.13.1 ', function (done ) {
      connection.should.be.ok();

      connection.execute (
        "BEGIN get_invalid_refcur ( :p ); END; ",
        {
          p : { type : oracledb.CURSOR, dir : oracledb.BIND_OUT }
        },
        function ( err ) {
          should.exist ( err );
          // ORA-24338: statement handle not executed
          done();
        }
      );

    }); // 55.13.1
  }); // 55.13

});


/********************* Helper functions *************************/
function setUp(connection, tableName, done)
{
  async.series([
    function(callback) {
      createTable(connection, tableName, callback);
    },
    function(callback) {
      insertData(connection, tableName, callback);
    },
    function(callback) {
      createProc1(connection, tableName, callback);
    }
  ], done);
}

function clearUp(connection, tableName, done)
{
  async.series([
    function(callback) {
      dropProc1(connection, callback);
    },
    function(callback) {
      dropTable(connection, tableName, callback);
    }
  ], done);
}

function createTable(connection, tableName, done)
{
  var sqlCreate =
    "BEGIN " +
    "  DECLARE " +
    "    e_table_missing EXCEPTION; " +
    "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
    "   BEGIN " +
    "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); " +
    "   EXCEPTION " +
    "     WHEN e_table_missing " +
    "     THEN NULL; " +
    "   END; " +
    "   EXECUTE IMMEDIATE (' " +
    "     CREATE TABLE " + tableName +" ( " +
    "       employees_id NUMBER(10), " +
    "       employee_name VARCHAR2(20)  " +
    "     )" +
    "   '); " +
    "END; ";

  connection.execute(
    sqlCreate,
    function(err) {
      should.not.exist(err);
      done();
    }
  );
}

function dropTable(connection, tableName, done)
{
  connection.execute(
    'DROP TABLE ' + tableName + ' PURGE',
    function(err) {
      should.not.exist(err);
      done();
    }
  );
}

function insertData(connection, tableName, done)
{
  var sqlInsert =
    "DECLARE " +
    "  x NUMBER := 0; " +
    "  n VARCHAR2(20); " +
    "BEGIN "  +
    "  FOR i IN 1..300 LOOP " +
    "    x := x + 1;  " +
    "    n := 'staff ' || x;  " +
    "    INSERT INTO " + tableName + " VALUES (x, n); " +
    "  END LOOP; " +
    "END; ";

  connection.execute(
    sqlInsert,
    [],
    { autoCommit: true },
    function(err) {
      should.not.exist(err);
      done();
    }
  );
}

function createProc1(connection, tableName, done)
{
  var sqlProc =
    "CREATE OR REPLACE PROCEDURE nodb_rs2_get_emp (p_in IN NUMBER, p_out OUT SYS_REFCURSOR) " +
    "  AS " +
    "  BEGIN " +
    "    OPEN p_out FOR " +
    "      SELECT * FROM " + tableName + " WHERE employees_id > p_in; " +
    "  END; ";

  connection.execute(
    sqlProc,
    [],
    { autoCommit: true },
    function(err) {
      should.not.exist(err);
      done();
    }
  );
}

function dropProc1(connection, done)
{
  connection.execute(
    'DROP PROCEDURE nodb_rs2_get_emp',
    function(err) {
      should.not.exist(err);
      done();
    }
  );
}
