// Copyright (c) 2022, Oracle and/or its affiliates.

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

const util = require('util');

// define error prefix for all messages
const ERR_PREFIX = "NJS";

// define error number constants (used in JavaScript library)
const ERR_MISSING_CALLBACK = 1;
const ERR_INVALID_POOL = 2;
const ERR_INVALID_CONNECTION = 3;
const ERR_INVALID_PROPERTY_VALUE = 4;
const ERR_INVALID_PARAMETER_VALUE = 5;
const ERR_INVALID_PROPERTY_VALUE_IN_PARAM = 7;
const ERR_INVALID_NUMBER_OF_PARAMETERS = 9;
const ERR_UNSUPPORTED_DATA_TYPE = 10;
const ERR_BIND_VALUE_AND_TYPE_MISMATCH = 11;
const ERR_INVALID_BIND_DATA_TYPE = 12;
const ERR_INVALID_BIND_DIRECTION = 13;
const ERR_NO_TYPE_FOR_CONVERSION = 15;
const ERR_INSUFFICIENT_BUFFER_FOR_BINDS = 16;
const ERR_BUSY_RS = 17;
const ERR_INVALID_RS = 18;
const ERR_NOT_A_QUERY = 19;
const ERR_INVALID_TYPE_FOR_CONVERSION = 21;
const ERR_INVALID_LOB = 22;
const ERR_BUSY_LOB = 23;
const ERR_INSUFFICIENT_MEMORY = 24;
const ERR_INVALID_TYPE_FOR_ARRAY_BIND = 34;
const ERR_REQUIRED_MAX_ARRAY_SIZE = 35;
const ERR_INVALID_ARRAY_SIZE = 36;
const ERR_INCOMPATIBLE_TYPE_ARRAY_BIND = 37;
const ERR_CONN_REQUEST_TIMEOUT = 40;
const ERR_CANNOT_CONVERT_RS_TO_STREAM = 41;
const ERR_CANNOT_INVOKE_RS_METHODS = 42;
const ERR_RS_ALREADY_CONVERTED = 43;
const ERR_INVALID_BIND_UNIT = 44;
const ERR_CANNOT_LOAD_BINARY = 45;
const ERR_POOL_WITH_ALIAS_ALREADY_EXISTS = 46;
const ERR_POOL_WITH_ALIAS_NOT_FOUND = 47;
const ERR_INCOMPATIBLE_TYPE_ARRAY_INDEX_BIND = 52;
const ERR_NON_ARRAY_PROVIDED = 53;
const ERR_MIXED_BIND = 55;
const ERR_MISSING_MAX_SIZE_BY_POS = 56;
const ERR_MISSING_MAX_SIZE_BY_NAME = 57;
const ERR_MAX_SIZE_TOO_SMALL = 58;
const ERR_MISSING_TYPE_BY_POS = 59;
const ERR_MISSING_TYPE_BY_NAME = 60;
const ERR_INVALID_SUBSCR = 61;
const ERR_MISSING_SUBSCR_CALLBACK = 62;
const ERR_MISSING_SUBSCR_SQL = 63;
const ERR_POOL_CLOSING = 64;
const ERR_POOL_CLOSED = 65;
const ERR_INVALID_SODA_DOC_CURSOR = 66;
const ERR_NO_BINARY_AVAILABLE = 67;
const ERR_INVALID_ERR_NUM = 68;
const ERR_NODE_TOO_OLD = 69;
const ERR_INVALID_AQ_MESSAGE = 70;
const ERR_CONVERT_FROM_OBJ_ELEMENT = 71;
const ERR_CONVERT_FROM_OBJ_ATTR = 72;
const ERR_CONVERT_TO_OBJ_ELEMENT = 73;
const ERR_CONVERT_TO_OBJ_ATTR = 74;
const ERR_DBL_CONNECT_STRING = 75;
const ERR_QUEUE_MAX_EXCEEDED = 76;
const ERR_CLIENT_LIB_ALREADY_INITIALIZED = 77;
const ERR_UNSUPPORTED_DATA_TYPE_IN_JSON = 78;
const ERR_CONVERT_TO_JSON_VALUE = 79;
const ERR_DBL_USER = 80;
const ERR_CONCURRENT_OPS = 81;
const ERR_POOL_RECONFIGURING = 82;
const ERR_POOL_STATISTICS_DISABLED = 83;
const ERR_TOKEN_BASED_AUTH = 84;
const ERR_POOL_TOKEN_BASED_AUTH = 85;
const ERR_CONN_TOKEN_BASED_AUTH = 86;
const ERR_TOKEN_HAS_EXPIRED = 87;
const ERR_TOKEN_CALLBACK_DUP = 88;
const ERR_NOT_IMPLEMENTED = 89;
const ERR_INIT_ORACLE_CLIENT_ARGS = 90;
const ERR_MISSING_FILE = 91;
const ERR_INVALID_NUMBER_OF_CONNECTIONS = 92;
const ERR_EXEC_MODE_ONLY_FOR_DML = 95;
const ERR_POOL_HAS_BUSY_CONNECTIONS = 104;

