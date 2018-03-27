/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   endtoend.js
 *
 * DESCRIPTION
 *   Show setting connection metadata for end-to-end tracing and client authorization.
 *   While the script sleeps (keeping the connection open), use SQL*Plus as SYSTEM to execute:
 *      SELECT username, client_identifier, action, module FROM v$session WHERE username IS NOT NULL;
 *   The end-to-end tracing attributes are shown in various other DBA views and in Enterprise Manager.
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
  function(err, connection) {
    if (err) { console.error(err.message); return;    }

    // These end-to-end tracing attributes are sent to the database on
    // the next 'round trip' i.e. with execute()
    connection.clientId = "Chris";
    connection.module = "End-to-end example";
    connection.action = "Query departments";

    connection.execute("SELECT * FROM dual",
      function(err, result) {
        if (err) { doRelease(connection); console.error(err.message); return; }
        console.log(result.rows);
        // Sleep 10 seconds to keep the connection open.  This allows
        // external queries on V$SESSION to show the connection
        // attributes.
        console.log("Use SQL*Plus as SYSTEM to execute:");
        console.log("SELECT username, client_identifier, action, module FROM v$session WHERE username = UPPER('" + dbConfig.user +"');");
        setTimeout(function() {
          doRelease(connection);
        }, 10000);
      });
  });

// Release the connection
function doRelease(connection) {
  connection.close(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}
