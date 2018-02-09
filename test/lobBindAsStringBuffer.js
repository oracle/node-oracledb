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
 *   80. lobBindAsStringBuffer.js
 *
 * DESCRIPTION
 *   Testing CLOB/BLOB binding as String/Buffer.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var fs = require('fs');
var random = require('./random.js');

describe('80. lobBindAsStringBuffer.js', function() {
  var connection = null;
  var node6plus = false; // assume node runtime version is lower than 6

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
    connection.execute(
      proc_lobs_in_tab,
      function(err) {
        should.not.exist(err);
        callback();
      }
    );
  };

  var dropAllTable = function(callback) {
    connection.execute(
      "DROP TABLE nodb_tab_lobs_in PURGE",
      function(err) {
        should.not.exist(err);
        callback();
      }
    );
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

  describe('80.1 Multiple LOBs, BIND_IN', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_781 (id IN NUMBER, clob_in IN CLOB, blob_in IN BLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_lobs_in (id, clob, blob) values (id, clob_in, blob_in); \n" +
               "END nodb_lobs_in_781; ";
    var sqlRun = "BEGIN nodb_lobs_in_781 (:i, :c, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_781";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('80.1.1 PLSQL, CLOB&BLOB, bind a string and a buffer', function(done) {
      var specialStr = "80.1.1";
      var length = 50000;
      var bigStr = random.getRandomString(length, specialStr);
      var bigBuffer = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var sequence = 700;
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
    }); // 80.1.1

    it('80.1.2 PLSQL, CLOB&BLOB, bind a string and a JPG file', function(done) {
      var preparedCLOBID = 701;
      var sequence = 2;
      var size = 40000;
      var specialStr = "80.1.2";
      var bigStr = random.getRandomString(size, specialStr);

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
                  blob.close(cb);
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
    }); // 80.1.2

    it('80.1.3 PLSQL, CLOB&BLOB, bind a txt file and a Buffer', function(done) {
      var preparedCLOBID = 200;
      var sequence = 303;
      var size = 40000;
      var specialStr = "80.1.3";
      var bigStr = random.getRandomString(size, specialStr);
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
                  clob.close(cb);
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
    }); // 80.1.3

  }); // 80.1

  describe('80.2 Multiple LOBs, BIND_OUT', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_782 (lob_id IN NUMBER, clob OUT CLOB, blob OUT BLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select clob, blob into clob, blob from nodb_tab_lobs_in where id = lob_id; \n" +
               "END nodb_lobs_out_782; ";
    var sqlRun = "BEGIN nodb_lobs_out_782 (:i, :c, :b); END;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_out_782";

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

    it('80.2.1 PLSQL, CLOB&BLOB, bind a string and a buffer', function(done) {
      var length = 50000;
      var specialStr = "80.2.1";
      var sequence = 311;
      var bigStr = random.getRandomString(length, specialStr);
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

    }); // 80.2.1

    it('80.2.2 PLSQL, CLOB&BLOB, bind a string and a JPG file', function(done) {
      var size = 40000;
      var specialStr = "80.2.2";
      var bigStr = random.getRandomString(size, specialStr);
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

    }); // 80.2.2

    it('80.2.3 PLSQL, CLOB&BLOB, bind a txt file and a buffer', function(done) {
      var size = 40000;
      var specialStr = "80.2.3";
      var bigStr = random.getRandomString(size, specialStr);
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
    }); // 80.2.3

  }); // 80.2

  describe('80.3 Multiple LOBs, BIND_INOUT', function() {
    var lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_783 (clob IN OUT CLOB, blob IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    clob := clob; \n" +
                          "    blob := blob; \n" +
                          "END nodb_lobs_in_out_783;";
    var sqlRun = "begin nodb_lobs_in_out_783(:clob, :blob); end;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_out_783";

    before(function(done) {
      executeSQL(lobs_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('80.3.1 PLSQL, BIND_INOUT, bind a 32K string and a 32K buffer', function(done) {
      var specialStr = "80.3.1";
      var size = 32768;
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        clob: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: bigStr, maxSize: size },
        blob: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr, maxSize: size }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var specStrLength = specialStr.length;
              var resultLength1 = result.outBinds.clob.length;
              should.strictEqual(resultLength1, size);
              should.strictEqual(result.outBinds.clob.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.clob.substring(resultLength1 - specStrLength, resultLength1), specialStr);
              var resultLength2 = result.outBinds.blob.length;
              should.strictEqual(resultLength2, size);
              should.strictEqual(result.outBinds.blob.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.blob.toString('utf8', (resultLength2 - specStrLength), resultLength2), specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 80.3.1

    it('80.3.2 PLSQL, BIND_INOUT, bind a (64K - 1) string and a (64K - 1) buffer', function(done) {
      var specialStr = "80.3.2";
      var size = 65535;
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        clob: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: bigStr, maxSize: size },
        blob: { dir: oracledb.BIND_INOUT, type: oracledb.BUFFER, val: bufferStr, maxSize: size }
      };

      async.series([
        function(cb) {
          connection.execute(
            sqlRun,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var specStrLength = specialStr.length;
              var resultLength1 = result.outBinds.clob.length;
              should.strictEqual(resultLength1, size);
              should.strictEqual(result.outBinds.clob.substring(0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.clob.substring(resultLength1 - specStrLength, resultLength1), specialStr);
              var resultLength2 = result.outBinds.blob.length;
              should.strictEqual(resultLength2, size);
              should.strictEqual(result.outBinds.blob.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(result.outBinds.blob.toString('utf8', (resultLength2 - specStrLength), resultLength2), specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 80.3.2

  }); // 80.3

});
