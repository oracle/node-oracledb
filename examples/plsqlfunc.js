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
 *   plsqlfunc.js
 *
 * DESCRIPTION
 *   Show calling a PL/SQL function
 *   Use demo.sql to create the required function or do:
 *
 *   CREATE OR REPLACE FUNCTION testfunc (p1_in IN VARCHAR2, p2_in IN VARCHAR2) RETURN VARCHAR2
 *   AS
 *   BEGIN
 *     RETURN p1_in || p2_in;
 *   END;
 *   /
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
  function (err, connection) {
    if (err) { console.error(err.message); return; }

    var bindvars = {
      p1:  'Chris', // Bind type is determined from the data.  Default direction is BIND_IN
      p2:  'Jones',
      ret:  { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 }
    };
    connection.execute(
      "BEGIN :ret := testfunc(:p1, :p2); END;",
      // The equivalent call with PL/SQL named parameter syntax is:
      // "BEGIN :ret := testfunc(p1_in => :p1, p2_in => :p2); END;",
      bindvars,
      function (err, result) {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log(result.outBinds);
        doRelease(connection);
      });
  });

function doRelease(connection) {
  connection.close(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}
