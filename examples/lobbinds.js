/* Copyright (c) 2016, 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   lobbinds.js
 *
 * DESCRIPTION
 *   Demonstrates following LOB bind features
 *   1) DML bind for an INSERT
 *   2) PL/SQL bind IN for CLOB as String, and BLOB as Buffer
 *   3) PL/SQL bind OUT for CLOB as String, and BLOB as Buffer
 *   4) Querying a LOB and binding using PL/SQL IN OUT bind
 *   5) PL/SQL OUT bind followed by PL/SQL IN OUT bind
 *
 *   This example requires node-oracledb 1.13 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 ******************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const demoSetup = require('./demosetup.js');

const clobOutFileName1 = 'lobbindsout1.txt';
const clobOutFileName2 = 'lobbindsout2.txt';

oracledb.autoCommit = true;  // for ease of demonstration

// 1. SELECTs a CLOB and inserts it back using an IN bind to an INSERT statement
async function query_bind_insert(connection) {

  console.log ("1. query_bind_insert(): Inserting a CLOB using a LOB IN bind for INSERT");

  let result = await connection.execute(
    `SELECT c FROM no_lobs WHERE id = :id`,
    { id: 1 }
  );

  if (result.rows.length === 0) {
    throw new Error('query_bind_insert(): No row found');
  }

  const clob1 = result.rows[0][0];
  if (clob1 === null) {
    throw new Error('query_bind_insert(): NULL clob1 found');
  }

  // Insert the value back as a new row
  result = await connection.execute(
    `INSERT INTO no_lobs (id, c) VALUES (:id, :c)`,
    {
      id: 10,
      c: {val: clob1, type: oracledb.CLOB, dir: oracledb.BIND_IN}
    }
  );

  // destroy the LOB and wait for it to be closed completely before continuing
  clob1.destroy();
  await new Promise((resolve, reject) => {
    clob1.on('error', reject);
    clob1.on('close', resolve);
  });

  console.log ("   " + result.rowsAffected + " row(s) inserted");
}

// 2. Show PL/SQL bind IN for CLOB as String and for BLOB as Buffer.
async function plsql_in_as_str_buf(connection) {

  console.log("2. plsql_in_as_str_buf(): Binding of String and Buffer for PL/SQL IN binds");

  // Make up some data
  const bigStr = 'A'.repeat(50000);
  const bigBuf = Buffer.from(bigStr);

  await connection.execute(
    `BEGIN
       no_lobs_in(:id, :c, :b);
     END;`,
    {
      id: 20,
      c: {val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN},
      b: {val: bigBuf, type: oracledb.BUFFER, dir: oracledb.BIND_IN}
    }
  );

  console.log("   Completed");
}

// 3. Gets text and binary strings from database LOBs using PL/SQL OUT binds
async function plsql_out_as_str_buf(connection) {

  console.log("3. plsql_out_as_str_buf(): Fetching as String and Buffer using PL/SQL OUT binds");

  const result = await connection.execute(
    `BEGIN
       no_lobs_out(:id, :c, :b);
     END;`,
    {
      id: 20,
      c: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 50000},
      b: {type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 50000}
    }
  );

  console.log("   String length: " + result.outBinds.c.length);
  console.log("   Buffer length: " + result.outBinds.b.length);
}

// 4. Queries a CLOB as a Stream and passes it to a PL/SQL procedure as an IN OUT bind
// Persistent LOBs can be bound to PL/SQL calls as IN OUT.  (Temporary LOBs cannot).
async function query_plsql_inout(connection) {

  console.log ("4. query_plsql_inout(): Querying then inserting a CLOB using a PL/SQL IN OUT LOB bind");

  let result = await connection.execute(
    `SELECT c FROM no_lobs WHERE id = :id`,
    { id: 1 }
  );

  if (result.rows.length === 0) {
    throw new Error('query_plsql_inout(): No row found');
  }

  const clob1 = result.rows[0][0];
  if (clob1 === null) {
    throw new Error('query_plsql_inout(): NULL clob1 found');
  }

  // Note binding clob1 as IN OUT here causes it be autoclosed by execute().
  // The returned Lob clob2 will be autoclosed because it is streamed to completion.
  result = await connection.execute(
    `BEGIN
       no_lob_in_out(:idbv, :ciobv);
     END;`,
    {
      idbv: 30,
      ciobv: {val: clob1, type: oracledb.CLOB, dir: oracledb.BIND_INOUT}
    }
  );

  const clob2 = result.outBinds.ciobv;
  if (clob2 === null) {
    throw new Error('plsql_out_inout(): NULL clob2 found');
  }

  // Stream the returned LOB to a file
  const doStream = new Promise((resolve, reject) => {

    // Set up the Lob stream
    console.log('   Writing to ' + clobOutFileName1);
    clob2.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
    clob2.on('error', (err) => {
      // console.log("clob2.on 'error' event");
      reject(err);
    });
    clob2.on('end', () => {
      // console.log("clob2.on 'end' event");
      clob2.destroy();
    });
    clob2.on('close', () => {
      // console.log("clob2.on 'close' event");
      resolve();
    });

    // Set up the stream to write to a file
    const outStream = fs.createWriteStream(clobOutFileName1);
    outStream.on('error', (err) => {
      // console.log("outStream.on 'error' event");
      clob2.destroy(err);
    });

    // Switch into flowing mode and push the LOB to the file
    clob2.pipe(outStream);
  });

  await doStream;
  console.log ("   Completed");
}

// 5. Get CLOB as a PL/SQL OUT bind and pass it to another procedure as IN OUT.
// Persistent LOBs can be bound to PL/SQL calls as IN OUT.  (Temporary LOBs cannot).
async function plsql_out_inout(connection) {

  console.log ("5. plsql_out_inout(): Getting a LOB using a PL/SQL OUT bind and inserting it using a PL/SQL IN OUT LOB bind");

  const result1 = await connection.execute(
    `BEGIN
       no_lobs_out(:idbv, :cobv, :bobv);
     END;`,
    {
      idbv: 1,
      cobv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT},
      bobv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} // not used in this demo; it will be NULL anyway
    }
  );

  const clob1 = result1.outBinds.cobv;
  if (clob1 === null) {
    throw new Error('plsql_out_inout(): NULL clob1 found');
  }

  // Note binding clob1 as IN OUT here causes it be autoclosed by execute().
  // The returned Lob clob2 will be autoclosed because it is streamed to completion.
  const result2 = await connection.execute(
    `BEGIN
       no_lob_in_out(:idbv, :ciobv);
     END;`,
    {
      idbv: 50,
      ciobv: {val: clob1, type: oracledb.CLOB, dir: oracledb.BIND_INOUT}
    }
  );

  const doStream = new Promise((resolve, reject) => {

    const clob2 = result2.outBinds.ciobv;
    if (clob2 === null) {
      throw new Error('plsql_out_inout(): NULL clob2 found');
    }

    // Stream the LOB to a file
    console.log('   Writing to ' + clobOutFileName2);
    clob2.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
    clob2.on('error', (err) => {
      // console.log("clob2.on 'error' event");
      reject (err);
    });
    clob2.on('end', () => {
      // console.log("clob2.on 'end' event");
      clob2.destroy();
    });
    clob2.on('close', () => {
      // console.log("clob2.on 'close' event");
      resolve();
    });

    const outStream = fs.createWriteStream(clobOutFileName2);
    outStream.on('error', (err) => {
      // console.log("outStream.on 'error' event");
      clob2.destroy(err);
    });

    // Switch into flowing mode and push the LOB to the file
    clob2.pipe(outStream);
  });

  await doStream;
  console.log ("   Completed");
}

/*

// 6. Show the number of open temporary LOBs
async function doshowvtemplob(connection) {

  console.log('6. Query from V$TEMPORARY_LOBS:');

  const result = await connection.execute(
    `SELECT * FROM V$TEMPORARY_LOBS`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  console.log(result.rows[0]);
};

*/

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    await demoSetup.setupLobs(connection, true);  // create the demo table with data

    await query_bind_insert(connection);
    await plsql_in_as_str_buf(connection);
    await plsql_out_as_str_buf(connection);
    await query_plsql_inout(connection);
    await plsql_out_inout(connection);
    // await doshowvtemplob(connection);  // Show open temporary Lobs, if desired

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();
