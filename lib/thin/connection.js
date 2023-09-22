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
const ConnectionImpl = require('../impl/connection.js');
const ThinResultSetImpl = require('./resultSet.js');
const ThinLobImpl  = require("./lob.js");
const Protocol = require("./protocol/protocol.js");
const { BaseBuffer } = require('./protocol/buffer.js');
const {NetworkSession:nsi} = require("./sqlnet/networkSession.js");
const { Statement } = require("./statement");
const thinUtil = require('./util');
const sqlNetConstants = require('./sqlnet/constants.js');
const constants = require('./protocol/constants.js');
const process = require('process');
const types = require('../types.js');
const errors = require("../errors.js");
const messages = require('./protocol/messages');

const finalizationRegistry = new global.FinalizationRegistry((heldValue) => {
  heldValue.disconnect();
});

class TDSBuffer extends BaseBuffer {
}

const connectionCookies = new Map();

class ThinConnectionImpl extends ConnectionImpl {

  /**
   * Terminates the connection
   *
   * @return {Promise}
   */
  async close() {
    try {
      if (this._protocol.txnInProgress) {
        await this.rollback();
      }
      this._protocol.callTimeout = 0;      // not applicable for close
      if (this._drcpEnabled) {
        await this._sessRelease();
        this._drcpEstablishSession = true;
      }

      if (this._pool && !this._dropSess) {
        await this._pool.release(this);
      } else {
        if (!this._drcpEnabled) {
          const message = new messages.LogOffMessage(this);
          await this._protocol._processMessage(message);
        }
        this.nscon.disconnect();
      }
    } catch (err) {
      // immediate close of open socket on failure
      // exception won't be thrown to user
      this.nscon.disconnect(sqlNetConstants.NSFIMM);
    }
  }

  async _sessRelease() {
    const message = new messages.SessionReleaseMessage(this);
    if (!this.isPooled()) {
      message.sessReleaseMode = constants.DRCP_DEAUTHENTICATE;
    }
    await this._protocol._processMessage(message);
  }

  //---------------------------------------------------------------------------
  // _determineElementObjType()
  //
  // Determine the element type's object type. This is needed when processing
  // collections with an object as the element type since this information is
  // not available in the TDS.
  //---------------------------------------------------------------------------
  async _determineElementObjType(info) {
    const binds = [
      {
        name: "owner",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_IN,
        maxSize: 128,
        values: [info.schema]
      },
      {
        name: "name",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_IN,
        maxSize: 128,
        values: [info.name]
      },
      {
        name: "package_name",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_IN,
        maxSize: 128,
        values: [info.packageName]
      }
    ];
    let sql;
    if (info.packageName) {
      sql = `
        select
            elem_type_owner,
            elem_type_name,
            elem_type_package
        from all_plsql_coll_types
        where owner = :owner
          and type_name = :name
          and package_name = :package_name`;
    } else {
      binds.pop();
      sql = `
        select
            elem_type_owner,
            elem_type_name
        from all_coll_types
        where owner = :owner
          and type_name = :name`;
    }
    const options = {
      connection: { _impl: this },
      prefetchRows: 2
    };
    const result = await this.execute(sql, 1, binds, options, false);
    const rows = await result.resultSet.getRows(1, options);
    await result.resultSet.close();
    const row = rows[0];
    info.elementTypeClass = this._getDbObjectType(row[0], row[1], row[2]);
    if (info.elementTypeClass.partial) {
      this._partialDbObjectTypes.push(info.elementTypeClass);
    }
  }

  //---------------------------------------------------------------------------
  // _execute()
  //
  // Calls the RPC that executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  async _execute(statement, numIters, binds, options, executeManyFlag) {

    // perform binds
    const numBinds = statement.bindInfoList.length;
    const numVars = binds.length;
    if (numBinds !== numVars && (numVars === 0 || !binds[0].name)) {
      errors.throwErr(errors.ERR_WRONG_NUMBER_OF_POSITIONAL_BINDS, numBinds, numVars);
    }
    for (let i = 0; i < binds.length; i++) {
      await this._bind(statement, binds[i], i + 1);
    }
    if (statement.isPlSql && (options.batchErrors || options.dmlRowCounts)) {
      errors.throwErr(errors.ERR_EXEC_MODE_ONLY_FOR_DML);
    }

