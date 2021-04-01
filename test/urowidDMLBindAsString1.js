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
 *   114. urowidDMLBindAsString1.js
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

describe('114. urowidDMLBindAsString1.js', function() {
  var connection = null;
  var tableName = "nodb_bind_urowid";
  var insertID = 1;

  var proc_create_table = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE ( ' \n" +
                          "        CREATE TABLE " + tableName + " ( \n" +
                          "            ID       NUMBER, \n" +
                          "            content  UROWID(4000) \n" +
                          "        ) \n" +
                          "      '); \n" +
                          "END;  ";
  var drop_table = "DROP TABLE " + tableName + " PURGE";

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
        sql.executeSql(connection, proc_create_table, {}, {}, cb);
      }
    ], done);
  });

  after('release connection', function(done) {
    async.series([
      function(cb) {
        sql.executeSql(connection, drop_table, {}, {}, cb);
      },
      function(cb) {
        connection.release(function(err) {
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

  describe('114.1 INSERT & SELECT', function() {

    it('114.1.1 works with null', function(done) {
      var content = null;
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      dmlInsert(bindVar, content, done);
    });

    it('114.1.2 works with empty string', function(done) {
      var content = "";
      var expected = null;
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      dmlInsert(bindVar, expected, done);
    });

    it('114.1.3 works with extended rowid', function(done) {
      var content = "AAABoqAADAAAAwPAAA";
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      dmlInsert(bindVar, content, done);
    });

    it('114.1.4 works with restricted rowid', function(done) {
      var content = "00000DD5.0000.0001";
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      dmlInsert(bindVar, content, done);
    });

    it('114.1.5 throws error with number 0', function(done) {
      var content = 0;
      var sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };

      connection.execute(
        sql_insert,
        bindVar,
        function(err) {
          should.exist(err);
          (err.message).should.equal("NJS-011: encountered bind value and type mismatch");
          done();
        }
      );
    });

    it('114.1.6 works with string 0', function(done) {
      var content = "0";
      var expected = "00000000.0000.0000";
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      dmlInsert(bindVar, expected, done);
    });

    it('114.1.7 works with substr', function(done) {
      var content = "AAAA8+AALAAAAQ/AAA";
      dmlInsert_substr(content, done);
    });

    it('114.1.8 bind null with default type/dir - named bind', function(done) {
      var content = null;
      var bindVar_1 = {
        i: insertID,
        c: content
      };
      dmlInsert(bindVar_1, content, done);
    });

    it('114.1.9 bind null with default type/dir - positional bind', function(done) {
      var content = null;
      var bindVar_1 = [ insertID, content ];
      dmlInsert(bindVar_1, content, done);
    });

    it('114.1.10 bind extented rowid with default type/dir - named bind', function(done) {
      var content = "AAAA8+AALAAAAQ/AAA";
      var bindVar_1 = {
        i: insertID,
        c: content
      };
      dmlInsert(bindVar_1, content, done);
    });

    it('114.1.11 bind extented rowid with default type/dir - positional bind', function(done) {
      var content = "AAAA8+AALAAAAQ/AAA";
      var bindVar_1 = [ insertID, content ];
      dmlInsert(bindVar_1, content, done);
    });

    it('114.1.12 works with undefined', function(done) {
      var content = undefined;
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      dmlInsert(bindVar, null, done);
    });

    it('114.1.13 bind undefined with default type/dir - named bind', function(done) {
      var content = undefined;
      var bindVar_1 = {
        i: insertID,
        c: content
      };
      dmlInsert(bindVar_1, null, done);
    });

    it('114.1.14 bind undefined with default type/dir - positional bind', function(done) {
      var content = undefined;
      var bindVar_1 = [ insertID, content ];
      dmlInsert(bindVar_1, null, done);
    });

    it('114.1.15 works with NaN', function(done) {
      var content = NaN;
      var sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };

      connection.execute(
        sql_insert,
        bindVar,
        function(err) {
          should.exist(err);
          (err.message).should.equal("NJS-011: encountered bind value and type mismatch");
          done();
        }
      );
    });

  });

  describe('114.2 UPDATE', function() {

    it('114.2.1 UPDATE null column', function(done) {
      var content_insert = null;
      var content_update = "AAABiqAADAAAAwPAAA";
      dmlUpdate(content_insert, content_update, content_update, done);
    });

    it('114.2.1 UPDATE extented rowid with restricted rowid', function(done) {
      var content_insert = "AAABioAADAAAAwPAAA";
      var content_update = "00000DD5.0010.0001";
      dmlUpdate(content_insert, content_update, content_update, done);
    });

    it('114.2.3 UPDATE restricted rowid with null', function(done) {
      var content_insert = "00000DD5.0010.0002";
      var content_update = null;
      dmlUpdate(content_insert, content_update, content_update, done);
    });
  });

  describe('114.3 RETURNING INTO', function() {
    it('114.3.1 INSERT null', function(done) {
      var content = null;
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      insert_returning(bindVar, content, done);
    });

    it('114.3.2 INSERT extented rowid', function(done) {
      var content = "AAAA++AALAAAAQ/AAA";
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      insert_returning(bindVar, content, done);
    });

    it('114.3.3 INSERT restricted rowid', function(done) {
      var content = "00000000.0100.0100";
      var bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      insert_returning(bindVar, content, done);
    });

    it('114.3.7 UPDATE null with extented rowid', function(done) {
      var content_insert = null;
      var content_update = "AAABiqAADAAAAwPAAA";
      var bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      update_returning(content_insert, bindVar_update, content_update, done);
    });

    it('114.3.8 UPDATE extented rowid with null', function(done) {
      var content_insert = "AAABiqAADAAAAwPAAA";
      var content_update = null;
      var bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      update_returning(content_insert, bindVar_update, content_update, done);
    });

    it('114.3.9 UPDATE restricted rowid with empty string', function(done) {
      var content_insert = "00000000.0100.0100";
      var content_update = "";
      var bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      update_returning(content_insert, bindVar_update, null, done);
    });

    it('114.3.10 UPDATE restricted rowid with extented rowid', function(done) {
      var content_insert = "00000000.0100.0100";
      var content_update = "AAABiqAADAAAAwPAAA";
      var bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      update_returning(content_insert, bindVar_update, content_update, done);
    });

    it('114.3.11 INSERT with default type/dir - named bind', function(done) {
      var content = "00000000.0100.0100";
      var bindVar = {
        i: insertID,
        c: content,
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      insert_returning(bindVar, content, done);
    });

    it('114.3.12 INSERT with default type/dir - positional bind', function(done) {
      var content = "00000000.0100.0100";
      var bindVar = [ insertID, content, { dir : oracledb.BIND_OUT, type : oracledb.STRING } ];
      insert_returning(bindVar, content, done);
    });

    it('114.3.13 UPDATE with default type/dir - named bind', function(done) {
      var content_insert = "00000000.0100.0100";
      var content_update = "AAABiqAADAAAAwPAAA";
      var bindVar_update = {
        i: insertID,
        c: content_update,
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      update_returning(content_insert, bindVar_update, content_update, done);
    });

    it('114.3.14 UPDATE with default type/dir - positional bind', function(done) {
      var content_insert = "00000000.0100.0100";
      var content_update = "AAABiqAADAAAAwPAAA";
      var bindVar_update = [ content_update, insertID, { dir : oracledb.BIND_OUT, type : oracledb.STRING } ];
      update_returning(content_insert, bindVar_update, content_update, done);
    });
  });

  describe('107.4 WHERE', function() {
    it('107.4.1 can bind in WHERE clause', function(done) {
      where_select(done);
    });
  });

  var dmlInsert = function(bindVar, expected, callback) {
    var sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
    var sql_select = "select * from " + tableName + " where id = :i";
    async.series([
      function(cb) {
        connection.execute(
          sql_insert,
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
          sql_select,
          { i: insertID },
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.rows[0][1];
            should.strictEqual(resultVal, expected);
            // should.strictEqual(typeof resultVal, "string");
            cb();
          }
        );
      }
    ], callback);
  };

  var dmlInsert_substr = function(content, callback) {
    var id = insertID++;
    var sql_insert = "insert into " + tableName + "(id, content) values (" + id + ", CHARTOROWID(:c))";
    var sql_select = "select content, SUBSTR(content,1,6) , SUBSTR(content,7,3), SUBSTR(content,10,6), SUBSTR(content,16,3) from " + tableName + " where id = " + id;
    var bindVar = { c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }};
    async.series([
      function(cb) {
        connection.execute(
          sql_insert,
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
          sql_select,
          function(err, result) {
            should.not.exist(err);
            var resultVal_rowid = result.rows[0][0];
            var resultVal_object = result.rows[0][1];
            var resultVal_file = result.rows[0][2];
            var resultVal_block = result.rows[0][3];
            var resultVal_row = result.rows[0][4];
            should.strictEqual(typeof resultVal_rowid, "string");
            should.strictEqual(typeof resultVal_block, "string");
            should.strictEqual(typeof resultVal_row, "string");
            should.strictEqual(typeof resultVal_file, "string");
            should.strictEqual(typeof resultVal_object, "string");
            should.strictEqual(resultVal_rowid, content);
            should.strictEqual(resultVal_object, content.substring(0, 6));
            should.strictEqual(resultVal_file, content.substring(6, 9));
            should.strictEqual(resultVal_block, content.substring(9, 15));
            should.strictEqual(resultVal_row, content.substring(15, 18));
            cb();
          }
        );
      }
    ], callback);
  };

  var dmlUpdate = function(content_insert, content_update, expected, callback) {
    var sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
    var sql_update = "update " + tableName + " set content = :c where id = :i";
    var sql_select = "select * from " + tableName + " where id = :i";
    var bindVar_insert = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : content_insert, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    var bindVar_update = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    async.series([
      function(cb) {
        connection.execute(
          sql_insert,
          bindVar_insert,
          function(err, result) {
            should.not.exist(err);
            (result.rowsAffected).should.be.exactly(1);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          sql_update,
          bindVar_update,
          function(err, result) {
            should.not.exist(err);
            (result.rowsAffected).should.be.exactly(1);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          sql_select,
          { i: insertID },
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.rows[0][1];
            should.strictEqual(resultVal, expected);
            // should.strictEqual(typeof resultVal, "string");
            cb();
          }
        );
      }
    ], callback);
  };

  var insert_returning = function(bindVar, expected, callback) {
    var sql_returning = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c)) returning content into :o";
    connection.execute(
      sql_returning,
      bindVar,
      function(err, result) {
        should.not.exist(err);
        var resultVal;
        if (typeof (result.outBinds.o) === 'undefined') resultVal = result.outBinds[0][0];
        else resultVal = result.outBinds.o[0];
        should.strictEqual(resultVal, expected);
        // should.strictEqual(typeof resultVal, "string");
        callback();
      }
    );
  };

  var update_returning = function(content_insert, bindVar_update, expected, callback) {
    var sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
    var sql_update = "update " + tableName + " set content = :c where id = :i returning content into :o";
    var bindVar_insert = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : content_insert, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    async.series([
      function(cb) {
        connection.execute(
          sql_insert,
          bindVar_insert,
          function(err, result) {
            should.not.exist(err);
            (result.rowsAffected).should.be.exactly(1);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          sql_update,
          bindVar_update,
          function(err, result) {
            should.not.exist(err);
            var resultVal;
            if (typeof (result.outBinds.o) === 'undefined') resultVal = result.outBinds[0][0];
            else resultVal = result.outBinds.o[0];
            should.strictEqual(resultVal, expected);
            // should.strictEqual(typeof resultVal, "string");
            cb();
          }
        );
      }
    ], callback);
  };

  var where_select = function(callback) {
    async.series([
      function(cb) {
        connection.execute(
          "insert into " + tableName + " T (ID) values (" + insertID + ")",
          function(err, result) {
            should.not.exist(err);
            (result.rowsAffected).should.be.exactly(1);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "UPDATE " + tableName + " T SET content = T.ROWID where ID = " + insertID,
          function(err, result) {
            should.not.exist(err);
            (result.rowsAffected).should.be.exactly(1);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "select content from " + tableName + " where ID = " + insertID,
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.rows[0][0];
            connection.execute(
              "select * from " + tableName + " where ROWID = CHARTOROWID(:c)",
              { c: { val: resultVal, dir : oracledb.BIND_IN, type : oracledb.STRING } },
              function(err_1, result_1) {
                should.not.exist(err_1);
                var resultVal_1 = result_1.rows[0][0];
                var resultVal_2 = result_1.rows[0][1];
                should.strictEqual(resultVal_1, insertID);
                should.strictEqual(resultVal_2, resultVal);
                cb();
              }
            );
          }
        );
      }
    ], callback);
  };

});
