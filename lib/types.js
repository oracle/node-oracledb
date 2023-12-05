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

const constants = require('./constants.js');
const errors = require('./errors.js');
const util = require('util');

const dbTypeByNum = new Map();
const dbTypeByOraTypeNum = new Map();
const dbTypeByColumnTypeName = new Map();

// define class used for database types
class DbType {

  constructor(num, name, columnTypeName, options) {
    this.num = num;
    this.name = name;
    this.columnTypeName = columnTypeName;
    this._bufferSizeFactor = options.bufferSizeFactor || 0;
    this._oraTypeNum = options.oraTypeNum || 0;
    this._csfrm = options.csfrm || 0;
    dbTypeByNum.set(num, this);
    const key = (options.csfrm || 0) * 256 + options.oraTypeNum;
    dbTypeByOraTypeNum.set(key, this);
    dbTypeByColumnTypeName.set(columnTypeName, this);
  }

  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number':
        return this.num;
      default:
        return this.toString();
    }
  }

  [util.inspect.custom]() {
    return this.toString();
  }

  toString() {
    return `[DbType ${this.name}]`;
  }

}

//-----------------------------------------------------------------------------
// getTypeByColumnTypeName()
//
// Return the type given a column type name. If the column type name cannot be
// found an exception is thrown.
//-----------------------------------------------------------------------------
function getTypeByColumnTypeName(name) {
  const dbType = dbTypeByColumnTypeName.get(name);
  if (!dbType)
    errors.throwErr(errors.ERR_UNKNOWN_COLUMN_TYPE_NAME, name);
  return dbType;
}

//-----------------------------------------------------------------------------
// getTypeByNum()
//
// Return the type given the type number. If the type number is incorrect an
// exception is thrown.
//-----------------------------------------------------------------------------
function getTypeByNum(num) {
  const dbType = dbTypeByNum.get(num);
  if (!dbType)
    errors.throwErr(errors.ERR_INVALID_TYPE_NUM, num);
  return dbType;
}

//-----------------------------------------------------------------------------
// getTypeByOraTypeNum()
//
// Return the type given the Oracle type number and character set form. If the
// Oracle type number and character set form are incorrect an exception is
// thrown.
//-----------------------------------------------------------------------------
function getTypeByOraTypeNum(oraTypeNum, csfrm) {
  const key = (csfrm || 0) * 256 + oraTypeNum;
  const dbType = dbTypeByOraTypeNum.get(key);
  if (!dbType)
    errors.throwErr(errors.ERR_INVALID_ORACLE_TYPE_NUM, oraTypeNum, csfrm);
  return dbType;
}

const DB_TYPE_BFILE = new DbType(2020,
  "DB_TYPE_BFILE", "BFILE",
  { oraTypeNum: 114, bufferSizeFactor: 112 });
const DB_TYPE_BINARY_DOUBLE = new DbType(2008,
  "DB_TYPE_BINARY_DOUBLE", "BINARY_DOUBLE",
  { oraTypeNum: 101, bufferSizeFactor: 8 });
const DB_TYPE_BINARY_FLOAT = new DbType(2007,
  "DB_TYPE_BINARY_FLOAT", "BINARY_FLOAT",
  { oraTypeNum: 100, bufferSizeFactor: 4 });
const DB_TYPE_BINARY_INTEGER = new DbType(2009,
  "DB_TYPE_BINARY_INTEGER", "BINARY_INTEGER",
  { oraTypeNum: 3, bufferSizeFactor: 22 });
const DB_TYPE_BLOB = new DbType(2019,
  "DB_TYPE_BLOB", "BLOB",
  { oraTypeNum: 113, bufferSizeFactor: 112 });
const DB_TYPE_BOOLEAN = new DbType(2022,
  "DB_TYPE_BOOLEAN", "BOOLEAN",
  { oraTypeNum: 252, bufferSizeFactor: 4 });
const DB_TYPE_CHAR = new DbType(2003,
  "DB_TYPE_CHAR", "CHAR",
  { oraTypeNum: 96, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 4 });
const DB_TYPE_CLOB = new DbType(2017,
  "DB_TYPE_CLOB", "CLOB",
  { oraTypeNum: 112, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 112 });
