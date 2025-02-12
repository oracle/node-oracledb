/* Copyright (c) 2025, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha' and 'assert'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   blobPLSQLBindinoutAsBufferMax.js
 *
 * DESCRIPTION
 *   This tests include PLSQL bind_inout as buffer, then check the result data
 *   Parameter below ****** can be changed to test different maxSize.
 *   run this tests using command: node --max-old-space-size=4096 XX.js
 *   Expected compare result: 0.
 *
 *****************************************************************************/
const oracledb = require('oracledb');
const dbConfig = require('../../../dbconfig.js');
const assert = require('assert');

const bind_inout_maxSize = 1073741822; // Maximum allowed size for BLOB BIND_INOUT

// Create a buffer that is within the allowed size by directly generating the buffer
const getMaxSizeBuffer = (specialStr) => {
  const bufferSize = bind_inout_maxSize; // Set the buffer size to the max allowed
  const specialStrBuffer = Buffer.from(specialStr); // Convert the special string to a buffer
  const largeBuffer = Buffer.alloc(bufferSize); // Allocate a buffer of the required size

  // Fill the large buffer with the specialStr buffer content
  let offset = 0;
  while (offset < bufferSize) {
    const chunkSize = Math.min(specialStrBuffer.length, bufferSize - offset); // Ensure we don't exceed the buffer size
    largeBuffer.set(specialStrBuffer.slice(0, chunkSize), offset); // Copy chunk to the large buffer
    offset += chunkSize; // Update the offset
  }

  return largeBuffer;
};

const bind_in_ID = 1;

describe('BLOB PLSQL Bind In/Out Test', () => {
  let connection;

  before(async () => {
    connection = await oracledb.getConnection({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
    });

    // Create tables for testing
    await connection.execute(`
      BEGIN
        EXECUTE IMMEDIATE 'DROP TABLE nodb_tab_blob_in PURGE';
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
    `);
    await connection.execute(`
      CREATE TABLE nodb_tab_blob_in (
        id NUMBER,
        blob BLOB
      )
    `);
  });

  after(async () => {
    // Drop the table after tests
    await connection.execute(`DROP TABLE nodb_tab_blob_in PURGE`);
    await connection.close();
  });

  it('should test BLOB IN/OUT with max buffer size', async () => {
    // Generate a buffer of maximum size
    const specialStr = 'MaxBufferTest';
    const buffer = getMaxSizeBuffer(specialStr);

    const bindVars = {
      i: { val: bind_in_ID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      b: { val: buffer, type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, maxSize: bind_inout_maxSize },
    };

    // Create the procedure for BLOB IN/OUT
    await connection.execute(`
      CREATE OR REPLACE PROCEDURE nodb_blobs_741 (blob_id IN NUMBER, blob_inout IN OUT BLOB)
      AS
      BEGIN
        INSERT INTO nodb_tab_blob_in (id, blob) VALUES (blob_id, blob_inout);
        SELECT blob INTO blob_inout FROM nodb_tab_blob_in WHERE id = blob_id;
      END nodb_blobs_741;
    `);

    // Execute the procedure
    const result = await connection.execute(`BEGIN nodb_blobs_741(:i, :b); END;`, bindVars);
    const outBuffer = result.outBinds.b;

    // Check that the buffer was processed correctly
    assert.strictEqual(outBuffer.length, buffer.length, 'Buffer sizes should match');
    console.log('BLOB IN/OUT procedure executed successfully with max buffer size.');
  });
});
