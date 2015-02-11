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
 *   Uses Oracle's sample HR schema.
 *
 *****************************************************************************/

var sys      = require('sys');
var http     = require('http');
var url      = require('url');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var portid = 7000;    // HTTP listening port number

// Main entry point.  Creates a connection pool, on callback creates an
// HTTP server and executes a query based on the URL parameter given
// The pool values are arbitrary for the sake of showing how to set the properties.
oracledb.createPool (
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString,
    poolMax       : 44,
    poolMin       : 2,
    poolIncrement : 5,
    poolTimeout   : 4
  },
  function(err, pool)
  {
    if (err) {
      console.error('createPool() callback: ' + err.message);
      return;
    }

    // Create HTTP server and listen on port - portid
    hs = http.createServer (
      function(req, res)  // Callback gets HTTP request & response object
      {
        var urlparts = req.url.split("/");
        var deptid   = urlparts[1];

        if (deptid != parseInt(deptid)) {
          console.error('Argument "' + deptid + '" is not an integer');
          return;
        }

        htmlheader(res,
                   "Oracle Database Driver for Node.js" ,
                   "Example using node-oracledb driver");

        // Checkout a connection from the pool
        pool.getConnection (
          function(err, connection)
          {
            if (err) {
              console.error('getConnection() callback: ' + err.message);
              htmlerror(res, "getConnection() failed ", err);
              return;
            }

            //console.log('Connections open: ' + pool.connectionsOpen);
            //console.log('Connections in use: ' + pool.connectionsInUse);

            connection.execute(
              "SELECT employee_id, first_name, last_name "
            + "FROM   employees "
            + "WHERE  department_id = :id",
              [deptid],  // bind variable value
              function(err, result)
              {
                if (err) {
                  console.error('execute() callback: ' + err.message);
                  htmlerror(res, "execute() callback", err);
                  return;
                }
                
                // Employee table title
                htmlh2title(res, "Employees in Department " + deptid);
                
                // Output as table
                htmltablestart(res);
                
                // Column Title
                htmlrowstart(res);
                htmlcell(res, "Employee id");
                htmlcell(res, "First Name");
                htmlcell(res, "Last Name");
                
                for (i = 0; i < result.rows.length; i ++) {
                  htmlrowstart(res);
                  for (j = 0; j < result.rows[i].length; j ++) {
                    htmlcell(res, result.rows[i][j]);
                  }
                  htmlrowend(res);
                }
                htmltableend(res);

                /* Release the connection back to the connection pool */
                connection.release(
                  function(err)
                  {
                    if (err) {
                      console.error('release() callback: ' + err.message);
                      htmlerror(res, "release() callback", err);
                      return;
                    }
                    htmlfooter(res);
                  });
              });
          });
      });

    hs.listen(portid, "localhost");
    
    sys.puts("Server running at http://localhost:" + portid);
  });

// To prepare HTML header
function htmlheader(res, title, caption)
{
  res.writeHead (200, {'Content-Type' : 'text/html' });
  res.write     ("<!DOCTYPE html>");
  res.write     ("<html>");
  res.write     ("<head>");
  res.write     ("<style>"
                + "body {background:#FFFFFF;color:#000000;font-family:Arial,sans-serif;margin:40px;padding:10px;font-size:12px;text-align:center;}"
                + "h1 {margin:0px;margin-bottom:12px;background:#FF0000;text-align:center;color:#FFFFFF;font-size:28px;}"
                + "table {border-collapse: collapse;   margin-left:auto; margin-right:auto;}"
                + "td {padding:8px;border-style:solid}"
                + "</style>\n");
  res.write     ("<title>" + caption + "</title>");
  res.write     ("</head>");
  res.write     ("<body>");
  res.write     ("<h1>" + title + "</h1>");
}

// To prepare HTML footer
function htmlfooter(res)
{
  res.write("</body>\n</html>");
  res.end();
}

// To display error in HTML
function htmlerror(res, text, err)
{
  res.write("<p>ERROR " + text + " " + err.message + "</p>");
  htmlfooter(res);
}

// To start TABLE tag
function htmltablestart(res)
{
  res.write("<table>");
}

// To end the TABLE tag
function htmltableend(res)
{
  res.write("</table>");
}

// To add h2 title
function htmlh2title(res, title)
{
  res.write("<h2>" + title + "</h2>");
}

// To add row in a table
function htmlrowstart(res)
{
  res.write("<tr>");
}

// To end row in a table
function htmlrowend(res)
{
  res.write("</tr>");
}

// To add a cell in the table
function htmlcell(res, text)
{
  res.write("<td>" + text + "</td>");
}
