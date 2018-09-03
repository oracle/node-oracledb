/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   59. lobResultSet.js
 *
 * DESCRIPTION
 *
 *   Inspired by https://github.com/oracle/node-oracledb/issues/210
 *   Testing Lob data and result set.
 *   Create a table contains Lob data. Read the Lob to result set. Get
 *     rows one by one. Read the lob data on each row.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var fs       = require('fs');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('59. lobResultSet.js', function() {

  var connection = null;

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

  describe('59.1 CLOB data', function() {
    var insertID = 1;
    var tableName = "nodb_myclobs";
    var inFileName = './test/clobexample.txt';
    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
    });

    after('drop table', function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    function fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected, callback) {
      resultSet.getRow( function(err, row) {
        should.not.exist(err);
        if (!row) {
          resultSet.close( function(err) {
            should.not.exist(err);
            should.strictEqual(rowsFetched, rowsExpected);
            callback();
          });
        } else {
          var lob = row[1];
          lob.setEncoding('utf8');

          var text = "";
          lob.on('data', function(chunk) {
            text = text + chunk;
          });

          lob.on('end', function() {
            rowsFetched ++;
            fs.readFile(inFileName, { encoding: 'utf8' }, function(err, originalData) {
              should.not.exist(err);
              should.strictEqual(text, originalData);
            });
            fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected, callback);
          });

          lob.on('error', function(err) {
            console.log("lob.on 'error' event");
            console.error(err.message);
          });
        }
      });
    }

    function streamIntoClob(id, cb) {
      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, EMPTY_CLOB()) RETURNING content INTO :lobbv",
        { n: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } },
        function(err, result) {
          should.not.exist(err);
          var lob = result.outBinds.lobbv[0];
          var inStream = fs.createReadStream(inFileName);

          inStream.pipe(lob);

          lob.on('close', function() {
            connection.commit( function(err) {
              should.not.exist(err);
              cb(); // insertion done
            });
          });

          inStream.on('error', function(err) {
            should.not.exist(err);
          });
        }
      );
    }

    it('59.1.1 reads clob data one by one row from result set', function(done) {
      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoClob(id_1, callback);
        },
        function(callback) {
          streamIntoClob(id_2, callback);
        },
        function(callback) {
          streamIntoClob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        }
      ], done);
    }); // 59.1.1

    it('59.1.2 works with oracledb.maxRows > actual number of rows fetched', function(done) {
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoClob(id_1, callback);
        },
        function(callback) {
          streamIntoClob(id_2, callback);
        },
        function(callback) {
          streamIntoClob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        },
        function(callback) {
          oracledb.maxRows = maxRowsBak;
          callback();
        }
      ], done);
    }); // 59.1.2

    it('59.1.3 works with oracledb.maxRows = actual number of rows fetched', function(done) {
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 3;

      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoClob(id_1, callback);
        },
        function(callback) {
          streamIntoClob(id_2, callback);
        },
        function(callback) {
          streamIntoClob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        },
        function(callback) {
          oracledb.maxRows = maxRowsBak;
          callback();
        }
      ], done);
    }); // 59.1.3

    it('59.1.4 works with oracledb.maxRows < actual number of rows fetched', function(done) {
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoClob(id_1, callback);
        },
        function(callback) {
          streamIntoClob(id_2, callback);
        },
        function(callback) {
          streamIntoClob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        },
        function(callback) {
          oracledb.maxRows = maxRowsBak;
          callback();
        }
      ], done);
    }); // 59.1.4

  }); // 59.1

  describe('59.2 BLOB data', function() {
    var insertID = 1;
    var tableName = "nodb_myblobs";
    var jpgFileName = "./test/fuzzydinosaur.jpg";
    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
    });

    after('drop table', function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    function fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected, callback) {
      resultSet.getRow( function(err, row) {
        should.not.exist(err);
        if (!row) {
          resultSet.close( function(err) {
            should.not.exist(err);
            should.strictEqual(rowsFetched, rowsExpected);
            rowsFetched = 0;
            callback();
          });
        } else {
          var lob = row[1];
          var blobData = 0;
          var totalLength = 0;
          blobData = Buffer.alloc(0);

          lob.on('data', function(chunk) {
            totalLength = totalLength + chunk.length;
            blobData = Buffer.concat([blobData, chunk], totalLength);
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function() {
            fs.readFile( jpgFileName, function(err, originalData) {
              should.not.exist(err);
              should.strictEqual(totalLength, originalData.length);
              originalData.should.eql(blobData);
            });
            rowsFetched ++;
            fetchOneRowFromRS(resultSet, rowsFetched, rowsExpected, callback);
          });
        }
      });
    }

    function streamIntoBlob(id, cb) {
      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, EMPTY_BLOB()) RETURNING content INTO :lobbv",
        { n: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } },
        function(err, result) {
          should.not.exist(err);
          var lob = result.outBinds.lobbv[0];
          var inStream = fs.createReadStream(jpgFileName);

          inStream.pipe(lob);

          lob.on('close', function() {
            connection.commit( function(err) {
              should.not.exist(err);
              cb(); // insertion done
            });
          });

          inStream.on('error', function(err) {
            should.not.exist(err);
          });

        }
      );
    }

    it('59.2.1 reads blob data one by one row from result set', function(done) {
      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoBlob(id_1, callback);
        },
        function(callback) {
          streamIntoBlob(id_2, callback);
        },
        function(callback) {
          streamIntoBlob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        }
      ], done);
    }); // 59.2.1

    it('59.2.2 works with oracledb.maxRows > actual number of rows fetched', function(done) {
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 10;

      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoBlob(id_1, callback);
        },
        function(callback) {
          streamIntoBlob(id_2, callback);
        },
        function(callback) {
          streamIntoBlob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        },
        function(callback) {
          oracledb.maxRows = maxRowsBak;
          callback();
        }
      ], done);
    }); // 59.2.2

    it('59.2.3 works with oracledb.maxRows = actual number of rows fetched', function(done) {
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 3;

      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoBlob(id_1, callback);
        },
        function(callback) {
          streamIntoBlob(id_2, callback);
        },
        function(callback) {
          streamIntoBlob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        },
        function(callback) {
          oracledb.maxRows = maxRowsBak;
          callback();
        }
      ], done);
    }); // 59.2.3

    it('59.2.4 works with oracledb.maxRows < actual number of rows fetched', function(done) {
      var maxRowsBak = oracledb.maxRows;
      oracledb.maxRows = 1;

      var id_1 = insertID++;
      var id_2 = insertID++;
      var id_3 = insertID++;
      async.series([
        function(callback) {
          streamIntoBlob(id_1, callback);
        },
        function(callback) {
          streamIntoBlob(id_2, callback);
        },
        function(callback) {
          streamIntoBlob(id_3, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT num, content FROM " + tableName + " where  num = " + id_1 + " or num = " + id_2 + " or num = " + id_3,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              var actualRowsFetched = 0; // actual rows read from resultset
              var rowsExpected = 3; // expected rows read from resultSet
              fetchOneRowFromRS(result.resultSet, actualRowsFetched, rowsExpected, callback);
            }
          );
        },
        function(callback) {
          oracledb.maxRows = maxRowsBak;
          callback();
        }
      ], done);
    }); // 59.2.4

  }); // 59.2

}); // 59
