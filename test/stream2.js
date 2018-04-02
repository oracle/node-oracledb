/* Copyright (c) 2016, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   14. stream2.js
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

describe('14. stream2.js', function() {

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
                   "        e_table_exists EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_exists, -00942);\n " +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE ('DROP TABLE nodb_stream2 PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_exists \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_stream2 ( \n" +
                   "            employee_id NUMBER, \n" +
                   "            employee_name VARCHAR2(20), \n" +
                   "            employee_history CLOB \n" +
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
                   "        INSERT INTO nodb_stream2 VALUES (x, n, EMPTY_CLOB()) RETURNING employee_history INTO clobData; \n" +
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
          "DROP TABLE nodb_stream2 PURGE",
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

  it('14.1 Bind by position and return an array', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :1';
    var stream = connection.queryStream(sql, [40]);

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data.should.eql(['staff 40']);
    });

    stream.on('end', done);
  });

  it('14.2 Bind by name and return an array', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    var stream = connection.queryStream(sql, {id: 40});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data.should.eql(['staff 40']);
    });

    stream.on('end', done);
  });

  it('14.3 Bind by position and return an object', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :1';
    var stream = connection.queryStream(sql, [40], {outFormat: oracledb.OBJECT});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      (data.EMPLOYEE_NAME).should.eql('staff 40');
    });

    stream.on('end', done);
  });

  it('14.4 Bind by name and return an object', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    var stream = connection.queryStream(sql, {id: 40}, {outFormat: oracledb.OBJECT});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      (data.EMPLOYEE_NAME).should.eql('staff 40');
    });

    stream.on('end', done);
  });

  it('14.5 explicitly setting resultSet option to be false takes no effect', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :1';
    var stream = connection.queryStream(sql, [40], {resultSet: false});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data.should.eql(['staff 40']);
    });

    stream.on('end', done);
  });

  it('14.6 maxRows option is ignored as expect', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 ORDER BY employee_name';
    var stream = connection.queryStream(sql, [], {maxRows: 40});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    var rowCount = 0;
    stream.on('data', function(data) {
      should.exist(data);
      rowCount++;
    });

    stream.on('end', function() {
      rowCount.should.eql(rowsAmount);
      done();
    });

  });

  it('14.7 Negative - queryStream() has no parameters', function(done) {
    should.throws(
      function() {
        connection.queryStream();
      },
      /NJS-009: invalid number of parameters/
    );
    done();
  });

  it('14.8 Negative - give invalid SQL as first parameter', function(done) {
    var stream = connection.queryStream('foobar');

    stream.on('error', function(err) {
      should.exist(err);
      should.strictEqual(
        err.message,
        "NJS-019: ResultSet cannot be returned for non-query statements"
      );
      done();
    });

    stream.on('data', function(data) {
      should.not.exist(data);
    });
  });

  it('14.9 Negatvie - give non-query SQL', function(done) {
    var sql = "INSERT INTO nodb_stream2 VALUES (300, 'staff 300', EMPTY_CLOB())";
    var stream = connection.queryStream(sql);

    stream.on('error', function(err) {
      should.exist(err);
      should.strictEqual(
        err.message,
        "NJS-019: ResultSet cannot be returned for non-query statements"
      );
      done();
    });

    stream.on('data', function(data) {
      should.not.exist(data);
    });
  });

  it('14.10 metadata event - single column', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    var stream = connection.queryStream(sql, { id: 40 });

    var metaDataRead = false;
    stream.on('metadata', function(metaData) {
      should.deepEqual(
        metaData,
        [ { name: 'EMPLOYEE_NAME' } ]
      );
      metaDataRead = true;
    });

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      should.equal(metaDataRead, true);
    });

    stream.on('end', done);
  });

  it('14.11 metadata event - multiple columns', function(done) {
    var sql = 'SELECT employee_name, employee_history FROM nodb_stream2 WHERE employee_id = :id';
    var stream = connection.queryStream(sql, { id: 40 });

    var metaDataRead = false;
    stream.on('metadata', function(metaData) {
      should.deepEqual(
        metaData,
        [ { name: 'EMPLOYEE_NAME' },
          { name: 'EMPLOYEE_HISTORY' } ]
      );
      metaDataRead = true;
    });

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data[1].close();
      should.equal(metaDataRead, true);
    });

    stream.on('end', done);
  });

  it('14.12 metadata event - all column names occurring', function(done) {
    var sql = 'SELECT * FROM nodb_stream2 WHERE employee_id = :id';
    var stream = connection.queryStream(sql, { id: 40 });

    var metaDataRead = false;
    stream.on('metadata', function(metaData) {
      should.deepEqual(
        metaData,
        [ { name: 'EMPLOYEE_ID' },
          { name: 'EMPLOYEE_NAME' },
          { name: 'EMPLOYEE_HISTORY' } ]
      );
      metaDataRead = true;
    });

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data[2].close();
      should.equal(metaDataRead, true);
    });

    stream.on('end', done);
  });

  it('14.13 metadata event - no return rows', function(done) {
    var sql = 'SELECT employee_name FROM nodb_stream2 WHERE employee_id = :id';
    var stream = connection.queryStream(sql, { id: 400 });

    var metaDataRead = false;
    stream.on('metadata', function(metaData) {
      should.deepEqual(
        metaData,
        [ { name: 'EMPLOYEE_NAME' } ]
      );
      metaDataRead = true;
    });

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      should.equal(metaDataRead, true);
    });

    stream.on('end', done);
  });

  it('14.14 metadata event - negative: non-query SQL', function(done) {
    var sql = "INSERT INTO nodb_stream2 VALUES (300, 'staff 300', EMPTY_CLOB())";
    var stream = connection.queryStream(sql);

    var metaDataRead = false;
    stream.on('metadata', function() {
      metaDataRead = true;
    });

    stream.on('error', function(err) {
      should.exist(err);
      should.strictEqual(
        err.message,
        "NJS-019: ResultSet cannot be returned for non-query statements"
      );
      should.strictEqual(metaDataRead, false);
      done();
    });

    stream.on('data', function(data) {
      should.not.exist(data);
    });
  });

  it('14.15 metadata event - case sensitive columns', function(done) {
    async.series([
      function(cb) {
        var proc = "BEGIN \n" +
                   "    DECLARE \n" +
                   "        e_table_missing EXCEPTION; \n" +
                   "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                   "    BEGIN \n" +
                   "        EXECUTE IMMEDIATE ('DROP TABLE nodb_streamcases PURGE'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_missing \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_streamcases ( \n" +
                   "            id NUMBER,  \n" +
                   '           "nAmE" VARCHAR2(20) \n' +
                   "        ) \n" +
                   "    '); \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        INSERT INTO nodb_streamcases VALUES (23, ''Changjie'') \n" +
                   "    '); \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        INSERT INTO nodb_streamcases VALUES (24, ''Nancy'') \n" +
                   "    '); \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        INSERT INTO nodb_streamcases VALUES (25, ''Chris'') \n" +
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
      function(cb) {
        var sql = 'SELECT "nAmE" FROM nodb_streamcases ORDER BY id';
        var stream = connection.queryStream(sql);
        var resultArray = new Array();

        var metaDataRead = false;
        stream.on('metadata', function(metaData) {
          should.deepEqual(
            metaData,
            [ { name: 'nAmE' } ]
          );
          metaDataRead = true;
        });

        stream.on('error', function(error) {
          should.not.exist(error);
        });

        stream.on('data', function(data) {
          should.exist(data);
          resultArray.push(data);
          should.equal(metaDataRead, true);
        });

        stream.on('end', function() {
          should.deepEqual(
            resultArray,
            [ [ 'Changjie' ], [ 'Nancy' ], [ 'Chris' ] ]
          );
          cb();
        });

      },
      function(cb) {
        connection.execute(
          "DROP TABLE nodb_streamcases PURGE",
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }); // 14.15

  it('14.16 metadata event - large number of columns', function(done) {

    var column_size = 10;
    var columns_string = genColumns(column_size);

    function genColumns(size) {
      var buffer = [];
      for(var i = 0; i < size; i++) {
        buffer[i] = " column_" + i + " NUMBER";
      }
      return buffer.join();
    }

    var table_name = "nodb_streamstess";
    var sqlSelect = "SELECT * FROM " + table_name;
    var sqlDrop = "DROP TABLE " + table_name + " PURGE";

    var proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE ('DROP TABLE nodb_streamstess PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_streamstess ( \n" +
               columns_string +
               "        ) \n" +
               "    '); \n" +
               "END; ";

    async.series([
      function(cb) {
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        var stream = connection.queryStream(sqlSelect);

        var metaDataRead = false;
        stream.on('metadata', function(metaData) {
          for (var i = 0; i < column_size; i++) {
            metaData[i].name.should.eql('COLUMN_' + i);
          }
          metaDataRead = true;
        });

        stream.on('error', function(error) {
          should.not.exist(error);
        });

        stream.on('data', function(data) {
          should.exist(data);
          should.equal(metaDataRead, true);
        });

        stream.on('end', cb);

      },
      function(cb) {
        connection.execute(
          sqlDrop,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }); // 14.16

  it('14.17 metadata event - single character column', function(done) {

    var tableName = "nodb_streamsinglechar";
    var sqlCreate =
        "BEGIN \n" +
        "   DECLARE \n" +
        "       e_table_missing EXCEPTION; \n" +
        "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
        "   BEGIN \n" +
        "       EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); \n" +
        "   EXCEPTION \n" +
        "       WHEN e_table_missing \n" +
        "       THEN NULL; \n" +
        "   END; \n" +
        "   EXECUTE IMMEDIATE (' \n" +
        "       CREATE TABLE " + tableName +" ( \n" +
        "           a VARCHAR2(20),  \n" +
        '           b VARCHAR2(20) \n' +
        "       ) \n" +
        "   '); \n" +
        "END; \n";
    var sqlSelect = "SELECT * FROM " + tableName;
    var sqlDrop = "DROP TABLE " + tableName + " PURGE";

    async.series([
      function(cb) {
        connection.execute(
          sqlCreate,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        var stream = connection.queryStream(sqlSelect);

        var metaDataRead = false;
        stream.on('metadata', function(metaData) {
          should.deepEqual(
            metaData,
            [ { name: 'A' }, { name: 'B' } ]
          );
          metaDataRead = true;
        });

        stream.on('error', function(error) {
          should.not.exist(error);
        });

        stream.on('data', function() {
          should.equal(metaDataRead, true);
        });

        stream.on('end', cb);
      },
      function(cb) {
        connection.execute(
          sqlDrop,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }); // 14.17

  it('14.18 metadata event - duplicate column alias', function(done) {

    var stream = connection.queryStream("SELECT 1 a, 'abc' a FROM dual");

    var metaDataRead = false;
    stream.on('metadata', function(metaData) {
      should.deepEqual(
        metaData,
        [ { name: 'A' }, { name: 'A' } ]
      );
      metaDataRead = true;
    });

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data.should.eql([1, 'abc']);
      should.equal(metaDataRead, true);
    });

    stream.on('end', done);
  });
});
