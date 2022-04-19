/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   162. getStmtInfo.js
 *
 * DESCRIPTION
 *   Test parsing a statement and returns information about it.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('162. getStmtInfo.js', function() {

  var conn;
  var tableName = "nodb_number";
  var numbers = assist.data.numbers;

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
      function(cb) {
        assist.setUp(conn, tableName, numbers, cb);
      }
    ], done);
  });

  after(function(done) {
    async.series([
      function(cb) {
        var sql = "drop table " + tableName + " purge";
        conn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  });

  it('162.1 SELECT', function(done) {

    var sql = "select 1 as col from dual";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info,
          { bindNames: [], statementType: oracledb.STMT_TYPE_SELECT,
            metaData: [
              {
                dbType: oracledb.DB_TYPE_NUMBER,
                dbTypeName: "NUMBER",
                fetchType: oracledb.DB_TYPE_NUMBER,
                name: "COL",
                nullable: true,
                precision: 0,
                scale: -127
              }
            ]
          });
        done();
      }
    );
  }); // 162.1

  it('162.2 SELECT with data bind', function(done) {

    var sql = "select 1 from dual where :b > 99";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, ['B']);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_SELECT);
        done();
      }
    );
  }); // 162.2

  it('162.3 unknown statement', function(done) {

    var sql = "purge recyclebin";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_UNKNOWN);
        done();
      }
    );
  }); // 162.3

  it('162.4 Negative - unknown statement, invalid SQL', function(done) {
    var sql = "purge recyclebinx";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.exist(err);
        (err.message).should.startWith('ORA-38302: ');
        // ORA-38302: invalid PURGE option
        should.not.exist(info);
        done();
      }
    );
  }); // 162.4

  it('162.5 UPDATE with data bind', function(done) {

    var sql = "UPDATE nodb_number SET content = :c WHERE num = :n RETURNING num INTO :rn";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, ['C', 'N', 'RN']);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_UPDATE);
        done();
      }
    );
  }); // 162.5

  it('162.6 UPDATE and verify changes do not happen', function(done) {
    async.series([
      function(cb) {
        var sql = "UPDATE nodb_number SET content = content + 1";
        conn.getStatementInfo(
          sql,
          function(err, info) {
            should.not.exist(err);
            should.deepEqual(info.bindNames, []);
            should.strictEqual(info.statementType, oracledb.STMT_TYPE_UPDATE);
            cb();
          }
        );
      },
      function(cb) {
        assist.dataTypeSupport(conn, tableName, numbers, cb);
      }
    ], done);
  }); // 162.6

  it('162.7 DELETE with data bind', function(done) {

    var sql = "DELETE FROM nodb_number WHERE num = :n";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, ['N']);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_DELETE);
        done();
      }
    );
  }); // 162.7

  it('162.8 DELETE and verify changes do not happen', function(done) {
    async.series([
      function(cb) {
        var sql = "DELETE FROM nodb_number";
        conn.getStatementInfo(
          sql,
          function(err, info) {
            should.not.exist(err);
            should.deepEqual(info.bindNames, []);
            should.strictEqual(info.statementType, oracledb.STMT_TYPE_DELETE);
            cb();
          }
        );
      },
      function(cb) {
        assist.dataTypeSupport(conn, tableName, numbers, cb);
      }
    ], done);
  }); // 162.8

  it('162.9 DELETE with subquery', function(done) {

    var sql = "delete from (select * from nodb_number) where num > :n";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, ['N']);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_DELETE);
        done();
      }
    );
  }); // 162.9

  it('162.10 INSERT with data bind', function(done) {

    var sql = "insert into nodb_number (num, content) values (999, 999999) returning num into :n";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, ['N']);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_INSERT);
        done();
      }
    );
  }); // 162.10

  it('162.11 INSERT and verify', function(done) {

    async.series([
      function(cb) {
        var sql = "insert into nodb_number values (666, 1234)";
        conn.getStatementInfo(
          sql,
          function(err, info) {
            should.not.exist(err);
            should.deepEqual(info.bindNames, []);
            should.strictEqual(info.statementType, oracledb.STMT_TYPE_INSERT);
            cb();
          }
        );
      },
      function(cb) {
        var sql = "select content from nodb_number where num = 666";
        conn.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(result.rows, []);
            cb();
          }
        );
      }
    ], done);
  }); // 162.11

  it('162.12 Negative - insert nonexistent table', function(done) {

    var sql = "insert into nonexistence values (:xxx) returning dummy into :kk";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.exist(err);
        (err.message).should.startWith('ORA-00942: ');
        // ORA-00942: table or view does not exist
        should.not.exist(info);
        done();
      }
    );
  }); // 162.12

  it('162.13 Negative - INSERT with invalid SQL', function(done) {

    var sql = "insert into nodb_number values (:x, :y, :z) returning num into :n";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.exist(err);
        (err.message).should.startWith('ORA-00913: ');
        // ORA-00913: too many values
        should.not.exist(info);
        done();
      }
    );
  }); // 162.13

  it('162.14 CREATE and verify the data does not get created', function(done) {
    async.series([
      function(cb) {
        var sql = "create table nodb_foobar (a number)";
        conn.getStatementInfo(
          sql,
          function(err, info) {
            should.not.exist(err);
            should.deepEqual(info.bindNames, []);
            should.strictEqual(info.statementType, oracledb.STMT_TYPE_CREATE);
            cb();
          }
        );
      },
      function(cb) {
        var sql = "insert into nodb_foobar values (89)";
        conn.execute(
          sql,
          function(err, result) {
            should.exist(err);
            (err.message).should.startWith('ORA-00942: ');
            // ORA-00942: table or view does not exist
            should.not.exist(result);
            cb();
          }
        );
      }
    ], done);
  }); // 162.14

  it('162.15 CREATE procedure', function(done) {

    async.series([
      function(cb) {
        var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_edition (str OUT STRING) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    str := 'E2'; \n" +
                   "END nodb_proc_edition;";
        conn.getStatementInfo(
          proc,
          function(err, info) {
            should.not.exist(err);
            should.deepEqual(info.bindNames, []);
            should.strictEqual(info.statementType, oracledb.STMT_TYPE_CREATE);
            cb();
          }
        );
      },
      function(cb) {
        var proc = "begin nodb_proc_edition(:out); end;";
        conn.execute(
          proc,
          { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
          function(err, result) {
            should.exist(err);
            (err.message).should.startWith('ORA-06550: ');
            should.not.exist(result);
            cb();
          }
        );
      }
    ], done);
  }); // 162.15

  it('162.16 CREATE, DDL statements are not parsed, so syntax errors in them will not be reported.', function(done) {

    var sql = "create table nodb_foo (:b number)";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.exist(info);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_CREATE);
        done();
      }
    );
  }); // 162.16

  it('162.17 DROP', function(done) {

    var tab = "nodb_date";
    var sql = "drop table " + tab + " purge";

    async.series([
      function(cb) {
        assist.createTable(conn, tab, cb);
      },
      function(cb) {
        conn.getStatementInfo(
          sql,
          function(err, info) {
            should.not.exist(err);
            should.deepEqual(info.bindNames, []);
            should.strictEqual(info.statementType, oracledb.STMT_TYPE_DROP);
            cb();
          }
        );
      },
      function(cb) {
        conn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }); // 162.17

  it('162.18 ALTER', function(done) {
    var sql = "alter session set nls_date_format = 'YYYY-MM-DD'";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_ALTER);
        done();
      }
    );
  }); // 162.18

  it('162.19 ALTER with data bind', function(done) {
    var sql = "ALTER SESSION SET TIME_ZONE=':B'";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_ALTER);
        done();
      }
    );
  }); // 162.19

  it('162.20 ALTER, invaid statement', function(done) {
    var sql = "ALTER SESSION SET :B = 'UTC'";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_ALTER);
        done();
      }
    );
  });

  it('162.21 BEGIN', function(done) {
    var sql = "BEGIN NULL; END;";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_BEGIN);
        done();
      }
    );
  });

  it('162.22 BEGIN with data bind', function(done) {
    var sql = "BEGIN :out := lpad('A', 200, 'x'); END;";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, [ "OUT" ]);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_BEGIN);
        done();
      }
    );
  });

  it('162.23 DECLARE', function(done) {
    var sql = "declare var_tem number(6); begin null; end;";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_DECLARE);
        done();
      }
    );
  });

  it('162.24 COMMIT', function(done) {
    conn.getStatementInfo(
      "commit",
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_COMMIT);
        done();
      }
    );
  });

  it('162.25 ROLLBACK', function(done) {
    conn.getStatementInfo(
      "rollback",
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_ROLLBACK);
        done();
      }
    );
  });

  it('162.26 TRUNCATE', function(done) {
    var sql = "truncate table nodb_number";
    conn.getStatementInfo(
      sql,
      function(err, info) {
        should.not.exist(err);
        should.deepEqual(info.bindNames, []);
        should.strictEqual(info.statementType, oracledb.STMT_TYPE_UNKNOWN);
        done();
      }
    );
  });

});
