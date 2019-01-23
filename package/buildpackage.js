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
 *   buildpackage.js
 *
 * DESCRIPTION
 *   Used by maintainers to create the npm package of node-oracledb.
 *   See README.md for details.
 *
 * USAGE
 *   Run this with 'npm run buildpackage'
 *
 *   It requires Node 8 or later
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const execSync = require('child_process').execSync;
const nodbUtil = require('../lib/util.js');
const packageJSON = require("../package.json");

// Create the npm package
async function packageUp() {
  console.log('Creating the npm package for node-oracledb ' + packageJSON.version);
  try {
    // Update package.json by setting an install script target to call
    // package/install.js and one that deletes unneeded binaries
    delete packageJSON.dependencies;
    delete packageJSON.devDependencies;
    packageJSON.scripts = {};
    packageJSON.scripts.install = 'node package/install.js';
    packageJSON.scripts.prune = 'node package/prunebinaries.js';
    fs.writeFileSync('package.json', JSON.stringify(packageJSON, null, 2) + '\n');

    // Copy all the staged files to the Release directory
    await delDir(nodbUtil.RELEASE_DIR);
    fs.mkdirSync(nodbUtil.RELEASE_DIR, { recursive: true, mode: 0o755 });
    await copyDir(nodbUtil.STAGING_DIR, nodbUtil.RELEASE_DIR);

    // Don't include source code etc. in the npm package.  This is
    // done dynamically because .npmignore cannot exclude source code
    // by default otherwise compiling from a GitHub tag or branch
    // won't work.
    fs.appendFileSync('.npmignore', '\n/odpi\n/src\nbinding.gyp\n/package/buildbinary.js\n/package/buildpackage.js\n');

    // Build the package
    execSync('npm pack');

  } catch(err) {
    console.error(err);
  } finally {
    // Undo changes to the repo
    execSync('git checkout package.json .npmignore');
  }
}

// Delete a directory
function delDir(dir) {
  try {
    let f = fs.readdirSync(dir);
    for (let i = 0; i < f.length; i++) {
      if (fs.lstatSync(dir + '/' + f[i]).isDirectory()) {
        delDir(dir + '/' + f[i]);
      }
      else {
        fs.unlinkSync(dir + '/' + f[i]);
      }
    }
    fs.rmdirSync(dir);
  } catch(err) {
    if (err && !err.message.match(/ENOENT/))
      console.error(err.message);
  }
}

// Copy a directory
function copyDir(srcDir, destDir) {
  try {
    let f = fs.readdirSync(srcDir);
    for (let i = 0; i < f.length; i++) {
      fs.copyFileSync(srcDir + '/' + f[i], destDir + '/' + f[i]);
      let mode = f[i].match(/\.txt$/) ? 0o644 : 0o755;
      fs.chmodSync(destDir + '/' + f[i], mode);
    }
  } catch(err) {
    console.error(err.message);
  }
}

//
// Main
//

packageUp();
