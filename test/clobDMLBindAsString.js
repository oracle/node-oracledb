/* Copyright (c) 2017, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   81. clobDMLBindAsString.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String with DML.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var fs       = require('fs');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');

describe('81. clobDMLBindAsString.js', function() {

  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1

  var proc_clob_1 = "BEGIN \n" +
                    "    DECLARE \n" +
                    "        e_table_missing EXCEPTION; \n" +
                    "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                    "    BEGIN \n" +
                    "        EXECUTE IMMEDIATE('DROP TABLE nodb_dml_clob_1 PURGE'); \n" +
                    "    EXCEPTION \n" +
                    "        WHEN e_table_missing \n" +
                    "        THEN NULL; \n" +
                    "    END; \n" +
                    "    EXECUTE IMMEDIATE (' \n" +
                    "        CREATE TABLE nodb_dml_clob_1 ( \n" +
                    "            id      NUMBER, \n" +
                    "            clob    CLOB \n" +
                    "        ) \n" +
                    "    '); \n" +
                    "END; ";
  var sql2DropTable1 = "DROP TABLE nodb_dml_clob_1 PURGE";

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
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

  var insertIntoClobTable1 = function(id, content, callback) {
    if(content == "EMPTY_CLOB") {
      connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, EMPTY_CLOB())",
        [ id ],
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    } else {
      connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
        },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    }
  };

  var updateClobTable1 = function(id, content, callback) {
    if(content == "EMPTY_CLOB") {
      connection.execute(
        "UPDATE nodb_dml_clob_1 set clob = EMPTY_CLOB() where id = :ID",
        { ID: id },
        function(err, result){
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    } else {
      connection.execute(
        "UPDATE nodb_dml_clob_1 set clob = :C where id = :ID",
        { ID: id, C: content },
        function(err, result){
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    }
  };

  // compare the inserted clob with orginal content
  var verifyClobValueWithString = function(selectSql, originalString, specialStr, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        if(originalString == '' || originalString == undefined || originalString == null) {
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

          lob.on('end', function(err) {
            should.not.exist(err);
            if (originalString == "EMPTY_CLOB") {
              should.strictEqual(clobData, "");
            } else {
              var resultLength = clobData.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, originalString.length);
              should.strictEqual(clobData.substring(0, specStrLength), specialStr);
              should.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
            }
            return callback();
          });
        }
      }
    );
  };

  var checkInsertResult = function(id, content, specialStr, callback) {
    var sql = "select clob from nodb_dml_clob_1 where id = " + id;
    verifyClobValueWithString(sql, content, specialStr, callback);
  };

  describe('81.1 CLOB, INSERT', function() {
    before(function(done) {
      executeSQL(proc_clob_1, done);
    });  // before

    after(function(done) {
      executeSQL(sql2DropTable1, done);
    }); // after

    it('81.1.1 works with EMPTY_CLOB', function(done) {
      var id = insertID++;
      var content = "EMPTY_CLOB";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.1

    it('81.1.2 works with empty string', function(done) {
      var id = insertID++;
      var content = '';

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.2

    it('81.1.3 works with empty string and bind in maxSize set to 32767', function(done) {
      var id = insertID++;
      var content = "";

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 32767 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.3

    it('81.1.4 works with empty string and bind in maxSize set to 50000', function(done) {
      var id = insertID++;
      var content = "";

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 50000 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.4

    it('81.1.5 works with undefined', function(done) {
      var id = insertID++;
      var content = undefined;

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.5

    it('81.1.6 works with null', function(done) {
      var id = insertID++;
      var content = null;

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.6

    it('81.1.7 works with null and bind in maxSize set to 32767', function(done) {
      var id = insertID++;
      var content = null;

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 32767 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.7

    it('81.1.8 works with null and bind in maxSize set to 50000', function(done) {
      var id = insertID++;
      var content = null;

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 50000 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, null, cb);
        }
      ], done);
    }); // 81.1.8

    it('81.1.9 works with NaN', function(done) {
      var id = insertID++;
      var content = NaN;

      connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
        },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 81.1.9

    it('81.1.10 works with 0', function(done) {
      var id = insertID++;
      var content = 0;

      connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
        },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 81.1.10

    it('81.1.11 works with String length 32K', function(done) {
      var id = insertID++;
      var contentLength = 32768;
      var specialStr = "81.1.11";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, cb);
        }
      ], done);
    }); // 81.1.11

    it('81.1.12 works with String length (64K - 1)', function(done) {
      var id = insertID++;
      var contentLength = 65535;
      var specialStr = "81.1.12";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, cb);
        }
      ], done);
    }); // 81.1.12

    it('81.1.13 works with String length (64K + 1)', function(done) {
      var id = insertID++;
      var contentLength = 65537;
      var specialStr = "81.1.13";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, cb);
        }
      ], done);
    }); // 81.1.13

    it('81.1.14 works with String length (1MB + 1)', function(done) {
      var id = insertID++;
      var contentLength = 1048577; // 1 * 1024 * 1024 + 1;
      var specialStr = "81.1.14";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, cb);
        }
      ], done);
    }); // 81.1.14

    it('81.1.15 bind value and type mismatch', function(done) {
      var id = insertID++;
      var content = 100;

      connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
        },
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 81.1.15

    it('81.1.16 mixing named with positional binding', function(done) {
      var id = insertID++;
      var contentLength = 40000;
      var specialStr = "81.1.16";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:1, :2)",
            [
              id, { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
            ],
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, cb);
        }
      ], done);
    }); // 81.1.16

    it('81.1.17 bind with invalid CLOB', function(done) {
      var id = insertID++;

      connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:1, :2)",
        [
          id, { val : {}, dir : oracledb.BIND_IN, type : oracledb.STRING }
        ],
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 81.1.17

    it('81.1.18 RETURNING INTO with bind type STRING', function(done) {
      var id = insertID++;
      var contentLength = 400;
      var specialStr = "81.1.18";
      var content = random.getRandomString(contentLength, specialStr);
      var sql = "INSERT INTO nodb_dml_clob_1 (id, clob) VALUES (:i, :c) RETURNING clob INTO :lobbv";

      async.series([
        function(cb) {
          connection.execute(
            sql,
            {
              i: id,
              c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
              lobbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: contentLength }
            },
            { autoCommit: false },
            function(err, result) {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
              (result.outBinds.lobbv.length).should.be.exactly(1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, cb);
        }
      ], done);
    }); // 81.1.18

    it('81.1.19 Negative: RETURNING INTO with autocommit on', function(done) {
      var id = insertID++;
      var sql = "INSERT INTO nodb_dml_clob_1 (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      var inFileName = './test/clobexample.txt';

      connection.execute(
        sql,
        {
          i: id,
          lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          var inStream = fs.createReadStream(inFileName);
          var lob = result.outBinds.lobbv[0];

          lob.on('error', function(err) {
            should.exist(err);
            // ORA-22990: LOB locators cannot span transactions
            // ORA-22920: row containing the LOB value is not locked
            var isExpectedError;
            if ( (err.message).startsWith('ORA-22990') || (err.message).startsWith('ORA-22920') ) {
              isExpectedError = true;
            } else {
              isExpectedError = false;
            }
            isExpectedError.should.be.true();
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
    }); // 81.1.19

    it('81.1.20 works with bind in maxSize smaller than string length', function(done) {
      var id = insertID++;
      var contentLength = 32768;
      var specialStr = "81.1.20";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          connection.execute(
            "INSERT INTO nodb_dml_clob_1 VALUES (:ID, :C)",
            {
              ID : { val : id },
              C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 1 }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, cb);
        }
      ], done);
    }); // 81.1.20

  }); // 81.1

  describe('81.2 CLOB, UPDATE', function() {
    insertID = 0;

    before(function(done) {
      executeSQL(proc_clob_1, done);
    });  // before

    after(function(done) {
      executeSQL(sql2DropTable1, done);
    }); // after

    it('81.2.1 update EMPTY_CLOB column', function(done) {
      var id = insertID++;
      var content_1 = "EMPTY_CLOB";
      var contentLength_2 = 32768;
      var specialStr_2 = "81.2.1";
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, cb);
        }
      ], done);
    }); // 81.2.1

    it('81.2.2 update a cloumn with EMPTY_CLOB', function(done) {
      var id = insertID++;
      var contentLength_1 = 50000;
      var specialStr_1 = "81.2.2";
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_2 = "EMPTY_CLOB";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, cb);
        }
      ], done);
    }); // 81.2.2

    it('81.2.3 update EMPTY_CLOB column with empty string', function(done) {
      var id = insertID++;
      var content_1 = "EMPTY_CLOB";
      var content_2 = "";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, cb);
        }
      ], done);
    }); // 81.2.3

    it('81.2.4 update empty string column', function(done) {
      var id = insertID++;
      var content_1 = "";
      var contentLength_2 = 54321;
      var specialStr_2 = "81.2.4";
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, cb);
        }
      ], done);
    }); // 81.2.4

    it('81.2.5 update a column with empty string', function(done) {
      var id = insertID++;
      var contentLength_1 = 50000;
      var specialStr_1 = "81.2.2";
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_2 = "";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, cb);
        }
      ], done);
    }); // 81.2.5

  }); // 81.2
});
