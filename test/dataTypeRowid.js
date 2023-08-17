/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   39. dataTypeRowid.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - ROWID.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const assist   = require('./dataTypeAssist.js');
const dbConfig = require('./dbconfig.js');

describe('39. dataTypeRowid.js', function() {

  let connection = null;
  const tableName = "nodb_rowid";
  const array = assist.data.numbersForBinaryFloat;

  before('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after('release connection', async function() {
    await connection.close();
  });

  describe('39.1 testing ROWID data type', function() {
    before(async function() {

      const sql = assist.sqlCreateTable(tableName);
      await connection.execute(sql);

      await insertData(connection, tableName);

      await updateDate(connection, tableName);
    });

    after(async function() {
      await connection.execute("DROP table " + tableName + " PURGE");
    });

    it('39.1.1 query rowid', async function() {
      const result = await connection.execute(`SELECT * FROM ` + tableName);

      for (let i = 0; i < array.length; i++) {
        const resultVal = result.rows[i][1];
        assert.strictEqual(typeof resultVal, "string");
      }
    });

    it('39.1.2 works well with result set', async function() {
      const result = await connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });

      assert.strictEqual(result.resultSet.metaData[0].name, 'NUM');
      assert.strictEqual(result.resultSet.metaData[1].name, 'CONTENT');
      await fetchRowsFromRS(result.resultSet);
    });

    it('39.1.3 ROWID couldn\'t update', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(
            `update ` + tableName + ` set ROWID = CHARTOROWID('AAAspiAABAAAZnJAAE') where num = 1`);
        },
        /* ORA-01747: invalid user.table.column, table.column, or column specification
           ORA-03050: invalid identifier: "ROWID" is a reserved word */
        /ORA-01747: | ORA-03050:/
      );
    });

    it('39.1.4 can get data object number correctly', async function() {
      const result = await connection.execute(
        `select dbms_rowid.rowid_object(ROWID) AS C from ` + tableName + ` WHERE ROWNUM <=1`);

      const resultVal = result.rows[0][0];
      assert.strictEqual(typeof resultVal, "number");
    });

    it('39.1.5 can get datafile number correctly', async function() {
      const result = await connection.execute(
        `select dbms_rowid.rowid_relative_fno(ROWID) AS C from ` + tableName + ` WHERE ROWNUM <=1`);

      const resultVal = result.rows[0][0];
      assert.strictEqual(typeof resultVal, "number");
    });

    it('39.1.6 can get data block number correctly', async function() {
      const result = await connection.execute(
        `select dbms_rowid.ROWID_BLOCK_NUMBER(ROWID) AS C from ` + tableName + ` WHERE ROWNUM <=1`);

      const resultVal = result.rows[0][0];
      assert.strictEqual(typeof resultVal, "number");
    });

    it('39.1.7 can get row number correctly', async function() {
      const result = await connection.execute(
        `select dbms_rowid.rowid_row_number(ROWID) AS C from ` + tableName + ` WHERE ROWNUM <=1`);

      const resultVal = result.rows[0][0];
      assert.strictEqual(typeof resultVal, "number");
    });

    it('39.1.8 works well with REF Cursor', async function() {
      await verifyRefCursor(connection, tableName);
    });

    it('39.1.9 columns fetched from REF CURSORS can be mapped by fetchInfo settings', async function() {
      await verifyRefCursorWithFetchInfo(connection, tableName);
    });

    it('39.1.10 assigning a string to rowid', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(
            `update ` + tableName + ` set ROWID = 'AAAspiAABAAAZnJAAE' where num = 1`);
        },
        /* ORA-01747: invalid user.table.column, table.column, or column specification
           ORA-03050: invalid identifier: "ROWID" is a reserved word */
        /ORA-01747: | ORA-03050:/
      );
    });

    it('39.1.11 inserting an invalid rowid', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(
            `INSERT INTO ` + tableName + ` (num, ROWID) VALUES ('12345', 523lkhlf)`);
        },
        /* ORA-01747: invalid user.table.column, table.column, or column specification
           ORA-03050: invalid identifier: "ROWID" is a reserved word */
        /ORA-01747: | ORA-03050:/
      );
    });
  });

  describe('39.2 stores null value correctly', function() {
    it('39.2.1 testing Null, Empty string and Undefined', async function() {
      await assist.verifyNullValues(connection, tableName);
    });
  });

  const insertData = async function(connection, tableName) {
    await Promise.all(array.map(async function(element) {
      const sql = `INSERT INTO ` + tableName + `(num) VALUES(` + element + `)`;
      await connection.execute(sql);
    }));
  };

  const updateDate = async function(connection, tableName) {
    await Promise.all(array.map(async function(element) {
      const sql = `UPDATE ` + tableName + ` T SET content = T.ROWID where num = ` + element;
      await connection.execute(sql);
    }));
  };

  const verifyRefCursor = async function(connection, tableName) {
    const createProc =
          `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) ` +
          `AS ` +
          `BEGIN ` +
          `    OPEN p_out FOR ` +
          `    SELECT * FROM ` + tableName  + `; ` +
          `END; `;

    await connection.execute(createProc);

    const result = await connection.execute(
      "BEGIN testproc(:o); END;",
      [
        { type: await oracledb.CURSOR, dir: await oracledb.BIND_OUT }
      ],
      { outFormat: await oracledb.OUT_FORMAT_OBJECT });
    await fetchRowsFromRS(result.outBinds[0]);
    await connection.execute(`DROP PROCEDURE testproc`);
  };

  async function verifyRefCursorWithFetchInfo(connection, tableName) {
    const createProc =
          `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR)
           AS
           BEGIN
               OPEN p_out FOR SELECT * FROM ` + tableName  + `;
           END;`;

    await connection.execute(createProc);

    const result = await connection.execute(
      "BEGIN testproc(:o); END;",
      [
        { type: await oracledb.CURSOR, dir: await oracledb.BIND_OUT }
      ],
      {
        outFormat: await oracledb.OUT_FORMAT_OBJECT,
        fetchInfo:
              {
                "CONTENT": { type: await oracledb.STRING }
              }
      });

    await fetchRowsFromRS_fetchas(result.outBinds[0]);

    await connection.execute("DROP PROCEDURE testproc");
  }

  const fetchRowsFromRS = async function(rs) {
    const rows = await rs.getRows();
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        rows[i].CONTENT;
      }
    } else {
      await rs.close();
    }
  };

  async function fetchRowsFromRS_fetchas(rs) {
    const rsrows = await rs.getRows();
    if (rsrows.length > 0) {
      for (let i = 0; i < rsrows.length; i++) {
        const resultVal = rsrows[i].CONTENT;
        assert.strictEqual(typeof resultVal, "string");
        await verifyFetchValues(connection, rsrows[i].NUM, rsrows[i].CONTENT, tableName);
      }
    } else {
      await rs.close();
    }
  }

  async function verifyFetchValues(connection, num, content, tableName) {
    const result = await connection.execute(`SELECT ROWID FROM ` + tableName + ` WHERE num = ` + num);
    assert.strictEqual(content, result.rows[0][0]);
  }
});
