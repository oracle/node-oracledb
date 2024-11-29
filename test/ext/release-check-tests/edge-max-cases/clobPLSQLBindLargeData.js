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
 *   6. clobPLSQLBindLargeData.js
 *
 * DESCRIPTION
 *   Testing PLSQL bind larger size CLOB.
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
const dbConfig  = require('../../../dbconfig.js');

describe('6.clobPLSQLBindLargeData.js', function() {
  this.timeout(3600000);
  let connection = null;
  let insertID = 100;
  const fileRoot = process.cwd();

  const proc_clob_pre_tab = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_pre PURGE'); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE (' \n" +
                          "        CREATE TABLE nodb_tab_lobs_pre ( \n" +
                          "            id    NUMBER, \n" +
                          "            clob  CLOB \n" +
                          "        ) \n" +
                          "    '); \n" +
                          "END; ";
  const proc_clob_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_clob_in ( \n" +
                         "            id      NUMBER, \n" +
                         "            clob    CLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  before(async function() {
    connection = await  oracledb.getConnection(dbConfig);

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

  describe('6.1 CLOB, PLSQL, BIND_IN', function() {
    const proc_bind_in = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN CLOB)\n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob) values (clob_id, clob_in); \n" +
                       "END nodb_clobs_in_741; ";
    const proc_drop = "DROP PROCEDURE nodb_clobs_in_741";
    const insertTable = "nodb_tab_lobs_pre";

    before(async function() {
      await connection.execute(proc_bind_in);
    }); // before

    after(async function() {
      await connection.execute(proc_drop);
    }); // after

    it.skip('6.1.1 PLSQL, BIND_IN a 1GB txt file', async function() {
      const fileSizeInGB = 1;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;
      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    }); // 6.1.1

    it.skip('6.1.2 PLSQL, BIND_IN a 2GB txt file', async function() {
      const fileSizeInGB = 2;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    });

    it.skip('6.1.3 PLSQL, BIND_IN a 2GB-1 txt file', async function() {
      const fileSizeInGB = 2;
      const numMinus = 1;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    });

    it.skip('6.1.4 PLSQL, BIND_IN a 4GB txt file', async function() {
      const fileSizeInGB = 4;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindInLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);
    });

    it('6.1.5 PLSQL, BIND_IN a 10MB txt file', async function() {
      const fileSize = 10 * 1024 * 1024;
      const specialStr = '6.1.5';

      await bindInSmallFile(fileSize, insertTable, specialStr);
    });

    it('6.1.6 PLSQL, BIND_IN a 20MB txt file', async function() {
      const fileSize = 20 * 1024 * 1024;
      const specialStr = '6.1.6';

      await bindInSmallFile(fileSize, insertTable, specialStr);
    });

    it('6.1.7 PLSQL, BIND_IN a 50MB txt file', async function() {
      const fileSize = 50 * 1024 * 1024;
      const specialStr = '6.1.7';

      await bindInSmallFile(fileSize, insertTable, specialStr);
    });

  }); // 6.1

  describe('6.2 CLOB, PLSQL, BIND_OUT', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_742 (clob_id IN NUMBER, clob_out OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
                "    select clob into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_clobs_out_742; ";
    const proc_drop = "DROP PROCEDURE nodb_clobs_out_742";
    const insertTable = "nodb_tab_clob_in";

    before(async function() {
      await connection.execute(proc);
    }); // before

    after(async function() {
      await connection.execute(proc_drop);
    }); // after

    it('6.2.1 PLSQL, BIND_OUT, 1GB CLOB', async function() {
      const fileSizeInGB = 1;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindOutLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);

    }); // 6.2.1

    it('6.2.2 PLSQL, BIND_OUT, 2GB CLOB', async function() {
      const fileSizeInGB = 2;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindOutLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);

    }); // 6.2.2

    it('6.2.3 PLSQL, BIND_OUT, 2GB-1 CLOB', async function() {
      const fileSizeInGB = 2;
      const numMinus = 1;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindOutLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);

    }); // 6.2.3

    it.skip('6.2.4 PLSQL, BIND_OUT, 4GB CLOB', async function() {
      const fileSizeInGB = 4;
      const numMinus = 0;
      const lenExpected = fileSizeInGB * 1024 * 1024 * 1024 - numMinus;

      await bindOutLargeFile(fileSizeInGB, numMinus, lenExpected, insertTable);

    });

    it('6.2.5 PLSQL, BIND_OUT, 10MB CLOB', async function() {
      const specialStr = "6.2.5";
      const fileSize = 10 * 1024 * 1024;

      await bindOutSmallFile(fileSize, insertTable, specialStr,);
    });

    it('6.2.6 PLSQL, BIND_OUT, 20MB CLOB', async function() {
      const specialStr = "6.2.6";
      const fileSize = 20 * 1024 * 1024;

      await bindOutSmallFile(fileSize, insertTable, specialStr,);
    });

    it('6.2.7 PLSQL, BIND_OUT, 50MB CLOB', async function() {
      const specialStr = "6.2.7";
      const fileSize = 50 * 1024 * 1024;

      await bindOutSmallFile(fileSize, insertTable, specialStr,);
    });
  }); // 6.2

  const bindInLargeFile = async function(fileSizeInGB, numMinus, lenExpected, insertTable) {
    const sqlRun = "BEGIN nodb_clobs_in_741 (:i, :c); END;";
    let lob = {};

    inFileName = fileRoot + '/' + fileSizeInGB + 'largeString.txt';
    largeFile.createFileInGB(inFileName, fileSizeInGB, numMinus);

    await insetTableWithClob(insertID, inFileName, insertTable);

    const sql = "select clob from " + insertTable + " where id = " + insertID;
    const result = await connection.execute(sql);
    lob = result.rows[0][0];
    assert(lob);

    const bindconst = { i: insertID, c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN } };
    await connection.execute(sqlRun, bindconst);

    await verifyBindinClob(insertID, insertID, lenExpected);

    if (fs.existsSync(inFileName))
      fs.unlinkSync(inFileName);
  };

  const bindInSmallFile = async function(fileSize, insertTable, specialStr) {
    const sqlRun = "BEGIN nodb_clobs_in_741 (:i, :c); END;";
    let lob = {};

    inFileName = fileRoot + '/' + 'smallString.txt';
    largeFile.createFileInKB(inFileName, fileSize, specialStr);

    await insetTableWithClob(insertID, inFileName, insertTable);

    const sql = "select clob from " + insertTable + " where id = " + insertID;
    const result = await connection.execute(sql);
    lob = result.rows[0][0];
    assert(lob);

    const bindconst = { i: insertID, c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN } };
    await connection.execute(sqlRun, bindconst);

    await verifyBindinClob(insertID, insertID, fileSize);

    if (fs.existsSync(inFileName))
      fs.unlinkSync(inFileName);
  };

  const bindOutLargeFile = async function(fileSizeInGB, numMinus, lenExpected, insertTable) {
    const sqlRun = "BEGIN nodb_clobs_out_742 (:i, :c); END;";
    let resultClob = {};
    inFileName = fileRoot + '/' + fileSizeInGB + 'largeString.txt';
    largeFile.createFileInGB(inFileName, fileSizeInGB, numMinus);

    await insetTableWithClob(insertID, inFileName, insertTable);

    const bindconst = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(sqlRun, bindconst);
    resultClob = result.outBinds.c;
    assert(resultClob);

    await verifyBindoutClob(resultClob, insertID, insertID, lenExpected);

    if (fs.existsSync(inFileName))
      fs.unlinkSync(inFileName);
  };

  const bindOutSmallFile = async function(fileSize, insertTable, specialStr) {
    const sqlRun = "BEGIN nodb_clobs_out_742 (:i, :c); END;";
    let resultClob = {};

    inFileName = fileRoot + '/' + 'smallString.txt';
    largeFile.createFileInKB(inFileName, fileSize, specialStr);

    await insetTableWithClob(insertID, inFileName, insertTable);

    const bindconst = {
      i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      c: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(sqlRun, bindconst);
    resultClob = result.outBinds.c;
    assert(resultClob);

    await verifyBindoutClob(resultClob, insertID, insertID, fileSize);

    if (fs.existsSync(inFileName))
      fs.unlinkSync(inFileName);
  };

  const setupAllTable = async function() {
    await connection.execute(proc_clob_in_tab);
    await connection.execute(proc_clob_pre_tab);
  };

  const dropAllTable = async function() {
    await connection.execute("DROP TABLE nodb_tab_clob_in PURGE");
    await connection.execute("DROP TABLE nodb_tab_lobs_pre PURGE");
  };

  const insetTableWithClob = async function(id, inFileName, tableName) {
    const sql = "INSERT INTO " + tableName + " (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
    const bindconst = { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };

    // a transaction needs to span the INSERT and pipe()
    const result = await connection.execute(sql, bindconst, { autoCommit: false });
    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);

    const inStream = fs.createReadStream(inFileName);
    const lob = result.outBinds.lobbv[0];

    await new Promise((resolve, reject) => {
      lob.on('error', reject);
      inStream.on('error', reject);
      lob.on('close', resolve);
      inStream.pipe(lob); // copies the text to the CLOB
    });

    await connection.commit();
  };

  const verifyBindinClob = async function(preID, inID, lenExpected) {
    const proc_compare_clob = "CREATE OR REPLACE PROCEDURE nodb_clob_compare(result OUT NUMBER, len OUT NUMBER) \n" +
                            "IS \n" +
                            "    clob1 CLOB; \n" +
                            "    clob2 CLOB; \n" +
                            "BEGIN \n" +
                            "    select clob into clob1 from nodb_tab_lobs_pre where id = " + preID + "; \n" +
                            "    select clob into clob2 from nodb_tab_clob_in where id = " + inID + "; \n" +
                            "    result := DBMS_LOB.COMPARE(clob1, clob2); \n" + // Zero if the comparison succeeds, nonzero if not.
                            "    len := length(clob1); \n" +
                            "END nodb_clob_compare;";
    const sqlRunCompareProc = "begin nodb_clob_compare(:r, :l); end;";
    const sqlDropCompareProc = "DROP PROCEDURE nodb_clob_compare";

    await connection.execute(proc_compare_clob);
    const bindconst = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(sqlRunCompareProc, bindconst);
    assert.strictEqual(result.outBinds.r, 0);
    assert.strictEqual(result.outBinds.l, lenExpected);

    await connection.execute(sqlDropCompareProc);
  };

  const verifyBindoutClob = async function(clob, insertID, preID, lenExpected) {
    const insetSql = "INSERT INTO nodb_tab_lobs_pre (id, clob) VALUES (:i, :c)";
    const proc_compare_clob = "CREATE OR REPLACE PROCEDURE nodb_clob_compare(result OUT NUMBER, len OUT NUMBER) \n" +
                              "IS \n" +
                              "    clob1 CLOB; \n" +
                              "    clob2 CLOB; \n" +
                              "BEGIN \n" +
                              "    select clob into clob1 from nodb_tab_lobs_pre where id = " + preID + "; \n" +
                              "    select clob into clob2 from nodb_tab_lobs_pre where id = " + insertID + "; \n" +
                              "    result := DBMS_LOB.COMPARE(clob1, clob2); \n" + // Zero if the comparison succeeds, nonzero if not.
                              "    len := length(clob1); \n" +
                              "END nodb_clob_compare;";
    const sqlRunCompareProc = "begin nodb_clob_compare(:r, :l); end;";
    const sqlDropCompareProc = "DROP PROCEDURE nodb_clob_compare";

    let bindconst = { i: insertID, c: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_IN } };
    await connection.execute(
      insetSql,
      bindconst,
      { autoCommit: true },
      async function(err) {
        if (err) {
          // ORA-01691: unable to extend lob segment SHENZHEN.SYS_LOB0000185953C00002$$ by 699912 in tablespace SYSTE
          assert.match(err.message, /^ORA-01691:/);
        }
        await clob.close();
      }
    );

    await connection.execute(proc_compare_clob);

    bindconst = {
      r: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      l: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(sqlRunCompareProc, bindconst);
    assert.strictEqual(result.outBinds.r, 0);
    assert.strictEqual(result.outBinds.l, lenExpected);

    await connection.execute(sqlDropCompareProc);
  };

});
