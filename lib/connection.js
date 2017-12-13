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

var resultset = require('./resultset.js');
var QueryStream = require('./querystream.js');
var nodbUtil = require('./util.js');
var executePromisified;
var commitPromisified;
var createLobPromisified;
var rollbackPromisified;
var releasePromisified;
var breakPromisified;

// The queryStream function is similar to execute except that it immediately
// returns a QueryStream.
function queryStream(sql, binding, options) {
  var self = this;
  var stream;

  nodbUtil.assert(arguments.length > 0 && arguments.length < 4, 'NJS-009');
  nodbUtil.assert(typeof sql === 'string', 'NJS-006', 1);

  if (binding) {
    nodbUtil.assert(nodbUtil.isObjectOrArray(binding), 'NJS-006', 2);
  }

  if (options) {
    nodbUtil.assert(nodbUtil.isObject(options), 'NJS-006', 3);
  }

  binding = binding || [];
  options = options || {};

  options.resultSet = true;

  stream = new QueryStream(null, self._oracledb);

  if (options.fetchArraySize) {
    stream._fetchArraySize = options.fetchArraySize;
  }

  self._execute(sql, binding, options, function(err, result) {
    if (err) {
      stream._open(err, null);
    } else {
      resultset.extend(result.resultSet, self._oracledb);
      stream._open(null, result.resultSet);
    }
  });

  return stream;
}

// This execute function is used to override the execute method of the Connection
// class, which is defined in the C layer. The override allows us to do things
// like extend out the resultSet instance prior to passing it to the caller.
function execute(a1, a2, a3, a4) {
  var self = this;
  var executeCb;
  var executeOpts;
  var custExecuteCb;

  nodbUtil.assert(arguments.length > 1 && arguments.length < 5, 'NJS-009');
  nodbUtil.assert(typeof a1 === 'string', 'NJS-006', 1);

  switch (arguments.length) {
    case 2:
      nodbUtil.assert(typeof a2 === 'function', 'NJS-006', 2);
      break;
    case 3:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-006', 2);
      nodbUtil.assert(typeof a3 === 'function', 'NJS-006', 3);
      break;
    case 4:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-006', 2);
      nodbUtil.assert(nodbUtil.isObject(a3), 'NJS-006', 3);
      nodbUtil.assert(typeof a4 === 'function', 'NJS-006', 4);
      break;
  }

  custExecuteCb = function(err, result) {
    var outBindsKeys;
    var outBindsIdx;

    if (err) {
      executeCb(err);
      return;
    }

    // Need to extend resultsets which may come from either the query results
    // or outBinds.
    if (result.resultSet) {
      resultset.extend(result.resultSet, self._oracledb, executeOpts);
    } else if (result.outBinds) {
      outBindsKeys = Object.keys(result.outBinds);

      for (outBindsIdx = 0; outBindsIdx < outBindsKeys.length; outBindsIdx += 1) {
        if (result.outBinds[outBindsKeys[outBindsIdx]] instanceof self._oracledb.ResultSet) {
          resultset.extend(result.outBinds[outBindsKeys[outBindsIdx]], self._oracledb, executeOpts);
        }
      }
    }

    executeCb(null, result);
  };

  switch (arguments.length) {
    case 4:
      executeCb = a4;
      executeOpts = a3;
      self._execute.call(self, a1, a2, a3, custExecuteCb);
      break;
    case 3:
      executeCb = a3;
      executeOpts = a2;
      self._execute.call(self, a1, a2, custExecuteCb);
      break;
    case 2:
      executeCb = a2;
      self._execute.call(self, a1, custExecuteCb);
      break;
  }
}

executePromisified = nodbUtil.promisify(execute);

// This commit function is just a place holder to allow for easier extension later.
function commit(commitCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof commitCb === 'function', 'NJS-006', 1);

  self._commit.apply(self, arguments);
}

commitPromisified = nodbUtil.promisify(commit);

// This createLob function is just a place holder to allow for easier extension later.
function createLob(type, createLobCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(typeof createLobCb === 'function', 'NJS-006', 2);

  self._createLob.apply(self, arguments);
}

createLobPromisified = nodbUtil.promisify(createLob);

// This rollback function is just a place holder to allow for easier extension later.
function rollback(rollbackCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof rollbackCb === 'function', 'NJS-006', 1);

  self._rollback.apply(self, arguments);
}

rollbackPromisified = nodbUtil.promisify(rollback);

// This release function is used to override the release method of the Connection
// class, which is defined in the C layer.
function release(releaseCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof releaseCb === 'function', 'NJS-006', 1);

  self._release(function(err) {
    if (!err) {
      self.emit('_after_close');
    }

    releaseCb(err);
  });
}

releasePromisified = nodbUtil.promisify(release);

// This release function is just a place holder to allow for easier extension later.
// It's attached to the module as break is a reserved word.
module.break = function(breakCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof breakCb === 'function', 'NJS-006', 1);

  self._break.apply(self, arguments);
};

breakPromisified = nodbUtil.promisify(module.break);

// The extend method is used to extend the Connection instance from the C layer with
// custom properties and method overrides. References to the original methods are
// maintained so they can be invoked by the overriding method at the right time.
function extend(conn, oracledb, pool) {
  nodbUtil.makeEventEmitter(conn);

  // Using Object.defineProperties to add properties to the Connection instance with
  // special properties, such as enumerable but not writable.
  Object.defineProperties(
    conn,
    {
      _oracledb: { // storing a reference to the base instance to avoid circular references with require
        value: oracledb
      },
      _pool: { // storing a reference to the pool, if any, from which the connection was obtained
        value: pool
      },
      _execute: {
        value: conn.execute
      },
      queryStream: {
        value: queryStream,
        enumerable: true,
        writable: true
      },
      execute: {
        value: executePromisified,
        enumerable: true,
        writable: true
      },
      _commit: {
        value: conn.commit
      },
      commit: {
        value: commitPromisified,
        enumerable: true,
        writable: true
      },
      _createLob: {
        value: conn.createLob
      },
      createLob: {
        value: createLobPromisified,
        enumerable: true,
        writable: true
      },
      _rollback: {
        value: conn.rollback
      },
      rollback: {
        value: rollbackPromisified,
        enumerable: true,
        writable: true
      },
      _release: {
        value: conn.release
      },
      release: {
        value: releasePromisified,
        enumerable: true,
        writable: true
      },
      close: { // alias for release
        value: releasePromisified,
        enumerable: true,
        writable: true
      },
      _break: {
        value: conn.break
      },
      break: {
        value: breakPromisified,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
