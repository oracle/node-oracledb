/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   64. sqlWithWarnings.js
 *
 * DESCRIPTION
 *   Testing to make sure OCI_SUCCESS_WITH_INFO is treated as OCI_SUCCESS
 *   Creating a PLSQL procedure with a SELECT query from a non-existing
 *   table will result in warnings (OCI_SUCCESS_WITH_INFO).
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests 
 * 
 *****************************************************************************/
"use strict";
 
var oracledb = require('oracledb');
var fs       = require('fs');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('64. sqlWithWarnings.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  var connection = null;
  before('get one connection', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  })

  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  })

  describe('64.1 test case offered by GitHub user', function() {
    
    var tableName = "test_aggregate";

    before('prepare table', function(done) {  
      var sqlCreateTab = 
        "BEGIN " + 
        "  DECLARE " +
        "    e_table_exists EXCEPTION; " +
        "    PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); " +
        "   EXCEPTION " +
        "     WHEN e_table_exists " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "     CREATE TABLE " + tableName +" ( " +
        "       num_col NUMBER " + 
        "     )" +
        "   '); " + 
        "END; ";

      async.series([
        function(cb) {
          connection.execute(
            sqlCreateTab,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "INSERT INTO " + tableName + " VALUES(1)",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "INSERT INTO " + tableName + " VALUES(null)",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.commit(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }) // before

    after(function(done) {
      connection.execute(
        "DROP TABLE " + tableName,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    })

    it('64.1.1 Executes an aggregate query which causes warnings', function(done) {
      connection.execute(
        "SELECT MAX(NUM_COL) AS NUM_COL FROM " + tableName,
        [],
        { maxRows: 1 },
        function(err, result) {
          should.not.exist(err);
          done();
        }
      );
    })

  }) // 64.1

  describe('64.2 PL/SQL - Success With Info', function() {
    
    var plsqlWithWarning = 
      " CREATE OR REPLACE PROCEDURE get_emp_rs_inout " +
      "   (p_in IN NUMBER, p_out OUT SYS_REFCURSOR ) AS " +
      "  BEGIN " +
      "    OPEN p_out FOR SELECT * FROM oracledb_employees " +
      "  END;"

    it('64.2.1 Execute SQL Statement to create PLSQL procedure with warnings', function(done) {
      connection.should.be.an.Object;
      connection.execute ( 
        plsqlWithWarning,
        function ( err, result ) {
          should.not.exist ( err );
          done();
        }
      );
    })

  }) // 64.2

})
