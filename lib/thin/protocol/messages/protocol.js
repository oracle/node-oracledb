// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

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
 * Executes a Protocol Negotiation RPC function
 *
 * @class ProtocolMessage
 * @extends {Message}
 */
class ProtocolMessage extends Message {

  /**
   * Serializes the ProtocolMessage function arguments
   *
   * @param {object} buf input arguments
   */
  encode(buf) {
    buf.writeUInt8(constants.TNS_MSG_TYPE_PROTOCOL);
    buf.writeUInt8(6);                          // protocol version (8.1+)
    buf.writeUInt8(0);                          // "array" terminator
    buf.writeStr("node-oracledb");              // unique name for driver
    buf.writeUInt8(0);
  }

  decode(buf) {
    let message_type = buf.readUInt8();
    if (message_type === constants.TNS_MSG_TYPE_PROTOCOL) {
      buf.skipBytes(2);                         // skip protocol array
      let x = buf.readUInt8();
      while (x !== 0) {                         // skip server banner
        x = buf.readUInt8();
      }
      buf.skipBytes(2);                         // character set ID
      buf.skipUB1(1);                           // skip server flags
      let num_elem = buf.readUInt16LE();
      if (num_elem > 0) {                       // skip elements
        buf.skipBytes(num_elem * 5);
      }
      let fdoLen = buf.readUInt16BE();
      let fdo = buf.readBytes(fdoLen);
      let ix = 6 + fdo[5] + fdo[6];
      buf.caps.nCharsetId = (fdo[ix + 3] << 8) + fdo[ix + 4];
      buf.caps.adjustForServerCompileCaps(buf.readBytesWithLength());
      buf.caps.adjustForServerRuntimeCaps(buf.readBytesWithLength());
    }
  }

}

module.exports = ProtocolMessage;
