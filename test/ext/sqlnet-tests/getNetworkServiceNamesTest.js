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
 *   listNetworkServiceNamesTest.js
 *
 * DESCRIPTION
 *   Checks the correctness of the oracledb.listNetworkServiceNames() functionality.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { join } = require("path");
const assert   = require('assert');
const oracledb = require('oracledb');

describe('1. getNetworkServiceNames() functionality test', function() {
  const t_host = '127.0.0.1';
  const t_port = 1521;
  const t_protocol = 'tcp';

  before(async function() {
    // Ensure that token generation is complete before tests start
    await new Promise(resolve => setTimeout(resolve, 4000));
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
      console.log('thick mode');
      // Thick mode requires Oracle Client or Oracle Instant Client libraries.
      // On Windows and macOS Intel you can specify the directory containing
      // the libraries at runtime or before Node.js starts.  On other platforms
      // (where Oracle libraries are available), the system library search path
      // must always include the Oracle library path before Node.js starts. If
      // the search path is not correct, you will get a DPI-1047 error. See
      // the node-oracledb installation documentation.
      let clientOpts = {};
      // On Windows and macOS Intel platforms, set the environment
      // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
      if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
        clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
      }
      oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
      const clientVersion = oracledb.oracleClientVersion;
      if (clientVersion < 1915000000 || (clientVersion >= 2100000000 && clientVersion < 2105000000)) {
        console.log('  Oracle Client Library Version:', oracledb.oracleClientVersionString);
        console.log('  Oracle Client version should be greater than 19.14 (19c) or greater than 21.5 (21c) for IAM tests with Thick mode');
        this.skip();
      }
    }
  });

  it('1.1 getNetworkServiceNames test with multiple aliases', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + t_protocol + ")(HOST=" + t_host + ")(PORT=" + t_port + "))(CONNECT_DATA=(SERVICE_NAME=XEPDB1)))";
    const alias = "tns_alias1= " + connect_string;
    const connect_string2 = t_protocol + "://" + t_host + ":1521/XEPDB1";
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const file_name = join(folder, "tnsnames.ora");
    fs.writeFileSync(file_name, alias, (err) => {
      // In case of a error throw err.
      if (err) throw err;
    });
    fs.appendFileSync(file_name, '\n' + ialias, (err) => {
      if (err) throw err;
    });

    const servNames = await oracledb.getNetworkServiceNames(folder);
    if (folder) {
      fs.rmSync(folder, { recursive: true });
    }
    assert.deepStrictEqual(servNames, [ 'TNS_ALIAS1', 'IALIAS' ]);
  }); //1.1

  it('1.2 getNetworkServiceNames test case with ifile entry', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + t_protocol + ")(HOST=" + t_host + ")(PORT=" + t_port + "))(CONNECT_DATA=(SERVICE_NAME=XEPDB1)))\n";
    const connect_string2 = t_protocol + "://" + t_host + ":1521/XEPDB1";
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const ifilePath = join(folder, "ifile.ora");
    const ifileEntry = "IFILE=" + ifilePath;
    const file_name = join(folder, "tnsnames.ora");
    const alias = "tns_alias1 = " + connect_string + ifileEntry;
    fs.writeFileSync(file_name, alias, (err) => {
      // In case of a error throw err.
      if (err) throw err;
    });
    fs.writeFileSync(ifilePath, ialias, (err) => {
      if (err) throw err;
    });
    const servNames = await oracledb.getNetworkServiceNames(folder);
    if (folder) {
      fs.rmSync(folder, { recursive: true });

    }
    assert.deepStrictEqual(servNames, ['TNS_ALIAS1', 'IALIAS']);
  }); //1.2
  it('1.3 getNetworkServiceNames test case with multiple line breaks in between 2 aliases ', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + t_protocol + ")(HOST=" + t_host + ")(PORT=" + t_port + "))(CONNECT_DATA=(SERVICE_NAME=XEPDB1)))";
    const alias = "tns_alias1= " + connect_string;
    const connect_string2 = t_protocol + "://" + t_host + ":1521/XEPDB1";
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const file_name = join(folder, "tnsnames.ora");
    fs.writeFileSync(file_name, alias, (err) => {
      // In case of a error throw err.
      if (err) throw err;
    });
    // append multiple line breaks for testing purposes
    fs.appendFileSync(file_name, '\n\n\n\n\n\n\n\n' + ialias, (err) => {
      if (err) throw err;
    });
    /* display the file content
    const data = fs.readFileSync(file_name,
      { encoding: 'utf8', flag: 'r' });
    console.log(data);
    */
    const servNames = await oracledb.getNetworkServiceNames(folder);
    if (folder) {
      fs.rmSync(folder, { recursive: true });
    }
    assert.deepStrictEqual(servNames, [ 'TNS_ALIAS1', 'IALIAS' ]);
  }); //1.3
  it('1.4 getNetworkServiceNames test case with multiple line breaks and # commented lines in between', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + t_protocol + ")(HOST=" + t_host + ")(PORT=" + t_port + "))(CONNECT_DATA=(SERVICE_NAME=XEPDB1)))";
    const alias = "tns_alias1= " + connect_string;
    const connect_string2 = t_protocol + "://" + t_host + ":1521/XEPDB1";
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const file_name = join(folder, "tnsnames.ora");
    fs.writeFileSync(file_name, alias, (err) => {
      // In case of a error throw err.
      if (err) throw err;
    });
    // append multiple line breaks for testing purposes
    fs.appendFileSync(file_name, '\n\n#commented line\n' + ialias, (err) => {
      if (err) throw err;
    });
    /* display the file content
    const data = fs.readFileSync(file_name,
      { encoding: 'utf8', flag: 'r' });
    console.log(data);
    */
    const servNames = await oracledb.getNetworkServiceNames(folder);
    if (folder) {
      fs.rmSync(folder, { recursive: true });
    }
    assert.deepStrictEqual(servNames, [ 'TNS_ALIAS1', 'IALIAS' ]);
  }); //1.4

});
