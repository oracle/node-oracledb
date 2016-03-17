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
 *   63. autoCommit4nestedExecutes.js
 *
 * DESCRIPTION
 *   Nested executes where the 2nd execute fails used to cause an unexpected 
 *   commit, even though the autoCommit:false setting is enabled at the 
 *   execute() and/or oracledb level. This is github issue 269. It has 
 *   been fixed in 1.4.
 * 
 *   https://github.com/oracle/node-oracledb/issues/269
 *   
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards     are for other tests 
 * 
 *****************************************************************************/
'use strict'; 

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('63. autoCommit4nestedExecutes.js', function() {
	
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  var tableName  = "oracledb_issue269tab";
  var procName   = "issue269proc";
  var connection = null;

  before('prepare table and procedure', function(done) {

    var sqlCreateTab = 
        " BEGIN "  
      + "   DECLARE " 
      + "     e_table_exists EXCEPTION; " 
      + "     PRAGMA EXCEPTION_INIT(e_table_exists, -00942); "  
      + "   BEGIN " 
      + "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); "
      + "   EXCEPTION "
      + "     WHEN e_table_exists "
      + "     THEN NULL; "
      + "   END;  "
      + "   EXECUTE IMMEDIATE (' "
      + "     CREATE TABLE " + tableName + " ( "
      + "       myts timestamp, p_iname VARCHAR2(40), "
      + "       p_short_name VARCHAR2(40), p_comments VARCHAR2(40) "   
      + "     ) " 
      + "   '); " 
      + " END; "; 

    var sqlCreateProc = 
        " CREATE OR REPLACE PROCEDURE " + procName + "(p_iname IN VARCHAR2, "
      + "   p_short_name IN VARCHAR2, p_comments IN VARCHAR2, p_new_id OUT NUMBER, p_status OUT NUMBER, " 
      + "   p_description OUT VARCHAR2) "
      + " AS "
      + " BEGIN "
      + "   p_description := p_iname || ' ' || p_short_name || ' ' || p_comments; " 
      + "   p_new_id := 1; "
      + "   p_status := 2; "
      + "   insert into " + tableName + " values (systimestamp, p_iname, p_short_name, p_comments); "
      + " END; ";
    
    async.series([
      function(cb) {
        oracledb.getConnection(credential, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
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
          sqlCreateProc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }) // before

  after('drop table and procedure', function(done) {
    async.series([
      function(cb) {
        connection.execute(
          "DROP PROCEDURE " + procName,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.execute(
          "DROP TABLE " + tableName,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }
    ], done);
  }) // after

  it('63.1 nested execute() functions', function(done) {
    
    var pool = null,
        conn = null;
    // sql will be the same for both execute calls 
    var procSql = "BEGIN " + procName + "(p_iname=>:p_iname, p_short_name=>:p_short_name, "
                  + " p_comments=>:p_comments, p_new_id=>:p_new_id, p_status=>:p_status, "
                  + " p_description=>:p_description); END;"; 
    
    // Two execute() uses the same bindVar which conflicts occur
    var bindVar = 
        { 
          p_iname: "Test iname", 
          p_short_name: "TST", 
          p_comments: "Test comments", 
          p_new_id: { 
            type: oracledb.NUMBER, 
            dir: oracledb.BIND_OUT 
          }, 
          p_status: { 
            type: oracledb.NUMBER, 
            dir: oracledb.BIND_OUT 
          }, 
          p_description: { 
            type: oracledb.STRING, 
            dir: oracledb.BIND_OUT 
          } 
        }; 

    async.series([
      function getPool(cb) {
        oracledb.createPool(
          credential,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;
            cb();
          }
        );
      },
      function getConn(cb) {
        pool.getConnection( function(err, connecting) {
          should.not.exist(err);
          conn = connecting;
          cb();
        });
      },
      function excute1(cb) {
        conn.execute(
          procSql,
          { 
            p_iname: "Test iname", 
            p_short_name: "TST", 
            p_comments: "Test comments", 
            p_new_id: { 
              type: oracledb.NUMBER, 
              dir: oracledb.BIND_OUT 
            }, 
            p_status: { 
              type: oracledb.NUMBER, 
              dir: oracledb.BIND_OUT 
            }, 
            p_description: { 
              type: oracledb.STRING, 
              dir: oracledb.BIND_OUT 
            } 
          },
          { autoCommit: false },
          function(err, result) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function execute2(cb) {
        conn.execute(
          procSql,
          { 
            p_iname123: "Test iname", // specify wrong bind parameter name to cause an error 
            p_short_name: "TST", 
            p_comments: "Test comments", 
            p_new_id: { 
              type: oracledb.NUMBER, 
              dir: oracledb.BIND_OUT 
            }, 
            p_status: { 
              type: oracledb.NUMBER, 
              dir: oracledb.BIND_OUT 
            }, 
            p_description: { 
              type: oracledb.STRING, 
              dir: oracledb.BIND_OUT 
            } 
          },
          { autoCommit: false },
          function(err, result) {
            should.exist(err);
            // ORA-01036: illegal variable name/number
            (err.message).should.startWith('ORA-01036');
            cb();
          }
        );
      },
      function(cb) {
        conn.release(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        pool.terminate(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function verifyTabContent(cb) {
        connection.execute(
          "SELECT count(*) as amount FROM " + tableName,
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].AMOUNT).should.be.exactly(0);
            cb();
          }
        );
      }
    ], done);
  })

})
