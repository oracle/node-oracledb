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
// aqBase.js
//
// This file defines the base class for messages that are sent to the
// database and the responses that are received by the client for enqueuing and
// dequeuing AQ messages.
//-----------------------------------------------------------------------------

'use strict';

const constants = require("../constants.js");
const errors = require("../../../errors.js");
const BaseMessage = require("./base.js");
const { ThinDbObjectImpl } = require("../../dbObject.js");
const oson = require('../../../impl/datahandlers/oson.js');

class AqBaseMessage extends BaseMessage {

  constructor(connImpl) {
    super(connImpl);
    this.queueImpl = null;
    this.deqOptionsImpl = null;
    this.enqOptionsImpl = null;
    this.noMsgFound = false;
  }

  //--------------------------------------------------------------------------
  // _processDate()
  //
  // Processes a date found in the buffer.
  //--------------------------------------------------------------------------
  _processDate(buf) {
    const numBytes = buf.readUB4();
    if (numBytes > 0)
      return buf.readOracleDate(true);
  }

  //--------------------------------------------------------------------------
  // _processErrorInfo()
  //
  // Process error information from the buffer. If the error that indicates
  // that no messages were received is detected, the error is cleared and
  // the flag set so that the dequeue can handle that case.
  //--------------------------------------------------------------------------
  processErrorInfo(buf) {
    super.processErrorInfo(buf);
    if (this.errorInfo.num === constants.TNS_ERR_NO_MESSAGES_FOUND) {
      this.errorInfo.num = 0;
      this.errorOccurred = false;
      this.noMsgFound = true;
    }
  }

  //--------------------------------------------------------------------------
  // _processExtensions()
  //
  // Processes extensions to the message property object returned by the
  // database.
  //--------------------------------------------------------------------------
  _processExtensions(buf, propsImpl) {
    const numExtensions = buf.readUB4();
    if (numExtensions > 0) {
      buf.skipUB1();
      for (let i = 0; i < numExtensions; i++) {
        const textValue = buf.readBytesAndLength();
        const binaryValue = buf.readBytesAndLength();
        const value = textValue || binaryValue;
        const keyword = buf.readUB2();
        if (value) {
          if (keyword === constants.TNS_AQ_EXT_KEYWORD_AGENT_NAME) {
            propsImpl.senderAgentName = value;
          } else if (keyword === constants.TNS_AQ_EXT_KEYWORD_AGENT_ADDRESS) {
            propsImpl.senderAgentAddress = value;
          } else if (keyword === constants.TNS_AQ_EXT_KEYWORD_AGENT_PROTOCOL) {
            propsImpl.senderAgentProtocol = value[0];
          } else if (keyword === constants.TNS_AQ_EXT_KEYWORD_ORIGINAL_MSGID) {
            propsImpl.originalMsgId = value;
          }
        }
      }
    }
  }

  //--------------------------------------------------------------------------
  // _processMsgId()
  //
  // Reads a message id from the buffer and returns it.
  //--------------------------------------------------------------------------
  _processMsgId(buf) {
    return Buffer.from(buf.readBytes(constants.TNS_AQ_MESSAGE_ID_LENGTH));
  }

  //--------------------------------------------------------------------------
  // _processMsgProps()
  //
  // Processes a message property object returned by the database.
  //--------------------------------------------------------------------------
  _processMsgProps(buf, propsImpl) {
    propsImpl.priority = buf.readSB4();
    propsImpl.delay = buf.readSB4();
    propsImpl.expiration = buf.readSB4();
    propsImpl.correlation = buf.readStrAndLength();
    propsImpl.numAttempts = buf.readSB4();
    propsImpl.exceptionQueue = buf.readStrAndLength();
    propsImpl.state = buf.readSB4();
    propsImpl.enqTime = this._processDate(buf);
    propsImpl.enqTxnId = buf.readBytesAndLength();
    this._processExtensions(buf, propsImpl);
    const temp32 = buf.readUB4();           // user properties
    if (temp32 > 0) {
      errors.throwErr(errors.ERR_NOT_IMPLEMENTED);
    }
    buf.skipUB4();                          // csn
    buf.skipUB4();                          // dsn
    const flags = buf.readUB4();
    if (flags === constants.TNS_KPD_AQ_BUFMSG) {
      propsImpl.deliveryMode = constants.TNS_AQ_MSG_BUFFERED;
    } else {
      propsImpl.deliveryMode = constants.TNS_AQ_MSG_PERSISTENT;
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_21_1) {
      buf.skipUB4();                        // shard number
    }
  }

