/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   163. executeMany1.js
 *
 * DESCRIPTION
 *   Test connection.executeMany() method.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('163. executeMany1.js', function() {

  var conn;

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(
          dbConfig,
          function(err, connection) {
            should.not.exist(err);
            conn = connection;
            cb();
          }
        );
      },
      function doMakeTable(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_xmany PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_tab_xmany ( \n" +
                   "            id     NUMBER, \n" +
                   "            val    VARCHAR2(100) \n" +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";
        conn.execute(proc, function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // before()

  after(function(done) {
    async.series([
      function(cb) {
        var sql = "DROP TABLE nodb_tab_xmany PURGE";
        conn.execute(sql, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // after

  it('163.1 inserts many rows with bind by name', function(done) {

    async.series([
      function(cb) {
        var binds = [
          { a: 1, b: "Test 1 (One)" },
          { a: 2, b: "Test 2 (Two)" },
          { a: 3, b: "Test 3 (Three)" },
          { a: 4 },
          { a: 5, b: "Test 5 (Five)" }
        ];
        var sql = "INSERT INTO nodb_tab_xmany VALUES (:a, :b)";
        var options = {
          autoCommit: true,
          bindDefs: {
            a: { type: oracledb.NUMBER },
            b: { type: oracledb.STRING, maxSize: 15 }
          }
        };

        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, binds.length);
          cb();
        });
      },
      function(cb) {
        var sql = "SELECT * FROM nodb_tab_xmany ORDER BY ID";
        var expectVal = [
          [ 1, 'Test 1 (One)' ],
          [ 2, 'Test 2 (Two)' ],
          [ 3, 'Test 3 (Three)' ],
          [ 4, null ],
          [ 5, 'Test 5 (Five)' ]
        ];
        conn.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(result.rows, expectVal);
            cb();
          }
        );
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);

  }); // 163.1

  it('163.2 inserts rows with bind by position', function(done) {
    var binds = [
      [1, "Test 1 (One)"],
      [2, "Test 2 (Two)"],
      [3, "Test 3 (Three)"],
      [4, null],
      [5, "Test 5 (Five)"]
    ];
    async.series([
      function(cb) {
        var sql = "INSERT INTO nodb_tab_xmany VALUES (:1, :2)";
        var options = {
          autoCommit: true,
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.STRING, maxSize: 15 }
          ]
        };
        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, binds.length);
          cb();
        });
      },
      function(cb) {
        var sql = "SELECT * FROM nodb_tab_xmany ORDER BY ID";
        conn.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(result.rows, binds);
            cb();
          }
        );
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 163.2

  it('163.3 DML RETURNING that returns single value', function(done) {
    async.series([
      function(cb) {
        var sql = "INSERT INTO nodb_tab_xmany VALUES (:1, :2) RETURNING id, val INTO :3, :4";
        var binds = [
          [1, "Test 1 (One)"],
          [2, "Test 2 (Two)"],
          [3, "Test 3 (Three)"],
          [4, null],
          [5, "Test 5 (Five)"]
        ];
        var options = {
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.STRING, maxSize: 20 },
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            { type: oracledb.STRING, maxSize: 25, dir: oracledb.BIND_OUT }
          ]
        };

        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, binds.length);
          for (let i = 0; i < result.outBinds.length; i++) {
            should.strictEqual(result.outBinds[i][0][0], binds[i][0]);
            should.strictEqual(result.outBinds[i][1][0], binds[i][1]);
          }
          cb();
        });

      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 163.3

  it('163.4 DML RETURNING that returns multiple values', function(done) {
    async.series([
      function(cb) {
        var sql = "INSERT INTO nodb_tab_xmany VALUES(:1, :2)";
        var binds = [
          [1, "Test 1 (One)"],
          [2, "Test 2 (Two)"],
          [3, "Test 3 (Three)"],
          [4, "Test 4 (Four)"],
          [5, "Test 5 (Five)"],
          [6, "Test 6 (Six)"],
          [7, "Test 7 (Seven)"],
          [8, "Test 8 (Eight)"]
        ];
        var options = {
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.STRING, maxSize: 20 }
          ]
        };

        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, binds.length);
          cb();
        });
      },
      function dodelete(cb) {
        var sql = "DELETE FROM nodb_tab_xmany WHERE id < :1 RETURNING id, val INTO :2, :3";
        var binds = [ [2], [6], [8] ];
        var options = {
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            { type: oracledb.STRING, maxSize: 25, dir: oracledb.BIND_OUT }
          ]
        };

        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(7, result.rowsAffected);
          should.strictEqual(3, result.outBinds.length);
          should.deepEqual(
            result.outBinds[0],
            [ [ 1 ], [ 'Test 1 (One)' ] ]
          );
          should.deepEqual(
            result.outBinds[1],
            [ [ 2, 3, 4, 5 ], [ 'Test 2 (Two)', 'Test 3 (Three)', 'Test 4 (Four)', 'Test 5 (Five)' ]]
          );
          should.deepEqual(
            result.outBinds[2],
            [ [ 6, 7 ], [ 'Test 6 (Six)', 'Test 7 (Seven)' ] ]
          );
          cb();
        });
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 163.4

  it('163.5 calls PL/SQL', function(done) {
    async.series([
      function(cb) {
        doCreateProc(cb);
      },
      function(cb) {
        var plsql = "BEGIN nodb_proc_em(:1, :2, :3); END;";
        var binds = [ [1], [2], [3], [4], [6] ];
        var options = {
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
          ]
        };

        conn.executeMany(plsql, binds, options, function(err, result) {
          should.not.exist(err);
          should.deepEqual(
            result.outBinds,
            [ [ 2, 'X' ], [ 4, 'XX' ], [ 6, 'XXX' ], [ 8, 'XXXX' ], [ 12, 'XXXXXX' ] ]
          );
          cb();
        });
      },
      function(cb) {
        doDropProc(cb);
      }
    ], done);
  }); // 163.5

  it('163.6 shows dmlRowCounts', function(done) {

    if ( (oracledb.oracleClientVersion < 1201000200)
      || (conn.oracleServerVersion < 1201000200) ) {
      this.skip();
    }

    var childTable = "nodb_tab_child_one";
    var parentTable = "nodb_tab_parent_one";

    async.series([
      function(cb) {
        makeParentChildTables(childTable, parentTable, cb);
      },
      function(cb) {
        var sql = "DELETE FROM " + childTable + " WHERE parentid = :1";
        var binds = [ [20], [30], [50] ];
        var options = { dmlRowCounts: true };
        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 9);
          should.deepEqual(result.dmlRowCounts, [ 3, 2, 4 ]);
          cb();
        });
      },
      function(cb) {
        dropParentChildTables(childTable, parentTable, cb);
      }
    ], done);
  }); // 163.6

  it('163.7 shows batchErrors behavior', function(done) {

    if ( (oracledb.oracleClientVersion < 1201000200)
      || (conn.oracleServerVersion < 1201000200) ) {
      this.skip();
    }

    var childTable = "nodb_tab_child_two";
    var parentTable = "nodb_tab_parent_two";

    async.series([
      function(cb) {
        makeParentChildTables(childTable, parentTable, cb);
      },
      function(cb) {
        var sql = "INSERT INTO " + childTable + " VALUES (:1, :2, :3)";
        var binds = [
          [1016, 10, "Child 2 of Parent A"],
          [1017, 10, "Child 3 of Parent A"],
          [1018, 20, "Child 4 of Parent B"],
          [1018, 20, "Child 4 of Parent B"],   // duplicate key
          [1019, 30, "Child 3 of Parent C"],
          [1020, 40, "Child 4 of Parent D"],
          [1021, 75, "Child 1 of Parent F"],   // parent does not exist
          [1022, 40, "Child 6 of Parent D"]
        ];
        var options = {
          autoCommit: true,
          batchErrors: true,
          dmlRowCounts: true,
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.NUMBER },
            { type: oracledb.STRING, maxSize: 20 }
          ]
        };
        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 6);
          should.deepEqual(result.dmlRowCounts, [ 1, 1, 1, 0, 1, 1, 0, 1 ]);
          (result.batchErrors[0].message).should.startWith('ORA-00001: ');
          // ORA-00001: unique constraint (HR.CHILDTAB_PK) violated
          (result.batchErrors[1].message).should.startWith('ORA-02291: ');
          // ORA-02291: integrity constraint (HR.CHILDTAB_FK) violated - parent key not found
          cb();
        });
      },
      function(cb) {
        dropParentChildTables(childTable, parentTable, cb);
      }
    ], done);
  }); // 163.7

  it('163.8 Negative - batchErrors with non-DML statement', function(done) {

    if (oracledb.oracleClientVersion < 1201000200) { this.skip(); }

    async.series([
      function(cb) {
        doCreateProc(cb);
      },
      function(cb) {
        var plsql = "BEGIN nodb_proc_em(:1, :2, :3); END;";
        var binds = [ [1], [2], [3], [4], [6] ];
        var options = {
          batchErrors: true,
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
          ]
        };

        conn.executeMany(plsql, binds, options, function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "DPI-1063: modes DPI_MODE_EXEC_BATCH_ERRORS and DPI_MODE_EXEC_ARRAY_DML_ROWCOUNTS" +
            " can only be used with insert, update, delete and merge statements"
          );
          should.not.exist(result);
          cb();
        });
      },
      function(cb) {
        doDropProc(cb);
      }
    ], done);
  }); // 163.8

  it('163.9 if batchErrors is disabled', function(done) {

    if (oracledb.oracleClientVersion < 1201000200) { this.skip(); }

    var childTable = "nodb_tab_child_three";
    var parentTable = "nodb_tab_parent_three";

    async.series([
      function(cb) {
        makeParentChildTables(childTable, parentTable, cb);
      },
      function(cb) {
        var sql = "INSERT INTO " + childTable + " VALUES (:1, :2, :3)";
        var binds = [
          [1016, 10, "Child 2 of Parent A"],
          [1017, 10, "Child 3 of Parent A"],
          [1018, 20, "Child 4 of Parent B"],
          [1018, 20, "Child 4 of Parent B"],   // duplicate key
          [1019, 30, "Child 3 of Parent C"],
          [1020, 40, "Child 4 of Parent D"],
          [1021, 75, "Child 1 of Parent F"],   // parent does not exist
          [1022, 40, "Child 6 of Parent D"]
        ];
        var options = {
          autoCommit: true,
          batchErrors: false,
          dmlRowCounts: true,
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.NUMBER },
            { type: oracledb.STRING, maxSize: 20 }
          ]
        };
        conn.executeMany(sql, binds, options, function(err, result) {
          should.exist(err);
          (err.message).should.startWith('ORA-00001: ');
          // ORA-00001: unique constraint (HR.CHILDTAB_PK) violated
          should.not.exist(result);
          cb();
        });
      },
      function(cb) {
        dropParentChildTables(childTable, parentTable, cb);
      }
    ], done);
  }); // 163.9

  it('163.10 Negative -  dmlRowCounts with non-DML statement', function(done) {

    if (oracledb.oracleClientVersion < 1201000200) { this.skip(); }

    async.series([
      function(cb) {
        doCreateProc(cb);
      },
      function(cb) {
        var plsql = "BEGIN nodb_proc_em(:1, :2, :3); END;";
        var binds = [ [1], [2], [3], [4], [6] ];
        var options = {
          dmlRowCounts: true,
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
            { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 20 }
          ]
        };

        conn.executeMany(plsql, binds, options, function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "DPI-1063: modes DPI_MODE_EXEC_BATCH_ERRORS and DPI_MODE_EXEC_ARRAY_DML_ROWCOUNTS" +
            " can only be used with insert, update, delete and merge statements"
          );
          should.not.exist(result);
          cb();
        });
      },
      function(cb) {
        doDropProc(cb);
      }
    ], done);

  }); // 163.10

  it('163.11 numIterations - only OUT parameters', function(done) {
    async.series([
      function(cb) {
        var sql =
        `declare
             t_Id          number;
         begin
             select nvl(count(*), 0) + 1 into t_Id
             from nodb_tab_xmany;

             insert into nodb_tab_xmany
             values (t_Id, 'Test String ' || t_Id);

             select sum(Id) into :1
             from nodb_tab_xmany;
        end;`;
        var bindDefs = [
          { type : oracledb.NUMBER, dir : oracledb.BIND_OUT }
        ];
        var options = { bindDefs: bindDefs };
        var numIterations = 8;
        conn.executeMany(
          sql,
          numIterations,
          options,
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(
              result.outBinds,
              [ [ 1 ], [ 3 ], [ 6 ], [ 10 ], [ 15 ], [ 21 ], [ 28 ], [ 36 ] ]
            );
            cb();
          }
        );
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 163.11

  it('163.12 numIterations - No parameters', function(done) {
    async.series([
      function(cb) {
        var sql = `
        declare
            t_Id          number;
        begin
            select nvl(count(*), 0) + 1 into t_Id
            from nodb_tab_xmany;

            insert into nodb_tab_xmany
            values (t_Id, 'Test String ' || t_Id);
        end;`;

        var numIterations = 8;

        conn.executeMany(
          sql,
          numIterations,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 163.12

  it('163.13 numIterations - DML RETURNING', function(done) {
    async.series([
      function(cb) {
        var sql = `
        insert into nodb_tab_xmany (val)
        values (to_char(systimestamp, 'YYYY-MM-DD HH24:MI:SS.FF'))
        returning id, val into :1, :2`;

        var bindDefs = [
          { type : oracledb.NUMBER, dir : oracledb.BIND_OUT },
          { type : oracledb.STRING, dir : oracledb.BIND_OUT, maxSize : 30 }
        ];

        var options = { bindDefs : bindDefs };
        var numIterations = 8;

        conn.executeMany(
          sql,
          numIterations,
          options,
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.outBinds.length, numIterations);
            cb();
          }
        );
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 164.13

  it('163.14 Negative - set numIterations to be string', function(done) {
    async.series([
      function(cb) {
        var sql = `
        declare
            t_Id          number;
        begin
            select nvl(count(*), 0) + 1 into t_Id
            from nodb_tab_xmany;

            insert into nodb_tab_xmany
            values (t_Id, 'Test String ' || t_Id);
        end;`;

        var numIterations = "foobar";

        should.throws(
          function() {
            conn.executeMany(sql, numIterations, function() {} );
          },
          /NJS-006: invalid type for parameter 2/
        );
        cb();
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 163.14

  it('163.15 Negative - set numIterations to be negative value', function(done) {
    async.series([
      function(cb) {
        var sql = `
        declare
            t_Id number;
        begin
            select nvl(count(*), 0) + 1 into t_Id
            from nodb_tab_xmany;

            insert into nodb_tab_xmany
            values (t_Id, 'Test String ' || t_Id);
        end;`;

        var numIterations = -8;

        should.throws(
          function() {
            conn.executeMany(
              sql,
              numIterations,
              function() { }
            );
          },
          /NJS-005: invalid value for parameter 2/
        );
        cb();
      },
      function(cb) {
        dotruncate(cb);
      }
    ], done);
  }); // 163.15

  var doCreateProc = function(cb) {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_em (a_num IN NUMBER, " +
               "    a_outnum OUT NUMBER, a_outstr OUT VARCHAR2) \n" +
               "AS \n" +
               "BEGIN \n" +
               "  a_outnum := a_num * 2; \n" +
               "  FOR i IN 1..a_num LOOP \n" +
               "    a_outstr := a_outstr || 'X'; \n" +
               "  END LOOP; \n" +
               "END nodb_proc_em;";
    conn.execute(
      proc,
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  }; // doCreateProc()

  var doDropProc = function(cb) {
    var sql = "DROP PROCEDURE nodb_proc_em";
    conn.execute(
      sql,
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  }; // doDropProc()

  var dotruncate = function(cb) {
    conn.execute(
      "TRUNCATE TABLE nodb_tab_xmany",
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  }; // dotruncate()

  var makeParentChildTables = function(cTab, pTab, callback) {
    async.series([
      function(cb) {
        var proc = "BEGIN EXECUTE IMMEDIATE 'DROP TABLE " + cTab + "'; " +
                   "EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END;";
        conn.execute(proc, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var proc = "BEGIN EXECUTE IMMEDIATE 'DROP TABLE " + pTab + "'; " +
                   "EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END;";
        conn.execute(proc, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var sql = "CREATE TABLE " + pTab + " ( \n" +
                  "     parentid    NUMBER NOT NULL, \n" +
                  "     description VARCHAR2(60) NOT NULL, \n" +
                  "     CONSTRAINT " + pTab + "_pk PRIMARY KEY (parentid) \n" +
                  ") ";
        conn.execute(sql, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var sql = "CREATE TABLE " + cTab +" ( \n" +
                  "    childid     NUMBER NOT NULL, \n" +
                  "    parentid    NUMBER NOT NULL, \n" +
                  "    description VARCHAR2(30) NOT NULL, \n" +
                  "    CONSTRAINT " + cTab + "_pk PRIMARY KEY (childid), \n" +
                  "    CONSTRAINT " + cTab + "_fk FOREIGN KEY (parentid) REFERENCES " + pTab + " \n" +
                  ") ";
        conn.execute(sql, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var sql = "INSERT INTO " + pTab + " VALUES (:1, :2)";
        var binds = [
          [10, "Parent 10"],
          [20, "Parent 20"],
          [30, "Parent 30"],
          [40, "Parent 40"],
          [50, "Parent 50"]
        ];
        var options = {
          autoCommit: true,
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.STRING, maxSize: 15 }
          ]
        };
        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, binds.length);
          cb();
        });
      },
      function(cb) {
        var sql = "INSERT INTO " + cTab + " VALUES (:1, :2, :3)";
        var binds = [
          [1001, 10, "Child 1001 of Parent 10"],
          [1002, 20, "Child 1001 of Parent 20"],
          [1003, 20, "Child 1001 of Parent 20"],
          [1004, 20, 'Child 1004 of Parent 20'],
          [1005, 30, 'Child 1005 of Parent 30'],
          [1006, 30, 'Child 1006 of Parent 30'],
          [1007, 40, 'Child 1007 of Parent 40'],
          [1008, 40, 'Child 1008 of Parent 40'],
          [1009, 40, "Child 1009 of Parent 40"],
          [1010, 40, "Child 1010 of Parent 40"],
          [1011, 40, "Child 1011 of Parent 40"],
          [1012, 50, 'Child 1012 of Parent 50'],
          [1013, 50, 'Child 1013 of Parent 50'],
          [1014, 50, 'Child 1014 of Parent 50'],
          [1015, 50, 'Child 1015 of Parent 50'],
        ];
        var options = {
          autoCommit: true,
          bindDefs: [
            { type: oracledb.NUMBER },
            { type: oracledb.NUMBER },
            { type: oracledb.STRING, maxSize: 500 }
          ]
        };
        conn.executeMany(sql, binds, options, function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, binds.length);
          cb();
        });
      },
    ], callback);
  }; // makeParentChildTables()

  var dropParentChildTables = function(cTab, pTab, callback) {
    async.series([
      function(cb) {
        var sql = "drop table " + cTab + " purge";
        conn.execute(sql, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var sql = "drop table " + pTab + " purge";
        conn.execute(sql, function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], callback);
  }; // dropParentChildTables()

});