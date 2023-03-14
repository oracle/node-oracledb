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
 *   91. fetchBlobAsBuffer4.js
 *
 * DESCRIPTION
 *   Testing BLOB binding out as Buffer.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('91. fetchBlobAsBuffer4.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1
  const proc_blob_in_tab = "BEGIN \n" +
                           "    DECLARE \n" +
                           "        e_table_missing EXCEPTION; \n" +
                           "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                           "    BEGIN \n" +
                           "        EXECUTE IMMEDIATE('DROP TABLE nodb_blob_1 PURGE'); \n" +
                           "    EXCEPTION \n" +
                           "        WHEN e_table_missing \n" +
                           "        THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE (' \n" +
                           "        CREATE TABLE nodb_blob_1 ( \n" +
                           "            num_1      NUMBER, \n" +
                           "            num_2      NUMBER, \n" +
                           "            content    RAW(2000), \n" +
                           "            blob       BLOB \n" +
                           "        ) \n" +
                           "    '); \n" +
                           "END; ";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(proc_blob_in_tab);
  }); // before

  after(async function() {
    oracledb.fetchAsBuffer = [];
    await connection.execute("DROP TABLE nodb_blob_1 PURGE");
    await connection.close();
  }); // after

  const insertTable = async function(sql, bindVar) {
    const result = await connection.execute(sql, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
  };

  describe('91.1 PLSQL FUNCTION RETURN BLOB to BUFFER', function() {

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsBuffer = [];
    }); // afterEach

    it('91.1.1 bind by position - 1', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      const sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :i3); end;";
      const proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      let len = 400;
      let sequence = insertID++;
      let specialStr = "91.1.1";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, content ]
      );
      let resultVal = result.outBinds[0];
      assert.deepStrictEqual(content, resultVal);

      await connection.execute(proc_drop);
    }); // 91.1.1

    it('91.1.2 bind by name - 1', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      const sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :c); end;";
      const proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      let len = 400;
      let sequence = insertID++;
      let specialStr = "91.1.2";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
          output: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      assert.deepStrictEqual(resultVal, content);

      await connection.execute(proc_drop);
    }); // 91.1.2

    it('91.1.3 bind by position - 2', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      const sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :c); end;";
      const proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      let len = 400;
      let sequence = insertID++;
      let specialStr = "91.1.3";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null ]
      );
      let resultVal = result.outBinds[0];
      assert.deepStrictEqual(resultVal, content);

      await connection.execute(proc_drop);
    }); // 91.1.3

    it('91.1.4 bind by name - 2', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_94 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN RAW) RETURN BLOB \n" +
                 "IS \n" +
                 "    tmpLOB4 BLOB; \n" +
                 "BEGIN \n" +
                 "    select blob into tmpLOB4 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "    RETURN tmpLOB4; \n" +
                 "END;";
      const sqlRun = "begin :output := nodb_blobs_out_94 (:i1, :i2, :c); end;";
      const proc_drop = "DROP FUNCTION nodb_blobs_out_94";

      let len = 400;
      let sequence = insertID++;
      let specialStr = "91.1.4";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
          output: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      assert.deepStrictEqual(resultVal, content);

      await connection.execute(proc_drop);
    }); // 91.1.4

  }); // 91.1

  describe('91.2 PLSQL PROCEDURE BIND OUT BLOB to BUFFER', function() {
    const proc = "CREATE OR REPLACE PROCEDURE nodb_blobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C1 IN RAW, C2 OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select blob into C2 from nodb_blob_1 where num_1 = ID_1;\n" +
                 "END;";
    const sqlRun = "begin nodb_blobs_out_92 (:i1, :i2, :c1, :c2); end;";
    const proc_drop = "DROP PROCEDURE nodb_blobs_out_92";

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsBuffer = [];
    }); // afterEach

    it('91.2.1 bind by position - 1', async function() {
      let len = 500;
      let sequence = insertID++;
      let specialStr = "91.2.1";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);
      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ sequence, null, content, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len } ]
      );
      let resultVal = result.outBinds[0];
      assert.deepStrictEqual(resultVal, content);

      await connection.execute(proc_drop);
    }); // 91.2.1

    it('91.2.2 bind by name - 1', async function() {
      let len = 400;
      let sequence = insertID++;
      let specialStr = "91.2.2";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
          c2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.c2;
      assert.deepStrictEqual(resultVal, content);

      await connection.execute(proc_drop);
    }); // 91.2.2

    it('91.2.3 bind by position - 2', async function() {
      let len = 500;
      let sequence = insertID++;
      let specialStr = "91.2.3";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [ sequence, sequence, null, { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len } ]
      );
      let resultVal = result.outBinds[0];
      assert.deepStrictEqual(resultVal, content);

      await connection.execute(proc_drop);
    }); // 91.2.3

    it('91.2.4 bind by name - 2', async function() {
      let len = 400;
      let sequence = insertID++;
      let specialStr = "91.2.4";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      await connection.execute(proc);

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c1: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
          c2: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.c2;
      assert.deepStrictEqual(resultVal, content);

      await connection.execute(proc_drop);
    }); // 91.2.4

  }); // 91.2

  describe('91.3 PLSQL FUNCTION RETURN BLOB to RAW', function() {
    const proc = "CREATE OR REPLACE FUNCTION nodb_blobs_out_92 (ID_1 IN NUMBER, ID_2 IN NUMBER, C IN VARCHAR2) RETURN RAW \n" +
               "IS \n" +
               "    tmpLOB2 BLOB; \n" +
               "BEGIN \n" +
               "    select blob into tmpLOB2 from nodb_blob_1 where num_1 = ID_1;\n" +
               "    RETURN tmpLOB2; \n" +
               "END;";
    const sqlRun = "begin :output := nodb_blobs_out_92 (:i1, :i2, :c); end;";
    const proc_drop = "DROP FUNCTION nodb_blobs_out_92";

    before(async function() {
      await connection.execute(proc);
    }); // before

    after(async function() {
      await connection.execute(proc_drop);
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsBuffer = [];
    }); // afterEach

    it('91.3.1 bind by name - 1', async function() {
      let len = 1000;
      let sequence = insertID++;
      let specialStr = "91.3.1";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
          output: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      assert.deepStrictEqual(resultVal, content);
    }); // 91.3.1

    it('91.3.2 bind by position - 1', async function() {
      let len = 1000;
      let sequence = insertID++;
      let specialStr = "91.3.2";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, null, content
        ]
      );
      let resultVal = result.outBinds[0];
      assert.deepStrictEqual(resultVal, content);
    }); // 91.3.2

    it('91.3.3 bind by name - 2', async function() {
      let len = 1000;
      let sequence = insertID++;
      let specialStr = "91.3.3";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        {
          i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
          c: { val: null, type: oracledb.BUFFER, dir: oracledb.BIND_IN },
          output: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }
        }
      );
      let resultVal = result.outBinds.output;
      assert.deepStrictEqual(resultVal, content);
    }); // 91.3.3

    it('91.3.4 bind by position - 2', async function() {
      let len = 1000;
      let sequence = insertID++;
      let specialStr = "91.3.4";
      let strBuf = random.getRandomString(len, specialStr);
      let content = Buffer.from(strBuf, "utf-8");

      const sql = "INSERT INTO nodb_blob_1 (num_1, num_2, content, blob) VALUES (:i1, :i2, :c1, :c2)";
      let bindVar = {
        i1: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        i2: { val: sequence, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
        c1: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len },
        c2: { val: content, type: oracledb.BUFFER, dir: oracledb.BIND_IN, maxSize: len }
      };
      await insertTable(sql, bindVar);

      let result = await connection.execute(
        sqlRun,
        [
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: len }, sequence, sequence, null
        ]
      );
      let resultVal = result.outBinds[0];
      assert.deepStrictEqual(resultVal, content);
    }); // 91.3.4

  }); // 91.3

});
