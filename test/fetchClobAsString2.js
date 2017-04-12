/* Copyright (c) 2016, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   85. fetchClobAsString2.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB.
 *    To fetch CLOB columns as strings by setting fetchInfo option
 *    This could be very useful for smaller CLOB size as it can be fetched as string and processed in memory itself.
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

describe('85. fetchClobAsString2.js', function() {
  this.timeout(100000);
  var connection = null;
  var client11gPlus = true; // assume instant client runtime version is greater than 11.2.0.4.0
  var insertID = 1; // assume id for insert into db starts from 1
  var inFileName = './test/clobTmpFile.txt';
  var proc_create_table1 = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE('DROP TABLE nodb_clob1 PURGE'); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE (' \n" +
                          "        CREATE TABLE nodb_clob1 ( \n" +
                          "            ID   NUMBER, \n" +
                          "            C    CLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END; ";
  var drop_table1 = "DROP TABLE nodb_clob1 PURGE";

  before('get one connection', function(done) {
    async.series([
      function(cb) {
        oracledb.stmtCacheSize = 0;
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
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

  var insertIntoClobTable1 = function(id, content, callback, case64KPlus) {
    if(content == "EMPTY_CLOB") {
      connection.execute(
        "INSERT INTO nodb_clob1 VALUES (:ID, EMPTY_CLOB())",
        [ id ],
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    } else {
      connection.execute(
        "INSERT INTO nodb_clob1 VALUES (:ID, :C)",
        {
          ID : { val : id },
          C : { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
        },
        function(err, result) {
          if(case64KPlus === true  && client11gPlus === false) {
            should.exist(err);
            // NJS-050: data must be shorter than 65535
            (err.message).should.startWith('NJS-050:');
            streamedIntoClobTable1(id, content, callback);
          } else {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, 1);
            callback();
          }
        }
      );
    }
  };

  // Generate a file and streamed into clob column
  var streamedIntoClobTable1 = function(id, content, callback) {
    file.write(inFileName, content);
    setTimeout(function(){
      var sql = "INSERT INTO nodb_clob1 (ID, C) VALUES (:i, EMPTY_CLOB()) RETURNING C INTO :lobbv";
      var bindVar = { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };
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

          inStream.pipe(lob); // copies the text to the CLOB
        }
      );
    }, 3000);
  };

  var updateClobTable1 = function(id, content, callback) {
    connection.execute(
      "UPDATE nodb_clob1 set C = :C where ID = :ID",
      { ID: id, C: content },
      function(err, result){
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

  // compare fetch result
  var compareClientFetchResult = function(err, resultVal, specialStr, content, contentLength, case64KPlus) {
    // if test string length greater than 64K
    if(case64KPlus === true) {
      // if client version 12.1.0.2
      if(client11gPlus === true) {
        should.not.exist(err);
        compareStrings(resultVal, specialStr, content, contentLength, case64KPlus);
      } else {
        // if client version 11.2.0.4
        should.not.exist(err);
        compareStrings(resultVal, specialStr, content, 65535, case64KPlus);
      }
    } else {
      // if test string length smaller than 64K
      should.not.exist(err);
      compareStrings(resultVal, specialStr, content, contentLength, case64KPlus);
    }
  };

  var compare64KPlusResultSetResult = function(err, resultVal, specialStr, content, contentLength) {
    if(client11gPlus === true) {
      // if client version 12.1.0.2
      should.not.exist(err);
      compareStrings(resultVal, specialStr, content, contentLength, true);
    } else {
        // if client version 11.2.0.4
      should.exist(err);
        // ORA-01406: fetched column value was truncated
      (err.message).should.startWith('ORA-01406:');
    }
  };

  // compare two string
  var compareStrings = function(resultVal, specialStr, content, contentLength, case64KPlus) {
    var specialStrLen = specialStr.length;
    var resultLen = resultVal.length;
    should.equal(resultLen, contentLength);
    should.strictEqual(resultVal.substring(0, specialStrLen), specialStr);
    var tailCompare = !(case64KPlus && !client11gPlus); // cases greater than 64K on 11g client do not compare the tail
    if(tailCompare) {
      should.strictEqual(resultVal.substring(resultLen - specialStrLen, resultLen), specialStr);
    }
  };

  describe('85.1 fetch CLOB columns by setting fetchInfo option', function() {

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
          insertIntoClobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { C : { type : oracledb.STRING } }
            },
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

    it('85.1.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.1.1

    it('85.1.2 works with empty String', function(done) {
      var id = insertID++;
      var content = "";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.1.2

    it('85.1.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '85.1.3';
      var contentLength = 20;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.1.3

    it('85.1.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.1.4';
      var contentLength = 65535;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.1.4

    it('85.1.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.1.5';
      var contentLength = 65537;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.1.5

    it('85.1.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.1.6';
      var contentLength = 1048577; // 1MB + 1
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.1.6

    it('85.1.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '85.1.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { C1 : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              var resultVal = result.rows[0][0];
              compareClientFetchResult(err, resultVal, specialStr, specialStr, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 85.1.7

    it('85.1.8 works with EMPTY_CLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_CLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.1.8

    it('85.1.9 fetch multiple CLOB rows as String', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.1.9_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.1.9_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.1.9

    it('85.1.10 fetch the same CLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '85.1.10';
      var contentLength = 200;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
            { },
            {
              fetchInfo : {
                C1 : { type : oracledb.STRING },
                C2 : { type : oracledb.STRING } }
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
    }); // 85.1.10

    it('85.1.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '85.1.11_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '85.1.11_2';
      var contentLength_2 = 208;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
            { },
            {
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.1.8

    it('85.1.12 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.1.12_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.1.12_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.1.12

    it('85.1.13 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.1.13_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.1.13_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.1.13

    it('85.1.14 works with connection.queryStream()', function(done) {
      var id = insertID++;
      var specialStr = '85.1.14';
      var contentLength = 200;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id;
          var stream = connection.queryStream(sql, {}, { fetchInfo : { C : { type : oracledb.STRING } } });
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            should.strictEqual(typeof result, "string");
            compareStrings(result, specialStr, content, contentLength, false);
            counter++;
          });

          stream.on('end', function () {
            should.equal(counter, 1);
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 85.1.14

    it('85.1.15 works with connection.queryStream() and oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.1.15_1';
      var contentLength_1 = 26;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.1.15_2';
      var contentLength_2 = 30;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 20;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " +id_2;
          var stream = connection.queryStream(sql, {}, { fetchInfo : { C : { type : oracledb.STRING } } });
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            should.strictEqual(typeof result, "string");
            counter++;
            if(counter == 1) {
              compareStrings(result, specialStr_1, content_1, contentLength_1, false);
            } else {
              compareStrings(result, specialStr_2, content_2, contentLength_2, false);
            }
          });

          stream.on('end', function () {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 85.1.15

    it('85.1.16 works with connection.queryStream() and oracledb.maxRows = actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.1.16_1';
      var contentLength_1 = 26;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.1.16_2';
      var contentLength_2 = 30;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 2;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " +id_2;
          var stream = connection.queryStream(sql, {}, { fetchInfo : { C : { type : oracledb.STRING } } });
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            should.strictEqual(typeof result, "string");
            counter++;
            if(counter == 1) {
              compareStrings(result, specialStr_1, content_1, contentLength_1, false);
            } else {
              compareStrings(result, specialStr_2, content_2, contentLength_2, false);
            }
          });

          stream.on('end', function () {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 85.1.16

    it('85.1.17 works with connection.queryStream() and oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.1.17_1';
      var contentLength_1 = 26;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.1.17_2';
      var contentLength_2 = 30;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          var sql = "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " +id_2;
          var stream = connection.queryStream(sql, {}, { fetchInfo : { C : { type : oracledb.STRING } } });
          stream.on('error', function (error) {
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            var result = data[1];
            should.strictEqual(typeof result, "string");
            counter++;
            if(counter == 1) {
              compareStrings(result, specialStr_1, content_1, contentLength_1, false);
            } else {
              compareStrings(result, specialStr_2, content_2, contentLength_2, false);
            }
          });

          stream.on('end', function () {
            should.equal(counter, 2);
            oracledb.maxRows = maxRowsBak;
            setTimeout(cb, 500);
          });
        }
      ], done);
    }); // 85.1.17

  }); // 85.1

  describe('85.2 fetch CLOB columns by setting fetchInfo option and outFormat = oracledb.OBJECT', function() {

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
          insertIntoClobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } }
            },
            function(err, result) {
              var resultVal = result.rows[0].C;
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

    it('85.2.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.2.1

    it('85.2.2 works with empty buffer', function(done) {
      var id = insertID++;
      var content = "";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.2.2

    it('85.2.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '85.2.3';
      var contentLength = 20;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.2.3

    it('85.2.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.2.4';
      var contentLength = 65535;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.2.4

    it('85.2.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.2.5';
      var contentLength = 65537;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.2.5

    it('85.2.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.2.6';
      var contentLength = 1048577; // 1MB + 1
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.2.6

    it('85.2.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '85.2.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C1 : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].C1;
              compareClientFetchResult(err, resultVal, specialStr, specialStr, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 85.2.7

    it('85.2.8 works with EMPTY_CLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_CLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.2.8

    it('85.2.9 fetch multiple CLOB rows as String', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.2.9_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.2.9_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].C;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1].C;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 85.2.9

    it('85.2.10 fetch the same CLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '85.2.10';
      var contentLength = 200;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : {
                C1 : { type : oracledb.STRING },
                C2 : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].C1;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              resultVal = result.rows[0].C2;
              compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 85.2.10

    it('85.2.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '85.2.11_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '85.2.11_2';
      var contentLength_2 = 202;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].C;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              cb();
            }
          );
        }
      ], done);
    }); // 85.2.11

    it('85.2.12 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.2.12_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.2.12_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              result.rows.length.should.eql(1);
              var resultVal = result.rows[0].C;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 85.2.12

    it('85.2.13 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.2.13_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.2.13_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0].C;
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
              resultVal = result.rows[1].C;
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2, false);
              result.rows.length.should.eql(2);
              oracledb.maxRows = maxRowsBak;
              cb();
            }
          );
        }
      ], done);
    }); // 85.2.13

  }); // 85.2

  describe('85.3 fetch CLOB columns by setting fetchInfo option, outFormat = oracledb.OBJECT and resultSet = true', function() {

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
          insertIntoClobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  var resultVal;
                  if(case64KPlus === true) {
                    resultVal = client11gPlus ? row.C : null;
                    compare64KPlusResultSetResult(err, resultVal, specialStr, insertContent, insertContentLength);
                  } else {
                    resultVal = row.C;
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

    it('85.3.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.3.1

    it('85.3.2 works with empty buffer', function(done) {
      var id = insertID++;
      var content = "";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.3.2

    it('85.3.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '85.3.3';
      var contentLength = 20;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.3.3

    it('85.3.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.3.4';
      var contentLength = 65535;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.3.4

    it('85.3.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.3.4';
      var contentLength = 65537;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.3.5

    it('85.3.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.3.6';
      var contentLength = 1048577; // 1MB + 1
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.3.6

    it('85.3.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '85.3.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C1 : { type : oracledb.STRING } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.C1;
                  compareClientFetchResult(err, resultVal, specialStr, specialStr, specialStrLength, false);
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
    }); // 85.3.7

    it('85.3.8 works with EMPTY_CLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_CLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.3.8

    it('85.3.9 fetch multiple CLOB rows as String', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.3.9_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.3.9_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              var rowNumFetched = 2;
              result.resultSet.getRows(
                rowNumFetched,
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[0].C;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1].C;
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
    }); // 85.3.9

    it('85.3.10 fetch the same CLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '85.3.10';
      var contentLength = 200;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : {
                C1 : { type : oracledb.STRING },
                C2 : { type : oracledb.STRING } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.C1;
                  compareClientFetchResult(err, resultVal, specialStr, content, contentLength, false);
                  resultVal = row.C2;
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
    }); // 85.3.10

    it('85.3.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '85.3.11_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '85.3.11_2';
      var contentLength_2 = 202;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row.C;
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
    }); // 85.3.11

    it('85.3.12 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.3.12_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.3.12_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } },
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
                  var resultVal = row[0].C;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1].C;
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
    }); // 85.3.12

    it('85.3.13 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.3.13_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.3.13_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.OBJECT,
              fetchInfo : { C : { type : oracledb.STRING } },
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
                  var resultVal = row[0].C;
                  compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1, false);
                  resultVal = row[1].C;
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
    }); // 85.3.13

  }); // 85.3

  describe('85.4 fetch CLOB columns by setting fetchInfo option and outFormat = oracledb.ARRAY', function() {

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
          insertIntoClobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } }
            },
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

    it('85.4.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.4.1

    it('85.4.2 works with empty String', function(done) {
      var id = insertID++;
      var content = "";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.4.2

    it('85.4.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '85.4.3';
      var contentLength = 20;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.4.3

    it('85.4.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.4.4';
      var contentLength = 65535;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.4.4

    it('85.4.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.4.5';
      var contentLength = 65537;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.4.5

    it('85.4.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.4.6';
      var contentLength = 1048577; // 1MB + 1
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.4.6

    it('85.4.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '85.4.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              fetchInfo : { C1 : { type : oracledb.STRING } }
            },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              var resultVal = result.rows[0][0];
              compareClientFetchResult(err, resultVal, specialStr, specialStr, specialStrLength, false);
              cb();
            }
          );
        }
      ], done);
    }); // 85.4.7

    it('85.4.8 works with EMPTY_CLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_CLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.4.8

    it('85.4.9 fetch multiple CLOB rows as String', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.4.9_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.4.9_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.4.9

    it('85.4.10 fetch the same CLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '85.4.10';
      var contentLength = 200;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
            { },
            {
              fetchInfo : {
                C1 : { type : oracledb.STRING },
                C2 : { type : oracledb.STRING } }
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
    }); // 85.4.10

    it('85.4.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '85.4.11_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '85.4.11_2';
      var contentLength_2 = 208;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.4.8

    it('85.4.12 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.4.12_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.4.12_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.4.12

    it('85.4.13 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.4.13_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.4.13_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } }
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
    }); // 85.4.13

  }); // 85.4

  describe('85.5 fetch CLOB columns by setting fetchInfo option, outFormat = oracledb.ARRAY and resultSet = true', function() {

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
          insertIntoClobTable1(id, insertContent, cb, case64KPlus);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } },
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

    it('85.5.1 works with NULL value', function(done) {
      var id = insertID++;
      var content = null;

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.5.1

    it('85.5.2 works with empty String', function(done) {
      var id = insertID++;
      var content = "";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.5.2

    it('85.5.3 works with small value', function(done) {
      var id = insertID++;
      var specialStr = '85.5.3';
      var contentLength = 20;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.5.3

    it('85.5.4 works with (64K - 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.5.4';
      var contentLength = 65535;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, false, done);
    }); // 85.5.4

    it('85.5.5 works with (64K + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.5.5';
      var contentLength = 65537;
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.5.5

    it('85.5.6 works with (1MB + 1) value', function(done) {
      var id = insertID++;
      var specialStr = '85.5.6';
      var contentLength = 1048577; // 1MB + 1
      var content = random.getRandomString(contentLength, specialStr);

      insertAndFetch(id, specialStr, content, contentLength, true, done);
    }); // 85.5.6

    it('85.5.7 works with dbms_lob.substr()', function(done) {
      var id = insertID++;
      var specialStr = '85.5.7';
      var contentLength = 200;
      var specialStrLength = specialStr.length;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT dbms_lob.substr(C, " + specialStrLength + ", 1) AS C1 from nodb_clob1 WHERE ID = :id",
            { id : id },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C1 : { type : oracledb.STRING } },
              resultSet : true
            },
            function(err, result) {
              should.not.exist(err);
              result.resultSet.getRow(
                function(err, row) {
                  should.not.exist(err);
                  var resultVal = row[0];
                  compareClientFetchResult(err, resultVal, specialStr, specialStr, specialStrLength, false);
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
    }); // 85.5.7

    it('85.5.8 works with EMPTY_CLOB()', function(done) {
      var id = insertID++;
      var content = "EMPTY_CLOB";

      insertAndFetch(id, null, content, null, false, done);
    }); // 85.5.8

    it('85.5.9 fetch multiple CLOB rows as String', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.5.9_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.5.9_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id_1 + " or id = " + id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } },
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
    }); // 85.5.9

    it('85.5.10 fetch the same CLOB column multiple times', function(done) {
      var id = insertID++;
      var specialStr = '85.5.10';
      var contentLength = 200;
      var content = random.getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C AS C1, C AS C2 from nodb_clob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : {
                C1 : { type : oracledb.STRING },
                C2 : { type : oracledb.STRING } },
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
    }); // 85.5.10

    it('85.5.11 works with update statement', function(done) {
      var id = insertID++;
      var specialStr_1 = '85.5.11_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '85.5.11_2';
      var contentLength_2 = 208;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertAndFetch(id, specialStr_1, content_1, contentLength_1, false, cb);
        },
        function(cb) {
          updateClobTable1(id, content_2, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = " + id,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } },
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
    }); // 85.5.11

    it('85.5.12 works with setting oracledb.maxRows < actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.5.12_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.5.12_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } },
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
    }); // 85.5.12

    it('85.5.13 works with setting oracledb.maxRows > actual number of rows in the table', function(done) {
      var id_1 = insertID++;
      var specialStr_1 = '85.5.13_1';
      var contentLength_1 = 200;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var id_2 = insertID++;
      var specialStr_2 = '85.5.13_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      async.series([
        function(cb) {
          insertIntoClobTable1(id_1, content_1, cb, false);
        },
        function(cb) {
          insertIntoClobTable1(id_2, content_2, cb, false);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE id = " + id_1 + " or id = " +id_2,
            { },
            {
              outFormat : oracledb.ARRAY,
              fetchInfo : { C : { type : oracledb.STRING } },
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
    }); // 85.5.13

  }); // 85.5
});