// define mapping for ODPI-C errors that need to be wrapped with NJS errors
const adjustErrorXref = new Map();
adjustErrorXref.set("DPI-1063", ERR_EXEC_MODE_ONLY_FOR_DML);
adjustErrorXref.set("ORA-24422", ERR_POOL_HAS_BUSY_CONNECTIONS);

// define mapping for error messages
const messages = new Map();
messages.set(ERR_INVALID_CONNECTION,
  'invalid connection');
messages.set(ERR_INVALID_POOL,
  'invalid pool');
messages.set(ERR_INVALID_PROPERTY_VALUE,
  'invalid value for property %s');
messages.set(ERR_MISSING_CALLBACK,
  'expected callback as last parameter');
messages.set(ERR_INVALID_PARAMETER_VALUE,
  'invalid value for parameter %d');
messages.set(ERR_INVALID_PROPERTY_VALUE_IN_PARAM,
  'invalid value for "%s" in parameter %d');
messages.set(ERR_INVALID_NUMBER_OF_PARAMETERS,
  'invalid number of parameters');
// used in C -- keep synchronized!
messages.set(ERR_UNSUPPORTED_DATA_TYPE,
  'unsupported data type %d in column %d');
messages.set(ERR_BIND_VALUE_AND_TYPE_MISMATCH,
  'encountered bind value and type mismatch');
messages.set(ERR_INVALID_BIND_DATA_TYPE,
  'encountered invalid bind data type in parameter %d');
messages.set(ERR_INVALID_BIND_DIRECTION,
  'invalid bind direction');
messages.set(ERR_NO_TYPE_FOR_CONVERSION,
  'type was not specified for conversion');
// used in C -- keep synchronized!
messages.set(ERR_INSUFFICIENT_BUFFER_FOR_BINDS,
  'buffer is too small for OUT binds');
messages.set(ERR_BUSY_RS,
  'concurrent operations on ResultSet are not allowed');
messages.set(ERR_INVALID_RS,
  'invalid ResultSet');
messages.set(ERR_NOT_A_QUERY,
  'ResultSet cannot be returned for non-query statements');
messages.set(ERR_INVALID_TYPE_FOR_CONVERSION,
  'invalid type for conversion specified');
messages.set(ERR_INVALID_LOB,
  'invalid Lob');
messages.set(ERR_BUSY_LOB,
  'concurrent operations on LOB are not allowed');
// used in C -- keep synchronized!
messages.set(ERR_INSUFFICIENT_MEMORY,
  'memory allocation failed');
messages.set(ERR_INVALID_TYPE_FOR_ARRAY_BIND,
  'data type is unsupported for array bind');
messages.set(ERR_REQUIRED_MAX_ARRAY_SIZE,
  'maxArraySize is required for IN OUT array bind');
messages.set(ERR_INVALID_ARRAY_SIZE,
  'given array is of size greater than maxArraySize');
