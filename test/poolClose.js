/* Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved. */

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

describe('51. poolClose.js', function(){

  it('51.1 can not get/set the attributes of terminated pool', function(done) {
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
        should.strictEqual(pool.connectionsOpen, pool.poolMin);
        should.strictEqual(pool.poolMin, pMin);
        should.strictEqual(pool.poolMax, pMax);

        pool.terminate(function(err) {
          should.not.exist(err);

          // getter
          var min;
          should.throws(
            function() {
              min = pool.poolMin;
            },
            /NJS-002: invalid pool/
          );
          should.not.exist(min);

          // setter
          should.throws(
            function() {
              pool.poolMin = 20;
            },
            /NJS-014: poolMin is a read-only property/
          );

          var inUse;
          should.throws(
            function() {
              inUse = pool.connectionsInUse;
            },
            /NJS-002: invalid pool/
          );
          should.not.exist(inUse);

          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.1

  it('51.2 can not get connections from the terminated pool', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.terminate(function(err) {
          should.not.exist(err);

          pool.getConnection(function(err) {
            should.exist(err);
            should.strictEqual(err.message, "NJS-002: invalid pool");
          });

          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.2

  it('51.3 can not terminate the same pool multiple times', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();
        pool.terminate(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              pool.terminate(function() {});
            },
            /NJS-002: invalid pool/
          );
          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.3

  it('51.4 can not close the same pool multiple times', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();
        pool.close(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              pool.close(function() {});
            },
            /NJS-002: invalid pool/
          );
          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.4

  it('51.5 pool is still available after the failing close', function(done) {
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
  }); // 51.5

  it('51.6 can not close the same connection multiple times', function(done) {
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
        should.throws(
          function() {
            conn.close(function() {});
          },
          /NJS-003: invalid connection/
        );
        cb();
      },
      function(cb) {
        pool.terminate(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // 51.6

  it.skip('51.7 can not get connection in promise version from the terminated pool', function(done) {
    oracledb.createPool(
      dbConfig,
      function(err, pool) {
        should.not.exist(err);
        pool.should.be.ok();

        pool.terminate(function(err) {
          should.not.exist(err);

          try {
            var conn = pool.getConnection();
            should.strictEqual(Object.prototype.toString.call(conn), "[object Promise]");
          } catch(err) {
            should.exist(err);
            should.strictEqual(err.message, "NJS-002: invalid pool");
          }
          done();
        }); // terminate()
      }
    ); // createPool()
  }); // 51.7
});
