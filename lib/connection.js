// Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved

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

const EventEmitter = require('events');
const QueryStream = require('./querystream.js');
const nodbUtil = require('./util.js');

// fetchRowsToReturn is used to materialize the rows for an execute call using
// the resultSet returned from the C layer.
function fetchRowsToReturn(oracledb, executeOpts, result, executeCb) {
  var rowsFetched = [];
  var fetchArraySize;
  var maxRows;

  fetchArraySize = executeOpts.fetchArraySize;
  if (fetchArraySize === undefined) {
    fetchArraySize = oracledb.fetchArraySize;
  }

  maxRows = executeOpts.maxRows;
  if (maxRows === undefined) {
    maxRows = oracledb.maxRows;
  }

  var fetchRowsCb = function(err, rows) {

    if (err) {
      executeCb(err);
      return;
    }

    if (rows) {
      rowsFetched = rowsFetched.concat(rows);
    }

    if (rowsFetched.length == maxRows || rows.length < fetchArraySize) {
      result.rows = rowsFetched;

      delete result.resultSet;

      executeCb(null, result);

      return;
    }

    result.resultSet.getRows(fetchArraySize, fetchRowsCb);
  };

  result.resultSet.getRows(fetchArraySize, fetchRowsCb);
}

// This execute function is used to override the execute method of the Connection
// class, which is defined in the C layer. The override allows us to do things
// like extend out the resultSet instance prior to passing it to the caller.
function execute(sql, a2, a3, a4) {
  var self = this;
  var binds = [];
  var executeOpts = {};
  var executeCb;
  var custExecuteCb;

  nodbUtil.assert(arguments.length > 1 && arguments.length < 5, 'NJS-009');
  nodbUtil.assert(typeof sql === 'string', 'NJS-006', 1);

  switch (arguments.length) {
    case 2:
      nodbUtil.assert(typeof a2 === 'function', 'NJS-006', 2);
      executeCb = a2;
      break;
    case 3:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-006', 2);
      nodbUtil.assert(typeof a3 === 'function', 'NJS-006', 3);
      binds = a2;
      executeCb = a3;
      break;
    case 4:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-006', 2);
      nodbUtil.assert(nodbUtil.isObject(a3), 'NJS-006', 3);
      nodbUtil.assert(typeof a4 === 'function', 'NJS-006', 4);
      binds = a2;
      executeOpts = a3;
      executeCb = a4;
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
      result.resultSet._setup(executeOpts);
      if (executeOpts.resultSet) {
        executeCb(null, result);
      } else {
        fetchRowsToReturn(self._oracledb, executeOpts, result, executeCb);
      }
    } else {
      if (result.outBinds) {
        outBindsKeys = Object.keys(result.outBinds);

        for (outBindsIdx = 0; outBindsIdx < outBindsKeys.length; outBindsIdx += 1) {
          if (result.outBinds[outBindsKeys[outBindsIdx]] instanceof self._oracledb.ResultSet) {
            result.outBinds[outBindsKeys[outBindsIdx]]._setup(executeOpts);
          }
        }
      }
      executeCb(null, result);
    }

  };

  self._execute.call(self, sql, binds, executeOpts, custExecuteCb);
}

// This executeMany function is used to override the executeMany method of
// the Connection class, which is defined in the C layer.
function executeMany(sql, bindsOrNumIters, a3, a4) {
  var self = this;
  var options = {};
  var executeCb;

  nodbUtil.assert(arguments.length > 2 && arguments.length < 5, 'NJS-009');
  nodbUtil.assert(typeof sql === 'string', 'NJS-006', 1);
  if (typeof bindsOrNumIters === 'number') {
    nodbUtil.assert(Number.isInteger(bindsOrNumIters) && bindsOrNumIters > 0,
      'NJS-005', 2);
  } else {
    nodbUtil.assert(Array.isArray(bindsOrNumIters), 'NJS-006', 2);
  }

  switch (arguments.length) {
    case 3:
      nodbUtil.assert(typeof a3 === 'function', 'NJS-006', 3);
      executeCb = a3;
      break;
    case 4:
      nodbUtil.assert(nodbUtil.isObject(a3), 'NJS-006', 3);
      nodbUtil.assert(typeof a4 === 'function', 'NJS-006', 4);
      options = a3;
      executeCb = a4;
      break;
  }

  self._executeMany.call(self, sql, bindsOrNumIters, options, executeCb);
}

// This getStatementInfo function is just a place holder to allow for easier extension later.
function getStatementInfo(sql, getStatementInfoCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(typeof getStatementInfoCb === 'function', 'NJS-006', 1);

  self._getStatementInfo.apply(self, arguments);
}

// This commit function is just a place holder to allow for easier extension later.
function commit(commitCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof commitCb === 'function', 'NJS-006', 1);

  self._commit.apply(self, arguments);
}

