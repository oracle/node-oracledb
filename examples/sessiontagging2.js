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
 *   sessiontagging2.js
 *
 * DESCRIPTION
 *   Shows a connection callback function to set the "session state"
 *   of pooled connections when the requested connection tag does not
 *   match the current tag.
 *
 *   Each connection in a connection pool can retain state (such as
 *   ALTER SESSION values) from when the connection was previously
 *   used.  Connection tagging allows the connection state to be
 *   recorded and later checked.  This removes the overhead of
 *   unnecessarily re-executing ALTER SESSION commands on re-used
 *   connections.
 *
 *   When using Oracle Client libraries 12.2 or later, then
 *   sessionCallback can alternatively be a string containing the name
 *   of a PL/SQL procedure - see documentation.
 *
 *   Run this script and experiment sending web requests.  For example
 *   send 20 requests with a concurrency of 4:
 *     ab -n 20 -c 4 http://127.0.0.1:7000/
 *
 *   This file uses Node 8's async/await syntax but could be rewritten
 *   to use callbacks.
 *
 *   This example requires node-oracledb 3.1 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *   Also see sessionfixup.js and sessiontagging1.js
 *
 *****************************************************************************/

const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const httpPort = 7000;

// initSession() will be invoked internally when each brand new pooled
// connection is first used, or when a getConnection() call requests a
// connection tag and a connection without an identical tag is
// returned.  Its callback function 'cb' should be invoked only when
// all desired session state has been set.
//
// This implementation assumes the tag has name-value pairs like
// "k1=v1;k2=v2" where the pairs can be used in an ALTER SESSION
// statement.  Specifically it white lists TIME_ZONE=UTC and
// TIME_ZONE=Australia/Melbourne.  The white list could be enhanced to
// support more settings.  Another potential improvement would be to
// identify properties in connection.tag that were not specifically
// asked for in requestedTag.  These can be reset, as needed.
//
// See sessiontagging1.js for a simpler implementation.
function initSession(connection, requestedTag, cb) {
  console.log(`In initSession. requested tag: ${requestedTag}, actual tag: ${connection.tag}`);

  // Split the requested and actual tags into property components
  let requestedProperties = [];
  let actualProperties = [];
  if (requestedTag) {
    requestedTag.split(";").map(y => y.split("=")).forEach(e => {if (e[0]) requestedProperties[e[0]] = e[1];});
  }
  if (connection.tag) {
    connection.tag.split(";").map(y => y.split("=")).forEach(e => {if (e[0]) actualProperties[e[0]] = e[1];});
  }

  // Find properties we want that are not already set, or not set
  // correctly; these are retained in requestedProperties.  Also
  // record the final, complete set of properties the connection will
  // have; these are retained in actualProperties.
  for (let k in requestedProperties) {
    if (actualProperties[k] && actualProperties[k] === requestedProperties[k]) {
      delete requestedProperties[k]; // already set correctly
    } else {
      actualProperties[k] = requestedProperties[k]; // not set or not correctly set.  Record new setting
    }
  }

  // Check allowed values against a white list to avoid any SQL
  // injection issues.  Construct a string of valid options usable by
  // ALTER SESSION.
  let s = "";
  for (let k in requestedProperties) {
    if (k === 'TIME_ZONE') {
      switch (requestedProperties[k]) {
        case 'Australia/Melbourne':
        case 'UTC':
          break;
        default:
          cb(new Error(`Error: Invalid time zone value ${requestedProperties[k]}`));
          return;
      }
      // add white listing code to check other properties and values here
    } else {
      cb(new Error(`Error: Invalid connection tag property ${k}`));
      return;
    }
    s += `${k}='${requestedProperties[k]}' `;
  }
  if (s) {
    // Execute the session state change.  Note: if you have multiple
    // SQL statements to execute, put them in a single anonymous
    // PL/SQL block for efficiency.
    connection.execute(
      `ALTER SESSION SET ${s}`,
      (err) => {
        // Store the tag representing the connection's full set of
        // properties
        connection.tag = "";
        for (let k in actualProperties) {
          connection.tag += `${k}=${actualProperties[k]};`;
        }
        cb(err);
      }
    );
  } else {
    // The requested and actual tags may not be identical (which is
    // why initSession was called), but the properties that this
    // function validates are already set, so there is no need to call
    // ALTER SESSION
    cb();
  }
}

async function init() {
  try {
    await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      sessionCallback: initSession,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1
    });

    // Create HTTP server and listen on port httpPort
    const server = http.createServer();
    server.listen(httpPort)
      .on('request', handleRequest)
      .on('error', (err) => {
        console.error('HTTP server problem: ' + err);
      })
      .on('listening', () => {
        console.log('Server running at http://localhost:' + httpPort);
      });
  } catch (err) {
    console.error('init() error: ' + err.message);
  }
}

async function handleRequest(request, response) {
  let connection;

  // A tag can have the form 'a=b;c=d;e=f' etc.
  // The tag would normally be determined by some other means, such as user
  // preference, geolocation, etc.
  const sessionTagNeeded = Math.random() > 0.5 ?
    "TIME_ZONE=UTC" : "TIME_ZONE=Australia/Melbourne";

  try {
    // Get a connection from the default connection pool, requesting
    // one with a given tag.
    // Depending on the parallelism that the app is invoked with (and
    // the random setting of sessionTag), getConnection() will either:
    //   (i) find a connection with the requested tag already in the
    //   connection pool.  initSession() will not be invoked.
    //   (ii) If a connection with the requested tag is not available
    //   in the pool, then a connection with a new session (i.e. no
    //   tag) is used.  Alternatively a connection with a different
    //   tag is used if matchAnyTag is true.  In both these cases the
    //   requested tag and actual tag do not match, so initSession()
    //   will be invoked before getConnection() returns.  This lets
    //   the desired session state be set.
    connection = await oracledb.getConnection({poolAlias: 'default', tag: sessionTagNeeded /*, matchAnyTag: true */});
    const result = await connection.execute(`SELECT TO_CHAR(CURRENT_DATE, 'DD-Mon-YYYY HH24:MI') FROM DUAL`);
    console.log( `getConnection() tag needed was ${sessionTagNeeded}\n  ${result.rows[0][0]}`);
  } catch (err) {
    console.error(err.message);
  } finally {
    if (connection) {
      try {
        console.log(`  Closing connection tag is ${connection.tag}`);
        await connection.close();
      } catch (err) {
        console.error(err.message);
      }
    }
    response.end();
  }
}

async function closePoolAndExit() {
  console.log("\nTerminating");
  try {
    // Get the 'default' pool from the pool cache and close it (force
    // closed after 3 seconds).
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file
    await oracledb.getPool().close(3);
    process.exit(0);
  } catch(err) {
    console.error(err.message);
    process.exit(1);
  }
}

process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT',  closePoolAndExit);

init();
