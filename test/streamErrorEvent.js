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
 *   105. streamErrorEvent.js
 *
 * DESCRIPTION
 *    Testing Stream on 'error' event.
 *    It tries to stream LOB into a read-only file which triggers error.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var fs       = require('fs');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('105. streamErrorEvent.js', function() {

  var connection = null;
  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  }); // before

  after(function(done) {
    connection.close(function(err) {
      should.not.exist(err);
      done();
    });
  }); // after

  it('105.1 triggers stream error event', function(done) {
    var rofile = "./test-read-only.txt";
    var tableName = "nodb_tab_stream_err";

    async.series([
      function createFile(cb) {
        fs.writeFile(rofile, "This is a read-only file.", function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function changeMode(cb) {
        fs.chmod(rofile, '0444', function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function createTable(cb) {
        var sql = "BEGIN \n" +
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
                  "            lob     CLOB \n" +
                  "        ) \n" +
                  "    '); \n" +
                  "END; ";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function doinsert(cb) {
        var sql = "insert into " + tableName + " values (:i, :c)";
        var bindvar = {
          i: { val: 89, type: oracledb.NUMBER },
          c: { val: "Changjie tries to trigger Stream error events.", type: oracledb.STRING }
        };
        var option = { autoCommit: true };
        connection.execute(
          sql,
          bindvar,
          option,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function triggerError(callback) {
        var sql = "select lob from " + tableName;
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var lob = result.rows[0][0];

            lob.on('error', function(err) {
              should.not.exist(err);
            });

            lob.on('close', callback); // Here it returns.

            var outStream = fs.createWriteStream(rofile);
            outStream.on('error', function(err) {
              should.exist(err);
              should.strictEqual(err.syscall, 'open');
            });
            lob.pipe(outStream);
          }
        );
      },
      function dropTable(cb) {
        var sql = "DROP TABLE " + tableName + " PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function deleteFile(cb) {
        fs.unlink(rofile, function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  });

});
