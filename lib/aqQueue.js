// Copyright (c) 2019, 2022, Oracle and/or its affiliates.

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
// deqOne()
//   Returns a single message from the queue, if one is available.
//-----------------------------------------------------------------------------
async function deqOne() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._deqOne();
}


//-----------------------------------------------------------------------------
// deqMany()
//   Returns an array of messages from the queue, up to the maximum specified,
// if any are available.
//----------------------------------------------------------------------------
async function deqMany(maxMessages) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(typeof maxMessages === 'number', 'NJS-005', 1);
  return await this._deqMany(maxMessages);
}


//-----------------------------------------------------------------------------
// enqOne()
//   Enqueues a single message into the queue.
//-----------------------------------------------------------------------------
async function enqOne(message) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(typeof message === 'object' || typeof message === 'string',
    'NJS-005', 1);
  return await this._enqOne(message);
}


//-----------------------------------------------------------------------------
// enqMany()
//   Enqueues multiple messages into the queue at the same time, avoiding
// multiple round-trips.
//----------------------------------------------------------------------------
async function enqMany(messages) {
  nodbUtil.checkArgCount(arguments, 1, 1);
  nodbUtil.assert(Array.isArray(messages), 'NJS-005', 1);
  return await this._enqMany(messages);
}


class AqQueue {

  _extend() {
    this.deqOne = nodbUtil.callbackify(nodbUtil.serialize(deqOne));
    this.deqMany = nodbUtil.callbackify(nodbUtil.serialize(deqMany));
    this.enqOne = nodbUtil.callbackify(nodbUtil.serialize(enqOne));
    this.enqMany = nodbUtil.callbackify(nodbUtil.serialize(enqMany));
  }

  _getConnection() {
    return this._connection;
  }

}

module.exports = AqQueue;
