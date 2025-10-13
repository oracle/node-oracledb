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

//-----------------------------------------------------------------------------
// aqArray.js
//
// This file defines the messages that are sent to the database and the
// responses that are received by the client for enqueuing and dequeuing
// an array of AQ messages.
//-----------------------------------------------------------------------------

'use strict';

const AqBaseMessage = require("./aqBase.js");
const constants = require("../constants.js");
const errors = require("../../../errors.js");

class AqArrayMessage extends AqBaseMessage {

  constructor(connImpl) {
    super(connImpl);
    this.functionCode = constants.TNS_FUNC_ARRAY_AQ;
    this.numIters = 0;
    this.propsImpls = [];
    this.noMsgFound = false;
  }

  //--------------------------------------------------------------------------
  // processReturnParameter()
  //
  // Process the return parameters of the AQ array enqueue/dequeue request.
  // We recieve all the msg details in deq and in case of enq the msgIds.
  //--------------------------------------------------------------------------
  processReturnParameter(buf) {
    const numIters = buf.readUB4();
    for (let i = 0; i < numIters; i++) {
      const propsImpl = this.propsImpls[i];
      let temp16 = buf.readUB2();
      if (temp16 > 0) {
        buf.skipUB1();
        this._processMsgProps(buf, propsImpl);
      }
      propsImpl.recipients = this._processRecipients(buf);
      temp16 = buf.readUB2();
      if (temp16 > 0) {
        propsImpl.payload = this._processPayload(buf);
      }
      const msgId = buf.readBytesAndLength();// msgIds array
      if (this.operation === constants.TNS_AQ_ARRAY_ENQ) {
        for (let j = 0; j < this.propsImpls.length; j++) {
          this.propsImpls[j].msgId = Buffer.from(msgId.slice(j * 16, (j + 1) * 16));
        }
      } else {
        propsImpl.msgId = Buffer.from(msgId);
      }
      temp16 = buf.readUB2();               // extensions len
      if (temp16 > 0) {
        errors.throwErr(errors.ERR_NOT_IMPLEMENTED);
      }
      buf.skipUB2();                        // output ack
    }
    if (this.operation === constants.TNS_AQ_ARRAY_ENQ) {
      this.numIters = buf.readUB4();
    } else {
      this.numIters = numIters;
    }
  }

  //--------------------------------------------------------------------------
  // _writeArrayDeq()
  //
  // Writes to the buffer the fields specific to the array dequeue of AQ
  // messages.
  //--------------------------------------------------------------------------
  _writeArrayDeq(buf) {
    let consumerNameBytes = null;
    let correlationBytes = null;
    let conditionBytes = null;
    const queueNameBytes = Buffer.from(this.queueImpl.name);
    const deliveryMode = this.deqOptionsImpl.deliveryMode;
    let flags = 0;

    if (deliveryMode === constants.TNS_AQ_MSG_BUFFERED) {
      flags |= constants.TNS_KPD_AQ_BUFMSG;
    } else if (deliveryMode === constants.TNS_AQ_MSG_PERSISTENT_OR_BUFFERED) {
      flags |= constants.TNS_KPD_AQ_EITHER;
    }

    if (this.deqOptionsImpl.consumerName) {
      consumerNameBytes = Buffer.from(this.deqOptionsImpl.consumerName, 'utf-8');
    }
    if (this.deqOptionsImpl.condition) {
      conditionBytes = Buffer.from(this.deqOptionsImpl.condition, 'utf-8');
    }
    if (this.deqOptionsImpl.correlation) {
      correlationBytes = Buffer.from(this.deqOptionsImpl.correlation, 'utf-8');
    }

    for (const propsImpl of this.propsImpls) {
      buf.writeUB4(queueNameBytes.length);
      buf.writeBytesWithLength(queueNameBytes);
      this._writeMsgProps(buf, propsImpl);
      buf.writeUB4(0);                      // num recipients
      this._writeValueWithLength(buf, consumerNameBytes);
      buf.writeSB4(this.deqOptionsImpl.mode);
      buf.writeSB4(this.deqOptionsImpl.navigation);
      buf.writeSB4(this.deqOptionsImpl.visibility);
      buf.writeSB4(this.deqOptionsImpl.wait);
      this._writeValueWithLength(buf, this.deqOptionsImpl.msgid);
      this._writeValueWithLength(buf, correlationBytes);
      this._writeValueWithLength(buf, conditionBytes);
      buf.writeUB4(0);                      // extensions
      buf.writeUB4(0);                      // rel msg id
      buf.writeSB4(0);                      // seq deviation
      buf.writeUB4(16);                     // toid length
      buf.writeBytesWithLength(this.queueImpl.payloadToid);
      buf.writeUB2(constants.TNS_AQ_MESSAGE_VERSION);
      buf.writeUB4(0);                      // payload length
      buf.writeUB4(0);                      // raw pay length
      buf.writeUB4(0);
      buf.writeUB4(flags);                  // deliveryMode flag
      buf.writeUB4(0);                      // extensions len
      buf.writeUB4(0);                      // source seq len
    }
  }

