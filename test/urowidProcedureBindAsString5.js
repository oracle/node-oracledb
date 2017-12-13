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
 *   145. urowidProcedureBindAsString5.js
 *
 * DESCRIPTION
 *   Testing UROWID(> 200 bytes) plsql procedure bind out as String.
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

describe('145. urowidProcedureBindAsString5.js', function() {
  var connection = null;
  var tableName_indexed = "nodb_urowid_indexed_proc";
  var tableName_normal = "nodb_urowid_normal_proc";
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
                      "            c2    VARCHAR2(3125), \n" +
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

  describe('145.1 PROCEDURE BIND_OUT as UROWID', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out_1451 (id_in IN NUMBER, content_in IN UROWID, content_out OUT UROWID)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName_normal + " (id, content) values (id_in, content_in); \n" +
                      "    select content into content_out from " + tableName_normal + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out_1451; ";
    var proc_execute = "BEGIN nodb_rowid_bind_out_1451 (:i, :c, :o); END;";
    var proc_drop = "DROP PROCEDURE nodb_rowid_bind_out_1451";

    before('create procedure', function(done) {
      sql.executeSql(connection, proc_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, proc_drop, {}, {}, done);
    });

    it('145.1.1 urowid length > 500', function(done) {
      var expectedLength = 500;
      procedureBindOut(proc_execute, expectedLength, done);
    });

    it('145.1.2 urowid length > 1000', function(done) {
      var expectedLength = 1000;
      procedureBindOut(proc_execute, expectedLength, done);
    });

    it('145.1.3 urowid length > 2000', function(done) {
      var expectedLength = 2000;
      procedureBindOut(proc_execute, expectedLength, done);
    });

  });

  describe('145.2 PROCEDURE BIND_OUT as STRING', function() {
    var proc_create = "CREATE OR REPLACE PROCEDURE nodb_rowid_bind_out_1452 (id_in IN NUMBER, content_in IN UROWID, content_out OUT VARCHAR2)\n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName_normal + " (id, content) values (id_in, content_in); \n" +
                      "    select content into content_out from " + tableName_normal + " where id = id_in; \n" +
                      "END nodb_rowid_bind_out_1452; ";
    var proc_execute = "BEGIN nodb_rowid_bind_out_1452 (:i, :c, :o); END;";
    var proc_drop = "DROP PROCEDURE nodb_rowid_bind_out_1452";

    before('create procedure', function(done) {
      sql.executeSql(connection, proc_create, {}, {}, done);
    });

    after('drop procedure', function(done) {
      sql.executeSql(connection, proc_drop, {}, {}, done);
    });

    it('145.2.1 urowid length > 500', function(done) {
      var expectedLength = 500;
      procedureBindOut(proc_execute, expectedLength, done);
    });

    it('145.2.2 urowid length > 1000', function(done) {
      var expectedLength = 1000;
      procedureBindOut(proc_execute, expectedLength, done);
    });

    it('145.2.3 urowid length > 2000', function(done) {
      var expectedLength = 2000;
      procedureBindOut(proc_execute, expectedLength, done);
    });

  });

  var procedureBindOut = function(proc_execute, expectedLength, callback) {
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
        var bindVar_out = {
          i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: urowid, type: oracledb.STRING, dir: oracledb.BIND_IN },
          o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5000 }
        };
        connection.execute(
          proc_execute,
          bindVar_out,
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.outBinds.o;
            should.strictEqual(resultVal, urowid);
            cb();
          }
        );
      }
    ], callback);
  };

});