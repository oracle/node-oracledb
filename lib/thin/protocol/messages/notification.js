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
const errors = require("../../../errors.js");
const pubConstants = require("../../../constants.js");
const AqBaseMessage = require("./aqBase.js");
const { BaseBuffer } = require("../../../impl/datahandlers/buffer.js");
const { ThinMsgPropsImpl } = require("../../aq.js");

class NotifyMessage extends AqBaseMessage {

  /**
   * Creates a notify protocol message used on the dedicated listener channel.
   */
  constructor(connection, subscr) {
    super(connection);
    this.functionCode = constants.TNS_FUNC_NOTIFY;
    this.subscr = subscr;
    this.clientId = null;
    this.namespace = subscr.namespace;
    this._processingOac = false;
  }

  /**
   * Decodes the notification message and its OAC records.
   */
  decode(buf) {
    if (this._processingOac) {
      this._processOacRecords(buf);
    } else {
      super.decode(buf);
    }
  }

  /**
   * Processes all available OAC notification records.
   */
  _processOacRecords(buf) {
    while (!this.endOfResponse) {
      this._processOac(buf);
    }
    // Normal OAC completion does not stop a live notification listener. The
    // EMON channel is a persistent stream and continues waiting for more
    // packets until unsubscribe, deregistration, STOP_NOTIF, or failure.
    this._processingOac = false;
  }

  /**
   * Processes a single TTC message for notifications.
   */
  processMessage(buf, messageType) {

    // Notification supports OAC messages only.
    if (messageType === constants.TNS_MSG_TYPE_OAC) {
      this._processingOac = true;
      this._processOacRecords(buf);
    } else {
      errors.throwErr(errors.ERR_UNEXPECTED_MESSAGE_TYPE, messageType, buf.pos,
        buf.packetNum);
    }
  }

  /**
   * Processes one notification record returned by the server.
   */
  _processOac(buf) {
    buf.savePoint();
    const notification = {
      regId: BigInt(this.subscr.regId || 0),
      registered: true
    };

    // first part is the notification header
    const messageType = buf.readUB4();
    if (messageType === constants.TNS_SUBSCR_STOP_NOTIF) {
      // STOP_NOTIF is terminal for this subscription. Report it as a
      // deregistration event and retire the public subscription entry.
      notification.type = pubConstants.SUBSCR_EVENT_TYPE_DEREG;
      notification.registered = false;
      this.subscr._retire();
      this.endOfResponse = true;
      this.subscr._invokeCallback(notification);
      return;
    }
    buf.skipUB4();                             // error code
    buf.skipUB4();                             // registration id
    const queueName = buf.readStrAndLength();
    if (queueName) {
      notification.queueName = queueName;
    }
    const consumerName = buf.readStrAndLength();
    if (consumerName) {
      notification.consumerName = consumerName;
    }
    const msgId = buf.readBytesAndLength();
    if (msgId) {
      notification.msgId = Buffer.from(msgId);
    }

    // second part is the message properties
    this._processAqMsgProps(buf, notification);
    buf.readBytesAndLength();                  // JMS message properties

    // third part is the payload (not for AQ without currently unsupported flag)
    let payload = null;
    if (this.namespace !== pubConstants.SUBSCR_NAMESPACE_AQ) {
      buf.skipUB4();                           // payload type
      buf.skipUB4();                           // payload flags
      buf.skipUB4();                           // chunk number
      payload = buf.readBytesAndLength();
      buf.readBytesAndLength();                // DB object/JSON payload
    }
    this._processNotificationPayload(payload, notification);

    // invoke the callback with the notification that was created
    this.subscr._invokeCallback(notification);
  }

  /**
   * Processes AQ message properties, including extension key/value pairs.
   */
  _processAqMsgProps(buf, notification) {
    const numProps = buf.readUB4();
    if (numProps > 0) {
      const propsImpl = new ThinMsgPropsImpl();
      buf.skipUB1();                           // invalid length
      this._processMsgProps(buf, propsImpl);
      if (propsImpl.originalMsgId) {
        notification.originalMsgId = Buffer.from(propsImpl.originalMsgId);
      }
      if (propsImpl.senderAgentName) {
        notification.senderAgentName = propsImpl.senderAgentName.toString();
      }
      if (propsImpl.senderAgentAddress) {
        notification.senderAgentAddress =
          propsImpl.senderAgentAddress.toString();
      }
      notification.senderAgentProtocol = propsImpl.senderAgentProtocol;
    }
  }

