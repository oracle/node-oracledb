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
var deferred = require('./deferred.js');

// This execute function is used to override the execute method of the Connection
// class, which is defined in the C layer. The override allows us to do things
// like extend out the resultSet instance prior to passing it to the caller.
function execute(a1, a2, a3) {
  var args = deferred.variadic(arguments);
  var self = this;
  var executeCb = args.callback;
  var custExecuteCb;

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

  var length = typeof arguments[arguments.length - 1] == 'function' ? arguments.length : arguments.length + 1;
  switch (length) {
    case 4:
      self._execute(a1, a2, a3, custExecuteCb);
      break;
    case 3:
      self._execute(a1, a2, custExecuteCb);
      break;
    case 2:
      self._execute(a1, custExecuteCb);
      break;
  }

  return executeCb.promise;
}

// This commit function is just a place holder to allow for easier extension later.
function commit() {
  var self = this;
  var args = deferred.variadic(arguments);

  self._commit.apply(self, args);

  return args.promise;
}

// This rollback function is just a place holder to allow for easier extension later.
function rollback() {
  var self = this;
  var args = deferred.variadic(arguments);

  self._rollback.apply(self, args);
  return args.promise;
}

// This release function is used to override the release method of the Connection
// class, which is defined in the C layer. Currently the main difference is that
// connections obtained from a pool need to invoke the pool's _onConnectionRelease
// method so the pool can dequeue the next connection request.
function release(releaseCb) {
  var self = this;
  releaseCb = deferred(releaseCb);

  // _pool will only exist on connections obtained from a pool.
  if (self._pool && self._pool.queueRequests !== false) {
    self._release(function(err) {
      releaseCb(err);

      self._pool._onConnectionRelease();
    });
  } else {
    self._release(releaseCb);
  }

  return releaseCb.promise;
}

// This release function is just a place holder to allow for easier extension later.
// It's attached to the module as break is a reserved word.
module.break = function() {
  var self = this;
  var args = deferred.variadic(arguments);

  self._break.apply(self, args);

  return args.promise;
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
