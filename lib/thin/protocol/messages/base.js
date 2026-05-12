// Copyright (c) 2022, 2026, Oracle and/or its affiliates.

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
const types = require('../../../types.js');


// List of recoverable errors
const RECOVERABLE_ERRORS = new Set([
  28,     // session has been terminated
  31,     // session marked for kill
  376,    // file %s cannot be read at this time
  603,    // ORACLE server session terminated
  1012,   // not logged on
  1033,   // ORACLE initialization or shutdown in progress
  1034,   // the Oracle instance is not available for use
  1089,   // immediate shutdown or close in progress
  1090,   // shutdown in progress
  1092,   // ORACLE instance terminated
  1115,   // IO error reading block from file %s (block # %s)
  2396,   // exceeded maximum idle time
  3113,   // end-of-file on communication channel
  3114,   // not connected to ORACLE
  3135,   // connection lost contact
  12153,  // TNS:not connected
  12514,  // Service %s is not registered with the listener
  12537,  // TNS:connection closed
  12547,  // TNS:lost contact
  12570,  // TNS:packet reader failure
  12571,  // TNS:packet writer failure
  12583,  // TNS:no reader
  12757,  // instance does not currently know of requested service
  16456   // missing or invalid value
]);

// App Context constants.
const KeyValueSetContext = 0x01; // SET CONTEXT -send to server side
const KeyValueClearContext = 0x02; // CLEAR CONTEXT -send to server side
/**
 *
 * Base class for all the RPC messages to support encode/decode functions
 */
class Message {
  constructor(connection) {
    this.errorInfo = {};
    this.connection = connection;
    this.messageType = constants.TNS_MSG_TYPE_FUNCTION;
    this.functionCode = 0;
    this.callStatus = 0;
    this.flushOutBinds = false;
    this.endOfResponse = false;
    this.endToEndSeqNum = 0;
    this.errorOccurred = false;
    this.warning = undefined;
    this.tokenNum = 0;  // used for request-response correlation in pipelining
    this.isPipeline = connection.pipelineMode !== 0;
  }

  preProcess() { }
  async postProcess() { }

