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
 *   timeout_parameters.js
 *
 * DESCRIPTION
 *   Checks the timeout parameters of the connect string.
 */
const oracledb = require("oracledb");
const dbConfig = require('../../dbconfig.js');
const assert   = require('assert');

describe('1. Transport Connect Timeout Parameters', function() {

  before(function() {
    if (!process.env.NODE_ORACLEDB_HOST)
      throw new Error('Hostname is not Set! Set env variable NODE_ORACLEDB_HOST');
    if (!process.env.NODE_ORACLEDB_SERVICENAME)
      throw new Error('servicename is not Set! Set env variable NODE_ORACLEDB_SERVICENAME');
  });
  const host = process.env.NODE_ORACLEDB_HOST;
  const svcName = process.env.NODE_ORACLEDB_SERVICENAME;
  const port = process.env.NODE_ORACLEDB_PORT || '1521';
  const protocol = process.env.NODE_ORACLEDB_PROTOCOL || 'tcp';

  it('1.1 Connect string with no TRANSPORT_CONNECT_TIMEOUT parameter', async function() {
    dbConfig.connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${svcName})))`;
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();
  });

  it('1.2 Connect string with TRANSPORT_CONNECT_TIMEOUT parameter and no suffix (ms, sec, min)', async function() {
    const in_values = ['2', '2ms', '2sec', '2min', '2 ms', '2 sec', '2 min', '2NaN'];
    let connection;

    for (let i = 0; i < in_values.length; i++) {
      dbConfig.connectString = `(DESCRIPTION=(TRANSPORT_CONNECT_TIMEOUT=${in_values[i]})(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${svcName})))`;
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }
  });

  it('1.3 Connect string with TRANSPORT_CONNECT_TIMEOUT parameter with Numeric value too long', async function() {
    let connection = null;
    dbConfig.connectString = `(DESCRIPTION=(TRANSPORT_CONNECT_TIMEOUT=123456789012345678901234567890)(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${svcName})))`;
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();
  });


  it('1.4 Connect string with TRANSPORT_CONNECT_TIMEOUT parameter with Timeout duration as 1ms', async function() {
    dbConfig.connectString = `(DESCRIPTION=(TRANSPORT_CONNECT_TIMEOUT=0.001)(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${svcName})))`;
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();
  });

  it('1.5 Connect string with CONNECT_TIMEOUT parameter and no suffix (ms, sec, min)', async function() {
    const in_values = ['2', '2ms', '2sec', '2min', '2 ms', '2 sec', '2 min', '2NaN'];
    let connection;

    for (let i = 0; i < in_values.length; i++) {
      dbConfig.connectString = `(DESCRIPTION=(CONNECT_TIMEOUT=${in_values[i]})(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${svcName})))`;
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute("select 1+1 from dual");
      assert(result.rows[0][0], 2);
      await connection.close();
    }
  });

  it('1.6 Connect string with CONNECT_TIMEOUT parameter with Numeric value too long', async function() {
    dbConfig.connectString = `(DESCRIPTION=(CONNECT_TIMEOUT=123456789012345678901234567890)(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${svcName})))`;
    const connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();
  });

  it('1.7 Connect string with CONNECT_TIMEOUT parameter with Timeout duration value being too low', async function() {
    dbConfig.connectString = `(DESCRIPTION=(CONNECT_TIMEOUT=0.00001)(ADDRESS=(PROTOCOL=${protocol})(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${svcName})))`;
    await assert.rejects(async () => {
      await oracledb.getConnection(dbConfig);
    }, /NJS-510:/);
  });
});
