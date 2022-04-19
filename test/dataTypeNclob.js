/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   123. dataTypeNclob.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - NCLOB.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');
var random   = require('./random.js');

describe('123. dataTypeNclob.js', function() {

  var connection = null;
  var tableName = "nodb_nclob";
  var insertID = 0;

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

  beforeEach(function(done) {
    insertID++;
    done();
  });

  describe('123.1 insert and stream out', function() {
    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
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

    it('123.1.1 works with data size 100', function(done) {
      var insertLength = 100;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          streamLob(tableName, insertStr, cb);
        }
      ], done);
    });

    it('123.1.2 works with data size 3000', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          streamLob(tableName, insertStr, cb);
        }
      ], done);
    });

  }); // 123.1

  describe('123.2 insert and fetch as string with fetchInfo', function() {
    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
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

    it('123.2.1 works with data size 100', function(done) {
      var insertLength = 100;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          fetchLob_fetchInfo(tableName, insertStr, cb);
        }
      ], done);
    });

    it('123.2.2 works with data size 3000', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          fetchLob_fetchInfo(tableName, insertStr, cb);
        }
      ], done);
    });

    it('123.2.3 works with resultSet', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          fetchLob_fetchInfo_rs(tableName, insertStr, cb);
        }
      ], done);
    });

  });

  describe('123.3 insert and fetch as string with oracledb.fetchAsString', function() {
    beforeEach('set oracledb.fetchAsString', function(done) {
      oracledb.fetchAsString = [ oracledb.CLOB ];
      done();
    }); // beforeEach

    afterEach('clear the By type specification', function(done) {
      oracledb.fetchAsString = [];
      done();
    }); // afterEach

    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
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

    it('123.3.1 works with data size 100', function(done) {
      var insertLength = 100;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          fetchLob_fetchas(tableName, insertStr, cb);
        }
      ], done);
    });

    it('123.3.2 works with data size 3000', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          fetchLob_fetchas(tableName, insertStr, cb);
        }
      ], done);
    });

    it('123.3.2 works with resultSet', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          fetchLob_fetchas_rs(tableName, insertStr, cb);
        }
      ], done);
    });

  });

  describe('123.4 ref cursor', function() {

    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
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
    });

    it('123.4.1 columns fetched from REF CURSORS can be mapped by fetchInfo settings', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          verifyRefCursor_fetchInfo(tableName, insertStr, cb);
        }
      ], done);
    });

    it('123.4.2 columns fetched from REF CURSORS can be mapped by oracledb.fetchAsString', function(done) {
      var insertLength = 3000;
      var insertStr = random.getRandomLengthString(insertLength);
      oracledb.fetchAsString = [ oracledb.CLOB ];

      async.series([
        function(cb) {
          insertData(tableName, insertStr, cb);
        },
        function(cb) {
          verifyRefCursor_fetchas(tableName, insertStr, cb);
        }
      ], done);
    });
  });

  describe('123.5 stores null value correctly', function() {
    it('123.5.1 works with Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });


  var insertData = function(tableName, insertStr, callback) {
    var sql = "INSERT INTO " + tableName + "(num, content) VALUES(" + insertID + ", TO_NCLOB('" + insertStr + "'))";
    connection.execute(
      sql,
      function(err) {
        should.not.exist(err);
        callback();
      }
    );
  };

  var streamLob = function(tableName, originalStr, callback) {
    connection.execute(
      "SELECT TO_CLOB(content) FROM " + tableName + " where num = " + insertID,
      function(err, result) {
        should.not.exist(err);
        var clob = '';
        var lob = result.rows[0][0];

        should.exist(lob);
        lob.setEncoding('utf8'); // set the encoding so we get a 'string' not a 'buffer'

        lob.on('data', function(chunk) {
          clob += chunk;
        });

        lob.on('end', function() {
          should.strictEqual(clob.length, originalStr.length);
          should.strictEqual(clob, originalStr);
          callback();
        });

        lob.on('error', function(err) {
          should.not.exist(err);
        });
      });
  };

  var fetchLob_fetchInfo = function(tableName, originalStr, callback) {
    connection.execute(
      "SELECT content AS C FROM " + tableName + " where num = " + insertID,
      {},
      {
        fetchInfo : { C : { type : oracledb.STRING } }
      },
      function(err, result) {
        should.not.exist(err);
        var resultStr = result.rows[0][0];
        should.strictEqual(resultStr.length, originalStr.length);
        should.strictEqual(resultStr, originalStr);
        callback();
      });
  };

  var fetchLob_fetchInfo_rs = function(tableName, originalStr, callback) {
    connection.execute(
      "SELECT content FROM " + tableName + " where num = " + insertID,
      {},
      {
        fetchInfo : { CONTENT : { type : oracledb.STRING } },
        resultSet : true
      },
      function(err, result) {
        should.not.exist(err);
        (result.resultSet.metaData[0]).name.should.eql('CONTENT');
        fetchRowFromRS(result.resultSet, originalStr, callback);
      });
  };

  var fetchLob_fetchas = function(tableName, originalStr, callback) {
    connection.execute(
      "SELECT content AS C FROM " + tableName + " where num = " + insertID,
      function(err, result) {
        should.not.exist(err);
        var resultStr = result.rows[0][0];
        should.strictEqual(resultStr.length, originalStr.length);
        should.strictEqual(resultStr, originalStr);
        callback();
      });
  };

  var fetchLob_fetchas_rs = function(tableName, originalStr, callback) {
    connection.execute(
      "SELECT content FROM " + tableName + " where num = " + insertID,
      {},
      {
        resultSet : true
      },
      function(err, result) {
        should.not.exist(err);
        (result.resultSet.metaData[0]).name.should.eql('CONTENT');
        fetchRowFromRS(result.resultSet, originalStr, callback);
      });
  };

  var fetchRowFromRS = function(rs, originalStr, cb) {
    rs.getRow(function(err, row) {
      should.not.exist(err);
      var resultVal = row[0];
      should.strictEqual(resultVal.length, originalStr.length);
      should.strictEqual(resultVal, originalStr);
      rs.close(function(err) {
        should.not.exist(err);
        cb();
      });
    });
  };

  var verifyRefCursor_fetchInfo = function(tableName, originalStr, done) {
    var createProc =
          "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
          "AS " +
          "BEGIN " +
          "    OPEN p_out FOR " +
          "        SELECT content FROM " + tableName  + " where num = " + insertID + "; " +
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
          { fetchInfo : { CONTENT : { type : oracledb.STRING } } },
          function(err, result) {
            should.not.exist(err);
            fetchRowFromRS(result.outBinds[0], originalStr, callback);
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

  var verifyRefCursor_fetchas = function(tableName, originalStr, done) {
    var createProc =
          "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
          "AS " +
          "BEGIN " +
          "    OPEN p_out FOR " +
          "        SELECT content FROM " + tableName  + " where num = " + insertID + "; " +
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
          function(err, result) {
            should.not.exist(err);
            fetchRowFromRS(result.outBinds[0], originalStr, callback);
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

});
