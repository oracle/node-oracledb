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
 *   67. poolCache.js
 *
 * DESCRIPTION
 *   Testing properties of connection pool.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('67. poolCache.js', function() {
  beforeEach(function() {
    // ensure that no poolAlias has been specified
    delete dbConfig.poolAlias;
  });

  after(function() {
    // ensure that no poolAlias has been specified
    delete dbConfig.poolAlias;
  });

  describe('67.1 basic functional tests', function() {
    it('67.1.1 caches pool as default if pool is created when cache is empty', function(done) {
      oracledb.createPool(dbConfig, function(err, pool) {
        var defaultPool;

        should.not.exist(err);

        pool.should.be.ok();

        // Not specifying a name, default will be used
        defaultPool = oracledb.getPool();

        should.strictEqual(pool, defaultPool);

        (defaultPool.poolAlias).should.equal('default');

        pool.close(function(err){
          should.not.exist(err);
          done();
        });
      });
    });

    it('67.1.2 removes the pool from the cache on terminate', function(done) {
      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        pool.should.be.ok();

        pool.close(function(err){
          var defaultPool;

          should.not.exist(err);

          (function() {
            defaultPool = oracledb.getPool();
          }).should.throw(/^NJS-047:/);

          should.not.exist(defaultPool);

          done();
        });
      });
    });

    it('67.1.3 can cache and retrieve an aliased pool', function(done) {
      var poolAlias = 'random-pool-alias';

      dbConfig.poolAlias = poolAlias;

      oracledb.createPool(dbConfig, function(err, pool) {
        var aliasedPool;

        should.not.exist(err);

        pool.should.be.ok();

        pool.poolAlias.should.equal(poolAlias);

        aliasedPool = oracledb.getPool(poolAlias);

        should.strictEqual(pool, aliasedPool);

        pool.close(function(err){
          should.not.exist(err);
          done();
        });
      });
    });

    it('67.1.4 throws an error if the poolAlias already exists in the cache', function(done) {
      dbConfig.poolAlias = 'pool1';

      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        // Creating another pool with the same poolAlias as before
        oracledb.createPool(dbConfig, function(err, pool2) {
          should.exist(err);

          (err.message).should.startWith('NJS-046:');
          should.not.exist(pool2);

          pool1.close(function(err){
            should.not.exist(err);

            done();
          });
        });
      });
    });

    it('67.1.5 does not throw an error if multiple pools are created without a poolAlias', function(done) {
      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        // Creating another pool with no poolAlias
        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          pool1.close(function(err){
            should.not.exist(err);

            pool2.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.1.6 throws an error if poolAttrs.poolAlias is not a string', function(done) {
      // Setting poolAlias to something other than a string. Could be
      // boolean, object, array, etc.
      dbConfig.poolAlias = {};

      oracledb.createPool(dbConfig, function(err, pool) {
        should.exist(err);
        (err.message).should.startWith('NJS-004:');

        should.not.exist(pool);

        done();
      });
    });

    it('67.1.7 makes poolAttrs.poolAlias a read-only attribute on the pool named poolAlias', function(done) {
      dbConfig.poolAlias = 'my-pool';

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        pool.should.be.ok();

        (pool.poolAlias).should.equal(dbConfig.poolAlias);

        (function() {
          pool.poolAlias = 'some-new-value';
        }).should.throw(/^NJS-014:/);

        (pool.poolAlias).should.equal(dbConfig.poolAlias);

        pool.close(function(err) {
          should.not.exist(err);

          done();
        });
      });
    });

    it('67.1.8 retrieves the default pool, even after an aliased pool is created', function(done) {
      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = 'random-pool-alias';

        oracledb.createPool(dbConfig, function(err, pool2) {
          var defaultPool;

          should.not.exist(err);

          pool2.should.be.ok();

          // Not specifying a name, default will be used
          defaultPool = oracledb.getPool();

          should.strictEqual(pool1, defaultPool);

          (defaultPool.poolAlias).should.equal('default');

          pool1.close(function(err){
            should.not.exist(err);

            pool2.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.1.9 retrieves the right pool, even after multiple pools are created', function(done) {
      var aliasToGet = 'random-pool-alias-2';

      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = aliasToGet;

        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          dbConfig.poolAlias = 'random-pool-alias-3';

          oracledb.createPool(dbConfig, function(err, pool3) {
            var secondPool;

            should.not.exist(err);

            secondPool = oracledb.getPool(aliasToGet);

            should.strictEqual(pool2, secondPool);

            (secondPool.poolAlias).should.equal(aliasToGet);

            pool1.close(function(err){
              should.not.exist(err);

              pool2.close(function(err){
                should.not.exist(err);

                pool3.close(function(err){
                  should.not.exist(err);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('67.1.10 throws an error if the pool specified in getPool doesn\'t exist', function(done) {
      (function() {
        oracledb.getPool();
      }).should.throw(/^NJS-047:/);

      (function() {
        oracledb.getPool('some-random-alias');
      }).should.throw(/^NJS-047:/);

      done();
    });

    it('67.1.11 does not throw an error if multiple pools are created without a poolAlias in the same call stack', function(done) {
      var pool1;
      var pool2;

      async.parallel(
        [
          function(callback) {
            oracledb.createPool(dbConfig, function(err, pool) {
              should.not.exist(err);

              pool1 = pool;

              callback();
            });
          },
          function(callback) {
            oracledb.createPool(dbConfig, function(err, pool) {
              should.not.exist(err);

              pool2 = pool;

              callback();
            });
          }
        ],
        function(createPoolErr) {
          should.not.exist(createPoolErr);

          pool1.close(function(err) {
            should.not.exist(err);

            pool2.close(function(err) {
              should.not.exist(err);

              done(createPoolErr);
            });
          });
        }
      );
    });

    it('67.1.12 uses callback syntax function(err) instead of function(err, pool)', function(done) {
      oracledb.createPool({ // this becomes the default pool
        user          : dbConfig.user,
        password      : dbConfig.password,
        connectString : dbConfig.connectString,
        poolMax : 4,
        poolMin : 1,
        poolIncrement: 1,
        poolTimeout: 0 // never terminate unused connections
      }, function(err) {
        should.not.exist(err);

        var defaultPool = oracledb.getPool();
        should.exist(defaultPool);
        (defaultPool.poolAlias).should.equal('default');

        defaultPool.close(function(err) {
          should.not.exist(err);
        });
        done();
      });
    });

    it('67.1.13 Negative: callback is called with function(err)', function(done) {

      oracledb.createPool({ // this becomes the default pool
        user          : dbConfig.user,
        password      : 'wrongpassword',
        connectString : dbConfig.connectString,
        poolMax : 4,
        poolMin : 1,
        poolIncrement: 1,
        poolTimeout: 0 // never terminate unused connections
      }, function(err) {
        should.exist(err);
        // ORA-01017: invalid username/password; logon denied
        (err.message).should.startWith('ORA-01017:');
        done();
      });
    });

    it('67.1.14 Creating a named pool will not create a default pool at the same time', function(done) {
      var poolAlias = "namedPool";
      dbConfig.poolAlias = poolAlias;
      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);
        should.exist(pool);
        (pool.poolAlias).should.eql('namedPool');

        /* Note that getPool() is a synchronous method. Thus we could assert in this way. */
        (function() {
          oracledb.getPool();
        }).should.throw(/NJS-047/); // NJS-047: poolAlias "default" not found in the connection pool cache

        /*
          https://nodejs.org/api/assert.html#assert_assert_doesnotthrow_fn_error_message
          Using assert.doesNotThrow() is actually not useful because there is no benefit
          in catching an error and then rethrowing it. Instead, consider adding a comment
          next to the specific code path that should not throw and keep error messages
          as expressive as possible.
        */
        should.doesNotThrow(
          function() {
            var poolInst = oracledb.getPool('namedPool');
            should.exist(poolInst);
          },
          /NJS-047/,
          'Could not found "namedPool" in the connection pool cache'
        );

        pool.close(function(err) {
          should.not.exist(err);
          done();
        });

      });
    });
  });

  describe('67.2 oracledb.getConnection functional tests', function() {
    it('67.2.1 gets a connection from the default pool when no alias is specified', function(done) {
      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        // Not specifying a poolAlias, default will be used
        oracledb.getConnection(function(err, conn) {
          should.not.exist(err);

          conn.release(function(err) {
            should.not.exist(err);

            pool.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.2.2 gets a connection from the pool with the specified poolAlias', function(done) {
      var poolAlias = 'random-pool-alias';

      dbConfig.poolAlias = poolAlias;

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        oracledb.getConnection(poolAlias, function(err, conn) {
          should.not.exist(err);

          conn.release(function(err) {
            should.not.exist(err);

            pool.close(function(err){
              should.not.exist(err);

              done();
            });
          });
        });
      });
    });

    it('67.2.3 throws an error if an attempt is made to use the default pool when it does not exist', function(done) {
      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        // Not specifying a poolAlias, default will be used
        oracledb.getConnection(function(err) {
          should.exist(err);

          (err.message).should.startWith('NJS-047:');

          pool.close(function(err){
            should.not.exist(err);

            done();
          });
        });
      });
    });

    it('67.2.4 throws an error if an attempt is made to use a poolAlias for a pool that is not in the cache', function(done) {
      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool) {
        should.not.exist(err);

        oracledb.getConnection('pool-alias-that-does-not-exist', function(err) {
          should.exist(err);

          (err.message).should.startWith('NJS-047:');

          pool.close(function(err){
            should.not.exist(err);

            done();
          });
        });
      });
    });

    it('67.2.5 gets a connection from the default pool, even after an aliased pool is created', function(done) {
      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = 'random-pool-alias';

        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          oracledb.getConnection(function(err, conn) {
            should.not.exist(err);

            // Using the hidden pool property to check where the connection came from
            should.strictEqual(pool1, conn._pool);

            (conn._pool.poolAlias).should.equal('default');

            conn.close(function(err) {
              should.not.exist(err);

              pool1.close(function(err){
                should.not.exist(err);

                pool2.close(function(err){
                  should.not.exist(err);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('67.2.6 uses the right pool, even after multiple pools are created', function(done) {
      var aliasToUse = 'random-pool-alias-2';

      dbConfig.poolAlias = 'random-pool-alias';

      oracledb.createPool(dbConfig, function(err, pool1) {
        should.not.exist(err);

        pool1.should.be.ok();

        dbConfig.poolAlias = aliasToUse;

        oracledb.createPool(dbConfig, function(err, pool2) {
          should.not.exist(err);

          pool2.should.be.ok();

          dbConfig.poolAlias = 'random-pool-alias-3';

          oracledb.createPool(dbConfig, function(err, pool3) {
            should.not.exist(err);

            oracledb.getConnection(aliasToUse, function(err, conn) {
              // Using the hidden pool property to check where the connection came from
              should.strictEqual(pool2, conn._pool);

              (conn._pool.poolAlias).should.equal(aliasToUse);

              conn.close(function(err) {
                should.not.exist(err);

                pool1.close(function(err){
                  should.not.exist(err);

                  pool2.close(function(err){
                    should.not.exist(err);

                    pool3.close(function(err){
                      should.not.exist(err);

                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    it('67.2.7 gets a connection from the default pool with callback function(err)', function(done) {
      oracledb.createPool({ // this becomes the default pool
        user          : dbConfig.user,
        password      : dbConfig.password,
        connectString : dbConfig.connectString,
        poolMax : 4,
        poolMin : 1,
        poolIncrement: 1,
        poolTimeout: 0 // never terminate unused connections
      }, function(err) {
        should.not.exist(err);

        var defaultPool = oracledb.getPool();
        should.exist(defaultPool);

        oracledb.getConnection(function(err, conn) {
          should.not.exist(err);

          conn.close(function(err) {
            should.not.exist(err);

            defaultPool.close(function(err){
              should.not.exist(err);
              done();
            });
          });
        });
      });
    });
  }); // 67.2

  // This suite extends 67.1.6 case with various types
  describe('67.3 poolAlias attribute', function() {

    it('67.3.1 throws an error if poolAttrs.poolAlias is an object', function(done) {

      dbConfig.poolAlias = {'foo': 'bar'};

      oracledb.createPool(dbConfig, function(err) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');

        done();
      });
    });

    it('67.3.2 throws an error if poolAttrs.poolAlias is an array', function(done) {

      dbConfig.poolAlias = [];

      oracledb.createPool(dbConfig, function(err) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');
        // NJS-004: invalid value for property poolAttrs.poolAlias
        done();
      });
    });

    it('67.3.3 throws an error if poolAttrs.poolAlias is a number', function(done) {

      dbConfig.poolAlias = 123;

      oracledb.createPool(dbConfig, function(err) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');

        done();
      });
    });

    it('67.3.4 throws an error if poolAttrs.poolAlias is a boolean', function(done) {

      dbConfig.poolAlias = false;

      oracledb.createPool(dbConfig, function(err) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');

        done();
      });
    });

    it('67.3.5 throws an error if poolAttrs.poolAlias is null', function(done) {

      dbConfig.poolAlias = null;

      oracledb.createPool(dbConfig, function(err) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');

        done();
      });
    });

    it('67.3.6 throws an error if poolAttrs.poolAlias is an empty string', function(done) {

      dbConfig.poolAlias = '';

      oracledb.createPool(dbConfig, function(err) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');

        done();
      });
    });

    it('67.3.7 throws an error if poolAttrs.poolAlias is NaN', function(done) {

      dbConfig.poolAlias = NaN;

      oracledb.createPool(dbConfig, function(err) {
        should.exist(err);

        (err.message).should.startWith('NJS-004:');

        done();
      });
    });

    it('67.3.8 works if poolAttrs.poolAlias is undefined', function(done) {

      dbConfig.poolAlias = undefined;

      oracledb.createPool(dbConfig, function(err, pool) {

        pool.should.be.ok();
        (pool.poolAlias).should.equal('default');

        pool.close(function(err) {
          should.not.exist(err);
          done();
        });

      });
    });

  }); // 67.3
});
