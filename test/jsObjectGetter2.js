/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
 *   171. jsObjectGetter2.js
 *
 * DESCRIPTION
 *   It checks the safe use of the Maybe value returned by
 *   JS Object Set methods.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

describe('171. jsObjectGetter2.js', () => {

  it.skip('171.1 oracledb.fetchAsBuffer', () => {
    let foo = [ oracledb.BLOB ];
    Object.defineProperty(foo, '0', {
      get: function() {
        throw 'Nope';
      }
    });

    try {
      oracledb.fetchAsBuffer = foo;
    } catch (err) {
      console.log(err);
    } finally {
      oracledb.fetchAsBuffer = []; // restore
    }
  }); // 171.1

  it.skip('171.2 oracledb.fetchAsString', () => {
    let foo = [ oracledb.CLOB ];
    Object.defineProperty(foo, '0', {
      get: function() {
        throw 'Nope';
      }
    });

    try {
      oracledb.fetchAsString = foo;
    } catch (err) {
      console.log(err);
    } finally {
      oracledb.fetchAsString = []; // restore
    }
  }); // 171.2

  it.skip('171.3 data bind', async () => {
    const conn = await oracledb.getConnection(dbConfig);

    const tableName = "nodb_tab_171_3";
    const proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE " + tableName + " ( \n" +
               "            id      NUMBER, \n" +
               "            name    VARCHAR2(20) \n" +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    await conn.execute(proc);

    let sqlInsert = "INSERT INTO " + tableName + " VALUES (:id, :nm)";
    let bindVar = [2, 'Alison'];
    Object.defineProperty(bindVar, '0', {
      get: function() {
        throw 'Nope';
      }
    });
    await conn.execute(sqlInsert, bindVar);

    let sqlDrop = "DROP TABLE " + tableName + " PURGE";
    await conn.execute(sqlDrop);
    await conn.close();
  }); // 171.3

});
