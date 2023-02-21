/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   91. fetchBlobAsBuffer4.js
 *
 * DESCRIPTION
 *   Testing BLOB binding out as Buffer.
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

  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1
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
                           "            content    RAW(2000), \n" +
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

    it('91.1.1 bind by position - 1', function(done) {
      var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      var sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :i3); end;";
      var proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.1.1";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, content ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              var compareBuffer = assist.compare2Buffers(content, resultVal);
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

    it('91.1.2 bind by name - 1', function(done) {
      var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      var sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :c); end;";
      var proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.1.2";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
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
        },
        function(cb) {
          executeSQL(proc_drop, cb);
        }
      ], done);
    }); // 91.1.2

    it('91.1.3 bind by position - 2', function(done) {
      var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      var sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :c); end;";
      var proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.1.3";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
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
    }); // 91.1.3

    it('91.1.4 bind by name - 2', function(done) {
      var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      var sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :c); end;";
      var proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.1.4";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
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
        },
        function(cb) {
          executeSQL(proc_drop, cb);
        }
      ], done);
    }); // 91.1.4

  }); // 91.1

  describe('91.2 PLSQL PROCEDURE BIND OUT BLOB to BUFFER', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C1 IN RAW, C2 OUT BLOB) \n" +
                "AS \n" +
                "BEGIN \n" +
                "    select blob into C2 from nodb_blob_1 where num_1 = ID_1;\n" +
                "END;";
    var sqlRun = "begin nodb_blobs_out_92 (:i1, :i2, :c1, :c2); end;";
    var proc_drop = "DROP PROCEDURE nodb_blobs_out_92";

    beforeEach('set oracledb.fetchAsBuffer', function(done) {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsBuffer = [];
      done();
    }); // afterEach

    it('91.2.1 bind by position - 1', function(done) {
      var len = 500;
      var sequence = insertID++;
      var specialStr = "91.2.1";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ sequence, null, content, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len } ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
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

    it('91.2.2 bind by name - 1', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.2.2";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
              c2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c2;
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

    it('91.2.3 bind by position - 2', function(done) {
      var len = 500;
      var sequence = insertID++;
      var specialStr = "91.2.3";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ sequence, sequence, null, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len } ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
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
    }); // 91.2.3

    it('91.2.4 bind by name - 2', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "91.2.4";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c1: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
              c2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c2;
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
    }); // 91.2.4

  }); // 91.2

  describe('91.3 PLSQL FUNCTION RETURN BLOB to RAW', function() {
    var proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN VARCHAR2) RETURN RAW \n" +
               "IS \n" +
               "    tmpLOB2 BLOB; \n" +
               "BEGIN \n" +
               "    select blob into tmpLOB2 from nodb_blob_1 where num_1 = ID_1;\n" +
               "    RETURN tmpLOB2; \n" +
               "END;";
    var sqlRun = "begin :output := nodb_blobs_out_92 (:i1, :i2, :c); end;";
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

    it('91.3.1 bind by name - 1', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "91.3.1";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
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

    it('91.3.2 bind by position - 1', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "91.3.2";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [
              { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, content
            ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );
        }
      ], done);
    }); // 91.3.2

    it('91.3.3 bind by name - 2', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "91.3.3";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
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
    }); // 91.3.3

    it('91.3.4 bind by position - 2', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "91.3.4";
      var strBuf = random.getRandomString(len, specialStr);
      var content = Buffer.from(strBuf, "utf-8");

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [
              { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null
            ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              var compareBuffer = assist.compare2Buffers(resultVal, content);
              should.strictEqual(compareBuffer, true);
              cb();
            }
          );
        }
      ], done);
    }); // 91.3.4

  }); // 91.3

});
