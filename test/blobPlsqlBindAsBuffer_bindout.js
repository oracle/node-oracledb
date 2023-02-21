/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   78. blobPlsqlBindAsBuffer_bindout.js
 *
 * DESCRIPTION
 *   Testing BLOB binding out as Buffer.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var fs       = require('fs');
var file     = require('./file.js');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('78. blobPlsqlBindAsBuffer_bindout.js', function() {

  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1

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

    if (insertBuffer == 'EMPTY_LOB') {
      sql = "INSERT INTO nodb_tab_blob_in (id, blob_1) VALUES (:i, EMPTY_BLOB())";
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
      });
  };

  var inFileStreamed = './test/blobTmpFile.txt';

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

        lob.on('finish', function() {
          connection.commit(function(err) {
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
        blobData = Buffer.alloc(0);

        lob.on('data', function(chunk) {
          totalLength = totalLength + chunk.length;
          blobData = Buffer.concat([blobData, chunk], totalLength);
        });

        lob.on('error', function(err) {
          should.not.exist(err, "lob.on 'error' event.");
        });

        lob.on('end', function() {
          fs.readFile(jpgFileName, function(err, originalData) {
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
          var blobData = Buffer.alloc(0);
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

  // compare the result buffer with the original inserted buffer
  var compareResultBufAndOriginal = function(resultVal, originalBuffer, specialStr) {
    if (originalBuffer.length > 0) {
      var resultLength = resultVal.length;
      var specStrLength = specialStr.length;
      should.strictEqual(resultLength, originalBuffer.length);
      should.strictEqual(resultVal.toString('utf8', 0, specStrLength), specialStr);
      should.strictEqual(resultVal.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
    }
    should.strictEqual(assist.compare2Buffers(resultVal, originalBuffer), true);
  };

  var verifyBindOutResult = function(sqlRun, bindVar, originalBuf, specialStr, callback) {
    connection.execute(
      sqlRun,
      bindVar,
      function(err, result) {
        if (originalBuf == "EMPTY_LOB" || originalBuf == undefined || originalBuf == null || originalBuf == "") {
          should.not.exist(err);
          should.strictEqual(result.outBinds.b, null);
          callback();
        } else {
          should.not.exist(err);
          var resultVal = result.outBinds.b;
          compareResultBufAndOriginal(resultVal, originalBuf, specialStr);
          callback();
        }
      }
    );
  };

  describe('78.1 BLOB, PLSQL, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_782 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
               "END nodb_blobs_out_782; ";
    var sqlRun = "BEGIN nodb_blobs_out_782 (:i, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_out_782";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('78.1.1 works with EMPTY_BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, cb);
        }
      ], done);
    }); // 78.1.1

    it('78.1.2 works with EMPTY_BLOB and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, cb);
        }
      ], done);
    }); // 78.1.2

    it('78.1.3 works with EMPTY_BLOB and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, cb);
        }
      ], done);
    }); // 78.1.3

    it('78.1.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, null, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, cb);
        }
      ], done);
    }); // 78.1.4

    it('78.1.5 works with null and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, null, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, cb);
        }
      ], done);
    }); // 78.1.5

    it('78.1.6 works with null and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, null, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, cb);
        }
      ], done);
    }); // 78.1.6

    it('78.1.7 works with empty buffer', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, null, cb);
        }
      ], done);
    }); // 78.1.7

    it('78.1.8 works with empty buffer and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, null, cb);
        }
      ], done);
    }); // 78.1.8

    it('78.1.9 works with empty buffer and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      var bufferStr = Buffer.from('', "utf-8");

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, null, cb);
        }
      ], done);
    }); // 78.1.9

    it('78.1.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, undefined, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, cb);
        }
      ], done);
    }); // 78.1.10

    it('78.1.11 works with undefined and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, undefined, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, cb);
        }
      ], done);
    }); // 78.1.11

    it('78.1.12 works with undefined and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, undefined, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, cb);
        }
      ], done);
    }); // 78.1.12

    it('78.1.13 works with Buffer size 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var size = 32768;
      var sequence = insertID++;
      var specialStr = "78.1.13";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
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
          verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 78.1.13

    it('78.1.14 works with Buffer size (64K - 1)', function(done) {
      var size = 65535;
      var sequence = insertID++;
      var specialStr = "78.1.14";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
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
          verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 78.1.14

    it('78.1.15 works with Buffer size (64K + 1)', function(done) {
      var size = 65537;
      var sequence = insertID++;
      var specialStr = "78.1.15";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr, cb);
        },
        function(cb) {
          file.delete(inFileStreamed);
          cb();
        }
      ], done);
    }); // 78.1.15

    it('78.1.16 works with Buffer size (1MB + 1)', function(done) {
      var size = 1048577; // 1 * 1024 * 1024 + 1
      var sequence = insertID++;
      var specialStr = "78.1.16";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr, cb);
        },
        function(cb) {
          file.delete(inFileStreamed);
          cb();
        }
      ], done);
    }); // 78.1.16

    it('78.1.17 mixing named with positional binding', function(done) {
      var size = 50000;
      var sequence = insertID++;
      var specialStr = "78.1.17";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size } ];

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
              var resultVal = result.outBinds[0];
              compareResultBufAndOriginal(resultVal, bufferStr, specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 78.1.17

    it('78.1.18 works with UPDATE', function(done) {
      var proc_7821 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_7821 (blob_id IN NUMBER, blob_in IN BLOB, blob_out OUT BLOB) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_in where id = blob_id; \n" +
                      "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                      "END nodb_blobs_out_7821; ";
      var sqlRun_7821 = "BEGIN nodb_blobs_out_7821 (:i, :bi, :bo); END;";
      var proc_drop_7821 = "DROP PROCEDURE nodb_blobs_out_7821";
      var size_1 = 50000;
      var sequence = insertID++;
      var specialStr_1 = "78.1.18_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var size_2 = 40000;
      var specialStr_2 = "78.1.18_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        bi: { val:bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 },
        bo: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr_1, cb);
        },
        function(cb) {
          executeSQL(proc_7821, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7821,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.bo;
              compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_7821, cb);
        }
      ], done);
    }); // 78.1.18

    it('78.1.19 works with dbms_lob.substr()', function(done) {
      var size = 50000;
      var sequence = insertID++;
      var specialStr = "78.1.19";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var proc_78123 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_78123 (blob_id IN NUMBER, blob_out OUT BLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                       "END nodb_blobs_out_78123; ";
      var sqlRun_78123 = "BEGIN nodb_blobs_out_78123 (:i, :b); END;";
      var proc_drop_78123 = "DROP PROCEDURE nodb_blobs_out_78123";
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          executeSQL(proc_78123, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_78123,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.b;
              var comparedBuf = Buffer.from(specialStr, "utf-8");
              compareResultBufAndOriginal(resultVal, comparedBuf, specialStr);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_78123, cb);
        }
      ], done);
    }); // 78.1.19

    it('78.1.20 named binding: bind out maxSize smaller than buffer size( < 32K )', function(done) {
      var size = 3000;
      var sequence = insertID++;
      var specialStr = "78.1.20";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err) {
              should.exist(err);
              // ORA-06502: PL/SQL: numeric or value error: raw variable length too long
              (err.message).should.startWith('ORA-06502:');
              cb();
            }
          );
        }
      ], done);
    }); // 78.1.20

    it('78.1.21 named binding: bind out maxSize smaller than buffer size( > 32K )', function(done) {
      var size = 50000;
      var sequence = insertID++;
      var specialStr = "78.1.21";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.1.21

    it('78.1.22 named binding: bind out maxSize smaller than buffer size( > 64K )', function(done) {
      var size = 65540;
      var sequence = insertID++;
      var specialStr = "78.1.22";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.1.22

    it('78.1.23 positional binding: bind out maxSize smaller than buffer size( < 32K )', function(done) {
      var size = 3000;
      var sequence = insertID++;
      var specialStr = "78.1.23";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      sqlRun = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err) {
              should.exist(err);
              // ORA-06502: PL/SQL: numeric or value error: raw variable length too long
              (err.message).should.startWith('ORA-06502:');
              cb();
            }
          );
        }
      ], done);
    }); // 78.1.23

    it('78.1.24 positional binding: bind out maxSize smaller than buffer size( > 32K )', function(done) {
      var size = 32769;
      var sequence = insertID++;
      var specialStr = "78.1.24";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      sqlRun = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.1.24

    it('78.1.25 positional binding: bind out maxSize smaller than buffer size( > 64K )', function(done) {
      var size = 65538;
      var sequence = insertID++;
      var specialStr = "78.1.25";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      sqlRun = "BEGIN nodb_blobs_out_782 (:1, :2); END;";
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 } ];

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.1.25

    it('78.1.26 bind out without maxSize', function(done) {
      var size = 50000;
      var sequence = insertID++;
      var specialStr = "78.1.26";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } ];

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.1.26

  }); // 78.1

  describe('78.2 BLOB, PLSQL, BIND_OUT to RAW', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_772 (blob_id IN NUMBER, blob_out OUT RAW) \n" +
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

    it('78.2.1 works with EMPTY_BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, cb);
        }
      ], done);
    }); // 78.2.1

    it('78.2.2 works with EMPTY_BLOB and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, cb);
        }
      ], done);
    }); // 78.2.2

    it('78.2.3 works with EMPTY_BLOB and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, "EMPTY_LOB", cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null, cb);
        }
      ], done);
    }); // 78.2.3

    it('78.2.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, null, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, cb);
        }
      ], done);
    }); // 78.2.4

    it('78.2.5 works with null and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, null, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, cb);
        }
      ], done);
    }); // 78.2.5

    it('78.2.6 works with null and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, null, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, null, null, cb);
        }
      ], done);
    }); // 78.2.6

    it('78.2.7 works with empty buffer', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, null, cb);
        }
      ], done);
    }); // 78.2.7

    it('78.2.8 works with empty buffer and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, null, cb);
        }
      ], done);
    }); // 78.2.8

    it('78.2.9 works with empty buffer and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      var bufferStr = Buffer.from('', "utf-8");

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, bufferStr, null, cb);
        }
      ], done);
    }); // 78.2.9

    it('78.2.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, undefined, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, cb);
        }
      ], done);
    }); // 78.2.10

    it('78.2.11 works with undefined and bind out maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, undefined, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, cb);
        }
      ], done);
    }); // 78.2.11

    it('78.2.12 works with undefined and bind out maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, undefined, cb);
        },
        function(cb) {
          verifyBindOutResult(sqlRun, bindVar, undefined, null, cb);
        }
      ], done);
    }); // 78.2.12

    it('78.2.13 works with Buffer size (32K - 1)', function(done) {
      var size = 32767;
      var sequence = insertID++;
      var specialStr = "78.2.13";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
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
          verifyBindOutResult(sqlRun, bindVar, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 78.2.13

    it('78.2.14 works with Buffer size 32K', function(done) {
      var size = 32768;
      var sequence = insertID++;
      var specialStr = "78.2.14";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.2.14

    it('78.2.15 works with bind out maxSize smaller than buffer size', function(done) {
      var size = 200;
      var sequence = insertID++;
      var specialStr = "78.2.15";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size - 1 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.2.15

    it('78.2.16 bind out without maxSize', function(done) {
      var size = 500;
      var sequence = insertID++;
      var specialStr = "78.2.16";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = [ sequence, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } ];

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
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
    }); // 78.2.16

    it('78.2.17 works with UPDATE', function(done) {
      var proc_7821 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_7821 (blob_id IN NUMBER, blob_in IN RAW, blob_out OUT RAW) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_in where id = blob_id; \n" +
                      "    select blob_1 into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                      "END nodb_blobs_out_7821; ";
      var sqlRun_7821 = "BEGIN nodb_blobs_out_7821 (:i, :bi, :bo); END;";
      var proc_drop_7821 = "DROP PROCEDURE nodb_blobs_out_7821";
      var size_1 = 200;
      var sequence = insertID++;
      var specialStr_1 = "78.2.17_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var size_2 = 300;
      var specialStr_2 = "78.2.17_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        bi: { val:bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 },
        bo: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size_2 }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr_1, cb);
        },
        function(cb) {
          executeSQL(proc_7821, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7821,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.bo;
              compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_7821, cb);
        }
      ], done);
    }); // 78.2.17

    it('78.2.18 works with dbms_lob.substr()', function(done) {
      var size = 3000;
      var sequence = insertID++;
      var specialStr = "78.2.18";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var proc_78223 = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_78223 (blob_id IN NUMBER, blob_out OUT RAW) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into blob_out from nodb_tab_blob_in where id = blob_id; \n" +
                       "END nodb_blobs_out_78223; ";
      var sqlRun_78223 = "BEGIN nodb_blobs_out_78223 (:i, :b); END;";
      var proc_drop_78223 = "DROP PROCEDURE nodb_blobs_out_78223";
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };

      async.series([
        function(cb) {
          insertBlobWithbuffer(sequence, bufferStr, cb);
        },
        function(cb) {
          executeSQL(proc_78223, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_78223,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.b;
              var comparedBuf = Buffer.from(specialStr, "utf-8");
              compareResultBufAndOriginal(resultVal, comparedBuf, specialStr);
              cb();
            }
          );
        },
        function(cb) {
          executeSQL(proc_drop_78223, cb);
        }
      ], done);
    }); // 78.2.18

  }); // 78.2

  describe('78.3 Multiple BLOBs, BIND_OUT', function() {
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
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    };

    it('78.3.1 bind two buffer', function(done) {
      var specialStr_1 = "78.3.1_1";
      var specialStr_2 = "78.3.1_2";
      var size_1 = 32768;
      var size_2 = 50000;
      var sequence = insertID++;
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
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
          verifyBlobValueWithBuffer(sql, bufferStr_1, specialStr_1, cb);
        },
        function(cb) {
          var sql = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr_2, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.b1;
              compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr_1);
              resultVal = result.outBinds.b2;
              compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
              cb();
            }
          );
        }
      ], done);
    }); // 78.3.1

    it('78.3.2 PLSQL, BIND_OUT, bind a JPG file and a Buffer', function(done) {
      var specialStr = "78.3.2";
      var size_1 = 32768;
      var bigStr_1 = random.getRandomString(size_1, specialStr);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var sequence = insertID++;
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
              var resultVal = result.outBinds.b1;
              compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr);

              var lob = result.outBinds.b2;
              var blobData = Buffer.alloc(0);
              var totalLength = 0;

              lob.on('data', function(chunk) {
                totalLength = totalLength + chunk.length;
                blobData = Buffer.concat([blobData, chunk], totalLength);
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {
                fs.readFile(jpgFileName, function(err, originalData) {
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
    }); // 78.3.2

    it('78.3.3 bind two buffer, one > (64K - 1)', function(done) {
      var specialStr_1 = "78.3.3_1";
      var specialStr_2 = "78.3.3_2";
      var size_1 = 65538;
      var size_2 = 50000;
      var sequence = insertID++;
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
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
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.b1;
              compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr_1);
              resultVal = result.outBinds.b2;
              compareResultBufAndOriginal(resultVal, bufferStr_2, specialStr_2);
              cb();
            }
          );
        }
      ], done);
    }); // 78.3.3

  }); // 78.3

});
