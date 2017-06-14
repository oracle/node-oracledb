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
 *   117. fetchUrowidAsString_indexed.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - UROWID.
 *    To fetch UROWID columns as strings.
 *    Test UROWID greater than 200/500/4000 bytes.
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
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var sql      = require('./sql.js');

describe('117. fetchUrowidAsString_indexed.js', function() {
  var connection = null;
  var insertID = 1;
  var tableName_indexed = "nodb_urowid_fsi";
  var tableName_normal = "nodb_urowid_fsn";
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
                      "        ) organization index overflow\n" +
                      "      '); \n" +
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
                     "            id       NUMBER, \n" +
                     "            content  UROWID(4000) \n" +
                     "        ) \n" +
                     "      '); \n" +
                     "END;  ";

  var drop_table_indexed = "DROP TABLE " + tableName_indexed + " PURGE";
  var drop_table_normal = "DROP TABLE " + tableName_normal + " PURGE";

  before('get connection and create table', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('117.1 works with fetchInfo option and urowid length > 200/500/4000', function() {
    var option = { fetchInfo: { "content": { type: oracledb.STRING } } };
    var maxRowBak;

    before('get connection and create table', function(done) {
      async.series([
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
        }
      ], done);
    });

    beforeEach(function(done) {
      maxRowBak = oracledb.maxRows;
      done();
    });

    afterEach(function(done) {
      oracledb.maxRows = maxRowBak;
      done();
    });

    it('117.1.1 fetchInfo', function(done) {
      test1(option, false, false, done);
    });    

    it('117.1.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testMaxRow(option, false, done);
    });

    it('117.1.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testMaxRow(option, false, done);
    });

    it('117.1.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testMaxRow(option, false, done);
    });

    it('117.1.5 resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
        fetchInfo: { "content": { type: oracledb.STRING } }
      };
      test1(option_rs, false, true, done);
    });

    it('117.1.6 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testQueryStream(option, false, done);
    });

    it('117.1.7 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testQueryStream(option, false, done);
    });

    it('117.1.8 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testQueryStream(option, false, done);
    });

  });

  describe('117.2 works with fetchInfo and outFormat = OBJECT, urowid length > 200/500/4000', function() {
    var option = {
      outFormat: oracledb.OBJECT,
      fetchInfo: { "content": { type: oracledb.STRING } }
    };
    var maxRowBak;

    before('get connection and create table', function(done) {
      async.series([
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
        }
      ], done);
    });

    beforeEach(function(done) {
      maxRowBak = oracledb.maxRows;
      done();
    });

    afterEach(function(done) {
      oracledb.maxRows = maxRowBak;
      done();
    });

    it('117.2.1 fetchInfo', function(done) {
      test1(option, true, false, done);
    });

    it('117.2.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testMaxRow(option, false, done);
    });

    it('117.2.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testMaxRow(option, false, done);
    });

    it('117.2.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testMaxRow(option, false, done);
    });

    it('117.2.5 resultSet = true', function(done) {
      var option_rs = {
        outFormat: oracledb.OBJECT,
        resultSet: true,
        fetchInfo: { "content": { type: oracledb.STRING } }
      };
      test1(option_rs, true, true, done);
    });

    it('117.2.6 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testQueryStream(option, true, done);
    });

    it('117.2.7 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testQueryStream(option, true, done);
    });

    it('117.2.8 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testQueryStream(option, true, done);
    });

  });

  describe('117.3 works with fetchInfo and outFormat = ARRAY, urowid length > 200/500/4000', function() {
    var option = {
      outFormat: oracledb.ARRAY,
      fetchInfo: { "content": { type: oracledb.STRING } }
    };
    var maxRowBak;

    before('get connection and create table', function(done) {
      async.series([
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
        }
      ], done);
    });

    beforeEach(function(done) {
      maxRowBak = oracledb.maxRows;
      done();
    });

    afterEach(function(done) {
      oracledb.maxRows = maxRowBak;
      done();
    });

    it('117.3.1 fetchInfo', function(done) {
      test1(option, false, false, done);
    });

    it('117.3.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testMaxRow(option, false, done);
    });

    it('117.3.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testMaxRow(option, false, done);
    });

    it('117.3.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testMaxRow(option, false, done);
    });

    it('117.3.5 resultSet = true', function(done) {
      var option_rs = {
        outFormat: oracledb.ARRAY,
        resultSet: true,
        fetchInfo: { "content": { type: oracledb.STRING } }
      };
      test1(option_rs, false, true, done);
    });

    it('117.3.6 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testQueryStream(option, false, done);
    });

    it('117.3.7 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testQueryStream(option, false, done);
    });

    it('117.3.8 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testQueryStream(option, false, done);
    });

  });

  describe('117.4 fetch as string by default, urowid length > 200/500/4000', function() {
    var option = {};
    var maxRowBak;

    before('get connection and create table', function(done) {
      async.series([
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
        }
      ], done);
    });

    beforeEach(function(done) {
      maxRowBak = oracledb.maxRows;
      done();
    });

    afterEach(function(done) {
      oracledb.maxRows = maxRowBak;
      done();
    });

    it('117.4.1 fetchInfo', function(done) {
      test1(option, false, false, done);
    });

    it('117.4.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testMaxRow(option, false, done);
    });

    it('117.4.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testMaxRow(option, false, done);
    });

    it('117.4.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testMaxRow(option, false, done);
    });

    it('117.4.5 resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
      };
      test1(option_rs, false, true, done);
    });

    it('117.4.6 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testQueryStream(option, false, done);
    });

    it('117.4.7 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testQueryStream(option, false, done);
    });

    it('117.4.8 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testQueryStream(option, false, done);
    });

  });

  describe('117.5 fetch as string by default with outFormat = OBJECT, urowid length > 200/500/4000', function() {
    var option = { outFormat: oracledb.OBJECT };
    var maxRowBak;

    before('get connection and create table', function(done) {
      async.series([
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
        }
      ], done);
    });

    beforeEach(function(done) {
      maxRowBak = oracledb.maxRows;
      done();
    });

    afterEach(function(done) {
      oracledb.maxRows = maxRowBak;
      done();
    });

    it('117.5.1 fetchInfo', function(done) {
      test1(option, true, false, done);
    });

    it('117.5.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testMaxRow(option, false, done);
    });

    it('117.5.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testMaxRow(option, false, done);
    });

    it('117.5.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testMaxRow(option, false, done);
    });

    it('117.5.5 resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
        outFormat: oracledb.OBJECT
      };
      test1(option_rs, true, true, done);
    });

    it('117.5.6 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testQueryStream(option, true, done);
    });

    it('117.5.7 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testQueryStream(option, true, done);
    });

    it('117.5.8 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testQueryStream(option, true, done);
    });

  });

  describe('117.6 fetch as string by default with outFormat = ARRAY, urowid length > 200/500/4000', function() {
    var option = { outFormat: oracledb.ARRAY  };
    var maxRowBak;

    before('get connection and create table', function(done) {
      async.series([
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
        }
      ], done);
    });

    beforeEach(function(done) {
      maxRowBak = oracledb.maxRows;
      done();
    });

    afterEach(function(done) {
      oracledb.maxRows = maxRowBak;
      done();
    });

    it('117.6.1 fetchInfo', function(done) {
      test1(option, false, false, done);
    });

    it('117.6.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testMaxRow(option, false, done);
    });

    it('117.6.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testMaxRow(option, false, done);
    });

    it('117.6.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testMaxRow(option, false, done);
    });

    it('117.6.5 resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
        outFormat: oracledb.ARRAY 
      };
      test1(option_rs, false, true, done);
    });

    it('117.6.6 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = 1;
      testQueryStream(option, false, done);
    });

    it('117.6.7 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = 2;
      testQueryStream(option, false, done);
    });

    it('117.6.8 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = 10;
      testQueryStream(option, false, done);
    });

  });

  function test1(option, object, rsFlag, callback) {
    async.series([
      function(cb) {
        var strLength = 200;
        var rowidLenExpected = 200;
        var id = insertID++;
        if(rsFlag === true) fetchRowid_rs(id, strLength, rowidLenExpected, option, object, cb);
        else fetchRowid(id, strLength, rowidLenExpected, option, object, cb);
      },
      function(cb) {
        var strLength = 500;
        var rowidLenExpected = 500;
        var id = insertID++;
        if(rsFlag === true) fetchRowid_rs(id, strLength, rowidLenExpected, option, object, cb);
        else fetchRowid(id, strLength, rowidLenExpected, option, object, cb);
      },
      function(cb) {
        var strLength = 3000;
        var rowidLenExpected = 4000;
        var id = insertID++;
        if(rsFlag === true) fetchRowid_rs(id, strLength, rowidLenExpected, option, object, cb);
        else fetchRowid(id, strLength, rowidLenExpected, option, object, cb);
      }
    ], callback);
  }

  function fetchRowid(id, strLength, rowidLenExpected, option, object, callback) {
    var urowid_1, urowid_2;
    async.series([
      function(cb) {
        prepareData(id, strLength, rowidLenExpected, cb);
      },
      function(cb) {
        var sql = "select ROWID from " + tableName_indexed + " where c1 = " + id;
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            urowid_1 = result.rows[0][0];
            should.strictEqual(typeof urowid_1, "string");
            cb();
          }
        );
      },
      function(cb) {
        var sql = "select content from " + tableName_normal + " where id = " + id;
        connection.execute(
          sql,
          [],
          option,
          function(err, result) {
            should.not.exist(err);
            if(rowidLenExpected < 4000) {
              urowid_2 = result.rows[0][0];
              if(object === true) {
                urowid_2 = result.rows[0].CONTENT;
              }
              should.strictEqual(typeof urowid_2, "string");
            } else {
              should.strictEqual(typeof urowid_2, "undefined");
            }
            cb();
          }
        );
      },
      function(cb) {
        if(rowidLenExpected < 4000) {
          urowid_1.length.should.above(rowidLenExpected);
          urowid_2.length.should.above(rowidLenExpected);
          should.strictEqual(urowid_1, urowid_2);
        } else {
          urowid_1.length.should.above(rowidLenExpected);
        }
        cb();
      }
    ], callback);
  }

  function fetchRowid_rs(id, strLength, rowidLenExpected, option, object, callback) {
    var urowid_1, urowid_2;
    async.series([
      function(cb) {
        prepareData(id, strLength, rowidLenExpected, cb);
      },
      function(cb) {
        var sql = "select ROWID from " + tableName_indexed + " where c1 = " + id;
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            urowid_1 = result.rows[0][0];
            should.strictEqual(typeof urowid_1, "string");
            cb();
          }
        );
      },
      function(cb) {
        var sql = "select content from " + tableName_normal + " where id = " + id;
        connection.execute(
          sql,
          [],
          option,
          function(err, result) {
            should.not.exist(err);
            result.resultSet.getRow(
              function(error, row) {
                should.not.exist(error);
                if(rowidLenExpected < 4000) {
                  urowid_2 = row[0];
                  if(object === true) {
                    urowid_2 = row.CONTENT;
                  }
                  should.strictEqual(typeof urowid_2, "string");
                } else {
                  should.strictEqual(typeof urowid_2, "undefined");
                }
                result.resultSet.close(function(err) {
                  should.not.exist(err);
                  cb();
                });
              }
            );
          }
        );
      },
      function(cb) {
        if(rowidLenExpected < 4000) {
          urowid_1.length.should.above(rowidLenExpected);
          urowid_2.length.should.above(rowidLenExpected);
          should.strictEqual(urowid_1, urowid_2);
        } else {
          urowid_1.length.should.above(rowidLenExpected);
        }
        cb();
      }
    ], callback);
  }

  function testMaxRow(option, rsFlag, callback) {
    var id_1 = insertID++;
    var id_2 = insertID++;
    var rowExpected, rowid_1, rowid_2;
    async.series([
      function(cb) {
        var strLength = 200;
        var rowidLenExpected = 200;
        prepareData(id_1, strLength, rowidLenExpected, cb);
      },
      function(cb) {
        var strLength = 500;
        var rowidLenExpected = 500;
        prepareData(id_2, strLength, rowidLenExpected, cb);
      },
      function(cb) {
        connection.execute(
          "select * from " + tableName_normal + " where id = " + id_1 + " or id = " + id_2,
          function(err, result) {
            should.not.exist(err);
            rowExpected = (oracledb.maxRows >= 2) ? 2 : oracledb.maxRows;
            if(rsFlag === true) {
              rowExpected = 2;
            }
            should.strictEqual(result.rows.length, rowExpected);
            rowid_1 = result.rows[0][1];
            if(rowExpected === 2) {
              rowid_2 = result.rows[1][1];
            }
            cb();
          }
        );
      },
      function(cb) {
        var sql = "select ROWID from " + tableName_indexed + " where c1 = " + id_1;
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.rows[0][0];
            should.strictEqual(typeof resultVal, "string");
            should.strictEqual(resultVal, rowid_1);
            cb();
          }
        );
      },
      function(cb) {
        if(rowExpected === 2) {
          var sql = "select ROWID from " + tableName_indexed + " where c1 = " + id_2;
          connection.execute(
            sql,
            function(err, result) {
              should.not.exist(err);
              var resultVal = result.rows[0][0];
              should.strictEqual(typeof resultVal, "string");
              should.strictEqual(resultVal, rowid_2);
            }
          );
        }
        cb();
      }
    ], callback);
  }

  function testQueryStream(option, object, callback) {
    var id_1 = insertID++;
    var id_2 = insertID++;
    var rowid_1, rowid_2;
    async.series([
      function(cb) {
        var strLength = 200;
        var rowidLenExpected = 200;
        prepareData(id_1, strLength, rowidLenExpected, cb);
      },
      function(cb) {
        var strLength = 500;
        var rowidLenExpected = 500;
        prepareData(id_2, strLength, rowidLenExpected, cb);
      },
      function(cb) {
        var sql = "select content from " + tableName_normal + " where id = " + id_1 + " or id = " + id_2;
        var stream = connection.queryStream(
          sql,
          [],
          option
        );

        var result = [];
        stream.on('data', function(data) {
          should.exist(data);
          result.push(data);
        });

        stream.on('end', function() {
          should.strictEqual(result.length, 2);
          rowid_1 = result[0][0];
          rowid_2 = result[1][0];
          if(object === true) {
            rowid_1 = result[0].CONTENT;
            rowid_2 = result[1].CONTENT;
          }
          setTimeout(cb, 100);
        });
      },
      function(cb) {
        var sql = "select ROWID from " + tableName_indexed + " where c1 = " + id_1;
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.rows[0][0];
            should.strictEqual(typeof resultVal, "string");
            should.strictEqual(resultVal, rowid_1);
            cb();
          }
        );
      },
      function(cb) {
        var sql = "select ROWID from " + tableName_indexed + " where c1 = " + id_2;
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var resultVal = result.rows[0][0];
            should.strictEqual(typeof resultVal, "string");
            should.strictEqual(resultVal, rowid_2);
            cb();
          }
        );
      }
    ], callback);
  }

  function prepareData(id, strLength, rowidLenExpected, callback) {
    var str = random.getRandomLengthString(strLength);
    var urowid, urowidLen;
    async.series([
      function(cb) {
        var sql_insert = "insert into " + tableName_indexed + " values (" + id + ", '" + str + "')";
        sql.executeInsert(connection, sql_insert, {}, {}, cb);
      },
      function(cb) {
        connection.execute(
          "select ROWID from " + tableName_indexed + " where c1 = " + id,
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
        connection.execute(
          "insert into " + tableName_normal + " (id, content) values (" + id + ", '" + urowid + "')",
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
      }
    ], callback);
  }
});