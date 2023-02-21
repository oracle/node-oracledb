/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   15. resultsetToStream.js
 *
 * DESCRIPTION
 *   Testing driver query results via stream feature.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('15. resultsetToStream.js', function() {

  var connection = null;
  var rowsAmount = 217;
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
      function createTab(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE ('DROP TABLE nodb_rs2stream PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_rs2stream ( \n" +
                   "            employees_id NUMBER, \n" +
                   "            employees_name VARCHAR2(20), \n" +
                   "            employees_history CLOB \n" +
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
      function insertRows(cb) {
        var proc = "DECLARE \n" +
                   "    x NUMBER := 0; \n" +
                   "    n VARCHAR2(20); \n" +
                   "    clobData CLOB; \n" +
                   "BEGIN \n" +
                   "    FOR i IN 1..217 LOOP \n" +
                   "        x := x + 1; \n" +
                   "        n := 'staff ' || x; \n" +
                   "        INSERT INTO nodb_rs2stream VALUES (x, n, EMPTY_CLOB()) RETURNING employees_history INTO clobData; \n" +
                   "        DBMS_LOB.WRITE(clobData, 20, 1, '12345678901234567890'); \n" +
                   "    END LOOP; \n" +
                   "end; ";

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
      function(callback) {
        connection.execute(
          "DROP TABLE nodb_rs2stream PURGE",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
    ], done);
  }); // after

  describe('15.1 Testing ResultSet.toQueryStream', function() {
    it('15.1.1 should allow resultsets to be converted to streams', function(done) {
      connection.execute(
        'begin \n' +
        '  open :cursor for select employees_name from nodb_rs2stream; \n' +
        'end;',
        {
          cursor:  { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);

          var stream = result.outBinds.cursor.toQueryStream();

          stream.on('error', function(error) {
            console.log(error);
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function(data) {
            should.exist(data);
            counter++;
          });

          stream.on('end', function() {
            should.equal(counter, rowsAmount);
            stream.destroy();
          });

          stream.on('close', function() {
            done();
          });
        }
      );
    });
  });

  describe('15.2 Testing ResultSet/QueryStream conversion errors', function() {
    it('15.2.1 should prevent conversion to stream after getRow is invoked', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      await cursor.getRow();
      try {
        const stream = cursor.toQueryStream();
        should.not.exist(stream);
      } catch (err) {
        (err.message).should.startWith('NJS-041:');
        // NJS-041: cannot convert to stream after invoking methods
      }
      await cursor.close();
    });

    it('15.2.2 should prevent conversion to stream after getRows is invoked', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      await cursor.getRows(5);
      try {
        const stream = cursor.toQueryStream();
        should.not.exist(stream);
      } catch (err) {
        (err.message).should.startWith('NJS-041:');
      }
      await cursor.close();
    });

    it('15.2.3 should prevent conversion to stream after close is invoked', async function() {
      const sql = `
        begin
          open :cursor for select employees_name from nodb_rs2stream;
        end;`;
      const binds = {
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await connection.execute(sql, binds);
      const cursor = result.outBinds.cursor;
      await cursor.close();
      try {
        const stream = cursor.toQueryStream();
        should.not.exist(stream);
      } catch (err) {
        (err.message).should.startWith('NJS-041:');
      }
    });

    it('15.2.4 should prevent invoking getRow after conversion to stream', function(done) {
      connection.execute(
        'begin \n' +
        '  open :cursor for select employees_name from nodb_rs2stream; \n' +
        'end;',
        {
          cursor:  { type: oracledb.CURSOR, dir : oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);

          var cursor = result.outBinds.cursor;
          var stream = cursor.toQueryStream();

          stream.on('close', done);
          stream.on('error', function(err) {
            should.not.exist(err);
          });

          cursor.getRow(function(err) {
            (err.message).should.startWith('NJS-042:');
            // NJS-042: cannot invoke methods after converting to stream
            stream.destroy();
          });
        }
      );
    });

    it('15.2.5 should prevent invoking getRows after conversion to stream', function(done) {
      connection.execute(
        'begin \n' +
        '  open :cursor for select employees_name from nodb_rs2stream; \n' +
        'end;',
        {
          cursor:  { type: oracledb.CURSOR, dir : oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);

          var cursor = result.outBinds.cursor;
          var stream = cursor.toQueryStream();

          stream.on('close', done);
          stream.on('error', function(err) {
            should.not.exist(err);
          });

          cursor.getRows(5, function(err) {
            (err.message).should.startWith('NJS-042:');
            stream.destroy();
          });
        }
      );
    });

    it('15.2.6 should prevent invoking close after conversion to stream', function(done) {
      connection.execute(
        'begin \n' +
        '  open :cursor for select employees_name from nodb_rs2stream; \n' +
        'end;',
        {
          cursor:  { type: oracledb.CURSOR, dir : oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);

          var cursor = result.outBinds.cursor;
          var stream = cursor.toQueryStream();

          stream.on('close', done);
          stream.on('error', function(err) {
            should.not.exist(err);
          });

          cursor.close(function(err) {
            (err.message).should.startWith('NJS-042:');
            stream.destroy();
          });
        }
      );
    });

    it('15.2.7 should prevent calling toQueryStream more than once', function(done) {
      connection.execute(
        'begin \n' +
        '  open :cursor for select employees_name from nodb_rs2stream; \n' +
        'end;',
        {
          cursor:  { type: oracledb.CURSOR, dir : oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);

          var cursor = result.outBinds.cursor;

          // First conversion to stream
          var stream = cursor.toQueryStream();

          stream.on('close', done);
          stream.on('error', function(err) {
            should.not.exist(err);
          });

          try {
            // Second conversion to stream
            stream = cursor.toQueryStream();
          } catch (err) {
            (err.message).should.startWith('NJS-043:');
            stream.destroy();
          }
        }
      );
    }); // 15.2.7

  }); // 15.2
});
