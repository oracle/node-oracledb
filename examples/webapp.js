/* Copyright (c) 2015, 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   webapp.js
 *
 * DESCRIPTION
 *   A web based application displaying banana harvest details.
 *
 *   The script creates an HTTP server listening on port 7000 and accepts a URL
 *   parameter for the banana farmer ID, for example: http://localhost:7000/3
 *
 *   In some networks forced pool termination may hang unless you have
 *   'disable_oob=on' in sqlnet.ora, see
 *   https://node-oracledb.readthedocs.io/en/latest/user_guide/connection_handling.html#limiting-the-time-taken-to-execute-statements
 *
 *   In production applications, set poolMin=poolMax (and poolIncrement=0)
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

// Note: if you use Thick mode, and you increase poolMax, then you must also
// increase UV_THREADPOOL_SIZE before Node.js starts its thread pool.  If you
// set UV_THREADPOOL_SIZE too late, the value is ignored and the default size
// of 4 is used.
//
// On Windows you must set the UV_THREADPOOL_SIZE environment variable
// externally before running your application.
//
// Increasing UV_THREADPOOL_SIZE is not needed if you use Thin mode.
//
// process.env.UV_THREADPOOL_SIZE = 10; // set threadpool size to 10 for 10 connections


const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
  // libraries at runtime or before Node.js starts.  On other platforms (where
  // Oracle libraries are available) the system library search path must always
  // include the Oracle library path before Node.js starts.  If the search path
  // is not correct, you will get a DPI-1047 error.  See the node-oracledb
  // installation documentation.
  let clientOpts = {};
  // On Windows and macOS platforms, set the environment variable
  // NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
  if (process.platform === 'win32' || process.platform === 'darwin') {
    clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
  }
  oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

const httpPort = 7000;

// If additionally using Database Resident Connection Pooling (DRCP), then set a connection class:
// oracledb.connectionClass = 'MYAPPNAME';

// Main entry point.  Creates a connection pool and an HTTP server
// that executes a query based on the URL parameter given.
// The pool values shown are the default values.
async function init() {
  try {
    await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      // edition: 'ORA$BASE', // used for Edition Based Redefintion
      // events: false, // whether to handle Oracle Database FAN and RLB events or support CQN
      // externalAuth: false, // whether connections should be established using External Authentication
      // homogeneous: true, // all connections in the pool have the same credentials
      // poolAlias: 'default', // set an alias to allow access to the pool via a name.
      // poolIncrement: 1, // only grow the pool by one connection at a time
      // poolMax: 4, // maximum size of the pool. (Note: increase UV_THREADPOOL_SIZE if you increase poolMax in Thick mode)
      // poolMin: 0, // start with no connections; let the pool shrink completely
      // poolPingInterval: 60, // check aliveness of connection if idle in the pool for 60 seconds
      // poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
      // queueMax: 500, // don't allow more than 500 unsatisfied getConnection() calls in the pool queue
      // queueTimeout: 60000, // terminate getConnection() calls queued for longer than 60000 milliseconds
      // sessionCallback: initSession, // function invoked for brand new connections or by a connection tag mismatch
      // sodaMetaDataCache: false, // Set true to improve SODA collection access performance
      // stmtCacheSize: 30, // number of statements that are cached in the statement cache of each connection
      // enableStatistics: false // record pool usage for oracledb.getPool().getStatistics() and logStatistics()
    });

    // create the demo table
    const connection = await oracledb.getConnection();
    await demoSetup.setupBf(connection);
    await connection.close();

    // Create HTTP server and listen on port httpPort
    const server = http.createServer();
    server.on('error', (err) => {
      console.log('HTTP server problem: ' + err);
    });
    server.on('request', (request, response) => {
      handleRequest(request, response);
    });
    await server.listen(httpPort);
    console.log("Server is running at http://localhost:" + httpPort);
    console.log("Try loading a farmer such as http://localhost:" + httpPort + "/3");
  } catch (err) {
    console.error("init() error: " + err.message);
  }
}

// initSession() is configured by the pool sessionCallback property.
// It will be invoked internally when each brand new pooled connection
// is first used. See the sessionfixup.js and sessiontaggingX.js examples.
/*
function initSession(connection, requestedTag, cb) {
  connection.execute(`ALTER SESSION SET ...'`, cb);
}
*/

async function handleRequest(request, response) {
  const urlparts = request.url.split("/");
  const id = urlparts[1];

  if (id == 'favicon.ico') {  // ignore requests for the icon
    return;
  }

  if (id != parseInt(id)) {
    handleError(
      response,
      'URL path "' + id + '" is not an integer.  Try http://localhost:' + httpPort + '/3',
      null
    );

    return;
  }

  let connection;
  try {
    // Checkout a connection from the default pool
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      `SELECT farmer, weight, ripeness, picked
         FROM no_banana_farmer
         WHERE id = :idbv`,
      [id] // bind variable value
    );

    displayResults(
      response,
      "Banana Farmer Demonstration",
      "Example using node-oracledb driver",
      result,
      id);

  } catch (err) {
    handleError(response, "handleRequest() error", err);
  } finally {
    if (connection) {
      try {
        // Release the connection back to the connection pool
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

// Display query results
function displayResults(response, title, caption, result, id) {

  response.writeHead(200, {"Content-Type": "text/html"});
  response.write("<!DOCTYPE html>");
  response.write("<html>");
  response.write("<head>");
  response.write("<style>" +
                 "body {background:#FFFFFF;color:#000000;font-family:Arial,sans-serif;margin:40px;padding:10px;font-size:12px;text-align:center;}" +
                 "h1 {margin:0px;margin-bottom:12px;background:#FF0000;text-align:center;color:#FFFFFF;font-size:28px;}" +
                 "table {border-collapse: collapse;   margin-left:auto; margin-right:auto;}" +
                 "td, th {padding:8px;border-style:solid}" +
                 "</style>\n");
  response.write("<title>" + caption + "</title>");
  response.write("</head>");
  response.write("<body>");
  response.write("<h1>" + title + "</h1>");

  response.write("<h2>" + "Harvest details for farmer " + id + "</h2>");

  response.write("<table>");

  // Column Titles
  response.write("<tr>");
  for (let col = 0; col < result.metaData.length; col++) {
    response.write("<th>" + result.metaData[col].name + "</th>");
  }
  response.write("</tr>");

  // Rows
  for (let row = 0; row < result.rows.length; row++) {
    response.write("<tr>");
    for (let col = 0; col < result.rows[row].length; col++) {
      response.write("<td>" + result.rows[row][col] + "</td>");
    }
    response.write("</tr>");
  }
  response.write("</table>");

  response.write("</body>\n</html>");
  response.end();

}

// Report an error
function handleError(response, text, err) {
  if (err) {
    text += ": " + err.message;
  }
  console.error(text);
  response.writeHead(500, {"Content-Type": "text/html"});
  response.write(text);
  response.end();
}

async function closePoolAndExit() {
  console.log("\nTerminating");
  try {
    // Get the pool from the pool cache and close it when no
    // connections are in use, or force it closed after 10 seconds.
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file.
    // This setting should not be needed if both Oracle Client and Oracle
    // Database are 19c (or later).
    await oracledb.getPool().close(10);
    console.log("Pool closed");
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT',  closePoolAndExit);

init();
