/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   113. dataTypeUrowid.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - UROWID.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('113. dataTypeUrowid.js', function() {

  var connection = null;
  var tableName = "nodb_urowid";
  var array = assist.data.numbersForBinaryFloat;
  var numRows = array.length;  // number of rows to return from each call to getRows()

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after('release connection', function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('113.1 testing UROWID data type', function() {
    before(function(done) {
      async.series([
        function makeTable(callback) {
          assist.createTable(connection, tableName, callback);
        },
        function insertOneRow(callback) {
          insertData(connection, tableName, callback);
        },
        function fillRowid(callback) {
          updateDate(connection, tableName, callback);
        }
      ], done);
    });

    after(function(done) {
      connection.execute(
        "DROP table " + tableName + " PURGE",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });

    it('113.1.1 query rowid', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        function(err, result) {
          should.not.exist(err);
          for (var i = 0; i < array.length; i++) {
            var resultVal = result.rows[i][1];
            should.strictEqual(typeof resultVal, "string");
            resultVal.should.not.be.null;
            should.exist(resultVal);
          }
          done();
        }
      );
    });

    it('113.1.2 works well with result set', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT },
        function(err, result) {
          should.not.exist(err);
          (result.resultSet.metaData[0]).name.should.eql('NUM');
          (result.resultSet.metaData[1]).name.should.eql('CONTENT');
          fetchRowsFromRS(result.resultSet, done);
        }
      );
    });

    it('113.1.3 works well with REF Cursor', function(done) {
      verifyRefCursor(connection, tableName, done);
    });

    it('113.1.4 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      verifyRefCursorWithFetchInfo(connection, tableName, done);
    });
  });

  describe('113.2 stores null value correctly', function() {
    it('113.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

  var insertData = function(connection, tableName, callback) {

    async.eachSeries(array, function(element, cb) {
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
    async.eachSeries(array, function(element, cb) {
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

  var verifyRefCursor = function(connection, tableName, done) {
    var createProc =
          "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
          "AS " +
          "BEGIN " +
          "    OPEN p_out FOR " +
          "        SELECT * FROM " + tableName  + "; " +
          "END; ";
    async.series([
      function createProcedure(callback) {
        connection.execute(
          createProc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function verify(callback) {
        connection.execute(
          "BEGIN testproc(:o); END;",
          [
            { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          ],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            fetchRowsFromRS(result.outBinds[0], callback);
          }
        );
      },
      function dropProcedure(callback) {
        connection.execute(
          "DROP PROCEDURE testproc",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  };
  var fetchRowsFromRS = function(rs, cb) {
    rs.getRows(numRows, function(err, rows) {
      if (rows.length > 0) {
        for (var i = 0; i < rows.length; i++) {
          var resultVal = rows[i].CONTENT;
          resultVal.should.not.be.null;
          should.exist(resultVal);
        }
        return fetchRowsFromRS(rs, cb);
      } else {
        rs.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    });
  };

  var verifyRefCursorWithFetchInfo = function(connection, tableName, done) {
    var createProc =
          "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
          "AS " +
          "BEGIN " +
          "    OPEN p_out FOR " +
          "    SELECT * FROM " + tableName  + "; " +
          "END; ";
    async.series([
      function createProcedure(callback) {
        connection.execute(
          createProc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function verify(callback) {
        connection.execute(
          "BEGIN testproc(:o); END;",
          [
            { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          ],
          {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            fetchInfo:
            {
              "CONTENT": { type: oracledb.STRING }
            }
          },
          function(err, result) {
            should.not.exist(err);
            fetchRowsFromRS_fetchas(result.outBinds[0], callback);
          }
        );
      },
      function dropProcedure(callback) {
        connection.execute(
          "DROP PROCEDURE testproc",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  };

  var fetchRowsFromRS_fetchas = function(rs, cb) {
    rs.getRows(numRows, function(err, rsrows) {
      if (rsrows.length > 0) {
        for (var i = 0; i < rsrows.length; i++) {
          var resultVal = rsrows[i].CONTENT;
          resultVal.should.not.be.null;
          resultVal.should.be.a.String();
          should.exist(resultVal);
          verifyFetchValues(connection, rsrows[i].NUM, rsrows[i].CONTENT, tableName);
        }
        return fetchRowsFromRS_fetchas(rs, cb);
      } else {
        rs.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    });
  };

  function verifyFetchValues(connection, num, content, tableName) {
    connection.execute(
      "select ROWID from " + tableName + " where num = " + num,
      function(err, result) {
        should.not.exist(err);
        content.should.eql(result.rows[0][0]);
      }
    );
  }

});
