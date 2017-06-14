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
 *   90. bindTimestamp.js
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
var assist   = require('./dataTypeAssist.js');

describe('90. bindTimestamp.js', function() {
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

  it('90.1 DML, IN bind, bind by name', function(done) {
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

  it('90.2 DML, IN bind, bind by position', function(done) {
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

  it('90.3 DML, IN bind, Null', function(done) {
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

  it('90.4 Negative - IN bind, value and type mismatch', function(done) {
    var id = caseIndex++;
    var bv = new Date(2003, 9, 23, 11, 50, 30, 123);
    var foo = { type: oracledb.NUMBER, val: bv}
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

  it('90.5 DML, OUT bind, bind by position', function(done) {
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

  it('90.6 DML, OUT bind, bind by name', function(done) {
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

  it('90.7 Negative - OUB bind, value and type mismatch', function(done) {
    var id = caseIndex++;
    var bv = new Date(10000000);
    async.series([
      function(cb) {
        connection.execute(
          "insert into nodb_tab_tsbind values (:1, :2, :3) returning id, tstz into :4, :5",
          [id, bv, bv, { type: oracledb.NUMBER, dir: oracledb.BIND_OUT}, 
             { type: oracledb.NUMBER, dir: oracledb.BIND_OUT} ],
          { autoCommit: true},
          function(err, result) {
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

  it('90.8 DML, INOUT bind, bind by position', function(done) {
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

  it('90.9 DML, INOUT bind, bind by name', function(done) {
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

  it('90.10 Negative - INOUT bind, in bind value and type mismatch', function(done) {
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
          function(err, result) {
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

  it('90.11 Negative - INOUT bind, out bind value and type mismatch', function(done) {
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
          function(err, result) {
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

  it('90.12 DML, INOUT bind, Null values', function(done) {
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
          { autoCommit: true},
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

});






