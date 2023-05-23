/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   197. dbObjectsNestedTable.js
 *
 * DESCRIPTION
 *    Testing Oracle Database Nested Table Object Collection type(s)
 *
 *****************************************************************************/
'use strict';

const oracledb = require ('oracledb');
const assert   = require ('assert');
const dbConfig = require ('./dbconfig.js');

describe('197. dbObjectsNestedTable.js', ()  => {
  let connection = null;

  before (async () => {
    connection = await oracledb.getConnection (dbConfig);

    let sql = `CREATE TYPE nodb_test197_typ IS TABLE OF VARCHAR2(30)`;
    await connection.execute (sql);
    await connection.commit ();

    sql = `CREATE TABLE nodb_test197_TAB (
             ID NUMBER, DEPT_NAMES nodb_test197_typ)
          NESTED TABLE dept_names store as dnames_nt`;
    await connection.execute (sql);
    await connection.commit ();

  });

  after (async () => {
    await connection.execute (`drop table nodb_test197_tab purge`);
    await connection.execute (`drop type nodb_test197_typ`);
    await connection.commit ();
    await connection.close ();
  });

  it('197.1 Insert into table with Nested-table + getValues',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19701;

      let obj = new objClass ();
      obj.append ("Shipping");
      obj.append ("Finance");
      obj.append ("Sales") ;
      await connection.execute (sql, { id: id,  v : { val : obj } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB`;
      const result = await connection.execute (sql);
      obj = result.rows[0][1];

      const arr = obj.getValues ();
      assert.equal (arr.length, 3);

      assert.strictEqual (arr[0], "Shipping");
      assert.strictEqual (arr[1], "Finance");
      assert.strictEqual (arr[2], "Sales");
    }
  );  // 197.1


  it ('197.2 Insert into table with Nested-table + getKeys',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES (:id,  :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19702;

      let obj = new objClass ();
      obj.append ("Shipping");
      obj.append ("Finance");
      obj.append ("Sales") ;
      await connection.execute (sql, { id: id,  v : { val : obj } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB`;
      const result = await connection.execute (sql);
      obj = result.rows[0][1];

      const arr = obj.getKeys ();
      assert.equal (arr.length, 3);
      assert.strictEqual (arr[0], 0);
      assert.strictEqual (arr[1], 1);
      assert.strictEqual (arr[2], 2);
    }
  );  // 197.2

  it ('197.3 Insert into table with Nested-table + first * next',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19703;

      let obj = new objClass ();
      obj.append ("Shipping");
      obj.append ("Finance");
      obj.append ("Sales") ;
      await connection.execute (sql, { id : id,  v : { val : obj } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB`;
      const result = await connection.execute (sql);
      obj = result.rows[0][1];

      let index = obj.getFirstIndex ();
      while (index != null) {
        const v = obj.getElement (index);
        switch (index) {
          case 0:
            assert.strictEqual (v, "Shipping");
            break;
          case 1:
            assert.strictEqual (v, "Finance");
            break;
          case 2:
            assert.strictEqual (v, "Sales");
            break;
        }
        index = obj.getNextIndex (index);
      }
    }
  );  //197.3

  it('197.4 Insert into table with Nested-table + last + prev',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19704;

      let obj = new objClass ();
      obj.append ("Shipping");
      obj.append ("Finance");
      obj.append ("Sales") ;
      await connection.execute (sql, { id : id,  v : { val : obj } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB`;
      const result = await connection.execute (sql);
      obj = result.rows[0][1];

      let index = obj.getLastIndex ();
      while (index != null) {
        let v = obj.getElement (index);
        switch (index) {
          case 0:
            assert.strictEqual (v, "Shipping");
            break;
          case 1:
            assert.strictEqual (v, "Finance");
            break;
          case 2:
            assert.strictEqual (v, "Sales");
            break;
        }
        index = obj.getPrevIndex (index);
      }

    }
  );  //197.4


  it('197.5 Insert into table with Nested-table + getElement',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19705;

      let obj = new objClass ();
      obj.append ("Shipping");
      obj.append ("Finance");
      obj.append ("Sales") ;
      await connection.execute (sql, { id : id, v : { val : obj } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB`;
      const result = await connection.execute (sql);
      obj = result.rows[0][1];

      // randomly use getElement ()
      let v = obj.getElement (1);
      assert.strictEqual (v, "Finance");
      v = obj.getElement (0);
      assert.strictEqual (v, "Shipping");

    }
  );  //197.5

  it('197.6 Insert into table with Nested-table + hasElement',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19706;

      let obj = new objClass ();
      obj.append ("Shipping");
      obj.append ("Finance");
      obj.append ("Sales") ;
      await connection.execute (sql, { id : id, v : { val : obj } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB`;
      const result = await connection.execute (sql);
      obj = result.rows[0][1];

      assert.strictEqual(obj.hasElement(0), true);
      assert.strictEqual(obj.hasElement(1), true);
      assert.strictEqual(obj.hasElement(2), true);
      assert.strictEqual(obj.hasElement(3), false);
    }
  );  //197.6

  it('197.7 Insert into table with Nested-table NULL Value for object',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id,  :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19707;

      await connection.execute (sql, { id : id,
        v : { type : objClass, val : null } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :ID`;
      const result = await connection.execute (sql, { ID : 19707});
      const obj = result.rows[0][1];

      assert.strictEqual (obj, null);
    }
  );  // 197.7

  it('197.8 Insert into table with Nested-table NULL Value for object',
    async () => {
      let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
      const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
      const id = 19708;

      let obj = new objClass ();
      obj.append (null);
      obj.append (null);
      obj.append (null) ;

      await connection.execute (sql, { id : id, v : { val : obj } });
      await connection.commit ();

      sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :ID`;
      const result = await connection.execute (sql, { ID : 19708 });
      obj = result.rows[0][1];
      const arr = obj.getValues();
      assert.deepStrictEqual(arr, [ null, null, null ]);

      assert.strictEqual (obj.getElement(0), null);
    }
  );  // 197.8

  it('197.9 Insert into table and use deleteElement()', async () => {
    let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
    const id = 19709;

    let obj = new objClass ([ "One", "Two", "Three", "four" ]);
    obj.deleteElement (2);  // delete the 3rd element "Three"
    await connection.execute (sql, { id :  id, v : { val : obj } });
    await connection.commit ();

    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :id`;
    const result = await connection.execute (sql, { id :  id });
    obj = result.rows[0][1];
    const arr = obj.getValues ();
    assert.deepStrictEqual(arr, [ 'One', 'Two', 'four' ]);
  });

  it('197.10 Insert into table and use setElement()', async () => {
    let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
    const id = 19710;

    let obj = new objClass ([ "One", "Two", "Three", "Four" ]);
    obj.setElement (2, "3");
    await connection.execute (sql, { id : id, v : { val : obj } });
    await connection.commit ();

    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :id`;
    const result = await connection.execute (sql, { id : id });
    obj = result.rows[0][1];
    const arr = obj.getValues ();
    assert.deepStrictEqual(arr, [ 'One', 'Two', '3', 'Four' ]);
  });

  it('197.11 Insert into table and use trim()', async () => {
    let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    const objClass = await connection.getDbObjectClass ("NODB_TEST197_TYP");
    const id = 19711;

    let obj = new objClass ([ "One", "Two", "Three", "Four" ]);
    obj.trim (2);
    await connection.execute (sql, { id : id, v : { val : obj } });
    await connection.commit ();

    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :id`;
    const result = await connection.execute (sql, { id : id });
    obj = result.rows[0][1];
    const arr = obj.getValues ();
    assert.deepStrictEqual(arr, [ 'One', 'Two' ]);
  });

});
