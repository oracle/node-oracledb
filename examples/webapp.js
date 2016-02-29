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
 * NAME
 *   webapp.js
 *
 * DESCRIPTION
 *   Shows a web based query using connections from connection pool.
 *
 *   This displays a table of employees in the specified department.
 *
 *   The script creates an HTTP server listening on port 7000 and
 *   accepts a URL parameter for the department ID, for example:
 *   http://localhost:7000/90
 *
 *   Uses Oracle's sample HR schema.  Scripts to create the HR schema
 *   can be found at: https://github.com/oracle/db-sample-schemas
 *
 *****************************************************************************/

var http     = require('http');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var portid = 7000;    // HTTP listening port number

// Main entry point.  Creates a connection pool, on callback creates an
// HTTP server and executes a query based on the URL parameter given.
// The pool values shown are the default values.
oracledb.createPool (
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString,
    poolMax       : 4, // maximum size of the pool
    poolMin       : 0, // let the pool shrink completely
    poolIncrement : 1, // only grow the pool by one connection at a time
    poolTimeout   : 0  // never terminate idle connections
  },
  function(err, pool)
  {
    if (err) {
      console.error("createPool() callback: " + err.message);
      return;
    }

    // Create HTTP server and listen on port - portid
    var hs = http.createServer (
      function(request, response)  // Callback gets HTTP request & response object
      {
        var urlparts = request.url.split("/");
        var deptid   = urlparts[1];

        htmlHeader(response,
                   "Oracle Database Driver for Node.js" ,
                   "Example using node-oracledb driver");

        if (deptid != parseInt(deptid)) {
          handleError(response, 'URL path "' + deptid +
                      '" is not an integer.  Try http://localhost:' + portid + '/30', null);
          return;
        }

        // Checkout a connection from the pool
        pool.getConnection (
          function(err, connection)
          {
            if (err) {
              handleError(response, "getConnection() failed ", err);
              return;
            }

            // console.log("Connections open: " + pool.connectionsOpen);
            // console.log("Connections in use: " + pool.connectionsInUse);

            connection.execute(
              "SELECT   employee_id, first_name, last_name " +
                "FROM   employees " +
                "WHERE  department_id = :id",
              [deptid],  // bind variable value
              function(err, result)
              {
                if (err) {
                  connection.release(
                    function(err)
                    {
                      if (err) {
                        handleError(response, "execute() error release() callback", err);
                        return;
                      }
                    });
                  handleError(response, "execute() callback", err);
                  return;
                }

                displayResults(response, result, deptid);

                /* Release the connection back to the connection pool */
                connection.release(
                  function(err)
                  {
                    if (err) {
                      handleError(response, "normal release() callback", err);
                    } else {
                      htmlFooter(response);
                    }
                  });

              });
          });
      });

    hs.listen(portid, "localhost");

    console.log("Server running at http://localhost:" + portid);
  });


// Report an error
function handleError(response, text, err)
{
  if (err) {
    text += err.message;
  }
  console.error(text);
  response.write("<p>Error: " + text + "</p>");
  htmlFooter(response);
}


// Display query results
function displayResults(response, result, deptid)
{
  response.write("<h2>" + "Employees in Department " + deptid + "</h2>");
  response.write("<table>");

  // Column Title
  response.write("<tr>");
  for (var col = 0; col < result.metaData.length; col++) {
    response.write("<td>" + result.metaData[col].name + "</td>");
  }
  response.write("</tr>");

  // Rows
  for (var row = 0; row < result.rows.length; row++) {
    response.write("<tr>");
    for (col = 0; col < result.rows[row].length; col++) {
      response.write("<td>" + result.rows[row][col] + "</td>");
    }
    response.write("</tr>");
  }
  response.write("</table>");
}


// Prepare HTML header
function htmlHeader(response, title, caption)
{
  response.writeHead (200, {"Content-Type" : "text/html" });
  response.write     ("<!DOCTYPE html>");
  response.write     ("<html>");
  response.write     ("<head>");
  response.write     ("<style>" +
                      "body {background:#FFFFFF;color:#000000;font-family:Arial,sans-serif;margin:40px;padding:10px;font-size:12px;text-align:center;}" +
                      "h1 {margin:0px;margin-bottom:12px;background:#FF0000;text-align:center;color:#FFFFFF;font-size:28px;}" +
                      "table {border-collapse: collapse;   margin-left:auto; margin-right:auto;}" +
                      "td {padding:8px;border-style:solid}" +
                     "</style>\n");
  response.write     ("<title>" + caption + "</title>");
  response.write     ("</head>");
  response.write     ("<body>");
  response.write     ("<h1>" + title + "</h1>");
}


// Prepare HTML footer
function htmlFooter(response)
{
  response.write("</body>\n</html>");
  response.end();
}

process
.on('SIGTERM', function() {
  console.log("\nTerminating");
  process.exit(0);
})
.on('SIGINT', function() {
  console.log("\nTerminating");
  process.exit(0);
});