const DB_TYPE_CURSOR = new DbType(2021,
  "DB_TYPE_CURSOR", "CURSOR",
  { oraTypeNum: 102, bufferSizeFactor: 4 });
const DB_TYPE_DATE = new DbType(2011,
  "DB_TYPE_DATE", "DATE",
  { oraTypeNum: 12, bufferSizeFactor: 7 });
const DB_TYPE_INTERVAL_DS = new DbType(2015,
  "DB_TYPE_INTERVAL_DS", "INTERVAL DAY TO SECOND",
  { oraTypeNum: 183, bufferSizeFactor: 11 });
const DB_TYPE_INTERVAL_YM = new DbType(2016,
  "DB_TYPE_INTERVAL_YM", "INTERVAL YEAR TO MONTH",
  { oraTypeNum: 182 });
const DB_TYPE_JSON = new DbType(2027,
  "DB_TYPE_JSON", "JSON",
  { oraTypeNum: 119 });
const DB_TYPE_LONG = new DbType(2024,
  "DB_TYPE_LONG", "LONG",
  { oraTypeNum: 8, csfrm: constants.CSFRM_IMPLICIT,
    bufferSizeFactor: 2 ** 31 - 1 });
const DB_TYPE_LONG_NVARCHAR = new DbType(2031,
  "DB_TYPE_LONG_NVARCHAR", "LONG",
  { oraTypeNum: 8, csfrm: constants.CSFRM_NCHAR,
    bufferSizeFactor: 2 ** 31 - 1 });
const DB_TYPE_LONG_RAW = new DbType(2025,
  "DB_TYPE_LONG_RAW", "LONG RAW",
  { oraTypeNum: 24, bufferSizeFactor: 2 ** 31 - 1 });
const DB_TYPE_NCHAR = new DbType(2004,
  "DB_TYPE_NCHAR", "NCHAR",
  { oraTypeNum: 96, csfrm: constants.CSFRM_NCHAR, bufferSizeFactor: 4 });
const DB_TYPE_NCLOB = new DbType(2018,
  "DB_TYPE_NCLOB", "NCLOB",
  { oraTypeNum: 112, csfrm: constants.CSFRM_NCHAR, bufferSizeFactor: 112 });
const DB_TYPE_NUMBER = new DbType(2010,
  "DB_TYPE_NUMBER", "NUMBER",
  { oraTypeNum: 2, bufferSizeFactor: 22 });
const DB_TYPE_NVARCHAR = new DbType(2002,
  "DB_TYPE_NVARCHAR", "NVARCHAR2",
  { oraTypeNum: 1, csfrm: constants.CSFRM_NCHAR, bufferSizeFactor: 4 });
const DB_TYPE_OBJECT = new DbType(2023,
  "DB_TYPE_OBJECT", "OBJECT",
  { oraTypeNum: 109 });
const DB_TYPE_RAW = new DbType(2006,
  "DB_TYPE_RAW", "RAW",
  { oraTypeNum: 23, bufferSizeFactor: 1 });
const DB_TYPE_ROWID = new DbType(2005,
  "DB_TYPE_ROWID", "ROWID",
  { oraTypeNum: 11, bufferSizeFactor: 18 });
const DB_TYPE_TIMESTAMP = new DbType(2012,
  "DB_TYPE_TIMESTAMP", "TIMESTAMP",
  { oraTypeNum: 180, bufferSizeFactor: 11 });
const DB_TYPE_TIMESTAMP_LTZ = new DbType(2014,
  "DB_TYPE_TIMESTAMP_LTZ", "TIMESTAMP WITH LOCAL TIME ZONE",
  { oraTypeNum: 231, bufferSizeFactor: 11 });
const DB_TYPE_TIMESTAMP_TZ = new DbType(2013,
  "DB_TYPE_TIMESTAMP_TZ", "TIMESTAMP WITH TIME ZONE",
  { oraTypeNum: 181, bufferSizeFactor: 13 });
const DB_TYPE_UROWID = new DbType(2030,
  "DB_TYPE_UROWID", "UROWID",
  { oraTypeNum: 208 });
