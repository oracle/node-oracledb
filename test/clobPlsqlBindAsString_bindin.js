/* Copyright (c) 2016, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   74. clobPlsqlBindAsString_bindin.js
 *
 * DESCRIPTION
 *   Testing CLOB binding in as String.
 *
 * NUMBERING RULElist
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
var fs       = require('fs');
var random   = require('./random.js');

describe('74. clobPlsqlBindAsString_bindin.js', function() {
  this.timeout(100000);

  var connection = null;
  var client11gPlus = true; // assume instant client runtime version is greater than 11.2.0.4.0
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
          // Check whether instant client runtime version is smaller than 12.1.0.2
          if(oracledb.oracleClientVersion < 1201000200)
            client11gPlus = false;

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

  var verifyClobValueWithFileData = function(selectSql, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        should.exist(lob);
        // set the encoding so we get a 'string' not a 'buffer'
        lob.setEncoding('utf8');
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
            return callback();
          });
        });
      }
    );
  };

  // check the plsql bind in value
  var compareBindInResult = function(selectSql, originalString, specialStr, case64KPlus, client11gPlus, callback) {
    if(client11gPlus === false && case64KPlus === true){
      callback();
    } else {
      verifyClobValueWithString(selectSql, originalString, specialStr, case64KPlus, client11gPlus, callback);
    }
  };

  // compare the selected value from DB with the inserted string
  var verifyClobValueWithString = function(selectSql, originalString, specialStr, case64KPlus, client11gPlus, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];

        if (originalString == null || originalString == undefined) {
          should.not.exist(lob);
          return callback();
        } else {
          should.exist(lob);
          // set the encoding so we get a 'string' not a 'buffer'
          lob.setEncoding('utf8');
          var clobData = '';

          lob.on('data', function(chunk) {
            clobData += chunk;
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function() {
            if(originalString == "") {
              should.strictEqual(clobData, "");
              callback();
            } else {
              compareResultStrAndOriginal(clobData, originalString, specialStr, callback);
            }
          });
        }
      }
    );
  };

  // compare the result string with the original inserted string
  var compareResultStrAndOriginal = function(resultVal, originalStr, specialStr, callback) {
    var resultLength = resultVal.length;
    var specStrLength = specialStr.length;
    should.strictEqual(resultLength, originalStr.length);
    should.strictEqual(resultVal.substring(0, specStrLength), specialStr);
    should.strictEqual(resultVal.substring(resultLength - specStrLength, resultLength), specialStr);
    callback();
  };

  // execute the bind in plsql procedure
  var plsqlBindIn = function(sqlRun, bindVar, option, case64KPlus, client11gPlus, callback) {
    connection.execute(
      sqlRun,
      bindVar,
      option,
      function(err) {
        if(case64KPlus === true  && client11gPlus === false) {
          should.exist(err);
          // NJS-050: data must be shorter than 65535
          (err.message).should.startWith('NJS-050:');
        } else {
          should.not.exist(err);
        }
        callback();
      });
  };

  describe('74.1 CLOB, PLSQL, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN CLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
               "END nodb_clobs_in_741; ";
    var sqlRun = "BEGIN nodb_clobs_in_741 (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE nodb_clobs_in_741";
    var proc_7411 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_7411 (clob_id IN NUMBER, clob_in IN CLOB)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, EMPTY_CLOB()); \n" +
                    "END nodb_clobs_in_7411; ";
    var sqlRun_7411 = "BEGIN nodb_clobs_in_7411 (:i, :c); END;";
    var proc_drop_7411 = "DROP PROCEDURE nodb_clobs_in_7411";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.1.1 works with EMPTY_CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7411, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7411, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, "", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7411, cb);
        }
      ], done);
    }); // 74.1.1

    it('74.1.2 works with EMPTY_CLOB and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7411, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7411, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, "", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7411, cb);
        }
      ], done);
    }); // 74.1.2

    it('74.1.3 works with EMPTY_CLOB and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7411, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7411, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, "", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7411, cb);
        }
      ], done);
    }); // 74.1.3

    it('74.1.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.4

    it('74.1.5 works with null and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.5

    it('74.1.6 works with null and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.6

    it('74.1.7 works with empty string', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN}
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.7

    it('74.1.8 works with empty string and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1}
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.8

    it('74.1.9 works with empty string and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535}
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.9

    it('74.1.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.10

    it('74.1.11 works with undefined and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.11

    it('74.1.12 works with undefined and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.12

    it('74.1.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 74.1.13

    it('74.1.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 74.1.14

    it('74.1.15 works with String length 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var len = 32768;
      var sequence = insertID++;
      var specialStr = "74.1.15";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.15

    it('74.1.16 works with String length (64K - 1)', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb

      var len = 65535;
      var sequence = insertID++;
      var specialStr = "74.1.16";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.16

    it('74.1.17 works with String length (64K + 1)', function(done) {
      var len = 65537;
      var sequence = insertID++;
      var specialStr = "74.1.17";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, true, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, true, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.17

    it('74.1.18 works with String length (1MB + 1)', function(done) {
      var len = 1048577; // 1 * 1024 * 1024 + 1
      var sequence = insertID++;
      var specialStr = "74.1.18";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, true, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, true, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.18

    it('74.1.19 works with String length (5MB + 1)', function(done) {
      var len = 5242881; // 5 * 1024 * 1024 + 1;
      var sequence = insertID++;
      var specialStr = "74.1.19";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, true, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, true, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.19

    it('74.1.20 works with String length (10MB + 1)', function(done) {
      var len = 10485761; // 10 * 1024 * 1024 + 1;
      var sequence = insertID++;
      var specialStr = "74.1.20";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, true, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, true, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.20

    it('74.1.21 works with bind value and type mismatch', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 20, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 74.1.21

    it('74.1.22 mixing named with positional binding', function(done) {
      var sqlRun_7419 = "BEGIN nodb_clobs_in_741 (:1, :2); END;";
      var len = 50000;
      var sequence = insertID++;
      var specialStr = "74.1.22";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = [ sequence, { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 } ];
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun_7419, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.22

    it('74.1.23 works with invalid CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: {}, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 5000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-012: encountered invalid bind datatype in parameter 2
          (err.message).should.startWith('NJS-012:');
          done();
        }
      );
    }); // 74.1.23

    it('74.1.24 works with bind in maxSize smaller than string length', function(done) {
      var len = 50000;
      var sequence = insertID++;
      var specialStr = "74.1.24";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len - 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.1.24

    it('74.1.25 RETURN with bind type STRING', function(done) {
      var proc_74123 = "CREATE OR REPLACE FUNCTION nodb_clobs_in_74123 (clob_id IN NUMBER, clob_in IN CLOB) RETURN VARCHAR2\n" +
                       "IS \n" +
                       "    strVal VARCHAR2(500); \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
                       "    select clob_1 into strVal from nodb_tab_clob_in where id = clob_id; \n" +
                       "    return strVal; \n" +
                       "END nodb_clobs_in_74123; ";
      var sqlRun_74123 = "BEGIN :o := nodb_clobs_in_74123(:i, :c); END;";
      var proc_drop_74123 = "DROP FUNCTION nodb_clobs_in_74123";
      var len = 500;
      var sequence = insertID++;
      var specialStr = "74.1.25";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len },
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_74123, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_74123,
            bindVar,
            option,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.o;
              compareResultStrAndOriginal(resultVal, clobStr, specialStr, cb);
            });
        },
        function(cb) {
          executeSQL(proc_drop_74123, cb);
        }
      ], done);
    }); // 74.1.25

    it('74.1.26 works with UPDATE', function(done) {
      var proc_74124 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_74124 (clob_id IN NUMBER, clob_in IN CLOB, clob_update IN CLOB)\n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = clob_update where id = clob_id; \n" +
                       "END nodb_clobs_in_74124; ";
      var sqlRun_74124 = "BEGIN nodb_clobs_in_74124 (:i, :c1, :c2); END;";
      var proc_drop_74124 = "DROP PROCEDURE nodb_clobs_in_74124";
      var sequence = insertID++;
      var len_1 = 5000;
      var specialStr_1 = "74.1.26_1";
      var clobStr_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 65535;
      var specialStr_2 = "74.1.26_2";
      var clobStr_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 },
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_74124, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_74124,
            bindVar,
            option,
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr_2, specialStr_2, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_74124, cb);
        }
      ], done);
    }); // 74.1.26

  }); // 74.1

  describe('74.2 CLOB, PLSQL, BIND_IN to VARCHAR2', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN VARCHAR2)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
               "END nodb_clobs_in_741; ";
    var sqlRun = "BEGIN nodb_clobs_in_741 (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE nodb_clobs_in_741";
    var proc_7411 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_7411 (clob_id IN NUMBER, clob_in IN VARCHAR2)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, EMPTY_CLOB()); \n" +
                    "END nodb_clobs_in_7411; ";
    var sqlRun_7411 = "BEGIN nodb_clobs_in_7411 (:i, :c); END;";
    var proc_drop_7411 = "DROP PROCEDURE nodb_clobs_in_7411";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.2.1 works with EMPTY_CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7411, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7411, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, "", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7411, cb);
        }
      ], done);
    }); // 74.2.1

    it('74.2.2 works with EMPTY_CLOB and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7411, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7411, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, "", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7411, cb);
        }
      ], done);
    }); // 74.2.2

    it('74.2.3 works with EMPTY_CLOB and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7411, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7411, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, "", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7411, cb);
        }
      ], done);
    }); // 74.2.3

    it('74.2.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.4

    it('74.2.5 works with null and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.5

    it('74.2.6 works with null and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.6

    it('74.2.7 works with empty string', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN}
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.7

    it('74.2.8 works with empty string and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1}
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.8

    it('74.2.9 works with empty string and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535}
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.9

    it('74.2.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.10

    it('74.2.11 works with undefined and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.11

    it('74.2.12 works with undefined and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.12

    it('74.2.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 74.2.13

    it('74.2.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 74.2.14

    it('74.2.15 works with String length (32K - 1)', function(done) {
      var len = 32767;
      var sequence = insertID++;
      var specialStr = "74.2.15";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.15

    it('74.2.16 works with String length 32K', function(done) {
      var len = 32768;
      var sequence = insertID++;
      var specialStr = "74.2.16";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      var option = { autoCommit: true };

      connection.execute(
        sqlRun,
        bindVar,
        option,
        function(err) {
          should.exist(err);
          // ORA-06502: PL/SQL: numeric or value error
          (err.message).should.startWith('ORA-06502:');
          done();
        }
      );
    }); // 74.2.16

    it('74.2.17 works with invalid CLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: {}, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 5000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-012: encountered invalid bind datatype in parameter 2
          (err.message).should.startWith('NJS-012:');
          done();
        }
      );
    }); // 74.2.17

    it('74.2.18 works with bind in maxSize smaller than string length', function(done) {
      var len = 500;
      var sequence = insertID++;
      var specialStr = "74.2.18";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len - 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.2.18

    it('74.2.19 works with UPDATE', function(done) {
      var proc_74219 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_74219 (clob_id IN NUMBER, clob_in IN VARCHAR2, clob_update IN VARCHAR2)\n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = clob_update where id = clob_id; \n" +
                       "END nodb_clobs_in_74219; ";
      var sqlRun_74219 = "BEGIN nodb_clobs_in_74219 (:i, :c1, :c2); END;";
      var proc_drop_74219 = "DROP PROCEDURE nodb_clobs_in_74219";
      var sequence = insertID++;
      var len_1 = 3000;
      var specialStr_1 = "74.2.19_1";
      var clobStr_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 2000;
      var specialStr_2 = "74.2.19_2";
      var clobStr_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 },
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_74219, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_74219,
            bindVar,
            option,
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql, clobStr_2, specialStr_2, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_74219, cb);
        }
      ], done);
    }); // 74.2.19

  }); // 74.2

  describe('74.3 Multiple CLOBs, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_742 (clob_id IN NUMBER, clob_1 IN CLOB, clob_2 IN CLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1, clob_2) values (clob_id, clob_1, clob_2); \n" +
               "END nodb_lobs_in_742; ";
    var sqlRun = "BEGIN nodb_lobs_in_742 (:i, :c1, :c2); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_742";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.3.1 bind two string', function(done) {
      var sequence = insertID++;
      var len_1 = 50000;
      var specialStr_1 = "74.3.1_1";
      var clobStr_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 10000;
      var specialStr_2 = "74.3.1_2";
      var clobStr_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, false, client11gPlus, cb);
        },
        function(cb) {
          var sql_1 = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql_1, clobStr_1, specialStr_1, false, client11gPlus, cb);
        },
        function(cb) {
          var sql_2 = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql_2, clobStr_2, specialStr_2, false, client11gPlus, cb);
        }
      ], done);
    }); // 74.3.1

    it('74.3.2 bind a txt file and a string', function(done) {
      var preparedCLOBID = 200;
      var len_1 = 50000;
      var specialStr_1 = "74.3.2";
      var clobStr_1 = random.getRandomString(len_1, specialStr_1);
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
                sqlRun,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
                  c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
                  c2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
                },
                { autoCommit: true },
                function(err) {
                  should.not.exist(err);
                  cb();
                }
              );
            }
          );
        },
        function(cb) {
          var sql_1 = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql_1, clobStr_1, specialStr_1, false, client11gPlus, cb);
        },
        function(cb) {
          var sql_2 = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithFileData(sql_2, cb);
        }
      ], done);
    }); // 74.3.2

    it('74.3.3 bind two string, one > (64K - 1)', function(done) {
      var sequence = insertID++;
      var len_1 = 65538;
      var specialStr_1 = "74.3.3_1";
      var clobStr_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 10000;
      var specialStr_2 = "74.3.3_2";
      var clobStr_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, true, client11gPlus, cb);
        },
        function(cb) {
          var sql_1 = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql_1, clobStr_1, specialStr_1, true, client11gPlus, cb);
        },
        function(cb) {
          var sql_2 = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
          compareBindInResult(sql_2, clobStr_2, specialStr_2, true, client11gPlus, cb);
        }
      ], done);
    }); // 74.3.3

  }); // 74.3

}); // 74
