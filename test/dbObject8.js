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
 *   207. dbObject8.js
 *
 * DESCRIPTION
 *   The test of examples/selectobject.js.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('207. dbObject8.js', () => {

  let conn;
  const TYPE1 = 'NODB_HARVEST_T';
  const TYPE2 = 'NODB_FARM_T';
  const TABLE = 'NODB_TAB_FARM';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql = `CREATE OR REPLACE TYPE ${TYPE1} AS VARRAY(10) OF VARCHAR2(20)`;
      await conn.execute(sql);

      sql =
        `CREATE OR REPLACE TYPE ${TYPE2} AS OBJECT (
          farmername VARCHAR2(20),
          harvest    ${TYPE1}
        )`;
      await conn.execute(sql);

      sql =
        `CREATE TABLE ${TABLE} (
          id NUMBER,
          farm ${TYPE2}
        )`;
      const plsql = testsUtil.sqlCreateTable(TABLE, sql);
      await conn.execute(plsql);

    } catch (err) {
      assert.fail(err);
    }
  }); // before()

  after(async () => {
    try {
      let sql = `DROP TABLE ${TABLE} PURGE`;
      await conn.execute(sql);

      sql = `DROP TYPE ${TYPE2} FORCE`;
      await conn.execute(sql);

      sql = `DROP TYPE ${TYPE1} FORCE`;
      await conn.execute(sql);

      await conn.close();
    } catch (err) {
      assert.fail(err);
    }
  }); // after()

  it('207.1 examples/selectobject.js', async () => {

    try {
      const FarmType = await conn.getDbObjectClass(TYPE2);
      // Farm Type
      assert.strictEqual(FarmType.prototype.name, TYPE2);
      assert.strictEqual(FarmType.prototype.isCollection, false);

      // Nested type
      assert.strictEqual(
        FarmType.prototype.attributes.HARVEST.typeClass.prototype.name,
        TYPE1
      );
      assert.strictEqual(
        FarmType.prototype.attributes.HARVEST.typeClass.prototype.isCollection,
        true
      );

      // Insert Method 1: pass a JavaScript object to the constructor
      let crops = [];
      crops[0] = ['Apples', 'Pears', 'Peaches'];
      const farm1 = new FarmType(
        {
          FARMERNAME: 'MacDonald',
          HARVEST:  crops[0]
        }
      );
      await conn.execute(
        `INSERT INTO ${TABLE} (id, farm) VALUES (:id, :f)`,
        {id: 1, f: farm1}
      );

      // Insert Method 2: set each attribute individually

      // A nested type
      const HarvestType = FarmType.prototype.attributes.HARVEST.typeClass;

      const farm2 = new FarmType();
      farm2.FARMERNAME = 'Giles';
      farm2.HARVEST = new HarvestType(['carrots', 'peas']);
      farm2.HARVEST.trim(1);             // whoops! no peas
      farm2.HARVEST.append('tomatoes');  // extend the collection
      // console.log(farm2.HARVEST.getValues());
      crops[1] = farm2.HARVEST.getValues();
      assert.deepEqual(crops[1], [ 'carrots', 'tomatoes' ]);

      await conn.execute(
        `INSERT INTO ${TABLE} (id, farm) VALUES (:id, :f)`,
        { id: 2, f: farm2 }
      );

      //
      // Insert Method 3: use the prototype object for the bind 'type',
      // and supply a JavaScript object directly for the 'val'
      //

      crops[2] = [ 'pepper', 'cinnamon', 'nutmeg' ];

      await conn.execute(
        `INSERT INTO ${TABLE} (id, farm) VALUES (:id, :f)`,
        { id: 3,
          f: {
            type: FarmType,   // pass the prototype object
            val: {             // a JavaScript object that maps to the DB object
              FARMERNAME: 'Smith',
              HARVEST: crops[2]
            }
          }
        }
      );

      //
      // Insert Method 4: use the Oracle type name.
      // Note: use a fully qualified type name when possible.
      //
      crops[3] = ['flowers', 'seedlings' ];
      await conn.execute(
        `INSERT INTO ${TABLE} (id, farm) VALUES (:id, :f)`,
        { id: 4,
          f: {
            type: TYPE2,   // the name of the database type, case sensitive
            val: {                // a JavaScript object that maps to the DB object
              FARMERNAME: 'Boy',
              HARVEST: crops[3]
            }
          }
        }
      );

      // Querying

      let result = await conn.execute(
        `SELECT id, farm FROM ${TABLE}`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const names = ['MacDonald', 'Giles', 'Smith', 'Boy'];
      let i = 0;
      for (const row of result.rows) {

        const farm = row.FARM; // a DbObject for the named Oracle type

        assert.strictEqual(farm.FARMERNAME, names[i]);

        const harvests = farm.HARVEST.getValues();
        assert.deepEqual(harvests, crops[i]);
        i++;
      }

    } catch (err) {
      assert.fail(err);
    }
  }); // 207.1
});
