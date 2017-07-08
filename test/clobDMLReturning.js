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
 *   135. clobDMLReturning.js
 *
 * DESCRIPTION
 *   Testing CLOB dml returning multiple rows.
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
var dbConfig = require('./dbconfig.js');
var sql      = require('./sql.js');

describe('135. clobDMLReturning.js', function() {

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
                          "            id      NUMBER, \n" +
                          "            clob    CLOB \n" +
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

  describe('135.1 CLOB, UPDATE', function() {
    before(function(done) {      
      sql.executeSql(connection, clob_table_create, {}, {}, done);
    });
    after(function(done) {
      sql.executeSql(connection, clob_table_drop, {}, {}, done);
    });

    it.skip('135.1.1 works with stream', function(done) {
      updateReturning_stream(done);      
    }); // 135.1.1

    it('135.1.2 fetch as string', function(done) {
      updateReturning_string(done);      
    }); // 135.1.1

  }); // 135.1

  var updateReturning_stream = function(callback) {
    var sql_update = "UPDATE " + tableName + " set id = id+10 RETURNING id, clob into :num, :lobou";
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
        for (var index = 0; index < result.outBinds.lobou.length; index++) {
          var lob = result.outBinds.lobou[index];
          var id = result.outBinds.num[index];
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
            should.strictEqual(clobData, (id-10));
          });   
          lob.on('close', function(err) {
            should.not.exist(err);
          });       
        }
        callback();
      }
    );    
  };

  var updateReturning_string = function(callback) {
    var sql_update = "UPDATE " + tableName + " set id = id+10 RETURNING id, clob into :num, :lobou";
    connection.execute(
      sql_update,
      { 
        num: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        lobou: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      },
      function(err, result) {
        should.not.exist(err);
        var numLobs = result.outBinds.lobou.length;
        should.strictEqual(numLobs, 10);
        for (var index = 0; index < result.outBinds.lobou.length; index++) {
          var lob = result.outBinds.lobou[index];
          var id = result.outBinds.num[index];
          should.strictEqual(lob, String(id-10));
          if(id === 20) {
            callback();
          }
        }
      }
    );    
  }; 

});
