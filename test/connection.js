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
 *   1. connection.js
 *
 * DESCRIPTION
 *   Testing a basic connection to the database.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('1. connection.js', function(){

  var credentials = {
    user:          dbConfig.user,
    password:      dbConfig.password,
    connectString: dbConfig.connectString
  };

  describe('1.1 can run SQL query with different output formats', function(){

    var connection = null;
    var script =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_conn_dept1 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_conn_dept1 ( \
                  department_id NUMBER,  \
                  department_name VARCHAR2(20) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_dept1  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_dept1  \
                   (department_id, department_name) VALUES \
                   (20, ''Marketing'') \
          '); \
      END; ";

    before(function(done){
      oracledb.getConnection(
        credentials,
        function(err, conn) {
          should.not.exist(err);
          connection = conn;
          connection.execute(script, function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    });

    after(function(done){
      connection.execute(
        'DROP TABLE nodb_conn_dept1 PURGE',
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err) {
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    });

    var query = "SELECT department_id, department_name " +
                "FROM nodb_conn_dept1 " +
                "WHERE department_id = :id";

    it('1.1.1 ARRAY format by default', function(done) {
      var defaultFormat = oracledb.outFormat;
      defaultFormat.should.be.exactly(oracledb.ARRAY);

      connection.should.be.ok();
      connection.execute(query, [40], function(err, result){
        should.not.exist(err);
        (result.rows).should.eql([[ 40, 'Human Resources' ]]);
        done();
      });
    });

    it('1.1.2 ARRAY format explicitly', function(done) {
      connection.should.be.ok();
      connection.execute(
        query, {id: 20}, {outFormat: oracledb.ARRAY},
        function(err, result){
          should.not.exist(err);
          (result.rows).should.eql([[ 20, 'Marketing' ]]);
          done();
        }
      );
    });

    it('1.1.3 OBJECT format', function(done){
      connection.should.be.ok();
      connection.execute(
        query, {id: 20}, {outFormat: oracledb.OBJECT},
        function(err, result){
          should.not.exist(err);
          (result.rows).should.eql([{ DEPARTMENT_ID: 20, DEPARTMENT_NAME: 'Marketing' }]);
          done();
        }
      );
    });

    it('1.1.4 Negative test - invalid outFormat value', function(done){
      connection.should.be.ok();
      connection.execute(
        query, {id: 20}, {outFormat:0 },
        function(err, result){
          should.exist(err);
          (err.message).should.startWith('NJS-004:');
          // NJS-004: invalid value for property outFormat
          should.not.exist(result);
          done();
        }
      );
    });
  });

  describe('1.2 can call PL/SQL procedures', function(){
    var connection = false;

    var proc = "CREATE OR REPLACE PROCEDURE nodb_bindingtest (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT VARCHAR2) "
                + "AS "
                + "BEGIN "
                + "  p_out := p_in || ' ' || p_inout; "
                + "END; ";

    before(function(done){
      oracledb.getConnection(credentials, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        connection.execute(proc, function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      });
    });

    after(function(done){
      connection.execute(
        "DROP PROCEDURE nodb_bindingtest",
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release(function(err) {
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    });

    it('1.2.1 bind parameters in various ways', function(done){
      var bindValues = {
        i: 'Alan', // default is type STRING and direction Infinity
        io: { val: 'Turing', type: oracledb.STRING, dir: oracledb.BIND_INOUT },
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      connection.should.be.ok();
      connection.execute(
        "BEGIN nodb_bindingtest(:i, :io, :o); END;",
        bindValues,
        function(err, result){
          should.not.exist(err);
          (result.outBinds.io).should.equal('Turing');
          (result.outBinds.o).should.equal('Alan Turing');
          done();
        }
      );
    });
  });

  describe('1.3 statementCacheSize controls statement caching', function() {
    var makeTable =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_conn_emp4 PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_conn_emp4 ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp4  \
                   VALUES \
                   (1001,''Chris Jones'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp4  \
                   VALUES \
                   (1002,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp4  \
                   VALUES \
                   (2001, ''Karen Morton'') \
            '); \
        END; ";

    var connection = false;
    var defaultStmtCache = oracledb.stmtCacheSize; // 30

    beforeEach('get connection and prepare table', function(done) {
      oracledb.getConnection(credentials, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        conn.execute(
          makeTable,
          function(err){
            if(err) { console.error(err.message); return; }
            done();
          }
        );
      });
    });

    afterEach('drop table and release connection', function(done) {
      oracledb.stmtCacheSize = defaultStmtCache;
      connection.execute(
        "DROP TABLE nodb_conn_emp4 PURGE",
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    });

    it('1.3.1 stmtCacheSize = 0, which disable statement caching', function(done) {
      connection.should.be.ok();
      oracledb.stmtCacheSize = 0;

      async.series([
        function(callback) {
          connection.execute(
            "INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
            { num: 1003, str: 'Robyn Sands' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
            { num: 1004, str: 'Bryant Lin' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
            { num: 1005, str: 'Patrick Engebresson' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('1.3.2 works well when statement cache enabled (stmtCacheSize > 0) ', function(done) {
      connection.should.be.ok();
      oracledb.stmtCacheSize = 100;

      async.series([
        function(callback) {
          connection.execute(
            "INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
            { num: 1003, str: 'Robyn Sands' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
            { num: 1004, str: 'Bryant Lin' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "INSERT INTO nodb_conn_emp4 VALUES (:num, :str)",
            { num: 1005, str: 'Patrick Engebresson' },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

  });

  describe('1.4 Testing commit() & rollback() functions', function() {
    var makeTable =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_conn_emp5 PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_conn_emp5 ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp5  \
                   VALUES \
                   (1001,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_conn_emp5  \
                   VALUES \
                   (1002, ''Karen Morton'') \
            '); \
        END; ";

    var conn1 = false;
    var conn2 = false;
    beforeEach('get 2 connections and create the table', function(done) {
      async.series([
        function(callback) {
          oracledb.getConnection(credentials, function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          });
        },
        function(callback) {
          oracledb.getConnection(credentials, function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          });
        },
        function(callback) {
          conn1.should.be.ok();
          conn1.execute(
            makeTable,
            [],
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    afterEach('drop table and release connections', function(done) {
      conn1.should.be.ok();
      conn2.should.be.ok();
      async.series([
        function(callback) {
          conn2.execute(
            "DROP TABLE nodb_conn_emp5 PURGE",
            function(err) {
              should.not.exist(err);
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


    it('1.4.1 commit() function works well', function(done) {
      async.series([
        function(callback) {
          conn2.execute(
            "INSERT INTO nodb_conn_emp5 VALUES (:num, :str)",
            { num: 1003, str: 'Patrick Engebresson' },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          conn1.execute(
            "SELECT COUNT(*) FROM nodb_conn_emp5",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(2);
              callback();
            }
          );
        },
        function(callback) {
          conn2.execute(
            "SELECT COUNT(*) FROM nodb_conn_emp5",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(3);
              callback();
            }
          );
        },
        function(callback) {
          conn2.commit(function(err) {
            should.not.exist(err);
            callback();
          });
        },
        function(callback) {
          conn1.execute(
            "SELECT COUNT(*) FROM nodb_conn_emp5",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(3);
              callback();
            }
          );
        },
      ], done);

    });

    it('1.4.2 rollback() function works well', function(done) {
      async.series([
        function(callback) {
          conn2.execute(
            "INSERT INTO nodb_conn_emp5 VALUES (:num, :str)",
            { num: 1003, str: 'Patrick Engebresson' },
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          conn1.execute(
            "SELECT COUNT(*) FROM nodb_conn_emp5",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(2);
              callback();
            }
          );
        },
        function(callback) {
          conn2.execute(
            "SELECT COUNT(*) FROM nodb_conn_emp5",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(3);
              callback();
            }
          );
        },
        function(callback) {
          conn2.rollback(function(err) {
            should.not.exist(err);
            callback();
          });
        },
        function(callback) {
          conn2.execute(
            "SELECT COUNT(*) FROM nodb_conn_emp5",
            function(err, result) {
              should.not.exist(err);
              result.rows[0][0].should.be.exactly(2);
              callback();
            }
          );
        },
      ], done);
    });
  });

  describe('1.5 Testing parameter assertions', function() {
    var conn1;

    beforeEach('get connection ready', function(done) {
      oracledb.getConnection(credentials, function(err, conn) {
        should.not.exist(err);
        conn1 = conn;
        done();
      });
    });

    afterEach('release connection', function(done) {
      conn1.release(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('1.5.1 too few params should throw an error', function(done) {
      // This test returns a promise because the last parameter to execute is not
      // a function. Normally, errors thrown in a promise would be directed to
      // to a catch handler. In the case of an "accidental promise" the error
      // could go undetected. Because of this, the promisify function in util.js
      // uses process.nextTick to throw invalid number or type of params (NJS-009
      // and NJS-006). This test has been updated to account for this behavior.
      var promiseSupportEnabled = oracledb.Promise !== undefined;
      var listeners = process.listeners('uncaughtException');

      if (promiseSupportEnabled) {
        process.removeAllListeners('uncaughtException');

        process.once('uncaughtException', function(err) {
          listeners.forEach(function(listener) {
            process.on('uncaughtException', listener);
          });

          should.exist(err);

          done();
        });
      }

      // Using try catch for instances where promises are not supported or have
      // been disabled by setting oracledb.Promise to something falsey.
      try {
        conn1.execute();
      } catch (err) {
        if (promiseSupportEnabled) {
          listeners.forEach(function(listener) {
            process.on('uncaughtException', listener);
          });
        }

        should.exist(err);

        done();
      }
    });

    it('1.5.2 too many params should throw error', function(done) {
      // This test returns a promise because the last parameter to execute is not
      // a function. Normally, errors thrown in a promise would be directed to
      // to a catch handler. In the case of an "accidental promise" the error
      // could go undetected. Because of this, the promisify function in util.js
      // uses process.nextTick to throw invalid number or type of params (NJS-009
      // and NJS-006). This test has been updated to account for this behavior.
      var promiseSupportEnabled = oracledb.Promise !== undefined;
      var listeners = process.listeners('uncaughtException');

      if (promiseSupportEnabled) {
        process.removeAllListeners('uncaughtException');

        process.once('uncaughtException', function(err) {
          listeners.forEach(function(listener) {
            process.on('uncaughtException', listener);
          });

          should.exist(err);

          done();
        });
      }

      // Using try catch for instances where promises are not supported or have
      // been disabled by setting oracledb.Promise to something falsey.
      try {
        conn1.execute(1, 2, 3, 4, 5);
      } catch (err) {
        if (promiseSupportEnabled) {
          listeners.forEach(function(listener) {
            process.on('uncaughtException', listener);
          });
        }
        should.exist(err);

        done();
      }
    });

    it('1.5.3 wrong type for param 1 should throw an error', function(done) {
      // Don't need to listen for unhandledRejection because a promise will not
      // be returned as the last param is a function.
      try {
        conn1.execute(1, function() {});
      } catch (err) {
        should.exist(err);
        done();
      }
    });

    it('1.5.4 wrong type for param 2 should throw an error', function(done) {
      // This test returns a promise because the last parameter to execute is not
      // a function. Normally, errors thrown in a promise would be directed to
      // to a catch handler. In the case of an "accidental promise" the error
      // could go undetected. Because of this, the promisify function in util.js
      // uses process.nextTick to throw invalid number or type of params (NJS-009
      // and NJS-006). This test has been updated to account for this behavior.
      var promiseSupportEnabled = oracledb.Promise !== undefined;
      var listeners = process.listeners('uncaughtException');

      if (promiseSupportEnabled) {
        process.removeAllListeners('uncaughtException');

        process.once('uncaughtException', function(err) {
          listeners.forEach(function(listener) {
            process.on('uncaughtException', listener);
          });

          should.exist(err);

          done();
        });
      }

      // Using try catch for instances where promises are not supported or have
      // been disabled by setting oracledb.Promise to something falsey.
      try {
        conn1.execute('select 1 from dual', 1);
      } catch (err) {
        if (promiseSupportEnabled) {
          listeners.forEach(function(listener) {
            process.on('uncaughtException', listener);
          });
        }

        should.exist(err);

        done();
      }
    });

    it('1.5.5 wrong type for param 3 should throw an error', function(done) {
      // Don't need to listen for unhandledRejection because a promise will not
      // be returned as the last param is a function.
      try {
        conn1.execute('select 1 from dual', 1, function() {});
      } catch (err) {
        should.exist(err);
        done();
      }
    });

    it('1.5.6 wrong type for param 4 should throw an error', function(done) {
      // Don't need to listen for unhandledRejection because a promise will not
      // be returned as the last param is a function.
      try {
        conn1.execute('select 1 from dual', {}, 1, function() {});
      } catch (err) {
        should.exist(err);
        done();
      }
    });
  });

  describe('1.6 Close method', function() {
    it('1.6.1 close can be used as an alternative to release', function(done) {
      oracledb.getConnection(credentials, function(err, conn) {
        should.not.exist(err);

        conn.close(function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
  }); // 1.6

  describe('1.7 connectionString alias', function() {
    it('1.7.1 allows connectionString to be used as an alias for connectString', function(done) {
      oracledb.getConnection(
        {
          user: dbConfig.user,
          password: dbConfig.password,
          connectionString: dbConfig.connectString
        },
        function(err, connection) {
          should.not.exist(err);

          connection.should.be.ok();

          connection.close(function(err) {
            should.not.exist(err);

            done();
          });
        }
      );
    });

  }); // 1.7

  describe('1.8 privileged connnections', function() {

    it('1.8.1 Negative value - null', function(done) {

      oracledb.getConnection(
        {
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: dbConfig.connectString,
          privilege: null
        },
        function(err, connection) {
          should.exist(err);
          should.strictEqual(
            err.message,
            'NJS-007: invalid value for "privilege" in parameter 1'
          );
          should.not.exist(connection);
          done();
        }
      );
    }); // 1.8.1

    it('1.8.2 Negative - invalid type, a String', function(done) {

      oracledb.getConnection(
        {
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: dbConfig.connectString,
          privilege: 'sysdba'
        },
        function(err, connection) {
          should.exist(err);
          should.not.exist(connection);
          should.strictEqual(
            err.message,
            'NJS-008: invalid type for "privilege" in parameter 1'
          );
          done();
        }
      );
    }); // 1.8.2

    it('1.8.3 Negative value - random constants', function(done) {

      oracledb.getConnection(
        {
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: dbConfig.connectString,
          privilege: 23
        },
        function(err, connection) {
          should.exist(err);
          (err.message).should.startWith('ORA-24300');
          // ORA-24300: bad value for mode
          should.not.exist(connection);
          done();
        }
      );
    }); // 1.8.3

    it('1.8.4 Negative value - NaN', function(done) {

      oracledb.getConnection(
        {
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: dbConfig.connectString,
          privilege: NaN
        },
        function(err, connection) {
          should.exist(err);
          should.strictEqual(
            err.message,
            'NJS-007: invalid value for "privilege" in parameter 1'
          );
          should.not.exist(connection);
          done();
        }
      );
    }); // 1.8.4

    it('1.8.5 gets ignored when acquiring a connection from Pool', function(done) {

      oracledb.createPool(
        {
          user: dbConfig.user,
          password: dbConfig.password,
          connectString: dbConfig.connectString,
          privilege: null,
          poolMin: 1
        },
        function(err, pool) {
          should.not.exist(err);

          pool.getConnection(function(err, conn) {
            should.not.exist(err);

            conn.close(function(err) {
              should.not.exist(err);

              pool.close(function(err) {
                should.not.exist(err);
                done();
              });
            });
          });
        }
      );
    }); // 1.8.5

  }); // 1.8

  describe('1.9 Ping method', function() {

    it('1.9.1 ping() checks the connection is usable', function(done) {
      var conn;
      async.series([
        function(cb) {
          oracledb.getConnection(
            dbConfig,
            function(err, connection) {
              should.not.exist(err);
              conn = connection;
              cb();
            }
          );
        },
        function(cb) {
          conn.ping(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          conn.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }); // 1.9.1

    it('1.9.2 closed connection', function(done) {
      var conn;
      async.series([
        function(cb) {
          oracledb.getConnection(
            dbConfig,
            function(err, connection) {
              should.not.exist(err);
              conn = connection;
              cb();
            }
          );
        },function(cb) {
          conn.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          conn.ping(function(err) {
            should.exist(err);
            should.strictEqual(
              err.message,
              "NJS-003: invalid connection"
            );
            cb();
          });
        },
      ], done);
    }); // 1.9.2
  }); // 1.9

});
