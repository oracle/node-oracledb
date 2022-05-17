/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 *   buildbinary.js
 *
 * DESCRIPTION
 *   Used by maintainers to create a node-oracledb binary for Node.js.
 *   See README.md for details.
 *
 * USAGE
 *   Run this with 'npm run buildbinary'
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const execSync = require('child_process').execSync;
const nodbUtil = require('../lib/util.js');

// Files relative to the top level directory
const buildBinaryFile = nodbUtil.RELEASE_DIR + "/oracledb.node";
const binaryStagingFile = nodbUtil.STAGING_DIR + '/' + nodbUtil.BINARY_FILE;
const binaryStagingInfoFile = binaryStagingFile + '-buildinfo.txt';

// Build Metadata
const buildDate = new Date();
const nodeVersion = process.version;

let njsGitSha;
try {
  njsGitSha = execSync('git --git-dir=./.git rev-parse --verify HEAD').toString().replace(/[\n\r]/, '');
} catch (err) {
  njsGitSha = 'unknown NJS SHA';
}

let odpiGitSha;
try {
  odpiGitSha = execSync('git --git-dir=./odpi/.git rev-parse --verify HEAD').toString().replace(/[\n\r]/, '');
} catch (err) {
  odpiGitSha = 'unknown ODPI-C SHA';
}

const buildInfo = nodbUtil.BINARY_FILE + ' ' + nodeVersion + ' ' + njsGitSha + ' ' + odpiGitSha + ' ' + buildDate.toUTCString();

// Build a binary and move it to the Staging directory
function buildBinary() {
  console.log('Building binary ' + nodbUtil.BINARY_FILE + ' using Node.js ' + nodeVersion);
  try {
    fs.mkdir(nodbUtil.STAGING_DIR, function(err) {
      if (err && !err.message.match(/EEXIST/)) throw (err);
    });
    fs.unlink(buildBinaryFile, function(err) {
      if (err && !err.message.match(/ENOENT/)) throw (err);
    });
    fs.unlink(binaryStagingFile, function(err) {
      if (err && !err.message.match(/ENOENT/)) throw (err);
    });
    fs.unlink(binaryStagingInfoFile, function(err) {
      if (err && !err.message.match(/ENOENT/)) throw (err);
    });
    execSync('node-gyp rebuild');
    fs.renameSync(buildBinaryFile, binaryStagingFile);
    fs.appendFileSync(binaryStagingInfoFile, buildInfo + "\n");
  } catch (err) {
    console.error(err.message);
  }
}

//
// Main
//

buildBinary();
