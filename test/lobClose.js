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
 *   54. lobClose.js
 *
 * DESCRIPTION
 *   Negative cases against closed LOB object.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var fs       = require('fs');
var async    = require('async');

describe('54. lobClose.js', function() {

  var conn;
  before(function(done) {
    oracledb.getConnection(
      dbConfig,
      function(err, connection) {
        should.not.exist(err);
        conn = connection;
        done();
      }
    );
  });

  after(function(done) {
    conn.close(function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('54.1 can access properties of closed LOB without error', function(done) {

    conn.createLob(
      oracledb.CLOB,
      function(err, lob) {
        should.not.exist(err);

        (lob.chunkSize).should.be.a.Number();
        (lob.pieceSize).should.be.a.Number();
        should.strictEqual(lob.length, 0);
        should.strictEqual(lob.type, oracledb.CLOB);

        lob.close(function(err) {
          should.not.exist(err);

          (lob.chunkSize).should.be.a.Number();
          (lob.pieceSize).should.be.a.Number();
          should.strictEqual(lob.length, 0);
          should.strictEqual(lob.type, oracledb.CLOB);

          done();
        });
      }
    );

  }); // 54.1

  it('54.2 can not call close() multiple times', function(done) {

    conn.createLob(
      oracledb.CLOB,
      function(err, lob) {
        should.not.exist(err);

        lob.close(function(err) {
          should.not.exist(err);

          lob.close(function(err) {
            should.not.exist(err);
            done();
          });
        }); // first close();
      }
    );
  }); // 54.2

  it('54.3 verify closed LOB', function(done) {

    conn.createLob(
      oracledb.CLOB,
      function(err, lob) {
        should.not.exist(err);

        lob.close(function(err) {
          should.not.exist(err);

          var inFileName = './test/clobexample.txt';
          var inStream = fs.createReadStream(inFileName);
          inStream.pipe(lob);

          inStream.on("error", function(err) {
            should.not.exist(err, "inStream.on 'error' event.");
          });

          lob.on("error", function(err) {
            should.strictEqual(
              err.message,
              "NJS-022: invalid Lob"
            );
            done();
          });

          lob.on('finish', function() {
            done(new Error("LOB emits 'finish' event!"));
          });

        }); // lob.close()
      }
    );
  }); // 54.3

  it('54.4 automatically close result sets and LOBs when the connection is closed', function(done) {

    var conn2 = null;
    var lob2 = null;
    async.series([
      function creatConn(cb) {
        oracledb.getConnection(
          dbConfig,
          function(err, connection) {
            should.not.exist(err);
            conn2 = connection;
            cb();
          }
        );
      },
      function createLOB(cb) {
        conn2.createLob(
          oracledb.CLOB,
          function(err, lob) {
            should.not.exist(err);
            lob2 = lob;
            cb();
          }
        );
      },
      function closeConn(cb) {
        conn2.close(cb);
      },
      function dotest(cb) {
      // Verify that lob2 gets closed automatically
        var inFileName = './test/clobexample.txt';
        var inStream = fs.createReadStream(inFileName);
        inStream.pipe(lob2);

        inStream.on("error", function(err) {
          should.not.exist(err, "inStream.on 'error' event.");
        });

        lob2.on("error", function(err) {
          should.strictEqual(
            err.message,
            "DPI-1040: LOB was already closed"
          );
          cb();
        });
      },
      function(cb) {
        (lob2.chunkSize).should.be.a.Number();
        (lob2.pieceSize).should.be.a.Number();
        should.strictEqual(lob2.length, 0);
        should.strictEqual(lob2.type, oracledb.CLOB);
        cb();
      }
    ], done);
  }); // 54.4

});
