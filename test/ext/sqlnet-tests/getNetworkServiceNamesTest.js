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
 *   getNetworkServiceNamesTest.js
 *
 * DESCRIPTION
 *   Checks the correctness of the oracledb.getNetworkServiceNames() functionality.
 *
 * * Set environment variables
 * NODE_ORACLEDB_HOST: DB host name
 * NODE_ORACLEDB_SERVICENAME: DB Service Name
 * NODE_ORACLEDB_PORT: DB port name (optional, default is 1521)
 * NODE_ORACLEDB_PROTOCOL: Protocol to connect to DB (optional, default is tcp)
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert   = require('assert');
const oracledb = require('oracledb');

describe('1. getNetworkServiceNames() functionality test', function() {
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


  it('1.1 getNetworkServiceNames test with multiple aliases', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + protocol + ")(HOST=" + host + ")(PORT=" + port + "))(CONNECT_DATA=(SERVICE_NAME=" + svcName + ")))";
    const alias = "tns_alias1= " + connect_string;
    const connect_string2 = protocol + "://" + host + ":" + port + svcName;
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const fileName = path.join(folder, "tnsnames.ora");
    fs.writeFileSync(fileName, alias, (err) => {
      // In case of an error throw err.
      if (err) throw err;
    });
    fs.appendFileSync(fileName, '\n' + ialias, (err) => {
      if (err) throw err;
    });

    const servNames = await oracledb.getNetworkServiceNames(folder);
    if (folder) {
      fs.rmSync(folder, { recursive: true });
    }
    assert.deepStrictEqual(servNames, [ 'TNS_ALIAS1', 'IALIAS' ]);
  }); // 1.1

  it('1.2 getNetworkServiceNames test case with ifile entry', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + protocol + ")(HOST=" + host + ")(PORT=" + port + "))(CONNECT_DATA=(SERVICE_NAME=" + svcName + ")))\n";
    const connect_string2 = protocol + "://" + host + ":" + port + svcName;
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const ifilePath = path.join(folder, "ifile.ora");
    const ifileEntry = "IFILE=" + ifilePath;
    const file_name = path.join(folder, "tnsnames.ora");
    const alias = "tns_alias1 = " + connect_string + ifileEntry;
    fs.writeFileSync(file_name, alias, (err) => {
      // In case of an error throw err.
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
  }); // 1.2

  it('1.3 getNetworkServiceNames test case with multiple line breaks in between 2 aliases ', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + protocol + ")(HOST=" + host + ")(PORT=" + port + "))(CONNECT_DATA=(SERVICE_NAME=" + svcName + ")))";
    const alias = "tns_alias1= " + connect_string;
    const connect_string2 = protocol + "://" + host + ":" + port + svcName;
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const file_name = path.join(folder, "tnsnames.ora");
    fs.writeFileSync(file_name, alias, (err) => {
      // In case of an error throw err.
      if (err) throw err;
    });
    // append multiple line breaks for testing purposes
    fs.appendFileSync(file_name, '\n\n\n\n\n\n\n\n' + ialias, (err) => {
      if (err) throw err;
    });
    const servNames = await oracledb.getNetworkServiceNames(folder);
    if (folder) {
      fs.rmSync(folder, { recursive: true });
    }
    assert.deepStrictEqual(servNames, [ 'TNS_ALIAS1', 'IALIAS' ]);
  }); // 1.3

  it('1.4 getNetworkServiceNames test case with multiple line breaks and # commented lines in between', async function() {
    const connect_string = "(DESCRIPTION=(ADDRESS=(PROTOCOL=" + protocol + ")(HOST=" + host + ")(PORT=" + port + "))(CONNECT_DATA=(SERVICE_NAME=" + svcName + ")))";
    const alias = "tns_alias1= " + connect_string;
    const connect_string2 = protocol + "://" + host + ":" + port + svcName;
    const ialias = "ialias=" + connect_string2;
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tnsAlias-'));
    const file_name = path.join(folder, "tnsnames.ora");
    fs.writeFileSync(file_name, alias, (err) => {
      // In case of an error throw err.
      if (err) throw err;
    });
    // append multiple line breaks for testing purposes
    fs.appendFileSync(file_name, '\n\n#commented line\n' + ialias, (err) => {
      if (err) throw err;
    });
    const servNames = await oracledb.getNetworkServiceNames(folder);
    if (folder) {
      fs.rmSync(folder, { recursive: true });
    }
    assert.deepStrictEqual(servNames, [ 'TNS_ALIAS1', 'IALIAS' ]);
  }); //1.4

});
