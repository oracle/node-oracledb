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
 *   createpackage.js
 *
 * DESCRIPTION
 *   Creates a binary package for the current node-oracledb binary.  A
 *   custom package format is used.  The package uses a custom format
 *   with three components: length bytes (giving the length of the
 *   license file), the license file, and then the node-oracledb
 *   binary.  The package is gzipped.
 *
 *****************************************************************************/

'use strict';

const fs = require('fs');
const Readable = require('stream').Readable;
const zlib = require('zlib');
const path = require('path');
const util = require('util');
const packageUtil = require('./util.js');

packageUtil.initDynamicProps();

// writeFileToReadable is used to buffer the contents of files to a readable
// stream that can be written out later.
function writeFileToReadable(path, readable) {
  return new Promise((resolve, reject) => {
    packageUtil.trace('In writeFileToReadable', path, util.inspect(readable, {depth: 0}));

    const rs = fs.createReadStream(path);

    rs.on('data', chunk => {
      readable.push(chunk);
    });

    rs.on('error', err => {
      reject(err);
    });

    rs.on('close', () => {
      resolve();
    });
  });
}

// createPackage is used to create a custom file that combines the node-oracledb
// binary with the license. This function is meant to be used at the command line.
function createPackage() {
  packageUtil.trace('In createPackage');

  let binaryPath = packageUtil.BINARY_PATH_LOCAL;

  for (let x = 2; x < process.argv.length; x += 1) {
    let argParts = process.argv[x].split('=');
    let argName = argParts[0];
    let argVal = argParts[1];

    if (argName === 'path') {
      binaryPath = argVal;
    }
  }

  if (!binaryPath.endsWith(packageUtil.BINARY_FILE_NAME)) {
    throw new Error('path should resolve to a file named ' + packageUtil.BINARY_FILE_NAME);
  }

  let binaryStats = fs.statSync(binaryPath);

  if (!binaryStats.isFile()) {
    throw new Error('path did not resolve to a file');
  }

  // Requiring in the binary ensures that it matches the version of Node.js currently
  // running. This is important as the process variable is used to file naming.
  require(path.normalize(binaryPath + '/../../../'));

  let licensePath;

  if (binaryPath != packageUtil.BINARY_PATH_LOCAL) {
    licensePath = path.normalize(binaryPath + '/../../../' + packageUtil.LICENSE_FILE_NAME);
  } else {
    licensePath = packageUtil.LICENSE_PATH_LOCAL;
  }

  class TempReadable extends Readable {
    constructor(options) {
      super(options);
    }

    _read(size) {} // Must be implemented but not used
  }

  const tempReadable = new TempReadable({
    highWaterMark: 1048576 // 1 MB
  });

  packageUtil.getSha(binaryPath)
    .then(binarySha => {
      const newShaLine = binarySha + '  ' + packageUtil.dynamicProps.BINARY_BUILD_NAME;
      let shaFileContents;

      try {
        shaFileContents = fs.readFileSync(packageUtil.SHA_FILE_NAME, {encoding: 'utf8'});
        shaFileContents = shaFileContents.split('\n');

        let updatedLine = false;

        for (let x = 0; x < shaFileContents.length; x += 1) {
          const line = shaFileContents[x];

          if (line.split('  ')[1] === packageUtil.dynamicProps.BINARY_BUILD_NAME) {
            shaFileContents[x] = newShaLine;
            updatedLine = true;
            break;
          }
        }

        if (!updatedLine) {
          shaFileContents.splice(shaFileContents.length - 1, 0, newShaLine);
        }

        shaFileContents = shaFileContents.join('\n');
      } catch (err) {
        shaFileContents = newShaLine + '\n';
      }

      fs.writeFileSync(packageUtil.SHA_FILE_NAME, shaFileContents);

      let stats = fs.statSync(licensePath);
      let licenseSize = stats.size.toString();

      let zerosToAppend = packageUtil.LICENSE_HEADER_BYTES - licenseSize.length;
      let paddedZeros = '';

      for (let x = 0; x < zerosToAppend; x += 1) {
        paddedZeros += '0';
      }

      licenseSize = paddedZeros + licenseSize;

      // The following line generates an error on Node.js 4.0, but not 4.8.5. Not sure
      // when the correct API was added.
      const licenseSizeBuf = Buffer.from(licenseSize, 'ascii');

      tempReadable.push(licenseSizeBuf);
    })
    .then(() => {
      return writeFileToReadable(licensePath, tempReadable);
    })
    .then(() => {
      return writeFileToReadable(binaryPath, tempReadable);
    })
    .then(() => {
      const ws = fs.createWriteStream(packageUtil.dynamicProps.PACKAGE_FILE_NAME);
      const gzip = zlib.createGzip();
      const filestream = tempReadable.pipe(gzip).pipe(ws);

      tempReadable.push(null); // Signal the end of data in

      filestream.on('close', () => {
        console.log('Package created: ' + packageUtil.dynamicProps.PACKAGE_FILE_NAME);
      });
    })
    .catch(err => {
      console.log('Error creating package', err);
    })
}

createPackage();
