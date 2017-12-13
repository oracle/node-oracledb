/* Copyright (c) 2016, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   139. fetchAsStringWithRefCursor.js
 *
 * DESCRIPTION
 *   Columns fetched from REF CURSORS can be mapped by fetchInfo settings
 *   in the execute() call. The global fetchAsString or fetchAsBuffer
 *   settings work as well.
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
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('139. fetchAsStringWithRefCursor.js', function() {
  var connection = null;
  var tableName = "nodb_tab_fetchAsRefCursor";

  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function createTable(cb) {
        var sql = "BEGIN \n" +
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
                  "            id        NUMBER(10), \n" +
                  "            content   VARCHAR2(20), \n" +
                  "            hiredate  DATE \n" +
                  "        ) \n" +
                  "    '); \n" +
                  "END;  ";

        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function insertData(cb) {
        var sql = "DECLARE \n" +
                  "    x NUMBER := 0; \n" +
                  "    n VARCHAR2(20); \n" +
                  "BEGIN \n"+
                  "    FOR i IN 1..300 LOOP \n" +
                  "        x := x + 1; \n" +
                  "        n := 'staff ' || x; \n" +
                  "        INSERT INTO " + tableName + " VALUES(x, n, TO_DATE('2012-02-18', 'YYYY-MM-DD')); \n" +
                  "    END LOOP; \n" +
                  "END; ";

        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function createProc(cb) {
        var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_fetchcursor (p_in IN NUMBER, p_out OUT SYS_REFCURSOR) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    OPEN p_out FOR \n" +
                   "        SELECT * FROM " + tableName + " WHERE id > p_in; \n" +
                   "END; ";
        connection.execute(
          proc,
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
        var sql = "DROP PROCEDURE nodb_proc_fetchcursor";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        var sql = "DROP TABLE " + tableName + " PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function restoreSettings(cb) {
        oracledb.fetchAsString = [];
        cb();
      }
    ], done);
  });

  it('139.1 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
    connection.execute(
      "begin nodb_proc_fetchcursor(:in, :out); end;",
      {
        in: 290,
        out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      },
      {
        outFormat: oracledb.OBJECT,
        fetchInfo:
        {
          "ID": { type: oracledb.STRING },
          "HIREDATE": { type: oracledb.STRING }
        }
      },
      function(err, result) {
        should.not.exist(err);
        fetchRowFromRC(result.outBinds.out, done);
      }
    );

    var fetchRowFromRC = function(rc, callback) {
      rc.getRow(function(err, row) {
        should.not.exist(err);
        if (row) {
          (row.ID).should.be.a.String();
          (row.HIREDATE).should.be.a.String();
          return fetchRowFromRC(rc, callback);
        } else {
          rc.close(function(err) {
            should.not.exist(err);
            callback();
          });
        }
      });
    }; // fetchRowFromRC()

  }); // 139.1

  it('139.2 fetchAsString takes effect as well', function(done) {

    oracledb.fetchAsString = [ oracledb.DATE ];
    connection.execute(
      "begin nodb_proc_fetchcursor(:in, :out); end;",
      {
        in: 295,
        out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      },
      { outFormat: oracledb.OBJECT },
      function(err, result) {
        should.not.exist(err);
        fetchRowFromRC(result.outBinds.out, done);
      }
    );

    var fetchRowFromRC = function(rc, callback) {
      rc.getRow(function(err, row) {
        should.not.exist(err);
        if (row) {
          (row.ID).should.not.be.a.String();
          (row.HIREDATE).should.be.a.String();
          return fetchRowFromRC(rc, callback);
        } else {
          rc.close(function(err) {
            should.not.exist(err);
            callback();
          });
        }
      });
    }; // fetchRowFromRC()

  }); // 139.2

});
