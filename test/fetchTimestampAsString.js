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
 *   19. fetchTimestampAsString.js
 *
 * DESCRIPTION
 *    Fetch Oracle TIMESTAMP types as String data
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('19. fetchTimestampAsString.js', function() {
  var connection = null;
  before(function(done) {
    async.series([
      function(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function(cb) {
        connection.execute(
          "alter session set nls_timestamp_format = 'YYYY-MM-DD HH24:MI:SS.FF'",
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "alter session set nls_timestamp_tz_format = 'YYYY-MM-DD HH24:MI:SS.FF'",
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  });

  after(function(done) {
    oracledb.fetchAsString = [];
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('19.1 TIMESTAMP',function() {
    var tableName = "nodb_timestamp1";
    var inData = assist.TIMESTAMP_STRINGS;

    before(function(done) {
      assist.setUp4sql(connection, tableName, inData, done);
    });

    after(function(done) {
      oracledb.fetchAsString = [];
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    afterEach(function() {
      oracledb.fetchAsString = [];
    });

    it('19.1.1 fetchInfo option', function(done) {
      var ref = assist.content.timestamp_1_1;
      test1(tableName, ref, done);
    });

    it('19.1.2 fetchInfo option, outFormat is OBJECT', function(done) {
      var ref = assist.content.timestamp_1_2;
      test2(tableName, ref, done);
    });

    it('19.1.3 fetchInfo option, enables resultSet', function(done) {
      var ref = assist.content.timestamp_1_1;
      test3(tableName, ref, done);
    });

    it('19.1.4 fetchInfo option, resultSet and OBJECT outFormat', function(done) {
      var ref = assist.content.timestamp_1_2;
      test4(tableName, ref, done);
    });

    it('19.1.5 fetchAsString property', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_1_1;
      test5(tableName, ref, done);
    });

    it('19.1.6 fetchAsString property and OBJECT outFormat', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_1_2;
      test6(tableName, ref, done);
    });

    it('19.1.7 fetchAsString property, resultSet', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_1_1;
      test7(tableName, ref, done);
    });

    it('19.1.8 fetchAsString property, resultSet and OBJECT outFormat', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_1_2;
      test8(tableName, ref, done);
    });

  }); // 19.1

  describe('19.2 TIMESTAMP WITH TIME ZONE', function() {

    var tableName = "nodb_timestamp3";
    var inData = assist.TIMESTAMP_TZ_STRINGS_1;

    before(function(done) {
      assist.setUp4sql(connection, tableName, inData, done);
    });

    after(function(done) {
      oracledb.fetchAsString = [];
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    afterEach(function() {
      oracledb.fetchAsString = [];
    });

    it('19.2.1 fetchInfo option', function(done) {
      var ref = assist.content.timestamp_3_1;
      test1(tableName, ref, done);
    });

    it('19.2.2 fetchInfo option, outFormat is OBJECT', function(done) {
      var ref = assist.content.timestamp_3_2;
      test2(tableName, ref, done);
    });

    it('19.2.3 fetchInfo option, enables resultSet', function(done) {
      var ref = assist.content.timestamp_3_1;
      test3(tableName, ref, done);
    });

    it('19.2.4 fetchInfo option, resultSet and OBJECT outFormat', function(done) {
      var ref = assist.content.timestamp_3_2;
      test4(tableName, ref, done);
    });

    it('19.2.5 fetchAsString property', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_3_1;
      test5(tableName, ref, done);
    });

    it('19.2.6 fetchAsString property and OBJECT outFormat', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_3_2;
      test6(tableName, ref, done);
    });

    it('19.2.7 fetchAsString property, resultSet', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_3_1;
      test7(tableName, ref, done);
    });

    it('19.2.8 fetchAsString property, resultSet and OBJECT outFormat', function(done) {
      oracledb.fetchAsString = [ oracledb.DATE ];
      var ref = assist.content.timestamp_3_2;
      test8(tableName, ref, done);
    });

  }); // 19.2

  describe('19.3 testing maxRows setttings and queryStream() to fetch as string', function() {
    var tableName = "nodb_timestamp3";
    var inData = assist.TIMESTAMP_TZ_STRINGS_1;
    var defaultLimit = oracledb.maxRows;

    before(function(done) {
      should.strictEqual(defaultLimit, 0);
      assist.setUp4sql(connection, tableName, inData, done);
    });

    after(function(done) {
      oracledb.fetchAsString = [];
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    beforeEach(function() {
      should.strictEqual(oracledb.maxRows, defaultLimit);
    });

    afterEach(function() {
      oracledb.maxRows = defaultLimit;
    });

    it('19.3.1 works well when setting oracledb.maxRows > actual number of rows', function(done) {
      oracledb.maxRows = inData.length * 2;
      var ref = assist.content.timestamp_3_1;
      test1(tableName, ref, done);
    });

    it('19.3.2 maxRows = actual num of rows', function(done) {
      oracledb.maxRows = inData.length;
      var ref = assist.content.timestamp_3_1;
      test1(tableName, ref, done);
    });

    it('19.3.3 works when oracledb.maxRows < actual number of rows', function(done) {
      var half = Math.floor(inData.length / 2);
      oracledb.maxRows = half;
      var ref = assist.content.timestamp_3_1.slice(0, half);
      test1(tableName, ref, done);
    });

    it('19.3.4 uses queryStream() and maxRows > actual number of rows', function(done) {
      oracledb.maxRows = inData.length * 2;
      var ref = assist.content.timestamp_3_1;
      test9(tableName, ref, done);
    });

    it('19.3.5 uses queryStream() and maxRows = actual number of rows', function(done) {
      oracledb.maxRows = inData.length;
      var ref = assist.content.timestamp_3_1;
      test9(tableName, ref, done);
    });

    it('19.3.6 maxRows < actual rows. maxRows does not restrict queryStream()', function(done) {
      var half = Math.floor(inData.length / 2);
      oracledb.maxRows = half;
      var ref = assist.content.timestamp_3_1;
      test9(tableName, ref, done);
    });


  }); // 19.3

  // fetchInfo option
  function test1(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      [],
      { fetchInfo: { "CONTENT": { type: oracledb.STRING } } },
      function(err, result) {
        should.not.exist(err);
        should.deepEqual(result.rows, want);
        callback();
      }
    );
  }

  // fetchInfo option, outFormat is OBJECT
  function test2(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      [],
      {
        outFormat: oracledb.OBJECT,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      },
      function(err, result) {
        should.not.exist(err);
        should.deepEqual(result.rows, want);
        callback();
      }
    );
  }

  // fetchInfo option, resultSet
  function test3(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      [],
      {
        resultSet: true,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      },
      function(err, result) {
        should.not.exist(err);
        fetchRowFromRS(result.resultSet);
        var count = 0;

        function fetchRowFromRS(rs) {
          rs.getRow(function(err, row) {
            should.not.exist(err);
            if(row) {
              should.deepEqual(row, want[count]);
              count++;
              return fetchRowFromRS(rs);
            } else {
              rs.close(function(err) {
                should.not.exist(err);
                callback();
              });
            }
          });
        } // end of fetchRowFromRS

      }
    );
  }

  function test4(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      [],
      {
        outFormat: oracledb.OBJECT,
        resultSet: true,
        fetchInfo: { "CONTENT": { type: oracledb.STRING } }
      },
      function(err, result) {
        should.not.exist(err);
        fetchRowFromRS(result.resultSet);
        var count = 0;

        function fetchRowFromRS(rs) {
          rs.getRow(function(err, row) {
            should.not.exist(err);
            if(row) {
              should.deepEqual(row, want[count]);
              count++;
              return fetchRowFromRS(rs);
            } else {
              rs.close(function(err) {
                should.not.exist(err);
                callback();
              });
            }
          });
        } // end of fetchRowFromRS

      }
    );
  }

  function test5(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      function(err, result) {
        should.not.exist(err);
        should.deepEqual(result.rows, want);
        callback();
      }
    );
  }

  function test6(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      [],
      { outFormat: oracledb.OBJECT },
      function(err, result) {
        should.not.exist(err);
        should.deepEqual(result.rows, want);
        callback();
      }
    );
  }

  function test7(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      [],
      {
        resultSet: true
      },
      function(err, result) {
        should.not.exist(err);
        fetchRowFromRS(result.resultSet);
        var count = 0;

        function fetchRowFromRS(rs) {
          rs.getRow(function(err, row) {
            should.not.exist(err);
            if(row) {
              should.deepEqual(row, want[count]);
              count++;
              return fetchRowFromRS(rs);
            } else {
              rs.close(function(err) {
                should.not.exist(err);
                callback();
              });
            }
          });
        } // end of fetchRowFromRS

      }
    );
  }

  function test8(table, want, callback) {
    connection.execute(
      "select content from " + table + " order by num",
      [],
      {
        resultSet: true,
        outFormat: oracledb.OBJECT
      },
      function(err, result) {
        should.not.exist(err);
        fetchRowFromRS(result.resultSet);
        var count = 0;

        function fetchRowFromRS(rs) {
          rs.getRow(function(err, row) {
            should.not.exist(err);
            if(row) {
              should.deepEqual(row, want[count]);
              count++;
              return fetchRowFromRS(rs);
            } else {
              rs.close(function(err) {
                should.not.exist(err);
                callback();
              });
            }
          });
        } // end of fetchRowFromRS

      }
    );
  }

  function test9(table, want, callback) {
    var sql = "select content from " + table + " order by num";
    var stream = connection.queryStream(
      sql,
      [],
      { fetchInfo: { "CONTENT": { type: oracledb.STRING } } }
    );

    var result = [];
    stream.on('data', function(data) {
      should.exist(data);
      result.push(data);
    });

    stream.on('end', function() {
      should.deepEqual(result, want);
      callback();
    });
  }

});
