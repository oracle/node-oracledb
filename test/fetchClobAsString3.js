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
 *   86. fetchClobAsString.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB.
 *    To fetch CLOB columns as strings
 *    This could be very useful for smaller CLOB size as it can be fetched as string and processed in memory itself.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');

describe('86. fetchClobAsString3.js', function() {

  let connection = null;
  let insertID = 1; // assume id for insert into db starts from 1
  const proc_create_table2 = "BEGIN \n" +
                             "    DECLARE \n" +
                             "        e_table_missing EXCEPTION; \n" +
                             "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                             "    BEGIN \n" +
                             "        EXECUTE IMMEDIATE('DROP TABLE nodb_clob2 PURGE'); \n" +
                             "    EXCEPTION \n" +
                             "        WHEN e_table_missing \n" +
                             "        THEN NULL; \n" +
                             "    END; \n" +
                             "    EXECUTE IMMEDIATE (' \n" +
                             "        CREATE TABLE nodb_clob2 ( \n" +
                             "            ID   NUMBER, \n" +
                             "            C1   CLOB, \n" +
                             "            C2   CLOB \n" +
                             "        ) \n" +
                             "    '); \n" +
                             "END; ";
  const drop_table2 = "DROP TABLE nodb_clob2 PURGE";
  const defaultStmtCache = oracledb.stmtCacheSize;

  before('get one connection', async function() {
    oracledb.stmtCacheSize = 0;
    connection = await oracledb.getConnection(dbConfig);
  }); // before

  after('release connection', async function() {
    oracledb.stmtCacheSize = defaultStmtCache;
    await connection.close();
  });  // after

  const insertIntoClobTable2 = async function(id, content1, content2) {
    const result = await connection.execute(
      "INSERT INTO nodb_clob2 VALUES (:ID, :C1, :C2)",
      [ id, content1, content2 ]
    );
    assert.strictEqual(result.rowsAffected, 1);
  };

  describe('86.1 fetch multiple CLOBs and result set', function() {
    before('create Table and populate', async function() {
      await connection.execute(proc_create_table2);
    });  // before

    after('drop table', async function() {
      oracledb.fetchAsString = [];
      await connection.execute(drop_table2);
    }); // after

    beforeEach('set oracledb.fetchAsString', function() {
      oracledb.fetchAsString = [ oracledb.CLOB ];
    }); // beforeEach

    afterEach('clear the By type specification', function() {
      oracledb.fetchAsString = [];
    }); // afterEach

    it('86.1.1 fetch multiple CLOB columns as String', async function() {
      const id = insertID++;
      const specialStr_1 = '86.1.1_1';
      const contentLength_1 = 26;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '86.1.1_2';
      const contentLength_2 = 100;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable2(id, content_1, content_2);

      const result = await connection.execute("SELECT ID, C1, C2 from nodb_clob2");
      const specialStrLen_1 = specialStr_1.length;
      const resultLen_1 = result.rows[0][1].length;
      assert.strictEqual(result.rows[0][1].length, contentLength_1);
      assert.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
      assert.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);

      const specialStrLen_2 = specialStr_2.length;
      const resultLen_2 = result.rows[0][2].length;
      assert.strictEqual(result.rows[0][2].length, contentLength_2);
      assert.strictEqual(result.rows[0][2].substring(0, specialStrLen_2), specialStr_2);
      assert.strictEqual(result.rows[0][2].substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
    }); // 86.1.1

    it('86.1.2 fetch two CLOB columns, one as string, another streamed', async function() {
      const id = insertID++;
      const specialStr_1 = '86.1.2_1';
      const contentLength_1 = 30;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);
      const specialStr_2 = '86.1.2_2';
      const contentLength_2 = 50;
      const content_2 = random.getRandomString(contentLength_2, specialStr_2);

      await insertIntoClobTable2(id, content_1, content_2);

      let result = await connection.execute(
        "SELECT ID, C1 from nodb_clob2 where ID = :id",
        { id: id }
      );
      const specialStrLen_1 = specialStr_1.length;
      const resultLen_1 = result.rows[0][1].length;
      assert.strictEqual(result.rows[0][1].length, contentLength_1);
      assert.strictEqual(result.rows[0][1].substring(0, specialStrLen_1), specialStr_1);
      assert.strictEqual(result.rows[0][1].substring(resultLen_1 - specialStrLen_1, resultLen_1), specialStr_1);

      oracledb.fetchAsString = [];
      result = await connection.execute(
        "SELECT C2 from nodb_clob2 where ID = :id",
        { id: id }
      );
      assert.notStrictEqual(result.rows.length, 0);

      const lob = result.rows[0][0];
      assert(lob);
      // set the encoding so we get a 'string' not a 'String'
      lob.setEncoding('utf8');
      const clobData = await lob.getData();
      const specialStrLen_2 = specialStr_2.length;
      const resultLen_2 = clobData.length;
      assert.strictEqual(clobData.length, contentLength_2);
      assert.strictEqual(clobData.substring(0, specialStrLen_2), specialStr_2);
      assert.strictEqual(clobData.substring(resultLen_2 - specialStrLen_2, resultLen_2), specialStr_2);
    }); // 86.1.2

    it('86.1.3 works with Restult Set', async function() {
      const id = insertID++;
      const specialStr_1 = '86.1.3';
      const contentLength_1 = 387;
      const content_1 = random.getRandomString(contentLength_1, specialStr_1);

      const doClose = async function(rs) {
        await rs.close();
      };

      const fetchOneRowFromRS = async function(rs) {
        const row = await rs.getRow();
        if (!row) {
          await doClose(rs);
        } else {
          const specialStrLen_1 = specialStr_1.length;
          const resultLen_1 = row[0].length;
          assert.strictEqual(row[0].length, contentLength_1);
          assert.strictEqual(
            row[0].substring(0, specialStrLen_1),
            specialStr_1
          );
          assert.strictEqual(
            row[0].substring(resultLen_1 - specialStrLen_1, resultLen_1),
            specialStr_1
          );
          await fetchOneRowFromRS(rs);
        }
      };

      const sql = "insert into nodb_clob2(id, c1) values (:i, :c)";
      await connection.execute(
        sql,
        {
          i: id,
          c: content_1
        }
      );

      const result = await connection.execute(
        "select c1 from nodb_clob2 where id = :1",
        [id],
        { resultSet: true }
      );
      await fetchOneRowFromRS(result.resultSet);
    }); // 86.1.3

  }); // 86.1

  describe('86.2 types support for fetchAsString property', function() {

    afterEach ('clear the by-type specification', function() {
      oracledb.fetchAsString = [];
    });

    it('86.2.1 String not supported in fetchAsString', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ oracledb.STRING ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 86.2.1

    it('86.2.2 BLOB not supported in fetchAsString', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ oracledb.BLOB ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 86.2.2

    it('86.2.3 Cursor not supported in fetchAsString', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ oracledb.CURSOR ];
        },
        /NJS-021: invalid type for conversion specified/
      );
    }); // 86.2.3

    it('86.2.4 Buffer supported in fetchAsString', function() {
      assert.doesNotThrow(
        function() {
          oracledb.fetchAsString = [ oracledb.BUFFER ];
        }
      );
      assert.strictEqual(oracledb.fetchAsString.length, 1);
      assert.strictEqual(oracledb.fetchAsString[0], oracledb.BUFFER);
    }); // 86.2.4

    it('86.2.5 Number supported in fetchAsString', function() {
      assert.doesNotThrow(
        function() {
          oracledb.fetchAsString = [ oracledb.NUMBER ];
        }
      );
      assert.strictEqual(oracledb.fetchAsString.length, 1);
      assert.strictEqual(oracledb.fetchAsString[0], oracledb.NUMBER);
    }); // 86.2.5

    it('86.2.6 Date supported in fetchAsString', function() {
      assert.doesNotThrow(
        function() {
          oracledb.fetchAsString = [ oracledb.DATE ];
        }
      );
      assert.strictEqual(oracledb.fetchAsString.length, 1);
      assert.strictEqual(oracledb.fetchAsString[0], oracledb.DATE);
    }); // 86.2.6

    it('86.2.7 CLOB supported in fetchAsString', function() {
      assert.doesNotThrow(
        function() {
          oracledb.fetchAsString = [ oracledb.CLOB ];
        }
      );
      assert.strictEqual(oracledb.fetchAsString.length, 1);
      assert.strictEqual(oracledb.fetchAsString[0], oracledb.CLOB);
    }); // 86.2.7

    it('86.2.8 undefined in fetchAsString will throw NJS-021', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ undefined ];
        },
        /NJS-021:/
      );
    }); // 86.2.8

    it('86.2.9 Random string in fetchAsString will throw NJS-021', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ "foobar" ];
        },
        /NJS-021:/
      );
    }); // 86.2.9

    it('86.2.10 Random integer in fetchAsString will throw NJS-021', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ 31415 ];
        },
        /NJS-021:/ // NJS-021: invalid type for conversion specified
      );
    }); // 86.2.10

    it('86.2.11 Negative integer in fetchAsString will throw NJS-021', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ -1 ];
        },
        /NJS-021:/
      );
    }); // 86.2.11

    it('86.2.12 Random float in fetchAsString will throw NJS-021', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ 3.1415 ];
        },
        /NJS-021:/
      );
    }); // 86.2.12

    it('86.2.13 Array in fetchAsString will throw NJS-021', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ [3] ];
        },
        /NJS-021:/
      );
    }); // 86.2.13

    it('86.2.14 Object in fetchAsString will throw NJS-021', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = [ {1:1} ];
        },
        /NJS-021:/
      );
    }); // 86.2.14

    it('86.2.15 Non-Array as fetchAsString will throw NJS-004', function() {
      assert.throws(
        function() {
          oracledb.fetchAsString = 1;
        },
        /NJS-004:/
      );
    }); // 86.2.15

  }); // 86.2

});
