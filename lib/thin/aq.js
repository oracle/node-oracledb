// Copyright (c) 2025, Oracle and/or its affiliates.

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

const AqEnqMessage = require("./protocol/messages/aqEnq.js");
const AqDeqMessage = require("./protocol/messages/aqDeq.js");
const AqArrayMessage = require("./protocol/messages/aqArray.js");
const constants = require("./protocol/constants.js");
const errors = require("../errors.js");
const types = require("../types.js");
const { AQ_VISIBILITY_IMMEDIATE } = require("../constants.js");

class ThinQueueImpl {

  constructor(connImpl, name, payloadTypeClass, payloadType) {
    this._connImpl = connImpl;
    this.name = name;
    this.payloadTypeClass = payloadTypeClass;
    this.isJson = payloadType === types.DB_TYPE_JSON;
    this.payloadType = payloadType;
    this.deqOptions = new ThinDeqOptionsImpl();
    this.enqOptions = new ThinEnqOptionsImpl();
    if (this.isJson) {
      this.payloadToid = Buffer.alloc(16, 0);
      this.payloadToid[15] = 0x47;
    } else if (this.payloadTypeClass) {
      // Assuming oid is Buffer
      this.payloadToid = this.payloadTypeClass._objType.oid;
    } else {
      this.payloadToid = Buffer.alloc(16, 0);
      this.payloadToid[15] = 0x17;
    }
  }

  //---------------------------------------------------------------------------
  // _createArrayDeqMessage()
  //
  // Creates an array dequeue message for dequeuing multiple messages.
  //---------------------------------------------------------------------------
  _createArrayDeqMessage(numIters) {
    const message = new AqArrayMessage(this._connImpl);
    message.numIters = numIters;
    message.propsImpls = Array.from({length: numIters},
      () => new ThinMsgPropsImpl());
    message.queueImpl = this;
    message.deqOptionsImpl = this.deqOptions;
    message.operation = constants.TNS_AQ_ARRAY_DEQ;
    return message;
  }

  //---------------------------------------------------------------------------
  // _createArrayEnqMessage()
  //
  // Creates an array enqueue message for enqueuing multiple messages.
  //---------------------------------------------------------------------------
  _createArrayEnqMessage(propsImpls) {
    const message = new AqArrayMessage(this._connImpl);
    message.queueImpl = this;
    message.enqOptionsImpl = this.enqOptions;
    message.propsImpls = propsImpls;
    message.operation = constants.TNS_AQ_ARRAY_ENQ;
    message.numIters = propsImpls.length;
    return message;
  }

  //---------------------------------------------------------------------------
  // _createDeqMessage()
  //
  // Creates a dequeue message for dequeuing a single message.
  //---------------------------------------------------------------------------
  _createDeqMessage() {
    const propsImpl = new ThinMsgPropsImpl();
    const message = new AqDeqMessage(this._connImpl);
    message.queueImpl = this;
    message.deqOptionsImpl = this.deqOptions;
    message.propsImpl = propsImpl;
    return message;
  }

  //---------------------------------------------------------------------------
  // _createEnqMessage()
  //
  // Creates an enqueue message for enqueuing a single message.
  //---------------------------------------------------------------------------
  _createEnqMessage(propsImpl) {
    const message = new AqEnqMessage(this._connImpl);
    message.queueImpl = this;
    message.enqOptionsImpl = this.enqOptions;
    message.propsImpl = propsImpl;
    return message;
  }

  //---------------------------------------------------------------------------
  // deq()
  //
  // Dequeues messages from the queue, either one or many based on the max
  // number of messages requested.
  //---------------------------------------------------------------------------
  async deq(maxNumMessages) {
    let results;
    if (maxNumMessages > 1) {
      results =  await this.deqMany(maxNumMessages);
    } else if (maxNumMessages == 1) {
      results = await this.deqOne();
    } else {
      errors.throwErr(errors.ERR_INVALID_MAX_MESSAGES);
    }
    return results;
  }

  //---------------------------------------------------------------------------
  // deqMany()
  //
  // Dequeues multiple messages from the queue.
  //---------------------------------------------------------------------------
  async deqMany(maxNumMessages) {
    if (this.enqOptions.visibility === AQ_VISIBILITY_IMMEDIATE)
      errors.throwNotImplemented('immediate visibility with deqMany');
    const message = this._createArrayDeqMessage(maxNumMessages);
    await this._connImpl._protocol._processMessage(message);
    if (message.noMsgFound) {
      return [];
    }
    return message.propsImpls.slice(0, message.numIters);
  }

  //---------------------------------------------------------------------------
  // deqOne()
  //
  // Dequeues a single message from the queue.
  //---------------------------------------------------------------------------
  async deqOne() {
    const message = this._createDeqMessage();
    await this._connImpl._protocol._processMessage(message);
    if (message.noMsgFound) {
      return [];
    }
    return [message.propsImpl];
  }

  //---------------------------------------------------------------------------
  // enq()
  //
  // Enqueues one or many messages to the queue based on the number provided.
  //---------------------------------------------------------------------------
  async enq(messages) {
    const propsImpls = messages.map(properties => {
      const impl = new ThinMsgPropsImpl();
      impl._init(properties);
      return impl;
    });
    if (messages.length == 1)
      return await this.enqOne(propsImpls[0]);
    return await this.enqMany(propsImpls);
  }

  //---------------------------------------------------------------------------
  // enqMany()
  //
  // Enqueues multiple messages to the queue.
  //---------------------------------------------------------------------------
  async enqMany(propsImpls) {
    if (this.enqOptions.visibility === AQ_VISIBILITY_IMMEDIATE)
      errors.throwNotImplemented('immediate visibility with enqMany');
    const message = this._createArrayEnqMessage(propsImpls);
    await this._connImpl._protocol._processMessage(message);
    return propsImpls;
  }