  //--------------------------------------------------------------------------
  // _processPayload()
  //
  // Processes the payload for an enqueued message returned by the database.
  //--------------------------------------------------------------------------
  _processPayload(buf) {
    const payloadData = buf.readDbObject();
    if (this.queueImpl.payloadTypeClass) {
      const obj = new this.queueImpl.payloadTypeClass();
      const objImpl = new ThinDbObjectImpl(this.queueImpl.payloadTypeClass,
        payloadData.packedData);
      if (payloadData) {
        objImpl.toid = payloadData.toid;
        objImpl.oid = payloadData.oid;
      }
      obj._impl = objImpl;
      return obj;
    } else {
      if (payloadData.packedData) {
        const payload = Buffer.from(payloadData.packedData.slice(4));
        if (this.queueImpl.isJson) {
          const decoder =  new oson.OsonDecoder(payload);
          return decoder.decode();
        }
        return payload;
      } else if (!this.queueImpl.isJson) {
        return Buffer.alloc(0);
      }
    }
  }

  //--------------------------------------------------------------------------
  // _processRecipients()
  //
  // Process recipients for a message.
  //--------------------------------------------------------------------------
  _processRecipients(buf) {
    const numRecipients = buf.readUB4();
    if (numRecipients > 0)
      errors.throwNotImplemented('aq recipients');
    return [];
  }

  //--------------------------------------------------------------------------
  // _writeMsgProps()
  //
  // Write a message property object to the buffer.
  //--------------------------------------------------------------------------
  _writeMsgProps(buf, propsImpl) {
    buf.writeSB4(propsImpl.priority);
    buf.writeSB4(propsImpl.delay);
    buf.writeSB4(propsImpl.expiration);
    this._writeValueWithLength(buf, propsImpl.correlation);
    buf.writeUB4(0);                        // number of attempts
    this._writeValueWithLength(buf, propsImpl.exceptionQueue);
    buf.writeUB4(propsImpl.state);
    buf.writeUB4(0);                        // enqueue time length
    this._writeValueWithLength(buf, propsImpl.enqTxnId);
    buf.writeUB4(4);                        // number of extensions
    buf.writeUInt8(0x0e);                   // unknown extra byte

    this._writeKeywordValuePair(buf, null, null,
      constants.TNS_AQ_EXT_KEYWORD_AGENT_NAME);
    this._writeKeywordValuePair(buf, null, null,
      constants.TNS_AQ_EXT_KEYWORD_AGENT_ADDRESS);
    this._writeKeywordValuePair(buf, null, Buffer.from([0x00]),
      constants.TNS_AQ_EXT_KEYWORD_AGENT_PROTOCOL);
    this._writeKeywordValuePair(buf, null, null,
      constants.TNS_AQ_EXT_KEYWORD_ORIGINAL_MSGID);

    buf.writeUB4(0);                        // user property
    buf.writeUB4(0);                        // cscn
    buf.writeUB4(0);                        // dscn
    buf.writeUB4(0);                        // flags
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_21_1) {
      buf.writeUB4(0xffffffff);             // shard id
    }
  }

  //--------------------------------------------------------------------------
  // _writePayload()
  //
  // Writes the payload of the message property object to the buffer.
  //--------------------------------------------------------------------------
  _writePayload(buf, propsImpl) {
    if (this.queueImpl.isJson) {
      buf.writeOson(propsImpl.payload, this.connection._osonMaxFieldNameSize,
        false);
    } else if (this.queueImpl.payloadTypeClass) {
      buf.writeDbObject(propsImpl.payload);
    } else {
      buf.writeBytes(propsImpl.payload);
    }
  }

  //--------------------------------------------------------------------------
  // _writeRecipients()
  //
  // Write the recipient list of the message property object to the buffer.
  //--------------------------------------------------------------------------
  _writeRecipients(buf, propsImpl) {
    let index = 0;
    for (const recipient of propsImpl.recipients) {
      this._writeKeywordValuePair(buf, recipient, null, index);
      this._writeKeywordValuePair(buf, null, null, index + 1);
      this._writeKeywordValuePair(buf, null, Buffer.from([0x00]), index + 2);
      index += 3;
    }
  }

  //--------------------------------------------------------------------------
  // _writeValueWithLength()
  //
  // Write a string to the buffer, prefixed by a length.
  //--------------------------------------------------------------------------
  _writeValueWithLength(buf, value) {
    if (!value) {
      buf.writeUB4(0);
    } else {
      const valueBytes = Buffer.isBuffer(value) ?
        value : Buffer.from(value, 'utf-8');
      buf.writeUB4(valueBytes.length);
      buf.writeBytesWithLength(valueBytes);
    }
  }

  //--------------------------------------------------------------------------
  // _writeKeywordValuePair()
  //
  // Writes a keyword value pair to the buffer.
  //--------------------------------------------------------------------------
  _writeKeywordValuePair(buf, textValue, binaryValue, keyword) {
    let textValueBytes;
    if (!textValue) {
      buf.writeUB4(0);
    } else {
      textValueBytes = Buffer.from(textValue);
      buf.writeUB4(textValueBytes.length);
      buf.writeBytesWithLength(textValueBytes);
    }
    if (!binaryValue) {
      buf.writeUB4(0);
    } else {
      buf.writeUB4(binaryValue.length);
      buf.writeBytesWithLength(binaryValue);
    }

    buf.writeUB2(keyword);
  }

}


module.exports = AqBaseMessage;
