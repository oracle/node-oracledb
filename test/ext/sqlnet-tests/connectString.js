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
 * Licensed under the Apache License, Version 2.0 (the `License`);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an `AS IS` BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *  * NAME
 *   1. connectString.js
 *
 * DESCRIPTION
 * Testing connect strings.
 * Set environment variables
 * NODE_ORACLEDB_HOST: DB host name
 * NODE_ORACLEDB_SERVICENAME: DB Service Name
 * NODE_ORACLEDB_PORT: DB port name (optional, default is 1521)
 * NODE_ORACLEDB_PROTOCOL: Protocol to connect to DB (optional, default is tcp)
 *
 *****************************************************************************/
const oracledb = require('oracledb');
const assert   = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dbConfig = require('../../dbconfig.js');

describe('1. Connect string checks', function() {

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

  describe('1.FIX ERROR HANDLING WHEN INVALID CONNECT DESCRIPTOR "DESCRIPTIONX" SYNTAX USED', function() {

    it('1.1 DESCRIPTIONX used in connect String ', async function() {
      await assert.rejects(async () => {
        await oracledb.getConnection({
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: '(DESCRIPTIONX=(ADDRESS=(PROTOCOL=' + protocol + ')(HOST=' + host + ')(PORT =' + port + '))(CONNECT_DATA =(SERVICE_NAME =' + svcName + ')))',
        });
      },
      (err) => {
        assert.deepStrictEqual(err.message, 'NJS-512: invalid connection string parameters.\n' +
              'unknown top element DESCRIPTIONX');
        return true;
      },
      );
    });
  });

  describe('2. GIVE A MEANINGFUL ERROR WHEN AN INVALID PROTOCOL IS USED', function() {

    it('2.1 Connect String with invalid protocol', async function() {
      await assert.rejects(async () => {
        await oracledb.getConnection({
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: 'xxtcp://' + host + '/' + svcName,
        });
      },
      (err) => {
        assert.deepStrictEqual(err.message, 'NJS-515: error in Easy Connect connection string: Unsupported protocol in thin mode: xxtcp');
        return true;
      },
      );
    });

  });

  describe('3. THROW NJS ERROR ERR_HTTPS_PROXY_REQUIRES_TCPS.', function() {

    it('3.1 Connect String with https_proxy but protocol as tcp', async function() {
      await assert.rejects(async () => {
        await oracledb.getConnection({
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: 'tcp://' + host + '/' + svcName + '?https_proxy=abcde',
        });
      },
      (err) => {
        assert.deepStrictEqual(err.message, 'NJS-512: invalid connection string parameters.\nhttps proxy requires protocol as tcps ');
        return true;
      },
      );
    });

  });

  describe('4. Github Issue #1644 ', function() {

    it('4.1 easy connect entry in tnsnames.ora', async function() {
      const connect_string = 'tcp://' + host + ':' + port + '/' + svcName;
      const alias = "tns_alias = " + connect_string;
      const folder = fs.mkdtempSync(
        path.join(os.tmpdir(), 'tnsAlias-'));
      const fileName = path.join(folder, "tnsnames.ora");
      fs.writeFileSync(fileName, alias, (err) => {
      // In case of an error throw err.
        if (err) throw err;
      });
      const UserP = {
        user: process.env.NODE_ORACLEDB_USER,
        password: process.env.NODE_ORACLEDB_PASSWORD,
        connectString: 'tns_alias',
        configDir: folder
      };
      const connection = await oracledb.getConnection(UserP);
      const result = await connection.execute(`select 1+1 from dual`);
      assert.strictEqual(result.rows[0][0], 2);
      await connection.close();
      if (folder) {
        fs.rmSync(folder, { recursive: true });
      }
    });
  });

  describe('5.BUILD A PROPER CONNECT STRING AND CONNECT', function() {

    it('5.1 Simple connect string', async function() {
      const conn = await oracledb.getConnection({
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=' + protocol + ')(HOST=' + host + ')(PORT =' + port + '))(CONNECT_DATA =(SERVICE_NAME =' + svcName + ')))',
      });
      const res = await conn.execute('SELECT 1+1 FROM DUAL');
      assert.strictEqual(res.rows[0][0], 2);
      await conn.close();
    });

    it('5.2 Simple connect string with retry_count and retry_delay parameters', async function() {
      const conn = await oracledb.getConnection({
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: '(DESCRIPTION=(RETRY_COUNT=20)(RETRY_DELAY=3)(ADDRESS=(PROTOCOL=' + protocol + ')(HOST=' + host + ')(PORT =' + port + '))(CONNECT_DATA =(SERVICE_NAME =' + svcName + ')))',
      });
      const res = await conn.execute('SELECT 1+1 FROM DUAL');
      assert.strictEqual(res.rows[0][0], 2);
      await conn.close();
    });

    it('5.3 Simple connect string with invalid retry_count parameter', async function() {
      const conn = await oracledb.getConnection({
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: '(DESCRIPTION=(RETRY_COUNT=10XY)(RETRY_DELAY=3)(ADDRESS=(PROTOCOL=' + protocol + ')(HOST=' + host + ')(PORT =' + port + '))(CONNECT_DATA =(SERVICE_NAME =' + svcName + ')))',
      });
      // The connect should still happen.
      // The default value of retryCount (0) is taken in this case.
      const res = await conn.execute('SELECT 1+1 FROM DUAL');
      assert.strictEqual(res.rows[0][0], 2);
      await conn.close();
    });
  });
});
