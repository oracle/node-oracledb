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
const nodbUtil = require('./util.js');
const util = require('util');

// completeConnectionRequest does the actual work of getting a connection from
// a pool. It's abstracted out so it can be called from getConnection and
// checkRequestQueue consistently.
function completeConnectionRequest(config, getConnectionCb) {
  const self = this;

  // Incrementing _connectionsOut prior to making the async call to get a connection
  // to prevent other connection requests from exceeding the poolMax.
  self._connectionsOut += 1;

  self._getConnection(config, function(err, connInst, newSession) {
    if (err) {
      // Decrementing _connectionsOut if we didn't actually get a connection
      // and then rechecking the queue.
      self._connectionsOut -= 1;

      if (self._enableStats) {
        self._totalFailedRequests += 1;
      }

      process.nextTick(function() {
        checkRequestQueue.call(self);
      });

      getConnectionCb(err);

      return;
    }

    connInst.on('_after_close', function() {
      self._connectionsOut -= 1;
      if (self._connectionsOut == 0 && self._closeCb)
        self._closeCb();

      checkRequestQueue.call(self);
    });

    // Invoke tag fixup callback method if one has been specified and
    // the actual tag on the connection doesn't match the one
    // requested, or the connection is freshly created.
    let requestedTag = config.tag || "";
    if (typeof self.sessionCallback === 'function' &&
        (newSession || connInst.tag != requestedTag)) {
      self.sessionCallback(connInst, requestedTag,
        function(err) {
          if (err) {
            connInst.close({drop: true}, function() {
              getConnectionCb(err);
            });
            return;
          }
          getConnectionCb(null, connInst);
        }
      );

    // otherwise, simply invoke the user's callback immediately
    } else {
      getConnectionCb(null, connInst);
    }
  });
}

// Requests for connections from pools are queued. checkRequestQueue determines
// when requests for connections should be completed and cancels any timeout
// that may have been associated with the request.
function checkRequestQueue() {
  const self = this;
  let payload;
  let waitTime;

  if (self._connRequestQueue.length === 0 || self._connectionsOut === self.poolMax) {
    return; // no need to do any work
  }

  payload = self._connRequestQueue.shift();

  if (self._enableStats) {
    self._totalRequestsDequeued += 1;

    waitTime = Date.now() - payload.enqueuedTime;

    self._totalTimeInQueue += waitTime;
    self._minTimeInQueue = Math.min(self._minTimeInQueue, waitTime);
    self._maxTimeInQueue = Math.max(self._maxTimeInQueue, waitTime);
  }

  if (self._usingQueueTimeout) {
    clearTimeout(payload.timeoutHandle);

    delete self._connRequestTimersMap[payload.timerIdx];
    payload.timeoutHandle = null;
    payload.timerIdx = null;
  }

  completeConnectionRequest.call(self, payload.config,
    payload.getConnectionCb);
}

// onRequestTimeout is used to prevent requests for connections from sitting in the
// queue for too long. The number of milliseconds can be set via queueTimeout
// property of the poolAttrs used when creating a pool.
function onRequestTimeout(timerIdx) {
  const self = this;
  let payloadToDequeue = self._connRequestTimersMap[timerIdx];
  let requestIndex;

  if (payloadToDequeue) {
    if (self._enableStats) {
      self._totalRequestTimeouts += 1;
      self._totalTimeInQueue += Date.now() - payloadToDequeue.enqueuedTime;
    }

    requestIndex = self._connRequestQueue.indexOf(payloadToDequeue);

    self._connRequestQueue.splice(requestIndex, 1);
    delete self._connRequestTimersMap[timerIdx];

    payloadToDequeue.getConnectionCb(new Error(nodbUtil.getErrorMessage('NJS-040', self.queueTimeout)));
  }
}