  //---------------------------------------------------------------------------
  // enqOne()
  //
  // Enqueues a single message to the queue.
  //---------------------------------------------------------------------------
  async enqOne(propsImpl) {
    // No need to set payloadJson or similar; _writePayload handles OSON/JSON
    const message = this._createEnqMessage(propsImpl);
    await this._connImpl._protocol._processMessage(message);
    return [propsImpl];
  }

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._connImpl;
  }

}

class ThinDeqOptionsImpl {

  constructor() {
    this.condition = null;
    this.consumerName = null;
    this.correlation = null;
    this.deliveryMode = constants.TNS_AQ_MSG_PERSISTENT;
    this.mode = constants.TNS_AQ_DEQ_REMOVE;
    this.msgId = null;
    this.navigation = constants.TNS_AQ_DEQ_NEXT_MSG;
    this.transformation = null;
    this.visibility = constants.TNS_AQ_DEQ_ON_COMMIT;
    this.wait = constants.TNS_AQ_DEQ_WAIT_FOREVER;
  }

  getCondition() {
    return this.condition;
  }

  getConsumerName() {
    return this.consumerName;
  }

  getCorrelation() {
    return this.correlation;
  }

  getMsgId() {
    return this.msgId;
  }

  getMode() {
    return this.mode;
  }

  getNavigation() {
    return this.navigation;
  }

  getTransformation() {
    return this.transformation;
  }

  getVisibility() {
    return this.visibility;
  }

  getWait() {
    return this.wait;
  }

  setCondition(value) {
    this.condition = value;
  }

  setConsumerName(value) {
    this.consumerName = value;
  }

  setCorrelation(value) {
    this.correlation = value;
  }

  setDeliveryMode(value) {
    this.deliveryMode = value;
  }

  setMode(value) {
    this.mode = value;
  }

  setMsgId(value) {
    this.msgId = value;
  }

  setNavigation(value) {
    this.navigation = value;
  }

  setTransformation(value) {
    this.transformation = value;
  }

  setVisibility(value) {
    this.visibility = value;
  }

  setWait(value) {
    this.wait = value;
  }

}

class ThinEnqOptionsImpl {

  constructor() {
    this.transformation = null;
    this.visibility = constants.TNS_AQ_ENQ_ON_COMMIT;
    this.deliveryMode = constants.TNS_AQ_MSG_PERSISTENT;
  }

  getDeliveryMode() {
    return this.deliveryMode;
  }

  getTransformation() {
    errors.throwNotImplemented('transformation');
  }

  getVisibility() {
    return this.visibility;
  }

  setDeliveryMode(value) {
    this.deliveryMode = value;
  }

  // eslint-disable-next-line no-unused-vars
  setTransformation(value) {
    errors.throwNotImplemented('transformation');
  }

  setVisibility(value) {
    this.visibility = value;
  }

}

class ThinMsgPropsImpl {

  constructor() {
    this.delay = constants.TNS_AQ_MSG_NO_DELAY;
    this.correlation = null;
    this.exceptionq = null;
    this.expiration = constants.TNS_AQ_MSG_NO_EXPIRATION;
    this.priority = 0;
    this.recipients = [];
    this.numAttempts = 0;
    this.deliveryMode = 0;
    this.enqTime = null;
    this.msgId = null;
    this.state = 0;
    this.payload = null;
    this.enqTxnId = null;
    this.senderAgentName = null;
    this.senderAgentAddress = null;
    this.senderAgentProtocol = 0;
    this.originalMsgId = null;
  }

  //---------------------------------------------------------------------------
  // _init()
  //
  // Initializes the message properties from the provided properties object.
  //---------------------------------------------------------------------------
  _init(properties) {
    this.payload = properties.payload;
    if (properties.correlation !== undefined)
      this.correlation = properties.correlation;
    if (properties.delay !== undefined)
      this.delay = properties.delay;
    if (properties.exceptionQueue !== undefined)
      this.exceptionQueue = properties.exceptionQueue;
    if (properties.expiration !== undefined)
      this.expiration = properties.expiration;
    if (properties.priority !== undefined)
      this.priority = properties.priority;
    if (properties.recipients !== undefined)
      this.recipients = properties.recipients;
  }

  getNumAttempts() {
    return this.numAttempts;
  }

  getCorrelation() {
    return this.correlation;
  }

  getDelay() {
    return this.delay;
  }

  getDeliveryMode() {
    return this.deliveryMode;
  }

  getEnqTime() {
    return this.enqTime;
  }

  getExceptionQueue() {
    return this.exceptionq;
  }

  getExpiration() {
    return this.expiration;
  }

  getMsgId() {
    return this.msgId;
  }

  getOriginalMsgId() {
    return this.originalMsgId;
  }

  getPayload() {
    return this.payload;
  }

  getPriority() {
    return this.priority;
  }

  getState() {
    return this.state;
  }

  setCorrelation(value) {
    this.correlation = value;
  }

  setDelay(value) {
    this.delay = value;
  }

  setExceptionQueue(value) {
    this.exceptionq = value;
  }

  setExpiration(value) {
    this.expiration = value;
  }

  setPayloadBytes(value) {
    this.payload = value;
  }

  setPayloadObject(value) {
    this.payload = value;
  }

  setPayloadJson(value) {
    this.payload = value;
  }

  setPriority(value) {
    this.priority = value;
  }

  setRecipients(value) {
    this.recipients = value;
  }

}

module.exports = { ThinQueueImpl };
