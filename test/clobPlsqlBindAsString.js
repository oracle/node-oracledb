/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   74. clobPlsqlBindAsString.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String.
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
var fs = require('fs');

describe('74.clobPlsqlBindAsString.js', function() {
  var connection = null;
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

  var insertClobWithString = function(id, insertStr, callback) {
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
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
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

  var verifyClobValueWithString = function(selectSql, originalString, specialStr, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];

        if (originalString == null | originalString == '' || originalString == undefined) {
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
            var resultLength = clobData.length;
            var specStrLength = specialStr.length;
            should.strictEqual(resultLength, originalString.length);
            should.strictEqual(clobData.substring(0, specStrLength), specialStr);
            should.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
            return callback();
          });
        }
      }
    );
  };

  var getRandomString = function(length, specialStr) {
    var str='';
    var strLength = length - specialStr.length * 2;
    for( ; str.length < strLength; str += Math.random().toString(36).slice(2));
    str = str.substr(0, strLength);
    str = specialStr + str + specialStr;
    return str;
  };

  describe('74.1 CLOB, PLSQL, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN CLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
               "END nodb_clobs_in_741; ";
    var sqlRun = "BEGIN nodb_clobs_in_741 (:i, :c); END;";
    var proc_drop = "DROP PROCEDURE nodb_clobs_in_741";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.1.1 PLSQL, BIND_IN with String length 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var len = 32768;
      var sequence = 1;
      var specialStr = "74.1.1";
      var clobStr = getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = 1";
          verifyClobValueWithString(sql, clobStr, specialStr, cb);
        }
      ], done);
    });  // 74.1.1

    it('74.1.2 PLSQL, BIND_IN with String length 64K - 1', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb

      var len = 65535;
      var sequence = 2;
      var specialStr = "74.1.2";
      var clobStr = getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = 2";
          verifyClobValueWithString(sql, clobStr, specialStr, cb);
        }
      ], done);
    }); // 74.1.2

    it('74.1.3 PLSQL, BIND_IN with null', function(done) {
      var sequence = 3;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = 3";
          verifyClobValueWithString(sql, null, null, cb);
        }
      ], done);
    }); // 74.1.3

    it('74.1.4 PLSQL, BIND_IN with empty string', function(done) {
      var sequence = 4;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = 4";
          verifyClobValueWithString(sql, null, null, cb);
        }
      ], done);
    }); // 74.1.4

    it('74.1.5 PLSQL, BIND_IN with undefined', function(done) {
      var sequence = 5;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = 5";
          verifyClobValueWithString(sql, null, null, cb);
        }
      ], done);
    }); // 74.1.5

    it('74.1.6 PLSQL, BIND_IN with NaN', function(done) {
      var sequence = 6;
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
    }); // 74.1.6

    it('74.1.7 PLSQL, BIND_IN with 0', function(done) {
      var sequence = 6;
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
    }); // 74.1.7

    it('74.1.8 PLSQL, BIND_IN bind value and type mismatch', function(done) {
      var sequence = 6;
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
    }); // 74.1.8

    it('74.1.9 PLSQL, BIND_IN mixing named with positional binding', function(done) {
      var sqlRun_7419 = "BEGIN nodb_clobs_in_741 (:1, :2); END;";
      var len = 50000;
      var sequence = 6;
      var specialStr = "74.1.9";
      var clobStr = getRandomString(len, specialStr);
      var bindVar = [ sequence, { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 } ];

      async.series([
        function(cb) {
          connection.execute(
            sqlRun_7419,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = 6";
          verifyClobValueWithString(sql, clobStr, specialStr, cb);
        }
      ], done);
    }); // 74.1.9

    it('74.1.10 PLSQL, BIND_IN with invalid CLOB', function(done) {
      var sequence = 7;
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
    }); // 74.1.10

  }); // 74.1

  describe('74.2 CLOB, PLSQL, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_742 (clob_id IN NUMBER, clob_out OUT CLOB) \n" +
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


    it('74.2.1 PLSQL, BIND_OUT with String length 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var len = 32768;
      var sequence = 11;
      var specialStr = "74.2.1";
      var clobStr = getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithString(sql, clobStr, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds.c.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, len);
              should.strictEqual(result.outBinds.c.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.c.substring(resultLength - specStrLength, resultLength), specialStr);
              cb();
            }
          );
        }
      ], done);

    });  // 74.2.1

    it('74.2.2 PLSQL, BIND_OUT with String length 34K - 1', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb

      var len = 65535;
      var sequence = 12;
      var specialStr = "74.2.2";
      var clobStr = getRandomString(len, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithString(sql, clobStr, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds.c.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, len);
              should.strictEqual(result.outBinds.c.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.c.substring(resultLength - specStrLength, resultLength), specialStr);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.2

    it('74.2.3 PLSQL, BIND_OUT for null with small maxsize', function(done) {
      var sequence = 13;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.c, null);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.3

    it('74.2.4 PLSQL, BIND_OUT for null with 64k maxsize', function(done) {
      var sequence = 14;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, null, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.c, null);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.4

    it('74.2.5 PLSQL, BIND_OUT with empty string', function(done) {
      var sequence = 15;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 50000 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "", cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.c, null);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.5

    it('74.2.6 PLSQL, BIND_OUT with undefined', function(done) {
      var sequence = 16;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 50000 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, undefined, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.c, null);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.6

    it('74.2.7 PLSQL, BIND_OUT mixing named with positional binding', function(done) {
      var len = 50000;
      var sequence = 17;
      var specialStr = "74.2.7";
      var clobStr = getRandomString(len, specialStr);
      var bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len } ];

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithString(sql, clobStr, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds[0].length;
              should.strictEqual(resultLength, len);
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, len);
              should.strictEqual(result.outBinds[0].substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds[0].substring(resultLength - specStrLength, resultLength), specialStr);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.67

    it('74.2.8 PLSQL, BIND_OUT with limited maxSize', function(done) {
      var len = 50000;
      var sequence = 18;
      var specialStr = "74.2.8";
      var clobStr = getRandomString(len, specialStr);
      var bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 } ];

      async.series([
        function(cb) {
          insertClobWithString(sequence, clobStr, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithString(sql, clobStr, specialStr, cb);
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
    });  // 74.2.8

    it('74.2.9 PLSQL, BIND_OUT for EMPTY_LOB with small maxsize', function(done) {
      var sequence = 19;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.c, null);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.9

    it('74.2.10 PLSQL, BIND_OUT for EMPTY_LOB with 64k maxsize', function(done) {
      var sequence = 20;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertClobWithString(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.c, null);
              cb();
            }
          );
        }
      ], done);
    });  // 74.2.10

  }); // 74.2

  describe('74.3 CLOB, PLSQL, BIND_INOUT', function() {
    var clob_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_743 (lob_in_out IN OUT CLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    lob_in_out := lob_in_out; \n" +
                          "END nodb_clob_in_out_743;";
    var sqlRun = "begin nodb_clob_in_out_743(lob_in_out => :lob_in_out); end;";
    var proc_drop = "DROP PROCEDURE nodb_clob_in_out_743";

    before(function(done) {
      executeSQL(clob_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.3.1 PLSQL, BIND_INOUT with String length 32K', function(done) {
      var specialStr = "74.3.1";
      var len = 32768;
      var clobVal = getRandomString(len, specialStr);
      var bindVar = {
        lob_in_out: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: clobVal, maxSize: len }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var resultLength = result.outBinds.lob_in_out.length;
          var specStrLength = specialStr.length;
          should.strictEqual(resultLength, len);
          should.strictEqual(result.outBinds.lob_in_out.substring(0, specStrLength), specialStr);
          should.strictEqual(result.outBinds.lob_in_out.substring(resultLength - specStrLength, resultLength), specialStr);
          done();
        }
      );
    }); // 74.3.1

    it('74.3.2 PLSQL, BIND_INOUT with String length 32K - 1', function(done) {
      var specialStr = "74.3.2";
      var len = 32767;
      var clobVal = getRandomString(len, specialStr);
      var bindVar = {
        lob_in_out: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: clobVal, maxSize: len }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var resultLength = result.outBinds.lob_in_out.length;
          var specStrLength = specialStr.length;
          should.strictEqual(resultLength, len);
          should.strictEqual(result.outBinds.lob_in_out.substring(0, specStrLength), specialStr);
          should.strictEqual(result.outBinds.lob_in_out.substring(resultLength - specStrLength, resultLength), specialStr);
          done();
        }
      );
    }); // 74.3.2

    it('74.3.3 PLSQL, BIND_INOUT with String length 64K - 1', function(done) {
      var specialStr = "74.3.3";
      var len = 65535;
      var clobVal = getRandomString(len, specialStr);
      var bindVar = {
        lob_in_out: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: clobVal, maxSize: len }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var resultLength = result.outBinds.lob_in_out.length;
          var specStrLength = specialStr.length;
          should.strictEqual(resultLength, len);
          should.strictEqual(result.outBinds.lob_in_out.substring(0, specStrLength), specialStr);
          should.strictEqual(result.outBinds.lob_in_out.substring(resultLength - specStrLength, resultLength), specialStr);
          done();
        }
      );
    }); // 74.3.3

  }); // 74.3

  describe('74.4 Multiple CLOBs, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_744 (clob_id IN NUMBER, clob_1 IN CLOB, clob_2 IN CLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1, clob_2) values (clob_id, clob_1, clob_2); \n" +
               "END nodb_lobs_in_744; ";
    var sqlRun = "BEGIN nodb_lobs_in_744 (:i, :c1, :c2); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_744";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.4.1 PLSQL, BIND_IN, bind two string', function(done) {
      var specialStr = "74.4.1";
      var sequence = 100;
      var len1 = 50000;
      var clobStr_1 = getRandomString(len1, specialStr);
      var len2 = 10000;
      var clobStr_2 = getRandomString(len2, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len2 }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql_1 = "select clob_1 from nodb_tab_clob_in where id = 100";
          verifyClobValueWithString(sql_1, clobStr_1, specialStr, cb);
        },
        function(cb) {
          var sql_2 = "select clob_2 from nodb_tab_clob_in where id = 100";
          verifyClobValueWithString(sql_2, clobStr_2, specialStr, cb);
        }
      ], done);
    }); // 74.4.1

    it('74.4.2 PLSQL, BIND_IN, bind a txt file and a string', function(done) {
      var preparedCLOBID = 200;
      var len1 = 50000;
      var specialStr = "74.4.2";
      var clobStr_1 = getRandomString(len1, specialStr);

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
              var sequence = 101;
              connection.execute(
                sqlRun,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
                  c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len1 },
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
          var sql_1 = "select clob_1 from nodb_tab_clob_in where id = 101";
          verifyClobValueWithString(sql_1, clobStr_1, specialStr, cb);
        },
        function(cb) {
          var sql_2 = "select clob_2 from nodb_tab_clob_in where id = 101";
          verifyClobValueWithFileData(sql_2, cb);
        }
      ], done);
    }); // 74.4.2

  }); // 74.4

  describe('74.5 Multiple CLOBs, BIND_OUT', function() {
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

    var insertTwoClobWithString = function(id, insertStr1, insertStr2, callback) {
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
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    };

    it('74.5.1 PLSQL, BIND_OUT, bind two string', function(done) {
      var specialStr = "74.5.1";
      var sequence = 110;
      var len1 = 50000;
      var len2 = 10000;
      var clobStr_1 = getRandomString(len1, specialStr);
      var clobStr_2 = getRandomString(len2, specialStr);
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len1 },
        c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len2 }
      };

      async.series([
        function(cb) {
          insertTwoClobWithString(sequence, clobStr_1, clobStr_2, cb);
        },
        function(cb) {
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithString(sql, clobStr_1, specialStr, cb);
        },
        function(cb) {
          var sql = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithString(sql, clobStr_2, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength1 = result.outBinds.c1.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength1, len1);
              should.strictEqual(result.outBinds.c1.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.c1.substring(resultLength1 - specStrLength, resultLength1), specialStr);
              var resultLength2 = result.outBinds.c2.length;
              should.strictEqual(resultLength2, len2);
              should.strictEqual(result.outBinds.c2.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.c2.substring(resultLength2 - specStrLength, resultLength2), specialStr);
              cb();
            }
          );
        }
      ], done);

    });  // 74.5.1

    it('74.5.2 PLSQL, BIND_OUT, bind a txt file and a string', function(done) {
      var specialStr = "74.5.2";
      var sequence = 111;
      var len1 = 50000;
      var clobStr_1 = getRandomString(len1, specialStr);
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
          var sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
          verifyClobValueWithString(sql, clobStr_1, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds.c1.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, len1);
              should.strictEqual(result.outBinds.c1.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.c1.substring(resultLength - specStrLength, resultLength), specialStr);

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
                fs.readFile( inFileName, { encoding: 'utf8' }, function(err, originalData) {
                  should.not.exist(err);
                  should.strictEqual(clobData, originalData);
                });
              });
              cb();
            }
          );
        }
      ], done);

    });  // 74.5.2

  }); // 74.5

  describe('74.6 Multiple CLOBs, BIND INOUT', function() {
    var lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_746 (clob_1 IN OUT CLOB, clob_2 IN OUT CLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    clob_1 := clob_1; \n" +
                          "    clob_2 := clob_2; \n" +
                          "END nodb_lobs_in_out_746;";
    var sqlRun = "begin nodb_lobs_in_out_746(:lob_1, :lob_2); end;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_out_746";

    before(function(done) {
      executeSQL(lobs_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.6.1 PLSQL, BIND_INOUT, bind a txt file and a 32K string', function(done) {
      var specialStr = "74.6.1";
      var len1 = 32768;
      var clobVal = getRandomString(len1, specialStr);
      var preparedCLOBID = 200;

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
                  lob_1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
                  lob_2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result) {
                  var resultLength = result.outBinds.lob_1.length;
                  var specStrLength = specialStr.length;
                  should.strictEqual(resultLength, len1);
                  should.strictEqual(result.outBinds.lob_1.substring(0, specStrLength), specialStr);
                  should.strictEqual(result.outBinds.lob_1.substring(resultLength - specStrLength, resultLength), specialStr);

                  var lob = result.outBinds.lob_2;
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
    }); // 74.6.1

    it('74.6.2 PLSQL, BIND_INOUT, bind a txt file and a 64K - 1 string', function(done) {
      var specialStr = "74.6.2";
      var len1 = 65535;
      var clobVal = getRandomString(len1, specialStr);
      var preparedCLOBID = 201;

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
                  lob_1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
                  lob_2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result) {
                  var resultLength = result.outBinds.lob_1.length;
                  var specStrLength = specialStr.length;
                  should.strictEqual(resultLength, len1);
                  should.strictEqual(result.outBinds.lob_1.substring(0, specStrLength), specialStr);
                  should.strictEqual(result.outBinds.lob_1.substring(resultLength - specStrLength, resultLength), specialStr);

                  var lob = result.outBinds.lob_2;
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
    }); // 74.6.2

  }); // 74.6

});
