/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   128. clobStream.js
 *
 * DESCRIPTION
 *   Testing stream txt file into CLOB.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const async     = require('async');
const dbConfig  = require('./dbconfig.js');
const file      = require('./file.js');
const sql       = require('./sql.js');
const fs        = require('fs');

describe('128.clobStream.js', function() {
  let connection = null;
  const fileRoot = ".";
  let insertID = 1;
  let inFileName;

  const proc_clob_prepare_tab = "BEGIN \n" +
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
                              "            clob  CLOB \n" +
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

  describe('128.1 stream txt file into CLOB column', function() {
    it('128.1.1 works with 64KB txt file', function(done) {
      inFileName = fileRoot + '/smallString.txt';
      let selectID = insertID + 200;
      let specialStr = '128.1.1';
      let fileSize = 65536;

      bindIn_small(inFileName, fileSize, selectID, insertID, specialStr, done);
    });

    it('128.1.2 works with 64KB+1 txt file', function(done) {
      inFileName = fileRoot + '/smallString.txt';
      let selectID = insertID + 200;
      let specialStr = '128.1.2';
      let fileSize = 655376;

      bindIn_small(inFileName, fileSize, selectID, insertID, specialStr, done);
    });

    it('128.1.3 works with 1MB+1 txt file', function(done) {
      inFileName = fileRoot + '/smallString.txt';
      let selectID = insertID + 200;
      let specialStr = '128.1.3';
      let fileSize = 1 * 1024 * 1024;

      bindIn_small(inFileName, fileSize, selectID, insertID, specialStr, done);
    });

  }); // 4.1

  var bindIn_small = function(inFileName, fileSize, selectID, insertID, specialStr, callback) {
    async.series([
      function(cb) {
        file.createFileInKB(inFileName, fileSize, specialStr);
        cb();
      },
      function(cb) {
        insetTableWithClob(selectID, inFileName, cb);
      },
      function(cb) {
        verifyClob(selectID, insertID, fileSize, cb);
      },
      function(cb) {
        file.delete(inFileName);
        cb();
      }
    ], callback);
  };

  var setupAllTable = function(callback) {
    connection.execute(
      proc_clob_prepare_tab,
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

  var insetTableWithClob = function(id, inFileName, callback) {
    var sql = "INSERT INTO nodb_tab_lobs_pre (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
    var bindVar = { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };

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

        lob.on('finish', function() {
          connection.commit(function(err) {
            should.not.exist(err);
            callback();
          });
        });

        inStream.pipe(lob); // copies the text to the CLOB
      }
    );
  };

  var verifyClob = function(selectID, insertID, lenExpected, callback) {
    var lob = {};
    var selectSql = "select clob from nodb_tab_lobs_pre where id = " + selectID;
    var insetSql = "INSERT INTO nodb_tab_lobs_pre (id, clob) VALUES (:i, :c)";
    var proc_compare_clob = "CREATE OR REPLACE PROCEDURE nodb_clob_compare(result OUT NUMBER, len OUT NUMBER) \n" +
                            "IS \n" +
                            "    clob1 CLOB; \n" +
                            "    clob2 CLOB; \n" +
                            "BEGIN \n" +
                            "    select clob into clob1 from nodb_tab_lobs_pre where id = " + selectID + "; \n" +
                            "    select clob into clob2 from nodb_tab_lobs_pre where id = " + insertID + "; \n" +
                            "    result := DBMS_LOB.COMPARE(clob1, clob2); \n" + // Zero if the comparison succeeds, nonzero if not.
                            "    len := length(clob1); \n" +
                            "END nodb_clob_compare;";
    var sqlRunComparePorc = "begin nodb_clob_compare(:r, :l); end;";
    var sqlDropComparePorc = "DROP PROCEDURE nodb_clob_compare";

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
        var bindVar = { i: insertID, c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN } };
        connection.execute(
          insetSql,
          bindVar,
          { autoCommit: true },
          function(err) {
            should.not.exist(err);
            lob.close(cb);
          }
        );
      },
      function(cb) {
        sql.executeSql(connection, proc_compare_clob, {}, {}, cb);
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
