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
 *   73. poolPing.js
 *
 * DESCRIPTION
 *   Testing connection ping feature of Pool object.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe("73. poolPing.js", function() {

  var defaultInterval = oracledb.poolPingInterval;

  afterEach("reset poolPingInterval to default", function() {

    oracledb.poolPingInterval = defaultInterval;
    should.strictEqual(oracledb.poolPingInterval, 60);

  });

  it("73.1 the default value of poolPingInterval is 60", function(done) {

    var defaultValue = 60;
    should.strictEqual(oracledb.poolPingInterval, defaultValue);

    var pool;
    async.series([
      function(cb) {
        oracledb.createPool(
          dbConfig,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;

            should.strictEqual(pool.poolPingInterval, defaultValue);
            cb();
          }
        );
      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);

  }); // 73.1

  it("73.2 does not change after the pool has been created", function(done) {

    var userSetInterval = 20;
    oracledb.poolPingInterval = userSetInterval;

    var pool;
    async.series([
      function(cb) {
        oracledb.createPool(
          dbConfig,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;

            should.strictEqual(pool.poolPingInterval, userSetInterval);
            cb();
          }
        );
      },
      function(cb) {
        var newInterval = userSetInterval * 2;
        oracledb.poolPingInterval = newInterval;

        // sleep a while
        setTimeout(function() {
          cb();
        }, 100);
      },
      function dotest(cb) {
        should.strictEqual(pool.poolPingInterval, userSetInterval);
        cb();
      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);

  }); // 73.2

  it("73.3 can not be changed on pool object", function(done) {

    var userSetInterval = 30;
    oracledb.poolPingInterval = userSetInterval;

    var pool;
    async.series([
      function(cb) {
        oracledb.createPool(
          dbConfig,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;

            should.strictEqual(pool.poolPingInterval, userSetInterval);
            cb();
          }
        );
      },
      function dotest(cb) {
        var newInterval = userSetInterval * 2;

        try {
          pool.poolPingInterval = newInterval;
        } catch(err) {
          should.exist(err);
          (err.message).should.startWith('NJS-014:');
          // NJS-014: poolPingInterval is a read-only property
        }
        cb();

      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);

  }); // 73.3

  it("73.4 can not be accessed on connection object", function(done) {

    var pool, connection;

    async.series([
      function(cb) {
        oracledb.createPool(
          dbConfig,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;
            cb();
          }
        );
      },
      function dotest(cb) {
        pool.getConnection(function(err, conn) {
          should.not.exist(err);
          connection = conn;

          should.not.exist(connection.poolPingInterval);

          cb();
        });
      },
      function(cb) {
        connection.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);

  }); // 73.4

  // helper function for below test cases
  var testDefine = function(userSetInterval, callback) {

    oracledb.poolPingInterval = userSetInterval;

    var pool;
    async.series([
      function(cb) {
        oracledb.createPool(
          dbConfig,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;

            should.strictEqual(pool.poolPingInterval, userSetInterval);
            cb();
          }
        );
      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], callback);

  }; // testDefine()

  it("73.5 can be set to 0, means always ping", function(done) {

    var userSetValue = 0;
    testDefine(userSetValue, done);

  }); // 73.5


  it("73.6 can be set to negative values, means never ping", function(done) {

    var userSetValue = -80;
    testDefine(userSetValue, done);

  }); // 73.6

  it("73.7 Negative: Number.MAX_SAFE_INTEGER", function(done) {

    /*
    Number.MAX_SAFE_INTEGER // 9007199254740991
    Math.pow(2, 53) - 1     // 9007199254740991
    */

    try {
      oracledb.poolPingInterval = Number.MAX_SAFE_INTEGER;
    } catch(err) {
      should.exist(err);
      (err.message).should.startWith("NJS-004:");
      // NJS-004: invalid value for property pingPoolInterval

      done();
    }

  }); // 73.7

  it("73.8 cannot surpass the upper limit", function(done) {

    var upperLimit = 2147483647; // 2GB

    async.series([
      function testMax(cb) {
        testDefine(upperLimit, cb);
      },
      function(cb) {
        var upperLimitPlus = upperLimit +1;

        try{
          oracledb.poolPingInterval = upperLimitPlus;
        } catch(err) {
          should.exist(err);
          (err.message).should.startWith("NJS-004:");
          cb();
        }
      }
    ], done);

  }); // 73.8

  it("73.9 cannot surpass the lower Limit", function(done) {

    var lowerLimit = -2147483648;

    async.series([
      function texstMin(cb) {
        testDefine(lowerLimit, cb);
      },
      function(cb) {
        var lowerLimitPlus = lowerLimit -1;

        try {
          oracledb.poolPingInterval = lowerLimitPlus;
        } catch(err) {
          should.exist(err);
          (err.message).should.startWith("NJS-004:");
          cb();
        }
      }
    ], done);

  }); // 73.9

  it("73.10 Negative: null", function(done) {

    try {
      oracledb.poolPingInterval = null;
    } catch(err) {
      should.exist(err);
      (err.message).should.startWith("NJS-004:");

      done();
    }


  }); // 73.10

  it("73.11 Negative: NaN", function(done) {

    try {
      oracledb.poolPingInterval = NaN;
    } catch(err) {
      should.exist(err);
      (err.message).should.startWith("NJS-004:");

      done();
    }

  }); // 73.11

  it("73.12 Negative: undefined", function(done) {

    try {
      oracledb.poolPingInterval = undefined;
    } catch(err) {
      should.exist(err);
      (err.message).should.startWith("NJS-004:");

      done();
    }

  }); // 73.12

  it("73.13 Negative: 'random-string'", function(done) {

    try {
      oracledb.poolPingInterval = 'random-string';
    } catch(err) {
      should.exist(err);
      (err.message).should.startWith("NJS-004:");

      done();
    }

  }); // 73.13

  var testPoolDefine = function(userSetInterval, expectedValue, callback) {

    var pool;
    async.series([
      function(cb) {
        oracledb.createPool(
          {
            user:             dbConfig.user,
            password:         dbConfig.password,
            connectString:    dbConfig.connectString,
            poolPingInterval: userSetInterval
          },
          function(err, pooling) {
            if(userSetInterval === null) {
              should.not.exist(pooling);
              should.exist(err);
              should.strictEqual(err.message, "NJS-007: invalid value for \"poolPingInterval\" in parameter 1");
            } else {
              should.not.exist(err);
              pool = pooling;

              should.strictEqual(pool.poolPingInterval, expectedValue);
            }
            cb();
          }
        );
      },
      function(cb) {
        if(userSetInterval !== null) {
          pool.close(function(err) {
            should.not.exist(err);
          });
        }
        cb();
      }
    ], callback);

  }; // testPoolDefine

  it("73.14 can be set at pool creation, e.g. positive value 1234", function(done) {

    var userSetValue = 1234;
    testPoolDefine(userSetValue, userSetValue, done);

  });

  it("73.15 can be set at pool creation, e.g. negative value -4321", function(done) {

    var userSetValue = -4321;
    testPoolDefine(userSetValue, userSetValue, done);

  });

  it("73.16 can be set at pool creation, e.g. 0 means always ping", function(done) {

    var userSetValue = 0;
    testPoolDefine(userSetValue, userSetValue, done);

  });

  it("73.17 Negative: null", function(done) {

    oracledb.poolPingInterval = 789;
    var userSetValue = null;

    testPoolDefine(userSetValue, 789, done);

  });

  it("73.18 Setting to 'undefined' will use current value from oracledb", function(done) {

    oracledb.poolPingInterval = 9876;
    var userSetValue = undefined;

    testPoolDefine(userSetValue, 9876, done);

  });

  it("73.19 can be set at pool creation. Negative: NaN", function(done) {

    /*var userSetValue = 'random-string';*/

    var userSetValue = NaN;

    oracledb.createPool(
      {
        user:             dbConfig.user,
        password:         dbConfig.password,
        connectString:    dbConfig.connectString,
        poolPingInterval: userSetValue
      },
      function(err, pool) {
        should.exist(err);
        (err.message).should.startWith("NJS-007:");
        // NJS-007: invalid value for "poolPingInterval" in parameter 1

        should.not.exist(pool);
        done();
      }
    );

  }); // 73.19

  it("73.20 can be set at pool creation. Negative: 'random-string'", function(done) {

    var userSetValue = 'random-string';

    oracledb.createPool(
      {
        user:             dbConfig.user,
        password:         dbConfig.password,
        connectString:    dbConfig.connectString,
        poolPingInterval: userSetValue
      },
      function(err, pool) {
        should.exist(err);
        (err.message).should.startWith("NJS-007:");
        // NJS-007: invalid value for "poolPingInterval" in parameter 1

        should.not.exist(pool);
        done();
      }
    );

  }); // 73.20

  it("73.21 cannot surpass the upper limit at pool creation", function(done) {

    var upperLimit = 2147483647; // 2GB

    async.series([
      function testMax(cb) {
        testPoolDefine(upperLimit, upperLimit, cb);
      },
      function(cb) {

        var userSetValue = upperLimit + 1;
        oracledb.createPool(
          {
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            poolPingInterval: userSetValue
          },
          function(err, pool) {
            should.exist(err);
            (err.message).should.startWith("NJS-007:");

            should.not.exist(pool);
            cb();
          }
        );
      }
    ], done);

  }); // 73.21

  it("73.22 cannot surpass the lower limit at pool creation", function(done) {

    var lowerLimit = -2147483648;

    async.series([
      function testMax(cb) {
        testPoolDefine(lowerLimit, lowerLimit, cb);
      },
      function(cb) {

        var userSetValue = lowerLimit - 1;
        oracledb.createPool(
          {
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            poolPingInterval: userSetValue
          },
          function(err, pool) {
            should.exist(err);
            (err.message).should.startWith("NJS-007:");

            should.not.exist(pool);
            cb();
          }
        );
      }
    ], done);

  }); // 73.22

});
