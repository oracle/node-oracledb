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
 * NAME
 *   insert2.js
 *
 * DESCRIPTION
 *   Show the auto commit behavior.
 *
 *   By default, node-oracledb does not commit on execute.
 *   The driver also has commit() and rollback() methods to explicitly control transactions.
 *
 *   Note: when a connection is closed, any open transaction will be committed.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection1)
  {
    if (err) {
      console.error(err.message);
      return;
    }
    connection1.execute(
      "CREATE TABLE test (id NUMBER, name VARCHAR2(20))",
      function(err)
      {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log("Table created");

        connection1.execute(
          "INSERT INTO test VALUES (:id, :nm)",
          [1, 'Chris'],  // Bind values
          { isAutoCommit: true},  // Override the default non-autocommit behavior
          function(err, result)
          {
            if (err) { console.error(err.message); return; }
            console.log("Rows inserted: " + result.rowsAffected);  // 1

            connection1.execute(
              "INSERT INTO test VALUES (:id, :nm)",
              [2, 'Alison'],  // Bind values
              // { isAutoCommit: true},  // Since this isn't set, operations using a second connection won't see this row
              function(err, result)
              {
                if (err) { console.error(err.message); return; }
                console.log("Rows inserted: " + result.rowsAffected);  // 1

                // Create a second connection
                oracledb.getConnection(
                  {
                    user          : dbConfig.user,
                    password      : dbConfig.password,
                    connectString : dbConfig.connectString
                  },
                  function(err, connection2)
                  {
                    if (err) {
                      console.error(err.message);
                      return;
                    }
                    connection2.execute(
                      "SELECT * FROM test",
                      function(err, result)
                      {
                        if (err) {
                          console.error(err.message);
                          return;
                        }
                        // This will only show 'Chris' because inserting 'Alison' is not commited by default.
                        // Uncomment the isAutoCommit option above and you will see both rows
                        console.log(result.rows);

                        connection1.execute(
                          "DROP TABLE test",
                          function(err)
                          {
                            if (err) { console.error(err.message); return; }
                            console.log("Table dropped");

                            connection2.release(
                              function(err)
                              {
                                if (err) { console.error(err.message); return; }
                                connection1.release(
                                  function(err)
                                  {
                                    if (err) { console.error(err.message); return; }
                                  });

                              });
                          });
                      });
                  });
              });
          });
      });
  });
