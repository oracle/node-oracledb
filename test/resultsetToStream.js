/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   15. resultsetToStream.js
 *
 * DESCRIPTION
 *   Testing driver query results via stream feature.
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

describe('15. resultsetToStream.js', function () {

  var connection = null;
  var rowsAmount = 217;
  before(function(done) {
    async.series([
      function getConn(cb) {
        oracledb.getConnection(dbConfig, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function createTab(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE ('DROP TABLE nodb_rs2stream'); \n" +
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
  }) // before

  after(function(done) {
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE nodb_rs2stream",
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
  }) // after

  describe('15.1 Testing ResultSet.toQueryStream', function () {
    it('15.1.1 should allow resultsets to be converted to streams', function (done) {
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

          stream.on('error', function (error) {
            console.log(error);
            should.fail(error, null, 'Error event should not be triggered');
          });

          var counter = 0;
          stream.on('data', function (data) {
            should.exist(data);
            counter++;
          });

          stream.on('end', function () {
            should.equal(counter, rowsAmount);

            setTimeout(done, 500);
          });
        }
      );
    });
  });

  describe('15.2 Testing ResultSet/QueryStream conversion errors', function () {
    it('15.2.1 should prevent conversion to stream after getRow is invoked', function (done) {
      connection.execute(
        'begin \n' +
        '  open :cursor for select employees_name from nodb_rs2stream; \n' +
        'end;',
        {
          cursor:  { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        },
        function(err, result) {
          should.not.exist(err);

          var cursor = result.outBinds.cursor;

          cursor.getRow(function(err, row) {
            should.not.exist(err);

            cursor.close(function(err) {
              should.not.exist(err);
              done();
            });
          });

          try {
            var stream = cursor.toQueryStream();
          } catch (err) {
            (err.message).should.startWith('NJS-041:');
            // NJS-041: cannot convert to stream after invoking methods
          }
        }
      );
    });

    it('15.2.2 should prevent conversion to stream after getRows is invoked', function (done) {
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

          cursor.getRows(5, function(err, rows) {
            should.not.exist(err);

            cursor.close(function(err) {
              should.not.exist(err);
              done();
            });
          });

          try {
            var stream = cursor.toQueryStream();
          } catch (err) {
            (err.message).should.startWith('NJS-041:');
          }
        }
      );
    });

    it('15.2.3 should prevent conversion to stream after close is invoked', function (done) {
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

          cursor.close(function(err) {
            should.not.exist(err);

            done();
          });

          try {
            var stream = cursor.toQueryStream();
          } catch (err) {
            (err.message).should.startWith('NJS-041:');
          }
        }
      );
    });

    it('15.2.4 should prevent invoking getRow after conversion to stream', function (done) {
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

          cursor.getRow(function(err, row) {
            (err.message).should.startWith('NJS-042:');
            // NJS-042: cannot invoke methods after converting to stream

            // Closing cursor via stream._close because the cursor.close method
            // is not invokable after conversion to stream.
            stream._close(function(err) {
              should.not.exist(err);
              done();
            });
          });
        }
      );
    });

    it('15.2.5 should prevent invoking getRows after conversion to stream', function (done) {
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

          cursor.getRows(5, function(err, rows) {
            (err.message).should.startWith('NJS-042:');

            // Closing cursor via stream._close because the cursor.close method
            // is not invokable after conversion to stream.
            stream._close(function(err) {
              should.not.exist(err);
              done();
            });
          });
        }
      );
    });

    it('15.2.6 should prevent invoking close after conversion to stream', function (done) {
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

          cursor.close(function(err) {
            (err.message).should.startWith('NJS-042:');

            // Closing cursor via stream._close because the cursor.close method
            // is not invokable after conversion to stream.
            stream._close(function(err) {
              should.not.exist(err);
              done();
            });
          });
        }
      );
    });

    it('15.2.7 should prevent calling toQueryStream more than once', function (done) {
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

          try {
            // Second conversion to stream
            stream = cursor.toQueryStream();
          } catch (err) {
            (err.message).should.startWith('NJS-043:');

            stream._close(function(err) {
              should.not.exist(err);
              done();
            });
          }
        }
      );
    }); // 15.2.7

  }); // 15.2
});
