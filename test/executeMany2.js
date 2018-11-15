/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   172. executeMany2.js
 *
 * DESCRIPTION
 *   This is a negative test of executeMany().
 * 
 *   The executeMany(): Binds section of the doc says:
 *   The first data record determines the number of bind variables, 
 *   each bind variable's data type, and its name (when binding by name).
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var dbconfig = require('./dbconfig.js');

describe('172. executeMany2.js', function() {
  
  before(function() {
    if (!dbconfig.test.DBA_PRIVILEGE) this.skip();
  });
  
  // Currently skipped for
  // Segmentation fault: 11
  it.skip('172.1 Negative - incorrect parameters', async () => {
    
    let conn;
    try {
      const connectionDetails = {
        user          : dbconfig.test.DBA_user,
        password      : dbconfig.test.DBA_password,
        connectString : dbconfig.connectString,
        privilege     : oracledb.SYSDBA
      };
      const schema   = 'T_APPDEV4DB';
      const password = 'oracle';

      conn = await oracledb.getConnection(connectionDetails);

      await conn.execute(
        `DROP USER ${schema} CASCADE`
      );
      await conn.execute(
        `GRANT CONNECT, RESOURCE, UNLIMITED TABLESPACE TO ${schema} identified by ${password}`
      );
      await conn.execute(
        `create table "${schema}"."SALES" ("AMOUNT_SOLD" NUMBER(10,2))`
      );
      
      await conn.executeMany(
        `insert into "${schema}"."SALES" ("AMOUNT_SOLD") values (:1)`, 
        [ 48, 33, 3, 999, 1, 13.13 ] 
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 172.1
});
