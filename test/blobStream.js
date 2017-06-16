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
 *   127. blobStream.js
 *
 * DESCRIPTION
 *   Testing stream txt file into BLOB.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

var oracledb  = require('oracledb');
var should    = require('should');
var async     = require('async');
var dbConfig  = require('./dbconfig.js');
var file      = require('./file.js');
var sql       = require('./sql.js');
var fs        = require('fs');

describe('127.blobStream.js', function() {
  var connection = null;
  var fileRoot = ".";
  var insertID = 1;
  var inFileName;

  var proc_blob_prepare_tab = "BEGIN \n" +
                              "    DECLARE \n" +
                              "        e_table_missing EXCEPTION; \n" +
                              "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                              "    BEGIN \n" +
                              "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_pre PURGE'); \n" +
                              "    EXCEPTION \n" +
                              "        WHEN e_table_missing \n" +
                              "        THEN NULL; \n" +
                              "    END; \n" +
                              "    EXECUTE IMMEDIATE (' \n" +
                              "        CREATE TABLE nodb_tab_lobs_pre ( \n" +
                              "            id    NUMBER, \n" +
                              "            blob  BLOB \n" +
                              "        ) \n" +
                              "    '); \n" +
                              "END; ";

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;

          cb();
        });
      },
      function(cb) {
        setupAllTable(cb);
      }
    ], done);
  }); // before

  after(function(done) {
    async.series([
      function(cb) {
        dropAllTable(cb);
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // after

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('127.1 stream txt file into BLOB column', function() {
    it('127.1.1 works with 64K txt file', function(done) {
      inFileName = fileRoot + '/smallString.txt';
      var selectID = insertID + 100;
      var fileSize = 64 * 1024;
      var specialStr = '127.1.1';

      bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr, done);
    });

    it('127.1.2 works with 64K+1 txt file', function(done) {
      inFileName = fileRoot + '/smallString.txt';
      var selectID = insertID + 100;
      var fileSize = 64 * 1024 + 1;
      var specialStr = '127.1.2';

      bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr, done);
    });

    it('127.1.3 works with 1MB+1 txt file', function(done) {
      inFileName = fileRoot + '/smallString.txt';
      var selectID = insertID + 100;
      var fileSize = 1 * 1024 * 1024 + 1;
      var specialStr = '127.1.3';

      bindSmallFile(inFileName, fileSize, selectID, insertID, specialStr, done);
    });

  }); // 1.1

  var bindSmallFile = function(inFileName, fileSize, selectID, insertID, specialStr, callback) {
    async.series([
      function(cb) {
        file.createFileInKB(inFileName, fileSize, specialStr);
        cb();
      },
      function(cb) {
        insetTableWithBlob(selectID, inFileName, cb);
      },
      function(cb) {
        verifyBlob(selectID, insertID, fileSize, cb);
      },
      function(cb) {
        file.delete(inFileName);
        cb();
      }
    ], callback);
  };

  var setupAllTable = function(callback) {
    connection.execute(
      proc_blob_prepare_tab,
      function(err) {
        should.not.exist(err);
        callback();
      });
  };

  var dropAllTable = function(callback) {
    connection.execute(
      "DROP TABLE nodb_tab_lobs_pre PURGE",
      function(err) {
        should.not.exist(err);
        callback();
      });
  };

  var insetTableWithBlob = function(id, inFileName, callback) {
    var sql = "INSERT INTO nodb_tab_lobs_pre (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
    var bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };

    connection.execute(
      sql,
      bindVar,
      { autoCommit: false }, // a transaction needs to span the INSERT and pipe()
      function(err, result) {
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        (result.outBinds.lobbv.length).should.be.exactly(1);

        var inStream = fs.createReadStream(inFileName);
        var lob = result.outBinds.lobbv[0];

        lob.on('error', function(err) {
          should.not.exist(err);
        });

        inStream.on('error', function(err) {
          should.not.exist(err);
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
  };

  var verifyBlob = function(selectID, insertID, lenExpected, callback) {
    var lob = {};
    var selectSql = "select blob from nodb_tab_lobs_pre where id = " + selectID;
    var insetSql = "INSERT INTO nodb_tab_lobs_pre (id, blob) VALUES (:i, :c)";
    var proc_compare_blob = "CREATE OR REPLACE PROCEDURE nodb_blob_compare(result OUT NUMBER, len OUT NUMBER) \n" +
                            "IS \n" +
                            "    blob1 BLOB; \n" +
                            "    blob2 BLOB; \n" +
                            "BEGIN \n" +
                            "    select blob into blob1 from nodb_tab_lobs_pre where id = " + selectID + "; \n" +
                            "    select blob into blob2 from nodb_tab_lobs_pre where id = " + insertID + "; \n" +
                            "    result := DBMS_LOB.COMPARE(blob1, blob2); \n" + // Zero if the comparison succeeds, nonzero if not.
                            "    len := length(blob1); \n" +
                            "END nodb_blob_compare;";
    var sqlRunComparePorc = "begin nodb_blob_compare(:r, :l); end;";
    var sqlDropComparePorc = "DROP PROCEDURE nodb_blob_compare";

    async.series([
      function(cb) {
        connection.execute(
          selectSql,
          function(err, result) {
            should.not.exist(err);
            lob = result.rows[0][0];
            should.exist(lob);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = { i: insertID, c: { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN } };
        connection.execute(
          insetSql,
          bindVar,
          { autoCommit: true },
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        sql.executeSql(connection, proc_compare_blob, {}, {}, cb);
      },
      function(cb) {
        var bindVar = {
          r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        connection.execute(
          sqlRunComparePorc,
          bindVar,
          function(err, result) {
            should.not.exist(err);
            result.outBinds.r.should.eql(0);
            should.strictEqual(result.outBinds.l, lenExpected);
            cb();
          });
      },
      function(cb) {
        sql.executeSql(connection, sqlDropComparePorc, {}, {}, cb);
      }
    ], callback);

  };

});
