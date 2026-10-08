/* Copyright (c) 2018, 2026, Oracle and/or its affiliates. */

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
 *   159. end2endTracing.js
 *
 * DESCRIPTION
 *   Test settings of end-to-end tracing attributes.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('159. end2endTracing.js', function() {

  let conn;
  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await conn.close();
  });

  const verify = async function(sql, expect) {
    const result = await conn.execute(sql);
    assert.strictEqual(result.rows[0][0], expect);
  };

  it('159.1 set the end-to-end tracing attribute - module', async function() {

    const sql = "select sys_context('userenv', 'module') from dual";
    const testValue = "MODULE";
    conn.module = testValue;
    await verify(sql, testValue);

  });

  it('159.2 set the tracing attribute - action', async function() {

    const sql = "select sys_context('userenv', 'action') from dual";
    const testValue = "ACTION";
    conn.action = testValue;
    await verify(sql, testValue);

  });

  it('159.3 set the tracing attribure - clientId', async function() {

    const sql = "select sys_context('userenv', 'client_identifier') from dual";
    const testValue = "CLIENTID";
    conn.clientId = testValue;
    await verify(sql, testValue);

  });

  it('159.4 preserves PL/SQL-set tracing attributes when setting end-to-end attributes', async function() {
    const action = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const clientId = 'CLIENTID-PLSQL';
    const clientInfo = 'CLIENTINFO-PLSQL';
    const module = 'MODULE-PLSQL';

    const attributes = {
      dbOp: 'DBOP',
      ecid: 'ECID',
      clientId: 'CLIENTID',
      clientInfo: 'CLIENTINFO',
      module: 'MODULE',
    };

    const expected = {
      action,
      clientId,
      clientInfo,
      module,
      ecid: null,
    };

    const verifyAttributes = async function() {
      const result = await conn.execute(
        `select sys_context('userenv', 'action'),
                sys_context('userenv', 'client_identifier'),
                sys_context('userenv', 'client_info'),
                sys_context('userenv', 'module')
           from dual`,
      );

      assert.deepStrictEqual(result.rows[0], [
        expected.action,
        expected.clientId,
        expected.clientInfo,
        expected.module,
      ]);

      const sessionResult = await conn.execute(
        `select ecid
           from v$session
          where sid = sys_context('userenv', 'sid')`,
      );
      assert.strictEqual(sessionResult.rows[0][0], expected.ecid);
    };

    await conn.execute(
      `begin
        DBMS_APPLICATION_INFO.SET_MODULE(:module, :action);
        DBMS_APPLICATION_INFO.SET_CLIENT_INFO(:clientInfo);
        DBMS_SESSION.SET_IDENTIFIER(:clientId);
      end;`,
      { action, clientId, clientInfo, module },
    );

    await verifyAttributes();

    for (const [name, value] of Object.entries(attributes)) {
      conn[name] = value;
      if (name !== 'dbOp') {
        expected[name] = value;
      }
      await verifyAttributes();
    }
  });
});