// This function gets a connection from the pool. If there are fewer
// connections out than the poolMax setting, then the request will return
// immediately; otherwise, the request will be queued for up to queueTimeout
// milliseconds.
function getConnection(a1, a2) {
  const self = this;
  let payload;
  let timeoutHandle;
  let timerIdx;
  let poolMax;
  let getConnectionCb;
  let options = {};

  nodbUtil.checkAsyncArgs(arguments, 1, 2);
  switch (arguments.length) {
    case 1:
      getConnectionCb = a1;
      break;
    case 2:
      nodbUtil.assert(nodbUtil.isObject(a1), 'NJS-005', 1);
      options = a1;
      getConnectionCb = a2;
      break;
  }

  if (self.status === self._oracledb.POOL_STATUS_DRAINING) {  // closing soon
    getConnectionCb(new Error(nodbUtil.getErrorMessage('NJS-064')));
    return;
  } else if (self.status === self._oracledb.POOL_STATUS_CLOSED) {
    getConnectionCb(new Error(nodbUtil.getErrorMessage('NJS-065')));
    return;
  }

  if (self._enableStats) {
    self._totalConnectionRequests += 1;
  }

  // getting the poolMax setting on the pool may fail if the pool is no longer
  // valid
  try {
    poolMax = self.poolMax;
  } catch (err) {
    getConnectionCb(err);
    if (self._enableStats) {
      self._totalFailedRequests += 1;
    }
    return;
  }

  if (self._connectionsOut < poolMax) {
    completeConnectionRequest.call(self, options, getConnectionCb);
  } else { // need to queue the request
    if (self._usingQueueTimeout) {
      self._connRequestTimersIdx += 1;
      timerIdx = self._connRequestTimersIdx;

      timeoutHandle = setTimeout(
        function() {
          onRequestTimeout.call(self, timerIdx);
        },
        self.queueTimeout
      );
    }

    payload = {
      timerIdx: timerIdx,
      timeoutHandle: timeoutHandle,
      getConnectionCb: getConnectionCb,
      config : options
    };

    if (self._usingQueueTimeout) {
      self._connRequestTimersMap[timerIdx] = payload;
    }

    self._connRequestQueue.push(payload);

    if (self._enableStats) {
      payload.enqueuedTime = Date.now();
      self._totalRequestsEnqueued += 1;
      self._maxQueueLength = Math.max(self._maxQueueLength, self._connRequestQueue.length);
    }
  }
}


function close(a1, a2) {
  const upperLimitTimeout = 2147483647;
  const self = this;
  let forceClose;
  let drainTime;
  let timeoutCb;
  let closeCb;

  nodbUtil.checkArgCount(arguments, 1, 2);

  switch (arguments.length) {
    case 1:
      nodbUtil.assert(typeof a1 === 'function', 'NJS-005', 1);
      closeCb = a1;
      drainTime = 0;
      forceClose = false;
      break;
    case 2:
      nodbUtil.assert(typeof a1 === 'number', 'NJS-005', 1);
      nodbUtil.assert(typeof a2 === 'function', 'NJS-005', 2);
      closeCb = a2;
      forceClose = true;

      // If connectionsOut is === 0, closePool is called right away, as there is no need to wait at all.
      drainTime = self._connectionsOut === 0 ? 0 : a1 * 1000;  // a1 represents seconds of time

      // SetTimeout does not accept numbers greater than a 32-bit signed integer.
      if (drainTime < 0 || isNaN(drainTime) || drainTime > upperLimitTimeout) {
        closeCb(new Error(nodbUtil.getErrorMessage('NJS-005', 1)));
        return;
      }
      break;
  }

  if (self.status === self._oracledb.POOL_STATUS_DRAINING) {  // already closing soon
    closeCb(new Error(nodbUtil.getErrorMessage('NJS-064')));
    return;
  } else if (self.status === self._oracledb.POOL_STATUS_CLOSED) {
    closeCb(new Error(nodbUtil.getErrorMessage('NJS-065')));
    return;
  }

  // create function which will be called when the drain time has expired or
  // when all of the connections have been released back to the pool
  self._closeCb = function() {
    self._close({forceClose : forceClose}, function(err) {
      if (!err) {
        self._status = self._oracledb.POOL_STATUS_CLOSED;
        self.emit('_after_close', self);
      }
      self._closeCb = undefined;
      if (timeoutCb)
        clearTimeout(timeoutCb);
      closeCb(err);
    });
  };

  if (forceClose) {
    self._status = self._oracledb.POOL_STATUS_DRAINING;
  }
  if (drainTime === 0) {
    self._closeCb();
  } else {
    timeoutCb = setTimeout(self._closeCb, drainTime);
  }

}


