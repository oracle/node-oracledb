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
 *   135. clobDMLReturningMultipleRowsAsStream.js
 *
 * DESCRIPTION
 *   Testing CLOB DML returning multiple rows as stream.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var sql      = require('./sql.js');

describe('135. clobDMLReturningMultipleRowsAsStream.js', function() {

  var connection = null;
  var tableName = "nodb_dml_clob_135";

  var clob_table_create = "BEGIN \n" +
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
                          "            clob     CLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "    FOR i IN 1..10 LOOP \n" +
                          "        EXECUTE IMMEDIATE ( \n" +
                          "            'insert into " + tableName + " values (' || \n" +
                          "            to_char(i) || ', ' || to_char(i) || ')'); \n" +
                          "    END LOOP; \n" +
                          "    commit; \n" +
                          "END; ";
  var clob_table_drop = "DROP TABLE " + tableName + " PURGE";

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

  describe('135.1 CLOB DML returning multiple rows as stream', function() {
    before(function(done) {
      sql.executeSql(connection, clob_table_create, {}, {}, done);
    });
    after(function(done) {
      sql.executeSql(connection, clob_table_drop, {}, {}, done);
    });

    it('135.1.1 CLOB DML returning multiple rows as stream', function(done) {
      updateReturning_stream(done);
    });

  });

  var updateReturning_stream = function(callback) {
    var sql_update = "UPDATE " + tableName + " set num = num+10 RETURNING num, clob into :num, :lobou";
    connection.execute(
      sql_update,
      {
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
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
    lob.setEncoding('utf8');
    var clobData = '';

    lob.on('data', function(chunk) {
      clobData += chunk;
    });

    lob.on('error', function(err) {
      should.not.exist(err);
    });

    lob.on('end', function(err) {
      should.not.exist(err);
      should.strictEqual(clobData, (id - 10).toString());
    });
    lob.on('close', function(err) {
      should.not.exist(err);
      cb(err, result);
    });
  };

});
