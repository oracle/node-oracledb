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
 *   106. fetchRowidAsString.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - ROWID.
 *    To fetch ROWID columns as strings.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');

describe('106. fetchRowidAsString.js', function() {

  var connection = null;
  var tableName = "nodb_rowid";
  var array = random.getRandomNumArray(30);
  var numRows = array.length;  // number of rows to return from each call to getRows()

  var proc_create_table = "BEGIN \n" +
                           "  DECLARE \n" +
                           "    e_table_missing EXCEPTION; \n" +
                           "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                           "    BEGIN \n" +
                           "      EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                           "    EXCEPTION \n" +
                           "      WHEN e_table_missing \n" +
                           "      THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE ( ' \n" +
                           "      CREATE TABLE " + tableName + " ( \n" +
                           "        num      NUMBER, \n" +
                           "        content  ROWID \n" +
                           "      ) \n" +
                           "    '); \n" +
                           "END;  ";
  var drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get one connection', function(done) {
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

  var insertData = function(connection, tableName, callback) {
    async.forEach(array, function(element, cb) {
      var sql = "INSERT INTO " + tableName + "(num) VALUES(" + element + ")";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          cb();
        }
      );
    }, function(err) {
      should.not.exist(err);
      callback();
    });
  };

  var updateDate = function(connection, tableName, callback) {
    async.forEach(array, function(element, cb) {
      var sql = "UPDATE " + tableName + " T SET content = T.ROWID where num = " + element;
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          cb();
        }
      );
    }, function(err) {
      should.not.exist(err);
      callback();
    });
  };

  describe('106.1 works with fetchInfo option', function() {
    var maxRowBak = oracledb.maxRows;
    var option = { fetchInfo: { "CONTENT": { type: oracledb.STRING } } };
    before(function(done) {
      async.series([
        function makeTable(callback) {
          connection.execute(
            proc_create_table,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function insertRow(callback) {
          insertData(connection, tableName, callback);
        },
        function fillRowid(callback) {
          updateDate(connection, tableName, callback);
        }
      ], done);
    });

    after(function(done) {
      oracledb.maxRows = maxRowBak;
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('106.1.1 fetchInfo', function(done) {
      test1(option, false, done);
    });

    it('106.1.2 fetchInfo, and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testMaxRow(option, done);
    });

    it('106.1.3 fetchInfo, and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testMaxRow(option, done);
    });

    it('106.1.4 fetchInfo, and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testMaxRow(option, done);
    });

    it('106.1.5 fetchInfo, queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testQueryStream(option, done);
    });

    it('106.1.6 fetchInfo, queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testQueryStream(option, done);
    });

    it('106.1.7 fetchInfo, queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testQueryStream(option, done);
    });

    it('106.1.8 fetchInfo, resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      };
      test2(option_rs, true, done);
    });

  });

  describe('106.2 works with fetchInfo and outFormat = OBJECT', function() {
    var maxRowBak = oracledb.maxRows;
    var option = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo: { "CONTENT": { type: oracledb.STRING } }
    };
    before(function(done) {
      async.series([
        function makeTable(callback) {
          connection.execute(
            proc_create_table,
            function(err) {
              should.not.exist(err);
              callback();
            });
        },
        function insertRow(callback) {
          insertData(connection, tableName, callback);
        },
        function fillRowid(callback) {
          updateDate(connection, tableName, callback);
        }
      ], done);
    });

    after(function(done) {
      oracledb.maxRows = maxRowBak;
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('106.2.1 fetchInfo with outFormat = OBJECT', function(done) {
      test1(option, true, done);
    });

    it('106.2.2 fetchInfo, outFormat = OBJECT, and resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      };
      test2(option_rs, true, done);
    });

    it('106.2.3 fetchInfo, outFormat = OBJECT, and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testMaxRow(option, done);
    });

    it('106.2.4 fetchInfo, outFormat = OBJECT, and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testMaxRow(option, done);
    });

    it('106.2.5 fetchInfo, outFormat = OBJECT, and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testMaxRow(option, done);
    });

    it('106.2.6 fetchInfo, outFormat = OBJECT, queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testQueryStream(option, done);
    });

    it('106.2.7 fetchInfo, outFormat = OBJECT, queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testQueryStream(option, done);
    });

    it('106.2.8 fetchInfo, outFormat = OBJECT, queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testQueryStream(option, done);
    });
  });

  describe('106.3 works with fetchInfo and outFormat = ARRAY', function() {
    var maxRowBak = oracledb.maxRows;
    var option = {
      outFormat: oracledb.OUT_FORMAT_ARRAY,
      fetchInfo: { "CONTENT": { type: oracledb.STRING } }
    };
    before(function(done) {
      async.series([
        function makeTable(callback) {
          connection.execute(
            proc_create_table,
            function(err) {
              should.not.exist(err);
              callback();
            });
        },
        function insertRow(callback) {
          insertData(connection, tableName, callback);
        },
        function fillRowid(callback) {
          updateDate(connection, tableName, callback);
        }
      ], done);
    });

    after(function(done) {
      oracledb.maxRows = maxRowBak;
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('106.3.1 fetchInfo', function(done) {
      test1(option, false, done);
    });

    it('106.3.2 fetchInfo, and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testMaxRow(option, done);
    });

    it('106.3.3 fetchInfo, and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testMaxRow(option, done);
    });

    it('106.3.4 fetchInfo, and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testMaxRow(option, done);
    });

    it('106.3.5 fetchInfo, queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testQueryStream(option, done);
    });

    it('106.3.6 fetchInfo, queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testQueryStream(option, done);
    });

    it('106.3.7 fetchInfo, queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testQueryStream(option, done);
    });

    it('106.3.8 fetchInfo, resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_ARRAY,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      };
      test2(option_rs, false, done);
    });
  });

  describe('106.4 fetch as string by default', function() {
    var maxRowBak = oracledb.maxRows;
    var option = {};
    before(function(done) {
      async.series([
        function makeTable(callback) {
          connection.execute(
            proc_create_table,
            function(err) {
              should.not.exist(err);
              callback();
            });
        },
        function insertRow(callback) {
          insertData(connection, tableName, callback);
        },
        function fillRowid(callback) {
          updateDate(connection, tableName, callback);
        }
      ], done);
    });

    after(function(done) {
      oracledb.maxRows = maxRowBak;
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );

    });

    it('106.4.1 fetch by default', function(done) {
      test1(option, false, done);
    });

    it('106.4.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testMaxRow(option, done);
    });

    it('106.4.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testMaxRow(option, done);
    });

    it('106.4.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testMaxRow(option, done);
    });

    it('106.4.5 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testQueryStream(option, done);
    });

    it('106.4.6 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testQueryStream(option, done);
    });

    it('106.4.7 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testQueryStream(option, done);
    });

    it('106.4.8 resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
      };
      test2(option_rs, false, done);
    });

  });

  describe('106.5 fetch as string by default with outFormat = OBJECT', function() {
    var maxRowBak = oracledb.maxRows;
    var option = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    before(function(done) {
      async.series([
        function makeTable(callback) {
          connection.execute(
            proc_create_table,
            function(err) {
              should.not.exist(err);
              callback();
            });
        },
        function insertRow(callback) {
          insertData(connection, tableName, callback);
        },
        function fillRowid(callback) {
          updateDate(connection, tableName, callback);
        }
      ], done);
    });

    after(function(done) {
      oracledb.maxRows = maxRowBak;
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );

    });

    it('106.5.1 fetch by default', function(done) {
      test1(option, true, done);
    });

    it('106.5.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testMaxRow(option, done);
    });

    it('106.5.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testMaxRow(option, done);
    });

    it('106.5.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testMaxRow(option, done);
    });

    it('106.5.5 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testQueryStream(option, done);
    });

    it('106.5.6 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testQueryStream(option, done);
    });

    it('106.5.7 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testQueryStream(option, done);
    });

    it('106.5.8 resultSet = true', function(done) {
      var option_rs = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        resultSet: true
      };
      test2(option_rs, true, done);
    });

  });

  describe('106.6 fetch as string by default with outFormat = ARRAY', function() {
    var maxRowBak = oracledb.maxRows;
    var option = { outFormat: oracledb.OUT_FORMAT_ARRAY };
    before(function(done) {
      async.series([
        function makeTable(callback) {
          connection.execute(
            proc_create_table,
            function(err) {
              should.not.exist(err);
              callback();
            });
        },
        function insertRow(callback) {
          insertData(connection, tableName, callback);
        },
        function fillRowid(callback) {
          updateDate(connection, tableName, callback);
        }
      ], done);
    });

    after(function(done) {
      oracledb.maxRows = maxRowBak;
      connection.execute(
        drop_table,
        function(err) {
          should.not.exist(err);
          done();
        }
      );

    });

    it('106.6.1 fetch by default', function(done) {
      test1(option, false, done);
    });

    it('106.6.2 oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testMaxRow(option, done);
    });

    it('106.6.3 oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testMaxRow(option, done);
    });

    it('106.6.4 oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testMaxRow(option, done);
    });

    it('106.6.5 queryStream() and oracledb.maxRows < actual number of rows', function(done) {
      oracledb.maxRows = numRows - 1;
      testQueryStream(option, done);
    });

    it('106.6.6 queryStream() and oracledb.maxRows = actual number of rows', function(done) {
      oracledb.maxRows = numRows;
      testQueryStream(option, done);
    });

    it('106.6.7 queryStream() and oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = numRows + 1;
      testQueryStream(option, done);
    });

    it('106.6.8 resultSet = true', function(done) {
      var option_rs = {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_ARRAY
      };
      test2(option_rs, false, done);
    });

  });

  function test1(option, object, callback) {
    async.forEach(array, function(element, cb) {
      var sql = "select content,rowid from " + tableName + " where num = " + element;
      connection.execute(
        sql,
        [],
        option,
        function(err, result) {
          should.not.exist(err);
          var resultVal_1 = result.rows[0][0];
          var resultVal_2 = result.rows[0][1];
          if(object === true) {
            resultVal_1 = result.rows[0].CONTENT;
            resultVal_2 = result.rows[0].ROWID;
          }
          should.strictEqual(typeof resultVal_1, "string");
          should.strictEqual(resultVal_1, resultVal_2);
          cb();
        }
      );
    }, function(err) {
      should.not.exist(err);
      callback();
    });
  }

  function test2(option, object, callback) {
    async.forEach(array, function(element, cb) {
      var sql = "select content,rowid from " + tableName + " where num = " + element;
      connection.execute(
        sql,
        [],
        option,
        function(err, result) {
          should.not.exist(err);
          result.resultSet.getRow(
            function(err, row) {
              var resultVal_1 = row[0];
              var resultVal_2 = row[1];
              if(object === true) {
                resultVal_1 = row.CONTENT;
                resultVal_2 = row.ROWID;
              }
              should.strictEqual(typeof resultVal_1, "string");
              should.strictEqual(resultVal_1, resultVal_2);
              result.resultSet.close(function(err) {
                should.not.exist(err);
                cb();
              });
            }
          );
        }
      );
    }, function(err) {
      should.not.exist(err);
      callback();
    });
  }

  function testMaxRow(option, callback) {
    var sql = "select CONTENT from " + tableName;
    connection.execute(
      sql,
      [],
      option,
      function(err, result) {
        should.not.exist(err);
        var rowExpected = (oracledb.maxRows >= numRows) ? numRows : oracledb.maxRows;
        should.strictEqual(result.rows.length, rowExpected);
        callback();
      }
    );
  }

  function testQueryStream(option, callback) {
    var sql = "select CONTENT from " + tableName;
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
      should.strictEqual(result.length, numRows);
      callback();
    });
  }
});
