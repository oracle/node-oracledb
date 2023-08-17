// Copyright (c) 2023 Oracle and/or its affiliates.

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

const constants = require("../constants.js");
const Message = require("./base.js");

/**
 * Executes a Fast Negotiation RPC function.
 * It sends Protocol Negotiation, Cookie Message, Datatype Negotiation
 * and OSESS Key RPC in single round trip.
 *
 * @class ConnectionCookieMessage
 * @extends {Message}
 */
class ConnectionCookieMessage extends Message {

  /**
   * Serializes the ConnectionCookieMessage function arguments
   *
   * @param {object} buf input arguments
   */
  encode(buf) {
    this.protocolMessage.encode(buf);
    buf.writeUInt8(constants.TNS_MSG_TYPE_COOKIE);
    buf.writeUInt8(1);                  // cookie version
    buf.writeUInt8(this.cookie.protocolVersion);
    buf.writeUInt16LE(this.cookie.charsetID);
    buf.writeUInt8(this.cookie.flags);
    buf.writeUInt16LE(this.cookie.ncharsetID);
    buf.writeBytesWithLength(this.cookie.serverBanner);
    buf.writeBytesWithLength(this.cookie.compileCaps);
    buf.writeBytesWithLength(this.cookie.runtimeCaps);
    this.dataTypeMessage.encode(buf);
    this.authMessage.encode(buf);
  }

  processMessage(buf, messageType) {
    if (messageType === constants.TNS_MSG_TYPE_RENEGOTIATE) {
      this.cookie.populated = false;
    } else if (messageType === constants.TNS_MSG_TYPE_PROTOCOL) {
      this.protocolMessage.processMessage(buf, messageType);
    } else if (messageType === constants.TNS_MSG_TYPE_DATA_TYPES) {
      this.dataTypeMessage.processMessage(buf, messageType);
    } else {
      this.authMessage.processMessage(buf, messageType);
    }
  }

}

module.exports = ConnectionCookieMessage;
