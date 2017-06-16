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
 *   89. fetchBlobAsBuffer3.js
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
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('89. fetchBlobAsBuffer3.js', function() {
  this.timeout(100000);
  var connection = null;
  var node6plus = false;  // assume node runtime version is lower than 6
  var insertID = 1; // assume id for insert into db starts from 1

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

  before('get one connection', function(done) {
    oracledb.stmtCacheSize = 0;
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      if(process.versions["node"].substring(0,1) >= "6")
        node6plus = true;

      done();
    });

  }); // before

  after('release connection', function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });  // after

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

  describe('89.1 fetch multiple BLOBs', function() {

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

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    it('89.1.1 fetch multiple BLOB columns as Buffer', function(done) {
      var id = insertID++;
      var specialStr_1 = '89.1.1_1';
      var contentLength_1 = 26;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '89.1.1_2';
      var contentLength_2 = 100;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
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
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
              resultVal = result.rows[0][2];
              compareClientFetchResult(err, resultVal, specialStr_2, content_2, contentLength_2);
              cb();
            }
          );
        }
      ], done);

    }); // 89.1.1

    it('89.1.2 fetch two BLOB columns, one as string, another streamed', function(done) {
      var id = insertID++;
      var specialStr_1 = '89.1.2_1';
      var contentLength_1 = 30;
      var strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      var content_1 = node6plus ? Buffer.from(strBuf_1, "utf-8") : new Buffer(strBuf_1, "utf-8");
      var specialStr_2 = '89.1.2_2';
      var contentLength_2 = 50;
      var strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
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
              compareClientFetchResult(err, resultVal, specialStr_1, content_1, contentLength_1);
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

    }); // 89.1.2

  }); // 89.1

  describe('89.2 types support for fetchAsBuffer property', function() {

    afterEach ('clear the by-type specification', function ( done ) {
      oracledb.fetchAsBuffer = [];
      done ();
    });

    it('89.2.1 String not supported in fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.STRING ];
        },
        /NJS-021: invalid type for conversion specified/
      );
      done();
    }); // 89.2.1


    it('89.2.2 CLOB not supported in fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.CLOB ];
        },
        /NJS-021: invalid type for conversion specified/
      );
      done();
    }); // 89.2.2


    it('89.2.3 Number not supported in fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.NUMBER ];
        },
        /NJS-021: invalid type for conversion specified/
      );
      done();
    }); // 89.2.3


    it('89.2.4 Date not supported in fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.DATE ];
        },
        /NJS-021: invalid type for conversion specified/
      );
      done();
    }); // 89.2.4


    it('89.2.5 Cursor not supported in fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.CURSOR ];
        },
        /NJS-021: invalid type for conversion specified/
      );
      done();
    }); // 89.2.5


    it('89.2.6 Buffer not supported in fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.BUFFER ];
        },
        /NJS-021: invalid type for conversion specified/
      );
      done();
    }); // 89.2.6


    it('89.2.7 BLOB supported in fetchAsBuffer', function(done) {
      should.doesNotThrow(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.BLOB ];
        }
      );
      should.strictEqual(oracledb.fetchAsBuffer.length, 1);
      should.strictEqual(oracledb.fetchAsBuffer[0], oracledb.BLOB);
      done();
    }); // 89.2.7


    it.skip('89.2.8 negative null value for fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = null;
        },
        /NJS-004: invalid value for property [\w]/
      );
      done();
    }); // 89.2.8


    it.skip('89.2.9 negative undefined value for fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = undefined;
        },
        /NJS-004: invalid value for property [\w]/
      );
      done();
    }); // 89.2.9


    it.skip('89.2.10 negative numeric value for fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = 89210;
        },
        /NJS-004: invalid value for property [\w]/
      );
      done();
    }); // 89.2.10


    it.skip('89.2.11 negative emtpy string value for fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = ' ';
        },
        /NJS-004: invalid value for property [\w]/
      );
      done();
    }); // 89.2.11


    it.skip('89.2.12 negative arbitary string value for fetchAsBuffer', function(done) {
      should.throws(
        function() {
          oracledb.fetchAsBuffer = "89.2.12";
        },
        /NJS-004: invalid value for property [\w]/
      );
      done();
    }); // 89.2.12


    it.skip('89.2.13 negative date value for fetchAsBuffer', function(done) {
      should.throws(
        function() {
          var dt = new Date ();
          oracledb.fetchAsBuffer = dt;
        },
        /NJS-004: invalid value for property [\w]/
      );
      done();
    }); // 89.2.13


    it.skip('89.2.14 negative arbitary buffer value for fetchAsBuffer', function(done) {
      should.throws(
        function() {
          var buf = assist.createBuffer ( 10 ) ;
          oracledb.fetchAsBuffer = buf;
        },
        /NJS-004: invalid value for property [\w]/
      );
      done();
    }); // 89.2.14

  }); // 89.2

});
