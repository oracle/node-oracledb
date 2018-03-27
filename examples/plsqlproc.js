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
 *   plsqlproc.js
 *
 * DESCRIPTION
 *   Show calling a PL/SQL procedure and binding parameters in various ways
 *   Use demo.sql to create the required procedure or do:
 *
 *   CREATE OR REPLACE PROCEDURE testproc (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER)
 *     AS
 *   BEGIN
 *     p_inout := p_in || p_inout;
 *     p_out := 101;
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
      i:  'Chris',  // Bind type is determined from the data.  Default direction is BIND_IN
      io: { val: 'Jones', dir: oracledb.BIND_INOUT },
      o:  { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    connection.execute(
      "BEGIN testproc(:i, :io, :o); END;",
      // The equivalent call with PL/SQL named parameter syntax is:
      // "BEGIN testproc(p_in => :i, p_inout => :io, p_out => :o); END;",
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
