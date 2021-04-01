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
 *   138. blobDMLReturningMultipleRowsAsStream.js
 *
 * DESCRIPTION
 *   Testing BLOB DML returning multiple rows as stream.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var sql      = require('./sql.js');
var assist   = require('./dataTypeAssist.js');

describe('138. blobDMLReturningMultipleRowsAsStream.js', function() {

  var connection = null;
  var tableName = "nodb_dml_blob_138";

  var blob_table_create = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE (' \n" +
                          "        CREATE TABLE " + tableName + " ( \n" +
                          "            num      NUMBER, \n" +
                          "            blob     BLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END; ";
  var blob_table_drop = "DROP TABLE " + tableName + " PURGE";

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after(function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('138.1 BLOB DML returning multiple rows as stream', function() {
    before(function(done) {
      async.series([
        function(cb) {
          sql.executeSql(connection, blob_table_create, {}, {}, cb);
        },
        function(cb) {
          insertData(10, cb);
        }
      ], done);
    });
    after(function(done) {
      sql.executeSql(connection, blob_table_drop, {}, {}, done);
    });

    it('138.1.1 BLOB DML returning multiple rows as stream', function(done) {
      updateReturning_stream(done);
    }); // 138.1.1

  }); // 138.1

  var insertData = function(tableSize, cb) {
    var insert_data = "DECLARE \n" +
                      "    tmpchar VARCHAR2(2000); \n" +
                      "    tmplob BLOB; \n" +
                      "BEGIN \n" +
                      "    FOR i IN 1.." + tableSize + " LOOP \n" +
                      "         select to_char(i) into tmpchar from dual; \n" +
                      "         select utl_raw.cast_to_raw(tmpchar) into tmplob from dual; \n" +
                      "         insert into " + tableName + " values (i, tmplob); \n" +
                      "    END LOOP; \n" +
                      "    commit; \n" +
                      "END; ";
    async.series([
      function(callback) {
        connection.execute(
          insert_data,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "select num from " + tableName,
          function(err, result) {
            should.not.exist(err);
            should.strictEqual(result.rows.length, tableSize);
            callback();
          }
        );
      }
    ], cb);
  };

  var updateReturning_stream = function(callback) {
    var sql_update = "UPDATE " + tableName + " set num = num+10 RETURNING num, blob into :num, :lobou";
    connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      },
      function(err, result) {
        should.not.exist(err);
        var numLobs = result.outBinds.lobou.length;
        should.strictEqual(numLobs, 10);
        async.times(
          numLobs,
          function(n, next) {
            verifyLob(n, result, function(err, result) {
              next(err, result);
            });
          },
          callback
        );
      }
    );
  };

  var verifyLob = function(n, result, cb) {
    var lob = result.outBinds.lobou[n];
    var id = result.outBinds.num[n];
    should.exist(lob);
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

    lob.on('end', function(err) {
      should.not.exist(err);
      var expected = Buffer.from(String(id - 10), "utf-8");
      should.strictEqual(assist.compare2Buffers(blobData, expected), true);
      cb(err, result);
    });
  };

});
