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
 *   91. fetchBlobAsBuffer4.js
 *
 * DESCRIPTION
 *   Testing BLOB binding out as Buffer.
 *
 * NUMBERING RULElist
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
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('91. fetchBlobAsBuffer4.js', function() {
  this.timeout(100000);

  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1
  var node6plus = false;  // assume node runtime version is lower than 6
  var proc_blob_in_tab = "BEGIN \n" +
                           "    DECLARE \n" +
                           "        e_table_missing EXCEPTION; \n" +
                           "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                           "    BEGIN \n" +
                           "        EXECUTE IMMEDIATE('DROP TABLE nodb_blob_1 PURGE'); \n" +
                           "    EXCEPTION \n" +
                           "        WHEN e_table_missing \n" +
                           "        THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE (' \n" +
                           "        CREATE TABLE nodb_blob_1 ( \n" +
                           "            num_1      NUMBER, \n" +
                           "            num_2      NUMBER, \n" +
                           "            blob       BLOB \n" +
                           "        ) \n" +
                           "    '); \n" +
                           "END; ";

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          if(process.versions["node"].substring(0,1) >= "6")
            node6plus = true;
          cb();
        });
      },
      function(cb) {
        connection.execute(
          proc_blob_in_tab,
          function(err) {
            should.not.exist(err);
            cb();
          });
      }
    ], done);

  }); // before

  after(function(done) {
    async.series([
      function(cb) {
        oracledb.fetchAsBuffer = [];
        connection.execute(
          "DROP TABLE nodb_blob_1 PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          });
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);

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

  var insertTable = function(sql, bindVar, callback) {
    connection.execute(
      sql,
      bindVar,
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

  describe('91.1 PLSQL FUNCTION RETURN BLOB to BUFFER', function() {
    
    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    it.skip('91.1.1 bind by position', function(done) {
      var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      var sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2); end;";
      var proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.1.1";
      var strBuf = random.getRandomString(len, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, blob) VALUES (:i1, :i2, :c)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ sequence, null, { type: oracledb.BLOB, dir: oracledb.BIND_OUT } ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );          
        },
        function(cb) {
          executeSQL(proc_drop, cb);
        }
      ], done);
    }); // 91.1.1

    it('91.1.2 bind by name', function(done) {
      var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      var sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2); end;";
      var proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.1.2";
      var strBuf = random.getRandomString(len, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, blob) VALUES (:i1, :i2, :c)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              output: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len },
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );          
        },
        function(cb) {
          executeSQL(proc_drop, cb);
        }
      ], done);
    }); // 91.1.2

  }); // 91.1

  describe('91.2 PLSQL PROCEDURE BIND OUT BLOB to BUFFER', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C OUT BLOB) \n" +
                "AS \n" +
                "BEGIN \n" +
                "    select blob into C from nodb_blob_1 where num_1 = ID_1;\n" +
                "END;";
    var sqlRun = "begin nodb_blobs_out_92 (:i1, :i2, :c); end;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_out_92";
    
    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    it.skip('91.2.1 bind by position', function(done) {
      var len = 500;
      var sequence = insertID++;
      var specialStr = "91.2.1";
      var strBuf = random.getRandomString(len, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, blob) VALUES (:i1, :i2, :c)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ sequence, null, { type: oracledb.BLOB, dir: oracledb.BIND_OUT } ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c;
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );          
        },
        function(cb) {
          executeSQL(proc_drop, cb);
        }
      ], done);
    }); // 91.2.1

    it('91.2.2 bind by name', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.2.2";
      var strBuf = random.getRandomString(len, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, blob) VALUES (:i1, :i2, :c)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len },
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c;
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );          
        },
        function(cb) {
          executeSQL(proc_drop, cb);
        }
      ], done);
    }); // 91.2.2

  }); // 91.2

  describe('91.3 PLSQL FUNCTION RETURN BLOB to RAW', function() {
    var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER) RETURN RAW \n" +
               "IS \n" +
               "    tmpLOB2 BLOB; \n" +
               "BEGIN \n" +
               "    select blob into tmpLOB2 from nodb_blob_1 where num_1 = ID_1;\n" +
               "    RETURN tmpLOB2; \n" +
               "END;";
    var sqlRun = "begin :output := nodb_blobs_out_92 (:i1, :i2); end;";
    var proc_drop = "DROP FUNCTION nodb_blobs_out_92";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    it('91.3.1 bind by name', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "91.3.1";
      var strBuf = random.getRandomString(len, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, blob) VALUES (:i1, :i2, :c)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              output: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );          
        }
      ], done);
    }); // 91.3.1

    it.skip('91.3.2 bind by position', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "91.3.2";
      var strBuf = random.getRandomString(len, specialStr);
      var content = node6plus ? Buffer.from(strBuf, "utf-8") : new Buffer(strBuf, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, blob) VALUES (:i1, :i2, :c)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [
              sequence, null, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
            ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );          
        }
      ], done);
    }); // 91.3.2

  }); // 91.3

});
