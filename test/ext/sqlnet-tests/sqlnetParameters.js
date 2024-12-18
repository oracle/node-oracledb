/* Copyright (c) 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https: *oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http: *www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https: *www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   1. sqlnetParameters.js
 *
 * DESCRIPTION
 *   This test suite will use connection strings to test DB connections with
 *   the SQL *Net module.
 *   They are the connections that will include different properties.
 *   Set NODE_ORACLEDB_SERVER_CERT_DN to server certificate DN
 *   e.g., CN=name.company.domain
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('../../dbconfig.js');
const assert   = require('assert');

describe('1. sqlnetParameters.js', function() {
  let connection = null;
  const connectString = dbConfig.connectString;
  const connectTimeout = connectString.match(/CONNECT_TIMEOUT = (\d+)/) ? null : connectString.match(/CONNECT_TIMEOUT = (\d+)/)[1];
  const port = connectString.match(/PORT=(\d+)/) ? null : connectString.match(/PORT=(\d+)/)[1];
  const host = connectString.match(/HOST=([a-zA-Z0-9.-]+)/) ? null : connectString.match(/HOST=([a-zA-Z0-9.-]+)/)[1];
  const serviceName = connectString.match(/SERVICE_NAME = ([a-zA-Z0-9._-]+)/)[1];
  const serverCertDN = process.env.NODE_ORACLEDB_SERVER_CERT_DN;

  const script =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_conn_dept1 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_conn_dept1 ( \
                  department_id NUMBER,  \
                  department_name VARCHAR2(20) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_dept1  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_dept1  \
                   (department_id, department_name) VALUES \
                   (20, ''Marketing'') \
          '); \
      END; ";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(script);
  });

  after(async function() {
    await connection.execute('DROP TABLE nodb_conn_dept1 PURGE');
    await connection.close();
  });

  it('1.1 CONNECT_TIMEOUT basic connection test', async function() {
    const query = "SELECT department_id, department_name " +
                "FROM nodb_conn_dept1 " +
                "WHERE department_id = :id";
    const result = await connection.execute(query, [40]);
    assert(result);
    assert.deepStrictEqual(result.rows, [[ 40, 'Human Resources' ]]);
  });

  it('1.2 Without CONNECT_TIMEOUT parameter connection test', async function() {
    const config = {...dbConfig};

    config.connectString = '(DESCRIPTION='
        + '(ADDRESS_LIST =(LOAD_BALANCE = ON)(ADDRESS = (PROTOCOL=TCPS)'
        + '(HOST=' + host + ')(PORT=' + port + ')))'
        + '(CONNECT_DATA = (SERVICE_NAME = ' + serviceName + '))'
        + '(security=(ssl_server_cert_dn="' + serverCertDN + '")))';
    const connection1 = await oracledb.getConnection(config);
    const query = "SELECT department_id, department_name " +
                "FROM nodb_conn_dept1 " +
                "WHERE department_id = :id";
    const result = await connection.execute(query, [40]);
    assert(result);
    assert.deepStrictEqual(result.rows, [[ 40, 'Human Resources' ]]);
    await connection1.close();
  });

  it('1.3 Without CONNECT_TIMEOUT parameter and current session to sleep for 10 seconds', async function() {
    const config = {...dbConfig};

    config.connectString = '(DESCRIPTION='
        + '(ADDRESS_LIST =(LOAD_BALANCE = ON)(ADDRESS = (PROTOCOL=TCPS)'
        + '(HOST=' + host + ')(PORT=' + port + ')))'
        + '(CONNECT_DATA = (SERVICE_NAME = ' + serviceName + '))'
        + '(security=(ssl_server_cert_dn="' + serverCertDN + '")))';

    const connection1 = await oracledb.getConnection(config);
    await connection1.execute("BEGIN DBMS_SESSION.SLEEP(10); END;");

    const query = "SELECT department_id, department_name " +
                "FROM nodb_conn_dept1 " +
                "WHERE department_id = :id";
    const result = await connection1.execute(query, [40]);
    assert(result);
    assert.deepStrictEqual(result.rows, []);
    await connection1.close();
  });

  it('1.4 CONNECT_TIMEOUT parameter with current session to sleep for a 10 seconds', async function() {
    const config = {...dbConfig};
    config.connectString = '(DESCRIPTION=(CONNECT_TIMEOUT =' + connectTimeout + ')'
        + '(ADDRESS_LIST =(LOAD_BALANCE = ON)(ADDRESS = (PROTOCOL=TCPS)'
        + '(HOST=' + host + ')(PORT=' + port + ')))'
        + '(CONNECT_DATA = (SERVICE_NAME = ' + serviceName + '))'
        + '(security=(ssl_server_cert_dn="' + serverCertDN + '")))';

    const connection1 = await oracledb.getConnection(config);
    await connection1.execute("BEGIN DBMS_SESSION.SLEEP(10); END;");

    const connection2 = await oracledb.getConnection(config);
    const query = "SELECT department_id, department_name " +
                "FROM nodb_conn_dept1 " +
                "WHERE department_id = :id";
    await connection2.execute(query, [40]);
    await connection1.close();
    await connection2.close();
  });
});
