/* Copyright (c) 2017, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   oracledbinstall.js
 *
 * DESCRIPTION
 *   This script is included in the npm bundle of node-oracledb.  It
 *   is invoked by package.json during npm install.  It downloads a
 *   pre-built node-oracleb binary from GitHub if one is available, or
 *   gives a message on how to compile one from source code.
 *
 *   Set NODE_ORACLEDB_TRACE_INSTALL=TRUE for installation trace output.
 *
 * MAINTENANCE NOTES
 *   - This file should run with Node 4 or later.
 *   - This file should only ever 'require' packages included in core Node.js.
*
 *****************************************************************************/

'use strict';

const http = require('http'); // Fails in old Node.js. Use Node 4+
const https = require('https');
const fs = require('fs');
const url = require('url');
const packageUtil = require('./util.js');

packageUtil.initDynamicProps();

try {
  // Requiring here to ensure it's available, actually used in util.js
  const crypto = require('crypto');
} catch (err) {
  done(new Error('Node.js crypto module required to install from binary'));
  return;
}

// Note: the Makefile uses these hostname and path values for the npm
// package but will substitute them for the staging package
const PACKAGE_HOSTNAME = 'github.com';
const PACKAGE_PATH_REMOTE = '/oracle/node-oracledb/releases/download/' + packageUtil.dynamicProps.GITHUB_TAG + '/' + packageUtil.dynamicProps.PACKAGE_FILE_NAME;
const SHA_PATH_REMOTE = '/oracle/node-oracledb/releases/download/' + packageUtil.dynamicProps.GITHUB_TAG + '/' + packageUtil.SHA_FILE_NAME;
const PORT = 443;

// getProxyConfig gets the proxy configuration for a given hostname. Has basic
// no_proxy support.
function getProxyConfig(hostname) {
  packageUtil.trace('In getProxyConfig', hostname);

  const proxyConfig = {
    useProxy: undefined
  };

  let proxy = process.env.https_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.http_proxy ||
    process.env.HTTP_PROXY ||
    process.env.all_proxy ||
    process.env.ALL_PROXY;

  if (proxy) {
    proxyConfig.useProxy = true;

    if (!proxy.startsWith('http://') && !proxy.startsWith('https://')) {
      proxy = 'https://' + proxy;
    }

    const parsedUrl = url.parse(proxy);

    proxyConfig.hostname = parsedUrl.hostname;
    proxyConfig.port = parsedUrl.port;
  } else {
    proxyConfig.useProxy = false;

    return proxyConfig;
  }

  const noProxy = process.env.NO_PROXY ||
    process.env.no_PROXY ||
    process.env.no_proxy;

  if (noProxy === '*') {
    packageUtil.trace('noProxy wildcard');
    proxyConfig.useProxy = false;
    proxyConfig.hostname = undefined;
    proxyConfig.hostname = undefined;
  } else if (noProxy) {
    const noProxies = noProxy.toLowerCase().split(',');
    packageUtil.trace('noProxy', noProxies);

    if (noProxies.indexOf(hostname.toLowerCase()) > -1) {
      proxyConfig.useProxy = false;
      proxyConfig.hostname = undefined;
      proxyConfig.port = undefined;
    }
  }

  return proxyConfig;
}

// verifyBinary is used to ensure that the SHA of the local binary matches the
// SHA in the remote SHA file.
function verifyBinary() {
  return new Promise((resolve, reject) => {
    packageUtil.trace('In verifyBinary');
    packageUtil.trace('Checking for binary at', packageUtil.BINARY_PATH_LOCAL);
    packageUtil.log('Verifying installation');

    if (!fs.existsSync(packageUtil.BINARY_PATH_LOCAL)) {
      resolve(false);
      return;
    }

    let remoteShaFile = '';
    let binarySha;

    packageUtil.getSha(packageUtil.BINARY_PATH_LOCAL)
      .then((sha) => {
        binarySha = sha;

        return getRemoteFileReadStream(PACKAGE_HOSTNAME, SHA_PATH_REMOTE);
      })
      .then(readStream => {
        return new Promise((resolve, reject) => {
          readStream.setEncoding('utf8');

          // Buffer file in memory
          readStream.on('data', chunk => {
            remoteShaFile += chunk;
          });

          readStream.on('error', reject);

          readStream.on('end', resolve);
        });
      })
      .then(() => {
        if (!remoteShaFile.match(packageUtil.dynamicProps.BINARY_BUILD_NAME)) {
          packageUtil.log('Build not found in SHASUMS256.txt');

          resolve(false);
        } else if (!remoteShaFile.match(binarySha + '  ' + packageUtil.dynamicProps.BINARY_BUILD_NAME)) {
          packageUtil.log('Binary SHA does not match SHA in SHASUMS256.txt');

          resolve(false);
        } else {
          packageUtil.log('Binary SHA matches SHA in SHASUMS256.txt');

          resolve(true);
        }
      })
      .catch(reject);
  });
}

