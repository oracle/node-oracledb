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

//-----------------------------------------------------------------------------
// execute()
//   Executes a SQL statement and returns the results.
//-----------------------------------------------------------------------------
async function execute(sql, a2, a3) {
  let binds = [];
  let executeOpts = {};

  nodbUtil.checkArgCount(arguments, 1, 3);
  nodbUtil.assert(typeof sql === 'string', 'NJS-005', 1);

  switch (arguments.length) {
    case 2:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-005', 2);
      binds = a2;
      break;
    case 3:
      nodbUtil.assert(nodbUtil.isObjectOrArray(a2), 'NJS-005', 2);
      nodbUtil.assert(nodbUtil.isObject(a3), 'NJS-005', 3);
      binds = a2;
      executeOpts = a3;
      break;
  }

  const result = await this._execute(sql, binds, executeOpts);

  // process queries; if a result set is not desired, fetch all of the rows
  // from the result set and then destroy the result set
  if (result.resultSet && !executeOpts.resultSet) {
    result.rows = await result.resultSet._getAllRows(executeOpts, result);
    delete result.resultSet;
  }

  // process implicit results; ensure all implicit results have their fetch
  // array size fixed, or, if a result set is not requested, that all rows are
  // fetched
  if (result.implicitResults) {
    for (const key in result.implicitResults) {
      const implicitResult = result.implicitResults[key];
      if (!executeOpts.resultSet) {
        result.implicitResults[key] =
            await implicitResult._getAllRows(executeOpts);
      }
    }
  }

  return result;
}


//-----------------------------------------------------------------------------
// executeMany()
//   Executes a SQL statement multiple times and returns the results.
//-----------------------------------------------------------------------------
async function executeMany(sql, bindsOrNumIters, a3) {
  let options = {};

  nodbUtil.checkArgCount(arguments, 2, 3);
  nodbUtil.assert(typeof sql === 'string', 'NJS-005', 1);
  if (typeof bindsOrNumIters === 'number') {
    nodbUtil.assert(Number.isInteger(bindsOrNumIters), 'NJS-005', 2);
    nodbUtil.assert(bindsOrNumIters > 0, 'NJS-005', 2);
  } else {
    nodbUtil.assert(Array.isArray(bindsOrNumIters), 'NJS-005', 2);
    nodbUtil.assert(bindsOrNumIters.length > 0, 'NJS-005', 2);
  }

  if (arguments.length == 3) {
    nodbUtil.assert(nodbUtil.isObject(a3), 'NJS-005', 3);
    options = a3;
  }

  return await this._executeMany(sql, bindsOrNumIters, options);
}


//-----------------------------------------------------------------------------
// getDbObjectClass()
//   Returns a database object class given its name. The cache is searched
// first, but if not found, the database is queried and the result is cached
// using the fully qualified name.
//-----------------------------------------------------------------------------
async function getDbObjectClass(name) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);

  let cls = this._dbObjectClasses[name];
  if (cls) {
    return cls;
  }
  return await this._getDbObjectClass(name);
}


//-----------------------------------------------------------------------------
// getStatementInfo()
//   Returns information about the statement.
//-----------------------------------------------------------------------------
async function getStatementInfo(sql) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  return await this._getStatementInfo(sql);
}


//-----------------------------------------------------------------------------
// commit()
//   Commits the current transaction.
//-----------------------------------------------------------------------------
async function commit() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  await this._commit();
}


//-----------------------------------------------------------------------------
// createLob()
//   Creates a temporary LOB and returns it to the caller.
//-----------------------------------------------------------------------------
async function createLob(type) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(typeof type === 'number', 'NJS-005', 1);
  return await this._createLob(type);
}


//-----------------------------------------------------------------------------
// rollback()
//   Rolls back the current transaction.
//-----------------------------------------------------------------------------
async function rollback() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  await this._rollback();
}


//-----------------------------------------------------------------------------
// close()
//   Closes the connection and makes it unusable for further work.
//-----------------------------------------------------------------------------
async function close(a1) {
  let options = {};

  nodbUtil.checkArgCount(arguments, 0, 1);
  if (arguments.length == 1) {
    nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-005', 1);
    options = a1;
  }
  await this._close(options);
  for (const cls of Object.values(this._dbObjectClasses)) {
    cls.prototype.constructor = Object;
    cls.prototype = null;
  }
  this.emit('_after_close');
}


//-----------------------------------------------------------------------------
// break()
//   Breaks the execution of the statement.
//-----------------------------------------------------------------------------
module.break = async function() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  await this._break();
};


