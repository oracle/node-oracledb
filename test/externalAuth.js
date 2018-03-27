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
 *   5. externalAuth.js
 *
 * DESCRIPTION
 *   Testing external authentication functionality.
 *
 *   Note that enabling the externalAuth feature requires configuration on the
 *   database besides setting "externalAuth" attribute to be true. Please refer
 *   to api doc about the configuration.
 *   https://oracle.github.io/node-oracledb/doc/api.html#extauth
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('5. externalAuth.js', function() {

  describe('5.1 tests that work both when DB has configured externalAuth and not configured', function() {

    it('5.1.1 can get connection from oracledb with correct user/password when externalAuth is disabled', function(done) {

      async.waterfall([
        function(callback) {
          oracledb.getConnection(
            {
              externalAuth:  false,
              user:          dbConfig.user,
              password:      dbConfig.password,
              connectString: dbConfig.connectString
            },
            function(err, connection) {
              callback(err, connection);
            }
          );
        },
        function(connection, callback) {
          connection.execute(
            "select (7+8) from dual",
            function(err, result) {
              (result.rows[0][0]).should.equal(15);
              callback(err, connection);
            }
          );
        }
      ], function(err, connection) {
        should.not.exist(err);
        connection.release( function(err) {
          should.not.exist(err);
          done();
        });
      });

    }); // 5.1.1

    it('5.1.2 throws error when getting connection from oracledb with correct user/password when externalAuth is enabled', function(done) {

      oracledb.getConnection(
        {
          externalAuth:  true,
          user:          dbConfig.user,
          password:      dbConfig.password,
          connectString: dbConfig.connectString
        },
        function(err, conn){
          should.exist(err);
          (err.message).should.startWith("DPI-1032:");
          // DPI-1032: user and password should not be set when using external authentication
          should.not.exist(conn);
          done();
        }
      );

    }); // 5.1.2

    it("5.1.3 throws error when gettting connection from oracledb given only 'user' when externalAuth is enabled", function(done) {

      oracledb.getConnection(
        {
          externalAuth:  true,
          user:          dbConfig.user,
          connectString: dbConfig.connectString
        },
        function(err, conn){
          should.exist(err);
          (err.message).should.startWith("DPI-1032:");
          // DPI-1032: user and password should not be set when using external authentication
          should.not.exist(conn);
          done();
        }
      );

    }); // 5.1.3

    it("5.1.4 throws error when gettting connection from oracledb given only 'password' when externalAuth is enabled", function(done) {

      oracledb.getConnection(
        {
          externalAuth:  true,
          password:      dbConfig.password,
          connectString: dbConfig.connectString
        },
        function(err, conn){
          should.exist(err);
          (err.message).should.startWith("DPI-1032:");
          // DPI-1032: user and password should not be set when using external authentication

          should.not.exist(conn);
          done();
        }
      );

    }); // 5.1.4

    it("5.1.5 can get pool from oracledb with user/password when externalAuth is disabled", function(done) {

      async.waterfall([
        function(callback) {
          oracledb.createPool(
            {
              externalAuth:  false,
              user:          dbConfig.user,
              password:      dbConfig.password,
              connectString: dbConfig.connectString
            },
            function(err, pool) {
              callback(err, pool);
            }
          );
        },
        function(pool, callback) {
          pool.getConnection(function(err, connection) {
            callback(err, connection, pool);
          });
        },
        function(connection, pool, callback) {
          connection.execute(
            "select (3+5) from dual",
            function(err, result) {
              (result.rows[0][0]).should.equal(8);
              callback(err, connection, pool);
            }
          );
        }
      ], function(err, connection, pool) {
        should.not.exist(err);
        connection.close( function(err) {
          should.not.exist(err);
          pool.close( function(err) {
            should.not.exist(err);
            done();
          });
        });
      });

    }); // 5.1.5

    it("5.1.6 throws error when getting pool from oracledb given user/password when externalAuth is enabled", function(done) {

      oracledb.createPool(
        {
          externalAuth:  true,
          user:          dbConfig.user,
          password:      dbConfig.password,
          connectString: dbConfig.connectString
        },
        function(err, pool) {
          should.exist(err);
          (err.message).should.startWith("DPI-1032:");
          // DPI-1032: user and password should not be set when using external authentication
          should.not.exist(pool);
          done();
        }
      );

    }); // 5.1.6

    it("5.1.7 throws error when getting pool from oracledb only given username when externalAuth is enabled", function(done) {

      oracledb.createPool(
        {
          externalAuth:  true,
          user:          dbConfig.user,
          connectString: dbConfig.connectString
        },
        function(err, pool) {
          should.exist(err);
          (err.message).should.startWith("DPI-1032:");
          should.not.exist(pool);
          done();
        }
      );

    });

    it("5.1.8 throws error when getting pool from oracledb only given password when externalAuth is enabled", function(done) {

      oracledb.createPool(
        {
          externalAuth:  true,
          password:      dbConfig.password,
          connectString: dbConfig.connectString
        },
        function(err, pool) {
          should.exist(err);
          (err.message).should.startWith("DPI-1032:");
          should.not.exist(pool);
          done();
        }
      );

    });

  }); // 5.1

  describe('5.2 tests only work when externalAuth is configured on DB', function() {

    before(function() {
      if ( !(process.env.NODE_ORACLEDB_EXTERNALAUTH) ) this.skip();
    });

    it("5.2.1 can get connection from oracledb with external authentication", function(done) {

      async.waterfall([
        function(callback) {
          oracledb.getConnection(
            {
              externalAuth:  true,
              connectString: dbConfig.connectString
            },
            function(err, connection) {
              callback(err, connection);
            }
          );
        },
        function(connection, callback) {
          connection.execute(
            "select (7+8) from dual",
            function(err, result) {
              (result.rows[0][0]).should.equal(15);
              callback(err, connection);
            }
          );
        }
      ], function(err, connection) {
        should.not.exist(err);
        connection.release( function(err) {
          should.not.exist(err);
          done();
        });
      });

    }); // 5.2.1

    it("5.2.2 can get pool from oracledb with external authentication", function(done) {

      async.waterfall([
        function(callback) {
          oracledb.createPool(
            {
              externalAuth: true,
              connectString: dbConfig.connectString
            },
            function(err, pool) {
              // verify poolMin value
              (pool.connectionsOpen).should.be.exactly(0);
              callback(err, pool);
            }
          );
        },
        function(pool, callback) {
          pool.getConnection( function(err, connection) {
            callback(err, connection, pool);
          });
        },
        function(connection, pool, callback) {
          connection.execute(
            "select (3+5) from dual",
            function(err, result) {
              (result.rows[0][0]).should.equal(8);
              callback(err, connection, pool);
            }
          );
        }
      ], function(err, connection, pool) {
        should.not.exist(err);
        connection.close( function(err) {
          should.not.exist(err);
          pool.close(function(err) {
            should.not.exist(err);
            done();
          });
        });
      });

    }); // 5.2.2

    it("5.2.3 gets multiple connections from oracledb", function(done) {

      var getConns = function(id, callback) {
        oracledb.getConnection(
          {
            externalAuth:  true,
            connectString: dbConfig.connectString
          },
          function(err, connection) {
            callback(err, {
              num:  id,
              inst: connection
            });
          }
        );
      };

      var closeConns = function(conns, cb) {
        async.map(conns, function(item, callback) {
          // console.log("-- close conn " + item.num);
          var connection = item.inst;
          connection.execute(
            "select (5+7) from dual",
            function(err, result) {
              should.not.exist(err);
              (result.rows[0][0]).should.equal(12);
              connection.close(callback);
            }
          );
        }, function(err) {
          should.not.exist(err);
          cb();
        });
      };

      // Main function of this case
      async.times(9, function(n, next) {
        getConns(n, function(err, conn) {
          next(err, conn);
        });
      }, function(err, arr) {
        should.not.exist(err);
        closeConns(arr, done);
      });

    }); // 5.2.3

    it("5.2.4 gets multiple pools from oracledb", function(done) {

      var getPools = function(id, callback) {
        oracledb.createPool(
          {
            externalAuth:  true,
            connectString: dbConfig.connectString
          },
          function(err, pool) {
            callback(err, {
              num:  id,
              inst: pool
            });
          }
        );
      };

      var closePools = function(pools, cb) {
        async.map(pools, function(item, callback) {
          // console.log("-- close pool " + item.num);
          var pool = item.inst;
          pool.getConnection(function(err, connection) {
            should.not.exist(err);
            connection.execute(
              "select (8+9) from dual",
              function(err, result) {
                should.not.exist(err);
                (result.rows[0][0]).should.equal(17);
                connection.close(function(err) {
                  should.not.exist(err);
                  pool.close(callback);
                });
              }
            );
          });
        }, function(err) {
          should.not.exist(err);
          cb();
        });
      };

      // Main function of this case
      async.times(9, function(n, next) {
        getPools(n, function(err, poolInst) {
          next(err, poolInst);
        });
      }, function(err, arr) {
        should.not.exist(err);
        closePools(arr, done);
      });

    }); // 5.2.4

    it("5.2.5 poolMin no longer takes effect under externalAuth", function(done) {

      oracledb.createPool(
        {
          externalAuth: true,
          connectString: dbConfig.connectString,
          poolMin: 5,
          poolMax: 20,
          poolIncrement: 2
        },
        function(err, pool) {
          (pool.connectionsOpen).should.be.exactly(0);

          pool.close(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );

    });

    it("5.2.6 poolIncrement no longer takes effect", function(done) {

      async.waterfall([
        function(callback) {
          oracledb.createPool(
            {
              externalAuth: true,
              connectString: dbConfig.connectString,
              poolMin: 5,
              poolMax: 20,
              poolIncrement: 2
            },
            function(err, pool) {
              callback(err, pool);
            }
          );
        },
        function(pool, callback) {
          pool.getConnection( function(err, conn1) {
            (pool.connectionsOpen).should.be.exactly(1);
            callback(err, conn1, pool);
          });
        },
        function(conn1, pool, callback) {
          pool.getConnection( function(err, conn2) {
            (pool.connectionsOpen).should.be.exactly(2);
            callback(err, conn1, conn2, pool);
          });
        }
      ], function(err, conn1, conn2, pool) {
        should.not.exist(err);
        conn1.close( function(err) {
          should.not.exist(err);
          conn2.close(function(err) {
            should.not.exist(err);
            pool.close(function(err) {
              should.not.exist(err);
              done();
            });
          });
        });
      });
    });

  }); // 5.2

});
