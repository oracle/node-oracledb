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
 *   140. jsObjectGetter1.js
 *
 * DESCRIPTION
 *   These tests overwrite the getter methods of node-oracledb javaScript
 *   objects.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('140. jsObjectGetter1.js', function() {

  var connection = null;
  var tableName = "nodb_tab_v8getter";

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
        var proc = "BEGIN \n" +
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
                   "            department_id      NUMBER, \n" +
                   "            department_name    VARCHAR2(50) \n" +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";

        connection.execute(proc, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var sql = "INSERT INTO " + tableName + " VALUES(23, 'Jonh Smith')";

        connection.execute(sql, function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // before

  after(function(done) {
    async.series([
      function(cb) {
        var sql = "DROP TABLE " + tableName + " PURGE";
        connection.execute(sql, function(err) {
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

  describe('140.1 Negative: overwrite the getter() function of bind in objects', function() {
    var sql = "select * from " + tableName + " where department_id = :id";
    var bindObj = {id: 23};
    Object.defineProperty(bindObj, 'id', {
      get: function() {
        throw new Error('Nope');
      }
    });

    it('140.1.1 ProcessBindsByName()', function(done) {
      connection.execute(
        sql,
        bindObj,
        function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "Nope"
          );
          should.not.exist(result);
          done();
        }
      );
    });

    it('140.1.2 ProcessBindsByPos()', function(done) {
      connection.execute(
        sql,
        [bindObj],
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith("NJS-044:");
          should.not.exist(result);
          done();
        }
      );
    });
  }); // 140.1

  describe('140.2 Negative (ProcessBind): OUT bind with properties altered', function() {
    it('140.2.1 ', function(done) {
      async.series([
        function doCreateProcedure(cb) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_v8_out (p_in IN VARCHAR2, p_out OUT VARCHAR2) \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_out := 'OUT: ' || p_in; \n" +
                     "END; ";

          connection.execute(proc, function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function doTest(cb) {
          var foo = { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 };
          Object.defineProperty(foo, 'dir', {
            get: function() {
              throw new Error('No Dir');
            }
          });

          Object.defineProperty(foo, 'type', {
            get: function() {
              throw new Error('No Type');
            }
          });

          Object.defineProperty(foo, 'maxSize', {
            get: function() {
              throw new Error('No maxSize');
            }
          });

          connection.execute(
            "begin nodb_proc_v8_out(:i, :o); end;",
            {
              i: "Changjie",
              o: foo
            },
            function(err, result) {
              should.exist(err);
              should.strictEqual(
                err.message,
                "No Dir"
              );
              should.not.exist(result);
              cb();
            }
          );
        },
        function doDropProcedure(cb) {
          var sql = "drop procedure nodb_proc_v8_out";

          connection.execute(sql, function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    });
  }); // 140.2

  describe('140.3 Negative: PL/SQL Indexed Table', function() {
    before(function(done) {
      async.series([
        function doCreateTable(cb) {
          var proc =  "BEGIN \n" +
                      "  DECLARE \n" +
                      "    e_table_missing EXCEPTION; \n" +
                      "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                      "   BEGIN \n" +
                      "     EXECUTE IMMEDIATE ('DROP TABLE nodb_tab_waveheight PURGE'); \n" +
                      "   EXCEPTION \n" +
                      "     WHEN e_table_missing \n" +
                      "     THEN NULL; \n" +
                      "   END; \n" +
                      "   EXECUTE IMMEDIATE (' \n" +
                      "     CREATE TABLE nodb_tab_waveheight (beach VARCHAR2(50), depth NUMBER)  \n" +
                      "   '); \n" +
                      "END; ";

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function doCreatePkg(cb) {
          var proc = "CREATE OR REPLACE PACKAGE nodb_v8pkg IS \n" +
                     "  TYPE beachType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                     "  TYPE depthType IS TABLE OF NUMBER       INDEX BY BINARY_INTEGER; \n" +
                     "  PROCEDURE array_in(beaches IN beachType, depths IN depthType); \n" +
                     "END; ";

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function doCreatePkgbody(cb) {
          var proc = "CREATE OR REPLACE PACKAGE BODY nodb_v8pkg IS \n" +
                     "  PROCEDURE array_in(beaches IN beachType, depths IN depthType) IS \n" +
                     "  BEGIN \n" +
                     "    IF beaches.COUNT <> depths.COUNT THEN \n" +
                     "      RAISE_APPLICATION_ERROR(-20000, 'Array lengths must match for this example.');" +
                     "    END IF; \n" +
                     "    FORALL i IN INDICES OF beaches \n" +
                     "      INSERT INTO nodb_tab_waveheight (beach, depth) VALUES (beaches(i), depths(i)); \n" +
                     "  END; \n" +
                     "END;";

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // before

    after(function(done) {
      async.series([
        function doDropPkg(cb) {
          connection.execute(
            "drop package nodb_v8pkg",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function doDropTable(cb) {
          connection.execute(
            "drop table nodb_tab_waveheight",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // after

    it('140.3.1 bind an element being altered-JSON object', function(done) {
      var foo =
        {
          beach_in: { type: oracledb.STRING, dir:  oracledb.BIND_IN, val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
          depth_in: { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val:  [45, 30, 67] }
        };

      Object.defineProperty(foo, 'depth_in', {
        get: function() {
          throw new Error('No type');
        }
      });

      connection.execute(
        "BEGIN nodb_v8pkg.array_in(:beach_in, :depth_in); END;",
        foo,
        function(err) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "No type"
          );
          done();
        }
      );
    }); // 140.3.1

    it('140.3.2 GetBindTypeAndSizeFromValue()', function(done) {
      var foo = { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val:  [45, 30, 67] };
      Object.defineProperty(foo, 'type', {
        get: function() {
          throw new Error('No type');
        }
      });

      connection.execute(
        "BEGIN nodb_v8pkg.array_in(:beach_in, :depth_in); END;",
        {
          beach_in: { type: oracledb.STRING,
            dir:  oracledb.BIND_IN,
            val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
          depth_in: foo
        },
        function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "No type"
          );
          should.not.exist(result);
          done();
        }
      );
    }); // 140.3.2
  }); // 140.3

  describe('140.4 Negative: fetchInfo', function() {
    it('140.4.1 changes getter() of fetchInfo itself', function(done) {
      var foo = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo : { "TS_DATE": { type : oracledb.STRING } }
      };

      Object.defineProperty(foo, 'fetchInfo', {
        get: function() {
          throw new Error('No fetchInfo');
        }
      });

      connection.execute(
        "SELECT TO_DATE('2017-01-09', 'YYYY-DD-MM') AS TS_DATE FROM DUAL",
        [],
        foo,
        function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "No fetchInfo"
          );
          should.not.exist(result);
          done();
        }
      );

    }); // 140.4.1

    it('140.4.2 changes getter() of the value of fetchInfo object', function(done) {
      var foo = { type : oracledb.STRING };

      Object.defineProperty(foo, 'type', {
        get: function() {
          throw new Error('No type');
        }
      });

      var option = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo : { "TS_DATE": foo }
      };

      connection.execute(
        "SELECT TO_DATE('2017-01-09', 'YYYY-DD-MM') AS TS_DATE FROM DUAL",
        [],
        option,
        function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "No type"
          );
          should.not.exist(result);
          done();
        }
      );

    }); // 140.4.2
  }); // 140.4

  describe("140.5 Negative: Bool type", function() {

    var dotest = function(opt, cb) {
      var sql = "INSERT INTO " + tableName + " VALUES(1405, 'Changjie Lin')";
      connection.execute(
        sql,
        opt,
        function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "Wrong boolean value"
          );
          should.not.exist(result);
          cb();
        }
      );
    };

    it('140.5.1 option - autoCommit', function(done) {

      var options = { autoCommit: true };
      Object.defineProperty(options, 'autoCommit', {
        get: function() {
          throw new Error('Wrong boolean value');
        }
      });
      dotest(options, done);

    });

    it('140.5.2 option - extendedMetaData', function(done) {

      var options = { extendedMetaData: true };
      Object.defineProperty(options, 'extendedMetaData', {
        get: function() {
          throw new Error('Wrong boolean value');
        }
      });
      dotest(options, done);

    });
  }); // 140.5

  describe('140.6 Negative: positive Int type', function() {

    it('140.6.1 option - fetchArraySize', function(done) {

      var options = { fetchArraySize: 200 };
      Object.defineProperty(options, 'fetchArraySize', {
        get: function() {
          throw new Error('No value');
        }
      });

      var sql = "select * from " + tableName;
      connection.execute(
        sql,
        options,
        function(err, result) {
          should.exist(err);
          should.strictEqual(
            err.message,
            "No value"
          );
          should.not.exist(result);
          done();
        }
      );
    });
  }); // 140.6

  describe('140.7 Negative: Pool object', function() {

    var dotest = function(opt, cb) {
      oracledb.createPool(opt, function(err, pool) {
        should.not.exist(pool);
        should.exist(err);
        cb();
      });
    };

    it('140.7.1 String type - user', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'user', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.2 String type - password', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'password', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.3 String type - connectString', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'connectString', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.4 poolMin', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolMin', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.5 poolMax', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolMax', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.6 poolIncrement', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolIncrement', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.7 poolTimeout', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolTimeout', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.8 poolPingInterval', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolPingInterval', {
        get: function() {
          throw new Error('Nope');
        }
      });

      dotest(cred, done);
    });

    it('140.7.9 stmtCacheSize', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'stmtCacheSize', {
        get: function() {
          throw new Error('Nope');
        }
      });
      dotest(cred, done);
    });

    it('140.7.10 connecionsOpen', function(done) {

      oracledb.createPool(
        dbConfig,
        function(err, pool) {
          should.not.exist(err);

          Object.defineProperty(pool, 'connecionsOpen', {
            get: function() {
              throw new Error('Property Wrong');
            }
          });

          should.throws(
            function() {
              console.log(pool.connecionsOpen);
            },
            /Property Wrong/
          );

          pool.close(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    });

    it('140.7.11 connecionsInUse', function(done) {

      oracledb.createPool(
        dbConfig,
        function(err, pool) {
          should.not.exist(err);

          Object.defineProperty(pool, 'connecionsInUse', {
            get: function() {
              throw new Error('Property Wrong');
            }
          });
          should.throws(
            function() {
              console.log(pool.connecionsInUse);
            },
            /Property Wrong/
          );

          pool.close(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    });

  }); // 140.7

  describe('140.8 Negative: Get Connection', function()  {

    it('140.8.1 String type: user', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'user', {
        get : function() {
          throw new Error('Nope');
        }
      });

      oracledb.getConnection(cred, function(err, conn) {
        should.not.exist(conn);
        should.exist(err);
        done();
      });
    });

    it('140.8.2 String type: password', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'password', {
        get : function() {
          throw new Error('Nope');
        }
      });

      oracledb.getConnection(cred, function(err, conn) {
        should.not.exist(conn);
        should.exist(err);
        done();
      });
    });

    it('140.8.3 String type: connectionString', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'connectString', {
        get : function() {
          throw new Error('Nope');
        }
      });

      oracledb.getConnection(cred, function(err, conn) {
        should.not.exist(conn);
        should.exist(err);
        done();
      });
    });

    it('140.8.4 Constant type: privilege', function(done) {

      var cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'privilege', {
        get : function() {
          throw new Error('Nope');
        }
      });
      oracledb.getConnection(cred, function(err, conn) {
        should.not.exist(conn);
        should.exist(err);
        done();
      });
    });

  }); // 140.8

});
