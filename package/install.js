/* Copyright (c) 2017, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   The node-oracledb npm package bundles all available pre-built
 *   binaries, so this script is really just a check to see if an
 *   appropriate pre-built binary is available.
 *
 * MAINTENANCE NOTES
 *   This file should only ever 'require' packages included in core Node.js.
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const nodbUtil = require('../lib/util.js');

let packageJSON;
try {
  packageJSON = require('../package.json');
} catch(err) {
  throw new Error('package.json is missing');
}
const PACKAGE_JSON_VERSION = packageJSON.version;

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

// Print a concluding messages and quits
function done(err) {
  let installUrl = 'https://oracle.github.io/node-oracledb/INSTALL.html';

  if (err) { // Couldn't install the binary
    error(err.message);
    error('Try compiling node-oracledb source code using ' + installUrl + '#github');
    process.exit(87);
  } else { // Successfully installed
    let arch;
    let clientUrl;

    if (process.arch === 'x64') {
      arch = '64-bit';
    } else {
      arch = '32-bit';
    }

    log('********************************************************************************');

    log('** Node-oracledb ' + PACKAGE_JSON_VERSION + ' installed for Node.js ' + process.versions.node + ' (' + process.platform + ', ' + process.arch +')');

    log('**');
    log('** To use node-oracledb:');

    if (process.platform === 'linux') {
      if (process.arch === 'x64') {
        clientUrl = 'https://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html';
      } else {
        clientUrl = 'https://www.oracle.com/technetwork/topics/linuxsoft-082809.html';
      }

      log('** - Oracle Client libraries (' + arch + ') must be configured with ldconfig or LD_LIBRARY_PATH');
      log('** - To get libraries, install an Instant Client Basic or Basic Light package from');
      log('**   ' + clientUrl);
    } else if (process.platform === 'darwin') {
      clientUrl = 'https://www.oracle.com/technetwork/topics/intel-macsoft-096467.html';
      installUrl = 'https://oracle.github.io/node-oracledb/INSTALL.html#instosx';

      log('** - An Oracle Instant Client Basic or Basic Light package must be in ~/lib or /usr/local/lib');
      log('**   Download from ' + clientUrl);
    } else if (process.platform === 'win32') {
      if (process.arch === 'x64') {
        clientUrl = 'https://www.oracle.com/technetwork/topics/winx64soft-089540.html';
      } else {
        clientUrl = 'https://www.oracle.com/technetwork/topics/winsoft-085727.html';
      }

      log('** - Oracle Client libraries (' + arch + ') must be in your PATH environment variable');
      log('** - To get libraries, install an Instant Client Basic or Basic Light package from');
      log('**   ' + clientUrl);
      log('** - A Microsoft Visual Studio Redistributable suitable for your Oracle Client library version must be available');
      log('**   See ' + installUrl + ' for details');
    } else {
      clientUrl = 'https://www.oracle.com/technetwork/database/database-technologies/instant-client/overview/index.html';
      log('** - Oracle Client libraries (' + arch + ') must be in your operating system library search path');
      log('** - To get libraries, install an Instant Client Basic or Basic Light package from:');
      log('**   ' + clientUrl);
    }

    log('**');
    log('** Installation instructions: ' + installUrl);
    log('********************************************************************************\n');
  }
}

// Check there is a usable binary file for the node-oracledb module
function checkAvailable(cb) {
  const binaryFile = nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE;
  try {
    fs.statSync(binaryFile);
    cb();
  } catch (err) {
    let m = process.version + ' (NODE_MODULE_VERSION=' + process.versions.modules + ') on ' + process.platform + ' ' + process.arch;
    cb(new Error(nodbUtil.getErrorMessage('NJS-067', m)));
  }
}

checkAvailable(done);
