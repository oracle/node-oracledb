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
 *   74. clobPlsqlBindAsString_bindin.js
 *
 * DESCRIPTION
 *   Testing CLOB binding in as String.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const fs       = require('fs');
const fsPromises = require('fs/promises');
const random   = require('./random.js');

describe('74. clobPlsqlBindAsString_bindin.js', function() {

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

  const inFileName = './test/clobexample.txt';

  const prepareTableWithClob = async function(sql, id) {
    const bindVar = {
      i: id,
      lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };
    const result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
    const inStream = fs.createReadStream(inFileName);
    const lob = result.outBinds.lobbv[0];
    await new Promise((resolve, reject) => {
      inStream.on('error', reject);
      lob.on('error', reject);
      lob.on('finish', resolve);
      inStream.pipe(lob);
    });
    await connection.commit();
  };

  const verifyClobValueWithFileData = async function(selectSql) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    const clobData = await lob.getData();
    const fileData = await fsPromises.readFile(inFileName, {encoding: 'utf8'});
    assert.strictEqual(clobData, fileData);
  };

  // compare the selected value from DB with the inserted string
  const verifyClobValueWithString = async function(selectSql, originalString, specialStr) {
    const result = await connection.execute(selectSql);
    const lob = result.rows[0][0];
    if (originalString == null || originalString == undefined) {
      assert.strictEqual(lob, null);
    } else {
      const clobData = await lob.getData();
      if (originalString == "") {
        assert.strictEqual(clobData, specialStr);
      } else {
        await compareResultStrAndOriginal(clobData, originalString, specialStr);
      }
    }
  };

  // compare the result string with the original inserted string
  const compareResultStrAndOriginal = function(resultVal, originalStr, specialStr) {
    const resultLength = resultVal.length;
    const specStrLength = specialStr.length;
    assert.strictEqual(resultLength, originalStr.length);
    assert.strictEqual(resultVal.substring(0, specStrLength), specialStr);
    assert.strictEqual(resultVal.substring(resultLength - specStrLength, resultLength), specialStr);
  };

  // execute the bind in plsql procedure
  const plsqlBindIn = async function(sqlRun, bindVar, option) {
    await connection.execute(sqlRun, bindVar, option);
  };

  describe('74.1 CLOB, PLSQL, BIND_IN', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN CLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
               "END nodb_clobs_in_741; ";
    const sqlRun = "BEGIN nodb_clobs_in_741 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_clobs_in_741";
    const proc_7411 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_7411 (clob_id IN NUMBER, clob_in IN CLOB)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, EMPTY_CLOB()); \n" +
                    "END nodb_clobs_in_7411; ";
    const sqlRun_7411 = "BEGIN nodb_clobs_in_7411 (:i, :c); END;";
    const proc_drop_7411 = "DROP PROCEDURE nodb_clobs_in_7411";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('74.1.1 works with EMPTY_CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const option = { autoCommit: true };
      await connection.execute(proc_7411);
      await plsqlBindIn(sqlRun_7411, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, "", null);
      await connection.execute(proc_drop_7411);
    }); // 74.1.1

    it('74.1.2 works with EMPTY_CLOB and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      const option = { autoCommit: true };
      await connection.execute(proc_7411);
      await plsqlBindIn(sqlRun_7411, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, "", null);
      await connection.execute(proc_drop_7411);
    }); // 74.1.2

    it('74.1.3 works with EMPTY_CLOB and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      const option = { autoCommit: true };
      await connection.execute(proc_7411);
      await plsqlBindIn(sqlRun_7411, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, "", null);
      await connection.execute(proc_drop_7411);
    }); // 74.1.3

    it('74.1.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.4

    it('74.1.5 works with null and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.5

    it('74.1.6 works with null and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.6

    it('74.1.7 works with empty string', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN}
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.7

    it('74.1.8 works with empty string and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1}
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.8

    it('74.1.9 works with empty string and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535}
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.9

    it('74.1.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.10

    it('74.1.11 works with undefined and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.11

    it('74.1.12 works with undefined and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.1.12

    it('74.1.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
      // NJS-011: encountered bind value and type mismatch in parameter 2
    }); // 74.1.13

    it('74.1.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
      // NJS-011: encountered bind value and type mismatch in parameter 2
    }); // 74.1.14

    it('74.1.15 works with String length 32K', async function() {
      // Driver already supports CLOB AS STRING and BLOB AS BUFFER for PLSQL BIND if the data size less than or equal to 32767.
      // As part of this enhancement, driver allows even if data size more than 32767 for both column types
      const len = 32768;
      const sequence = insertID++;
      const specialStr = "74.1.15";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.1.15

    it('74.1.16 works with String length (64K - 1)', async function() {
      // The upper limit on the number of bytes of data that can be bound as
      // `STRING` or `BUFFER` when node-oracledb is linked with Oracle Client
      // 11.2 libraries is 64 Kb.  With Oracle Client 12, the limit is 1 Gb

      const len = 65535;
      const sequence = insertID++;
      const specialStr = "74.1.16";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.1.16

    it('74.1.17 works with String length (64K + 1)', async function() {
      const len = 65537;
      const sequence = insertID++;
      const specialStr = "74.1.17";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.1.17

    it('74.1.18 works with String length (1MB + 1)', async function() {
      const len = 1048577; // 1 * 1024 * 1024 + 1
      const sequence = insertID++;
      const specialStr = "74.1.18";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.1.18

    it('74.1.19 works with bind value and type mismatch', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 20, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
      // NJS-011: encountered bind value and type mismatch in parameter 2
    }); // 74.1.19

    it('74.1.20 mixing named with positional binding', async function() {
      const sqlRun_7419 = "BEGIN nodb_clobs_in_741 (:1, :2); END;";
      const len = 50000;
      const sequence = insertID++;
      const specialStr = "74.1.20";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = [ sequence, { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 } ];
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun_7419, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.1.20

    it('74.1.21 works with invalid CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: {}, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 5000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
      // NJS-011: encountered bind value and type mismatch in parameter 2
    }); // 74.1.21

    it('74.1.22 works with bind in maxSize smaller than string length', async function() {
      const len = 50000;
      const sequence = insertID++;
      const specialStr = "74.1.22";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len - 1 }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.1.22

    it('74.1.23 RETURN with bind type STRING', async function() {
      const proc_74123 = "CREATE OR REPLACE FUNCTION nodb_clobs_in_74123 (clob_id IN NUMBER, clob_in IN CLOB) RETURN VARCHAR2\n" +
                       "IS \n" +
                       "    strVal VARCHAR2(500); \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
                       "    select clob_1 into strVal from nodb_tab_clob_in where id = clob_id; \n" +
                       "    return strVal; \n" +
                       "END nodb_clobs_in_74123; ";
      const sqlRun_74123 = "BEGIN :o := nodb_clobs_in_74123(:i, :c); END;";
      const proc_drop_74123 = "DROP FUNCTION nodb_clobs_in_74123";
      const len = 500;
      const sequence = insertID++;
      const specialStr = "74.1.23";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len },
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      const option = { autoCommit: true };

      await connection.execute(proc_74123);
      const result = await connection.execute(sqlRun_74123, bindVar, option);
      const resultVal = result.outBinds.o;
      await compareResultStrAndOriginal(resultVal, clobStr, specialStr);
      await connection.execute(proc_drop_74123);
    }); // 74.1.23

    it('74.1.24 works with UPDATE', async function() {
      const proc_74124 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_74124 (clob_id IN NUMBER, clob_in IN CLOB, clob_update IN CLOB)\n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = clob_update where id = clob_id; \n" +
                       "END nodb_clobs_in_74124; ";
      const sqlRun_74124 = "BEGIN nodb_clobs_in_74124 (:i, :c1, :c2); END;";
      const proc_drop_74124 = "DROP PROCEDURE nodb_clobs_in_74124";
      const sequence = insertID++;
      const len_1 = 5000;
      const specialStr_1 = "74.1.24_1";
      const clobStr_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 65535;
      const specialStr_2 = "74.1.24_2";
      const clobStr_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 },
      };
      const option = { autoCommit: true };

      await connection.execute(proc_74124);
      await connection.execute(sqlRun_74124, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr_2, specialStr_2);
      await connection.execute(proc_drop_74124);
    }); // 74.1.24

    it('74.1.25 bind error: NJS-037, bind by name 1', async function() {
      const bindVar = {
        i: { val: ["sequence"], type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: "sequence", type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-037:/
      );
    }); // 74.1.25

    it('74.1.26 bind error: NJS-037, bind by name 2', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-037:/
      );
    }); // 74.1.26

    it('74.1.27 bind error: NJS-037, bind by name 3', async function() {
      const bindVar = {
        i: { val: [1, "sequence"], type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: "sequence", type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-037:/
      );
    }); // 74.1.27

    it('74.1.28 bind error: NJS-037, bind by name 4', async function() {
      const bindVar = {
        i: { val: [1, 2], type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: ["sequence", "ab", 3], type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-037:/
      );
    }); // 74.1.28

    it('74.1.29 bind error: NJS-052, bind by pos 1', async function() {
      const sequence = insertID++;
      const bindVar = [ sequence, { val: [0], type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 } ] ;
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-052:/
      );
    }); // 74.1.29

    it('74.1.30 bind error: NJS-052, bind by pos 2', async function() {
      const bindVar = [ { val: ["sequence"], type: oracledb.NUMBER, dir: oracledb.BIND_IN }, { val: "sequence", type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 } ] ;
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-052:/
      );
    }); // 74.1.30

    it('74.1.31 bind error: NJS-052, bind by pos 3', async function() {
      const bindVar = [ { val: [1, 2, "sequence"], type: oracledb.NUMBER, dir: oracledb.BIND_IN }, { val: "sequence", type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 } ] ;
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-052:/
      );
    }); // 74.1.31

    it('74.1.32 bind error: NJS-052, bind by pos 4', async function() {
      const bindVar = [ { val: [1, 2], type: oracledb.NUMBER, dir: oracledb.BIND_IN }, { val: ["sequence", 1], type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 } ] ;
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-052:/
      );
    }); // 74.1.32

  }); // 74.1

  describe('74.2 CLOB, PLSQL, BIND_IN to VARCHAR2', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN VARCHAR2)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
               "END nodb_clobs_in_741; ";
    const sqlRun = "BEGIN nodb_clobs_in_741 (:i, :c); END;";
    const proc_drop = "DROP PROCEDURE nodb_clobs_in_741";
    const proc_7411 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_7411 (clob_id IN NUMBER, clob_in IN VARCHAR2)\n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, EMPTY_CLOB()); \n" +
                    "END nodb_clobs_in_7411; ";
    const sqlRun_7411 = "BEGIN nodb_clobs_in_7411 (:i, :c); END;";
    const proc_drop_7411 = "DROP PROCEDURE nodb_clobs_in_7411";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('74.2.1 works with EMPTY_CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const option = { autoCommit: true };

      await connection.execute(proc_7411);
      await plsqlBindIn(sqlRun_7411, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, "", null);
      await connection.execute(proc_drop_7411);
    }); // 74.2.1

    it('74.2.2 works with EMPTY_CLOB and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      const option = { autoCommit: true };

      await connection.execute(proc_7411);
      await plsqlBindIn(sqlRun_7411, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, "", null);
      await connection.execute(proc_drop_7411);
    }); // 74.2.2

    it('74.2.3 works with EMPTY_CLOB and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      const option = { autoCommit: true };

      await connection.execute(proc_7411);
      await plsqlBindIn(sqlRun_7411, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, "", null);
      await connection.execute(proc_drop_7411);
    }); // 74.2.3

    it('74.2.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN }
      };
      const option = { autoCommit: true };
      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.4

    it('74.2.5 works with null and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.5

    it('74.2.6 works with null and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.6

    it('74.2.7 works with empty string', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN}
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.7

    it('74.2.8 works with empty string and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1}
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.8

    it('74.2.9 works with empty string and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: '', type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535}
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.9

    it('74.2.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.10

    it('74.2.11 works with undefined and bind in maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 1 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.11

    it('74.2.12 works with undefined and bind in maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: undefined, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65535 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, null, null);
    }); // 74.2.12

    it('74.2.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: NaN, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 74.2.13

    it('74.2.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: 0, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 50000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 74.2.14

    it('74.2.15 works with String length (32K - 1)', async function() {
      const len = 32767;
      const sequence = insertID++;
      const specialStr = "74.2.15";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.2.15

    it('74.2.16 works with String length 32K', async function() {
      const len = 32768;
      const sequence = insertID++;
      const specialStr = "74.2.16";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /ORA-06502:/
      );
      // ORA-06502: PL/SQL: numeric or value error
    }); // 74.2.16

    it('74.2.17 works with invalid CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: {}, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 5000 }
      };
      const options = { autoCommit: true };
      await assert.rejects(
        async () => await connection.execute(sqlRun, bindVar, options),
        /NJS-011:/
      );
    }); // 74.2.17

    it('74.2.18 works with bind in maxSize smaller than string length', async function() {
      const len = 500;
      const sequence = insertID++;
      const specialStr = "74.2.18";
      const clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len - 1 }
      };
      const options = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, options);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr, specialStr);
    }); // 74.2.18

    it('74.2.19 works with UPDATE', async function() {
      const proc_74219 = "CREATE OR REPLACE PROCEDURE nodb_clobs_in_74219 (clob_id IN NUMBER, clob_in IN VARCHAR2, clob_update IN VARCHAR2)\n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (clob_id, clob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = clob_update where id = clob_id; \n" +
                       "END nodb_clobs_in_74219; ";
      const sqlRun_74219 = "BEGIN nodb_clobs_in_74219 (:i, :c1, :c2); END;";
      const proc_drop_74219 = "DROP PROCEDURE nodb_clobs_in_74219";
      const sequence = insertID++;
      const len_1 = 3000;
      const specialStr_1 = "74.2.19_1";
      const clobStr_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 2000;
      const specialStr_2 = "74.2.19_2";
      const clobStr_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 },
      };
      const options = { autoCommit: true };

      await connection.execute(proc_74219);
      await connection.execute(sqlRun_74219, bindVar, options);
      const sql = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql, clobStr_2, specialStr_2);
      await connection.execute(proc_drop_74219);
    }); // 74.2.19

  }); // 74.2

  describe('74.3 Multiple CLOBs, BIND_IN', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_742 (clob_id IN NUMBER, clob_1 IN CLOB, clob_2 IN CLOB)\n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1, clob_2) values (clob_id, clob_1, clob_2); \n" +
               "END nodb_lobs_in_742; ";
    const sqlRun = "BEGIN nodb_lobs_in_742 (:i, :c1, :c2); END;";
    const proc_drop = "DROP PROCEDURE nodb_lobs_in_742";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('74.3.1 bind two string', async function() {
      const sequence = insertID++;
      const len_1 = 50000;
      const specialStr_1 = "74.3.1_1";
      const clobStr_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 10000;
      const specialStr_2 = "74.3.1_2";
      const clobStr_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql_1 = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql_1, clobStr_1, specialStr_1);
      const sql_2 = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql_2, clobStr_2, specialStr_2);
    }); // 74.3.1

    it('74.3.2 bind a txt file and a string', async function() {
      const preparedCLOBID = 200;
      const len_1 = 50000;
      const specialStr_1 = "74.3.2";
      const clobStr_1 = random.getRandomString(len_1, specialStr_1);
      const sequence = insertID++;

      let sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      await prepareTableWithClob(sql, preparedCLOBID);
      sql = "select clob from nodb_tab_lobs_in where id = :id";
      const result = await connection.execute(sql, { id: preparedCLOBID });
      const clob = result.rows[0][0];
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
      };
      await connection.execute(sqlRun, binds, { autoCommit: true });
      await clob.close();
      const sql_1 = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql_1, clobStr_1, specialStr_1);
      const sql_2 = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithFileData(sql_2);
    }); // 74.3.2

    it('74.3.3 bind two string, one > (64K - 1)', async function() {
      const sequence = insertID++;
      const len_1 = 65538;
      const specialStr_1 = "74.3.3_1";
      const clobStr_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 10000;
      const specialStr_2 = "74.3.3_2";
      const clobStr_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr_1, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_1 },
        c2: { val: clobStr_2, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len_2 }
      };
      const option = { autoCommit: true };

      await plsqlBindIn(sqlRun, bindVar, option);
      const sql_1 = "select clob_1 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql_1, clobStr_1, specialStr_1);
      const sql_2 = "select clob_2 from nodb_tab_clob_in where id = " + sequence;
      await verifyClobValueWithString(sql_2, clobStr_2, specialStr_2);
    }); // 74.3.3

  }); // 74.3

}); // 74
