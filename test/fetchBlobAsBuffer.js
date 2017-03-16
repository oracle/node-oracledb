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
 *   81. fetchBlobAsBuffer.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    To fetch BLOB columns as buffer
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
var fs = require('fs');
var dbConfig = require('./dbconfig.js');

describe('81. fetchBlobAsBuffer.js', function() {
  this.timeout(100000);
  var connection = null;
  var node6plus = false;  // assume node runtime version is lower than 6
  var client11gPlus = true; // assume instant client runtime version is greater than 11.2.0.4.0
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

  var proc_create_table2 = "BEGIN \n" +
                           "    DECLARE \n" +
                           "        e_table_missing EXCEPTION; \n" +
                           "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                           "    BEGIN \n" +
                           "        EXECUTE IMMEDIATE('DROP TABLE nodb_blob2 PURGE'); \n" +
                           "    EXCEPTION \n" +
                           "        WHEN e_table_missing \n" +
                           "        THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE (' \n" +
                           "        CREATE TABLE nodb_blob2 ( \n" +
                           "            ID   NUMBER, \n" +
                           "            B1   BLOB, \n" +
                           "            B2   BLOB \n" +
                           "        ) \n" +
                           "    '); \n" +
                           "END; ";
  var drop_table2 = "DROP TABLE nodb_blob2 PURGE";

  before('get one oonnection', function(done) {
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
        fs.closeSync(fs.openSync(inFileName, 'w'));
        cb();
      }
    ], done);

  }); // before

  after('release connection', function(done) {
    async.series([
      function(cb) {
        deleteFile(inFileName);
        cb();
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
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
    var stream = fs.createWriteStream(inFileName, { flags: 'w', defaultEncoding: 'utf8', autoClose: true });
    stream.write(content);
    stream.end();
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

  // delete file
  var deleteFile = function(fileName) {
    fs.existsSync(fileName, function(exists) {
      if(exists)
        fs.unlink(fileName);
    });
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

  var insertIntoBlobTable2 = function(id, content1, content2, callback) {
    connection.execute(
      "INSERT INTO nodb_blob2 VALUES (:ID, :B1, :B2)",
      [ id, content1, content2 ],
      function(err, result){
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

  // Create a random string of specified length
  var getRandomString = function(length, specialStr) {
    var str='';
    var strLength = length - specialStr.length * 2;
    for(; str.length < strLength; str += Math.random().toString(36).slice(2));
    str = str.substr(0, strLength);
    str = specialStr + str + specialStr;
    return str;
  };

  // Generate id for insert blob into db
  var insertID = 0;
  var getID = function() {
    insertID = insertID + 1;
    return insertID;
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
    var compareBuffer = resultVal.equals(content);
    should.strictEqual(compareBuffer, true);
  };

  describe('81.1 fetch BLOB columns by setting oracledb.fetchAsBuffer', function() {

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

    it('81.1.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, content);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.1

    it('81.1.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.2

    it('81.1.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.1.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              should.not.exist(err);
              // console.log(result.rows[0][1]);
              // console.log(content.equals(result.rows[0][1]));
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.3

    it('81.1.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.1.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.4

    it('81.1.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.1.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.5

    it('81.1.6 works with (1MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.1.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.6

    it('81.1.7 works with (5MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.1.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.7

    it('81.1.8 works with (10MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.1.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.8

    it('81.1.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.1.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.1.9

    it('81.1.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              should.not.exist(err);
              should.equal(result.rows[0][1], null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.1.10

    it('81.1.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.1.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.1.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.1.11

    it('81.1.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.1.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.1.12

    it('81.1.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.1.13_1';
      var contentLength_1 = 208;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.1.13_2';
      var contentLength_2 = 200;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              cb();
            }
          );
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
    }); // 81.1.13

    it('81.1.14 works with REF CURSOR', function(done) {
      var id = getID();
      var specialStr = '81.1.14';
      var contentLength = 100;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.1.14

    it('81.1.15 fetch BLOB with stream', function(done) {
      var id = getID();
      var specialStr = '81.1.15';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.1.15

    it('81.1.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.1.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.1.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.1.16

    it('81.1.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.1.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.1.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.1.17

    it('81.1.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = getID();
      var specialStr = '81.1.18';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.1.18

  }); // 81.1

  describe('81.2 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.OBJECT', function() {

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

    it('81.2.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              should.equal(resultVal, content);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.1

    it('81.2.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              should.equal(resultVal, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.2

    it('81.2.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.2.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.3

    it('81.2.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.2.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.4

    it('81.2.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.2.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.5

    it('81.2.6 works with (1MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.2.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.6

    it('81.2.7 works with (5MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.2.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.7

    it('81.2.8 works with (10MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.2.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.8

    it('81.2.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.2.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.2.9

    it('81.2.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              should.equal(result.rows[0].B, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.2.10

    it('81.2.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.2.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.2.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.2.11

    it('81.2.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.2.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.2.12

    it('81.2.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.2.13_1';
      var contentLength_1 = 201;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.2.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              cb();
            }
          );
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
    }); // 81.2.13

    it('81.2.14 works with REF CURSOR', function(done) {
      var id = getID();
      var specialStr = '81.2.14';
      var contentLength = 100;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.2.14

    it('81.2.15 fetch BLOB with stream', function(done) {
      var id = getID();
      var specialStr = '81.2.15';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.2.15

    it('81.2.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.2.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.2.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.2.16

    it('81.2.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.2.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.2.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.2.17

    it('81.2.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = getID();
      var specialStr = '81.2.18';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.2.18

  }); // 81.2

  describe('81.3 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.OBJECT and resultSet = true', function() {

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

    it('81.3.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
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
                  should.not.exist(err);
                  var resultVal = row.B;
                  should.equal(resultVal, null);
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
    }); // 81.3.1

    it('81.3.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
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
                  should.not.exist(err);
                  var resultVal = row.B;
                  should.equal(resultVal, null);
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
    }); // 81.3.2

    it('81.3.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.3.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
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
    }); // 81.3.3

    it('81.3.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.3.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
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
    }); // 81.3.4

    it('81.3.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.3.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.3.5

    it('81.3.6 works with (1MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.3.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.3.6

    it('81.3.7 works with (5MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.3.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.3.7

    it('81.3.8 works with (10MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.3.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.3.8

    it('81.3.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.3.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.3.9

    it('81.3.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
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
                  should.not.exist(err);
                  var resultVal = row.B;
                  should.equal(resultVal, null);
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
    }); // 81.3.10

    it('81.3.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.3.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.3.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.3.11

    it('81.3.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.3.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.3.12

    it('81.3.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.3.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.3.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
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
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
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
    }); // 81.3.13

    it('81.3.14 works with REF CURSOR', function(done) {
      var id = getID();
      var specialStr = '81.3.14';
      var contentLength = 100;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.3.14

    it('81.3.15 fetch BLOB with stream', function(done) {
      var id = getID();
      var specialStr = '81.3.15';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.3.15

    it('81.3.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.3.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.3.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.3.16

    it('81.3.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.3.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.3.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.3.17

    it('81.3.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = getID();
      var specialStr = '81.3.18';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.3.18

  }); // 81.3

  describe('81.4 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.ARRAY', function() {

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

    it('81.4.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, content);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.1

    it('81.4.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.2

    it('81.4.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.4.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.3

    it('81.4.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.4.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.4

    it('81.4.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.4.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.5

    it('81.4.6 works with (1MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.4.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.6

    it('81.4.7 works with (5MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.4.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.7

    it('81.4.8 works with (10MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.4.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.8

    it('81.4.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.4.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.4.9

    it('81.4.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              should.equal(result.rows[0][1], null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.4.10

    it('81.4.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.4.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.4.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.4.11

    it('81.4.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.4.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.4.12

    it('81.4.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.4.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.4.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              cb();
            }
          );
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
    }); // 81.4.13

    it('81.4.14 works with REF CURSOR', function(done) {
      var id = getID();
      var specialStr = '81.4.14';
      var contentLength = 100;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.4.14

    it('81.4.15 fetch BLOB with stream', function(done) {
      var id = getID();
      var specialStr = '81.4.15';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.4.15

    it('81.4.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.4.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.4.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.4.16

    it('81.4.17 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.4.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.4.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.4.17

    it('81.4.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = getID();
      var specialStr = '81.4.18';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.4.18

  }); // 81.4

  describe('81.5 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.ARRAY and resultSet = true', function() {

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

    it('81.5.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
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
                  should.not.exist(err);
                  var resultVal = row[1];
                  should.equal(resultVal, null);
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
    }); // 81.5.1

    it('81.5.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
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
                  should.not.exist(err);
                  var resultVal = row[1];
                  should.equal(resultVal, null);
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
    }); // 81.5.2

    it('81.5.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.5.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.5.3

    it('81.5.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.5.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.5.4

    it('81.5.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.5.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.5.5

    it('81.5.6 works with (1MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.5.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.5.6

    it('81.5.7 works with (5MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.5.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.5.7

    it('81.5.8 works with (10MB + 1) data', function(done) {
      var id = getID();
      var specialStr = '81.5.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
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
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.5.8

    it('81.5.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.5.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.5.9

    it('81.5.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
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
                  should.not.exist(err);
                  var resultVal = row[1];
                  should.equal(resultVal, null);
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
    }); // 81.5.10

    it('81.5.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.5.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.5.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.5.11

    it('81.5.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.5.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.5.12

    it('81.5.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.5.13_1';
      var contentLength_1 = 208;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.5.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
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
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
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
    }); // 81.5.13

    it('81.5.14 works with REF CURSOR', function(done) {
      var id = getID();
      var specialStr = '81.5.14';
      var contentLength = 100;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.5.14

    it('81.5.15 fetch BLOB with stream', function(done) {
      var id = getID();
      var specialStr = '81.5.15';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.5.15

    it('81.5.16 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.5.16_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.5.16_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.5.16

    it('81.5.17 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.5.17_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.5.17_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
    }); // 81.5.17

    it('81.5.18 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = getID();
      var specialStr = '81.5.18';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
    }); // 81.5.18

  }); // 81.5

  describe('81.6 fetch BLOB columns by setting fetchInfo option', function() {

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

    insertID = 0;

    it('81.6.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, content);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.1

    it('81.6.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.2

    it('81.6.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.6.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.3

    it('81.6.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.6.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.4

    it('81.6.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.6.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.5

    it('81.6.6 works with (1MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.6.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.6

    it('81.6.7 works with (5MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.6.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.7

    it('81.6.8 works with (10MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.6.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.8

    it('81.6.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.6.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : { B1 : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              var resultVal = result.rows[0][0];
              var buffer2Compare = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.9

    it('81.6.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              should.equal(result.rows[0][1], null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.10

    it('81.6.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.6.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.6.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.6.11

    it('81.6.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.6.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : {
                B1 : { type : oracledb.BUFFER },
                B2 : { type : oracledb.BUFFER } }
            },
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
    }); // 81.6.12

    it('81.6.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.6.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.6.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              cb();
            }
          );
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.6.8

    it('81.6.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.6.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.6.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.6.14

    it('81.6.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.6.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.6.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.6.15

  }); // 81.6

  describe('81.7 fetch BLOB columns by setting fetchInfo option and outFormat = oracledb.OBJECT', function() {

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

    insertID = 0;

    it('81.7.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, content);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.1

    it('81.7.2 works with empty buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.2

    it('81.7.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.7.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.3

    it('81.7.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.7.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.4

    it('81.7.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.7.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.5

    it('81.7.6 works with (1MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.7.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.6

    it('81.7.7 works with (5MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.7.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.7

    it('81.7.8 works with (10MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.7.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.8

    it('81.7.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.7.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : { B1 : { type : oracledb.BUFFER } }
            },
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
    }); // 81.7.9

    it('81.7.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              should.equal(result.rows[0].B, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.10

    it('81.7.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.7.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.7.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.7.11

    it('81.7.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.7.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : {
                B1 : { type : oracledb.BUFFER },
                B2 : { type : oracledb.BUFFER } }
            },
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
    }); // 81.7.12

    it('81.7.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.7.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.7.13_2';
      var contentLength_2 = 202;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              cb();
            }
          );
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
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.13

    it('81.7.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.7.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.7.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.7.14

    it('81.7.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.7.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.7.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              result.rows.length.should.eql(2);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 81.7.15

  }); // 81.7

  describe('81.8 fetch BLOB columns by setting fetchInfo option, outFormat = oracledb.OBJECT and resultSet = true', function() {

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

    insertID = 0;

    it('81.8.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
                  should.equal(resultVal, null);
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
    }); // 81.8.1

    it('81.8.2 works with empty buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
                  should.equal(resultVal, null);
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
    }); // 81.8.2

    it('81.8.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.8.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
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
    }); // 81.8.3

    it('81.8.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.8.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
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
    }); // 81.8.4

    it('81.8.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.8.4';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.8.5

    it('81.8.6 works with (1MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.8.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.8.6

    it('81.8.7 works with (5MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.8.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.8.7

    it('81.8.8 works with (10MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.8.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row.B : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.8.8

    it('81.8.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.8.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : { B1 : { type : oracledb.BUFFER } },
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
    }); // 81.8.9

    it('81.8.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
                  should.equal(resultVal, null);
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
    }); // 81.8.10

    it('81.8.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.8.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.8.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              var rowNumFetched = 2;
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
    }); // 81.8.11

    it('81.8.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.8.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : {
                B1 : { type : oracledb.BUFFER },
                B2 : { type : oracledb.BUFFER } },
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
    }); // 81.8.12

    it('81.8.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.8.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.8.13_2';
      var contentLength_2 = 202;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
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
              fetchInfo : { B : { type : oracledb.BUFFER } },
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
    }); // 81.8.13

    it('81.8.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.8.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.8.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              var rowNumFetched = 2;
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  should.equal(row.length, 2);
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
    }); // 81.8.14

    it('81.8.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.8.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.8.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              var rowNumFetched = 2;
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  should.equal(row.length, 2);
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
    }); // 81.8.15

  }); // 81.8

  describe('81.9 fetch BLOB columns by setting fetchInfo option and outFormat = oracledb.ARRAY', function() {

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

    insertID = 0;

    it('81.9.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, content);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.1

    it('81.9.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.equal(resultVal, null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.2

    it('81.9.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.9.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.3

    it('81.9.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.9.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.4

    it('81.9.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.9.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.5

    it('81.9.6 works with (1MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.9.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.6

    it('81.9.7 works with (5MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.9.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.7

    it('81.9.8 works with (10MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.9.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, true);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.8

    it('81.9.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.9.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : { B1 : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              var resultVal = result.rows[0][0];
              var buffer2Compare = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.9

    it('81.9.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              should.equal(result.rows[0][1], null);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.10

    it('81.9.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.9.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.9.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.9.11

    it('81.9.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.9.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : {
                B1 : { type : oracledb.BUFFER },
                B2 : { type : oracledb.BUFFER } }
            },
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
    }); // 81.9.12

    it('81.9.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.9.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.9.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              cb();
            }
          );
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
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 81.9.8

    it('81.9.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.9.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.9.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.9.14

    it('81.9.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.9.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.9.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
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
    }); // 81.9.15

  }); // 81.9

  describe('81.10 fetch BLOB columns by setting fetchInfo option, outFormat = oracledb.ARRAY and resultSet = true', function() {

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

    insertID = 0;

    it('81.10.1 works with NULL value', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  should.equal(resultVal, null);
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
    }); // 81.10.1

    it('81.10.2 works with empty Buffer', function(done) {
      var id = getID();
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  should.equal(resultVal, null);
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
    }); // 81.10.2

    it('81.10.3 works with small value', function(done) {
      var id = getID();
      var specialStr = '81.10.3';
      var contentLength = 20;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
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
    }); // 81.10.3

    it('81.10.4 works with (64K - 1) value', function(done) {
      var id = getID();
      var specialStr = '81.10.4';
      var contentLength = 65535;
      var strBuf = getRandomString(contentLength, specialStr);
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
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
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
    }); // 81.10.4

    it('81.10.5 works with (64K + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.10.5';
      var contentLength = 65537;
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.10.5

    it('81.10.6 works with (1MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.10.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.10.6

    it('81.10.7 works with (5MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.10.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.10.7

    it('81.10.8 works with (10MB + 1) value', function(done) {
      var id = getID();
      var specialStr = '81.10.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, true);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal = client11gPlus ? row[1] : null;
                  compare64KPlusResultSetResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 81.10.8

    it('81.10.9 works with dbms_lob.substr()', function(done) {
      var id = getID();
      var specialStr = '81.10.9';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : { B1 : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
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
    }); // 81.10.9

    it('81.10.10 works with EMPTY_BLOB()', function(done) {
      var id = getID();
      var content = "EMPTY_BLOB";

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  should.equal(resultVal, null);
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
    }); // 81.10.10

    it('81.10.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.10.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.10.11_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              var rowNumFetched = 2;
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  should.strictEqual(row.length, 2);
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
    }); // 81.10.11

    it('81.10.12 fetch the same BLOB column multiple times', function(done) {
      var id = getID();
      var specialStr = '81.10.12';
      var contentLength = 200;
      var strBuf = getRandomString(contentLength, specialStr);
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
              fetchInfo : {
                B1 : { type : oracledb.BUFFER },
                B2 : { type : oracledb.BUFFER } },
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
    }); // 81.10.12

    it('81.10.13 works with update statement', function(done) {
      var id = getID();
      var specialStr_1 = '81.10.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.10.13_2';
      var contentLength_2 = 208;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content_1, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  result.resultSet.close(function(err) {
                    should.not.exist(err);
                    cb();
                  });
                }
              );
            }
          );
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
              fetchInfo : { B : { type : oracledb.BUFFER } },
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
    }); // 81.10.13

    it('81.10.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.10.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.10.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              var rowNumFetched = 2;
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
    }); // 81.10.14

    it('81.10.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = getID();
      var specialStr_1 = '81.10.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = getID();
      var specialStr_2 = '81.10.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
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
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { B : { type : oracledb.BUFFER } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              var rowNumFetched = 2;
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
    }); // 81.10.15

  }); // 81.10

  describe('81.11 fetch multiple BLOBs', function() {

    before('create Table and populate', function(done) {
      connection.execute(
        proc_create_table2,
        function(err){
          should.not.exist(err);
          done() ;
        }
      );
    });  // before

    after('drop table', function(done) {
      connection.execute(
        drop_table2,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach('set oracledb.fetchAsString', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    it('81.11.1 fetch multiple BLOB columns as Buffer', function(done) {
      var id = getID();
      var specialStr_1 = '81.11.1_1';
      var contentLength_1 = 26;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.11.1_2';
      var contentLength_2 = 100;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable2(id, content_1, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, B1, B2 from nodb_blob2",
            function(err, result){
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[0][2];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);

    }); // 81.11.1

    it('81.11.2 fetch two BLOB columns, one as string, another streamed', function(done) {
      var id = getID();
      var specialStr_1 = '81.11.2_1';
      var contentLength_1 = 30;
      var strBuf_1 = getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '81.11.2_2';
      var contentLength_2 = 50;
      var strBuf_2 = getRandomString(contentLength_2, specialStr_2);
      var content_2 = node6plus ? Buffer.from(strBuf_2, "utf-8") : new Buffer(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable2(id, content_1, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, B1 from nodb_blob2 where ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              cb();
            }
          );
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];

          connection.execute(
           "SELECT B2 from nodb_blob2 where ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
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
                should.not.exist(err);
                var specialStrLen_2 = specialStr_2.length;
                var resultLen_2 = clobData.length;
                should.equal(clobData.length, contentLength_2);
                should.strictEqual(clobData.substring(0, specialStrLen_2), specialStr_2);
                should.strictEqual(clobData.substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);

                cb();
              });
            }
          );
        }
      ], done);

    }); // 81.11.2

  }); // 81.11

  describe('81.12 types support for fetchAsBuffer property', function() {

    afterEach ('clear the by-type specification', function ( done ) {
      oracledb.fetchAsBuffer = [];
      done ();
    });

    it('81.12.1 String not supported in fetchAsBuffer', function(done) {
      try {
        oracledb.fetchAsBuffer = [ oracledb.STRING ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021');
      }
      done();
    }); // 81.12.1

    it('81.12.2 CLOB not supported in fetchAsBuffer', function(done) {
      try {
        oracledb.fetchAsBuffer = [ oracledb.CLOB ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021');
      }
      done();
    }); // 81.12.2

    it('81.12.3 Number not supported in fetchAsBuffer', function(done) {
      try {
        oracledb.fetchAsBuffer = [ oracledb.NUMBER ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021');
      }
      done();
    }); // 81.12.3

    it('81.12.4 Date not supported in fetchAsBuffer', function(done) {
      try {
        oracledb.fetchAsBuffer = [ oracledb.DATE ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021');
      }
      done();
    }); // 81.12.4

    it('81.12.5 Cursor not supported in fetchAsBuffer', function(done) {
      try {
        oracledb.fetchAsBuffer = [ oracledb.CURSOR ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021');
      }
      done();
    }); // 81.12.5

    it('81.12.6 Buffer not supported in fetchAsBuffer', function(done) {
      try {
        oracledb.fetchAsBuffer = [ oracledb.BUFFER ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021');
      }
      done();
    }); // 81.12.6

    it('81.12.7 BLOB supported in fetchAsBuffer', function(done) {
      try {
        oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      } catch(err) {
        should.not.exist(err);
      }
      should.strictEqual(oracledb.fetchAsBuffer.length, 1);
      should.strictEqual(oracledb.fetchAsBuffer[0], oracledb.BLOB);
      done();
    }); // 81.12.7

  }); // 81.12

});
