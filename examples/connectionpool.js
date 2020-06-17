/* Copyright (c) 2018, 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   connectionpool.js
 *
 * DESCRIPTION
 *   Shows connection pool usage.  Connection pools are recommended
 *   for applications that use a lot of connections for short periods.
 *
 *   Other connection pool examples are in sessionfixup.js and webappawait.js.
 *   For a standalone connection example, see connect.js
 *
 *   In some networks forced pool termination may hang unless you have
 *   'disable_oob=on' in sqlnet.ora, see
 *   https://oracle.github.io/node-oracledb/doc/api.html#tnsadmin
 *
 *   In production applications, set poolMin=poolMax (and poolIncrement=0)
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

// If you increase poolMax, you must increase UV_THREADPOOL_SIZE before Node.js
// starts its thread pool.  If you set UV_THREADPOOL_SIZE too late, the value is
// ignored and the default size of 4 is used.
// process.env.UV_THREADPOOL_SIZE = 4;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

async function init() {
  try {
    // Create a connection pool which will later be accessed via the
    // pool cache as the 'default' pool.
    await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString
      // edition: 'ORA$BASE', // used for Edition Based Redefintion
      // events: false, // whether to handle Oracle Database FAN and RLB events or support CQN
      // externalAuth: false, // whether connections should be established using External Authentication
      // homogeneous: true, // all connections in the pool have the same credentials
      // poolAlias: 'default', // set an alias to allow access to the pool via a name.
      // poolIncrement: 1, // only grow the pool by one connection at a time
      // poolMax: 4, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
      // poolMin: 0, // start with no connections; let the pool shrink completely
      // poolPingInterval: 60, // check aliveness of connection if idle in the pool for 60 seconds
      // poolTimeout: 60, // terminate connections that are idle in the pool for 60 seconds
      // queueMax: 500, // don't allow more than 500 unsatisfied getConnection() calls in the pool queue
      // queueTimeout: 60000, // terminate getConnection() calls queued for longer than 60000 milliseconds
      // sessionCallback: myFunction, // function invoked for brand new connections or by a connection tag mismatch
      // stmtCacheSize: 30, // number of statements that are cached in the statement cache of each connection
      // _enableStats: false // record pool usage statistics that can be output with pool._logStats()
    });
    console.log('Connection pool started');

    // Now the pool is running, it can be used
    await dostuff();

  } catch (err) {
    console.error('init() error: ' + err.message);
  } finally {
    await closePoolAndExit();
  }
}

async function dostuff() {
  let connection;
  try {
    // Get a connection from the default pool
    connection = await oracledb.getConnection();
    const sql = `SELECT sysdate FROM dual WHERE :b = 1`;
    const binds = [1];
    const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    const result = await connection.execute(sql, binds, options);
    console.log(result);
    // oracledb.getPool()._logStats(); // show pool statistics.  _enableStats must be true
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        // Put the connection back in the pool
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

async function closePoolAndExit() {
  console.log('\nTerminating');
  try {
    // Get the pool from the pool cache and close it when no
    // connections are in use, or force it closed after 10 seconds.
    // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file.
    // This setting should not be needed if both Oracle Client and Oracle
    // Database are 19c (or later).
    await oracledb.getPool().close(10);
    console.log('Pool closed');
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
