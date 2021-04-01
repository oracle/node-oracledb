/* Copyright (c) 2017, 2021, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   92. binding_DMLInsert.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases insert oracledb type STRING/BUFFER to all db column types
 *     The cases take small/null/large bind values.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var sql      = require('./sql.js');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');
var random   = require('./random.js');

describe('92.binding_DMLInsert.js', function() {

  var connection = null;
  var executeSql = function(sql, callback) {
    connection.execute(
      sql,
      function(err) {
        should.not.exist(err);
        return callback();
      }
    );
  };

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after(function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  var doTest = function(table_name, content, dbColType, bindType, nullBind, largeVal, callback) {
    async.series([
      function(cb) {
        var bindVar = { c: { val: content, type: bindType, dir: oracledb.BIND_IN } };
        dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, largeVal, cb);
      },
      function(cb) {
        var bindVar = [ { val: content, type: bindType, dir: oracledb.BIND_IN } ];
        dmlInsert(table_name, dbColType, bindVar, bindType, nullBind, largeVal, cb);
      }
    ], callback);
  };

  var dmlInsert = function(table_name, dbColType, bindVar, bindType, nullBind, largeVal, callback) {
    var createTable = sql.createTable(table_name, dbColType);
    var drop_table = "DROP TABLE " + table_name + " PURGE";
    async.series([
      function(cb) {
        executeSql(createTable, cb);
      },
      function(cb) {
        connection.execute(
          "insert into " + table_name + " ( content ) values (:c)",
          bindVar,
          function(err) {
            if (largeVal === true) {
              if (bindType === oracledb.STRING) {
                compareErrMsg_string(dbColType, err);
              } else {
                compareErrMsg_buffer(dbColType, err);
              }
            } else {
              if (bindType === oracledb.STRING) {
                compareErrMsg_dml_string(nullBind, dbColType, err);
              } else {
                compareErrMsg_dml_buffer(dbColType, err);
              }
            }
            cb();
          }
        );
      },
      function(cb) {
        executeSql(drop_table, cb);
      }
    ], callback);
  };

  var compareErrMsg_dml_string = function(nullBind, element, err) {
    if (nullBind === true) {
      should.not.exist(err);
    } else {
      if (element.indexOf("CHAR") > -1 || element === "CLOB") {
        should.not.exist(err);
      }
      if (element === "NUMBER" || element.indexOf("FLOAT") > -1 || element === "BINARY_DOUBLE") {
        // ORA-01722: invalid number
        (err.message).should.startWith('ORA-01722:');
      }
      if (element === "TIMESTAMP" || element === "DATE") {
        // ORA-01858: a non-numeric character was found where a numeric was expected
        (err.message).should.startWith('ORA-01858');
      }
      if (element === "BLOB" || element.indexOf("RAW") > -1) {
        // console.log(element+"======"+err);
        // ORA-01465: invalid hex number
        (err.message).should.startWith('ORA-01465:');
      }
    }
  };

  var compareErrMsg_dml_buffer = function(element, err) {
    if (element === "NUMBER" || element === "DATE" || element === "TIMESTAMP" || element.indexOf("FLOAT") > -1) {
      // NUMBER: ORA-00932: inconsistent datatypes: expected NUMBER got BINARY
      // DATE: ORA-00932: inconsistent datatypes: expected DATE got BINARY
      // TIMESTAMP: ORA-00932: inconsistent datatypes: expected TIMESTAMP got BINARY
      // FLOAT: ORA-00932: inconsistent datatypes: expected BINARY_FLOAT got BINARY
      (err.message).should.startWith('ORA-00932:');
    }
    if (element === "BLOB" || element === "CLOB" || element.indexOf("CHAR") > -1 || element.indexOf("RAW") > -1) {
      should.not.exist(err);
    }
  };

  var compareErrMsg_string = function(element, err) {
    if (element.indexOf("CHAR") > -1) {
      // ORA-12899: value too large for column "HR"."TABLE_9250"."CONTENT"
      (err.message).should.startWith('ORA-12899:');
    }
    if (element === "NUMBER" || element.indexOf("FLOAT") > -1 || element === "BINARY_DOUBLE") {
      // ORA-01722: invalid number
      (err.message).should.startWith('ORA-01722:');
    }
    if (element === "DATE") {
      // ORA-01858: a non-numeric character was found where a numeric was expected
      (err.message).should.startWith('ORA-01858');
    }
    if (element === "TIMESTAMP") {
      // ORA-01877: string is too long for internal buffer
      (err.message).should.startWith('ORA-01877');
    }
    if (element === "BLOB" || element.indexOf("RAW") > -1) {
      // console.log(element+"======"+err);
      // ORA-01465: invalid hex number
      (err.message).should.startWith('ORA-01465:');
    }
    if (element === "CLOB") {
      should.not.exist(err);
    }
  };

  var compareErrMsg_buffer = function(element, err) {
    if (element === "NUMBER" || element === "DATE" || element === "TIMESTAMP" || element.indexOf("FLOAT") > -1) {
      // NUMBER: ORA-00932: inconsistent datatypes: expected NUMBER got BINARY
      // DATE: ORA-00932: inconsistent datatypes: expected DATE got BINARY
      // TIMESTAMP: ORA-00932: inconsistent datatypes: expected TIMESTAMP got BINARY
      // FLOAT: ORA-00932: inconsistent datatypes: expected BINARY_FLOAT got BINARY
      (err.message).should.startWith('ORA-00932:');
    }
    if (element.indexOf("CHAR") > -1 || element.indexOf("RAW") > -1) {
      // ORA-12899: value too large for column "HR"."TABLE_9250"."CONTENT"
      (err.message).should.startWith('ORA-12899:');
    }
    if (element === "BLOB" || element === "CLOB") {
      should.not.exist(err);
    }
  };
  var tableNamePre = "table_92";
  var index = 0;

  describe('92.1 insert small value of oracledb.STRING/BUFFER', function() {
    it('92.1.1 oracledb.STRING <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "NUMBER";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.2 oracledb.STRING <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "CHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.3 oracledb.STRING <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "NCHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.4 oracledb.STRING <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "VARCHAR2";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.5 oracledb.STRING <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.8 oracledb.STRING <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "DATE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.9 oracledb.STRING <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "TIMESTAMP";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.10 oracledb.STRING <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "RAW";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.11 oracledb.STRING <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "CLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.12 oracledb.STRING <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "BLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.13 oracledb.BUFFER <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "NUMBER";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.14 oracledb.BUFFER <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "CHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.15 oracledb.BUFFER <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "NCHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.16 oracledb.BUFFER <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "VARCHAR2";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.17 oracledb.BUFFER <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.20 oracledb.BUFFER <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "DATE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "TIMESTAMP";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.22 oracledb.BUFFER <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "RAW";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.23 oracledb.BUFFER <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "CLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.1.24 oracledb.BUFFER <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "BLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });
  });

  describe('92.2 insert null value of oracledb.STRING/BUFFER', function() {
    it('92.2.1 oracledb.STRING <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "NUMBER";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.2 oracledb.STRING <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "CHAR";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.3 oracledb.STRING <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "NCHAR";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.4 oracledb.STRING <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "VARCHAR2";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.5 oracledb.STRING <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "FLOAT";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_FLOAT";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.8 oracledb.STRING <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "DATE";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.9 oracledb.STRING <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "TIMESTAMP";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.10 oracledb.STRING <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "RAW";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.11 oracledb.STRING <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "CLOB";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.12 oracledb.STRING <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "BLOB";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.13 oracledb.BUFFER <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "NUMBER";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.14 oracledb.BUFFER <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "CHAR";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.15 oracledb.BUFFER <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "NCHAR";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.16 oracledb.BUFFER <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "VARCHAR2";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.17 oracledb.BUFFER <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "FLOAT";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_FLOAT";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.20 oracledb.BUFFER <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "DATE";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "TIMESTAMP";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.22 oracledb.BUFFER <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "RAW";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.23 oracledb.BUFFER <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "CLOB";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });

    it('92.2.24 oracledb.BUFFER <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "BLOB";
      var nullBind = true;
      doTest(table_name, content, dbColType, bindType, nullBind, false, done);
    });
  });

  describe('92.3 insert large value of oracledb.STRING/BUFFER', function() {
    it('92.3.1 oracledb.STRING <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "NUMBER";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.2 oracledb.STRING <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "CHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.3 oracledb.STRING <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "NCHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.4 oracledb.STRING <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "VARCHAR2";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.5 oracledb.STRING <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.6 oracledb.STRING <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.7 oracledb.STRING <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.8 oracledb.STRING <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = "abc" + random.getRandomLengthString(1997);
      var bindType = oracledb.STRING;
      var dbColType = "DATE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.9 oracledb.STRING <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "TIMESTAMP";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.10 oracledb.STRING <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "RAW";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.11 oracledb.STRING <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "CLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.12 oracledb.STRING <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = random.getRandomLengthString(2000);
      var bindType = oracledb.STRING;
      var dbColType = "BLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.13 oracledb.BUFFER <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "NUMBER";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.14 oracledb.BUFFER <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "CHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.15 oracledb.BUFFER <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "NCHAR";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.16 oracledb.BUFFER <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "VARCHAR2";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.17 oracledb.BUFFER <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_FLOAT";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.20 oracledb.BUFFER <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "DATE";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.21 oracledb.BUFFER <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "TIMESTAMP";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.22 oracledb.BUFFER <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "RAW";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.23 oracledb.BUFFER <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "CLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });

    it('92.3.24 oracledb.BUFFER <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var content = assist.createBuffer(2000);
      var bindType = oracledb.BUFFER;
      var dbColType = "BLOB";
      var nullBind = false;
      doTest(table_name, content, dbColType, bindType, nullBind, true, done);
    });
  });


});