  /**
   * Processes the notification payload and populates callback data.
   */
  _processNotificationPayload(payload, notification) {

    // payload is ignored for AQ notification
    if (this.namespace === pubConstants.SUBSCR_NAMESPACE_AQ) {
      notification.type = pubConstants.SUBSCR_EVENT_TYPE_AQ;
      return;
    }

    // Empty payload for DB/query change means the registration is discarded.
    // Retire the public subscription immediately so Thin does not retain a
    // callback for a registration that can no longer deliver notifications.
    // readBytesAndLength() returns undefined for a zero-length payload.
    if (payload == null) {
      notification.type = pubConstants.SUBSCR_EVENT_TYPE_DEREG;
      notification.registered = false;
      this.subscr._retire();
      this.endOfResponse = true;
      return;
    }

    // process payload for DB/query change notification
    if (this.subscr.qos & pubConstants.SUBSCR_QOS_DEREG_NFY) {
      notification.registered = false;
      this.subscr._retire();
      this.endOfResponse = true;
    }

    const payloadBuf = new BaseBuffer(payload);
    payloadBuf.readUInt16BE();                 // version
    payloadBuf.readUInt32BE();                 // registration id
    notification.type = payloadBuf.readUInt32BE();
    const dbNameLen = payloadBuf.readUInt16BE();
    if (dbNameLen > 0) {
      notification.dbName = payloadBuf.readBytes(dbNameLen).toString();
    }
    notification.txId = Buffer.from(payloadBuf.readBytes(8));
    payloadBuf.skipBytes(6);                   // SCN
    if (notification.type === pubConstants.SUBSCR_EVENT_TYPE_OBJ_CHANGE) {
      notification.tables = [];
      this._processTables(payloadBuf, notification.tables);
    } else if (notification.type ===
        pubConstants.SUBSCR_EVENT_TYPE_QUERY_CHANGE) {
      notification.queries = [];
      this._processQueries(payloadBuf, notification.queries);
    }
  }

  /**
   * Processes query-level notification entries.
   */
  _processQueries(buf, queries) {
    const numQueries = buf.readUInt16BE();
    for (let i = 0; i < numQueries; i++) {
      const id = buf.readBytes(8).readBigUInt64BE(0);   // query id
      const operation = buf.readUInt32BE();
      const query = {
        id,
        operation,
        tables: []
      };
      this._processTables(buf, query.tables);
      queries.push(query);
    }
  }

  /**
   * Processes row-level notification entries.
   */
  _processRows(buf, rows) {
    const numRows = buf.readUInt16BE();
    for (let i = 0; i < numRows; i++) {
      const operation = buf.readUInt32BE();
      const rowIdLen = buf.readUInt16BE();
      const rowId = buf.readBytes(rowIdLen).toString();
      rows.push({ operation, rowid: rowId });
    }
  }

  /**
   * Processes table-level notification entries.
   */
  _processTables(buf, tables) {
    const numTables = buf.readUInt16BE();
    for (let i = 0; i < numTables; i++) {
      const operation = buf.readUInt32BE();
      const tableNameLen = buf.readUInt16BE();
      const name = buf.readBytes(tableNameLen).toString();
      buf.readUInt32BE();                      // object num
      const table = { operation, name, rows: [] };
      if ((operation & pubConstants.CQN_OPCODE_ALL_ROWS) === 0) {
        this._processRows(buf, table.rows);
      }
      tables.push(table);
    }
  }

  /**
   * Writes the initial notify request payload to the wire buffer.
   */
  encode(buf) {
    buf._dataFlags = constants.TNS_DATA_FLAGS_END_OF_REQUEST;
    this.writeFunctionHeader(buf);
    buf.writeUB4(this.clientId.length);
    buf.writeBytesWithLength(this.clientId);
    buf.writeUInt8(constants.TNS_INIT_KPNDRREQ);
    buf.writeUB4(0);
  }

}

module.exports = NotifyMessage;
