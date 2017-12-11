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
 *   150. fetchArraySize3.js
 *
 * DESCRIPTION
 *   Binding test of fetching data from database with different oracledb.fetchArraySize
 *   Tests including:
 *     DML binding
 *     PLSQL procedure binding OUT/INOUT in indexed table
 *     PLSQL function binding OUT/INOUT in indexed table
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
var dbConfig = require('./dbconfig.js');

describe("150. fetchArraySize3.js", function() {

  var connection = null;
  var default_fetcArraySize = oracledb.fetchArraySize;
  var default_maxRows = oracledb.maxRows;
  var tableName = "nodb_fetchArraySize_150";

  var create_table = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE (' \n" +
                     "        CREATE TABLE " + tableName + " ( \n" +
                     "            id         NUMBER, \n" +
                     "            content    VARCHAR(2000) \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "    FOR i IN 1..1000 LOOP \n" +
                     "         EXECUTE IMMEDIATE (' \n" +
                     "             insert into " + tableName + " values (' || i || ',' || to_char(i) ||') \n" +
                     "        '); \n" +
                     "    END LOOP; \n" +
                     "    commit; \n" +
                     "END; ";

  var drop_table = "DROP TABLE " + tableName + " PURGE";

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.strictEqual(default_fetcArraySize, 100);
      should.strictEqual(default_maxRows, 0);
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after(function(done) {
    connection.close(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe("150.1 DML binding", function() {

    before(function(done) {
      connection.execute(
        create_table,
        function(err){
          should.not.exist(err);
          done() ;
        }
      );
    });

    after(function(done) {
      connection.execute(
        drop_table,
        function(err){
          should.not.exist(err);
          done();
        }
      );
    });

    afterEach(function(done) {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    var dmlBinding = function(fetchArraySize, affectedRowId, cb) {
      oracledb.fetchArraySize = fetchArraySize;
      async.series([
        function(callback) {
          connection.execute(
            "update " + tableName + " set content = :c where id > :num",
            {
              num: { val: affectedRowId, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
              c: { val: "something", dir: oracledb.BIND_IN, type: oracledb.STRING }
            },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1000 - affectedRowId);
              callback();
            });
        },
        function(callback) {
          connection.execute(
            "select * from " + tableName + " where id > :num order by id",
            { num: { val: affectedRowId, dir: oracledb.BIND_IN, type: oracledb.NUMBER } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rows.length, 1000 - affectedRowId);
              verifyResult(result.rows);
              callback();
            }
          );
        }
      ], cb);
    };

    var verifyResult = function(result) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        should.strictEqual(element[0], index+50+1);
        should.strictEqual(element[1], "something");
        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    it("150.1.1 oracledb.fetchArraySize = 1", function(done) {
      dmlBinding(1, 50, done);
    });

    it("150.1.2 oracledb.fetchArraySize = 50", function(done) {
      dmlBinding(50, 50, done);
    });

    it("150.1.3 oracledb.fetchArraySize = 100", function(done) {
      dmlBinding(100, 50, done);
    });

    it("150.1.4 oracledb.fetchArraySize = 1000", function(done) {
      dmlBinding(1000, 50, done);
    });

  });

  describe("150.2 procedure binding", function() {

    var proc_package = "CREATE OR REPLACE PACKAGE nodb_ref_pkg IS\n" +
                       "    TYPE idType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                       "    TYPE stringType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                       "    PROCEDURE array_out(ids OUT idType);\n" +
                       "    PROCEDURE array_inout(id_in IN NUMBER, contents IN OUT stringType); \n" +
                       "END;";

    var proc_package_body = "CREATE OR REPLACE PACKAGE BODY nodb_ref_pkg IS \n" +
                            "    PROCEDURE array_out(ids OUT idType) IS \n" +
                            "    BEGIN \n" +
                            "        SELECT id BULK COLLECT INTO ids from " + tableName + " order by 1; \n" +
                            "    END; \n" +
                            "    PROCEDURE array_inout(id_in IN NUMBER, contents IN OUT stringType) IS \n" +
                            "    BEGIN \n" +
                            "        update " + tableName + " set content = (contents(1)||' '||to_char(id)) where id > id_in; \n" +
                            "        SELECT content BULK COLLECT INTO contents FROM " + tableName + " where id > id_in ORDER BY id; \n" +
                            "    END; \n  " +
                            "END;";
    var proc_drop = "DROP PACKAGE nodb_ref_pkg";

    before(function(done) {
      async.series([
        function(cb) {
          connection.execute(
            create_table,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc_package,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc_package_body,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    after(function(done) {
      async.series([
        function(cb) {
          connection.execute(
            proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            drop_table,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    afterEach(function(done) {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    var proc_query_inout = function(updateFromId, maxArraySizeVal, fetchArraySizeVal, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      connection.execute(
        "BEGIN nodb_ref_pkg.array_inout(:id_in, :c); END;",
        {
          id_in: { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val: updateFromId },
          c: { type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ["something new"], maxArraySize: maxArraySizeVal },
        },
        function(err, result) {
          should.not.exist(err);
          var rowsAffected = 1000 - updateFromId;
          should.strictEqual(result.outBinds.c.length, rowsAffected);
          proc_verifyResult_inout(result.outBinds.c, updateFromId, cb);
        }
      );
    };

    var proc_verifyResult_inout = function(result, updateFromId, callback) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        var expectedTail = index + updateFromId + 1;
        should.strictEqual(element, "something new " + expectedTail);
        cb();
      }, function(err) {
        should.not.exist(err);
        callback();
      });
    };

    var proc_query_out = function(maxArraySizeVal, fetchArraySizeVal, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      connection.execute(
        "BEGIN nodb_ref_pkg.array_out(:c); END;",
        {
          c: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: maxArraySizeVal },
        },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.c.length, 1000);
          proc_verifyResult_out(result.outBinds.c);
          cb();
        }
      );
    };

    var proc_verifyResult_out = function(result) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        should.strictEqual(element, index+1);
        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    it("150.2.1 Bind OUT with oracledb.fetchArraySize = 1", function(done) {
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 1;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.2 Bind OUT with oracledb.fetchArraySize = 50", function(done) {
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 50;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.3 Bind OUT with oracledb.fetchArraySize = 100", function(done) {
      var maxArraySizeVal = 10000;
      var fetchArraySizeVal = 100;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.4 Bind OUT with oracledb.fetchArraySize = 1000", function(done) {
      var maxArraySizeVal = 2000;
      var fetchArraySizeVal = 1000;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.5 Bind IN OUT with oracledb.fetchArraySize = 1", function(done) {
      var updateFromId = 20;
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 1;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.6 Bind IN OUT with oracledb.fetchArraySize = 50", function(done) {
      var updateFromId = 20;
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 50;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.7 Bind IN OUT with oracledb.fetchArraySize = 100", function(done) {
      var updateFromId = 10;
      var maxArraySizeVal = 2000;
      var fetchArraySizeVal = 100;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.8 Bind IN OUT with oracledb.fetchArraySize = 1000", function(done) {
      var updateFromId = 5;
      var maxArraySizeVal = 2000;
      var fetchArraySizeVal = 1000;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

  });

  describe("150.3 function binding", function() {

    var proc_package = "CREATE OR REPLACE PACKAGE nodb_ref_fun_pkg AS\n" +
                       "    TYPE idType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                       "    TYPE stringType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                       "    FUNCTION array_out(id_in IN NUMBER) RETURN idType;\n" +
                       "    FUNCTION array_inout(id_in IN NUMBER, contents IN OUT stringType) RETURN idType; \n" +
                       "END;";

    var proc_package_body = "CREATE OR REPLACE PACKAGE BODY nodb_ref_fun_pkg AS \n" +
                            "    FUNCTION array_out(id_in IN NUMBER) RETURN idType AS \n" +
                            "        tmp_id1 idType; \n" +
                            "    BEGIN \n" +
                            "        SELECT id BULK COLLECT INTO tmp_id1 from " + tableName + " where id > id_in ORDER BY 1; \n" +
                            "        RETURN tmp_id1; \n" +
                            "    END; \n" +
                            "    FUNCTION array_inout(id_in IN NUMBER, contents IN OUT stringType) RETURN idType AS \n" +
                            "        tmp_id2 idType; \n" +
                            "    BEGIN \n" +
                            "        update " + tableName + " set content = (contents(1)||' '||to_char(id)) where id > id_in; \n" +
                            "        SELECT content BULK COLLECT INTO contents FROM " + tableName + " where id > id_in ORDER BY id; \n" +
                            "        SELECT id BULK COLLECT INTO tmp_id2 FROM " + tableName + " where id > id_in ORDER BY 1; \n" +
                            "        RETURN tmp_id2; \n" +
                            "    END; \n  " +
                            "END;";
    var proc_drop = "DROP PACKAGE nodb_ref_fun_pkg";

    before(function(done) {
      async.series([
        function(cb) {
          connection.execute(
            create_table,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc_package,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc_package_body,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    after(function(done) {
      async.series([
        function(cb) {
          connection.execute(
            proc_drop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            drop_table,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    afterEach(function(done) {
      oracledb.fetchArraySize = default_fetcArraySize;
      oracledb.maxRows = default_maxRows;
      done();
    });

    var fun_query_inout = function(updateFromId, maxArraySizeVal, fetchArraySizeVal, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      connection.execute(
        "BEGIN :output := nodb_ref_fun_pkg.array_inout(:id_in, :c_inout); END;",
        {
          id_in: { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val: updateFromId },
          c_inout: { type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ["something new"], maxArraySize: maxArraySizeVal },
          output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: maxArraySizeVal }
        },
        function(err, result) {
          should.not.exist(err);
          fun_verifyResult_inout(result.outBinds.c_inout, updateFromId);
          fun_verifyResult_inout(result.outBinds.output, updateFromId);
          cb();
        }
      );
    };

    var fun_verifyResult_inout = function(result, updateFromId) {
      var rowsAffected = 1000-updateFromId;
      should.strictEqual(result.length, rowsAffected);
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        if(typeof element === "string") {
          var expectedTail = index + updateFromId + 1;
          should.strictEqual(element, "something new " + expectedTail);
        } else if(typeof element === "number") {
          should.strictEqual(element, index + 1 + updateFromId);
        }

        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    var fun_query_out = function(affectFromId, maxArraySizeVal, fetchArraySizeVal, cb) {
      oracledb.fetchArraySize = fetchArraySizeVal;
      connection.execute(
        "BEGIN :output := nodb_ref_fun_pkg.array_out(:c); END;",
        {
          c: { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: affectFromId },
          output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: maxArraySizeVal }
        },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.output.length, 1000-affectFromId);
          fun_verifyResult_out(result.outBinds.output, affectFromId);
          cb();
        }
      );
    };

    var fun_verifyResult_out = function(result, affectFromId) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        should.strictEqual(element, index+1+affectFromId);
        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    it("150.3.1 Bind OUT with oracledb.fetchArraySize = 1", function(done) {
      var affectFromId = 10;
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 1;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.2 Bind OUT with oracledb.fetchArraySize = 50", function(done) {
      var affectFromId = 20;
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 50;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.3 Bind OUT with oracledb.fetchArraySize = 100", function(done) {
      var affectFromId = 5;
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 100;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.4 Bind OUT with oracledb.fetchArraySize = 1000", function(done) {
      var affectFromId = 100;
      var maxArraySizeVal = 10000;
      var fetchArraySizeVal = 1000;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.5 Bind IN OUT with oracledb.fetchArraySize = 1", function(done) {
      var updateFromId = 20;
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 1;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.6 Bind IN OUT with oracledb.fetchArraySize = 50", function(done) {
      var updateFromId = 20;
      var maxArraySizeVal = 1000;
      var fetchArraySizeVal = 50;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.7 Bind IN OUT with oracledb.fetchArraySize = 100", function(done) {
      var updateFromId = 10;
      var maxArraySizeVal = 2000;
      var fetchArraySizeVal = 100;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.8 Bind IN OUT with oracledb.fetchArraySize = 1000", function(done) {
      var updateFromId = 5;
      var maxArraySizeVal = 2000;
      var fetchArraySizeVal = 1000;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

  });

});
