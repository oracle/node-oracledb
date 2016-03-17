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
 *   57. nestedCursor.js
 *
 * DESCRIPTION
 *   Testing nested cursor.
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
var should = require('should');
var async = require('async');
var dbConfig = require('./dbconfig.js');

describe('57. nestedCursor.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
 
	var createParentTable = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE test_parent_tab'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE test_parent_tab ( \
                  id NUMBER,  \
                  description VARCHAR2(32), \
                  CONSTRAINT parent_tab_pk PRIMARY KEY (id) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_parent_tab (id, description)  \
                   VALUES \
                   (1,''Parent 1'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_parent_tab (id, description)  \
                   VALUES \
                   (2,''Parent 2'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_parent_tab (id, description)  \
                   VALUES \
                   (3,''Parent 3'') \
          '); \
      END; ";

  var createChildTable = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE test_child_tab'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE test_child_tab ( \
                  id NUMBER,  \
                  parent_id NUMBER, \
                  description VARCHAR2(32), \
                  CONSTRAINT child_tab_pk PRIMARY KEY (id), \
                  CONSTRAINT child_parent_fk FOREIGN KEY (parent_id) REFERENCES test_parent_tab(id) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_child_tab (id, parent_id, description)  \
                   VALUES \
                   (1, 1, ''Child 1'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_child_tab (id, parent_id, description)  \
                   VALUES \
                   (2, 1, ''Child 2'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_child_tab (id, parent_id, description)  \
                   VALUES \
                   (3, 2, ''Child 3'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_child_tab (id, parent_id, description)  \
                   VALUES \
                   (4, 2, ''Child 4'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_child_tab (id, parent_id, description)  \
                   VALUES \
                   (5, 2, ''Child 5'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO test_child_tab (id, parent_id, description)  \
                   VALUES \
                   (6, 3, ''Child 6'') \
          '); \
      END; ";

  var cursorExpr = 
      "CREATE OR REPLACE PROCEDURE cursor_parent_child (p_out OUT SYS_REFCURSOR) \
           AS \
           BEGIN \
             OPEN p_out FOR \
               SELECT p ";
  
  var connection = false;
  before(function(done) {
    async.series([
      function(callback) {
        oracledb.getConnection(
          credential,
          function(err, conn) {
            connection = conn;
            callback();
          }
        );
      },
      function(callback) {
        connection.should.be.ok;
        connection.execute(
          createParentTable,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.should.be.ok;
        connection.execute(
          createChildTable,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);

  })

  after(function(done) {
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE test_child_tab",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP TABLE test_parent_tab",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.release( function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  })
  
  function fetchOneRowFromRS(rs, cb) {
    rs.getRow(function(err, row) {
      if(err) {
        // console.error("Error at accessing RS: " + err.message);
        // NJS-010: unsupported data type in select list
        (err.message).should.startWith('NJS-010');
        rs.close(function(err) {
          should.not.exist(err);
          cb();
        });
      } else if(row) {
        console.log(row);
        fetchOneRowFromRS(rs, cb);
      } else {
        rs.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    });
  }
  
  it('57.1 testing nested cursor support - result set', function(done) {
    connection.should.be.ok;
    
    var sql = 
        "SELECT p.description, \
             CURSOR( \
               SELECT c.description   \
               FROM test_child_tab c   \
               WHERE c.parent_id = p.id  \
             ) children  \
         FROM test_parent_tab p";

    connection.execute(
      sql,
      [],
      { resultSet: true },
      function(err, result) {
        should.not.exist(err);
        should.exist(result.resultSet);
        fetchOneRowFromRS(result.resultSet, done);
      }
    );

  })

  it('57.2 testing nested cursor support - REF Cursor', function(done) {
    var testproc =
        "CREATE OR REPLACE PROCEDURE get_family_tree(p_out OUT SYS_REFCURSOR)  \
           AS \
           BEGIN \
             OPEN p_out FOR  \
               SELECT p.description, \
                 CURSOR( \
                   SELECT c.description   \
                   FROM test_child_tab c   \
                   WHERE c.parent_id = p.id  \
                 ) children  \
               FROM test_parent_tab p;  \
           END; "; 
    
    async.series([
      function(callback) {
        connection.execute(
          testproc,
          function(err, result) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "BEGIN get_family_tree(:out); END;",
          {
            out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
          },
          function(err, result) {
            should.not.exist(err);
            fetchOneRowFromRS(result.outBinds.out, callback);
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PROCEDURE get_family_tree",
          function(err, result) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
})
