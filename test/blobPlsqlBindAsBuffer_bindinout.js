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
 *   79. blobPlsqlBindAsBuffer_inout.js
 *
 * DESCRIPTION
 *   Testing BLOB binding inout as Buffer.
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
var fs       = require('fs');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('79. blobPlsqlBindAsBuffer_inout.js', function() {
  this.timeout(100000);
  var connection = null;
  var node6plus = false; // assume node runtime version is lower than 6
  var client11gPlus = true; // assume instant client runtime version is greater than 11.2.0.4.0
  var insertID = 1; // assume id for insert into db starts from 1

  var proc_blob_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_blob_in ( \n" +
                         "            id      NUMBER, \n" +
                         "            blob_1  BLOB, \n" +
                         "            blob_2  BLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  var proc_lobs_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_lobs_in ( \n" +
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

          // Check whether node runtime version is >= 6 or not
          if ( process.versions["node"].substring (0, 1) >= "6")
            node6plus = true;
          // Check whether instant client runtime version is smaller than 12.1.0.2
          if(oracledb.oracleClientVersion < 1201000200)
            client11gPlus = false;

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

  var setupAllTable = function(callback) {
    async.series([
      function(cb) {
        connection.execute(
          proc_blob_in_tab,
          function(err) {
            should.not.exist(err);
            cb();
          });
      },
      function(cb) {
        connection.execute(
          proc_lobs_in_tab,
          function(err) {
            should.not.exist(err);
            cb();
          });
      }
    ], callback);
  };

  var dropAllTable = function(callback) {
    async.series([
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_tab_blob_in PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          });
      },
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_tab_lobs_in PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          });
      }
    ], callback);
  };

  var executeSQL = function(sql, callback) {
    connection.execute(
      sql,
      function(err) {
        should.not.exist(err);
        return callback();
      }
    );
  };

  var jpgFileName = './test/fuzzydinosaur.jpg';

  var prepareTableWithBlob = function(sql, id, callback) {
    var bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };

    connection.execute(
      sql,
      bindVar,
      { autoCommit: false }, // a transaction needs to span the INSERT and pipe()
      function(err, result) {
        should.not.exist(err);
        (result.rowsAffected).should.be.exactly(1);
        (result.outBinds.lobbv.length).should.be.exactly(1);

        var inStream = fs.createReadStream(jpgFileName);
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
            return callback();
          });
        });

        inStream.pipe(lob);
      });
  };

  // compare the result buffer with the original inserted buffer
  var compareResultBufAndOriginal = function(resultVal, originalBuffer, specialStr) {
    if(originalBuffer.length > 0 ) {
      var resultLength = resultVal.length;
      var specStrLength = specialStr.length;
      should.strictEqual(resultLength, originalBuffer.length);
      should.strictEqual(resultVal.toString('utf8', 0, specStrLength), specialStr);
      should.strictEqual(resultVal.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
    }
    should.strictEqual(assist.compare2Buffers(resultVal, originalBuffer), true);
  };

  // execute plsql bind in out procedure, and verify the plsql bind out buffer
  var plsqlBindInOut = function(sqlRun, bindVar, originalBuf, specialStr, case64KPlus, client11gPlus, callback) {
    connection.execute(
      sqlRun,
      bindVar,
      function(err, result) {
        if(client11gPlus === false && case64KPlus === true){
          should.exist(err);
          // NJS-051: "maxSize" must be less than 65535
          (err.message).should.startWith('NJS-051:');
          callback();
        } else {
          should.not.exist(err);
          var resultVal = result.outBinds.io;
          if(originalBuf == 'EMPTY_BLOB' || originalBuf == null || originalBuf == undefined || originalBuf == "") {
            should.strictEqual(resultVal, null);
          } else {
            compareResultBufAndOriginal(resultVal, originalBuf, specialStr);
          }
          callback();
        }
      }
    );
  };

  describe('79.1 BLOB, PLSQL, BIND_INOUT', function() {
    var blob_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_791 (lob_id IN NUMBER, lob_in_out IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                          "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                          "END nodb_blob_in_out_791;";
    var sqlRun = "begin nodb_blob_in_out_791(:i, :io); end;";
    var proc_drop = "DROP PROCEDURE nodb_blob_in_out_791";
    var blob_proc_inout_7911 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_7911 (lob_id IN NUMBER, lob_in_out IN OUT BLOB) \n" +
                               "AS \n" +
                               "BEGIN \n" +
                               "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, EMPTY_BLOB()); \n" +
                               "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                               "END nodb_blob_in_out_7911;";
    var sqlRun_7911 = "begin nodb_blob_in_out_7911(:i, :io); end;";
    var proc_drop_7911 = "DROP PROCEDURE nodb_blob_in_out_7911";

    before(function(done) {
      executeSQL(blob_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('79.1.1 works with EMPTY_BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7911, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7911, bindVar, "EMPTY_BLOB", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7911, cb);
        }
      ], done);
    }); // 79.1.1

    it('79.1.2 works with EMPTY_BLOB and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7911, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7911, bindVar, "EMPTY_BLOB", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7911, cb);
        }
      ], done);
    }); // 79.1.2

    it('79.1.3 works with EMPTY_BLOB and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7911, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7911, bindVar, "EMPTY_BLOB", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7911, cb);
        }
      ], done);
    }); // 79.1.3

    it('79.1.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, false, client11gPlus, done);
    }); // 79.1.4

    it('79.1.5 works with null and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, false, client11gPlus, done);
    }); // 79.1.5

    it('79.1.6 works with null and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, false, client11gPlus, done);
    }); // 79.1.6

    it('79.1.7 works with empty buffer', function(done) {
      var sequence = insertID++;
      var bufferStr = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, null, false, client11gPlus, done);
    }); // 79.1.7

    it('79.1.8 works with empty buffer and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bufferStr = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, null, false, client11gPlus, done);
    }); // 79.1.8

    it('79.1.9 works with empty buffer and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bufferStr = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, null, false, client11gPlus, done);
    }); // 79.1.9

    it('79.1.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, false, client11gPlus, done);
    }); // 79.1.7

    it('79.1.11 works with undefined and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, false, client11gPlus, done);
    }); // 79.1.11

    it('79.1.12 works with undefined and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, false, client11gPlus, done);
    }); // 79.1.12

    it('79.1.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: NaN, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 79.1.13

    it('79.1.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: 0, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 79.1.14

    it('79.1.15 works with buffer size 32K', function(done) {
      var sequence = insertID++;
      var size = 32768;
      var specialStr = "79.1.15";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr, false, client11gPlus, done);
    }); // 79.1.15

    it('79.1.16 works with buffer size (64K - 1)', function(done) {
      var sequence = insertID++;
      var size = 65535;
      var specialStr = "79.1.16";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr, false, client11gPlus, done);
    }); // 79.1.16

    it('79.1.17 works with buffer size (64K + 1)', function(done) {
      var sequence = insertID++;
      var size = 65537;
      var specialStr = "79.1.16";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr, true, client11gPlus, done);
    }); // 79.1.17

    it('79.1.18 works with buffer size (1MB + 1)', function(done) {
      var sequence = insertID++;
      var size = 1048577; // 1 * 1024 * 1024 + 1
      var specialStr = "79.1.18";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr, true, client11gPlus, done);
    }); // 79.1.18

    it('79.1.19 works with bind value and type mismatch', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: 200, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 79.1.19

    it('79.1.20 mixing named with positional binding', function(done) {
      var sequence = insertID++;
      var size = 50000;
      var specialStr = "79.1.20";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size } ];

      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var resultVal = result.outBinds[0];
          compareResultBufAndOriginal(resultVal, bufferStr, specialStr);
          done();
        }
      );
    }); // 79.1.20

    it('79.1.21 works with invalid BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-012: encountered invalid bind datatype in parameter 2
          (err.message).should.startWith('NJS-012:');
          done();
        }
      );
    }); // 79.1.21

    it('79.1.22 works with substr', function(done) {
      var specialStr = "79.1.22";
      var proc_79125 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79125 (lob_id IN NUMBER, lob_in_out IN OUT BLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79125;";
      var sqlRun_79125 = "begin nodb_blob_in_out_79125(:i, :io); end;";
      var proc_drop_79125 = "DROP PROCEDURE nodb_blob_in_out_79125";
      var sequence = insertID++;
      var size = 50000;
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      async.series([
        function(cb) {
          executeSQL(proc_79125, cb);
        },
        function(cb) {
          var comparedBuf = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
          plsqlBindInOut(sqlRun_79125, bindVar, comparedBuf, specialStr, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_79125, cb);
        }
      ], done);
    }); // 79.1.22

    it('79.1.23 works with UPDATE', function(done) {
      var proc_79125 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79125 (lob_id IN NUMBER, lob_in IN BLOB, lob_in_out IN OUT BLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    update nodb_tab_blob_in set blob_1 = lob_in where id = lob_id; \n" +
                       "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79125;";
      var sqlRun_79125 = "begin nodb_blob_in_out_79125(:i, :in, :io); end;";
      var proc_drop_79125 = "DROP PROCEDURE nodb_blob_in_out_79125";
      var sequence = insertID++;
      var size_1 = 40000;
      var specialStr_1 = "79.1.23_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var size_2 = 50000;
      var specialStr_2 = "79.1.23_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        in: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        io: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          executeSQL(proc_79125, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_79125, bindVar, bufferStr_1, specialStr_1, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_79125, cb);
        }
      ], done);
    }); // 79.1.23

    it('79.1.24 named binding: maxSize smaller than buffer size ( < 32K )', function(done) {
      var sequence = insertID++;
      var size = 5000;
      var specialStr = "79.1.24";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460:');
          done();
        }
      );
    }); // 79.1.24

    it('79.1.25 named binding: maxSize smaller than buffer size ( > 32K )', function(done) {
      var sequence = insertID++;
      var size = 50000;
      var specialStr = "79.1.25";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 79.1.25

    it('79.1.26 named binding: maxSize smaller than buffer size ( > 64K )', function(done) {
      if (!client11gPlus) this.skip();
      var sequence = insertID++;
      var size = 65539;
      var specialStr = "79.1.26";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 79.1.26

    it('79.1.27 positional binding: maxSize smaller than buffer size ( < 32K )', function(done) {
      var sequence = insertID++;
      var size = 500;
      var specialStr = "79.1.27";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 } ];

      connection.execute(
        "begin nodb_blob_in_out_791(:1, :2); end;",
        bindVar,
        function(err) {
          should.exist(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460:');
          done();
        }
      );
    }); // 79.1.27

    it('79.1.28 positional binding: maxSize smaller than buffer size ( > 32K )', function(done) {
      var sequence = insertID++;
      var size = 50000;
      var specialStr = "79.1.28";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 } ];

      connection.execute(
        "begin nodb_blob_in_out_791(:1, :2); end;",
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 79.1.28

    it('79.1.29 positional binding: maxSize smaller than buffer size ( > 64K )', function(done) {
      if (!client11gPlus) this.skip();
      var sequence = insertID++;
      var size = 65539;
      var specialStr = "79.1.29";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = [ sequence, { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 } ];

      connection.execute(
        "begin nodb_blob_in_out_791(:1, :2); end;",
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016:');
          done();
        }
      );
    }); // 79.1.29

    it('79.1.30 bind without maxSize', function(done) {
      var sequence = insertID++;
      var size = 50000;
      var specialStr = "79.1.30";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-016: buffer is too small for OUT binds
          (err.message).should.startWith('NJS-016');
          done();
        }
      );
    }); // 79.1.30

  }); // 79.1

  describe('79.2 BLOB, PLSQL, BIND_INOUT to RAW', function() {
    var blob_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_792 (lob_id IN NUMBER, lob_in_out IN OUT RAW) \n" +
                               "AS \n" +
                               "BEGIN \n" +
                               "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                               "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                               "END nodb_blob_in_out_792;";
    var sqlRun = "begin nodb_blob_in_out_792(:i, :io); end;";
    var proc_drop = "DROP PROCEDURE nodb_blob_in_out_792";
    var blob_proc_inout_7921 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_7921 (lob_id IN NUMBER, lob_in_out IN OUT RAW) \n" +
                               "AS \n" +
                               "BEGIN \n" +
                               "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, EMPTY_BLOB()); \n" +
                               "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                               "END nodb_blob_in_out_7921;";
    var sqlRun_7921 = "begin nodb_blob_in_out_7921(:i, :io); end;";
    var proc_drop_7921 = "DROP PROCEDURE nodb_blob_in_out_7921";

    before(function(done) {
      executeSQL(blob_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    it('79.2.1 works with EMPTY_BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7921, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7921, bindVar, "EMPTY_BLOB", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7921, cb);
        }
      ], done);
    }); // 79.2.1

    it('79.2.2 works with EMPTY_BLOB and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7921, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7921, bindVar, "EMPTY_BLOB", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7921, cb);
        }
      ], done);
    }); // 79.2.2

    it('79.2.3 works with EMPTY_BLOB and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          executeSQL(blob_proc_inout_7921, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_7921, bindVar, "EMPTY_BLOB", null, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_7921, cb);
        }
      ], done);
    }); // 79.2.3

    it('79.2.4 works with null', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, false, client11gPlus, done);
    }); // 79.2.4

    it('79.2.5 works with null and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, false, client11gPlus, done);
    }); // 79.2.5

    it('79.2.6 works with null and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, null, null, false, client11gPlus, done);
    }); // 79.2.6

    it('79.2.7 works with empty buffer', function(done) {
      var sequence = insertID++;
      var bufferStr = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, null, false, client11gPlus, done);
    }); // 79.2.7

    it('79.2.8 works with empty buffer and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bufferStr = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, null, false, client11gPlus, done);
    }); // 79.2.8

    it('79.2.9 works with empty buffer and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bufferStr = node6plus ? Buffer.from('', "utf-8") : new Buffer('', "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, null, false, client11gPlus, done);
    }); // 79.2.9

    it('79.2.10 works with undefined', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, false, client11gPlus, done);
    }); // 79.2.7

    it('79.2.11 works with undefined and maxSize set to 1', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, false, client11gPlus, done);
    }); // 79.2.11

    it('79.2.12 works with undefined and maxSize set to (64K - 1)', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: undefined, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      plsqlBindInOut(sqlRun, bindVar, undefined, null, false, client11gPlus, done);
    }); // 79.2.12

    it('79.2.13 works with NaN', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: NaN, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 79.2.13

    it('79.2.14 works with 0', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: 0, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch in parameter 2
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 79.2.14

    it('79.2.15 works with buffer size (32K - 1)', function(done) {
      var sequence = insertID++;
      var size = 32767;
      var specialStr = "79.2.15";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr, specialStr, false, client11gPlus, done);
    }); // 79.2.15

    it('79.2.16 works with buffer size 32K', function(done) {
      var sequence = insertID++;
      var size = 32768;
      var specialStr = "79.2.16";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // ORA-06502: PL/SQL: numeric or value error
          (err.message).should.startWith('ORA-06502:');
          done();
        }
      );
    }); // 79.2.16

    it('79.2.17 works with buffer size > maxSize', function(done) {
      var sequence = insertID++;
      var size = 300;
      var specialStr = "79.2.17";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size - 1 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460');
          done();
        }
      );
    }); // 79.2.17

    it('79.2.18 works with invalid BLOB', function(done) {
      var sequence = insertID++;
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: {}, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 50000 }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // NJS-012: encountered invalid bind datatype in parameter 2
          (err.message).should.startWith('NJS-012:');
          done();
        }
      );
    }); // 79.2.18

    it('79.2.19 works with substr', function(done) {
      var specialStr = "79.2.19";
      var proc_79219 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79219 (lob_id IN NUMBER, lob_in_out IN OUT RAW) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    select dbms_lob.substr(blob_1, " + specialStr.length + ", 1) into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79219;";
      var sqlRun_79219 = "begin nodb_blob_in_out_79219(:i, :io); end;";
      var proc_drop_79219 = "DROP PROCEDURE nodb_blob_in_out_79219";
      var sequence = insertID++;
      var size = 3000;
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size }
      };

      async.series([
        function(cb) {
          executeSQL(proc_79219, cb);
        },
        function(cb) {
          var comparedBuf = node6plus ? Buffer.from(specialStr, "utf-8") : new Buffer(specialStr, "utf-8");
          plsqlBindInOut(sqlRun_79219, bindVar, comparedBuf, specialStr, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_79219, cb);
        }
      ], done);
    }); // 79.2.19

    it('79.2.20 works with UPDATE', function(done) {
      var proc_79220 = "CREATE OR REPLACE PROCEDURE nodb_blob_in_out_79220 (lob_id IN NUMBER, lob_in IN RAW, lob_in_out IN OUT RAW) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_blob_in (id, blob_1) values (lob_id, lob_in_out); \n" +
                       "    update nodb_tab_blob_in set blob_1 = lob_in where id = lob_id; \n" +
                       "    select blob_1 into lob_in_out from nodb_tab_blob_in where id = lob_id; \n" +
                       "END nodb_blob_in_out_79220;";
      var sqlRun_79220 = "begin nodb_blob_in_out_79220(:i, :in, :io); end;";
      var proc_drop_79220 = "DROP PROCEDURE nodb_blob_in_out_79220";
      var sequence = insertID++;
      var size_1 = 2000;
      var specialStr_1 = "79.2.10_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var size_2 = 500;
      var specialStr_2 = "79.2.10_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        in: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: size_1 },
        io: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: 65535 }
      };

      async.series([
        function(cb) {
          executeSQL(proc_79220, cb);
        },
        function(cb) {
          plsqlBindInOut(sqlRun_79220, bindVar, bufferStr_1, specialStr_1, false, client11gPlus, cb);
        },
        function(cb) {
          executeSQL(proc_drop_79220, cb);
        }
      ], done);
    }); // 79.2.20

    it('79.2.21 works without maxSize', function(done) {
      var sequence = insertID++;
      var size = 500;
      var specialStr = "79.2.21";
      var bigStr = random.getRandomString(size, specialStr);
      var bufferStr = node6plus ? Buffer.from(bigStr, "utf-8") : new Buffer(bigStr, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT }
      };

      connection.execute(
        sqlRun,
        bindVar,
        function(err) {
          should.exist(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460:');
          done();
        }
      );
    }); // 79.2.21

  }); // 79.2

  describe('79.3 Multiple BLOBs, BIND_INOUT', function() {
    var lobs_proc_inout = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_793 (lob_id IN NUMBER, blob_1 IN OUT BLOB, blob_2 IN OUT BLOB) \n" +
                          "AS \n" +
                          "BEGIN \n" +
                          "    insert into nodb_tab_blob_in (id, blob_1, blob_2) values (lob_id, blob_1, blob_2); \n" +
                          "    select blob_1, blob_2 into blob_1, blob_2 from nodb_tab_blob_in where id = lob_id; \n" +
                          "END nodb_lobs_in_out_793;";
    var sqlRun = "begin nodb_lobs_in_out_793(:i, :lob_1, :lob_2); end;";
    var proc_drop = "DROP PROCEDURE nodb_lobs_in_out_793";

    before(function(done) {
      executeSQL(lobs_proc_inout, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    // execute plsql bind in out procedure, and verify the plsql bind out buffer
    var plsqlBindInOut = function(sqlRun, bindVar, originalBuf1, specialStr1, originalBuf2, specialStr2, case64KPlus, client11gPlus, callback) {
      connection.execute(
        sqlRun,
        bindVar,
        function(err, result) {
          if(client11gPlus === false && case64KPlus === true){
            should.exist(err);
            // NJS-051: "maxSize" must be less than 65535
            (err.message).should.startWith('NJS-051:');
            callback();
          } else {
            should.not.exist(err);
            var resultVal = result.outBinds.lob_1;
            compareResultBufAndOriginal(resultVal, originalBuf1, specialStr1);
            resultVal = result.outBinds.lob_2;
            compareResultBufAndOriginal(resultVal, originalBuf2, specialStr2);
            callback();
          }
        }
      );
    };

    it('79.3.1 bind a JPG and a 32K buffer', function(done) {
      var preparedCLOBID = 500;
      var sequence = insertID++;
      var size_1 = 32768;
      var specialStr = "79.3.1";
      var bigStr_1 = random.getRandomString(size_1, specialStr);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_lobs_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv";
          prepareTableWithBlob(sql, preparedCLOBID, cb);
        },
        function(cb) {
          connection.execute(
            "select blob from nodb_tab_lobs_in where id = :id",
            { id: preparedCLOBID },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);
              var blob = result.rows[0][0];
              connection.execute(
                sqlRun,
                {
                  i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
                  lob_1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_1 },
                  lob_2: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result) {
                  should.not.exist(err);
                  var resultVal = result.outBinds.lob_1;
                  compareResultBufAndOriginal(resultVal, bufferStr_1, specialStr);
                  var lob = result.outBinds.lob_2;
                  var blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);
                  var totalLength = 0;

                  lob.on('data', function(chunk) {
                    totalLength = totalLength + chunk.length;
                    blobData = Buffer.concat([blobData, chunk], totalLength);
                  });

                  lob.on('error', function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lob.on('end', function() {
                    fs.readFile( jpgFileName, function(err, originalData) {
                      should.not.exist(err);
                      should.strictEqual(totalLength, originalData.length);
                      originalData.should.eql(blobData);
                      cb();
                    });
                  });
                });
            });
        }
      ], done);
    }); // 79.3.1

    it('79.3.2 bind two buffers', function(done) {
      var sequence = insertID++;
      var size_1 = 30000;
      var specialStr_1 = "79.3.2_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var size_2 = 40000;
      var specialStr_2 = "79.3.2_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        lob_1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_1 },
        lob_2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_2 }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr_1, specialStr_1, bufferStr_2, specialStr_2, false, client11gPlus, done);
    }); // 79.3.2

    it('79.3.3 bind two buffers, one > (64K - 1)', function(done) {
      var sequence = insertID++;
      var size_1 = 30000;
      var specialStr_1 = "79.3.2_1";
      var bigStr_1 = random.getRandomString(size_1, specialStr_1);
      var bufferStr_1 = node6plus ? Buffer.from(bigStr_1, "utf-8") : new Buffer(bigStr_1, "utf-8");
      var size_2 = 65537;
      var specialStr_2 = "79.3.2_2";
      var bigStr_2 = random.getRandomString(size_2, specialStr_2);
      var bufferStr_2 = node6plus ? Buffer.from(bigStr_2, "utf-8") : new Buffer(bigStr_2, "utf-8");
      var bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        lob_1: { val: bufferStr_1, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_1 },
        lob_2: { val: bufferStr_2, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: size_2 }
      };

      plsqlBindInOut(sqlRun, bindVar, bufferStr_1, specialStr_1, bufferStr_2, specialStr_2, true, client11gPlus, done);
    }); // 79.3.3

  }); // 79.3

});
