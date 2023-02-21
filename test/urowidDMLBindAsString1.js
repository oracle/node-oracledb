/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   114. urowidDMLBindAsString1.js
 *
 * DESCRIPTION
 *   Testing urowid binding as String with DML.
 *   The Universal ROWID (UROWID) is a datatype that can store both logical and physical rowids of Oracle tables. Logical rowids are primary key-based logical identifiers for the rows of Index-Organized Tables (IOTs).
 *   To use columns of the UROWID datatype, the value of the COMPATIBLE initialization parameter must be set to 8.1 or higher.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var assert   = require('assert');
var dbConfig = require('./dbconfig.js');
var testsUtil = require('./testsUtil.js');

describe('114. urowidDMLBindAsString1.js', function() {
  let connection;
  const tableName = "nodb_bind_urowid";
  let insertID = 1;

  const proc_create_table = "BEGIN \n" +
                          "    DECLARE \n" +
                          "        e_table_missing EXCEPTION; \n" +
                          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n" +
                          "    BEGIN \n" +
                          "        EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE' ); \n" +
                          "    EXCEPTION \n" +
                          "        WHEN e_table_missing \n" +
                          "        THEN NULL; \n" +
                          "    END; \n" +
                          "    EXECUTE IMMEDIATE ( ' \n" +
                          "        CREATE TABLE " + tableName + " ( \n" +
                          "            ID       NUMBER, \n" +
                          "            content  UROWID(4000) \n" +
                          "        ) \n" +
                          "      '); \n" +
                          "END;  ";
  const drop_table = "DROP TABLE " + tableName + " PURGE";

  before('get connection and create table', async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(proc_create_table);
  });

  after('release connection', async function() {
    await connection.execute(drop_table);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('114.1 INSERT & SELECT', function() {

    it('114.1.1 works with null', async function() {
      const content = null;
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      await dmlInsert(bindVar, content);
    });

    it('114.1.2 works with empty string', async function() {
      const content = "";
      const expected = null;
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      await dmlInsert(bindVar, expected);
    });

    it('114.1.3 works with extended rowid', async function() {
      const content = "AAABoqAADAAAAwPAAA";
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      await dmlInsert(bindVar, content);
    });

    it('114.1.4 works with restricted rowid', async function() {
      const content = "00000DD5.0000.0001";
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      await dmlInsert(bindVar, content);
    });

    it('114.1.5 throws error with number 0', async function() {
      const content = 0;
      const sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };

      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql_insert, bindVar),
        /NJS-011:/
      );
    });

    it('114.1.6 works with string 0', async function() {
      const content = "0";
      const expected = "00000000.0000.0000";
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      await dmlInsert(bindVar, expected);
    });

    it('114.1.7 works with substr', async function() {
      const content = "AAAA8+AALAAAAQ/AAA";
      await dmlInsert_substr(content);
    });

    it('114.1.8 bind null with default type/dir - named bind', async function() {
      const content = null;
      const bindVar_1 = {
        i: insertID,
        c: content
      };
      await dmlInsert(bindVar_1, content);
    });

    it('114.1.9 bind null with default type/dir - positional bind', async function() {
      const content = null;
      const bindVar_1 = [ insertID, content ];
      await dmlInsert(bindVar_1, content);
    });

    it('114.1.10 bind extented rowid with default type/dir - named bind', async function() {
      const content = "AAAA8+AALAAAAQ/AAA";
      const bindVar_1 = {
        i: insertID,
        c: content
      };
      await dmlInsert(bindVar_1, content);
    });

    it('114.1.11 bind extented rowid with default type/dir - positional bind', async function() {
      const content = "AAAA8+AALAAAAQ/AAA";
      const bindVar_1 = [ insertID, content ];
      await dmlInsert(bindVar_1, content);
    });

    it('114.1.12 works with undefined', async function() {
      const content = undefined;
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };
      await dmlInsert(bindVar, null);
    });

    it('114.1.13 bind undefined with default type/dir - named bind', async function() {
      const content = undefined;
      const bindVar_1 = {
        i: insertID,
        c: content
      };
      await dmlInsert(bindVar_1, null);
    });

    it('114.1.14 bind undefined with default type/dir - positional bind', async function() {
      const content = undefined;
      const bindVar_1 = [ insertID, content ];
      await dmlInsert(bindVar_1, null);
    });

    it('114.1.15 works with NaN', async function() {
      const content = NaN;
      const sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }
      };

      await testsUtil.assertThrowsAsync(
        async () => await connection.execute(sql_insert, bindVar),
        /NJS-011:/
      );
    });

  });

  describe('114.2 UPDATE', function() {

    it('114.2.1 UPDATE null column', async function() {
      const content_insert = null;
      const content_update = "AAABiqAADAAAAwPAAA";
      await dmlUpdate(content_insert, content_update, content_update);
    });

    it('114.2.1 UPDATE extented rowid with restricted rowid', async function() {
      const content_insert = "AAABioAADAAAAwPAAA";
      const content_update = "00000DD5.0010.0001";
      await dmlUpdate(content_insert, content_update, content_update);
    });

    it('114.2.3 UPDATE restricted rowid with null', async function() {
      const content_insert = "00000DD5.0010.0002";
      const content_update = null;
      await dmlUpdate(content_insert, content_update, content_update);
    });
  });

  describe('114.3 RETURNING INTO', function() {

    it('114.3.1 INSERT null', async function() {
      const content = null;
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await insert_returning(bindVar, content);
    });

    it('114.3.2 INSERT extented rowid', async function() {
      const content = "AAAA++AALAAAAQ/AAA";
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await insert_returning(bindVar, content);
    });

    it('114.3.3 INSERT restricted rowid', async function() {
      const content = "00000000.0100.0100";
      const bindVar = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await insert_returning(bindVar, content);
    });

    it('114.3.7 UPDATE null with extented rowid', async function() {
      const content_insert = null;
      const content_update = "AAABiqAADAAAAwPAAA";
      const bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await update_returning(content_insert, bindVar_update, content_update);
    });

    it('114.3.8 UPDATE extented rowid with null', async function() {
      const content_insert = "AAABiqAADAAAAwPAAA";
      const content_update = null;
      const bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await update_returning(content_insert, bindVar_update, content_update);
    });

    it('114.3.9 UPDATE restricted rowid with empty string', async function() {
      const content_insert = "00000000.0100.0100";
      const content_update = "";
      const bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await update_returning(content_insert, bindVar_update, null);
    });

    it('114.3.10 UPDATE restricted rowid with extented rowid', async function() {
      const content_insert = "00000000.0100.0100";
      const content_update = "AAABiqAADAAAAwPAAA";
      const bindVar_update = {
        i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
        c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING },
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await update_returning(content_insert, bindVar_update, content_update);
    });

    it('114.3.11 INSERT with default type/dir - named bind', async function() {
      const content = "00000000.0100.0100";
      const bindVar = {
        i: insertID,
        c: content,
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await insert_returning(bindVar, content);
    });

    it('114.3.12 INSERT with default type/dir - positional bind', async function() {
      const content = "00000000.0100.0100";
      const bindVar = [ insertID, content, { dir : oracledb.BIND_OUT, type : oracledb.STRING } ];
      await insert_returning(bindVar, content);
    });

    it('114.3.13 UPDATE with default type/dir - named bind', async function() {
      const content_insert = "00000000.0100.0100";
      const content_update = "AAABiqAADAAAAwPAAA";
      const bindVar_update = {
        i: insertID,
        c: content_update,
        o: { dir : oracledb.BIND_OUT, type : oracledb.STRING }
      };
      await update_returning(content_insert, bindVar_update, content_update);
    });

    it('114.3.14 UPDATE with default type/dir - positional bind', async function() {
      const content_insert = "00000000.0100.0100";
      const content_update = "AAABiqAADAAAAwPAAA";
      const bindVar_update = [ content_update, insertID, { dir : oracledb.BIND_OUT, type : oracledb.STRING } ];
      await update_returning(content_insert, bindVar_update, content_update);
    });
  });

  describe('107.4 WHERE', function() {
    it('107.4.1 can bind in WHERE clause', async function() {
      await where_select();
    });
  });

  const dmlInsert = async function(bindVar, expected) {
    const sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
    const sql_select = "select * from " + tableName + " where id = :i";
    let result = await connection.execute(sql_insert, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
    result = await connection.execute(sql_select, { i: insertID });
    const resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
  };

  const dmlInsert_substr = async function(content) {
    const id = insertID++;
    const sql_insert = "insert into " + tableName + "(id, content) values (" + id + ", CHARTOROWID(:c))";
    const sql_select = "select content, SUBSTR(content,1,6) , SUBSTR(content,7,3), SUBSTR(content,10,6), SUBSTR(content,16,3) from " + tableName + " where id = " + id;
    const bindVar = { c: { val : content, dir : oracledb.BIND_IN, type : oracledb.STRING }};
    let result = await connection.execute(sql_insert, bindVar);
    assert.strictEqual(result.rowsAffected, 1);
    result = await connection.execute(sql_select);
    const resultVal_rowid = result.rows[0][0];
    const resultVal_object = result.rows[0][1];
    const resultVal_file = result.rows[0][2];
    const resultVal_block = result.rows[0][3];
    const resultVal_row = result.rows[0][4];
    assert.strictEqual(typeof resultVal_rowid, "string");
    assert.strictEqual(typeof resultVal_block, "string");
    assert.strictEqual(typeof resultVal_row, "string");
    assert.strictEqual(typeof resultVal_file, "string");
    assert.strictEqual(typeof resultVal_object, "string");
    assert.strictEqual(resultVal_rowid, content);
    assert.strictEqual(resultVal_object, content.substring(0, 6));
    assert.strictEqual(resultVal_file, content.substring(6, 9));
    assert.strictEqual(resultVal_block, content.substring(9, 15));
    assert.strictEqual(resultVal_row, content.substring(15, 18));
  };

  const dmlUpdate = async function(content_insert, content_update, expected) {
    const sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
    const sql_update = "update " + tableName + " set content = :c where id = :i";
    const sql_select = "select * from " + tableName + " where id = :i";
    const bindVar_insert = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : content_insert, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    const bindVar_update = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : content_update, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    let result = await connection.execute(sql_insert, bindVar_insert);
    assert.strictEqual(result.rowsAffected, 1);
    result = await connection.execute(sql_update, bindVar_update);
    assert.strictEqual(result.rowsAffected, 1);
    result = await connection.execute(sql_select, { i: insertID });
    const resultVal = result.rows[0][1];
    assert.strictEqual(resultVal, expected);
  };

  const insert_returning = async function(bindVar, expected) {
    const sql_returning = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c)) returning content into :o";
    const result = await connection.execute(sql_returning, bindVar);
    let resultVal;
    if (typeof (result.outBinds.o) === 'undefined') resultVal = result.outBinds[0][0];
    else resultVal = result.outBinds.o[0];
    assert.strictEqual(resultVal, expected);
  };

  const update_returning = async function(content_insert, bindVar_update, expected) {
    const sql_insert = "insert into " + tableName + "(id, content) values (:i, CHARTOROWID(:c))";
    const sql_update = "update " + tableName + " set content = :c where id = :i returning content into :o";
    const bindVar_insert = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : content_insert, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    let result = await connection.execute(sql_insert, bindVar_insert);
    assert.strictEqual(result.rowsAffected, 1);
    result = await connection.execute(sql_update, bindVar_update);
    let resultVal;
    if (typeof (result.outBinds.o) === 'undefined') resultVal = result.outBinds[0][0];
    else resultVal = result.outBinds.o[0];
    assert.strictEqual(resultVal, expected);
  };

  const where_select = async function() {
    let sql = `insert into ${tableName} T (ID) values (${insertID})`;
    let result = await connection.execute(sql);
    assert.strictEqual(result.rowsAffected, 1);
    sql = `UPDATE ${tableName} T SET content = T.ROWID where ID = ${insertID}`;
    result = await connection.execute(sql);
    assert.strictEqual(result.rowsAffected, 1);
    sql = `select content from ${tableName} where ID = ${insertID}`;
    result = await connection.execute(sql);
    const resultVal = result.rows[0][0];
    sql = `select * from ${tableName} where ROWID = CHARTOROWID(:c)`;
    const binds = {
      c: {
        val: resultVal, dir : oracledb.BIND_IN, type : oracledb.STRING
      }
    };
    result = await connection.execute(sql, binds);
    const resultVal_1 = result.rows[0][0];
    const resultVal_2 = result.rows[0][1];
    assert.strictEqual(resultVal_1, insertID);
    assert.strictEqual(resultVal_2, resultVal);
  };

});
