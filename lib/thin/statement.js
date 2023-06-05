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
const constants = require('../constants');
const thinUtil = require("./util.js");

/* eslint-disable no-useless-escape */
// Rules for named binds:
// 1. Quoted and non-quoted bind names are allowed.
// 2. Quoted binds can contain any characters.
// 3. Non-quoted binds must begin with an alphabet character.
// 4. Non-quoted binds can only contain alphanumeric characters, the underscore,
//    the dollar sign and the pound sign.
// 5. Non-quoted binds cannot be Oracle Database Reserved Names
//    (Server handles this case and returns an appropriate error)
const BIND_PATTERN = /(?<=:)\s*((?:".*?")|(?:[\p{L}][\p{L}\p{Nd}_\$#]*)|\p{Nd}+)/gu;

// pattern used for detecting a DML returning clause; bind variables in the
// first group are input variables; bind variables in the second group are
// output only variables
// assumes expressions/variables are seperated by delimiters space and comma
const DML_RETURNING_KEY = /(?<=\bRETURN(?:ING)?\b)/si;
const DML_RETURNING_INTO_KEY = /(?<=\bINTO\b)/gsi;

const SINGLE_LINE_COMMENT_PATTERN = /--.*/g;
const MULTI_LINE_COMMENT_PATTERN = /\/\*.*?\*\//sg;
const CONSTANT_STRING_PATTERN = /'.*?'/sg;

/**
 * It is used to cache the metadata about bind information
 * associated with the statement. This will determine if statement needs
 * to use Execute or Re-Execute.
 */
class BindInfo {
  constructor(name, isReturnBind = false) {
    this.bindName = name;
    this.isReturnBind = isReturnBind;
    this.maxSize = 0;
    this.numElements = 0;
    this.maxArraySize = 0;
    this.type = null;
    this.isArray = false;
    this.dir = constants.BIND_IN;
    this.bindVar = null;
  }
}

/**
 * Encapsulates the SQL statement run on the connection.
 * It has information like type of stmt, bind infrmation, cursor number, ...
 */
module.exports.BindInfo = BindInfo;

class Statement {
  constructor() {
    this.sql = "";
    this.sqlBytes = [];
    this.sqlLength = 0;
    this.cursorId = 0;
    this.requiresDefine = false;
    this.isQuery = false;
    this.isPlSql = false;
    this.isDml = false;
    this.isDdl = false;
    this.isReturning = false;
    this.bindInfoList = [];
    this.queryVars = [];
    this.bindInfoDict = new Map();
    this.requiresFullExecute = false;
    this.returnToCache = false;
    this.numColumns = 0;
    this.lastRowIndex;
    this.lastRowid;
    this.moreRowsToFetch = true;
    this.inUse = false;
    this.bufferRowIndex = 0;
    this.bufferRowCount = 0;
    this.statementType = constants.STMT_TYPE_UNKNOWN;
  }

  //---------------------------------------------------------------------------
  // _copy()
  //
  // Copying existing statement into new statement object required by drcp
  //---------------------------------------------------------------------------
  _copy() {
    const copiedStatement = new Statement();
    copiedStatement.sql = this.sql;
    copiedStatement.sqlBytes = this.sqlBytes;
    copiedStatement.sqlLength = this.sqlLength;
    copiedStatement.isQuery = this.isQuery;
    copiedStatement.isPlSql = this.isPlSql;
    copiedStatement.isDml = this.isDml;
    copiedStatement.isDdl = this.isDdl;
    copiedStatement.isReturning = this.isReturning;
    copiedStatement.bindInfoList = [];
    for (const bindInfo of this.bindInfoList) {
      const newBindInfo = new BindInfo(bindInfo.bindName, bindInfo.isReturnBind);
      copiedStatement.bindInfoList.push(newBindInfo);
    }
    const bindInfoDict = copiedStatement.bindInfoDict = new Map();
    for (const bindInfo of copiedStatement.bindInfoList) {
      if (bindInfoDict.has(bindInfo.bindName)) {
        bindInfoDict.get(bindInfo.bindName).push(bindInfo);
      } else {
        bindInfoDict.set(bindInfo.bindName, [bindInfo]);
      }
    }
    copiedStatement.returnToCache = false;
    return copiedStatement;
  }

  //---------------------------------------------------------------------------
  // _determineStatementType(sql)
  //
  // Determine the type of the SQL statement by examining the first keyword
  // found in the statement
  //---------------------------------------------------------------------------
  _determineStatementType(sql) {
    sql = thinUtil.cleanSql(sql);
    let tokens = sql.trim().trimStart('(').substring(0, 10).split(" ");
    if (tokens.length > 0) {
      const sqlKeyword = tokens[0].toUpperCase();
      if (["DECLARE", "BEGIN", "CALL"].includes(sqlKeyword)) {
        this.isPlSql = true;
        if (sqlKeyword === 'DECLARE') {
          this.statementType = constants.STMT_TYPE_DECLARE;
        } else if (sqlKeyword === 'BEGIN') {
          this.statementType = constants.STMT_TYPE_BEGIN;
        } else if (sqlKeyword === 'CALL') {
          this.statementType = constants.STMT_TYPE_CALL;
        }
      } else if (["SELECT", "WITH"].includes(sqlKeyword)) {
        this.isQuery = true;
        if (sqlKeyword === "SELECT") {
          this.statementType = constants.STMT_TYPE_SELECT;
        }
      } else if (["INSERT", "UPDATE", "DELETE", "MERGE"].includes(sqlKeyword)) {
        this.isDml = true;
        if (sqlKeyword === 'INSERT') {
          this.statementType = constants.STMT_TYPE_INSERT;
        } else if (sqlKeyword === 'UPDATE') {
          this.statementType = constants.STMT_TYPE_UPDATE;
        } else if (sqlKeyword === 'DELETE') {
          this.statementType = constants.STMT_TYPE_DELETE;
        } else if (sqlKeyword === 'MERGE') {
          this.statementType = constants.STMT_TYPE_MERGE;
        }
      } else if (["CREATE", "ALTER", "DROP", "TRUNCATE"].includes(sqlKeyword)) {
        this.isDdl = true;
        if (sqlKeyword === 'CREATE') {
          this.statementType = constants.STMT_TYPE_CREATE;
        } else if (sqlKeyword === 'ALTER') {
          this.statementType = constants.STMT_TYPE_ALTER;
        } else if (sqlKeyword === 'DROP') {
          this.statementType = constants.STMT_TYPE_DROP;
        }
      } else if (sqlKeyword === 'COMMIT') {
        this.statementType = constants.STMT_TYPE_COMMIT;
      } else if (sqlKeyword === 'ROLLBACK') {
        this.statementType = constants.STMT_TYPE_ROLLBACK;
      } else if (sqlKeyword === 'MERGE') {
        this.statementType = constants.STMT_TYPE_MERGE;
      } else {
        this.statementType = constants.STMT_TYPE_UNKNOWN;
      }
    }
  }

  //---------------------------------------------------------------------------
  // prepare(sql)
  //
  // Prepare the SQL for execution by determining the list of bind names
  // that are found within it. The length of the SQL text is also calculated
  // at this time.
  //---------------------------------------------------------------------------
  _prepare(sql) {
    this.sql = sql;
    this.sqlBytes = Buffer.from(this.sql, 'utf8');
    this.sqlLength = this.sqlBytes.length;
    // replace literals with a specific literal
    sql = sql.replace(CONSTANT_STRING_PATTERN, "'S'");
    sql = sql.replace(SINGLE_LINE_COMMENT_PATTERN, "");
    sql = sql.replace(MULTI_LINE_COMMENT_PATTERN, "");
    this._determineStatementType(sql);
    let returningSql;
    if (this.isQuery || this.isDml || this.isPlSql) {
      let inputSql = sql;
      if (this.isDml) {
        /*
         * get starting index after DML_RETURNING_KEY from begining of sql and starting index
         * after DML_RETURNING_INTO_KEY from the end of sql
         */
        let result;
        let intoKey = -1;
        const retKey = sql.search(DML_RETURNING_KEY);
        let intoRegex = DML_RETURNING_INTO_KEY;
        // simulate lastInfdexOf with intoRegex input
        while ((result = intoRegex.exec(sql.slice(retKey))) != null) {
          intoKey = result.index;
          intoRegex.lastIndex = result.index + 1;
        }
        if (retKey > -1 && intoKey > -1) {
          intoKey = retKey + intoKey;
          inputSql = sql.slice(0, intoKey);
          returningSql = sql.slice(intoKey);
        }
      }
      this._addBinds(inputSql, false);
      if (returningSql) {
        this.isReturning = true;
        this._addBinds(returningSql, true);
      }
    }
  }

  //---------------------------------------------------------------------------
  // _addBinds(sql)
  //
  // Add bind information to the statement by examining the passed SQL for
  // bind variable names.
  //---------------------------------------------------------------------------
  _addBinds(sql, isReturnBind) {
    const regexMatchArray = [...sql.matchAll(BIND_PATTERN)];
    let name;
    regexMatchArray.forEach(element => {
      if (element[0].startsWith('"') && element[0].endsWith('"')) {
        name = element[0].substring(1, element[0].length - 1);
      } else {
        name = element[0].trim().toUpperCase();
      }
      if (this.isPlSql && this.bindInfoDict.has(name)) {
        return;
      }
      let info = new BindInfo(name, isReturnBind);
      this.bindInfoList.push(info);

      if (this.bindInfoDict.has(info.bindName)) {
        this.bindInfoDict.get(info.bindName).push(info);
      } else {
        this.bindInfoDict.set(info.bindName, [info]);
      }
    });
  }

  //---------------------------------------------------------------------------
  // _setVariable(sql)
  //
  // Set the variable on the bind information and copy across metadata that
  // will be used for binding. If the bind metadata has changed, mark the
  // statement as requiring a full execute. In addition, binding a REF
  // cursor also requires a full execute.
  //---------------------------------------------------------------------------
  _setVariable(bindInfo, variable) {
    if (variable.maxSize !== bindInfo.maxSize
        || variable.dir !== bindInfo.dir
        || variable.isArray !== bindInfo.isArray
        || variable.values.length > bindInfo.numElements
        || variable.type != bindInfo.type
        || variable.maxArraySize != bindInfo.maxArraySize) {
      bindInfo.isArray = variable.isArray;
      bindInfo.numElements = variable.values.length;
      bindInfo.maxSize = variable.maxSize;
      bindInfo.type = variable.type;
      bindInfo.dir = variable.dir;
      bindInfo.maxArraySize = variable.maxArraySize;
      this.requiresFullExecute = true;
    }

    bindInfo.bindVar = variable;
  }
}

module.exports.Statement = Statement;
