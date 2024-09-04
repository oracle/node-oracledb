/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
 * Licensed under the Apache License, Version 2.0 (the `License`);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an `AS IS` BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   297. jsonDualityViews7.js
 *
 * DESCRIPTION
 *   Testing JSON Relational Duality View using vector data type
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('297. jsonDualityViews7.js', function() {

  let connection = null;
  let dbaConn = null;
  let isRunnable = false;
  let isOracleDB_23_4;

  const username = 'njs_jsonDv7';

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2304000000, 2304000000);
    if (dbConfig.test.drcp || !(isRunnable && dbConfig.test.DBA_PRIVILEGE) || dbConfig.test.isCmanTdm) {
      this.skip();
    }

    // 23.4 requires the _id column for creating JSON Duality Views, which
    // is not added in these tests. So check if the Oracle Database version
    // is 23.4. This condition will be used for some tests to check, if the
    // test should be skipped.
    if (await testsUtil.getMajorDBVersion() === '23.4') {
      isOracleDB_23_4 = true;
    }

    const dbaCredential = {
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA,
    };

    const pwd = testsUtil.generateRandomPassword();
    dbaConn = await oracledb.getConnection(dbaCredential);
    await dbaConn.execute(`create user ${username} identified by ${pwd}`);
    await dbaConn.execute(`grant create session, resource, connect, unlimited tablespace to ${username}`);
    connection = await oracledb.getConnection({user: username,
      password: pwd,
      connectString: dbConfig.connectString
    });
  });

  after(async function() {
    if (dbConfig.test.drcp || !(isRunnable && dbConfig.test.DBA_PRIVILEGE) || dbConfig.test.isCmanTdm) return;
    await connection.close();

    await dbaConn.execute(`drop user ${username} cascade`);
    await dbaConn.close();
  });

  describe('297.1 Base table having Vector datatype column', function() {
    const table_name = 'vector_base_table';
    before(async function() {
      const sql = `
        create table ${table_name}(
          vec_id number,
          first varchar(128),
          con_col VECTOR,
          constraint vec_id_pk primary key (vec_id)
        )`;

      // create the vector table
      const plsql = testsUtil.sqlCreateTable(table_name, sql);
      await connection.execute(plsql);
    });

    after(async function() {
      await connection.execute(testsUtil.sqlDropTable(`${table_name}`));
    });

    it('297.1.1 insert vector data in table and views', async function() {
      const arr = [1, 2, 3, 4, 6];
      const float32arr = new Float32Array(arr);

      await connection.execute(
        `insert into ${table_name} (vec_id, first, con_col) values (:1, :2, :3)`,
        {
          1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_NUMBER, val: 1 },
          2: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: 'Harry' },
          3: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32arr }
        }
      );

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
      CREATE OR REPLACE JSON DUALITY VIEW jsondv1 AS
        ${table_name} @insert @update @delete {
          _id : vec_id,
          FIRST : first,
          CON_COL : con_col
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select json_serialize(data pretty) from jsondv1`);
      assert.strictEqual(JSON.parse(result.rows[0][0])._id, 1);
      assert.strictEqual(JSON.parse(result.rows[0][0]).FIRST, "Harry");
      assert.deepStrictEqual(JSON.parse(result.rows[0][0]).CON_COL, arr);
    }); // 297.1.1

    it('297.1.2 create duality View using SQL syntax', async function() {
      const arr = [1, 2, 3, 4, 6];

      // Create the JSON relational duality view
      await connection.execute(`
      CREATE OR REPLACE JSON DUALITY VIEW jsondv2 AS
        SELECT JSON{
          '_id' : a.vec_id,
          'FIRST' : a.first,
          'CON_COL' : a.con_col WITH (CHECK)
      } from ${table_name} a with (INSERT,UPDATE,DELETE)
      `);

      // Select data from the view
      const result = await connection.execute(`select json_serialize(data pretty) from jsondv2`);
      assert.strictEqual(JSON.parse(result.rows[0][0])._id, 1);
      assert.strictEqual(JSON.parse(result.rows[0][0]).FIRST, "Harry");
      assert.deepStrictEqual(JSON.parse(result.rows[0][0]).CON_COL, arr);
    }); // 297.1.2

    it('297.1.3 create duality View using json{*} syntax', async function() {
      if (isOracleDB_23_4) this.skip();

      const arr = [1, 2, 3, 4, 6];

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON DUALITY VIEW jsondv3 as
          select json{*} from ${table_name} a with (INSERT,UPDATE,DELETE)
      `);

      // Select data from the view
      const result = await connection.execute(`select json_serialize(data pretty) from jsondv3`);
      assert.strictEqual(JSON.parse(result.rows[0][0]).FIRST, "Harry");
      assert.deepStrictEqual(JSON.parse(result.rows[0][0]).CON_COL, arr);
    }); // 297.1.3

    it('297.1.4 create duality View using JSONIZE syntax', async function() {
      if (isOracleDB_23_4) this.skip();

      const arr = [1, 2, 3, 4, 6];

      // Create the JSON relational duality view
      await connection.execute(`
      CREATE OR REPLACE JSON DUALITY VIEW jsondv4 as
        JSONIZE(
        ${table_name} with (insert,update,delete){*}
      )`);

      // Select data from the view
      const result = await connection.execute(`select json_serialize(data pretty) from jsondv4`);
      assert.strictEqual(JSON.parse(result.rows[0][0]).FIRST, "Harry");
      assert.deepStrictEqual(JSON.parse(result.rows[0][0]).CON_COL, arr);
    }); // 297.1.4

    it('297.1.5 perform insert through duality view ', async function() {
      const arr = [4, 5, 6, 7];
      const float32arr = new Float32Array(arr);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON DUALITY VIEW jsondv as
          ${table_name} @insert @update @delete {
            _id : vec_id,
            FIRST : first,
            CON_COL : con_col
          }`);

      await connection.execute(
        `insert into ${table_name} (vec_id, first, con_col) values (:1, :2, :3)`,
        {
          1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_NUMBER, val: 2 },
          2: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: 'Harry' },
          3: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32arr }
        }
      );

      await connection.commit();

      // Select data from the view
      const result = await connection.execute(`select json_serialize(data pretty) from jsondv adv where adv.data."_id" = 2`);
      assert.strictEqual(JSON.parse(result.rows[0][0])._id, 2);
      assert.strictEqual(JSON.parse(result.rows[0][0]).FIRST, "Harry");
      assert.deepStrictEqual(JSON.parse(result.rows[0][0]).CON_COL, arr);
    }); // 297.1.5

    it('297.1.6 inserting null to a vector column through JSON Duality view ', async function() {
      const arr = [null];
      const float32arr = new Float32Array(arr);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON DUALITY VIEW jsondv AS
          ${table_name} @insert @update @delete {
            _id : vec_id,
            FIRST : first,
            CON_COL : con_col
          }`);

      await connection.execute(
        `insert into ${table_name} (vec_id, first, con_col) values (:1, :2, :3)`,
        {
          1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_NUMBER, val: 3 },
          2: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: 'Harry' },
          3: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32arr }
        }
      );

      await connection.commit();

      // Select data from the view
      const result = await connection.execute(`select json_serialize(data pretty) from jsondv adv where adv.data."_id" = 3`);
      assert.strictEqual(JSON.parse(result.rows[0][0])._id, 3);
      assert.strictEqual(JSON.parse(result.rows[0][0]).FIRST, "Harry");
      assert.deepStrictEqual(JSON.parse(result.rows[0][0]).CON_COL, [0]);
    }); // 297.1.6

    it('297.1.7 update the vector column ', async function() {
      const arr = [1, 2, 3];

      // Create the JSON relational duality view
      await connection.execute(`
        UPDATE jsondv adv
          SET data = json_transform(data, SET '$.CON_COL' = json('[1,2,3]'))
          WHERE adv.data."_id" = 2
      `);

      // Select data from the view
      const result = await connection.execute(`select json_serialize(data pretty) from jsondv adv where adv.data."_id" = 2`);
      assert.strictEqual(JSON.parse(result.rows[0][0])._id, 2);
      assert.strictEqual(JSON.parse(result.rows[0][0]).FIRST, "Harry");
      assert.deepStrictEqual(JSON.parse(result.rows[0][0]).CON_COL, arr);
    }); // 297.1.7

    it('297.1.8 select using vector column (using vector column in where clause)', async function() {

      // select from JSON relational duality view
      await assert.rejects(
        async () => await connection.execute(`
          select * from jsondv adv where
            json_value(data, '$.CON_COL' returning VECTOR) = '[1,2,3]'
        `),
        /ORA-22848:/ // ORA-22848: cannot use VECTOR type as comparison key
      );
    }); // 297.1.8

    it('297.1.9 create Duality View with vector column as flex column', async function() {

      // Create the JSON relational duality view
      // VECTOR COLUMN + FLEX COLUMN
      await assert.rejects(
        async () => await connection.execute(`
          CREATE OR REPLACE JSON DUALITY VIEW jsondv AS
            ${table_name} @insert @update @delete {
              _id : vec_id,
              firstName : first,
              con_col @flex
            }
        `),
        /ORA-42628:/ /* ORA-42628: Flexible column 'VECTOR.CON_COL' is not JSON(Object) data type in
                    * JSON-Relational duality View 'VECTORDV'.
                    */
      );
    }); // 297.1.9
  });

  describe('297.2 With multiple tables', function() {

    before(async function() {
      if (isOracleDB_23_4) this.skip();

      let sql = `
        create table vector(
          vec_id                  number,
          VectorCol               vector,
          VectorFixedCol          vector(2),
          Vector32Col             vector(10, float32),
          Vector64Col             vector(10, float64),
          VectorInt8Col           vector(4, int8),
          VectorFlexCol           vector(*, float32),
          constraint pk_vector primary key (vec_id)
       )`;

      // create the vector table
      let plsql = testsUtil.sqlCreateTable('vector', sql);
      await connection.execute(plsql);

      sql = `
        create table vector_class (
          vec_id number primary key,
          vcid number,
          clsid number,
          constraint fk_vector_class1 foreign key (vec_id) references vector(vec_id)
        )`;

      // create the vector_class table
      plsql = testsUtil.sqlCreateTable('vector_class', sql);
      await connection.execute(plsql);
    });

    after(async function() {
      if (isOracleDB_23_4) return;

      await connection.execute(testsUtil.sqlDropTable('vector_class'));
      await connection.execute(testsUtil.sqlDropTable('vector'));
    });

    afterEach(async function() {
      await connection.execute(`DELETE FROM vector_class`);
      await connection.execute(`DELETE FROM vector`);
    });

    it('297.2.1 insert float32 vector data in table and views', async function() {

      // insert data into vector table
      const FloatArray = new Float32Array([0 * 0.23987, 1 * -0.23987, 2 * -0.23987]);

      // inserting a float32 array
      await connection.execute(`insert into vector (vec_id, VectorCol)
      values(1, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
        val: FloatArray
      }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorCol,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);
      assert.strictEqual(result.rows.length, 1);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [0, -0.23986999690532684, -0.4797399938106537]);
    }); // 297.2.1

    it('297.2.2 insert float32 vector data with dimension 10', async function() {

      // Create a Float32Array
      const float32Array = new Float32Array(
        [1.23, 4, -7.89, 10.11, -12.13, 14.15, -16.17, 18.19, -20.21, 9.23]);

      // inserting a float32 array
      await connection.execute(`insert into vector (vec_id, Vector32Col) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: Vector32Col,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [1.2300000190734863, 4, -7.889999866485596,
          10.109999656677246, -12.130000114440918,  14.149999618530273,
          -16.170000076293945, 18.190000534057617, -20.209999084472656, 9.229999542236328]);
    }); // 297.2.2

    it('297.2.3 insert float64 vector data', async function() {

      // Create a Float64Array
      const float64Array = new Float64Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // inserting a float32 array
      await connection.execute(`insert into vector (vec_id, Vector64Col)
      values(2, :2)`, {2: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR,
        val: float64Array
      }});

      await connection.execute(`
        insert into vector_class values (2, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: Vector64Col,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 2);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }); // 297.2.3

    it('297.2.4 insert fixed vector data', async function() {

      // inserting a float32 array
      await connection.execute(`insert into vector (vec_id, VectorFixedCol) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: [1, 2] }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
          vector @insert@update@delete {
            vector_id: vec_id,
            vector_name: VectorFixedCol,
            vector_class: vector_class @insert@update@delete {
              vector_class_id: vcid,
              vector_id: vec_id
            }
          }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [1, 2]);
    }); // 297.2.4

    it('297.2.5 insert int8 vector data', async function() {

      // Create a int8Arr
      const int8arr = new Int8Array([126, 125, -126, -23]);

      await connection.execute(`insert into vector (vec_id, VectorInt8Col) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorInt8Col,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [126, 125, -126, -23]);
    }); // 297.2.5

    it('297.2.6 insert int8 typed array to float64 vector column', async function() {

      // Create a int8arr
      const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

      await connection.execute(`insert into vector (vec_id, Vector64Col) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: Vector64Col,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);
    }); // 297.2.6

    it('297.2.7 insert int8 typed array to flex vector column', async function() {

      // Create a int8arr
      const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

      await connection.execute(`insert into vector (vec_id, VectorFlexCol) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorFlexCol,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);
    }); // 297.2.7

    it('297.2.8 insert int8 typed array to float32 vector column', async function() {

      // Create a int8arr
      const int8arr = new Int8Array([126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);

      await connection.execute(`insert into vector (vec_id, Vector32Col) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: Vector32Col,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [126, 125, -126, -23, 11, 12, -11, -12, 10, 10]);
    }); // 297.2.8

    it('297.2.9 insert a float32 typed array into an int8 vector column', async function() {

      // Create a Float32Array
      const float32Array = new Float32Array(
        [-5, 4, -7, 6]);
      await connection.execute(`insert into vector (vec_id, VectorInt8Col) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32Array }});

      await connection.execute(`
        insert into vector_class values (1, 1, 1)
      `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorInt8Col,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [-5, 4, -7, 6]);
    }); // 297.2.9

    it('297.2.10 insert a float64 into an int8 vector column', async function() {

      // Create a Float32Array
      const float64Array = new Float64Array(
        [-5, 4, -7, 6]);
      await connection.execute(`insert into vector (vec_id, VectorInt8Col) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Array }});

      await connection.execute(`
         insert into vector_class values (1, 1, 1)
       `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorInt8Col,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [-5, 4, -7, 6]);
    }); // 297.2.10

    it('297.2.11 insert vector as clob to Int8 column', async function() {
      const arr = Array(4).fill(2);
      let lob = await connection.createLob(oracledb.CLOB);

      // Write the buffer to the CLOB
      await lob.write(JSON.stringify(arr));

      await connection.execute(
        `INSERT INTO vector
         (vec_id, VectorInt8Col) VALUES (:id, :clob)`,
        { id: 1,
          clob: lob
        });

      lob.destroy();
      await connection.execute(`
         insert into vector_class values (1, 1, 1)
       `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
          vector @insert@update@delete {
            vector_id: vec_id,
            vector_name: VectorInt8Col,
            vector_class: vector_class @insert@update@delete {
              vector_class_id: vcid,
              vector_id: vec_id
            }
          }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);
      lob = result.rows[0][0].vector_name;

      // Convert the CLOB data to a string directly
      const clobData = await lob.toString('utf8');

      assert.strictEqual(clobData, arr.toString('utf8'));
    }); // 297.2.11

    it.skip('297.2.12 insert clob with array of 65535 elements to a vector column', async function() {
      /* Bug: 36455264
         Sorting JSON data with a large size is not feasible.
      */
      const arr = Array(65535).fill(2);
      const lob = await connection.createLob(oracledb.CLOB);

      // Write the buffer to the CLOB
      await lob.write(JSON.stringify (arr));

      await connection.execute(
        `INSERT INTO vector
         (vec_id, VectorCol) VALUES (:id, :clob)`,
        { id: 1,
          clob: lob
        }
      );

      lob.destroy();
      await connection.execute(
        `insert into vector_class values (1, 1, 1)`
      );

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        create or replace json relational duality view vector_ov
        as
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorCol,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      await assert.rejects(
        async () => await connection.execute(`select * from vector_ov order by 1`),
        /ORA-51862:/ /*
                      ORA-51862: VECTOR library processing error in 'qjsnErrHndl'
                      JZN-00755: vector too large for comparison or indexing operation
                    */
      );
    }); // 297.2.12

    it('297.2.13 insert clob with array of less elements to a vector column', async function() {
      const arr = Array(10).fill(2);
      let lob = await connection.createLob(oracledb.CLOB);

      // Write the buffer to the CLOB
      await lob.write(JSON.stringify (arr));

      await connection.execute(
        `INSERT INTO vector
         (vec_id, VectorCol) VALUES (:id, :clob)`,
        { id: 1,
          clob: lob
        });

      lob.destroy();
      await connection.execute(`
         insert into vector_class values (1, 1, 1)
       `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorCol,
          vector_class: vector_class @insert@update@delete {
            vector_class_id: vcid,
            vector_id: vec_id
          }
        }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);
      lob = result.rows[0][0].vector_name;

      // Convert the CLOB data to a string directly
      const clobData = await lob.toString('utf8');

      assert.strictEqual(clobData, arr.toString('utf8'));
    }); // 297.2.13

    it.skip('297.2.14 insert a float32 vector with 65535 dimensions into a vector column of same dimensions', async function() {
      /* Bug: 36455264
         Sorting JSON data with a large size is not feasible.
      */
      const arr = Array(65535).fill(2.5);
      const float32arr = new Float32Array(arr);

      await connection.execute(`insert into vector (vec_id, VectorFlexCol) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32arr }});

      await connection.execute(`
         insert into vector_class values (1, 1, 1)
       `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        create or replace json relational duality view vector_ov
        as
          vector @insert@update@delete {
            vector_id: vec_id,
            vector_name: VectorFlexCol,
            vector_class: vector_class @insert@update@delete {
              vector_class_id: vcid,
              vector_id: vec_id
            }
          }
       `);

      await assert.rejects(
        async () => await connection.execute(`select * from vector_ov order by 1`),
        /ORA-51862:/ /*
                      ORA-51862: VECTOR library processing error in 'qjsnErrHndl'
                      JZN-00755: vector too large for comparison or indexing operation
                    */
      );
    }); // 297.2.14

    it('297.2.15 insert a float32 vector with less dimensions into a vector column of same dimensions', async function() {
      const arr = Array(10).fill(2.5);
      const float32arr = new Float32Array(arr);

      await connection.execute(`insert into vector (vec_id, VectorFlexCol) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float32arr }});

      await connection.execute(`
         insert into vector_class values (1, 1, 1)
       `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        create or replace json relational duality view vector_ov
        as
          vector @insert@update@delete {
            vector_id: vec_id,
            vector_name: VectorFlexCol,
            vector_class: vector_class @insert@update@delete {
              vector_class_id: vcid,
              vector_id: vec_id
            }
          }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        arr);
    }); // 297.2.15

    it('297.2.16 insert a float64 typed array created from ArrayBuffer', async function() {
      const elements = [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0];
      const arrBuf = new ArrayBuffer(128);

      // Create typed array of 10 elements from byteOffset 8
      const float64Arr = new Float64Array(arrBuf, 8, 10);

      // initialize
      elements.forEach((element, index) => {
        float64Arr[index] = element;
      });
      await connection.execute(`insert into vector (vec_id, Vector64Col) values (1, :1)`,
        {1: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: float64Arr }});

      await connection.execute(`
         insert into vector_class values (1, 1, 1)
       `);

      await connection.commit();

      // Create the JSON relational duality view
      await connection.execute(`
        create or replace json relational duality view vector_ov
        as
          vector @insert@update@delete {
            vector_id: vec_id,
            vector_name: Vector64Col,
            vector_class: vector_class @insert@update@delete {
              vector_class_id: vcid,
              vector_id: vec_id
            }
          }
      `);

      // Select data from the view
      const result = await connection.execute(`select * from vector_ov order by 1`);

      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.strictEqual(result.rows[0][0].vector_class[0].vector_class_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [8.1, 7.2, 6.3, 5.4, 4.5, 3.6, 2.7, 1.8, 9.9, 0.0]);
    }); // 297.2.16
  });

  describe('297.3 Sanity DMLs', function() {
    before(async function() {
      if (isOracleDB_23_4) this.skip();

      let sql = `
        create table vector(
          vec_id                  number,
          VectorCol               vector,
          VectorFixedCol          vector(2),
          Vector32Col             vector(10, float32),
          Vector64Col             vector(10, float64),
          VectorInt8Col           vector(4, int8),
          VectorFlexCol           vector(*, *),
          constraint pk_vector primary key (vec_id)
      )`;

      // create the vector table
      let plsql = testsUtil.sqlCreateTable('vector', sql);
      await connection.execute(plsql);

      sql = `
        create table vector_class (
          vec_id number primary key,
          vcid number,
          clsid number,
          constraint fk_vector_class1 foreign key (vec_id) references vector(vec_id)
        )`;

      // create the vector_class table
      plsql = testsUtil.sqlCreateTable('vector_class', sql);
      await connection.execute(plsql);
    });

    after(async function() {
      if (isOracleDB_23_4) return;

      await connection.execute(testsUtil.sqlDropTable('vector_class'));
      await connection.execute(testsUtil.sqlDropTable('vector'));
    });

    afterEach(async function() {
      await connection.execute(`DELETE FROM vector_class`);
      await connection.execute(`DELETE FROM vector`);
    });

    it('297.3.1 insert a float32 typed array into tables from JSON DV', async function() {
      const FloatArray = new Float32Array([0 * 0.23987, 1 * -0.23987, 2 * -0.23987]);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorCol
        }
      `);

      // insert data into vector table
      const bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": FloatArray} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [0, -0.23986999690532684, -0.4797399938106537]);
    }); // 297.3.1

    it('297.3.2 insert a 65535 dimension float32 typed array into tables from JSON DV', async function() {
      const arr = Array(65535).fill(2.5);
      const FloatArray = new Float32Array(arr);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
          vector @insert@update@delete {
            vector_id: vec_id,
            vector_name: VectorFlexCol
          }
      `);

      // insert data into vector table
      const bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": FloatArray} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        arr);
    }); // 297.3.2

    it('297.3.3 insert a 65536 dimension float32 typed array into tables from JSON DV', async function() {
      const arr = Array(65536).fill(2.5);

      const FloatArray = new Float32Array(arr);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        VECTOR @INSERT@UPDATE@DELETE {
          vector_id: vec_id,
          vector_name: VectorFlexCol
        }
      `);

      // insert data into vector table
      const bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": FloatArray} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );
      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        arr);
    }); // 297.3.3

    it('297.3.4 insert a float32 typed array into tables from JSON DV wrong dimension', async function() {
      const FloatArray = new Float32Array([0 * 0.23987, 1 * -0.23987]);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        VECTOR @INSERT@UPDATE@DELETE {
          vector_id: vec_id,
          vector_name: Vector32Col
        }
      `);

      // insert data into vector table
      const bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": FloatArray} }};
      await assert.rejects(
        async () => await connection.execute(`
          insert into vector_ov values (:c)`,
        bv),
        /ORA-42692:/);
    }); // 297.3.4

    it('297.3.5 update a float32 typed array into tables from JSON DV', async function() {
      let FloatArray = new Float32Array([0 * 0.23987, 1 * -0.23987, 2 * -0.23987]);

      // Create the JSON relational duality view
      await connection.execute(`
    create or replace json relational duality view vector_ov
    as
    vector @insert@update@delete {
      vector_id: vec_id,
      vector_name: VectorCol
    }
  `);

      // insert data into vector table
      const bv1 = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": FloatArray} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv1
      );

      // Update
      FloatArray = new Float32Array([10, 12, 14]);
      const bv2 = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: FloatArray }};
      await connection.execute(`
        update vector_ov s set data = JSON_TRANSFORM(data, SET '$.vector_name'= :c) where s.data.vector_id = 1`,
      bv2
      );

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [10, 12, 14]);
    }); // 297.3.5

    it('297.3.6 delete a float32 typed array into tables from JSON DV', async function() {

      // insert data into vector table
      const FloatArray1 = new Float32Array([0 * 0.23987, 1 * -0.23987, 2 * -0.23987]);
      const FloatArray2 = new Float32Array([1 * 0.23987, 2 * -0.23987, 3 * -0.23987]);

      // Create the JSON relational duality view
      await connection.execute(`
    create or replace json relational duality view vector_ov
    as
      vector @insert@update@delete {
        vector_id: vec_id,
        vector_name: VectorCol
      }
      `);

      // insert FloatArray1
      let bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": FloatArray1} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      // insert FloatArray2
      bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 2, "vector_name": FloatArray2} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      // Delete
      await connection.execute(`delete vector_ov where json_value(data,'$.vector_id')=1`);

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 2);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [0.23986999690532684, -0.4797399938106537, -0.7196099758148193]);
    }); // 297.3.6

    it('297.3.7 insert a float64 into tables from JSON DV', async function() {

      // create float64 Array
      const float64Array = new Float64Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
        VECTOR @INSERT@UPDATE@DELETE {
          vector_id: vec_id,
          vector_name: Vector64Col
        }
      `);

      // insert data into vector table
      const bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": float64Array} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }); // 297.3.7

    it('297.3.8 update a float64 into tables from JSON DV', async function() {

      // insert data into vector table
      const float64Array = new Float64Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Create the JSON relational duality view
      await connection.execute(`
    create or replace json relational duality view vector_ov
    as
    vector @insert@update@delete {
      vector_id: vec_id,
      vector_name: Vector64Col
    }
  `);

      const bv1 = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": float64Array} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv1
      );

      // Update
      const FloatArray = new Float64Array([10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
      const bv2 = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: FloatArray }};
      await connection.execute(`
        update vector_ov s set data = JSON_TRANSFORM(data, SET '$.vector_name'= :c) where s.data.vector_id = 1`,
      bv2
      );

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
    }); // 297.3.8

    it('297.3.9 delete a float64 into tables from JSON DV', async function() {

      // insert data into vector table
      const float64Array1 = new Float64Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const float64Array2 = new Float64Array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: Vector64Col
        }
      `);

      // insert FloatArray1
      let bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": float64Array1} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      // insert FloatArray2
      bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 2, "vector_name": float64Array2} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      // Delete
      await connection.execute(`delete vector_ov where json_value(data,'$.vector_id')=1`);

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 2);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    }); // 297.3.9

    it('297.3.10 insert a VectorInt8Col typed array into tables from JSON DV', async function() {

      // Create a int8Arr
      const int8arr = new Int8Array([126, 125, -126, -23]);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorInt8Col
        }
      `);

      const bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": int8arr} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [126, 125, -126, -23]);
    }); // 297.3.10

    it('297.3.11 update a VectorInt8Col typed array into tables from JSON DV', async function() {

      // Create a int8Arr
      const int8arr = new Int8Array([126, 125, -126, -23]);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov AS
        vector @insert@update@delete {
          vector_id: vec_id,
          vector_name: VectorInt8Col
        }
      `);

      const bv1 = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": int8arr} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv1
      );

      // Update
      const int8arr2 = new Int8Array([-33, 123, 45, 31]);
      const bv2 = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VECTOR, val: int8arr2 }};
      await connection.execute(`
        update vector_ov s set data = JSON_TRANSFORM(data, SET '$.vector_name'= :c) where s.data.vector_id = 1`,
      bv2
      );

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 1);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [-33, 123, 45, 31]);
    }); // 297.3.11

    it('297.3.12 delete a VectorInt8Col typed array into tables from JSON DV', async function() {

      // Create a int8Arr
      const int8arr1 = new Int8Array([126, 125, -126, -23]);
      const int8arr2 = new Int8Array([-33, 123, 45, 31]);

      // Create the JSON relational duality view
      await connection.execute(`
        CREATE OR REPLACE JSON RELATIONAL DUALITY VIEW vector_ov
        AS
          vector @insert@update@delete {
            vector_id: vec_id,
            vector_name: VectorInt8Col
          }
      `);

      // insert int8Arr
      let bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 1, "vector_name": int8arr1} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      // insert int8arr2
      bv = {c: {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_JSON, val: {"vector_id": 2, "vector_name": int8arr2} }};
      await connection.execute(`
        insert into vector_ov values (:c)`,
      bv
      );

      // Delete
      await connection.execute(`delete vector_ov where json_value(data,'$.vector_id')=1`);

      const result = await connection.execute(`select * from vector_ov`);
      assert.strictEqual(result.rows[0][0].vector_id, 2);
      assert.deepStrictEqual(Array.from(result.rows[0][0].vector_name),
        [-33, 123, 45, 31]);
    }); // 297.3.12
  });
});