//-----------------------------------------------------------------------------
// changePassword()
//   Changes the password of the specified user.
//-----------------------------------------------------------------------------
async function changePassword(user, password, newPassword) {
  nodbUtil.checkArgCount(arguments, 3, 3);
  nodbUtil.assert(typeof user === 'string', 'NJS-005', 1);
  nodbUtil.assert(typeof password === 'string', 'NJS-005', 2);
  nodbUtil.assert(typeof newPassword === 'string', 'NJS-005', 3);
  await this._changePassword(user, password, newPassword);
}


//-----------------------------------------------------------------------------
// getQueue()
//   Returns a queue with the specified name.
//-----------------------------------------------------------------------------
async function getQueue(name, a2) {
  let options = {};

  nodbUtil.checkArgCount(arguments, 1, 2);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
  if (arguments.length == 2) {
    nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-005', 2);
    options = a2;
  }
  return await this._getQueue(name, options);
}


//-----------------------------------------------------------------------------
// ping()
//   Sends a "ping" to the database to see if it is "alive".
//-----------------------------------------------------------------------------
async function ping() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  await this._ping();
}


//-----------------------------------------------------------------------------
// shutdown()
//   Shuts down the database instance.
//-----------------------------------------------------------------------------
async function shutdown(a1) {
  let mode = this._oracledb.SHUTDOWN_MODE_DEFAULT;

  nodbUtil.checkArgCount(arguments, 0, 1);
  if (a1 !== undefined) {
    nodbUtil.assert(typeof mode === 'number', 'NJS-005', 1);
    mode = a1;
  }

  await this._shutdown(mode);
}


//-----------------------------------------------------------------------------
// startup()
//   Starts up the database instance.
//-----------------------------------------------------------------------------
async function startup(a1) {
  let opts = {};

  nodbUtil.checkArgCount(arguments, 0, 1);
  if (arguments.length == 1) {
    nodbUtil.assert(typeof opts === 'object', 'NJS-005', 1);
    opts = a1;
  }

  await this._startup(opts);
}


//-----------------------------------------------------------------------------
// subscribe()
//   Creates a subscription which can be used to get notifications of database
// changes or of AQ messages available to dequeue.
//-----------------------------------------------------------------------------
async function subscribe(name, options) {
  nodbUtil.checkArgCount(arguments, 2, 2);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
  nodbUtil.assert(nodbUtil.isObject(options), 'NJS-005', 2);
  await this._subscribe(name, options);
}


//-----------------------------------------------------------------------------
// unsubscribe()
//   Destroy a subscription which was earlier created using subscribe().
//-----------------------------------------------------------------------------
async function unsubscribe(name) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
  await this._unsubscribe(name);
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
    this.break = nodbUtil.callbackify(module.break);
    this.changePassword = nodbUtil.callbackify(changePassword);
    this.close = nodbUtil.callbackify(close);
    this.commit = nodbUtil.callbackify(commit);
    this.createLob = nodbUtil.callbackify(createLob);
    this.execute = nodbUtil.callbackify(execute);
    this.executeMany = nodbUtil.callbackify(executeMany);
    this.getDbObjectClass = nodbUtil.callbackify(getDbObjectClass);
    this.getQueue = nodbUtil.callbackify(getQueue);
    this.getStatementInfo = nodbUtil.callbackify(getStatementInfo);
    this.ping = nodbUtil.callbackify(ping);
    this.release = nodbUtil.callbackify(close);
    this.rollback = nodbUtil.callbackify(rollback);
    this.shutdown = nodbUtil.callbackify(shutdown);
    this.startup = nodbUtil.callbackify(startup);
    this.subscribe = nodbUtil.callbackify(subscribe);
    this.unsubscribe = nodbUtil.callbackify(unsubscribe);
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

    const stream = new QueryStream();

    // calling execute() via nextTick to ensure that handlers are registered
    // prior to the events being emitted
    process.nextTick(() => {
      try {
        const p = this._execute(sql, binding, options);
        p.then(function(result) {
          if (!result.resultSet) {
            stream.destroy(new Error(nodbUtil.getErrorMessage('NJS-019')));
          } else {
            stream._open(result.resultSet);
          }
        }, function(err) {
          stream.destroy(err);
        });
      } catch (err) {
        stream.destroy(err);
        return;
      }
    });

    return stream;
  }

}


// module.exports.extend = extend;
module.exports = Connection;