// logStats is used to add a hidden method (_logStats) to each pool instance.
// This provides an easy way to log out the statistics related information
// that's collected when _enableStats is set to true when creating a pool. This
// functionality may be altered or enhanced in the future.
function logStats() {
  const self = this;
  let averageTimeInQueue;

  if (self.status === self._oracledb.POOL_STATUS_CLOSED) {
    throw new Error(nodbUtil.getErrorMessage('NJS-065'));
  }

  if (self._enableStats !== true) {
    console.log('Pool statistics not enabled');
    return;
  }

  averageTimeInQueue = 0;

  if (self._totalRequestsEnqueued !== 0) {
    averageTimeInQueue = Math.round(self._totalTimeInQueue/self._totalRequestsEnqueued);
  }

  console.log('\nPool statistics:');
  console.log('...total up time (milliseconds):', Date.now() - self._createdDate);
  console.log('...total connection requests:', self._totalConnectionRequests);
  console.log('...total requests enqueued:', self._totalRequestsEnqueued);
  console.log('...total requests dequeued:', self._totalRequestsDequeued);
  console.log('...total requests failed:', self._totalFailedRequests);
  console.log('...total request timeouts:', self._totalRequestTimeouts);
  console.log('...max queue length:', self._maxQueueLength);
  console.log('...sum of time in queue (milliseconds):', self._totalTimeInQueue);
  console.log('...min time in queue (milliseconds):', self._minTimeInQueue);
  console.log('...max time in queue (milliseconds):', self._maxTimeInQueue);
  console.log('...avg time in queue (milliseconds):', averageTimeInQueue);
  console.log('...pool connections in use:', self.connectionsInUse);
  console.log('...pool connections open:', self.connectionsOpen);
  console.log('Related pool attributes:');
  console.log('...poolAlias:', self.poolAlias);
  console.log('...queueTimeout (milliseconds):', self.queueTimeout);
  console.log('...poolMin:', self.poolMin);
  console.log('...poolMax:', self.poolMax);
  console.log('...poolIncrement:', self.poolIncrement);
  console.log('...poolTimeout (seconds):', self.poolTimeout);
  console.log('...poolPingInterval:', self.poolPingInterval);
  console.log('...sessionCallback:',
    typeof self.sessionCallback === 'function' ? self.sessionCallback.name :
      (typeof self.sessionCallback === 'string' ? '"' + self.sessionCallback + '"' : self.sessionCallback));
  console.log('...stmtCacheSize:', self.stmtCacheSize);
  console.log('Pool status:');
  console.log('...status:', self.status);
  console.log('Related environment variables:');
  console.log('...process.env.UV_THREADPOOL_SIZE:', process.env.UV_THREADPOOL_SIZE);
}

// sets up the instance with additional attributes used for logging statistics
// and managing the connection queue
function setup(poolAttrs, poolAlias, oracledb) {
  const self = this;
  let queueTimeout;

  if (typeof poolAttrs.queueTimeout !== 'undefined') {
    queueTimeout = poolAttrs.queueTimeout;
  } else {
    queueTimeout = oracledb.queueTimeout;
  }

  // Using Object.defineProperties to add properties to the Pool instance with
  // special properties, such as enumerable but not writable.
  Object.defineProperties(
    self,
    {
      queueTimeout: { // milliseconds a connection request can spend in queue before being failed
        enumerable: true,
        get: function() {
          return queueTimeout;
        }
      },
      _closeCb: { // performs close when drainTime expires or connections closed
        writable: true
      },
      _enableStats: { // true means pool stats will be recorded
        value: poolAttrs._enableStats === true
      },
      _logStats: { // output pool stats
        value: logStats
      },
      _createdDate: {
        value: Date.now()
      },
      _totalConnectionRequests: { // total number of pool.getConnection requests
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
      _usingQueueTimeout: {
        value: queueTimeout !== 0
      },
      _connectionsOut: { // number of connections checked out from the pool. Must be inc/dec in the main thread in JS
        value: 0,
        writable: true
      },
      _connRequestQueue: {
        value: [],
        writable: true
      },
      _connRequestTimersIdx: {
        value: 0,
        writable: true
      },
      _connRequestTimersMap: {
        value: {},
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
    this._setup = setup;
    this.close = nodbUtil.promisify(oracledb, close);
    this.getConnection = nodbUtil.promisify(oracledb, getConnection);
    this.terminate = this.close;
  }

  // temporary method for determining if an object is a date until
  // napi_is_date() can be used (when N-API v5 can be used)
  _isDate(val) {
    return util.isDate(val);
  }

}


module.exports = Pool;
