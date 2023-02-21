/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   139. fetchAsStringWithRefCursor.js
 *
 * DESCRIPTION
 *   Columns fetched from REF CURSORS can be mapped by fetchInfo settings
 *   in the execute() call. The global fetchAsString or fetchAsBuffer
 *   settings work as well.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const async    = require('async');
const should   = require('should');
const dbConfig = require('./dbconfig.js');

describe('139. fetchAsStringWithRefCursor.js', function() {
  let connection = null;
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
        let sql = "BEGIN \n" +
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
        let sql = "DECLARE \n" +
                  "    x NUMBER := 0; \n" +
                  "    n VARCHAR2(20); \n" +
                  "BEGIN \n" +
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
        let proc = "CREATE OR REPLACE PROCEDURE nodb_proc_fetchcursor (p_in IN NUMBER, p_out OUT SYS_REFCURSOR) \n" +
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
        let sql = "DROP PROCEDURE nodb_proc_fetchcursor";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        let sql = "DROP TABLE " + tableName + " PURGE";
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
        outFormat: oracledb.OUT_FORMAT_OBJECT,
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
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
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
