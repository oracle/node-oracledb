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
 *****************************************************************************/

'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const util = require('util');
const debug = (process.env.NODE_ORACLEDB_TRACE_INSTALL === 'TRUE') ? true : false;

let crypto;

try {
  crypto = require('crypto');
} catch (err) {
  // Ignoring this to allow other parts of the module to be used.
}

const LICENSE_FILE_NAME = 'LICENSE.md';
module.exports.LICENSE_FILE_NAME = LICENSE_FILE_NAME;

const LICENSE_PATH_LOCAL = path.normalize(__dirname + '/../') + LICENSE_FILE_NAME;
module.exports.LICENSE_PATH_LOCAL = LICENSE_PATH_LOCAL;

const BINARY_FILE_NAME = 'oracledb.node';
module.exports.BINARY_FILE_NAME = BINARY_FILE_NAME;

const BINARY_PATH_LOCAL = path.normalize(__dirname + '/../build/Release/') + BINARY_FILE_NAME;
module.exports.BINARY_PATH_LOCAL = BINARY_PATH_LOCAL;

const SHA_FILE_NAME = 'SHASUMS256.txt';
module.exports.SHA_FILE_NAME = SHA_FILE_NAME;

const LICENSE_HEADER_BYTES = 10;
module.exports.LICENSE_HEADER_BYTES = LICENSE_HEADER_BYTES;

const dynamicProps = {};
module.exports.dynamicProps = dynamicProps;

// initDynamicProps is used to initalize some properties that are only needed
// during install. This allows the util module to be used by the extract
// module without requiring a package.json.
function initDynamicProps() {
  trace('In initDynamicProps');

  let packageJSON;

  try {
    packageJSON = require('../package.json');
  } catch (err) {
    throw new Error('package.json required to install from binary');
  }

  const PACKAGE_JSON_VERSION = packageJSON.version;
  dynamicProps.PACKAGE_JSON_VERSION = PACKAGE_JSON_VERSION;

  let ght;

  // Get the package version from package.json
  if (packageJSON.version) {
    ght = 'v' + packageJSON.version;  // assume name format is always the same
  } else {
    throw new Error('Cannot determine node-oracledb version from package.json');
  }

  const GITHUB_TAG = ght;
  dynamicProps.GITHUB_TAG = GITHUB_TAG;

  const BASE_BUILD_NAME = 'oracledb-'+ GITHUB_TAG + '-node-v' + process.versions.modules + '-' + process.platform + '-' + process.arch;

  const BINARY_BUILD_NAME = BASE_BUILD_NAME + '-' + BINARY_FILE_NAME;
  dynamicProps.BINARY_BUILD_NAME = BINARY_BUILD_NAME;

  const PACKAGE_FILE_NAME = BASE_BUILD_NAME + '.gz';
  dynamicProps.PACKAGE_FILE_NAME = PACKAGE_FILE_NAME;

  trace('dynamicProps =', dynamicProps);
}

module.exports.initDynamicProps = initDynamicProps;

// log is used to log standard output with the 'oracledb' prefix.
function log(message) {
  const args = Array.from(arguments);

  args.unshift('oracledb');

  console.log.apply(console, args);
}

module.exports.log = log;

// trace is used to log trace output when debug is enabled. It combines
// 'oracledb' with a stylized 'TRACE' prefix.
function trace(message) {
  if (debug) {
    const args = Array.from(arguments);

    args.unshift('oracledb \x1b[30m\x1b[45mTRACE\x1b[0m');

    console.log.apply(console, args);
  }
}

module.exports.trace = trace;

// error is used to log errors. It combines 'oracledb' with a stylized 'ERR'
// prefix.
function error(message) {
  const args = Array.from(arguments);

  args.unshift('oracledb \x1b[31mERR!\x1b[0m');

  console.error.apply(console, args);
}

module.exports.error = error;

