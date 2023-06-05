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

const { Buffer } = require('buffer');
const constants = require("../constants.js");
const errors = require("../../../errors.js");

class OracleErrorInfo {
  constructor() {
    this.num = 0;
    this.cursorId = 0;
    this.pos = 0;
    this.rowCount = 0;
    this.message = "";
    this.rowID = null;
    this.batchErrors;
  }
}

class Error {
  constructor(num, message = "", context = "", isRecoverable = false, isWarning = false, code = 0, offset = 0) {
    this.num = num;
    this.message = message;
    this.context = context;
    this.isRecoverable = isRecoverable;
    this.isWarning = isWarning;
    this.code = code;
    this.offset = offset;
  }
}

/**
 *
 * Base class for all the RPC messages to support encode/decode functions
 */
class Message {
  constructor(connection) {
    this.errorInfo = new OracleErrorInfo();
    this.connection = connection;
    this.messageType = constants.TNS_MSG_TYPE_FUNCTION;
    this.functionCode = 0;
    this.callStatus = 0;
    this.flushOutBinds = false;
    this.endToEndSeqNum = 0;
    this.errorOccurred = false;
    this.isWarning = false;
    this.flushOutBinds = false;
    this.processedError = false;
  }

  preProcess() { }
  async postProcess() { }

