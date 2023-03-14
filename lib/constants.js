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

// This file contains values for implementation and public constants.
//
// All public constants are later exposed to node-oracledb apps via the exports
// of oracledb.js.

'use strict';

const version = require('./version.js');

const VERSION_STRING =
  version.VERSION_MAJOR + '.' +
  version.VERSION_MINOR + '.' +
  version.VERSION_PATCH +
  version.VERSION_SUFFIX;

// database types
const DB_TYPE_BFILE = 2020;
const DB_TYPE_BINARY_DOUBLE = 2008;
const DB_TYPE_BINARY_FLOAT = 2007;
const DB_TYPE_BINARY_INTEGER = 2009;
const DB_TYPE_BLOB = 2019;
const DB_TYPE_BOOLEAN = 2022;
const DB_TYPE_CHAR = 2003;
const DB_TYPE_CLOB = 2017;
const DB_TYPE_CURSOR = 2021;
const DB_TYPE_DATE = 2011;
const DB_TYPE_INTERVAL_DS = 2015;
const DB_TYPE_INTERVAL_YM = 2016;
const DB_TYPE_JSON = 2027;
const DB_TYPE_LONG = 2024;
const DB_TYPE_LONG_NVARCHAR = 2031;
const DB_TYPE_LONG_RAW = 2025;
const DB_TYPE_NCHAR = 2004;
const DB_TYPE_NCLOB = 2018;
const DB_TYPE_NUMBER = 2010;
const DB_TYPE_NVARCHAR = 2002;
const DB_TYPE_OBJECT = 2023;
const DB_TYPE_RAW = 2006;
const DB_TYPE_ROWID = 2005;
const DB_TYPE_TIMESTAMP = 2012;
const DB_TYPE_TIMESTAMP_LTZ = 2014;
const DB_TYPE_TIMESTAMP_TZ = 2013;
const DB_TYPE_VARCHAR = 2001;

