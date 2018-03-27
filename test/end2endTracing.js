/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   159. end2endTracing.js
 *
 * DESCRIPTION
 *   Test settings of end-to-end tracing attributes.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('159. end2endTracing.js', function() {

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

  var verify = function(sql, expect, callback) {
    conn.execute(
      sql,
      function(err, result) {
        should.not.exist(err);
        should.strictEqual(
          result.rows[0][0],
          expect
        );
        callback();
      }
    );
  };

  it('159.1 set the end-to-end tracing attribute - module', function(done) {

    var sql = "select sys_context('userenv', 'module') from dual";
    var testValue = "MODULE";
    conn.module = testValue;
    verify(sql, testValue, done);

  });

  it('159.2 set the tracing attribute - action', function(done) {

    var sql = "select sys_context('userenv', 'action') from dual";
    var testValue = "ACTION";
    conn.action = testValue;
    verify(sql, testValue, done);

  });

  it('159.3 set the tracing attribure - clientId', function(done) {

    var sql = "select sys_context('userenv', 'client_identifier') from dual";
    var testValue = "CLIENTID";
    conn.clientId = testValue;
    verify(sql, testValue, done);

  });
});