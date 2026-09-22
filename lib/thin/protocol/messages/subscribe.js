// Copyright (c) 2026, Oracle and/or its affiliates.

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
const pubConstants = require("../../../constants.js");

class SubscrMessage extends Message {

  /**
   * Creates a subscribe protocol message.
   */
  constructor(connection, subscr) {
    super(connection);
    this.functionCode = constants.TNS_FUNC_SUBSCRIBE;
    this.subscr = subscr;
    this.registrationId = 0n;
    this.clientId = null;
    this.opCode = constants.TNS_SUBSCR_OP_REGISTER;
  }

  /**
   * Processes the return parameters for the subscribe request.
   */
  processReturnParameter(buf) {
    let numValues = buf.readUB4();             // out parameters (kpnrl)
    for (let i = 0; i < numValues; i++) {
      buf.skipUB4();
    }
    for (let i = 0; i < numValues; i++) {
      buf.skipUB4();                           // registration id (short)
    }
    numValues = buf.readUB4();                 // out parameters (kpngrl)
    for (let i = 0; i < numValues; i++) {
      this.registrationId = buf.readUB8BigInt();
      if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_1) {
        buf.readBytesAndLength();              // subscriber name (ignored)
      }
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_1) {
      numValues = buf.readUB4();               // num database instances
      for (let i = 0; i < numValues; i++) {
        buf.readBytesAndLength();
      }
      numValues = buf.readUB4();               // num listener addresses
      for (let i = 0; i < numValues; i++) {
        buf.readBytesAndLength();
      }
      const clientId = buf.readBytesAndLength();
      this.clientId = clientId ? Buffer.from(clientId) : null;
    }
  }

  /**
   * Writes the subscribe register/unregister payload to the wire buffer.
   */
  encode(buf) {
    let groupingType;
    let usernameBytes;
    let qos = constants.TNS_SUBSCR_QOS_SECURE;
    let flags = this.subscr.operations;

    // determine the QOS flags to send
    if (this.subscr.qos & pubConstants.SUBSCR_QOS_RELIABLE) {
      qos |= constants.TNS_SUBSCR_QOS_RELIABLE;
    }
    if (this.subscr.qos & pubConstants.SUBSCR_QOS_DEREG_NFY) {
      qos |= constants.TNS_SUBSCR_QOS_PURGE_ON_NTFN;
    }

    // determine the operations flags to send
    if (this.subscr.qos & pubConstants.SUBSCR_QOS_QUERY) {
      flags |= constants.TNS_SUBSCR_FLAGS_QUERY;
    }
    if (this.subscr.qos & pubConstants.SUBSCR_QOS_ROWIDS) {
      flags |= constants.TNS_SUBSCR_FLAGS_INCLUDE_ROWIDS;
    }

    // determine the grouping type to send; default cannot be sent unless
    // grouping class is also set
    if (this.subscr.groupingClass === 0) {
      groupingType = 0;
    } else {
      groupingType = this.subscr.groupingType;
    }

    // write the message
    this.writeFunctionHeader(buf);
    buf.writeUInt8(this.opCode);
    buf.writeUB4(constants.TNS_SUBSCR_MODE_CLIENT_INITIATED);
    if (this.connection._user) {
      usernameBytes = Buffer.from(this.connection._user);
      buf.writeUInt8(1);                       // pointer (username)
      buf.writeUB4(usernameBytes.length);
    } else {
      buf.writeUInt8(0);                       // pointer (username)
      buf.writeUB4(0);                         // username length
    }
    if (this.clientId) {
      buf.writeUInt8(1);                       // pointer (location)
      buf.writeUB4(this.clientId.length);
    } else {
      buf.writeUInt8(0);                       // pointer (location)
      buf.writeUB4(0);                         // location array length
    }
    buf.writeUInt8(1);                         // pointer (registration)
    buf.writeUB4(1);                           // num registrations
    buf.writeUB2(1);                           // raw presentation
    buf.writeUB2(6);                           // version for client notif
    buf.writeUInt8(0);                         // pointer (namespace out attrs)
    buf.writeUInt8(1);                         // pointer (num elems array)
    buf.writeUInt8(0);                         // pointer (generic out attrs)
    buf.writeUInt8(1);                         // pointer (num elems array)
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_1) {
      buf.writeUInt8(1);                       // pointer (kpninst)
      buf.writeUInt8(1);                       // pointer (kpninstl)
      buf.writeUInt8(1);                       // pointer (kpngcret)
      buf.writeUInt8(1);                       // pointer (kpngcretl)
      buf.writeUInt8(1);                       // pointer (client id)
      buf.writeUB4(constants.TNS_SUBSCR_CLIENT_ID_LEN);
      buf.writeUInt8(1);                       // pointer (client id length)
    }
    if (usernameBytes) {
      buf.writeBytesWithLength(usernameBytes);
    }
    if (this.clientId) {
      buf.writeBytesWithLength(this.clientId);
    }
    buf.writeUB4(this.subscr.namespace);
    if (this.subscr.name) {
      const nameBytes = Buffer.from(this.subscr.name);
      buf.writeUB4(nameBytes.length);
      buf.writeBytesWithLength(nameBytes);
    } else {
      buf.writeUB4(0);
    }
    buf.writeUB4(0);                           // context length
    buf.writeUB4(0);                           // payload type
    buf.writeUB4(qos);
    buf.writeUB4(0);                           // payload callback len (JMS)
    buf.writeUB4(this.subscr.timeout);
    buf.writeUB4(0);                           // kpdnsd
    buf.writeUB4(flags);
    buf.writeUB4(0);                           // change lag
    buf.writeUB4(0);                           // change registration id
    buf.writeUInt8(this.subscr.groupingClass);
    buf.writeUB4(this.subscr.groupingValue);
    buf.writeUInt8(groupingType);
    buf.writeUB4(0);                           // grouping class start time
    buf.writeSB4(0);                           // grouping repeat count
    buf.writeUB8BigInt(this.registrationId);
  }

}

module.exports = SubscrMessage;
