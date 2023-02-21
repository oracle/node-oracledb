/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

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
 *   76. clobPlsqlBindAsString_bindinout.js
 *
 * DESCRIPTION
 *   Testing CLOB binding as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const fs       = require('fs');
const fsPromises = require('fs/promises');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('76. clobPlsqlBindAsString_bindinout.js', function() {

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

  // compare the result string with the original inserted string
  const compareResultStrAndOriginal = function(resultVal, originalStr, specialStr) {
    const resultLength = resultVal.length;
    const specStrLength = specialStr.length;
    assert.strictEqual(resultLength, originalStr.length);
    assert.strictEqual(resultVal.substring(0, specStrLength), specialStr);
    assert.strictEqual(resultVal.substring(resultLength - specStrLength,
      resultLength), specialStr);
  };

  // execute plsql bind in out procedure, and verify the plsql bind out string
  const plsqlBindInOut = async function(sqlRun, bindVar, originalStr, specialStr) {
    const result = await connection.execute(sqlRun, bindVar);
    const resultVal = result.outBinds.io;
    if (originalStr == 'EMPTY_CLOB' || originalStr == null || originalStr == "" || originalStr == undefined) {
      assert.strictEqual(resultVal, null);
    } else {
      compareResultStrAndOriginal(resultVal, originalStr, specialStr);
    }
  };

  describe('76.1 CLOB, PLSQL, BIND_INOUT', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_743 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
               "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
               "END nodb_clob_in_out_743;";
    const sqlRun = "begin nodb_clob_in_out_743(:i, :io); end;";
    const proc_drop = "DROP PROCEDURE nodb_clob_in_out_743";
    const proc_7431 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_7431 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, EMPTY_CLOB()); \n" +
                    "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                    "END nodb_clob_in_out_7431;";
    const sqlRun_7431 = "begin nodb_clob_in_out_7431(:i, :io); end;";
    const proc_drop_7431 = "DROP PROCEDURE nodb_clob_in_out_7431";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('76.1.1 works with EMPTY_CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await connection.execute(proc_7431);
      await plsqlBindInOut(sqlRun_7431, bindVar, 'EMPTY_CLOB', null);
      await connection.execute(proc_drop_7431);
    }); // 76.1.1

    it('76.1.2 works with EMPTY_CLOB and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await connection.execute(proc_7431);
      await plsqlBindInOut(sqlRun_7431, bindVar, 'EMPTY_CLOB', null);
      await connection.execute(proc_drop_7431);
    }); // 76.1.2

    it('76.1.3 works with EMPTY_CLOB and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await connection.execute(proc_7431);
      await plsqlBindInOut(sqlRun_7431, bindVar, 'EMPTY_CLOB', null);
      await connection.execute(proc_drop_7431);
    }); // 76.1.3

    it('76.1.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 76.1.4

    it('76.1.5 works with null and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 76.1.5

    it('76.1.6 works with null and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 76.1.6

    it('76.1.7 works with empty string', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await plsqlBindInOut(sqlRun, bindVar, "", null);
    }); // 76.1.7

    it('76.1.8 works with empty string and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await plsqlBindInOut(sqlRun, bindVar, "", null);
    }); // 76.1.8

    it('76.1.9 works with empty string and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await plsqlBindInOut(sqlRun, bindVar, "", null);
    }); // 76.1.9

    it('76.1.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 76.1.10

    it('76.1.11 works with undefined and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 76.1.11

    it('76.1.12 works with undefined and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 76.1.12

    it('76.1.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: NaN, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-011:/
      );
    }); // 76.1.13

    it('76.1.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: 0, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-011:/
      );
    }); // 76.1.14

    it('76.1.15 works with String length 32K', async function() {
      const specialStr = "76.1.15";
      const len = 32768;
      const clobVal = random.getRandomString(len, specialStr);
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };
      await plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr);
    }); // 76.1.15

    it('76.1.16 works with String length (64K - 1)', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.16";
      const len = 65535;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };
      await plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr);
    }); // 76.1.16

    it('76.1.17 works with String length (64K + 1)', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.17";
      const len = 65537;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };
      await plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr);
    }); // 76.1.17

    it('76.1.18 works with String length (1MB + 1)', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.18";
      const len = 1048577; // 1 * 1024 * 1024 + 1
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };
      await plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr);
    }); // 76.1.18

    it('76.1.19 works with bind value and type mismatch', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: 10, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-011:/
      );
    }); // 76.1.19

    it('76.1.20 mixing named with positional binding', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.20";
      const len = 50000;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = [ sequence, { dir: oracledb.BIND_INOUT, type: oracledb.STRING, val: clobVal, maxSize: len } ];
      const result = await connection.execute(sqlRun, bindVar);
      const resultVal = result.outBinds[0];
      compareResultStrAndOriginal(resultVal, clobVal, specialStr);
    }); // 76.1.20

    it('76.1.21 works with UPDATE', async function() {
      const sequence = insertID++;
      const len_1 = 50000;
      const specialStr_1 = "76.1.21_1";
      const clobVal_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 300;
      const specialStr_2 = "76.1.21_2";
      const clobVal_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        id: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        i: { val: clobVal_1, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: len_1 },
        io: { val: clobVal_2, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len_2 }
      };
      const proc_74324 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74324 (lob_id IN NUMBER, lob_in IN CLOB, lob_in_out IN OUT CLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = lob_in_out where id = lob_id; \n" +
                       "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74324;";
      const sqlRun_74324 = "begin nodb_clob_in_out_74324(:id, :i, :io); end;";
      const proc_drop_74324 = "DROP PROCEDURE nodb_clob_in_out_74324";
      await connection.execute(proc_74324);
      await plsqlBindInOut(sqlRun_74324, bindVar, clobVal_2, specialStr_2);
      await connection.execute(proc_drop_74324);
    }); // 76.1.21

    it('76.1.22 works with invalid CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: {}, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-011:/
      );
    }); // 76.1.22

    it('76.1.23 works with substr', async function() {
      const proc_76126 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74126 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
                       "    select substr(clob_1, 1, 3) into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74126;";
      const sqlRun_76126 = "begin nodb_clob_in_out_74126(:i, :io); end;";
      const proc_drop_76126 = "DROP PROCEDURE nodb_clob_in_out_74126";
      const sequence = insertID++;
      const len = 32768;
      const specialStr = '76.1.23';
      let clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobStr, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };
      await connection.execute(proc_76126);
      const result = await connection.execute(sqlRun_76126, bindVar);
      const resultVal = result.outBinds.io;
      // PLSQL substr function: the position starts from zero(0).
      // The substring method extracts the characters in a string between "start" and "end", not including "end" itself.
      clobStr = clobStr.substring(0, 3);
      assert.strictEqual(resultVal.length, 3);
      assert.strictEqual(resultVal, clobStr);
      await connection.execute(proc_drop_76126);
    }); // 76.1.23

    it.skip('76.1.24 named binding: maxSize smaller than string length( < 32K )', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.24";
      const len = 300;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-01460:/
      );
    }); // 76.1.24

    it('76.1.25 named binding: maxSize smaller than string length( > 32K )', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.25";
      const len = 50000;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-058:/
      );
    }); // 76.1.25

    it('76.1.26 named binding: maxSize smaller than string length( > 64K )', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.26";
      const len = 65539;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-058:/
      );
    }); // 76.1.26

    it.skip('76.1.27 positional binding: maxSize smaller than string length( < 32K )', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.27";
      const len = 300;
      const clobVal = random.getRandomString(len, specialStr);
      const sql = "begin nodb_clob_in_out_743(:1, :2); end;";
      const bindVar = [ sequence, { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 } ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, bindVar),
        /ORA-01460:/
      );
    }); // 76.1.27

    it('76.1.28 positional binding: maxSize smaller than string length( > 32K )', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.28";
      const len = 50000;
      const clobVal = random.getRandomString(len, specialStr);
      const sql = "begin nodb_clob_in_out_743(:1, :2); end;";
      const bindVar = [ sequence, { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 } ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, bindVar),
        /NJS-058:/
      );
    }); // 76.1.28

    it('76.1.29 positional binding: maxSize smaller than string length( > 64K )', async function() {
      const sequence = insertID++;
      const specialStr = "76.1.29";
      const len = 65539;
      const clobVal = random.getRandomString(len, specialStr);
      const sql = "begin nodb_clob_in_out_743(:1, :2); end;";
      const bindVar = [ sequence, { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 } ];
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql, bindVar),
        /NJS-058:/
      );
    }); // 76.1.29

  }); // 76.1

  describe('76.2 CLOB, PLSQL, BIND_INOUT to VARCHAR2', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_743 (lob_id IN NUMBER, lob_in_out IN OUT VARCHAR2) \n" +
               "AS \n" +
               "BEGIN \n" +
               "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
               "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
               "END nodb_clob_in_out_743;";
    const sqlRun = "begin nodb_clob_in_out_743(:i, :io); end;";
    const proc_drop = "DROP PROCEDURE nodb_clob_in_out_743";
    const proc_7421 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_7421 (lob_id IN NUMBER, lob_in_out IN OUT VARCHAR2) \n" +
                    "AS \n" +
                    "BEGIN \n" +
                    "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, EMPTY_CLOB()); \n" +
                    "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                    "END nodb_clob_in_out_7421;";
    const sqlRun_7421 = "begin nodb_clob_in_out_7421(:i, :io); end;";
    const proc_drop_7421 = "DROP PROCEDURE nodb_clob_in_out_7421";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    it('76.2.1 works with EMPTY_CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await connection.execute(proc_7421);
      await plsqlBindInOut(sqlRun_7421, bindVar, 'EMPTY_CLOB', null);
      await connection.execute(proc_drop_7421);
    }); // 76.2.1

    it('76.2.2 works with EMPTY_CLOB and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await connection.execute(proc_7421);
      await plsqlBindInOut(sqlRun_7421, bindVar, 'EMPTY_CLOB', null);
      await connection.execute(proc_drop_7421);
    }); // 76.2.2

    it('76.2.3 works with EMPTY_CLOB and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await connection.execute(proc_7421);
      await plsqlBindInOut(sqlRun_7421, bindVar, 'EMPTY_CLOB', null);
      await connection.execute(proc_drop_7421);
    }); // 76.2.3

    it('76.2.4 works with null', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 76.2.4

    it('76.2.5 works with null and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 76.2.5

    it('76.2.6 works with null and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: null, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await plsqlBindInOut(sqlRun, bindVar, null, null);
    }); // 76.2.6

    it('76.2.7 works with empty string', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await plsqlBindInOut(sqlRun, bindVar, "", null);
    }); // 76.2.7

    it('76.2.8 works with empty string and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await plsqlBindInOut(sqlRun, bindVar, "", null);
    }); // 76.2.8

    it('76.2.9 works with empty string and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: "", dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await plsqlBindInOut(sqlRun, bindVar, "", null);
    }); // 76.2.9

    it('76.2.10 works with undefined', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 76.2.10

    it('76.2.11 works with undefined and maxSize set to 1', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 1 }
      };
      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 76.2.11

    it('76.2.12 works with undefined and maxSize set to (64K - 1)', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: undefined, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await plsqlBindInOut(sqlRun, bindVar, undefined, null);
    }); // 76.2.12

    it('76.2.13 works with NaN', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: NaN, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-011:/
      );
    }); // 76.2.13

    it('76.2.14 works with 0', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: 0, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: 65535 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-011:/
      );
    }); // 76.2.14

    it('76.2.15 works with String length (32K - 1)', async function() {
      const specialStr = "76.2.15";
      const len = 32767;
      const clobVal = random.getRandomString(len, specialStr);
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };
      await plsqlBindInOut(sqlRun, bindVar, clobVal, specialStr);
    }); // 76.2.15

    it('76.2.16 works with String length 32K', async function() {
      const sequence = insertID++;
      const specialStr = "76.2.16";
      const len = 32768;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /ORA-06502:/
      );
    }); // 76.2.16

    it('76.2.17 works with bind out maxSize smaller than string length', async function() {
      const sequence = insertID++;
      const specialStr = "76.2.17";
      const len = 600;
      const clobVal = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobVal, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len - 1 }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-058:/
      );
    }); // 76.2.17

    it('76.2.18 works with UPDATE', async function() {
      const sequence = insertID++;
      const len_1 = 500;
      const specialStr_1 = "76.2.18_1";
      const clobVal_1 = random.getRandomString(len_1, specialStr_1);
      const len_2 = 300;
      const specialStr_2 = "76.2.18_2";
      const clobVal_2 = random.getRandomString(len_2, specialStr_2);
      const bindVar = {
        id: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        i: { val: clobVal_1, dir: oracledb.BIND_IN, type: oracledb.STRING, maxSize: len_1 },
        io: { val: clobVal_2, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len_2 }
      };

      const proc_74218 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74218 (lob_id IN NUMBER, lob_in IN VARCHAR2, lob_in_out IN OUT VARCHAR2) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in); \n" +
                       "    update nodb_tab_clob_in set clob_1 = lob_in_out where id = lob_id; \n" +
                       "    select clob_1 into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74218;";
      const sqlRun_74218 = "begin nodb_clob_in_out_74218(:id, :i, :io); end;";
      const proc_drop_74218 = "DROP PROCEDURE nodb_clob_in_out_74218";

      await connection.execute(proc_74218);
      await plsqlBindInOut(sqlRun_74218, bindVar, clobVal_2, specialStr_2);
      await connection.execute(proc_drop_74218);
    }); // 76.2.18

    it('76.2.19 works with invalid CLOB', async function() {
      const sequence = insertID++;
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: {}, dir: oracledb.BIND_INOUT, type: oracledb.STRING }
      };
      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sqlRun, bindVar),
        /NJS-011:/
      );
    }); // 76.2.19

    it('76.2.20 works with substr', async function() {
      const proc_76220 = "CREATE OR REPLACE PROCEDURE nodb_clob_in_out_74220 (lob_id IN NUMBER, lob_in_out IN OUT CLOB) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    insert into nodb_tab_clob_in (id, clob_1) values (lob_id, lob_in_out); \n" +
                       "    select substr(clob_1, 1, 3) into lob_in_out from nodb_tab_clob_in where id = lob_id; \n" +
                       "END nodb_clob_in_out_74220;";
      const sqlRun_76220 = "begin nodb_clob_in_out_74220(:i, :io); end;";
      const proc_drop_76220 = "DROP PROCEDURE nodb_clob_in_out_74220";
      const sequence = insertID++;
      const len = 3000;
      const specialStr = '76.2.20';
      let clobStr = random.getRandomString(len, specialStr);
      const bindVar = {
        i: { val: sequence, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
        io: { val: clobStr, dir: oracledb.BIND_INOUT, type: oracledb.STRING, maxSize: len }
      };

      await connection.execute(proc_76220);
      const result = await connection.execute(sqlRun_76220, bindVar);
      const resultVal = result.outBinds.io;
      // PLSQL substr function: the position starts from zero(0).
      // The substring method extracts the characters in a string between "start" and "end", not including "end" itself.
      clobStr = clobStr.substring(0, 3);
      assert.strictEqual(resultVal.length, 3);
      assert.strictEqual(resultVal, clobStr);
      await connection.execute(proc_drop_76220);
    }); // 76.2.20

  }); // 76.2

  describe('76.3 Multiple CLOBs, BIND INOUT', function() {
    const lobs_proc_inout_762 = "CREATE OR REPLACE PROCEDURE nodb_lobs_in_out_746 (lob_id IN NUMBER, clob_1 IN OUT CLOB, clob_2 IN OUT CLOB) \n" +
                              "AS \n" +
                              "BEGIN \n" +
                              "    insert into nodb_tab_clob_in (id, clob_1, clob_2) values (lob_id, clob_1, clob_2); \n" +
                              "    select clob_1, clob_2 into clob_1, clob_2 from nodb_tab_clob_in where id = lob_id; \n" +
                              "END nodb_lobs_in_out_746;";
    const sqlRun_762 = "begin nodb_lobs_in_out_746(:i, :io1, :io2); end;";
    const proc_drop_762 = "DROP PROCEDURE nodb_lobs_in_out_746";

    before(async function() {
      await connection.execute(lobs_proc_inout_762);
    });

    after(async function() {
      await connection.execute(proc_drop_762);
    });

    it('76.3.1 bind a txt file and a 32K string', async function() {
      const specialStr = "76.3.1";
      const len1 = 32768;
      const clobVal = random.getRandomString(len1, specialStr);
      const sequence = insertID++;
      const preparedCLOBID = insertID++;

      let sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      await prepareTableWithClob(sql, preparedCLOBID);
      sql = "select clob from nodb_tab_lobs_in where id = :id";
      let result = await connection.execute(sql,  { id: preparedCLOBID });
      const clob = result.rows[0][0];
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        io1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
        io2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
      };
      const options = { autoCommit: true };
      result = await connection.execute(sqlRun_762, binds, options);
      const resultVal = result.outBinds.io1;
      compareResultStrAndOriginal(resultVal, clobVal, specialStr);

      const lob = result.outBinds.io2;
      const clobData = await lob.getData();
      const data = await fsPromises.readFile(inFileName, { encoding: 'utf8' });
      assert.strictEqual(clobData, data);
    }); // 76.3.1

    it('76.3.2 bind a txt file and a (64K - 1) string', async function() {
      const specialStr = "76.3.2";
      const len1 = 65535;
      const clobVal = random.getRandomString(len1, specialStr);
      const preparedCLOBID = insertID++;
      const sequence = insertID++;
      let sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      await prepareTableWithClob(sql, preparedCLOBID);
      sql = "select clob from nodb_tab_lobs_in where id = :id";
      let result = await connection.execute(sql, { id: preparedCLOBID });
      const clob = result.rows[0][0];
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN, maxSize: len1 },
        io1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
        io2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
      };
      const options = { autoCommit: true };
      result = await connection.execute(sqlRun_762, binds, options);
      const resultVal = result.outBinds.io1;
      compareResultStrAndOriginal(resultVal, clobVal, specialStr);

      const lob = result.outBinds.io2;
      const clobData = await lob.getData();
      const data = await fsPromises.readFile(inFileName, { encoding: 'utf8' });
      assert.strictEqual(clobData, data);
    }); // 76.3.2

    it('76.3.3 bind a txt file and a (64K + 1) string', async function() {
      const specialStr = "76.3.3";
      const len1 = 65537;
      const clobVal = random.getRandomString(len1, specialStr);
      const preparedCLOBID = insertID++;
      const sequence = insertID++;

      let sql = "INSERT INTO nodb_tab_lobs_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv";
      await prepareTableWithClob(sql, preparedCLOBID);
      sql = "select clob from nodb_tab_lobs_in where id = :id";
      let result = await connection.execute(sql, { id: preparedCLOBID });
      const clob = result.rows[0][0];
      const binds = {
        i: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN, maxSize: len1 },
        io1: { val: clobVal, type: oracledb.STRING, dir: oracledb.BIND_INOUT, maxSize: len1 },
        io2: { val: clob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
      };
      const options = { autoCommit: true };
      result = await connection.execute(sqlRun_762, binds, options);
      const resultVal = result.outBinds.io1;
      compareResultStrAndOriginal(resultVal, clobVal, specialStr);
      const lob = result.outBinds.io2;
      const clobData = await lob.getData();
      const data = await fsPromises.readFile(inFileName, { encoding: 'utf8' });
      assert.strictEqual(clobData, data);
    }); // 76.3.3

  }); // 76.3

});
