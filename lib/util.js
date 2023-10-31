// Copyright (c) 2016, 2023, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Buffer } = require('buffer');
const errors = require('./errors.js');
const process = require('process');
const util = require('util');
const types = require('./types.js');

// node-oracledb version number
let packageJSON;
try {
  packageJSON = require('../package.json');
} catch (err) {
  errors.throwErr(errors.ERR_MISSING_FILE, 'package.json');
}
const PACKAGE_JSON_VERSION = packageJSON.version;

// Directory containing the node-oracledb add-on binary
const RELEASE_DIR = 'build/Release';

// The default node-oracledb add-on binary filename for this Node.js
const BINARY_FILE = 'oracledb-' + PACKAGE_JSON_VERSION + '-' + process.platform + '-' + process.arch + '.node';

// The node-oracledb binary filename when it is built from source
const BUILD_FILE = 'oracledb.node';

// Staging directory used by maintainers building the npm package
const STAGING_DIR = 'package/Staging';

// getInstallURL returns a string with installation URL
function getInstallURL() {
  return ('Node-oracledb installation instructions: https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html');
}


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
    mesg += 'You must have Linux ' + arch + ' Oracle Client libraries configured with ldconfig, or in LD_LIBRARY_PATH.\n';
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
    mesg += 'You must have macOS ' + arch + ' Oracle Instant Client Basic or Basic Light package libraries in\n';
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
    mesg += 'You must have Windows ' + arch + ' Oracle Client libraries in your PATH environment variable.\n';
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
      return func.apply(this, arguments).catch(function stackCapture(err) {
        throw errors.transformErr(err, stackCapture);
      });
    }

    // otherwise, resolve or reject the promise and invoke the callback
    const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
    const cb = arguments[arguments.length - 1];
    func.apply(this, args).then(function(result) {
      cb(null, result);
    }, function stackCapture(err) {
      cb(errors.transformErr(err, stackCapture));
    });
  };
  if (func.name) {
    Object.defineProperty(wrapper, 'name', { value: func.name });
  }
  return wrapper;
}

// The serialize function is used to wrap methods to ensure that the connection
// is not used concurrently by multiple threads
function serialize(func) {
  return async function() {

    let connImpl;

    // determine the connection implementation associated with the object, if
    // one currently exists and acquire the "lock"; this simply checks to see
    // if another operation is in progress, and if so, waits for it to complete
    if (this._impl) {
      connImpl = this._impl._getConnImpl();
      await connImpl._acquireLock();
    }

    // call the function and ensure that the lock is "released" once the
    // function has completed -- either successfully or in failure -- but only
    // if a connection implementation is currently associated with this object
    try {
      return await func.apply(this, arguments);
    } finally {
      if (connImpl)
        connImpl._releaseLock();
    }
  };
}

function preventConcurrent(func, errorCode) {
  return async function() {
    if (this._isActive)
      errors.throwErr(errorCode);
    this._isActive = true;
    try {
      return await func.apply(this, arguments);
    } finally {
      this._isActive = false;
    }
  };
}

// The wrapFns() function is used to wrap the named methods on the prototype
// in multiple ways (serialize, preventConcurrent and callbackify); the
// arguments following the formal arguments contain the names of methods to
// wrap on the prototype; if the first extra argument is an error code, it is
// used to wrap to prevent concurrent access
function wrapFns(proto) {
  let nameIndex = 1;
  let preventConcurrentErrorCode;
  if (typeof arguments[1] === 'number') {
    nameIndex = 2;
    preventConcurrentErrorCode = arguments[1];
  }
  for (let i = nameIndex; i < arguments.length; i++) {
    const name = arguments[i];
    const f = proto[name];
    if (preventConcurrentErrorCode) {
      proto[name] = callbackify(preventConcurrent(serialize(f),
        preventConcurrentErrorCode));
    } else
      proto[name] = callbackify(serialize(f));
  }
}

function isArrayOfStrings(value) {
  if (!Array.isArray(value))
    return false;
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string')
      return false;
  }
  return true;
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function isObjectOrArray(value) {
  return (value !== null && typeof value === 'object') || Array.isArray(value);
}

function isShardingKey(value) {
  if (!Array.isArray(value))
    return false;
  for (let i = 0; i < value.length; i++) {
    const element = value[i];
    const ok = typeof element === 'string' ||
      typeof element === 'number' || Buffer.isBuffer(element) ||
      util.isDate(element);
    if (!ok)
      return false;
  }
  return true;
}

function isSodaDocument(value) {
  return (value != null && value._sodaDocumentMarker);
}

function isXid(value) {
  return (isObject(value) && Number.isInteger(value.formatId) &&
    (Buffer.isBuffer(value.globalTransactionId) ||
      typeof value.globalTransactionId === 'string') &&
    (Buffer.isBuffer(value.branchQualifier) ||
      typeof value.branchQualifier === 'string'));
}

function verifySodaDoc(content) {
  if (isSodaDocument(content))
    return content._impl;
  errors.assertParamValue(isObject(content), 1);
  return Buffer.from(JSON.stringify(content));
}

function isTokenExpired(token) {
  errors.assert(typeof token === 'string', errors.ERR_TOKEN_BASED_AUTH);
  if (token.split('.')[1] === undefined) {
    errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
  }

  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const buff = Buffer.from(base64, 'base64');
  const payloadInit = buff.toString('ascii');

  let expiry = JSON.parse(payloadInit).exp;
  errors.assert(expiry != undefined, errors.ERR_TOKEN_BASED_AUTH);
  expiry = expiry * 1000;

  return (new Date().getTime() > expiry);
}

function isTokenValid(accessToken) {
  switch (typeof accessToken) {
    case 'string':
      if (accessToken === '') {
        errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
      }

      return !isTokenExpired(accessToken);
    case 'object':
      if (accessToken.token === undefined ||
          accessToken.token === '' ||
          accessToken.privateKey === undefined ||
          accessToken.privateKey === '') {
        errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
      }

      return !isTokenExpired(accessToken.token);
    default:
      errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
  }
}

function denormalizePrivateKey(privateKey) {
  privateKey = privateKey.replace(/\n/g, '');
  privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '');
  privateKey = privateKey.replace('-----END PRIVATE KEY-----', '');
  return privateKey;
}

//-----------------------------------------------------------------------------
// addTypeProperties()
//
// Adds derived properties about the type as a convenience to the user.
// Currently this is only the name of type, which is either the name of the
// database object type (if the value refers to a database object) or the name
// of the Oracle database type.
// -----------------------------------------------------------------------------
function addTypeProperties(obj, attrName) {
  const clsAttrName = attrName + "Class";
  const nameAttrName = attrName + "Name";
  const cls = obj[clsAttrName];
  let dbType = obj[attrName];
  if (typeof dbType === 'number') {
    dbType = obj[attrName] = types.getTypeByNum(dbType);
  }
  if (cls) {
    obj[nameAttrName] = cls.prototype.fqn;
  } else if (dbType) {
    obj[nameAttrName] = dbType.columnTypeName;
  }
}

// define exports
module.exports = {
  BINARY_FILE,
  BUILD_FILE,
  PACKAGE_JSON_VERSION,
  RELEASE_DIR,
  STAGING_DIR,
  addTypeProperties,
  callbackify,
  denormalizePrivateKey,
  getInstallURL,
  getInstallHelp,
  isArrayOfStrings,
  isObject,
  isObjectOrArray,
  isShardingKey,
  isSodaDocument,
  isTokenExpired,
  isTokenValid,
  isXid,
  preventConcurrent,
  serialize,
  verifySodaDoc,
  wrapFns
};
