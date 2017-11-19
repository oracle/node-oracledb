/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   extractpackage.js
 *
 * DESCRIPTION
 *   This script is a command-line interface to extract node-oracledb
 *   binaries from an available binary package, see INSTALL.md.
 *
 * USAGE
 *   Run this script like:
 *     node extractpackage.js path=oracledb-vX.Y.Z-node-vNN-platform-architecture.gz
 *   For example:
 *     node extractpackage.js path=oracledb-v2.0.14-node-v57-darwin-x64.gz
 *
 *   The extracted binary can be manually moved to the correct directory.
 *
 *****************************************************************************/

'use strict';

// This module is meant to be used with Node.js at the command line. It breaks
// apart a custom file that combines the node-oracledb license and binary into
// two separate files.

const fs = require('fs');
const packageUtil = require('./util.js');
let packagePath;

for (let x = 1; x < process.argv.length; x += 1) {
  let argParts = process.argv[x].split('=');
  let argName = argParts[0];
  let argVal = argParts[1];

  if (argName === 'path') {
    packagePath = argVal;
  }
}

if (packagePath === undefined) {
  throw new Error('path must be specified: node extractpackage.js path=/path/to/package.gz');
} else {
  let stats = fs.statSync(packagePath);

  if (!stats.isFile()) {
    throw new Error('path did not resolve to a file');
  }
}

packageUtil.extract({
  packagePath: packagePath,
  writeLicense: true
})
  .then(() => {
    packageUtil.log('Package extracted');
  })
  .catch(err => {
    packageUtil.error('Error extracting package');
    packageUtil.error(err.message);
  });
