/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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

var util = require('util');

var EventEmitter = require('events').EventEmitter;
var eventEmitterKeys = Object.keys(EventEmitter.prototype);
var eventEmitterFuncKeys = eventEmitterKeys.filter(function(key) {
  return typeof EventEmitter.prototype[key] === 'function';
});

// errorMessages is a temporary duplication of error messages defined in the C
// layer that will be removed once a function to fetch from the C layer is added.
var errorMessages = {
  'NJS-002': 'NJS-002: invalid pool',
  'NJS-004': 'NJS-004: invalid value for property %s',
  'NJS-005': 'NJS-005: invalid value for parameter %d',
  'NJS-006': 'NJS-006: invalid type for parameter %d',
  'NJS-009': 'NJS-009: invalid number of parameters',
  'NJS-014': 'NJS-014: %s is a read-only property',
  'NJS-037': 'NJS-037: incompatible type of value provided',
  'NJS-040': 'NJS-040: connection request timeout',
  'NJS-041': 'NJS-041: cannot convert ResultSet to QueryStream after invoking methods',
  'NJS-042': 'NJS-042: cannot invoke ResultSet methods after converting to QueryStream',
  'NJS-043': 'NJS-043: ResultSet already converted to QueryStream',
  'NJS-045': 'NJS-045: cannot load the oracledb add-on binary for Node.js %s',
  'NJS-046': 'NJS-046: poolAlias "%s" already exists in the connection pool cache',
  'NJS-047': 'NJS-047: poolAlias "%s" not found in the connection pool cache'
};

// makeEventEmitter is used to make class instances inherit from the EventEmitter
// class. This is needed because we extend instances from the C layer and thus
// don't have JavaScript constructor functions we can use for more traditional
// inheritance.
function makeEventEmitter(instance){
  eventEmitterFuncKeys.forEach(function(key) {
    instance[key] = EventEmitter.prototype[key];
  });

  EventEmitter.call(instance);
}

module.exports.makeEventEmitter = makeEventEmitter;

// getErrorMessage is used to get and format error messages to make throwing errors
// a little more convenient.
function getErrorMessage(errorCode, messageArg1) {
  if (messageArg1) {
    return util.format(errorMessages[errorCode], messageArg1);
  } else {
    return util.format(errorMessages[errorCode]);
  }
}

module.exports.getErrorMessage = getErrorMessage;

// assert it typically used in the beginning of public functions to assert preconditions
// for the function to execute. Most commonly it's used to validate arguments lenght
// and types and throw an error if they don't match what is expected.
function assert(condition, errorCode, messageArg1) {
  if (!condition) {
    throw new Error(getErrorMessage(errorCode, messageArg1));
  }
}

module.exports.assert = assert;

// The promisify function is used to wrap async methods to add optional promise
// support. If the last parameter passed to a method is a function, then it is
// assumed that the callback pattern is being used and the method is invoked as
// usual. Otherwise a promise is returned and later resolved or rejected based on
// the return of the method.
function promisify(func) {
  return function() {
    var self = this;
    var args;

    // This/self could refer to the base class instance, pool, connection, etc. All
    // class instances have a private reference to the base class for convenience.
    if (!self._oracledb.Promise || typeof arguments[arguments.length - 1] === 'function') {
      return func.apply(self, arguments);
    } else {
      // Converting to an array so we can extend it later with a custom callback
      args = Array.prototype.slice.call(arguments);

      return new self._oracledb.Promise(function(resolve, reject) {
        var errorCode;

        try {
          args[args.length] = function(err, result) {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          };

          func.apply(self, args);
        } catch (err) {
          errorCode = err.message.substr(0, 7);

          // Check for invalid number or type of parameter(s) as they should be
          // eagerly thrown.
          if (errorCode === 'NJS-009' || errorCode === 'NJS-006') {
            // Throwing the error outside of the promise wrapper so that its not
            // swallowed up as a rejection.
            process.nextTick(function() {
              throw err;
            });
          } else {
            reject(err);
          }
        }
      });
    }
  };
}

module.exports.promisify = promisify;

function isObject(value) {
  return value !== null && typeof value === 'object';
}

module.exports.isObject = isObject;

function isObjectOrArray(value) {
  return (value !== null && typeof value === 'object') || Array.isArray(value);
}

module.exports.isObjectOrArray = isObjectOrArray;
