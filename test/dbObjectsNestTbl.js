/* Copyright (c) 2019. Oracle and/or its affiliates.  All rights reserved. */
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
 *   197. dbObjectsNestTbl.js
 *
 * DESCRIPTION
 *    Testing Oracle Database Nested Table Object Collection type(s)
 *
 *****************************************************************************/
'use strict'

var oracledb = require ( 'oracledb' );
var should   = require ( 'should' );
var async    = require ( 'async' );
var dbConfig = require ( './dbconfig.js' );


describe ('197. dbObjectsNestedTable.js',  ()  => {
  let connection = null;

  before (async () => {
    try {
      connection = await oracledb.getConnection (dbConfig);
      
      let sql = `CREATE TYPE nodb_test197_typ IS TABLE OF VARCHAR2(30)`;
      await connection.execute (sql);
      await connection.commit ();

      sql = `CREATE TABLE nodb_test197_TAB (
               ID NUMBER, DEPT_NAMES nodb_test197_typ)
            NESTED TABLE dept_names store as dnames_nt`;
      await connection.execute (sql);
      await connection.commit ();
      
      //sql = `INSERT INTO nodb_test197_tab values
      //       (nodb_test197_typ ('Sales', 'Finance', 'Shipping' ))`;
      //connection.execute ( sql ) ;
    }
    catch ( err ) {
      should.not.exist (err);
    }

  });

  after (async () => {
    try {
      await connection.execute ( `drop table nodb_test197_tab purge` );
      await connection.execute ( `drop type nodb_test197_typ` );
      await connection.commit ();
      await connection.close ();
    }
    catch (err) {
      should.not.exist (err);
    }
  });

  it ( '197.1 Insert into table with Nested-table + getValues',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19701;
    
    let obj = new objClass ( /* [ "Shipping", "Finance", "Sales" ] */ );
    obj.append ( "Shipping" );
    obj.append ( "Finance" );
    obj.append ( "Sales" ) ;
    await connection.execute ( sql, { id: id,  v : { val : obj } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB`;
    let result = await connection.execute ( sql );
    obj = result.rows[0][1];

    let arr = obj.getValues ();
    should.equal ( arr.length, 3 );
    
    should.strictEqual (arr[0], "Shipping" );
    should.strictEqual (arr[1], "Finance" );
    should.strictEqual (arr[2], "Sales" );
  });  // 197.1


  it ( '197.2 Insert into table with Nested-table + getKeys',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES (:id,  :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19702
    
    let obj = new objClass ( /* [ "Shipping", "Finance", "Sales" ] */ );
    obj.append ( "Shipping" );
    obj.append ( "Finance" );
    obj.append ( "Sales" ) ;
    await connection.execute ( sql, { id: id,  v : { val : obj } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB`;
    let result = await connection.execute ( sql );
    obj = result.rows[0][1];

    let arr = obj.getKeys ();
    should.equal ( arr.length, 3 );
    should.strictEqual (arr[0], 0 );
    should.strictEqual (arr[1], 1 );
    should.strictEqual (arr[2], 2 );
       });  // 197.2

  it ( '197.3 Insert into table with Nested-table + first * next',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19703;
    
    let obj = new objClass ( /* [ "Shipping", "Finance", "Sales" ] */ );
    obj.append ( "Shipping" );
    obj.append ( "Finance" );
    obj.append ( "Sales" ) ;
    await connection.execute ( sql, { id : id,  v : { val : obj } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB`;
    let result = await connection.execute ( sql );
    obj = result.rows[0][1];

    let index = obj.getFirstIndex ();
    while (index != null ) {
      let v = obj.getElement (index);
      switch ( index ) 
      {
      case 0:
        should.strictEqual (v, "Shipping");
        break;
      case 1:
        should.strictEqual (v, "Finance");
        break;
      case 2:
        should.strictEqual (v, "Sales");
        break;
      }
      index = obj.getNextIndex (index);
    }    
  });  //197.3


  it ( '197.4 Insert into table with Nested-table + last + prev',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19704;
    
    let obj = new objClass ( /* [ "Shipping", "Finance", "Sales" ] */ );
    obj.append ( "Shipping" );
    obj.append ( "Finance" );
    obj.append ( "Sales" ) ;
    await connection.execute ( sql, { id : id,  v : { val : obj } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB`;
    let result = await connection.execute ( sql );
    obj = result.rows[0][1];

    let index = obj.getLastIndex ();
    while (index != null ) {
      let v = obj.getElement (index);
      switch ( index ) 
      {
      case 0:
        should.strictEqual (v, "Shipping");
        break;
      case 1:
        should.strictEqual (v, "Finance");
        break;
      case 2:
        should.strictEqual (v, "Sales");
        break;
      }
      index = obj.getPrevIndex (index);
    }
  });  //197.4


  it ( '197.5 Insert into table with Nested-table + getElement',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19705;
    
    let obj = new objClass ( /* [ "Shipping", "Finance", "Sales" ] */ );
    obj.append ( "Shipping" );
    obj.append ( "Finance" );
    obj.append ( "Sales" ) ;
    await connection.execute ( sql, { id : id, v : { val : obj } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB`;
    let result = await connection.execute ( sql );
    obj = result.rows[0][1];

    // randomly use getElement ()
    let v = obj.getElement (1);
    should.strictEqual (v, "Finance" );
    v = obj.getElement (0);
    should.strictEqual (v, "Shipping" );
  });  //197.5

  
  it ( '197.6 Insert into table with Nested-table + hasElement',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19706;
    
    let obj = new objClass ( /* [ "Shipping", "Finance", "Sales" ] */ );
    obj.append ( "Shipping" );
    obj.append ( "Finance" );
    obj.append ( "Sales" ) ;
    await connection.execute ( sql, { id : id, v : { val : obj } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB`;
    let result = await connection.execute ( sql );
    obj = result.rows[0][1];

    should.strictEqual ( obj.hasElement( 0 ), true );
    should.strictEqual ( obj.hasElement( 1 ), true );
    should.strictEqual ( obj.hasElement( 2 ), true );

  });  //197.6

  it ( '197.7 Insert into table with Nested-table NULL Value for object',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id,  :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19707;
    
    await connection.execute ( sql, { id : id,
                                   v : { type : objClass, val : null } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :ID`;
    let result = await connection.execute ( sql, { ID : 19707} );
    let obj = result.rows[0][1];

    should.strictEqual ( obj, null );
    
  });  // 197.7


  it ( '197.8 Insert into table with Nested-table NULL Value for object',
      async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19708;
    
    let obj = new objClass ( /* [ "Shipping", "Finance", "Sales" ] */ );
    obj.append ( null );
    obj.append ( null );
    obj.append ( null ) ;
    
    await connection.execute ( sql, { id : id, v : { val : obj } } );
    await connection.commit ();
    
    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :ID`;
    let result = await connection.execute ( sql, { ID : 19708 } );
    obj = result.rows[0][1];

    should.strictEqual ( obj.getElement(0), null );
    
  });  // 197.8

  it ('197.9 Insert into table and use deleteElement()', async () => {
    var sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    var objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19709;

    let obj = new objClass ( [ "One", "Two", "Three", "four" ] );
    obj.deleteElement (2);  // delete the 3rd element "Three"
    await connection.execute (sql, { id :  id, v : { val : obj } } );
    await connection.commit ();

    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :id`;
    let result = await connection.execute ( sql, { id :  id } );
    obj = result.rows[0][1];
    let arr = obj.getValues ();

    should.equal ( arr.length, 3 );
    should.strictEqual ( arr[0], "One" );
    should.strictEqual ( arr[1], "Two" );
    should.strictEqual ( arr[2], "four" );
  });


  it ('197.10 Insert into table and use setElement()', async () => {
    let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19710;

    let obj = new objClass ( [ "One", "Two", "Three", "Four" ] );
    obj.setElement (2, "3" );
    await connection.execute ( sql, { id : id, v : { val : obj } } );
    await connection.commit ();

    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :id`;
    let result = await connection.execute ( sql, { id : id });
    obj = result.rows[0][1];
    let arr = obj.getValues ();

    should.equal ( arr.length, 4 );
    should.strictEqual ( arr[2], "3" );
  });


  it ('197.11 Insert into table and use trim()', async () => {
    let sql = `INSERT INTO NODB_TEST197_TAB VALUES ( :id, :v )`;
    let objClass = await connection.getDbObjectClass ( "NODB_TEST197_TYP" );
    let id = 19711;

    let obj = new objClass ( [ "One", "Two", "Three", "Four" ] );
    obj.trim (2);
    await connection.execute ( sql, { id : id, v : { val : obj } } );
    await connection.commit ();

    sql = `SELECT * FROM NODB_TEST197_TAB WHERE ID = :id`;
    let result = await connection.execute ( sql, { id : id });
    obj = result.rows[0][1];
    let arr = obj.getValues ();

    should.equal ( arr.length, 2 );
  });

});
