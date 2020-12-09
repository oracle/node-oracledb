/* Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   245. fetchLobAsStrBuf.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String with DML and Blob binding as Buffer with DML
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var random   = require('./random.js');
var assist   = require('./dataTypeAssist.js');

describe('245. fetchLobAsStrBuf.js', function() {
  var connection = null;
  var insertID = 1;
  var tableName = "fetchLobAsStrBuf_table";
  var fun_create_table = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE ( ' \n" +
                          "        CREATE TABLE " + tableName + " ( \n" +
                          "            id      NUMBER, \n" +
                          "            clob_col  clob, \n" +
                          "            blob_col  blob \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END;  ";
  var drop_table = "DROP TABLE " + tableName + " PURGE";

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

  var executeSQL = function(sql, callback) {
    connection.execute(
      sql,
      function(err) {
        should.not.exist(err);
        return callback();
      }
    );
  };

  var insertIntoTable = function(id ,contentClob,contentBlob,callback) {
    if (contentClob == "EMPTY_CLOB" && contentBlob == "EMPTY_BLOB") {
      connection.execute( "insert INTO fetchLobAsStrBuf_table values(:id, EMPTY_CLOB(), EMPTY_BLOB())",
        [ id ],
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        });
    }
    else {
      var sql = "insert into fetchLobAsStrBuf_table (id, clob_col, blob_col) values(:id, :str, :buf)";
      var bindings = {
        id : { val : id },
        str : {val:contentClob, type:oracledb.STRING, dir:oracledb.BIND_IN},
        buf : {val:contentBlob, type:oracledb.BUFFER,  dir:oracledb.BIND_IN}
      };
      connection.execute(sql , bindings ,
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rowsAffected, 1);
          callback();
        });
    }
  };

  var checkInsertResult = function(id, contentClob,specialStr,contentBlob,callback) {
    async.series([
      function(cb) {
        var sql = "select clob_col from fetchLobAsStrBuf_table where id = " +id;
        verifyClobValueWithString(sql, contentClob, specialStr, cb);
      },
      function(cb) {
        var sql = "select blob_col from fetchLobAsStrBuf_table where id = " +id;
        verifyBlobValueWithBuffer(sql ,contentBlob ,specialStr,cb);
      }
    ], callback);
  };

  var verifyClobValueWithString = function(selectSql, originalString, specialStr, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        if(originalString == '' || originalString == undefined || originalString == null) {
          should.not.exist(lob);
          return callback();
        } else {
          should.exist(lob);
          // set the encoding so we get a 'string' not a 'buffer'
          lob.setEncoding('utf8');
          var clobData = '';

          lob.on('data', function(chunk) {
            clobData += chunk;
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function(err) {
            should.not.exist(err);
            if (originalString == "EMPTY_CLOB") {
              should.strictEqual(clobData, "");
            } else {
              var resultLength = clobData.length;
              var specStrLength = specialStr.length;
              should.strictEqual(resultLength, originalString.length);
              should.strictEqual(clobData.substring(0, specStrLength), specialStr);
              should.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
            }
            return callback();
          });
        }
      }
    );
  };

  var verifyBlobValueWithBuffer = function(selectSql, originalBuffer, specialStr, callback) {
    connection.execute(
      selectSql,
      function(err, result) {
        should.not.exist(err);
        var lob = result.rows[0][0];
        if(originalBuffer == '' || originalBuffer == undefined) {
          should.not.exist(lob);
          return callback();
        } else {
          should.exist(lob);
          var blobData = Buffer.alloc(0);
          var totalLength = 0;

          lob.on('data', function(chunk) {
            totalLength = totalLength + chunk.length;
            blobData = Buffer.concat([blobData, chunk], totalLength);
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function() {
            if(originalBuffer == "EMPTY_BLOB") {
              var nullBuffer = Buffer.from('', "utf-8");
              should.strictEqual(assist.compare2Buffers(blobData, nullBuffer), true);
            } else {
              should.strictEqual(totalLength, originalBuffer.length);
              var specStrLength = specialStr.length;
              should.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
              should.strictEqual(blobData.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
              should.strictEqual(assist.compare2Buffers(blobData, originalBuffer), true);
            }
            return callback();
          });
        }
      }
    );
  };

  describe('245.1 CLOB,BLOB Insert', function() {

    before(function(done) {
      executeSQL(fun_create_table, done);
    });

    after(function(done) {
      executeSQL(drop_table, done);
    });

    it('245.1.1 Insert and fetch CLOB,BLOB with EMPTY_CLOB and EMPTY_BLOB', function(done) {
      var id = insertID++;
      var contentClob = "EMPTY_CLOB";
      var contentBlob = "EMPTY_BLOB";
      async.series([
        function(cb) {
          insertIntoTable(id, contentClob ,contentBlob, cb);
        },
        function(cb) {
          checkInsertResult(id, contentClob, null, contentBlob,cb);
        }
      ], done);
    });

    it('245.1.2 Insert and fetch CLOB,BLOB with String and Buffer of length 32K', function(done) {
      var id = insertID++;
      var contentLength = 32768;
      var specialStr = "245.1.2";
      var contentClob = random.getRandomString(contentLength, specialStr);
      var contentBlob = Buffer.from(contentClob, "utf-8");

      async.series([
        function(cb) {
          insertIntoTable(id, contentClob,contentBlob,cb);
        },
        function(cb) {
          checkInsertResult(id, contentClob, specialStr,contentBlob, cb);
        }
      ], done);

    });

    it('245.1.3 Insert and fetch CLOB,BLOB with String and Buffer of length (1MB + 1)', function(done) {
      var id = insertID++;
      var contentLength = 1048577;
      var specialStr = "245.1.2";
      var contentClob = random.getRandomString(contentLength, specialStr);
      var contentBlob = Buffer.from(contentClob, "utf-8");

      async.series([
        function(cb) {
          insertIntoTable(id, contentClob,contentBlob,cb);
        },
        function(cb) {
          checkInsertResult(id, contentClob, specialStr,contentBlob, cb);
        }
      ], done);

    });
  });

});