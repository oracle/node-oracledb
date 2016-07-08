/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   67. utf8MultibyteCharacter.js
 *
 * DESCRIPTION
 *   Testing UTF-8 multibyte characters.
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

describe('67. utf8MultibyteCharacter.js', function() {

  var connection = null;
  var strLength  = 10;

  before('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  })

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  })

  it('67.1 works with UTF-8 multibyte characters', function(done) {
    async.series([
      function doCreate(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE('DROP TABLE nodb_testutf8'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_testutf8 ( \n" +
                   "            id NUMBER(9), \n" +
                   "            name VARCHAR2(30) \n" +
                   "        ) \n" +
                   "    '); \n" +
                   "END; ";

        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            return cb();
          }
        );
      },
      function doInsert(cb) {
        var sql = "INSERT INTO nodb_testutf8 \n" +
                  "    SELECT 1, rpad( unistr('\\20ac'), " + strLength +  ", unistr('\\20ac') ) FROM dual";

        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            return cb();
          }
        );
      },
      function doCommit(cb) {
        connection.commit(function(err) {
          should.not.exist(err);
          return cb();
        });
      },
      function doSelect(cb) {
        connection.execute(
          "SELECT name FROM nodb_testutf8",
          function(err, result) {
            should.not.exist(err);
            var byteLen = getByteLen(result.rows[0][0]);
            byteLen.should.be.exactly(strLength * 3);
            (result.rows[0][0]).should.eql('€€€€€€€€€€');

            return cb();
          }
        );
      },
      function doplsql(cb) {
        var proc = "BEGIN \n" +
             "    SELECT name INTO :o FROM nodb_testutf8; \n" +
             "END;";
        var bindVar = { o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 30 } };

        connection.execute(
          proc,
          bindVar,
          function(err, result) {
            should.not.exist(err);
            var byteLen = getByteLen(result.outBinds.o);
            byteLen.should.be.exactly(strLength * 3);
            (result.outBinds.o).should.eql('€€€€€€€€€€');

            return cb();
          }
        );
      },
      function doDrop(cb) {
        connection.execute(
          "DROP TABLE nodb_testutf8",
          function(err) {
            should.not.exist(err);
            return cb();
          }
        );
      }
    ], done);
  })

})

/*
* Count bytes of a utf-8 String
*/
var getByteLen = function(str) {
  // String type conversion
  str = String(str);

  var byteLen = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    byteLen += ch < (1 << 7)  ? 1 :
               ch < (1 << 11) ? 2 :
               ch < (1 << 16) ? 3 :
               ch < (1 << 21) ? 4 :
               ch < (1 << 26) ? 5 :
               ch < (1 << 31) ? 6 :
               Number.NaN;
  }

  return byteLen;
}
