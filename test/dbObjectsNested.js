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

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('313. dbObjectsNested.js', () => {
  let connection;

  before(async () => {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async () => {
    await connection.close();
  });

  describe('313.1 Nested DbObjects', () => {
    before(async () => {
      await testsUtil.createType(connection, 'point_type',
        'CREATE TYPE point_type AS OBJECT(x NUMBER, y NUMBER)');
      await testsUtil.createType(connection, 'shape_type',
        'CREATE TYPE shape_type AS OBJECT(name VARCHAR2(50), point point_type)');
      await testsUtil.createTable(connection, 'my_shapes',
        'CREATE TABLE my_shapes(id NUMBER, shape SHAPE_TYPE)');
    });

    after(async () => {
      await connection.execute('DROP TABLE my_shapes PURGE');
      await connection.execute('DROP TYPE shape_type');
      await connection.execute('DROP TYPE point_type');
    });

    it('313.1.1 Insert nested DbObject into table + fetch values', async () => {
      // Define the shape and point objects
      const shapeType = await connection.getDbObjectClass('SHAPE_TYPE');
      const pointType = await connection.getDbObjectClass('POINT_TYPE');
      // The attributes of the DbObject type must always be specified in upper
      // case
      // The attributes not defined are taken as null
      const pointValues = [{}, { Y: 20 }, { X: 10 }, { X: 10, Y: 20 }];

      let id = 1;
      for (const ptVal of pointValues) {
        const point = new pointType(ptVal);
        const shape = new shapeType({ NAME: 'My Shape', POINT: point });

        await connection.execute('INSERT INTO my_shapes (id, shape) VALUES (:id, :shape)',
          { id: id, shape: shape });
        await connection.commit();

        const result = await connection.execute('SELECT shape FROM my_shapes WHERE id = :id',
          { id: id });

        assert.strictEqual(result.rows[0][0].NAME, 'My Shape');
        assert.strictEqual(result.rows[0][0].POINT.X, ptVal.X || null);
        assert.strictEqual(result.rows[0][0].POINT.Y, ptVal.Y || null);

        id++;
      }

      // Insert a shape object with no attributes initialized and read it
      await connection.execute('INSERT INTO my_shapes (id, shape) VALUES (:id, :shape)',
        { id: id, shape: new shapeType() });
      await connection.commit();
      const result = await connection.execute('SELECT shape FROM my_shapes WHERE id = :id',
        { id: id });
      assert.strictEqual(result.rows[0][0].NAME, null);
      assert.strictEqual(result.rows[0][0].POINT, null);
    }); // 313.1.1
  }); // 313.1

  describe('313.2 Nested Records', () => {
    before(async () => {
      // CREATE PACKAGE DEFINITION
      await connection.execute(
        `CREATE OR REPLACE PACKAGE pkg_nestedrectest AS
         TYPE udt_Inner IS RECORD (Attr1 NUMBER, Attr2 NUMBER);
            TYPE udt_Outer IS RECORD (Inner1 udt_Inner, Inner2 udt_Inner);
            FUNCTION GetOuter (a_Value1 number, a_Value2 number) return udt_Outer;
         END pkg_nestedrectest;`);

      // CREATE PACKAGE BODY
      await connection.execute(
        `CREATE OR REPLACE PACKAGE BODY pkg_nestedrectest AS
          FUNCTION GetOuter (a_Value1 NUMBER, a_Value2 NUMBER) return udt_Outer IS
            t_Outer udt_Outer;
          BEGIN
            t_Outer.Inner1.Attr2 := a_Value1;
            t_Outer.Inner2.Attr2 := a_Value2;
            return t_Outer;
          END;
        END pkg_nestedrectest;`);
    });

    after(async () => {
      await connection.execute('DROP PACKAGE pkg_nestedrectest');
    });

    it('313.2.1 Works with nested records', async function() {
      // A bug exists with 19c and earlier Oracle Client versions with PL/SQL
      // nested records containing null and non-null attributes
      if (!oracledb.thin && testsUtil.getClientVersion() < 2100000000) this.skip();

      // Get the outer record type
      const RecTypeClass = await connection.getDbObjectClass('PKG_NESTEDRECTEST.UDT_OUTER');
      const options = [[null, null], [1, null], [null, 2], [1, 2]];

      for (const option of options) {
        const binds = { val1: option[0], val2: option[1], outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT } };
        const result = await connection.execute('BEGIN :outbv := PKG_NESTEDRECTEST.GETOUTER(:val1, :val2); END;', binds);

        assert(result.outBinds.outbv.INNER1);
        assert.strictEqual(result.outBinds.outbv.INNER1.ATTR1, null);
        assert.strictEqual(result.outBinds.outbv.INNER1.ATTR2, option[0]);
        assert(result.outBinds.outbv.INNER2);
        assert.strictEqual(result.outBinds.outbv.INNER2.ATTR1, null);
        assert.strictEqual(result.outBinds.outbv.INNER2.ATTR2, option[1]);
      }
    }); // 313.2.1
  }); // 313.2

  describe('313.3 Nested Collections', () => {
    before(async () => {
      await testsUtil.createType(connection, 'number_varray',
        'CREATE TYPE number_varray AS VARRAY(5) OF NUMBER');
      await connection.execute(
        `CREATE OR REPLACE PACKAGE pkg_simplevarray AS FUNCTION
          get_simple_varray RETURN number_varray; END pkg_simplevarray;`);
      await connection.execute(
        `CREATE OR REPLACE PACKAGE BODY pkg_simplevarray AS FUNCTION
         get_simple_varray RETURN number_varray IS result number_varray := number_varray(10, 20, 30);
         BEGIN RETURN result; END; END pkg_simplevarray;`);
    });

    after(async () => {
      await connection.execute('DROP PACKAGE pkg_simplevarray');
      await testsUtil.dropType(connection, 'number_varray');
    });

    it('313.3.1 handle simple VARRAY', async () => {
      const NumberVarray = await connection.getDbObjectClass('NUMBER_VARRAY');
      const result = await connection.execute(
        'BEGIN :outColl := pkg_simplevarray.get_simple_varray(); END;',
        { outColl: { type: NumberVarray, dir: oracledb.BIND_OUT } });
      const outColl = result.outBinds.outColl;

      assert(outColl);
      assert.strictEqual(outColl.length, 3);
      assert.strictEqual(outColl[0], 10);
      assert.strictEqual(outColl[1], 20);
      assert.strictEqual(outColl[2], 30);
    }); // 313.3.1
  }); // 313.3

  describe('313.4 Nested Collections (TABLE of NUMBER)', () => {
    before(async () => {
      await testsUtil.createType(connection, 'number_table',
        'CREATE TYPE number_table AS TABLE OF NUMBER');
      await connection.execute(
        `CREATE OR REPLACE PACKAGE pkg_numbertable AS FUNCTION
        get_number_table RETURN number_table; END pkg_numbertable;`);
      await connection.execute(
        `CREATE OR REPLACE PACKAGE BODY pkg_numbertable AS
          FUNCTION get_number_table RETURN number_table IS result
          number_table := number_table(10, 20, 30); BEGIN RETURN result;
        END; END pkg_numbertable;`);
    });

    after(async () => {
      await connection.execute('DROP PACKAGE pkg_numbertable');
      await testsUtil.dropType(connection, 'number_table');
    });

    it('313.4.1 handle TABLE of NUMBER', async () => {
      const NumberTable = await connection.getDbObjectClass('NUMBER_TABLE');
      const result = await connection.execute(
        'BEGIN :outColl := pkg_numbertable.get_number_table(); END;',
        { outColl: { type: NumberTable, dir: oracledb.BIND_OUT } });
      const outColl = result.outBinds.outColl;

      assert(outColl);
      assert.strictEqual(outColl.length, 3);
      assert.strictEqual(outColl[0], 10);
      assert.strictEqual(outColl[1], 20);
      assert.strictEqual(outColl[2], 30);
    }); // 313.4.1
  }); // 313.4

  describe('313.5 Nested Collections (TABLE of VARRAY)', () => {
    before(async () => {
      await testsUtil.createType(connection, 'number_varray',
        'CREATE TYPE number_varray AS VARRAY(5) OF NUMBER');
      await testsUtil.createType(connection, 'table_of_varray',
        'CREATE TYPE table_of_varray AS TABLE OF number_varray');
      await connection.execute(
        `CREATE OR REPLACE PACKAGE pkg_tableofvarray AS FUNCTION
        get_table_of_varray RETURN table_of_varray; END pkg_tableofvarray;`);
      await connection.execute(
        `CREATE OR REPLACE PACKAGE BODY pkg_tableofvarray AS FUNCTION
          get_table_of_varray RETURN table_of_varray IS result
          table_of_varray := table_of_varray(); inner1 number_varray := number_varray(10, 20);
          inner2 number_varray := number_varray(30, 40); BEGIN result.extend;
          result(1) := inner1; result.extend; result(2) := inner2;
          RETURN result;
        END; END pkg_tableofvarray;`);
    });

    after(async () => {
      await connection.execute('DROP PACKAGE pkg_tableofvarray');
      await testsUtil.dropType(connection, 'table_of_varray');
      await testsUtil.dropType(connection, 'number_varray');
    });

    it('313.5.1 handle TABLE of VARRAY', async () => {
      const TableOfVarray = await connection.getDbObjectClass('TABLE_OF_VARRAY');
      const result = await connection.execute(
        'BEGIN :outColl := pkg_tableofvarray.get_table_of_varray(); END;',
        { outColl: { type: TableOfVarray, dir: oracledb.BIND_OUT } });
      const outColl = result.outBinds.outColl;

      assert(outColl);
      assert.strictEqual(outColl.length, 2);
      assert.strictEqual(outColl[0].length, 2);
      assert.strictEqual(outColl[0][0], 10);
      assert.strictEqual(outColl[0][1], 20);
      assert.strictEqual(outColl[1].length, 2);
      assert.strictEqual(outColl[1][0], 30);
      assert.strictEqual(outColl[1][1], 40);
    }); // 313.5.1
  }); // 313.5

  describe('313.6 Extended Nested Collections tests', () => {
    before(async () => {
      await testsUtil.createType(connection, 'num_nt',
        'CREATE TYPE num_nt AS TABLE OF NUMBER');
      await testsUtil.createType(connection, 'nt_of_nt',
        'CREATE TYPE nt_of_nt AS TABLE OF num_nt');
      await testsUtil.createType(connection, 'varray_nt',
        'CREATE TYPE varray_nt AS VARRAY(5) OF num_nt');
      await testsUtil.createTable(connection, 'nested_coll_test',
        `CREATE TABLE nested_coll_test (id NUMBER, nt_col nt_of_nt, varray_col varray_nt)
        NESTED TABLE nt_col STORE AS nt_col_store (NESTED TABLE COLUMN_VALUE STORE AS nt_col_inner_store)`);
    });

    after(async () => {
      await connection.execute('DROP TABLE nested_coll_test PURGE');
      await connection.execute('DROP TYPE varray_nt');
      await connection.execute('DROP TYPE nt_of_nt');
      await connection.execute('DROP TYPE num_nt');
    });

    it('313.6.1 Nested Table of Nested Tables', async () => {
      const NumNt = await connection.getDbObjectClass('NUM_NT');
      const NtOfNt = await connection.getDbObjectClass('NT_OF_NT');
      const outerNt = new NtOfNt([new NumNt([1, 2, 3]), new NumNt(), null]);

      await connection.execute('INSERT INTO nested_coll_test (id, nt_col) VALUES (1, :col)', { col: outerNt });
      const result = await connection.execute('SELECT nt_col FROM nested_coll_test WHERE id = 1');
      const retrieved = result.rows[0][0];

      assert.strictEqual(retrieved.length, 3);
      assert.strictEqual(retrieved[1].length, 0);
      assert.strictEqual(retrieved[2], null);
    }); // 313.6.1

    it('313.6.2 VARRAY of Nested Tables', async () => {
      const NumNt = await connection.getDbObjectClass('NUM_NT');
      const VarrayNt = await connection.getDbObjectClass('VARRAY_NT');
      const varray = new VarrayNt([new NumNt([10, 20]), new NumNt(), null]);

      await connection.execute('UPDATE nested_coll_test SET varray_col = :1 WHERE id = 1', [varray]);
      const result = await connection.execute('SELECT varray_col FROM nested_coll_test WHERE id = 1');
      const retrieved = result.rows[0][0];

      assert.strictEqual(retrieved.length, 3);
      assert.strictEqual(retrieved[1].length, 0);
      assert.strictEqual(retrieved[2], null);
    }); // 313.6.2

    it('313.6.3 DB Object with Nested Collection Field', async () => {
      await testsUtil.createType(connection, 'obj_with_nt',
        'CREATE OR REPLACE TYPE obj_with_nt AS OBJECT (name VARCHAR2(50), numbers NUM_NT)');
      await testsUtil.createTable(connection, 'obj_test',
        'CREATE TABLE obj_test (id NUMBER, data obj_with_nt) NESTED TABLE data.numbers STORE AS numbers_store');

      const NumNt = await connection.getDbObjectClass('NUM_NT');
      const ObjWithNt = await connection.getDbObjectClass('OBJ_WITH_NT');
      const obj = new ObjWithNt({ NAME: 'Test', NUMBERS: new NumNt([100, 200, 300]) });

      await connection.execute('INSERT INTO obj_test (id, data) VALUES (:id, :data)', { id: 1, data: obj });
      const result = await connection.execute('SELECT data FROM obj_test WHERE id = :id', { id: 1 });
      const retrieved = result.rows[0][0];

      assert.strictEqual(retrieved.NAME, 'Test');
      assert.deepStrictEqual(retrieved.NUMBERS.getValues(), [100, 200, 300]);

      await connection.execute('DROP TABLE obj_test PURGE');
      await connection.execute('DROP TYPE obj_with_nt');
    }); // 313.6.3
  }); // 313.6

  describe('313.7 Nested Collections with NULL Values', () => {
    before(async () => {
      // Create the types
      await testsUtil.createType(connection, 'address_type',
        `CREATE TYPE address_type AS OBJECT (
          street VARCHAR2(100),
          city VARCHAR2(50),
          zip VARCHAR2(20)
        )`);

      await testsUtil.createType(connection, 'address_list',
        'CREATE TYPE address_list AS TABLE OF address_type');

      await testsUtil.createType(connection, 'contact_type',
        `CREATE TYPE contact_type AS OBJECT (
          name VARCHAR2(100),
          addresses address_list
        )`);

      await testsUtil.createType(connection, 'contact_varray',
        'CREATE TYPE contact_varray AS VARRAY(5) OF contact_type');

      await testsUtil.createType(connection, 'customer_type',
        `CREATE TYPE customer_type AS OBJECT (
          id NUMBER,
          primary_contact contact_type,
          secondary_contacts contact_varray
        )`);

      await connection.execute(`
        CREATE TABLE null_coll_test (
          cust_id NUMBER,
          cust_data customer_type
        ) NESTED TABLE cust_data.primary_contact.addresses STORE AS primary_addr_store
      `);
    });

    after(async () => {
      await testsUtil.dropTable(connection, 'null_coll_test');

      await connection.execute('DROP TYPE customer_type');
      await connection.execute('DROP TYPE contact_varray');
      await connection.execute('DROP TYPE contact_type');
      await connection.execute('DROP TYPE address_list');
      await connection.execute('DROP TYPE address_type');
    });

    it('313.7.1 Testing NULL Values in Nested Objects', async () => {
      // Get the DB object classes
      const ContactType = await connection.getDbObjectClass('CONTACT_TYPE');
      const CustomerType = await connection.getDbObjectClass('CUSTOMER_TYPE');

      // Create a customer with NULL in the nested collections
      const customer = new CustomerType({
        ID: 1001,
        PRIMARY_CONTACT: new ContactType({
          NAME: 'John Doe',
          ADDRESSES: null  // Explicitly null collection
        }),
        SECONDARY_CONTACTS: null  // Explicitly null VARRAY
      });

      // Insert the customer
      await connection.execute(
        'INSERT INTO null_coll_test (cust_id, cust_data) VALUES (:id, :data)',
        { id: 1001, data: customer }
      );

      // Retrieve and verify
      const result = await connection.execute(
        'SELECT cust_data FROM null_coll_test WHERE cust_id = 1001'
      );

      const retrievedCustomer = result.rows[0][0];

      assert.strictEqual(retrievedCustomer.PRIMARY_CONTACT.NAME, 'John Doe');
      assert.strictEqual(retrievedCustomer.PRIMARY_CONTACT.ADDRESSES, null);
      assert.strictEqual(retrievedCustomer.SECONDARY_CONTACTS, null);
    });

    it('313.7.2 Update nested collections from null to populated and vice versa', async () => {
      const AddressType = await connection.getDbObjectClass('ADDRESS_TYPE');
      const AddressList = await connection.getDbObjectClass('ADDRESS_LIST');
      const ContactType = await connection.getDbObjectClass('CONTACT_TYPE');
      const ContactVarray = await connection.getDbObjectClass('CONTACT_VARRAY');

      // First, retrieve customer 1001 which has null collections
      let result = await connection.execute(
        'SELECT cust_data FROM null_coll_test WHERE cust_id = 1001'
      );

      let customer = result.rows[0][0];

      // Update the null collections to populated ones
      customer.PRIMARY_CONTACT.ADDRESSES = new AddressList([
        new AddressType({
          STREET: '789 some St',
          CITY: 'New City',
          ZIP: '54321'
        })
      ]);

      customer.SECONDARY_CONTACTS = new ContactVarray([
        new ContactType({
          NAME: 'Updated Contact',
          ADDRESSES: new AddressList([])  // Empty but not null
        })
      ]);

      await connection.execute(
        'UPDATE null_coll_test SET cust_data = :data WHERE cust_id = 1001',
        { data: customer }
      );

      // Retrieve and verify the update
      result = await connection.execute(
        'SELECT cust_data FROM null_coll_test WHERE cust_id = 1001'
      );

      customer = result.rows[0][0];

      // Check that collections are now populated
      assert.strictEqual(customer.PRIMARY_CONTACT.ADDRESSES.length, 1);
      assert.strictEqual(customer.PRIMARY_CONTACT.ADDRESSES[0].STREET, '789 some St');

      assert.strictEqual(customer.SECONDARY_CONTACTS.length, 1);
      assert.strictEqual(customer.SECONDARY_CONTACTS[0].NAME, 'Updated Contact');

      // Now update back to null
      customer.PRIMARY_CONTACT.ADDRESSES = null;
      customer.SECONDARY_CONTACTS = null;

      await connection.execute(
        'UPDATE null_coll_test SET cust_data = :data WHERE cust_id = 1001',
        { data: customer }
      );

      result = await connection.execute(
        'SELECT cust_data FROM null_coll_test WHERE cust_id = 1001'
      );

      customer = result.rows[0][0];
      assert.strictEqual(customer.PRIMARY_CONTACT.ADDRESSES, null);
      assert.strictEqual(customer.SECONDARY_CONTACTS, null);
    });

    it('313.7.3 Distinguish between null, empty, and populated collections', async () => {
      // Get the DB object classes
      const AddressList = await connection.getDbObjectClass('ADDRESS_LIST');

      // Create a procedure to test different collection states
      await connection.execute(`
        CREATE OR REPLACE PROCEDURE test_collection_states (
          p_null_coll OUT address_list,
          p_empty_coll OUT address_list,
          p_populated_coll OUT address_list
        ) IS
        BEGIN
          -- Leave null collection as NULL
          p_null_coll := NULL;

          -- Initialize empty collection
          p_empty_coll := address_list();

          -- Create populated collection
          p_populated_coll := address_list();
          p_populated_coll.extend;
          p_populated_coll(1) := address_type('Test St', 'Test City', '12345');
        END;
      `);

      // Execute the procedure
      const result = await connection.execute(
        `BEGIN 
           test_collection_states(:null_coll, :empty_coll, :populated_coll);
         END;`,
        {
          null_coll: { type: AddressList, dir: oracledb.BIND_OUT },
          empty_coll: { type: AddressList, dir: oracledb.BIND_OUT },
          populated_coll: { type: AddressList, dir: oracledb.BIND_OUT }
        }
      );

      const nullColl = result.outBinds.null_coll;
      const emptyColl = result.outBinds.empty_coll;
      const populatedColl = result.outBinds.populated_coll;

      assert.strictEqual(nullColl, null);

      assert(emptyColl !== null);
      assert.strictEqual(emptyColl.length, 0);

      assert(populatedColl !== null);
      assert.strictEqual(populatedColl.length, 1);
      assert.strictEqual(populatedColl[0].STREET, 'Test St');

      await connection.execute('DROP PROCEDURE test_collection_states');
    }); // 313.7.3

    it('313.7.4 Use PL/SQL to create collections with null elements', async () => {
      // Get the DB object classes
      const AddressList = await connection.getDbObjectClass('ADDRESS_LIST');

      await connection.execute(`
        CREATE OR REPLACE PROCEDURE get_addresses_with_nulls (
          p_addresses OUT address_list
        ) IS
        BEGIN
          -- Initialize the collection
          p_addresses := address_list();
          
          -- Add elements, including nulls
          p_addresses.extend(3);
          p_addresses(1) := address_type('123 Main St', 'ABCXYZ', '12345');
          p_addresses(2) := NULL;
          p_addresses(3) := address_type('456 ABC Street', 'LMNOPQ', '67890');
        END;
      `);

      // Call the procedure
      const result = await connection.execute(
        `BEGIN get_addresses_with_nulls(:addrs); END;`,
        {
          addrs: { type: AddressList, dir: oracledb.BIND_OUT }
        }
      );

      const addresses = result.outBinds.addrs;

      assert.strictEqual(addresses.length, 3);
      assert.strictEqual(addresses[1], null);

      await connection.execute('DROP PROCEDURE get_addresses_with_nulls');
    }); // 313.7.4
  }); // 313.7
}); // 313