// The getRemoteFileReadStream function is used as the starting point for
// fetching remote file streams. It checks the proxy configuration and
// routes the request to the right function accordingly.
function getRemoteFileReadStream(hostname, path) {
  packageUtil.trace('In getRemoteFileReadStream', hostname, path);

  const proxyConfig = getProxyConfig(hostname);

  if (proxyConfig.useProxy) {
    return getFileReadStreamByProxy(hostname, path, proxyConfig.hostname, proxyConfig.port);
  } else {
    return getFileReadStreamBase(hostname, path);
  }
}

// getFileReadStreamByProxy connects to a proxy server before calling getFileReadStreamBase
// to retrieve a remote file read stream.
function getFileReadStreamByProxy(hostname, path, proxyHostname, proxyPort) {
  return new Promise((resolve, reject) => {
    packageUtil.trace('In getFileReadStreamByProxy', hostname, path, proxyHostname, proxyPort);

    // Open a proxy tunnel
    const req = http.request({
      host: proxyHostname,
      port: proxyPort,
      method: 'CONNECT',
      path: hostname + ':' + PORT,
      headers: {
        'host': hostname + ':' + PORT,
      }
    });

    req.on('error', reject);

    // When this ends, the transfer will be complete
    req.end();

    req.on('connect', function(res, socket) {
      if (res.statusCode >= 300 && res.statusCode < 400) {  // warning: proxy redirection code is untested
        const redirectUrl = url.parse(res.headers.location);

        proxyHostname = redirectUrl.hostname;
        proxyPort  = redirectUrl.port;

        return getFileReadStreamByProxy(hostname, path, proxyHostname, proxyPort);
      } else if (res.statusCode !== 200) {
        reject(new Error('Error: HTTP proxy request for ' + hostname + path + ' failed with code ' + res.statusCode));
        return;
      } else {
        getFileReadStreamBase(hostname, path, socket)
          .then(fileReadStream => {
            resolve(fileReadStream);
          })
          .catch(reject);
      }
    });
  });
}

// The getFileReadStreamBase function is the main function that retrieves a remote
// file read stream.
function getFileReadStreamBase(hostname, path, socket) {
  return new Promise((resolve, reject) => {
    packageUtil.trace('In getFileReadStreamBase', hostname, path);

    let settled = false;

    const req = https.get(
      {
        host: hostname,
        path: path,
        socket: socket
      },
      function(res) {
        packageUtil.trace('HTTP statusCode =', res.statusCode);

        if (res.statusCode >= 300 && res.statusCode < 400) {
          const redirectUrl = url.parse(res.headers.location);
          const newHostname = redirectUrl.hostname;
          const newPath = redirectUrl.pathname + redirectUrl.search;

          getRemoteFileReadStream(newHostname, newPath)
            .then(res => {
              if (!settled) {
                resolve(res);
                settled = true;
              }
            })
            .catch(err => {
              if (!settled) {
                reject(err);
                settled = true;
              }
            });
        } else if (res.statusCode !== 200) {
          if (!settled) {
            reject(new Error('Error: HTTPS request for https://' + hostname + path + ' failed with code ' + res.statusCode));
            settled = true;
          }
        } else {
          if (!settled) {
            resolve(res);
            settled = true;
          }
        }
      }
    );

    req.on('error', err => {
      if (!settled) {
        reject(err);
        settled = true;
      }
    });
  });
}

// installBinary creates the directories for the binary, downloads the custom
// file, and then extracts the license and the binary.
function installBinary() {
  return new Promise((resolve, reject) => {
    packageUtil.trace('In installBinary');

    // Directories to be created for the binary
    const dirs = [
      'build',
      'build/Release'
    ];

    // Create relative binary directory
    try {
      dirs.forEach(function(p) {
        if (!fs.existsSync(p)) {
          fs.mkdirSync(p);
          fs.chmodSync(p, '0755');
        }
      });
    } catch(err) {
      if (err) {
        reject(err);
        return;
      }
    }

    // Get the binary
    getRemoteFileReadStream(PACKAGE_HOSTNAME, PACKAGE_PATH_REMOTE)
      .then(compressedReadstream => {
        return packageUtil.extract({
          licenseDest: packageUtil.LICENSE_PATH_LOCAL,
          writeLicense: true,
          binaryDest: packageUtil.BINARY_PATH_LOCAL,
          compressedReadstream: compressedReadstream
        });
      })
      .then(() => {
        fs.chmodSync(packageUtil.BINARY_PATH_LOCAL, '0755');

        resolve();
      })
      .catch(err => {
        reject(err);
      });
  });
}

