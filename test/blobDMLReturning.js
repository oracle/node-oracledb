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
 *   136. blobDMLReturning.js
 *
 * DESCRIPTION
 *   Testing BLOB dml returning multiple rows.
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
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var sql      = require('./sql.js');
var assist   = require('./dataTypeAssist.js');

describe('136. blobDMLReturning.js', function() {

  var connection = null;
  var tableName = "nodb_dml_blob_136";
  var node6plus = false; // assume node runtime version is lower than 6

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
                          "            id      NUMBER, \n" +
                          "            blob    BLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END; ";
  var blob_table_drop = "DROP TABLE " + tableName + " PURGE";

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      if ( process.versions["node"].substring (0, 1) >= "6")
        node6plus = true;
      done();
    });
  });

  after(function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('136.1 BLOB, UPDATE', function() {
    before(function(done) {
      async.series([
        function(cb) {
          sql.executeSql(connection, blob_table_create, {}, {}, cb);
        },
        function(cb) {
          insertData();
          cb();
        }
      ], done);
    });
    after(function(done) {
      sql.executeSql(connection, blob_table_drop, {}, {}, done);
    });

    it.skip('136.1.1 works with stream', function(done) {
      updateReturning_stream(done);
    }); // 136.1.1

    it('136.1.2 fetch as string', function(done) {
      updateReturning_buffer(done);
    }); // 136.1.1

  }); // 136.1

  var insertData = function() {
    for(var i=0; i<10; i++) {
      var str = random.getRandomLengthString(i+10);
      var blob = node6plus ? Buffer.from(str, "utf-8") : new Buffer(str, "utf-8");
      connection.execute(
        "insert into " + tableName + " values (:id, :b)",
        {
          id: {val: i, dir: oracledb.BIND_IN, type: oracledb.NUMBER},
          b: {val: blob, dir: oracledb.BIND_IN, type: oracledb.BUFFER}
        },
        function(err, result) {
          should.not.exist(err);
          (result.rowsAffected).should.be.exactly(1);
        }
      );
    }
  };

  var updateReturning_stream = function(callback) {
    var sql_update = "UPDATE " + tableName + " set id = id+10 RETURNING id, blob into :num, :lobou";
    connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
      },
      function(err, result) {
        console.log(sql_update);
        should.not.exist(err);
        var numLobs = result.outBinds.lobou.length;
        should.strictEqual(numLobs, 10);
        for (var index = 0; index < result.outBinds.lobou.length; index++) {
          var lob = result.outBinds.lobou[index];
          var id = result.outBinds.num[index];
          should.exist(lob);
          var blobData = 0;
          var totalLength = 0;
          blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);

          lob.on('data', function(chunk) {
            totalLength = totalLength + chunk.length;
            blobData = Buffer.concat([blobData, chunk], totalLength);
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function(err) {
            should.not.exist(err);
            var expected = node6plus ? Buffer.from(String(id), "utf-8") : new Buffer(String(id-10), "utf-8");
            should.strictEqual(assist.compare2Buffers(blobData, expected), true);
          });
        }
        callback();
      }
    );
  };

  var updateReturning_buffer = function(callback) {
    var sql_update = "UPDATE " + tableName + " set id = id+10 RETURNING id, blob into :num, :lobou";
    connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      },
      function(err) {
        should.exist(err);
        should.strictEqual((err.message), "NJS-028: raw database type is not supported with DML Returning statements");
        callback();
      }
    );
  };

});
