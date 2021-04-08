/* Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   39. dataTypeRowid.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - ROWID.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const async    = require('async');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('39. dataTypeRowid.js', function() {

  let connection = null;
  const tableName = "nodb_rowid";
  const array = assist.data.numbersForBinaryFloat;

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

  describe('39.1 testing ROWID data type', function() {
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

    it('39.1.1 query rowid', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        function(err, result) {
          should.not.exist(err);
          for (let i = 0; i < array.length; i++) {
            const resultVal = result.rows[i][1];
            should.strictEqual(typeof resultVal, "string");
            resultVal.should.not.be.null;
            should.exist(resultVal);
          }
          done();
        }
      );
    });

    it('39.1.2 works well with result set', function(done) {
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

    it('39.1.3 ROWID couldn\'t update', function(done) {
      connection.execute(
        "update " + tableName + " set ROWID = CHARTOROWID('AAAspiAABAAAZnJAAE') where num = 1",
        function(err) {
          should.exist(err);
          should.strictEqual(err.message, "ORA-01747: invalid user.table.column, table.column, or column specification");
          done();
        }
      );
    });

    it('39.1.4 can get data object number correctly', function(done) {
      connection.execute(
        "select dbms_rowid.rowid_object(ROWID) AS C from " + tableName + " WHERE ROWNUM <=1",
        function(err, result) {
          should.not.exist(err);
          const resultVal = result.rows[0][0];
          should.strictEqual(typeof resultVal, "number");
          done();
        }
      );
    });

    it('39.1.5 can get datafile number correctly', function(done) {
      connection.execute(
        "select dbms_rowid.rowid_relative_fno(ROWID) AS C from " + tableName + " WHERE ROWNUM <=1",
        function(err, result) {
          should.not.exist(err);
          const resultVal = result.rows[0][0];
          should.strictEqual(typeof resultVal, "number");
          done();
        }
      );
    });

    it('39.1.6 can get data block number correctly', function(done) {
      connection.execute(
        "select dbms_rowid.ROWID_BLOCK_NUMBER(ROWID) AS C from " + tableName + " WHERE ROWNUM <=1",
        function(err, result) {
          should.not.exist(err);
          const resultVal = result.rows[0][0];
          should.strictEqual(typeof resultVal, "number");
          done();
        }
      );
    });

    it('39.1.7 can get row number correctly', function(done) {
      connection.execute(
        "select dbms_rowid.rowid_row_number(ROWID) AS C from " + tableName + " WHERE ROWNUM <=1",
        function(err, result) {
          should.not.exist(err);
          const resultVal = result.rows[0][0];
          should.strictEqual(typeof resultVal, "number");
          done();
        }
      );
    });

    it('39.1.8 works well with REF Cursor', function(done) {
      verifyRefCursor(connection, tableName, done);
    });

    it('39.1.9 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await verifyRefCursorWithFetchInfo(connection, tableName);
    });
  });

  describe('39.2 stores null value correctly', function() {
    it('39.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    });
  });

  const insertData = function(connection, tableName, callback) {

    async.eachSeries(array, function(element, cb) {
      const sql = "INSERT INTO " + tableName + "(num) VALUES(" + element + ")";
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

  const updateDate = function(connection, tableName, callback) {
    async.eachSeries(array, function(element, cb) {
      const sql = "UPDATE " + tableName + " T SET content = T.ROWID where num = " + element;
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

  const verifyRefCursor = function(connection, tableName, done) {
    const createProc =
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

  async function verifyRefCursorWithFetchInfo(connection, tableName) {
    const createProc =
          `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR)
           AS
           BEGIN
               OPEN p_out FOR SELECT * FROM ` + tableName  + `;
           END;`;

    try {
      await connection.execute(createProc);

      const result = await connection.execute(
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
        });

      await fetchRowsFromRS_fetchas(result.outBinds[0]);

      await connection.execute("DROP PROCEDURE testproc");

    } catch (err) {
      should.not.exist(err);
    }
  }

  const fetchRowsFromRS = function(rs, cb) {
    rs.getRows(function(err, rows) {
      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i++) {
          const resultVal = rows[i].CONTENT;
          resultVal.should.not.be.null;
          should.exist(resultVal);
        }
        cb();
      } else {
        rs.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    });
  };

  async function fetchRowsFromRS_fetchas(rs) {
    const rsrows = await rs.getRows();
    if (rsrows.length > 0) {
      for (let i = 0; i < rsrows.length; i++) {
        const resultVal = rsrows[i].CONTENT;
        resultVal.should.not.be.null;
        resultVal.should.be.a.String();
        should.exist(resultVal);
        await verifyFetchValues(connection, rsrows[i].NUM, rsrows[i].CONTENT, tableName);
      }
    } else {
      try {
        await rs.close();
      } catch (err) {
        should.not.exist(err);
      }
    }
  }

  async function verifyFetchValues(connection, num, content, tableName) {
    try {
      const result = await connection.execute("SELECT ROWID FROM " + tableName + " WHERE num = " + num);
      content.should.eql(result.rows[0][0]);
    } catch (err) {
      should.not.exist(err);
    }
  }

});
