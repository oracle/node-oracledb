// Copyright (c) 2016, 2020, Oracle and/or its affiliates. All rights reserved

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

const BaseDbObject = require('./dbObject.js');
const EventEmitter = require('events');
const QueryStream = require('./queryStream.js');
const nodbUtil = require('./util.js');
const util = require('util');

// fetchRowsToReturn is used to materialize the rows for an execute call using
// the resultSet returned from the C layer.
function fetchRowsToReturn(oracledb, executeOpts, resultSet, cb) {
  let rowsFetched = [];
  let fetchArraySize;
  let maxRows;

  fetchArraySize = executeOpts.fetchArraySize;
  if (fetchArraySize === undefined) {
    fetchArraySize = oracledb.fetchArraySize;
  }

  maxRows = executeOpts.maxRows;
  if (maxRows === undefined) {
    maxRows = oracledb.maxRows;
  }

  const fetchRowsCb = function(err, rows) {

    if (err) {
      cb(err);
      return;
    }

    if (rows) {
      rowsFetched = rowsFetched.concat(rows);
    }

    if (rowsFetched.length == maxRows || rows.length < fetchArraySize) {
      cb(null, rowsFetched);
      return;
    }

    resultSet.getRows(fetchArraySize, fetchRowsCb);
  };

  resultSet.getRows(fetchArraySize, fetchRowsCb);
}

// This execute function is used to override the execute method of the Connection
// class, which is defined in the C layer. The override allows us to do things
// like extend out the resultSet instance prior to passing it to the caller.
function execute(sql, a2, a3, a4) {
  const self = this;
  let binds = [];
  let executeOpts = {};
  let executeCb;
  let custExecuteCb;

  nodbUtil.checkAsyncArgs(arguments, 2, 4);
  nodbUtil.assert(typeof sql === 'string', 'NJS-005', 1);

  switch (arguments.length) {
    case 2:
      executeCb = a2;
      break;
    case 3:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-005', 2);
      binds = a2;
      executeCb = a3;
      break;
    case 4:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-005', 2);
      nodbUtil.assert(nodbUtil.isObject(a3), 'NJS-005', 3);
      binds = a2;
      executeOpts = a3;
      executeCb = a4;
      break;
  }

  custExecuteCb = function(err, result) {
    let outBindsKeys;
    let outBindsIdx;

    if (err) {
      executeCb(err);
      return;
    }

    // Need to extend resultsets which may come from either the query results
    // or outBinds or implicit results
    if (result.resultSet) {
      result.resultSet._setup(executeOpts);
      if (executeOpts.resultSet) {
        executeCb(null, result);
      } else {
        fetchRowsToReturn(self._oracledb, executeOpts, result.resultSet,
          function(err, rows) {
            if (err) {
              executeCb(err);
            } else {
              result.rows = rows;
              delete result.resultSet;
              executeCb(null, result);
            }
          }
        );
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
      if (result.implicitResults && !executeOpts.resultSet) {
        const processImplicitResult = function(ix) {
          const resultSet = result.implicitResults[ix];
          if (!resultSet) {
            executeCb(null, result);
            return;
          }
          fetchRowsToReturn(self._oracledb, executeOpts, resultSet,
            function(err, rows) {
              if (err) {
                executeCb(err);
                return;
              }
              result.implicitResults[ix] = rows;
              processImplicitResult(ix + 1);
            }
          );
        };
        processImplicitResult(0);
      } else {
        if (result.implicitResults) {
          for (let i = 0; i < result.implicitResults.length; i++) {
            result.implicitResults[i]._setup(executeOpts);
          }
        }
        executeCb(null, result);
      }
    }

  };

  self._execute.call(self, sql, binds, executeOpts, custExecuteCb);
}

// This executeMany function is used to override the executeMany method of
// the Connection class, which is defined in the C layer.
function executeMany(sql, bindsOrNumIters, a3, a4) {
  const self = this;
  let options = {};
  let executeCb;
  let okBinds;

  nodbUtil.checkAsyncArgs(arguments, 3, 4);
  nodbUtil.assert(typeof sql === 'string', 'NJS-005', 1);
  if (typeof bindsOrNumIters === 'number') {
    nodbUtil.assert(Number.isInteger(bindsOrNumIters), 'NJS-005', 2);
    okBinds = (bindsOrNumIters > 0);
  } else {
    nodbUtil.assert(Array.isArray(bindsOrNumIters), 'NJS-005', 2);
    okBinds = (bindsOrNumIters.length > 0);
  }

  switch (arguments.length) {
    case 3:
      executeCb = a3;
      break;
    case 4:
      nodbUtil.assert(nodbUtil.isObject(a3), 'NJS-005', 3);
      options = a3;
      executeCb = a4;
      break;
  }
  if (!okBinds) {
    executeCb(new Error(nodbUtil.getErrorMessage('NJS-005', 2)));
    return;
  }

  self._executeMany.call(self, sql, bindsOrNumIters, options, executeCb);
}

// define method for getting a database object class; the cache is searched
// first, but if not found, the database is queried and the result is cached
// using the fully qualified name
function getDbObjectClass(name, cb) {
  nodbUtil.checkAsyncArgs(arguments, 2, 2);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);

  // check the cache; if the class is found there, nothing further to do
  let cls = this._dbObjectClasses[name];
  if (cls) {
    cb(null, cls);
    return;
  }

  // otherwise, ask the database for the class; the C method will internally
  // call back into JavaScript to store the type found in the cache
  this._getDbObjectClass(name, cb);
}

