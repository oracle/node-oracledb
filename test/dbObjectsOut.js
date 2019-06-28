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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   194. dbObjectsOut.js
 *
 * DESCRIPTION
 *   Database Object Test cases with OUT bind
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');

describe('194. dbObjectsOut.js', () => {
  let connection = null;

  before(async () => {
    try {
      connection = await oracledb.getConnection(dbconfig);

      let sql =
        `create type nodb_test194_typ as object (
           id   number(9),
           name varchar2(50)
        )`;
      await connection.execute(sql);
      await connection.commit();
      let proc =
        `create or replace procedure nodb_test194_proc
             (a out nodb_test194_typ) as
           begin
             a := nodb_test194_typ ( 101, 'Christopher Jones');
             a.ID := 101;
             a.NAME := 'Christopher Jones' ;
           end;`;
      await connection.execute(proc);
    } catch(err) {
      should.not.exist(err);
    }
  }); // before()

  after(async () => {
    try {
      let sql = `drop procedure nodb_test194_proc`;
      await connection.execute(sql);

      sql = `drop type nodb_test194_typ`;
      await connection.execute(sql);

      await connection.close();
    } catch(err) {
      should.not.exist(err);
    }
  }); // after()

  it('194.1 OUT bind of objects', async () => {
    try {
      let typeName = "NODB_TEST194_TYP";
      let cls = await connection.getDbObjectClass( typeName );

      let sql = 'begin nodb_test194_proc(:out); end;';
      let bindVar = { out : { type : cls, dir : oracledb.BIND_OUT } };
      let result = await connection.execute(sql, bindVar);
      let obj = result.outBinds.out;

      should.equal ( obj.NAME, 'Christopher Jones' );
    } catch(err) {
      should.not.exist(err);
    }
  }); // 194.1



});
