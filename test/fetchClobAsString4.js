/* Copyright (c) 2017, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   90. fetchClobAsString4.js
 *
 * DESCRIPTION
 *   Testing CLOB binding out as String.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');

describe('90. fetchClobAsString4.js', function() {

  var connection = null;
  var insertID = 1; // assume id for insert into db starts from 1
  var proc_clob_in_tab = "BEGIN \n" +
                           "    DECLARE \n" +
                           "        e_table_missing EXCEPTION; \n" +
                           "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                           "    BEGIN \n" +
                           "        EXECUTE IMMEDIATE('DROP TABLE nodb_clob_1 PURGE'); \n" +
                           "    EXCEPTION \n" +
                           "        WHEN e_table_missing \n" +
                           "        THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE (' \n" +
                           "        CREATE TABLE nodb_clob_1 ( \n" +
                           "            num_1      NUMBER, \n" +
                           "            num_2      NUMBER, \n" +
                           "            content    VARCHAR(2000), \n" +
                           "            clob       CLOB \n" +
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
          proc_clob_in_tab,
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
        oracledb.fetchAsString = [];
        connection.execute(
          "DROP TABLE nodb_clob_1 PURGE",
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

  var insertTable = function(insertSql, bindVar, callback) {
    connection.execute(
      insertSql,
      bindVar,
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rowsAffected, 1);
        callback();
      }
    );
  };

  var verifyResult = function(resultVal, specialStr, originalStr) {
    var resultLength = resultVal.length;
    var specStrLength = specialStr.length;
    should.strictEqual(resultLength, originalStr.length);
    should.strictEqual(resultVal.substring(0, specStrLength), specialStr);
    should.strictEqual(resultVal.substring(resultLength - specStrLength, resultLength), specialStr);
  };

  describe('90.1 PLSQL FUNCTION RETURN CLOB to STRING', function() {
    var proc = "CREATE OR REPLACE FUNCTION nodb_clobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN VARCHAR2) RETURN CLOB \n" +
               "IS \n" +
               "    tmpLOB4 CLOB; \n" +
               "BEGIN \n" +
               "    select clob into tmpLOB4 from nodb_clob_1 where num_1 = ID_1;\n" +
               "    RETURN tmpLOB4; \n" +
               "END;";
    var sqlRun = "begin :output := nodb_clobs_out_94 (:i1, :i2, :c); end;";
    var proc_drop = "DROP FUNCTION nodb_clobs_out_94";

    before(function(done) {
      executeSQL(proc, done);
    });

    after(function(done) {
      executeSQL(proc_drop, done);
    });

    beforeEach('set oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.CLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsString = [];
      done();
    }); // afterEach

    it('90.1.1 bind by position - 1', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "90.1.1";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, clobStr],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.1.1

    it('90.1.2 bind by name - 1', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "90.1.2";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
              output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.1.2

    it('90.1.3 bind by position - 2', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "90.1.2";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.1.3

    it('90.1.4 bind by name - 2', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "90.1.4";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN },
              output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.1.4

  }); // 90.1

  describe('90.2 PLSQL PROCEDURE BIND OUT CLOB to STRING', function() {
    var proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C1 IN VARCHAR2, C2 OUT CLOB) \n" +
                "AS \n" +
                "BEGIN \n" +
                "    select clob into C2 from nodb_clob_1 where num_1 = ID_1;\n" +
                "END;";
    var sqlRun = "begin nodb_clobs_out_92 (:i1, :i2, :c1, :c2); end;";
    var proc_drop = "DROP PROCEDURE nodb_clobs_out_92";

    before(function(done) {
      executeSQL(proc, done);
    });

    after(function(done) {
      executeSQL(proc_drop, done);
    });

    beforeEach('set oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.CLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsString = [];
      done();
    }); // afterEach

    it('90.2.1 bind by position - 1', function(done) {
      var len = 500;
      var sequence = insertID++;
      var specialStr = "90.2.1";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ sequence, null, { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN }, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len } ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.2.1

    it('90.2.2 bind by name - 1', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "90.2.2";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
              c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c2;
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.2.2

    it('90.2.3 bind by position - 2', function(done) {
      var len = 500;
      var sequence = insertID++;
      var specialStr = "90.2.3";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ sequence, sequence, null, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len } ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.2.3

    it('90.2.4 bind by name - 2', function(done) {
      var len = 400;
      var sequence = insertID++;
      var specialStr = "90.2.4";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c1: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN },
              c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.c2;
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.2.4

  }); // 90.2

  describe('90.3 PLSQL FUNCTION RETURN CLOB to VARCHAR2', function() {
    var proc = "CREATE OR REPLACE FUNCTION nodb_clobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN VARCHAR2) RETURN VARCHAR2 \n" +
               "IS \n" +
               "    tmpLOB2 CLOB; \n" +
               "BEGIN \n" +
               "    select clob into tmpLOB2 from nodb_clob_1 where num_1 = ID_1;\n" +
               "    RETURN tmpLOB2; \n" +
               "END;";
    var sqlRun = "begin :output := nodb_clobs_out_92 (:i1, :i2, :c); end;";
    var proc_drop = "DROP FUNCTION nodb_clobs_out_92";

    before(function(done) {
      executeSQL(proc, done);
    }); // before

    after(function(done) {
      executeSQL(proc_drop, done);
    }); // after

    beforeEach('set oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.CLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsString = [];
      done();
    }); // afterEach

    it('90.3.1 bind by name - 1', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "90.3.1";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
              output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.3.1

    it('90.3.2 bind by position - 1', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "90.3.1";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, clobStr ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.3.2

    it('90.3.3 bind by name - 2', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "90.3.3";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            {
              i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN },
              output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
            },
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds.output;
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.3.3

    it('90.3.4 bind by position - 2', function(done) {
      var len = 1000;
      var sequence = insertID++;
      var specialStr = "90.3.4";
      var clobStr = random.getRandomString(len, specialStr);

      async.series([
        function(cb) {
          var sql ="INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
          var bindVar = {
            i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
            c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
          };
          insertTable(sql, bindVar, cb);
        },
        function(cb) {
          connection.execute(
            sqlRun,
            [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null ],
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.outBinds[0];
              verifyResult(resultVal, specialStr, clobStr);
              cb();
            }
          );
        }
      ], done);
    }); // 90.3.4

  }); // 90.3

});