  //--------------------------------------------------------------------------
  // _writeArrayEnq()
  //
  // Writes input parameters in case of array enqueue.
  //--------------------------------------------------------------------------
  _writeArrayEnq(buf) {
    const queueNameBytes = Buffer.from(this.queueImpl.name);
    const deliveryMode = this.enqOptionsImpl.deliveryMode;
    let flags = 0;

    if (deliveryMode === constants.TNS_AQ_MSG_BUFFERED) {
      flags |= constants.TNS_KPD_AQ_BUFMSG;
    } else if (deliveryMode === constants.TNS_AQ_MSG_PERSISTENT_OR_BUFFERED) {
      flags |= constants.TNS_KPD_AQ_EITHER;
    }

    buf.writeUB4(0);                        // rel msgid len
    buf.writeUInt8(constants.TNS_MSG_TYPE_ROW_HEADER);
    buf.writeUB4(queueNameBytes.length);
    buf.writeBytesWithLength(queueNameBytes);
    buf.writeBytes(this.queueImpl.payloadToid);
    buf.writeUB2(constants.TNS_AQ_MESSAGE_VERSION);
    buf.writeUB4(flags);

    for (const propsImpl of this.propsImpls) {
      buf.writeUInt8(constants.TNS_MSG_TYPE_ROW_DATA);
      buf.writeUB4(flags);                  // aqi flags
      this._writeMsgProps(buf, propsImpl);
      if (propsImpl.recipients === null || propsImpl.recipients.length === 0) {
        buf.writeUB4(0);                    // num recipients
      } else {
        buf.writeUB4(3 * propsImpl.recipients.length);
        this._writeRecipients(buf, propsImpl);
      }
      buf.writeSB4(this.enqOptionsImpl.visibility);
      buf.writeUB4(0);                      // relative msg id
      buf.writeSB4(0);                      // seq deviation
      if (!this.queueImpl.payloadTypeClass && !this.queueImpl.isJson) {
        buf.writeUB4(propsImpl.payload.length);
      }
      this._writePayload(buf, propsImpl);
    }
    buf.writeUInt8(constants.TNS_MSG_TYPE_STATUS);
  }

  //--------------------------------------------------------------------------
  // _writeMessageBody()
  //
  // Writes the body of the message to the buffer.
  //--------------------------------------------------------------------------
  encode(buf) {
    this.writeFunctionHeader(buf);
    if (this.operation === constants.TNS_AQ_ARRAY_ENQ) {
      buf.writeUInt8(0);                    // input params
      buf.writeUB4(0);                      // length
    } else {
      buf.writeUInt8(1);
      buf.writeUB4(this.numIters);
    }
    buf.writeUB4(constants.TNS_AQ_ARRAY_FLAGS_RETURN_MESSAGE_ID);
    if (this.operation === constants.TNS_AQ_ARRAY_ENQ) {
      buf.writeUInt8(1);                    // output params
      buf.writeUInt8(0);                    // length
    } else {
      buf.writeUInt8(1);
      buf.writeUInt8(1);
    }
    buf.writeSB4(this.operation);
    if (this.operation === constants.TNS_AQ_ARRAY_ENQ) {
      buf.writeUInt8(1);                    // num iters (pointer)
    } else {
      buf.writeUInt8(0);
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_21_1) {
      buf.writeUB4(0xffff);                 // shard id
    }
    if (this.operation === constants.TNS_AQ_ARRAY_ENQ) {
      buf.writeUB4(this.numIters);
    }
    if (this.operation === constants.TNS_AQ_ARRAY_ENQ) {
      this._writeArrayEnq(buf);
    } else {
      this._writeArrayDeq(buf);
    }
  }

}

module.exports = AqArrayMessage;
