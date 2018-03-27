/* Copyright (c) 2017, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   52. connClose.js
 *
 * DESCRIPTION
 *   Negative cases against connection.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('52. connClose.js', function() {

  it('52.1 can not set property, stmtCacheSize, after connection closes', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);
        var defaultSize = 30;
        should.strictEqual(connection.stmtCacheSize, defaultSize);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.stmtCacheSize = 10;
            },
            /NJS-014: stmtCacheSize is a read-only property/
          );
          done();
        });
      }
    );
  }); // 52.1

  it('52.2 can not set property, clientId, after connection closes', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.clientId = "52.3";
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.2

  it('52.3 can not set property, module', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.module = "52.4";
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.3

  it('52.4 can not set property, action', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          should.throws(
            function() {
              connection.module = "52.5";
            },
            /NJS-003: invalid connection/
          );
          done();
        });
      }
    );
  }); // 52.4

  it('52.5 can not call method, execute()', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);
          connection.execute(
            "select sysdate from dual",
            function(err, result) {
              should.not.exist(result);
              should.exist(err);
              should.strictEqual(
                err.message,
                "NJS-003: invalid connection"
              );
              done();
            }
          );
        });
      }
    );
  }); // 52.5

  it('52.6 can not call method, break()', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);

          connection.break(function(err) {
            should.exist(err);
            should.strictEqual(
              err.message,
              "NJS-003: invalid connection"
            );
            done();
          });
        });
      }
    );
  }); // 52.6

  it('52.7 can not call method, commit()', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);

          connection.commit(function(err) {
            should.exist(err);
            should.strictEqual(
              err.message,
              "NJS-003: invalid connection"
            );
            done();
          });
        });
      }
    );
  }); // 52.7

  it('52.8 can not call method, createLob()', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);

          connection.createLob(oracledb.CLOB, function(err, lob) {
            should.exist(err);
            should.not.exist(lob);
            should.strictEqual(
              err.message,
              "NJS-003: invalid connection"
            );
            done();
          });
        });
      }
    );
  }); // 52.8

  it('52.9 can not call method, queryStream()', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);

          var stream = connection.queryStream("select sysdate from dual");
          should.exist(stream);

          stream.on("data", function(data) {
            should.not.exist(data);
          });

          stream.on("end", function() {
            done(new Error("should not emit 'end' event!"));
          });

          stream.on("error", function(err) {
            should.exist(err);
            should.strictEqual(
              err.message,
              "NJS-003: invalid connection"
            );
            done();
          });
        });
      }
    );
  }); // 52.9

  it('52.10 can not call release() multiple times', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);

          connection.release(function(err) {
            should.exist(err);
            should.strictEqual(
              err.message,
              "NJS-003: invalid connection"
            );
            done();
          });
        });
      }
    );
  }); // 52.10

  it('52.11 can not call method, rollback()', function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);

          connection.rollback(function(err) {
            should.exist(err);
            should.strictEqual(
              err.message,
              "NJS-003: invalid connection"
            );
            done();
          });
        });
      }
    );
  }); // 52.11

  it("52.12 can access properties of closed connection without error", function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);

        connection.release(function(err) {
          should.not.exist(err);

          should.strictEqual(connection.stmtCacheSize, undefined);
          should.strictEqual(connection.oracleServerVersion, undefined);
          should.strictEqual(connection.oracleServerVersionString, undefined);
          should.strictEqual(connection.action, null);
          should.strictEqual(connection.clientId, null);
          should.strictEqual(connection.module, null);
          done();
        });
      }
    );
  }); // 52.12

});
