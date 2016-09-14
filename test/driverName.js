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
 *   69. driverName.js
 *
 * DESCRIPTION
 *   Testing external authentication functionality.
 *
 *   Note that enabling the externalAuth feature requires configuration on the
 *   database besides setting "externalAuth" attribute to be true. Please refer
 *   to api doc about the configuration.
 *   https://github.com/oracle/node-oracledb/blob/master/doc/api.md#extauth
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

describe('69. driverName.js', function() {

  var getAddonVer = function() {
    var addonVer = oracledb.version;
    var major    = Math.floor (addonVer / 10000);
    var minor    = Math.floor(addonVer / 100) % 100;
    var update   = addonVer % 100;

    return (major + '.' + minor + '.' + update);
  };

  it("69.1 checks the driver name", function(done) {

    async.waterfall([
      function(cb) {
        oracledb.createPool(dbConfig, cb);
      },
      function(pool, cb) {
        pool.should.be.ok();
        pool.getConnection( function(err, connection) {
          cb(err, connection, pool);
        });
      },
      function(connection, pool, cb) {
        var sql = "select distinct client_driver from v$session_connect_info where sid = sys_context('USERENV', 'SID')";
        connection.should.be.ok();
        connection.execute(
          sql,
          function(err, result) {

            var serverVer = connection.oracleServerVersion;
            var dbVerMajor = Math.floor( serverVer / 100000000 );

            // 12c database can return the full driver name, e.g. 'node-oracledb 1.11'
            if(dbVerMajor == 12) {
              var addonVer = getAddonVer();
              (result.rows[0][0].trim()).should.equal("node-oracledb : " + addonVer);
            }
            // 11g database only returns the first 8 characters of the driver name
            else if(dbVerMajor == 11) {
              (result.rows[0][0]).should.equal("node-ora");
            }

            cb(err, connection, pool);
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
    }); // async

  });
});
