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
 *   51. poolClose.js
 *
 * DESCRIPTION
 *   Negative cases about pool.terminate().
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('51. poolClose.js', function(){

  it('51.1 can not get connections from the terminated pool', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.terminate(function(err) {
          should.not.exist(err);

          pool.getConnection(function(err) {
            should.exist(err);
            should.strictEqual(err.message, "NJS-065: connection pool was closed");
          });

          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.1

  it('51.2 can not terminate the same pool multiple times', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.terminate(function(err) {
          should.not.exist(err);

          pool.terminate(function(err) {
            should.exist(err);
            should.strictEqual(err.message, "NJS-065: connection pool was closed");
          });

          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.2

  it('51.3 can not close the same pool multiple times', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.close(function(err) {
          should.not.exist(err);

          pool.close(function(err) {
            should.exist(err);
            should.strictEqual(err.message, "NJS-065: connection pool was closed");
          });

          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.3

  it('51.4 pool is still available after the failing close', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.getConnection(function(err, connection) {
          should.not.exist(err);

          pool.terminate(function(err) {
            should.exist(err);
            (err.message).should.startWith('ORA-24422: ');
            // ORA-24422: error occurred while trying to destroy the Session Pool

            connection.release(function(err) {
              should.not.exist(err);

              pool.terminate(function(err) {
                should.not.exist(err);
                done();
              }); // terminate #2
            }); // release()
          }); // terminate() #1
        }); // getConnection()
      }
    ); // createPool()
  }); // 51.4

  it('51.5 can not close the same connection multiple times', function(done) {
    var pool = null;
    var conn = null;

    async.series([
      function(cb) {
        oracledb.createPool(
          dbConfig,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;
            pool.should.be.ok();
            cb();
          }
        );
      },
      function(cb) {
        pool.getConnection(function(err, connection) {
          should.not.exist(err);
          conn = connection;
          conn.should.be.ok();
          cb();
        });
      },
      function close1(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function close2(cb) {
        conn.close(function(err) {
          should.exist(err);
          should.strictEqual(err.message, 'NJS-003: invalid connection');
          cb();
        });
      },
      function(cb) {
        pool.terminate(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // 51.5

  it('51.6 can not get connection in promise version from the terminated pool', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.terminate(function(err) {
          should.not.exist(err);

          var promise = pool.getConnection();

          promise
            .then(function(conn) {
              should.not.exist(conn);
            })
            .catch(function(err) {
              should.exist(err);
              should.strictEqual(err.message, "NJS-065: connection pool was closed");
            })
            .then(function() {
              done();
            });
        }); // terminate()
      }
    ); // createPool()
  }); // 51.6

  it('51.7 can not set the attributes after pool created', function(done) {
    var pMin = 2;
    var pMax = 10;

    oracledb.createPool(
      {
        user            : dbConfig.user,
        password        : dbConfig.password,
        connectString   : dbConfig.connectString,
        poolMin         : pMin,
        poolMax         : pMax
      },
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        // setter
        should.throws(
          function() {
            pool.poolMin = 20;
          },
          /NJS-014: poolMin is a read-only property/
        );

        pool.terminate(function(err) {
          should.not.exist(err);

          // setter
          should.throws(
            function() {
              pool.poolMin = 20;
            },
            /NJS-014: poolMin is a read-only property/
          );

          pool.terminate(function(err) {
            should.exist(err);
            should.strictEqual(err.message, "NJS-065: connection pool was closed");
          });

          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.7

  it('51.8 can access the attributes of closed pool without error', function(done) {
    var pMin = 2;
    var pMax = 10;
    var pAlias = "foobar";
    var pIncr = 2;

    oracledb.createPool(
      {
        user            : dbConfig.user,
        password        : dbConfig.password,
        connectString   : dbConfig.connectString,
        poolMin         : pMin,
        poolMax         : pMax,
        poolAlias       : pAlias,
        poolIncrement   : pIncr
      },
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.terminate(function(err) {
          should.not.exist(err);

          // getter
          should.strictEqual(pool.poolMin, pMin);
          should.strictEqual(pool.poolMax, pMax);

          // values vary with different databases
          // (pool.connectionsInUse).should.be.a.Number();
          // (pool.connectionsOpen).should.be.a.Number();

          should.strictEqual(pool.poolAlias, pAlias);
          should.strictEqual(pool.poolIncrement, pIncr);

          // Default values
          should.strictEqual(pool.poolPingInterval, 60);
          should.strictEqual(pool.poolTimeout, 60);
          should.strictEqual(pool.queueTimeout, 60000);
          should.strictEqual(pool.stmtCacheSize, 30);

          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.8

});