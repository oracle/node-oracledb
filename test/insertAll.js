/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   158. insertAll.js
 *
 * DESCRIPTION
 *   Test INSERT ALL statements. It originates from issue 780.
 *   https://github.com/oracle/node-oracledb/issues/780
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const async    = require('async');
const dbConfig = require('./dbconfig.js');

describe('158. insertAll.js', function() {

  let conn;

  before(function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);
        conn = connection;
        done();
      }
    );
  });

  after(function(done) {
    conn.close(function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('158.1 original case from the issue', function(done) {

    var dataLength = 35000;
    var doCreate = function(cb) {
      var proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_insertall PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_insertall ( \n" +
                 "            code       NUMBER, \n" +
                 "            val        CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";
      conn.execute(
        proc,
        function(err) {
          should.not.exist(err);
          cb();
        }
      );
    };

    var doDrop = function(cb) {
      var sql = "DROP TABLE nodb_tab_insertall PURGE";
      conn.execute(
        sql,
        function(err) {
          should.not.exist(err);
          cb();
        }
      );
    };

    var doInsert = function(cb) {
      var myval = 'a'.repeat(dataLength);
      var sql = "INSERT ALL INTO nodb_tab_insertall \n" +
                "    WITH nt AS (SELECT 1, :C FROM DUAL) \n" +
                "        SELECT * FROM nt";
      conn.execute(
        sql,
        { c: { val: myval, type: oracledb.CLOB } },
        function(err, result) {
          should.not.exist(err);
          (result.rowsAffected).should.be.exactly(1);
          cb();
        }
      );
    };

    var doQuery = function(cb) {
      var sql = "select dbms_lob.getlength(val) from nodb_tab_insertall";
      conn.execute(
        sql,
        function(err, result) {
          should.not.exist(err);
          var buf = result.rows[0][0];
          should.strictEqual(buf, dataLength);
          cb();
        }
      );
    };

    async.series([
      doCreate,
      doInsert,
      doQuery,
      doDrop
    ], done);

  }); // 158.1

  it('158.2 inserts into one table', function(done) {
    async.series([
      makeTab1,
      function dotest(cb) {
        var sql = "INSERT ALL \n" +
                  "  INTO nodb_tab_ia1 (id, content) VALUES (100, :a) \n" +
                  "  INTO nodb_tab_ia1 (id, content) VALUES (200, :b) \n" +
                  "  INTO nodb_tab_ia1 (id, content) VALUES (300, :c) \n" +
                  "SELECT * FROM DUAL";
        conn.execute(
          sql,
          ['Changjie', 'Shelly', 'Chris'],
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, 3);
            cb();
          }
        );
      },
      function doverify(cb) {
        var sql = "select content from nodb_tab_ia1 order by id";
        conn.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(
              result.rows,
              [ [ 'Changjie' ], [ 'Shelly' ], [ 'Chris' ] ]
            );
            cb();
          }
        );
      },
      dropTab1
    ], done);
  }); // 158.2

  it('158.3 inserts into multiple tables', function(done) {
    async.series([
      makeTab1,
      makeTab2,
      function dotest(cb) {
        var sql = "INSERT ALL \n" +
                  "  INTO nodb_tab_ia1 (id, content) VALUES (100, :a) \n" +
                  "  INTO nodb_tab_ia1 (id, content) VALUES (200, :b) \n" +
                  "  INTO nodb_tab_ia2 (id, content) VALUES (300, :c) \n" +
                  "SELECT * FROM DUAL";
        conn.execute(
          sql,
          ['Redwood city', 'Sydney', 'Shenzhen'],
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, 3);
            cb();
          }
        );
      },
      function doverify1(cb) {
        var sql = "select content from nodb_tab_ia1 order by id";
        conn.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(
              result.rows,
              [ [ 'Redwood city' ], [ 'Sydney' ]]
            );
            cb();
          }
        );
      },
      function doverify2(cb) {
        var sql = "select content from nodb_tab_ia2 order by id";
        conn.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            should.deepEqual(
              result.rows,
              [ [ 'Shenzhen' ]]
            );
            cb();
          }
        );
      },
      dropTab1,
      dropTab2
    ], done);
  }); // 158.3

  var makeTab1 = function(cb) {
    var proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_ia1 PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_tab_ia1 ( \n" +
               "            id       NUMBER, \n" +
               "            content  VARCHAR2(100) \n" +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    conn.execute(
      proc,
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  }; // makeTab1

  var dropTab1 = function(cb) {
    var sql = "DROP TABLE nodb_tab_ia1 PURGE";
    conn.execute(
      sql,
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  };

  var makeTab2 = function(cb) {
    var proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_ia2 PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_tab_ia2 ( \n" +
               "            id       NUMBER, \n" +
               "            content  VARCHAR2(50) " +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    conn.execute(
      proc,
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  };

  var dropTab2 = function(cb) {
    var sql = "DROP TABLE nodb_tab_ia2 PURGE";
    conn.execute(
      sql,
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  };

});
