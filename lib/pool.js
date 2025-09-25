// Copyright (c) 2016, 2024, Oracle and/or its affiliates.

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

const Connection = require('./connection.js');
const EventEmitter = require('events');
const constants = require('./constants.js');
const errors = require('./errors.js');
const settings = require('./settings.js');
const nodbUtil = require('./util.js');
const impl = require('./impl');
const PoolStatistics = require('./poolStatistics.js');

class Pool extends EventEmitter {

  constructor() {
    super();
    this._impl = new impl.PoolImpl();
    this._queueMax = 0;
    this._queueTimeout = 0;
    this._enableStatistics = false;
    this._timeOfReset = this._createdDate = Date.now();
    this._sessionCallback = undefined;
    this._pendingRequestQueue = new Set();
    this._connectionClass = settings.connectionClass;
    this._bgRequestWaiter = null;
    this._bgRequestId = 0;
    this._processing = 0;
    this._ensureNoPendingRequests = null;
  }

  //---------------------------------------------------------------------------
  // _checkPoolOpen()
  //
  // Check if the pool is open (not draining/reconfiguring/closed) and throw an
  // appropriate exception if not.
  //---------------------------------------------------------------------------
  _checkPoolOpen(ignoreReconfiguring) {
    if (this.status === constants.POOL_STATUS_DRAINING) {
      errors.throwErr(errors.ERR_POOL_CLOSING);
    } else if (this.status === constants.POOL_STATUS_CLOSED) {
      errors.throwErr(errors.ERR_POOL_CLOSED);
    } else if (!ignoreReconfiguring) {
      if (this.status === constants.POOL_STATUS_RECONFIGURING) {
        errors.throwErr(errors.ERR_POOL_RECONFIGURING);
      }
    }
  }

  // _enableStats (DEPRECATED)
  //
  // Property for whether statistics are enabled on the pool.
  //---------------------------------------------------------------------------
  get _enableStats() {
    return this._enableStatistics;
  }

  //---------------------------------------------------------------------------
  // _resetStatistics()
  //  To initialize the counters/timers
  //---------------------------------------------------------------------------
  _resetStatistics() {
    this._timeOfReset = Date.now();
    this._totalConnectionRequests = 0;
    this._totalRequestsEnqueued = 0;
    this._totalRequestsDequeued = 0;
    this._totalFailedRequests = 0;
    this._totalRequestsRejected = 0;
    this._totalRequestTimeouts = 0;
    this._maximumQueueLength = this._pendingRequestQueue.size;
    this._totalTimeInQueue = 0;
    this._minTimeInQueue = 0;
    this._maxTimeInQueue = 0;
  }

  //---------------------------------------------------------------------------
  // _setup()
  //
  // Sets up the pool instance with additional attributes used for logging
  // statistics and managing the connection queue.
  //---------------------------------------------------------------------------
  _setup(options, poolAlias) {
    this._queueTimeout = options.queueTimeout;
    this._queueMax = options.queueMax;
    this._enableStatistics = options.enableStatistics;
    this._edition = options.edition;
    this._eventsFlag = options.events;
    this._externalAuth = options.externalAuth;
    this._homogeneous = options.homogeneous;
    this._user = options.user;
    this._connectString = options.connectString;
    this._status = constants.POOL_STATUS_OPEN;
    this._connectionsOut = 0;
    this._poolAlias = poolAlias;
    this._bgRequestHandler();

    this._resetStatistics();

  }

  //---------------------------------------------------------------------------
  // _updateWaitStatistics()
  //
  // Update pool wait statistics after a connect request has spent some time in
  // the queue.
  //---------------------------------------------------------------------------
  _updateWaitStatistics(request) {
    const waitTime = Date.now() - request.enqueuedTime;
    this._totalTimeInQueue += waitTime;
    if (this._minTimeInQueue === 0) {
      this._minTimeInQueue = waitTime;
    } else {
      this._minTimeInQueue = Math.min(this._minTimeInQueue, waitTime);
    }
    this._maxTimeInQueue = Math.max(this._maxTimeInQueue, waitTime);
  }

