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

const ConnectionImpl = require('../impl/connection.js');
const ThinResultSetImpl = require('./resultSet.js');
const ThinLobImpl  = require("./lob.js");
const Protocol = require("./protocol/protocol.js");
const {NetworkSession:nsi, getConnectionInfo} = require("./sqlnet/networkSession.js");
const { Statement } = require("./statement");
const thinUtil = require('./util');
const sqlNetConstants = require('./sqlnet/constants.js');
const constants = require('../constants.js');
const protocolConstants = require('./protocol/constants.js');
const types = require('../types.js');
const errors = require("../errors.js");
const messages = require('./protocol/messages');

const finalizationRegistry = new global.FinalizationRegistry((heldValue) => {
  heldValue.disconnect();
});

class ThinConnectionImpl extends ConnectionImpl {

  /**
   * Terminates the connection
   *
   * @return {Promise}
   */
  async close() {
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
  }

  async _sessRelease() {
    const message = new messages.SessionReleaseMessage(this);
    if (!this.isPooled()) {
      message.sessReleaseMode = constants.DRCP_DEAUTHENTICATE;
    }
    await this._protocol._processMessage(message);
  }

  async commit() {
    const message = new messages.CommitMessage(this);
    await this._protocol._processMessage(message);
  }

  async breakExecution() {
    await this._protocol.breakMessage();
  }

  _healthStatus() {
    return this.nscon.recvInbandNotif();
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

  /**
   *
   * @param {object} params  Configuration of the connection
   *
   * @return {Promise}
   */
  async connect(params) {
    if (params.password === undefined && params.token === undefined) {
      errors.throwErr(errors.ERR_MISSING_CREDENTIALS);
    } else if (!params.connectString) {
      errors.throwErr(errors.ERR_EMPTY_CONNECTION_STRING);
    }

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
    this.serviceName = '';
    this.remoteAddress = '';
    this.privilege = params.privilege;
    this.comboKey = null; // used in changePassword API

    this.nscon = new nsi();
    finalizationRegistry.register(this, this.nscon);
    await this.nscon.connect(params);

    this._connInfo = (this.isPooled()) ? params._connInfo.map((x) => x) :
      await getConnectionInfo(params);
    this._drcpEnabled = String(this._connInfo[0]).toLowerCase() === 'pooled';
    this.serviceName = this._connInfo[2];
    this.purity = this._connInfo[3] | constants.PURITY_DEFAULT;
    this.remoteAddress = this.nscon.getOption(sqlNetConstants.REMOTEADDR);
    this.connClass = params.connectionClass;

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
    try {
      let message = new messages.ProtocolMessage(this);
      await this._protocol._processMessage(message);
      message = new messages.DataTypeMessage(this);
      await this._protocol._processMessage(message);
      message = new messages.AuthMessage(this, params);
      await this._protocol._processMessage(message);        // OSESSKEY
      await this._protocol._processMessage(message);        // OAUTH
    } catch (err) {
      this.nscon.disconnect();
      throw err;
    }


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
      this._adjustStatementCache();
    } else if (statement.cursorId !== 0) {
      this._addCursorToClose(statement);
    }
  }

  //---------------------------------------------------------------------------
  // Adds the cursors that needs to be closed to the _cursorsToClose set
  //---------------------------------------------------------------------------
  _addCursorToClose(stmt) {
    if (stmt.cursorId > 0 && this._cursorsToClose.has(stmt.cursorId)) {
      const reason = `attempt to close cursor ${stmt.cursorId} twice`;
      errors.throwErr(errors.ERR_INTERNAL, reason);
    }

    if (this.statementCache.has(stmt.sql)) {
      this.statementCache.delete(stmt.sql);
      this._cursorsToClose.add(stmt.cursorId);
    } else if (stmt.cursorId > 0) {
      this._cursorsToClose.add(stmt.cursorId);
    }
  }

  //---------------------------------------------------------------------------
  // Adjusts the statement cache to remove least recently used statements
  //---------------------------------------------------------------------------
  _adjustStatementCache() {
    while (this.statementCache.size >= this.statementCacheSize) {
      let stmt = this.statementCache.get(this.statementCache.keys().next().value);
      this.statementCache.delete(this.statementCache.keys().next().value);
      if (stmt.inUse) {
        stmt.returnToCache = false;
      } else if (stmt.cursorId !== 0) {
        this._addCursorToClose(stmt);
      }
    }
  }

