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
 *   77. blobPlsqlBindAsBuffer.js
 *
 * DESCRIPTION
 *   Testing BLOB binding as Buffer.
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
var random = require('./random.js');

describe('77.blobPlsqlBindAsBuffer.js', function() {
  var connection = null;
  var node6plus = false; // assume node runtime version is lower than 6

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

  describe('77.1 BLOB, PLSQL, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_771 (blob_id IN NUMBER, blob_in IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
               "END nodb_blobs_in_771; ";
    var sqlRun = "BEGIN nodb_blobs_in_771 (:i, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_in_771";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('77.1.1 PLSQL, BIND_IN with Buffer size 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var size = 32768;
      var sequence = 1;
      var specialStr = "77.1.1";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.1.1

    it('77.1.2 PLSQL, BIND_IN with Buffer size 64K - 1', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb

      var size = 65535;
      var sequence = 2;
      var specialStr = "77.1.2";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.1.2

    it('77.1.3 PLSQL, BIND_IN with null', function(done) {
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
    }); // 77.1.3

    it('77.1.4 PLSQL, BIND_IN with empty string', function(done) {
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
    }); // 77.1.4

    it('77.1.5 PLSQL, BIND_IN with undefined', function(done) {
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
    }); // 77.1.5

    it('77.1.6 PLSQL, BIND_IN with NaN', function(done) {
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
    }); // 77.1.6

    it('77.1.7 PLSQL, BIND_IN with 0', function(done) {
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
    }); // 77.1.7

    it('77.1.8 PLSQL, BIND_IN bind value and type mismatch', function(done) {
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
    }); // 77.1.8

    it('77.1.9 PLSQL, BIND_IN mixing named with positional binding', function(done) {
      var size = 50000;
      var sequence = 6;
      var specialStr = "77.1.9";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.1.9

    it('77.1.10 PLSQL, BIND_IN without maxSize', function(done) {
      var size = 65535;
      var sequence = 7;
      var specialStr = "77.1.10";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.1.10

    it('77.1.11 PLSQL, BIND_IN with invalid BLOB', function(done) {
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
    }); // 77.1.11

  }); // 77.1

  describe('77.2 BLOB, PLSQL, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_772 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_blobs_out_772; ";
    var sqlRun = "BEGIN nodb_blobs_out_772 (:i, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_out_772";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('77.2.1 PLSQL, BIND_OUT with Buffer size 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var size = 32768;
      var sequence = 11;
      var specialStr = "77.2.1";
      var bigStr = random.getRandomString(size, specialStr);
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

    }); // 77.2.1

    it('77.2.2 PLSQL, BIND_OUT with Buffer size 64K - 1', function(done) {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb

      var size = 65535;
      var sequence = 12;
      var specialStr = "77.2.2";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.2.2

    it('77.2.3 PLSQL, BIND_OUT with null', function(done) {
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

    }); // 77.2.3

    it('77.2.4 PLSQL, BIND_OUT with empty buffer', function(done) {
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
    }); // 77.2.4

    it('77.2.5 PLSQL, BIND_OUT with undefined', function(done) {
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
    }); // 77.2.5

    it('77.2.6 PLSQL, BIND_OUT mixing named with positional binding', function(done) {
      var size = 50000;
      var sequence = 16;
      var specialStr = "77.2.6";
      var bigStr = random.getRandomString(size, specialStr);
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

    }); // 77.2.6

    it('77.2.7 PLSQL, BIND_OUT with limited maxSize', function(done) {
      var size = 50000;
      var sequence = 17;
      var specialStr = "77.2.7";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.2.7

    it('77.2.8 PLSQL, BIND_OUT without maxSize', function(done) {
      var size = 50000;
      var sequence = 18;
      var specialStr = "77.2.8";
      var bigStr = random.getRandomString(size, specialStr);
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

    }); // 77.2.8

  }); // 77.2

  describe('77.3 BLOB, PLSQL, BIND_INOUT', function() {
    var blob_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_773 (lob_in_out IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    lob_in_out := lob_in_out; \n" +
                          "END nodb_blob_in_out_773;";
    var sqlRun = "begin nodb_blob_in_out_773(lob_in_out => :lob_in_out); end;";
    var proc_drop = "DROP PROCEDURE nodb_blob_in_out_773";
    var blob_proc_inout_7731 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_7731 (lob_id IN NUMBER, lob_in_out IN OUT RAW) \n" +
                               "AS \n" +
                               "BEGIN \n" +
                               "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                               "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                               "END nodb_blob_in_out_7731;";
    var sqlRun_7731 = "begin nodb_blob_in_out_7731(:i, :io); end;";
    var proc_drop_7731 = "DROP PROCEDURE nodb_blob_in_out_7731";

    before(function(done) {
      executeSQL(blob_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('77.3.1 PLSQL, BIND_INOUT with Buffer size 32K', function(done) {
      var size = 32768;
      var specialStr = "77.3.1";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.3.1

    it('77.3.2 PLSQL, BIND_INOUT with Buffer size 32K - 1', function(done) {
      var size = 32767;
      var specialStr = "77.3.2";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.3.2

    it('77.3.3 PLSQL, BIND_INOUT with Buffer size 64K - 1', function(done) {
      var size = 65535;
      var specialStr = "77.3.3";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 77.3.3

    it('77.3.4 PLSQL, BIND_INOUT with OUT data > maxSize', function(done) {
      var specialStr = "77.3.4";
      var len = 65535;
      var bigStr = random.getRandomString(len, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        lob_in_out: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr, maxSize: len - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016');
          done();
        }
      );
    }); // 77.3.4

    it('77.3.5 PLSQL, bind out to varchar2 with OUT data < maxSize', function(done) {
      var sequence = 30;
      var specialStr = "77.3.5";
      var len = 300;
      var bigStr = random.getRandomString(len, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7731, cb);
        },
        function(cb) {
          var bindVar_7731 = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            io: { val:bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: len }
          };
          connection.execute(
            sqlRun_7731,
            bindVar_7731,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.io.toString('utf8');
              var resultLength = resultVal.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, len);
              should.strictEqual(resultVal.substring(0, specStrLength), specialStr);
              should.strictEqual(resultVal.substring(resultLength - specStrLength, resultLength), specialStr);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_7731, cb);
        }
      ], done);
    }); // 77.3.5

    it('77.3.6 PLSQL, bind out to varchar2 with OUT data > maxSize', function(done) {
      var sequence = 30;
      var specialStr = "77.3.6";
      var len = 300;
      var bigStr = random.getRandomString(len, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7731, cb);
        },
        function(cb) {
          var bindVar_7731 = {
            i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            io: { val:bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: len - 1 }
          };
          connection.execute(
            sqlRun_7731,
            bindVar_7731,
            function(err) {
              should.exist(err);
              // ORA-01460: unimplemented or unreasonable conversion requested
              (err.message).should.startWith('ORA-01460');
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_7731, cb);
        }
      ], done);
    }); // 77.3.6

  }); // 77.3

  describe('77.4 Multiple BLOBs, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_774 (blob_id IN NUMBER, blob_1 IN BLOB, blob_2 IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1, blob_2) values (blob_id, blob_1, blob_2); \n" +
               "END nodb_blobs_in_774; ";
    var sqlRun = "BEGIN nodb_blobs_in_774 (:i, :b1, :b2); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_in_774";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('77.4.1 PLSQL, BIND_IN, bind two Buffer', function(done) {
      var size_1 = 32768;
      var size_2 = 50000;
      var specialStr = "77.4.1";
      var bigStr_1 = random.getRandomString(size_1, specialStr);
      var bigStr_2 = random.getRandomString(size_2, specialStr);
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
    }); // 77.4.1

    it('77.4.2 PLSQL, BIND_IN, bind a JPG file and a Buffer', function(done) {
      var specialStr = "77.4.2";
      var preparedCLOBID = 301;
      var sequence = 52;
      var size_1 = 32768;
      var bigStr_1 = random.getRandomString(size_1, specialStr);
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
    }); // 77.4.2

  }); // 77.4

  describe('77.5 Multiple BLOBs, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_775 (blob_id IN NUMBER, blob_1 OUT BLOB, blob_2 OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1, blob_2 into blob_1, blob_2 from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_lobs_out_775; ";
    var sqlRun = "BEGIN nodb_lobs_out_775 (:i, :b1, :b2); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_out_775";

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

    it('77.5.1 PLSQL, BIND_OUT, bind two buffer', function(done) {
      var specialStr = "77.5.1";
      var size_1 = 32768;
      var size_2 = 50000;
      var sequence = 111;
      var bigStr_1 = random.getRandomString(size_1, specialStr);
      var bigStr_2 = random.getRandomString(size_2, specialStr);
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

    }); // 77.5.1

    it('77.5.2 PLSQL, BIND_OUT, bind a JPG file and a Buffer', function(done) {
      var specialStr = "77.5.2";
      var size_1 = 32768;
      var bigStr_1 = random.getRandomString(size_1, specialStr);
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

    }); // 77.5.2

  }); // 77.5

  describe('77.6 Multiple BLOBs, BIND_INOUT', function() {
    var lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_776 (blob_1 IN OUT BLOB, blob_2 IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    blob_1 := blob_1; \n" +
                          "    blob_2 := blob_2; \n" +
                          "END nodb_lobs_in_out_776;";
    var sqlRun = "begin nodb_lobs_in_out_776(:lob_1, :lob_2); end;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_out_776";

    before(function(done) {
      executeSQL(lobs_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('77.6.1 PLSQL, BIND_INOUT, bind a JPG and a 32K buffer', function(done) {
      var preparedCLOBID = 500;
      var size_1 = 32768;
      var specialStr = "77.6.1";
      var bigStr_1 = random.getRandomString(size_1, specialStr);
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
                function(err, result) {
                  should.not.exist(err);
                  var specStrLength = specialStr.length;
                  var resultLength = result.outBinds.lob_1.length;
                  should.strictEqual(resultLength, size_1);
                  should.strictEqual(result.outBinds.lob_1.toString('utf8', 0, specStrLength), specialStr);
                  should.strictEqual(result.outBinds.lob_1.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);

                  var lob = result.outBinds.lob_2;
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
                });
            });
        }
      ], done);
    }); // 77.6.1

    it('77.6.2 PLSQL, BIND_INOUT, bind a JPG and a 64K - 1 buffer', function(done) {
      var preparedCLOBID = 501;
      var size_1 = 65535;
      var specialStr = "77.6.2";
      var bigStr_1 = random.getRandomString(size_1, specialStr);
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
                function(err, result) {
                  should.not.exist(err);
                  var specStrLength = specialStr.length;
                  var resultLength = result.outBinds.lob_1.length;
                  should.strictEqual(resultLength, size_1);
                  should.strictEqual(result.outBinds.lob_1.toString('utf8', 0, specStrLength), specialStr);
                  should.strictEqual(result.outBinds.lob_1.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);

                  var lob = result.outBinds.lob_2;
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
          );
        }
      ], done);
    }); // 77.6.2

  }); // 77.6

});
