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
 *   89. fetchBlobAsBuffer3.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB.
 *    To fetch BLOB columns as buffer
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const assist   = require('./dataTypeAssist.js');

describe('89. fetchBlobAsBuffer3.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1

  const proc_create_table2 = "BEGIN \n" +
                           "    DECLARE \n" +
                           "        e_table_missing EXCEPTION; \n" +
                           "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                           "    BEGIN \n" +
                           "        EXECUTE IMMEDIATE('DROP TABLE nodb_blob2 PURGE'); \n" +
                           "    EXCEPTION \n" +
                           "        WHEN e_table_missing \n" +
                           "        THEN NULL; \n" +
                           "    END; \n" +
                           "    EXECUTE IMMEDIATE (' \n" +
                           "        CREATE TABLE nodb_blob2 ( \n" +
                           "            ID   NUMBER, \n" +
                           "            B1   BLOB, \n" +
                           "            B2   BLOB \n" +
                           "        ) \n" +
                           "    '); \n" +
                           "END; ";
  const drop_table2 = "DROP TABLE nodb_blob2 PURGE";
  const defaultStmtCache = oracledb.stmtCacheSize;

  before('get one connection', async function() {
    oracledb.stmtCacheSize = 0;
    connection = await oracledb.getConnection(dbConfig);
  }); // before

  after('release connection', async function() {
    oracledb.stmtCacheSize = defaultStmtCache;
    await connection.close();
  });  // after

  const insertIntoBlobTable2 = async function(id, content1, content2) {
    let result = await connection.execute(
      "INSERT INTO nodb_blob2 VALUES (:ID, :B1, :B2)",
      [ id, content1, content2 ]
    );
    assert.strictEqual(result.rowsAffected, 1);
  };

  describe('89.1 fetch multiple BLOBs', function() {

    before('create Table and populate', async function() {
      await connection.execute(proc_create_table2);
    });  // before

    after('drop table', async function() {
      await connection.execute(drop_table2);
    }); // after

    beforeEach('set oracledb.fetchAsBuffer', function() {
      oracledb.fetchAsBuffer = [ oracledb.BLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsBuffer = [];
    }); // afterEach

    it('89.1.1 fetch multiple BLOB columns as Buffer', async function() {
      const id = insertID++;
      const specialStr_1 = '89.1.1_1';
      const contentLength_1 = 26;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '89.1.1_2';
      const contentLength_2 = 100;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable2(id, content_1, content_2);
      const result = await connection.execute(
        "SELECT ID, B1, B2 from nodb_blob2"
      );
      assert.deepStrictEqual(result.rows[0][1], content_1);
      assert.deepStrictEqual(result.rows[0][2], content_2);
    }); // 89.1.1

    it('89.1.2 fetch two BLOB columns, one as string, another streamed', async function() {
      const id = insertID++;
      const specialStr_1 = '89.1.2_1';
      const contentLength_1 = 30;
      const strBuf_1 = random.getRandomString(contentLength_1, specialStr_1);
      const content_1 = Buffer.from(strBuf_1, "utf-8");
      const specialStr_2 = '89.1.2_2';
      const contentLength_2 = 50;
      const strBuf_2 = random.getRandomString(contentLength_2, specialStr_2);
      const content_2 = Buffer.from(strBuf_2, "utf-8");

      await insertIntoBlobTable2(id, content_1, content_2);

      let result = await connection.execute(
        "SELECT ID, B1 from nodb_blob2 where ID = :id",
        { id : id }
      );
      assert.deepStrictEqual(result.rows[0][1], content_1);

      oracledb.fetchAsBuffer = [];

      result = await connection.execute(
        "SELECT B2 from nodb_blob2 where ID = :id",
        { id : id }
      );
      assert.notStrictEqual(result.rows.length, 0);
      const clobData = (await result.rows[0][0].getData()).toString();
      const specialStrLen_2 = specialStr_2.length;
      const resultLen_2 = clobData.length;
      assert.strictEqual(clobData.length, contentLength_2);
      assert.strictEqual(clobData.substring(0, specialStrLen_2), specialStr_2);
      assert.strictEqual(clobData.substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);

    }); // 89.1.2

  }); // 89.1

  describe('89.2 types support for fetchAsBuffer property', function() {

    afterEach('clear the by-type specification', function() {
      oracledb.fetchAsBuffer = [];
    });

    it('89.2.1 String not supported in fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.STRING ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 89.2.1


    it('89.2.2 CLOB not supported in fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.CLOB ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 89.2.2


    it('89.2.3 Number not supported in fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.NUMBER ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 89.2.3


    it('89.2.4 Date not supported in fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.DATE ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 89.2.4


    it('89.2.5 Cursor not supported in fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.CURSOR ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 89.2.5


    it('89.2.6 Buffer not supported in fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.BUFFER ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 89.2.6


    it('89.2.7 BLOB supported in fetchAsBuffer', function() {
      assert.doesNotThrow(
        function() {
          oracledb.fetchAsBuffer = [ oracledb.BLOB ];
        }
      );
      assert.strictEqual(oracledb.fetchAsBuffer.length, 1);
      assert.strictEqual(oracledb.fetchAsBuffer[0], oracledb.BLOB);
    }); // 89.2.7


    it('89.2.8 negative null value for fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = null;
        },
        /NJS-004:/
      );
    }); // 89.2.8


    it('89.2.9 negative undefined value for fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = undefined;
        },
        /NJS-004:/
      );
    }); // 89.2.9


    it('89.2.10 negative numeric value for fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = 89210;
        },
        /NJS-004:/
      );
    }); // 89.2.10


    it('89.2.11 negative emtpy string value for fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = ' ';
        },
        /NJS-004:/
      );
    }); // 89.2.11


    it('89.2.12 negative arbitary string value for fetchAsBuffer', function() {
      assert.throws(
        function() {
          oracledb.fetchAsBuffer = "89.2.12";
        },
        /NJS-004:/
      );
    }); // 89.2.12


    it('89.2.13 negative date value for fetchAsBuffer', function() {
      assert.throws(
        function() {
          let dt = new Date ();
          oracledb.fetchAsBuffer = dt;
        },
        /NJS-004:/
      );
    }); // 89.2.13


    it('89.2.14 negative arbitary buffer value for fetchAsBuffer', function() {
      assert.throws(
        function() {
          let buf = assist.createBuffer(10) ;
          oracledb.fetchAsBuffer = buf;
        },
        /NJS-004:/
      );
    }); // 89.2.14

  }); // 89.2

});
