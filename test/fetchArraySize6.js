/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   153. fetchArraySize6.js
 *
 * DESCRIPTION
 *   Binding test of fetching data from database with different execute() option fetchArraySize
 *   Tests including:
 *     DML binding
 *     PLSQL procedure binding OUT/INOUT in indexed table
 *     PLSQL function binding OUT/INOUT in indexed table
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe("153. fetchArraySize6.js", function() {

  let connection = null;
  let default_maxRows = oracledb.maxRows;
  const tableName = "nodb_fetchArraySize_153";
  let tableSize = 1000;

  const create_table = "BEGIN \n" +
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

  const drop_table = "DROP TABLE " + tableName + " PURGE";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    assert.strictEqual(default_maxRows, 0);
  });

  after(async function() {
    await connection.close();
  });

  describe("153.1 DML binding", function() {

    before(async function() {
      await connection.execute(create_table);
    });

    after(async function() {
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const dmlBinding = async function(fetchArraySizeVal, affectedRowId) {
      let result = await connection.execute(
        "update " + tableName + " set content = :c where id > :num",
        {
          num: { val: affectedRowId, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
          c: { val: "something", dir: oracledb.BIND_IN, type: oracledb.STRING }
        },
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      assert.strictEqual(result.rowsAffected, tableSize - affectedRowId);

      result = await connection.execute(
        "select * from " + tableName + " where id > :num order by id",
        { num: { val: affectedRowId, dir: oracledb.BIND_IN, type: oracledb.NUMBER } },
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      const rows = result.rows;
      assert.strictEqual(rows.length, tableSize - affectedRowId);
      for (let element of rows) {
        const index = rows.indexOf(element);
        assert.strictEqual(element[0], index + affectedRowId + 1);
        assert.strictEqual(element[1], "something");
      }
    };

    it("153.1.1 fetchArraySize = 1", async function() {
      await dmlBinding(1, 50);
    });

    it("153.1.2 fetchArraySize = tableSize/20", async function() {
      await dmlBinding(tableSize / 20, 0);
    });

    it("153.1.3 fetchArraySize = tableSize/10", async function() {
      await dmlBinding(tableSize / 10, 2);
    });

    it("153.1.4 fetchArraySize = tableSize", async function() {
      await dmlBinding(tableSize, 0);
    });

    it("153.1.5 fetchArraySize = (table size - 1)", async function() {
      await dmlBinding(tableSize - 1, 0);
    });

  });

  describe("153.2 procedure binding", function() {

    const proc_package = "CREATE OR REPLACE PACKAGE nodb_ref_pkg IS\n" +
                         "    TYPE idType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                         "    TYPE stringType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                         "    PROCEDURE array_out(ids OUT idType);\n" +
                         "    PROCEDURE array_inout(id_in IN NUMBER, contents IN OUT stringType); \n" +
                         "END;";

    const proc_package_body = "CREATE OR REPLACE PACKAGE BODY nodb_ref_pkg IS \n" +
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
    const proc_drop = "DROP PACKAGE nodb_ref_pkg";

    before(async function() {
      await connection.execute(create_table);
      await connection.execute(proc_package);
      await connection.execute(proc_package_body);
    });

    after(async function() {
      await connection.execute(proc_drop);
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const proc_query_inout = async function(updateFromId, maxArraySizeVal, fetchArraySizeVal) {
      let result = await connection.execute(
        "BEGIN nodb_ref_pkg.array_inout(:id_in, :c); END;",
        {
          id_in: { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val: updateFromId },
          c: { type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ["something new"], maxArraySize: maxArraySizeVal },
        },
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      const rowsAffected = tableSize - updateFromId;
      const outVal = result.outBinds.c;
      assert.strictEqual(outVal.length, rowsAffected);
      for (let element of outVal) {
        const index = outVal.indexOf(element) + updateFromId + 1;
        assert.strictEqual(element, "something new " + index);
      }
    };

    let proc_query_out = async function(maxArraySizeVal, fetchArraySizeVal) {
      let result = await connection.execute(
        "BEGIN nodb_ref_pkg.array_out(:c); END;",
        {
          c: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: maxArraySizeVal },
        },
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      const outVal = result.outBinds.c;
      assert.strictEqual(outVal.length, tableSize);
      for (let element of outVal) {
        const index = outVal.indexOf(element);
        assert.strictEqual(element, index + 1);
      }
    };

    it("153.2.1 Bind OUT with fetchArraySize = 1", async function() {
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = 1;
      await proc_query_out(maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.2 Bind OUT with fetchArraySize = tableSize/20", async function() {
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = tableSize / 20;
      await proc_query_out(maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.3 Bind OUT with fetchArraySize = tableSize/10", async function() {
      let maxArraySizeVal = tableSize * 10;
      let fetchArraySizeVal = tableSize / 10;
      await proc_query_out(maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.4 Bind OUT with fetchArraySize = tableSize", async function() {
      let maxArraySizeVal = tableSize * 2;
      let fetchArraySizeVal = tableSize;
      await proc_query_out(maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.5 Bind OUT with fetchArraySize = (table size - 1)", async function() {
      let maxArraySizeVal = tableSize * 2;
      let fetchArraySizeVal = tableSize - 1;
      await proc_query_out(maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.6 Bind IN OUT with fetchArraySize = 1", async function() {
      let updateFromId = 20;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = 1;
      await proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.7 Bind IN OUT with fetchArraySize = tableSize/20", async function() {
      let updateFromId = 20;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = tableSize / 20;
      await proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.8 Bind IN OUT with fetchArraySize = tableSize/10", async function() {
      let updateFromId = 10;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = tableSize / 10;
      await proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.9 Bind IN OUT with fetchArraySize = tableSize", async function() {
      let updateFromId = 0;
      let maxArraySizeVal = tableSize * 2;
      let fetchArraySizeVal = tableSize;
      await proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.2.10 Bind IN OUT with fetchArraySize = (table size - 1)", async function() {
      let updateFromId = 0;
      let maxArraySizeVal = tableSize * 2;
      let fetchArraySizeVal = tableSize - 1;
      await proc_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

  });

  describe("153.3 function binding", function() {

    const proc_package = "CREATE OR REPLACE PACKAGE nodb_ref_fun_pkg AS\n" +
                         "    TYPE idType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                         "    TYPE stringType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                         "    FUNCTION array_out(id_in IN NUMBER) RETURN idType;\n" +
                         "    FUNCTION array_inout(id_in IN NUMBER, contents IN OUT stringType) RETURN idType; \n" +
                         "END;";

    const proc_package_body = "CREATE OR REPLACE PACKAGE BODY nodb_ref_fun_pkg AS \n" +
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
    const proc_drop = "DROP PACKAGE nodb_ref_fun_pkg";

    before(async function() {
      await connection.execute(create_table);
      await connection.execute(proc_package);
      await connection.execute(proc_package_body);
    });

    after(async function() {
      await connection.execute(proc_drop);
      await connection.execute(drop_table);
    });

    afterEach(function() {
      oracledb.maxRows = default_maxRows;
    });

    const fun_query_inout = async function(updateFromId, maxArraySizeVal, fetchArraySizeVal) {
      let result = await connection.execute(
        "BEGIN :output := nodb_ref_fun_pkg.array_inout(:id_in, :c_inout); END;",
        {
          id_in: { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val: updateFromId },
          c_inout: { type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ["something new"], maxArraySize: maxArraySizeVal },
          output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: maxArraySizeVal }
        },
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      fun_verifyResult_inout(result.outBinds.c_inout, updateFromId);
      fun_verifyResult_inout(result.outBinds.output, updateFromId);
    };

    const fun_verifyResult_inout = function(result, updateFromId) {
      let rowsAffected = tableSize - updateFromId;
      assert.strictEqual(result.length, rowsAffected);
      for (let element of result) {
        let index = result.indexOf(element);
        if (typeof element === "string") {
          let expectedTail = index + updateFromId + 1;
          assert.strictEqual(element, "something new " + expectedTail);
        } else if (typeof element === "number") {
          assert.strictEqual(element, index + 1 + updateFromId);
        }
      }
    };

    const fun_query_out = async function(affectFromId, maxArraySizeVal, fetchArraySizeVal) {
      let result = await connection.execute(
        "BEGIN :output := nodb_ref_fun_pkg.array_out(:c); END;",
        {
          c: { type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: affectFromId },
          output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: maxArraySizeVal }
        },
        {
          fetchArraySize: fetchArraySizeVal
        }
      );
      const outVal = result.outBinds.output;
      assert.strictEqual(outVal.length, tableSize - affectFromId);
      for (let element of outVal) {
        const index = outVal.indexOf(element);
        assert.strictEqual(element, index + 1 + affectFromId);
      }
    };

    it("153.3.1 Bind OUT with fetchArraySize = 1", async function() {
      let affectFromId = 10;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = 1;
      await fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.2 Bind OUT with fetchArraySize = tableSize/20", async function() {
      let affectFromId = 20;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = tableSize / 20;
      await fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.3 Bind OUT with fetchArraySize = tableSize/10", async function() {
      let affectFromId = 5;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = tableSize / 10;
      await fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.4 Bind OUT with fetchArraySize = tableSize", async function() {
      let affectFromId = 29;
      let maxArraySizeVal = tableSize * 10;
      let fetchArraySizeVal = tableSize;
      await fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.5 Bind OUT with fetchArraySize = (table size - 1)", async function() {
      let affectFromId = 0;
      let maxArraySizeVal = tableSize * 10;
      let fetchArraySizeVal = tableSize - 1;
      await fun_query_out(affectFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.6 Bind IN OUT with fetchArraySize = 1", async function() {
      let updateFromId = 20;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = 1;
      await fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.7 Bind IN OUT with fetchArraySize = tableSize/20", async function() {
      let updateFromId = 20;
      let maxArraySizeVal = tableSize;
      let fetchArraySizeVal = tableSize / 20;
      await fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.8 Bind IN OUT with fetchArraySize = tableSize/10", async function() {
      let updateFromId = 0;
      let maxArraySizeVal = tableSize * 2;
      let fetchArraySizeVal = tableSize / 10;
      await fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.9 Bind IN OUT with fetchArraySize = tableSize", async function() {
      let updateFromId = 0;
      let maxArraySizeVal = tableSize * 2;
      let fetchArraySizeVal = tableSize;
      await fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

    it("153.3.10 Bind IN OUT with fetchArraySize = (table size - 1)", async function() {
      let updateFromId = 0;
      let maxArraySizeVal = tableSize * 2;
      let fetchArraySizeVal = tableSize - 1;
      await fun_query_inout(updateFromId, maxArraySizeVal, fetchArraySizeVal);
    });

  });

});
