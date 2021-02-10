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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   249. rsGetAllRows1.js
 *
 * DESCRIPTION
 *   Test cases for getRows()/getRows(0)
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');

describe('249. rsGetAllRows1.js', function () {
  let conn = null;
  let tableName = "nodb_rsgetRows";
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
          obj_id NUMBER,
          obj_name VARCHAR2(20)
        )
      ');
    END;`;
  const rsSelect = "SELECT obj_id, obj_name from " + tableName;
  const rsInsert =
    `DECLARE
       i NUMBER;
       name VARCHAR2(20);
     BEGIN
       FOR i IN 1..150 LOOP
         name := 'Object ' || i;
         INSERT INTO ` + tableName + ` VALUES (i, name);
       END LOOP;
     END; `;
  const rsProc =
     `CREATE OR REPLACE PROCEDURE nodb_rsgetRowsOut
        (p_out OUT SYS_REFCURSOR) AS
      BEGIN
        OPEN p_out FOR SELECT * FROM ` + tableName + ` ORDER BY OBJ_ID;
      END;`;

  before (async function () {
    try {
      oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
      conn = await oracledb.getConnection(dbconfig);
      await conn.execute(create_table_sql);
      await conn.execute(rsInsert);
      await conn.execute(rsProc);
      await conn.commit();
    } catch (err){
      should.not.exist(err);
    }
  });

  after (async function () {
    try{
      await conn.execute("DROP PROCEDURE nodb_rsgetRowsOut");
      await conn.execute("DROP TABLE " + tableName + " PURGE");
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    } finally {
      oracledb.outFormat = outFormatBak;
    }
  });

  describe('249.1 ResultSet & getRows()', function () {
    it('249.1.1 ResultSet + getRows()', async function () {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true});
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.1.2 ResultSet + getRows(0)', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true});
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[99].OBJ_ID, 100);
        should.equal(rows[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.1.3 ResultSet + getRows(125) + getRows()', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, outFormat : oracledb.OUT_FORMAT_ARRAY });
        await result.resultSet.getRows(125);
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 25);
        should.equal(rows[0][0], 126);
        should.equal(rows[24][0], 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.1.4 ResultSet + getRows(125) + getRows(0)', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true});
        await result.resultSet.getRows(125);
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.1.5 ResultSet + getRow() + getRows()', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, { resultSet : true, outFormat : oracledb.OUT_FORMAT_ARRAY });
        await result.resultSet.getRow();
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 149);
        should.equal(rows[0][0], 2);
        should.equal(rows[148][0], 150);
        await result.resultSet.close ();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.1.6 ResultSet + getRow() + getRows(0)', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, { resultSet : true });
        await result.resultSet.getRow();
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await result.resultSet.close ();
      }
      catch (err) {
        should.not.exist(err);
      }
    });
  });

  describe('249.2 REFCURSOR & getRows()', function () {
    it('249.2.1 RefCursor getRows()', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds);
        let rs = results.outBinds.out;
        let rows = await rs.getRows();

        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[149].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist (err);
      }
    });

    it('249.2.2 RefCursor + getRows(0) ', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds);
        let rs = results.outBinds.out;
        let rows = await rs.getRows(0);

        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[149].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.2.3 RefCursor + getRows(125) & getRows()', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds);
        let rs = results.outBinds.out;
        await rs.getRows(125);
        let rows = await rs.getRows();
        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it( '249.2.4 RefCursor + getRows(125) & getRows(0)',  async function () {
      try {
        let results = await conn.execute(
          "BEGIN nodb_rsgetRowsOut ( :out ); END;",
          { out: {type : oracledb.CURSOR, dir : oracledb.BIND_OUT} });
        let rs = results.outBinds.out;
        await rs.getRows(125);
        let rows = await rs.getRows(0);
        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it( '249.2.5 RefCursor + getRow() & getRows()',  async function () {
      try {
        let results = await conn.execute(
          "BEGIN nodb_rsgetRowsOut ( :out ); END;",
          { out: {type : oracledb.CURSOR, dir : oracledb.BIND_OUT} });
        let rs = results.outBinds.out;
        await rs.getRow();
        let rows = await rs.getRows();
        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it( '249.2.6 RefCursor + getRow() & getRows(0)',  async function () {
      try {
        let results = await conn.execute(
          "BEGIN nodb_rsgetRowsOut ( :out ); END;",
          { out: {type : oracledb.CURSOR, dir : oracledb.BIND_OUT} });
        let rs = results.outBinds.out;
        await rs.getRow();
        let rows = await rs.getRows(0);
        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });
  });

  describe('249.3 ResultSet & getRows() with fetchArraySize', function () {
    it('249.3.1 ResultSet + getRows() with fetchArraySize = total rows', async function () {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 150 });
        let rows1 = await result.resultSet.getRows();
        let rows2 = await result.resultSet.getRows();
        should.equal(rows1.length, 150);
        should.equal(rows2.length, 0);
        should.equal(rows1[0].OBJ_ID, 1);
        should.equal(rows1[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.2 ResultSet + getRows(0) with fetchArraySize = total rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 150 });
        let rows1 = await result.resultSet.getRows(0);
        let rows2 = await result.resultSet.getRows(0);
        should.equal(rows1.length, 150);
        should.equal(rows2.length, 0);
        should.equal(rows1[0].OBJ_ID, 1);
        should.equal(rows1[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.3 ResultSet + getRows() with fetchArraySize > total rows', async function () {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 200 });
        let rows1 = await result.resultSet.getRows();
        let rows2 = await result.resultSet.getRows();
        should.equal(rows1.length, 150);
        should.equal(rows2.length, 0);
        should.equal(rows1[0].OBJ_ID, 1);
        should.equal(rows1[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.4 ResultSet + getRows(0) with fetchArraySize > total rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 200 });
        let rows1 = await result.resultSet.getRows(0);
        let rows2 = await result.resultSet.getRows(0);
        should.equal(rows1.length, 150);
        should.equal(rows2.length, 0);
        should.equal(rows1[0].OBJ_ID, 1);
        should.equal(rows1[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.5 ResultSet + getRows() with fetchArraySize < total rows', async function () {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 100 });
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.6 ResultSet + getRows(0) with fetchArraySize < total rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 100 });
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[149].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.7 ResultSet + getRows(125) + getRows() with fetchArraySize > remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 30 });
        await result.resultSet.getRows(125);
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.8 ResultSet + getRows(125) + getRows(0) with fetchArraySize > remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 30 });
        await result.resultSet.getRows(125);
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.9 ResultSet + getRows(125) + getRows() with fetchArraySize < remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 20 });
        await result.resultSet.getRows(125);
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.10 ResultSet + getRows(125) + getRows(0) with fetchArraySize < remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, {resultSet : true, fetchArraySize : 20 });
        await result.resultSet.getRows(125);
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await result.resultSet.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.11 ResultSet + getRow() + getRows() with fetchArraySize > remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, { resultSet : true, fetchArraySize : 200 });
        await result.resultSet.getRow();
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await result.resultSet.close ();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.12 ResultSet + getRow() + getRows(0) with fetchArraySize > remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, { resultSet : true, fetchArraySize : 200 });
        await result.resultSet.getRow();
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await result.resultSet.close ();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.13 ResultSet + getRow() + getRows() with fetchArraySize < remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, { resultSet : true, fetchArraySize : 100 });
        await result.resultSet.getRow();
        let rows = await result.resultSet.getRows();
        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await result.resultSet.close ();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.3.14 ResultSet + getRow() + getRows(0) with fetchArraySize < remaining rows', async function() {
      try {
        let result = await conn.execute(rsSelect, {}, { resultSet : true, fetchArraySize : 100 });
        await result.resultSet.getRow();
        let rows = await result.resultSet.getRows(0);
        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await result.resultSet.close ();
      }
      catch (err) {
        should.not.exist(err);
      }
    });
  });

  describe('249.4 REFCURSOR & getRows() with fetchArraySize', function () {
    it('249.4.1 RefCursor getRows() with fetchArraySize > total rows', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds, { fetchArraySize : 200 });
        let rs = results.outBinds.out;
        let rows = await rs.getRows();

        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[149].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist (err);
      }
    });

    it('249.4.2 RefCursor + getRows(0) with fetchArraySize > total rows', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds, { fetchArraySize : 200 });
        let rs = results.outBinds.out;
        let rows = await rs.getRows(0);

        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[1].OBJ_ID, 2);
        should.equal(rows[149].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.4.3 RefCursor getRows() with fetchArraySize < total rows', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds, { fetchArraySize : 100 });
        let rs = results.outBinds.out;
        let rows = await rs.getRows();

        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[149].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist (err);
      }
    });

    it('249.4.4 RefCursor + getRows(0) with fetchArraySize < total rows', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds, { fetchArraySize : 100 });
        let rs = results.outBinds.out;
        let rows = await rs.getRows(0);

        should.equal(rows.length, 150);
        should.equal(rows[0].OBJ_ID, 1);
        should.equal(rows[149].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it('249.4.5 RefCursor + getRows(125) & getRows() with fetchArraySize < remaining rows', async function () {
      try {
        const sql = "BEGIN nodb_rsgetRowsOut ( :out ); END;";
        const binds = {out: {type: oracledb.CURSOR, dir: oracledb.BIND_OUT}};
        let results = await conn.execute(sql, binds, { fetchArraySize : 20 });
        let rs = results.outBinds.out;
        await rs.getRows(125);
        let rows = await rs.getRows();

        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it( '249.4.6 RefCursor + getRows(125) & getRows(0) with fetchArraySize < remaining rows',  async function () {
      try {
        let results = await conn.execute(
          "BEGIN nodb_rsgetRowsOut ( :out ); END;",
          { out: {type : oracledb.CURSOR, dir : oracledb.BIND_OUT} }, { fetchArraySize : 20 });
        let rs = results.outBinds.out;
        await rs.getRows(125);
        let rows = await rs.getRows(0);

        should.equal(rows.length, 25);
        should.equal(rows[0].OBJ_ID, 126);
        should.equal(rows[24].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it( '249.4.7 RefCursor + getRow() & getRows() with fetchArraySize < remaining rows',  async function () {
      try {
        let results = await conn.execute(
          "BEGIN nodb_rsgetRowsOut ( :out ); END;",
          { out: {type : oracledb.CURSOR, dir : oracledb.BIND_OUT} }, { fetchArraySize : 100 });
        let rs = results.outBinds.out;
        await rs.getRow();
        let rows = await rs.getRows();

        should.equal(rows.length, 149);
        should.equal(rows[0].OBJ_ID, 2);
        should.equal(rows[148].OBJ_ID, 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });

    it( '249.4.8 RefCursor + getRow() & getRows(0) with fetchArraySize < remaining rows',  async function () {
      try {
        let results = await conn.execute(
          "BEGIN nodb_rsgetRowsOut ( :out ); END;",
          { out: {type : oracledb.CURSOR, dir : oracledb.BIND_OUT} }, { fetchArraySize : 100, outFormat : oracledb.OUT_FORMAT_ARRAY });
        let rs = results.outBinds.out;
        await rs.getRow();
        let rows = await rs.getRows(0);

        should.equal(rows.length, 149);
        should.equal(rows[0][0], 2);
        should.equal(rows[148][0], 150);
        await rs.close();
      }
      catch (err) {
        should.not.exist(err);
      }
    });
  });
});