module.exports = {

  // version information
  VERSION_MAJOR: version.VERSION_MAJOR,
  VERSION_MINOR: version.VERSION_MINOR,
  VERSION_PATCH: version.VERSION_PATCH,
  VERSION_SUFFIX: version.VERSION_SUFFIX,
  VERSION_STRING: VERSION_STRING,

  // defaults for initOracleClient()
  DEFAULT_DRIVER_NAME: "node-oracledb : " + VERSION_STRING,
  DEFAULT_ERROR_URL: "https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html",

  // default for maxSize for OUT and IN/OUT binds
  DEFAULT_MAX_SIZE_FOR_OUT_BINDS: 200,

  // CQN operation codes
  CQN_OPCODE_ALL_OPS: 0,
  CQN_OPCODE_ALL_ROWS: 1,
  CQN_OPCODE_ALTER: 16,
  CQN_OPCODE_DELETE: 8,
  CQN_OPCODE_DROP: 32,
  CQN_OPCODE_INSERT: 2,
  CQN_OPCODE_UPDATE: 4,

  // database types
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
  DB_TYPE_VARCHAR,

  // database type names map
  DB_TYPE_NAMES_MAP: new Map([
    [DB_TYPE_BFILE, "BFILE"],
    [DB_TYPE_BINARY_DOUBLE, "BINARY_DOUBLE"],
    [DB_TYPE_BINARY_FLOAT, "BINARY_FLOAT"],
    [DB_TYPE_BINARY_INTEGER, "BINARY_INTEGER"],
    [DB_TYPE_BLOB, "BLOB"],
    [DB_TYPE_BOOLEAN, "BOOLEAN"],
    [DB_TYPE_CHAR, "CHAR"],
    [DB_TYPE_CLOB, "CLOB"],
    [DB_TYPE_CURSOR, "CURSOR"],
    [DB_TYPE_DATE, "DATE"],
    [DB_TYPE_INTERVAL_DS, "INTERVAL DAY TO SECOND"],
    [DB_TYPE_INTERVAL_YM, "INTERVAL YEAR TO MONTH"],
    [DB_TYPE_JSON, "JSON"],
    [DB_TYPE_LONG, "LONG"],
    [DB_TYPE_LONG_RAW, "LONG RAW"],
    [DB_TYPE_NCHAR, "NCHAR"],
    [DB_TYPE_NCLOB, "NCLOB"],
    [DB_TYPE_NUMBER, "NUMBER"],
    [DB_TYPE_NVARCHAR, "NVARCHAR2"],
    [DB_TYPE_OBJECT, "OBJECT"],
    [DB_TYPE_RAW, "RAW"],
    [DB_TYPE_ROWID, "ROWID"],
    [DB_TYPE_TIMESTAMP, "TIMESTAMP"],
    [DB_TYPE_TIMESTAMP_LTZ, "TIMESTAMP WITH LOCAL TIME ZONE"],
    [DB_TYPE_TIMESTAMP_TZ, "TIMESTAMP WITH TIME ZONE"],
    [DB_TYPE_VARCHAR, "VARCHAR2"]
  ]),

  // default fetch type map
  DB_TYPE_FETCH_TYPE_MAP: new Map([
    [DB_TYPE_BFILE, DB_TYPE_BFILE],
    [DB_TYPE_BINARY_DOUBLE, DB_TYPE_BINARY_DOUBLE],
    [DB_TYPE_BINARY_FLOAT, DB_TYPE_BINARY_FLOAT],
    [DB_TYPE_BINARY_INTEGER, DB_TYPE_BINARY_INTEGER],
    [DB_TYPE_BLOB, DB_TYPE_BLOB],
    [DB_TYPE_BOOLEAN, DB_TYPE_BOOLEAN],
    [DB_TYPE_CHAR, DB_TYPE_CHAR],
    [DB_TYPE_CLOB, DB_TYPE_CLOB],
    [DB_TYPE_CURSOR, DB_TYPE_CURSOR],
    [DB_TYPE_DATE, DB_TYPE_TIMESTAMP_LTZ],
    [DB_TYPE_INTERVAL_DS, DB_TYPE_INTERVAL_DS],
    [DB_TYPE_INTERVAL_YM, DB_TYPE_INTERVAL_YM],
    [DB_TYPE_JSON, DB_TYPE_JSON],
    [DB_TYPE_LONG, DB_TYPE_LONG],
    [DB_TYPE_LONG_RAW, DB_TYPE_LONG_RAW],
    [DB_TYPE_NCHAR, DB_TYPE_NCHAR],
    [DB_TYPE_NCLOB, DB_TYPE_NCLOB],
    [DB_TYPE_NUMBER, DB_TYPE_NUMBER],
    [DB_TYPE_NVARCHAR, DB_TYPE_NVARCHAR],
    [DB_TYPE_OBJECT, DB_TYPE_OBJECT],
    [DB_TYPE_RAW, DB_TYPE_RAW],
    [DB_TYPE_ROWID, DB_TYPE_ROWID],
    [DB_TYPE_TIMESTAMP, DB_TYPE_TIMESTAMP_LTZ],
    [DB_TYPE_TIMESTAMP_LTZ, DB_TYPE_TIMESTAMP_LTZ],
    [DB_TYPE_TIMESTAMP_TZ, DB_TYPE_TIMESTAMP_LTZ],
    [DB_TYPE_VARCHAR, DB_TYPE_VARCHAR]
  ]),

  // fetchInfo type defaulting
  DEFAULT: 0,

  // statement types
  STMT_TYPE_UNKNOWN: 0,
  STMT_TYPE_SELECT: 1,
  STMT_TYPE_UPDATE: 2,
  STMT_TYPE_DELETE: 3,
  STMT_TYPE_INSERT: 4,
  STMT_TYPE_CREATE: 5,
  STMT_TYPE_DROP: 6,
  STMT_TYPE_ALTER: 7,
  STMT_TYPE_BEGIN: 8,
  STMT_TYPE_DECLARE: 9,
  STMT_TYPE_CALL: 10,
  STMT_TYPE_EXPLAIN_PLAN: 15,
  STMT_TYPE_MERGE: 16,
  STMT_TYPE_ROLLBACK: 17,
  STMT_TYPE_COMMIT: 21,

  // shutdown modes
  SHUTDOWN_MODE_DEFAULT: 0,
  SHUTDOWN_MODE_TRANSACTIONAL: 1,
  SHUTDOWN_MODE_TRANSACTIONAL_LOCAL: 2,
  SHUTDOWN_MODE_IMMEDIATE: 3,
  SHUTDOWN_MODE_ABORT: 4,
  SHUTDOWN_MODE_FINAL: 5,

  // startup modes
  STARTUP_MODE_DEFAULT: 0,
  STARTUP_MODE_FORCE: 1,
  STARTUP_MODE_RESTRICT: 2,

  // subscription event types
  SUBSCR_EVENT_TYPE_SHUTDOWN: 2,
  SUBSCR_EVENT_TYPE_SHUTDOWN_ANY: 3,
  SUBSCR_EVENT_TYPE_STARTUP: 1,
  SUBSCR_EVENT_TYPE_DEREG: 5,
  SUBSCR_EVENT_TYPE_OBJ_CHANGE: 6,
  SUBSCR_EVENT_TYPE_QUERY_CHANGE: 7,
  SUBSCR_EVENT_TYPE_AQ: 100,

  // subscription grouping classes
  SUBSCR_GROUPING_CLASS_TIME: 1,

  // subscription grouping types
  SUBSCR_GROUPING_TYPE_SUMMARY: 1,
  SUBSCR_GROUPING_TYPE_LAST: 2,

  // subscription namespaces
  SUBSCR_NAMESPACE_AQ: 1,
  SUBSCR_NAMESPACE_DBCHANGE: 2,

  // subscription quality of service flags
  SUBSCR_QOS_BEST_EFFORT: 0x10,
  SUBSCR_QOS_DEREG_NFY: 0x02,
  SUBSCR_QOS_QUERY: 0x08,
  SUBSCR_QOS_RELIABLE: 0x01,
  SUBSCR_QOS_ROWIDS: 0x04,

  // privileges
  SYSASM: 0x00008000,
  SYSBACKUP: 0x00020000,
  SYSDBA: 0x00000002,
  SYSDG: 0x00040000,
  SYSKM: 0x00080000,
  SYSOPER: 0x00000004,
  SYSPRELIM: 0x00000008,
  SYSRAC: 0x00100000,

  // bind directions
  BIND_IN: 3001,
  BIND_INOUT: 3002,
  BIND_OUT: 3003,

  // outFormat values
  OUT_FORMAT_ARRAY: 4001,
  OUT_FORMAT_OBJECT: 4002,

  // SODA collection creation modes
  SODA_COLL_MAP_MODE: 5001,

  // pool statuses
  POOL_STATUS_OPEN: 6000,
  POOL_STATUS_DRAINING: 6001,
  POOL_STATUS_CLOSED: 6002,
  POOL_STATUS_RECONFIGURING: 6003,

  // AQ dequeue wait options
  AQ_DEQ_NO_WAIT: 0,
  AQ_DEQ_WAIT_FOREVER: 4294967295,

  // AQ dequeue modes
  AQ_DEQ_MODE_BROWSE: 1,
  AQ_DEQ_MODE_LOCKED: 2,
  AQ_DEQ_MODE_REMOVE: 3,
  AQ_DEQ_MODE_REMOVE_NO_DATA: 4,

  // AQ dequeue navigation flags
  AQ_DEQ_NAV_FIRST_MSG: 1,
  AQ_DEQ_NAV_NEXT_TRANSACTION: 2,
  AQ_DEQ_NAV_NEXT_MSG: 3,

  // AQ message delivery modes
  AQ_MSG_DELIV_MODE_PERSISTENT: 1,
  AQ_MSG_DELIV_MODE_BUFFERED: 2,
  AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED: 3,

  // AQ message states
  AQ_MSG_STATE_READY: 0,
  AQ_MSG_STATE_WAITING: 1,
  AQ_MSG_STATE_PROCESSED: 2,
  AQ_MSG_STATE_EXPIRED: 3,

  // AQ visibility flags
  AQ_VISIBILITY_IMMEDIATE: 1,
  AQ_VISIBILITY_ON_COMMIT: 2,

  // TPC/XA begin flags Constants
  TPC_BEGIN_JOIN: 0x00000002,
  TPC_BEGIN_NEW: 0x00000001,
  TPC_BEGIN_PROMOTE: 0x00000008,
  TPC_BEGIN_RESUME: 0x00000004,

  // TPC/XA two-phase commit flags
  TPC_END_NORMAL: 0,
  TPC_END_SUSPEND: 0x00100000,
};
