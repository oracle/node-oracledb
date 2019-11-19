/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   sessiontagging1.js
 *
 * DESCRIPTION
 *   Shows a simple connection callback function to set the "session
 *   state" of pooled connections when the requested connection tag
 *   does not match the connection's current tag.
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
 *   This example requires node-oracledb 3.1 or later.
 *
 *   This example uses Node 8's async/await syntax.
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
// This implementation assumes that every pool.getConnection() will
// request a tag having the format USER_TZ=X, where X is a valid
// Oracle timezone.  See sessiontagging2.js for a more complete
// implementation.
function initSession(connection, requestedTag, cb) {
  console.log(`In initSession. requested tag: ${requestedTag}, actual tag: ${connection.tag}`);

  const tagParts = requestedTag.split('=');
  if (tagParts[0] != 'USER_TZ') {
    cb(new Error('Error: Only property USER_TZ is supported'));
    return;
  }

  // Execute the session state change.  Note: if you have multiple SQL
  // statements to execute, put them in a single anonymous PL/SQL
  // block for efficiency.
  connection.execute(
    `ALTER SESSION SET TIME_ZONE = '${tagParts[1]}'`,
    (err) => {
      connection.tag = requestedTag; // Record the connection's new state
      cb(err);
    }
  );
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

  // This would normally be determined by some other means, such as user
  // preference, geo location, etc.
  const sessionTagNeeded = Math.random() > 0.5 ?
    "USER_TZ=UTC" : "USER_TZ=Australia/Melbourne";

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
