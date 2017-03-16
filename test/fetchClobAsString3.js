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
 *   86. fetchClobAsString.js
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
var random   = require('./random.js');

describe('86. fetchClobAsString3.js', function() {
  this.timeout(100000);
  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1
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
    oracledb.stmtCacheSize = 0;
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  }); // before

  after('release connection', function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });  // after

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

  describe('86.1 fetch multiple CLOBs', function() {
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

    it('86.1.1 fetch multiple CLOB columns as String', function(done) {
      var id = insertID++;
      var specialStr_1 = '86.1.1_1';
      var contentLength_1 = 26;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '86.1.1_2';
      var contentLength_2 = 100;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

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

    }); // 86.1.1

    it('86.1.2 fetch two CLOB columns, one as string, another streamed', function(done) {
      var id = insertID++;
      var specialStr_1 = '86.1.2_1';
      var contentLength_1 = 30;
      var content_1 = random.getRandomString(contentLength_1, specialStr_1);
      var specialStr_2 = '86.1.2_2';
      var contentLength_2 = 50;
      var content_2 = random.getRandomString(contentLength_2, specialStr_2);

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

              // set the encoding so we get a 'string' not a 'String'
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

    }); // 86.1.2

  }); // 86.1

  describe('86.2 types support for fetchAsString property', function() {

    afterEach ('clear the by-type specification', function ( done ) {
      oracledb.fetchAsString = [];
      done ();
    });

    it('86.2.1 String not supported in fetchAsString', function(done) {
      try {
        oracledb.fetchAsString = [ oracledb.STRING ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021:');
      }
      done();
    }); // 86.2.1

    it('86.2.2 BLOB not supported in fetchAsString', function(done) {
      try {
        oracledb.fetchAsString = [ oracledb.BLOB ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021:');
      }
      done();
    }); // 86.2.2

    it('86.2.3 Cursor not supported in fetchAsString', function(done) {
      try {
        oracledb.fetchAsString = [ oracledb.CURSOR ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021:');
      }
      done();
    }); // 86.2.3

    it('86.2.4 Buffer not supported in fetchAsString', function(done) {
      try {
        oracledb.fetchAsString = [ oracledb.Buffer ];
      } catch(err) {
        should.exist(err);
        // NJS-021: invalid type for conversion specified
        (err.message).should.startWith ('NJS-021:');
      }
      done();
    }); // 86.2.4

    it('86.2.5 Number supported in fetchAsString', function(done) {
      try {
        oracledb.fetchAsString = [ oracledb.NUMBER ];
      } catch(err) {
        should.not.exist(err);
      }
      should.strictEqual(oracledb.fetchAsString.length, 1);
      should.strictEqual(oracledb.fetchAsString[0], oracledb.NUMBER);
      done();
    }); // 86.2.5

    it('86.2.6 Date supported in fetchAsString', function(done) {
      try {
        oracledb.fetchAsString = [ oracledb.DATE ];
      } catch(err) {
        should.not.exist(err);
      }
      should.strictEqual(oracledb.fetchAsString.length, 1);
      should.strictEqual(oracledb.fetchAsString[0], oracledb.DATE);
      done();
    }); // 86.2.6

    it('86.2.7 CLOB supported in fetchAsString', function(done) {
      try {
        oracledb.fetchAsString = [ oracledb.CLOB ];
      } catch(err) {
        should.not.exist(err);
      }
      should.strictEqual(oracledb.fetchAsString.length, 1);
      should.strictEqual(oracledb.fetchAsString[0], oracledb.CLOB);
      done();
    }); // 86.2.7

  }); // 86.2

});
