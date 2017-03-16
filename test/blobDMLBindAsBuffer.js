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
 *   80. blobDMLBindAsBuffer.js
 *
 * DESCRIPTION
 *   Testing BLOB binding as Buffer with DML.
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
var random = require('./random.js');
var fs    = require('fs');

describe('80.blobDMLBindAsBuffer.js', function() {
  this.timeout(100000);

  var connection = null;
  var client11gPlus = true; // assume instant client runtime version is greater than 11.2.0.4.0
  var node6plus = false; // assume node runtime version is lower than 6
  var proc_blob_1 = "BEGIN \n" +
                    "    DECLARE \n" +
                    "        e_table_missing EXCEPTION; \n" +
                    "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                    "    BEGIN \n" +
                    "        EXECUTE IMMEDIATE('DROP TABLE nodb_dml_blob_1 PURGE'); \n" +
                    "    EXCEPTION \n" +
                    "        WHEN e_table_missing \n" +
                    "        THEN NULL; \n" +
                    "    END; \n" +
                    "    EXECUTE IMMEDIATE (' \n" +
                    "        CREATE TABLE nodb_dml_blob_1 ( \n" +
                    "            id      NUMBER, \n" +
                    "            blob    BLOB \n" +
                    "        ) \n" +
                    "    '); \n" +
                    "END; ";
  var sql2DropTable1 = "DROP TABLE nodb_dml_blob_1 PURGE";

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      // Check whether instant client runtime version is smaller than 12.1.0.2
      if(oracledb.oracleClientVersion < 1201000200)
        client11gPlus = false;
      // Check whether node runtime version is >= 6 or not
      if ( process.versions["node"].substring (0, 1) >= "6")
        node6plus = true;

      done();
    });
  }); // before

  after(function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  }); // after

  var executeSQL = function(sql, callback) {
    connection.execute(
      sql,
      function(err) {
        should.not.exist(err);
        return callback();
      }
    );
  };

  var insertIntoBlobTable1 = function(id, content, callback, case64KPlus) {
    if(content == "EMPTY_BLOB") {
      connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, EMPTY_BLOB())",
        [ id ],
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    } else {
      connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        },
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
    }
  };

  var updateBlobTable1 = function(id, content, case64KPlus, callback) {
    if(content == "EMPTY_BLOB") {
      connection.execute(
        "UPDATE nodb_dml_blob_1 set blob = EMPTY_BLOB() where id = :ID",
        { ID: id },
        function(err, result){
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    } else {
      connection.execute(
        "UPDATE nodb_dml_blob_1 set blob = :C where id = :ID",
        { ID: id, C: content },
        function(err, result){
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
    }
  };

  // compare the inserted blob with orginal content
  var verifyBlobValueWithBuffer = function(selectSql, originalBuffer, specialStr, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        if(originalBuffer == '' || originalBuffer == undefined) {
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
            if(originalBuffer == "EMPTY_BLOB") {
              var nullBuffer = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
              should.strictEqual(blobData.equals(nullBuffer), true);
            } else {
              should.strictEqual(totalLength, originalBuffer.length);
              var specStrLength = specialStr.length;
              should.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(blobData.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
              should.strictEqual(blobData.equals(originalBuffer), true);
            }
            return callback();
          });
        }
      }
    );
  };

  var checkInsertResult = function(id, content, specialStr, case64KPlus, callback) {
    if(case64KPlus === true  && client11gPlus === false) {
      callback();
    } else {
      var sql = "select blob from nodb_dml_blob_1 where id = " + id;
      verifyBlobValueWithBuffer(sql, content, specialStr, callback);
    }
  };

  // Generate id for insert blob into db
  var insertID = 0;
  var getID = function() {
    insertID = insertID + 1;
    return insertID;
  };

  describe('80.1 BLOB, INSERT', function() {
    before(function(done) {
      executeSQL(proc_blob_1, done);
    });  // before

    after(function(done) {
      executeSQL(sql2DropTable1, done);
    }); // after

    it('80.1.1 works with EMPTY_BLOB', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.1

    it('80.1.2 works with empty buffer', function(done) {
      var id = getID();
      var bigStr = '';
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.2

    it('80.1.3 works with empty buffer and bind in maxSize set to 32767', function(done) {
      var id = getID();
      var bigStr = '';
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER, maxSize: 32767 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.3

    it('80.1.4 works with empty buffer and bind in maxSize set to 50000', function(done) {
      var id = getID();
      var bigStr = '';
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER, maxSize: 50000 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.4

    it('80.1.5 works with undefined', function(done) {
      var id = getID();
      var content = undefined;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.5

    it('80.1.6 works with null', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.6

    it('80.1.7 works with null and bind in maxSize set to 32767', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER, maxSize: 32767 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.7

    it('80.1.8 works with null and bind in maxSize set to 50000', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER, maxSize: 50000 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 80.1.8

    it('80.1.9 works with NaN', function(done) {
      var id = getID();
      var content = NaN;

      connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 80.1.9

    it('80.1.10 works with 0', function(done) {
      var id = getID();
      var content = 0;

      connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 80.1.10

    it('80.1.11 works with Buffer length 32K', function(done) {
      var id = getID();
      var contentLength = 32768;
      var specialStr = "80.1.11";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, false, cb);
        }
      ], done);
    }); // 80.1.11

    it('80.1.12 works with Buffer length (64K - 1)', function(done) {
      var id = getID();
      var contentLength = 65535;
      var specialStr = "80.1.12";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, false, cb);
        }
      ], done);
    }); // 80.1.12

    it('80.1.13 works with Buffer length (64K + 1)', function(done) {
      var id = getID();
      var contentLength = 65537;
      var specialStr = "80.1.13";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 80.1.13

    it('80.1.14 works with Buffer length (1MB + 1)', function(done) {
      var id = getID();
      var contentLength = 1048577; // 1 * 1024 * 1024 + 1;
      var specialStr = "80.1.14";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 80.1.14

    it('80.1.15 works with Buffer length (5MB + 1)', function(done) {
      var id = getID();
      var contentLength = 5242881; // 5 * 1024 * 1024 + 1;
      var specialStr = "80.1.15";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 80.1.15

    it('80.1.16 works with Buffer length (10MB + 1)', function(done) {
      var id = getID();
      var contentLength = 10485761; // 10 * 1024 * 1024 + 1;
      var specialStr = "80.1.16";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 80.1.16

    it('80.1.17 bind value and type mismatch', function(done) {
      var id = getID();
      var content = 100;

      connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 80.1.17

    it('80.1.18 mixing named with positional binding', function(done) {
      var id = getID();
      var contentLength = 40000;
      var specialStr = "80.1.18";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:1, :2)",
            [
              id, { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
            ],
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 80.1.18

    it('80.1.19 bind with invalid BLOB', function(done) {
      var id = getID();

      connection.execute(
        "INSERT INTO nodb_dml_blob_1 VALUES (:1, :2)",
        [
          id, { val : {}, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        ],
        function(err) {
          should.exist(err);
          // NJS-012: encountered invalid bind datatype in parameter 2
          (err.message).should.startWith('NJS-012:');
          done();
        }
      );
    }); // 80.1.19

    it('80.1.20 Negative: RETURNING INTO with bind type BUFFER', function(done) {
      var id = getID();
      var contentLength = 400;
      var specialStr = "80.1.20";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var sql = "INSERT INTO nodb_dml_blob_1 (id, blob) VALUES (:i, :c) RETURNING blob INTO :lobbv";

      connection.execute(
        sql,
        {
          i: id,
          c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
          lobbv: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: contentLength }
        },
        function(err) {
          should.exist(err);
          // NJS-028: RAW database type is not supported with DML Returning statements
          (err.message).should.startWith('NJS-028:');
          done();
        }
      );
    }); // 80.1.20

    it('80.1.21 Negative: RETURNING INTO with autocommit on', function(done) {
      var id = getID();
      var sql = "INSERT INTO nodb_dml_blob_1 (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
      var inFileName = './test/tree.jpg';

      connection.execute(
        sql,
        {
          i: id,
          lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          var inStream = fs.createReadStream(inFileName);
          var lob = result.outBinds.lobbv[0];

          lob.on('error', function(err) {
            should.exist(err);
            // ORA-22990: LOB locators cannot span transactions
            (err.message).should.startWith('ORA-22990:');
          });

          inStream.on('error', function(err) {
            should.not.exist(err, "inStream.on 'error' event");
          });

          lob.on('close', function(err) {
            should.not.exist(err);
            done();
          });

          inStream.pipe(lob); // copies the text to the CLOB
        }
      );
    }); // 80.1.21

    it('80.1.22 works with bind in maxSize smaller than buffer size', function(done) {
      var id = getID();
      var contentLength = 32768;
      var specialStr = "80.1.22";
      var bigStr = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_blob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER, maxSize: 1 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, false, cb);
        }
      ], done);
    }); // 80.1.22

  }); // 80.1

  describe('80.2 BLOB, UPDATE', function() {
    insertID = 0;

    before(function(done) {
      executeSQL(proc_blob_1, done);
    });  // before

    after(function(done) {
      executeSQL(sql2DropTable1, done);
    }); // after

    it('80.2.1 update EMPTY_BLOB column', function(done) {
      var id = getID();
      var content_1 = "EMPTY_BLOB";
      var contentLength_2 = 32768;
      var specialStr_2 = "80.2.1";
      var bigStr_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, false, cb);
        }
      ], done);
    }); // 80.2.1

    it('80.2.2 update a cloumn with EMPTY_BLOB', function(done) {
      var id = getID();
      var contentLength_1 = 50000;
      var specialStr_1 = "80.2.2";
      var bigStr_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var content_2 = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, false, cb);
        }
      ], done);
    }); // 80.2.2

    it('80.2.3 update EMPTY_BLOB column with empty buffer', function(done) {
      var id = getID();
      var content_1 = "EMPTY_BLOB";
      var content_2 = "";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, false, cb);
        }
      ], done);
    }); // 80.2.3

    it('80.2.4 update empty buffer column', function(done) {
      var id = getID();
      var bigStr_1 = "";
      var content_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var contentLength_2 = 54321;
      var specialStr_2 = "80.2.4";
      var bigStr_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, false, cb);
        }
      ], done);
    }); // 80.2.4

    it('80.2.5 update a column with empty buffer', function(done) {
      var id = getID();
      var contentLength_1 = 50000;
      var specialStr_1 = "80.2.2";
      var bigStr_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var content_2 = "";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, false, cb);
        }
      ], done);
    }); // 80.2.5

    it('80.2.6 update a column with (10MB + 1) buffer', function(done) {
      var id = getID();
      var contentLength_1 = 50000;
      var specialStr_1 = "80.2.6_1";
      var bigStr_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var contentLength_2 = 10485761; // 10 * 1024 * 1024 + 1;
      var specialStr_2 = "80.2.6_2";
      var bigStr_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, true, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, true, cb);
        }
      ], done);
    }); // 80.2.6

  }); // 80.2
});
