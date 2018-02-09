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
 *   150. fetchArraySize3.js
 *
 * DESCRIPTION
 *   Binding test of fetching data from database with different oracledb.fetchArraySize
 *   Tests including:
 *     DML binding
 *     PLSQL procedure binding OUT/INOUT in indexed table
 *     PLSQL function binding OUT/INOUT in indexed table
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
  var tableSize = 1000;

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
                     "    FOR i IN 1.." + tableSize + " LOOP \n" +
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
              should.strictEqual(result.rowsAffected, tableSize - affectedRowId);
              callback();
            });
        },
        function(callback) {
          connection.execute(
            "select * from " + tableName + " where id > :num order by id",
            { num: { val: affectedRowId, dir: oracledb.BIND_IN, type: oracledb.NUMBER } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rows.length, tableSize - affectedRowId);
              verifyResult(result.rows, affectedRowId);
              callback();
            }
          );
        }
      ], cb);
    };

    var verifyResult = function(result, affectedRowId) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        verifyEachRow(index+1+affectedRowId, element);
        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    var verifyEachRow = function(index, element) {
      should.strictEqual(element[0], index);
      should.strictEqual(element[1], "something");
    };

    it("150.1.1 oracledb.fetchArraySize = 1", function(done) {
      dmlBinding(1, 50, done);
    });

    it("150.1.2 oracledb.fetchArraySize = tableSize/20", function(done) {
      dmlBinding(tableSize/20, 0, done);
    });

    it("150.1.3 oracledb.fetchArraySize = tableSize/10", function(done) {
      dmlBinding(tableSize/10, 2, done);
    });

    it("150.1.4 oracledb.fetchArraySize = tableSize", function(done) {
      dmlBinding(tableSize, 1, done);
    });

    it("150.1.5 oracledb.fetchArraySize = (table size - 1)", function(done) {
      dmlBinding(tableSize - 1 , 0, done);
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
          var rowsAffected = tableSize - updateFromId;
          should.strictEqual(result.outBinds.c.length, rowsAffected);
          proc_verifyResult_inout(result.outBinds.c, updateFromId, cb);
        }
      );
    };

    var proc_verifyResult_inout = function(result, updateFromId, callback) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        proc_verifyEachRows_inout(index, element, updateFromId);
        cb();
      }, function(err) {
        should.not.exist(err);
        callback();
      });
    };

    var proc_verifyEachRows_inout = function(index, element, updateFromId) {
      var expectedTail = index + updateFromId + 1;
      should.strictEqual(element, "something new " + expectedTail);
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
          should.strictEqual(result.outBinds.c.length, tableSize);
          proc_verifyResult_out(result.outBinds.c);
          cb();
        }
      );
    };

    var proc_verifyResult_out = function(result) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        proc_verifyEachRow_out(index, element);
        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    var proc_verifyEachRow_out = function(index, element) {
      should.strictEqual(element, index+1);
    };

    it("150.2.1 Bind OUT with oracledb.fetchArraySize = 1", function(done) {
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = 1;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.2 Bind OUT with oracledb.fetchArraySize = tableSize/20", function(done) {
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize/20;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.3 Bind OUT with oracledb.fetchArraySize = tableSize/10", function(done) {
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize/10;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.4 Bind OUT with oracledb.fetchArraySize = tableSize", function(done) {
      var maxArraySizeVal = tableSize + 1;
      var fetchArraySizeVal = tableSize;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.5 Bind OUT with oracledb.fetchArraySize = (table size - 1)", function(done) {
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize - 1;
      proc_query_out(maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.6 Bind IN OUT with oracledb.fetchArraySize = 1", function(done) {
      var updateFromId = 20;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = 1;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.7 Bind IN OUT with oracledb.fetchArraySize = tableSize/20", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize/20;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.8 Bind IN OUT with oracledb.fetchArraySize = tableSize/10", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize/10;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.9 Bind IN OUT with oracledb.fetchArraySize = tableSize", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize + 10;
      var fetchArraySizeVal = tableSize;
      proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.2.10 Bind IN OUT with oracledb.fetchArraySize = (table size - 1)", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize - 1;
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
      var rowsAffected = tableSize - updateFromId;
      should.strictEqual(result.length, rowsAffected);
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        fun_verifyEachRow_inout(index, element, updateFromId);
        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    var fun_verifyEachRow_inout = function(index, element, updateFromId) {
      if(typeof element === "string") {
        var expectedTail = index + updateFromId + 1;
        should.strictEqual(element, "something new " + expectedTail);
      } else if(typeof element === "number") {
        should.strictEqual(element, index + 1 + updateFromId);
      }
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
          should.strictEqual(result.outBinds.output.length, tableSize - affectFromId);
          fun_verifyResult_out(result.outBinds.output, affectFromId);
          cb();
        }
      );
    };

    var fun_verifyResult_out = function(result, affectFromId) {
      async.forEach(result, function(element, cb) {
        var index = result.indexOf(element);
        fun_verifyEachRow_out(index, element, affectFromId);
        cb();
      }, function(err) {
        should.not.exist(err);
      });
    };

    var fun_verifyEachRow_out = function(index, element, affectFromId) {
      should.strictEqual(element, index+1+affectFromId);
    };

    it("150.3.1 Bind OUT with oracledb.fetchArraySize = 1", function(done) {
      var affectFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = 1;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.2 Bind OUT with oracledb.fetchArraySize = tableSize/20", function(done) {
      var affectFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize/20;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.3 Bind OUT with oracledb.fetchArraySize = tableSize/10", function(done) {
      var affectFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize/10;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.4 Bind OUT with oracledb.fetchArraySize = tableSize", function(done) {
      var affectFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.5 Bind OUT with oracledb.fetchArraySize = (table size - 1)", function(done) {
      var affectFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize - 1;
      fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.6 Bind IN OUT with oracledb.fetchArraySize = 1", function(done) {
      var updateFromId = 20;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = 1;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.7 Bind IN OUT with oracledb.fetchArraySize = tableSize/20", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize/20;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.8 Bind IN OUT with oracledb.fetchArraySize = tableSize/10", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize * 2;
      var fetchArraySizeVal = tableSize/10;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.9 Bind IN OUT with oracledb.fetchArraySize = tableSize", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize * 2;
      var fetchArraySizeVal = tableSize;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

    it("150.3.10 Bind IN OUT with oracledb.fetchArraySize = (table size - 1)", function(done) {
      var updateFromId = 0;
      var maxArraySizeVal = tableSize;
      var fetchArraySizeVal = tableSize - 1;
      fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal, done);
    });

  });

});
