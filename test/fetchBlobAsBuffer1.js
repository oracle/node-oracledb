/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   87. fetchBlobAsBuffer1.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    To fetch BLOB columns as buffer by setting oracledb.fetchAsBuffer.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async    = require('async');
var should   = require('should');
var file     = require('./file.js');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('87. fetchBlobAsBuffer1.js', function() {

  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1
  var inFileName = './test/blobTmpFile.txt';
  var defaultStmtCache = oracledb.stmtCacheSize;

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
        oracledb.stmtCacheSize = defaultStmtCache;
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
  var insertIntoBlobTable1 = function(id, content, callback) {
    if (content == "EMPTY_BLOB") {
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
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    }
  };

  var updateBlobTable1 = function(id, content, callback) {
    connection.execute(
      "UPDATE nodb_blob1 set B = :B where ID = :ID",
      { ID: id, B: content },
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

  // compare fetch result
  var compareClientFetchResult = function(err, resultVal, specialStr, content, contentLength) {
    should.not.exist(err);
    compareBuffers(resultVal, specialStr, content, contentLength);
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

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              var resultVal = result.rows[0][1];
              if (specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength);
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

      insertAndFetch(id, null, content, null, done);
    }); // 87.1.1

    it('87.1.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = Buffer.from("", "utf-8");

      insertAndFetch(id, null, content, null, done);
    }); // 87.1.2

    it('87.1.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.1.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.1.3

    it('87.1.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.1.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.1.4

    it('87.1.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.1.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.1.5

    it('87.1.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.1.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.1.6

    it('87.1.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.1.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) from nodb_blob1 WHERE ID = :id",
            { id : id },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][0];
              var buffer2Compare = Buffer.from(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.7

    it('87.1.8 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, done);
    }); // 87.1.8

    it('87.1.9 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.9_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.9_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.9

    it('87.1.10 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.1.10';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
              resultVal = result.rows[0][2];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.10

    it('87.1.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.1.11_1';
      var contentLength_1 = 208;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var specialStr_2 = '87.1.11_2';
      var contentLength_2 = 200;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, cb);
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
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.11

    it('87.1.12 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.1.12';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
            function(err) {
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
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
                result.outBinds.b.close(cb);
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.12

    it('87.1.13 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.1.13';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.1.13

    it('87.1.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(1);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.14

    it('87.1.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.1.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.1.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(2);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.1.15

    it('87.1.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.1.16';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.1.16

    it('87.1.17 works with connection.queryStream()', function(done) {
      let id = insertID++;
      const specialStr = '87.1.17';
      const contentLength = 200;
      const strBuf = random.getRandomString(contentLength, specialStr);
      const content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id;
          const stream = connection.queryStream(sql);
          stream.on('error', function(error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          let counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            let result = data[1];
            compareBuffers(result, specialStr, content, contentLength);
            counter++;
          });

          stream.on('end', function() {
            should.equal(counter, 1);
            stream.destroy();
          });

          stream.on('close', function() {
            cb();
          });
        }
      ], done);
    }); // 87.1.17

    it('87.1.18 works with connection.queryStream() and oracledb.maxRows > actual number of rows in the table', function(done) {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.18_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.18_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
          const stream = connection.queryStream(sql);
          stream.on('error', function(error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          let counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            const result = data[1];
            counter++;
            if (counter == 1) {
              compareBuffers(result, specialStr_1, content_1, contentLength_1);
            } else {
              compareBuffers(result, specialStr_2, content_2, contentLength_2);
            }
          });

          stream.on('end', function() {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            stream.destroy();
          });

          stream.on('close', function() {
            cb();
          });
        }
      ], done);
    }); // 87.1.18

    it('87.1.19 works with connection.queryStream() and oracledb.maxRows = actual number of rows in the table', function(done) {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.19_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.19_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 2;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
          const stream = connection.queryStream(sql);
          stream.on('error', function(error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          let counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            const result = data[1];
            counter++;
            if (counter == 1) {
              compareBuffers(result, specialStr_1, content_1, contentLength_1);
            } else {
              compareBuffers(result, specialStr_2, content_2, contentLength_2);
            }
          });

          stream.on('end', function() {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            stream.destroy();
          });

          stream.on('close', function() {
            cb();
          });
        }
      ], done);
    }); // 87.1.19

    it('87.1.20 works with connection.queryStream() and oracledb.maxRows < actual number of rows in the table', function(done) {
      const id_1 = insertID++;
      const specialStr_1 = '87.1.20_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const id_2 = insertID++;
      const specialStr_2 = '87.1.19_2';
      const contentLength_2 = 30;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");
      const maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          const sql = "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2;
          const stream = connection.queryStream(sql);
          stream.on('error', function(error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          let counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            const result = data[1];
            counter++;
            if (counter == 1) {
              compareBuffers(result, specialStr_1, content_1, contentLength_1);
            } else {
              compareBuffers(result, specialStr_2, content_2, contentLength_2);
            }
          });

          stream.on('end', function() {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            stream.destroy();
          });

          stream.on('close', function() {
            cb();
          });
        }
      ], done);
    }); // 87.1.20

  }); // 87.1

  describe('87.2 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.OUT_FORMAT_OBJECT', function() {

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

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              var resultVal = result.rows[0].B;
              if (specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength);
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

      insertAndFetch(id, null, content, null, done);
    }); // 87.2.1

    it('87.2.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = Buffer.from("", "utf-8");

      insertAndFetch(id, null, content, null, done);
    }); // 87.2.2

    it('87.2.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.2.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.2.3

    it('87.2.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.2.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.2.4

    it('87.2.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.2.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.2.5

    it('87.2.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.2.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.2.6

    it('87.2.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.2.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B1;
              var buffer2Compare = Buffer.from(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.7

    it('87.2.8 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, done);
    }); // 87.2.8

    it('87.2.9 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.2.9_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.2.9_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              resultVal = result.rows[1].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.9

    it('87.2.10 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.2.10';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B1;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
              resultVal = result.rows[0].B2;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.10

    it('87.2.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.2.11_1';
      var contentLength_1 = 201;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var specialStr_2 = '87.2.11_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.11

    it('87.2.12 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.2.12';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
            function(err) {
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
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
                result.outBinds.b.close(cb);
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.12

    it('87.2.13 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.2.13';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.2.13

    it('87.2.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.2.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.2.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(1);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.14

    it('87.2.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.2.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.2.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.OUT_FORMAT_OBJECT },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(2);
              var resultVal = result.rows[0].B;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              resultVal = result.rows[1].B;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.2.15

    it('87.2.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.2.16';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.2.16

  }); // 87.2

  describe('87.3 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.OUT_FORMAT_OBJECT and resultSet = true', function() {

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

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OUT_FORMAT_OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal;
                  resultVal = row.B;
                  if (specialStr === null) {
                    should.equal(resultVal, null);
                  } else {
                    compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength);
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

      insertAndFetch(id, null, content, null, done);
    }); // 87.3.1

    it('87.3.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = Buffer.from("", "utf-8");

      insertAndFetch(id, null, content, null, done);
    }); // 87.3.2

    it('87.3.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.3.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.3.3

    it('87.3.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.3.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.3.4

    it('87.3.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.3.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.3.5

    it('87.3.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.3.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.3.6

    it('87.3.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.3.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OUT_FORMAT_OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B1;
                  var buffer2Compare = Buffer.from(specialStr, "utf-8");
                  compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength);
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
    }); // 87.3.7

    it('87.3.8 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, done);
    }); // 87.3.8

    it('87.3.9 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.3.9_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.3.9_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[0].B;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
                  resultVal = row[1].B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
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

    it('87.3.10 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.3.10';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B1;
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
                  resultVal = row.B2;
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 87.3.10

    it('87.3.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.3.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var specialStr_2 = '87.3.11_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_OBJECT,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
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

    it('87.3.12 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.3.12';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
            function(err) {
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
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
                result.outBinds.b.close(cb);
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.3.12

    it('87.3.13 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.3.13';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.3.13

    it('87.3.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.3.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.3.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_OBJECT,
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
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
                  resultVal = row[1].B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
                  oracledb.maxRows = maxRowsBak;
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
    }); // 87.3.14

    it('87.3.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.3.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.3.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_OBJECT,
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
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
                  resultVal = row[1].B;
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
                  oracledb.maxRows = maxRowsBak;
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
    }); // 87.3.15

    it('87.3.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.3.16';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.3.16

  }); // 87.3

  describe('87.4 fetch BLOB columns by setting oracledb.fetchAsBuffer and outFormat = oracledb.OUT_FORMAT_ARRAY', function() {

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

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OUT_FORMAT_ARRAY },
            function(err, result) {
              var resultVal = result.rows[0][1];
              if (specialStr === null) {
                should.not.exist(err);
                should.equal(resultVal, null);
              } else {
                compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength);
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

      insertAndFetch(id, null, content, null, done);
    }); // 87.4.1

    it('87.4.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = Buffer.from("", "utf-8");

      insertAndFetch(id, null, content, null, done);
    }); // 87.4.2

    it('87.4.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.4.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.4.3

    it('87.4.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.4.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.4.4

    it('87.4.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.4.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.4.5

    it('87.4.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.4.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.4.6

    it('87.4.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.4.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) from nodb_blob1 WHERE ID = :id",
            { id : id },
            { outFormat : oracledb.OUT_FORMAT_ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][0];
              var buffer2Compare = Buffer.from(specialStr, "utf-8");
              compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.7

    it('87.4.8 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, done);
    }); // 87.4.8

    it('87.4.9 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.4.9_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.4.9_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.OUT_FORMAT_ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.9

    it('87.4.10 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.4.10';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.OUT_FORMAT_ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
              resultVal = result.rows[0][2];
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.10

    it('87.4.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.4.11_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var specialStr_2 = '87.4.11_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            { outFormat : oracledb.OUT_FORMAT_ARRAY },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.11

    it('87.4.12 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.4.12';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
            function(err) {
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
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
                result.outBinds.b.close(cb);
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.12

    it('87.4.13 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.4.13';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.4.13

    it('87.4.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.4.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.4.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.OUT_FORMAT_ARRAY },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(1);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.14

    it('87.4.15 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.4.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.4.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            { outFormat : oracledb.OUT_FORMAT_ARRAY },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(2);
              var resultVal = result.rows[0][1];
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              resultVal = result.rows[1][1];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 87.4.15

    it('87.4.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.4.16';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.4.16

  }); // 87.4

  describe('87.5 fetch BLOB columns by setting oracledb.fetchAsBuffer, outFormat = oracledb.OUT_FORMAT_ARRAY and resultSet = true', function() {

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

    var insertAndFetch = function(id, specialStr, insertContent, insertContentLength, callback) {
      async.series([
        function(cb) {
          insertIntoBlobTable1(id, insertContent, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OUT_FORMAT_ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal;
                  resultVal = row[1];
                  if (specialStr === null) {
                    should.not.exist(err);
                    should.equal(resultVal, null);
                  } else {
                    compareClientFetchResult(err, resultVal, specialStr, insertContent, insertContentLength);
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

      insertAndFetch(id, null, content, null, done);
    }); // 87.5.1

    it('87.5.2 works with empty Buffer', function(done) {
      var id = insertID++;
      var content = Buffer.from("", "utf-8");

      insertAndFetch(id, null, content, null, done);
    }); // 87.5.2

    it('87.5.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '87.5.3';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.5.3

    it('87.5.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.5.4';
      var contentLength = 65535;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.5.4

    it('87.5.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '87.5.5';
      var contentLength = 65537;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.5.5

    it('87.5.6 works with (1MB + 1) data', function(done) {
      var id = insertID++;
      var specialStr = '87.5.6';
      var contentLength = 1048577; // 1MB + 1
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      insertAndFetch(id, specialStr, content, contentLength, done);
    }); // 87.5.6

    it('87.5.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '87.5.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(B, " + specialStrLength + ", 1) AS B1 from nodb_blob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OUT_FORMAT_ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  // console.log(row[0]);
                  should.not.exist(err);
                  var resultVal = row[0];
                  var buffer2Compare = Buffer.from(specialStr, "utf-8");
                  compareClientFetchResult(err, resultVal, specialStr, buffer2Compare, specialStrLength);
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
    }); // 87.5.7

    it('87.5.8 works with EMPTY_BLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_BLOB";

      insertAndFetch(id, null, content, null, done);
    }); // 87.5.8

    it('87.5.9 fetch multiple BLOB rows as Buffer', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.5.9_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.5.9_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[0][1];
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
                  resultVal = row[1][1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
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

    it('87.5.10 fetch the same BLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '87.5.10';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B AS B1, B AS B2 from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
                  resultVal = row[2];
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
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
    }); // 87.5.10

    it('87.5.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '87.5.11_1';
      var contentLength_1 = 208;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var specialStr_2 = '87.5.11_2';
      var contentLength_2 = 208;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, cb);
        },
        function(cb) {
          updateBlobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_ARRAY,
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
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

    it('87.5.12 works with REF CURSOR', function(done) {
      var id = insertID++;
      var specialStr = '87.5.12';
      var contentLength = 100;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
            function(err) {
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
                compareClientFetchResult(err, resultVal, specialStr, content, contentLength);
                result.outBinds.b.close(cb);
              });
            }
          );
        },
        function(cb) {
          var ref_proc_drop = "DROP PROCEDURE nodb_ref";
          connection.execute(
            ref_proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 87.5.12

    it('87.5.13 fetch BLOB with stream', function(done) {
      var id = insertID++;
      var specialStr = '87.5.13';
      var contentLength = 200;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
        },
        function(cb) {
          oracledb.fetchAsBuffer = [];
          connection.execute(
            "SELECT B from nodb_blob1 WHERE ID = " + id,
            function(err, result) {
              should.not.exist(err);
              var lob = result.rows[0][0];
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.5.13

    it('87.5.14 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.5.14_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.5.14_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_ARRAY,
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
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
                  resultVal = row[1][1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
                  oracledb.maxRows = maxRowsBak;
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
    }); // 87.5.14

    it('87.5.15 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '87.5.15_1';
      var contentLength_1 = 200;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = Buffer.from(strBuf_1, "utf-8");
      var id_2 = insertID++;
      var specialStr_2 = '87.5.15_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      var content_2 = Buffer.from(strBuf_2, "utf-8");
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoBlobTable1(id_1, content_1, cb);
        },
        function(cb) {
          insertIntoBlobTable1(id_2, content_2, cb);
        },
        function(cb) {
          var rowNumFetched = 2;
          connection.execute(
            "SELECT ID, B from nodb_blob1 WHERE id = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OUT_FORMAT_ARRAY,
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
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
                  resultVal = row[1][1];
                  compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
                  oracledb.maxRows = maxRowsBak;
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
    }); // 87.5.15

    it('87.5.16 override oracledb.fetchAsBuffer with fetchInfo set to oracledb.DEFAULT', function(done) {
      var id = insertID++;
      var specialStr = '87.5.16';
      var contentLength = 20;
      var strBuf = random.getRandomString(contentLength, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          insertIntoBlobTable1(id, content, cb);
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
                compareClientFetchResult(err, blobData, specialStr, content, contentLength);
                lob.destroy();
              });

              lob.on('close', function() {
                cb();
              });
            }
          );
        }
      ], done);
    }); // 87.5.16

  }); // 87.5

});
