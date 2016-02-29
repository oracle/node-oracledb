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

var connection = require('./connection.js');

// completeConnectionRequest does the actual work of getting a connection from a
// pool when queuing is enabled. It's abstracted out so it can be called from
// getConnection and checkRequestQueue constently.
function completeConnectionRequest(getConnectionCb) {
  var self = this;

  // Incrementing _connectionsOut prior to making the async call to get a connection
  // to prevent other connection requests from exceeding the poolMax.
  self._connectionsOut += 1;

  self._getConnection(function(err, connInst) {
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

    connection.extend(connInst, self);

    getConnectionCb(undefined, connInst);
  });
}

// Requests for connections from pools are queued by default (can be overridden
// by setting the poolAttrs property queueRequests to false). checkRequestQueue
// determines when requests for connections should be completed and cancels any
// timeout that may have been associated with the request.
function checkRequestQueue() {
  var self = this;
  var payload;
  var waitTime;

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

    self._connRequestTimersMap[payload.timerIdx] = null;
    payload.timeoutHandle = null;
    payload.timerIdx = null;
  }

  completeConnectionRequest.call(self, payload.getConnectionCb);
}

// onConnectionRelease contains the logic that should be executed when a connection
// that was obtained from a pool is released back to the pool.
function onConnectionRelease() {
  var self = this;

  self._connectionsOut -= 1;

  checkRequestQueue.call(self);
}

// onRequestTimeout is used to prevent requests for connections from sitting in the
// queue for too long. The number of milliseconds can be set via queueTimeout
// property of the poolAttrs used when creating a pool.
function onRequestTimeout(timerIdx) {
  var self = this;
  var payloadToDequeue = self._connRequestTimersMap[timerIdx];
  var requestIndex;

  if (payloadToDequeue) {
    if (self._enableStats) {
      self._totalRequestTimeouts += 1;
      self._totalTimeInQueue += Date.now() - payloadToDequeue.enqueuedTime;
    }

    requestIndex = self._connRequestQueue.indexOf(payloadToDequeue);

    self._connRequestQueue.splice(requestIndex, 1);
    self._connRequestTimersMap[timerIdx] = null;

    payloadToDequeue.getConnectionCb(new Error('NJS-040: connection request timeout'));
  }
}

// This getConnection function is used the override the getConnection method of the
// Pool class, which is defined in the C layer. The method will proxy requests
// directly to the C layer if queueing is disabled. If queueing is enabled and the
// connections out is under the poolMax then the request will be completed immediately.
// Otherwise the request will be queued and completed when a connection is avaialble.
function getConnection(getConnectionCb) {
  var self = this;
  var payload;
  var timeoutHandle;
  var timerIdx;

  // Added this check because if the pool isn't valid and we reference self.poolMax
  // (which is a C layer getter) an error will be thrown.
  if (!self._isValid) {
    if (getConnectionCb && typeof getConnectionCb === 'function') {
      getConnectionCb(new Error('NJS-002: invalid pool'));
      return;
    } else {
      throw new Error('NJS-002: invalid pool');
    }
  }

  if (self._enableStats) {
    self._totalConnectionRequests += 1;
  }

  if (self.queueRequests === false) { // queueing is disabled for pool
    if (self._enableStats) {
      self._getConnection(function(err, connInst) {
        if (err) {
          self._totalFailedRequests += 1;

          getConnectionCb(err);

          return;
        }

        getConnectionCb(null, connInst);
      });
    } else {
      self._getConnection(getConnectionCb);
    }
  } else if (self._connectionsOut < self.poolMax) { // queueing enabled, but not needed
    completeConnectionRequest.call(self, getConnectionCb);
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
      getConnectionCb: getConnectionCb
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


function terminate(terminateCb) {
  var self = this;

  self._terminate(function(err) {
    if (!err) {
      self._isValid = false;
    }

    terminateCb(err);
  });
}

// logStats is used to add a hidden method (_logStats) to each pool instance. This
// provides an easy way to log out the statistics related information that's collected
// when _enableStats is set to true when creating a pool. This functionality may
// be altered or enhanced in the future.
function logStats() {
  var self = this;
  var averageTimeInQueue;
  
  if (!self._isValid) {
    console.log('_logStats must be called prior to terminating pool.');
    return;
  }

  if (self._enableStats !== true) {
    console.log('Pool statistics not enabled');
    return;
  }

  averageTimeInQueue = 0;

  if (self.queueRequests && self._totalRequestsEnqueued !== 0) {
    averageTimeInQueue = Math.round(self._totalTimeInQueue/self._totalRequestsEnqueued);
  }

  console.log('\nPool statistics:');
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
  console.log('...queueRequests:', self.queueRequests);
  console.log('...queueTimeout (milliseconds):', self.queueTimeout);
  console.log('...poolMin:', self.poolMin);
  console.log('...poolMax:', self.poolMax);
  console.log('...poolIncrement:', self.poolIncrement);
  console.log('...poolTimeout:', self.poolTimeout);
  console.log('...stmtCacheSize:', self.stmtCacheSize);
  console.log('Related environment variables:');
  console.log('...process.env.UV_THREADPOOL_SIZE:', process.env.UV_THREADPOOL_SIZE);
}

// The extend method is used to extend Pool instances from the C layer with custom
// properties, methods, and method overrides. References to the original methods are
// maintained so they can be invoked by the overriding method at the right time.
function extend(pool, poolAttrs, oracledb) {
  var queueRequests;
  var queueTimeout;

  if (typeof poolAttrs.queueRequests !== 'undefined') {
    queueRequests = poolAttrs.queueRequests;
  } else {
    queueRequests = oracledb.queueRequests;
  }

  if (typeof poolAttrs.queueTimeout !== 'undefined') {
    queueTimeout = poolAttrs.queueTimeout;
  } else {
    queueTimeout = oracledb.queueTimeout;
  }

  // Using Object.defineProperties to add properties to the Pool instance with special
  // properties, such as enumerable but not writable.
  Object.defineProperties(
    pool,
    {
      queueRequests: {
        value: queueRequests, // true will queue requests when conn pool is maxed out
        enumerable: true
      },
      queueTimeout: {
        value: queueTimeout, // milliseconds a connection request can spend in queue before being failed
        enumerable: true
      },
      _isValid: { // used to ensure operations are not done after terminate
        value: true,
        writable: true
      },
      _enableStats: { // true means pool stats will be recorded
        value: poolAttrs._enableStats === true
      },
      _logStats: { // output pool stats
        value: logStats
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
      _onConnectionRelease: {
        value: onConnectionRelease
      },
      _getConnection: {
        value: pool.getConnection
      },
      getConnection: {
        value: getConnection,
        enumerable: true,
        writable: true
      },
      _terminate: {
        value: pool.terminate
      },
      terminate: {
        value: terminate,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
