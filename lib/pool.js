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

const EventEmitter = require('events');
const nodbUtil = require('./util.js');
const util = require('util');
const PoolStatistics = require('./poolStatistics.js');


//-----------------------------------------------------------------------------
// _checkRequestQueue()
//   When a connection is returned to the pool, this method is called (via an
// event handler) to determine when requests for connections should be
// resumed and cancels any timeout that may have been associated with the
// request. This method is also called from reconfigure() so that waiting
// connection requests can be processed. Note the use of a local variable for
// the number of connections out. This is because the connection requests will
// not resume until after the loop is finished, and therefore the number of
// connections the pool thinks is out will not be incremented.
//-----------------------------------------------------------------------------
function _checkRequestQueue() {
  let connectionsOut = this._connectionsOut;
  while (this._connRequestQueue.length > 0 && connectionsOut < this.poolMax) {
    connectionsOut += 1;
    const payload = this._connRequestQueue.shift();
    if (this._enableStatistics) {
      this._totalRequestsDequeued += 1;
      this._updateWaitStatistics(payload);
    }
    if (payload.timeoutHandle) {
      clearTimeout(payload.timeoutHandle);
    }
    // inform the waiter that processing can continue
    payload.resolve();
  }
}


//-----------------------------------------------------------------------------
// getConnection()
//   Gets a connection from the pool and returns it to the caller. If there are
// fewer connections out than the poolMax setting, then the request will
// return immediately; otherwise, the request will be queued for up to
// queueTimeout milliseconds.
//-----------------------------------------------------------------------------
async function getConnection(a1) {
  let poolMax;
  let options = {};

  // check arguments
  nodbUtil.checkArgCount(arguments, 0, 1);
  if (arguments.length == 1) {
    nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-005', 1);
    options = a1;
  }

  // if pool is draining/closed, throw an appropriate error
  this._checkPoolOpen(true);

  // manage stats, if applicable
  if (this._enableStatistics) {
    this._totalConnectionRequests += 1;
  }

  // getting the poolMax setting on the pool may fail if the pool is no longer
  // valid
  try {
    poolMax = this.poolMax;
  } catch (err) {
    if (this._enableStatistics) {
      this._totalFailedRequests += 1;
    }
    throw err;
  }

  if (this._connectionsOut >= poolMax ||
      this.status === this._oracledb.POOL_STATUS_RECONFIGURING) {

    // when the queue is huge, throw error early without waiting for queue timeout
    if (this._connRequestQueue.length >= this._queueMax &&
        this._queueMax >= 0) {
      if (this._enableStatistics) {
        this._totalRequestsRejected += 1;
      }
      throw new Error(nodbUtil.getErrorMessage('NJS-076', this._queueMax));
    }

    // if too many connections are out, wait until room is made available or the
    // queue timeout expires
    await new Promise((resolve, reject) => {

      // set up a payload which will be added to the queue for processing
      const payload = { resolve: resolve, reject: reject };

      // if using a queue timeout, establish the timeout so that when it
      // expires the payload will be removed from the queue and an exception
      // thrown
      if (this._queueTimeout !== 0) {
        payload.timeoutHandle = setTimeout(() => {
          const ix = this._connRequestQueue.indexOf(payload);
          if (ix >= 0) {
            this._connRequestQueue.splice(ix, 1);
          }
          if (this._enableStatistics) {
            this._totalRequestTimeouts += 1;
            this._updateWaitStatistics(payload);
          }
          reject(new Error(nodbUtil.getErrorMessage('NJS-040',
            this._queueTimeout)));
        }, this._queueTimeout);
      }

      // add payload to the queue
      this._connRequestQueue.push(payload);
      if (this._enableStatistics) {
        payload.enqueuedTime = Date.now();
        this._totalRequestsEnqueued += 1;
        this._maximumQueueLength = Math.max(this._maximumQueueLength,
          this._connRequestQueue.length);
      }

    });

    // check if pool is draining/closed after delay has
    // completed and throw an appropriate error
    this._checkPoolOpen(true);

  }

  // room is available in the queue, so proceed to acquire a connection from
  // the pool; adjust the connections out immediately in order to ensure that
  // another attempt doesn't proceed while this one is underway
  this._connectionsOut += 1;
  try {

    // acquire connection from the pool
    const conn = await this._getConnection(options);

    // invoke tag fixup callback method if one has been specified and the
    // actual tag on the connection doesn't match the one requested, or the
    // connection is freshly created; if the callback fails, close the
    // connection and remove it from the pool
    const requestedTag = options.tag || "";
    if (typeof this.sessionCallback === 'function' &&
        (conn._newSession || conn.tag != requestedTag)) {
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

    // when connection is closed, check to see if another request should be
    // processed and update any stats, as needed
    conn.on('_afterConnClose', () => {
      this._connectionsOut -= 1;
      this.emit('_checkRequestQueue');
      if (this._connectionsOut == 0) {
        this.emit('_allCheckedIn');
      }
    });

    return (conn);

  } catch (err) {
    this._connectionsOut -= 1;
    if (this._enableStatistics) {
      this._totalFailedRequests += 1;
    }
    this.emit('_checkRequestQueue');
    throw err;
  }

}


//-----------------------------------------------------------------------------
// reconfigure()
//   Reconfigure the pool, change the value for given pool-properties.
//-----------------------------------------------------------------------------
async function reconfigure(options) {

  // check arguments
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(options));

  // reconfiguration can happen only when status is OPEN
  this._checkPoolOpen(false);

  if ((options.queueMax !== undefined) &&
      (typeof options.queueMax !== "number"))
    throw new Error(nodbUtil.getErrorMessage('NJS-004', "queueMax"));

  if ((options.queueTimeout !== undefined) &&
      (typeof options.queueTimeout !== "number"))
    throw new Error(nodbUtil.getErrorMessage('NJS-004', "queueTimeout"));

  if ((options.enableStatistics !== undefined) &&
      (typeof options.enableStatistics !== "boolean"))
    throw new Error(nodbUtil.getErrorMessage('NJS-004', "enableStatistics"));

  if ((options.resetStatistics !== undefined) &&
      (typeof options.resetStatistics != "boolean"))
    throw new Error(nodbUtil.getErrorMessage('NJS-004', "resetStatistics"));

  this._status = this._oracledb.POOL_STATUS_RECONFIGURING;
  try {
    // poolMin/poolMax/poolIncrement/poolPingInterval/poolTimeout/
    // poolMaxPerShard/stmtCacheSize/sodaMetaDataCache parameters
    await this._reconfigure(options);

    // pool JS parameters: queueMax, queueTimeout, enableStatistics,
    // resetStatistics

    // reset the statistics-metrics only if 'resetStatistics' is true or
    // 'enableStatistics' is being set to true
    if (options.resetStatistics == true || (options.enableStatistics == true &&
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
    this._status = this._oracledb.POOL_STATUS_OPEN;
  }
  this.emit('_checkRequestQueue');
}


//-----------------------------------------------------------------------------
// close()
//   Close the pool, optionally allowing for a period of time to pass for
// connections to "drain" from the pool.
//-----------------------------------------------------------------------------
async function close(a1) {
  let drainTime = 0;
  let forceClose = false;

  // check arguments
  nodbUtil.checkArgCount(arguments, 0, 1);
  if (arguments.length == 1) {

    // drain time must be a valid number; timeouts larger than a 32-bit signed
    // integer are not supported
    nodbUtil.assert(typeof a1 === 'number', 'NJS-005', 1);
    if (a1 < 0 || isNaN(a1) || a1 > 2 ** 31) {
      throw new Error(nodbUtil.getErrorMessage('NJS-005', 1));
    }

    // no need to worry about drain time if no connections are out!
    forceClose = true;
    if (this._connectionsOut > 0) {
      drainTime = a1 * 1000;
    }

  }

  // if the pool is draining/reconfiguring/closed, throw an appropriate error
  this._checkPoolOpen(false);

  // wait for the pool to become empty or for the drain timeout to expire
  // (whichever comes first)
  if (drainTime > 0) {
    this._status = this._oracledb.POOL_STATUS_DRAINING;
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

  // close the pool
  await this._close({forceClose: forceClose});
  this._status = this._oracledb.POOL_STATUS_CLOSED;
  this.emit('_afterPoolClose');

}


//-----------------------------------------------------------------------------
// logStatistics()
//  Method to print statistical related information and pool related
//  information when enableStatistics is set to true.
// NOTE: This function replaces the DEPRECATED _logStats() function
//-----------------------------------------------------------------------------
function logStatistics() {
  const stats = this.getStatistics();
  if (stats === null) {
    throw new Error(nodbUtil.getErrorMessage('NJS-083'));
  }
  stats.logStatistics();
}


//-----------------------------------------------------------------------------
// getStatistics()
//  Method to obtain a JSON object with all statistical metrics and pool
//  properties
//-----------------------------------------------------------------------------
function getStatistics() {
  this._checkPoolOpen(false);

  if (this._enableStatistics !== true) {
    return null;
  }
  return new PoolStatistics(this);
}


//-----------------------------------------------------------------------------
// _setup()
//   Sets up the pool instance with additional attributes used for logging
// statistics and managing the connection queue.
//-----------------------------------------------------------------------------
function _setup(poolAttrs, poolAlias, oracledb) {
  if (typeof poolAttrs.queueTimeout !== 'undefined') {
    this._queueTimeout = poolAttrs.queueTimeout;
  } else {
    this._queueTimeout = oracledb.queueTimeout;
  }

  if (typeof poolAttrs.queueMax !== 'undefined') {
    this._queueMax = poolAttrs.queueMax;
  } else {
    this._queueMax = oracledb.queueMax;
  }

  if (typeof poolAttrs.poolMaxPerShard !== 'undefined') {
    this.poolMaxPerShard = poolAttrs.poolMaxPerShard;
  }

  if (typeof poolAttrs.enableStatistics !== 'undefined') {
    this._enableStatistics = poolAttrs.enableStatistics;
  } else {
    this._enableStatistics = false;   // default statistics is disabled.
  }

  if (!this._enableStatistics) {
    // DEPRECATED property _enableStats.
    if (typeof poolAttrs._enableStats !== 'undefined') {
      this._enableStatistics = poolAttrs._enableStats;
    }
  }

  if (typeof poolAttrs.sessionCallback !== 'undefined') {
    if (typeof poolAttrs.sessionCallback === 'function' ||
        typeof poolAttrs.sessionCallback === 'string')
      this._sessionCallback = poolAttrs.sessionCallback;
  }

  // Properties - edition, events, externalAuth - values can be set globally
  // on oracledb and can be overridden at pool creation time.
  if (typeof poolAttrs.edition !== 'undefined') {
    this.edition = poolAttrs.edition;
  } else {
    this.edition = oracledb.edition;
  }

  if (typeof poolAttrs.events !== 'undefined') {
    this.events = poolAttrs.events;
  } else {
    this.events = oracledb.events;
  }

  if (typeof poolAttrs.externalAuth !== 'undefined') {
    this.externalAuth = poolAttrs.externalAuth;
  } else {
    this.externalAuth = oracledb.externalAuth;
  }

  // Properties - homogeneous, user, connectString - are NOT global properties
  if (typeof poolAttrs.homogeneous !== 'undefined') {
    this.homogeneous = poolAttrs.homogeneous;
  } else {
    this.homogeneous = true;
  }
  this.user = poolAttrs.user || poolAttrs.userName;
  this.connectString = poolAttrs.connectString || poolAttrs.connectionString;

  // register event handler for when request queue should be checked
  this.on('_checkRequestQueue', this._checkRequestQueue);

  // Using Object.defineProperties to add properties to the Pool instance with
  // special properties, such as enumerable but not writable.
  Object.defineProperties(
    this,
    {
      queueMax: { // maximum number of pending pool connections that can be queued
        enumerable: true,
        get: function() {
          return (this._queueMax);
        },
      },
      queueTimeout: { // milliseconds a connection request can spend in queue before being failed
        enumerable: true,
        get: function() {
          return (this._queueTimeout);
        },
      },
      _enableStats: { // DEPRECATED. true means pool stats will be recorded
        get: function() {
          return (this._enableStatistics);
        }
      },
      enableStatistics: { // true means pool stats will be recorded
        enumerable: true,
        get: function() {
          return (this._enableStatistics);
        }
      },
      _connectionsOut: { // number of connections checked out from the pool. Must be inc/dec in the main thread in JS
        value: 0,
        writable: true
      },
      _connRequestQueue: {
        value: [],
        writable: true
      },
      _status: {  // open/closing/closed
        value: oracledb.POOL_STATUS_OPEN,
        writable: true
      },
      poolAlias: {
        enumerable: true,
        get: function() {
          return (poolAlias);
        }
      },
      status: {  // open/closing/closed
        enumerable: true,
        get: function() {
          return (this._status);
        }
      },
      sessionCallback: {  // session callback
        enumerable: true,
        get: function() {
          return this._sessionCallback;
        }
      }
    }
  );

  this._resetStatistics();

}


//-----------------------------------------------------------------------------
// setAccessToken()
//   set parameters for token based authentication
//-----------------------------------------------------------------------------
async function setAccessToken(options) {
  // check arguments
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(nodbUtil.isObject(options), 'NJS-005', 1);
  await this._setAccessToken(options);
}


class Pool extends EventEmitter {

  _extend(oracledb) {
    this._oracledb = oracledb;
    this._setup = _setup;
    this._checkRequestQueue = _checkRequestQueue;
    this.close = nodbUtil.callbackify(close);
    this.getConnection = nodbUtil.callbackify(getConnection);
    this.reconfigure = nodbUtil.callbackify(reconfigure);
    this.setAccessToken = nodbUtil.callbackify(setAccessToken);
    this.logStatistics = logStatistics;
    this.getStatistics = getStatistics;
    this.terminate = this.close;
    this._queueMax = 0;
    this._queueTimeout = 0;
    this._enableStatistics = false;
    this._timeOfReset = this._createdDate = Date.now();
    this._sessionCallback = undefined;

    // DEPRECATED alias
    this._logStats = this.logStatistics;
  }

  // check if pool is draining/reconfiguring/closed and throw an
  // appropriate error
  _checkPoolOpen(ignoreReconfiguring) {
    // if already in reconfiguring status, nothing to do.
    if (this.status === this._oracledb.POOL_STATUS_DRAINING) {
      throw new Error(nodbUtil.getErrorMessage('NJS-064'));
    } else if (this.status === this._oracledb.POOL_STATUS_CLOSED) {
      throw new Error(nodbUtil.getErrorMessage('NJS-065'));
    } else if (!ignoreReconfiguring) {
      if (this.status === this._oracledb.POOL_STATUS_RECONFIGURING) {
        throw new Error(nodbUtil.getErrorMessage('NJS-082'));
      }
    }
  }

  // temporary method for determining if an object is a date until
  // napi_is_date() can be used (when Node-API v5 can be used)
  _isDate(val) {
    return (util.isDate(val));
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
    this._maximumQueueLength = this._connRequestQueue.length;
    this._totalTimeInQueue = 0;
    this._minTimeInQueue = 0;
    this._maxTimeInQueue = 0;
  }


  // update pool wait statistics after a connect request has spent some time in
  // the queue
  _updateWaitStatistics(payload) {
    const waitTime = Date.now() - payload.enqueuedTime;
    this._totalTimeInQueue += waitTime;
    if (this._minTimeInQueue === 0) {
      this._minTimeInQueue = waitTime;
    } else {
      this._minTimeInQueue = Math.min(this._minTimeInQueue, waitTime);
    }
    this._maxTimeInQueue = Math.max(this._maxTimeInQueue, waitTime);
  }

}


module.exports = Pool;
