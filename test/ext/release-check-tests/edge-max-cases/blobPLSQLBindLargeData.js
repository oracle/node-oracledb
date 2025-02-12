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
 *   3. blobPLSQLBindLargeData.js
 *
 * DESCRIPTION
 *   Testing PLSQL bind larger size BLOB.
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
const dbConfig      = require('../../../dbconfig.js');
const largeFile     = require('./largeFile.js');

describe('3.blobPLSQLBindLargeData.js', function() {
  let connection = null;
  let insertID = 1;
  const fileRoot = process.cwd();

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

  let inFileName = '';

  describe('3.1 BLOB, PLSQL, BIND_IN', function() {
    const proc_bind_in = `CREATE OR REPLACE PROCEDURE nodb_blobs_in_741 (blob_id IN NUMBER, blob_in IN BLOB)\n
                        AS \n
                        BEGIN \n
                           insert into nodb_tab_blob_in (id, blob) values (blob_id, blob_in); \n
                        END nodb_blobs_in_741; `;
    const proc_drop = `DROP PROCEDURE nodb_blobs_in_741`;
    const insertTable = `nodb_tab_lobs_pre`;

    before(async function() {
      await executeSQL(proc_bind_in);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('3.1.1 PLSQL, BIND_IN a 1GB txt file', async function() {
      const fileSizeInGB = 1;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024;

      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.1.1

    it('3.1.2 PLSQL, BIND_IN a 2GB txt file', async function() {
      const fileSizeInGB = 2;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024;

      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.1.2

    it('3.1.3 PLSQL, BIND_IN a 2GB-2 txt file', async function() {
      const fileSizeInGB = 2;
      const numMinus = 1;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.1.3

    it('3.1.4 PLSQL, BIND_IN a 4GB txt file', async function() {
      const fileSizeInGB = 4;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.1.4

    it('3.1.5 PLSQL, BIND_IN a 10MB txt file', async function() {
      const specialStr = "3.1.5";
      const fileSize = 10 * 1024 * 1024;

      await bindInSmallFile(fileSize, insertTable, specialStr);
    });

    it('3.1.6 PLSQL, BIND_IN a 20MB txt file', async function() {
      const specialStr = "3.1.6";
      const fileSize = 20 * 1024 * 1024;

      await bindInSmallFile(fileSize, insertTable, specialStr);
    });

    it('3.1.7 PLSQL, BIND_IN a 50MB txt file', async function() {
      const specialStr = "3.1.7";
      const fileSize = 50 * 1024 * 1024;

      await bindInSmallFile(fileSize, insertTable, specialStr);
    });

  }); // 3.1

  describe('3.2 BLOB, PLSQL, BIND_OUT', function() {
    const proc = `CREATE OR REPLACE PROCEDURE nodb_blobs_out_742 (blob_id IN NUMBER, blob_out OUT BLOB) \n
                AS \n
                BEGIN \n
                    select blob into blob_out from nodb_tab_blob_in where id = blob_id; \n
                END nodb_blobs_out_742; `;
    const proc_drop = `DROP PROCEDURE nodb_blobs_out_742`;
    const insertTable = `nodb_tab_blob_in`;

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('3.2.1 PLSQL, BIND_OUT, 1GB BLOB', async function() {
      const fileSizeInGB = 1;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindOutLargeData(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.2.1

    it.skip('3.2.2 PLSQL, BIND_OUT, 2GB BLOB', async function() {
      const fileSizeInGB = 2;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindOutLargeData(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.2.2

    it.skip('3.2.3 PLSQL, BIND_OUT, 2GB - 1 BLOB', async function() {
      const fileSizeInGB = 2;
      const numMinus = 1;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;
      console.log(lenExpected);

      await bindOutLargeData(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.2.3

    it.skip('3.2.4 PLSQL, BIND_OUT, 4GB BLOB', async function() {
      const fileSizeInGB = 4;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindOutLargeData(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 3.2.4

    it('3.2.4 PLSQL, BIND_OUT, 10MB BLOB', async function() {
      const specialStr = "3.2.4";
      const fileSize = 10 * 1024 * 1024;
      await bindOutSmallData(fileSize, insertTable, specialStr);
    });

    it('3.2.5 PLSQL, BIND_OUT, 20MB BLOB', async function() {
      const specialStr = "3.2.5";
      const fileSize = 20 * 1024 * 1024;
      await bindOutSmallData(fileSize, insertTable, specialStr);
    });

    it('3.2.6 PLSQL, BIND_OUT, 50MB BLOB', async function() {
      const specialStr = "3.2.6";
      const fileSize = 50 * 1024 * 1024;
      await bindOutSmallData(fileSize, insertTable, specialStr);
    });
  }); // 3.2

  const bindInLargeFile = async function(fileSizeInGB, numMinus, lenExpected, insertTable) {
    const sqlRun = `BEGIN nodb_blobs_in_741 (:i, :b); END;`;
    let lob = {};
    let result = null;
    inFileName = fileRoot + '/' + fileSizeInGB + 'largeString.txt';
    await largeFile.createFileInGB(inFileName, fileSizeInGB, numMinus);
    await insertTableWithBlob(insertID, inFileName, insertTable);
    const sql = `select blob from ` + insertTable + ` where id = ` + insertID;
    result = await connection.execute(sql);

    lob = result.rows[0][0];
    assert(lob);
    const bindVar = {
      i: insertID,
      b: { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
    };
    try {
      await connection.execute(sqlRun, bindVar);
    } catch (err) {
      if (err) {
        // ORA-01691: unable to extend lob segment SHENZHEN.SYS_LOB0000185953C00002$$ by 699912 in tablespace SYSTE
        assert.equal(err.message.substring(0, 10), `ORA-01691:`);
      }
      lob.close();
    }
    await verifyBindinBlob(insertID, insertID, lenExpected);
    fs.unlinkSync(inFileName);
  };

  const bindInSmallFile = async function(fileSize, insertTable, specialStr) {
    const sqlRun = `BEGIN nodb_blobs_in_741 (:i, :b); END;`;
    let lob = {};
    let result = null;
    inFileName = fileRoot + '/' + 'smallString.txt';
    await largeFile.createFileInKB(inFileName, fileSize, specialStr);
    await insertTableWithBlob(insertID, inFileName, insertTable);
    const sql = `select blob from ` + insertTable + ` where id = ` + insertID;
    result = await connection.execute(sql);
    lob = result.rows[0][0];
    assert(lob);
    const bindVar = {
      i: insertID,
      b: { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
    };

    await connection.execute(
      sqlRun,
      bindVar);

    await verifyBindinBlob(insertID, insertID, fileSize);
    fs.unlinkSync(inFileName);
  };

  const bindOutLargeData = async function(fileSizeInGB, numMinus, lenExpected, insertTable) {
    const sqlRun = `BEGIN nodb_blobs_out_742 (:i, :b); END;`;
    let resultBlob = {};
    let result = null;
    inFileName = fileRoot + '/' + fileSizeInGB + 'largeData.txt';
    largeFile.createFileInGB(inFileName, fileSizeInGB, numMinus);
    await insertTableWithBlob(insertID, inFileName, insertTable);
    const bindVar = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      b: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
    };

    result = await connection.execute(sqlRun, bindVar);
    resultBlob = result.outBinds.b;
    assert(resultBlob);

    await verifyBindoutBlob(resultBlob, insertID, insertID, lenExpected);
    fs.unlinkSync(inFileName);
  };

  const bindOutSmallData = async function(fileSize, insertTable, specialStr) {
    const sqlRun = `BEGIN nodb_blobs_out_742 (:i, :b); END;`;
    let resultBlob = {};
    let result = null;
    inFileName = fileRoot + '/' + 'smallData.txt';
    largeFile.createFileInKB(inFileName, fileSize, specialStr);
    await insertTableWithBlob(insertID, inFileName, insertTable);
    const bindVar = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      b: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
    };

    result = await connection.execute(sqlRun, bindVar);
    resultBlob = result.outBinds.b;
    assert(resultBlob);
    await verifyBindoutBlob(resultBlob, insertID, insertID, fileSize);
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

  const insertTableWithBlob = async function(id, inFileName, tableName) {
    const sql = `INSERT INTO ` + tableName + ` (id, blob) VALUES (:i, EMPTY_BLOB()) RETURNING blob INTO :lobbv`;
    const bindVar = {
      i: id,
      lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
    };
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

  const verifyBindinBlob = async function(preID, inID, lenExpected) {
    const proc_compare_blob = `CREATE OR REPLACE PROCEDURE nodb_blob_compare(result OUT NUMBER, len OUT NUMBER) \n
                             IS \n
                                 blob1 BLOB; \n
                                 blob2 BLOB; \n
                             BEGIN \n
                                 select blob into blob1 from nodb_tab_lobs_pre where id = ` + preID + `; \n
                                 select blob into blob2 from nodb_tab_blob_in where id = ` + inID + `; \n
                                 result := DBMS_LOB.COMPARE(blob1, blob2); \n
                                 len := length(blob1); \n
                             END nodb_blob_compare;`;
    const sqlRunComparePorc = `begin nodb_blob_compare(:r, :l); end;`;
    const sqlDropComparePorc = `DROP PROCEDURE nodb_blob_compare`;
    let result = null;
    await executeSQL(proc_compare_blob);
    const bindVar = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    result = await connection.execute(sqlRunComparePorc, bindVar);

    assert.strictEqual(result.outBinds.r, 0);
    assert.strictEqual(result.outBinds.l, lenExpected);

    await executeSQL(sqlDropComparePorc);
  };

  const verifyBindoutBlob = async function(blob, insertID, preID, lenExpected) {
    let result = null;
    const insetSql = `INSERT INTO nodb_tab_lobs_pre (id, blob) VALUES (:i, :c)`;
    const proc_compare_blob = `CREATE OR REPLACE PROCEDURE nodb_blob_compare(result OUT NUMBER, len OUT NUMBER) \n
                               IS \n
                                   blob1 BLOB; \n
                                   blob2 BLOB; \n
                               BEGIN \n
                                   select blob into blob1 from nodb_tab_blob_in where id = ` + preID + `; \n
                                   select blob into blob2 from nodb_tab_lobs_pre where id = ` + insertID + `; \n
                                   result := DBMS_LOB.COMPARE(blob1, blob2); \n
                                   len := length(blob1); \n
                               END nodb_blob_compare;`;
    const sqlRunComparePorc = `begin nodb_blob_compare(:r, :l); end;`;
    const sqlDropComparePorc = `DROP PROCEDURE nodb_blob_compare`;

    let bindVar = {
      i: insertID,
      c: { val: blob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
    };

    await connection.execute(
      insetSql,
      bindVar,
      { autoCommit: true });
    blob.close();
    await executeSQL(proc_compare_blob);
    bindVar = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    result = await connection.execute(sqlRunComparePorc, bindVar);

    assert.strictEqual(result.outBinds.r, 0);
    assert.strictEqual(result.outBinds.l, lenExpected);

    await executeSQL(sqlDropComparePorc);
  };
});
