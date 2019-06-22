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
 *   195. dbObjectInOut.js
 *
 * DESCRIPTION
 *    Testing Oracle Database Object type(s)
 *
 *****************************************************************************/
'use strict';

var oracledb = require ('oracledb');
var should   = require ( 'should' );
//var async    = require ( 'async' ) ;
var dbConfig = require ('./dbconfig.js');


describe ('195. dbObjectsInOut.js', function () {
  var connection = null;

  before ( async () => {
    try {
      connection = await oracledb.getConnection (dbConfig);

      let sql = 
        `create type nodb_test195_typ as object (
           id  number,
           name varchar2 (50)
         )`;
      await connection.execute (sql);
      await connection.commit ();

      let proc = 
        `create or replace procedure nodb_test195_proc
           (a in out nodb_test195_typ) as
         begin
           IF ( a is NULL ) THEN
             a := nodb_test195_typ ( 101, 'Tom' );
           ELSIF (a.name = 'Tom' ) THEN
             a.name := 'Dick';
           ELSIF (a.name = 'Dick' ) THEN
             a.name := NULL;
           ELSIF (a.name = 'Harry' ) THEN
             a:= NULL;
           END IF;
         end;`;
      await connection.execute (proc);
    }
    catch (err) {
      should.not.exist (err);
    }
  });
  

  after ( async () => {
    try {
      let sql = `drop procedure nodb_test195_proc`;
      await connection.execute (sql);

      sql = `drop type nodb_test195_typ` ;
      await connection.execute (sql);

      await connection.close ();
    }
    catch (err) {
      should.not.exist (err);
    }
  });


  it ('195.1 IN NULL value, OUT valid String for Name', async () =>  {
    try {
      let typeName = "NODB_TEST195_TYP";
      let cls = await connection.getDbObjectClass (typeName);
      let sql = "begin nodb_test195_proc( :a ); end; ";
      let bindVar = { a : 
                      { type : cls, 
                        dir : oracledb.BIND_INOUT,
                        val : null 
                      }
                    };
      let result = await connection.execute (sql, bindVar);
      let obj = result.outBinds.a;

      should.equal ( obj.NAME, "Tom" );
    }
    catch (err) {
      should.not.exist (err);
    }
  });  // 195.1


  it ('195.2 IN Tom value, OUT Dick', async () =>  {
    try {
      let typeName = "NODB_TEST195_TYP";
      let cls = await connection.getDbObjectClass (typeName);
      var objData = {
        ID : 201,
        NAME : 'Tom'
      };
      let testObj = new cls (objData);
         
      let sql = "begin nodb_test195_proc( :a ); end; ";
      let bindVar = { a : 
                      { type : cls, 
                        dir : oracledb.BIND_INOUT,
                        val : testObj
                      }
                    };
      let result = await connection.execute (sql, bindVar);
      let obj = result.outBinds.a;

      should.equal ( obj.NAME, "Dick" );
    }
    catch (err) {
      should.not.exist (err);
    }
  });  // 195.2


  it ('195.3 IN Dick value, OUT NULL', async () =>  {
    try {
      let typeName = "NODB_TEST195_TYP";
      let cls = await connection.getDbObjectClass (typeName);
      var objData = {
        ID : 201,
        NAME : 'Dick'
      };
      let testObj = new cls (objData);
         
      let sql = "begin nodb_test195_proc( :a ); end; ";
      let bindVar = { a : 
                      { type : cls, 
                        dir : oracledb.BIND_INOUT,
                        val : testObj
                      }
                    };
      let result = await connection.execute (sql, bindVar);
      let obj = result.outBinds.a;
      should.equal ( obj.NAME, null );
    }
    catch (err) {
      should.not.exist (err);
    }
  });  // 195.3


  it ('195.4 IN Harry value, OUT obj = NULL', async () =>  {
    try {
      let typeName = "NODB_TEST195_TYP";
      let cls = await connection.getDbObjectClass (typeName);
      var objData = {
        ID : 201,
        NAME : 'Harry'
      };
      let testObj = new cls (objData);
         
      let sql = "begin nodb_test195_proc( :a ); end; ";
      let bindVar = { a : 
                      { type : cls, 
                        dir : oracledb.BIND_INOUT,
                        val : testObj
                      }
                    };
      let result = await connection.execute (sql, bindVar);
      let obj = result.outBinds.a;
      should.equal ( obj, null ) ;
    }
    catch (err) {
      should.not.exist (err);
    }
  });  // 195.4

});
