/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   install.js
 *
 * DESCRIPTION
 *   This script is included in the npm bundle of node-oracledb.  It
 *   is invoked by package.json during npm install.
 *
 * MAINTENANCE NOTES
 *   This file should only ever 'require' packages included in core Node.js.
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const nodbUtil = require('../lib/util.js');

// Log standard output with an 'oracledb' prefix
function log(message) { // eslint-disable-line
  const args = Array.from(arguments);
  args.unshift('oracledb');
  console.log.apply(console, args);
}

// Log errors. It combines 'oracledb' with a stylized 'ERR' prefix
function error(message) { // eslint-disable-line
  const args = Array.from(arguments);
  args.unshift('oracledb \x1b[31mERR!\x1b[0m');
  console.error.apply(console, args);
}

// Print concluding messages and quit
function done(err) {
  let installUrl = 'https://oracle.github.io/node-oracledb/INSTALL.html';

  if (err) { // Couldn't install the binary
    error(err.message);
    if (err.message.match(/^NJS-067/)) {
      error('Try compiling node-oracledb source code using ' + installUrl + '#github');
    } else if (err.message.match(/^NJS-069/)) {
      error('An older node-oracledb version may work with Node.js ' + process.version);
    }
    process.exit(87);
  } else { // Successfully installed
    let arch;

    if (process.arch === 'x64') {
      arch = '64-bit';
    } else {
      arch = '32-bit';
    }

    if (process.platform === 'linux') {
      installUrl += '#linuxinstall';
    } else if (process.platform === 'darwin') {
      installUrl += '#instosx';
    } else if (process.platform === 'win32') {
      installUrl += '#windowsinstallation';
    }

    log('********************************************************************************');
    log('** Node-oracledb ' + nodbUtil.PACKAGE_JSON_VERSION + ' installed in Node.js ' + process.versions.node + ' (' + process.platform + ', ' + process.arch + ')');
    log('**');
    log('** To use node-oracledb:');
    log('** - Oracle Client libraries (' + arch + ') must be available.');
    log('** - Follow the installation instructions:');
    log('**   ' + installUrl);
    log('********************************************************************************\n');
  }
}

// Check for a usable binary file for the node-oracledb module.  Node.js 8.16
// and 10.16 (and 12.0) contain an important Node-API performance regression fix.
// Note that the checked versions are the minimum required for Node-API
// compatibility; as new Node.js versions are released, older Node.js versions
// are dropped from the node-oracledb test plan.  For example, the obsolete
// Node.js 9 and 11 versions are not tested.

function checkAvailable(cb) {
  let vs = process.version.substring(1).split(".").map(Number);
  if (vs[0] < 8 || (vs[0] === 8 && vs[1] < 16)) {
    cb(new Error(nodbUtil.getErrorMessage('NJS-069', nodbUtil.PACKAGE_JSON_VERSION, "8.16")));
  } else if (vs[0] === 10 && vs[1] < 16) {
    cb(new Error(nodbUtil.getErrorMessage('NJS-069', nodbUtil.PACKAGE_JSON_VERSION, "10.16")));
  } else {
    try {
      fs.statSync(nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE);
      cb();
    } catch (err) {
      cb(new Error(nodbUtil.getErrorMessage('NJS-067', process.platform + ' ' + process.arch)));
    }
  }
}

checkAvailable(done);
