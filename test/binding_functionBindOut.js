/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   97. binding_functionBindOut.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     Test cases get oracledb type STRING/BUFFER from all db column types using plsql function
 *     The cases take small/null bind values.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var sql      = require('./sql.js');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('97.binding_functionBindOut.js', function() {
  this.timeout(5000);
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
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  var doTest = function(table_name, procPre, bindType, dbColType, content, sequence, nullBind, callback) {
    async.series([
      function(cb) {
        var bindVar = {
          i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { type: bindType, dir: oracledb.BIND_OUT, maxSize: 1000 },
          output: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxSize: 1000 }
        };
        inBind(table_name, procPre, sequence, dbColType, bindVar, bindType, nullBind, cb);
      },
      function(cb) {
        var bindVar =[ { type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxSize: 1000 }, sequence, { type: bindType, dir: oracledb.BIND_OUT, maxSize: 1000 } ];
        inBind(table_name, procPre, sequence, dbColType, bindVar, bindType, nullBind, cb);
      }
    ], callback);
  };

  var getInsertVal = function(element, nullBind) {
    var insertValue = [];
    if(element.indexOf("CHAR") > -1 || element === "CLOB") {
      insertValue[0] = (nullBind===true) ? null : "abcsca";
      insertValue[1] = oracledb.STRING;
    }
    if(element === "BINARY_DOUBLE" || element.indexOf("FLOAT") > -1 || element === "NUMBER") {
      insertValue[0] = (nullBind===true) ? null :  1;
      insertValue[1] = oracledb.NUMBER;
    }
    if(element === "TIMESTAMP" || element === "DATE") {
      insertValue[0] = (nullBind===true) ? null :  new Date(0);
      insertValue[1] = oracledb.DATE;
    }
    if(element === "BLOB" || element.indexOf("RAW") > -1 ) {
      insertValue[0] = (nullBind===true) ? null :  assist.createBuffer(100);
      insertValue[1] = oracledb.BUFFER;
    }
    return insertValue;
  };

  var inBind = function(table_name, fun_name, sequence, dbColType, bindVar, bindType, nullBind, callback) {
    var createTable = sql.createTable(table_name, dbColType);
    var drop_table = "DROP TABLE " + table_name + " PURGE";
    var proc = "CREATE OR REPLACE FUNCTION " + fun_name + " (ID IN NUMBER, inValue OUT " + dbColType + ") RETURN NUMBER\n" +
               "IS \n" +
               "    tmpvar NUMBER; \n" +
               "BEGIN \n" +
               "    select id, content into tmpvar, inValue from " + table_name + " where id = ID; \n" +
               "    RETURN tmpvar; \n" +
               "END ; ";
    var sqlRun = "BEGIN :output := " + fun_name + " (:i, :c); END;";
    var proc_drop = "DROP FUNCTION " + fun_name;
    // console.log(proc);
    var inserted = getInsertVal(dbColType, nullBind);
    var insertSql = "insert into " + table_name + " (id, content) values (:c1, :c2)";
    async.series([
      function(cb) {
        executeSql(createTable, cb);
      },
      function(cb) {
        var bind = {
          c1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c2: { val: inserted[0], type: inserted[1], dir: oracledb.BIND_IN }
        };
        // console.log(insertSql);
        connection.execute(
          insertSql,
          bind,
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rowsAffected, 1);
            cb();
          });
      },
      function(cb) {
        executeSql(proc, cb);
      },
      function(cb) {
        connection.execute(
          sqlRun,
          bindVar,
          function(err) {
            if(bindType === oracledb.STRING) {
              compareErrMsgForString(dbColType, err);
            } else {
              compareErrMsgForRAW(nullBind, dbColType, err);
            }
            cb();
          }
        );
      },
      function(cb) {
        executeSql(proc_drop, cb);
      },
      function(cb) {
        executeSql(drop_table, cb);
      }
    ], callback);
  };

  var compareErrMsgForString = function(element, err) {
    if(element === "BLOB") {
      // ORA-06550: line 1, column 7:
      // PLS-00306: wrong number or types of arguments in call to 'NODB_INBIND_12'
      // ORA-06550: line 1, column 7:
      // PL/SQL: Statement ignored
      (err.message).should.startWith('ORA-06550:');
    } else {
      should.not.exist(err);
    }
  };

  var compareErrMsgForRAW = function(nullBind, element, err) {
    if(element === "NUMBER" || element.indexOf("FLOAT") > -1 || element === "BINARY_DOUBLE" || element === "DATE" || element === "TIMESTAMP" || element === "CLOB") {
      // ORA-06550: line 1, column 7:
      // PLS-00306: wrong number or types of arguments in call to 'NODB_INBIND_XX'
      // ORA-06550: line 1, column 7:
      // PL/SQL: Statement ignored
      (err.message).should.startWith('ORA-06550:');
    }
    if(element.indexOf("RAW") > -1 || element === "BLOB") {
      should.not.exist(err);
    }
    if(element.indexOf("CHAR") > -1) {
      if(nullBind===true) {
        should.not.exist(err);
      } else {
        // ORA-06502: PL/SQL: numeric or value error: hex to raw conversion error
        (err.message).should.startWith('ORA-06502:');
      }
    }
  };

  var tableNamePre = "table_97";
  var procPre = "proc_97";
  var index = 1;

  describe('97.1 PLSQL function: bind out small value to oracledb.STRING/BUFFER', function() {

    it('97.1.1 oracledb.STRING <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "NUMBER";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.2 oracledb.STRING <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "CHAR";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.3 oracledb.STRING <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "NCHAR";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.4 oracledb.STRING <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "VARCHAR2";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.5 oracledb.STRING <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "FLOAT";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.6 oracledb.STRING <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_FLOAT";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.7 oracledb.STRING <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.8 oracledb.STRING <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "DATE";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.9 oracledb.STRING <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "TIMESTAMP";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.10 oracledb.STRING <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "RAW";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.11 oracledb.STRING <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "CLOB";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.12 oracledb.STRING <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = "small string";
      var bindType = oracledb.STRING;
      var dbColType = "BLOB";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.13 oracledb.BUFFER <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "NUMBER";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.14 oracledb.BUFFER <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "CHAR";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.15 oracledb.BUFFER <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "NCHAR";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.16 oracledb.BUFFER <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "VARCHAR2";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.17 oracledb.BUFFER <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "FLOAT";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_FLOAT";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.20 oracledb.BUFFER <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "DATE";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.21 oracledb.BUFFER <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "TIMESTAMP";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.22 oracledb.BUFFER <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "RAW";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.23 oracledb.BUFFER <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "CLOB";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.1.24 oracledb.BUFFER <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = assist.createBuffer(100);
      var bindType = oracledb.BUFFER;
      var dbColType = "BLOB";
      var nullBind = false;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });
  });

  describe('97.2 PLSQL function: bind out small value to oracledb.STRING/BUFFER', function() {

    it('97.2.1 oracledb.STRING <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "NUMBER";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.2 oracledb.STRING <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "CHAR";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.3 oracledb.STRING <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "NCHAR";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.4 oracledb.STRING <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "VARCHAR2";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.5 oracledb.STRING <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "FLOAT";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.6 oracledb.STRING <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_FLOAT";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.7 oracledb.STRING <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.8 oracledb.STRING <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "DATE";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.9 oracledb.STRING <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "TIMESTAMP";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.10 oracledb.STRING <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "RAW";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.11 oracledb.STRING <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "CLOB";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.12 oracledb.STRING <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.STRING;
      var dbColType = "BLOB";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.13 oracledb.BUFFER <--> DB: NUMBER', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "NUMBER";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.14 oracledb.BUFFER <--> DB: CHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "CHAR";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.15 oracledb.BUFFER <--> DB: NCHAR', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "NCHAR";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.16 oracledb.BUFFER <--> DB: VARCHAR2', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "VARCHAR2";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.17 oracledb.BUFFER <--> DB: FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "FLOAT";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.18 oracledb.BUFFER <--> DB: BINARY_FLOAT', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_FLOAT";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.19 oracledb.BUFFER <--> DB: BINARY_DOUBLE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "BINARY_DOUBLE";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.20 oracledb.BUFFER <--> DB: DATE', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "DATE";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.21 oracledb.BUFFER <--> DB: TIMESTAMP', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "TIMESTAMP";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.22 oracledb.BUFFER <--> DB: RAW', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "RAW";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.23 oracledb.BUFFER <--> DB: CLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "CLOB";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });

    it('97.2.24 oracledb.BUFFER <--> DB: BLOB', function(done) {
      index++;
      var table_name = tableNamePre + index;
      var proc_name = procPre + index;
      var content = null;
      var bindType = oracledb.BUFFER;
      var dbColType = "BLOB";
      var nullBind = true;
      doTest(table_name, proc_name, bindType, dbColType, content, index, nullBind, done);
    });
  });

});
