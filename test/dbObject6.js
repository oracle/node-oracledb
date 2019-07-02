/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   205. dbObject6.js
 *
 * DESCRIPTION
 *   The test of examples/selectgeometry.js.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('205. dbObject6.js', () => {

  let conn;
  const TABLE  = 'NODB_TAB_TESTGEOMETRY';
  let initialID = 0;

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql =
        `CREATE TABLE ${TABLE} (
          id NUMBER(9) NOT NULL,
          geometry MDSYS.SDO_GEOMETRY NOT NULL
        )`;
      let plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

    } catch(err) {
      should.not.exist(err);
    }
  }); // before()

  after(async () => {
    try {
      let sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);

      await conn.close();
    } catch(err) {
      should.not.exist(err);
    }
  }); // after()

  it('205.1 examples/selectgeometry.js', async () => {

    try {
      const GeomType = await conn.getDbObjectClass("MDSYS.SDO_GEOMETRY");

      const geometry1 = new GeomType(
        {
          SDO_GTYPE: 2003,
          SDO_SRID: null,
          SDO_POINT: null,
          SDO_ELEM_INFO: [ 1, 1003, 3 ],
          SDO_ORDINATES: [ 1, 2, 5, 8 ]
        }
      );

      // Insert Method 1: pass a JavaScript object to the constructor.
      let sql = `INSERT INTO ${TABLE} (id, geometry) VALUES (:id, :g)`;
      let binds = [];
      binds[0] = {id: ++initialID, g: geometry1};
      await conn.execute(sql, binds[0]);

      // Insert Method 2: construct each element separately
      const ElementInfoType = GeomType.prototype.attributes["SDO_ELEM_INFO"].typeClass;
      const OrdinatesType = GeomType.prototype.attributes["SDO_ORDINATES"].typeClass;

      const geometry2 = new GeomType();
      geometry2.SDO_GTYPE = 2003;
      geometry2.SDO_ELEM_INFO = new ElementInfoType([2, 1003, 3]);
      geometry2.SDO_ORDINATES = new OrdinatesType([2, 1, 5, 7]);

      binds[1] = {id: ++initialID, g: geometry2};
      await conn.execute(sql, binds[1]);

      // Insert Method 3
      binds[2] = {
        id: ++initialID,
        g: {
          type: GeomType,   // pass the type object
          val: {            // a JavaScript object that maps to the DB object
            SDO_GTYPE: 2003,
            SDO_SRID: null,
            SDO_POINT: null,
            SDO_ELEM_INFO: [ 3, 1003, 3 ],
            SDO_ORDINATES: [ 3, 2, 5, 8 ]
          }
        }
      };
      await conn.execute(sql, binds[2]);

      // Insert Method 4
      binds[3] = {
        id: ++initialID,
        g: {
          type: "MDSYS.SDO_GEOMETRY",   // the name of the type, case sensitive
          val: {                        // a JavaScript object that maps to the DB object
            SDO_GTYPE: 2003,
            SDO_SRID: null,
            SDO_POINT: null,
            SDO_ELEM_INFO: [ 4, 1003, 3 ],
            SDO_ORDINATES: [ 4, 8, 5, 9 ]
          }
        }
      };
      await conn.execute(sql, binds[3]);

      // Fetch the objects back
      sql = `SELECT id, geometry FROM ${TABLE}`;
      let result = await conn.execute(sql);

      for (let i = 0; i < result.rows.length; i++) {
        should.strictEqual(result.rows[i][0], (i + 1) );
        should.strictEqual(result.rows[i][1].SDO_GTYPE, 2003);
        should.strictEqual(result.rows[i][1].SDO_SRID, null);
        should.strictEqual(result.rows[i][1].SDO_POINT, null);
      }
    } catch (err) {
      should.not.exist(err);
    }

  }); // 205.1
});