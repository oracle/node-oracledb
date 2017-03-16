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
 *   77. clobDMLBindAsString.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String with DML.
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
var fs = require('fs');

describe('77.clobDMLBindAsString.js', function() {
  this.timeout(100000);

  var connection = null;
  var client11gPlus = true; // assume instant client runtime version is greater than 11.2.0.4.0
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
      // Check whether instant client runtime version is smaller than 12.1.0.2
      if(oracledb.oracleClientVersion < 1201000200)
        client11gPlus = false;

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

  var insertIntoClobTable1 = function(id, content, callback, case64KPlus) {
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

  var updateClobTable1 = function(id, content, case64KPlus, callback) {
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

  var checkInsertResult = function(id, content, specialStr, case64KPlus, callback) {
    if(case64KPlus === true  && client11gPlus === false) {
      callback();
    } else {
      var sql = "select clob from nodb_dml_clob_1 where id = " + id;
      verifyClobValueWithString(sql, content, specialStr, callback);
    }
  };

  // Generate id for insert clob into db
  var insertID = 0;
  var getID = function() {
    insertID = insertID + 1;
    return insertID;
  };

  describe('77.1 CLOB, INSERT', function() {
    before(function(done) {
      executeSQL(proc_clob_1, done);
    });  // before

    after(function(done) {
      executeSQL(sql2DropTable1, done);
    }); // after

    it('77.1.1 works with EMPTY_CLOB', function(done) {
      var id = getID();
      var content = "EMPTY_CLOB";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.1

    it('77.1.2 works with empty string', function(done) {
      var id = getID();
      var content = '';

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.2

    it('77.1.3 works with empty string and bind in maxSize set to 32767', function(done) {
      var id = getID();
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
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.3

    it('77.1.4 works with empty string and bind in maxSize set to 50000', function(done) {
      var id = getID();
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
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.4

    it('77.1.5 works with undefined', function(done) {
      var id = getID();
      var content = undefined;

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.5

    it('77.1.6 works with null', function(done) {
      var id = getID();
      var content = null;

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.6

    it('77.1.7 works with null and bind in maxSize set to 32767', function(done) {
      var id = getID();
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
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.7

    it('77.1.8 works with null and bind in maxSize set to 50000', function(done) {
      var id = getID();
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
          checkInsertResult(id, content, null, false, cb);
        }
      ], done);
    }); // 77.1.8

    it('77.1.9 works with NaN', function(done) {
      var id = getID();
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
    }); // 77.1.9

    it('77.1.10 works with 0', function(done) {
      var id = getID();
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
    }); // 77.1.10

    it('77.1.11 works with String length 32K', function(done) {
      var id = getID();
      var contentLength = 32768;
      var specialStr = "77.1.11";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, false, cb);
        }
      ], done);
    }); // 77.1.11

    it('77.1.12 works with String length (64K - 1)', function(done) {
      var id = getID();
      var contentLength = 65535;
      var specialStr = "77.1.12";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, false, cb);
        }
      ], done);
    }); // 77.1.12

    it('77.1.13 works with String length (64K + 1)', function(done) {
      var id = getID();
      var contentLength = 65537;
      var specialStr = "77.1.13";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 77.1.13

    it('77.1.14 works with String length (1MB + 1)', function(done) {
      var id = getID();
      var contentLength = 1048577; // 1 * 1024 * 1024 + 1;
      var specialStr = "77.1.14";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 77.1.14

    it('77.1.15 works with String length (5MB + 1)', function(done) {
      var id = getID();
      var contentLength = 5242881; // 5 * 1024 * 1024 + 1;
      var specialStr = "77.1.15";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 77.1.15

    it('77.1.16 works with String length (10MB + 1)', function(done) {
      var id = getID();
      var contentLength = 10485761; // 10 * 1024 * 1024 + 1;
      var specialStr = "77.1.16";
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, true);
        },
        function(cb) {
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 77.1.16

    it('77.1.17 bind value and type mismatch', function(done) {
      var id = getID();
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
    }); // 77.1.17

    it('77.1.18 mixing named with positional binding', function(done) {
      var id = getID();
      var contentLength = 40000;
      var specialStr = "77.1.18";
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
          checkInsertResult(id, content, specialStr, true, cb);
        }
      ], done);
    }); // 77.1.18

    it('77.1.19 bind with invalid CLOB', function(done) {
      var id = getID();

      connection.execute(
        "INSERT INTO nodb_dml_clob_1 VALUES (:1, :2)",
        [
          id, { val : {}, dir : oracledb.BIND_IN, type : oracledb.STRING }
        ],
        function(err) {
          should.exist(err);
          // NJS-012: encountered invalid bind datatype in parameter 2
          (err.message).should.startWith('NJS-012:');
          done();
        }
      );
    }); // 77.1.19

    it('77.1.20 RETURNING INTO with bind type STRING', function(done) {
      var id = getID();
      var contentLength = 400;
      var specialStr = "77.1.20";
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
          checkInsertResult(id, content, specialStr, false, cb);
        }
      ], done);
    }); // 77.1.20

    it('77.1.21 Negative: RETURNING INTO with autocommit on', function(done) {
      var id = getID();
      var sql = "INSERT INTO nodb_dml_clob_1 (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      var inFileName = './test/clobexample.txt';

      async.series([
        function(cb) {
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
                (err.message).should.startWith('ORA-22990:');
              });

              inStream.on('error', function(err) {
                should.not.exist(err, "inStream.on 'error' event");
              });

              lob.on('close', function(err) {
                should.not.exist(err);
                connection.commit( function(err) {
                  should.not.exist(err);
                  return cb();
                });
              });

              inStream.pipe(lob); // copies the text to the CLOB
            }
          );
        }
      ], done);
    }); // 77.1.21

    it('77.1.22 works with bind in maxSize smaller than string length', function(done) {
      var id = getID();
      var contentLength = 32768;
      var specialStr = "77.1.22";
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
          checkInsertResult(id, content, specialStr, false, cb);
        }
      ], done);
    }); // 77.1.22

  }); // 77.1

  describe('77.2 CLOB, UPDATE', function() {
    insertID = 0;

    before(function(done) {
      executeSQL(proc_clob_1, done);
    });  // before

    after(function(done) {
      executeSQL(sql2DropTable1, done);
    }); // after

    it('77.2.1 update EMPTY_CLOB column', function(done) {
      var id = getID();
      var content_1 = "EMPTY_CLOB";
      var contentLength_2 = 32768;
      var specialStr_2 = "77.2.1";
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, false, cb);
        }
      ], done);
    }); // 77.2.1

    it('77.2.2 update a cloumn with EMPTY_CLOB', function(done) {
      var id = getID();
      var contentLength_1 = 50000;
      var specialStr_1 = "77.2.2";
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_2 = "EMPTY_CLOB";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, false, cb);
        }
      ], done);
    }); // 77.2.2

    it('77.2.3 update EMPTY_CLOB column with empty string', function(done) {
      var id = getID();
      var content_1 = "EMPTY_CLOB";
      var content_2 = "";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, false, cb);
        }
      ], done);
    }); // 77.2.3

    it('77.2.4 update empty string column', function(done) {
      var id = getID();
      var content_1 = "";
      var contentLength_2 = 54321;
      var specialStr_2 = "77.2.4";
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, null, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, false, cb);
        }
      ], done);
    }); // 77.2.4

    it('77.2.5 update a column with empty string', function(done) {
      var id = getID();
      var contentLength_1 = 50000;
      var specialStr_1 = "77.2.2";
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_2 = "";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, false, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, null, false, cb);
        }
      ], done);
    }); // 77.2.5

    it('77.2.6 update a column with (10MB + 1) string', function(done) {
      var id = getID();
      var contentLength_1 = 50000;
      var specialStr_1 = "77.2.6_1";
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var contentLength_2 = 10485761; // 10 * 1024 * 1024 + 1;
      var specialStr_2 = "77.2.6_2";
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content_1, cb, false);
        },
        function(cb) {
          checkInsertResult(id, content_1, specialStr_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, true, cb);
        },
        function(cb) {
          checkInsertResult(id, content_2, specialStr_2, true, cb);
        }
      ], done);
    }); // 77.2.6

  }); // 77.2
});
