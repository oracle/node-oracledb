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
 *   5. clobPLSQLBindAsStringMaxSize.js
 *
 * DESCRIPTION
 *   Testing PLSQL bind CLOB as String maxSize.
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

describe('5.clobPLSQLBindAsStringMaxSize.js', function() {
  let connection = null;
  let inFileName = '';
  const fileRoot = process.cwd();
  let insertID = 0;

  const proc_clob_pre_tab = `BEGIN \n
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
                                      clob  CLOB \n
                                  ) \n
                              '); \n
                          END; `;
  const proc_clob_in_tab = `BEGIN \n
                             DECLARE \n
                                 e_table_missing EXCEPTION; \n
                                 PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n
                             BEGIN \n
                                 EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob_in PURGE'); \n
                             EXCEPTION \n
                                 WHEN e_table_missing \n
                                 THEN NULL; \n
                             END; \n
                             EXECUTE IMMEDIATE (' \n
                                 CREATE TABLE nodb_tab_clob_in ( \n
                                     id      NUMBER, \n
                                     clob    CLOB \n
                                 ) \n
                             '); \n
                         END; `;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    setupAllTable();
  }); // before

  after(async function() {
    await dropAllTable();
    await connection.release();
  }); // after

  beforeEach(function() {
    insertID++;
  });

  describe('5.1 CLOB, PLSQL, BIND_IN ', function() {
    const proc_bind_in = `CREATE OR REPLACE PROCEDURE nodb_clobs_in_741 (clob_id IN NUMBER, clob_in IN CLOB)\n
                        AS \n
                       BEGIN \n
                           insert into nodb_tab_clob_in (id, clob) values (clob_id, clob_in); \n
                       END nodb_clobs_in_741; `;
    const sqlRun = `BEGIN nodb_clobs_in_741 (:i, :b); END;`;
    const proc_drop = `DROP PROCEDURE nodb_clobs_in_741`;

    before(async function() {
      await executeSQL(proc_bind_in);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('5.1.1 works with String size 64k - 1', async function() {
      const strLength = 65535;
      const specialStr = "5.1.1";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    }); // 5.1.1

    it('5.1.2 works with String size 64k', async function() {
      const strLength = 65536;
      const specialStr = "5.1.2";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    }); // 5.1.2

    it('5.1.3 works with String size 64k + 1', async function() {
      const strLength = 65537;
      const specialStr = "5.1.3";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    }); // 5.1.3

    it('5.1.4 works with String size 128MB', async function() {
      const bigStr = getBigBuffer(1, 0);
      const len = 128 * 1024 * 1024;

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr.toString(), type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };

      await bindIn(sqlRun, bindVar, bigStr, "");
    });

    it('5.1.5 works with String size (256 - 16) MB', async function() {
      const bigStr_1 = getBigBuffer(1, 16);
      const bigStr_2 = getBigBuffer(1, 0);
      const totalLength = 256 * 1024 * 1024 - 16;
      const largeBuffer = Buffer.concat([bigStr_1, bigStr_2], totalLength);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: largeBuffer.toString(), type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: largeBuffer.length }
      };

      await bindIn(sqlRun, bindVar, largeBuffer.toString(), "");
    });

    it('5.1.6 set maxSize to 64k + 1', async function() {
      const strLength = 100;
      const specialStr = `5.1.6`;
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: 65537 }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    });

    it('5.1.7 set maxSize to 1GB + 1', async function() {
      const len = 1 * 1024 * 1024 * 1024 + 1;
      const strLength = 100;
      const specialStr = "5.1.7";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    });

    it('5.1.8 set maxSize to 2GB + 1', async function() {
      const len = 2 * 1024 * 1024 * 1024 + 1;
      const strLength = 100;
      const specialStr = "5.1.8";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    });

    it('5.1.9 set maxSize to 4GB + 1', async function() {
      const len = 4 * 1024 * 1024 * 1024 + 1;
      const strLength = 100;
      const specialStr = "5.1.9";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    });

    it('5.1.10 works with String size 10MB', async function() {
      const strLength = 10 * 1024 * 1024;
      const specialStr = "5.1.10";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr.toString(), type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    });

    it('5.1.11 works with String size 20MB', async function() {
      const strLength = 20 * 1024 * 1024;
      const specialStr = "5.1.11";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr.toString(), type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    });

    it('5.1.12 works with String size 50MB', async function() {
      const strLength = 50 * 1024 * 1024;
      const specialStr = "5.1.12";
      const bigStr = random.getRandomString(strLength, specialStr);

      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { val: bigStr.toString(), type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: strLength }
      };

      await bindIn(sqlRun, bindVar, bigStr, specialStr);
    });

  }); // 5.1

  describe('5.2 CLOB, PLSQL, BIND_OUT', function() {

    const proc = `CREATE OR REPLACE PROCEDURE nodb_clobs_out_745 (clob_id IN NUMBER, clob_out OUT CLOB) \n
                AS \n
                BEGIN \n
                    select clob into clob_out from nodb_tab_clob_in where id = clob_id; \n
                END nodb_clobs_out_745; `;
    const sqlRun = `BEGIN nodb_clobs_out_745 (:i, :b); END;`;
    const proc_drop = `DROP PROCEDURE nodb_clobs_out_745`;

    before(async function() {
      await executeSQL(proc);
    }); // before

    after(async function() {
      await executeSQL(proc_drop);
    }); // after

    it('5.2.1 works with String size 64k - 1', async function() {

      inFileName = fileRoot + '/64KBString1.txt';
      const size = 64 * 1024 - 1;
      const specialStr = "5.2.1";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.2 works with String size 64k', async function() {

      inFileName = fileRoot + '/64KBString2.txt';
      const size = 64 * 1024;
      const specialStr = "5.2.2";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.3 works with String size 64k + 1', async function() {
      inFileName = fileRoot + '/64KBString3.txt';
      const size = 64 * 1024 + 1;
      const specialStr = "5.2.3";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.4 set maxSize to 64k + 1', async function() {

      inFileName = fileRoot + '/smallstr.txt';
      const size = 100;
      const maxsize = 65537;
      const specialStr = "5.2.4";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: maxsize }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.5 set maxSize to 1GB + 1', async function() {

      inFileName = fileRoot + '/smallstr.txt';
      const size = 100;
      const maxsize = 1 * 1024 * 1024 * 1024 + 1;
      const specialStr = "5.2.5";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: maxsize }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.6 set maxSize to 2GB + 1', async function() {

      inFileName = fileRoot + '/smallstr.txt';
      const size = 100;
      const maxsize = 2 * 1024 * 1024 * 1024 + 1;
      const specialStr = "5.2.6";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: maxsize }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.7 set maxSize to 4GB - 1', async function() {

      inFileName = fileRoot + '/smallstr.txt';
      const size = 100;
      const maxsize = 4 * 1024 * 1024 * 1024 - 1;
      const specialStr = "5.2.7";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: maxsize }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.7 Negative: set maxSize to 4GB', async function() {
      inFileName = fileRoot + '/smallstr.txt';
      const size = 100;
      const maxsize = 4 * 1024 * 1024 * 1024;
      const specialStr = "5.2.7";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: maxsize }
      };
      await largeFile.createFileInKB(inFileName, size, specialStr);
      await  insetTableWithClob(insertID, inFileName);
      const sql = `select clob from nodb_tab_clob_in where id = ` + insertID;
      await verifyClobValueWithFileData(sql, inFileName);
      try {
        await connection.execute(sqlRun, bindVar);
      } catch (err) {
        assert(err);
        assert.strictEqual(err.message, `NJS-007: invalid value for maxSize in parameter 2`);
      }
      fs.unlinkSync(inFileName);
    });

    it('5.2.8 works with String size 10MB', async function() {
      inFileName = fileRoot + '/10sMBstr.txt';
      const size = 10 * 1024 * 1024;
      const specialStr = "5.2.8";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.9 works with String size 20MB', async function() {
      inFileName = fileRoot + '/10sMBstr.txt';
      const size = 20 * 1024 * 1024;
      const specialStr = "5.2.9";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

    it('5.2.10 works with String size 50MB', async function() {
      inFileName = fileRoot + '/10sMBstr.txt';
      const size = 50 * 1024 * 1024;
      const specialStr = "5.2.10";
      const bindVar = {
        i: { val: insertID, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        b: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: size }
      };
      await bindOut(inFileName, size, specialStr, sqlRun, bindVar);
    });

  });

  const bindIn = async function(sqlRun, bindVar, orgStr, specialStr) {
    connection.execute(sqlRun, bindVar, { autoCommit: true });
    const sql = `select clob from nodb_tab_clob_in where id = ` + insertID;
    await verifyClobValueWithString(sql, orgStr, specialStr);
  };

  const bindOut = async function(inFileName, fileSize, specialStr, sqlRun, bindVar) {
    await largeFile.createFileInKB(inFileName, fileSize, specialStr);
    await insetTableWithClob(insertID, inFileName);
    const sql = `select clob from nodb_tab_clob_in where id = ` + insertID;

    await verifyClobValueWithFileData(sql, inFileName);
    const result = connection.execute(sqlRun, bindVar);
    console.log("Result : " + JSON.stringify(result));
    fs.unlinkSync(inFileName);
  };

  const getBigBuffer = function(loop, minus) {
    let largeBuffer = Buffer.from("", 'utf8');
    const stringSizeInEachLoop = 128 * 1024 * 1024 - minus;
    const bigStr = random.getRandomLengthString(stringSizeInEachLoop);
    const bigBuffer = Buffer.from(bigStr);
    const totalLength = largeBuffer.length + bigBuffer.length;
    largeBuffer = Buffer.concat([largeBuffer, bigBuffer], totalLength);
    return largeBuffer;
  };

  const setupAllTable = async function() {
    await connection.execute(proc_clob_in_tab);
    await connection.execute(proc_clob_pre_tab);
  };

  const dropAllTable = async function() {
    await connection.execute(`DROP TABLE nodb_tab_clob_in PURGE`);
    await connection.execute(`DROP TABLE nodb_tab_lobs_pre PURGE`);
  };

  const executeSQL = async function(sql) {
    await connection.execute(sql);
  };

  const insetTableWithClob = async function(id, inFileName) {
    const sql = `INSERT INTO nodb_tab_clob_in (id, clob) VALUES (:i, EMPTY_CLOB()) RETURNING clob INTO :lobbv`;
    const bindVar = { i: id, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };
    let result = null;

    result = await connection.execute(
      sql,
      bindVar,
      { autoCommit: false }, // a transaction needs to span the INSERT and pipe()
    );

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

      inStream.pipe(lob); // copies the text to the CLOB
    });
  };

  const verifyClobValueWithString = async function(selectSql, originalString, specialStr) {
    let result = null;

    result = await connection.execute(selectSql);

    const lob = result.rows[0][0];
    if (originalString == null | originalString == '' || originalString == undefined) {
      assert.fail(lob);
    } else {
      assert(lob);
      lob.setEncoding('utf8');
      let clobData = '';
      await new Promise((resolve, reject) => {
        lob.on('data', function(chunk) {
          clobData += chunk;
        });

        lob.on("error", reject);

        lob.on('end', function() {
          const resultLength = clobData.length;
          const specStrLength = specialStr.length;
          assert.strictEqual(resultLength, originalString.length);
          assert.strictEqual(clobData.substring(0, specStrLength), specialStr);
          assert.strictEqual(clobData.substring(resultLength - specStrLength, resultLength), specialStr);
          resolve();
        });
      });
    }
  };

  const verifyClobValueWithFileData = async function(selectSql, inFileName) {
    let result = null;

    result = await connection.execute(selectSql);

    const lob = result.rows[0][0];
    assert(lob);
    // set the encoding so we get a 'string' not a 'buffer'
    lob.setEncoding('utf8');
    let clobData = '';
    await new Promise((resolve, reject) => {
      lob.on("error", reject);
      lob.on('data', function(chunk) {
        clobData += chunk;
      });

      lob.on('end', function() {
        fs.readFile(inFileName, { encoding: 'utf8' }, function(err, originalData) {
          assert.strictEqual(clobData.length, originalData.length);
          assert.strictEqual(clobData, originalData);
        });
        resolve();
      });
    });
  };
});
