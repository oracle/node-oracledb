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
 * NAME
 *   1. configDir.js
 *
 * DESCRIPTION
 *   Testing configDir parameter.
 *   The new environment variable NODE_ORACLEDB_CONFIG_DIR is set to the
 *   directory containing tnsnames.ora.
 *   The connTnsAlias variable should be set to the desired TNS alias from
 *   tnsnames.ora. (default cdb1_pdb1 is set).
 *   Please do not set the environment variable TNS_ADMIN.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');

describe('1. configDir', function() {
  const connTnsAlias = 'cdb1_pdb1';
  let configDirectory;
  if (process.env.NODE_ORACLEDB_CONFIG_DIR) {
    configDirectory = process.env.NODE_ORACLEDB_CONFIG_DIR;
  } else {
    throw new Error("configDir parameter is not Set! Try Set Environment Variable NODE_ORACLEDB_CONFIG_DIR.");
  }
  const dbConfig = {
    user: process.env.NODE_ORACLEDB_USER,
    password: process.env.NODE_ORACLEDB_PASSWORD,
    connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING
  };

  describe('1.1 standalone connection', function() {
    it('1.1.1 Sanity test', async function() {
      const connection = await oracledb.getConnection({...dbConfig, configDir: configDirectory});
      const result = await connection.execute(`select 1+1 from dual`);
      assert.strictEqual(result.rows[0][0], 2);
      await connection.close();
    });

    it('1.1.2 connectString parameter with tnsalias', async function() {
      const newDbConfig = dbConfig;
      newDbConfig.connectString = connTnsAlias;
      const connection = await oracledb.getConnection({...newDbConfig,
        configDir: configDirectory});
      const result = await connection.execute(`select 1+1 from dual`);
      assert.strictEqual(result.rows[0][0], 2);
      await connection.close();
    });

    it('1.1.3 configDir with wrong folder', async function() {
      await assert.rejects(
        async () => await oracledb.getConnection({...dbConfig, configDir: '/some/random/dir'}),
        /NJS-520:/ //NJS-520: cannot connect to Oracle Database. File tnsnames.ora not found
      );
    });

    it('1.1.4 configDir with empty string', async function() {
      await assert.rejects(
        async () => await oracledb.getConnection({...dbConfig, configDir: ''}),
        /NJS-516:/ //NJS-516: no configuration directory set or available to search for tnsnames.ora
      );
    });

    it('1.1.5 connectString parameter is incorrect', async function() {
      const newDbConfig = {...dbConfig};
      newDbConfig.connectString = 'cdb1_db1';

      await assert.rejects(
        async () => await oracledb.getConnection({...newDbConfig, configDir: configDirectory}),
        //NJS-517: cannot connect to Oracle Database. Unable to find "cdb1_db1" in configDirectory'
        /NJS-517:/
      );
    });

    it('1.1.6 connectString parameter is empty', async function() {
      const newDbConfig = {...dbConfig};
      newDbConfig.connectString = '';
      await assert.rejects(
        async () => await oracledb.getConnection({...newDbConfig}),
        /NJS-125:/ // NJS-125: "connectString" cannot be empty or undefined.
      );
    });

    it('1.1.7 setting configDir in oracledb module', async function() {
      await assert.rejects(
        async () => await oracledb.initOracleClient({configDir: configDirectory}),
        /NJS-118:/ //NJS-118: node-oracledb Thick mode cannot be enabled because a
        //Thin mode connection has already been created
      );
    });
  });

  describe('1.2 Pool connection', function() {
    it('1.2.1 Sanity test', async function() {
      const config = {...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
        poolTimeout: 1,
        configDir: configDirectory
      };
      const pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      const result = await conn.execute("select 1 from dual");
      assert.strictEqual(1, result.rows[0][0]);
      await conn.close();
      await pool.close(0);
    });

    it('1.2.2 connectString parameter with tnsalias', async function() {
      const newDbConfig = {...dbConfig};
      newDbConfig.connectString = connTnsAlias;
      const config = {...newDbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
        poolTimeout: 1,
        configDir: configDirectory
      };
      const pool = await oracledb.createPool(config);
      const conn = await pool.getConnection();
      const result = await conn.execute("select 1 from dual");
      assert.strictEqual(1, result.rows[0][0]);
      await conn.close();
      await pool.close(0);
    });
  });
});
