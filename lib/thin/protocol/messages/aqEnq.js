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
// aqEnq.js
//
// This file defines the messages that are sent to the database and the
// responses that are received by the client for enqueuing an AQ message.
//-----------------------------------------------------------------------------

'use strict';

const AqBaseMessage = require("./aqBase.js");
const constants = require("../constants.js");

class AqEnqMessage extends AqBaseMessage {

  constructor(connImpl) {
    super(connImpl);
    this.functionCode = constants.TNS_FUNC_AQ_ENQ;
    this.propsImpl = null;
  }

  //--------------------------------------------------------------------------
  // processReturnParameter()
  //
  // Process the return parameters for the AQ enqueue request.
  //--------------------------------------------------------------------------
  processReturnParameter(buf) {
    this.propsImpl.msgId = this._processMsgId(buf);
    buf.skipUB2();                                    // extensions length
  }

  //--------------------------------------------------------------------------
  // encode()
  //
  // Writes the body of the message to the buffer.
  //--------------------------------------------------------------------------
  encode(buf) {
    const queueNameBytes = Buffer.from(this.queueImpl.name, 'utf-8');
    let enqFlags = 0;

    if (this.enqOptionsImpl.deliveryMode === constants.TNS_AQ_MSG_BUFFERED) {
      enqFlags |= constants.TNS_KPD_AQ_BUFMSG;
    }

    this.writeFunctionHeader(buf);
    buf.writeUInt8(1);                                // queue name (ptr)
    buf.writeUB4(queueNameBytes.length);              // queue name len
    this._writeMsgProps(buf, this.propsImpl);
    if (!this.propsImpl.recipients) {
      buf.writeUInt8(0);                              // recipients (ptr)
      buf.writeUB4(0);                                // no. of key/value pairs
    } else {
      buf.writeUInt8(1);                              // recipients (ptr)
      buf.writeUB4(3 * this.propsImpl.recipients.length);
    }
    buf.writeUB4(this.enqOptionsImpl.visibility);
    buf.writeUInt8(0);                                // relative msg id
    buf.writeUB4(0);                                  // relative msg len
    buf.writeUB4(0);                                  // sequence deviation
    buf.writeUInt8(1);                                // TOID of payload (ptr)
    buf.writeUB4(16);                                 // TOID of payload len
    buf.writeUB2(constants.TNS_AQ_MESSAGE_VERSION);
    if (this.queueImpl.isJson) {
      buf.writeUInt8(0);                              // payload (ptr)
      buf.writeUInt8(0);                              // RAW payload (ptr)
      buf.writeUB4(0);                                // RAW payload len
    } else if (this.queueImpl.payloadTypeClass) {
      buf.writeUInt8(1);                              // payload (ptr)
      buf.writeUInt8(0);                              // RAW payload (ptr)
      buf.writeUB4(0);                                // RAW payload len
    } else {
      buf.writeUInt8(0);                              // payload (ptr)
      buf.writeUInt8(1);                              // RAW payload (ptr)
      buf.writeUB4(this.propsImpl.payload.length);
    }
    buf.writeUInt8(1);                                // return msg id (ptr)
    buf.writeUB4(constants.TNS_AQ_MESSAGE_ID_LENGTH); // return msg id len
    buf.writeUB4(enqFlags);                           // enqueue flags
    buf.writeUInt8(0);                                // extensions 1 (ptr)
    buf.writeUB4(0);                                  // number of extensions 1
    buf.writeUInt8(0);                                // extensions 2 (ptr)
    buf.writeUB4(0);                                  // number of extensions 2
    buf.writeUInt8(0);                                // source sequence number
    buf.writeUB4(0);                                  // source sequence len
    buf.writeUInt8(0);                                // max sequence number
    buf.writeUB4(0);                                  // max sequence len
    buf.writeUInt8(0);                                // output ack len
    buf.writeUInt8(0);                                // correlation (ptr)
    buf.writeUB4(0);                                  // correlation len
    buf.writeUInt8(0);                                // sender name (ptr)
    buf.writeUB4(0);                                  // sender name len
    buf.writeUInt8(0);                                // sender address (ptr)
    buf.writeUB4(0);                                  // sender address len
    buf.writeUInt8(0);                                // sender charset id
    buf.writeUInt8(0);                                // sender ncharset id
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_20_1) {
      buf.writeUInt8(this.queueImpl.isJson ? 1 : 0);  // JSON payload (ptr)
    }

    buf.writeBytesWithLength(queueNameBytes);
    if (this.propsImpl.recipients) {
      this._writeRecipients(buf, this.propsImpl);
    }
    buf.writeBytes(this.queueImpl.payloadToid);
    this._writePayload(buf, this.propsImpl);
  }

}

module.exports = AqEnqMessage;
