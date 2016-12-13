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
 *   74. lobBindAsStringBuffer.js
 *
 * DESCRIPTION
 *   Testing CLOB/BLOB binding as String/Buffer.
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

describe('74.lobBindAsStringBuffer.js', function() {
  var connection = null;
  var node6plus = false; // assume node runtime version is lower than 6
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

  var proc_blob_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_blob_in ( \n" +
                         "            id      NUMBER, \n" +
                         "            blob_1  BLOB, \n" +
                         "            blob_2  BLOB \n" +
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
                         "            clob  CLOB, \n" +
                         "            blob  BLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;

          // Check whether node runtime version is >= 6 or not
          if ( process.versions["node"].substring (0, 1) >= "6")
            node6plus = true;

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
          proc_blob_in_tab,
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
          "DROP TABLE nodb_tab_blob_in PURGE",
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

  var insertBlobWithbuffer = function(id, insertBuffer, callback) {
    var sql = "INSERT INTO nodb_tab_blob_in (id, blob_1) VALUES (:i, :b)";
    var bindVar = {
      i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      b: { val: insertBuffer, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
    };

    connection.execute(
      sql,
      bindVar,
      { autoCommit: false },
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      });
  };

  var jpgFileName = './test/fuzzydinosaur.jpg';

  var prepareTableWithBlob = function(sql, id, callback) {
    var bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };

    connection.execute(
      sql,
      bindVar,
      { autoCommit: false }, // a transaction needs to span the INSERT and pipe()
      function(err, result) {
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        (result.outBinds.lobbv.length).should.be.exactly(1);

        var inStream = fs.createReadStream(jpgFileName);
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

        inStream.pipe(lob);
      });
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

  var verifyBlobValueWithFileData = function(selectSql, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        should.exist(lob);

        var blobData = 0;
        var totalLength = 0;
        blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);

        lob.on('data', function(chunk) {
          totalLength = totalLength + chunk.length;
          blobData = Buffer.concat([blobData, chunk], totalLength);
        });

        lob.on('error', function(err) {
          should.not.exist(err, "lob.on 'error' event.");
        });

        lob.on('end', function() {
          fs.readFile( jpgFileName, function(err, originalData) {
            should.not.exist(err);
            should.strictEqual(totalLength, originalData.length);
            originalData.should.eql(blobData);
            return callback();
          });
        });
      });
  };

  var verifyBlobValueWithBuffer = function(selectSql, oraginalBuffer, specialStr, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        if (oraginalBuffer == null | oraginalBuffer == '' || oraginalBuffer == undefined) {
          should.not.exist(lob);
          return callback();
        } else {
          should.exist(lob);
          var blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);
          var totalLength = 0;

          lob.on('data', function(chunk) {
            totalLength = totalLength + chunk.length;
            blobData = Buffer.concat([blobData, chunk], totalLength);
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function() {
            should.strictEqual(totalLength, oraginalBuffer.length);
            var specStrLength = specialStr.length;
            should.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
            should.strictEqual(blobData.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
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
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 2 Gb
      // except for database CLOBs bound as `STRING` in the `BIND_OUT`
      // direction: these can only be 1 Gb.

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


    it('74.2.1 PLSQL, BIND_OUT with String length 32768', function(done) {
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

    it('74.2.2 PLSQL, BIND_OUT with String length 65535', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 2 Gb
      // except for database CLOBs bound as `STRING` in the `BIND_OUT`
      // direction: these can only be 1 Gb.

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

    it('74.3.1 PLSQL, BIND_INOUT with String length 32768', function(done) {
      var specialStr = "74.3.1";
      var len = 32768;
      var clobVal = getRandomString(len, specialStr);
      var bindVar = {
        lob_in_out: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: clobVal }
      };

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
    }); // 74.3.1

    it('74.3.2 PLSQL, BIND_INOUT with String length 32767', function(done) {
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

  }); // 74.3

  describe('74.4 BLOB, PLSQL, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_744 (blob_id IN NUMBER, blob_in IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
               "END nodb_blobs_in_744; ";
    var sqlRun = "BEGIN nodb_blobs_in_744 (:i, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_in_744";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.4.1 PLSQL, BIND_IN with Buffer size 32768', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var size = 32768;
      var sequence = 1;
      var specialStr = "74.4.1";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 74.4.1

    it('74.4.2 PLSQL, BIND_IN with Buffer size 65535', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 2 Gb
      // except for database CLOBs bound as `STRING` in the `BIND_OUT`
      // direction: these can only be 1 Gb.

      var size = 65535;
      var sequence = 2;
      var specialStr = "74.4.2";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 74.4.2

    it('74.4.3 PLSQL, BIND_IN with null', function(done) {
      var sequence = 3;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 74.4.3

    it('74.4.4 PLSQL, BIND_IN with empty string', function(done) {
      var sequence = 4;
      var bufferStr = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 74.4.4

    it('74.4.5 PLSQL, BIND_IN with undefined', function(done) {
      var sequence = 5;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 74.4.5

    it('74.4.6 PLSQL, BIND_IN with NaN', function(done) {
      var sequence = 6;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: NaN, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
    }); // 74.4.6

    it('74.4.7 PLSQL, BIND_IN with 0', function(done) {
      var sequence = 6;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: 0, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
    }); // 74.4.7

    it('74.4.8 PLSQL, BIND_IN bind value and type mismatch', function(done) {
      var sequence = 6;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: 200, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
    }); // 74.4.8

    it('74.4.9 PLSQL, BIND_IN mixing named with positional binding', function(done) {
      var size = 50000;
      var sequence = 6;
      var specialStr = "74.4.9";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size } ];

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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 74.4.9

    it('74.4.10 PLSQL, BIND_IN without maxSize', function(done) {
      var size = 65535;
      var sequence = 7;
      var specialStr = "74.4.10";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 74.4.10

    it('74.4.11 PLSQL, BIND_IN with invalid BLOB', function(done) {
      var sequence = 7;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
    }); // 74.4.11

  }); // 74.4

  describe('74.5 BLOB, PLSQL, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_745 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_blobs_out_745; ";
    var sqlRun = "BEGIN nodb_blobs_out_745 (:i, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_out_745";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.5.1 PLSQL, BIND_OUT with Buffer size 32768', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var size = 32768;
      var sequence = 11;
      var specialStr = "74.5.1";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds.b.length;
              var specStrLength = specialStr.length;
              should.strictEqual(result.outBinds.b.length, size);
              should.strictEqual(result.outBinds.b.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.b.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
              cb();
            }
          );
        }
      ], done);

    }); // 74.5.1

    it('74.5.2 PLSQL, BIND_OUT with Buffer size 65535', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 2 Gb
      // except for database CLOBs bound as `STRING` in the `BIND_OUT`
      // direction: these can only be 1 Gb.

      var size = 65535;
      var sequence = 12;
      var specialStr = "74.5.2";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds.b.length;
              var specStrLength = specialStr.length;
              should.strictEqual(result.outBinds.b.length, size);
              should.strictEqual(result.outBinds.b.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.b.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 74.5.2

    it('74.5.3 PLSQL, BIND_OUT with null', function(done) {
      var sequence = 13;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, null, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.b, null);
              cb();
            }
          );
        }
      ], done);

    }); // 74.5.3

    it('74.5.4 PLSQL, BIND_OUT with empty buffer', function(done) {
      var sequence = 14;
      var bufferStr = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.b, null);
              cb();
            }
          );
        }
      ], done);
    }); // 74.5.4

    it('74.5.5 PLSQL, BIND_OUT with undefined', function(done) {
      var sequence = 15;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, undefined, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.outBinds.b, null);
              cb();
            }
          );
        }
      ], done);
    }); // 74.5.5

    it('74.5.6 PLSQL, BIND_OUT mixing named with positional binding', function(done) {
      var size = 50000;
      var sequence = 16;
      var specialStr = "74.5.6";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size } ];

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds[0].length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, size);
              should.strictEqual(result.outBinds[0].toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds[0].toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
              cb();
            }
          );
        }
      ], done);

    }); // 74.5.6

    it('74.5.7 PLSQL, BIND_OUT with limited maxSize', function(done) {
      var size = 50000;
      var sequence = 17;
      var specialStr = "74.5.7";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
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
    }); // 74.5.7

    it('74.5.8 PLSQL, BIND_OUT without maxSize', function(done) {
      var size = 50000;
      var sequence = 18;
      var specialStr = "74.5.8";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
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

    }); // 74.5.8

  }); // 74.5

  describe('74.6 BLOB, PLSQL, BIND_INOUT', function() {
    var blob_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_746 (lob_in_out IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    lob_in_out := lob_in_out; \n" +
                          "END nodb_blob_in_out_746;";
    var sqlRun = "begin nodb_blob_in_out_746(lob_in_out => :lob_in_out); end;";
    var proc_drop = "DROP PROCEDURE nodb_blob_in_out_746";

    before(function(done) {
      executeSQL(blob_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.6.1 PLSQL, BIND_INOUT with Buffer size 32768', function(done) {
      var size = 32768;
      var specialStr = "74.6.1";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        lob_in_out: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          (err.message).should.startWith('ORA-01460:');
          done();
        }
      );
    }); // 74.6.1

    it('74.6.2 PLSQL, BIND_INOUT with Buffer size 32767', function(done) {
      var size = 32767;
      var specialStr = "74.6.2";
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        lob_in_out: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr, maxSize: size }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var resultLength = result.outBinds.lob_in_out.length;
          var specStrLength = specialStr.length;
          should.strictEqual(result.outBinds.lob_in_out.length, size);
          should.strictEqual(result.outBinds.lob_in_out.toString('utf8', 0, specStrLength), specialStr);
          should.strictEqual(result.outBinds.lob_in_out.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
          done();
        }
      );
    }); // 74.6.2

  });

  describe('74.7 Multiple CLOBs, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_747 (clob_id IN NUMBER, clob_1 IN CLOB, clob_2 IN CLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1, clob_2) values (clob_id, clob_1, clob_2); \n" +
               "END nodb_lobs_in_747; ";
    var sqlRun = "BEGIN nodb_lobs_in_747 (:i, :c1, :c2); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_747";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.7.1 PLSQL, BIND_IN, bind two string', function(done) {
      var specialStr = "74.7.1";
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
    }); // 74.7.1

    it('74.7.2 PLSQL, BIND_IN, bind a txt file and a string', function(done) {
      var preparedCLOBID = 200;
      var len1 = 50000;
      var specialStr = "74.7.2";
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
    }); // 74.7.2

  }); // 74.7

  describe('74.8 Multiple CLOBs, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_748 (clob_id IN NUMBER, clob_1 OUT CLOB, clob_2 OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select clob_1, clob_2 into clob_1, clob_2 from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_lobs_out_748; ";
    var sqlRun = "BEGIN nodb_lobs_out_748 (:i, :c1, :c2); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_out_748";

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

    it('74.8.1 PLSQL, BIND_OUT, bind two string', function(done) {
      var specialStr = "74.8.1";
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

    });  // 74.8.1

    it('74.8.2 PLSQL, BIND_OUT, bind a txt file and a string', function(done) {
      var specialStr = "74.8.2";
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

    });  // 74.8.2

  }); // 74.8

  describe('74.9 Multiple CLOBs, BIND INOUT', function() {
    var lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_749 (clob_1 IN OUT CLOB, clob_2 IN OUT CLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    clob_1 := clob_1; \n" +
                          "    clob_2 := clob_2; \n" +
                          "END nodb_lobs_in_out_749;";
    var sqlRun = "begin nodb_lobs_in_out_749(:lob_1, :lob_2); end;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_out_749";

    before(function(done) {
      executeSQL(lobs_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.9.1 PLSQL, BIND_INOUT, bind a txt file and a string', function(done) {
      var specialStr = "74.9.1";
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
                function(err) {
                  should.exist(err);
                  // ORA-01460: unimplemented or unreasonable conversion requested
                  (err.message).should.startWith('ORA-01460:');
                  cb();
                }
              );
            }
          );
        }
      ], done);
    }); // 74.9.1

  }); // 74.9

  describe('74.10 Multiple BLOBs, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7410 (blob_id IN NUMBER, blob_1 IN BLOB, blob_2 IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1, blob_2) values (blob_id, blob_1, blob_2); \n" +
               "END nodb_blobs_in_7410; ";
    var sqlRun = "BEGIN nodb_blobs_in_7410 (:i, :b1, :b2); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_in_7410";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.10.1 PLSQL, BIND_IN, bind two Buffer', function(done) {
      var size_1 = 32768;
      var size_2 = 50000;
      var specialStr = "74.10.1";
      var bigStr_1 = getRandomString(size_1, specialStr);
      var bigStr_2 = getRandomString(size_2, specialStr);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var bufferStr_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");
      var sequence = 51;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
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
          var sql_1 = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_1, bufferStr_1, specialStr, cb);
        },
        function(cb) {
          var sql_2 = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_2, bufferStr_2, specialStr, cb);
        }
      ], done);
    }); // 74.10.1

    it('74.10.2 PLSQL, BIND_IN, bind a JPG file and a Buffer', function(done) {
      var specialStr = "74.10.2";
      var preparedCLOBID = 201;
      var sequence = 52;
      var size_1 = 32768;
      var bigStr_1 = getRandomString(size_1, specialStr);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
          prepareTableWithBlob(sql, preparedCLOBID, cb);
        },
        function(cb) {
          connection.execute(
            "select blob from nodb_tab_lobs_in where id = :id",
            { id: preparedCLOBID },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var blob = result.rows[0][0];

              connection.execute(
                sqlRun,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
                  b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
                  b2: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
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
          var sql_1 = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_1, bufferStr_1, specialStr, cb);
        },
        function(cb) {
          var sql_2 = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithFileData(sql_2, cb);
        }
      ], done);
    }); // 74.10.2

  }); // 74.10

  describe('74.11 Multiple BLOBs, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_7411 (blob_id IN NUMBER, blob_1 OUT BLOB, blob_2 OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1, blob_2 into blob_1, blob_2 from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_lobs_out_7411; ";
    var sqlRun = "BEGIN nodb_lobs_out_7411 (:i, :b1, :b2); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_out_7411";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    var insertTwoBlobWithbuffer = function(id, insertBuffer1, insertBuffer2, callback) {
      var sql = "INSERT INTO nodb_tab_blob_in (id, blob_1, blob_2) VALUES (:i, :b1, :b2)";
      var bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        b1: { val: insertBuffer1, dir: oracledb.BIND_IN, type: oracledb.BUFFER },
        b2: { val: insertBuffer2, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
      };

      connection.execute(
        sql,
        bindVar,
        { autoCommit: false },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        });
    };

    it('74.11.1 PLSQL, BIND_OUT, bind two buffer', function(done) {
      var specialStr = "74.11.1";
      var size_1 = 32768;
      var size_2 = 50000;
      var sequence = 111;
      var bigStr_1 = getRandomString(size_1, specialStr);
      var bigStr_2 = getRandomString(size_2, specialStr);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var bufferStr_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };

      async.series([
        function(cb) {
          insertTwoBlobWithbuffer(sequence, bufferStr_1, bufferStr_2, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr_1, specialStr, cb);
        },
        function(cb) {
          var sql = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var specStrLength = specialStr.length;
              var resultLength1 = result.outBinds.b1.length;
              should.strictEqual(resultLength1, size_1);
              should.strictEqual(result.outBinds.b1.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.b1.toString('utf8', (resultLength1 - specStrLength), resultLength1), specialStr);
              var resultLength2 = result.outBinds.b2.length;
              should.strictEqual(resultLength2, size_2);
              should.strictEqual(result.outBinds.b2.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.b2.toString('utf8', (resultLength2 - specStrLength), resultLength2), specialStr);
              cb();
            }
          );
        }
      ], done);

    }); // 74.11.1

    it('74.11.2 PLSQL, BIND_OUT, bind a JPG file and a Buffer', function(done) {
      var specialStr = "74.11.2";
      var size_1 = 32768;
      var bigStr_1 = getRandomString(size_1, specialStr);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var sequence = 112;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_1 },
        b2: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_blob_in (id, blob_2) VALUES (:i, EMPTY_BLOB()) RETURNING blob_2 INTO :lobbv";
          prepareTableWithBlob(sql, sequence, cb);
        },
        function(cb) {
          var sql = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithFileData(sql, cb);
        },
        function(cb) {
          var sql = "UPDATE nodb_tab_blob_in set blob_1 = :b1 where id = :i";
          var bindVar_1 = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 }
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
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr_1, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var specStrLength = specialStr.length;
              var resultLength = result.outBinds.b1.length;
              should.strictEqual(resultLength, size_1);
              should.strictEqual(result.outBinds.b1.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.b1.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);

              var lob = result.outBinds.b2;
              var blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);
              var totalLength = 0;

              lob.on('data', function(chunk) {
                totalLength = totalLength + chunk.length;
                blobData = Buffer.concat([blobData, chunk], totalLength);
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {
                fs.readFile( jpgFileName, function(err, originalData) {
                  should.not.exist(err);
                  should.strictEqual(totalLength, originalData.length);
                  originalData.should.eql(blobData);
                  cb();
                });
              });
            }
          );
        }
      ], done);

    }); // 74.11.2

  }); // 74.11

  describe('74.12 Multiple BLOBs, BIND_INOUT', function() {
    var lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_7412 (blob_1 IN OUT BLOB, blob_2 IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    blob_1 := blob_1; \n" +
                          "    blob_2 := blob_2; \n" +
                          "END nodb_lobs_in_out_7412;";
    var sqlRun = "begin nodb_lobs_in_out_7412(:lob_1, :lob_2); end;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_out_7412";

    before(function(done) {
      executeSQL(lobs_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.12.1 PLSQL, BIND_INOUT, bind a JPG and a buffer', function(done) {
      var preparedCLOBID = 200;
      var size_1 = 32768;
      var specialStr = "74.12.1";
      var bigStr_1 = getRandomString(size_1, specialStr);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
          prepareTableWithBlob(sql, preparedCLOBID, cb);
        },
        function(cb) {
          connection.execute(
            "select blob from nodb_tab_lobs_in where id = :id",
            { id: preparedCLOBID },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var blob = result.rows[0][0];
              connection.execute(
                sqlRun,
                {
                  lob_1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_1 },
                  lob_2: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err) {
                  should.exist(err);
                  // ORA-01460: unimplemented or unreasonable conversion requested
                  (err.message).should.startWith('ORA-01460:');
                  cb();
                }
              );
            }
          );
        }
      ], done);
    });
  }); // 74.12

  describe('74.13 Multiple LOBs, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_7413 (id IN NUMBER, clob_in IN CLOB, blob_in IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_lobs_in (id, clob, blob) values (id, clob_in, blob_in); \n" +
               "END nodb_lobs_in_7413; ";
    var sqlRun = "BEGIN nodb_lobs_in_7413 (:i, :c, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_7413";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.13.1 PLSQL, CLOB&BLOB, bind a string and a buffer', function(done) {
      var specialStr = "74.13.1";
      var length = 50000;
      var bigStr = getRandomString(length, specialStr);
      var bigBuffer = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var sequence = 301;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: length },
        b: { val: bigBuffer, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: length }
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
          var sql_1 = "select clob from nodb_tab_lobs_in where id = " + sequence;
          verifyClobValueWithString(sql_1, bigStr, specialStr, cb);
        },
        function(cb) {
          var sql_2 = "select blob from nodb_tab_lobs_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_2, bigBuffer, specialStr, cb);
        }
      ], done);
    }); // 74.13.1

    it('74.13.2 PLSQL, CLOB&BLOB, bind a string and a JPG file', function(done) {
      var preparedCLOBID = 302;
      var sequence = 2;
      var size = 40000;
      var specialStr = "74.13.2";
      var bigStr = getRandomString(size, specialStr);

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
          prepareTableWithBlob(sql, preparedCLOBID, cb);
        },
        function(cb) {
          connection.execute(
            "select blob from nodb_tab_lobs_in where id = :id",
            { id: preparedCLOBID },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var blob = result.rows[0][0];

              connection.execute(
                sqlRun,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
                  c: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: size },
                  b: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
                },
                { autoCommit: true },
                function(err) {
                  should.not.exist(err);
                  cb();
                });
            });
        },
        function(cb) {
          var sql_1 = "select clob from nodb_tab_lobs_in where id = " + sequence;
          verifyClobValueWithString(sql_1, bigStr, specialStr, cb);
        },
        function(cb) {
          var sql_2 = "select blob from nodb_tab_lobs_in where id = " + sequence;
          verifyBlobValueWithFileData(sql_2, cb);
        }
      ], done);
    }); // 74.13.2

    it('74.13.3 PLSQL, CLOB&BLOB, bind a txt file and a Buffer', function(done) {
      var preparedCLOBID = 200;
      var sequence = 303;
      var size = 40000;
      var specialStr = "74.13.3";
      var bigStr = getRandomString(size, specialStr);
      var bigBuffer = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

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
                  c: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_IN },
                  b: { val: bigBuffer, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
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
          var sql_1 = "select clob from nodb_tab_lobs_in where id = " + sequence;
          verifyClobValueWithFileData(sql_1, cb);
        },
        function(cb) {
          var sql_2 = "select blob from nodb_tab_lobs_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_2, bigBuffer, specialStr,cb);
        }
      ], done);
    }); // 74.13.3

  }); // 74.13

  describe('74.14 Multiple LOBs, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_7414 (lob_id IN NUMBER, clob OUT CLOB, blob OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select clob, blob into clob, blob from nodb_tab_lobs_in where id = lob_id; \n" +
               "END nodb_lobs_out_7414; ";
    var sqlRun = "BEGIN nodb_lobs_out_7414 (:i, :c, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_out_7414";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    var insertLobs = function(id, insertStr1, insertStr2, callback) {
      var sql = "INSERT INTO nodb_tab_lobs_in (id, clob, blob) VALUES (:i, :c, :b)";
      var bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        c: { val: insertStr1, dir: oracledb.BIND_IN, type: oracledb.STRING },
        b: { val: insertStr2, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
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

    it('74.14.1 PLSQL, CLOB&BLOB, bind a string and a buffer', function(done) {
      var length = 50000;
      var specialStr = "74.14.1";
      var sequence = 311;
      var bigStr = getRandomString(length, specialStr);
      var bigBuffer = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: length },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: length }
      };

      async.series([
        function(cb) {
          insertLobs(sequence, bigStr, bigBuffer, cb);
        },
        function(cb) {
          var sql = "select clob from nodb_tab_lobs_in where id = " + sequence;
          verifyClobValueWithString(sql, bigStr, specialStr, cb);
        },
        function(cb) {
          var sql = "select blob from nodb_tab_lobs_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bigBuffer, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var specStrLength = specialStr.length;
              var resultLength1 = result.outBinds.c.length;
              should.strictEqual(resultLength1, length);
              should.strictEqual(result.outBinds.c.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.c.substring(resultLength1 - specStrLength, resultLength1), specialStr);
              var resultLength2 = result.outBinds.b.length;
              should.strictEqual(resultLength2, length);
              should.strictEqual(result.outBinds.b.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.b.toString('utf8', (resultLength2 - specStrLength), resultLength2), specialStr);
              cb();
            });
        }
      ], done);

    }); // 74.14.1

    it('74.14.2 PLSQL, CLOB&BLOB, bind a string and a JPG file', function(done) {
      var size = 40000;
      var specialStr = "74.14.2";
      var bigStr = getRandomString(size, specialStr);
      var sequence = 312;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size },
        b: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
          prepareTableWithBlob(sql, sequence, cb);
        },
        function(cb) {
          var sql = "select blob from nodb_tab_lobs_in where id = " + sequence;
          verifyBlobValueWithFileData(sql, cb);
        },
        function(cb) {
          var sql = "update nodb_tab_lobs_in set clob = :c where id = :i";
          var bindVar_1 = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: size }
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
          var sql = "select clob from nodb_tab_lobs_in where id = " + sequence;
          verifyClobValueWithString(sql, bigStr, specialStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultLength = result.outBinds.c.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, size);
              should.strictEqual(result.outBinds.c.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.c.substring(resultLength - specStrLength, resultLength), specialStr);

              var lob = result.outBinds.b;
              var blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);
              var totalLength = 0;

              lob.on('data', function(chunk) {
                totalLength = totalLength + chunk.length;
                blobData = Buffer.concat([blobData, chunk], totalLength);
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {
                fs.readFile( jpgFileName, function(err, originalData) {
                  should.not.exist(err);
                  should.strictEqual(totalLength, originalData.length);
                  originalData.should.eql(blobData);
                  cb();
                });
              });
            }
          );
        }
      ], done);

    }); // 74.14.2

    it('74.14.3 PLSQL, CLOB&BLOB, bind a txt file and a buffer', function(done) {
      var size = 40000;
      var specialStr = "74.14.3";
      var bigStr = getRandomString(size, specialStr);
      var bigBuffer = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var sequence = 313;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
          prepareTableWithClob(sql, sequence, cb);
        },
        function(cb) {
          var sql = "select clob from nodb_tab_lobs_in where id = " + sequence;
          verifyClobValueWithFileData(sql, cb);
        },
        function(cb) {
          var sql = "UPDATE nodb_tab_lobs_in set blob = :b where id = :i";
          var bindVar_1 = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            b: { val: bigBuffer, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
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
          var sql = "select blob from nodb_tab_lobs_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bigBuffer, specialStr, cb);
        },
        function(cb) {
          connection.execute(
              sqlRun,
              bindVar,
              function(err, result) {
                should.not.exist(err);
                var specStrLength = specialStr.length;
                var resultLength1 = result.outBinds.b.length;
                should.strictEqual(resultLength1, size);
                should.strictEqual(result.outBinds.b.toString('utf8', 0, specStrLength), specialStr);
                should.strictEqual(result.outBinds.b.toString('utf8', (resultLength1 - specStrLength), resultLength1), specialStr);
                var lob = result.outBinds.c;
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
                    cb();
                  });
                });
              });
        }
      ], done);
    }); // 74.14.3

  }); // 74.14

  describe('74.15 Multiple LOBs, BIND_INOUT', function() {
    var lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_7415 (clob IN OUT CLOB, blob IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    clob := clob; \n" +
                          "    blob := blob; \n" +
                          "END nodb_lobs_in_out_7415;";
    var sqlRun = "begin nodb_lobs_in_out_7415(:clob, :blob); end;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_out_7415";

    before(function(done) {
      executeSQL(lobs_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('74.15.1 PLSQL, BIND_INOUT, bind a string and a buffer', function(done) {
      var specialStr = "74.15.1";
      var size = 32768;
      var bigStr = getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        clob: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: bigStr },
        blob: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err) {
              should.exist(err);
              // ORA-01460: unimplemented or unreasonable conversion requested
              (err.message).should.startWith('ORA-01460:');
              cb();
            }
          );
        }
      ], done);
    }); // 74.15.1

  }); // 74.15

});
