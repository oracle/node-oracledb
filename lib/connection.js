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

var resultset = require('./resultset.js');
var Stream = require('./resultset-read-stream');

// This execute function is used to override the execute method of the Connection
// class, which is defined in the C layer. The override allows us to do things
// like extend out the resultSet instance prior to passing it to the caller.
function execute(a1, a2, a3, a4) {
  var self = this;
  var executeCb;
  var custExecuteCb;

  var stream;
  if ((arguments.length === 3) && (typeof arguments[2] === 'object') && arguments[2].stream && (typeof arguments[2].stream === 'boolean')) { //stream results of queries
    var sql = arguments[0];
    var binding = arguments[1];
    var options = arguments[2];

    options.resultSet = true;

    stream = new Stream();

    self._execute(sql, binding, options, function onExecuteDone(error, result) {
      if (error || (!result) || (!result.resultSet)) {
        stream.nextRow = function emitError(streamCallback) {
          streamCallback(error || new Error('No Results'));
        };
      } else {
        stream.nextRow = function fetchNextRow(streamCallback) {
          result.resultSet.getRow(function onRow(rowError, row) {
            if (rowError) {
              streamCallback(rowError);
            } else if (!row) {
              streamCallback();
            } else {
              if (Array.isArray(row)) {
                if (row.length) {
                  streamCallback(null, row);
                } else {
                  streamCallback();
                }
              } else {
                streamCallback(null, row);
              }
            }
          });
        };
      }
    });
  } else {
    // Added this check so that node doesn't hang if no arguments are passed.
    if (arguments.length < 2 || arguments.length > 4) {
      if (arguments.length && typeof arguments[arguments.length - 1] === 'function') {
        arguments[arguments.length - 1](new Error('NJS-009: invalid number of parameters'));
        return;
      } else {
        throw new Error('NJS-009: invalid number of parameters');
      }
    }

    custExecuteCb = function(err, result) {
      if (err) {
        executeCb(err);
        return;
      }

      if (result.resultSet) {
        resultset.extend(result.resultSet);
      }

      executeCb(null, result);
    };

    switch (arguments.length) {
    case 4:
      executeCb = a4;
      self._execute.call(self, a1, a2, a3, custExecuteCb);
      break;
    case 3:
      executeCb = a3;
      self._execute.call(self, a1, a2, custExecuteCb);
      break;
    case 2:
      executeCb = a2;
      self._execute.call(self, a1, custExecuteCb);
      break;
    }
  }

  return stream;
}

// This commit function is just a place holder to allow for easier extension later.
function commit() {
  var self = this;

  self._commit.apply(self, arguments);
}

// This rollback function is just a place holder to allow for easier extension later.
function rollback() {
  var self = this;

  self._rollback.apply(self, arguments);
}

// This release function is used to override the release method of the Connection
// class, which is defined in the C layer. Currently the main difference is that
// connections obtained from a pool need to invoke the pool's _onConnectionRelease
// method so the pool can dequeue the next connection request.
function release(releaseCb) {
  var self = this;

  // _pool will only exist on connections obtained from a pool.
  if (self._pool && self._pool.queueRequests !== false) {
    self._release(function(err) {
      releaseCb(err);

      self._pool._onConnectionRelease();
    });
  } else {
    self._release(releaseCb);
  }
}

// This release function is just a place holder to allow for easier extension later.
// It's attached to the module as break is a reserved word.
module.break = function() {
  var self = this;

  self._break.apply(self, arguments);
};

// The extend method is used to extend the Connection instance from the C layer with
// custom properties and method overrides. References to the original methods are
// maintained so they can be invoked by the overriding method at the right time.
function extend(conn, pool) {
  // Using Object.defineProperties to add properties to the Connection instance with
  // special properties, such as enumerable but not writable.
  Object.defineProperties(
    conn,
    {
      _pool: {
        value: pool
      },
      _execute: {
        value: conn.execute
      },
      execute: {
        value: execute,
        enumerable: true,
        writable: true
      },
      _commit: {
        value: conn.commit
      },
      commit: {
        value: commit,
        enumerable: true,
        writable: true
      },
      _rollback: {
        value: conn.rollback
      },
      rollback: {
        value: rollback,
        enumerable: true,
        writable: true
      },
      _release: {
        value: conn.release
      },
      release: {
        value: release,
        enumerable: true,
        writable: true
      },
      _break: {
        value: conn.break
      },
      break: {
        value: module.break,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