// The done function is used to print concluding messages and quit.
function done(err, alreadyInstalled) {
  const installUrl = 'https://oracle.github.io/node-oracledb/INSTALL.html';

  if (err) {
    packageUtil.error('NJS-054: Binary build/Release/oracledb.node was not installed.');
    if (['darwin', 'win32', 'linux'].indexOf(process.platform) < 0) {
      packageUtil.error('Pre-built binary packages are not available for platform="' + process.platform + '"');
    } else if (process.arch !== 'x64') {
      packageUtil.error('Pre-built binary packages are not available for architecture="' + process.arch + '"');
    } else if (['48', '57', '64'].indexOf(process.versions.modules) < 0) {
      packageUtil.error('Pre-built binary packages are not available for this version of Node.js (NODE_MODULE_VERSION="' + process.versions.modules + '")');
    }
    packageUtil.error('Failed to install binary package ' + packageUtil.dynamicProps.PACKAGE_FILE_NAME);
    packageUtil.error(err.message);
    packageUtil.error('For help see ' + installUrl + '#troubleshooting\n');
    process.exit(87);
  } else {
    let arch;
    let clientUrl;

    if (process.arch === 'x64') {
      arch = '64-bit';
    } else {
      arch = '32-bit';
    }

    packageUtil.log('');
    packageUtil.log('********************************************************************************');

    if (alreadyInstalled) {
      packageUtil.log('** Node-oracledb ' + packageUtil.dynamicProps.PACKAGE_JSON_VERSION + ' was already installed for Node.js '  + process.versions.node + ' (' + process.platform + ', ' + process.arch +')');
    } else {
      packageUtil.log('** Node-oracledb ' + packageUtil.dynamicProps.PACKAGE_JSON_VERSION + ' installation complete for Node.js ' + process.versions.node + ' (' + process.platform + ', ' + process.arch +')');
    }

    packageUtil.log('**');
    packageUtil.log('** To use the installed node-oracledb:');

    if (process.platform === 'linux') {
      if (process.arch === 'x64') {
        clientUrl = 'http://www.oracle.com/technetwork/topics/linuxx86-64soft-092277.html';
      } else {
        clientUrl = 'http://www.oracle.com/technetwork/topics/linuxsoft-082809.html';
      }

      packageUtil.log('** - You must have ' + arch + ' Oracle client libraries in LD_LIBRARY_PATH, or configured with ldconfig');
      packageUtil.log('** - If you do not already have libraries, install the Instant Client Basic or Basic Light package from ');
      packageUtil.log('**   ' + clientUrl);
    } else if (process.platform === 'darwin') {
      clientUrl = 'http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html';

      packageUtil.log('** - You need to have the Oracle Instant Client Basic or Basic Light package in ~/lib or /usr/local/lib');
      packageUtil.log('**   Download from ' + clientUrl);
    } else if (process.platform === 'win32') {
      if (process.arch === 'x64') {
        clientUrl = 'http://www.oracle.com/technetwork/topics/winx64soft-089540.html';
      } else {
        clientUrl = 'http://www.oracle.com/technetwork/topics/winsoft-085727.html';
      }

      packageUtil.log('** - You must have ' + arch + ' Oracle client libraries in your PATH environment variable');
      packageUtil.log('** - If you do not already have libraries, install the Instant Client Basic or Basic Light package from');
      packageUtil.log('**   ' + clientUrl);
      packageUtil.log('** - A Microsoft Visual Studio Redistributable suitable for your Oracle client library version must be available');
      packageUtil.log('**   Check ' + installUrl + ' for details');
    } else {
      clientUrl = 'http://www.oracle.com/technetwork/database/database-technologies/instant-client/overview/index.html';

      packageUtil.log('** - You must have ' + arch + ' Oracle client libraries in your operating system library search path');
      packageUtil.log('** - If you do not already have libraries, install an Instant Client Basic or Basic Light package from: ');
      packageUtil.log('**   ' + clientUrl);
    }

    packageUtil.log('**');
    packageUtil.log('** Node-oracledb installation instructions: ' + installUrl);
    packageUtil.log('********************************************************************************\n');
  }
}

// The install function is the main function that installs the binary.
function install() {
  packageUtil.trace('In install');

  const nodeMajorVersion = Number(process.version.split('.')[0].replace(/^v/, ''));

  if (!nodeMajorVersion >= 4) {
    done(new Error('Node.js v4.0.0 or higher is required to install from binary'));
    return;
  }

  packageUtil.log('Beginning installation');

  verifyBinary()  // check if download is necessary for 'npm rebuild'
    .then((valid) => {
      if (valid) {
        done(null, true);
      } else {
        packageUtil.log('Continuing installation');

        return new Promise((resolve, reject) => {
          installBinary()
            .then(() => {
              packageUtil.log('Oracledb downloaded');

              return verifyBinary();
            })
            .then(valid => {
              if (valid) {
                done(null, false);
                resolve();
              } else {
                reject(new Error('Verification failed'));
              }
            })
            .catch(reject);
        });
      }
    })
    .catch(err => {
      done(err, false);
    });
}

install();
