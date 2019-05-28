/* Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   lobstream1.js
 *
 * DESCRIPTION
 *   SELECTs a CLOB and a BLOB and streams to files.
 *
 *   Use demo.sql to create the required table or do:
 *     DROP TABLE mylobs;
 *     CREATE TABLE mylobs (id NUMBER, c CLOB, b BLOB);
 *
 *   Run lobinsert1.js to load data before running this example.
 *
 *   This example requires node-oracledb 1.12 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

var fs = require('fs');
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

// Stream a LOB to a file
async function doStream(lob, outFileName) {

  const doStreamHelper = new Promise((resolve, reject) => {

    if (lob.type === oracledb.CLOB) {
      console.log('Writing a CLOB to ' + outFileName);
      lob.setEncoding('utf8');  // set the encoding so we get a 'string' not a 'buffer'
    } else {
      console.log('Writing a BLOB to ' + outFileName);
    }

    let errorHandled = false;

    lob.on('error', (err) => {
      // console.log("lob.on 'error' event");
      if (!errorHandled) {
        errorHandled = true;
        lob.close(() => {
          reject(err);
        });
      }
    });
    lob.on('end', () => {
      // console.log("lob.on 'end' event");
    });
    lob.on('close', () => {
      // console.log("lob.on 'close' event");
      if (!errorHandled) {
        resolve();
      }
    });

    const outStream = fs.createWriteStream(outFileName);
    outStream.on('error', (err) => {
      // console.log("outStream.on 'error' event");
      if (!errorHandled) {
        errorHandled = true;
        lob.close(() => {
          reject(err);
        });
      }
    });

    // Switch into flowing mode and push the LOB to the file
    lob.pipe(outStream);
  });

  await doStreamHelper;
}

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    //
    // Fetch a CLOB and stream it
    //
    let result = await connection.execute(`SELECT c FROM mylobs WHERE id = 1`);
    if (result.rows.length === 0) {
      throw new Error("No results.  Did you run lobinsert1.js?");
    }
    let lob = result.rows[0][0];
    if (lob === null) {
      throw new Error("LOB was NULL");
    }
    await doStream(lob, 'clobstream1out.txt');

    //
    // Fetch a BLOB and stream it
    //
    result = await connection.execute(`SELECT b FROM mylobs WHERE id = 2`);
    if (result.rows.length === 0) {
      throw new Error("No results.  Did you run lobinsert1.js?");
    }
    lob = result.rows[0][0];
    if (lob === null) {
      throw new Error("LOB was NULL");
    }
    await doStream(lob, 'blobstream1out.jpg');

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
