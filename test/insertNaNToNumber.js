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
 *   141. insertNaNToNumber.js
 *
 * DESCRIPTION
 *    Test inserting the JavaScript NaN into the Oracle NUMBER column.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('141. insertNaNToNumber.js', function() {

  var connection = null;
  var tableName = "nodb_number";

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('141.1 SQL, stores NaN', function() {
    before('create table, insert data',function(done) {
      assist.createTable(connection, tableName, done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('141.1.1 insert NaN to NUMBER column will report ORA-00984', function(done) {
      connection.execute(
        "insert into " + tableName + " values (1, " + NaN + ")",
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          // ORA-00984: column not allowed here
          (err.message).should.startWith("ORA-00984:");
          done();
        });
    });

    it('141.1.2 binding in NaN by name into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "insert into " + tableName + " values (:no, :c)",
        { no: 1, c: NaN },
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        }
      );
    });

    it('141.1.3 binding in NaN by position into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "insert into " + tableName + " values (:1, :2)",
        [ 1, NaN ],
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        }
      );
    });
  });

  describe('141.2 PL/SQL, Function, bind NaN', function() {
    var proc_bindin = "CREATE OR REPLACE FUNCTION nodb_bindin_fun_NaN(id IN NUMBER, value IN NUMBER) RETURN NUMBER \n" +
                      "IS \n" +
                      "    tmpvar NUMBER; \n" +
                      "BEGIN \n" +
                      "    insert into "+ tableName +" values (id, value);\n" +
                      "    select content into tmpvar from "+ tableName +" where num = id;\n" +
                      "    return tmpvar; \n" +
                      "END nodb_bindin_fun_NaN;";
    var sqlRun_bindin = "BEGIN :output := nodb_bindin_fun_NaN (:i, :c); END;";
    var sqlDrop_bindin = "DROP FUNCTION nodb_bindin_fun_NaN";

    var proc_bindinout = "CREATE OR REPLACE FUNCTION nodb_bindinout_fun_NaN(id IN NUMBER, value IN OUT NUMBER) RETURN NUMBER \n" +
                         "IS \n" +
                         "    tmpvar NUMBER; \n" +
                         "BEGIN \n" +
                         "    insert into "+ tableName +" values (id, value);\n" +
                         "    select content into tmpvar from "+ tableName +" where num = id;\n" +
                         "    select content into value from "+ tableName +" where num = id;\n" +
                         "    return tmpvar; \n" +
                         "END nodb_bindinout_fun_NaN;";
    var sqlRun_bindinout = "BEGIN :output := nodb_bindinout_fun_NaN (:i, :c); END;";
    var sqlDrop_bindinout = "DROP FUNCTION nodb_bindinout_fun_NaN";

    before('create table, insert data',function(done) {
      async.series([
        function(cb) {
          assist.createTable(connection, tableName, cb);
        },
        function(cb) {
          connection.execute(
            proc_bindin,
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
            sqlDrop_bindin,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP table " + tableName + " PURGE",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    it('141.2.1 binding in NaN by name into Oracle NUMBER column throws DPI-1055', function(done) {
      var bindVar = {
        i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      };
      connection.execute(
        sqlRun_bindin,
        bindVar,
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        });
    });

    it('141.2.2 binding in NaN by position into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "BEGIN :1 := nodb_bind_fun_NaN (:2, :3); END;",
        [ { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, 2, NaN ],
        function(err) {
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        });
    });

    it('141.2.3 binding inout NaN by name into Oracle NUMBER column throws DPI-1055', function(done) {
      async.series([
        function(cb) {
          connection.execute(
            proc_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var bindVar = {
            i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_INOUT },
            output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
          };
          connection.execute(
            sqlRun_bindinout,
            bindVar,
            function(err, result) {
              should.not.exist(result);
              should.exist(err);
              should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqlDrop_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    it('141.2.4 binding inout NaN by position into Oracle NUMBER column throws DPI-1055', function(done) {
      async.series([
        function(cb) {
          connection.execute(
            proc_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "BEGIN :1 := nodb_bindinout_fun_NaN (:2, :3); END;",
            [ { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, 1, NaN ],
            function(err, result) {
              should.not.exist(result);
              should.exist(err);
              should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqlDrop_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });
  });

  describe('141.3 PL/SQL, Procedure, bind NaN', function() {
    var proc_bindin = "CREATE OR REPLACE PROCEDURE nodb_proc_bindin_NaN(id IN NUMBER, c1 IN NUMBER, c2 OUT NUMBER) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into "+ tableName +" values (id, c1);\n" +
                      "    select content into c2 from "+ tableName +" where num = id;\n" +
                      "END nodb_proc_bindin_NaN;";
    var sqlRun_bindin = "BEGIN nodb_proc_bindin_NaN (:i, :c1, :c2); END;";
    var sqlDrop_bindin = "DROP PROCEDURE nodb_proc_bindin_NaN";

    var proc_bindinout = "CREATE OR REPLACE PROCEDURE nodb_proc_bindinout_NaN(id IN NUMBER, c1 IN OUT NUMBER) \n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    insert into "+ tableName +" values (id, c1);\n" +
                         "    select content into c1 from "+ tableName +" where num = id;\n" +
                         "END nodb_proc_bindinout_NaN;";
    var sqlRun_bindinout = "BEGIN nodb_proc_bindinout_NaN (:i, :c1); END;";
    var sqlDrop_bindinout = "DROP PROCEDURE nodb_proc_bindinout_NaN";

    before('create table, insert data',function(done) {
      async.series([
        function(cb) {
          assist.createTable(connection, tableName, cb);
        },
        function(cb) {
          connection.execute(
            proc_bindin,
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
            sqlDrop_bindin,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP table " + tableName + " PURGE",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    it('141.3.1 binding in NaN by name into Oracle NUMBER column throws DPI-1055', function(done) {
      var bindVar = {
        i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };
      connection.execute(
        sqlRun_bindin,
        bindVar,
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        });
    });

    it('141.3.2 binding in NaN by position into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "BEGIN nodb_proc_bind_NaN (:1, :2, :3); END;",
        [ 2, NaN, { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } ],
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        });
    });

    it('141.3.3 binding inout NaN by name into Oracle NUMBER column throws DPI-1055', function(done) {
      async.series([
        function(cb) {
          connection.execute(
            proc_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var bindVar = {
            i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
            c1: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_INOUT },
          };
          connection.execute(
            sqlRun_bindinout,
            bindVar,
            function(err, result) {
              should.not.exist(result);
              should.exist(err);
              should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqlDrop_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    it('141.3.4 binding inout NaN by position into Oracle NUMBER column throws DPI-1055', function(done) {
      async.series([
        function(cb) {
          connection.execute(
            proc_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "BEGIN nodb_proc_bindinout_NaN (:1, :2); END;",
            [ 1, NaN ],
            function(err, result) {
              should.not.exist(result);
              should.exist(err);
              should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqlDrop_bindinout,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });
  });

  describe('141.4 PL/SQL, Procedure, bind NaN, indexed table', function() {
    var createTable =  "BEGIN \n" +
                       "  DECLARE \n" +
                       "    e_table_missing EXCEPTION; \n" +
                       "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                       "   BEGIN \n" +
                       "     EXECUTE IMMEDIATE ('DROP TABLE nodb_NaN_indexed_table PURGE'); \n" +
                       "   EXCEPTION \n" +
                       "     WHEN e_table_missing \n" +
                       "     THEN NULL; \n" +
                       "   END; \n" +
                       "   EXECUTE IMMEDIATE (' \n" +
                       "     CREATE TABLE nodb_NaN_indexed_table (id NUMBER)  \n" +
                       "   '); \n" +
                       "END; ";
    var dropTable = "DROP table nodb_NaN_indexed_table purge";

    var proc_package = "CREATE OR REPLACE PACKAGE nodb_nan_pkg IS\n" +
                       "  TYPE idType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                       "  PROCEDURE array_in(ids IN idType);\n" +
                       "  PROCEDURE array_inout(ids IN OUT idType); \n" +
                       "END;";

    var proc_package_body = "CREATE OR REPLACE PACKAGE BODY nodb_nan_pkg IS \n" +
                            "  PROCEDURE array_in(ids IN idType) IS \n" +
                            "  BEGIN \n" +
                            "    FORALL i IN INDICES OF ids \n" +
                            "      INSERT INTO nodb_NaN_indexed_table VALUES (ids(i)); \n" +
                            "  END; \n" +
                            "  PROCEDURE array_inout(ids IN OUT depthType) IS \n" +
                            "  BEGIN \n" +
                            "    FORALL i IN INDICES OF ids \n" +
                            "      INSERT INTO nodb_NaN_indexed_table VALUES (ids(i)); \n" +
                            "      SELECT id BULK COLLECT INTO ids FROM nodb_NaN_indexed_table ORDER BY 1; \n" +
                            "  END; \n  " +
                            "END;";
    var proc_drop = "DROP PACKAGE nodb_nan_pkg";

    before('create table, insert data',function(done) {
      async.series([
        function(cb) {
          connection.execute(
            createTable,
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
            dropTable,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    });

    it('141.4.1 binding in NaN by name into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "BEGIN nodb_nan_pkg.array_in(:id_in); END;",
        {
          id_in: { type: oracledb.NUMBER,
            dir:  oracledb.BIND_IN,
            val:  [1, 0, NaN]
          }
        },
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        }
      );
    });

    it('141.4.2 binding in NaN by position into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "BEGIN nodb_nan_pkg.array_in(:1); END;",
        [ {type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val:  [1, 0, NaN]} ],
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        }
      );
    });

    it('141.4.3 binding inout NaN by name into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "BEGIN nodb_nan_pkg.array_inout(:id_in); END;",
        {
          id_in: { type: oracledb.NUMBER,
            dir:  oracledb.BIND_INOUT,
            val:  [1, 0, NaN],
            maxArraySize: 3
          }
        },
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        }
      );
    });

    it('141.4.4 binding inout NaN by position into Oracle NUMBER column throws DPI-1055', function(done) {
      connection.execute(
        "BEGIN nodb_nan_pkg.array_inout(:1); END;",
        [ {type: oracledb.NUMBER, dir:  oracledb.BIND_INOUT, val:  [1, 0, NaN], maxArraySize: 3} ],
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "DPI-1055: value is not a number (NaN) and cannot be used in Oracle numbers");
          done();
        }
      );
    });
  });
});
