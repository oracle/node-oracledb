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
 *   selectjson.js
 *
 * DESCRIPTION
 *   Executes a query from a JSON table.
 *   Requires Oracle Database 12.1.0.2, which has extensive JSON datatype support.
 *   See http://docs.oracle.com/database/121/ADXDB/json.htm#CACGCBEG
 *   Use demo.sql to create the required table or do:
 *
 *   DROP TABLE j_purchaseorder;
 *   CREATE TABLE j_purchaseorder
 *   (po_document VARCHAR2(4000) CONSTRAINT ensure_json CHECK (po_document IS JSON));
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
  function(err, connection)
  {
    if (err) {
      console.error(err.message);
      return;
    }

    var data = { "userId": 1, "userName": "Chris", "location": "Australia" };
    var s = JSON.stringify(data);

    connection.execute(
      "INSERT INTO j_purchaseorder (po_document) VALUES (:bv)",
      [s], // bind the JSON string for inserting into the JSON column.
      { autoCommit: true },
      function (err) {
        if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
        }
        console.log("Data inserted successfully.");
        connection.execute(
          "SELECT po_document FROM j_purchaseorder WHERE JSON_EXISTS (po_document, '$.location')",
          function(err, result)
          {
            if (err) {
              console.error(err.message);
            } else {
              js = JSON.parse(result.rows[0][0]);  // just show first record
              console.log('Query results: ', js);
            }
            doRelease(connection);
          });
      });
  });

function doRelease(connection)
{
  connection.release(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}