  //---------------------------------------------------------------------------
  // _verifyGetConnectionOptions()
  //
  // Verify the getConnection() options are acceptable. Performs any
  // transformations that are needed before returning the options to the
  // caller.
  //---------------------------------------------------------------------------
  _verifyGetConnectionOptions(options) {

    // define normalized options (value returned to caller)
    const outOptions = {};

    // only one of "user" and "username" may be specified (and must be strings)
    if (options.user !== undefined) {
      errors.assertParamPropValue(typeof options.user === 'string', 1, "user");
      outOptions.user = options.user;
    }
    if (options.username !== undefined) {
      errors.assert(outOptions.user === undefined, errors.ERR_DBL_USER);
      errors.assertParamPropValue(typeof options.username === 'string', 1,
        "username");
      outOptions.user = options.username;
    }

    if (this.externalAuth &&
      outOptions.user && (outOptions.user[0] !== '['
        || outOptions.user.slice(-1) !== ']')) {
      // username is not enclosed in [].
      errors.throwErr(errors.ERR_WRONG_USER_FORMAT_EXTAUTH_PROXY);
    }

    // password must be a string
    if (options.password !== undefined) {
      errors.assertParamPropValue(typeof options.password === 'string', 1,
        "password");
      if (this.externalAuth) {
        errors.throwErr(errors.ERR_WRONG_CRED_FOR_EXTAUTH);
      }
      outOptions.password = options.password;
    }

    // tag must be a string
    if (options.tag !== undefined) {
      errors.assertParamPropValue(typeof options.tag === 'string', 1, "tag");
      outOptions.tag = options.tag;
    }

    // matchAnyTag must be a boolean
    if (options.matchAnyTag !== undefined) {
      errors.assertParamPropValue(typeof options.matchAnyTag === 'boolean', 1,
        "matchAnyTag");
      outOptions.matchAnyTag = options.matchAnyTag;
    }

    // shardingKey must be an array of values
    if (options.shardingKey !== undefined) {
      const value = options.shardingKey;
      errors.assertParamPropValue(nodbUtil.isShardingKey(value), 1,
        "shardingKey");
      outOptions.shardingKey = options.shardingKey;
    }

    // superShardingKey must be an array of values
    if (options.superShardingKey !== undefined) {
      const value = options.superShardingKey;
      errors.assertParamPropValue(nodbUtil.isShardingKey(value), 1,
        "superShardingKey");
      outOptions.superShardingKey = options.superShardingKey;
    }

    // privilege must be one of a set of named constants
    if (options.privilege !== undefined) {
      errors.assertParamPropValue(nodbUtil.isPrivilege(options.privilege), 1,
        "privilege");
      outOptions.privilege = options.privilege;
    }

    return outOptions;
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the pool, optionally allowing for a period of time to pass for
  // connections to "drain" from the pool.
  //---------------------------------------------------------------------------
  async close(a1) {
    let drainTime = 0;
    let forceClose = false;

    // check arguments
    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {

      // drain time must be a valid number; timeouts larger than a 32-bit signed
      // integer are not supported
      errors.assertParamValue(typeof a1 === 'number', 1);
      if (a1 < 0 || isNaN(a1) || a1 > 2 ** 31) {
        errors.throwErr(errors.ERR_INVALID_PARAMETER_VALUE, 1);
      }

      // no need to worry about drain time if no connections are out!
      forceClose = true;
      if (this._connectionsOut > 0) {
        drainTime = a1 * 1000;
      }

    }

    // if the pool is draining/reconfiguring/closed, throw an appropriate error
    this._checkPoolOpen(false);

    if (forceClose)
      this._status = constants.POOL_STATUS_DRAINING;

    // wait for the pool to become empty or for the drain timeout to expire
    // (whichever comes first)
    if (drainTime > 0) {
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          this.removeAllListeners('_allCheckedIn');
          resolve();
        }, drainTime);
        this.once('_allCheckedIn', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    // if any connections are still out and the pool is not being force closed,
    // throw an exception
    if (!forceClose && this._connectionsOut > 0) {
      errors.throwErr(errors.ERR_POOL_HAS_BUSY_CONNECTIONS);
    }

    // ensure no connection requests are being processed before proceeding to
    // close the pool (required for thick mode)
    if (this._processing != 0)
      await new Promise(resolve => this._ensureNoPendingRequests = resolve);

    // close the pool
    await this._impl.close();
    this._status = constants.POOL_STATUS_CLOSED;

    // stop the _bgRequestWaiter waiting in background
    if (this._bgRequestWaiter)
      this._bgRequestWaiter();

    this.emit('_afterPoolClose');

  }

  //---------------------------------------------------------------------------
  // connectionsInUse
  //
  // Property for the number of connections in use by the pool.
  //---------------------------------------------------------------------------
  get connectionsInUse() {
    return this._impl.getConnectionsInUse();
  }

  //---------------------------------------------------------------------------
  // connectionsOpen
  //
  // Property for the number of connections opened by the pool.
  //---------------------------------------------------------------------------
  get connectionsOpen() {
    return this._impl.getConnectionsOpen();
  }

  //---------------------------------------------------------------------------
  // connectString
  //
  // Property for the connect string used to create the pool.
  //---------------------------------------------------------------------------
  get connectString() {
    return this._connectString;
  }

  //---------------------------------------------------------------------------
  // thin()
  //
  // return true, if driver mode is thin while creating pool
  // return false, if driver mode is thick while creating pool
  //---------------------------------------------------------------------------
  get thin() {
    return settings.thin;
  }

  //---------------------------------------------------------------------------
  // edition
  //
  // Property for the edition used to create the pool.
  //---------------------------------------------------------------------------
  get edition() {
    return this._edition;
  }

  //---------------------------------------------------------------------------
  // enableStatistics
  //
  // Property for whether statistics are enabled on the pool.
  //---------------------------------------------------------------------------
  get enableStatistics() {
    return this._enableStatistics;
  }

  //---------------------------------------------------------------------------
  // events
  //
  // Property for the events flag value used to create the pool.
  //---------------------------------------------------------------------------
  get events() {
    return this._eventsFlag;
  }

  //---------------------------------------------------------------------------
  // externalAuth
  //
  // Property for the externalAuth flag value used to create the pool.
  //---------------------------------------------------------------------------
  get externalAuth() {
    return this._externalAuth;
  }

  //---------------------------------------------------------------------------
  // getConnection()
  //
  // Gets a connection from the pool and returns it to the caller. If there are
  // fewer connections out than the poolMax setting, then the request will
  // return immediately; otherwise, the request will be queued for up to
  // queueTimeout milliseconds.
  //---------------------------------------------------------------------------
  async getConnection(a1) {
    let options = {};

    // check arguments
    errors.assertArgCount(arguments, 0, 1);
    if (arguments.length == 1) {
      errors.assertParamValue(nodbUtil.isObject(a1), 1);
      options = this._verifyGetConnectionOptions(a1);
    }

    // get connection class value from pool
    options.connectionClass = this._connectionClass;

    // if pool is draining/closed, throw an appropriate error
    this._checkPoolOpen(true);

    // manage stats, if applicable
    if (this._enableStatistics) {
      this._totalConnectionRequests += 1;
    }

    if (this._bgRequestId == Number.MAX_SAFE_INTEGER)
      this._bgRequestId = 0;

    const request = {
      id: this._bgRequestId++,
      options: options,
      conn: null,
      isWaiting: true,
      error: null,
      timeoutHandle: null,
      enqueuedTime: Date.now(),
      wasQueued: false
    };

    // This promise acquires a connection from pool
    const promiseToAcquire = new Promise((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;

      // If we haven't reached poolMax we shouldn't add to queue(honor queueMax)
      if (this._connectionsOut < this.poolMax) {
        this._processRequest(request);
      } else {
        // Ensure queueMax is not exceeded
        if (this._pendingRequestQueue.size == this._queueMax) {
          if (this._enableStatistics)
            this._totalRequestsRejected += 1;
          return reject(errors.getErr(errors.ERR_QUEUE_MAX_EXCEEDED,
            this._queueMax));
        }

        // Queueing our request
        request.wasQueued = true;
        this._pendingRequestQueue.add(request);

        if (this._enableStatistics) {
          this._totalRequestsEnqueued += 1;
          this._maximumQueueLength = Math.max(this._maximumQueueLength,
            this._pendingRequestQueue.size);
        }
      }
    });

    // This promise will timeout after queueTimeout seconds
    const promiseToTimeout = new Promise ((_, reject) => {
      if (this._queueTimeout > 0)
        request.timeoutHandle = setTimeout(() => {
          request.isWaiting = false;
          this._pendingRequestQueue.delete(request);
          if (this.enableStatistics)
            this._totalRequestTimeouts += 1;
          reject(errors.getErr(errors.ERR_CONN_REQUEST_TIMEOUT,
            this._queueTimeout));
        }, this._queueTimeout);
    });

    // Earliest promise to resolve/reject gets fulfilled
    try {
      await Promise.race([promiseToAcquire, promiseToTimeout]);
    } catch (err) {
      request.error = err;
    }

    clearTimeout(request.timeoutHandle);
    // Update time waited by request
    if (this._enableStatistics && request.wasQueued)
      this._updateWaitStatistics(request);

    // Request failed to be fulfilled (errored/timeout)
    if (request.error)
      throw request.error;

    return request.conn;
  }

  //---------------------------------------------------------------------------
  // _bgRequestHandler()
  //
  // This method handles the queuing of all pending requests and processes them
  // depending on the open connections and if the request is still waiting.
  //---------------------------------------------------------------------------
  async _bgRequestHandler() {
    while (this.status != constants.POOL_STATUS_DRAINING ||
          this.status != constants.POOL_STATUS_CLOSED) {

      const request = this._pendingRequestQueue.values().next().value;
      if (request && (this._connectionsOut < this.poolMax)) {
        this._processRequest(request);
      } else  {
        await new Promise((resolve) => {
          this._bgRequestWaiter = resolve;
        });
        this._bgRequestWaiter = null;
      }
    }

    // reject _pendingRequests waiting to be processed
    for (const request of this._pendingRequestQueue)
      request.reject(errors.throwErr(errors.ERR_POOL_CLOSED));
  }

  //---------------------------------------------------------------------------
  // _processRequest()
  //
  // Method called to process a connection request and return the required
  // 'connection'/'error returned by DB' if the client is still waiting.
  //---------------------------------------------------------------------------
  async _processRequest(request) {
    const conn = new Connection();
    try {
      this._processing += 1;
      this._connectionsOut += 1;
      this._pendingRequestQueue.delete(request);
      conn._impl = await this._impl.getConnection(request.options);
      conn._pool = this;
      await this._tagFixup(conn, request.options.tag);
      if (request.isWaiting)
        request.conn = conn;
      else
        await conn.close({});
      request.resolve();
    } catch (err) {
      if (request.isWaiting) {
        if (this._enableStatistics)
          this._totalFailedRequests += 1;
        request.reject(err);
      }
      // Request errored, so we have some space in pool
      this._release(conn._impl, request.options);
    } finally {
      this._processing -= 1;
      if (this.status == constants.POOL_STATUS_DRAINING &&
          this._processing == 0 && this._ensureNoPendingRequests)
        this._ensureNoPendingRequests();
    }
  }

  //---------------------------------------------------------------------------
  // _tagFixup()
  //
  // Method to check if requested tag matches the connection's tag.
  // If it does not match the callback function is invoked.
  //---------------------------------------------------------------------------
  async _tagFixup(conn, tag) {
    const requestedTag = tag || "";
    if (typeof this.sessionCallback === 'function' &&
        (conn._impl._newSession ||
         conn.tag != requestedTag)) {
      try {
        await new Promise((resolve, reject) => {
          this.sessionCallback(conn, requestedTag, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (err) {
        await conn.close({ drop: true });
        throw err;
      }
    }
  }

  //---------------------------------------------------------------------------
  // _release()
  //
  // Method called by 'close() in connection.js after a release'/'error in
  // _processRequest' to decrease connectionsOut & wake up _bgRequestWaiter
  //---------------------------------------------------------------------------
  async _release(impl, options) {
    this._connectionsOut -= 1;
    try {
      // Directly close the connection using the underlying connection impl
      if (impl)
        await impl.close(options);
    } finally {
      if (this._connectionsOut == 0)
        this.emit('_allCheckedIn');
      setImmediate(() => {
        if (this._pendingRequestQueue.size > 0 && this._bgRequestWaiter)
          this._bgRequestWaiter();
      });
    }
  }

  //---------------------------------------------------------------------------
  // getStatistics()
  //
  // Method to obtain a JSON object with all statistical metrics and pool
  // properties
  //---------------------------------------------------------------------------
  getStatistics() {
    this._checkPoolOpen(false);

    if (this._enableStatistics !== true) {
      return null;
    }
    return new PoolStatistics(this);
  }

  //---------------------------------------------------------------------------
  // homogeneous
  //
  // Property for the homogeneous flag value used to create the pool.
  //---------------------------------------------------------------------------
  get homogeneous() {
    return this._homogeneous;
  }

  //---------------------------------------------------------------------------
  // logStatistics()
  //
  // Method to print statistical related information and pool related
  // information when enableStatistics is set to true.
  //
  // NOTE: This function replaces the DEPRECATED _logStats() function.
  //---------------------------------------------------------------------------
  logStatistics() {
    const stats = this.getStatistics();
    if (stats === null) {
      errors.throwErr(errors.ERR_POOL_STATISTICS_DISABLED);
    }
    stats.logStatistics();
  }

  //---------------------------------------------------------------------------
  // poolAlias
  //
  // Property for the alias assigned to the pool.
  // ---------------------------------------------------------------------------
  get poolAlias() {
    return this._poolAlias;
  }

  //---------------------------------------------------------------------------
  // poolIncrement
  //
  // Property for the number of connections to create each time the pool needs
  // to grow.
  // ---------------------------------------------------------------------------
  get poolIncrement() {
    return this._impl.getPoolIncrement();
  }

  //---------------------------------------------------------------------------
  // poolMax
  //
  // Property for the maximum number of connections allowed in the pool.
  //---------------------------------------------------------------------------
  get poolMax() {
    return this._impl.getPoolMax();
  }

  //---------------------------------------------------------------------------
  // poolMaxPerShard
  //
  // Property for the maximum number of connections allowed in the pool for
  // each shard.
  //---------------------------------------------------------------------------
  get poolMaxPerShard() {
    return this._impl.getPoolMaxPerShard();
  }

  //---------------------------------------------------------------------------
  // poolMin
  //
  // Property for the minimum number of connections allowed in the pool.
  //---------------------------------------------------------------------------
  get poolMin() {
    return this._impl.getPoolMin();
  }

  //---------------------------------------------------------------------------
  // poolPingInterval
  //
  // Property for the ping interval to use for the pool.
  //---------------------------------------------------------------------------
  get poolPingInterval() {
    return this._impl.getPoolPingInterval();
  }

  //---------------------------------------------------------------------------
  // poolPingTimeout
  //
  // Property for the ping timeout associated with the pool.
  //---------------------------------------------------------------------------
  get poolPingTimeout() {
    return this._impl.getPoolPingTimeout();
  }

  //---------------------------------------------------------------------------
  // poolTimeout
  //
  // Property for the timeout associated with the pool.
  //---------------------------------------------------------------------------
  get poolTimeout() {
    return this._impl.getPoolTimeout();
  }

  //---------------------------------------------------------------------------
  // maxLifetimeSession
  //
  // Property for the max allowed lifetime of a session in the pool.
  //---------------------------------------------------------------------------
  get maxLifetimeSession() {
    return this._impl.getMaxLifetimeSession();
  }

  //---------------------------------------------------------------------------
  // queueMax
  //
  // Property for the maximum number of pending pool connections that can be
  // queued.
  //---------------------------------------------------------------------------
  get queueMax() {
    return this._queueMax;
  }

  //---------------------------------------------------------------------------
  // queueTimeout
  //
  // Property for the milliseconds a connection request can spend in the queue
  // before an exception is thrown.
  //---------------------------------------------------------------------------
  get queueTimeout() {
    return this._queueTimeout;
  }

  //---------------------------------------------------------------------------
  // reconfigure()
  //
  // Reconfigure the pool, change the value for given pool-properties.
  //---------------------------------------------------------------------------
  async reconfigure(options) {

    // check arguments
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(options));
    errors.assertParamPropUnsignedInt(options, 1, "queueMax");
    errors.assertParamPropUnsignedInt(options, 1, "queueTimeout");
    errors.assertParamPropBool(options, 1, "enableStatistics");
    errors.assertParamPropBool(options, 1, "resetStatistics");
    errors.assertParamPropUnsignedInt(options, 1, "poolMin");
    errors.assertParamPropUnsignedIntNonZero(options, 1, "poolMax");
    errors.assertParamPropUnsignedInt(options, 1, "poolMaxPerShard");
    errors.assertParamPropUnsignedInt(options, 1, "poolIncrement");
    errors.assertParamPropInt(options, 1, "poolPingInterval");
    errors.assertParamPropUnsignedInt(options, 1, "poolTimeout");
    errors.assertParamPropUnsignedInt(options, 1, "maxLifetimeSession");
    errors.assertParamPropUnsignedInt(options, 1, "stmtCacheSize");
    errors.assertParamPropBool(options, 1, "sodaMetaDataCache");

    // poolMax must be greater than or equal to poolMin
    if (options.poolMin > options.poolMax) {
      errors.throwErr(errors.ERR_INVALID_NUMBER_OF_CONNECTIONS, options.poolMax,
        options.poolMin);
    }

    // reconfiguration can happen only when status is OPEN
    this._checkPoolOpen(false);

    this._status = constants.POOL_STATUS_RECONFIGURING;
    try {
      // poolMin/poolMax/poolIncrement/poolPingInterval/poolTimeout/
      // poolMaxPerShard/stmtCacheSize/sodaMetaDataCache/maxLifetimeSession
      // parameters
      await this._impl.reconfigure(options);

      // pool JS parameters: queueMax, queueTimeout, enableStatistics,
      // resetStatistics

      // reset the statistics-metrics only if 'resetStatistics' is true or
      // 'enableStatistics' is being set to true
      if (options.resetStatistics == true ||
          (options.enableStatistics == true &&
          this._enableStatistics == false)) {
        this._resetStatistics();
      }

      if (options.queueMax !== undefined) {
        this._queueMax = options.queueMax;
      }

      if (options.queueTimeout !== undefined) {
        this._queueTimeout = options.queueTimeout;
      }

      if (options.enableStatistics !== undefined) {
        this._enableStatistics = options.enableStatistics;
      }
    } finally {
      this._status = constants.POOL_STATUS_OPEN;
    }
  }

  //---------------------------------------------------------------------------
  // sessionCallback
  //
  // Property for the session callback associated with the pool.
  //---------------------------------------------------------------------------
  get sessionCallback() {
    return this._sessionCallback;
  }

  //---------------------------------------------------------------------------
  // setAccessToken()
  //
  // Set parameters for token based authentication.
  //---------------------------------------------------------------------------
  async setAccessToken(options) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(nodbUtil.isObject(options), 1);
    errors.assertParamPropString(options, 1, "token");
    errors.assertParamPropString(options, 1, "privateKey");
    await this._impl.setAccessToken(options);
  }

  //---------------------------------------------------------------------------
  // sodaMetaDataCache
  //
  // Property for whether the SODA metadata cache is enabled or not.
  //---------------------------------------------------------------------------
  get sodaMetaDataCache() {
    return this._impl.getSodaMetaDataCache();
  }

  //---------------------------------------------------------------------------
  // status
  //
  // Property for the pool's status.
  //---------------------------------------------------------------------------
  get status() {
    return this._status;
  }

  //---------------------------------------------------------------------------
  // stmtCacheSize
  //
  // Property for the size of the statement cache to use when creating
  // connections in the pool.
  //---------------------------------------------------------------------------
  get stmtCacheSize() {
    return this._impl.getStmtCacheSize();
  }

  //---------------------------------------------------------------------------
  // user
  //
  // Property for the user used to create the pool.
  //---------------------------------------------------------------------------
  get user() {
    return this._user;
  }

  //---------------------------------------------------------------------------
  // connectTraceConfig
  //
  // Property for getting the connection related config.
  //---------------------------------------------------------------------------
  get connectTraceConfig() {
    return this._impl && this._impl._getConnectTraceConfig();
  }
}

nodbUtil.wrapFns(Pool.prototype, false,
  "close",
  "getConnection",
  "reconfigure",
  "setAccessToken");

// DEPRECATED aliases
Pool.prototype.terminate = Pool.prototype.close;
Pool.prototype._logStats = Pool.prototype.logStatistics;

module.exports = Pool;