const DB_TYPE_VARCHAR = new DbType(2001,
  "DB_TYPE_VARCHAR", "VARCHAR2",
  { oraTypeNum: 1, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 4 });
const DB_TYPE_XMLTYPE = new DbType(2032,
  "DB_TYPE_XMLTYPE", "XMLTYPE",
  { oraTypeNum: 109, csfrm: constants.CSFRM_IMPLICIT, bufferSizeFactor: 2147483647 });

// database type conversion map: the top level key refers to the database
// type being fetched and the value is another map; this map's key is the
// type requested by the user and its value is the actual type that will be
// used in the define call; only entries are included where the database type
// and the requested fetch type are different
const DB_TYPE_CONVERSION_MAP = new Map([
  [DB_TYPE_BINARY_DOUBLE, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_BINARY_FLOAT, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_BLOB, new Map([
    [DB_TYPE_RAW, DB_TYPE_LONG_RAW],
    [DB_TYPE_LONG_RAW, DB_TYPE_LONG_RAW]
  ])],
  [DB_TYPE_CHAR, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_CLOB, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_LONG],
    [DB_TYPE_LONG, DB_TYPE_LONG]
  ])],
  [DB_TYPE_DATE, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_LTZ]
  ])],
  [DB_TYPE_JSON, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_LONG, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_LONG]
  ])],
  [DB_TYPE_LONG_RAW, new Map([
    [DB_TYPE_RAW, DB_TYPE_LONG_RAW]
  ])],
  [DB_TYPE_NCHAR, new Map([
    [DB_TYPE_CHAR, DB_TYPE_NCHAR],
    [DB_TYPE_VARCHAR, DB_TYPE_NVARCHAR],
    [DB_TYPE_NVARCHAR, DB_TYPE_NVARCHAR]
  ])],
  [DB_TYPE_NCLOB, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_LONG_NVARCHAR],
    [DB_TYPE_NVARCHAR, DB_TYPE_LONG_NVARCHAR],
    [DB_TYPE_LONG, DB_TYPE_LONG_NVARCHAR],
    [DB_TYPE_LONG_NVARCHAR, DB_TYPE_LONG_NVARCHAR]
  ])],
  [DB_TYPE_NUMBER, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_NVARCHAR, new Map([
    [DB_TYPE_CHAR, DB_TYPE_NCHAR],
    [DB_TYPE_NCHAR, DB_TYPE_NCHAR],
    [DB_TYPE_VARCHAR, DB_TYPE_NVARCHAR]
  ])],
  [DB_TYPE_RAW, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ])],
  [DB_TYPE_ROWID, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_ROWID]
  ])],
  [DB_TYPE_TIMESTAMP, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_LTZ]
  ])],
  [DB_TYPE_TIMESTAMP_LTZ, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_TZ, DB_TYPE_TIMESTAMP_TZ]
  ])],
  [DB_TYPE_TIMESTAMP_TZ, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
    [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_LTZ]
  ])],
  [DB_TYPE_UROWID, new Map([
    [DB_TYPE_VARCHAR, DB_TYPE_ROWID]
  ])],
]);