    // send database request
    const message = new messages.ExecuteMessage(this, statement, options);
    message.numExecs = numIters;
    message.arrayDmlRowCounts = options.dmlRowCounts;
    message.batchErrors = options.batchErrors;
    if (statement.isPlSql && statement.requiresFullExecute) {
      message.numExecs = 1;
      await this._protocol._processMessage(message);
      statement.requiresFullExecute = false;
      message.numExecs = numIters - 1;
      message.offset = 1;
    }
    if (message.numExecs > 0) {
      await this._protocol._processMessage(message);
      statement.requiresFullExecute = false;
    }

    // if a define is required, send an additional request to the database
    if (statement.requiresDefine && statement.sql) {
      statement.requiresFullExecute = true;
      await this._protocol._processMessage(message);
      statement.requiresFullExecute = false;
      statement.requiresDefine = false;
    }

    // process results
    const result = {};
    if (statement.numQueryVars > 0) {
      result.resultSet = message.resultSet;
    } else {
      statement.bufferRowIndex = 0;
      const outBinds = thinUtil.getOutBinds(statement, numIters,
        executeManyFlag);
      if (outBinds) {
        result.outBinds = outBinds;
      }
      if (executeManyFlag) {
        if (!statement.isPlSql) {
          result.rowsAffected = statement.rowCount;
          delete statement.rowCount;
        }
        if (options.dmlRowCounts) {
          result.dmlRowCounts = options.dmlRowCounts;
        }
        if (options.batchErrors) {
          result.batchErrors = options.batchErrors;
        }
      } else {
        if (statement.isPlSql && options.implicitResultSet) {
          result.implicitResults = options.implicitResultSet;
        }
        if (statement.lastRowid) {
          result.lastRowid = statement.lastRowid;
          delete statement.lastRowid;
        }
        if (statement.isPlSql) {
          if (statement.rowCount) {
            result.rowsAffected = statement.rowCount;
          }
        } else {
          result.rowsAffected = statement.rowCount || 0;
        }
        if (statement.rowCount) {
          delete statement.rowCount;
        }
      }
      this._returnStatement(statement);
    }