  writeFunctionHeader(buf) {
    buf.writeUInt8(this.messageType);
    buf.writeUInt8(this.functionCode);
    buf.writeSeqNum();
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1_EXT_1) {
      buf.writeUB8(0);                          // token number
    }
  }

  processErrorInfo(buf) {
    this.callStatus = buf.readUB4();            // end of call status
    buf.skipUB2();                              // end to end seq number
    buf.skipUB4();                              // current row number
    buf.skipUB2();                              // error number
    buf.skipUB2();                              // array elem error
    buf.skipUB2();                              // array elem error
    this.errorInfo.cursorId = buf.readUB2();    // cursor id
    this.errorInfo.pos = buf.readUB2();         // error position
    buf.skipUB1();                              // sql type
    buf.skipUB1();                              // fatal ?
    buf.skipUB2();                              // flags
    buf.skipUB2();                              // user cursor options
    buf.skipUB1();                              // UPI parameter
    buf.skipUB1();                              // warning flag
    this.errorInfo.rowID = buf.readRowID();     // rowid
    buf.skipUB4();                              // OS error
    buf.skipUB1();                              // statement error
    buf.skipUB1();                              // call number
    buf.skipUB2();                              // padding
    buf.skipUB4();                              // success iters
    let numBytes = buf.readUB4();               // oerrdd (logical rowid)
    if (numBytes > 0) {
      buf.skipBytesChunked();
    }
    // batch error codes
    let numEntries = buf.readUB2();             // batch error codes array
    if (numEntries > 0) {
      this.errorInfo.batchErrors = [];
      let firstByte = buf.readUInt8();
      for (let i = 0; i < numEntries; i++) {
        if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
          buf.skipUB4();                        // chunk length ignored
        }
        let errorCode = buf.readUB2();
        this.errorInfo.batchErrors.push(new Error(errorCode));
      }
      if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
        buf.skipBytes(1);                       // ignore end marker
      }
    }

    // batch error offset
    numEntries = buf.readUB2();                 // batch error row offset array
    if (numEntries > 0) {
      let firstByte = buf.readUInt8();
      for (let i = 0; i < numEntries; i++) {
        if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
          buf.skipUB4();                        // chunk length ignored
        }
        this.errorInfo.batchErrors[i].offset = buf.readUB4();
      }
      if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
        buf.skipBytes(1);                       // ignore end marker
      }
    }

    // batch error messages
    numEntries = buf.readUB2();                 // batch error messages array
    if (numEntries > 0) {
      buf.skipBytes(1);                         // ignore packed size
      for (let i = 0; i < numEntries; i++) {
        buf.skipUB2();                          // skip chunk length

        this.errorInfo.batchErrors[i].message = buf.readStr(constants.TNS_CS_IMPLICIT);
        buf.skipBytes(2);                       // ignore end marker
      }
    }

    this.errorInfo.num = buf.readUB4();         // error number (extended)
    this.errorInfo.rowCount = buf.readUB8();    // row number (extended)
    if (this.errorInfo.num !== 0) {
      this.errorOccurred = true;
      this.errorInfo.message = buf.readStr(constants.TNS_CS_IMPLICIT);
      /*
       * Remove ending newline from ORA error message
       */
      this.errorInfo.message = this.errorInfo.message.replace(/\n+$/, "");
    }
    this.errorInfo.isWarning = false;
    this.processedError = true;
  }

  processReturnParameter() { }

  processWarningInfo(buf) {
    this.errorInfo.num = buf.readUB2();         // error number
    let numBytes = buf.readUB2();               // length of error message
    buf.skipUB2();                              // flags
    if (this.errorInfo.num != 0 && numBytes > 0) {
      this.errorInfo.message = buf.readStr(constants.TNS_CS_IMPLICIT);
    }
    this.errorInfo.isWarning = true;
  }

  hasMoreData(buf) {
    return buf.numBytesLeft() > 0 && !this.flushOutBinds;
  }

  decode(buf) {
    this.process(buf);
  }

  process(buf) {
    this.flushOutBinds = false;
    this.processedError = false;
    do {
      this.savePoint(buf);
      const messageType = buf.readUInt8();
      this.processMessage(buf, messageType);
    } while (this.hasMoreData(buf));
  }

  savePoint(buf) {
    buf.savePoint();
  }

  processMessage(buf, messageType) {
    if (messageType === constants.TNS_MSG_TYPE_ERROR) {
      this.processErrorInfo(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_WARNING) {
      this.processWarningInfo(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_STATUS) {
      this.callStatus = buf.readUB4();
      this.endToEndSeqNum = buf.readUB2();
    } else if (messageType === constants.TNS_MSG_TYPE_PARAMETER) {
      this.processReturnParameter(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_SERVER_SIDE_PIGGYBACK) {
      this.processServerSidePiggyBack(buf);
    } else {
      errors.throwErr(errors.ERR_UNEXPECTED_MESSAGE_TYPE, messageType);
    }
  }

  processServerSidePiggyBack(buf) {
    const opcode = buf.readUInt8();
    if (opcode === constants.TNS_SERVER_PIGGYBACK_LTXID) {
      const num_bytes = buf.readUB4();
      if (num_bytes > 0) {
        buf.skipBytes(num_bytes);
      }
    } else if ((opcode === constants.TNS_SERVER_PIGGYBACK_QUERY_CACHE_INVALIDATION)
     || (opcode === constants.TNS_SERVER_PIGGYBACK_TRACE_EVENT)) {
      // pass
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_OS_PID_MTS) {
      const nb = buf.readUB2();
      buf.skipBytes(nb + 1);
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_SYNC) {
      buf.skipUB2();                            // skip number of DTYs
      buf.skipUB1();                            // skip length of DTYs
      const num_elements = buf.readUB2();
      buf.skipBytes(1);                         // skip length
      for (let i = 0; i < num_elements; i++) {
        let temp16 = buf.readUB2();
        if (temp16 > 0) {                       // skip key
          buf.skipBytes(temp16 + 1);
        }
        temp16 = buf.readUB2();
        if (temp16 > 0) {                       // skip value
          buf.skipBytes(temp16 + 1);
        }
        buf.skipUB2();                          // skip flags
        buf.skipUB4();                          // skip overall flags
      }
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_EXT_SYNC) {
      buf.skipUB2();
      buf.skipUB1();
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_AC_REPLAY_CONTEXT) {
      buf.skipUB2();                            // skip number of DTYs
      buf.skipUB1(1);                           // skip length of DTYs
      buf.skipUB4();                            // skip flags
      buf.skipUB4();                            // skip error code
      buf.skipUB1();                            // skip queue
      const num_bytes = buf.readUB4();          // skip replay context
      if (num_bytes > 0) {
        buf.skipBytes(num_bytes);
      }
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_SESS_RET) {
      buf.skipUB2();
      buf.skipUB1();
      const num_elements = buf.readUB2();
      if (num_elements > 0) {
        buf.skipUB1();
        for (let i = 0; i < num_elements; ++i) {
          let temp16 = buf.readUB2();
          if (temp16 > 0) {                     // skip key
            buf.skipBytes(temp16 + 1);
          }
          temp16 = buf.readUB2();
          if (temp16 > 0) {                     // skip value
            buf.skipBytes(temp16 + 1);
          }
          buf.skipUB2();                        // skip flags
        }
      }
      const flags = buf.readUB4();              // session flags
      if (flags & constants.TNS_SESSGET_SESSION_CHANGED) {
        if (this.connection._drcpEstablishSession) {
          this.connection.resetStatmentCache();
        }
      }
      this.connection._drcpEstablishSession = false;
      buf.skipUB4();                            // session id
      buf.skipUB2();                            // serial number
    } else {
      errors.throwErr(errors.ERR_UNKOWN_SERVER_SIDE_PIGGYBACK, opcode);
    }
  }

  writePiggybacks(buf) {
    if (this.connection._currentSchemaModified) {
      this._writeCurrentSchemaPiggyback(buf);
    }
    if (this.connection._cursorsToClose.size > 0 && !this.connection._drcpEstablishSession) {
      this.writeCloseCursorsPiggyBack(buf);
    }
    if (
      this.connection._actionModified ||
      this.connection._clientIdentifierModified ||
      this.connection._dbopModified ||
      this.connection._clientInfoModified ||
      this.connection._moduleModified
    ) {
      this._writeEndToEndPiggybacks(buf);
    }
    if (this.connection._tempLobsTotalSize > 0) {
      this.writeCloseTempLobsPiggyback(buf);
    }
  }

  writePiggybackHeader(buf, functionCode) {
    buf.writeUInt8(constants.TNS_MSG_TYPE_PIGGYBACK);
    buf.writeUInt8(functionCode);
    buf.writeSeqNum();
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1_EXT_1) {
      buf.writeUB8(0);                          // token number
    }
  }

  writeCloseCursorsPiggyBack(buf) {
    this.writePiggybackHeader(buf, constants.TNS_FUNC_CLOSE_CURSORS);
    buf.writeUInt8(1);
    buf.writeUB4(this.connection._cursorsToClose.size);
    for (const cursorNum of this.connection._cursorsToClose.keys()) {
      buf.writeUB4(cursorNum);
    }
    this.connection._cursorsToClose.clear();
  }

  writeCloseTempLobsPiggyback(buf) {
    let lobsToClose = this.connection._tempLobsToClose;
    let opCode = constants.TNS_LOB_OP_FREE_TEMP | constants.TNS_LOB_OP_ARRAY;

    this.writePiggybackHeader(buf, constants.TNS_FUNC_LOB_OP);

    buf.writeUInt8(1); // pointer
    buf.writeUB4(this.connection._tempLobsTotalSize);
    buf.writeUInt8(0); // dest LOB locator
    buf.writeUB4(0);
    buf.writeUB4(0); // source LOB locator
    buf.writeUB4(0);
    buf.writeUInt8(0); // source LOB offset
    buf.writeUInt8(0); // dest LOB offset
    buf.writeUInt8(0); // charset
    buf.writeUB4(opCode);
    buf.writeUInt8(0); // scn
    buf.writeUB4(0); // LOB scn
    buf.writeUB8(0); // LOB scnl
    buf.writeUB8(0);
    buf.writeUInt8(0);

    // array LOB fields
    buf.writeUInt8(0);
    buf.writeUB4(0);
    buf.writeUInt8(0);
    buf.writeUB4(0);
    buf.writeUInt8(0);
    buf.writeUB4(0);
    for (const val of lobsToClose) {
      buf.writeBytes(val);
    }

    // Reset Values
    this.connection._tempLobsToClose = [];
    this.connection._tempLobsTotalSize = 0;
  }

  _writeCurrentSchemaPiggyback(buf) {
    this.writePiggybackHeader(buf, constants.TNS_FUNC_SET_SCHEMA);
    buf.writeUInt8(1);
    const bytes = Buffer.byteLength(this.connection.currentSchema);
    buf.writeUB4(bytes);
    buf.writeBytesWithLength(Buffer.from(this.connection.currentSchema));
  }

  _writeEndToEndPiggybacks(buf) {
    let flags = 0;

    // determine which flags to send
    if (this.connection._actionModified) {
      flags |= constants.TNS_END_TO_END_ACTION;
    }
    if (this.connection._clientIdentifierModified) {
      flags |= constants.TNS_END_TO_END_CLIENT_IDENTIFIER;
    }
    if (this.connection._clientInfoModified) {
      flags |= constants.TNS_END_TO_END_CLIENT_INFO;
    }
    if (this.connection._moduleModified) {
      flags |= constants.TNS_END_TO_END_MODULE;
    }
    if (this.connection._dbOpModified) {
      flags |= constants.TNS_END_TO_END_DBOP;
    }

    // write initial packet data
    this.writePiggybackHeader(buf, constants.TNS_FUNC_SET_END_TO_END_ATTR);
    buf.writeUInt8(0);                  // pointer (cidnam)
    buf.writeUInt8(0);                  // pointer (cidser)
    buf.writeUB4(flags);

    let clientIdentifierBytes = this.writeEndEndTraceValue(buf, this.connection._clientIdentifier, this.connection._clientIdentifierModified);
    let moduleBytes = this.writeEndEndTraceValue(buf, this.connection._module, this.connection._moduleModified);
    let actionBytes = this.writeEndEndTraceValue(buf, this.connection._action, this.connection._actionModified);

    // write unsupported bits
    buf.writeUInt8(0);                  // pointer (cideci)
    buf.writeUB4(0);                    // length (cideci)
    buf.writeUInt8(0);                  // cidcct
    buf.writeUB4(0);                    // cidecs

    let clientInfoBytes = this.writeEndEndTraceValue(buf, this.connection._clientInfo, this.connection._clientInfoModified);
    // write unsupported bits
    buf.writeUInt8(0);                  // pointer (cideci)
    buf.writeUB4(0);                    // length (cideci)
    buf.writeUInt8(0);                  // cidcct
    buf.writeUB4(0);                    // cidecs
    let dbOpBytes = this.writeEndEndTraceValue(buf, this.connection._dbOp, this.connection._dbOpModified);

    // write strings
    if (this.connection._clientIdentifierModified && this.connection._clientIdentifier) {
      buf.writeBytesWithLength(clientIdentifierBytes);
    }
    if (this.connection._moduleModified && this.connection._module) {
      buf.writeBytesWithLength(moduleBytes);
    }
    if (this.connection._actionModified && this.connection._action) {
      buf.writeBytesWithLength(actionBytes);
    }
    if (this.connection._clientInfoModified && this.connection._clientInfo) {
      buf.writeBytesWithLength(clientInfoBytes);
    }
    if (this.connection._dbOpModified && this.connection._dbOp) {
      buf.writeBytesWithLength(dbOpBytes);
    }

    // reset flags and values
    this.connection._actionModified = false;
    this.connection._action = "";
    this.connection._clientIdentifierModified = false;
    this.connection._clientIdentifier = "";
    this.connection._clientInfoModified = false;
    this.connection._clientInfo = "";
    this.connection._dbOpModified = false;
    this.connection._dbOp = "";
    this.connection._moduleModified = false;
    this.connection._module = "";
  }

  writeEndEndTraceValue(buf, value, modified) {
    // write client identifier header info
    let writtenBytes;
    if (modified) {
      buf.writeUInt8(1);              // pointer (client identifier)
      if (value) {
        writtenBytes = Buffer.from(value);
        buf.writeUB4(writtenBytes.length);
      } else {
        buf.writeUB4(0);
      }
    } else {
      buf.writeUInt8(0);              // pointer (client identifier)
      buf.writeUB4(0);                // length of client identifier
    }
    return writtenBytes;
  }
}

module.exports = Message;
