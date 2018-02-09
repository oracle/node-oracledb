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
 *   68. multipleLobInsertion.js
 *
 * DESCRIPTION
 *   Testing external authentication functionality.
 *
 *   Note that enabling the externalAuth feature requires configuration on the
 *   database besides setting "externalAuth" attribute to be true. Please refer
 *   to api doc about the configuration.
 *   https://github.com/oracle/node-oracledb/blob/master/doc/api.md#extauth
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var fs       = require('fs');
var dbConfig = require('./dbconfig.js');

describe('68. multipleLobInsertion.js', function() {

  var connection = null;
  before(function(done) {

    async.series([
      function getConn(cb) {
        oracledb.getConnection(
          dbConfig,
          function(err, conn) {
            should.not.exist(err);
            connection = conn;
            cb();
          }
        );
      },
      function createTabBLOB(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE('DROP TABLE nodb_multi_blob PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_multi_blob ( \n" +
                   "            id    NUMBER, \n" +
                   "            b1    BLOB, \n" +
                   "            b2    BLOB, \n" +
                   "            b3    BLOB, \n" +
                   "            b4    BLOB, \n" +
                   "            b5    BLOB \n" +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function createTabCLOB(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE('DROP TABLE nodb_multi_clob PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_multi_clob ( \n" +
                   "            id    NUMBER, \n" +
                   "            c1    CLOB, \n" +
                   "            c2    CLOB, \n" +
                   "            c3    CLOB, \n" +
                   "            c4    CLOB, \n" +
                   "            c5    CLOB \n" +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);

  }); // before

  after(function(done) {
    async.series([
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_multi_clob PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_multi_blob PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.release(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // after

  var lobInsert = function(sql, bindv, inFileName, cb) {

    connection.execute(
      sql,
      bindv,
      { autoCommit: false },
      function(err, result) {
        should.not.exist(err);

        var lobArr = new Array();

        // put lobbv1..5 to lobArr
        for(var item in result.outBinds) {
          lobArr.push(result.outBinds[item][0]);
        }

        async.eachSeries(
          lobArr,
          function(lob, callback) {
            var inStream = fs.createReadStream(inFileName);

            inStream.pipe(lob);

            // one task completes
            lob.on('finish', function() {
              return callback();
            });

            lob.on('error', function(err) {
              return callback(err);
            });

            inStream.on('error', function(err) {
              return callback(err);
            });
          },
          function(err) {
            should.not.exist(err);

            connection.commit(function(err) {
              should.not.exist(err);
              return cb();
            });
          }
        ); // async.eachSeries

      }
    );

  };

  it('68.1 inserts multiple BLOBs', function(done) {

    var sql = "insert into nodb_multi_blob values(1, " +
              " EMPTY_BLOB(), EMPTY_BLOB(), EMPTY_BLOB(), EMPTY_BLOB(), EMPTY_BLOB() ) " +
              "  returning b1, b2, b3, b4, b5 into :lobbv1, :lobbv2, :lobbv3, :lobbv4, :lobbv5";

    var bindvars = {
      lobbv1: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv2: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv3: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv4: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv5: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
    };

    var inFileName = './test/fuzzydinosaur.jpg';

    lobInsert(sql, bindvars, inFileName, done);

  }); // 68.1

  it('68.2 inserts multiple CLOBs', function(done) {

    var sql = "insert into nodb_multi_clob values(1, " +
              " EMPTY_CLOB(), EMPTY_CLOB(), EMPTY_CLOB(), EMPTY_CLOB(), EMPTY_CLOB() ) " +
              "  returning c1, c2, c3, c4, c5 into :lobbv1, :lobbv2, :lobbv3, :lobbv4, :lobbv5";

    var bindvars = {
      lobbv1: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv2: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv3: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv4: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv5: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };

    var inFileName = './test/clobexample.txt';

    lobInsert(sql, bindvars, inFileName, done);

  });

});