    return result;
  }

  //---------------------------------------------------------------------------
  // _parseElementType()
  //
  // Parses the element type from the TDS buffer.
  //---------------------------------------------------------------------------
  async _parseElementType(buf, info) {
    let oraTypeNum, csfrm;
    const attrType = buf.readUInt8();
    switch (attrType) {
      case constants.TNS_OBJ_TDS_TYPE_NUMBER:
      case constants.TNS_OBJ_TDS_TYPE_FLOAT:
        info.elementType = types.DB_TYPE_NUMBER;
        break;
      case constants.TNS_OBJ_TDS_TYPE_VARCHAR:
      case constants.TNS_OBJ_TDS_TYPE_CHAR:
        info.maxSize = buf.readUInt16BE();
        oraTypeNum = (attrType === constants.TNS_OBJ_TDS_TYPE_VARCHAR) ?
          constants.TNS_DATA_TYPE_VARCHAR : constants.TNS_DATA_TYPE_CHAR;
        csfrm = buf.readUInt8();
        info.elementType = types.getTypeByOraTypeNum(oraTypeNum, csfrm);
        break;
      case constants.TNS_OBJ_TDS_TYPE_RAW:
        info.elementType = types.DB_TYPE_RAW;
        break;
      case constants.TNS_OBJ_TDS_TYPE_BINARY_FLOAT:
        info.elementType = types.DB_TYPE_BINARY_FLOAT;
        break;
      case constants.TNS_OBJ_TDS_TYPE_BINARY_DOUBLE:
        info.elementType = types.DB_TYPE_BINARY_DOUBLE;
        break;
      case constants.TNS_OBJ_TDS_TYPE_DATE:
        info.elementType = types.DB_TYPE_DATE;
        break;
      case constants.TNS_OBJ_TDS_TYPE_TIMESTAMP:
        info.elementType = types.DB_TYPE_TIMESTAMP;
        break;
      case constants.TNS_OBJ_TDS_TYPE_TIMESTAMP_LTZ:
        info.elementType = types.DB_TYPE_TIMESTAMP_LTZ;
        break;
      case constants.TNS_OBJ_TDS_TYPE_TIMESTAMP_TZ:
        info.elementType = types.DB_TYPE_TIMESTAMP_TZ;
        break;
      case constants.TNS_OBJ_TDS_TYPE_BOOLEAN:
        info.elementType = types.DB_TYPE_BOOLEAN;
        break;
      case constants.TNS_OBJ_TDS_TYPE_CLOB:
        this._determineElementTypeCharsetForm(info);
        break;
      case constants.TNS_OBJ_TDS_TYPE_BLOB:
        info.elementType = types.DB_TYPE_BLOB;
        break;
      case constants.TNS_OBJ_TDS_TYPE_OBJ:
        info.elementType = types.DB_TYPE_OBJECT;
        await this._determineElementObjType(info);
        break;
      default:
        errors.throwErr(errors.ERR_TDS_TYPE_NOT_SUPPORTED, attrType);
    }
  }

  //---------------------------------------------------------------------------
  // _parseTDS()
  //
  // Parses the TDS for the type. This is only needed for collection types, so
  // if the TDS is determined to be for an object type, the remaining
  // information is ignored.
  //---------------------------------------------------------------------------
  async _parseTDS(tds, info) {

    // parse initial TDS bytes
    const buf = new TDSBuffer(tds);
    buf.skipBytes(4);                   // end offset
    buf.skipBytes(2);                   // version op code and version
    buf.skipBytes(2);                   // unknown

    // if the number of attributes exceeds 1, the type cannot refer to a
    // collection, so nothing further needs to be done
    const numAttrs = buf.readUInt16BE();
    if (numAttrs > 1) {
      info.isCollection = false;
      return;
    }

    // continue parsing TDS bytes to discover if type refers to a collection
    buf.skipBytes(1);                   // TDS attributes?
    buf.skipBytes(1);                   // start ADT op code
    buf.skipBytes(2);                   // ADT number (always zero)
    buf.skipBytes(4);                   // offset to index table

    // if type of first attribute is not a collection, nothing further needs
    // to be done
    const attrType = buf.readUInt8();
    info.isCollection = (attrType === constants.TNS_OBJ_TDS_TYPE_COLL);
    if (!info.isCollection)
      return;

    // continue parsing TDS to determine element type
    const elementPos = buf.readUInt32BE();
    info.maxNumElements = buf.readUInt32BE();
    info.collectionType = buf.readUInt8();
    if (info.collectionType === constants.TNS_OBJ_PLSQL_INDEX_TABLE) {
      info.collectionFlags = constants.TNS_OBJ_HAS_INDEXES;
    }
    buf.pos = elementPos;

    await this._parseElementType(buf, info);
  }

  //---------------------------------------------------------------------------
  // _populateDbObjectTypeInfo()
  //
  // Poplates type information given the name of the type.
  //---------------------------------------------------------------------------
  async _populateDbObjectTypeInfo(name) {

    // get type information from the database
    const sql = `
      declare
          t_Instantiable              varchar2(3);
          t_SuperTypeOwner            varchar2(128);
          t_SuperTypeName             varchar2(128);
          t_SubTypeRefCursor          sys_refcursor;
          t_Pos                       pls_integer;
      begin
          :ret_val := dbms_pickler.get_type_shape(:full_name, :oid,
              :version, :tds, t_Instantiable, t_SuperTypeOwner,
              t_SuperTypeName, :attrs_rc, t_SubTypeRefCursor);
          :package_name := null;
          if substr(:full_name, length(:full_name) - 7) = '%ROWTYPE' then
              t_Pos := instr(:full_name, '.');
              :schema := substr(:full_name, 1, t_Pos - 1);
              :name := substr(:full_name, t_Pos + 1);
          else
              begin
                  select owner, type_name
                  into :schema, :name
                  from all_types
                  where type_oid = :oid;
              exception
              when no_data_found then
                  begin
                      select owner, package_name, type_name
                      into :schema, :package_name, :name
                      from all_plsql_types
                      where type_oid = :oid;
                  exception
                  when no_data_found then
                      null;
                  end;
              end;
          end if;
      end;`;
    const binds = [
      {
        name: "full_name",
        type: types.DB_TYPE_VARCHAR,
        dir: constants.BIND_INOUT,
        maxSize: 500,
        values: [name]
      },
      {
        name: "ret_val",
        type: types.DB_TYPE_BINARY_INTEGER,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "oid",
        type: types.DB_TYPE_RAW,
        maxSize: 16,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "version",
        type: types.DB_TYPE_BINARY_INTEGER,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "tds",
        type: types.DB_TYPE_RAW,
        maxSize: 2000,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "attrs_rc",
        type: types.DB_TYPE_CURSOR,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "package_name",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "schema",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_OUT,
        values: []
      },
      {
        name: "name",
        type: types.DB_TYPE_VARCHAR,
        maxSize: 128,
        dir: constants.BIND_OUT,
        values: []
      }
    ];
    const options = {
      connection: { _impl: this },
      nullifyInvalidCursor: true
    };
    const result = await this.execute(sql, 1, binds, options, false);
    if (result.outBinds.ret_val !== 0) {
      errors.throwErr(errors.ERR_INVALID_OBJECT_TYPE_NAME, name);
    }

    // check cache; if already present, nothing more to do!
    const info = this._getDbObjectType(result.outBinds.schema,
      result.outBinds.name, result.outBinds.package_name, result.outBinds.oid);
    if (!info.partial)
      return info;

    // process TDS and attributes cursor
    info.version = result.outBinds.version;
    await this._parseTDS(result.outBinds.tds, info);
    const attrRows = await result.outBinds.attrs_rc.getRows(1000, {});
    if (attrRows.length > 0) {
      info.attributes = [];
      for (const row of attrRows) {
        const attr = { name: row[1] };
        if (row[4]) {
          attr.type = types.DB_TYPE_OBJECT;
          attr.typeClass = this._getDbObjectType(row[4], row[3], row[5], row[6]);
          if (attr.typeClass.partial) {
            this._partialDbObjectTypes.push(attr.typeClass);
          }
        } else {
          attr.type = types.getTypeByColumnTypeName(row[3]);
        }
        info.attributes.push(attr);
      }
    }
    info.partial = false;

    return info;

  }

  //---------------------------------------------------------------------------
  // _populatePartialDbObjectTypes()
  //
  // Populates partial types that were discovered earlier. Since populating an
  // object type might result in additional object types being discovered,
  // object types are popped from the partial types list until the list is
  // empty.
  //---------------------------------------------------------------------------
  async _populatePartialDbObjectTypes() {
    while (this._partialDbObjectTypes.length > 0) {
      const info = this._partialDbObjectTypes.pop();
      let suffix = "%ROWTYPE";
      let name = info.name;
      if (name.endsWith(suffix)) {
        name = name.substring(0, name.length - suffix.length);
      } else {
        suffix = "";
      }
      let fullName;
      if (info.packageName) {
        fullName = `"${info.schema}"."${info.packageName}"."${name}"${suffix}`;
      } else {
        fullName = `"${info.schema}"."${name}"${suffix}`;
      }
      await this._populateDbObjectTypeInfo(fullName);
    }
  }

  async commit() {
    const message = new messages.CommitMessage(this);
    await this._protocol._processMessage(message);
  }

  async breakExecution() {
    await this._protocol.breakMessage();
  }

  isHealthy() {
    try {
      if (this.nscon.recvInbandNotif() === 0)
        return true;
      return false;
    } catch {
      return false;
    }
  }

  isPooled() {
    return (this._pool) ? true : false;
  }

  //---------------------------------------------------------------------------
  // getConnectionCookieByUUID()
  //
  // It fetches from map which keeps keyname as UUID+ServiceName.
  // UUID identifies the CDB instance and ServiceName identifies the
  // entity within a PDB which uniquely identifies a pdb instance.
  //---------------------------------------------------------------------------
  getConnectionCookieByUUID(uuid) {
    let cookie;
    if (uuid) {
      const key = uuid + ((this.serviceName) ? this.serviceName : this.sid);
      cookie = connectionCookies.get(key);
      if (!cookie) {
        cookie = {};
        connectionCookies.set(key, cookie);
      }
    }
    return cookie;
  }

  /**
   *
   * @param {object} params  Configuration of the connection
   *
   * @return {Promise}
   */
  async connect(params) {
    if (!params.connectString) {
      errors.throwErr(errors.ERR_EMPTY_CONNECT_STRING);
    }
    thinUtil.checkCredentials(params);

    this.sessionID = 0;
    this.serialNum = 0;
    this.autoCommit = false;
    this.serverVersion = "";
    this.statementCache = null;
    this.currentSchema = "";
    this.invokeSessionCallback = true;
    this.statementCache = new Map();
    this.statementCacheSize = params.stmtCacheSize;
    this._numCursorsToClose = 0;
    this._currentSchemaModified = false;
    this._cursorsToClose = new Set();
    this._tempLobsToClose = [];
    this._tempLobsTotalSize = 0;
    this._drcpEstablishSession = false;
    this._cclass = null;
    this._clientIdentifier = "";
    this._clientIdentifierModified = false;
    this._action = "";
    this._actionModified = false;
    this._dbOp = "";
    this._dbOpModified = false;
    this._clientInfo = "";
    this._clientInfoModified = false;
    this._module = "";
    this._moduleModified = false;
    this._drcpEnabled = false;
    this.serviceName = '';
    this.remoteAddress = '';
    this.comboKey = null; // used in changePassword API

    this.nscon = new nsi();
    finalizationRegistry.register(this, this.nscon);
    await this.nscon.connect(params);

    let serverType;
    if (this.isPooled()) {
      serverType = params._connInfo[0];
      this.serviceName = params._connInfo[2];
      this.purity = params._connInfo[3] | constants.PURITY_DEFAULT;
      this.sid = params._connInfo[4];
    } else {
      serverType = this.nscon.getOption(sqlNetConstants.SERVERTYPE);
      this.serviceName = this.nscon.getOption(sqlNetConstants.SVCNAME);
      this.sid = this.nscon.getOption(sqlNetConstants.SID);
      this.purity = this.nscon.getOption(sqlNetConstants.PURITY) | constants.PURITY_DEFAULT;
    }
    if (serverType) {
      this._drcpEnabled = serverType.toLowerCase() === 'pooled';
    }
    this.remoteAddress = this.nscon.getOption(sqlNetConstants.REMOTEADDR);
    this.connectionClass = params.connectionClass;

    /*
     * if drcp is used, use purity = NEW as the default purity for
     * standalone connections and purity = SELF for connections that belong
     * to a pool
     */
    if (this.purity === constants.PURITY_DEFAULT && this._drcpEnabled) {
      if (this.isPooled()) {
        this.purity = constants.PURITY_SELF;
      } else {
        this.purity = constants.PURITY_NEW;
      }
    }

    this._protocol = new Protocol(this);

    // check if the protocol version supported by the database is high
    // enough; if not, reject the connection immediately
    if (this._protocol.caps.protocolVersion < constants.TNS_VERSION_MIN_ACCEPTED) {
      errors.throwErr(errors.ERR_SERVER_VERSION_NOT_SUPPORTED);
    }

    try {
      const cookie = this.getConnectionCookieByUUID(this.nscon.dbUUID);
      this.nscon.dbUUID = null;
      const protocolMessage = new messages.ProtocolMessage(this);
      const dataTypeMessage = new messages.DataTypeMessage(this);
      const authMessage = new messages.AuthMessage(this, params);
      let sentCookie = false;
      if (cookie && cookie.populated) {
        const cookieMessage = new messages.ConnectionCookieMessage(this);
        cookieMessage.cookie = cookie;
        cookieMessage.protocolMessage = protocolMessage;
        cookieMessage.dataTypeMessage = dataTypeMessage;
        cookieMessage.authMessage = authMessage;
        await this._protocol._processMessage(cookieMessage);
        sentCookie = true;
      } else {
        await this._protocol._processMessage(protocolMessage);
      }
      if (!sentCookie || !cookie.populated) {
        await this._protocol._processMessage(dataTypeMessage);
        // Does OSESSKEY for non-token Authentication else OAUTH
        await this._protocol._processMessage(authMessage);
        if (cookie && !cookie.populated) {
          cookie.protocolVersion = protocolMessage.serverVersion;
          cookie.serverBanner = protocolMessage.serverBanner;
          cookie.charsetID = this._protocol.caps.charSetID;
          cookie.ncharsetID = this._protocol.caps.nCharsetId;
          cookie.flags = protocolMessage.serverFlags;
          cookie.compileCaps = Buffer.from(protocolMessage.serverCompileCaps);
          cookie.runtimeCaps = Buffer.from(protocolMessage.serverRunTimeCaps);
          cookie.populated = true;
        }
      }
      if (!params.token) { // non-token Authentication
        await this._protocol._processMessage(authMessage); // OAUTH
      }
    } catch (err) {
      this.nscon.disconnect();
      throw err;
    }

    // maintain a list of partially populated database object types
    this._partialDbObjectTypes = [];

    if (params.debugJDWP) {
      this.jdwpData = Buffer.from(params.debugJDWP);
    } else if (process.env.ORA_DEBUG_JDWP) {
      this.jdwpData = Buffer.from(process.env.ORA_DEBUG_JDWP);
    }
    this._protocol.connInProgress = false;
  }

  //---------------------------------------------------------------------------
  // Sets that a statement is no longer in use
  //---------------------------------------------------------------------------
  _returnStatement(statement) {
    if (statement.bindInfoList) {
      statement.bindInfoList.forEach(bindInfo => {
        bindInfo.bindVar = null;
      });
    }
    if (statement.queryVars) {
      statement.queryVars.forEach(queryVar => {
        queryVar.values.fill(null);
      });
    }
    if (statement.returnToCache) {
      statement.inUse = false;
    } else if (statement.cursorId !== 0) {
      this._addCursorToClose(statement.cursorId);
    }
  }

  //---------------------------------------------------------------------------
  // Adds the cursors that needs to be closed to the _cursorsToClose set
  //---------------------------------------------------------------------------
  _addCursorToClose(cursorId) {
    if (this._cursorsToClose.has(cursorId)) {
      const reason = `attempt to close cursor ${cursorId} twice`;
      errors.throwErr(errors.ERR_INTERNAL, reason);
    }
    this._cursorsToClose.add(cursorId);
  }

  //---------------------------------------------------------------------------
  // Adjusts the statement cache to remove least recently used statements
  //---------------------------------------------------------------------------
  _adjustStatementCache() {
    while (this.statementCache.size > this.statementCacheSize) {
      const sql = this.statementCache.keys().next().value;
      const stmt = this.statementCache.get(sql);
      this.statementCache.delete(sql);
      if (stmt.inUse) {
        stmt.returnToCache = false;
      } else if (stmt.cursorId !== 0) {
        this._addCursorToClose(stmt.cursorId);
      }
    }
  }

  //---------------------------------------------------------------------------
  // Parses the sql statement and puts it into cache if keepInStmtCache
  // option is true
  //---------------------------------------------------------------------------
  _prepare(sql, options) {
    const statement = this._getStatement(sql, options.keepInStmtCache);
    statement.bufferRowIndex = 0;
    statement.bufferRowCount = 0;
    statement.lastRowIndex = 0;
    statement.moreRowsToFetch = true;
    return statement;
  }

  //---------------------------------------------------------------------------
  // Binds the values by user to the statement object
  //---------------------------------------------------------------------------
  async _bind(stmt, variable, pos = 0) {
    const bindInfoDict = stmt.bindInfoDict;
    const bindInfoList = stmt.bindInfoList;

    /*
     * For PL/SQL blocks, if the size of a string or bytes object exceeds
     * 32,767 bytes it is converted to a BLOB/CLOB; and conversion
     * needs to be established as well to return the string in the way that
     * the user expects to get it
     */
    if (stmt.isPlSql && variable.maxSize > 32767) {
      if (variable.type === types.DB_TYPE_RAW ||
          variable.type === types.DB_TYPE_LONG_RAW) {
        variable.type = types.DB_TYPE_BLOB;
      } else if (variable.type._csfrm === constants.CSFRM_NCHAR)  {
        variable.type = types.DB_TYPE_NCLOB;
      } else {
        variable.type = types.DB_TYPE_CLOB;
      }
      const maxSize = variable.maxSize;
      delete variable.maxSize;
      variable.outConverter = async function(val) {
        if (val === null) {
          return null;
        }
        const data = await val.getData();
        const len = val._length;
        if (data && len > maxSize) {
          errors.throwErr(errors.ERR_INSUFFICIENT_BUFFER_FOR_BINDS);
        }
        return data;
      };
    }

    if (variable.type === types.DB_TYPE_CLOB ||
        variable.type === types.DB_TYPE_NCLOB ||
        variable.type === types.DB_TYPE_BLOB) {
      for (const [index, val] of variable.values.entries()) {
        if (!(val instanceof ThinLobImpl)) {
          if (val && val.length > 0) {
            const lobImpl = new ThinLobImpl();
            await lobImpl.create(this, variable.type);
            await lobImpl.write(1, val);
            variable.values[index] = lobImpl;
          } else {
            variable.values[index] = null;
          }
        }
      }
    }

    if (variable.name) {
      let normalizedName;
      if (variable.name.startsWith('"') && variable.name.endsWith('"')) {
        normalizedName = variable.name.substring(1, variable.name.length - 1);
      } else {
        normalizedName = variable.name.toUpperCase();
      }
      if (normalizedName.startsWith(':')) {
        normalizedName = variable.name.substring(1);
      }
      if (!bindInfoDict.has(normalizedName)) {
        errors.throwErr(errors.ERR_INVALID_BIND_NAME, normalizedName);
      }
      bindInfoDict.get(normalizedName).forEach((bindInfo) => {
        stmt._setVariable(bindInfo, variable);
      });
    } else {
      const bindInfo = bindInfoList[pos - 1];
      stmt._setVariable(bindInfo, variable);
    }
  }

  //---------------------------------------------------------------------------
  // _createResultSet()
  //
  // Creates a result set and performs any necessary initialization.
  //---------------------------------------------------------------------------
  _createResultSet(options, statement) {
    const resultSet = new ThinResultSetImpl();
    if (!statement) {
      statement = new Statement();
    }
    resultSet._resultSetNew(this, statement, options);
    if (statement.queryVars.length > 0) {
      const metadata = thinUtil.getMetadataMany(statement.queryVars);
      resultSet._setup(options, metadata);
    }
    return resultSet;
  }

  //---------------------------------------------------------------------------
  // Clears the statement cache for the connection
  //---------------------------------------------------------------------------
  resetStatementCache() {
    this.statementCache.clear();
    this._cursorsToClose.clear();
  }

  //---------------------------------------------------------------------------
  // getDbObjectClass()
  //
  // Returns a database object class given its name.
  //---------------------------------------------------------------------------
  async getDbObjectClass(name) {
    const info = await this._populateDbObjectTypeInfo(name);
    await this._populatePartialDbObjectTypes();
    return info;
  }

  //---------------------------------------------------------------------------
  // getStatementInfo()
  //
  // Parses the SQL statement and returns information about the statement.
  //---------------------------------------------------------------------------
  async getStatementInfo(sql) {
    const options = {};
    const result = {};
    const statement = this._prepare(sql, options);
    options.connection = this;
    try {
      if (!statement.isDdl) {
        const message = new messages.ExecuteMessage(this, statement, options);
        message.parseOnly = true;
        await this._protocol._processMessage(message);
      }
      if (statement.numQueryVars > 0) {
        result.metaData = thinUtil.getMetadataMany(statement.queryVars);
      }
      result.bindNames = Array.from(statement.bindInfoDict.keys());
      result.statementType = statement.statementType;
      return result;
    } finally {
      this._returnStatement(statement);
    }
  }

  //---------------------------------------------------------------------------
  // execute()
  //
  // Calls the RPC that executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  async execute(sql, numIters, binds, options, executeManyFlag) {
    const statement = this._prepare(sql, options);
    try {
      return await this._execute(statement, numIters, binds, options,
        executeManyFlag);
    } catch (err) {
      this._returnStatement(statement);
      throw err;
    }
  }

  //---------------------------------------------------------------------------
  // Get the statement object from the statement cache for the SQL if it exists
  // else prepare a new statement object for the SQL. If a statement is already
  // in use a copy will be made and returned (and will not be returned to the
  // cache). If a statement is being executed for the first time after releasing
  // a DRCP session, a copy will also be made (and will not be returned to the
  // cache) since it is unknown at this point whether the original session or a
  // new session is going to be used.
  //---------------------------------------------------------------------------
  _getStatement(sql, cacheStatement = false) {
    let statement = this.statementCache.get(sql);
    if (!statement) {
      statement = new Statement();
      statement._prepare(sql);
      if (cacheStatement && !this._drcpEstablishSession && !statement.isDdl &&
          this.statementCacheSize > 0) {
        statement.returnToCache = true;
        this.statementCache.set(sql, statement);
        this._adjustStatementCache();
      }
    } else if (statement.inUse || !cacheStatement ||
        this._drcpEstablishSession) {
      if (!cacheStatement) {
        this.statementCache.delete(sql);
        statement.returnToCache = false;
      }
      if (statement.inUse || this._drcpEstablishSession) {
        statement = statement._copy();
      }
    } else {
      this.statementCache.delete(sql);
      this.statementCache.set(sql, statement);
    }
    statement.inUse = true;
    return statement;
  }

  //---------------------------------------------------------------------------
  // Calls the ping RPC for Oracle Database
  //---------------------------------------------------------------------------
  async ping() {
    const message = new messages.PingMessage(this);
    await this._protocol._processMessage(message);
  }

  //---------------------------------------------------------------------------
  // Calls the Rollback RPC for Oracle Database
  //---------------------------------------------------------------------------
  async rollback() {
    const message = new messages.RollbackMessage(this);
    await this._protocol._processMessage(message);
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Server version
  //---------------------------------------------------------------------------
  getOracleServerVersion() {
    return this.serverVersion;
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Server version string
  //---------------------------------------------------------------------------
  getOracleServerVersionString() {
    return this.serverVersionString;
  }

  setCurrentSchema(schema) {
    this._currentSchemaModified = true;
    this.currentSchema = schema;
  }

  getCurrentSchema() {
    return this.currentSchema;
  }

  setClientId(clientId) {
    this._clientIdentifierModified = true;
    this._clientIdentifier = clientId;
  }

  setDbOp(dbOp) {
    this._dbOpModified = true;
    this._dbOp = dbOp;
  }

  setClientInfo(clientInfo) {
    this._clientInfoModified = true;
    this._clientInfo = clientInfo;
  }

  setModule(module) {
    this._moduleModified = true;
    this._module = module;

    /*
     * setting the module by itself results in an error so always force
     * action to be set as well (which eliminates this error)
     */
    this._actionModified = true;
  }

  setAction(action) {
    this._actionModified = true;
    this._action = action;
  }

  async changePassword(user, password, newPassword) {
    const config = {
      user: user,
      newPassword: newPassword,
      password: password,
      changePassword: true
    };
    const message = new messages.AuthMessage(this, config);
    await this._protocol._processMessage(message);    // OAUTH
  }

  async createLob(dbType) {
    const lobImpl = new ThinLobImpl();
    await lobImpl.create(this, dbType);
    return lobImpl;
  }

  //---------------------------------------------------------------------------
  // Returns the statement cache size for the statement cache maintained by
  // the connection object
  //---------------------------------------------------------------------------
  getStmtCacheSize() {
    return this.statementCacheSize;
  }

  setCallTimeout(timeout) {
    this._protocol.callTimeout = timeout;
  }

  getCallTimeout() {
    return this._protocol.callTimeout;
  }

  //---------------------------------------------------------------------------
  // Returns getTag. Actual tag returned by db must be a string.
  //---------------------------------------------------------------------------
  getTag() {
    return '';
  }

  //---------------------------------------------------------------------------
  // Returns the Oracle Database instance name associated with the connection.
  //---------------------------------------------------------------------------
  getInstanceName() {
    return this.instanceName;
  }
}

module.exports = ThinConnectionImpl;
