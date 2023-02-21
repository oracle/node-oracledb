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
 *   141. insertNaNToNumber.js
 *
 * DESCRIPTION
 *    Test inserting the JavaScript NaN into the Oracle NUMBER column.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('141. insertNaNToNumber.js', function() {

  let connection;
  const tableName = "nodb_number";

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('141.1 SQL, stores NaN', function() {
    before('create table, insert data', async function() {
      const sql = assist.sqlCreateTable(tableName);
      await connection.execute(sql);
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('141.1.1 insert NaN to NUMBER column will report ORA-00984', async function() {
      const sql = "insert into " + tableName + " values (1, " + NaN + ")";
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql),
        /ORA-00984:/
      );
    });

    it('141.1.2 binding in NaN by name into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "insert into " + tableName + " values (:no, :c)";
      const binds = { no: 1, c: NaN };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

    it('141.1.3 binding in NaN by position into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "insert into " + tableName + " values (:1, :2)";
      const binds = [ 1, NaN ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

  });

  describe('141.2 PL/SQL, Function, bind NaN', function() {
    const proc_bindin = "CREATE OR REPLACE FUNCTION nodb_bindin_fun_NaN(id IN NUMBER, value IN NUMBER) RETURN NUMBER \n" +
                      "IS \n" +
                      "    tmpvar NUMBER; \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " values (id, value);\n" +
                      "    select content into tmpvar from " + tableName + " where num = id;\n" +
                      "    return tmpvar; \n" +
                      "END nodb_bindin_fun_NaN;";
    const sqlRun_bindin = "BEGIN :output := nodb_bindin_fun_NaN (:i, :c); END;";
    const sqlDrop_bindin = "DROP FUNCTION nodb_bindin_fun_NaN";

    const proc_bindinout = "CREATE OR REPLACE FUNCTION nodb_bindinout_fun_NaN(id IN NUMBER, value IN OUT NUMBER) RETURN NUMBER \n" +
                         "IS \n" +
                         "    tmpvar NUMBER; \n" +
                         "BEGIN \n" +
                         "    insert into " + tableName + " values (id, value);\n" +
                         "    select content into tmpvar from " + tableName + " where num = id;\n" +
                         "    select content into value from " + tableName + " where num = id;\n" +
                         "    return tmpvar; \n" +
                         "END nodb_bindinout_fun_NaN;";
    const sqlRun_bindinout = "BEGIN :output := nodb_bindinout_fun_NaN (:i, :c); END;";
    const sqlDrop_bindinout = "DROP FUNCTION nodb_bindinout_fun_NaN";

    before('create table, insert data', async function() {
      const sql = assist.sqlCreateTable(tableName);
      await connection.execute(sql);
      await connection.execute(proc_bindin);
    });

    after(async function() {
      await connection.execute(sqlDrop_bindin);
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('141.2.1 binding in NaN by name into Oracle NUMBER column throws DPI-1055', async function() {
      const bindVar = {
        i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun_bindin, bindVar),
        /DPI-1055:/
      );
    });

    it('141.2.2 binding in NaN by position into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "BEGIN :1 := nodb_bind_fun_NaN (:2, :3); END;";
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, 2, NaN
      ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

    it('141.2.3 binding inout NaN by name into Oracle NUMBER column throws DPI-1055', async function() {
      await connection.execute(proc_bindinout);
      const binds = {
        i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_INOUT },
        output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun_bindinout, binds),
        /DPI-1055:/
      );
      await connection.execute(sqlDrop_bindinout);
    });

    it('141.2.4 binding inout NaN by position into Oracle NUMBER column throws DPI-1055', async function() {
      await connection.execute(proc_bindinout);
      const sql = "BEGIN :1 := nodb_bindinout_fun_NaN (:2, :3); END;";
      const binds = [
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, 1, NaN
      ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
      await connection.execute(sqlDrop_bindinout);
    });

  });

  describe('141.3 PL/SQL, Procedure, bind NaN', function() {
    const proc_bindin = "CREATE OR REPLACE PROCEDURE nodb_proc_bindin_NaN(id IN NUMBER, c1 IN NUMBER, c2 OUT NUMBER) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    insert into " + tableName + " values (id, c1);\n" +
                      "    select content into c2 from " + tableName + " where num = id;\n" +
                      "END nodb_proc_bindin_NaN;";
    const sqlRun_bindin = "BEGIN nodb_proc_bindin_NaN (:i, :c1, :c2); END;";
    const sqlDrop_bindin = "DROP PROCEDURE nodb_proc_bindin_NaN";

    const proc_bindinout = "CREATE OR REPLACE PROCEDURE nodb_proc_bindinout_NaN(id IN NUMBER, c1 IN OUT NUMBER) \n" +
                         "AS \n" +
                         "BEGIN \n" +
                         "    insert into " + tableName + " values (id, c1);\n" +
                         "    select content into c1 from " + tableName + " where num = id;\n" +
                         "END nodb_proc_bindinout_NaN;";
    const sqlRun_bindinout = "BEGIN nodb_proc_bindinout_NaN (:i, :c1); END;";
    const sqlDrop_bindinout = "DROP PROCEDURE nodb_proc_bindinout_NaN";

    before('create table, insert data', async function() {
      const sql = assist.sqlCreateTable(tableName);
      await connection.execute(sql);
      await connection.execute(proc_bindin);
    });

    after(async function() {
      await connection.execute(sqlDrop_bindin);
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('141.3.1 binding in NaN by name into Oracle NUMBER column throws DPI-1055', async function() {
      const bindVar = {
        i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c2: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun_bindin, bindVar),
        /DPI-1055:/
      );
    });

    it('141.3.2 binding in NaN by position into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "BEGIN nodb_proc_bind_NaN (:1, :2, :3); END;";
      const binds = [ 2, NaN, { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

    it('141.3.3 binding inout NaN by name into Oracle NUMBER column throws DPI-1055', async function() {
      await connection.execute(proc_bindinout);
      const bindVar = {
        i: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: NaN, type: oracledb.NUMBER, dir: oracledb.BIND_INOUT },
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun_bindinout, bindVar),
        /DPI-1055:/
      );
      await connection.execute(sqlDrop_bindinout);
    });

    it('141.3.4 binding inout NaN by position into Oracle NUMBER column throws DPI-1055', async function() {
      await connection.execute(proc_bindinout);
      const sql = "BEGIN nodb_proc_bindinout_NaN (:1, :2); END;";
      const binds = [ 1, NaN ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
      await connection.execute(sqlDrop_bindinout);
    });

  });

  describe('141.4 PL/SQL, Procedure, bind NaN, indexed table', function() {
    const createTable =  "BEGIN \n" +
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
    const dropTable = "DROP table nodb_NaN_indexed_table purge";

    const proc_package = "CREATE OR REPLACE PACKAGE nodb_nan_pkg IS\n" +
                       "  TYPE idType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                       "  PROCEDURE array_in(ids IN idType);\n" +
                       "  PROCEDURE array_inout(ids IN OUT idType); \n" +
                       "END;";

    const proc_package_body = "CREATE OR REPLACE PACKAGE BODY nodb_nan_pkg IS \n" +
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
    const proc_drop = "DROP PACKAGE nodb_nan_pkg";

    before('create table, insert data', async function() {
      await connection.execute(createTable);
      await connection.execute(proc_package);
      await connection.execute(proc_package_body);
    });

    after(async function() {
      await connection.execute(proc_drop);
      await connection.execute(dropTable);
    });

    it('141.4.1 binding in NaN by name into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "BEGIN nodb_nan_pkg.array_in(:id_in); END;";
      const binds = {
        id_in: { type: oracledb.NUMBER, val:  [1, 0, NaN] }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

    it('141.4.2 binding in NaN by position into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "BEGIN nodb_nan_pkg.array_in(:1); END;";
      const binds = [
        {type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val:  [1, 0, NaN]}
      ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

    it('141.4.3 binding inout NaN by name into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "BEGIN nodb_nan_pkg.array_inout(:id_in); END;";
      const binds = {
        id_in: {
          type: oracledb.NUMBER,
          dir:  oracledb.BIND_INOUT,
          val:  [1, 0, NaN],
          maxArraySize: 3
        }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

    it('141.4.4 binding inout NaN by position into Oracle NUMBER column throws DPI-1055', async function() {
      const sql = "BEGIN nodb_nan_pkg.array_inout(:1); END;";
      const binds = [
        {
          type: oracledb.NUMBER,
          dir: oracledb.BIND_INOUT,
          val: [1, 0, NaN],
          maxArraySize: 3
        }
      ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, binds),
        /DPI-1055:/
      );
    });

  });

});
