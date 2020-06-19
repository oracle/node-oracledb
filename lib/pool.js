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

const EventEmitter = require('events');
const nodbUtil = require('./util.js');
const util = require('util');

//-----------------------------------------------------------------------------
// _checkRequestQueue()
//   When a connection is returned to the pool, this method is called (via an
// event handler) to determine when requests for connections should be
// completed and cancels any timeout that may have been associated with the
// request.
//-----------------------------------------------------------------------------
function _checkRequestQueue() {

  // nothing to do if no requests are in the queue or the pool is still full
  if (this._connRequestQueue.length === 0 ||
      this._connectionsOut >= this.poolMax) {
    return;
  }

  // process the payload
  const payload = this._connRequestQueue.shift();
  if (this._enableStats) {
    this._totalRequestsDequeued += 1;
    const waitTime = Date.now() - payload.enqueuedTime;
    this._totalTimeInQueue += waitTime;
    this._minTimeInQueue = Math.min(this._minTimeInQueue, waitTime);
    this._maxTimeInQueue = Math.max(this._maxTimeInQueue, waitTime);
  }
  if (payload.timeoutHandle) {
    clearTimeout(payload.timeoutHandle);
  }

  // inform the waiter that processing can continue
  payload.resolve();

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

  // if pool is draining or closed, throw an appropriate error
  this._checkPoolOpen();

  // manage stats, if applicable
  if (this._enableStats) {
    this._totalConnectionRequests += 1;
  }

  // getting the poolMax setting on the pool may fail if the pool is no longer
  // valid
  try {
    poolMax = this.poolMax;
  } catch (err) {
    if (this._enableStats) {
      this._totalFailedRequests += 1;
    }
    throw err;
  }

  if (this._connectionsOut >= poolMax) {

    // when the queue is huge, throw error early without waiting for queue timeout
    if (this._connRequestQueue.length >= this.queueMax && this.queueMax >= 0) {
      if (this._enableStats) {
        this._totalRequestsRejected += 1;
      }
      throw new Error(nodbUtil.getErrorMessage('NJS-076', this.queueMax));
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
          if (this._enableStats) {
            this._totalRequestTimeouts += 1;
            this._totalTimeInQueue += Date.now() - payload.enqueuedTime;
          }
          reject(new Error(nodbUtil.getErrorMessage('NJS-040',
            this.queueTimeout)));
        }, this.queueTimeout);
      }

      // add payload to the queue
      this._connRequestQueue.push(payload);
      if (this._enableStats) {
        payload.enqueuedTime = Date.now();
        this._totalRequestsEnqueued += 1;
        this._maxQueueLength = Math.max(this._maxQueueLength,
          this._connRequestQueue.length);
      }

    });

    // check if pool is draining or closed after delay has completed and throw
    // an appropriate error if so
    this._checkPoolOpen();

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
    conn.on('_after_close', () => {
      this._connectionsOut -= 1;
      this.emit('_checkRequestQueue');
      if (this._connectionsOut == 0) {
        this.emit('_allCheckedIn');
      }
    });

    return conn;

  } catch (err) {
    this._connectionsOut -= 1;
    if (this._enableStats) {
      this._totalFailedRequests += 1;
    }
    this.emit('_checkRequestQueue');
    throw err;
  }

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

  // check status of pool; if pool is already being drained or is already
  // closed, raise an appropriate error
  this._checkPoolOpen();

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
  this.emit('_after_close');

}


//-----------------------------------------------------------------------------
// _logStats()
//   Hidden method that provides an easy way to log out the statistics related
// information that's collected when _enableStats is set to true when creating
// a pool. This functionality may be altered or enhanced in the future.
//-----------------------------------------------------------------------------
function _logStats() {
  let averageTimeInQueue;

  if (this.status === this._oracledb.POOL_STATUS_CLOSED) {
    throw new Error(nodbUtil.getErrorMessage('NJS-065'));
  }

  if (this._enableStats !== true) {
    console.log('Pool statistics not enabled');
    return;
  }

  averageTimeInQueue = 0;

  if (this._totalRequestsEnqueued !== 0) {
    averageTimeInQueue = Math.round(this._totalTimeInQueue/this._totalRequestsEnqueued);
  }

  console.log('\nPool statistics:');
  console.log('...total up time (milliseconds):', Date.now() - this._createdDate);
  console.log('...total connection requests:', this._totalConnectionRequests);
  console.log('...total requests enqueued:', this._totalRequestsEnqueued);
  console.log('...total requests dequeued:', this._totalRequestsDequeued);
  console.log('...total requests failed:', this._totalFailedRequests);
  console.log('...total requests exceeding queueMax:', this._totalRequestsRejected);
  console.log('...total request timeouts:', this._totalRequestTimeouts);
  console.log('...max queue length:', this._maxQueueLength);
  console.log('...sum of time in queue (milliseconds):', this._totalTimeInQueue);
  console.log('...min time in queue (milliseconds):', this._minTimeInQueue);
  console.log('...max time in queue (milliseconds):', this._maxTimeInQueue);
  console.log('...avg time in queue (milliseconds):', averageTimeInQueue);
  console.log('...pool connections in use:', this.connectionsInUse);
  console.log('...pool connections open:', this.connectionsOpen);
  console.log('Pool attributes:');
  console.log('...poolAlias:', this.poolAlias);
  console.log('...queueMax:', this.queueMax);
  console.log('...queueTimeout (milliseconds):', this.queueTimeout);
  console.log('...poolMin:', this.poolMin);
  console.log('...poolMax:', this.poolMax);
  console.log('...poolIncrement:', this.poolIncrement);
  console.log('...poolTimeout (seconds):', this.poolTimeout);
  console.log('...poolPingInterval:', this.poolPingInterval);
  console.log('...sessionCallback:',
    typeof this.sessionCallback === 'function' ? this.sessionCallback.name :
      (typeof this.sessionCallback === 'string' ? '"' + this.sessionCallback + '"' : this.sessionCallback));
  console.log('...stmtCacheSize:', this.stmtCacheSize);
  console.log('Pool status:');
  console.log('...status:', this.status);
  console.log('Related environment variables:');
  console.log('...process.env.UV_THREADPOOL_SIZE:', process.env.UV_THREADPOOL_SIZE);
}


