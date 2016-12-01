/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   Note: Nested cursor is still not a supported data type. So NJS-010
 *         error is expected.
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
 var should   = require('should');
 var async    = require('async');
 var dbConfig = require('./dbconfig.js');

 describe('57. nestedCursor.js', function() {

   var connection = null;
   var createParentTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_parent_tab PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_parent_tab ( \
                  id NUMBER,  \
                  description VARCHAR2(32), \
                  CONSTRAINT nodb_parent_tab_pk PRIMARY KEY (id) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_parent_tab (id, description)  \
                   VALUES \
                   (1,''Parent 1'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_parent_tab (id, description)  \
                   VALUES \
                   (2,''Parent 2'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_parent_tab (id, description)  \
                   VALUES \
                   (3,''Parent 3'') \
          '); \
      END; ";

   var createChildTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_child_tab PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_child_tab ( \
                  id NUMBER,  \
                  parent_id NUMBER, \
                  description VARCHAR2(32), \
                  CONSTRAINT nodb_child_tab_pk PRIMARY KEY (id), \
                  CONSTRAINT nodb_child_parent_fk FOREIGN KEY (parent_id) REFERENCES nodb_parent_tab(id) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_child_tab (id, parent_id, description)  \
                   VALUES \
                   (1, 1, ''Child 1'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_child_tab (id, parent_id, description)  \
                   VALUES \
                   (2, 1, ''Child 2'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_child_tab (id, parent_id, description)  \
                   VALUES \
                   (3, 2, ''Child 3'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_child_tab (id, parent_id, description)  \
                   VALUES \
                   (4, 2, ''Child 4'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_child_tab (id, parent_id, description)  \
                   VALUES \
                   (5, 2, ''Child 5'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_child_tab (id, parent_id, description)  \
                   VALUES \
                   (6, 3, ''Child 6'') \
          '); \
      END; ";

   before(function(done) {
     async.series([
       function(callback) {
         oracledb.getConnection(
           {
             user: dbConfig.user,
             password: dbConfig.password,
             connectString: dbConfig.connectString
           },
          function(err, conn) {
            connection = conn;
            callback();
          }
        );
       },
       function(callback) {
         connection.should.be.ok();
         connection.execute(
          createParentTable,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
       },
       function(callback) {
         connection.should.be.ok();
         connection.execute(
          createChildTable,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
       }
     ], done);

   });

   after(function(done) {
     async.series([
       function(callback) {
         connection.execute(
          "DROP TABLE nodb_child_tab PURGE",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
       },
       function(callback) {
         connection.execute(
          "DROP TABLE nodb_parent_tab PURGE",
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
   });

   it('57.1 testing nested cursor support - result set', function(done) {
     connection.should.be.ok();

     var sql =
        "SELECT p.description, \
             CURSOR( \
               SELECT c.description   \
               FROM nodb_child_tab c   \
               WHERE c.parent_id = p.id  \
             ) children  \
         FROM nodb_parent_tab p";

     connection.execute(
      sql,
      [],
      { resultSet: true },
      function(err, result) {
        should.exist(err);
        (err.message).should.startWith('NJS-010:');
        // NJS-010: unsupported data type in select list
        should.not.exist(result);
        done();
      }
    );

   }); // 57.1

   it('57.2 testing nested cursor support - REF Cursor', function(done) {
     var testproc =
        "CREATE OR REPLACE PROCEDURE nodb_get_family_tree(p_out OUT SYS_REFCURSOR)  \
           AS \
           BEGIN \
             OPEN p_out FOR  \
               SELECT p.description, \
                 CURSOR( \
                   SELECT c.description   \
                   FROM nodb_child_tab c   \
                   WHERE c.parent_id = p.id  \
                 ) children  \
               FROM nodb_parent_tab p;  \
           END; ";

     async.series([
       function(callback) {
         connection.execute(
          testproc,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
       },
       function(callback){
         connection.execute(
          "BEGIN nodb_get_family_tree(:out); END;",
           {
             out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
           },
          function(err, result) {
            should.exist(err);
            (err.message).should.startWith('NJS-010:');
            // NJS-010: unsupported data type in select list
            should.not.exist(result);
            callback();
          }
        );
       },
       function(callback) {
         connection.execute(
          "DROP PROCEDURE nodb_get_family_tree",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
       }
     ], done);
   }); // 57.2

 });