// The getSha function is used to get the SHA of a file.
function getSha(path) {
  trace('In getSha', path);

  return new Promise((resolve, reject) => {
    let settled = false;
    let hash;

    try {
      hash = crypto.createHash('sha256');
    } catch (err) {
      reject(err);
      settled = true;
      return;
    }

    const input = fs.createReadStream(path);

    input.on('error', err => {
      if (!settled) {
        reject(err);
        settled = true;
      }
    });

    input.on('readable', () => {
      const data = input.read();

      if (data) {
        hash.update(data);
      } else {
        const sha = hash.digest('hex');

        if (!settled) {
          trace('sha =', sha);

          resolve(sha);
          settled = true;
        }
      }
    });
  });
}

module.exports.getSha = getSha;

// The extract function is used to extract the license and node-oracledb binary
// from the custom file format that combines both.
function extract(opts) {
  return new Promise((resolve, reject) => {
    trace('In extract', util.inspect(opts, {depth: 0}));

    const binaryDest = opts.binaryDest || process.cwd() + '/' + BINARY_FILE_NAME;
    const binaryWriteStream = fs.createWriteStream(binaryDest);
    const gunzip = zlib.createGunzip();
    let licenseWriteStream;
    let compressedReadstream;
    let settled = false;
    let licenseWritten = false;
    let binaryWritten = false;

    function checkDone() {
      if (!settled && licenseWritten && binaryWritten) {
        resolve();
        settled = true;
      }
    }

    if (opts.writeLicense === true) {
      const licenseDest = opts.licenseDest || process.cwd() + '/' + LICENSE_FILE_NAME;

      licenseWriteStream = fs.createWriteStream(licenseDest);

      licenseWriteStream.on('error', err => {
        if (!settled) {
          reject(err);
          settled = true;
        }
      });

      licenseWriteStream.on('finish', () => {
        licenseWritten = true;
        checkDone();
      });
    } else {
      licenseWritten = true;
    }

    binaryWriteStream.on('error', err => {
      if (!settled) {
        reject(err);
        settled = true;
      }
    });

    binaryWriteStream.on('finish', () => {
      binaryWritten = true;
      checkDone();
    });

    if (opts.compressedReadstream) {
      compressedReadstream = opts.compressedReadstream;
    } else if (opts.packagePath) {
      compressedReadstream = fs.createReadStream(opts.packagePath);
    }

    const unzipedReadStream = compressedReadstream.pipe(gunzip);

    let licenseFileSizeBytes;
    let licenseFileBytesWritten = 0;

    unzipedReadStream.on('close', () => {
      binaryWriteStream.end();
    });

    unzipedReadStream.on('data', chunk => {
      let bytesToWriteInThisEvent;

      if (licenseFileBytesWritten === 0) { // assumes first chunk size is > LICENSE_HEADER_BYTES
        licenseFileSizeBytes = parseInt(chunk.toString('ascii', 0, LICENSE_HEADER_BYTES));
        chunk = chunk.slice(LICENSE_HEADER_BYTES);
      }

      if (licenseFileBytesWritten < licenseFileSizeBytes) {
        const remainingLicenseBytesToWrite = licenseFileSizeBytes - licenseFileBytesWritten;

        bytesToWriteInThisEvent = (chunk.length > remainingLicenseBytesToWrite) ? remainingLicenseBytesToWrite : chunk.length;

        if (opts.writeLicense === true) {
          licenseWriteStream.write(chunk.slice(0, bytesToWriteInThisEvent));
        }

        licenseFileBytesWritten += bytesToWriteInThisEvent;

        if (opts.writeLicense === true && licenseFileBytesWritten === licenseFileSizeBytes) {
          licenseWriteStream.end();
        }
      }

      if (licenseFileBytesWritten >= licenseFileSizeBytes) {
        if (bytesToWriteInThisEvent) {
          binaryWriteStream.write(chunk.slice(bytesToWriteInThisEvent));
        } else {
          binaryWriteStream.write(chunk);
        }
      }
    });
  });
}

module.exports.extract = extract;