// This getStatementInfo function is just a place holder to allow for easier extension later.
function getStatementInfo(sql, getStatementInfoCb) { //eslint-disable-line
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 2, 2);

  self._getStatementInfo.apply(self, arguments);
}

// This commit function is just a place holder to allow for easier extension later.
function commit(commitCb) { //eslint-disable-line
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 1, 1);
  self._commit.apply(self, arguments);
}

// This createLob function is just a place holder to allow for easier extension later.
function createLob(type, createLobCb) { //eslint-disable-line
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 2, 2);
  nodbUtil.assert(typeof type === 'number', 'NJS-005', 1);
  nodbUtil.assert(typeof createLobCb === 'function', 'NJS-005', 2);

  self._createLob.apply(self, arguments);
}

// This rollback function is just a place holder to allow for easier extension later.
function rollback(rollbackCb) { //eslint-disable-line
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 1, 1);

  self._rollback.apply(self, arguments);
}

// This close function is used to override the close method of the Connection
// class, which is defined in the C layer.
function close(a1, a2) {
  const self = this;
  let options = {};
  let closeCb;

  nodbUtil.checkAsyncArgs(arguments, 1, 2);

  switch (arguments.length) {
    case 1:
      closeCb = a1;
      break;
    case 2:
      nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-005', 1);
      options = a1;
      closeCb = a2;
      break;
  }

  self._close(options, function(err) {
    if (!err) {
      for (const cls of Object.values(this._dbObjectClasses)) {
        cls.prototype.constructor = Object;
        cls.prototype = null;
      }
      self.emit('_after_close');
    }

    closeCb(err);
  });
}

// This break function is just a place holder to allow for easier extension later.
// It's attached to the module as break is a reserved word.
module.break = function(breakCb) { //eslint-disable-line
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 1, 1);

  self._break.apply(self, arguments);
};

// This changePassword function is just a place holder to allow for easier extension later.
function changePassword(user, password, newPassword, changePasswordCb) {
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 4, 4);
  nodbUtil.assert(typeof user === 'string', 'NJS-005', 1);
  nodbUtil.assert(typeof password === 'string', 'NJS-005', 2);
  nodbUtil.assert(typeof newPassword === 'string', 'NJS-005', 3);
  nodbUtil.assert(typeof changePasswordCb === 'function', 'NJS-005', 4);

  self._changePassword.apply(self, arguments);
}

