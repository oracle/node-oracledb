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
// aqDeq.js
//
// This file defines the messages that are sent to the database and the
// responses that are received by the client for dequeuing an AQ message.
//-----------------------------------------------------------------------------

'use strict';

const AqBaseMessage = require("./aqBase.js");
const constants = require("../constants.js");

class AqDeqMessage extends AqBaseMessage {

  constructor(connImpl) {
    super(connImpl);
    this.functionCode = constants.TNS_FUNC_AQ_DEQ;
    this.propsImpl = null;
  }

  //--------------------------------------------------------------------------
  // processReturnParameter()
  //
  // Process the return parameters of the AQ Dequeue request.
  //--------------------------------------------------------------------------
  processReturnParameter(buf) {
    const numBytes = buf.readUB4();
    if (numBytes > 0) {
      this._processMsgProps(buf, this.propsImpl);
      this.propsImpl.recipients = this._processRecipients(buf);
      this.propsImpl.payload = this._processPayload(buf);
      this.propsImpl.msgId = this._processMsgId(buf);
    }
  }

  //--------------------------------------------------------------------------
  // _writeMessageBody()
  //
  // Writes the body of the message to the buffer.
  //--------------------------------------------------------------------------
  encode(buf) {
    const queueNameBytes = Buffer.from(this.queueImpl.name, 'utf-8');
    const consumerNameBytes = this.deqOptionsImpl.consumerName ?
      Buffer.from(this.deqOptionsImpl.consumerName, 'utf-8') : null;
    const correlationBytes = this.deqOptionsImpl.correlation ?
      Buffer.from(this.deqOptionsImpl.correlation, 'utf-8') : null;
    const conditionBytes = this.deqOptionsImpl.condition ?
      Buffer.from(this.deqOptionsImpl.condition, 'utf-8') : null;
    let msgIdBytes = this.deqOptionsImpl.msgId ?
      this.deqOptionsImpl.msgId.slice(0, 16) : null;
    const deliveryMode = this.deqOptionsImpl.deliveryMode;
    let deqFlags = 0;

    if (msgIdBytes && msgIdBytes.length < 16) {
      msgIdBytes = Buffer.concat([msgIdBytes,
        Buffer.alloc(16 - msgIdBytes.length)]);
    }

    if (deliveryMode === constants.TNS_AQ_MSG_BUFFERED) {
      deqFlags |= constants.TNS_KPD_AQ_BUFMSG;
    } else if (deliveryMode === constants.TNS_AQ_MSG_PERSISTENT_OR_BUFFERED) {
      deqFlags |= constants.TNS_KPD_AQ_EITHER;
    }

    this.writeFunctionHeader(buf);
    buf.writeUInt8(1);                                  // queue name (ptr)
    buf.writeUB4(queueNameBytes.length);                // queue name len
    buf.writeUInt8(1);                                  // message properties
    buf.writeUInt8(1);                                  // msg props len
    buf.writeUInt8(1);                                  // recipient list
    buf.writeUInt8(1);                                  // recipient list len
    if (consumerNameBytes) {
      buf.writeUInt8(1);                                // consumer name
      buf.writeUB4(consumerNameBytes.length);
    } else {
      buf.writeUInt8(0);                                // consumer name
      buf.writeUB4(0);                                  // consumer name len
    }
    buf.writeSB4(this.deqOptionsImpl.mode);             // dequeue mode
    buf.writeSB4(this.deqOptionsImpl.navigation);       // navigation
    buf.writeSB4(this.deqOptionsImpl.visibility);       // visibility
    buf.writeSB4(this.deqOptionsImpl.wait);             // wait
    if (msgIdBytes) {
      buf.writeUInt8(1);                                // select mesg id
      buf.writeUB4(constants.TNS_AQ_MESSAGE_ID_LENGTH); // mesg id len
    } else {
      buf.writeUInt8(0);                                // select mesg id
      buf.writeUB4(0);                                  // select mesg id len
    }
    if (correlationBytes) {
      buf.writeUInt8(1);                                // correlation id
      buf.writeUB4(correlationBytes.length);            // correlation id len
    } else {
      buf.writeUInt8(0);                                // correlation id
      buf.writeUB4(0);                                  // correlation id len
    }
    buf.writeUInt8(1);                                  // toid of payload
    buf.writeUB4(16);                                   // toid len
    buf.writeUB2(constants.TNS_AQ_MESSAGE_VERSION);
    buf.writeUInt8(1);                                  // payload
    buf.writeUInt8(1);                                  // return msg id
    buf.writeUB4(constants.TNS_AQ_MESSAGE_ID_LENGTH);
    buf.writeUB4(deqFlags);                             // dequeue flags
    if (conditionBytes) {
      buf.writeUInt8(1);                                // condition (pointer)
      buf.writeUB4(conditionBytes.length);              // condition len
    } else {
      buf.writeUInt8(0);                                // condition
      buf.writeUB4(0);                                  // condition len
    }
    buf.writeUInt8(0);                                  // extensions
    buf.writeUB4(0);                                    // number of extensions
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_20_1) {
      buf.writeUInt8(0);                                // JSON payload
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_21_1) {
      buf.writeUB4(0xffffffff);                         // shard id
    }

    buf.writeBytesWithLength(queueNameBytes);
    if (consumerNameBytes) {
      buf.writeBytesWithLength(consumerNameBytes);
    }
    if (msgIdBytes) {
      buf.writeBytes(msgIdBytes);
    }
    if (correlationBytes) {
      buf.writeBytesWithLength(correlationBytes);
    }
    buf.writeBytes(this.queueImpl.payloadToid);
    if (conditionBytes) {
      buf.writeBytesWithLength(conditionBytes);
    }
  }

}

module.exports = AqDeqMessage;
