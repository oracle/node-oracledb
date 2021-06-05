/* Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * NAME
 *   254. jsonBind2.js
 *
 * DESCRIPTION
 *   Test cases to store and fetch JSON data from BLOB , CLOB and VARCHAR2 column
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');

describe('254. jsonBind2.js', function() {
  let conn = null;
  let outFormatBak = oracledb.outFormat;

  before (async function() {
    try {
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
      oracledb.extendedMetaData = true;
      conn = await oracledb.getConnection(dbconfig);
      if (conn.oracleServerVersion < 1201000200) {
        this.skip();
      }
    } catch (err) {
      should.not.exist(err);
    }
  });

  after (async function() {
    try {
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    } finally {
      oracledb.outFormat = outFormatBak;
    }
  });

  describe('254.1 Map javascript object into BLOB', function() {

    const tableName = "jsonBind_tab1";
    const rsSelect = `SELECT obj_data from ` + tableName;
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
          obj_data BLOB CHECK (obj_data IS JSON)) LOB (obj_data) STORE AS (CACHE)
      ');
    END;`;

    let result, j;
    let skip = false;

    before (async function() {
      try {
        if (conn.oracleServerVersion < 1202000000) {
          skip = true;
          this.skip();
        }
        await conn.execute(create_table_sql);
      } catch (err) {
        should.not.exist(err);
      }
    });

    after (async function() {
      try {
        if (!skip) {
          await conn.execute("DROP TABLE " + tableName + " PURGE");
        }
      } catch (err) {
        should.not.exist(err);
      }
    });

    beforeEach(async function() {
      try {
        await conn.execute(`Delete from ` + tableName);
      } catch (error) {
        should.not.exist(error);
      }
    });

    it('254.1.1 Number, String type', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);
      const d = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(d);

      should.equal(j.empId, 1);
      should.equal(j.empName, 'Employee1');
      should.equal(j.city, 'New City');
    });

    it('254.1.2 Boolean and null value', async function() {
      const data = { "middlename": null, "honest": true};
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);

      const d = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(d);

      should.equal(j.middlename, null);
      should.equal(j.honest, true);
    });

    it('254.1.3 Array type', async function() {
      const data = { "employees":[ "Employee1", "Employee2", "Employee3" ] };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);
      const d = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(d);

      should.equal(j.employees[0], 'Employee1');
      should.equal(j.employees[1], 'Employee2');
      should.equal(j.employees[2], 'Employee3');
    });

    it('254.1.4 Object type', async function() {
      const data = { "employee":{ "name":"Employee1", "age":30, "city":"New City" } };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        const b = Buffer.from(s, 'utf8');
        await conn.execute(sql, { bv: { val: b } });
      }

      result = await conn.execute(rsSelect);
      const d = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(d);

      should.equal(j.employee.name, 'Employee1');
      should.equal(j.employee.age, 30);
      should.equal(j.employee.city, 'New City');
    });

    it('254.1.5 Using JSON_VALUE to extract a value from a BLOB column', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
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

      should.equal(j, 'Employee1');
    });

    it('254.1.6 Using dot-notation to extract a value from a BLOB column', async function() {
      try {
        const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
        const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

        if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
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

        j = result.rows[0].EMPNAME;
        should.equal(j, 'Employee1');
      } catch (err) {
        console.error(err);
      }
    });
  });

  describe('254.2 Map javascript object into VARCHAR2', function() {

    const tableName = 'jsonBind_tab2';
    const rsSelect = `SELECT obj_data from ` + tableName;
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
          obj_data VARCHAR2(150) CHECK (obj_data IS JSON))
      ');
    END;`;

    let result, j;
    before (async function() {
      try {
        await conn.execute(create_table_sql);
      } catch (err) {
        should.not.exist(err);
      }
    });

    after (async function() {
      try {
        await conn.execute("DROP TABLE " + tableName + " PURGE");
      } catch (err) {
        should.not.exist(err);
      }
    });

    beforeEach(async function() {
      try {
        await conn.execute(`Delete from ` + tableName);
      } catch (error) {
        should.not.exist(error);
      }
    });

    it('254.2.1 Number, String type', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = result.rows[0].OBJ_DATA;
      j = JSON.parse(j);

      should.equal(j.empId, 1);
      should.equal(j.empName, 'Employee1');
      should.equal(j.city, 'New City');
    });

    it('254.2.2 Boolean and null value', async function() {
      const data = { "middlename": null, "honest": true};
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = result.rows[0].OBJ_DATA;
      j = JSON.parse(j);

      should.equal(j.middlename, null);
      should.equal(j.honest, true);
    });

    it('254.2.3 Array type', async function() {
      const data = { "employees":[ "Employee1", "Employee2", "Employee3" ] };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = result.rows[0].OBJ_DATA;
      j = JSON.parse(j);

      should.equal(j.employees[0], 'Employee1');
      should.equal(j.employees[1], 'Employee2');
      should.equal(j.employees[2], 'Employee3');
    });

    it('254.2.4 Object type', async function() {
      const data = { "employee":{ "name":"Employee1", "age":30, "city":"New City" } };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = result.rows[0].OBJ_DATA;
      j = JSON.parse(j);

      should.equal(j.employee.name, 'Employee1');
      should.equal(j.employee.age, 30);
      should.equal(j.employee.city, 'New City');
    });

    it('254.2.5 Using JSON_VALUE to extract a value from a VARCHAR2 column', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(
        `SELECT JSON_VALUE(obj_data, '$.empName')
       FROM ` + tableName,
        [], {outFormat: oracledb.OUT_FORMAT_ARRAY});
      j = result.rows[0][0];

      should.equal(j, 'Employee1');
    });

    it('254.2.6 Using dot-notation to extract a value from a VARCHAR2 column', async function() {
      if (conn.oracleServerVersion < 1202000000) {
        this.skip();
      }
      try {
        const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
        const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

        if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
          await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
        } else {
          const s = JSON.stringify(data);
          await conn.execute(sql, { bv: { val: s } });
        }
        result = await conn.execute(
          `SELECT tb.obj_data.empName
         FROM ` + tableName + ` tb`
        );

        j = result.rows[0].EMPNAME;
        should.equal(j, 'Employee1');
      } catch (err) {
        console.error(err);
      }
    });
  });

  describe('254.3 Map javascript object into CLOB', function() {

    const tableName = 'jsonBind_tab3';
    const rsSelect = `SELECT obj_data from ` + tableName;
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
          obj_data CLOB CHECK (obj_data IS JSON))
      ');
    END;`;

    let result, j;

    before (async function() {
      try {
        await conn.execute(create_table_sql);
      } catch (err) {
        should.not.exist(err);
      }
    });

    after (async function() {
      try {
        await conn.execute("DROP TABLE " + tableName + " PURGE");
      } catch (err) {
        should.not.exist(err);
      }
    });

    beforeEach(async function() {
      try {
        await conn.execute(`Delete from ` + tableName);
      } catch (error) {
        should.not.exist(error);
      }
    });

    it('254.3.1 Number, String type', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(j);

      should.equal(j.empId, 1);
      should.equal(j.empName, 'Employee1');
      should.equal(j.city, 'New City');
    });

    it('254.3.2 Boolean and null value', async function() {
      const data = { "middlename": null, "honest": true};
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(j);

      should.equal(j.middlename, null);
      should.equal(j.honest, true);
    });

    it('254.3.3 Array type', async function() {
      const data = { "employees":[ "Employee1", "Employee2", "Employee3" ] };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(j);

      should.equal(j.employees[0], 'Employee1');
      should.equal(j.employees[1], 'Employee2');
      should.equal(j.employees[2], 'Employee3');
    });

    it('254.3.4 Object type', async function() {
      const data = { "employee":{ "name":"Employee1", "age":30, "city":"New City" } };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(rsSelect);
      j = await result.rows[0].OBJ_DATA.getData();
      j = JSON.parse(j);

      should.equal(j.employee.name, 'Employee1');
      should.equal(j.employee.age, 30);
      should.equal(j.employee.city, 'New City');
    });

    it('254.3.5 Using JSON_VALUE to extract a value from a CLOB column', async function() {
      const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
      const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

      if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
        await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
      } else {
        const s = JSON.stringify(data);
        await conn.execute(sql, { bv: { val: s } });
      }

      result = await conn.execute(
        `SELECT JSON_VALUE(obj_data, '$.empName')
       FROM ` + tableName,
        [], {outFormat: oracledb.OUT_FORMAT_ARRAY});
      j = result.rows[0][0];

      should.equal(j, 'Employee1');
    });

    it('254.3.6 Using dot-notation to extract a value from a CLOB column', async function() {
      if (conn.oracleServerVersion < 1202000000) {
        this.skip();
      }
      try {
        const data = { "empId": 1, "empName": "Employee1", "city": "New City" };
        const sql = `INSERT into ` + tableName + ` VALUES (:bv)`;

        if (oracledb.oracleClientVersion >= 2100000000 && conn.oracleServerVersion >= 2100000000) {
          await conn.execute(sql, { bv: {val: data, type: oracledb.DB_TYPE_JSON} });
        } else {
          const s = JSON.stringify(data);
          await conn.execute(sql, { bv: { val: s } });
        }
        result = await conn.execute(
          `SELECT tb.obj_data.empName
         FROM ` + tableName + ` tb`
        );

        j = result.rows[0].EMPNAME;
        should.equal(j, 'Employee1');
      } catch (err) {
        console.error(err);
      }
    });
  });
});
