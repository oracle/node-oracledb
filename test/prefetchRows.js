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
 *   147. prefetchRows.js
 *
 * DESCRIPTION
 *   prefetchRows is deprecated and removed from the oracledb object.
 *   Users can set it but it has no effect since it treated like a user property.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe("147. prefetchRows.js", function() {

  var connection = null;
  var defaultVal = oracledb.prefetchRows;

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  after(function(done) {
    should.strictEqual(defaultVal, undefined);
    oracledb.prefetchRows = defaultVal;
    connection.close(function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe("147.1 oracledb.prefetchRows", function() {

    var testGlobalOption = function(values, cb) {
      should.doesNotThrow(
        function() {
          oracledb.prefetchRows = values;
        }
      );

      connection.execute(
        "select 'oracledb.prefetchRows' from dual",
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rows[0][0], "oracledb.prefetchRows");
          cb();
        }
      );
    };

    it("147.1.1 oracledb.prefetchRows = 0", function(done) {
      testGlobalOption(0, done);
    });

    it("147.1.2 oracledb.prefetchRows = NaN", function(done) {
      testGlobalOption(NaN, done);
    });

    it("147.1.3 oracledb.prefetchRows = undefined", function(done) {
      testGlobalOption(undefined, done);
    });

    it("147.1.4 oracledb.prefetchRows = null", function(done) {
      testGlobalOption(null, done);
    });

    it("147.1.5 oracledb.prefetchRows = random string", function(done) {
      testGlobalOption("random string", done);
    });

    it("147.1.6 oracledb.prefetchRows = Boolean", function(done) {
      testGlobalOption(true, done);
    });

  });

  describe("147.2 execute() option prefetchRows", function() {

    var testExecOption = function(values, cb) {
      connection.execute(
        "select 'prefetchRows' from dual",
        [],
        { prefetchRows: values },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.rows[0][0], "prefetchRows");
          cb();
        }
      );
    };

    it("147.2.2 prefetchRows = 0", function(done) {
      testExecOption(0, done);
    });

    it("147.2.2 prefetchRows = NaN", function(done) {
      testExecOption(NaN, done);
    });

    it("147.2.3 prefetchRows = undefined", function(done) {
      testExecOption(undefined, done);
    });

    it("147.2.4 prefetchRows = null", function(done) {
      testExecOption(null, done);
    });

    it("147.2.5 prefetchRows = random string", function(done) {
      testExecOption("random string", done);
    });

    it("147.2.6 prefetchRows = Boolean", function(done) {
      testExecOption(true, done);
    });

  });

});
