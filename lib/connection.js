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

const BaseDbObject = require('./dbObject.js');
const EventEmitter = require('events');
const QueryStream = require('./queryStream.js');
const nodbUtil = require('./util.js');
const constants = require('./constants.js');
const settings = require('./settings.js');
const util = require('util');

// define class
class Connection extends EventEmitter {

  constructor() {
    super();
    this._dbObjectClasses = {};
    this._requestQueue = [];
    this._inProgress = false;
    this._closing = false;
  }

  async _acquireLock() {
    if (this._inProgress) {
      if (settings.errorOnConcurrentExecute) {
        throw new Error(nodbUtil.getErrorMessage('NJS-081'));
      }
      await new Promise((resolve, reject) => {
        const payload = {resolve: resolve, reject: reject};
        this._requestQueue.push(payload);
      });
    }
    this._inProgress = true;
  }

  // build a database object class
  _buildDbObjectClass(schema, name, fqn) {
    const DbObject = function(initialValue) {
      if (this.isCollection) {
        const proxy = new Proxy(this, BaseDbObject._collectionProxyHandler);
        if (initialValue !== undefined) {
          for (let i = 0; i < initialValue.length; i++) {
            this.append(initialValue[i]);
          }
        }
        return (proxy);
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
      return ('DbObjectClass [' + fqn + ']');
    };
    return (DbObject);
  }

  _getConnection() {
    return this;
  }

  _getDbObjectClassJS(schema, name) {
    const fqn = `${schema}.${name}`;
    let cls = this._dbObjectClasses[fqn];
    if (!cls) {
      cls = this._buildDbObjectClass(schema, name, fqn);
      cls._connection = this;
      this._dbObjectClasses[fqn] = cls;
    }
    return (cls);
  }

  _isDate(val) {
    return (util.isDate(val));
  }

  _releaseLock() {
    if (this._requestQueue.length > 0) {
      const payload = this._requestQueue.shift();
      payload.resolve();
    } else {
      this._inProgress = false;
    }
  }

  //---------------------------------------------------------------------------
  // breakExecution()
  //   Breaks the execution of the statement.
  //---------------------------------------------------------------------------
  async breakExecution() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    await this._break();
  }

  //---------------------------------------------------------------------------
  // changePassword()
  //
  // Changes the password of the specified user.
  //---------------------------------------------------------------------------
  async changePassword(user, password, newPassword) {
    nodbUtil.checkArgCount(arguments, 3, 3);
    nodbUtil.assert(typeof user === 'string', 'NJS-005', 1);
    nodbUtil.assert(typeof password === 'string', 'NJS-005', 2);
    nodbUtil.assert(typeof newPassword === 'string', 'NJS-005', 3);
    await this._changePassword(user, password, newPassword);
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Closes the connection and makes it unusable for further work.
  //---------------------------------------------------------------------------
  async close(a1) {
    let options = {};

    nodbUtil.checkArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-005', 1);
      options = a1;
    }

    // If already in the process of closing, throw an error instead of doing
    // a roundtrip
    if (this._closing) {
      throw new Error (nodbUtil.getErrorMessage('NJS-003'));
    }

    this._closing = true;
    try {
      await this._close(options);
    } finally {
      this._closing = false;
    }

    for (const cls of Object.values(this._dbObjectClasses)) {
      cls.prototype.constructor = Object;
      cls.prototype = null;
    }
    this.emit('_afterConnClose');
  }

