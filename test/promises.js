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
 *   16. promises.js
 *
 * DESCRIPTION
 *   Promise tests.
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

// Need to skip these tests if Promises are not supported
var it = (oracledb.Promise) ? global.it : global.it.skip;

describe('16. promises.js', function(){

  var credentials = {
                      user:          dbConfig.user,
                      password:      dbConfig.password,
                      connectString: dbConfig.connectString
                    };

  it('16.1 returns a promise from oracledb.getConnection', function(done) {
    var promise = oracledb.getConnection(credentials);

    promise.should.be.an.instanceof(oracledb.Promise);

    promise
      .then(function(conn) {
        conn.should.be.ok();
        conn.release(function(err) {
          if (err)
            return done(err);
          else
            return done();
        });
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.2 returns a promise from oracledb.createPool', function(done) {
    var promise = oracledb.createPool(credentials);

    promise.should.be.an.instanceof(oracledb.Promise);

    promise
      .then(function(pool) {
        pool.should.be.ok();
        pool.terminate(function(err) {
          if (err)
            return done(err);
          else
            return done();
        });
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.3 returns a promise from pool.terminate', function(done) {
    oracledb.createPool(credentials)
      .then(function(pool) {
        pool.should.be.ok();
        var promise = pool.terminate();
        promise.should.be.an.instanceof(oracledb.Promise);
        return promise;
      })
      .then(function() {
        return done();
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.4 returns a promise from pool.getConnection', function(done) {
    oracledb.createPool(credentials)
      .then(function(pool) {
        pool.should.be.ok();
        var getConnPromise = pool.getConnection();
        getConnPromise.should.be.an.instanceof(oracledb.Promise);
        getConnPromise
          .then(function(conn) {
            conn.release(function(err) {
              if (err) {
                return done(err);
              }

              pool.terminate()
                .then(function() {
                  return done();
                })
                .catch(function(err) {
                  return done(err);
                });
            });
          });
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.5 returns a promise from connection.release', function(done) {
    oracledb.getConnection(credentials)
      .then(function(conn) {
        conn.should.be.ok();
        var promise = conn.release();
        promise.should.be.an.instanceof(oracledb.Promise);
        return promise;
      })
      .then(function() {
        return done();
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.6 returns a promise from connection.execute', function(done) {
    oracledb.getConnection(credentials)
      .then(function(conn) {
        conn.should.be.ok();
        var executePromise = conn.execute('select 1 from dual');
        executePromise.should.be.an.instanceof(oracledb.Promise);
        return executePromise
          .then(function(result) {
            result.rows[0][0].should.eql(1);

            return conn.release()
              .then(done);
          });
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.7 returns a promise from connection.commit', function(done) {
    oracledb.getConnection(credentials)
      .then(function(conn) {
        var commitPromise;
        conn.should.be.ok();
        commitPromise = conn.commit();
        commitPromise.should.be.an.instanceof(oracledb.Promise);

        return commitPromise
          .then(function() {
            return conn.release()
              .then(done);
          });
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.8 returns a promise form connection.rollback', function(done) {
    oracledb.getConnection(credentials)
      .then(function(conn) {
        var rollbackPromise;
        conn.should.be.ok();
        rollbackPromise = conn.rollback();
        rollbackPromise.should.be.an.instanceof(oracledb.Promise);

        return rollbackPromise
          .then(function() {
            return conn.release()
              .then(done);
          });
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.9 returns a promise from resultSet.close', function(done) {
    oracledb.getConnection(credentials)
      .then(function(conn) {
        conn.should.be.ok();

        return conn.execute('select 1 from dual', [], {resultSet: true})
          .then(function(result) {
            var closePromise;
            closePromise = result.resultSet.close();
            closePromise.should.be.an.instanceof(oracledb.Promise);

            return closePromise
              .then(function() {
                return conn.release()
                  .then(done);
              });
          });
      })
      .catch(function(err) {
        return done(err);
      });
  })

  it('16.10 returns a promise from resultSet.getRow', function(done) {

    function finishProcessing(conn, resultSet) {
      return resultSet.close()
        .then(function() {
          conn.release();
        })
    }

    function processResultSet(conn, resultSet) {
      return new Promise(function(resolve, reject) {
        function processRow() {
          var getRowPromise;

          getRowPromise = resultSet.getRow();
          getRowPromise.should.be.an.instanceof(oracledb.Promise);

          getRowPromise
            .then(function(row) {
              if (!row) {
                finishProcessing(conn, resultSet)
                  .then(function() {
                    resolve();
                  });
              } else {
                row[0].should.eql(1);

                processRow();
              }
            })
            .catch(function(err) {
              reject(err);
            });
        }

        processRow();
      });
    }

    oracledb.getConnection(credentials)
      .then(function(conn) {
        conn.should.be.ok();

        return conn.execute('select 1 from dual', [], {resultSet: true})
          .then(function(result) {
            return processResultSet(conn, result.resultSet)
              .then(function() {
                done();
              });
          });
      })
      .catch(function(err) {
        return done(err);
       });

  }) // 16.10

  it('16.11 returns a promise from resultSet.getRows', function(done) {
    function finishProcessing(conn, resultSet) {
      return resultSet.close()
        .then(function() {
          conn.release();
        });
    }

    function processResultSet(conn, resultSet) {
      return new Promise(function(resolve, reject) {
        function processRows() {
          var getRowsPromise;

          getRowsPromise = resultSet.getRows(2);
          getRowsPromise.should.be.an.instanceof(oracledb.Promise);

          getRowsPromise
            .then(function(rows) {
              if (rows.length === 0) {
                finishProcessing(conn, resultSet)
                  .then(function() {
                    resolve();
                  });
              } else {
                rows[0][0].should.eql(1);
                rows[1][0].should.eql(2);

                processRows();
              }
            })
            .catch(function(err) {
              reject(err);
            });
        }

        processRows();
      });
    }

    oracledb.getConnection(credentials)
      .then(function(conn) {
        conn.should.be.ok();

        return conn.execute('select 1 from dual union select 2 from dual', [], {resultSet: true})
          .then(function(result) {
            return processResultSet(conn, result.resultSet)
              .then(function() {
                return done();
              });
          });
      })
      .catch(function(err) {
        return done(err);
      });
  }) // 16.11

})
