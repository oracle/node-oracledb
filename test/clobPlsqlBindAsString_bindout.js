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
 *   75. clobPlsqlBindAsString_bindout.js
 *
 * DESCRIPTION
 *   Testing CLOB binding out as String.
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
var fs       = require('fs');
var dbConfig = require('./dbconfig.js');
var file     = require('./file.js');
var random   = require('./random.js');

describe('75. clobPlsqlBindAsString_bindout.js', function() {
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
      },
      function(cb) {
        file.delete(inFileStreamed);
        cb();
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

  var insertClobWithString = function(id, insertStr, case64KPlus, client11gPlus, callback) {
    var sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
    var bindVar = {
      i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertStr, dir: oracledb.BIND_IN, type: oracledb.STRING }
    };

    if (insertStr == 'EMPTY_LOB') {
      sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, EMPTY_CLOB())";
      bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER }
      };
    }
    connection.execute(
      sql,
      bindVar,
      function(err, result) {
        if(client11gPlus === false && case64KPlus === true){
          should.exist(err);
          // NJS-050: data must be shorter than 65535
          (err.message).should.startWith('NJS-050:');
          streamedIntoClobTable1(id, insertStr, callback);
        } else {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      }
    );
  };

  var inFileStreamed = './test/clobTmpFile.txt';
  // Generate a file and streamed into clob column
  var streamedIntoClobTable1 = function(id, content, callback) {
    file.write(inFileStreamed, content);
    setTimeout(function(){
      connection.execute(
        "INSERT INTO nodb_tab_clob_in (id, clob_1, clob_2) VALUES (:i, EMPTY_CLOB(), EMPTY_CLOB()) RETURNING clob_1 INTO :lobbv",
        { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } },
        { autoCommit: false },
        function(err, result) {
          should.not.exist(err);
          (result.rowsAffected).should.be.exactly(1);
          (result.outBinds.lobbv.length).should.be.exactly(1);

          var inStream = fs.createReadStream(inFileStreamed);
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
              callback();
            });
          });

          inStream.pipe(lob); // copies the text to the CLOB
        }
      );
    }, 3000);
  };

  var preparedInFileName = './test/clobexample.txt';

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

        var inStream = fs.createReadStream(preparedInFileName);
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
          fs.readFile( preparedInFileName, { encoding: 'utf8' }, function(err, originalData) {
            should.not.exist(err);
            should.strictEqual(clobData, originalData);
            return callback();
          });
        });
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

  var verifyBindOutResult = function(sqlRun, bindVar, originalStr, specialStr, case64KPlus, client11gPlus, callback) {
    connection.execute(
      sqlRun,
      bindVar,
      function(err, result) {
        if(originalStr == "EMPTY_LOB" || originalStr == undefined || originalStr == null || originalStr == "") {
          should.not.exist(err);
          should.strictEqual(result.outBinds.c, null);
          callback();
        } else {
          if(client11gPlus === false && case64KPlus === true){
            // NJS-051: "maxSize" must be less than 65535
            (err.message).should.startWith('NJS-051:');
            callback();
          } else {
            should.not.exist(err);
            var resultVal = result.outBinds.c;
            compareResultStrAndOriginal(resultVal, originalStr, specialStr);
            callback();
          }
        }
      }
    );
  };

  describe('75.1 CLOB, PLSQL, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_741 (clob_id IN NUMBER, clob_out OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
                "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_clobs_out_741; ";
    var sqlRun = "BEGIN nodb_clobs_out_741 (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE nodb_clobs_out_741";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('75.1.1 works with EMPTY_LOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.1

    it('75.1.2 works with EMPTY_LOB and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.2

    it('75.1.3 works with EMPTY_LOB and bind out maxSize set to (64k - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.3

    it('75.1.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.4

    it('75.1.5 works with null and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.5

    it('75.1.6 works with null and bind out maxSize set to (64k - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.6

    it('75.1.7 works with empty string', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.7

    it('75.1.8 works with empty string and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.8

    it('75.1.9 works with empty string and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.9

    it('75.1.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, undefined, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.10

    it('75.1.11 works with undefined and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, undefined, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.11

    it('75.1.12 works with undefined and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, undefined, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.12

    it('75.1.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };

      var sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      connection.execute(
        sql,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 75.1.13

    it('75.1.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };

      var sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      connection.execute(
        sql,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 75.1.14

    it('75.1.15 works with String length 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var len = 32768;
      var sequence = insertID++;
      var specialStr = "75.1.15";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.15

    it('75.1.16 works with String length (64K - 1)', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb

      var len = 65535;
      var sequence = insertID++;
      var specialStr = "75.1.16";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.1.16

    it('75.1.17 works with String length (64K + 1)', function(done) {
      var len = 65537;
      var sequence = insertID++;
      var specialStr = "75.1.17";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, true, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr, true, client11gPlus, cb);
        },
        function(cb) {
          file.delete(inFileStreamed);
          cb();
        }
      ], done);
    }); // 75.1.17

    it('75.1.18 works with String length (1MB + 1)', function(done) {
      var len = 1048577; // 1 * 1024 * 1024 + 1
      var sequence = insertID++;
      var specialStr = "75.1.18";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, true, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr, true, client11gPlus, cb);
        },
        function(cb) {
          file.delete(inFileStreamed);
          cb();
        }
      ], done);
    }); // 75.1.18

    it('75.1.19 works with String length (5MB + 1)', function(done) {
      var len = 5242881; // 5 * 1024 * 1024 + 1;
      var sequence = insertID++;
      var specialStr = "75.1.19";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, true, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr, true, client11gPlus, cb);
        },
        function(cb) {
          file.delete(inFileStreamed);
          cb();
        }
      ], done);
    }); // 75.1.19

    it('75.1.20 works with String length (10MB + 1)', function(done) {
      var len = 10485761; // 10 * 1024 * 1024 + 1;
      var sequence = insertID++;
      var specialStr = "75.1.20";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, true, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr, true, client11gPlus, cb);
        },
        function(cb) {
          file.delete(inFileStreamed);
          cb();
        }
      ], done);
    }); // 75.1.20

    it('75.1.21 works with bind value and type mismatch', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 100, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };

      var sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      connection.execute(
        sql,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 75.1.21

    it('75.1.22 mixing named with positional binding', function(done) {
      var len = 50000;
      var sequence = insertID++;
      var specialStr = "75.1.7";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len } ];

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              compareResultStrAndOriginal(resultVal, clobStr, specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 75.1.22

    it('75.1.23 works with bind out maxSize smaller than string length', function(done) {
      var len = 50000;
      var sequence = insertID++;
      var specialStr = "75.1.23";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 } ];

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err) {
              should.exist(err);
              // NJS-016: buffer is too small for OUT binds
              (err.message).should.startWith('NJS-016:');
              cb();
            }
          );
        }
      ], done);
    }); // 75.1.23

    it('75.1.24 works with UPDATE', function(done) {
      var proc_7412 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7412 (clob_id IN NUMBER, clob_out OUT CLOB, clob_in CLOB) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_clob_in set clob_1 = clob_in where id = clob_id; \n" +
                      "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7412; ";
      var sqlRun_7412 = "BEGIN nodb_clobs_out_7412 (:i, :co, :ci); END;";
      var proc_drop_7412 = "DROP PROCEDURE nodb_clobs_out_7412";
      var sequence = insertID++;
      var len_1 = 50000;
      var specialStr_1 = "75.1.24_1";
      var clobStr_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 2000;
      var specialStr_2 = "75.1.24_2";
      var clobStr_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len_1 },
        ci: { val:clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr_1, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_7412, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7412,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.co;
              compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_7412, cb);
        }
      ], done);
    }); // 75.1.24

    it('75.1.25 works with substr', function(done) {
      var proc_7415 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7415 (clob_id IN NUMBER, clob_out OUT CLOB) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    select substr(clob_1, 1, 3) into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7415; ";
      var sqlRun_7415 = "BEGIN nodb_clobs_out_7415 (:i, :co); END;";
      var proc_drop_7415 = "DROP PROCEDURE nodb_clobs_out_7415";
      var sequence = insertID++;
      var len = 50000;
      var specialStr = "75.1.25";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_7415, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7415,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.co;
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
          executeSQL(proc_drop_7415, cb);
        }
      ], done);
    }); // 75.1.25

  }); // 75.1

  describe('75.2 CLOB, PLSQL, BIND_OUT to VARCHAR2', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_742 (clob_id IN NUMBER, clob_out OUT VARCHAR2) \n" +
               "AS \n" +
               "BEGIN \n" +
                "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_clobs_out_742; ";
    var sqlRun = "BEGIN nodb_clobs_out_742 (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE nodb_clobs_out_742";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('75.2.1 works with EMPTY_LOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.1

    it('75.2.2 works with EMPTY_LOB and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.2

    it('75.2.3 works with EMPTY_LOB and bind out maxSize set to (64k - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.3

    it('75.2.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.4

    it('75.2.5 works with null and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.5

    it('75.2.6 works with null and bind out maxSize set to (64k - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.6

    it('75.2.7 works with empty string', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.7

    it('75.2.8 works with empty string and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.8

    it('75.2.9 works with empty string and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "", false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "", null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.9

    it('75.2.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, undefined, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.10

    it('75.2.11 works with undefined and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, undefined, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.11

    it('75.2.12 works with undefined and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, undefined, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.12

    it('75.2.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };

      var sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      connection.execute(
        sql,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 75.2.13

    it('75.2.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };

      var sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      connection.execute(
        sql,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 75.2.14

    it('75.2.15 works with String length (32K - 1)', function(done) {
      var len = 32767;
      var sequence = insertID++;
      var specialStr = "75.2.15";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr, false, client11gPlus, cb);
        }
      ], done);
    }); // 75.2.15

    it('75.2.16 works with String length 32K', function(done) {
      var len = 32768;
      var sequence = insertID++;
      var specialStr = "75.2.16";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err) {
              should.exist(err);
              // ORA-06502: PL/SQL: numeric or value error
              (err.message).should.startWith('ORA-06502:');
              cb();
            }
          );
        }
      ], done);
    }); // 75.2.16

    it('75.2.17 works with bind out maxSize smaller than string length', function(done) {
      var len = 500;
      var sequence = insertID++;
      var specialStr = "75.2.17";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 } ];

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err) {
              should.exist(err);
               // ORA-06502: PL/SQL: numeric or value error
              (err.message).should.startWith('ORA-06502:');
              cb();
            }
          );
        }
      ], done);
    }); // 75.2.17

    it('75.2.18 works with UPDATE', function(done) {
      var proc_7518 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7518 (clob_id IN NUMBER, clob_out OUT CLOB, clob_in VARCHAR2) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_clob_in set clob_1 = clob_in where id = clob_id; \n" +
                      "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7518; ";
      var sqlRun_7518 = "BEGIN nodb_clobs_out_7518 (:i, :co, :ci); END;";
      var proc_drop_7518 = "DROP PROCEDURE nodb_clobs_out_7518";
      var sequence = insertID++;
      var len_1 = 500;
      var specialStr_1 = "75.2.18_1";
      var clobStr_1 = random.getRandomString(len_1, specialStr_1);
      var len_2 = 200;
      var specialStr_2 = "75.2.18_2";
      var clobStr_2 = random.getRandomString(len_2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len_1 },
        ci: { val:clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr_1, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_7518, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7518,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.co;
              compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_7518, cb);
        }
      ], done);
    }); // 75.2.18

    it('75.2.19 works with substr', function(done) {
      var proc_7519 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7519 (clob_id IN NUMBER, clob_out OUT VARCHAR2) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    select substr(clob_1, 1, 3) into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7519; ";
      var sqlRun_7519 = "BEGIN nodb_clobs_out_7519 (:i, :co); END;";
      var proc_drop_7519 = "DROP PROCEDURE nodb_clobs_out_7519";
      var sequence = insertID++;
      var len = 500;
      var specialStr = "75.2.19";
      var clobStr = random.getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_7519, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7519,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.co;
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
          executeSQL(proc_drop_7519, cb);
        }
      ], done);
    }); // 75.2.19

  }); // 75.2

  describe('75.3 Multiple CLOBs, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_745 (clob_id IN NUMBER, clob_1 OUT CLOB, clob_2 OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select clob_1, clob_2 into clob_1, clob_2 from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_lobs_out_745; ";
    var sqlRun = "BEGIN nodb_lobs_out_745 (:i, :c1, :c2); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_out_745";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    var insertTwoClobWithString = function(id, insertStr1, insertStr2, case64KPlus, client11gPlus, callback) {
      var sql = "INSERT INTO nodb_tab_clob_in (id, clob_1, clob_2) VALUES (:i, :c1, :c2)";
      var bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        c1: { val: insertStr1, dir: oracledb.BIND_IN, type: oracledb.STRING },
        c2: { val: insertStr2, dir: oracledb.BIND_IN, type: oracledb.STRING }
      };

      connection.execute(
        sql,
        bindVar,
        function(err, result) {
          if(case64KPlus === true  && client11gPlus === false) {
            should.exist(err);
            // NJS-050: data must be shorter than 65535
            (err.message).should.startWith('NJS-050:');
          } else {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, 1);
          }
          callback();
        }
      );
    };

    it('75.3.1 bind two string', function(done) {
      var sequence = insertID++;
      var specialStr_1 = "75.3.1_1";
      var specialStr_2 = "75.3.1_2";
      var len1 = 50000;
      var len2 = 10000;
      var clobStr_1 = random.getRandomString(len1, specialStr_1);
      var clobStr_2 = random.getRandomString(len2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len1 },
        c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len2 }
      };

      async.series([
        function(cb) {
          insertTwoClobWithString(sequence, clobStr_1, clobStr_2, false, client11gPlus, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c1;
              compareResultStrAndOriginal(resultVal, clobStr_1, specialStr_1);
              resultVal = result.outBinds.c2;
              compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
              cb();
            }
          );
        }
      ], done);

    }); // 75.3.1

    it('75.3.2 bind a txt file and a string', function(done) {
      var specialStr = "75.3.2";
      var sequence = insertID++;
      var len1 = 50000;
      var clobStr_1 = random.getRandomString(len1, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len1 },
        c2: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_clob_in (id, clob_2) VALUES (:i, EMPTY_CLOB()) RETURNING clob_2 INTO :lobbv";
          prepareTableWithClob(sql, sequence, cb);
        },
        function(cb) {
          var sql = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithFileData(sql, cb);
        },
        function(cb) {
          var sql = "UPDATE nodb_tab_clob_in set clob_1 = :c where id = :i";
          var bindVar_1 = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len1 }
          };
          connection.execute(
            sql,
            bindVar_1,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            });
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c1;
              compareResultStrAndOriginal(resultVal, clobStr_1, specialStr);

              var lob = result.outBinds.c2;
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
                fs.readFile( preparedInFileName, { encoding: 'utf8' }, function(err, originalData) {
                  should.not.exist(err);
                  should.strictEqual(clobData, originalData);
                });
              });
              cb();
            }
          );
        }
      ], done);

    }); // 75.3.2

    it('75.3.3 bind two string, one > (64K - 1)', function(done) {
      var sequence = insertID++;
      var specialStr_1 = "75.3.3_1";
      var specialStr_2 = "75.3.3_2";
      var len1 = 65538;
      var len2 = 10000;
      var clobStr_1 = random.getRandomString(len1, specialStr_1);
      var clobStr_2 = random.getRandomString(len2, specialStr_2);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len1 },
        c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len2 }
      };

      async.series([
        function(cb) {
          insertTwoClobWithString(sequence, clobStr_1, clobStr_2, true, client11gPlus, cb);
        },
        function(cb) {
          if(client11gPlus === false){
            cb();
          } else {
            connection.execute(
              sqlRun,
              bindVar,
              function(err, result) {
                should.not.exist(err);
                var resultVal = result.outBinds.c1;
                compareResultStrAndOriginal(resultVal, clobStr_1, specialStr_1);
                resultVal = result.outBinds.c2;
                compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
                cb();
              }
            );
          }
        }
      ], done);

    }); // 75.3.3

  }); // 75.3

});
