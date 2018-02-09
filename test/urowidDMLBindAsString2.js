/* Copyright (c) 2017, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   115. urowidDMLBindAsString2.js
 *
 * DESCRIPTION
 *   Testing urowid binding as String with DML.
 *   The Universal ROWID (UROWID) is a datatype that can store both logical and physical rowids of Oracle tables. Logical rowids are primary key-based logical identifiers for the rows of Index-Organized Tables (IOTs).
 *   To use columns of the UROWID datatype, the value of the COMPATIBLE initialization parameter must be set to 8.1 or higher.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var sql      = require('./sql.js');
var random   = require('./random.js');

describe('115. urowidDMLBindAsString2.js', function() {
  var connection = null;
  var tableName_indexed = "nodb_urowid_indexed";
  var tableName_normal = "nodb_urowid_normal";
  var insertID = 1;

  var table_indexed = "BEGIN \n" +
                      "    DECLARE \n" +
                      "        e_table_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                      "    BEGIN \n" +
                      "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_indexed + " PURGE' ); \n" +
                      "    EXCEPTION \n" +
                      "        WHEN e_table_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE ( ' \n" +
                      "        CREATE TABLE " + tableName_indexed + " ( \n" +
                      "            c1    NUMBER, \n" +
                      "            c2    VARCHAR2(3000), \n" +
                      "            primary key(c1, c2) \n" +
                      "        ) organization index \n" +
                      "    '); \n" +
                      "END;  ";

  var table_normal = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName_normal + " PURGE' ); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE ( ' \n" +
                     "        CREATE TABLE " + tableName_normal + " ( \n" +
                     "            ID       NUMBER, \n" +
                     "            content  UROWID(4000) \n" +
                     "        ) \n" +
                     "    '); \n" +
                     "END;  ";

  var drop_table_indexed = "DROP TABLE " + tableName_indexed + " PURGE";
  var drop_table_normal = "DROP TABLE " + tableName_normal + " PURGE";

  before('get connection and create table', function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function(cb) {
        sql.executeSql(connection, table_indexed, {}, {}, cb);
      },
      function(cb) {
        sql.executeSql(connection, table_normal, {}, {}, cb);
      }
    ], done);
  });

  after('release connection', function(done) {
    async.series([
      function(cb) {
        sql.executeSql(connection, drop_table_indexed, {}, {}, cb);
      },
      function(cb) {
        sql.executeSql(connection, drop_table_normal, {}, {}, cb);
      },
      function(cb) {
        connection.release( function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  });

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('115.1 INSERT & SELECT', function() {

    it('115.1.1 works with urowid length > 200', function(done) {
      var strLength = 200;
      var rowidLenExpected = 200;
      testBigUROWID(strLength, rowidLenExpected, done);
    });

    it('115.1.2 works with urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      testBigUROWID(strLength, rowidLenExpected, done);
    });

    it('115.1.3 works with maxSize < 200', function(done) {
      var strLength = 300;
      var rowidLenExpected = 200;
      testBigUROWID_maxSize(strLength, rowidLenExpected, done);
    });
  });

  describe('115.2 UPDATE', function() {

    it('115.2.1 update null with urowid length > 200', function(done) {
      var strLength = 200;
      var rowidLenExpected = 200;
      testBigUROWID_update(null, strLength, rowidLenExpected, done);
    });

    it('115.2.2 update enpty string with urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      testBigUROWID_update("", strLength, rowidLenExpected, done);
    });

    it('115.2.3 update with urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      var rowid_org = "00000DD5.0000.0001";
      testBigUROWID_update(rowid_org, strLength, rowidLenExpected, done);
    });

    it('115.2.4 works with maxSize < 200', function(done) {
      var strLength = 300;
      var rowidLenExpected = 200;
      var rowid_org = "00000DD5.0000.0001";
      testBigUROWID_update_maxSize(rowid_org, strLength, rowidLenExpected, done);
    });

  });

  describe('115.3 RETURNING INTO', function() {

    it('115.3.1 urowid length > 200', function(done) {
      if (connection.oracleServerVersion < 1201000200) this.skip();
      var strLength = 200;
      var rowidLenExpected = 200;
      testBigUROWID_returning(strLength, rowidLenExpected, done);
    });

    it('115.3.2 urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      testBigUROWID_returning(strLength, rowidLenExpected, done);
    });

  });

  describe('115.4 WHERE', function() {

    it('115.4.1 urowid length > 200', function(done) {
      var strLength = 200;
      var rowidLenExpected = 200;
      testBigUROWID_where(strLength, rowidLenExpected, done);
    });

    it('115.4.2 urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      testBigUROWID_where(strLength, rowidLenExpected, done);
    });

  });

  describe('115.5 queryStream() and oracledb.maxRows = actual rows', function() {

    it('115.5.1 urowid length > 200', function(done) {
      var strLength = 200;
      var rowidLenExpected = 200;
      var maxRows = 2;
      testBigUROWID_stream(maxRows, strLength, rowidLenExpected, done);
    });

    it('115.5.2 urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      var maxRows = 2;
      testBigUROWID_stream(maxRows, strLength, rowidLenExpected, done);
    });

  });

  describe('115.6 queryStream() and oracledb.maxRows > actual rows', function() {

    it('115.6.1 urowid length > 200', function(done) {
      var strLength = 200;
      var rowidLenExpected = 200;
      var maxRows = 5;
      testBigUROWID_stream(maxRows, strLength, rowidLenExpected, done);
    });

    it('115.6.2 urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      var maxRows = 100;
      testBigUROWID_stream(maxRows, strLength, rowidLenExpected, done);
    });

  });

  describe('115.7 queryStream() and oracledb.maxRows < actual rows', function() {

    it('115.7.1 urowid length > 200', function(done) {
      var strLength = 200;
      var rowidLenExpected = 200;
      var maxRows = 1;
      testBigUROWID_stream(maxRows, strLength, rowidLenExpected, done);
    });

    it('115.7.2 urowid length > 500', function(done) {
      var strLength = 600;
      var rowidLenExpected = 500;
      var maxRows = 1;
      testBigUROWID_stream(maxRows, strLength, rowidLenExpected, done);
    });

  });


  var testBigUROWID = function(strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid, urowidLen;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + insertID,
          function(err, result) {
            should.not.exist(err);
            urowid = result.rows[0][0];
            urowidLen = urowid.length;
            urowidLen.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING }
        };
        connection.execute(
          "insert into " + tableName_normal + " (ID, content) values (:i, :c)",
          bindVar,
          function(err, result) {
            if(urowidLen > 4000) {
              should.exist(err);
              should.strictEqual(err.message, "ORA-01704: string literal too long");
            } else {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + insertID,
          function(err, result) {
            if(urowidLen < 4000) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.strictEqual(resultVal, urowid);
            }
            cb();
          }
        );
      },
      function(cb) {
        insertID++;
        connection.execute(
          "insert into " + tableName_normal + " (ID, content) values (" + insertID + ", '" + urowid + "')",
          function(err, result) {
            if(urowidLen > 4000) {
              should.exist(err);
              should.strictEqual(err.message, "ORA-01704: string literal too long");
            } else {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + insertID,
          function(err, result) {
            if(urowidLen < 4000) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.strictEqual(resultVal, urowid);
            }
            cb();
          }
        );
      }
    ], callback);
  };

  var testBigUROWID_maxSize = function(strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid, urowidLen;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + insertID,
          function(err, result) {
            should.not.exist(err);
            urowid = result.rows[0][0];
            urowidLen = urowid.length;
            urowidLen.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 100 }
        };
        connection.execute(
          "insert into " + tableName_normal + " (ID, content) values (:i, :c)",
          bindVar,
          function(err, result) {
            if(urowidLen > 4000) {
              should.exist(err);
              should.strictEqual(err.message, "ORA-01704: string literal too long");
            } else {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + insertID,
          function(err, result) {
            if(urowidLen < 4000) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.strictEqual(resultVal, urowid);
            }
            cb();
          }
        );
      },
      function(cb) {
        insertID++;
        connection.execute(
          "insert into " + tableName_normal + " (ID, content) values (" + insertID + ", '" + urowid + "')",
          function(err, result) {
            if(urowidLen > 4000) {
              should.exist(err);
              should.strictEqual(err.message, "ORA-01704: string literal too long");
            } else {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + insertID,
          function(err, result) {
            if(urowidLen < 4000) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.strictEqual(resultVal, urowid);
            }
            cb();
          }
        );
      }
    ], callback);
  };

  var testBigUROWID_update = function(rowid_org, strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid, urowidLen;
    var id_1 = insertID++;
    var id_2 = insertID++;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
        var bindVar = {
          i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
        };
        sql.executeInsert(connection, sql_insert, bindVar, {}, cb);
      },
      function(cb) {
        var sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
        var bindVar = {
          i: { val : id_2, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
        };
        sql.executeInsert(connection, sql_insert, bindVar, {}, cb);
      },
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + insertID,
          function(err, result) {
            should.not.exist(err);
            urowid = result.rows[0][0];
            urowidLen = urowid.length;
            urowidLen.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
          i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER }
        };
        connection.execute(
          "update " + tableName_normal + " set content = :c where ID = :i",
          bindVar,
          function(err, result) {
            if(urowidLen > 4000) {
              should.exist(err);
              should.strictEqual(err.message, "ORA-01704: string literal too long");
            } else {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + id_1,
          function(err, result) {
            if(urowidLen < 4000) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.strictEqual(resultVal, urowid);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "update " + tableName_normal + " set content = '" + urowid + "' where ID = " + id_2,
          function(err, result) {
            if(urowidLen > 4000) {
              should.exist(err);
              should.strictEqual(err.message, "ORA-01704: string literal too long");
            } else {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + id_2,
          function(err, result) {
            if(urowidLen < 4000) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.strictEqual(resultVal, urowid);
            }
            cb();
          }
        );
      }
    ], callback);
  };

  var testBigUROWID_update_maxSize = function(rowid_org, strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid, urowidLen;
    var id_1 = insertID++;
    var id_2 = insertID++;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
        var bindVar = {
          i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
        };
        sql.executeInsert(connection, sql_insert, bindVar, {}, cb);
      },
      function(cb) {
        var sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
        var bindVar = {
          i: { val : id_2, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
        };
        sql.executeInsert(connection, sql_insert, bindVar, {}, cb);
      },
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + insertID,
          function(err, result) {
            should.not.exist(err);
            urowid = result.rows[0][0];
            urowidLen = urowid.length;
            urowidLen.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
          i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER, maxSize: 100 }
        };
        connection.execute(
          "update " + tableName_normal + " set content = :c where ID = :i",
          bindVar,
          function(err, result) {
            should.not.exist(err);
            (result.rowsAffected).should.be.exactly(1);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + id_1,
          function(err, result) {
            if(urowidLen < 4000) {
              should.not.exist(err);
              var resultVal = result.rows[0][1];
              should.strictEqual(resultVal, urowid);
            }
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "update " + tableName_normal + " set content = '" + urowid + "' where ID = " + id_2,
          function(err, result) {
            should.not.exist(err);
            (result.rowsAffected).should.be.exactly(1);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where ID = " + id_2,
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.rows[0][1];
            should.strictEqual(resultVal, urowid);
            cb();
          }
        );
      }
    ], callback);
  };

  var testBigUROWID_returning = function(strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid, urowidLen;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + insertID,
          function(err, result) {
            should.not.exist(err);
            urowid = result.rows[0][0];
            urowidLen = urowid.length;
            urowidLen.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
          o: { dir : oracledb.BIND_OUT, type : oracledb.STRING, maxSize: urowidLen }
        };
        connection.execute(
          "insert into " + tableName_normal + " (ID, content) values (:i, :c) returning content into :o",
          bindVar,
          function(err, result) {
            should.not.exist(err);
            var resultVal;
            if (typeof (result.outBinds.o) === 'undefined') resultVal = result.outBinds[0][0];
            else resultVal = result.outBinds.o[0];
            should.strictEqual(resultVal, urowid);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
          o: { dir : oracledb.BIND_OUT, type : oracledb.STRING, maxSize: 100 }
        };
        connection.execute(
          "insert into " + tableName_normal + " (ID, content) values (:i, :c) returning content into :o",
          bindVar,
          function(err, result) {
            should.not.exist(result);
            should.exist(err);
            should.strictEqual(err.message, "NJS-016: buffer is too small for OUT binds");
            cb();
          }
        );
      }
    ], callback);
  };

  var testBigUROWID_where = function(strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid, urowidLen;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + insertID,
          function(err, result) {
            should.not.exist(err);
            urowid = result.rows[0][0];
            urowidLen = urowid.length;
            urowidLen.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING }
        };
        connection.execute(
          "select * from " + tableName_indexed + " where ROWID = :c",
          bindVar,
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rows[0][0], insertID);
            should.strictEqual(result.rows[0][1], str);
            cb();
          }
        );
      },
      function(cb) {
        var bindVar = {
          c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 100 }
        };
        connection.execute(
          "select * from " + tableName_indexed + " where ROWID = :c",
          bindVar,
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rows[0][0], insertID);
            should.strictEqual(result.rows[0][1], str);
            cb();
          }
        );
      }
    ], callback);
  };

  var testBigUROWID_stream = function(maxRows, strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid_1, urowidLen_1, urowid_2, urowidLen_2;
    var id_1 = insertID++;
    var id_2 = insertID++;
    var maxRowsBak = oracledb.maxRows;
    oracledb.maxRows = maxRows;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + id_1 + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + id_2 + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + id_1,
          function(err, result) {
            should.not.exist(err);
            urowid_1 = result.rows[0][0];
            urowidLen_1 = urowid_1.length;
            urowidLen_1.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + id_2,
          function(err, result) {
            should.not.exist(err);
            urowid_2 = result.rows[0][0];
            urowidLen_2 = urowid_2.length;
            urowidLen_2.should.be.above(rowidLenExpected);
            cb();
          }
        );
      },
      function(cb) {
        var counter = 0;
        var sql_select = "select c1, c2, ROWID from " + tableName_indexed + " where ROWID = :i1 or ROWID = :i2 order by c1";
        var bindVar = {
          i1: { val : urowid_1, dir : oracledb.BIND_IN, type : oracledb.STRING },
          i2: { val : urowid_2, dir : oracledb.BIND_IN, type : oracledb.STRING }
        };
        var stream = connection.queryStream(sql_select, bindVar);
        stream.on('error', function (error) {
          should.not.exist(error);
        });

        stream.on('data', function(data) {
          should.exist(data);
          counter++;
          var result_id = data[0];
          if(result_id === id_1) {
            (data).should.deepEqual([ id_1, str, urowid_1 ]);
          } else {
            (data).should.deepEqual([ id_2, str, urowid_2 ]);
          }
        });

        stream.on('metadata', function (metadata) {
          should.exist(metadata);
          (metadata).should.deepEqual([ { name: 'C1' }, { name: 'C2' }, { name: 'ROWID' } ]);
        });

        stream.on('end', function (err) {
          should.not.exist(err);
          should.equal(counter, 2);
          oracledb.maxRows = maxRowsBak;
          cb();
        });
      }
    ], callback);
  };

});
