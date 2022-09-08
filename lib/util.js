// Copyright (c) 2016, 2022, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const util = require('util');

// node-oracledb version number
let packageJSON;
try {
  packageJSON = require('../package.json');
} catch (err) {
  throw new Error('package.json is missing');
}
const PACKAGE_JSON_VERSION = packageJSON.version;
module.exports.PACKAGE_JSON_VERSION = PACKAGE_JSON_VERSION;

// Directory containing the node-oracledb add-on binary
const RELEASE_DIR = 'build/Release';
module.exports.RELEASE_DIR = RELEASE_DIR;

// The default node-oracledb add-on binary filename for this Node.js
const BINARY_FILE = 'oracledb-' + PACKAGE_JSON_VERSION + '-' + process.platform + '-' + process.arch + '.node';
module.exports.BINARY_FILE = BINARY_FILE;

// Staging directory used by maintainers building the npm package
const STAGING_DIR = 'package/Staging';
module.exports.STAGING_DIR = STAGING_DIR;

// errorMessages is for NJS error messages used in the JavaScript layer
const errorMessages = {
  'NJS-002': 'NJS-002: invalid pool',
  'NJS-004': 'NJS-004: invalid value for property %s',
  'NJS-005': 'NJS-005: invalid value for parameter %d',
  'NJS-009': 'NJS-009: invalid number of parameters',
  'NJS-017': 'NJS-017: concurrent operations on ResultSet are not allowed',
  'NJS-023': 'NJS-023: concurrent operations on LOB are not allowed',
  'NJS-037': 'NJS-037: incompatible type of value provided',
  'NJS-040': 'NJS-040: connection request timeout. Request exceeded queueTimeout of %d',
  'NJS-041': 'NJS-041: cannot convert ResultSet to QueryStream after invoking methods',
  'NJS-042': 'NJS-042: cannot invoke ResultSet methods after converting to QueryStream',
  'NJS-043': 'NJS-043: ResultSet already converted to QueryStream',
  'NJS-045': 'NJS-045: cannot load a node-oracledb binary for Node.js ' + process.versions.node + ' (' + process.platform + ' ' + process.arch + ') %s',
  'NJS-046': 'NJS-046: poolAlias "%s" already exists in the connection pool cache',
  'NJS-047': 'NJS-047: poolAlias "%s" not found in the connection pool cache',
  'NJS-064': 'NJS-064: connection pool is closing',
  'NJS-065': 'NJS-065: connection pool was closed',
  'NJS-067': 'NJS-067: a pre-built node-oracledb binary was not found for %s',
  'NJS-069': 'NJS-069: node-oracledb %s requires Node.js %s or later',
  'NJS-076': 'NJS-076: connection request rejected. Pool queue length queueMax %d reached',
  'NJS-081': 'NJS-081: concurrent operations on a connection are disabled',
  'NJS-082': 'NJS-082: connection pool is being reconfigured',
  'NJS-083': 'NJS-083: pool statistics not enabled',
  'NJS-084': 'NJS-084: invalid access token',
  'NJS-085': 'NJS-085: invalid connection pool configuration with token based authentication. The homogeneous and externalAuth attributes must be set to true',
  'NJS-086': 'NJS-086: invalid standalone configuration with token based authentication. The externalAuth attribute must be set to true',
  'NJS-087': 'NJS-087: access token has expired',
  'NJS-088': 'NJS-088: accessTokenCallback cannot be specified when accessToken is a function'
};

// getInstallURL returns a string with installation URL
function getInstallURL() {
  return ('Node-oracledb installation instructions: https://oracle.github.io/node-oracledb/INSTALL.html');
}

module.exports.getInstallURL = getInstallURL;

// getInstallHelp returns a string with installation usage tips that may be helpful
function getInstallHelp() {
  let arch, url;
  let mesg = getInstallURL() + '\n';
  if (process.platform === 'linux') {
    if (process.arch === 'x64') {
      url = 'https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html\n';
      arch = '64-bit';
    } else if (process.arch === 'x32') {
      url = 'https://www.oracle.com/database/technologies/instant-client/linux-x86-32-downloads.html\n';
      arch = '32-bit';
    } else {
      url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
      arch = process.arch;
    }
    mesg += 'You must have ' + arch + ' Oracle Client libraries configured with ldconfig, or in LD_LIBRARY_PATH.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install the Instant Client Basic or Basic Light package from \n';
    mesg += url;
  } else if (process.platform === 'darwin') {
    if (process.arch === 'x64') {
      url = 'https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html\n';
      arch = '64-bit';
    } else {
      url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
      arch = process.arch;
    }
    mesg += 'You must have the ' + arch + ' Oracle Instant Client Basic or Basic Light package libraries in\n';
    mesg += '/usr/local/lib or set by calling oracledb.initOracleClient({libDir: "/my/instant_client_directory"}).\n';
    mesg += 'Oracle Instant Client can be downloaded from ' + url;
  } else if (process.platform === 'win32') {
    if (process.arch === 'x64') {
      url = 'https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html\n';
      arch = '64-bit';
    } else if (process.arch === 'x32') {
      url = 'https://www.oracle.com/database/technologies/instant-client/microsoft-windows-32-downloads.html\n';
      arch = '32-bit';
    } else {
      url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
      arch = process.arch;
    }
    mesg += 'You must have ' + arch + ' Oracle Client libraries in your PATH environment variable.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install the Instant Client Basic or Basic Light package from\n';
    mesg += url;
    mesg += 'A Microsoft Visual Studio Redistributable suitable for your Oracle client library version must be available.\n';
  } else {
    url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
    mesg += 'You must have ' + process.arch + ' Oracle Client libraries in your operating system library search path.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install an Instant Client Basic or Basic Light package from: \n';
    mesg += url;
  }
  return mesg;
}