messages.set(ERR_INCOMPATIBLE_TYPE_ARRAY_BIND,
  'invalid data type at array index %d for bind ":%s"');
messages.set(ERR_CONN_REQUEST_TIMEOUT,
  'connection request timeout. Request exceeded queueTimeout of %d');
messages.set(ERR_CANNOT_CONVERT_RS_TO_STREAM,
  'cannot convert ResultSet to QueryStream after invoking methods');
messages.set(ERR_CANNOT_INVOKE_RS_METHODS,
  'cannot invoke ResultSet methods after converting to QueryStream');
messages.set(ERR_RS_ALREADY_CONVERTED,
  'ResultSet already converted to QueryStream');
messages.set(ERR_INVALID_BIND_UNIT,
  'bind object must contain one of the following keys: ' +
  '"dir", "type", "maxSize", or "val"');
messages.set(ERR_CANNOT_LOAD_BINARY,
  'cannot load a node-oracledb Thick mode binary for Node.js %s');
messages.set(ERR_POOL_WITH_ALIAS_ALREADY_EXISTS,
  'pool alias "%s" already exists in the connection pool cache');
messages.set(ERR_POOL_WITH_ALIAS_NOT_FOUND,
  'pool alias "%s" not found in connection pool cache');
messages.set(ERR_INCOMPATIBLE_TYPE_ARRAY_INDEX_BIND,
  'invalid data type at array index %d for bind position %d');
messages.set(ERR_NON_ARRAY_PROVIDED,
  'an array value was expected');
messages.set(ERR_MIXED_BIND,
  'binding by position and name cannot be mixed');
messages.set(ERR_MISSING_MAX_SIZE_BY_POS,
  'maxSize must be specified and not zero for bind position %d');
messages.set(ERR_MISSING_MAX_SIZE_BY_NAME,
  'maxSize must be specified and not zero for bind "%s"');
messages.set(ERR_MAX_SIZE_TOO_SMALL,
  'maxSize of %d is too small for value of length %d in row %d');
messages.set(ERR_MISSING_TYPE_BY_POS,
  'type must be specified for bind position %d');
messages.set(ERR_MISSING_TYPE_BY_NAME,
  'type must be specified for bind "%s"');
messages.set(ERR_INVALID_SUBSCR,
  'invalid subscription');
messages.set(ERR_MISSING_SUBSCR_CALLBACK,
  'subscription notification callback missing');
messages.set(ERR_MISSING_SUBSCR_SQL,
  'subscription notification SQL missing');
messages.set(ERR_POOL_CLOSING,
  'connection pool is closing');
messages.set(ERR_POOL_CLOSED,
  'connection pool was closed');
messages.set(ERR_INVALID_SODA_DOC_CURSOR,
  'invalid SODA document cursor');
messages.set(ERR_NO_BINARY_AVAILABLE,
  'a pre-built node-oracledb Thick mode binary was not found for %s');
messages.set(ERR_INVALID_ERR_NUM,
  'invalid error number %d supplied');
messages.set(ERR_NODE_TOO_OLD,
  'node-oracledb %s requires Node.js %s or later');
messages.set(ERR_INVALID_AQ_MESSAGE,
  'message must be a string, buffer, database object or an object ' +
  'containing a payload property which itself is a string, buffer or ' +
  'database object');
messages.set(ERR_CONVERT_FROM_OBJ_ELEMENT,
  'cannot convert from element of type "%s" to JavaScript value');
messages.set(ERR_CONVERT_FROM_OBJ_ATTR,
  'cannot convert from attribute "%s" of type "%s" to JavaScript value');
messages.set(ERR_CONVERT_TO_OBJ_ELEMENT,
  'cannot convert from JavaScript value to element of type %s');
messages.set(ERR_CONVERT_TO_OBJ_ATTR,
  'cannot convert from JavaScript value to attribute "%s" of type "%s"');
messages.set(ERR_DBL_CONNECT_STRING,
  'only one of connectString and connectionString can be used');