//-----------------------------------------------------------------------------
// _setup()
//   Sets up the pool instance with additional attributes used for logging
// statistics and managing the connection queue.
//-----------------------------------------------------------------------------
function _setup(poolAttrs, poolAlias, oracledb) {
  let queueMax;
  let queueTimeout;

  if (typeof poolAttrs.queueTimeout !== 'undefined') {
    queueTimeout = poolAttrs.queueTimeout;
  } else {
    queueTimeout = oracledb.queueTimeout;
  }

  if (typeof poolAttrs.queueMax !== 'undefined') {
    queueMax = poolAttrs.queueMax;
  } else {
    queueMax = oracledb.queueMax;
  }

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
          return queueMax;
        }
      },
      queueTimeout: { // milliseconds a connection request can spend in queue before being failed
        enumerable: true,
        get: function() {
          return queueTimeout;
        }
      },
      _enableStats: { // true means pool stats will be recorded
        value: poolAttrs._enableStats === true
      },
      _logStats: { // output pool stats
        value: _logStats
      },
      _createdDate: {
        value: Date.now()
      },
      _totalConnectionRequests: { // total number of pool.getConnection requests
        value: 0,
        writable: true
      },
      _totalRequestsRejected: { // number of pool.getConnection requests rejected because the queue length exceeded queueMax
        value: 0,
        writable: true
      },
      _totalRequestsEnqueued: { // number of pool.getConnection requests added to queue
        value: 0,
        writable: true
      },
      _totalRequestsDequeued: { // number of pool.getConnection requests removed from queue because a pool connection became available
        value: 0,
        writable: true
      },
      _totalFailedRequests: { // number of pool.getConnection requests that failed at the C layer
        value: 0,
        writable: true
      },
      _totalRequestTimeouts: { // number of queued pool.getConnection requests that timed out without being satisfied
        value: 0,
        writable: true
      },
      _totalTimeInQueue: { // sum of time in milliseconds that all pool.getConnection requests spent in the queue
        value: 0,
        writable: true
      },
      _maxQueueLength: { // maximum length of pool queue
        value: 0,
        writable: true
      },
      _minTimeInQueue: { // shortest amount of time (milliseconds) that any pool.getConnection request spent in queue
        value: 0,
        writable: true
      },
      _maxTimeInQueue: { // longest amount of time (milliseconds) that any pool.getConnection request spent in queue
        value: 0,
        writable: true
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
          return poolAlias;
        }
      },
      status: {  // open/closing/closed
        enumerable: true,
        get: function() {
          return this._status;
        }
      },
      sessionCallback: {  // session callback
        enumerable: true,
        get: function() {
          return poolAttrs.sessionCallback;
        }
      }
    }
  );
}


class Pool extends EventEmitter {

  _extend(oracledb) {
    this._oracledb = oracledb;
    this._setup = _setup;
    this._checkRequestQueue = _checkRequestQueue;
    this.close = nodbUtil.callbackify(close);
    this.getConnection = nodbUtil.callbackify(getConnection);
    this.terminate = this.close;
  }

  // check if pool is draining or closed and throw an appropriate error if so
  _checkPoolOpen() {
    if (this.status === this._oracledb.POOL_STATUS_DRAINING) {
      throw new Error(nodbUtil.getErrorMessage('NJS-064'));
    } else if (this.status === this._oracledb.POOL_STATUS_CLOSED) {
      throw new Error(nodbUtil.getErrorMessage('NJS-065'));
    }
  }

  // temporary method for determining if an object is a date until
  // napi_is_date() can be used (when N-API v5 can be used)
  _isDate(val) {
    return util.isDate(val);
  }

}


module.exports = Pool;