// Returns an AQ queue
function getQueue(name, a2, a3) {
  let options = {};
  let queueCb;

  nodbUtil.checkAsyncArgs(arguments, 2, 3);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
  switch (arguments.length) {
    case 2:
      queueCb = a2;
      break;
    case 3:
      nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-005', 2);
      options = a2;
      queueCb = a3;
      break;
  }
  this._getQueue(name, options, queueCb);
}

// This ping function is just a place holder to allow for easier extension later.
function ping(pingCb) { //eslint-disable-line
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 1, 1);
  self._ping.apply(self, arguments);
}

// create a subscription which can be used to get notifications of database
// changes
function subscribe(name, options, subscribeCb) {
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 3, 3);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
  nodbUtil.assert(nodbUtil.isObject(options), 'NJS-005', 2);
  self._subscribe.call(self, name, options, subscribeCb);
}

// destroy a subscription which was earlier created using subscribe()
function unsubscribe(name, cb) {
  const self = this;

  nodbUtil.checkAsyncArgs(arguments, 2, 2);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);

  self._unsubscribe.call(self, name, cb);
}

// build a database object class
function buildDbObjectClass(schema, name, fqn) {
  const DbObject = function(initialValue) {
    if (this.isCollection) {
      const proxy = new Proxy(this, BaseDbObject._collectionProxyHandler);
      if (initialValue !== undefined) {
        for (let i = 0; i < initialValue.length; i++) {
          this.append(initialValue[i]);
        }
      }
      return proxy;
    } else if (initialValue !== undefined) {
      Object.assign(this, initialValue);
    }
  };
  DbObject.prototype = Object.create(BaseDbObject.prototype);
  DbObject.prototype.constructor = DbObject;
  DbObject.prototype.schema = schema;
  DbObject.prototype.name = name;
  DbObject.prototype.fqn = fqn;
  DbObject.toString = function() {
    return 'DbObjectClass [' + fqn + ']';
  };
  return DbObject;
}

// define class
class Connection extends EventEmitter {

  constructor() {
    super();
    this._dbObjectClasses = {};
  }

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
    this.getDbObjectClass = nodbUtil.promisify(oracledb, getDbObjectClass);
    this.getQueue = nodbUtil.promisify(oracledb, getQueue);
    this.getStatementInfo = nodbUtil.promisify(oracledb, getStatementInfo);
    this.ping = nodbUtil.promisify(oracledb, ping);
    this.release = nodbUtil.promisify(oracledb, close);
    this.rollback = nodbUtil.promisify(oracledb, rollback);
    this.subscribe = nodbUtil.promisify(oracledb, subscribe);
    this.unsubscribe = nodbUtil.promisify(oracledb, unsubscribe);
  }

  _getDbObjectClassJS(schema, name) {
    const fqn = `${schema}.${name}`;
    let cls = this._dbObjectClasses[fqn];
    if (!cls) {
      cls = buildDbObjectClass(schema, name, fqn);
      this._dbObjectClasses[fqn] = cls;
    }
    return cls;
  }

  _isDate(val) {
    return util.isDate(val);
  }

  // To obtain a SodaDatabase object (high-level SODA object associated with
  // current connection)
  getSodaDatabase() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    return this._getSodaDatabase();
  }

  // The queryStream function is similar to execute except that it immediately
  // returns a QueryStream.
  queryStream(sql, binding, options) {
    const self = this;
    let stream;

    nodbUtil.checkArgCount(arguments, 1, 3);
    nodbUtil.assert(typeof sql === 'string', 'NJS-005', 1);

    if (binding) {
      nodbUtil.assert(nodbUtil.isObjectOrArray(binding), 'NJS-005', 2);
    }

    if (options) {
      nodbUtil.assert(nodbUtil.isObject(options), 'NJS-005', 3);
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
        } else if (result.resultSet) {
          result.resultSet._setup(options);
          stream._open(null, result.resultSet);
        } else {
          stream._open(new Error(nodbUtil.getErrorMessage('NJS-019')));
        }
      });
    });

    return stream;
  }

}


// module.exports.extend = extend;
module.exports = Connection;
