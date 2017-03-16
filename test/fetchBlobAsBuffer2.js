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
 *   88. fetchBlobAsBuffer2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    To fetch BLOB columns as buffer by setting fetchInfo option.
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

describe('88. fetchBlobAsBuffer2.js', function() {
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

  describe('88.1 fetch BLOB columns by setting fetchInfo option', function() {

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
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              var resultVal = result.rows[0][1];
              if(specialStr === null) {
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

    it('88.1.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.1.1

    it('88.1.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.1.2

    it('88.1.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '88.1.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.1.3

    it('88.1.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.1.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.1.4

    it('88.1.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.1.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.1.5

    it('88.1.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.1.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.1.6

    it('88.1.7 works with (5MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.1.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.1.7

    it('88.1.8 works with (10MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.1.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.1.8

    it('88.1.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '88.1.9';
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
    }); // 88.1.9

    it('88.1.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.1.10

    it('88.1.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.1.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.1.11_2';
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
    }); // 88.1.11

    it('88.1.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '88.1.12';
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
    }); // 88.1.12

    it('88.1.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '88.1.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '88.1.13_2';
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
    }); // 88.1.8

    it('88.1.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.1.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.1.14_2';
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
    }); // 88.1.14

    it('88.1.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.1.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.1.15_2';
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
    }); // 88.1.15

    it('88.1.16 works with connection.queryStream()', function(done) {
      var id = insertID++;
      var specialStr = '88.1.16';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id;
          var stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });
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
    }); // 88.1.16

    it('88.1.17 works with connection.queryStream() and oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.1.17_1';
      var contentLength_1 = 26;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.1.17_2';
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
          var stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });
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
    }); // 88.1.17

    it('88.1.18 works with connection.queryStream() and oracledb.maxRows = actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.1.18_1';
      var contentLength_1 = 26;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.1.18_2';
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
          var stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });
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
    }); // 88.1.18

    it('88.1.19 works with connection.queryStream() and oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.1.19_1';
      var contentLength_1 = 26;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.1.19_2';
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
          var stream = connection.queryStream(sql, {}, { fetchInfo : { B : { type : oracledb.BUFFER } } });
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
    }); // 88.1.19

  }); // 88.1

  describe('88.2 fetch BLOB columns by setting fetchInfo option and outFormat = oracledb.OBJECT', function() {

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
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              var resultVal = result.rows[0].B;
              if(specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                should.not.exist(err);
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, case64KPlus);
              }
              cb();
            }
          );
        }
      ], callback);
    };

    it('88.2.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.2.1

    it('88.2.2 works with empty buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.2.2

    it('88.2.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '88.2.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.2.3

    it('88.2.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.2.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.2.4

    it('88.2.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.2.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.2.5

    it('88.2.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.2.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.2.6

    it('88.2.7 works with (5MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.2.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.2.7

    it('88.2.8 works with (10MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.2.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.2.8

    it('88.2.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '88.2.9';
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
    }); // 88.2.9

    it('88.2.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.2.10

    it('88.2.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.2.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.2.11_2';
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
    }); // 88.2.11

    it('88.2.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '88.2.12';
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
    }); // 88.2.12

    it('88.2.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '88.2.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '88.2.13_2';
      var contentLength_2 = 202;
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
    }); // 88.2.13

    it('88.2.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.2.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.2.14_2';
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
    }); // 88.2.14

    it('88.2.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.2.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.2.15_2';
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
    }); // 88.2.15

  }); // 88.2

  describe('88.3 fetch BLOB columns by setting fetchInfo option, outFormat = oracledb.OBJECT and resultSet = true', function() {

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
              fetchInfo : { B : { type : oracledb.BUFFER } },
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

    it('88.3.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.3.1

    it('88.3.2 works with empty buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.3.2

    it('88.3.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '88.3.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.3.3

    it('88.3.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.3.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.3.4

    it('88.3.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.3.4';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.3.5

    it('88.3.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.3.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.3.6

    it('88.3.7 works with (5MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.3.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.3.7

    it('88.3.8 works with (10MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.3.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.3.8

    it('88.3.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '88.3.9';
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
    }); // 88.3.9

    it('88.3.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.3.10

    it('88.3.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.3.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.3.11_2';
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
    }); // 88.3.11

    it('88.3.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '88.3.12';
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
    }); // 88.3.12

    it('88.3.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '88.3.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '88.3.13_2';
      var contentLength_2 = 202;
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
    }); // 88.3.13

    it('88.3.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.3.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.3.14_2';
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
    }); // 88.3.14

    it('88.3.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.3.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.3.15_2';
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
    }); // 88.3.15

  }); // 88.3

  describe('88.4 fetch BLOB columns by setting fetchInfo option and outFormat = oracledb.ARRAY', function() {

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
              fetchInfo : { B : { type : oracledb.BUFFER } }
            },
            function(err, result) {
              var resultVal = result.rows[0][1];
              if(specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                should.not.exist(err);
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, case64KPlus);
              }
              cb();
            }
          );
        }
      ], callback);
    };

    it('88.4.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.4.1

    it('88.4.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.4.2

    it('88.4.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '88.4.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.4.3

    it('88.4.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.4.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.4.4

    it('88.4.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.4.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.4.5

    it('88.4.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.4.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.4.6

    it('88.4.7 works with (5MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.4.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.4.7

    it('88.4.8 works with (10MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.4.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.4.8

    it('88.4.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '88.4.9';
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
    }); // 88.4.9

    it('88.4.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.4.10

    it('88.4.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.4.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.4.11_2';
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
    }); // 88.4.11

    it('88.4.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '88.4.12';
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
    }); // 88.4.12

    it('88.4.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '88.4.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '88.4.13_2';
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
    }); // 88.4.8

    it('88.4.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.4.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.4.14_2';
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
    }); // 88.4.14

    it('88.4.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.4.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.4.15_2';
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
    }); // 88.4.15

  }); // 88.4

  describe('88.5 fetch BLOB columns by setting fetchInfo option, outFormat = oracledb.ARRAY and resultSet = true', function() {

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
              fetchInfo : { B : { type : oracledb.BUFFER } },
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
                      compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength, callback);
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

    it('88.5.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.5.1

    it('88.5.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = node6plus ? Buffer.from("", "utf-8") : new Buffer("", "utf-8");

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.5.2

    it('88.5.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '88.5.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.5.3

    it('88.5.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.5.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 88.5.4

    it('88.5.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.5.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.5.5

    it('88.5.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.5.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.5.6

    it('88.5.7 works with (5MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.5.7';
      var contentLength = 5242881; // 5MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.5.7

    it('88.5.8 works with (10MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '88.5.8';
      var contentLength = 10485761; // 10MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 88.5.8

    it('88.5.9 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '88.5.9';
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
    }); // 88.5.9

    it('88.5.10 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 88.5.10

    it('88.5.11 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.5.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.5.11_2';
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
    }); // 88.5.11

    it('88.5.12 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '88.5.12';
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
    }); // 88.5.12

    it('88.5.13 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '88.5.13_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '88.5.13_2';
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
    }); // 88.5.13

    it('88.5.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.5.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.5.14_2';
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
    }); // 88.5.14

    it('88.5.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '88.5.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '88.5.15_2';
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
    }); // 88.5.15

  }); // 88.5

});
