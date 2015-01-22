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
 *   Oracle Database 12.1.0.2 has extensive JSON datatype support.
 * 
 *   Use demo.sql to create the required table or do:
 * 
 *   DROP TABLE j_purchaseorder;
 * 
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
    
    var data = { "userId": 1, "userName": "Chris" };
    var s = JSON.stringify(data);
    
    connection.execute(
      "INSERT INTO j_purchaseorder (po_document) VALUES (:bv)",
      [s],
      function (err) {
        if (err) {
          console.error(err.message);
          return;
        }
        connection.execute(
          "SELECT po_document FROM j_purchaseorder",
          function(err, result)
          {
            if (err) {
              console.error(err.message);
              return;
            }
            js = JSON.parse(result.rows[0][0]);
            console.log(js.userId, js.userName);
          });
      });
  });
