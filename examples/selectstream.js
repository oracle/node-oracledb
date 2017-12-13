/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   selectstream.js
 *
 * DESCRIPTION
 *   Executes a basic query using a Readable Stream.
 *   Uses Oracle's sample HR schema.
 *
 *   Scripts to create the HR schema can be found at:
 *   https://github.com/oracle/db-sample-schemas
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var rowcount = 0;

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

    var stream = connection.queryStream(
      'SELECT first_name, last_name FROM employees ORDER BY employee_id',
      [],  // no binds
      { fetchArraySize: 150 }  // internal buffer size for performance tuning
    );

    stream.on('error', function (error) {
      // console.log("stream 'error' event");
      console.error(error);
      return;
    });

    stream.on('metadata', function (metadata) {
      // console.log("stream 'metadata' event");
      console.log(metadata);
    });

    stream.on('data', function (data) {
      // console.log("stream 'data' event");
      console.log(data);
      rowcount++;
    });

    stream.on('end', function () {
      // console.log("stream 'end' event");
      console.log('Rows selected: ' + rowcount);
      connection.close(
        function(err) {
          if (err) {
            console.error(err.message);
          }
        });
    });
  });