// default fetch type map
const DB_TYPE_FETCH_TYPE_MAP = new Map([
  [DB_TYPE_BFILE, DB_TYPE_BFILE],
  [DB_TYPE_BINARY_DOUBLE, DB_TYPE_BINARY_DOUBLE],
  [DB_TYPE_BINARY_FLOAT, DB_TYPE_BINARY_FLOAT],
  [DB_TYPE_BINARY_INTEGER, DB_TYPE_BINARY_INTEGER],
  [DB_TYPE_BLOB, DB_TYPE_BLOB],
  [DB_TYPE_BOOLEAN, DB_TYPE_BOOLEAN],
  [DB_TYPE_CHAR, DB_TYPE_CHAR],
  [DB_TYPE_CLOB, DB_TYPE_CLOB],
  [DB_TYPE_CURSOR, DB_TYPE_CURSOR],
  [DB_TYPE_DATE, DB_TYPE_DATE],
  [DB_TYPE_INTERVAL_DS, DB_TYPE_INTERVAL_DS],
  [DB_TYPE_INTERVAL_YM, DB_TYPE_INTERVAL_YM],
  [DB_TYPE_JSON, DB_TYPE_JSON],
  [DB_TYPE_LONG, DB_TYPE_LONG],
  [DB_TYPE_LONG_NVARCHAR, DB_TYPE_LONG_NVARCHAR],
  [DB_TYPE_LONG_RAW, DB_TYPE_LONG_RAW],
  [DB_TYPE_NCHAR, DB_TYPE_NCHAR],
  [DB_TYPE_NCLOB, DB_TYPE_NCLOB],
  [DB_TYPE_NUMBER, DB_TYPE_NUMBER],
  [DB_TYPE_NVARCHAR, DB_TYPE_NVARCHAR],
  [DB_TYPE_OBJECT, DB_TYPE_OBJECT],
  [DB_TYPE_RAW, DB_TYPE_RAW],
  [DB_TYPE_ROWID, DB_TYPE_ROWID],
  [DB_TYPE_TIMESTAMP, DB_TYPE_TIMESTAMP],
  [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_TZ],
  [DB_TYPE_TIMESTAMP_TZ, DB_TYPE_TIMESTAMP_TZ],
  [DB_TYPE_UROWID, DB_TYPE_UROWID],
  [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR],
  [DB_TYPE_XMLTYPE, DB_TYPE_XMLTYPE]
]);

// additional aliases for types by column type name
dbTypeByColumnTypeName.set("DOUBLE PRECISION", DB_TYPE_NUMBER);
dbTypeByColumnTypeName.set("FLOAT", DB_TYPE_NUMBER);
dbTypeByColumnTypeName.set("INTEGER", DB_TYPE_NUMBER);
dbTypeByColumnTypeName.set("PL/SQL BOOLEAN", DB_TYPE_BOOLEAN);
dbTypeByColumnTypeName.set("PL/SQL BINARY INTEGER", DB_TYPE_BINARY_INTEGER);
dbTypeByColumnTypeName.set("PL/SQL PLS INTEGER", DB_TYPE_BINARY_INTEGER);
dbTypeByColumnTypeName.set("REAL", DB_TYPE_NUMBER);
dbTypeByColumnTypeName.set("SMALLINT", DB_TYPE_NUMBER);
dbTypeByColumnTypeName.set("TIMESTAMP WITH LOCAL TZ", DB_TYPE_TIMESTAMP_LTZ);
dbTypeByColumnTypeName.set("TIMESTAMP WITH TZ", DB_TYPE_TIMESTAMP_TZ);

module.exports = {
  DbType,
  DB_TYPE_BFILE,
  DB_TYPE_BINARY_DOUBLE,
  DB_TYPE_BINARY_FLOAT,
  DB_TYPE_BINARY_INTEGER,
  DB_TYPE_BLOB,
  DB_TYPE_BOOLEAN,
  DB_TYPE_CHAR,
  DB_TYPE_CLOB,
  DB_TYPE_CURSOR,
  DB_TYPE_DATE,
  DB_TYPE_INTERVAL_DS,
  DB_TYPE_INTERVAL_YM,
  DB_TYPE_JSON,
  DB_TYPE_LONG,
  DB_TYPE_LONG_NVARCHAR,
  DB_TYPE_LONG_RAW,
  DB_TYPE_NCHAR,
  DB_TYPE_NCLOB,
  DB_TYPE_NUMBER,
  DB_TYPE_NVARCHAR,
  DB_TYPE_OBJECT,
  DB_TYPE_RAW,
  DB_TYPE_ROWID,
  DB_TYPE_TIMESTAMP,
  DB_TYPE_TIMESTAMP_LTZ,
  DB_TYPE_TIMESTAMP_TZ,
  DB_TYPE_UROWID,
  DB_TYPE_VARCHAR,
  DB_TYPE_CONVERSION_MAP,
  DB_TYPE_FETCH_TYPE_MAP,
  DB_TYPE_XMLTYPE,
  getTypeByColumnTypeName,
  getTypeByNum,
  getTypeByOraTypeNum
};
