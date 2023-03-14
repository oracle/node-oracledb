/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   75. clobPlsqlBindAsString_bindout.js
 *
 * DESCRIPTION
 *   Testing CLOB binding out as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const fs       = require('fs');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('75. clobPlsqlBindAsString_bindout.js', function() {

  let connection;
  let insertID = 1; // assume id for insert into db starts from 1
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
                         "            clob_1  CLOB, \n" +
                         "            clob_2  CLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  const proc_lobs_in_tab = "BEGIN \n" +
                         "    DECLARE \n" +
                         "        e_table_missing EXCEPTION; \n" +
                         "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                         "    BEGIN \n" +
                         "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_lobs_in PURGE'); \n" +
                         "    EXCEPTION \n" +
                         "        WHEN e_table_missing \n" +
                         "        THEN NULL; \n" +
                         "    END; \n" +
                         "    EXECUTE IMMEDIATE (' \n" +
                         "        CREATE TABLE nodb_tab_lobs_in ( \n" +
                         "            id    NUMBER, \n" +
                         "            clob  CLOB \n" +
                         "        ) \n" +
                         "    '); \n" +
                         "END; ";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(proc_clob_in_tab);
    await connection.execute(proc_lobs_in_tab);
  });

  after(async function() {
    await connection.execute("DROP TABLE nodb_tab_clob_in PURGE");
    await connection.execute("DROP TABLE nodb_tab_lobs_in PURGE");
    await connection.close();
  });

  const insertClobWithString = async function(id, insertStr) {
    let sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
    let bindVar = {
      i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
      c: { val: insertStr, dir: oracledb.BIND_IN, type: oracledb.STRING }
    };

    if (insertStr == 'EMPTY_LOB') {
      sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, EMPTY_CLOB())";
      bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER }
      };
    }
    const result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  const preparedInFileName = './test/clobexample.txt';

  const prepareTableWithClob = async function(sql, id) {
    const bindVar = { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };

    const result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
    assert.strictEqual(result.outBinds.lobbv.length, 1);
    const lob = result.outBinds.lobbv[0];
    const inStream = fs.createReadStream(preparedInFileName);
    await new Promise((resolve, reject) => {
      inStream.on("error", reject);
      lob.on("error", reject);
      lob.on("finish", resolve);
      inStream.pipe(lob);
    });
    await connection.commit();
  };

  const verifyClobValueWithFileData = async function(selectSql) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    const clobData = await lob.getData();
    const data = await fs.promises.readFile(preparedInFileName,
      {encoding: "utf8"});
    assert.strictEqual(clobData, data);
  };

  // compare the result string with the original inserted string
  const compareResultStrAndOriginal = function(resultVal, originalStr, specialStr) {
    const resultLength = resultVal.length;
    const specStrLength = specialStr.length;
    assert.strictEqual(resultLength, originalStr.length);
    assert.strictEqual(resultVal.substring(0, specStrLength), specialStr);
    assert.strictEqual(resultVal.substring(resultLength - specStrLength, resultLength), specialStr);
  };

  const verifyBindOutResult = async function(sqlRun, bindVar, originalStr, specialStr) {
    const result = await connection.execute(sqlRun, bindVar);
    if (originalStr === "EMPTY_LOB" || originalStr == undefined || originalStr == null || originalStr === "") {
      assert.strictEqual(result.outBinds.c, null);
    } else {
      const resultVal = result.outBinds.c;
      compareResultStrAndOriginal(resultVal, originalStr, specialStr);
    }
  };

  describe('75.1 CLOB, PLSQL, BIND_OUT', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_741 (clob_id IN NUMBER, clob_out OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
                "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_clobs_out_741; ";
    const sqlRun = "BEGIN nodb_clobs_out_741 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_clobs_out_741";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('75.1.1 works with EMPTY_LOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 75.1.1

    it('75.1.2 works with EMPTY_LOB and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 75.1.2

    it('75.1.3 works with EMPTY_LOB and bind out maxSize set to (64k - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 75.1.3

    it('75.1.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 75.1.4

    it('75.1.5 works with null and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 75.1.5

    it('75.1.6 works with null and bind out maxSize set to (64k - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 75.1.6

    it('75.1.7 works with empty string', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, "");
      await verifyBindOutResult(sqlRun, bindVar, "", null);
    }); // 75.1.7

    it('75.1.8 works with empty string and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, "");
      await verifyBindOutResult(sqlRun, bindVar, "", null);
    }); // 75.1.8

    it('75.1.9 works with empty string and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, "");
      await verifyBindOutResult(sqlRun, bindVar, "", null);
    }); // 75.1.9

    it('75.1.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 75.1.10

    it('75.1.11 works with undefined and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 75.1.11

    it('75.1.12 works with undefined and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 75.1.12

    it('75.1.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        /NJS-011:/
      );
    }); // 75.1.13

    it('75.1.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        /NJS-011:/
      );
    }); // 75.1.14

    it('75.1.15 works with String length 32K', async function() {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      const len = 32768;
      const sequence = insertID++;
      const specialStr = "75.1.15";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr);
    }); // 75.1.15

    it('75.1.16 works with String length (64K - 1)', async function() {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb
      const len = 65535;
      const sequence = insertID++;
      const specialStr = "75.1.16";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr);
    }); // 75.1.16

    it('75.1.17 works with String length (64K + 1)', async function() {
      const len = 65537;
      const sequence = insertID++;
      const specialStr = "75.1.17";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr);
    }); // 75.1.17

    it('75.1.18 works with String length (1MB + 1)', async function() {
      const len = 1048577; // 1 * 1024 * 1024 + 1
      const sequence = insertID++;
      const specialStr = "75.1.18";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr);
    }); // 75.1.18

    it('75.1.19 works with bind value and type mismatch', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 100, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        /NJS-011:/
      );
    }); // 75.1.19

    it('75.1.20 mixing named with positional binding', async function() {
      const len = 50000;
      const sequence = insertID++;
      const specialStr = "75.1.20";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len } ];
      await insertClobWithString(sequence, clobStr);
      const result = await connection.execute(sqlRun, bindVar);
      const resultVal = result.outBinds[0];
      compareResultStrAndOriginal(resultVal, clobStr, specialStr);
    }); // 75.1.20

    it('75.1.21 works with UPDATE', async function() {
      const proc_7412 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7412 (clob_id IN NUMBER, clob_out OUT CLOB, clob_in CLOB) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_clob_in set clob_1 = clob_in where id = clob_id; \n" +
                      "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7412; ";
      const sqlRun_7412 = "BEGIN nodb_clobs_out_7412 (:i, :co, :ci); END;";
      const proc_drop_7412 = "DROP PROCEDURE nodb_clobs_out_7412";
      const sequence = insertID++;
      const len_1 = 50000;
      const specialStr_1 = "75.1.21_1";
      const clobStr_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 2000;
      const specialStr_2 = "75.1.21_2";
      const clobStr_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len_1 },
        ci: { val:clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };
      await insertClobWithString(sequence, clobStr_1);
      await connection.execute(proc_7412);
      const result = await connection.execute(sqlRun_7412, bindVar);
      const resultVal = result.outBinds.co;
      compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
      await connection.execute(proc_drop_7412);
    }); // 75.1.21

    it('75.1.22 works with substr', async function() {
      const proc_7415 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7415 (clob_id IN NUMBER, clob_out OUT CLOB) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    select substr(clob_1, 1, 3) into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7415; ";
      const sqlRun_7415 = "BEGIN nodb_clobs_out_7415 (:i, :co); END;";
      const proc_drop_7415 = "DROP PROCEDURE nodb_clobs_out_7415";
      const sequence = insertID++;
      const len = 50000;
      const specialStr = "75.1.22";
      let clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await connection.execute(proc_7415);
      const result = await connection.execute(sqlRun_7415, bindVar);
      const resultVal = result.outBinds.co;
      // PLSQL substr function: the position starts from zero(0).
      // The substring method extracts the characters in a string between "start" and "end", not including "end" itself.
      clobStr = clobStr.substring(0, 3);
      assert.strictEqual(resultVal.length, 3);
      assert.strictEqual(resultVal, clobStr);
      await connection.execute(proc_drop_7415);
    }); // 75.1.22

    it('75.1.23 named binging, bind out maxSize smaller than string length ( < 32K )', async function() {
      const len = 300;
      const sequence = insertID++;
      const specialStr = "75.1.23";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 }
      };
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06502:/
      );
    }); // 75.1.23

    it('75.1.24 named binding, bind out maxSize smaller than string length ( > 32K )', async function() {
      const len = 50000;
      const sequence = insertID++;
      const specialStr = "75.1.24";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 }
      };
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-016:/
      );
    }); // 75.1.24

    it('75.1.25 named binging, bind out maxSize smaller than string length ( > 64K )', async function() {
      const len = 50000;
      const sequence = insertID++;
      const specialStr = "75.1.25";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 }
      };
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-016:/
      );
    }); // 75.1.25

    it('75.1.26 positional binging, bind out maxSize smaller than string length ( < 32K )', async function() {
      const len = 500;
      const sequence = insertID++;
      const specialStr = "75.1.26";
      const clobStr = random.getRandomString(len, specialStr);
      const sqlRun = "BEGIN nodb_clobs_out_741 (:1, :2); END;";
      const bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 } ];
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06502:/
      );
    }); // 75.1.26

    it('75.1.27 positional binging, bind out maxSize smaller than string length ( > 32K )', async function() {
      const len = 50000;
      const sequence = insertID++;
      const specialStr = "75.1.27";
      const clobStr = random.getRandomString(len, specialStr);
      const sqlRun = "BEGIN nodb_clobs_out_741 (:1, :2); END;";
      const bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 } ];
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-016:/
      );
    }); // 75.1.27

    it('75.1.28 positional binging, bind out maxSize smaller than string length ( > 64K )', async function() {
      const len = 65539;
      const sequence = insertID++;
      const specialStr = "75.1.28";
      const clobStr = random.getRandomString(len, specialStr);
      const sqlRun = "BEGIN nodb_clobs_out_741 (:1, :2); END;";
      const bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 } ];
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-016:/
      );
    }); // 75.1.28

  }); // 75.1

  describe('75.2 CLOB, PLSQL, BIND_OUT to VARCHAR2', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_742 (clob_id IN NUMBER, clob_out OUT VARCHAR2) \n" +
               "AS \n" +
               "BEGIN \n" +
                "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_clobs_out_742; ";
    const sqlRun = "BEGIN nodb_clobs_out_742 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_clobs_out_742";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('75.2.1 works with EMPTY_LOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 75.2.1

    it('75.2.2 works with EMPTY_LOB and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 75.2.2

    it('75.2.3 works with EMPTY_LOB and bind out maxSize set to (64k - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, "EMPTY_LOB");
      await verifyBindOutResult(sqlRun, bindVar, "EMPTY_LOB", null);
    }); // 75.2.3

    it('75.2.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 75.2.4

    it('75.2.5 works with null and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 75.2.5

    it('75.2.6 works with null and bind out maxSize set to (64k - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, null);
      await verifyBindOutResult(sqlRun, bindVar, null, null);
    }); // 75.2.6

    it('75.2.7 works with empty string', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, "");
      await verifyBindOutResult(sqlRun, bindVar, "", null);
    }); // 75.2.7

    it('75.2.8 works with empty string and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, "");
      await verifyBindOutResult(sqlRun, bindVar, "", null);
    }); // 75.2.8

    it('75.2.9 works with empty string and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, "");
      await verifyBindOutResult(sqlRun, bindVar, "", null);
    }); // 75.2.9

    it('75.2.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
      };
      await insertClobWithString(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 75.2.10

    it('75.2.11 works with undefined and bind out maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 1 }
      };
      await insertClobWithString(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 75.2.11

    it('75.2.12 works with undefined and bind out maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 65535 }
      };
      await insertClobWithString(sequence, undefined);
      await verifyBindOutResult(sqlRun, bindVar, undefined, null);
    }); // 75.2.12

    it('75.2.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        /NJS-011:/
      );
    }); // 75.2.13

    it('75.2.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const sql = "INSERT INTO nodb_tab_clob_in (id, clob_1) VALUES (:i, :c)";
      await assert.rejects(
        async () => await connection.execute(sql, bindVar),
        /NJS-011:/
      );
    }); // 75.2.14

    it('75.2.15 works with String length (32K - 1)', async function() {
      const len = 32767;
      const sequence = insertID++;
      const specialStr = "75.2.15";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await verifyBindOutResult(sqlRun, bindVar, clobStr, specialStr);
    }); // 75.2.15

    it('75.2.16 works with String length 32K', async function() {
      const len = 32768;
      const sequence = insertID++;
      const specialStr = "75.2.16";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06502:/
      );
    }); // 75.2.16

    it('75.2.17 works with bind out maxSize smaller than string length', async function() {
      const len = 500;
      const sequence = insertID++;
      const specialStr = "75.2.17";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = [ sequence, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len - 1 } ];
      await insertClobWithString(sequence, clobStr);
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06502:/
      );
    }); // 75.2.17

    it('75.2.18 works with UPDATE', async function() {
      const proc_7518 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7518 (clob_id IN NUMBER, clob_out OUT CLOB, clob_in VARCHAR2) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    update nodb_tab_clob_in set clob_1 = clob_in where id = clob_id; \n" +
                      "    select clob_1 into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7518; ";
      const sqlRun_7518 = "BEGIN nodb_clobs_out_7518 (:i, :co, :ci); END;";
      const proc_drop_7518 = "DROP PROCEDURE nodb_clobs_out_7518";
      const sequence = insertID++;
      const len_1 = 500;
      const specialStr_1 = "75.2.18_1";
      const clobStr_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 200;
      const specialStr_2 = "75.2.18_2";
      const clobStr_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len_1 },
        ci: { val:clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };
      await insertClobWithString(sequence, clobStr_1);
      await connection.execute(proc_7518);
      const result = await connection.execute(sqlRun_7518, bindVar);
      const resultVal = result.outBinds.co;
      compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
      await connection.execute(proc_drop_7518);
    }); // 75.2.18

    it('75.2.19 works with substr', async function() {
      const proc_7519 = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_7519 (clob_id IN NUMBER, clob_out OUT VARCHAR2) \n" +
                      "AS \n" +
                      "BEGIN \n" +
                      "    select substr(clob_1, 1, 3) into clob_out from nodb_tab_clob_in where id = clob_id; \n" +
                      "END nodb_clobs_out_7519; ";
      const sqlRun_7519 = "BEGIN nodb_clobs_out_7519 (:i, :co); END;";
      const proc_drop_7519 = "DROP PROCEDURE nodb_clobs_out_7519";
      const sequence = insertID++;
      const len = 500;
      const specialStr = "75.2.19";
      let clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        co: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
      };
      await insertClobWithString(sequence, clobStr);
      await connection.execute(proc_7519);
      const result = await connection.execute(sqlRun_7519, bindVar);
      const resultVal = result.outBinds.co;
      // PLSQL substr function: the position starts from zero(0).
      // The substring method extracts the characters in a string between
      // "start" and "end", not including "end" itself.
      clobStr = clobStr.substring(0, 3);
      assert.strictEqual(resultVal.length, 3);
      assert.strictEqual(resultVal, clobStr);
      await connection.execute(proc_drop_7519);
    }); // 75.2.19

  }); // 75.2

  describe('75.3 Multiple CLOBs, BIND_OUT', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_out_745 (clob_id IN NUMBER, clob_1 OUT CLOB, clob_2 OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    select clob_1, clob_2 into clob_1, clob_2 from nodb_tab_clob_in where id = clob_id; \n" +
               "END nodb_lobs_out_745; ";
    const sqlRun = "BEGIN nodb_lobs_out_745 (:i, :c1, :c2); END;";
    const proc_drop = "DROP PROCEDURE nodb_lobs_out_745";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    const insertTwoClobWithString = async function(id, insertStr1, insertStr2) {
      const sql = "INSERT INTO nodb_tab_clob_in (id, clob_1, clob_2) VALUES (:i, :c1, :c2)";
      const bindVar = {
        i: { val: id, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        c1: { val: insertStr1, dir: oracledb.BIND_IN, type: oracledb.STRING },
        c2: { val: insertStr2, dir: oracledb.BIND_IN, type: oracledb.STRING }
      };
      const result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.rowsAffected, 1);
    };

    it('75.3.1 bind two string', async function() {
      const sequence = insertID++;
      const specialStr_1 = "75.3.1_1";
      const specialStr_2 = "75.3.1_2";
      const len1 = 50000;
      const len2 = 10000;
      const clobStr_1 = random.getRandomString(len1, specialStr_1);
      const clobStr_2 = random.getRandomString(len2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len1 },
        c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len2 }
      };
      await insertTwoClobWithString(sequence, clobStr_1, clobStr_2);
      const result = await connection.execute(sqlRun, bindVar);
      let resultVal = result.outBinds.c1;
      compareResultStrAndOriginal(resultVal, clobStr_1, specialStr_1);
      resultVal = result.outBinds.c2;
      compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
    }); // 75.3.1

    it('75.3.2 bind a txt file and a string', async function() {
      const specialStr = "75.3.2";
      const sequence = insertID++;
      const len1 = 50000;
      const clobStr_1 = random.getRandomString(len1, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len1 },
        c2: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
      };
      let sql = "INSERT INTO nodb_tab_clob_in (id, clob_2) VALUES (:i, EMPTY_CLOB()) RETURNING clob_2 INTO :lobbv";
      await prepareTableWithClob(sql, sequence);
      sql = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithFileData(sql);
      sql = "UPDATE nodb_tab_clob_in set clob_1 = :c where id = :i";
      const bindVar_1 = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len1 }
      };
      let result = await connection.execute(sql, bindVar_1);
      assert.strictEqual(result.rowsAffected, 1);
      result = await connection.execute(sqlRun, bindVar);
      const resultVal = result.outBinds.c1;
      compareResultStrAndOriginal(resultVal, clobStr_1, specialStr);
      const lob = result.outBinds.c2;
      lob.setEncoding("utf8");
      const clobData = await lob.getData();
      const data = await fs.promises.readFile(preparedInFileName,
        {encoding: "utf8"});
      assert.strictEqual(clobData, data);
    }); // 75.3.2

    it('75.3.3 bind two string, one > (64K - 1)', async function() {
      const sequence = insertID++;
      const specialStr_1 = "75.3.3_1";
      const specialStr_2 = "75.3.3_2";
      const len1 = 65538;
      const len2 = 10000;
      const clobStr_1 = random.getRandomString(len1, specialStr_1);
      const clobStr_2 = random.getRandomString(len2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len1 },
        c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len2 }
      };
      await insertTwoClobWithString(sequence, clobStr_1, clobStr_2);
      const result = await connection.execute(sqlRun, bindVar);
      let resultVal = result.outBinds.c1;
      compareResultStrAndOriginal(resultVal, clobStr_1, specialStr_1);
      resultVal = result.outBinds.c2;
      compareResultStrAndOriginal(resultVal, clobStr_2, specialStr_2);
    }); // 75.3.3

  }); // 75.3

});
