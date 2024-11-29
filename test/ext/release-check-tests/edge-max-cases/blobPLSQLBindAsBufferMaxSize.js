/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

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
 *   2. blobPLSQLBindAsBufferMaxSize.js
 *
 * DESCRIPTION
 *   Testing PLSQL bind BLOB as buffer maxSize.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

const oracledb      = require('oracledb');
const assert        = require('assert');
const fs            = require('fs');
const largeFile     = require('./largeFile.js');
const dbConfig      = require('../../../dbconfig.js');
const random        = require('../../../random.js');

describe('2.blobPLSQLBindAsBufferMaxSize.js', function() {
  let connection = null;
  let inFileName = '';
  const fileRoot = process.cwd();
  let insertID = 0;

  const proc_blob_pre_tab = `BEGIN \n
                              DECLARE \n
                                  e_table_missing EXCEPTION; \n
                                  PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n
                              BEGIN \n
                                  EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_pre PURGE'); \n
                              EXCEPTION \n
                                  WHEN e_table_missing \n
                                  THEN NULL; \n
                              END; \n
                              EXECUTE IMMEDIATE (' \n
                                  CREATE TABLE nodb_tab_lobs_pre ( \n
                                      id    NUMBER, \n
                                      blob  BLOB \n
                                  ) \n
                              '); \n
                          END; `;
  const proc_blob_in_tab = `BEGIN \n
                             DECLARE \n
                                 e_table_missing EXCEPTION; \n
                                 PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n
                             BEGIN \n
                                 EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob_in PURGE'); \n
                             EXCEPTION \n
                                 WHEN e_table_missing \n
                                 THEN NULL; \n
                             END; \n
                             EXECUTE IMMEDIATE (' \n
                                 CREATE TABLE nodb_tab_blob_in ( \n
                                     id      NUMBER, \n
                                     blob    BLOB \n
                                 ) \n
                             '); \n
                         END; `;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await setupAllTable();
  }); // before

  after(async function() {
    await dropAllTable();
    await connection.release();
  }); // after

  beforeEach(function() {
    insertID++;
  });

  describe('2.1 BLOB, PLSQL, BIND_IN ', function() {
    const proc_bind_in = `CREATE OR REPLACE PROCEDURE nodb_blobs_in_741 (blob_id IN NUMBER, blob_in IN BLOB)\n
                       AS \n
                       BEGIN \n
                           insert into nodb_tab_blob_in (id, blob) values (blob_id, blob_in); \n
                       END nodb_blobs_in_741; `;
    const sqlRun = `BEGIN nodb_blobs_in_741 (:i, :b); END;`;
    const proc_drop = `DROP PROCEDURE nodb_blobs_in_741`;

    before(async function() {
      await executeSQL(proc_bind_in);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    const get1GBBuffer = function() {
      let largeBuffer = Buffer.from("", 'utf8');
      const loop = 8;
      const stringSizeInEachLoop = 128 * 1024 * 1024;
      const bigStr = random.getRandomLengthString(stringSizeInEachLoop);
      const bigBuffer = Buffer.from(bigStr);

      for (let i = 1; i <= loop ; i++) {
        const totalLength = largeBuffer.length + bigBuffer.length;
        largeBuffer = Buffer.concat([largeBuffer, bigBuffer], totalLength);
      }
      return largeBuffer;
    };

    it('2.1.1 works with Buffer size 64k - 1', async function() {
      const strLength = 65535;
      const specialStr = `2.1.1`;
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    }); // 2.1.1

    it('2.1.2 works with Buffer size 64k', async function() {
      const strLength = 65536;
      const specialStr = "2.1.2";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    }); // 2.1.2

    it('2.1.3 works with Buffer size 64k + 1', async function() {
      const strLength = 65537;
      const specialStr = "2.1.3";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    }); // 2.1.3

    it.skip('2.1.4 works with Buffer size 1GB', async function() {
      const strLength = 1 * 1024 * 1024 * 1024;
      const bigStr = get1GBBuffer();
      let result = null;
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await connection.execute(sqlRun, bindVar, { autoCommit: true });

      const selectSql = `select blob from nodb_tab_blob_in where id = ` + insertID;
      result = await connection.execute(selectSql);
      const lob = result.rows[0][0];
      assert(lob);
    }); // 2.1.4

    it('2.1.5 set maxSize size to 1GB + 1', async function() {
      const len = 1 * 1024 * 1024 * 1024 + 1;
      const strLength = 100;
      const specialStr = "2.1.5";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    }); // 2.1.5

    it('2.1.6 set maxSize size to 4GB - 1', async function() {
      const len = 4 * 1024 * 1024 * 1024 - 1;
      const strLength = 100;
      const specialStr = "2.1.6";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    }); // 2.1.6

    it('2.1.7 set maxSize size to 2GB - 1', async function() {
      const len = 2 * 1024 * 1024 * 1024 - 1;
      const strLength = 100;
      const specialStr = "2.1.7";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    }); // 2.1.7

    it('2.1.8 works with Buffer size 10MB + 1', async function() {
      const strLength = 10 * 1024 * 1024 + 1;
      const specialStr = "2.1.8";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    });

    it('2.1.9 works with Buffer size 20MB + 1', async function() {
      const strLength = 20 * 1024 * 1024 + 1;
      const specialStr = "2.1.9";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    });

    it('2.1.10 works with Buffer size 50MB', async function() {
      const strLength = 50 * 1024 * 1024;
      const specialStr = "2.1.10";
      const bigStr = random.getRandomString(strLength, specialStr);
      const bufferStr = Buffer.from(bigStr, 'utf8');
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bufferStr, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bufferStr, specialStr);
    });

  }); // 2.1

  describe('2.2 BLOB, PLSQL, BIND_OUT', function() {

    const proc = `CREATE OR REPLACE PROCEDURE nodb_blobs_out_745 (blob_id IN NUMBER, blob_out OUT BLOB) \n
                AS \n
                BEGIN \n
                    select blob into blob_out from nodb_tab_blob_in where id = blob_id; \n
                END nodb_blobs_out_745; `;
    const sqlRun = `BEGIN nodb_blobs_out_745 (:i, :b); END;`;
    const proc_drop = `DROP PROCEDURE nodb_blobs_out_745`;

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('2.2.1 works with Buffer size 64k - 1', async function() {
      inFileName = fileRoot + '/64KBString1.txt';
      const size = 64 * 1024 - 1;
      const specialStr = "2.2.1";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('2.2.2 works with Buffer size 64k', async function() {
      inFileName = fileRoot + '/64KBString2.txt';
      const size = 64 * 1024;
      const specialStr = "2.2.2";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('2.2.3 works with Buffer size 64k + 1', async function() {
      inFileName = fileRoot + '/64KBString3.txt';
      const size = 64 * 1024 + 1;
      const specialStr = "2.2.3";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('2.2.4 set maxSize to 1GB + 1', async function() {
      const len = 1 * 1024 * 1024 * 1024 + 1;
      inFileName = fileRoot + '/smallStr.txt';
      const size = 32768;
      const specialStr = "2.2.6";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('2.2.5 set maxSize to 2GB + 1', async function() {
      const len = 3 * 1024 * 1024 * 1024 + 1;
      inFileName = fileRoot + '/smallStr.txt';
      const size = 32768;
      const specialStr = "2.2.7";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('2.2.6 set maxSize to 4GB - 1', async function() {
      const len = 4 * 1024 * 1024 * 1024 - 1;
      inFileName = fileRoot + '/smallStr.txt';
      const size = 32768;
      const specialStr = "2.2.8";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('2.2.7 works with Buffer size 10MB + 1', async function() {
      inFileName = fileRoot + '/bigString.txt';
      const size = 10 * 1024 * 1024 + 1;
      const specialStr = "2.2.7";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it.skip('2.2.8 works with Buffer size 20MB + 1', async function() {
      inFileName = fileRoot + '/bigString.txt';
      const size = 20 * 1024 * 1024 + 1;
      const specialStr = "2.2.8";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it.skip('2.2.9 works with Buffer size 50MB + 1', async function() {
      inFileName = fileRoot + '/bigString.txt';
      const size = 50 * 1024 * 1024 + 1;
      const specialStr = "2.2.9";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });
  });

  const bindIn = async function(sqlRun, bindVar, originalBuffer, specialStr) {

    await connection.execute(
      sqlRun,
      bindVar,
      { autoCommit: true });

    const sql = `select blob from nodb_tab_blob_in where id = ` + insertID;
    await verifyBlobValueWithBuffer(sql, originalBuffer, specialStr);
  };

  const bindOut = async function(inFileName, fileSize, specialStr, sqlRun, bindVar) {
    await largeFile.createFileInKB(inFileName, fileSize, specialStr);
    await insetTableWithBlob(insertID, inFileName);
    const sql = `select blob from nodb_tab_blob_in where id = ` + insertID;
    await verifyBlobValueWithFileData(sql, inFileName);
    let result = null;

    result = await connection.execute(sqlRun, bindVar);

    const resultLength = result.outBinds.b.length;
    const specStrLength = specialStr.length;
    assert.strictEqual(result.outBinds.b.length, fileSize);
    assert.strictEqual(result.outBinds.b.toString('utf8', 0, specStrLength), specialStr);
    assert.strictEqual(result.outBinds.b.toString('utf8', (resultLength - specStrLength), resultLength), specialStr);
    fs.unlinkSync(inFileName);
  };

  const setupAllTable = async function() {
    await connection.execute(proc_blob_in_tab);

    await connection.execute(proc_blob_pre_tab);
  };

  const dropAllTable = async function() {

    await connection.execute(`DROP TABLE nodb_tab_blob_in PURGE`);

    await connection.execute(`DROP TABLE nodb_tab_lobs_pre PURGE`);
  };

  const executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  const insetTableWithBlob = async function(id, inFileName) {
    const sql = `INSERT INTO nodb_tab_blob_in (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv`;
    const bindVar = { i: id, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };
    let result = null;

    result = await connection.execute(
      sql,
      bindVar,
      { autoCommit: false }); // a transaction needs to span the INSERT and pipe()

    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);

    const inStream = fs.createReadStream(inFileName);
    const lob = result.outBinds.lobbv[0];
    await new Promise((resolve, reject) => {
      inStream.on("error", reject);
      lob.on("error", reject);

      lob.on('close', async function() {
        await connection.commit();
        resolve();
      });

      inStream.pipe(lob); // copies the text to the BLOB
    });
  };

  const verifyBlobValueWithBuffer = async function(selectSql, oraginalBuffer, specialStr) {
    let result = null;
    result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    if (oraginalBuffer == null | oraginalBuffer == '' || oraginalBuffer == undefined) {
      assert.ifError(lob);
    } else {
      assert(lob);
      let blobData = Buffer.from("", 'utf8');
      let totalLength = 0;
      await new Promise((resolve, reject) => {
        lob.on('data', function(chunk) {
          totalLength = totalLength + chunk.length;
          blobData = Buffer.concat([blobData, chunk], totalLength);
        });

        lob.on("error", reject);

        lob.on('end', function() {
          assert.strictEqual(totalLength, oraginalBuffer.length);
          const specStrLength = specialStr.length;
          assert.strictEqual(blobData.toString('utf8', 0, specStrLength), specialStr);
          assert.strictEqual(blobData.toString('utf8', (totalLength - specStrLength), totalLength), specialStr);
          resolve();
        });
      });
    }
  };

  const verifyBlobValueWithFileData = async function(selectSql, inFileName) {
    let result = null;

    result = await connection.execute(selectSql);

    const lob = result.rows[0][0];
    assert(lob);

    let blobData = 0;
    let totalLength = 0;
    blobData = Buffer.from("", 'utf8');
    await new Promise((resolve, reject) => {
      lob.on('data', function(chunk) {
        totalLength = totalLength + chunk.length;
        blobData = Buffer.concat([blobData, chunk], totalLength);
      });

      lob.on("error", reject);

      lob.on('end', function() {
        fs.readFile(inFileName, function(err, originalData) {
          assert.strictEqual(totalLength, originalData.length);
          assert.deepEqual(originalData, blobData);
        });
        resolve();
      });
    });
  };
});
