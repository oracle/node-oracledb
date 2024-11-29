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
 *   1. tnsAliasTest.js
 *
 * DESCRIPTION
    Tests for the correct functionality, when tnsAlias(cid) is given in the
    input connect string.
    Different combinations of configDir parameter/ TNS_ADMIN environment
    variable set/unset values used.

    Creates a temporary folder with tnsnames.ora file in it and
    fs.write() alias_name with the corresponding value in the file.
    Try Catch the connection to the address and check the error message
    whether its searching in the desired location for the alias.

 *****************************************************************************/
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert   = require('assert');
const oracledb = require('oracledb');
const dbConfig = require('../../dbconfig.js');

describe('1 tnsAliasTest.js ', function() {

  before(function() {
    if (!oracledb.thin)
      this.skip();
  });
  let folder;

  function createTempTnsNamesFileAndDir(tnsAlias) {
    const alias = `${tnsAlias} = ` + dbConfig.connectString;
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const fileName = path.join(folder, "tnsnames.ora");
    fs.writeFileSync(fileName, alias, (err) => {
      // In case of an error throw err.
      if (err) throw err;
    });
  }
  afterEach(function() {
    if (folder) {
      fs.rmSync(folder, { recursive: true });
      folder = null;
    }
  });

  it('1.1 negative test case, wrong alias , configDir set', async function() {
    // Create the tnsnames.ora file and directory
    createTempTnsNamesFileAndDir('tns_alias');

    const UserP = {
      connectString: 'tns_alias1',
      user: dbConfig.user,
      password: dbConfig.password,
      configDir: folder,
    };
    await assert.rejects(async () => {
      await oracledb.getConnection(UserP);
    }, /NJS-517:/);
  });

  it('1.2 negative test case, wrong alias, no configDir set, TNS_ADMIN may or may not be set', async function() {
    // Create the tnsnames.ora file and directory
    createTempTnsNamesFileAndDir('tns_alias');

    const UserP = {
      connectString: 'tns_alias1',
      user: dbConfig.user,
      password: dbConfig.password
    };

    await assert.rejects(async () => {
      await oracledb.getConnection(UserP);
    }, /NJS-516:|NJS-520:|NJS-517:/);

    //NJS-516: no configuration directory set or available to search for tnsnames.ora
    //NJS-520: cannot connect to Oracle Database. File tnsnames.ora not found in " + process.env.TNS_ADMIN
    //NJS-517: cannot connect to Oracle Database. Unable to find tns_alias1 in  + process.env.TNS_ADMIN + tnsnames.ora

  });

  it('1.3 positive test case with correct alias', async function() {
    // Create the tnsnames.ora file and directory
    createTempTnsNamesFileAndDir('tns_alias');

    const userP = {
      connectString: 'tns_alias',
      configDir: folder,
      user: dbConfig.user,
      password: dbConfig.password
    };
    const connection = await oracledb.getConnection(userP);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();

  });

  it('1.4 positive test case with multiple tns alias entries', async function() {
    // Create the tnsnames.ora file and directory
    createTempTnsNamesFileAndDir('tns_alias1, tns_alias2, tns_alias3');

    const userP = {
      connectString: 'tns_alias1',
      configDir: folder,
      user: dbConfig.user,
      password: dbConfig.password
    };
    let connection = await oracledb.getConnection(userP);
    let result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();
    userP.connectString = 'tns_alias2';
    connection = await oracledb.getConnection(userP);
    result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();
    userP.connectString = 'tns_alias3';
    connection = await oracledb.getConnection(userP);
    result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();

  });

  it('1.5 positive test case with ifile entry', async function() {
    const connect_string = dbConfig.connectString + '\n';
    const connect_string2 = dbConfig.connectString;
    const ialias = "ialias=" + connect_string2;
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const ifilePath = path.join(folder, "ifile.ora");
    const ifileEntry = "IFILE=" + ifilePath;
    const fileName = path.join(folder, "tnsnames.ora");
    const alias = "tns_alias1 = " + connect_string + ifileEntry;
    fs.writeFileSync(fileName, alias, (err) => {
      // In case of an error throw err.
      if (err) throw err;
    });
    fs.writeFileSync(ifilePath, ialias, (err) => {
      if (err) throw err;
    });

    const userP = {
      connectString: 'ialias',
      configDir: folder,
      user: dbConfig.user,
      password: dbConfig.password
    };
    const connection = await oracledb.getConnection(userP);
    const result = await connection.execute("select 1+1 from dual");
    assert(result.rows[0][0], 2);
    await connection.close();
  });
});
