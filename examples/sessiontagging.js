/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   sessiontagging.js
 *
 * DESCRIPTION
 *   Shows using a pooled connection callback function to set the
 *   "session state" of pooled connections when connection tags are
 *   not the requested tags.
 *
 *   Each connection in a connection pool can retain state (such as
 *   ALTER SESSION values) from when the connection was previously
 *   used.  Connection tagging allows the connection state to be
 *   recorded and later checked.  This removes the overhead of
 *   unnecessarily re-executing ALTER SESSION commands on re-used
 *   connections.
 *
 *   When using Oracle Client libraries 12.2 or later, then
 *   sessionCallback can optionally be a string containing the name
 *   of a PL/SQL procedure - see documentation.
 *
 *   Run this script and experiment sending web requests for example
 *   send 20 requests with a concurrency of 4:
 *     ab -n 20 -c 4 http://127.0.0.1:7000/
 *
 *   This file uses Node 8's async/await syntax but could be rewritten
 *   to use callbacks.
 *
 *   Also see sessionfixup.js
 *
 *****************************************************************************/

const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const httpPort = 7000;

// Tags have the form 'a=b;c=d;e=f' etc
const sessionTag1 = "TIME_ZONE=UTC";
const sessionTag2 = "TIME_ZONE=Australia/Melbourne";

// myFixupFunc() will be invoked internally when each brand new pooled
// connection is first used or when a getConnection() call requests a
// connection tag and a connection without an identical tag is
// returned.  Its callback function 'cb' should be invoked only when
// all desired session state has been set.  This implementation
// ignores properties that are tagged as set in the current connection
// but were not requested.
function myFixupFunc(connection, requestedTag, actualTag, cb) {
  console.log('In myFixupFunc: requested tag: '
              + requestedTag + ', actual tag: ' + actualTag);

  let requestedProperties = [];
  let actualProperties = [];

  if (requestedTag) {
    requestedTag.split(";").map(y => y.split("=")).forEach(e => {if (e[0]) requestedProperties[e[0]] = e[1];});
  }
  if (actualTag) {
    actualTag.split(";").map(y => y.split("=")).forEach(e => {if (e[0]) actualProperties[e[0]] = e[1];});
  }

  // Find properties we want that are not already set, or not set correctly.
  // Also record the final, complete set of properties the connection will have.
  for (let k in requestedProperties) {
    if (actualProperties[k] && actualProperties[k] === requestedProperties[k]) {
      delete requestedProperties[k]; // already set correctly
    } else {
      actualProperties[k] = requestedProperties[k]; // not set or not correctly set.  Record new setting
    }
  }

  // Store the tag containing the final, actual properties for use with connection.close()
  let newTag = "";
  for (let k in actualProperties) {
    newTag += k + "=" + actualProperties[k] + ";";
  }
  connection._myNewTag = newTag;

  // Construct a PL/SQL block to set or reset any requested state
  let s = "";
  for (let k in requestedProperties) {
    s += k + ` = ''` + requestedProperties[k] + `'' `;
  }
  if (s) {
    connection.execute(`begin execute immediate 'alter session set ` + s + `'; end;`, cb);
  } else {
    cb();
  }
}

async function init() {
  try {
    await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      sessionCallback: myFixupFunc,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1
    });

    // Create HTTP server and listen on port httpPort
    let server = http.createServer();
    server.on('error', (err) => {
      console.log('HTTP server problem: ' + err);
    });
    server.on('request', (request, response) => {
      handleRequest(request, response);
    });
    await server.listen(httpPort);
    console.log("Server running at http://localhost:" + httpPort);
  } catch (err) {
    console.error("init() error: " + err.message);
  }
}

async function handleRequest(request, response) {

  let connection;
  let sessionTag = Math.random() > 0.5 ? sessionTag1 : sessionTag2;

  try {
    // Checkout a connection from the default connection pool,
    // requesting one with a given tag.
    // Depending on the parallelism that the app is invoked with (and
    // the random setting of sessionTag), connections with the
    // requested tag will be found in the connection pool and
    // myFixupFunc() will not be invoked.
    // If no connections are available with the requested tag then a
    // connection with a new session will be returned.  Alternatively
    // a connection with a different tag may be returned if
    // matchAnyTag is true.  In both these cases myFixupFunc() will be
    // invoked and the requested time zone will be set.
    connection = await oracledb.getConnection({poolAlias: 'default', tag: sessionTag /*, matchAnyTag: true */});
    let result = await connection.execute('select sysdate from dual');
    console.log(result.rows[0][0], "requested tag: " + sessionTag);
  } catch (err) {
    console.error(err.message);
  } finally {
    if (connection) {
      try {
        // Release the connection back to the pool and tag it as
        // having a known state.
        await connection.close({ tag: connection._myNewTag });
      } catch (err) {
        console.error(err);
      }
    }
    response.end();
  }
}

async function closePoolAndExit() {
  console.log("\nTerminating");
  try {
    // Get the pool from the pool cache and close it when no
    // connections are in use, or force it closed after 10 seconds
    let pool = oracledb.getPool();
    await pool.close(10);
    console.log("Pool closed");
    process.exit(0);
  } catch(err) {
    // Ignore getPool() error, which may occur if multiple signals
    // sent and the pool has already been removed from the cache.
    process.exit(0);
  }
}

process
  .on('SIGTERM', closePoolAndExit)
  .on('SIGINT',  closePoolAndExit);

init();
