/* Copyright (c) 2021, 2022, Oracle and/or its affiliates. */

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
 *   253. jsonBind1.js
 *
 * DESCRIPTION
 *   Test cases to store and fetch data from JSON column
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbconfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('253. jsonBind1.js', function() {
  let conn = null;
  let tableName = "jsonBind_tab";
  let outFormatBak = oracledb.outFormat;
  const create_table_sql =
    `BEGIN
      DECLARE
        e_table_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
      BEGIN
        EXECUTE IMMEDIATE ('DROP TABLE ` + tableName + ` ');
      EXCEPTION
        WHEN e_table_missing
        THEN NULL;
      END;
      EXECUTE IMMEDIATE ('
        CREATE TABLE ` + tableName + ` (
          obj_data JSON
        )
      ');
    END;`;
  const rsSelect = `SELECT obj_data from ` + tableName;
  const proc = "CREATE OR REPLACE PROCEDURE nodb_bindjson ( \n" +
                     "    p_inout IN OUT JSON \n" +
                     ") \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_inout := p_inout; \n" +
                     "END;";
  let skip = false;
  before (async function() {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.extendedMetaData = true;
    conn = await oracledb.getConnection(dbconfig);
    if (conn.oracleServerVersion < 2100000000) {
      skip = true;
      this.skip();
    }
    await conn.execute(create_table_sql);
    await conn.commit();
  });

  after (async function() {
    oracledb.outFormat = outFormatBak;
    if (!skip) {
      await conn.execute("DROP TABLE " + tableName + " PURGE");
    }
    if (conn) {
      await conn.close();
    }
  });

  beforeEach(async function() {
    await conn.execute(`Delete from ` + tableName);
  });

  describe('253.1 Map javascript object directly into JSON', function() {

    let result, j;
    it('253.1.1 Number, String type', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (testsUtil.getClientVersion() >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
      // With older client versions, insert as a JSON string
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
      // Oracle Client libraries < 21 will return a BLOB
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }

      assert.strictEqual(j.empId, 1);
      assert.strictEqual(j.empName, 'Employee1');
      assert.strictEqual(j.city, 'New City');
    });

    it('253.1.2 Boolean and null value', async function() {
      const data = { "middlename": null, "honest": true};
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (testsUtil.getClientVersion() >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
      // With older client versions, insert as a JSON string
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
      // Oracle Client libraries < 21 will return a BLOB
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }

      assert.strictEqual(j.middlename, null);
      assert.strictEqual(j.honest, true);
    });

    it('253.1.3 Array type', async function() {
      const data = { "employees":[ "Employee1", "Employee2", "Employee3" ] };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (testsUtil.getClientVersion() >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
      // With older client versions, insert as a JSON string
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
      // Oracle Client libraries < 21 will return a BLOB
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }

      assert.strictEqual(j.employees[0], 'Employee1');
      assert.strictEqual(j.employees[1], 'Employee2');
      assert.strictEqual(j.employees[2], 'Employee3');
    });

    it('253.1.4 Object type', async function() {
      const data = { "employee":{ "name":"Employee1", "age":30, "city":"New City" } };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;
      if (testsUtil.getClientVersion() >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }
      assert.strictEqual(j.employee.name, 'Employee1');
      assert.strictEqual(j.employee.age, 30);
      assert.strictEqual(j.employee.city, 'New City');
    });

    it('253.1.5 Using JSON_VALUE to extract a value from a JSON column', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (testsUtil.getClientVersion() >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(
        `SELECT JSON_VALUE(obj_data, '$.empName')
       FROM ` + tableName,
        [], {outFormat: oracledb.OUT_FORMAT_ARRAY});
      j = result.rows[0][0];

      assert.strictEqual(j, 'Employee1');
    });

    it('253.1.6 Using dot-notation to extract a value from a JSON column', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (testsUtil.getClientVersion() >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(
        `SELECT tb.obj_data.empName
       FROM ` + tableName + ` tb`
      );

      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].EMPNAME;
      } else {
        const d = await result.rows[0].EMPNAME.getData();
        j = JSON.parse(d);
      }

      assert.strictEqual(j, 'Employee1');
    });

    it('253.1.7 Using JSON_OBJECT to extract relational data as JSON', async function() {
      result = await conn.execute(
        `SELECT JSON_OBJECT('key' IS d.dummy) dummy
       FROM dual d`
      );

      j = JSON.parse(result.rows[0].DUMMY);
      assert.strictEqual(j.key, 'X');
    });

    it('253.1.8 Number, String type with BIND_INOUT', async function() {
      if (testsUtil.getClientVersion() < 2100000000) {
        this.skip();
      }
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      await conn.execute(proc);
      result = await conn.execute("BEGIN nodb_bindjson(:io); END;",
        {
          io: { val: data, dir : oracledb.BIND_INOUT, type: oracledb.DB_TYPE_JSON }
        });

      j = result.outBinds.io;

      assert.strictEqual(j.empId, 1);
      assert.strictEqual(j.empName, 'Employee1');
      assert.strictEqual(j.city, 'New City');
      await conn.execute("drop PROCEDURE nodb_bindjson");
    });

    it('253.1.9 Boolean and null value with BIND_INOUT', async function() {
      if (testsUtil.getClientVersion() < 2100000000) {
        this.skip();
      }
      const data = { "middlename": null, "honest": true};
      await conn.execute(proc);
      result = await conn.execute("BEGIN nodb_bindjson(:io); END;",
        {
          io: { val: data, dir : oracledb.BIND_INOUT, type: oracledb.DB_TYPE_JSON }
        });

      j = result.outBinds.io;

      assert.strictEqual(j.middlename, null);
      assert.strictEqual(j.honest, true);
      await conn.execute("drop PROCEDURE nodb_bindjson");
    });

    it('253.1.10 Array type with BIND_INOUT', async function() {
      if (testsUtil.getClientVersion() < 2100000000) {
        this.skip();
      }
      const data = { "employees":[ "Employee1", "Employee2", "Employee3" ] };
      await conn.execute(proc);
      result = await conn.execute("BEGIN nodb_bindjson(:io); END;",
        {
          io: { val: data, dir : oracledb.BIND_INOUT, type: oracledb.DB_TYPE_JSON }
        });

      j = result.outBinds.io;

      assert.strictEqual(j.employees[0], 'Employee1');
      assert.strictEqual(j.employees[1], 'Employee2');
      assert.strictEqual(j.employees[2], 'Employee3');
      await conn.execute("drop PROCEDURE nodb_bindjson");
    });

    it('253.1.11 Object type with BIND_INOUT', async function() {
      if (testsUtil.getClientVersion() < 2100000000) {
        this.skip();
      }
      const data = { "employee":{ "name":"Employee1", "age":30, "city":"New City" } };
      await conn.execute(proc);
      result = await conn.execute("BEGIN nodb_bindjson(:io); END;",
        {
          io: { val: data, dir : oracledb.BIND_INOUT, type: oracledb.DB_TYPE_JSON }
        });

      j = result.outBinds.io;

      assert.strictEqual(j.employee.name, 'Employee1');
      assert.strictEqual(j.employee.age, 30);
      assert.strictEqual(j.employee.city, 'New City');
      await conn.execute("drop PROCEDURE nodb_bindjson");
    });
  });

  describe('253.2 Map javascript object using SQL syntax into JSON', function() {

    let result, j;

    it('253.2.1 Number type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(:b) RETURNING JSON))`;
      await conn.execute(sql, [123]);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
      // Oracle Client libraries < 21 will return a BLOB
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }

      assert.strictEqual(j.key1, 123);
    });

    it('253.2.2 String type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(:b) RETURNING JSON))`;
      await conn.execute(sql, ["value1"]);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }
      assert.strictEqual(j.key1, 'value1');
    });

    it('253.2.3 TIMESTAMP type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_timestamp(:b,:c)) RETURNING JSON))`;
      await conn.execute(sql, ['2021-03-05', 'YYYY-MM-DD']);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
        assert.strictEqual(JSON.stringify(j.key1), '"2021-03-05T00:00:00.000Z"');
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
        assert.strictEqual(JSON.stringify(j.key1), '"2021-03-05T00:00:00"');
      }
    });

    it('253.2.4 RAW type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(hextoraw(:b)) RETURNING JSON))`;
      await conn.execute(sql, ['48656c6c6f']);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
        assert.strictEqual(j.key1.toString('utf8'), 'Hello');
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
        const buf = Buffer.from(j.key1, 'hex');
        assert.strictEqual(buf.toString('utf8'), 'Hello');
      }
    });

    it('253.2.5 Array type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_array(:b,:c,:d) RETURNING JSON))`;
      await conn.execute(sql, ["Employee1", "Employee2", "Employee3" ]);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }
      assert.strictEqual(j.key1[0], 'Employee1');
      assert.strictEqual(j.key1[1], 'Employee2');
      assert.strictEqual(j.key1[2], 'Employee3');
    });

    it('253.2.6 Object type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(:b), key 'key2' value json_scalar(:d) RETURNING JSON))`;
      await conn.execute(sql, [123, "value1"]);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }
      assert.strictEqual(j.key1, 123);
      assert.strictEqual(j.key2, 'value1');
    });

    it('253.2.7 CLOB type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_clob(:b)) RETURNING JSON))`;
      await conn.execute(sql, ['abcdefg12345']);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }
      assert.strictEqual(j.key1, 'abcdefg12345');
    });

    it('253.2.8 BLOB type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_blob(hextoraw(:b))) RETURNING JSON))`;
      await conn.execute(sql, ['48656c6c6f']);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
        assert.strictEqual(j.key1.toString('utf8'), 'Hello');
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
        const buf = Buffer.from(j.key1, 'hex');
        assert.strictEqual(buf.toString('utf8'), 'Hello');
      }
    });

    it('253.2.9 DATE type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_date(:b,:c)) RETURNING JSON))`;
      await conn.execute(sql, ['2021-03-10', 'YYYY-MM-DD']);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
        assert.strictEqual(JSON.stringify(j.key1), '"2021-03-10T00:00:00.000Z"');
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
        assert.strictEqual(JSON.stringify(j.key1), '"2021-03-10T00:00:00"');
      }
    });

    it('253.2.10 INTERVAL YEAR TO MONTH type', async () => {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_yminterval(:b)) RETURNING JSON))`;
      if (testsUtil.getClientVersion() >= 2100000000) {
        await assert.rejects(
          async () => {
            await conn.execute(sql, ['5-9']);
            await conn.execute(rsSelect);
          },
          /NJS-078/
        );//NJS-078: unsupported data type 2016 in JSON value
      } else {
        await conn.execute(sql, ['5-9']);
        result = await conn.execute(rsSelect);
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
        assert.strictEqual(j.key1, "P5Y9M");
      }
    });

    it('253.2.11 INTERVAL DAY TO SECOND type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_dsinterval(:b)) RETURNING JSON))`;
      if (testsUtil.getClientVersion() >= 2100000000) {
        await assert.rejects(
          async () => {
            await conn.execute(sql, ['11 10:09:08']);
            await conn.execute(rsSelect);
          },
          /NJS-078/
        );//NJS-078: unsupported data type 2015 in JSON value
      } else {
        await conn.execute(sql, ['11 10:09:08']);
        result = await conn.execute(rsSelect);
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
        assert.strictEqual(j.key1, "P11DT10H9M8S");
      }
    });

    it('253.2.12 BINARY_DOUBLE type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_binary_double(:b)) RETURNING JSON))`;
      await conn.execute(sql, [253]);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }
      assert.strictEqual(j.key1, 253);
    });

    it('253.2.13 BINARY_FLOAT type', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value json_scalar(to_binary_float(:b)) RETURNING JSON))`;
      await conn.execute(sql, [253.25]);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
        assert.strictEqual(j.key1, 253.25);
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
        assert.strictEqual(j.key1, 253.25);
      }
    });

    it('253.2.14 NULL value', async function() {
      const sql = `INSERT into ` + tableName + ` VALUES (JSON_OBJECT( key 'key1' value NULL RETURNING JSON))`;
      await conn.execute(sql);
      result = await conn.execute(rsSelect);
      if (result.metaData[0].fetchType == oracledb.DB_TYPE_JSON) {
        j = result.rows[0].OBJ_DATA;
      } else {
        const d = await result.rows[0].OBJ_DATA.getData();
        j = JSON.parse(d);
      }
      assert.strictEqual(j.key1, null);
    });
  });
});
