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
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const constants = require('./constants.js');
const settings = require('./settings.js');

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
        errors.throwErr(errors.ERR_CONCURRENT_OPS);
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
    errors.assertArgCount(arguments, 0, 0);
    await this._break();
  }

  //---------------------------------------------------------------------------
  // changePassword()
  //
  // Changes the password of the specified user.
  //---------------------------------------------------------------------------
  async changePassword(user, password, newPassword) {
    errors.assertArgCount(arguments, 3, 3);
    errors.assertParamValue(typeof user === 'string', 1);
    errors.assertParamValue(typeof password === 'string', 2);
    errors.assertParamValue(typeof newPassword === 'string', 3);
    await this._changePassword(user, password, newPassword);
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Closes the connection and makes it unusable for further work.
  //---------------------------------------------------------------------------
  async close(a1) {
    let options = {};

    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(nodbUtil.isObject(a1), 1);
      options = a1;
    }

    // If already in the process of closing, throw an error instead of doing
    // a roundtrip
    if (this._closing) {
      errors.throwErr(errors.ERR_INVALID_CONNECTION);
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
    errors.assertArgCount(arguments, 0, 0);
    await this._commit();
  }

  //---------------------------------------------------------------------------
  // createLob()
  //
  // Creates a temporary LOB and returns it to the caller.
  //---------------------------------------------------------------------------
  async createLob(type) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(type === constants.DB_TYPE_CLOB ||
      type === constants.DB_TYPE_BLOB ||
      type === constants.DB_TYPE_NCLOB, 1);
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

    errors.assertArgCount(arguments, 1, 3);
    errors.assertParamValue(typeof sql === 'string', 1);

    switch (arguments.length) {
      case 2:
        errors.assertParamValue(nodbUtil.isObjectOrArray(a2), 2);
        binds = a2;
        break;
      case 3:
        errors.assertParamValue(nodbUtil.isObjectOrArray(a2), 2);
        errors.assertParamValue(nodbUtil.isObject(a3), 3);
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

    errors.assertArgCount(arguments, 2, 3);
    errors.assertParamValue(typeof sql === 'string', 1);
    if (typeof bindsOrNumIters === 'number') {
      errors.assertParamValue(Number.isInteger(bindsOrNumIters), 2);
      errors.assertParamValue(bindsOrNumIters > 0, 2);
    } else {
      errors.assertParamValue(Array.isArray(bindsOrNumIters), 2);
      errors.assertParamValue(bindsOrNumIters.length > 0, 2);
    }

    if (arguments.length == 3) {
      errors.assertParamValue(nodbUtil.isObject(a3), 3);
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
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof name === 'string', 1);

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

    errors.assertArgCount(arguments, 1, 2);
    errors.assertParamValue(typeof name === 'string', 1);
    if (arguments.length == 2) {
      errors.assertParamValue(nodbUtil.isObject(a2), 2);
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
    errors.assertArgCount(arguments, 0, 0);
    return (this._getSodaDatabase());
  }

  //---------------------------------------------------------------------------
  // getStatementInfo()
  //
  // Returns information about the statement.
  //---------------------------------------------------------------------------
  async getStatementInfo(sql) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof sql === 'string', 1);
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
    errors.assertArgCount(arguments, 0, 0);
    await this._ping();
  }

  //--------------------------------------------------------------------------
  // queryStream()
  //
  // Similar to execute() except that it immediately returns a QueryStream
  // object.
  // ---------------------------------------------------------------------------
  queryStream(sql, binding, options) {

    errors.assertArgCount(arguments, 1, 3);
    errors.assertParamValue(typeof sql === 'string', 1);

    if (binding) {
      errors.assertParamValue(nodbUtil.isObjectOrArray(binding), 2);
    }

    if (options) {
      errors.assertParamValue(nodbUtil.isObject(options), 3);
    }

    binding = binding || [];
    options = options || {};

    options.resultSet = true;

    const stream = new QueryStream();

    // calling execute() via nextTick to ensure that handlers are registered
    // prior to the events being emitted
    process.nextTick(async () => {
      try {
        const result = await this._execute(sql, binding, options);
        if (!result.resultSet) {
          errors.throwErr(errors.ERR_NOT_A_QUERY);
        }
        stream._open(result.resultSet);
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
    errors.assertArgCount(arguments, 0, 0);
    await this._rollback();
  }

  //---------------------------------------------------------------------------
  // shutdown()
  //   Shuts down the database instance.
  //---------------------------------------------------------------------------
  async shutdown(a1) {
    let mode = constants.SHUTDOWN_MODE_DEFAULT;

    errors.assertArgCount(arguments, 0, 1);
    if (a1 !== undefined) {
      errors.assertParamValue(typeof mode === 'number', 1);
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

    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(typeof opts === 'object', 1);
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
    errors.assertArgCount(arguments, 2, 2);
    errors.assertParamValue(typeof name === 'string', 1);
    errors.assertParamValue(nodbUtil.isObject(options), 2);
    await this._subscribe(name, options);
  }

  //---------------------------------------------------------------------------
  // tpcBegin()
  //
  // Starts a two-phase-commit transaction.
  //--------------------------------------------------------------------------
  async tpcBegin(xid, flag, timeout) {
    errors.assertArgCount(arguments, 1, 3);
    errors.assertParamValue(nodbUtil.isXid(xid), 1);

    if (arguments.length < 3) {
      timeout = 60;   // seconds
    } else {
      errors.assertParamValue(typeof timeout === 'number', 3);
    }

    if (arguments.length < 2) {
      flag = constants.TPC_BEGIN_NEW;
    } else {
      errors.assertParamValue(typeof flag === 'number', 2);
    }
    await this._tpcBegin(xid, flag, timeout);
  }

  //---------------------------------------------------------------------------
  // tpcCommit()
  //
  // Commits a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcCommit(xid, onePhase) {
    errors.assertArgCount(arguments, 0, 2);

    if (arguments.length < 2) {
      onePhase = false;
    } else {
      errors.assertParamValue(typeof onePhase === 'boolean', 2);
    }
    if (arguments.length >= 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
    }
    await this._tpcCommit(xid, onePhase);
  }

  //---------------------------------------------------------------------------
  // tpcEnd()
  //
  // Ends a two-phase-commit transaction.
  //---------------------------------------------------------------------------
  async tpcEnd(xid, flag) {
    errors.assertArgCount(arguments, 0, 2);

    if (arguments.length < 2) {
      flag = constants.TPC_END_NORMAL;
    } else {
      errors.assertParamValue(typeof flag === 'number', 2);
    }

    if (arguments.length >= 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
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
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isXid(xid), 1);

    await this._tpcForget(xid);
  }

  //---------------------------------------------------------------------------
  // tpcPrepare()
  //
  // Prepares a two-phase-commit transaction for commit.
  //---------------------------------------------------------------------------
  async tpcPrepare(xid) {
    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length >= 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
    }

    return await this._tpcPrepare(xid);
  }

  //---------------------------------------------------------------------------
  // tpcRecover()
  //
  // Returns a list of pending two-phase-commit transactions.
  //---------------------------------------------------------------------------
  async tpcRecover(asString) {
    errors.assertArgCount(arguments, 0, 1);

    if (arguments.length == 1) {
      errors.assertParamValue(typeof asString === 'boolean', 1);
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
    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(nodbUtil.isXid(xid), 1);
    }

    await this._tpcRollback(xid);
  }

  //---------------------------------------------------------------------------
  // unsubscribe()
  //
  // Destroy a subscription which was earlier created using subscribe().
  //---------------------------------------------------------------------------
  async unsubscribe(name) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof name === 'string', 1);
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
