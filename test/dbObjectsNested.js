/* Copyright (c) 2025, Oracle and/or its affiliates. */

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
 *   313. dbObjectsNested.js
 *
 * DESCRIPTION
 *    Testing Oracle Database Nested Db Objects and Nested Records
 *
 *****************************************************************************/
'use strict';

const oracledb = require ('oracledb');
const assert   = require ('assert');
const dbConfig = require ('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('313. dbObjectsNested.js', ()  => {
  let connection;

  before (async () => {
    connection = await oracledb.getConnection(dbConfig);
  });

  after (async () => {
    await connection.close();
  });

  describe('313.1 Nested DbObjects', function() {

    before(async () => {
      // CREATE TYPES
      let sql = `CREATE TYPE point_type AS OBJECT(
        x NUMBER,
        y NUMBER)`;
      await testsUtil.createType(connection, 'point_type', sql);

      sql = `CREATE TYPE shape_type AS OBJECT(
        name VARCHAR2(50),
        point point_type)`;
      await testsUtil.createType(connection, 'shape_type', sql);

      // CREATE TABLE
      sql = `CREATE TABLE my_shapes(id NUMBER, shape SHAPE_TYPE)`;
      await testsUtil.createTable(connection, 'my_shapes', sql);
    });

    after (async () => {
      await connection.execute(`DROP TABLE my_shapes PURGE`);
      await connection.execute(`DROP TYPE shape_type`);
      await connection.execute(`DROP TYPE point_type`);
    });

    it('313.1.1 Insert nested DbObject into table + fetch values', async () => {
      // Define the shape and point objects
      const shapeType = await connection.getDbObjectClass('SHAPE_TYPE');
      const pointType = await connection.getDbObjectClass('POINT_TYPE');
      // The attributes of the DbObject type must always be specified in upper
      // case
      // The attributes not defined are taken as null
      const pointValues = [ {}, { Y: 20 },  { X: 10 }, { X: 10, Y: 20 } ];

      let id = 1, result;
      for (const ptVal of pointValues) {
        const point = new pointType(ptVal);
        const shape = new shapeType({ NAME: 'My Shape', POINT: point });

        // Insert values
        result = await connection.execute(
          `INSERT INTO my_shapes (id, shape) VALUES (:id, :shape)`,
          { id: id, shape: shape }
        );
        await connection.commit();

        assert.strictEqual(result.rowsAffected, 1);

        // Get the shape object
        result = await connection.execute(
          `SELECT shape FROM my_shapes WHERE id = :id`,
          { id: id }
        );

        assert.strictEqual(result.rows[0][0].NAME, 'My Shape');
        if (!ptVal.X)
          assert.strictEqual(result.rows[0][0].POINT.X, null);
        else
          assert.strictEqual(result.rows[0][0].POINT.X, ptVal.X);
        if (!ptVal.Y)
          assert.strictEqual(result.rows[0][0].POINT.Y, null);
        else
          assert.strictEqual(result.rows[0][0].POINT.Y, ptVal.Y);

        id++;
      }

      // Insert a shape object with no attributes initialized and read it
      result = await connection.execute(
        `INSERT INTO my_shapes (id, shape) VALUES (:id, :shape)`,
        { id: id, shape: new shapeType() }
      );
      await connection.commit();
      assert.strictEqual(result.rowsAffected, 1);
      result = await connection.execute(
        `SELECT shape FROM my_shapes WHERE id = :id`,
        { id: id }
      );
      assert.strictEqual(result.rows[0][0].NAME, null);
      assert.strictEqual(result.rows[0][0].POINT, null);

    });  // 313.1.1
  }); // 313.1

  describe('313.2 Nested Records', function() {

    before(async () => {
      // CREATE PACKAGE DEFINITION
      let sql = `CREATE OR REPLACE PACKAGE pkg_nestedrectest AS
                  TYPE udt_Inner IS RECORD (Attr1 NUMBER, Attr2 NUMBER);
                  TYPE udt_Outer IS RECORD (Inner1 udt_Inner, Inner2 udt_Inner);
                  FUNCTION GetOuter (a_Value1 number, a_Value2 number) return udt_Outer;
                END pkg_nestedrectest;`;
      await connection.execute(sql);

      // CREATE PACKAGE BODY
      sql = `CREATE OR REPLACE PACKAGE BODY pkg_nestedrectest AS
              FUNCTION GetOuter (a_Value1 NUMBER, a_Value2 NUMBER) return udt_Outer IS
                t_Outer udt_Outer;
              BEGIN
                t_Outer.Inner1.Attr2 := a_Value1;
                t_Outer.Inner2.Attr2 := a_Value2;
                return t_Outer;
              END;
            END pkg_nestedrectest;`;
      await connection.execute(sql);
    });

    after (async () => {
      await connection.execute(`DROP PACKAGE pkg_nestedrectest`);
    });

    it('313.2.1 Works with nested records', async function() {
      // A bug exists with 19c and earlier Oracle Client versions with PL/SQL
      // nested records containing null and non-null attributes
      if (!oracledb.thin && testsUtil.getClientVersion() < 2100000000)
        this.skip();
      // Get the outer record type
      const RecTypeClass = await connection.getDbObjectClass('PKG_NESTEDRECTEST.UDT_OUTER');

      const plsql = `BEGIN
                       :outbv := PKG_NESTEDRECTEST.GETOUTER(:val1, :val2);
                     END;`;
      const options = [[null, null], [1, null], [null, 2], [1, 2]];

      for (const option of options) {
        const binds = {
          val1: option[0],
          val2: option[1],
          outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
        };
        const result = await connection.execute(plsql, binds);

        assert(result.outBinds.outbv.INNER1);
        assert.strictEqual(result.outBinds.outbv.INNER1.ATTR1, null);
        assert.strictEqual(result.outBinds.outbv.INNER1.ATTR2, option[0]);
        assert(result.outBinds.outbv.INNER2);
        assert.strictEqual(result.outBinds.outbv.INNER2.ATTR1, null);
        assert.strictEqual(result.outBinds.outbv.INNER2.ATTR2, option[1]);
      }
    });  // 313.2.1
  }); // 313.2

});