  //---------------------------------------------------------------------------
  // commit()
  //
  // Commits the current transaction.
  //---------------------------------------------------------------------------
  async commit() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    await this._commit();
  }

  //---------------------------------------------------------------------------
  // createLob()
  //
  // Creates a temporary LOB and returns it to the caller.
  //---------------------------------------------------------------------------
  async createLob(type) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof type === 'number', 'NJS-005', 1);
    return (await this._createLob(type));
  }

  //---------------------------------------------------------------------------
  // execute()
  //
  // Executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  async execute(sql, a2, a3) {
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
    // array size fixed, or, if a result set is not requested, that all rows
    // are fetched
    if (result.implicitResults) {
      for (const key in result.implicitResults) {
        const implicitResult = result.implicitResults[key];
        if (!executeOpts.resultSet) {
          result.implicitResults[key] =
              await implicitResult._getAllRows(executeOpts);
        }
      }
    }

    return (result);
  }

  //---------------------------------------------------------------------------
  // executeMany()
  //
  // Executes a SQL statement multiple times and returns the results.
  //---------------------------------------------------------------------------
  async executeMany(sql, bindsOrNumIters, a3) {
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

    return (await this._executeMany(sql, bindsOrNumIters, options));
  }


  //---------------------------------------------------------------------------
  // getDbObjectClass()
  //
  // Returns a database object class given its name. The cache is searched
  // first, but if not found, the database is queried and the result is cached
  // using the fully qualified name.
  //---------------------------------------------------------------------------
  async getDbObjectClass(name) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);

    let cls = this._dbObjectClasses[name];
    if (cls) {
      return cls;
    }
    return (await this._getDbObjectClass(name));
  }

  //---------------------------------------------------------------------------
  // getQueue()
  //
  // Returns a queue with the specified name.
  //---------------------------------------------------------------------------
  async getQueue(name, a2) {
    let options = {};

    nodbUtil.checkArgCount(arguments, 1, 2);
    nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
    if (arguments.length == 2) {
      nodbUtil.assert(nodbUtil.isObject(a2), 'NJS-005', 2);
      options = a2;
    }
    return (await this._getQueue(name, options));
  }

  //---------------------------------------------------------------------------
  // getSodaDatabase()
  //
  // Returns a SodaDatabase object (high-level SODA object associated with
  // the current connection).
  //---------------------------------------------------------------------------
  getSodaDatabase() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    return (this._getSodaDatabase());
  }

  //---------------------------------------------------------------------------
  // getStatementInfo()
  //
  // Returns information about the statement.
  //---------------------------------------------------------------------------
  async getStatementInfo(sql) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    return (await this._getStatementInfo(sql));
  }

  //--------------------------------------------------------------------------
  // isHealthy()
  //
  // Returns the health status of the connection. If this function returns
  // false, the caller should close the connection.
  // ---------------------------------------------------------------------------
  isHealthy() {
    return (!this._closing && this._isHealthy());
  }

  //---------------------------------------------------------------------------
  // ping()
  //
  // Sends a "ping" to the database to see if it is "alive".
  //---------------------------------------------------------------------------
  async ping() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    await this._ping();
  }

  //--------------------------------------------------------------------------
  // queryStream()
  //
  // Similar to execute() except that it immediately returns a QueryStream
  // object.
  // ---------------------------------------------------------------------------
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

    return (stream);
  }

  //---------------------------------------------------------------------------
  // rollback()
  //
  // Rolls back the current transaction.
  //---------------------------------------------------------------------------
  async rollback() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    await this._rollback();
  }

  //---------------------------------------------------------------------------
  // shutdown()
  //   Shuts down the database instance.
  //---------------------------------------------------------------------------
  async shutdown(a1) {
    let mode = constants.SHUTDOWN_MODE_DEFAULT;

    nodbUtil.checkArgCount(arguments, 0, 1);
    if (a1 !== undefined) {
      nodbUtil.assert(typeof mode === 'number', 'NJS-005', 1);
      mode = a1;
    }

    await this._shutdown(mode);
  }

  //---------------------------------------------------------------------------
  // startup()
  //   Starts up the database instance.
  //---------------------------------------------------------------------------
  async startup(a1) {
    let opts = {};

    nodbUtil.checkArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      nodbUtil.assert(typeof opts === 'object', 'NJS-005', 1);
      opts = a1;
    }

    await this._startup(opts);
  }

  //---------------------------------------------------------------------------
  // subscribe()
  //
  // Creates a subscription which can be used to get notifications of database
  // changes or of AQ messages available to dequeue.
  //---------------------------------------------------------------------------
  async subscribe(name, options) {
    nodbUtil.checkArgCount(arguments, 2, 2);
    nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
    nodbUtil.assert(nodbUtil.isObject(options), 'NJS-005', 2);
    await this._subscribe(name, options);
  }

  //---------------------------------------------------------------------------
  // tpcBegin()
  //
  // Starts a two-phase-commit transaction.
  //--------------------------------------------------------------------------
  async tpcBegin(xid, flag, timeout) {
    nodbUtil.checkArgCount(arguments, 1, 3);
    nodbUtil.assert(nodbUtil.isXid(xid), 'NJS-005', 1);

    if (arguments.length < 3) {
      timeout = 60;   // seconds
    } else {
      nodbUtil.assert(typeof timeout === 'number', 'NJS-005', 3);
    }

    if (arguments.length < 2) {
      flag = constants.TPC_BEGIN_NEW;
    } else {
      nodbUtil.assert(typeof flag === 'number', 'NJS-005', 2);
    }
    await this._tpcBegin(xid, flag, timeout);
  }

  //---------------------------------------------------------------------------
  // tpcCommit()
  //
  // Commits a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcCommit(xid, onePhase) {
    nodbUtil.checkArgCount(arguments, 0, 2);

    if (arguments.length < 2) {
      onePhase = false;
    } else {
      nodbUtil.assert(typeof onePhase === 'boolean', 'NJS-005', 2);
    }
    if (arguments.length >= 1) {
      nodbUtil.assert(nodbUtil.isXid(xid), 'NJS-005', 1);
    }
    await this._tpcCommit(xid, onePhase);
  }

  //---------------------------------------------------------------------------
  // tpcEnd()
  //
  // Ends a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcEnd(xid, flag) {
    nodbUtil.checkArgCount(arguments, 0, 2);

    if (arguments.length < 2) {
      flag = constants.TPC_END_NORMAL;
    } else {
      nodbUtil.assert(typeof flag === 'number', 'NJS-005', 2);
    }

    if (arguments.length >= 1) {
      nodbUtil.assert(nodbUtil.isXid(xid), 'NJS-005', 1);
    }

    await this._tpcEnd(xid, flag);
  }

  //---------------------------------------------------------------------------
  // tpcForget()
  //
  // Causes the server to forget a heuristically completed two-phase-commit
  // transaction.
  // ---------------------------------------------------------------------------
  async tpcForget(xid) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(nodbUtil.isXid(xid), 'NJS-005', 1);

    await this._tpcForget(xid);
  }

  //---------------------------------------------------------------------------
  // tpcPrepare()
  //
  // Prepares a two-phase-commit transaction for commit.
  //---------------------------------------------------------------------------
  async tpcPrepare(xid) {
    nodbUtil.checkArgCount(arguments, 0, 1);
    if (arguments.length >= 1) {
      nodbUtil.assert(nodbUtil.isXid(xid), 'NJS-005', 1);
    }

    return await this._tpcPrepare(xid);
  }

  //---------------------------------------------------------------------------
  // tpcRecover()
  //
  // Returns a list of pending two-phase-commit transactions.
  //---------------------------------------------------------------------------
  async tpcRecover(asString) {
    nodbUtil.checkArgCount(arguments, 0, 1);

    if (arguments.length == 1) {
      nodbUtil.assert(typeof asString === 'boolean', 'NJS-005', 1);
    } else {
      asString = true;
    }

    const sqlStr = `
      SELECT
          formatid as "formatId",
          UTL_RAW.CAST_TO_VARCHAR2(globalid) as "globalTransactionId",
          UTL_RAW.CAST_TO_VARCHAR2(branchid) as "branchQualifier"
      FROM DBA_PENDING_TRANSACTIONS`;
    const sqlBuf = `
      SELECT
          formatid as "formatId",
          globalid as "globalTransactionId",
          branchid as "branchQualifier"
      FROM DBA_PENDING_TRANSACTIONS`;
    const options = {
      outFormat: constants.OUT_FORMAT_OBJECT,
    };

    const result = await this._execute(asString ? sqlStr : sqlBuf, {}, options);
    return result.resultSet._getAllRows(options, result.metaData, false);
  }

  //---------------------------------------------------------------------------
  // tpcRollback()
  //
  // Rolls back the current changes in a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcRollback(xid) {
    nodbUtil.checkArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      nodbUtil.assert(nodbUtil.isXid(xid), 'NJS-005', 1);
    }

    await this._tpcRollback(xid);
  }

  //---------------------------------------------------------------------------
  // unsubscribe()
  //
  // Destroy a subscription which was earlier created using subscribe().
  //---------------------------------------------------------------------------
  async unsubscribe(name) {
    nodbUtil.checkArgCount(arguments, 1, 1);
    nodbUtil.assert(typeof name === 'string', 'NJS-005', 1);
    await this._unsubscribe(name);
  }

}

// adjust functions to support the old callback style and to serialize calls
// that cannot take place concurrently
// NOTE: break() should not be serialized
Connection.prototype.break =
    nodbUtil.callbackify(Connection.prototype.breakExecution);
nodbUtil.wrap_fns(Connection.prototype,
  "changePassword",
  "close",
  "commit",
  "createLob",
  "execute",
  "executeMany",
  "getDbObjectClass",
  "getQueue",
  "getStatementInfo",
  "ping",
  "rollback",
  "shutdown",
  "startup",
  "subscribe",
  "tpcBegin",
  "tpcCommit",
  "tpcEnd",
  "tpcForget",
  "tpcPrepare",
  "tpcRecover",
  "tpcRollback",
  "unsubscribe");

// add alias for release()
Connection.prototype.release = Connection.prototype.close;

// export just the Connection class
module.exports = Connection;
