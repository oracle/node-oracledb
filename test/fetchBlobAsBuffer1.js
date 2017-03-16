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
 *   87. fetchBlobAsBuffer1.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    To fetch BLOB columns as buffer by setting oracledb.fetchAsBuffer.
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
var async    = require('async');
var should   = require('should');
var fs       = require('fs');
var file     = require('./file.js');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('87. fetchBlobAsBuffer1.js', function() {
  this.timeout(100000);
  var connection = null;
  var node6plus = false;  // assume node runtime version is lower than 6
  var client11gPlus = true; // assume instant client runtime version is greater than 11.2.0.4.0
  var insertID = 1; // assume id for insert into db starts from 1
  var inFileName = './test/blobTmpFile.txt';

  var proc_create_table1 = "BEGIN \n" +
                           "  DECLARE \n" +
                           "    e_table_missing EXCEPTION; \n" +
                           "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                           "    BEGIN \n" +
                           "      EXECUTE IMMEDIATE ('DROP TABLE nodb_blob1 PURGE' ); \n" +
                           "    EXCEPTION \n" +
                           "      WHEN e_table_missing \n" +
                           "      THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE ( ' \n" +
                           "      CREATE TABLE nodb_blob1 ( \n" +
                           "        ID NUMBER, \n" +
                           "        B  BLOB \n" +
                           "      ) \n" +
                           "    '); \n" +
                           "END;  ";
  var drop_table1 = "DROP TABLE nodb_blob1 PURGE";

  before('get one connection', function(done) {
    async.series([
      function(cb) {
        oracledb.stmtCacheSize = 0;
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          if(process.versions["node"].substring(0,1) >= "6")
            node6plus = true;
          if(oracledb.oracleClientVersion < 1201000200)
            client11gPlus = false;

          cb();
        });
      },
      function(cb) {
        file.create(inFileName);
        cb();
      }
    ], done);

  }); // before

  after('release connection', function(done) {
    async.series([
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        file.delete(inFileName);
        cb();
      }
    ], done);
  });  // after

  // Generic function to insert a single row given ID, and data
  var insertIntoBlobTable1 = function(id, content, callback, case64KPlus) {
    if(content == "EMPTY_BLOB") {
      connection.execute(
        "INSERT INTO nodb_blob1 VALUES (:ID, EMPTY_BLOB())",
        [ id ],
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    } else {
      connection.execute(
        "INSERT INTO nodb_blob1 VALUES (:ID, :B)",
        {
          ID : { val : id },
          B : { val : content, dir : oracledb.BIND_IN, type : oracledb.BUFFER }
        },
        function(err, result) {
          if(case64KPlus === true  && client11gPlus === false) {
            should.exist(err);
            // NJS-050: data must be shorter than 65535
            (err.message).should.startWith('NJS-050:');
            streamedIntoBlobTable1(id, content, callback);
          } else {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, 1);
            callback();
          }
        }
      );
    }
  };

  // Generate a file and streamed into blob column
  var streamedIntoBlobTable1 = function(id, content, callback) {
    file.write(inFileName, content);
    setTimeout(function(){
      var sql = "INSERT INTO nodb_blob1 (ID, B) VALUES (:i, EMPTY_BLOB()) RETURNING B INTO :lobbv";
      var bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
      connection.execute(
        sql,
        bindVar,
        { autoCommit: false },
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
              callback();
            });
          });

          inStream.pipe(lob); // copies the text to the BLOB
        }
      );
    }, 3000);
  };

  var updateBlobTable1 = function(id, content, callback) {
    connection.execute(
      "UPDATE nodb_blob1 set B = :B where ID = :ID",
      { ID: id, B: content },
      function(err, result){
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

  // compare fetch result
  var compareClientFetchResult = function(err, resultVal, specialStr, content, contentLength, case64KPlus) {
    // if test buffer size greater than 64K
    if(case64KPlus === true) {
      // if client version 12.1.0.2
      if(client11gPlus === true) {
        should.not.exist(err);
        compareBuffers(resultVal, specialStr, content, contentLength);
      } else {
        // if client version 11.2.0.4
        should.not.exist(err);
        content = content.slice(0, 65535);
        compareBuffers(resultVal, specialStr, content, 65535);
      }
    } else {
      // if test buffer size smaller than 64K
      should.not.exist(err);
      compareBuffers(resultVal, specialStr, content, contentLength);
    }
  };

  var compare64KPlusResultSetResult = function(err, resultVal, specialStr, content, contentLength) {
    if(client11gPlus === true) {
      // if client version 12.1.0.2
      should.not.exist(err);
      compareBuffers(resultVal, specialStr, content, contentLength, true);
    } else {
        // if client version 11.2.0.4
      should.exist(err);
        // ORA-01406: fetched column value was truncated
      (err.message).should.startWith('ORA-01406:');
    }
  };

  // compare two buffers
  var compareBuffers = function(resultVal, specialStr, content, contentLength) {
    should.equal(resultVal.length, contentLength);
    var compareBuffer = assist.compare2Buffers(resultVal, content);
    should.strictEqual(compareBuffer, true);
  };

  describe('87.1 fetch BLOB columns by setting oracledb.fetchAsBuffer', function() {

    before('Create table and populate', function(done) {
      connection.execute(
        proc_create_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after('drop table', function(done) {
      connection.execute(
        drop_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, case64KPlus, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              var resultVal = result.rows[0][1];
              if(specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, case64KPlus);
              }
              cb();
            }
          );
        }
      ], callback);
    };

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the by-type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    it('87.1.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.1.1

    it('87.1.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.1.2

    it('87.1.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.1.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.1.3

    it('87.1.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.1.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.1.4

    it('87.1.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.1.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.1.5

    it('87.1.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.1.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.1.6

    it('87.1.7 works with (5MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.1.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.1.7

    it('87.1.8 works with (10MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.1.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.1.8

    it('87.1.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.1.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][0];
              var buffer2Compare = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.9

    it('87.1.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.1.10

    it('87.1.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.11

    it('87.1.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.1.12';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              resultVal = result.rows[0][2];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.12

    it('87.1.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.1.13_1';
      var contentLength_1 = 208;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '87.1.13_2';
      var contentLength_2 = 200;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.13

    it('87.1.14 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.1.14';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          var ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
          connection.execute(
            ref_proc,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql = "BEGIN nodb_ref(:b); END;";
          var bindVar = {
            b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            sql,
            bindVar,
            function(err, result) {
              result.outBinds.b.getRows(3, function(err, rows) {
                var resultVal = rows[0][0];
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.14

    it('87.1.15 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.1.15';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.1.15

    it('87.1.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(1);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.16

    it('87.1.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(2);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.17

    it('87.1.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.1.18';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.DEFAULT } }
            },
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][1];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.1.18

    it('87.1.19 works with connection.queryStream()', function(done) {
      var id = insertID++;
      var specialStr = '87.1.19';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id;
          var stream = connection.queryStream(sql);
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            compareBuffers(result, specialStr, content, contentLength);
            counter++;
          });

          stream.on('end', function () {
            should.equal(counter, 1);
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 87.1.19

    it('87.1.20 works with connection.queryStream() and oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.20_1';
      var contentLength_1 = 26;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.20_2';
      var contentLength_2 = 30;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " +id_2;
          var stream = connection.queryStream(sql);
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            counter++;
            if(counter == 1) {
              compareBuffers(result, specialStr_1, content_1, contentLength_1);
            } else {
              compareBuffers(result, specialStr_2, content_2, contentLength_2);
            }
          });

          stream.on('end', function () {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 87.1.20

    it('87.1.21 works with connection.queryStream() and oracledb.maxRows = actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.21_1';
      var contentLength_1 = 26;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.21_2';
      var contentLength_2 = 30;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 2;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " +id_2;
          var stream = connection.queryStream(sql);
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            counter++;
            if(counter == 1) {
              compareBuffers(result, specialStr_1, content_1, contentLength_1);
            } else {
              compareBuffers(result, specialStr_2, content_2, contentLength_2);
            }
          });

          stream.on('end', function () {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 87.1.21

    it('87.1.22 works with connection.queryStream() and oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.22_1';
      var contentLength_1 = 26;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.21_2';
      var contentLength_2 = 30;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " +id_2;
          var stream = connection.queryStream(sql);
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            counter++;
            if(counter == 1) {
              compareBuffers(result, specialStr_1, content_1, contentLength_1);
            } else {
              compareBuffers(result, specialStr_2, content_2, contentLength_2);
            }
          });

          stream.on('end', function () {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 87.1.22

  }); // 87.1

  describe('87.2 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.OBJECT', function() {

    before('Create table and populate', function(done) {
      connection.execute(
        proc_create_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after('drop table', function(done) {
      connection.execute(
        drop_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the by-type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, case64KPlus, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              var resultVal = result.rows[0].B;
              if(specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, case64KPlus);
              }
              cb();
            }
          );
        }
      ], callback);
    };

    it('87.2.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.2.1

    it('87.2.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.2.2

    it('87.2.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.2.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.2.3

    it('87.2.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.2.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.2.4

    it('87.2.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.2.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.2.5

    it('87.2.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.2.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.2.6

    it('87.2.7 works with (5MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.2.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.2.7

    it('87.2.8 works with (10MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.2.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.2.8

    it('87.2.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.2.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B1;
              var buffer2Compare = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.9

    it('87.2.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.2.10

    it('87.2.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.2.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.2.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.11

    it('87.2.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.2.12';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B1;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              resultVal = result.rows[0].B2;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.12

    it('87.2.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.2.13_1';
      var contentLength_1 = 201;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '87.2.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.13

    it('87.2.14 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.2.14';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          var ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
          connection.execute(
            ref_proc,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql = "BEGIN nodb_ref(:b); END;";
          var bindVar = {
            b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            sql,
            bindVar,
            function(err, result) {
              result.outBinds.b.getRows(3, function(err, rows) {
                var resultVal = rows[0][0];
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.14

    it('87.2.15 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.2.15';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.2.15

    it('87.2.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.2.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.2.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(1);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.16

    it('87.2.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.2.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.2.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(2);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.17

    it('87.2.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.2.18';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.DEFAULT } }
            },
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][1];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.2.18

  }); // 87.2

  describe('87.3 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.OBJECT and resultSet = true', function() {

    before('Create table and populate', function(done) {
      connection.execute(
        proc_create_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after('drop table', function(done) {
      connection.execute(
        drop_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the by-type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, case64KPlus, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal;
                  if(case64KPlus === true) {
                    resultVal = client11gPlus ? row.B : null;
                    compare64KPlusResultSetResult(err, resultVal, specialStr, insertContent, insertContentLength);
                  } else {
                    resultVal = row.B;
                    if(specialStr === null) {
                      should.equal(resultVal, null);
                    } else {
                      compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, case64KPlus);
                    }
                  }
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], callback);
    };

    it('87.3.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.3.1

    it('87.3.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.3.2

    it('87.3.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.3.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.3.3

    it('87.3.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.3.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.3.4

    it('87.3.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.3.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.3.5

    it('87.3.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.3.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.3.6

    it('87.3.7 works with (5MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.3.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.3.7

    it('87.3.8 works with (10MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.3.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.3.8

    it('87.3.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.3.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B1;
                  var buffer2Compare = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
                  compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.3.9

    it('87.3.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.3.10

    it('87.3.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.3.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.3.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[0].B;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1].B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.3.11

    it('87.3.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.3.12';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B1;
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                  resultVal = row.B2;
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.3.12

    it('87.3.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.3.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '87.3.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.3.13

    it('87.3.14 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.3.14';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          var ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
          connection.execute(
            ref_proc,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql = "BEGIN nodb_ref(:b); END;";
          var bindVar = {
            b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            sql,
            bindVar,
            function(err, result) {
              result.outBinds.b.getRows(3, function(err, rows) {
                var resultVal = rows[0][0];
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.3.14

    it('87.3.15 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.3.15';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.3.15

    it('87.3.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.3.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.3.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  should.strictEqual(row.length, 2);
                  var resultVal = row[0].B;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1].B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  oracledb.maxRows =maxRowsBak;
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.3.16

    it('87.3.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.3.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.3.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  should.strictEqual(row.length, 2);
                  var resultVal = row[0].B;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1].B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  oracledb.maxRows =maxRowsBak;
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.3.17

    it('87.3.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.3.18';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.DEFAULT } }
            },
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][1];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.3.18

  }); // 87.3

  describe('87.4 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.ARRAY', function() {

    before('Create table and populate', function(done) {
      connection.execute(
        proc_create_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after('drop table', function(done) {
      connection.execute(
        drop_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the by-type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, case64KPlus, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              var resultVal = result.rows[0][1];
              if(specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, case64KPlus);
              }
              cb();
            }
          );
        }
      ], callback);
    };

    it('87.4.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.4.1

    it('87.4.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.4.2

    it('87.4.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.4.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.4.3

    it('87.4.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.4.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.4.4

    it('87.4.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.4.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.4.5

    it('87.4.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.4.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.4.6

    it('87.4.7 works with (5MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.4.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.4.7

    it('87.4.8 works with (10MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.4.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.4.8

    it('87.4.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.4.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][0];
              var buffer2Compare = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.9

    it('87.4.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.4.10

    it('87.4.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.4.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.4.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.11

    it('87.4.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.4.12';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              resultVal = result.rows[0][2];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.12

    it('87.4.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.4.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '87.4.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.13

    it('87.4.14 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.4.14';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          var ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
          connection.execute(
            ref_proc,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql = "BEGIN nodb_ref(:b); END;";
          var bindVar = {
            b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            sql,
            bindVar,
            function(err, result) {
              result.outBinds.b.getRows(3, function(err, rows) {
                var resultVal = rows[0][0];
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.14

    it('87.4.15 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.4.15';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.4.15

    it('87.4.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.4.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.4.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(1);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.16

    it('87.4.17 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.4.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.4.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(2);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.17

    it('87.4.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.4.18';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.DEFAULT } }
            },
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][1];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.4.18

  }); // 87.4

  describe('87.5 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.ARRAY and resultSet = true', function() {

    before('Create table and populate', function(done) {
      connection.execute(
        proc_create_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after('drop table', function(done) {
      connection.execute(
        drop_table1,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the by-type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, case64KPlus, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal;
                  if(case64KPlus === true) {
                    resultVal = client11gPlus ? row[1] : null;
                    compare64KPlusResultSetResult(err, resultVal, specialStr, insertContent, insertContentLength);
                  } else {
                    resultVal = row[1];
                    if(specialStr === null) {
                      should.not.exist(err);
                      should.equal(resultVal, null);
                    } else {
                      compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, case64KPlus);
                    }
                  }
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], callback);
    };

    it('87.5.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.5.1

    it('87.5.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.5.2

    it('87.5.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.5.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.5.3

    it('87.5.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.5.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 87.5.4

    it('87.5.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.5.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.5.5

    it('87.5.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.5.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.5.6

    it('87.5.7 works with (5MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.5.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.5.7

    it('87.5.8 works with (10MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.5.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 87.5.8

    it('87.5.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.5.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  // console.log(row[0]);
                  should.not.exist(err);
                  var resultVal = row[0];
                  var buffer2Compare = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
                  compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.5.9

    it('87.5.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 87.5.10

    it('87.5.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.5.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.5.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[0][1];
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1][1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.5.11

    it('87.5.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.5.12';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                  resultVal = row[2];
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.5.12

    it('87.5.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.5.13_1';
      var contentLength_1 = 208;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '87.5.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.5.13

    it('87.5.14 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.5.14';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          var ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(blob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN blob_cursor FOR \n" +
                         "        SELECT B from nodb_blob1 WHERE ID = " + id + "; \n" +
                         "END;";
          connection.execute(
            ref_proc,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql = "BEGIN nodb_ref(:b); END;";
          var bindVar = {
            b: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            sql,
            bindVar,
            function(err, result) {
              result.outBinds.b.getRows(3, function(err, rows) {
                var resultVal = rows[0][0];
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err){
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.5.14

    it('87.5.15 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.5.15';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.5.15

    it('87.5.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.5.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.5.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  should.strictEqual(row.length, 2);
                  var resultVal = row[0][1];
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1][1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  oracledb.maxRows =maxRowsBak;
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.5.16

    it('87.5.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.5.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.5.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  should.strictEqual(row.length, 2);
                  var resultVal = row[0][1];
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1][1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
                  oracledb.maxRows =maxRowsBak;
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
        }
      ], done);
    }); // 87.5.17

    it('87.5.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.5.18';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.DEFAULT } }
            },
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][1];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength, false);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.5.18

  }); // 87.5

});