  //---------------------------------------------------------------------------
  // Parses the sql statement and puts it into cache if keepInStmtCache
  // option is true
  //---------------------------------------------------------------------------
  _prepare(sql, options) {
    let statement = this._getStatement(sql, options.keepInStmtCache);
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
    let bindInfoDict = stmt.bindInfoDict;
    let bindInfoList = stmt.bindInfoList;

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
      } else if (variable.type._csfrm === protocolConstants.TNS_CS_NCHAR)  {
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
        let data = await val.getData();
        let len = val._length;
        if (data && len > maxSize) {
          errors.throwErr(errors.ERR_INSUFFICIENT_BUFFER_FOR_BINDS);
        }
        return data;
      };
    }

    if (variable.type === types.DB_TYPE_CLOB ||
        variable.type === types.DB_TYPE_NCLOB ||
        variable.type === types.DB_TYPE_BLOB) {
      for (let [index, val] of variable.values.entries()) {
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
      if (bindInfoDict[normalizedName] === undefined) {
        errors.throwErr(errors.ERR_INVALID_BIND_NAME, normalizedName);
      }
      bindInfoDict[normalizedName].forEach((bindInfo) => {
        stmt._setVariable(bindInfo, variable);
      });
    } else {
      let bindInfo = bindInfoList[pos - 1];
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
  // Prepares the sql given by user and binds the value to the statement object
  //---------------------------------------------------------------------------
  async _prepareAndBind(sql, binds, options, isParse = false) {
    const stmt = this._prepare(sql, options);
    let position = 0;
    if (!isParse) {
      const numBinds = stmt.bindInfoList.length;
      const numVars = binds.length;
      if (numBinds !== numVars) {
        errors.throwErr(errors.ERR_WRONG_NUMBER_OF_POSITIONAL_BINDS, numBinds, numVars);
      }
      for (const variable of binds) {
        await this._bind(stmt, variable, position + 1);
        position += 1;
      }
    }
    return stmt;
  }

  //---------------------------------------------------------------------------
  // Clears the statement cache for the connection
  //---------------------------------------------------------------------------
  resetStatmentCache() {
    this.statementCache.clear();
    this._cursorsToClose.clear();
  }

  //---------------------------------------------------------------------------
  // Parses the sql given by User
  // calls the OAL8 RPC that parses the SQL statement and returns the metadata
  // information for a statment.
  //---------------------------------------------------------------------------
  async getStatementInfo(sql) {
    let options = {};
    let result = {};
    let statement = await this._prepareAndBind(sql, null, options, true);
    options.connection = this;
    // parse the statement (but not for DDL which doesn't support it)
    if (!statement.isDdl) {
      const message = new messages.ExecuteMessage(this, statement, options);
      message.parseOnly = true;
      await this._protocol._processMessage(message);
    }
    if (statement.numQueryVars > 0) {
      result.metaData = thinUtil.getMetadataMany(statement.queryVars);
    }
    result.bindNames = Object.keys(statement.bindInfoDict);
    result.statementType = statement.statementType;
    return result;
  }

  //---------------------------------------------------------------------------
  // Prepares the sql given by the user,
  // calls the OAL8 RPC that executes a SQL statement and returns the results.
  //---------------------------------------------------------------------------
  async execute(sql, numIters, binds, options, executeManyFlag) {
    const result = {};
    if (executeManyFlag) {
      return await this.executeMany(sql, numIters, binds, options);
    }
    const statement = await this._prepareAndBind(sql, binds, options);

    // send the initial request to the database
    const message = new messages.ExecuteMessage(this, statement, options);
    message.numExecs = 1;
    await this._protocol._processMessage(message);
    statement.requiresFullExecute = false;

    // if a define is required, send an additional request to the database
    if (statement.requiresDefine && statement.sql) {
      statement.requiresFullExecute = true;
      await this._protocol._processMessage(message);
      statement.requiresFullExecute = false;
      statement.requiresDefine = false;
    }

    // process message results
    if (statement.numQueryVars > 0) {
      result.resultSet = message.resultSet;
    } else {
      statement.bufferRowIndex = 0;
      let bindVars = thinUtil.getBindVars(statement);
      let outBinds = thinUtil.getExecuteOutBinds(bindVars);
      if (outBinds) {
        result.outBinds = outBinds;
      }
      if (statement.isPlSql) {
        if (options.implicitResultSet) {
          result.implicitResults = options.implicitResultSet;
        }
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
      this._returnStatement(statement);
    }

    return result;
  }

  //---------------------------------------------------------------------------
  // executeMany()
  //
  // Prepares the sql given by the user, calls the OAL8 RPC that executes a SQL
  // statement multiple times and returns the results.
  //---------------------------------------------------------------------------
  async executeMany(sql, numIters, binds, options) {
    const statement = await this._prepareAndBind(sql, binds, options);
    if (statement.isPlSql && (options.batchErrors || options.dmlRowCounts)) {
      errors.throwErr(errors.ERR_EXEC_MODE_ONLY_FOR_DML);
    }

    // send database request
    const message = new messages.ExecuteMessage(this, statement, options);
    message.numExecs = numIters;
    message.arrayDmlRowCounts = options.dmlRowCounts;
    message.batchErrors = options.batchErrors;
    if (statement.isPlSql && statement.cursorId === 0) {
      message.numExecs = 1;
      await this._protocol._processMessage(message);
      if (statement.plsqlMultipleExecs) {
        for (let i = 0; i < numIters - 1; i++) {
          message.offset = i + 1;
          await this._protocol._processMessage(message);
        }
      } else {
        message.offset = 1;
        message.numExecs = numIters - 1;
      }
    } else {
      await this._protocol._processMessage(message);
    }

    // process results
    const returnObj = {};
    statement.bufferRowIndex = 0;
    const bindVars = thinUtil.getBindVars(statement);
    const outBinds = thinUtil.getExecuteManyOutBinds(bindVars, numIters);
    if (outBinds) {
      returnObj.outBinds = outBinds;
    }
    const rowsAffected = !statement.isPlSql ? statement.rowCount : undefined;
    if (rowsAffected) {
      returnObj.rowsAffected = rowsAffected;
      delete statement.rowCount;
    }
    if (options.dmlRowCounts) {
      returnObj.dmlRowCounts = options.dmlRowCounts;
    }
    if (options.batchErrors) {
      returnObj.batchErrors = options.batchErrors;
    }
    this._returnStatement(statement);

    return returnObj;
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
      if (cacheStatement && this.statementCache.size < this.statementCacheSize && !this._drcpEstablishSession && !statement.isDdl) {
        this.statementCache.set(sql, statement);
        statement.returnToCache = true;
        this._adjustStatementCache();
      }
    } else if (statement.inUse || !cacheStatement || this._drcpEstablishSession) {
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

}

module.exports = ThinConnectionImpl;
