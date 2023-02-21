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
 *   77. blobPlsqlBindAsBuffer_bindin.js
 *
 * DESCRIPTION
 *   Testing BLOB binding in as Buffer.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var fs       = require('fs');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('77. blobPlsqlBindAsBuffer_bindin.js', function() {

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

  var verifyBlobValueWithBuffer = function(selectSql, originalBuffer, specialStr, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        if (originalBuffer == null || originalBuffer == undefined) {
          should.not.exist(lob);
          return callback();
        } else {
          should.exist(lob);
          var blobData =  Buffer.alloc(0);
          var totalLength = 0;

          lob.on('data', function(chunk) {
            totalLength = totalLength + chunk.length;
            blobData = Buffer.concat([blobData, chunk], totalLength);
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function() {
            should.strictEqual(totalLength, originalBuffer.length);
            compareResultBufAndOriginal(blobData, totalLength, originalBuffer, specialStr, callback);
          });
        }
      }
    );
  };

  // compare the result buffer with the original inserted buffer
  var compareResultBufAndOriginal = function(resultVal, totalLength, originalBuffer, specialStr, callback) {
    if (originalBuffer.length > 0) {
      var specStrLength = specialStr.length;
      should.strictEqual(resultVal.toString('utf8', 0, specStrLength), specialStr);
      should.strictEqual(resultVal.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
    }
    should.strictEqual(assist.compare2Buffers(resultVal, originalBuffer), true);
    callback();
  };

  // execute the bind in plsql procedure
  var plsqlBindIn = function(sqlRun, bindVar, option, callback) {
    connection.execute(
      sqlRun,
      bindVar,
      option,
      function(err) {
        should.not.exist(err);
        callback();
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

    var proc_7711 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7711 (blob_id IN NUMBER, blob_in IN BLOB)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, EMPTY_BLOB()); \n" +
                    "END nodb_blobs_in_7711; ";
    var sqlRun_7711 = "BEGIN nodb_blobs_in_7711 (:i, :b); END;";
    var proc_drop_7711 = "DROP PROCEDURE nodb_blobs_in_7711";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('77.1.1 works with EMPTY_BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7711, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7711, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          var emptyBuffer =  Buffer.from("", "utf-8");
          verifyBlobValueWithBuffer(sql, emptyBuffer, null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7711, cb);
        }
      ], done);
    }); // 77.1.1

    it('77.1.2 works with EMPTY_BLOB and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7711, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7711, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          var emptyBuffer =  Buffer.from("", "utf-8");
          verifyBlobValueWithBuffer(sql, emptyBuffer, null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7711, cb);
        }
      ], done);
    }); // 77.1.2

    it('77.1.3 works with EMPTY_BLOB and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7711, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7711, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          var emptyBuffer =  Buffer.from("", "utf-8");
          verifyBlobValueWithBuffer(sql, emptyBuffer, null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7711, cb);
        }
      ], done);
    }); // 77.1.3

    it('77.1.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.4

    it('77.1.5 works with null and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.5

    it('77.1.6 works with null and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.6

    it('77.1.7 works with empty buffer', function(done) {
      var sequence = insertID++;
      var bufferStr =  Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.7

    it('77.1.8 works with empty buffer and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.8

    it('77.1.9 works with empty buffer and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.9

    it('77.1.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.10

    it('77.1.11 works with undefined and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.11

    it('77.1.12 works with undefined and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.1.12

    it('77.1.13 works with NaN', function(done) {
      var sequence = insertID++;
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
    }); // 77.1.13

    it('77.1.14 works with 0', function(done) {
      var sequence = insertID++;
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
    }); // 77.1.14

    it('77.1.15 works with Buffer size 32K', function(done) {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      var sequence = insertID++;
      var size = 32768;
      var specialStr = "77.1.15";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.1.15

    it('77.1.16 works with Buffer size (64K - 1)', function(done) {
      var size = 65535;
      var sequence = insertID++;
      var specialStr = "77.1.16";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.1.16

    it('77.1.17 works with Buffer size (64K + 1)', function(done) {
      var size = 65537;
      var sequence = insertID++;
      var specialStr = "77.1.17";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.1.17

    it('77.1.18 works with Buffer size (1MB + 1)', function(done) {
      var size = 1048577; // 1 * 1024 * 1024 + 1
      var sequence = insertID++;
      var specialStr = "77.1.18";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.1.18

    it('77.1.19 works with bind value and type mismatch', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: 200, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 50000 }
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
    }); // 77.1.19

    it('77.1.20 mixing named with positional binding', function(done) {
      var size = 50000;
      var sequence = insertID++;
      var specialStr = "77.1.20";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size } ];
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          var sqlRun_77122 = "BEGIN nodb_blobs_in_771 (:1, :2); END;";
          plsqlBindIn(sqlRun_77122, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.1.20

    it('77.1.21 works with invalid BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 77.1.21

    it('77.1.22 works without maxSize', function(done) {
      var size = 65535;
      var sequence = insertID++;
      var specialStr = "77.1.22";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.1.22

    it('77.1.23 works with bind in maxSize smaller than buffer size', function(done) {
      var size = 65535;
      var sequence = insertID++;
      var specialStr = "77.1.23";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size - 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.1.23

    it('77.1.24 works with UPDATE', function(done) {
      var proc_7726 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7726 (blob_id IN NUMBER, blob_in IN BLOB, blob_update IN BLOB)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_update where id = blob_id; \n" +
                      "END nodb_blobs_in_7726; ";
      var sqlRun_7726 = "BEGIN nodb_blobs_in_7726 (:i, :b1, :b2); END;";
      var proc_drop_7726 = "DROP PROCEDURE nodb_blobs_in_7726";
      var sequence = insertID++;
      var size_1 = 65535;
      var specialStr_1 = "77.1.24_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var size_2 = 30000;
      var specialStr_2 = "77.1.24_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7726, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7726,
            bindVar,
            option,
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr_2, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7726, cb);
        }
      ], done);
    }); // 77.1.24

  }); // 77.1

  describe('77.2 BLOB, PLSQL, BIND_IN to RAW', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_771 (blob_id IN NUMBER, blob_in IN RAW)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
               "END nodb_blobs_in_771; ";
    var sqlRun = "BEGIN nodb_blobs_in_771 (:i, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_in_771";

    var proc_7721 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7721 (blob_id IN NUMBER, blob_in IN RAW)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, EMPTY_BLOB()); \n" +
                    "END nodb_blobs_in_7721; ";
    var sqlRun_7721 = "BEGIN nodb_blobs_in_7721 (:i, :b); END;";
    var proc_drop_7721 = "DROP PROCEDURE nodb_blobs_in_7721";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('77.2.1 works with EMPTY_BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7721, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7721, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          var emptyBuffer = Buffer.from("", "utf-8");
          verifyBlobValueWithBuffer(sql, emptyBuffer, null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7721, cb);
        }
      ], done);
    }); // 77.2.1

    it('77.2.2 works with EMPTY_BLOB and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7721, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7721, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          var emptyBuffer = Buffer.from("", "utf-8");
          verifyBlobValueWithBuffer(sql, emptyBuffer, null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7721, cb);
        }
      ], done);
    }); // 77.2.2

    it('77.2.3 works with EMPTY_BLOB and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7721, cb);
        },
        function(cb) {
          plsqlBindIn(sqlRun_7721, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          var emptyBuffer = Buffer.from("", "utf-8");
          verifyBlobValueWithBuffer(sql, emptyBuffer, null, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7721, cb);
        }
      ], done);
    }); // 77.2.3

    it('77.2.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.4

    it('77.2.5 works with null and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.5

    it('77.2.6 works with null and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.6

    it('77.2.7 works with empty buffer', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.7

    it('77.2.8 works with empty buffer and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.8

    it('77.2.9 works with empty buffer and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bufferStr = Buffer.from('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.9

    it('77.2.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.10

    it('77.2.11 works with undefined and bind in maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.11

    it('77.2.12 works with undefined and bind in maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, null, null, cb);
        }
      ], done);
    }); // 77.2.12

    it('77.2.13 works with NaN', function(done) {
      var sequence = insertID++;
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
    }); // 77.2.13

    it('77.2.14 works with 0', function(done) {
      var sequence = insertID++;
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
    }); // 77.2.14

    it('77.2.15 works with Buffer size (32K - 1)', function(done) {
      var sequence = insertID++;
      var size = 32767;
      var specialStr = "77.2.15";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.2.15

    it('77.2.16 works with Buffer size 32K', function(done) {
      var size = 32768;
      var sequence = insertID++;
      var specialStr = "77.2.16";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size }
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
    }); // 77.2.16

    it('77.2.17 works with invalid BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        { autoCommit: true },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 77.2.17

    it('77.2.18 works without maxSize', function(done) {
      var size = 3000;
      var sequence = insertID++;
      var specialStr = "77.2.18";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.2.18

    it('77.2.19 works with bind in maxSize smaller than buffer size', function(done) {
      var size = 400;
      var sequence = insertID++;
      var specialStr = "77.2.19";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = Buffer.from(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size - 1 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr, specialStr, cb);
        }
      ], done);
    }); // 77.2.19

    it('77.2.20 works with UPDATE', function(done) {
      var proc_7720 = "CREATE OR REPLACE PROCEDURE nodb_blobs_in_7720 (blob_id IN NUMBER, blob_in IN RAW, blob_update IN RAW)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into nodb_tab_blob_in (id, blob_1) values (blob_id, blob_in); \n" +
                      "    update nodb_tab_blob_in set blob_1 = blob_update where id = blob_id; \n" +
                      "END nodb_blobs_in_7720; ";
      var sqlRun_7720 = "BEGIN nodb_blobs_in_7720 (:i, :b1, :b2); END;";
      var proc_drop_7720 = "DROP PROCEDURE nodb_blobs_in_7720";
      var sequence = insertID++;
      var size_1 = 3000;
      var specialStr_1 = "77.2.20_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var size_2 = 2000;
      var specialStr_2 = "77.2.20_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          executeSQL(proc_7720, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun_7720,
            bindVar,
            option,
            function(err) {
              should.not.exist(err);
              cb();
            });
        },
        function(cb) {
          var sql = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql, bufferStr_2, specialStr_2, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7720, cb);
        }
      ], done);
    }); // 77.2.20

  }); // 77.2

  describe('77.3 Multiple BLOBs, BIND_IN', function() {
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

    it('77.3.1 bind two Buffer', function(done) {
      var size_1 = 32768;
      var size_2 = 50000;
      var specialStr_1 = "77.3.1_1";
      var specialStr_2 = "77.3.1_2";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql_1 = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_1, bufferStr_1, specialStr_1, cb);
        },
        function(cb) {
          var sql_2 = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_2, bufferStr_2, specialStr_2, cb);
        }
      ], done);
    }); // 77.3.1

    it('77.3.2 bind a JPG file and a Buffer', function(done) {
      var specialStr = "77.3.2";
      var preparedCLOBID = 301;
      var sequence = insertID++;
      var size_1 = 32768;
      var bigStr_1 = random.getRandomString(size_1, specialStr);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");

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
                  blob.close(cb);
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
    }); // 77.3.2

    it('77.3.3 bind two Buffer, one > (64K - 1)', function(done) {
      var size_1 = 65538;
      var size_2 = 50000;
      var specialStr_1 = "77.3.3_1";
      var specialStr_2 = "77.3.3_2";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_1 = Buffer.from(bigStr_1, "utf-8");
      var bufferStr_2 = Buffer.from(bigStr_2, "utf-8");
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        b2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_2 }
      };
      var option = { autoCommit: true };

      async.series([
        function(cb) {
          plsqlBindIn(sqlRun, bindVar, option, cb);
        },
        function(cb) {
          var sql_1 = "select blob_1 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_1, bufferStr_1, specialStr_1, cb);
        },
        function(cb) {
          var sql_2 = "select blob_2 from nodb_tab_blob_in where id = " + sequence;
          verifyBlobValueWithBuffer(sql_2, bufferStr_2, specialStr_2, cb);
        }
      ], done);
    }); // 77.3.3

  }); // 77.3

});
