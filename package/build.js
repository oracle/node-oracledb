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
 *   build.js
 *
 * DESCRIPTION
 *   Used by maintainers to create the npm package of node-oracledb.
 *   See README.md for details.
 *
 * USAGE
 *   node build.js binary | package
 *
 *   Run this in the /package directory
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const execSync = require('child_process').execSync;

const packageJSON = require("../package.json");

// Files etc relative to the top level directory
const releaseDir = "build/Release";
const relStagingDir = releaseDir + "/Staging";  // a subdir of Release so 'npm install' creates Release
const buildStagingDir = "package/Staging";
const moduleBinaryFile = releaseDir + "/oracledb.node";
const binaryStagingFileBase = buildStagingDir + "/oracledb.node-abi" + process.versions.modules + "-" + process.platform + "-" + process.arch;

// Build Metadata
const buildDate = new Date();
const nodeVersion = process.version;
const moduleVersion = packageJSON.version;
const njsGitSha = execSync('git --git-dir=../.git rev-parse --verify HEAD').toString().replace(/[\n\r]/, '');
const odpiGitSha = execSync('git --git-dir=../odpi/.git rev-parse --verify HEAD').toString().replace(/[\n\r]/, '');
const buildInfo = buildDate.toUTCString() + ' ' + nodeVersion + ' (ABI ' + process.versions.modules + ') ' + moduleVersion + ' ' + process.platform + ' (' + process.arch + ') ' + njsGitSha + ' ' + odpiGitSha;

// Build a binary for the current version of Node
async function buildBinary() {
  console.log('Building a binary for Node.js ' + nodeVersion);
  try {
    fs.mkdir(buildStagingDir, function(err) {if (err && !err.message.match(/EEXIST/)) throw(err);} );
    fs.unlink(moduleBinaryFile, function(err) {if (err && !err.message.match(/ENOENT/)) throw(err);});
    fs.unlink(binaryStagingFileBase + '.bin', function(err) {if (err && !err.message.match(/ENOENT/)) throw(err);});
    fs.unlink(binaryStagingFileBase + '-buildinfo.txt', function(err) {if (err && !err.message.match(/ENOENT/)) throw(err);});
    execSync('npm install');
    fs.copyFileSync(moduleBinaryFile, binaryStagingFileBase + '.bin');
    fs.appendFileSync(binaryStagingFileBase + '-buildinfo.txt', buildInfo + "\n");
  } catch(err) {
    console.error(err.message);
  }
}

// Create the npm package
async function packageUp() {
  console.log('Creating the npm package for node-oracledb ' + moduleVersion);
  try {
    // Set an install script target to call package/install.js
    delete packageJSON.dependencies;
    delete packageJSON.devDependencies;
    packageJSON.scripts = {};
    packageJSON.scripts.install = "node package/install.js";
    fs.writeFileSync("package.json", JSON.stringify(packageJSON, null, 2) + "\n");

    await delDir(relStagingDir);
    fs.mkdirSync(relStagingDir, { recursive: true, mode: 0o755 });
    await copyDir(buildStagingDir, relStagingDir);
    execSync('npm pack');
  } catch(err) {
    console.error(err);
  } finally {
    execSync('git checkout package.json');
  }
}

// Delete a directory
async function delDir(dir) {
  try {
    let f = fs.readdirSync(dir);
    for (let i = 0; i < f.length; i++) {
      fs.unlinkSync(dir + '/' + f[i]);
    }
    fs.rmdirSync(dir);
  } catch(err) {
    if (err && !err.message.match(/ENOENT/))
      console.error(err.message);
  }
}

// Copy a directory
async function copyDir(srcDir, destDir) {
  try {
    let f = fs.readdirSync(srcDir);
    for (let i = 0; i < f.length; i++) {
      fs.copyFileSync(srcDir + '/' + f[i], destDir + '/' + f[i]);
      let mode = f[i].match(/\.bin$/) ? 0o755 : 0o644;
      fs.chmodSync(destDir + '/' + f[i], mode);
    }
  } catch(err) {
    console.error(err.message);
  }
}

// Usage help info
function usage() {
  console.error('Usage: node build.js { binary | package }');
}

//
// Main
//

// Go to top level directory
process.chdir('..');

if (process.argv.length != 3 ) {
  usage();
} else {
  let command = process.argv[2];
  if (command == 'binary')
    buildBinary();
  else if (command == 'package')
    packageUp();
  else
    usage();
}
