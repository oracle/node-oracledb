/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   90. fetchClobAsString4.js
 *
 * DESCRIPTION
 *   Testing CLOB binding out as String.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('90. fetchClobAsString4.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1
  const proc_clob_in_tab = "BEGIN \n" +
                           "    DECLARE \n" +
                           "        e_table_missing EXCEPTION; \n" +
                           "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                           "    BEGIN \n" +
                           "        EXECUTE IMMEDIATE('DROP TABLE nodb_clob_1 PURGE'); \n" +
                           "    EXCEPTION \n" +
                           "        WHEN e_table_missing \n" +
                           "        THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE (' \n" +
                           "        CREATE TABLE nodb_clob_1 ( \n" +
                           "            num_1      NUMBER, \n" +
                           "            num_2      NUMBER, \n" +
                           "            content    VARCHAR(2000), \n" +
                           "            clob       CLOB \n" +
                           "        ) \n" +
                           "    '); \n" +
                           "END; ";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(proc_clob_in_tab);
  }); // before

  after(async function() {
    oracledb.fetchAsString = [];
    await connection.execute("DROP TABLE nodb_clob_1 PURGE");
    await connection.close();
  }); // after

  const insertTable = async function(insertSql, bindVar) {
    let result = await connection.execute(insertSql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  let verifyResult = function(resultVal, specialStr, originalStr) {
    let resultLength = resultVal.length;
    let specStrLength = specialStr.length;
    assert.strictEqual(resultLength, originalStr.length);
    assert.strictEqual(resultVal.substring(0, specStrLength), specialStr);
    assert.strictEqual(resultVal.substring(resultLength - specStrLength, resultLength), specialStr);
  };

  describe('90.1 PLSQL FUNCTION RETURN CLOB to STRING', function() {
    const proc = "CREATE OR REPLACE FUNCTION nodb_clobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN VARCHAR2) RETURN CLOB \n" +
               "IS \n" +
               "    tmpLOB4 CLOB; \n" +
               "BEGIN \n" +
               "    select clob into tmpLOB4 from nodb_clob_1 where num_1 = ID_1;\n" +
               "    RETURN tmpLOB4; \n" +
               "END;";
    const sqlRun = "begin :output := nodb_clobs_out_94 (:i1, :i2, :c); end;";
    const proc_drop = "DROP FUNCTION nodb_clobs_out_94";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsString = [];
    }); // afterEach

    it('90.1.1 bind by position - 1', async function() {
      const len = 400;
      let sequence = insertID++;
      const specialStr = "90.1.1";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, clobStr]
      );
      let resultVal = result.outBinds[0];
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.1.1

    it('90.1.2 bind by name - 1', async function() {
      const len = 400;
      let sequence = insertID++;
      const specialStr = "90.1.2";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);
      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
          output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.1.2

    it('90.1.3 bind by position - 2', async function() {
      const len = 400;
      let sequence = insertID++;
      const specialStr = "90.1.2";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null ]
      );
      let resultVal = result.outBinds[0];
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.1.3

    it('90.1.4 bind by name - 2', async function() {
      const len = 400;
      let sequence = insertID++;
      const specialStr = "90.1.4";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN },
          output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.1.4

  }); // 90.1

  describe('90.2 PLSQL PROCEDURE BIND OUT CLOB to STRING', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_clobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C1 IN VARCHAR2, C2 OUT CLOB) \n" +
                "AS \n" +
                "BEGIN \n" +
                "    select clob into C2 from nodb_clob_1 where num_1 = ID_1;\n" +
                "END;";
    const sqlRun = "begin nodb_clobs_out_92 (:i1, :i2, :c1, :c2); end;";
    const proc_drop = "DROP PROCEDURE nodb_clobs_out_92";

    before(async function() {
      await connection.execute(proc);
    });

    after(async function() {
      await connection.execute(proc_drop);
    });

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsString = [];
    }); // afterEach

    it('90.2.1 bind by position - 1', async function() {
      const len = 500;
      let sequence = insertID++;
      const specialStr = "90.2.1";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ sequence, null, { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN }, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len } ]
      );
      let resultVal = result.outBinds[0];
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.2.1

    it('90.2.2 bind by name - 1', async function() {
      const len = 400;
      let sequence = insertID++;
      const specialStr = "90.2.2";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
          c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.c2;
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.2.2

    it('90.2.3 bind by position - 2', async function() {
      const len = 500;
      let sequence = insertID++;
      const specialStr = "90.2.3";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ sequence, sequence, null, { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len } ]
      );
      let resultVal = result.outBinds[0];
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.2.3

    it('90.2.4 bind by name - 2', async function() {
      const len = 400;
      let sequence = insertID++;
      const specialStr = "90.2.4";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c1: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN },
          c2: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.c2;
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.2.4

  }); // 90.2

  describe('90.3 PLSQL FUNCTION RETURN CLOB to VARCHAR2', function() {
    const proc = "CREATE OR REPLACE FUNCTION nodb_clobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN VARCHAR2) RETURN VARCHAR2 \n" +
               "IS \n" +
               "    tmpLOB2 CLOB; \n" +
               "BEGIN \n" +
               "    select clob into tmpLOB2 from nodb_clob_1 where num_1 = ID_1;\n" +
               "    RETURN tmpLOB2; \n" +
               "END;";
    const sqlRun = "begin :output := nodb_clobs_out_92 (:i1, :i2, :c); end;";
    const proc_drop = "DROP FUNCTION nodb_clobs_out_92";

    before(async function() {
      await connection.execute(proc);
    }); // before

    after(async function() {
      await connection.execute(proc_drop);
    }); // after

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsString = [];
    }); // afterEach

    it('90.3.1 bind by name - 1', async function() {
      const len = 1000;
      let sequence = insertID++;
      const specialStr = "90.3.1";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN },
          output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.3.1

    it('90.3.2 bind by position - 1', async function() {
      const len = 1000;
      let sequence = insertID++;
      const specialStr = "90.3.1";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, clobStr ]
      );
      let resultVal = result.outBinds[0];
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.3.2

    it('90.3.3 bind by name - 2', async function() {
      const len = 1000;
      let sequence = insertID++;
      const specialStr = "90.3.3";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: null, type: oracledb.STRING, dir: oracledb.BIND_IN },
          output: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.3.3

    it('90.3.4 bind by position - 2', async function() {
      const len = 1000;
      let sequence = insertID++;
      const specialStr = "90.3.4";
      let clobStr = random.getRandomString(len, specialStr);

      let sql = "INSERT INTO nodb_clob_1 (num_1, num_2, content, clob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: clobStr, type: oracledb.STRING, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null ]
      );
      let resultVal = result.outBinds[0];
      verifyResult(resultVal, specialStr, clobStr);
    }); // 90.3.4

  }); // 90.3

});
