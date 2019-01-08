/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   buildv6binary.js
 *
 * DESCRIPTION
 *   Used by maintainers to create a node-oracledb binary for Node.js v6.
 *
 * USAGE
 *   node buildv6binary.js
 *
 *   Run this in the /package directory
 *
 *   When Node.js 6 is no longer supported, this file will be
 *   obsoleted in favor of build.js
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const execSync = require('child_process').execSync;

const packageJSON = require("../package.json");

// Files etc relative to the top level directory
const releaseDir = "build/Release";
const buildStagingDir = "package/Staging";
const moduleBinaryFile = releaseDir + "/oracledb.node";
const binaryStagingFileBase = "oracledb.node-abi" + process.versions.modules + "-" + process.platform + "-" + process.arch;

// Build Metadata
const buildDate = new Date();
const nodeVersion = process.version;
const moduleVersion = packageJSON.version;
const njsGitSha = execSync('git --git-dir=../.git rev-parse --verify HEAD').toString().replace(/[\n\r]/, '');
const odpiGitSha = execSync('git --git-dir=../odpi/.git rev-parse --verify HEAD').toString().replace(/[\n\r]/, '');
const buildInfo = buildDate.toUTCString() + ' ' + nodeVersion + ' (ABI ' + process.versions.modules + ') ' + moduleVersion + ' ' + process.platform + ' (' + process.arch + ') ' + njsGitSha + ' ' + odpiGitSha;

// Build a binary for the current version of Node
function buildbinary() {
  console.log('Building a binary for ' + binaryStagingFileBase);
  try {
    fs.mkdir(buildStagingDir, function(err) {if (err && !err.message.match(/EEXIST/)) throw(err);} );
    fs.unlink(moduleBinaryFile, function(err) {if (err && !err.message.match(/ENOENT/)) throw(err);});
    fs.unlink(buildStagingDir + "/" + binaryStagingFileBase + '.bin', function(err) {if (err && !err.message.match(/ENOENT/)) throw(err);});
    fs.unlink(buildStagingDir + "/" + binaryStagingFileBase + '-buildinfo.txt', function(err) {if (err && !err.message.match(/ENOENT/)) throw(err);});
    execSync('npm install');
    fs.renameSync(moduleBinaryFile, buildStagingDir + "/" + binaryStagingFileBase + '.bin');
    fs.appendFileSync(buildStagingDir + "/" + binaryStagingFileBase + '-buildinfo.txt', buildInfo + "\n");
  } catch(err) {
    console.error(err.message);
  }
}

process.chdir('..');

buildbinary();