messages.set(ERR_QUEUE_MAX_EXCEEDED,
  'connection request rejected. Pool queue length queueMax %d reached');
messages.set(ERR_CLIENT_LIB_ALREADY_INITIALIZED,
  'Oracle Client library has already been initialized');
// used in C -- keep synchronized!
messages.set(ERR_UNSUPPORTED_DATA_TYPE_IN_JSON,
  'unsupported data type %d in JSON value');
messages.set(ERR_CONVERT_TO_JSON_VALUE,
  'cannot convert from JavaScript value to JSON value');
messages.set(ERR_DBL_USER,
  'only one of user and username can be used');
messages.set(ERR_CONCURRENT_OPS,
  'concurrent operations on a connection are disabled');
messages.set(ERR_POOL_RECONFIGURING,
  'connection pool is being reconfigured');
messages.set(ERR_POOL_STATISTICS_DISABLED,
  'pool statistics not enabled');
messages.set(ERR_TOKEN_BASED_AUTH,
  'invalid access token');
messages.set(ERR_POOL_TOKEN_BASED_AUTH,
  'invalid connection pool configuration with token based authentication. ' +
  'The homogeneous and externalAuth attributes must be set to true');
messages.set(ERR_CONN_TOKEN_BASED_AUTH,
  'invalid standalone configuration with token based authentication. ' +
  'The externalAuth attribute must be set to true');
messages.set(ERR_TOKEN_HAS_EXPIRED,
  'access token has expired');
messages.set(ERR_TOKEN_CALLBACK_DUP,
  'accessTokenCallback cannot be specified when accessToken is a function');
messages.set(ERR_NOT_IMPLEMENTED,
  '%s is not implemented');
messages.set(ERR_INIT_ORACLE_CLIENT_ARGS,
  'initOracleClient() was already called with different arguments!');
messages.set(ERR_MISSING_FILE,
  'file %s is missing');
messages.set(ERR_INVALID_NUMBER_OF_CONNECTIONS,
  'poolMax [%d] must be greater than or equal to poolMin [%d]');
messages.set(ERR_EXEC_MODE_ONLY_FOR_DML,
  'setting batchErrors to true is only permitted with DML');
messages.set(ERR_POOL_HAS_BUSY_CONNECTIONS,
  'connection pool cannot be closed because connections are busy');

//-----------------------------------------------------------------------------
// assert()
//
// Checks the condition, and if the condition is not true, throws an exception
// using the specified error number and arguments.
//-----------------------------------------------------------------------------
function assert(condition) {
  if (!condition) {
    const args = Array.prototype.slice.call(arguments, 1);
    throwErr(...args);
  }
}

//-----------------------------------------------------------------------------
// assertArgCount()
//
// Asserts that the argument count falls between the minimum and maximum number
// of arguments.
//-----------------------------------------------------------------------------
function assertArgCount(args, minArgCount, maxArgCount) {
  assert(args.length >= minArgCount && args.length <= maxArgCount,
    ERR_INVALID_NUMBER_OF_PARAMETERS);
}

