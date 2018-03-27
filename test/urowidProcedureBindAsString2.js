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
 *   119. urowidProcedureBindAsString2.js
 *
 * DESCRIPTION
 *   Testing UROWID(< 200 bytes) plsql procedure bind out as String.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var sql      = require('./sql.js');

describe('119. urowidProcedureBindAsString2.js', function() {
  var connection = null;
  var tableName = "nodb_rowid_plsql_out";
  var insertID = 1;

  var proc_create_table = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE ( ' \n" +
                          "        CREATE TABLE " + tableName + " ( \n" +
                          "            ID       NUMBER, \n" +
                          "            content  UROWID \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END;  ";
  var drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get connection and create table', function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function(cb) {
        sql.executeSql(connection, proc_create_table, {}, {}, cb);
      }
    ], done);
  });

  after('release connection', function(done) {
    async.series([
      function(cb) {
        sql.executeSql(connection, drop_table, {}, {}, cb);
      },
      function(cb) {
        connection.release( function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  });

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('119.1 PROCEDURE BIND_OUT as UROWID', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out (id_in IN NUMBER, content_in IN UROWID, content_out OUT UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_in)); \n" +
                      "    select content into content_out from " + tableName + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out; ";
    var proc_execute = "BEGIN nodb_rowid_bind_out (:i, :c, :o); END;";
    var proc_drop = "DROP PROCEDURE nodb_rowid_bind_out";

    before('create procedure', function(done) {
      sql.executeSql(connection, proc_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, proc_drop, {}, {}, done);
    });

    it('119.1.1 works with null', function(done) {
      var content = null;
      procedureBindOut(proc_execute, content, content, done);
    });

    it('119.1.2 works with empty string', function(done) {
      var content = "";
      procedureBindOut(proc_execute, content, null, done);
    });

    it('119.1.3 works with undefined', function(done) {
      var content = undefined;
      procedureBindOut(proc_execute, content, null, done);
    });

    it('119.1.4 works with NaN', function(done) {
      var content = NaN;
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
        done();
      });
    });

    it('119.1.5 works with extended ROWID', function(done) {
      var content = "AAAB12AADAAAAwPAAA";
      procedureBindOut(proc_execute, content, content, done);
    });

    it('119.1.6 works with restricted ROWID', function(done) {
      var content = "00000DD5.0000.0101";
      procedureBindOut(proc_execute, content, content, done);
    });

    it('119.1.7 works with string 0', function(done) {
      var content = "0";
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        (err.message).should.startWith("ORA-01410:");
        // ORA-01410: invalid ROWID
        done();
      });
    });

    it('119.1.8 works with number 0', function(done) {
      var content = 0;
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
        done();
      });
    });

    it('119.1.9 works with default bind type/dir - extended ROWID', function(done) {
      var content = "AAAB1+AADAAAAwPAAA";
      procedureBindOut_default(proc_execute, content, content, done);
    });

    it('119.1.10 works with default bind type/dir - null value', function(done) {
      var content = null;
      procedureBindOut_default(proc_execute, content, content, done);
    });

    it('119.1.11 works with default bind type/dir - empty string', function(done) {
      var content = "";
      procedureBindOut_default(proc_execute, content, null, done);
    });

    it('119.1.12 works with default bind type/dir - undefined', function(done) {
      var content = undefined;
      procedureBindOut_default(proc_execute, content, null, done);
    });

    it('119.1.13 bind error: NJS-037', function(done) {
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
        done();
      });
    });

    it('119.1.14 bind error: NJS-052', function(done) {
      var bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }, { type: oracledb.STRING, dir: oracledb.BIND_OUT } ];
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 2');
        done();
      });
    });

  });

  describe('119.2 PROCEDURE BIND_OUT as string', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out (id_in IN NUMBER, content_in IN UROWID, content_out OUT VARCHAR2)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_in)); \n" +
                      "    select content into content_out from " + tableName + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out; ";
    var proc_execute = "BEGIN nodb_rowid_bind_out (:i, :c, :o); END;";
    var proc_drop = "DROP PROCEDURE nodb_rowid_bind_out";

    before('create procedure', function(done) {
      sql.executeSql(connection, proc_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, proc_drop, {}, {}, done);
    });

    it('119.2.1 works with null', function(done) {
      var content = null;
      procedureBindOut(proc_execute, content, content, done);
    });

    it('119.2.2 works with empty string', function(done) {
      var content = "";
      procedureBindOut(proc_execute, content, null, done);
    });

    it('119.2.3 works with undefined', function(done) {
      var content = undefined;
      procedureBindOut(proc_execute, content, null, done);
    });

    it('119.2.4 works with NaN', function(done) {
      var content = NaN;
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
        done();
      });
    });

    it('119.2.5 works with extended ROWID', function(done) {
      var content = "AAAB12AADAAAAwPAAA";
      procedureBindOut(proc_execute, content, content, done);
    });

    it('119.2.6 works with restricted ROWID', function(done) {
      var content = "00000DD5.0000.0101";
      procedureBindOut(proc_execute, content, content, done);
    });

    it('119.2.7 works with string 0', function(done) {
      var content = "0";
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        (err.message).should.startWith("ORA-01410:");
        // ORA-01410: invalid ROWID
        done();
      });
    });

    it('119.2.8 works with number 0', function(done) {
      var content = 0;
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: content, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-011: encountered bind value and type mismatch');
        done();
      });
    });

    it('119.2.9 works with default bind type/dir - extended ROWID', function(done) {
      var content = "AAAB1+AADAAAAwPAAA";
      procedureBindOut_default(proc_execute, content, content, done);
    });

    it('119.2.10 works with default bind type/dir - null value', function(done) {
      var content = null;
      procedureBindOut_default(proc_execute, content, content, done);
    });

    it('119.2.11 works with default bind type/dir - empty string', function(done) {
      var content = "";
      procedureBindOut_default(proc_execute, content, null, done);
    });

    it('119.2.12 works with default bind type/dir - undefined', function(done) {
      var content = undefined;
      procedureBindOut_default(proc_execute, content, null, done);
    });

    it('119.2.13 bind error: NJS-037', function(done) {
      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-037: invalid data type at array index 0 for bind ":c"');
        done();
      });
    });

    it('119.2.14 bind error: NJS-052', function(done) {
      var bindVar = [ insertID, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN }, { type: oracledb.STRING, dir: oracledb.BIND_OUT } ];
      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        should.strictEqual(err.message, 'NJS-052: invalid data type at array index 0 for bind position 2');
        done();
      });
    });

  });

  describe('119.3 PROCEDURE BIND_IN, UPDATE', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_1083 (id_in IN NUMBER, content_1 IN STRING, content_2 IN UROWID, content_out OUT UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " (id, content) values (id_in, CHARTOROWID(content_1)); \n" +
                      "    update " + tableName + " set content = content_2 where id = id_in; \n" +
                      "    select content into content_out from " + tableName + " where id = id_in; \n" +
                      "END nodb_rowid_bind_1083; ";
    var proc_execute = "BEGIN nodb_rowid_bind_1083 (:i, :c1, :c2, :o); END;";
    var proc_drop = "DROP PROCEDURE nodb_rowid_bind_1083";

    before('create procedure', function(done) {
      sql.executeSql(connection, proc_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, proc_drop, {}, {}, done);
    });

    it('119.3.1 update null with UROWID', function(done) {
      var content_1 = null;
      var content_2 = "AAAB12AADAAAAwPAAA";
      procedureBindOut_update(proc_execute, content_1, content_2, content_2, done);
    });

    it('119.3.2 update empty string with UROWID', function(done) {
      var content_1 = "";
      var content_2 = "AAAB12AADAAAAwPAAA";
      procedureBindOut_update(proc_execute, content_1, content_2, content_2, done);
    });

    it('119.3.3 update undefined with UROWID', function(done) {
      var content_1 = undefined;
      var content_2 = "AAAB12AADAAAAwPAAA";
      procedureBindOut_update(proc_execute, content_1, content_2, content_2, done);
    });

    it('119.3.4 works with default bind type/dir', function(done) {
      var content_1 = "AAAB1+AADAAAAwPAAA";
      var content_2 = "0";

      var bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
        c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_IN },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };

      sql.executeSqlWithErr(connection, proc_execute, bindVar, {}, function(err) {
        (err.message).should.startWith("ORA-01410:");
        // ORA-01410: invalid ROWID
        done();
      });
    });

    it('119.3.5 works with default bind type/dir - null value', function(done) {
      var content_1 = "AAAB12AADAAAAwPAAA";
      var content_2 = null;
      procedureBindOut_update_default(proc_execute, content_1, content_2, null, done);
    });

    it('119.3.6 works with default bind type/dir - empty string', function(done) {
      var content_1 = "AAAB12AADAAAAwPAAA";
      var content_2 = "";
      procedureBindOut_update_default(proc_execute, content_1, content_2, null, done);
    });

    it('119.3.7 works with default bind type/dir - undefined', function(done) {
      var content_1 = "AAAB12AADAAAAwPAAA";
      var content_2 = undefined;
      procedureBindOut_update_default(proc_execute, content_1, content_2, null, done);
    });

  });

  var procedureBindOut = function(proc_execute, content_in, expected, callback) {
    var bindVar_out = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { val: content_in, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    connection.execute(
      proc_execute,
      bindVar_out,
      function(err, result) {
        should.not.exist(err);
        var resultVal = result.outBinds.o;
        should.strictEqual(resultVal, expected);
        callback();
      }
    );
  };

  var procedureBindOut_default = function(proc_execute, content_in, expected, callback) {
    var bindVar_out = {
      i: insertID,
      c: content_in,
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    connection.execute(
      proc_execute,
      bindVar_out,
      function(err, result) {
        should.not.exist(err);
        var resultVal = result.outBinds.o;
        should.strictEqual(resultVal, expected);
        callback();
      }
    );
  };

  var procedureBindOut_update = function(proc_execute, content_1, content_2, expected, callback) {
    var bindVar_in = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c1: { val: content_1, type: oracledb.STRING, dir: oracledb.BIND_IN },
      c2: { val: content_2, type: oracledb.STRING, dir: oracledb.BIND_IN },
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    connection.execute(
      proc_execute,
      bindVar_in,
      function(err, result) {
        should.not.exist(err);
        var resultVal = result.outBinds.o;
        should.strictEqual(resultVal, expected);
        callback();
      }
    );
  };

  var procedureBindOut_update_default = function(proc_execute, content_1, content_2, expected, callback) {
    var bindVar_in = {
      i: insertID,
      c1: content_1,
      c2: content_2,
      o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
    };
    connection.execute(
      proc_execute,
      bindVar_in,
      function(err, result) {
        should.not.exist(err);
        var resultVal = result.outBinds.o;
        should.strictEqual(resultVal, expected);
        callback();
      }
    );
  };
});
