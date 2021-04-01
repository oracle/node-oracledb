/* Copyright (c) 2015, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   7. autoCommit.js
 *
 * DESCRIPTION
 *   Testing general autoCommit feature.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('7. autoCommit.js', function() {

  var pool = null;
  var connection  = null;

  before('create pool, get one connection, create table', function(done) {
    var script =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_commit_dept purge'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_commit_dept ( \
                    department_id NUMBER,  \
                    department_name VARCHAR2(20) \
                ) \
            '); \
        END; ";

    async.series([
      function(callback) {
        oracledb.createPool(
          {
            user          : dbConfig.user,
            password      : dbConfig.password,
            connectString : dbConfig.connectString,
            poolMin       : 3,
            poolMax       : 7,
            poolIncrement : 1
          },
          function(err, connectionPool) {
            should.not.exist(err);
            pool = connectionPool;
            callback();
          }
        );
      },
      function(callback) {
        pool.getConnection(function(err, conn) {
          should.not.exist(err);
          connection = conn;
          callback();
        });
      },
      function(callback) {
        connection.execute(
          script,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  });

  after('drop table, release connection, terminate pool', function(done) {
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE nodb_commit_dept purge",
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
      function(callback) {
        pool.terminate(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  });

  afterEach('truncate table, reset the oracledb properties', function(done) {
    oracledb.autoCommit = false;  /* Restore to default value */

    connection.execute(
      "TRUNCATE TABLE nodb_commit_dept",
      function(err) {
        should.not.exist(err);
        done();
      }
    );
  });

  it('7.1 autoCommit takes effect when setting oracledb.autoCommit before connecting', function(done) {
    var conn1 = null;
    var conn2 = null;

    oracledb.autoCommit = true;

    async.series([
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "INSERT INTO nodb_commit_dept VALUES (82, 'Security')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {           // get another connection
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(82).and.be.a.Number();
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "UPDATE nodb_commit_dept SET department_id = 101 WHERE department_name = 'Security'",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(101).and.be.a.Number();
            callback();
          }
        );
      },
      function(callback) {
        conn1.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function(callback) {
        conn2.release(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  });

  it('7.2 autoCommit takes effect when setting oracledb.autoCommit after connecting', function(done) {
    var conn1 = null;
    var conn2 = null;

    async.series([
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          }
        );
      },
      function(callback) {
        oracledb.autoCommit = true;   // change autoCommit after connection
        conn1.execute(
          "INSERT INTO nodb_commit_dept VALUES (82, 'Security')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(82).and.be.a.Number();
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "UPDATE nodb_commit_dept SET department_id = 101 WHERE department_name = 'Security'",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(101).and.be.a.Number();
            callback();
          }
        );
      },
      function(callback) {
        conn1.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function(callback) {
        conn2.release(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  });

  it('7.3 autoCommit setting does not affect previous SQL result', function(done) {
    var conn1 = null;
    var conn2 = null;

    async.series([
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "INSERT INTO nodb_commit_dept VALUES (82, 'Security')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          }
        );
      },
      function(callback) {
        oracledb.autoCommit = true;   // change autoCommit after connection
        conn2.execute(
          "SELECT department_id FROM nodb_commit_dept WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows).should.eql([]);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "INSERT INTO nodb_commit_dept VALUES (99, 'Marketing')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT COUNT(*) as amount FROM nodb_commit_dept",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].AMOUNT.should.eql(1);
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "SELECT COUNT(*) as amount FROM nodb_commit_dept",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].AMOUNT.should.eql(2);   // autoCommit for SELECT
            callback();
          }
        );
      },
      function(callback) {
        conn1.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function(callback) {
        conn2.release(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  });

  describe('7.4 global option - oracledb.autoCommit', function() {
    var defaultValue;
    beforeEach(function() {
      defaultValue = oracledb.autoCommit;
    });
    afterEach(function() {
      oracledb.autoCommit = defaultValue;
    });

    it('7.4.1 Negative - 0', function(done) {
      setAsGlobalOption(0, done);
    });

    it('7.4.2 Negative - negative number', function(done) {
      setAsGlobalOption(-1, done);
    });

    it('7.4.3 Negative - positive number', function(done) {
      setAsGlobalOption(-1, done);
    });

    it('7.4.4 Negative - NaN', function(done) {
      setAsGlobalOption(NaN, done);
    });

    it('7.4.5 Negative - undefined', function(done) {
      setAsGlobalOption(undefined, done);
    });

    var setAsGlobalOption = function(setValue, callback) {
      should.throws(
        function() {
          oracledb.autoCommit = setValue;
        },
        /NJS-004: invalid value for property autoCommit/
      );
      callback();
    };
  });

  describe('7.5 set autoCommit as an execute() option', function() {

    it('7.5.1 Negative - 0', function(done) {
      setAsExecOption(0, done);
    });

    it('7.5.2 Negative - negative number', function(done) {
      setAsExecOption(-1, done);
    });

    it('7.5.3 Negative - positive number', function(done) {
      setAsExecOption(-1, done);
    });

    it('7.5.4 Negative - NaN', function(done) {
      setAsExecOption(NaN, done);
    });

    it("7.5.5 works as 'false' when setting to 'undefined'", function(done) {
      connection.execute(
        "select user from dual",
        [],
        { autoCommit: undefined },
        function(err, result) {
          should.not.exist(err);
          should.exist(result);
          done();
        }
      );
    });

    var setAsExecOption = function(setValue, callback) {
      connection.execute(
        "select user from dual",
        {},
        { autoCommit: setValue },
        function(err, result) {
          should.not.exist(result);
          should.exist(err);
          should.strictEqual(err.message, "NJS-007: invalid value for \"autoCommit\" in parameter 3");
          callback();
        });
    };
  });

});