module.exports.getInstallHelp = getInstallHelp;

// getErrorMessage is used to get and format error messages to make throwing
// errors a little more convenient.
function getErrorMessage(errorCode) {
  let args = Array.prototype.slice.call(arguments);
  args[0] = errorMessages[errorCode];
  return util.format.apply(util, args);
}

module.exports.getErrorMessage = getErrorMessage;

// assert is typically used at the beginning of public functions to assert
// preconditions for the function to execute. Most commonly it is used to
// validate the number of arguments and their types and throw an error if they
// don't match what is expected.
function assert(condition, errorCode, messageArg1) {
  if (!condition) {
    throw new Error(getErrorMessage(errorCode, messageArg1));
  }
}

module.exports.assert = assert;

// checkArgCount is used to validate the number of arguments, particularly with
// optional parameters (range of number of parameters).  If the number of
// arguments is not within the given range, an error is thrown.
function checkArgCount(args, minArgCount, maxArgCount) {
  if (args.length < minArgCount || args.length > maxArgCount)
    throw new Error(getErrorMessage('NJS-009'));
}

module.exports.checkArgCount = checkArgCount;


// The callbackify function is used to wrap async methods to add optional
// callback support. If the last parameter passed to a method is a function,
// then it is assumed that the callback pattern is being used and the promise
// is resolved or rejected and the callback invoked; otherwise, the function is
// called unchanged and a promise is returned
function callbackify(func) {
  const wrapper = function() {

    // if last argument is not a function, simply invoke the function as usual
    // and a promise will be returned
    if (typeof arguments[arguments.length - 1] !== 'function') {
      return func.apply(this, arguments).catch(function stackCapture(e) {
        Error.captureStackTrace(e, stackCapture);
        throw e;
      });
    }

    // otherwise, resolve or reject the promise and invoke the callback
    const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
    const cb = arguments[arguments.length - 1];
    func.apply(this, args).then(function(result) {
      cb(null, result);
    }, cb);

  };
  if (func.name) {
    Object.defineProperty(wrapper, 'name', { value: func.name });
  }
  return wrapper;
}

module.exports.callbackify = callbackify;

// The serialize function is used to wrap methods to ensure that the connection
// is not used concurrently by multiple threads
function serialize(func) {
  return async function() {

    // determine the connection associated with the object
    const connection = this._getConnection();

    // acquire the "lock"; this simply checks to see if another operation is in
    // progress, and if so, waits for it to complete
    await connection._acquireLock();

    // call the function and ensure that the lock is "released" once the
    // function has completed -- either successfully or in failure
    try {
      return await func.apply(this, arguments);
    } finally {
      connection._releaseLock();
    }
  };
}

module.exports.serialize = serialize;

function preventConcurrent(func, errorCode) {
  return async function() {
    if (this._isActive)
      throw new Error(getErrorMessage(errorCode));
    this._isActive = true;
    try {
      return await func.apply(this, arguments);
    } finally {
      this._isActive = false;
    }
  };
}

module.exports.preventConcurrent = preventConcurrent;

function isObject(value) {
  return value !== null && typeof value === 'object';
}

module.exports.isObject = isObject;

function isObjectOrArray(value) {
  return (value !== null && typeof value === 'object') || Array.isArray(value);
}

module.exports.isObjectOrArray = isObjectOrArray;

function isSodaDocument(value) {
  return (value != null && value._sodaDocumentMarker);
}

function isXid(value) {
  return (isObject(value) &&
            (value.formatId !== undefined) &&
            (value.globalTransactionId !== undefined) &&
            (value.branchQualifier !== undefined));
}

module.exports.isXid = isXid;

module.exports.isSodaDocument = isSodaDocument;
