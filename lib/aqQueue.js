// Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved

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

const nodbUtil = require('./util.js');

//-----------------------------------------------------------------------------
// deqOne
//   Returns a single message from the queue, if one is available.
//-----------------------------------------------------------------------------
function deqOne(cb) {
  nodbUtil.checkAsyncArgs(arguments, 1, 1);
  this._deqOne(cb);
}


//-----------------------------------------------------------------------------
// deqMany
//   Returns an array of messages from the queue, up to the maximum specified,
// if any are available.
//----------------------------------------------------------------------------
function deqMany(maxMessages, cb) {
  nodbUtil.checkAsyncArgs(arguments, 2, 2);
  nodbUtil.assert(typeof maxMessages === 'number', 'NJS-005', 1);

  this._deqMany(maxMessages, cb);
}


//-----------------------------------------------------------------------------
// enqOne
//   Enqueues a single message into the queue.
//-----------------------------------------------------------------------------
function enqOne(message, cb) {
  nodbUtil.checkAsyncArgs(arguments, 2, 2);
  nodbUtil.assert(typeof message === 'object' || typeof message === 'string',
    'NJS-005', 1);

  this._enqOne(message, cb);
}


//-----------------------------------------------------------------------------
// enqMany
//   Returns an array of messages from the queue, up to the maximum specified,
// if any are available.
//----------------------------------------------------------------------------
function enqMany(messages, cb) {
  nodbUtil.checkAsyncArgs(arguments, 2, 2);
  nodbUtil.assert(Array.isArray(messages), 'NJS-005', 1);

  this._enqMany(messages, cb);
}


class AqQueue {

  _extend(oracledb) {
    this.deqOne = nodbUtil.promisify(oracledb, deqOne);
    this.deqMany = nodbUtil.promisify(oracledb, deqMany);
    this.enqOne = nodbUtil.promisify(oracledb, enqOne);
    this.enqMany = nodbUtil.promisify(oracledb, enqMany);
  }

}

module.exports = AqQueue;
