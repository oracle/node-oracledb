/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   102. bindTimestamp.js
 *
 * DESCRIPTION
 *    Testing DML and PL/SQL binding of TIMESTAMP types.
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
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('102. bindTimestamp.js', function() {
  var connection = null;
  var caseIndex = 1;

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function(cb) {
        var sql = "alter session set nls_timestamp_format = 'YYYY-MM-DD HH24:MI:SS.FF'";
        runSQL(sql, cb);
      },
      function(cb) {
        var sql = "alter session set nls_timestamp_tz_format = 'YYYY-MM-DD HH24:MI:SS.FF'";
        runSQL(sql, cb);
      },
      function(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_tsbind PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_tab_tsbind ( \n" +
                   "            id       NUMBER NOT NULL, \n" +
                   "            ts       TIMESTAMP, \n" +
                   "            tstz     TIMESTAMP WITH TIME ZONE \n" +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";
        runSQL(proc, cb);
      }
    ], done);
  });

  after(function(done) {
    async.series([
      function(cb) {
        var sql = "drop table nodb_tab_tsbind purge";
        runSQL(sql, cb);
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  });

  function runSQL(sql, callback) {
    connection.execute(sql, function(err) {
      should.not.exist(err);
      callback();
    });
  }

  it('102.1 DML, IN bind, bind by name', function(done) {
    var bv = new Date(2003, 9, 23, 11, 50, 30, 123);
    var id = caseIndex++;
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz)",
          {
            i: id,
            ts: bv,
            tz: bv
          },
          {
            autoCommit: true
          },
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].TS).should.eql(bv);
            (result.rows[0].TSTZ).should.eql(bv);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.2 DML, IN bind, bind by position', function(done) {
    var bv = new Date(0);
    var id = caseIndex++;
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:1, :2, :3)",
          [id, bv, bv],
          { autoCommit: true },
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].TS).should.eql(bv);
            (result.rows[0].TSTZ).should.eql(bv);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.3 DML, IN bind, Null', function(done) {
    var id = caseIndex++;
    var bv = null;
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz)",
          {
            i: id,
            ts: bv,
            tz: bv
          },
          {
            autoCommit: true
          },
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rows[0].TS, null);
            should.strictEqual(result.rows[0].TSTZ, null);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.4 Negative - IN bind, value and type mismatch', function(done) {
    var id = caseIndex++;
    var bv = new Date(2003, 9, 23, 11, 50, 30, 123);
    var foo = { type: oracledb.NUMBER, val: bv};
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz)",
          {
            i: id,
            ts: bv,
            tz: foo
          },
          {
            autoCommit: true
          },
          function(err) {
            should.exist(err);
            should.strictEqual(err.message,
              'NJS-011: encountered bind value and type mismatch');
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(result.rows, []);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.5 DML, OUT bind, bind by position', function(done) {
    var id = caseIndex++;
    var bv = new Date(0);
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:1, :2, :3) returning id, tstz into :4, :5",
          [id, bv, bv, { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
             { type: oracledb.DATE, dir: oracledb.BIND_OUT} ],
          { autoCommit: true},
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.outBinds[0][0], id);
            (result.outBinds[1][0]).should.eql(bv);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].TS).should.eql(bv);
            (result.rows[0].TSTZ).should.eql(bv);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.6 DML, OUT bind, bind by name', function(done) {
    var id = caseIndex++;
    var bv = new Date(2003, 9, 23, 11, 50, 30, 123);
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning id, tstz into :oid, :otz",
          {
            i: id,
            ts: bv,
            tz: bv,
            oid: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER},
            otz: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
          },
          { autoCommit: true},
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.outBinds.oid[0], id);
            (result.outBinds.otz[0]).should.eql(bv);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].TS).should.eql(bv);
            (result.rows[0].TSTZ).should.eql(bv);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.7 Negative - OUB bind, value and type mismatch', function(done) {
    var id = caseIndex++;
    var bv = new Date(10000000);
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:1, :2, :3) returning id, tstz into :4, :5",
          [id, bv, bv, { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
             { type: oracledb.NUMBER, dir: oracledb.BIND_OUT} ],
          { autoCommit: true},
          function(err) {
            should.exist(err);
            (err.message).should.startWith('ORA-00932:');
            // 'ORA-00932: inconsistent datatypes: expected NUMBER got TIMESTAMP WITH TIME ZONE'
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(result.rows, []);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.8 DML, INOUT bind, bind by position', function(done) {
    var id = caseIndex++;
    var bv = new Date(-1000000);
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:1, :2, :3) returning id, tstz into :1, :3",
          [ { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_INOUT }, bv,
            { val: bv, type: oracledb.DATE, dir: oracledb.BIND_INOUT} ],
          { autoCommit: true},
          function(err, result) {
            should.not.exist(err);
            (result.outBinds[0][0]).should.eql(id);
            (result.outBinds[1][0]).should.eql(bv);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].TS).should.eql(bv);
            (result.rows[0].TSTZ).should.eql(bv);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.9 DML, INOUT bind, bind by name', function(done) {
    var id = caseIndex++;
    var bv = new Date('2015-07-23 22:00:00');
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, tstz into :ts, :tz",
          {
            i: id,
            ts: { val: bv, dir: oracledb.BIND_INOUT, type: oracledb.DATE },
            tz: { val: bv, dir: oracledb.BIND_INOUT, type: oracledb.DATE }
          },
          { autoCommit: true},
          function(err, result) {
            should.not.exist(err);
            (result.outBinds.ts[0]).should.eql(bv);
            (result.outBinds.tz[0]).should.eql(bv);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].TS).should.eql(bv);
            (result.rows[0].TSTZ).should.eql(bv);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.10 Negative - INOUT bind, in bind value and type mismatch', function(done) {
    var id = caseIndex++;
    var bv = new Date(1995, 11, 17);
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, tstz into :ts, :tz",
          {
            i: id,
            ts: { val: bv, dir: oracledb.BIND_INOUT, type: oracledb.DATE },
            tz: { val: bv, dir: oracledb.BIND_INOUT, type: oracledb.BUFFER }
          },
          { autoCommit: true},
          function(err) {
            should.exist(err);
            should.strictEqual(err.message,
              'NJS-011: encountered bind value and type mismatch');
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(result.rows, []);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.11 Negative - INOUT bind, out bind value and type mismatch', function(done) {
    var id = caseIndex++;
    var bv = new Date(1995, 11, 17);
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, id into :ts, :tz",
          {
            i: id,
            ts: { val: bv, dir: oracledb.BIND_INOUT, type: oracledb.DATE },
            tz: { val: bv, dir: oracledb.BIND_INOUT, type: oracledb.DATE }
          },
          { autoCommit: true},
          function(err) {
            should.exist(err);
            (err.message).should.startWith('ORA-00932: ');
            // 'ORA-00932: inconsistent datatypes: expected TIMESTAMP WITH LOCAL TIME ZONE got NUMBER'
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(result.rows, []);
            cb();
          }
        );
      }
    ], done);
  });

  it('102.12 DML, INOUT bind, Null values', function(done) {
    var id = caseIndex++;
    var bv1 = new Date(1995, 11, 17);
    var bv2 = null;
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:i, :ts, :tz) returning ts, tstz into :ts, :tz",
          {
            i: id,
            ts: { val: bv1, dir: oracledb.BIND_INOUT, type: oracledb.DATE },
            tz: { val: bv2, dir: oracledb.BIND_INOUT, type: oracledb.DATE }
          },
          { autoCommit: true },
          function(err, result) {
            should.not.exist(err);
            (result.outBinds.ts[0]).should.eql(bv1);
            should.strictEqual(result.outBinds.tz[0], null);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from nodb_tab_tsbind where id = :i",
          { i: id },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].TS).should.eql(bv1);
            should.strictEqual(result.rows[0].TSTZ, bv2);
            cb();
          }
        );
      }
    ], done);
  });

  describe('PL/SQL, IN bind', function() {
    before(function(done) {
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_tstz_bindin (p_id IN NUMBER, " +
                   "    p_ts IN TIMESTAMP, p_tstz TIMESTAMP WITH TIME ZONE) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    insert into nodb_tab_tsbind (id, ts, tstz) values " +
                   "      (p_id, p_ts, p_tstz); \n" +
                   "END nodb_proc_tstz_bindin;";
      runSQL(proc, done);
    });

    after(function(done) {
      var sql = "drop procedure nodb_proc_tstz_bindin";
      runSQL(sql, done);
    });

    it('102.13 PL/SQL, IN bind, bind by name', function(done) {
      var id = caseIndex++;
      var bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      var bv2 = new Date(10000000);
      async.series([
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bindin (:i, :ts, :tz); end;",
            {
              i: id,
              ts: { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
              tz: { val: bv2, dir: oracledb.BIND_IN, type: oracledb.DATE }
            },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_tab_tsbind where id = :i",
            { i: id },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              (result.rows[0].TS).should.eql(bv1);
              (result.rows[0].TSTZ).should.eql(bv2);
              cb();
            }
          );
        }
      ], done);
    });

    it('102.14 PL/SQL, IN bind, bind by position', function(done) {
      var id = caseIndex++;
      var bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      var bv2 = new Date(10000000);
      async.series([
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
            [
              id,
              { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
              { val: bv2, dir: oracledb.BIND_IN, type: oracledb.DATE }
            ],
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_tab_tsbind where id = :i",
            { i: id },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              (result.rows[0].TS).should.eql(bv1);
              (result.rows[0].TSTZ).should.eql(bv2);
              cb();
            }
          );
        }
      ], done);
    });

    it('102.15 PL/SQL, IN bind, Null', function(done) {
      var id = caseIndex++;
      var bv1 = null;
      var bv2 = undefined;
      async.series([
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
            [
              id,
              { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
              { val: bv2, dir: oracledb.BIND_IN, type: oracledb.DATE }
            ],
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_tab_tsbind where id = :i",
            { i: id },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rows[0].TS, null);
              should.strictEqual(result.rows[0].TSTZ, null);
              cb();
            }
          );
        }
      ], done);
    });

    it('102.16 Negative - PL/SQL, IN bind, value and type mismatch', function(done) {
      var id = caseIndex++;
      var bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      var bv2 = 0;
      async.series([
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
            [
              id,
              { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
              { val: bv2, dir: oracledb.BIND_IN, type: oracledb.DATE }
            ],
            { autoCommit: true },
            function(err) {
              should.exist(err);
              should.strictEqual(err.message,
                "NJS-011: encountered bind value and type mismatch");
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_tab_tsbind where id = :i",
            { i: id },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.rows, []);
              cb();
            }
          );
        }
      ], done);
    });

    var negBindIn = function(sequence, inType, callback) {
      var bv1 = new Date(2003, 9, 23, 11, 50, 30, 123);
      var bv2 = new Date(10000000);
      async.series([
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bindin (:1, :2, :3); end;",
            [
              sequence,
              { val: bv1, dir: oracledb.BIND_IN, type: oracledb.DATE },
              { val: bv2, dir: oracledb.BIND_IN, type: inType }
            ],
            { autoCommit: true },
            function(err) {
              // console.log(err)
              should.exist(err);
              if (inType == oracledb.CURSOR) {
                should.strictEqual(
                  err.message,
                  'NJS-007: invalid value for "type" in parameter 1'
                );
              } else {
                should.strictEqual(
                  err.message,
                  "NJS-011: encountered bind value and type mismatch"
                );
              }
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_tab_tsbind where id = :i",
            { i: sequence },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              should.deepEqual(result.rows, []);
              cb();
            }
          );
        }
      ], callback);
    };

    it('102.17 Negative - type and value mismatch, BLOB', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.BLOB, done);
    });

    it('102.18 Negative - type and value mismatch, BUFFER', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.BUFFER, done);
    });

    it('102.19 Negative - type and value mismatch, CLOB', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.CLOB, done);
    });

    it('102.20 Negative - type and value mismatch, CURSOR', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.CURSOR, done);
    });

    it.skip('102.21 Negative - type and value mismatch, DEFAULT', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.DEFAULT, done);
    });

    it('102.22 Negative - type and value mismatch, NUMBER', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.NUMBER, done);
    });

    it('102.23 Negative - type and value mismatch, STRING', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.STRING, done);
    });

    it.skip('102.24 Negative - type and value mismatch, NOTEXIST', function(done) {
      var id = caseIndex++;
      negBindIn(id, oracledb.NOTEXIST, done);
    });
  }); // PL/SQL, IN bind

  describe('PL/SQL, OUT bind', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_tstz_bind_out (p_id IN NUMBER, " +
                 "    p_ts OUT TIMESTAMP, p_tstz OUT TIMESTAMP WITH TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select ts, tstz into p_ts, p_tstz from nodb_tab_tsbind where id = p_id; \n" +
                 "END nodb_proc_tstz_bind_out; ";
      runSQL(proc, done);
    });

    after(function(done) {
      var sql = "drop procedure nodb_proc_tstz_bind_out";
      runSQL(sql, done);
    });

    it('102.25 PL/SQL, OUT bind, bind by position', function(done) {
      var id = caseIndex++;
      var in_ts = new Date(1995, 11, 17);
      var in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);

      async.series([
        function insertData(cb) {
          connection.execute(
            "insert into nodb_tab_tsbind values(:i, :ts, :tz)",
            {
              i: id,
              ts: in_ts,
              tz: in_tz
            },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function callProc(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bind_out (:1, :2, :3); end;",
            [
              id,
              {dir: oracledb.BIND_OUT, type: oracledb.DATE},
              {dir: oracledb.BIND_OUT, type: oracledb.DATE}
            ],
            function(err, result) {
              should.not.exist(err);
              (result.outBinds[0]).should.eql(in_ts);
              (result.outBinds[1]).should.eql(in_tz);
              cb();
            }
          );
        }
      ], done);
    });

    it('102.26 PL/SQL, OUT bind, bind by name', function(done) {
      var id = caseIndex++;
      var in_ts = null;
      var in_tz = new Date(1995, 11, 17);

      async.series([
        function(cb) {
          connection.execute(
            "insert into nodb_tab_tsbind values(:1, :2, :3)",
            [id, in_ts, in_tz],
            {autoCommit: true},
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
            {
              i: id,
              s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
              z: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.s, in_ts);
              (result.outBinds.z).should.eql(in_tz);
              cb();
            }
          );
        }
      ], done);
    });

    it('102.27 PL/SQL, OUT bind, Null', function(done) {
      var id = caseIndex++;
      var in_ts = null;
      var in_tz = undefined;

      async.series([
        function(cb) {
          connection.execute(
            "insert into nodb_tab_tsbind values(:1, :2, :3)",
            [id, in_ts, in_tz],
            {autoCommit: true},
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
            {
              i: id,
              s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
              z: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.s, null);
              should.strictEqual(result.outBinds.z, null);
              cb();
            }
          );
        }
      ], done);
    });

    it('102.28 Negative - PL/SQL, OUT bind, value and type mismatch', function(done) {
      var id = caseIndex++;
      var in_ts = new Date(1995, 11, 17);
      var in_tz = 23;

      async.series([
        function(cb) {
          connection.execute(
            "insert into nodb_tab_tsbind values(:1, :2, :3)",
            [id, in_ts, in_tz],
            {autoCommit: true},
            function(err) {
              should.exist(err);
              (err.message).should.startWith('ORA-00932: ');
              // ORA-00932: inconsistent datatypes...
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
            {
              i: id,
              s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
              z: {dir: oracledb.BIND_OUT, type: oracledb.DATE}
            },
            function(err) {
              should.exist(err);
              (err.message).should.startWith('ORA-01403: ');
              // 'ORA-01403: no data found
              cb();
            }
          );
        }
      ], done);
    });

    var negBindOut = function(sequence, outType, callback) {
      var in_ts = new Date(1995, 11, 17);
      var in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);

      async.series([
        function(cb) {
          connection.execute(
            "insert into nodb_tab_tsbind values(:1, :2, :3)",
            [sequence, in_ts, in_tz],
            {autoCommit: true},
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "begin nodb_proc_tstz_bind_out (:i, :s, :z); end;",
            {
              i: sequence,
              s: {dir: oracledb.BIND_OUT, type: oracledb.DATE},
              z: {dir: oracledb.BIND_OUT, type: outType}
            },
            function(err) {
              should.exist(err);
              (err.message).should.startWith('ORA-06550: ');
              // ORA-06550: line 1, column 7:
              // PLS-00306: wrong number or types of arguments...
              cb();
            }
          );
        }
      ], callback);
    };

    it('102.29 Negative - type and value mismatch, BLOB', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.BLOB, done);
    });

    it.skip('102.30 Negative - type and value mismatch, BUFFER', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.DEFAULT, done);
    });

    it('102.31 Negative - type and value mismatch, CLOB', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.CLOB, done);
    });

    it('102.32 Negative - type and value mismatch, CURSOR', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.CURSOR, done);
    });

    it.skip('102.33 Negative - type and value mismatch, DEFAULT', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.DEFAULT, done);
    });

    it('102.34 Negative - type and value mismatch, NUMBER', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.NUMBER, done);
    });

    it.skip('102.35 Negative - type and value mismatch, STRING', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.STRING, done);
    });

    it.skip('102.36 Negative - type and value mismatch, NOTEXIST', function(done) {
      var id = caseIndex++;
      negBindOut(id, oracledb.NOTEXIST, done);
    });

  }); // PL/SQL, OUT bind

  describe('PL/SQL, IN OUT bind', function() {
    before(function(done) {
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_tstz_bind_in_out (p_id IN NUMBER, " +
                 "    p_ts IN OUT TIMESTAMP, p_tstz IN OUT TIMESTAMP WITH TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_tsbind (id, ts, tstz) values (p_id, p_ts, p_tstz); \n" +
                 "    select ts, tstz into p_ts, p_tstz from nodb_tab_tsbind where id = p_id; \n" +
                 "END nodb_proc_tstz_bind_in_out; ";
      runSQL(proc, done);
    });

    after(function(done) {
      var sql = "drop procedure nodb_proc_tstz_bind_in_out";
      runSQL(sql, done);
    });

    it('102.37 PL/SQL, IN OUT bind, bind by name', function(done) {
      var id = caseIndex++;
      var in_ts = new Date(1995, 11, 17);
      var in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);
      var sql = "begin nodb_proc_tstz_bind_in_out(:i, :io_ts, :io_tz); end;";
      connection.execute(
        sql,
        {
          i: id,
          io_ts: { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          io_tz: { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          (result.outBinds.io_ts).should.eql(in_ts);
          (result.outBinds.io_tz).should.eql(in_tz);
          done();
        }
      );
    });

    it('102.38 PL/SQL, IN OUT bind, bind by position', function(done) {
      var id = caseIndex++;
      var in_ts = new Date(1995, 11, 17);
      var in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);
      var sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";
      connection.execute(
        sql,
        [
          id,
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
        ],
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          (result.outBinds[0]).should.eql(in_ts);
          (result.outBinds[1]).should.eql(in_tz);
          done();
        }
      );
    });

    it('102.39 PL/SQL, IN OUT bind, Null', function(done) {
      var id = caseIndex++;
      var in_ts = undefined;
      var in_tz = null;
      var sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";
      connection.execute(
        sql,
        [
          id,
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
        ],
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds[0], null);
          should.strictEqual(result.outBinds[1], null);
          done();
        }
      );
    });

    it('102.40 Negative - value and type mismatch', function(done) {
      var id = caseIndex++;
      var in_ts = new Date(1995, 11, 17);
      var in_tz = "new Date(2003, 9, 23, 11, 50, 30, 123)";
      var sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";
      connection.execute(
        sql,
        [
          id,
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_tz }
        ],
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            'NJS-011: encountered bind value and type mismatch'
          );
          should.not.exist(result);
          done();
        }
      );
    });

    var negBindInOut = function(sequence, inoutType, callback) {
      var in_ts = new Date(1995, 11, 17);
      var in_tz = new Date(2003, 9, 23, 11, 50, 30, 123);
      var sql = "begin nodb_proc_tstz_bind_in_out(:1, :2, :3); end;";
      connection.execute(
        sql,
        [
          sequence,
          { dir: oracledb.BIND_INOUT, type: oracledb.DATE, val: in_ts },
          { dir: oracledb.BIND_INOUT, type: inoutType, val: in_tz }
        ],
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          should.not.exist(result);
          if (inoutType == oracledb.CURSOR) {
            should.strictEqual(
              err.message,
              'NJS-007: invalid value for "type" in parameter 1'
            );
          } else {
            should.strictEqual(
              err.message,
              "NJS-011: encountered bind value and type mismatch"
            );
          }
          callback();
        }
      );
    };

    it('102.41 Negative - type and value mismatch, BLOB', function(done) {
      var id = caseIndex++;
      negBindInOut(id, oracledb.BLOB, done);
    });

    it('102.42 Negative - type and value mismatch, BUFFER', function(done) {
      var id = caseIndex++;
      negBindInOut(id, oracledb.BUFFER, done);
    });

    it('102.43 Negative - type and value mismatch, CLOB', function(done) {
      var id = caseIndex++;
      negBindInOut(id, oracledb.CLOB, done);
    });

    it('102.44 Negative - type and value mismatch, CURSOR', function(done) {
      var id = caseIndex++;
      negBindInOut(id, oracledb.CURSOR, done);
    });

    it.skip('102.45 Negative - type and value mismatch, DEFAULT', function(done) {
      var id = caseIndex++;
      negBindInOut(id, oracledb.DEFAULT, done);
    });

    it('102.46 Negative - type and value mismatch, NUMBER', function(done) {
      var id = caseIndex++;
      negBindInOut(id, oracledb.NUMBER, done);
    });

    it('102.47 Negative - type and value mismatch, STRING', function(done) {
      var id = caseIndex++;
      negBindInOut(id, oracledb.STRING, done);
    });
  }); // PL/SQL, BIND IN OUT

});
