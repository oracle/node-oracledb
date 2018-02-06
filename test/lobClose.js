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
 *   54. lobClose.js
 *
 * DESCRIPTION
 *   Negative cases against closed LOB object.
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
var dbConfig = require('./dbconfig.js');
var fs       = require('fs');

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

  it.skip('54.2 can not call close() multiple times', function(done) {

    conn.createLob(
      oracledb.CLOB,
      function(err, lob) {
        should.not.exist(err);

        lob.close(function(err) {
          should.not.exist(err);

          lob.close(function(err) {
            should.exist(err);
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
            //should.not.exist(err, "lob.on 'error' event.");
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

});
