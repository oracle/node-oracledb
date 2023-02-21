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

const errors = require('./errors.js');
const nodbUtil = require('./util.js');

class AqQueue {

  _getConnection() {
    return this._connection;
  }

  //---------------------------------------------------------------------------
  // deqOne()
  //
  // Returns a single message from the queue, if one is available.
  //---------------------------------------------------------------------------
  async deqOne() {
    errors.assertArgCount(arguments, 0, 0);
    return await this._deqOne();
  }

  //---------------------------------------------------------------------------
  // deqMany()
  //
  // Returns an array of messages from the queue, up to the maximum specified,
  // if any are available.
  //----------------------------------------------------------------------------
  async deqMany(maxMessages) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof maxMessages === 'number', 1);
    return await this._deqMany(maxMessages);
  }

  //---------------------------------------------------------------------------
  // enqOne()
  //
  // Enqueues a single message into the queue.
  //---------------------------------------------------------------------------
  async enqOne(message) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(typeof message === 'object' ||
      typeof message === 'string', 1);
    return await this._enqOne(message);
  }

  //---------------------------------------------------------------------------
  // enqMany()
  //
  // Enqueues multiple messages into the queue at the same time, avoiding
  // multiple round-trips.
  //----------------------------------------------------------------------------
  async enqMany(messages) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Array.isArray(messages), 1);
    return await this._enqMany(messages);
  }

}

nodbUtil.wrap_fns(AqQueue.prototype,
  "deqOne",
  "deqMany",
  "enqOne",
  "enqMany");

module.exports = AqQueue;
