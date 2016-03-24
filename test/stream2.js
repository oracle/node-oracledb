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
 *   14. stream2.js
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

describe('14. stream2.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  var connection = null;
  var rowsAmount = 217;
  beforeEach(function(done) {
    async.series([
      function getConn(cb) {
        oracledb.getConnection(credential, function(err, conn) {
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
                   "        EXECUTE IMMEDIATE ('DROP TABLE nodb_employees'); \n" +
                   "    EXCEPTION \n" +
                   "        WHEN e_table_exists \n" +
                   "        THEN NULL; \n" +
                   "    END; \n" +
                   "    EXECUTE IMMEDIATE (' \n" +
                   "        CREATE TABLE nodb_employees ( \n" +
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
                   "        INSERT INTO nodb_employees VALUES (x, n, EMPTY_CLOB()) RETURNING employees_history INTO clobData; \n" +
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

  afterEach(function(done) {
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE nodb_employees",
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

  it('14.1 Bind by position and return an array', function(done) {
    var sql = 'SELECT employees_name FROM nodb_employees WHERE employees_id = :1';
    var stream = connection.queryStream(sql, [40]);

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data.should.eql(['staff 40']);
    });

    stream.on('end', function() {
      setTimeout(done, 500);
    });
  }) // 14.1

  it('14.2 Bind by name and return an array', function(done) {
    var sql = 'SELECT employees_name FROM nodb_employees WHERE employees_id = :id';
    var stream = connection.queryStream(sql, {id: 40});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data.should.eql(['staff 40']);
    });

    stream.on('end', function() {
      setTimeout(done, 500);
    });
  }) // 14.2

  it('14.3 Bind by position and return an object', function(done) {
    var sql = 'SELECT employees_name FROM nodb_employees WHERE employees_id = :1';
    var stream = connection.queryStream(sql, [40], {outFormat: oracledb.OBJECT});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      (data.EMPLOYEES_NAME).should.eql('staff 40');
    });

    stream.on('end', function() {
      setTimeout(done, 500);
    });
  }) // 14.3

  it('14.4 Bind by name and return an object', function(done) {
    var sql = 'SELECT employees_name FROM nodb_employees WHERE employees_id = :id';
    var stream = connection.queryStream(sql, {id: 40}, {outFormat: oracledb.OBJECT});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      (data.EMPLOYEES_NAME).should.eql('staff 40');
    });

    stream.on('end', function() {
      setTimeout(done, 500);
    });
  }) // 14.4

  it('14.5 explicitly set resultSet option to be false', function(done) {
    var sql = 'SELECT employees_name FROM nodb_employees WHERE employees_id = :1';
    var stream = connection.queryStream(sql, [40], {resultSet: false});

    stream.on('error', function(error) {
      should.not.exist(error);
    });

    stream.on('data', function(data) {
      should.exist(data);
      data.should.eql(['staff 40']);
    });

    stream.on('end', function() {
      setTimeout(done, 500);
    });
  }) // 14.5

  it('14.6 maxRows option is ignored as expect', function(done) {
    var sql = 'SELECT employees_name FROM nodb_employees';
    var stream = connection.queryStream(sql, [], {maxRows: 50});

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
      setTimeout(done, 500);
    });

  }) // 14.6

  it('14.7 Negative - queryStream() has no parameters', function(done) {

    var stream = connection.queryStream();

    stream.on('error', function(error) {
      should.exist(error);
      // console.log(error);
      // NJS-006: invalid type for parameter 1
      setTimeout(done, 500);
    });

    stream.on('data', function(data) {
      should.not.exist(data);
    });

  })

  it('14.8 Negative - give invalid SQL as first parameter', function(done) {
    var stream = connection.queryStream('foobar');

    stream.on('error', function(error) {
      should.exist(error);
      //  NJS-019: resultSet cannot be returned for non-query statements
      setTimeout(done, 500);
    });

    stream.on('data', function(data) {
      should.not.exist(data);
    });
  })

  it('14.9 Negatvie - give non-query SQL', function(done) {
    var sql = "INSERT INTO nodb_employees VALUES (300, 'staff 300', EMPTY_CLOB())";
    var stream = connection.queryStream(sql);

    stream.on('error', function(error) {
      should.exist(error);
      //  NJS-019: resultSet cannot be returned for non-query statements
      setTimeout(done, 500);
    });

    stream.on('data', function(data) {
      should.not.exist(data);
    });
  })

})