  writeFunctionHeader(buf) {
    this.writePiggybacks(buf);
    buf.writeUInt8(this.messageType);
    buf.writeUInt8(this.functionCode);
    buf.writeSeqNum();
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1_EXT_1) {
      buf.writeUB8(this.tokenNum);              // token number for pipelining
    }
  }

  processColumnInfo(buf, columnNum) {
    const dataType = buf.readUInt8();
    buf.skipUB1();                              // flags
    const precision = buf.readInt8();
    const scale = buf.readInt8();
    const maxSize = buf.readUB4();
    buf.skipUB4();                              // max number of array elements
    buf.skipUB8();                              // cont flags
    let oid;
    let numBytes = buf.readUB4();               // OID
    if (numBytes > 0) {
      oid = Buffer.from(buf.readBytesWithLength());
    }
    buf.skipUB2();                              // version
    buf.skipUB2();                              // character set id
    const csfrm = buf.readUInt8();              // character set form
    let size = buf.readUB4();
    if (dataType === constants.TNS_DATA_TYPE_RAW) {
      size = maxSize;
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_12_2) {
      buf.skipUB4();                            // oaccolid
    }
    const nullable = Boolean(buf.readUInt8());
    buf.skipUB1();                              // v7 length of name
    let name;
    numBytes = buf.readUB4();
    if (numBytes > 0) {
      name = buf.readStr(constants.CSFRM_IMPLICIT);
    }
    let schema;
    numBytes = buf.readUB4();
    if (numBytes > 0) {
      schema = buf.readStr(constants.CSFRM_IMPLICIT);
    }
    numBytes = buf.readUB4();
    let typeName;
    if (numBytes > 0) {
      typeName = buf.readStr(constants.CSFRM_IMPLICIT);
    }
    buf.skipUB2();                              // column position
    const udsFlags = buf.readUB4();             // uds flag

    // build metadata
    const fetchInfo = {
      name: name,
      dbColumnName: name,
      nullable: nullable,
    };

    try {
      fetchInfo.dbType = types.getTypeByOraTypeNum(dataType, csfrm);
    } catch {
      fetchInfo.dbType = types.getTypeByOraTypeNum(dataType, 0);
    }

    fetchInfo.isJson = Boolean(udsFlags & constants.TNS_UDS_FLAGS_IS_JSON);
    fetchInfo.isOson = Boolean(udsFlags & constants.TNS_UDS_FLAGS_IS_OSON);
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1) {
      numBytes = buf.readUB4();
      if (numBytes > 0) {
        fetchInfo.domainSchema = buf.readStr(constants.CSFRM_IMPLICIT);
      }
      numBytes = buf.readUB4();
      if (numBytes > 0) {
        fetchInfo.domainName = buf.readStr(constants.CSFRM_IMPLICIT);
      }
    }
    if (
      buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_1_EXT_3
    ) {
      if (buf.readUB4() > 0) {
        fetchInfo.annotations = {};
        buf.skipUB1();
        const numAnnotations = buf.readUB4();
        buf.skipUB1();
        let key, value;
        for (let i = 0; i < numAnnotations; i++) {
          buf.skipUB4();
          value = "";
          key = buf.readStr(constants.CSFRM_IMPLICIT);
          numBytes = buf.readUB4();
          if (numBytes > 0) {
            value = buf.readStr(constants.CSFRM_IMPLICIT);
          }
          fetchInfo.annotations[key] = value;
          buf.skipUB4();                        // flags
        }
        buf.skipUB4();                          // flags
      }
    }
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_23_4) {
      const dimensions = buf.readUB4();
      const vectorFormat = buf.readUInt8();
      const vectorFlags = buf.readUInt8();
      if (fetchInfo.dbType === types.DB_TYPE_VECTOR) {
        if (!(vectorFlags & constants.VECTOR_META_FLAG_FLEXIBLE_DIM)) {
          fetchInfo.vectorDimensions = dimensions;
        }
        fetchInfo.isSparseVector = Boolean(
          vectorFlags & constants.VECTOR_META_FLAG_SPARSE
        );
        if (vectorFormat !== constants.VECTOR_FORMAT_FLEX) {
          fetchInfo.vectorFormat = vectorFormat;
        }
      }
    }

    switch (fetchInfo.dbType) {
      case types.DB_TYPE_VARCHAR:
      case types.DB_TYPE_NVARCHAR:
      case types.DB_TYPE_CHAR:
      case types.DB_TYPE_NCHAR:
      case types.DB_TYPE_RAW:
        fetchInfo.byteSize = size;
        break;
      case types.DB_TYPE_NUMBER:
        fetchInfo.precision = precision;
        break;
      case types.DB_TYPE_TIMESTAMP:
      case types.DB_TYPE_TIMESTAMP_TZ:
      case types.DB_TYPE_TIMESTAMP_LTZ:
        fetchInfo.precision = scale;
        break;
      case types.DB_TYPE_OBJECT:
        fetchInfo.dbTypeClass = this.connection._getDbObjectType(
          schema,
          typeName,
          undefined,
          oid
        );
        if (fetchInfo.dbTypeClass.partial) {
          this.connection._partialDbObjectTypes.push(fetchInfo.dbTypeClass);
        }
        if (fetchInfo.dbTypeClass.isXmlType) {
          fetchInfo.dbType = types.DB_TYPE_XMLTYPE;
        }
        break;
      default:
        break;
    }
    if (fetchInfo.dbType === types.DB_TYPE_NUMBER) {
      fetchInfo.scale = scale;
    }
    const result = {
      fetchInfo: fetchInfo,
      type: fetchInfo.dbType,
      maxSize: maxSize,
      columnNum: columnNum,
      values: new Array(this.options?.fetchArraySize)
    };
    return result;
  }

  processErrorInfo(buf) {
    this.callStatus = buf.readUB4();            // end of call status
    buf.skipUB2();                              // end to end seq number
    buf.skipUB4();                              // current row number
    buf.skipUB2();                              // error number
    buf.skipUB2();                              // array elem error
    buf.skipUB2();                              // array elem error
    this.errorInfo.cursorId = buf.readUB2();    // cursor id
    const errorPos = buf.readSB2();             // error position
    buf.skipUB1();                              // sql type (19c and earlier)
    buf.skipUB1();                              // fatal ?
    buf.skipUB1();                              // flags
    buf.skipUB1();                              // user cursor options
    buf.skipUB1();                              // UPI parameter
    const warnFlag = buf.readUInt8();           // warning flag
    if (warnFlag & constants.TNS_WARN_COMPILATION_CREATE) {
      this.warning = errors.getErr(errors.WRN_COMPILATION_CREATE);
    }
    this.errorInfo.rowID = buf.readRowID();     // rowid
    buf.skipUB4();                              // OS error
    buf.skipUB1();                              // statement error
    buf.skipUB1();                              // call number
    buf.skipUB2();                              // padding
    buf.skipUB4();                              // success iters
    const numBytes = buf.readUB4();               // oerrdd (logical rowid)
    if (numBytes > 0) {
      buf.skipBytesChunked();
    }
    // batch error codes
    const numErrors = buf.readUB2();             // batch error codes array
    if (numErrors > 0) {
      this.errorInfo.batchErrors = [];
      const firstByte = buf.readUInt8();
      for (let i = 0; i < numErrors; i++) {
        if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
          buf.skipUB4();                        // chunk length ignored
        }
        const errorCode = buf.readUB2();
        this.errorInfo.batchErrors.push(new Error(errorCode));
      }
      if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
        buf.skipBytes(1);                       // ignore end marker
      }
    }

    // batch error offset
    const numOffsets = buf.readUB4();           // batch error row offset array
    if (numOffsets > 0) {
      if (numOffsets > 65535) {
        errors.throwErr(errors.ERR_TOO_MANY_BATCH_ERRORS);
      }
      const firstByte = buf.readUInt8();
      let offset;
      for (let i = 0; i < numOffsets; i++) {
        if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
          buf.skipUB4();                        // chunk length ignored
        }
        offset = buf.readUB4();
        if (i < numErrors) {
          this.errorInfo.batchErrors[i].offset = offset;
        }
      }
      if (firstByte === constants.TNS_LONG_LENGTH_INDICATOR) {
        buf.skipBytes(1);                       // ignore end marker
      }
    }

    // batch error messages
    const errMsgArr = buf.readUB2();                 // batch error messages array
    if (errMsgArr > 0) {
      buf.skipBytes(1);                         // ignore packed size
      for (let i = 0; i < errMsgArr; i++) {
        buf.skipUB2();                          // skip chunk length

        this.errorInfo.batchErrors[i].message = buf.readStr(constants.CSFRM_IMPLICIT);
        buf.skipBytes(2);                       // ignore end marker
      }
    }

    this.errorInfo.num = buf.readUB4();         // error number (extended)
    this.errorInfo.rowCount = buf.readUB8();    // row number (extended)

    // fields added in Oracle Database 20c
    if (buf.caps.ttcFieldVersion >= constants.TNS_CCAP_FIELD_VERSION_20_1) {
      buf.skipUB4();                           // sql type
      buf.skipUB4();                           // server checksum
    }

    // error message
    if (this.errorInfo.num !== 0) {
      this.errorOccurred = true;
      if (errorPos >= 0) {
        this.errorInfo.pos = errorPos;
      }
      this.errorInfo.message = buf.readStr(constants.CSFRM_IMPLICIT);
      /*
       * Remove ending newline from ORA error message
       */
      this.errorInfo.message = this.errorInfo.message.trim();
    }
    this.errorInfo.isRecoverable = RECOVERABLE_ERRORS.has(this.errorInfo.num);

    this.endOfResponse = !this.connection.nscon.endOfRequestSupport;
  }

  processReturnParameter() { }

  processWarningInfo(buf) {
    const errNum = buf.readUB2();              // warning number
    const numBytes = buf.readUB2();            // length of warning message
    buf.skipUB2();                             // flags
    if (errNum != 0 && numBytes > 0) {
      // get message string and remove the ending newline.
      const message = buf.readStr(constants.CSFRM_IMPLICIT).trim();
      this.warning = new Error(message);
      this.warning.errorNum = errNum;
    }
  }

  decode(buf) {
    this.process(buf);
  }

  process(buf) {
    this.endOfResponse = false;
    this.flushOutBinds = false;
    do {
      this.savePoint(buf);
      const messageType = buf.readUInt8();
      this.processMessage(buf, messageType);
    } while (!this.endOfResponse);
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
      this.endOfResponse = !this.connection.nscon.endOfRequestSupport;
    } else if (messageType === constants.TNS_MSG_TYPE_PARAMETER) {
      this.processReturnParameter(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_SERVER_SIDE_PIGGYBACK) {
      this.processServerSidePiggyBack(buf);
    } else if (messageType === constants.TNS_MSG_TYPE_END_OF_REQUEST) {
      this.endOfResponse = true;
    } else if (messageType === constants.TNS_MSG_TYPE_TOKEN) {
      const tokenNum = buf.readUB8();
      if (tokenNum !== this.tokenNum) {
        errors.throwErr(errors.ERR_PIPELINE_MISMATCHED_TOKEN, tokenNum,
          this.tokenNum);
      }
    } else {
      errors.throwErr(errors.ERR_UNEXPECTED_MESSAGE_TYPE, messageType, buf.pos, buf.packetNum);
    }
  }

  processServerSidePiggyBack(buf) {
    const opcode = buf.readUInt8();
    if (opcode === constants.TNS_SERVER_PIGGYBACK_LTXID) {
      const num_bytes = buf.readUB4();
      if (num_bytes > 0) {
        this.connection._ltxid = Buffer.from(buf.readBytesWithLength());
      }
    } else if ((opcode === constants.TNS_SERVER_PIGGYBACK_QUERY_CACHE_INVALIDATION)
     || (opcode === constants.TNS_SERVER_PIGGYBACK_TRACE_EVENT)) {
      // pass
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_OS_PID_MTS) {
      const numDtys = buf.readUB2();
      buf.skipUB1();
      buf.skipBytes(numDtys);
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_SYNC) {
      buf.skipUB2();                            // skip number of DTYs
      buf.skipUB1();                            // skip length of DTYs
      const num_elements = buf.readUB4();
      buf.skipBytes(1);                         // skip length
      for (let i = 0; i < num_elements; i++) {
        let numBytes = buf.readUB2();
        let keyTextValue, value;
        if (numBytes > 0) {                       // read key
          keyTextValue = buf.readStr(constants.CSFRM_IMPLICIT);
        }
        numBytes = buf.readUB2();
        if (numBytes > 0)                         // read value
          value = buf.readBytesWithLength();
        const keywordNum = buf.readUB2();         // read keyword number
        if (keywordNum == constants.TNS_KEYWORD_NUM_TRANSACTION_ID) {
          this._updateSessionlessTxnState(value);
        } else if (keywordNum === constants.TNS_KEYWORD_NUM_CURRENT_SCHEMA) {
          this.connection.currentSchema = keyTextValue;
        } else if (keywordNum === constants.TNS_KEYWORD_NUM_EDITION) {
          this.connection._edition = keyTextValue;
        } else if (keywordNum === constants.TNS_KEYWORD_DBNAME) {
          this.connection.dbName = keyTextValue;
        } else if (keywordNum === constants.TNS_KEYWORD_PDBNAME) {
          this.connection.pdbName = keyTextValue;
        }
      }
      buf.skipUB4();                            // skip overall flags
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_EXT_SYNC) {
      buf.skipUB2();
      buf.skipUB1();
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_AC_REPLAY_CONTEXT) {
      buf.skipUB2();                            // skip number of DTYs
      buf.skipUB1();                            // skip length of DTYs
      buf.skipUB4();                            // skip flags
      buf.skipUB4();                            // skip error code
      buf.skipUB1();                            // skip queue
      const num_bytes = buf.readUB4();          // skip replay context
      if (num_bytes > 0) {
        buf.skipBytesChunked();
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
            buf.skipBytesChunked();
          }
          temp16 = buf.readUB2();
          if (temp16 > 0) {                     // skip value
            buf.skipBytesChunked();
          }
          buf.skipUB2();                        // skip flags
        }
      }
      const flags = buf.readUB4();              // session flags
      if (flags & constants.TNS_SESSGET_SESSION_CHANGED) {
        if (this.connection._drcpEstablishSession) {
          this.connection.statementCache.clearCursors();
        }
      }
      this.connection._drcpEstablishSession = false;
      buf.skipUB4();                            // session id
      buf.skipUB2();                            // serial number
    } else if (opcode === constants.TNS_SERVER_PIGGYBACK_SESS_SIGNATURE) {
      buf.skipUB2();                              // number of dtys
      buf.skipUB1();                              // length of dty
      buf.skipUB8();                              // signature flags
      buf.skipUB8();                              // client signature
      buf.skipUB8();                              // server signature
    } else {
      errors.throwErr(errors.ERR_UNKOWN_SERVER_SIDE_PIGGYBACK, opcode);
    }
  }

  _writeBeginPipelinePiggyback(buf) {
    buf._dataFlags |= constants.TNS_DATA_FLAGS_BEGIN_PIPELINE;
    this.writePiggybackHeader(buf, constants.TNS_FUNC_PIPELINE_BEGIN);
    buf.writeUB2(0);                            // error set ID
    buf.writeUInt8(0);                          // error set mode
    buf.writeUInt8(this.connection.pipelineMode);
  }

  writePiggybacks(buf) {
    // Don't write piggybacks if not authenticated yet
    if (this.connection._protocol.connInProgress)
      return;

    if (this.connection.securityContext) {
      this._writeEndUserSecurityContextPiggyback(buf);
    }
    if (this.connection.pipelineMode) {
      this._writeBeginPipelinePiggyback(buf);
      this.connection.pipelineMode = 0;
    }
    if (this.connection._currentSchemaModified) {
      this._writeCurrentSchemaPiggyback(buf);
    }
    this._writeApplicationContextPiggyback(buf);
    if (this.connection.statementCache._cursorsToClose.size > 0 && !this.connection._drcpEstablishSession) {
      // skip closing cursors when '_drcpEstablishSession = true' Since we don't know whether the same session
      // is in use. We can not send the information across until after the session information has been returned
      // (on the first round trip).
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
    if (this.connection._sessionlessData?.pending) {
      this.connection._sessionlessData.pending = false;
      this.connection._sessionlessData.piggyback.encode(buf);
      this.connection._sessionlessData.piggyback = null;
    }
  }

  writePiggybackHeader(buf, functionCode) {
    buf.writeUInt8(constants.TNS_MSG_TYPE_PIGGYBACK);
    buf.writeUInt8(functionCode);
    buf.writeSeqNum();
    if (buf.caps.ttcFieldVersion >=
      constants.TNS_CCAP_FIELD_VERSION_23_1_EXT_1) {
      buf.writeUB8(buf.tokenNum);               // token number for pipelining
    }
  }

  writeCloseCursorsPiggyBack(buf) {
    this.writePiggybackHeader(buf, constants.TNS_FUNC_CLOSE_CURSORS);
    buf.writeUInt8(1);
    this.connection.statementCache.writeCursorsToClose(buf);
  }

  writeCloseTempLobsPiggyback(buf) {
    const lobsToClose = this.connection._tempLobsToClose;
    const opCode = constants.TNS_LOB_OP_FREE_TEMP | constants.TNS_LOB_OP_ARRAY;

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

  // Writes the piggyback that informs the server of the EndUserSecurityContext.
  _writeEndUserSecurityContextPiggyback(buf) {
    const encoded = this.connection.securityContext.getDeobfuscatedValue();
    this.writePiggybackHeader(buf, constants.TNS_FUNC_END_USER_SECURITY_CTX);
    buf.writeUB4(constants.TNS_SECURITY_CONTEXT_ATTACH_FLAG);
    buf.writeUInt8(1); // pointer(kpdkve)
    buf.writeUB4(1);   // number of key values
    buf.writeStrKeywordValuePair("ORCL_XS_AUTHZ_CONTEXT", encoded);
    encoded.fill(0);
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

    const clientIdentifierBytes = this.writeEndEndTraceValue(buf, this.connection._clientIdentifier, this.connection._clientIdentifierModified);
    const moduleBytes = this.writeEndEndTraceValue(buf, this.connection._module, this.connection._moduleModified);
    const actionBytes = this.writeEndEndTraceValue(buf, this.connection._action, this.connection._actionModified);

    // write unsupported bits
    buf.writeUInt8(0);                  // pointer (cideci)
    buf.writeUB4(0);                    // length (cideci)
    buf.writeUInt8(0);                  // cidcct
    buf.writeUB4(0);                    // cidecs

    const clientInfoBytes = this.writeEndEndTraceValue(buf, this.connection._clientInfo, this.connection._clientInfoModified);
    // write unsupported bits
    buf.writeUInt8(0);                  // pointer (cideci)
    buf.writeUB4(0);                    // length (cideci)
    buf.writeUInt8(0);                  // cidcct
    buf.writeUB4(0);                    // cidecs
    const dbOpBytes = this.writeEndEndTraceValue(buf, this.connection._dbOp, this.connection._dbOpModified);

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

  _writeApplicationContextPiggyback(buf) {
    const nameSpaces = this.connection._nameSpaceMap;
    if (!nameSpaces) {
      return; // nothing to send
    }

    for (const [key, nameSpace] of nameSpaces) {
      this.writePiggybackHeader(buf, constants.TNS_FUNC_APP_CONTEXT);

      // send metadata first
      const nsBytes = Buffer.from(nameSpace.nameSpaceName);
      if (nsBytes.length > 0) {
        buf.writeUInt8(1); // ptr
        buf.writeUB4(nsBytes.length);
      } else {
        buf.writeUInt8(0); // null ptr
      }
      const keyValues = nameSpace.keyValues;
      if (keyValues.length > 0) {
        buf.writeUInt8(1); // ptr
      } else {
        buf.writeUInt8(0); // null ptr
      }
      buf.writeUB4(keyValues.length);

      let flag = 0;
      if (keyValues.length > 0) flag = KeyValueSetContext;
      if (nameSpace.pendingClear) flag |= KeyValueClearContext;
      buf.writeUB2(flag);
      buf.writeUInt8(0);
      // --- end of metadata

      // --- now send the values
      buf.writeBytesWithLength(nsBytes);
      for (const obj of keyValues) {
        const [entryKey, entryValue] = Object.entries(obj)[0];
        buf.writeKeyValue(entryKey, entryValue);
      }
      nameSpaces.delete(key);
    }
  }

  // Called when an error is encountered during decode of RPC
  saveDeferredErr() {
    if (!this.deferredErr) {
      this.deferredErr = errors.getErr(...arguments);
    }
  }

  _updateSessionlessTxnState(buf) {
    const length = buf.length;
    const sessionlessState = buf.readUInt8(length - 2);
    const syncVersion = buf.readUInt8(length - 1);
    let startedOnServer;

    if (syncVersion == constants.TNS_TPC_TRANS_TRANSACTION_ID_SYNC_VERSION_1) {
      // transactionId got unset for this session (txn ended or suspended)
      if (sessionlessState &
        constants.TNS_TPC_TRANS_TRANSACTION_ID_SYNC_UNSET) {
        this.connection._sessionlessData = null;
        this.connection._protocol.txnInProgress = false;
      // transactionId got set for this session
      } else if (sessionlessState &
        constants.TNS_TPC_TRANS_TRANSACTION_ID_SYNC_SET) {

        // transaction initialized by PL/SQL procedure
        if (sessionlessState &
            constants.TNS_TPC_TRANS_TRANSACTION_ID_SYNC_SERVER)
          startedOnServer = true;
        // transaction initialized by calling client API(RPC call)
        else if (sessionlessState &
          constants.TNS_TPC_TRANS_TRANSACTION_ID_SYNC_CLIENT)
          startedOnServer = false;

        this.connection._sessionlessData = {
          startedOnServer: startedOnServer,
        };
        this.connection._protocol.txnInProgress = true;
      }
    } else
      errors.throwErr(errors.ERR_INTERNAL, 'Unexpected TransactionId sync ' +
        'version in session sync piggyback.');
  }

}

module.exports = Message;
