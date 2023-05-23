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
 *   115. urowidDMLBindAsString2.js
 *
 * DESCRIPTION
 *   Testing urowid binding as String with DML.
 *   The Universal ROWID (UROWID) is a datatype that can store both logical and physical rowids of Oracle tables. Logical rowids are primary key-based logical identifiers for the rows of Index-Organized Tables (IOTs).
 *   To use columns of the UROWID datatype, the value of the COMPATIBLE initialization parameter must be set to 8.1 or higher.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const random   = require('./random.js');
const testsUtil = require('./testsUtil.js');

describe('115. urowidDMLBindAsString2.js', function() {
  let connection = null;
  const tableName_indexed = "nodb_urowid_indexed";
  const tableName_normal = "nodb_urowid_normal";
  let insertID = 1;

  const table_indexed = `BEGIN
                           DECLARE
                               e_table_missing EXCEPTION;
                               PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
                           BEGIN
                               EXECUTE IMMEDIATE ('DROP TABLE ` + tableName_indexed + ` PURGE' );
                           EXCEPTION
                               WHEN e_table_missing
                               THEN NULL;
                           END;
                           EXECUTE IMMEDIATE ( '
                               CREATE TABLE ` + tableName_indexed + `(
                                   c1    NUMBER,
                                   c2    VARCHAR2(3000),
                                   primary key(c1, c2)
                               ) organization index
                           ');
                           END;`;

  const table_normal = `BEGIN
                        DECLARE
                            e_table_missing EXCEPTION;
                            PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
                        BEGIN
                            EXECUTE IMMEDIATE ('DROP TABLE ` + tableName_normal + ` PURGE' );
                        EXCEPTION
                            WHEN e_table_missing
                            THEN NULL;
                        END;
                        EXECUTE IMMEDIATE ('
                            CREATE TABLE ` + tableName_normal + ` (
                                ID       NUMBER,
                                content  UROWID(4000)
                            )
                        ');
                        END;`;

  const drop_table_indexed = "DROP TABLE " + tableName_indexed + " PURGE";
  const drop_table_normal = "DROP TABLE " + tableName_normal + " PURGE";

  before('get connection and create table', async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(table_indexed);
    await connection.execute(table_normal);
  });

  after('release connection', async function() {
    await connection.execute(drop_table_indexed);
    await connection.execute(drop_table_normal);
    await connection.close();
  });

  beforeEach(function() {
    insertID++;
  });

  describe('115.1 INSERT & SELECT', function() {

    it('115.1.1 works with urowid length > 200', async function() {
      await testBigUROWID(200, 200);
    });

    it('115.1.2 works with urowid length > 500', async function() {
      await testBigUROWID(600, 500);
    });

    it('115.1.3 works with maxSize < 200', async function() {
      await testBigUROWID_maxSize(300, 200);
    });
  });

  describe('115.2 UPDATE', function() {

    it('115.2.1 update null with urowid length > 200', async function() {
      await testBigUROWID_update(null, 200, 200);
    });

    it('115.2.2 update enpty string with urowid length > 500', async function() {

      await testBigUROWID_update("", 600, 500);
    });

    it('115.2.3 update with urowid length > 500', async function() {

      await testBigUROWID_update("00000DD5.0000.0001", 600, 500);
    });

    it('115.2.4 works with maxSize < 200', async function() {
      await testBigUROWID_update_maxSize("00000DD5.0000.0001", 300, 200);
    });

  });

  describe('115.3 RETURNING INTO', function() {

    it('115.3.1 urowid length > 200', async function() {
      if (connection.oracleServerVersion < 1201000200) this.skip();
      await testBigUROWID_returning(200, 200);
    });

    it('115.3.2 urowid length > 500', async function() {
      await testBigUROWID_returning(600, 500);
    });

  });

  describe('115.4 WHERE', function() {

    it('115.4.1 urowid length > 200', async function() {
      await testBigUROWID_where(200, 200);
    });

    it('115.4.2 urowid length > 500', async function() {

      await testBigUROWID_where(600, 500);
    });

  });

  describe('115.5 queryStream() and oracledb.maxRows = actual rows', function() {

    it('115.5.1 urowid length > 200', async function() {
      await testBigUROWID_stream(2, 200, 200);
    });

    it('115.5.2 urowid length > 500', async function() {
      await testBigUROWID_stream(2, 600, 500);
    });

  });

  describe('115.6 queryStream() and oracledb.maxRows > actual rows', function() {

    it('115.6.1 urowid length > 200', async function() {

      await testBigUROWID_stream(5, 200, 200);
    });

    it('115.6.2 urowid length > 500', async function() {
      await testBigUROWID_stream(100, 600, 500);
    });

  });

  describe('115.7 queryStream() and oracledb.maxRows < actual rows', function() {

    it('115.7.1 urowid length > 200', async function() {
      await testBigUROWID_stream(1, 200, 200);
    });

    it('115.7.2 urowid length > 500', async function() {
      await testBigUROWID_stream(1, 600, 500);
    });

  });


  const testBigUROWID = async function(strLength, rowidLenExpected) {
    const str = random.getRandomLengthString(strLength);
    let urowid, urowidLen;
    let result;
    const sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await connection.execute(sql_insert);
    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    await testsUtil.checkUrowidLength(urowidLen, rowidLenExpected);
    const bindVar = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };

    try {
      result = await connection.execute("insert into " + tableName_normal + " (ID, content) values (:i, :c)", bindVar);
    } catch (err) {
      if (urowidLen > 4000) {
        assert.strictEqual(err.message, "ORA-01704: string literal too long");
      }
    }
    if ((urowidLen <= 4000)) {
      assert.strictEqual(result.rowsAffected, 1);
    }

    result = await connection.execute("select * from " + tableName_normal + " where ID = " + insertID);
    if (urowidLen < 4000) {
      assert.strictEqual(result.rows[0][1], urowid);
    }


    insertID++;
    try {
      result = await connection.execute("insert into " + tableName_normal + " (ID, content) values (" + insertID + ", '" + urowid + "')");
    } catch (err) {
      if (urowidLen > 4000) {
        assert.strictEqual(err.message, "ORA-01704: string literal too long");
      }
    }

    if ((urowidLen <= 4000)) {
      assert.strictEqual(result.rowsAffected, 1);
    }

    result = await connection.execute("select * from " + tableName_normal + " where ID = " + insertID);

    if (urowidLen < 4000) {
      assert.strictEqual(result.rows[0][1], urowid);
    }

  };

  const testBigUROWID_maxSize = async function(strLength, rowidLenExpected) {
    const str = random.getRandomLengthString(strLength);
    let urowid, urowidLen;
    let result;
    const sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await connection.execute(sql_insert);
    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    await testsUtil.checkUrowidLength(urowidLen, rowidLenExpected);
    const bindVar = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 100 }
    };
    try {
      result = await connection.execute("insert into " + tableName_normal + " (ID, content) values (:i, :c)", bindVar);
    } catch (err) {
      if (urowidLen > 4000) {
        assert.strictEqual(err.message, "ORA-01704: string literal too long");
      }

    }
    if (urowidLen <= 4000) {
      assert.strictEqual(result.rowsAffected, 1);
    }

    result = await connection.execute("select * from " + tableName_normal + " where ID = " + insertID);
    if (urowidLen < 4000) {
      assert.strictEqual(result.rows[0][1], urowid);
    }
    insertID++;
    try {
      result = await connection.execute("insert into " + tableName_normal + " (ID, content) values (" + insertID + ", '" + urowid + "')");
    } catch (err) {
      if (urowidLen > 4000) {
        assert.strictEqual(err.message, "ORA-01704: string literal too long");
      }
    }
    if (urowidLen <= 4000) {
      assert.strictEqual(result.rowsAffected, 1);
    }


    result = await connection.execute("select * from " + tableName_normal + " where ID = " + insertID);

    if (urowidLen < 4000) {
      assert.strictEqual(result.rows[0][1], urowid);
    }

  };

  const testBigUROWID_update = async function(rowid_org, strLength, rowidLenExpected) {
    const str = random.getRandomLengthString(strLength);
    let sql_insert, bindVar, result;
    let urowid, urowidLen;
    let id_1 = insertID++;
    let id_2 = insertID++;
    sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
    bindVar = {
      i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    await connection.execute(sql_insert, bindVar);

    sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
    bindVar = {
      i: { val : id_2, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    await connection.execute(sql_insert, bindVar);

    sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await connection.execute(sql_insert);

    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);

    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    await testsUtil.checkUrowidLength(urowidLen, rowidLenExpected);

    bindVar = {
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
      i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER }
    };
    try {
      result = await connection.execute("update " + tableName_normal + " set content = :c where ID = :i", bindVar);
    } catch (err) {
      if (urowidLen > 4000) {
        assert.strictEqual(err.message, "ORA-01704: string literal too long");
      }
    }
    if (urowidLen <= 4000) {
      assert.strictEqual(result.rowsAffected, 1);
    }

    result = await connection.execute("select * from " + tableName_normal + " where ID = " + id_1);
    if (urowidLen < 4000) {
      assert.strictEqual(result.rows[0][1], urowid);
    }
    try {
      result = await connection.execute("update " + tableName_normal + " set content = '" + urowid + "' where ID = " + id_2);
    } catch (err) {
      if (urowidLen > 4000) {
        assert.strictEqual(err.message, "ORA-01704: string literal too long");
      }
    }
    if (urowidLen <= 4000) {
      assert(result.rowsAffected, 1);
    }

    result = await connection.execute("select * from " + tableName_normal + " where ID = " + id_2);
    if (urowidLen < 4000) {
      assert.strictEqual(result.rows[0][1], urowid);
    }

  };

  const testBigUROWID_update_maxSize = async function(rowid_org, strLength, rowidLenExpected) {
    const str = random.getRandomLengthString(strLength);
    let urowid, urowidLen;
    let id_1 = insertID++;
    let id_2 = insertID++;
    let sql_insert, bindVar, result;

    sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
    bindVar = {
      i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    await connection.execute(sql_insert, bindVar);

    sql_insert = "insert into " + tableName_normal + " (ID, content) values (:i, :c)";
    bindVar = {
      i: { val : id_2, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : rowid_org, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    await connection.execute(sql_insert, bindVar);

    sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await connection.execute(sql_insert);

    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    assert(result);
    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    testsUtil.checkUrowidLength(urowidLen, rowidLenExpected);

    bindVar = {
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
      i: { val : id_1, dir : oracledb.BIND_IN, type : oracledb.NUMBER, maxSize: 100 }
    };
    result = await connection.execute("update " + tableName_normal + " set content = :c where ID = :i", bindVar);
    assert(result);
    assert(result.rowsAffected, 1);

    result = await connection.execute("select * from " + tableName_normal + " where ID = " + id_1);

    if (urowidLen < 4000) {
      assert(result);
      assert.strictEqual(result.rows[0][1], urowid);
    }


    result = await connection.execute("update " + tableName_normal + " set content = '" + urowid + "' where ID = " + id_2);
    assert(result);
    assert(result.rowsAffected, 1);


    result = await connection.execute("select * from " + tableName_normal + " where ID = " + id_2);
    assert(result);
    assert.strictEqual(result.rows[0][1], urowid);
  };

  const testBigUROWID_returning = async function(strLength, rowidLenExpected) {
    const str = random.getRandomLengthString(strLength);
    let urowid, urowidLen;
    let sql_insert, result, bindVar;
    sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await connection.execute(sql_insert);
    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    assert(result);

    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    testsUtil.checkUrowidLength(urowidLen, rowidLenExpected);

    bindVar = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
      o: { dir : oracledb.BIND_OUT, type : oracledb.STRING, maxSize: urowidLen }
    };
    result = await connection.execute("insert into " + tableName_normal + " (ID, content) values (:i, :c) returning content into :o",  bindVar);
    assert(result);
    let resultVal;
    if (typeof (result.outBinds.o) === 'undefined') resultVal = result.outBinds[0][0];
    else resultVal = result.outBinds.o[0];
    assert.strictEqual(resultVal, urowid);

    bindVar = {
      i: { val : insertID, dir : oracledb.BIND_IN, type : oracledb.NUMBER },
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING },
      o: { dir : oracledb.BIND_OUT, type : oracledb.STRING, maxSize: 100 }
    };
    try {
      await connection.execute("insert into " + tableName_normal + " (ID, content) values (:i, :c) returning content into :o", bindVar);
    } catch (err) {
      assert.strictEqual(err.message, "NJS-016: buffer is too small for OUT binds");
    }

  };

  const testBigUROWID_where = async function(strLength, rowidLenExpected) {
    const str = random.getRandomLengthString(strLength);
    let urowid, urowidLen;
    let sql_insert, result, bindVar;

    sql_insert = "insert into " + tableName_indexed + " values (" + insertID + ", '" + str + "')";
    await connection.execute(sql_insert);

    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + insertID);
    assert(result);

    urowid = result.rows[0][0];
    urowidLen = urowid.length;
    testsUtil.checkUrowidLength(urowidLen, rowidLenExpected);

    bindVar = {
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    result = await connection.execute("select * from " + tableName_indexed + " where ROWID = :c", bindVar);
    assert(result);

    assert.strictEqual(result.rows[0][0], insertID);
    assert.strictEqual(result.rows[0][1], str);
    bindVar = {
      c: { val : urowid, dir : oracledb.BIND_IN, type : oracledb.STRING, maxSize: 100 }
    };
    result = await connection.execute("select * from " + tableName_indexed + " where ROWID = :c", bindVar);
    assert(result);
    assert.strictEqual(result.rows[0][0], insertID);
    assert.strictEqual(result.rows[0][1], str);

  };

  const testBigUROWID_stream = async function(maxRows, strLength, rowidLenExpected) {
    const str = random.getRandomLengthString(strLength);
    let urowid_1, urowidLen_1, urowid_2, urowidLen_2;
    let id_1 = insertID++;
    let id_2 = insertID++;
    const maxRowsBak = oracledb.maxRows;
    oracledb.maxRows = maxRows;
    let sql_insert, result;
    sql_insert = "insert into " + tableName_indexed + " values (" + id_1 + ", '" + str + "')";
    await connection.execute(sql_insert);

    sql_insert = "insert into " + tableName_indexed + " values (" + id_2 + ", '" + str + "')";
    await connection.execute(sql_insert);
    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_1);
    urowid_1 = result.rows[0][0];
    urowidLen_1 = urowid_1.length;
    testsUtil.checkUrowidLength(urowidLen_1, rowidLenExpected);

    result = await connection.execute("select ROWID from " + tableName_indexed + " where c1 = " + id_2);
    urowid_2 = result.rows[0][0];
    urowidLen_2 = urowid_2.length;
    testsUtil.checkUrowidLength(urowidLen_2, rowidLenExpected);

    let counter = 0;
    const sql_select = "select c1, c2, ROWID from " + tableName_indexed + " where ROWID = :i1 or ROWID = :i2 order by c1";
    const bindVar = {
      i1: { val : urowid_1, dir : oracledb.BIND_IN, type : oracledb.STRING },
      i2: { val : urowid_2, dir : oracledb.BIND_IN, type : oracledb.STRING }
    };
    const stream = await connection.queryStream(sql_select, bindVar);
    stream.on('error', function() {
    });

    stream.on('data', function(data) {
      assert(data != null);
      counter++;
      let result_id = data[0];
      if (result_id === id_1) {
        assert.deepStrictEqual(data, [ id_1, str, urowid_1 ]);
      } else {
        assert.deepStrictEqual(data, [ id_2, str, urowid_2 ]);
      }
    });

    stream.on('metadata', function(metadata) {
      counter++;
      assert(metadata != null);
      assert.deepStrictEqual(metadata, [ { name: 'C1' }, { name: 'C2' }, { name: 'ROWID' } ]);
    });

    stream.on('end', function(err) {
      assert(err == null);
      assert.equal(counter, 3);  // 3 events seen
      oracledb.maxRows = maxRowsBak;
      stream.destroy();
    });

    stream.on('close', function() {
    });
  };

});
