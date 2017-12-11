/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   148. fetchArraySize1.js
 *
 * DESCRIPTION
 *   Check the value settings of "fetchArraySize" property.
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

describe("148. fetchArraySize1.js", function() {

  var connection = null;
  var defaultVal = oracledb.fetchArraySize;

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.strictEqual(defaultVal, 100);
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after(function(done) {
    connection.close(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe("148.1 oracledb.fetchArraySize", function() {

    afterEach(function(done) {
      oracledb.fetchArraySize = defaultVal;
      done();
    });

    it("148.1.1 oracledb.fetchArraySize = 0", function(done) {
      checkError(0, done);
    });

    it("148.1.2 oracledb.fetchArraySize = 1", function(done) {
      checkGlobalOptionValue(1, 1, done);
    });

    it("148.1.3 Negative: oracledb.fetchArraySize = undefined", function(done) {
      checkError(undefined, done);
    });

    it("148.1.4 Negative: oracledb.fetchArraySize = null", function(done) {
      checkError(null, done);
    });

    it("148.1.5 Negative: oracledb.fetchArraySize = random string", function(done) {
      checkError("random string", done);
    });

    it("148.1.6 Negative: oracledb.fetchArraySize = Boolean", function(done) {
      checkError(true, done);
    });

    it("148.1.7 Negative: oracledb.fetchArraySize = NaN", function(done) {
      checkError(NaN, done);
    });

    it("148.1.8 oracledb.fetchArraySize = big number", function(done) {
      checkGlobalOptionValue(1000000, 1000000, done);
    });

  });

  describe("148.2 execute() option fetchArraySize", function() {

    it("148.2.1 fetchArraySize = 0", function(done) {
      queryExpectsError(0, done);
    });

    it("148.2.2 fetchArraySize = 1", function(done) {
      checkExecOptionValue(1, done);
    });

    it("148.2.3 fetchArraySize = undefined works as default value 100", function(done) {
      checkExecOptionValue(undefined, done);
    });

    it("148.2.4 Negative: fetchArraySize = null", function(done) {
      queryExpectsError(null, done);
    });

    it("148.2.5 Negative: fetchArraySize = random string", function(done) {
      queryExpectsError("random string", done);
    });

    it("148.2.6 Negative: fetchArraySize = Boolean", function(done) {
      queryExpectsError(false, done);
    });

    it("148.2.7 Negative: fetchArraySize = NaN", function(done) {
      queryExpectsError(NaN, done);
    });

    it("148.2.8 fetchArraySize = big number", function(done) {
      checkExecOptionValue(1000000, done);
    });

  });

  var checkGlobalOptionValue = function(values, expectedFetchArraySize, cb) {
    should.doesNotThrow(
      function() {
        oracledb.fetchArraySize = values;
      }
    );

    connection.execute(
      "select 'oracledb.fetchArraySize' from dual",
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(result.rows[0][0], "oracledb.fetchArraySize");
        should.strictEqual(oracledb.fetchArraySize, expectedFetchArraySize);
        cb();
      }
    );
  };

  var checkError = function(values, cb) {
    should.throws(
      function() {
        oracledb.fetchArraySize = values;
      },
      /NJS-004: invalid value for property fetchArraySize/
    );
    cb();
  };

  var checkExecOptionValue = function(values, cb) {
    connection.execute(
      "select 'fetchArraySize' from dual",
      [],
      { fetchArraySize: values },
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(oracledb.fetchArraySize, 100);
        should.strictEqual(result.rows[0][0], "fetchArraySize");
        cb();
      }
    );
  };

  var queryExpectsError = function(values, cb) {
    connection.execute(
      "select 'fetchArraySize' from dual",
      [],
      { fetchArraySize: values },
      function(err, result) {
        should.exist(err);
        should.not.exist(result);
        if( values === "random string" || values === false ) {
          should.strictEqual(err.message, "NJS-008: invalid type for \"fetchArraySize\" in parameter 3");
        } else {
          should.strictEqual(err.message, "NJS-007: invalid value for \"fetchArraySize\" in parameter 3");
        }
        cb();
      }
    );
  };

});
