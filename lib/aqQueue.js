// Copyright (c) 2019, 2023, Oracle and/or its affiliates.

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

const { Buffer } = require('buffer');
const constants = require('./constants.js');
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const AqDeqOptions = require('./aqDeqOptions.js');
const AqEnqOptions = require('./aqEnqOptions.js');
const AqMessage = require('./aqMessage.js');
const BaseDbObject = require('./dbObject.js');

class AqQueue {

  //---------------------------------------------------------------------------
  // _isPayload()
  //
  // Returns a boolean indicating if the value is a valid payload.
  //---------------------------------------------------------------------------
  _isPayload(value) {
    return (typeof value === 'string' || Buffer.isBuffer(value) ||
        value instanceof BaseDbObject);
  }

  //---------------------------------------------------------------------------
  // _verifyMessage()
  //
  // Messages that can be enqueued must be a string, Buffer or database object
  // (in which case all message properties are defaulted) or an object
  // containing a "payload" property along with the other properties to use
  // during the enqueue. A normalized object is returned.
  //---------------------------------------------------------------------------
  _verifyMessage(message) {

    // validate we have a payload of the correct type
    let payload;
    if (this._isPayload(message)) {
      payload = message;
      message = {};
    } else {
      message = {...message};
      if (this._isPayload(message.payload)) {
        payload = message.payload;
      } else if (this._payloadTypeClass) {
        payload = new this._payloadTypeClass(message.payload);
      } else {
        errors.throwErr(errors.ERR_INVALID_AQ_MESSAGE);
      }
    }

    // validate payload
    if (typeof payload === 'string') {
      message.payload = Buffer.from(payload);
    } else if (Buffer.isBuffer(payload)) {
      message.payload = payload;
    } else {
      message.payload = payload._impl;
    }

    // validate options, if applicable
    if (message.correlation !== undefined) {
      errors.assertParamPropValue(typeof message.correlation === 'string', 1,
        "correlation");
    }
    if (message.delay !== undefined) {
      errors.assertParamPropValue(Number.isInteger(message.delay), 1, "delay");
    }
    if (message.exceptionQueue !== undefined) {
      errors.assertParamPropValue(typeof message.exceptionQueue === 'string',
        1, "exceptionQueue");
    }
    if (message.expiration !== undefined) {
      errors.assertParamPropValue(Number.isInteger(message.expiration), 1,
        "expiration");
    }
    if (message.priority !== undefined) {
      errors.assertParamPropValue(Number.isInteger(message.priority), 1,
        "priority");
    }
    if (message.recipients !== undefined) {
      errors.assertParamPropValue(nodbUtil.isArrayOfStrings(message.recipients),
        1, "recipients");
    }

    return message;
  }

  //---------------------------------------------------------------------------
  // create()
  //
  // Creates the queue and populates some internal attributes.
  //---------------------------------------------------------------------------
  async create(conn, name, options) {
    if (options.payloadType) {
      if (typeof options.payloadType == 'string') {
        const cls = await conn._getDbObjectClassForName(options.payloadType);
        this._payloadTypeClass = cls;
        options.payloadType = cls;
      } else {
        errors.assertParamPropValue(nodbUtil.isObject(options.payloadType) &&
          options.payloadType.prototype instanceof BaseDbObject, 2, "payloadType");
        this._payloadTypeClass = options.payloadType;
      }
      this._payloadType = constants.DB_TYPE_OBJECT;
      this._payloadTypeName = this._payloadTypeClass.prototype.name;
    } else {
      this._payloadType = constants.DB_TYPE_RAW;
      this._payloadTypeName = "RAW";
    }
    this._name = name;
    this._impl = await conn._impl.getQueue(name, options);
  }

  //---------------------------------------------------------------------------
  // deqMany()
  //
  // Returns an array of messages from the queue, up to the maximum specified,
  // if any are available.
  //---------------------------------------------------------------------------
  async deqMany(maxMessages) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(maxMessages) && maxMessages > 0,
      1);
    const msgImpls = await this._impl.deqMany(maxMessages);
    const messages = new Array(msgImpls.length);
    for (let i = 0; i < msgImpls.length; i++) {
      const msg = new AqMessage();
      msg._impl = msgImpls[i];
      msg._payloadTypeClass = this._payloadTypeClass;
      messages[i] = msg;
    }
    return messages;
  }

  //---------------------------------------------------------------------------
  // deqOne()
  //
  // Returns a single message from the queue, if one is available.
  //---------------------------------------------------------------------------
  async deqOne() {
    errors.assertArgCount(arguments, 0, 0);
    const msgImpl = await this._impl.deqOne();
    if (msgImpl) {
      const msg = new AqMessage();
      msg._impl = msgImpl;
      msg._payloadTypeClass = this._payloadTypeClass;
      return msg;
    }
  }

  //---------------------------------------------------------------------------
  // deqOptions
  //
  // Property for the dequeue options associated with the queue.
  //---------------------------------------------------------------------------
  get deqOptions() {
    if (!this._deqOptions) {
      const deqOptions = new AqDeqOptions();
      deqOptions._impl = this._impl.deqOptions;
      this._deqOptions = deqOptions;
    }
    return this._deqOptions;
  }

  //---------------------------------------------------------------------------
  // enqMany()
  //
  // Enqueues multiple messages into the queue at the same time, avoiding
  // multiple round-trips.
  //---------------------------------------------------------------------------
  async enqMany(messages) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Array.isArray(messages) && messages.length > 0, 1);
    const verifiedMessages = new Array(messages.length);
    for (let i = 0; i < messages.length; i++) {
      verifiedMessages[i] = this._verifyMessage(messages[i]);
    }
    return await this._impl.enqMany(verifiedMessages);
  }

  //---------------------------------------------------------------------------
  // enqOne()
  //
  // Enqueues a single message into the queue.
  //---------------------------------------------------------------------------
  async enqOne(message) {
    errors.assertArgCount(arguments, 1, 1);
    message = this._verifyMessage(message);
    return await this._impl.enqOne(message);
  }

  //---------------------------------------------------------------------------
  // enqOptions
  //
  // Property for the enqueue options associated with the queue.
  //---------------------------------------------------------------------------
  get enqOptions() {
    if (!this._enqOptions) {
      const enqOptions = new AqEnqOptions();
      enqOptions._impl = this._impl.enqOptions;
      this._enqOptions = enqOptions;
    }
    return this._enqOptions;
  }

  //---------------------------------------------------------------------------
  // name
  //
  // Property for the name of the queue.
  //---------------------------------------------------------------------------
  get name() {
    return this._name;
  }

  //---------------------------------------------------------------------------
  // payloadType
  //
  // Property for the payload type.
  //---------------------------------------------------------------------------
  get payloadType() {
    return this._payloadType;
  }

  //---------------------------------------------------------------------------
  // payloadTypeName
  //
  // Property for the payload type name.
  //---------------------------------------------------------------------------
  get payloadTypeName() {
    return this._payloadTypeName;
  }

  //---------------------------------------------------------------------------
  // payloadTypeClass
  //
  // Property for the payload type class.
  //---------------------------------------------------------------------------
  get payloadTypeClass() {
    return this._payloadTypeClass;
  }

}

nodbUtil.wrapFns(AqQueue.prototype,
  "deqOne",
  "deqMany",
  "enqOne",
  "enqMany");

module.exports = AqQueue;
