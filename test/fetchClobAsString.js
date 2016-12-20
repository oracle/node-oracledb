/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   76. fetchClobAsString.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB.
 *    To fetch CLOB columns as strings
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
var dbConfig = require('./dbconfig.js');

describe('76. fetchClobAsString.js', function() {
  this.timeout(10000);

  var connection = null;
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
  var proc_create_table2 = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE('DROP TABLE nodb_clob2 PURGE'); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE (' \n" +
                          "        CREATE TABLE nodb_clob2 ( \n" +
                          "            ID   NUMBER, \n" +
                          "            C1   CLOB, \n" +
                          "            C2   CLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END; ";
  var drop_table2 = "DROP TABLE nodb_clob2 PURGE";

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  }); // before

  after('release connection', function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done ();
    });
  }); // after

  var insertIntoClobTable1 = function(id, content, callback) {
    if (content == "EMPTY_CLOB") {
      connection.execute(
        "INSERT INTO nodb_clob1 VALUES (:ID, EMPTY_CLOB())",
        [ id ],
        function(err, result){
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    } else {
      connection.execute(
        "INSERT INTO nodb_clob1 VALUES (:ID, :C)",
        [ id, content ],
        function(err, result){
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        }
      );
    }
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

  var insertIntoClobTable2 = function(id, content1, content2, callback) {
    connection.execute(
      "INSERT INTO nodb_clob2 VALUES (:ID, :C1, :C2)",
      [ id, content1, content2 ],
      function(err, result){
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

  var getRandomString = function(length, specialStr) {
    var str='';
    var strLength = length - specialStr.length * 2;
    for( ; str.length < strLength; str += Math.random().toString(36).slice(2));
    str = str.substr(0, strLength);
    str = specialStr + str + specialStr;
    return str;
  };

  describe('76.1 fetch clob columns by set oracledb.fetchAsString',  function() {

    before('create Table and populate', function(done) {
      connection.execute(
        proc_create_table1,
        function(err){
          should.not.exist(err);
          done() ;
        }
      );
    });  // before

    after('drop table', function(done) {
      oracledb.fetchAsString = [];
      connection.execute(
        drop_table1,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach('set oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.CLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsString = [];
      done();
    }); // afterEach

    it('76.1.1 works with NULL value', function(done) {
      var id = 1;
      var content = null;

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              should.equal(result.rows[0][1], content);
              cb();
            }
          );
        }
      ], done);
    }); // 76.1.1

    it('76.1.2 works with small clob data, the length of string is 26', function(done) {
      var id = 2;
      var specialStr = '76.1.2';
      var contentLength = 26;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              var specialStrLen = specialStr.length;
              var resultLen = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen), specialStr);
              should.strictEqual(result.rows[0][1].substring(resultLen - specialStrLen, resultLen), specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 76.1.2

    it('76.1.3 fetch multiple CLOB column as string', function(done) {
      var id_1 = 1;
      var specialStr_1 = '76.1.3_1';
      var contentLength_1 = 26;
      var content_1 = getRandomString(contentLength_1, specialStr_1);
      var id_2 = 2;
      var specialStr_2 = '76.1.3_2';
      var contentLength_2 = 30;
      var content_2 = getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          updateClobTable1(id_1, content_1, cb);
        },
        function(cb) {
          updateClobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, C from nodb_clob1",
            function(err, result){
              should.not.exist(err);
              var specialStrLen_1 = specialStr_1.length;
              var resultLen_1 = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength_1);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);

              var specialStrLen_2 = specialStr_2.length;
              var resultLen_2 = result.rows[1][1].length;
              should.equal(result.rows[1][1].length, contentLength_2);
              should.strictEqual(result.rows[1][1].substring(0, specialStrLen_2), specialStr_2);
              should.strictEqual(result.rows[1][1].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
              cb();
            }
          );
        }
      ], done);
    }); // 76.1.3

    it('76.1.4 fetch same CLOB column multiple times', function(done) {
      var id_1 = 1;
      var specialStr_1 = '76.1.4_1';
      var contentLength_1 = 20;
      var content_1 = getRandomString(contentLength_1, specialStr_1);
      var id_2 = 2;
      var specialStr_2 = '76.1.4_2';
      var contentLength_2 = 36;
      var content_2 = getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          updateClobTable1(id_1, content_1, cb);
        },
        function(cb) {
          updateClobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, C AS C1, C AS C2 from nodb_clob1",
            function(err, result){
              should.not.exist(err);
              var specialStrLen_1 = specialStr_1.length;
              var resultLen_1 = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength_1);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);
              should.equal(result.rows[0][2].length, contentLength_1);
              should.strictEqual(result.rows[0][2].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][2].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);

              var specialStrLen_2 = specialStr_2.length;
              var resultLen_2 = result.rows[1][1].length;
              should.equal(result.rows[1][1].length, contentLength_2);
              should.strictEqual(result.rows[1][1].substring(0, specialStrLen_2), specialStr_2);
              should.strictEqual(result.rows[1][1].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
              should.equal(result.rows[1][2].length, contentLength_2);
              should.strictEqual(result.rows[1][2].substring(0, specialStrLen_2), specialStr_2);
              should.strictEqual(result.rows[1][2].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
              cb();
            }
          );
        }
      ], done);
    }); // 76.1.4

    it('76.1.5 works with (64K - 1) value', function(done) {
      var id = 5;
      var specialStr = '76.1.5';
      var contentLength = 65535;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              var specialStrLen = specialStr.length;
              var resultLen = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen), specialStr);
              should.strictEqual(result.rows[0][1].substring(resultLen - specialStrLen, resultLen), specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 76.1.5

    it('76.1.6 fetch with substr', function(done) {
      var id = 6;
      var specialStr = '76.1.6';
      var specialStrLen = specialStr.length;
      var contentLength = 100;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT substr(C, 1, " + specialStrLen + ") from nodb_clob1 WHERE ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              var resultLen = result.rows[0][0].length;
              should.equal(resultLen, specialStrLen);
              should.strictEqual(result.rows[0][0], specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 76.1.6

    it('76.1.7 works with EMPTY_CLOB', function(done) {
      var id = 7;
      var content = "EMPTY_CLOB";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT C from nodb_clob1 WHERE ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              should.equal(result.rows[0][1], null);
              cb();
            }
          );
        }
      ], done);
    }); // 76.1.7

    it.skip('76.1.8 fetch clob using stream', function(done) {
      var id = 8;
      var specialStr = '76.1.8';
      var contentLength = 40;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          oracledb.fetchAsString = [];

          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            function(err, result){
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var lob = result.rows[0][1];
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
                var specialStrLen = specialStr.length;
                var resultLen = clobData.length;
                should.equal(resultLen, contentLength);
                should.strictEqual(clobData.substring(0, specialStrLen), specialStr);
                should.strictEqual(clobData.substring(resultLen - specialStrLen, resultLen), specialStr);
                cb();
              });
            }
          );
        }
      ], done);
    }); // 76.1.8

    it('76.1.9 works with REF CURSOR', function(done) {
      var id = 9;
      var specialStr = '76.1.9';
      var contentLength = 26;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          var ref_proc = "CREATE OR REPLACE PROCEDURE nodb_ref(clob_cursor OUT SYS_REFCURSOR)\n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    OPEN clob_cursor FOR \n" +
                         "        SELECT C from nodb_clob1 WHERE ID = " + id + "; \n" +
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
          var sql = "BEGIN nodb_ref(:c); END;";
          var bindVar = {
            c: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            sql,
            bindVar,
            function(err, result) {
              result.outBinds.c.getRows(3, function(err, rows) {
                var result = rows[0][0];
                should.strictEqual(typeof result, 'string');
                var specialStrLen = specialStr.length;
                var resultLen = result.length;
                should.equal(resultLen, contentLength);
                should.strictEqual(result.substring(0, specialStrLen), specialStr);
                should.strictEqual(result.substring(resultLen - specialStrLen, resultLen), specialStr);
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
    }); // 76.1.9

  }); // 76.1

  describe('76.2 fetch CLOB columns by set fetchInfo option', function() {
    before('create Table and populate', function(done) {
      connection.execute(
        proc_create_table1,
        function(err){
          should.not.exist(err);
          done() ;
        }
      );
    });  // before

    after('drop table', function(done) {
      connection.execute(
        drop_table1,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    }); // after

    it('76.2.1 works with NULL value', function(done) {
      var id = 1;
      var content = null;

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            { fetchInfo :  { C : { type : oracledb.STRING } } },
            function(err, result){
              should.not.exist(err);
              should.equal(result.rows[0][1], content);
              cb();
            }
          );
        }
      ], done);
    }); // 76.2.1

    it('76.2.2 works with small clob data, the length of string is 26', function(done) {
      var id = 2;
      var specialStr = '76.2.2';
      var contentLength = 26;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            { fetchInfo : { C : { type : oracledb.STRING} } },
            function(err, result){
              should.not.exist(err);
              var specialStrLen = specialStr.length;
              var resultLen = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen), specialStr);
              should.strictEqual(result.rows[0][1].substring(resultLen - specialStrLen, resultLen), specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 76.2.2

    it('76.2.3 fetch multiple CLOB column as string', function(done) {
      var id_1 = 1;
      var specialStr_1 = '76.2.3_1';
      var contentLength_1 = 26;
      var content_1 = getRandomString(contentLength_1, specialStr_1);
      var id_2 = 2;
      var specialStr_2 = '76.2.3_2';
      var contentLength_2 = 30;
      var content_2 = getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          updateClobTable1(id_1, content_1, cb);
        },
        function(cb) {
          updateClobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, C from nodb_clob1",
            { },
            { fetchInfo : { C : { type : oracledb.STRING} } },
            function(err, result){
              should.not.exist(err);
              var specialStrLen_1 = specialStr_1.length;
              var resultLen_1 = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength_1);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);

              var specialStrLen_2 = specialStr_2.length;
              var resultLen_2 = result.rows[1][1].length;
              should.equal(result.rows[1][1].length, contentLength_2);
              should.strictEqual(result.rows[1][1].substring(0, specialStrLen_2), specialStr_2);
              should.strictEqual(result.rows[1][1].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
              cb();
            }
          );
        }
      ], done);
    }); // 76.2.3

    it('76.2.4 fetch same CLOB column multiple times', function(done) {
      var id_1 = 1;
      var specialStr_1 = '76.2.4_1';
      var contentLength_1 = 20;
      var content_1 = getRandomString(contentLength_1, specialStr_1);
      var id_2 = 2;
      var specialStr_2 = '76.2.4_2';
      var contentLength_2 = 36;
      var content_2 = getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          updateClobTable1(id_1, content_1, cb);
        },
        function(cb) {
          updateClobTable1(id_2, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, C AS C1, C AS C2 from nodb_clob1",
            { },
            { fetchInfo :
            {
              C1 : { type : oracledb.STRING},
              C2 : { type : oracledb.STRING}
            }
            },
            function(err, result){
              should.not.exist(err);
              var specialStrLen_1 = specialStr_1.length;
              var resultLen_1 = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength_1);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);
              should.equal(result.rows[0][2].length, contentLength_1);
              should.strictEqual(result.rows[0][2].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][2].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);

              var specialStrLen_2 = specialStr_2.length;
              var resultLen_2 = result.rows[1][1].length;
              should.equal(result.rows[1][1].length, contentLength_2);
              should.strictEqual(result.rows[1][1].substring(0, specialStrLen_2), specialStr_2);
              should.strictEqual(result.rows[1][1].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
              should.equal(result.rows[1][2].length, contentLength_2);
              should.strictEqual(result.rows[1][2].substring(0, specialStrLen_2), specialStr_2);
              should.strictEqual(result.rows[1][2].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
              cb();
            }
          );
        }
      ], done);
    }); // 76.2.4

    it('76.2.5 works with (64K - 1) value', function(done) {
      var id = 5;
      var specialStr = '76.2.5';
      var contentLength = 65535;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT ID, C from nodb_clob1 WHERE ID = :id",
            { id : id },
            { fetchInfo : { C : { type : oracledb.STRING} } },
            function(err, result){
              should.not.exist(err);
              var specialStrLen = specialStr.length;
              var resultLen = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen), specialStr);
              should.strictEqual(result.rows[0][1].substring(resultLen - specialStrLen, resultLen), specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 76.2.5

    it('76.2.6 works with substr', function(done) {
      var id = 6;
      var specialStr = '76.2.6';
      var specialStrLen = specialStr.length;
      var contentLength = 100;
      var content = getRandomString(contentLength, specialStr);

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT substr(C, 1, " + specialStrLen + ") AS B from nodb_clob1 WHERE ID = :id",
            { id : id },
            { fetchInfo : { B : { type : oracledb.STRING} } },
            function(err, result){
              should.not.exist(err);
              var resultLen = result.rows[0][0].length;
              should.equal(resultLen, specialStrLen);
              should.strictEqual(result.rows[0][0], specialStr);
              cb();
            }
          );
        }
      ], done);
    }); // 76.2.6

    it('76.2.7 works with EMPTY_CLOB', function(done) {
      var id = 7;
      var content = "EMPTY_CLOB";

      async.series([
        function(cb) {
          insertIntoClobTable1(id, content, cb);
        },
        function(cb) {
          connection.execute(
            "SELECT C from nodb_clob1 WHERE ID = :id",
            { id : id },
            { fetchInfo : { C : { type : oracledb.STRING} } },
            function(err, result){
              should.not.exist(err);
              should.equal(result.rows[0][1], null);
              cb();
            }
          );
        }
      ], done);
    }); // 76.2.7

  }); // 76.2

  describe('76.3 fetch mutiple CLOBs', function() {
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
      oracledb.fetchAsString = [];
      connection.execute(
        drop_table2,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach('set oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.CLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsString = [];
      done();
    }); // afterEach

    it('76.3.1 fetch mutiple CLOB columns as string', function(done) {
      var id = 1;
      var specialStr_1 = '76.3.1_1';
      var contentLength_1 = 26;
      var content_1 = getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '76.3.1_2';
      var contentLength_2 = 100;
      var content_2 = getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable2(id, content_1, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, C1, C2 from nodb_clob2",
            function(err, result){
              should.not.exist(err);
              var specialStrLen_1 = specialStr_1.length;
              var resultLen_1 = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength_1);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);

              var specialStrLen_2 = specialStr_2.length;
              var resultLen_2 = result.rows[0][2].length;
              should.equal(result.rows[0][2].length, contentLength_2);
              should.strictEqual(result.rows[0][2].substring(0, specialStrLen_2), specialStr_2);
              should.strictEqual(result.rows[0][2].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
              cb();
            }
          );
        }
      ], done);

    }); // 76.3.1

    it('76.3.2 fetch two CLOB columns, one as string, another streamed', function(done) {
      var id = 2;
      var specialStr_1 = '76.3.2_1';
      var contentLength_1 = 30;
      var content_1 = getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '76.3.2_2';
      var contentLength_2 = 50;
      var content_2 = getRandomString(contentLength_2, specialStr_2);

      async.series([
        function(cb) {
          insertIntoClobTable2(id, content_1, content_2, cb);
        },
        function(cb) {
          connection.execute(
           "SELECT ID, C1 from nodb_clob2 where ID = :id",
            { id: id },
            function(err, result){
              should.not.exist(err);
              var specialStrLen_1 = specialStr_1.length;
              var resultLen_1 = result.rows[0][1].length;
              should.equal(result.rows[0][1].length, contentLength_1);
              should.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
              should.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);
              cb();
            }
          );
        },
        function(cb) {
          oracledb.fetchAsString = [];

          connection.execute(
           "SELECT C2 from nodb_clob2 where ID = :id",
            { id: id },
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

    }); // 76.3.2

  }); // 76.3
});
