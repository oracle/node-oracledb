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
 *   137. blobDMLReturningMultipleRowsAsBuffer.js
 *
 * DESCRIPTION
 *   Testing BLOB DML returning multiple rows as buffer.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var sql      = require('./sql.js');

describe('137. blobDMLReturningMultipleRowsAsBuffer.js', function() {

  var connection = null;
  var tableName = "nodb_dml_blob_137";

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

  describe('137.1 BLOB DML returning multiple rows as buffer', function() {

    var tabsize = 10;

    before(function(done) {
      async.series([
        function(cb) {
          sql.executeSql(connection, blob_table_create, {}, {}, cb);
        },
        function(cb) {
          insertData(tabsize, cb);
        }
      ], done);
    });
    after(function(done) {
      sql.executeSql(connection, blob_table_drop, {}, {}, done);
    });

    it('137.1.1 BLOB DML returning multiple rows as buffer', function(done) {
      updateReturning_buffer(tabsize, done);
    });

  });

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

  var updateReturning_buffer = function(tabsize, callback) {
    var sql_update = "UPDATE " + tableName + " set num = num+10 RETURNING num, blob into :num, :lobou";
    connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
      },
      function(err, result) {
        should.not.exist(err);
        for (var i = 0; i < tabsize; i++) {
          var outnum = result.outBinds.num[i];
          var outbuf = Number(result.outBinds.lobou[i]);
          should.strictEqual(outbuf, i + 1);
          should.strictEqual(outnum, i + 11);
        }
        callback();
      }
    );
  };

});
