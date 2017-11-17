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
 *   143. urowidFunctionBindAsString4.js
 *
 * DESCRIPTION
 *   Testing UROWID(> 50 bytes) plsql function bind inout as String.
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
var sql      = require('./sql.js');
var random   = require('./random.js');

describe('143. urowidFunctionBindAsString4.js', function() {
  var connection = null;
  var tableName_indexed = "nodb_urowid_indexed";
  var tableName_normal = "nodb_urowid_normal";
  var insertID = 1;

  var table_indexed = "BEGIN \n" +
                      "    DECLARE \n" +
                      "        e_table_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                      "    BEGIN \n" +
                      "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_indexed + " PURGE' ); \n" +
                      "    EXCEPTION \n" +
                      "        WHEN e_table_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE ( ' \n" +
                      "        CREATE TABLE " + tableName_indexed + " ( \n" +
                      "            c1    NUMBER, \n" +
                      "            c2    VARCHAR2(3000), \n" +
                      "            primary key(c1, c2) \n" +
                      "        ) organization index \n" +
                      "    '); \n" +
                      "END;  ";

  var table_normal = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_normal + " PURGE' ); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE ( ' \n" +
                     "        CREATE TABLE " + tableName_normal + " ( \n" +
                     "            ID       NUMBER, \n" +
                     "            content  UROWID(4000) \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END;  ";

  var drop_table_indexed = "DROP TABLE " + tableName_indexed + " PURGE";
  var drop_table_normal = "DROP TABLE " + tableName_normal + " PURGE";

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
        sql.executeSql(connection, table_indexed, {}, {}, cb);
      },
      function(cb) {
        sql.executeSql(connection, table_normal, {}, {}, cb);
      }
    ], done);
  });

  after('release connection', function(done) {
    async.series([
      function(cb) {
        sql.executeSql(connection, drop_table_indexed, {}, {}, cb);
      },
      function(cb) {
        sql.executeSql(connection, drop_table_normal, {}, {}, cb);
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

  describe('143.1 FUNCTION BIND_INOUT as UROWID', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_inout_1121 (id_in IN NUMBER, content_inout IN OUT UROWID) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_inout); \n" +
                     "    select content into content_inout from " + tableName_normal + " where id = id_in; \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind_inout_1121 (:i, :c); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind_inout_1121";

    before('create procedure', function(done) {
      sql.executeSql(connection, fun_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, fun_drop, {}, {}, done);
    });

    it('143.1.1 urowid length > 50', function(done) {
      var exceptedLen = 50;
      funBindInOut(fun_execute, exceptedLen, done);
    });

    it('143.1.2 urowid length > 100', function(done) {
      var exceptedLen = 100;
      funBindInOut(fun_execute, exceptedLen, done);
    });

    it.skip('143.1.3 urowid length > 200', function(done) {
      var exceptedLen = 200;
      funBindInOut(fun_execute, exceptedLen, done);
    });

    it.skip('143.1.4 urowid length > 500', function(done) {
      var exceptedLen = 500;
      funBindInOut(fun_execute, exceptedLen, done);
    });

  });

  describe('143.2 FUNCTION BIND_INOUT as string', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_inout_1121 (id_in IN NUMBER, content_inout IN OUT VARCHAR2) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_inout); \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind_inout_1121 (:i, :c); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind_inout_1121";

    before('create procedure', function(done) {
      sql.executeSql(connection, fun_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, fun_drop, {}, {}, done);
    });

    it('143.2.1 urowid length > 50', function(done) {
      var exceptedLen = 50;
      funBindInOut(fun_execute, exceptedLen, done);
    });

    it('143.2.2 urowid length > 100', function(done) {
      var exceptedLen = 100;
      funBindInOut(fun_execute, exceptedLen, done);
    });

    it.skip('143.2.3 urowid length > 200', function(done) {
      var exceptedLen = 200;
      funBindInOut(fun_execute, exceptedLen, done);
    });

    it.skip('143.2.4 urowid length > 500', function(done) {
      var exceptedLen = 500;
      funBindInOut(fun_execute, exceptedLen, done);
    });

  });

  describe('143.3 FUNCTION BIND_INOUT, UPDATE', function() {
    var fun_create = "CREATE OR REPLACE FUNCTION nodb_rowid_bind_1443 (id_in IN NUMBER, content_1 IN OUT VARCHAR2, content_2 IN OUT UROWID) RETURN UROWID\n" +
                     "IS \n" +
                     "    tmp UROWID; \n" +
                     "BEGIN \n" +
                     "    insert into " + tableName_normal + " (id, content) values (id_in, content_1); \n" +
                     "    update " + tableName_normal + " set content = content_2 where id = id_in; \n" +
                     "    select content into tmp from " + tableName_normal + " where id = id_in; \n" +
                     "    select content into content_1 from " + tableName_normal + " where id = id_in; \n" +
                     "    return tmp; \n" +
                     "END; ";
    var fun_execute = "BEGIN :o := nodb_rowid_bind_1443 (:i, :c1, :c2); END;";
    var fun_drop = "DROP FUNCTION nodb_rowid_bind_1443";

    before('create procedure', function(done) {
      sql.executeSql(connection, fun_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, fun_drop, {}, {}, done);
    });

    it('143.3.1 update with UROWID > 50', function(done) {
      var contentLen_1 = 10;
      var contentLen_2 = 50;
      funBindOut_update(fun_execute, contentLen_1, contentLen_2, done);
    });

    it('143.3.2 update with UROWID > 100', function(done) {
      var contentLen_1 = 50;
      var contentLen_2 = 100;
      funBindOut_update(fun_execute, contentLen_1, contentLen_2, done);
    });

    it.skip('143.3.3 update with UROWID > 200', function(done) {
      var contentLen_1 = 50;
      var contentLen_2 = 200;
      funBindOut_update(fun_execute, contentLen_1, contentLen_2, done);
    });

  });

  var funBindInOut = function(fun_execute, expectedLength, callback) {
    var str = random.getRandomLengthString(expectedLength);
    var urowid, urowidLen;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + insertID,
          function(err, result) {
            should.not.exist(err);
            urowid = result.rows[0][0];
            urowidLen = urowid.length;
            urowidLen.should.be.above(expectedLength);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar_in = {
          i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: urowid, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
          o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        };
        connection.execute(
          fun_execute,
          bindVar_in,
          function(err, result) {
            if(urowidLen > 200) {
              should.exist(err);
              // ORA-06502: PL/SQL: numeric or value error: character string buffer too small
              (err.message).should.startWith('ORA-06502:');
            } else {
              should.not.exist(err);
              var resultVal_1 = result.outBinds.c;
              var resultVal_2 = result.outBinds.o;
              should.strictEqual(resultVal_1, urowid);
              should.strictEqual(resultVal_2, urowid);
            }
            cb();
          }
        );
      }
    ], callback);
  };

  var funBindOut_update = function(fun_exec, contentLen_1, contentLen_2, callback) {
    var str_1 = random.getRandomLengthString(contentLen_1);
    var str_2 = random.getRandomLengthString(contentLen_2);
    var urowid_1, urowid_2, urowidLen_2, id_1, id_2;
    async.series([
      function(cb) {
        id_1 = insertID;
        var sql_insert = "insert into " + tableName_indexed + " values (" + id_1 + ", '" + str_1 + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + id_1,
          function(err, result) {
            should.not.exist(err);
            urowid_1 = result.rows[0][0];
            cb();
          }
        );
      },
      function(cb) {
        id_2 = insertID++;
        var sql_insert = "insert into " + tableName_indexed + " values (" + id_2 + ", '" + str_2 + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + id_2,
          function(err, result) {
            should.not.exist(err);
            urowid_2 = result.rows[0][0];
            urowidLen_2 = urowid_2.length;
            cb();
          }
        );
      },
      function(cb) {
        var bindVar_in = {
          i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c1: { val: urowid_1, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
          c2: { val: urowid_2, type: oracledb.STRING, dir: oracledb.BIND_INOUT },
          o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        };
        connection.execute(
          fun_exec,
          bindVar_in,
          function(err, result) {
            if(urowidLen_2 > 200) {
              should.exist(err);
              // ORA-06502: PL/SQL: numeric or value error
              (err.message).should.startWith('ORA-06502:');
            } else {
              should.not.exist(err);
              var resultVal_1 = result.outBinds.c1;
              var resultVal_2 = result.outBinds.o;
              should.strictEqual(resultVal_2, urowid_2);
              should.strictEqual(resultVal_1, urowid_2);
            }
            cb();
          }
        );
      }
    ], callback);
  };

});