// This createLob function is just a place holder to allow for easier extension later.
function createLob(type, createLobCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 2, 'NJS-009');
  nodbUtil.assert(typeof createLobCb === 'function', 'NJS-006', 2);

  self._createLob.apply(self, arguments);
}

// This rollback function is just a place holder to allow for easier extension later.
function rollback(rollbackCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof rollbackCb === 'function', 'NJS-006', 1);

  self._rollback.apply(self, arguments);
}

// This close function is used to override the close method of the Connection
// class, which is defined in the C layer.
function close(a1, a2) {
  var self = this;
  var options = {};
  var closeCb;

  nodbUtil.assert(arguments.length >= 1 && arguments.length <= 2, 'NJS-009');

  switch (arguments.length) {
    case 1:
      nodbUtil.assert(typeof a1 === 'function', 'NJS-006', 1);
      closeCb = a1;
      break;
    case 2:
      nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-006', 1);
      nodbUtil.assert(typeof a2 === 'function', 'NJS-006', 2);
      options = a1;
      closeCb = a2;
      break;
  }

  self._close(options, function(err) {
    if (!err) {
      self.emit('_after_close');
    }

    closeCb(err);
  });
}

// This break function is just a place holder to allow for easier extension later.
// It's attached to the module as break is a reserved word.
module.break = function(breakCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof breakCb === 'function', 'NJS-006', 1);

  self._break.apply(self, arguments);
};

// This changePassword function is just a place holder to allow for easier extension later.
function changePassword(user, password, newPassword, changePasswordCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 4, 'NJS-009');
  nodbUtil.assert(typeof user === 'string', 'NJS-006', 1);
  nodbUtil.assert(typeof password === 'string', 'NJS-006', 2);
  nodbUtil.assert(typeof newPassword === 'string', 'NJS-006', 3);
  nodbUtil.assert(typeof changePasswordCb === 'function', 'NJS-006', 4);

  self._changePassword.apply(self, arguments);
}

// This ping function is just a place holder to allow for easier extension later.
function ping(pingCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof pingCb === 'function', 'NJS-006', 1);

  self._ping.apply(self, arguments);
}

// create a subscription which can be used to get notifications of database
// changes
function subscribe(name, options, subscribeCb) {
  var self = this;

  nodbUtil.assert(arguments.length == 3, 'NJS-009');
  nodbUtil.assert(typeof name === 'string', 'NJS-006', 1);
  nodbUtil.assert(nodbUtil.isObject(options), 'NJS-006', 2);
  nodbUtil.assert(typeof subscribeCb === 'function', 'NJS-006', 3);
  self._subscribe.call(self, name, options, subscribeCb);
}

// destroy a subscription which was earlier created using subscribe()
function unsubscribe(name, cb) {
  var self = this;

  nodbUtil.assert(arguments.length == 2, 'NJS-009');
  nodbUtil.assert(typeof name === 'string', 'NJS-006', 1);
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 2);

  self._unsubscribe.call(self, name, cb);
}


// define class
class Connection extends EventEmitter {

  // extend class with promisified functions
  _extend(oracledb) {
    this._oracledb = oracledb;
    this.break = nodbUtil.promisify(oracledb, module.break);
    this.changePassword = nodbUtil.promisify(oracledb, changePassword);
    this.close = nodbUtil.promisify(oracledb, close);
    this.commit = nodbUtil.promisify(oracledb, commit);
    this.createLob = nodbUtil.promisify(oracledb, createLob);
    this.execute = nodbUtil.promisify(oracledb, execute);
    this.executeMany = nodbUtil.promisify(oracledb, executeMany);
    this.getStatementInfo = nodbUtil.promisify(oracledb, getStatementInfo);
    this.ping = nodbUtil.promisify(oracledb, ping);
    this.release = nodbUtil.promisify(oracledb, close);
    this.rollback = nodbUtil.promisify(oracledb, rollback);
    this.subscribe = nodbUtil.promisify(oracledb, subscribe);
    this.unsubscribe = nodbUtil.promisify(oracledb, unsubscribe);
  }

  // To obtain a SodaDatabase object (high-level SODA object associated with
  // current connection)
  getSodaDatabase() {
    nodbUtil.assert(arguments.length === 0, 'NJS-009');
    return this._getSodaDatabase();
  }

  // The queryStream function is similar to execute except that it immediately
  // returns a QueryStream.
  queryStream(sql, binding, options) {
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

    stream = new QueryStream(null);

    // calling execute() via nextTick to ensure that handlers are registered
    // prior to the events being emitted
    process.nextTick(function() {
      self._execute(sql, binding, options, function(err, result) {
        if (err) {
          stream._open(err, null);
        } else {
          result.resultSet._setup(options);
          stream._open(null, result.resultSet);
        }
      });
    });

    return stream;
  }

}


// module.exports.extend = extend;
module.exports = Connection;
