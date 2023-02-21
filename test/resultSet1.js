/* Copyright (c) 2015, 2022, Oracle and/or its affiliates. */

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
 *   12. resultSet1.js
 *
 * DESCRIPTION
 *   Testing driver resultSet feature.
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const should   = require('should');
const dbConfig = require('./dbconfig.js');

describe('12. resultSet1.js', function() {

  let conn = null;
  const createTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_rs1_emp PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_rs1_emp ( \
                  employees_id NUMBER,  \
                  employees_name VARCHAR2(20) \
              ) \
          '); \
      END; ";

  const insertRows =
      "DECLARE \
          x NUMBER := 0; \
          n VARCHAR2(20); \
       BEGIN \
          FOR i IN 1..217 LOOP \
             x := x + 1; \
             n := 'staff ' || x; \
             INSERT INTO nodb_rs1_emp VALUES (x, n); \
          END LOOP; \
       END; ";
  const rowsAmount = 217;

  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
    await conn.execute(createTable);
    await conn.execute(insertRows);
  });

  after(async function() {
    if (conn) {
      await conn.execute('DROP TABLE nodb_rs1_emp PURGE');
      await conn.close();
    }
  });

  describe('12.1 Testing resultSet option', function() {
    it('12.1.1 when resultSet option = false, content of result is correct', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp", [],
        { resultSet: false, fetchArraySize: 100, maxRows: 1000 });
      result.rows.length.should.be.exactly(rowsAmount);
      // console.log(result.rows);
      should.not.exist(result.resultSet);
    });

    it('12.1.2 when resultSet option = true, content of result is correct', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp", [],
        { resultSet: true, fetchArraySize: 100, maxRows: 1000 });
      should.not.exist(result.rows);
      should.exist(result.resultSet);
      await result.resultSet.close();
    });

    it('12.1.3 negative - 0', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp", [],
          { resultSet: 0, fetchArraySize: 100, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"resultSet\" in parameter 3");
      }
    });

    it('12.1.4 negative - null', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: null, fetchArraySize: 100, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"resultSet\" in parameter 3");
      }
    });

    it('12.1.5 when resultSet option = undefined, it behaves like false', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: undefined, fetchArraySize: 100, maxRows: 1000 });
      result.rows.length.should.be.exactly(rowsAmount);
      should.not.exist(result.resultSet);
    });

    it('12.1.6 negative - NaN', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: NaN, fetchArraySize: 100, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"resultSet\" in parameter 3");
      }
    });

    it('12.1.7 negative - 1', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: 1, fetchArraySize: 100, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"resultSet\" in parameter 3");
      }
    });

    it('12.1.8 negative - (-1)', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: -1, fetchArraySize: 100, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"resultSet\" in parameter 3");
      }
    });

    it('12.1.9 negative - random string', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: 'foo', fetchArraySize: 100, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"resultSet\" in parameter 3");
      }
    });

  });

  describe('12.2 Testing fetchArraySize option', function() {
    it('12.2.1 negative - negative value', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: true, fetchArraySize: -10, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        (err.message).should.startWith('NJS-007:');
      }
    });

    it('12.2.2 negative - random string', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: true, fetchArraySize: 'bar', maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        (err.message).should.startWith('NJS-007:');
      }
    });

    it('12.2.3 negative - NaN', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: true, fetchArraySize: NaN, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        (err.message).should.startWith('NJS-007:');
      }
    });

    it('12.2.4 negative - null', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: true, fetchArraySize: null, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"fetchArraySize\" in parameter 3");
      }
    });

    it('12.2.5 negative - zero value', async function() {
      try {
        const result = await conn.execute(
          "SELECT employees_name FROM nodb_rs1_emp",
          [],
          { resultSet: true, fetchArraySize: 0, maxRows: 1000 });
        should.not.exist(result);
      } catch (err) {
        should.strictEqual(err.message, "NJS-007: invalid value for \"fetchArraySize\" in parameter 3");
      }
    });

  });

  describe('12.3 Testing function getRows()', function() {
    it('12.3.1 retrieved set is exactly the size of result', async function() {
      const nRows = rowsAmount;
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(1);
    });

    it('12.3.2 retrieved set is greater than the size of result', async function() {
      const nRows = rowsAmount * 2;
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(1);
    });

    it('12.3.3 retrieved set is half of the size of result', async function() {
      const nRows = Math.ceil(rowsAmount / 2);
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(2);
    });

    it('12.3.4 retrieved set is one tenth of the size of the result', async function() {
      const nRows = Math.ceil(rowsAmount / 10);
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(10);
    });

    it('12.3.5 data in resultSet is array when setting outFormat ARRAY', async function() {
      const nRows = Math.ceil(rowsAmount / 10);
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100, outFormat: oracledb.OUT_FORMAT_ARRAY });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        for (let i = 0; i < rows.length; i++)
          (rows[i]).should.be.an.Array;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(10);
    });

    it('12.3.6 data in resultSet is object when setting outFormat OBJECT', async function() {
      const nRows = Math.ceil(rowsAmount / 10);
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100, outFormat: oracledb.OUT_FORMAT_OBJECT });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        for (let i = 0; i < rows.length; i++)
          (rows[i]).should.be.an.Object;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(10);
    });

    it('12.3.7 the size of retrieved set can be set to 1', async function() {
      const nRows = 1;
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(rowsAmount);
    });

    it('12.3.8 query 0 row', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp WHERE employees_id > 300",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      const row = await rs.getRow();
      should.not.exist(row);
      await rs.close();
    });

    it('12.3.9 getRows() without argument returns all remaining rows', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      const rows = await rs.getRows();
      rows.length.should.be.exactly(rowsAmount);
      await rs.close();
    });

    it('12.3.10 getRows(0) returns remaining all rows', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      const rows = await rs.getRows(0);
      rows.length.should.be.exactly(rowsAmount);
      await rs.close();
    });

    it('12.3.11 Negative - set the 1st parameter of getRows() to be -5', async function() {
      const nRows = -5;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      try {
        const rows = await rs.getRows(nRows);
        should.not.exist(rows);
      } catch (err) {
        (err.message).should.startWith('NJS-005:');
      } finally {
        await rs.close();
      }
    });

    it('12.3.12 Negative - set the 1st parameter of getRows() to be null', async function() {
      const nRows = null;  // setting to 'undefined' is the same

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      try {
        const rows = await rs.getRows(nRows);
        should.not.exist(rows);
      } catch (err) {
        (err.message).should.startWith('NJS-005:');
      } finally {
        await rs.close();
      }
    });
  });

  describe('12.4 Testing function getRow()', function() {
    it('12.4.1 works well with all correct setting', async function() {
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
        accessCount++;
        row[0].should.eql('staff ' + accessCount);
      }
      await rs.close();
      accessCount.should.be.exactly(rowsAmount);
    });

    it('12.4.2 data in resultSet is array when setting outFormat ARRAY', async function() {
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100, outFormat: oracledb.OUT_FORMAT_ARRAY });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
        accessCount++;
        row.should.be.an.Array;
        row[0].should.eql('staff ' + accessCount);
      }
      await rs.close();
      accessCount.should.be.exactly(rowsAmount);
    });

    it('12.4.3 data in resultSet is object when setting outFormat OBJECT', async function() {
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100, outFormat: oracledb.OUT_FORMAT_OBJECT });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
        accessCount++;
        row.should.be.an.Object;
        row.EMPLOYEES_NAME.should.eql('staff ' + accessCount);
      }
      await rs.close();
      accessCount.should.be.exactly(rowsAmount);
    });

    it('12.4.4 query 0 row', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp WHERE employees_id > 300",
        [],
        { resultSet: true });
      const rs = result.resultSet;
      const row = await rs.getRow();
      should.not.exist(row);
      await rs.close();
    });

    it('12.4.5 Negative - set the first parameter like getRows()', async function() {
      const nRows = 2;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      try {
        const row = await rs.getRow(nRows);
        should.not.exist(row);
      } catch (err) {
        (err.message).should.startWith('NJS-009:');
      } finally {
        await rs.close();
      }
    });

  });

  describe('12.5 Testing function close()', function() {
    it('12.5.1 does not call close()', async function() {
      const nRows = Math.ceil(rowsAmount / 10);
      let accessCount = 0;

      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(nRows);
        if (rows.length == 0)
          break;
        accessCount++;
      }
      await rs.close();
      accessCount.should.be.exactly(10);
    });

    it('12.5.2 invokes close() twice', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      await rs.close();
      try {
        await rs.close();
      } catch (err) {
        (err.message).should.startWith('NJS-018:');
      }
    });

    it('12.5.3 uses getRows after calling close()', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      const rs = result.resultSet;
      await rs.close();
      try {
        const rows = await rs.getRows();
        should.not.exist(rows);
      } catch (err) {
        (err.message).should.startWith('NJS-018:');
      }
    });

    it('12.5.4 closes one resultSet and then open another resultSet', async function() {
      const nRows = Math.ceil(rowsAmount / 10);

      async function fetchRowFromRS(rs) {
        let accessCount = 0;
        while (true) {     // eslint-disable-line
          const rows = await rs.getRows(nRows);
          if (rows.length == 0)
            break;
          accessCount++;
        }
        await rs.close();
        accessCount.should.be.exactly(10);
      }

      let result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      await fetchRowFromRS(result.resultSet);

      result = await conn.execute(
        "SELECT employees_name FROM nodb_rs1_emp",
        [],
        { resultSet: true, fetchArraySize: 100 });
      await fetchRowFromRS(result.resultSet);

    });

  });

  describe('12.6 Testing metaData', function() {

    it('12.6.1 the amount and value of metaData should be correct', async function() {

      /* Helper functions */
      const StringBuffer = function() {
        this.buffer = [];
        this.index = 0;
      };

      StringBuffer.prototype = {
        append: function(s) {
          this.buffer[this.index] = s;
          this.index += 1;
          return this;
        },

        toString: function() {
          return this.buffer.join("");
        }
      };

      const createTab = function(size) {
        const buffer = new StringBuffer();
        buffer.append("CREATE TABLE nodb_tab_manycolumns( ");

        for (let i = 0; i < size - 1; i++) {
          buffer.append("c" + i + " NUMBER, ");
        }
        buffer.append("c" + (size - 1) + " NUMBER");
        buffer.append(" )");

        return buffer.toString();
      };
      /*********************/
      const columnsAmount = 1000;

      const sql = createTab(columnsAmount);
      await conn.execute(sql);
      const result = await conn.execute(
        "SELECT * FROM nodb_tab_manycolumns",
        [],
        { resultSet: true});
      const rs = result.resultSet;
      for (let i = 0; i < columnsAmount; i++) {
        (rs.metaData[i].name).should.be.exactly('C' + i);
      }
      await rs.close();
      await conn.execute("DROP TABLE nodb_tab_manycolumns PURGE");
    });

    it('12.6.2 can distinguish lower case and upper case', async function() {
      const tableName = "nodb_uppercase";
      const createTable =
        " BEGIN " +
        "   DECLARE " +
        "     e_table_missing EXCEPTION; " +
        "     PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); " +
        "   EXCEPTION " +
        "     WHEN e_table_missing " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "       CREATE TABLE " + tableName + " ( " +
        '         "c" NUMBER, ' +
        '         "C" NUMBER ' +
        "       ) " +
        "   '); " +
        " END; ";

      await conn.execute(createTable);
      const result = await conn.execute(
        "SELECT * FROM " + tableName, [], {resultSet: true});
      const rs = result.resultSet;
      (rs.metaData[0].name).should.be.exactly('c');
      (rs.metaData[1].name).should.be.exactly('C');
      await rs.close();
      await conn.execute("DROP TABLE " + tableName + " PURGE");
    });

    it('12.6.3 can contain quotes', async function() {
      const tableName = "nodb_quotes";
      const createTable =
        " BEGIN " +
        "   DECLARE " +
        "     e_table_missing EXCEPTION; " +
        "     PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); " +
        "   EXCEPTION " +
        "     WHEN e_table_missing " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "       CREATE TABLE " + tableName + " ( " +
        '         "c' + "''" + '" NUMBER, ' +
        '         "c" NUMBER ' +
        "       ) " +
        "   '); " +
        " END; ";

      await conn.execute(createTable);
      const result = await conn.execute(
        "SELECT * FROM " + tableName, [], { resultSet: true });
      const rs = result.resultSet;
      (rs.metaData[0].name).should.be.exactly("c'");
      (rs.metaData[1].name).should.be.exactly('c');
      await rs.close();
      await conn.execute("DROP TABLE " + tableName + " PURGE");
    });

    it('12.6.4 can contain underscore', async function() {
      const tableName = "nodb_underscore";
      const createTable =
        " BEGIN " +
        "   DECLARE " +
        "     e_table_missing EXCEPTION; " +
        "     PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " PURGE'); " +
        "   EXCEPTION " +
        "     WHEN e_table_missing " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "     CREATE TABLE " + tableName + " ( " +
        '         "c_" NUMBER, ' +
        '         "c__" NUMBER ' +
        "     ) " +
        "   '); " +
        " END; ";

      await conn.execute(createTable);
      const result = await conn.execute(
        "SELECT * FROM " + tableName, [], { resultSet: true });
      const rs = result.resultSet;
      (rs.metaData[0].name).should.be.exactly("c_");
      (rs.metaData[1].name).should.be.exactly('c__');
      await rs.close();
      await conn.execute("DROP TABLE " + tableName + " PURGE");
    });
  });

  describe('12.7 Testing maxRows', function() {
    it('12.7.1 maxRows option is ignored when resultSet option is true', async function() {
      const rowsLimit = 50;

      const result = await conn.execute(
        "SELECT * FROM nodb_rs1_emp ORDER BY employees_id",
        [],
        { resultSet: true, maxRows: rowsLimit });
      const rs = result.resultSet;
      await rs.getRows();
      await rs.close();
    });

    it('12.7.2 maxRows option is ignored with REF Cursor', async function() {
      let rowCount = 0;
      const queryAmount = 100;
      const proc =
        "CREATE OR REPLACE PROCEDURE get_emp_rs1_proc (p_in IN NUMBER, p_out OUT SYS_REFCURSOR) \
           AS \
           BEGIN \
             OPEN p_out FOR  \
               SELECT * FROM nodb_rs1_emp \
               WHERE employees_id <= p_in; \
           END; ";

      await conn.execute(proc);
      const result = await conn.execute(
        "BEGIN get_emp_rs1_proc(:in, :out); END;",
        {
          in: queryAmount,
          out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        },
        { maxRows: 10 });
      const rs = result.outBinds.out;
      while (true) {     // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
        rowCount++;
      }
      await rs.close();
      rowCount.should.eql(queryAmount);
      await conn.execute("DROP PROCEDURE get_emp_rs1_proc");
    });

  }); // 12.7

});