//-----------------------------------------------------------------------------
// assertParamPropBool()
//
// Asserts that the property value of a parmeter is a boolean value (or
// undefined).
//-----------------------------------------------------------------------------
function assertParamPropBool(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(typeof obj[propName] === 'boolean', parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropFunction()
//
// Asserts that the property value of a parmeter is a function (or undefined).
//-----------------------------------------------------------------------------
function assertParamPropFunction(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(typeof obj[propName] === 'function', parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropInt()
//
// Asserts that the property value of a parmeter is an integer value (or
// undefined).
//-----------------------------------------------------------------------------
function assertParamPropInt(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(Number.isInteger(obj[propName]), parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropUnsignedInt()
//
// Asserts that the property value of a parmeter is a positive integer value
// (or undefined).
//-----------------------------------------------------------------------------
function assertParamPropUnsignedInt(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(Number.isInteger(obj[propName]) && obj[propName] >= 0,
      parameterNum, propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropString()
//
// Asserts that the property value of a parmeter is a function (or undefined).
//-----------------------------------------------------------------------------
function assertParamPropString(obj, parameterNum, propName) {
  if (obj[propName] !== undefined) {
    assertParamPropValue(typeof obj[propName] === 'string', parameterNum,
      propName);
  }
}

//-----------------------------------------------------------------------------
// assertParamPropValue()
//
// Asserts that the property value of a parmeter passes the specified
// condition.
//-----------------------------------------------------------------------------
function assertParamPropValue(condition, parameterNum, propName) {
  assert(condition, ERR_INVALID_PROPERTY_VALUE_IN_PARAM, propName,
    parameterNum);
}

//-----------------------------------------------------------------------------
// assertParamValue()
//
// Asserts that the parmeter value passes the specified condition.
//-----------------------------------------------------------------------------
function assertParamValue(condition, parameterNum) {
  assert(condition, ERR_INVALID_PARAMETER_VALUE, parameterNum);
}

//-----------------------------------------------------------------------------
// assertPropValue()
//
// Asserts that the property value passes the specified condition.
//-----------------------------------------------------------------------------
function assertPropValue(condition, propName) {
  assert(condition, ERR_INVALID_PROPERTY_VALUE, propName);
}

//-----------------------------------------------------------------------------
// getErr()
//
// Returns an error object with the given error number after formatting it with
// the given arguments.
//-----------------------------------------------------------------------------
function getErr(errorNum) {
  let baseText = messages.get(errorNum);
  let args = [...arguments];
  if (!baseText) {
    args = [undefined, errorNum];
    errorNum = ERR_INVALID_ERR_NUM;
    baseText = messages.get(errorNum);
  }
  const errorNumStr = errorNum.toString().padStart(3, '0');
  args[0] = `${ERR_PREFIX}-${errorNumStr}: ${baseText}`;
  const err = new Error(util.format(...args));
  Error.captureStackTrace(err, getErr);
  return err;
}

//-----------------------------------------------------------------------------
// throwErr()
//
// Throws an error with the given error number after formatting it with the
// given arguments.
//-----------------------------------------------------------------------------
function throwErr() {
  throw (getErr(...arguments));
}

//-----------------------------------------------------------------------------
// throwNotImplemented()
//
// Throws an error with the given error number after formatting it with the
// given arguments.
//-----------------------------------------------------------------------------
function throwNotImplemented(feature) {
  throwErr(ERR_NOT_IMPLEMENTED, feature);
}

//-----------------------------------------------------------------------------
// transformErr()
//
// Adjusts the supplied error, if necessary, by looking for specific ODPI-C and
// Oracle errors and replacing them with driver specific errors.
//-----------------------------------------------------------------------------
function transformErr(err, fnOpt) {
  const pos = err.message.indexOf(":");
  if (pos > 0) {
    const full_code = err.message.substr(0, pos);
    if (adjustErrorXref.has(full_code)) {
      const newNum = adjustErrorXref.get(full_code);
      const newErr = getErr(newNum);
      err.message = newErr.message + "\n" + err.message;
    }
  }
  if (err.requiresStackCapture) {
    delete err.requiresStackCapture;
    Error.captureStackTrace(err, fnOpt);
  }
  return err;
}

// define exports
module.exports = {
  ERR_MISSING_CALLBACK,
  ERR_INVALID_POOL,
  ERR_INVALID_CONNECTION,
  ERR_INVALID_PROPERTY_VALUE,
  ERR_INVALID_PARAMETER_VALUE,
  ERR_INVALID_PROPERTY_VALUE_IN_PARAM,
  ERR_INVALID_NUMBER_OF_PARAMETERS,
  ERR_UNSUPPORTED_DATA_TYPE,
  ERR_BIND_VALUE_AND_TYPE_MISMATCH,
  ERR_INVALID_BIND_DATA_TYPE,
  ERR_INVALID_BIND_DIRECTION,
  ERR_NO_TYPE_FOR_CONVERSION,
  ERR_INSUFFICIENT_BUFFER_FOR_BINDS,
  ERR_BUSY_RS,
  ERR_INVALID_RS,
  ERR_NOT_A_QUERY,
  ERR_INVALID_TYPE_FOR_CONVERSION,
  ERR_INVALID_LOB,
  ERR_BUSY_LOB,
  ERR_INSUFFICIENT_MEMORY,
  ERR_INVALID_TYPE_FOR_ARRAY_BIND,
  ERR_REQUIRED_MAX_ARRAY_SIZE,
  ERR_INVALID_ARRAY_SIZE,
  ERR_INCOMPATIBLE_TYPE_ARRAY_BIND,
  ERR_CONN_REQUEST_TIMEOUT,
  ERR_CANNOT_CONVERT_RS_TO_STREAM,
  ERR_CANNOT_INVOKE_RS_METHODS,
  ERR_RS_ALREADY_CONVERTED,
  ERR_INVALID_BIND_UNIT,
  ERR_CANNOT_LOAD_BINARY,
  ERR_POOL_WITH_ALIAS_ALREADY_EXISTS,
  ERR_POOL_WITH_ALIAS_NOT_FOUND,
  ERR_INCOMPATIBLE_TYPE_ARRAY_INDEX_BIND,
  ERR_NON_ARRAY_PROVIDED,
  ERR_MIXED_BIND,
  ERR_MISSING_MAX_SIZE_BY_POS,
  ERR_MISSING_MAX_SIZE_BY_NAME,
  ERR_MAX_SIZE_TOO_SMALL,
  ERR_MISSING_TYPE_BY_POS,
  ERR_MISSING_TYPE_BY_NAME,
  ERR_INVALID_SUBSCR,
  ERR_MISSING_SUBSCR_CALLBACK,
  ERR_MISSING_SUBSCR_SQL,
  ERR_POOL_CLOSING,
  ERR_POOL_CLOSED,
  ERR_INVALID_SODA_DOC_CURSOR,
  ERR_NO_BINARY_AVAILABLE,
  ERR_INVALID_ERR_NUM,
  ERR_NODE_TOO_OLD,
  ERR_INVALID_AQ_MESSAGE,
  ERR_CONVERT_FROM_OBJ_ELEMENT,
  ERR_CONVERT_FROM_OBJ_ATTR,
  ERR_CONVERT_TO_OBJ_ELEMENT,
  ERR_CONVERT_TO_OBJ_ATTR,
  ERR_DBL_CONNECT_STRING,
  ERR_QUEUE_MAX_EXCEEDED,
  ERR_CLIENT_LIB_ALREADY_INITIALIZED,
  ERR_UNSUPPORTED_DATA_TYPE_IN_JSON,
  ERR_CONVERT_TO_JSON_VALUE,
  ERR_DBL_USER,
  ERR_CONCURRENT_OPS,
  ERR_POOL_RECONFIGURING,
  ERR_POOL_STATISTICS_DISABLED,
  ERR_TOKEN_BASED_AUTH,
  ERR_POOL_TOKEN_BASED_AUTH,
  ERR_CONN_TOKEN_BASED_AUTH,
  ERR_TOKEN_HAS_EXPIRED,
  ERR_TOKEN_CALLBACK_DUP,
  ERR_NOT_IMPLEMENTED,
  ERR_INIT_ORACLE_CLIENT_ARGS,
  ERR_MISSING_FILE,
  ERR_INVALID_NUMBER_OF_CONNECTIONS,
  ERR_EXEC_MODE_ONLY_FOR_DML,
  ERR_POOL_HAS_BUSY_CONNECTIONS,
  assert,
  assertArgCount,
  assertParamPropBool,
  assertParamPropFunction,
  assertParamPropInt,
  assertParamPropString,
  assertParamPropUnsignedInt,
  assertParamPropValue,
  assertParamValue,
  assertPropValue,
  getErr,
  throwErr,
  throwNotImplemented,
  transformErr
};
