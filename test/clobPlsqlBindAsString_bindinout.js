/* Copyright (c) 2016, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   76. clobPlsqlBindAsString_bindinout.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var fs       = require('fs');
var random   = require('./random.js');

describe('76. clobPlsqlBindAsString_bindinout.js', function() {
  this.timeout(100000);

  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1
  var proc_clob_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_clob_in ( \n" +
                         "            id      NUMBER, \n" +
                         "            clob_1  CLOB, \n" +
                         "            clob_2  CLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  var proc_lobs_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_lobs_in ( \n" +
                         "            id    NUMBER, \n" +
                         "            clob  CLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

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
        setupAllTable(cb);
      }
    ], done);

  }); // before

  after(function(done) {
    async.series([
      function(cb) {
        dropAllTable(cb);
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);

  }); // after

  var setupAllTable = function(callback) {
    async.series([
      function(cb) {
        connection.execute(
          proc_clob_in_tab,
          function(err) {
            should.not.exist(err);
            cb();
          });
      },
      function(cb) {
        connection.execute(
          proc_lobs_in_tab,
          function(err) {
            should.not.exist(err);
            cb();
          });
      }
    ], callback);
  };

  var dropAllTable = function(callback) {
    async.series([
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_tab_clob_in PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          });
      },
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_tab_lobs_in PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          });
      }
    ], callback);
  };

  var executeSQL = function(sql, callback) {
    connection.execute(
      sql,
      function(err) {
        should.not.exist(err);
        return callback();
      }
    );
  };

  var inFileName = './test/clobexample.txt';

  var prepareTableWithClob = function(sql, id, callback) {
    var bindVar = { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };

    connection.execute(
      sql,
      bindVar,
      { autoCommit: false }, // a transaction needs to span the INSERT and pipe()
      function(err, result) {
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        (result.outBinds.lobbv.length).should.be.exactly(1);

        var inStream = fs.createReadStream(inFileName);
        var lob = result.outBinds.lobbv[0];

        lob.on('error', function(err) {
          should.not.exist(err, "lob.on 'error' event");
        });

        inStream.on('error', function(err) {
          should.not.exist(err, "inStream.on 'error' event");
        });

        lob.on('close', function() {
          connection.commit( function(err) {
            should.not.exist(err);
            return callback();
          });
        });

        inStream.pipe(lob); // copies the text to the CLOB
      }
    );
  };

  // compare the result string with the original inserted string
  var compareResultStrAndOriginal = function(resultVal, originalStr, specialStr) {
    var resultLength = resultVal.length;
    var specStrLength = specialStr.length;
    should.strictEqual(resultLength, originalStr.length);
    should.strictEqual(resultVal.substring(0, specStrLength), specialStr);
    should.strictEqual(resultVal.substring(resultLength - specStrLength, resultLength), specialStr);
  };

  // execute plsql bind in out procedure, and verify the plsql bind out string
  var plsqlBindInOut = function(sqlRun, bindVar, originalStr, specialStr, callback) {
    connection.execute(
      sqlRun,
      bindVar,
      function(err, result) {
        should.not.exist(err);
        var resultVal = result.outBinds.io;
        if(originalStr == 'EMPTY_CLOB' || originalStr == null || originalStr == "" || originalStr == undefined) {
          should.strictEqual(resultVal, null);
        } else {
          compareResultStrAndOriginal(resultVal, originalStr, specialStr);
        }
        callback();
      }
    );
  };

  describe('76.1 CLOB, PLSQL, BIND_INOUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_743 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
               "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
               "END nodb_clob_in_out_743;";
    var sqlRun = "begin nodb_clob_in_out_743(:i, :io); end;";
    var proc_drop = "DROP PROCEDURE nodb_clob_in_out_743";
    var proc_7431 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_7431 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, EMPTY_CLOB()); \n" +
                    "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                    "END nodb_clob_in_out_7431;";
    var sqlRun_7431 = "begin nodb_clob_in_out_7431(:i, :io); end;";
    var proc_drop_7431 = "DROP PROCEDURE nodb_clob_in_out_7431";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('76.1.1 works with EMPTY_CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      async.series([
        function(cb) {
          executeSQL(proc_7431, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7431, bindVar, 'EMPTY_CLOB', null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7431, cb);
        }
      ], done);
    }); // 76.1.1

    it('76.1.2 works with EMPTY_CLOB and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      async.series([
        function(cb) {
          executeSQL(proc_7431, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7431, bindVar, 'EMPTY_CLOB', null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7431, cb);
        }
      ], done);
    }); // 76.1.2

    it('76.1.3 works with EMPTY_CLOB and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          executeSQL(proc_7431, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7431, bindVar, 'EMPTY_CLOB', null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7431, cb);
        }
      ], done);
    }); // 76.1.3

    it('76.1.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, done);
    }); // 76.1.4

    it('76.1.5 works with null and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, done);
    }); // 76.1.5

    it('76.1.6 works with null and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, done);
    }); // 76.1.6

    it('76.1.7 works with empty string', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      plsqlBindInOut(sqlRun, bindVar, "", null, done);
    }); // 76.1.7

    it('76.1.8 works with empty string and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, "", null, done);
    }); // 76.1.8

    it('76.1.9 works with empty string and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, "", null, done);
    }); // 76.1.9

    it('76.1.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, done);
    }); // 76.1.10

    it('76.1.11 works with undefined and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, done);
    }); // 76.1.11

    it('76.1.12 works with undefined and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, done);
    }); // 76.1.12

    it('76.1.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: NaN, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 76.1.13

    it('76.1.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: 0, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 76.1.14

    it('76.1.15 works with String length 32K', function(done) {
      var specialStr = "76.1.15";
      var len = 32768;
      var clobVal = random.getRandomString(len, specialStr);
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr, done);
    }); // 76.1.15

    it('76.1.16 works with String length (64K - 1)', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.16";
      var len = 65535;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr, done);
    }); // 76.1.16

    it('76.1.17 works with String length (64K + 1)', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.17";
      var len = 65537;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr, done);
    }); // 76.1.17

    it('76.1.18 works with String length (1MB + 1)', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.18";
      var len = 1048577; // 1 * 1024 * 1024 + 1
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr, done);
    }); // 76.1.18

    it('76.1.19 works with bind value and type mismatch', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: 10, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 76.1.19

    it('76.1.20 mixing named with positional binding', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.20";
      var len = 50000;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = [ sequence, { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: clobVal, maxSize: len } ];

      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var resultVal = result.outBinds[0];
          compareResultStrAndOriginal(resultVal, clobVal, specialStr);
          done();
        }
      );
    }); // 76.1.20

    it('76.1.21 works with UPDATE', function(done) {
      var sequence = insertID++;
      var len_1 = 50000;
      var specialStr_1 = "76.1.21_1";
      var clobVal_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 300;
      var specialStr_2 = "76.1.21_2";
      var clobVal_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        id: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        i: { val: clobVal_1, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: len_1 },
        io: { val: clobVal_2, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len_2 }
      };

      var proc_74324 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74324 (lob_id IN NUMBER, lob_in IN CLOB, lob_in_out IN OUT CLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = lob_in_out where id = lob_id; \n" +
                       "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74324;";
      var sqlRun_74324 = "begin nodb_clob_in_out_74324(:id, :i, :io); end;";
      var proc_drop_74324 = "DROP PROCEDURE nodb_clob_in_out_74324";

      async.series([
        function(cb) {
          executeSQL(proc_74324, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_74324, bindVar, clobVal_2, specialStr_2, cb);
        },
        function(cb) {
          executeSQL(proc_drop_74324, cb);
        }
      ], done);
    }); // 76.1.21

    it('76.1.22 works with invalid CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: {}, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 76.1.22

    it('76.1.23 works with substr', function(done) {
      var proc_76126 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74126 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
                       "    select substr(clob_1, 1, 3) into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74126;";
      var sqlRun_76126 = "begin nodb_clob_in_out_74126(:i, :io); end;";
      var proc_drop_76126 = "DROP PROCEDURE nodb_clob_in_out_74126";
      var sequence = insertID++;
      var len = 32768;
      var specialStr = '76.1.23';
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobStr, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      async.series([
        function(cb) {
          executeSQL(proc_76126, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_76126,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.io;
              // PLSQL substr function: the position starts from zero(0).
              // The substring method extracts the characters in a string between "start" and "end", not including "end" itself.
              clobStr = clobStr.substring(0, 3);
              should.strictEqual(resultVal.length, 3);
              should.strictEqual(resultVal, clobStr);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_76126, cb);
        }
      ], done);
    }); // 76.1.23

    it.skip('76.1.24 named binding: maxSize smaller than string length( < 32K )', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.24";
      var len = 300;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          console.log(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460:');
          done();
        }
      );
    }); // 76.1.24

    it('76.1.25 named binding: maxSize smaller than string length( > 32K )', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.25";
      var len = 50000;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 76.1.25

    it('76.1.26 named binding: maxSize smaller than string length( > 64K )', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.26";
      var len = 65539;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 76.1.26

    it.skip('76.1.27 positional binding: maxSize smaller than string length( < 32K )', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.27";
      var len = 300;
      var clobVal = random.getRandomString(len, specialStr);
      sqlRun = "begin nodb_clob_in_out_743(:1, :2); end;";
      var bindVar = [ sequence, { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 } ];

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460:');
          done();
        }
      );
    }); // 76.1.27

    it('76.1.28 positional binding: maxSize smaller than string length( > 32K )', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.28";
      var len = 50000;
      var clobVal = random.getRandomString(len, specialStr);
      sqlRun = "begin nodb_clob_in_out_743(:1, :2); end;";
      var bindVar = [ sequence, { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 } ];

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 76.1.28

    it('76.1.29 positional binding: maxSize smaller than string length( > 64K )', function(done) {
      var sequence = insertID++;
      var specialStr = "76.1.29";
      var len = 65539;
      var clobVal = random.getRandomString(len, specialStr);
      sqlRun = "begin nodb_clob_in_out_743(:1, :2); end;";
      var bindVar = [ sequence, { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 } ];

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 76.1.29

  }); // 76.1

  describe('76.2 CLOB, PLSQL, BIND_INOUT to VARCHAR2', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_743 (lob_id IN NUMBER, lob_in_out IN OUT VARCHAR2) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
               "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
               "END nodb_clob_in_out_743;";
    var sqlRun = "begin nodb_clob_in_out_743(:i, :io); end;";
    var proc_drop = "DROP PROCEDURE nodb_clob_in_out_743";
    var proc_7421 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_7421 (lob_id IN NUMBER, lob_in_out IN OUT VARCHAR2) \n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, EMPTY_CLOB()); \n" +
                    "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                    "END nodb_clob_in_out_7421;";
    var sqlRun_7421 = "begin nodb_clob_in_out_7421(:i, :io); end;";
    var proc_drop_7421 = "DROP PROCEDURE nodb_clob_in_out_7421";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('76.2.1 works with EMPTY_CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      async.series([
        function(cb) {
          executeSQL(proc_7421, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7421, bindVar, 'EMPTY_CLOB', null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7421, cb);
        }
      ], done);
    }); // 76.2.1

    it('76.2.2 works with EMPTY_CLOB and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      async.series([
        function(cb) {
          executeSQL(proc_7421, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7421, bindVar, 'EMPTY_CLOB', null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7421, cb);
        }
      ], done);
    }); // 76.2.2

    it('76.2.3 works with EMPTY_CLOB and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          executeSQL(proc_7421, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7421, bindVar, 'EMPTY_CLOB', null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7421, cb);
        }
      ], done);
    }); // 76.2.3

    it('76.2.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, done);
    }); // 76.2.4

    it('76.2.5 works with null and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, done);
    }); // 76.2.5

    it('76.2.6 works with null and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, done);
    }); // 76.2.6

    it('76.2.7 works with empty string', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      plsqlBindInOut(sqlRun, bindVar, "", null, done);
    }); // 76.2.7

    it('76.2.8 works with empty string and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, "", null, done);
    }); // 76.2.8

    it('76.2.9 works with empty string and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, "", null, done);
    }); // 76.2.9

    it('76.2.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, done);
    }); // 76.2.10

    it('76.2.11 works with undefined and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, done);
    }); // 76.2.11

    it('76.2.12 works with undefined and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, done);
    }); // 76.2.12

    it('76.2.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: NaN, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 76.2.13

    it('76.2.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: 0, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 76.2.14

    it('76.2.15 works with String length (32K - 1)', function(done) {
      var specialStr = "76.2.15";
      var len = 32767;
      var clobVal = random.getRandomString(len, specialStr);
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr, done);
    }); // 76.2.15

    it('76.2.16 works with String length 32K', function(done) {
      var sequence = insertID++;
      var specialStr = "76.2.16";
      var len = 32768;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // ORA-06502: PL/SQL: numeric or value error
          (err.message).should.startWith('ORA-06502:');
          done();
        }
      );
    }); // 76.2.16

    it('76.2.17 works with bind out maxSize smaller than string length', function(done) {
      var sequence = insertID++;
      var specialStr = "76.2.17";
      var len = 600;
      var clobVal = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // DPI-1019: buffer size is too small
          (err.message).should.startWith('DPI-1019:');
          done();
        }
      );
    }); // 76.2.17

    it('76.2.18 works with UPDATE', function(done) {
      var sequence = insertID++;
      var len_1 = 500;
      var specialStr_1 = "76.2.18_1";
      var clobVal_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 300;
      var specialStr_2 = "76.2.18_2";
      var clobVal_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        id: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        i: { val: clobVal_1, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: len_1 },
        io: { val: clobVal_2, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len_2 }
      };

      var proc_74218 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74218 (lob_id IN NUMBER, lob_in IN VARCHAR2, lob_in_out IN OUT VARCHAR2) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = lob_in_out where id = lob_id; \n" +
                       "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74218;";
      var sqlRun_74218 = "begin nodb_clob_in_out_74218(:id, :i, :io); end;";
      var proc_drop_74218 = "DROP PROCEDURE nodb_clob_in_out_74218";

      async.series([
        function(cb) {
          executeSQL(proc_74218, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_74218, bindVar, clobVal_2, specialStr_2, cb);
        },
        function(cb) {
          executeSQL(proc_drop_74218, cb);
        }
      ], done);
    }); // 76.2.18

    it('76.2.19 works with invalid CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: {}, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 76.2.19

    it('76.2.20 works with substr', function(done) {
      var proc_76220 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74220 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
                       "    select substr(clob_1, 1, 3) into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74220;";
      var sqlRun_76220 = "begin nodb_clob_in_out_74220(:i, :io); end;";
      var proc_drop_76220 = "DROP PROCEDURE nodb_clob_in_out_74220";
      var sequence = insertID++;
      var len = 3000;
      var specialStr = '76.2.20';
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobStr, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      async.series([
        function(cb) {
          executeSQL(proc_76220, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_76220,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.io;
              // PLSQL substr function: the position starts from zero(0).
              // The substring method extracts the characters in a string between "start" and "end", not including "end" itself.
              clobStr = clobStr.substring(0, 3);
              should.strictEqual(resultVal.length, 3);
              should.strictEqual(resultVal, clobStr);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_76220, cb);
        }
      ], done);
    }); // 76.2.20

  }); // 76.2

  describe('76.3 Multiple CLOBs, BIND INOUT', function() {
    var lobs_proc_inout_762 = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_746 (lob_id IN NUMBER, clob_1 IN OUT CLOB, clob_2 IN OUT CLOB) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    insert into nodb_tab_clob_in (id, clob_1, clob_2) values (lob_id, clob_1, clob_2); \n" +
                              "    select clob_1, clob_2 into clob_1, clob_2 from nodb_tab_clob_in where id = lob_id; \n" +
                              "END nodb_lobs_in_out_746;";
    var sqlRun_762 = "begin nodb_lobs_in_out_746(:i, :io1, :io2); end;";
    var proc_drop_762 = "DROP PROCEDURE nodb_lobs_in_out_746";

    before(function(done) {
      executeSQL(lobs_proc_inout_762, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop_762, done);
    }); // after

    it('76.3.1 bind a txt file and a 32K string', function(done) {
      var specialStr = "76.3.1";
      var len1 = 32768;
      var clobVal = random.getRandomString(len1, specialStr);
      var sequence = insertID++;
      var preparedCLOBID = insertID++;

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
          prepareTableWithClob(sql, preparedCLOBID, cb);
        },
        function(cb) {
          connection.execute(
            "select clob from nodb_tab_lobs_in where id = :id",
            { id: preparedCLOBID },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var clob = result.rows[0][0];
              connection.execute(
                sqlRun_762,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
                  io1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
                  io2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result) {
                  should.not.exist(err);
                  var resultVal = result.outBinds.io1;
                  compareResultStrAndOriginal(resultVal, clobVal, specialStr);

                  var lob = result.outBinds.io2;
                  should.exist(lob);
                  lob.setEncoding("utf8");
                  var clobData = '';
                  lob.on('data', function(chunk) {
                    clobData += chunk;
                  });

                  lob.on('error', function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lob.on('end', function() {
                    fs.readFile( inFileName, { encoding: 'utf8' }, function(err, originalData) {
                      should.not.exist(err);
                      should.strictEqual(clobData, originalData);
                    });
                  });
                  cb();
                }
              );
            }
          );
        }
      ], done);
    }); // 76.3.1

    it('76.3.2 bind a txt file and a (64K - 1) string', function(done) {
      var specialStr = "76.3.2";
      var len1 = 65535;
      var clobVal = random.getRandomString(len1, specialStr);
      var preparedCLOBID = insertID++;
      var sequence = insertID++;

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
          prepareTableWithClob(sql, preparedCLOBID, cb);
        },
        function(cb) {
          connection.execute(
            "select clob from nodb_tab_lobs_in where id = :id",
            { id: preparedCLOBID },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var clob = result.rows[0][0];
              connection.execute(
                sqlRun_762,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN, maxSize: len1 },
                  io1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
                  io2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result) {
                  should.not.exist(err);
                  var resultVal = result.outBinds.io1;
                  compareResultStrAndOriginal(resultVal, clobVal, specialStr);

                  var lob = result.outBinds.io2;
                  should.exist(lob);
                  lob.setEncoding("utf8");
                  var clobData = '';
                  lob.on('data', function(chunk) {
                    clobData += chunk;
                  });

                  lob.on('error', function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lob.on('end', function() {
                    fs.readFile( inFileName, { encoding: 'utf8' }, function(err, originalData) {
                      should.not.exist(err);
                      should.strictEqual(clobData, originalData);
                    });
                  });
                  cb();
                }
              );
            }
          );
        }
      ], done);
    }); // 76.3.2

    it('76.3.3 bind a txt file and a (64K + 1) string', function(done) {
      var specialStr = "76.3.3";
      var len1 = 65537;
      var clobVal = random.getRandomString(len1, specialStr);
      var preparedCLOBID = insertID++;
      var sequence = insertID++;

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
          prepareTableWithClob(sql, preparedCLOBID, cb);
        },
        function(cb) {
          connection.execute(
            "select clob from nodb_tab_lobs_in where id = :id",
            { id: preparedCLOBID },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var clob = result.rows[0][0];
              connection.execute(
                sqlRun_762,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN, maxSize: len1 },
                  io1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
                  io2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result) {
                  var resultVal = result.outBinds.io1;
                  compareResultStrAndOriginal(resultVal, clobVal, specialStr);

                  var lob = result.outBinds.io2;
                  should.exist(lob);
                  lob.setEncoding("utf8");
                  var clobData = '';
                  lob.on('data', function(chunk) {
                    clobData += chunk;
                  });

                  lob.on('error', function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lob.on('end', function() {
                    fs.readFile( inFileName, { encoding: 'utf8' }, function(err, originalData) {
                      should.not.exist(err);
                      should.strictEqual(clobData, originalData);
                    });
                  });
                  cb();
                }
              );
            }
          );
        }
      ], done);
    }); // 76.3.3

  }); // 76.3

});
