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
 *   3. examples.js
 *
 * DESCRIPTION
 *   Test the example programs in examples/ directory.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbConfig = require('./dbconfig.js');

describe('3. examples.js', function() {

  describe('3.1 connect.js', function() {
    it('3.1.1 tests a basic connection to the database', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.close();
    });
  }); // 3.1

  describe('3.2 version.js', function() {
    it('3.2.1 shows the node-oracledb version attributes', async function() {

      const addonVer = oracledb.version;
      (addonVer).should.be.a.Number();
      (addonVer).should.be.greaterThan(0);

      const clientVer = oracledb.oracleClientVersion;
      (clientVer).should.be.a.Number();
      (clientVer).should.be.greaterThan(0);

      const conn = await oracledb.getConnection(dbConfig);
      const serverVer = conn.oracleServerVersion;
      (serverVer).should.be.a.Number();
      await conn.close();

    });
  });

  describe('3.3 select1.js & select2.js', function() {
    let conn = null;

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      if (conn) {
        await conn.close();
      }
    });

    it('3.3.1. execute a basic query', async function() {
      const script1 =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_dept PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_eg_dept ( \
                    department_id NUMBER,  \
                    department_name VARCHAR2(20) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_dept  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_dept  \
                   (department_id, department_name) VALUES \
                   (180, ''Construction'') \
            '); \
        END; ";

      await conn.execute(script1);
      const result = await conn.execute(
        "SELECT department_id, department_name "
        + "FROM nodb_eg_dept "
        + "WHERE department_id = :did",
        [180]);
      (result.rows).should.eql([[ 180, 'Construction' ]]);

    });

    it('3.3.2. execute queries to show array and object formats', async function() {
      const script2 =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_locations PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_locations ( \
                    location_id NUMBER,  \
                    city VARCHAR2(20) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_locations  \
                   (location_id, city) VALUES \
                   (9999,''Shenzhen'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_locations  \
                   (location_id, city) VALUES \
                   (2300, ''Singapore'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_locations  \
                   (location_id, city) VALUES \
                   (1500, ''South San Francisco'') \
            '); \
        END; ";

      await conn.execute(script2);
      let result = await conn.execute(
        "SELECT location_id, city "
        + "FROM nodb_locations "
        + "WHERE city LIKE 'S%' "
        + "ORDER BY city");
      (result.rows).should.containEql([2300, 'Singapore']);
      result = await conn.execute(
        "SELECT location_id, city "
        + "FROM nodb_locations "
        + "WHERE city LIKE 'S%' "
        + "ORDER BY city",
        {},
        // A bind variable parameter is needed to disambiguate the following options parameter
        // otherwise you will get Error: ORA-01036: illegal variable name/number
        {outFormat: oracledb.OUT_FORMAT_OBJECT});
      // outFormat can be OUT_FORMAT_OBJECT and OUT_FORMAT_ARRAY.  The
      // default is OUT_FORMAT_ARRAY Cities beginning with 'S'
      // (OUT_FORMAT_OBJECT output format)
      // console.log(result);
      (result.rows).should.containEql({ LOCATION_ID: 1500, CITY: 'South San Francisco' });
    });

  });

  /* Oracle Database 12.1.0.2 has extensive JSON datatype support */
  describe('3.4 selectjson.js - 12.1.0.2 feature', function() {

    let conn = null;
    const testData = { "userId": 1, "userName": "Chris", "location": "Australia" };
    let featureAvailable = true;

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      if (conn.oracleServerVersion < 1201000200) {
        featureAvailable = false;
        return;
      }
      let sql = "BEGIN \n" +
                "   DECLARE \n" +
                "       e_table_missing EXCEPTION; \n" +
                "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                "   BEGIN \n" +
                "       EXECUTE IMMEDIATE ('DROP TABLE nodb_purchaseorder PURGE'); \n" +
                "   EXCEPTION \n" +
                "       WHEN e_table_missing \n" +
                "       THEN NULL; \n" +
                "   END; \n" +
                "   EXECUTE IMMEDIATE (' \n" +
                "       CREATE TABLE nodb_purchaseorder ( \n" +
                "           po_document VARCHAR2(4000) CONSTRAINT ensure_json CHECK (po_document IS JSON) \n" +
                "       ) \n" +
                "   '); \n" +
                "END; ";
      await conn.execute(sql);
      const s = JSON.stringify(testData);
      sql = "INSERT INTO nodb_purchaseorder (po_document) VALUES (:bv)";
      const result = await conn.execute(sql, [s]);
      should.strictEqual(result.rowsAffected, 1);
    }); // before

    after(async function() {
      if (conn) {
        if (featureAvailable) {
          await conn.execute("DROP TABLE nodb_purchaseorder PURGE");
        }
        await conn.close();
      }
    }); // after

    it('3.4.1 Selecting JSON stored in a VARCHAR2 column', async function() {
      if (!featureAvailable) {
        return;
      }
      const sql = "SELECT po_document FROM nodb_purchaseorder WHERE JSON_EXISTS (po_document, '$.location')";
      const result = await conn.execute(sql);
      const js = JSON.parse(result.rows[0][0]);  // just show first record
      //console.log('Query results: ', js);
      should.deepEqual(js, testData);
    });

    it('3.4.2 Using JSON_VALUE to extract a value from a JSON column', async function() {

      if (!featureAvailable) {
        return;
      }
      const sql = "SELECT JSON_VALUE(po_document, '$.location') FROM nodb_purchaseorder";
      const result = await conn.execute(sql);
      //console.log('Query results: ', result.rows[0][0]);
      should.strictEqual(result.rows[0][0], "Australia");
    });

    it('3.4.3 Using JSON_OBJECT to extract relational data as JSON', async function() {
      // JSON_OBJECT is new in Oracle Database 12.2
      if (conn.oracleServerVersion < 1202000000) {
        return;
      }
      const sql = "SELECT JSON_OBJECT ('doc' IS d.po_document) department \n" +
                  "FROM nodb_purchaseorder d";
      const result = await conn.execute(sql);
      //console.log(result.rows[0][0]);
      const js = JSON.parse(result.rows[0][0]);
      should.deepEqual(js.doc, testData);
    });

  });

  describe('3.5 date.js', function() {

    it('3.5.1 inserts and query DATE and TIMESTAMP columns', async function() {

      const conn = await oracledb.getConnection(dbConfig);

      let sql = "BEGIN \n" +
                "   DECLARE \n" +
                "       e_table_missing EXCEPTION; \n" +
                "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                "   BEGIN \n" +
                "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_testdate PURGE'); \n" +
                "   EXCEPTION \n" +
                "       WHEN e_table_missing \n" +
                "       THEN NULL; \n" +
                "   END; \n" +
                "   EXECUTE IMMEDIATE (' \n" +
                "       CREATE TABLE nodb_eg_testdate ( \n" +
                "           timestampcol TIMESTAMP, \n" +
                "           datecol DATE \n" +
                "       ) \n" +
                "   '); \n" +
                "END; \n";
      await conn.execute(sql);

      const date = new Date();

      sql = "INSERT INTO nodb_eg_testdate (timestampcol, datecol) VALUES (:ts, :td)";
      const result = await conn.execute(sql, { ts: date, td: date });
      should.strictEqual(result.rowsAffected, 1);

      const doselect = async function() {
        const sql = "SELECT timestampcol, datecol FROM nodb_eg_testdate";
        const result = await conn.execute(sql);
        const ts = result.rows[0][0];
        ts.setDate(ts.getDate() + 5);
        const d = result.rows[0][1];
        d.setDate(d.getDate() - 5);
      };

      await doselect();

      await conn.execute("ALTER SESSION SET TIME_ZONE='UTC'");

      await doselect();

      await conn.execute("DROP TABLE nodb_eg_testdate PURGE");
      await conn.close();

    });

  });

  describe('3.6 rowlimit.js', function() {

    it("3.6.1 shows ways to limit the number of records fetched by queries", async function() {

      const conn = await oracledb.getConnection(dbConfig);
      if (conn.oracleServerVersion < 1202000100) {
        await conn.close();
        return;
      }

      let sql = "BEGIN \n" +
                "   DECLARE \n" +
                "       e_table_missing EXCEPTION; \n" +
                "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                "   BEGIN \n" +
                "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_emp6 PURGE'); \n" +
                "   EXCEPTION \n" +
                "       WHEN e_table_missing \n" +
                "       THEN NULL; \n" +
                "   END; \n" +
                "   EXECUTE IMMEDIATE (' \n" +
                "       CREATE TABLE nodb_eg_emp6 ( \n" +
                "           id NUMBER, \n" +
                "           name VARCHAR2(20) \n" +
                "       ) \n" +
                "   '); \n" +
                "END; \n";
      await conn.execute(sql);

      sql = "DECLARE \n" +
            "    x NUMBER := 0; \n" +
            "    n VARCHAR2(20); \n" +
            "BEGIN \n" +
            "    FOR i IN 1..107 LOOP \n" +
            "        x := x +1; \n" +
            "        n := 'staff ' || x; \n" +
            "        INSERT INTO nodb_eg_emp6 VALUES (x, n); \n" +
            "    END LOOP; \n" +
            "END; ";
      await conn.execute(sql);

      const myoffset     = 2;  // number of rows to skip
      const mymaxnumrows = 6;  // number of rows to fetch

      sql = "SELECT id, name FROM nodb_eg_emp6 ORDER BY id " +
            " OFFSET :offset ROWS FETCH NEXT :maxnumrows ROWS ONLY";
      const binds = { offset: myoffset, maxnumrows: mymaxnumrows };
      const options = { maxRows: 25 };
      const result = await conn.execute(sql, binds, options);
      should.strictEqual(result.rows.length, 6);
      should.deepEqual(
        result.rows,
        [ [ 3, 'staff 3' ],
          [ 4, 'staff 4' ],
          [ 5, 'staff 5' ],
          [ 6, 'staff 6' ],
          [ 7, 'staff 7' ],
          [ 8, 'staff 8' ] ]
      );

      await conn.execute("DROP TABLE nodb_eg_emp6 PURGE");

      await conn.close();

    }); // 3.6.1
  }); // 3.6

  describe('3.7 plsqlproc.js and plsqlfun.js', function() {

    let conn = null;

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      if (conn) {
        await conn.release();
      }
    });

    it('3.7.1 calling PL/SQL procedure and binding parameters in various ways', async function() {

      const proc = "CREATE OR REPLACE PROCEDURE nodb_eg_proc7 (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER) \n" +
                 "    AS \n" +
                 "    BEGIN \n" +
                 "        p_inout := p_in || p_inout; \n" +
                 "        p_out := 101; \n" +
                 "    END; ";
      const bindVars = {
        i:  'Chris',  // bind type is determined from the data type
        io: { val: 'Jones', dir : oracledb.BIND_INOUT },
        o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
      };

      await conn.execute(proc);
      const result = await conn.execute(
        "BEGIN nodb_eg_proc7(:i, :io, :o); END;", bindVars);
      (result.outBinds.o).should.be.exactly(101);
      (result.outBinds.io).should.equal('ChrisJones');
      await conn.execute("DROP PROCEDURE nodb_eg_proc7");

    });

    it('3.7.2 calling PL/SQL function', async function() {

      const proc = "CREATE OR REPLACE FUNCTION nodb_eg_func7 (p1_in IN VARCHAR2, p2_in IN VARCHAR2) RETURN VARCHAR2 \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "   return p1_in || p2_in; \n" +
                 "END; ";
      const bindVars = {
        p1: 'Chris',
        p2: 'Jones',
        ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 40 }
      };

      await conn.execute(proc);
      const result = await conn.execute(
        "BEGIN :ret := nodb_eg_func7(:p1, :p2); END;", bindVars);
      (result.outBinds.ret).should.equal('ChrisJones');
      await conn.execute("DROP FUNCTION nodb_eg_func7");

    });

  });

  describe('3.8 insert1.js', function() {
    const script =
      "BEGIN " +
      "   DECLARE " +
      "       e_table_missing EXCEPTION; " +
      "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
      "   BEGIN " +
      "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_insert8 PURGE'); " +
      "   EXCEPTION " +
      "       WHEN e_table_missing " +
      "       THEN NULL; " +
      "   END; " +
      "   EXECUTE IMMEDIATE (' " +
      "       CREATE TABLE nodb_eg_insert8 ( " +
      "           id NUMBER,  " +
      "           name VARCHAR2(20) " +
      "       )" +
      "   '); " +
      "END; ";

    it('3.8.1 creates a table and inserts data', async function() {
      const conn = await oracledb.getConnection(dbConfig);
      await conn.execute(script);
      let result = await conn.execute(
        "INSERT INTO nodb_eg_insert8 VALUES (:id, :nm)", [1, 'Chris']);
      (result.rowsAffected).should.be.exactly(1);
      result = await conn.execute(
        "INSERT INTO nodb_eg_insert8 VALUES (:id, :nm)", [2, 'Alison']);
      (result.rowsAffected).should.be.exactly(1);
      result = await conn.execute("UPDATE nodb_eg_insert8 SET name = 'Bambi'");
      (result.rowsAffected).should.be.exactly(2);
      await conn.execute("DROP TABLE nodb_eg_insert8 PURGE");
      await conn.close();
    });
  });

  describe('3.9 insert2.js', function() {
    let conn1 = null;
    let conn2 = null;
    const script =
      "BEGIN " +
      "   DECLARE " +
      "       e_table_missing EXCEPTION; " +
      "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); " +
      "   BEGIN " +
      "       EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_commit9 PURGE'); " +
      "   EXCEPTION " +
      "       WHEN e_table_missing " +
      "       THEN NULL; " +
      "   END; " +
      "   EXECUTE IMMEDIATE (' " +
      "       CREATE TABLE nodb_eg_commit9 ( " +
      "           id NUMBER,  " +
      "           name VARCHAR2(20) " +
      "       )" +
      "   '); " +
      "END; ";

    before(async function() {
      conn1 = await oracledb.getConnection(dbConfig);
      conn2 = await oracledb.getConnection(dbConfig);
    });

    after(async function() {
      if (conn1) {
        await conn1.close();
      }
      if (conn2) {
        await conn2.close();
      }
    });

    it('3.9.1 tests the auto commit behavior', async function() {
      await conn1.execute(script);
      let result = await conn1.execute(
        "INSERT INTO nodb_eg_commit9 VALUES (:id, :nm)",
        [1, 'Chris'], { autoCommit: true });
      (result.rowsAffected).should.be.exactly(1);
      result = await conn1.execute(
        "INSERT INTO nodb_eg_commit9 VALUES (:id, :nm)", [2, 'Alison']);
      (result.rowsAffected).should.be.exactly(1);
      result = await conn2.execute(
        "SELECT * FROM nodb_eg_commit9  ORDER BY id");
      // This will only show 'Chris' because inserting 'Alison' is not commited by default.
      // Uncomment the autoCommit option above and you will see both rows
      // console.log(result.rows);
      (result.rows).should.eql([ [ 1, 'Chris' ] ]);
      await conn1.execute("DROP TABLE nodb_eg_commit9 PURGE");
    });

  });

  describe('3.10 resultset.js', function() {
    let conn = null;

    const createTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_emp10 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_eg_emp10 ( \
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
          FOR i IN 1..207 LOOP \
             x := x + 1; \
             n := 'staff ' || x; \
             INSERT INTO nodb_eg_emp10 VALUES (x, n); \
          END LOOP; \
       END; ";

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(createTable);
      await conn.execute(insertRows);
    });

    after(async function() {
      if (conn) {
        await conn.execute('DROP TABLE nodb_eg_emp10 PURGE');
        await conn.close();
      }
    });

    it('3.10.1 resultset1.js - getRow() function', async function() {
      const result = await conn.execute(
        "SELECT employees_name FROM nodb_eg_emp10",
        [],
        { resultSet: true, fetchArraySize: 50 });
      const rs = result.resultSet;
      (rs.metaData[0]).name.should.eql('EMPLOYEES_NAME');
      let rowCount = 1;
      while (true) {    // eslint-disable-line
        const row = await rs.getRow();
        if (!row)
          break;
        row[0].should.be.exactly('staff ' + rowCount);
        rowCount++;
      }
      await rs.close();
    });

    it('3.10.2 resultset2.js - getRows() function', async function() {
      const numRows = 10;  // number of rows to return from each call to getRows()
      const result = await conn.execute(
        "SELECT * FROM nodb_eg_emp10 ORDER BY employees_id",
        [],
        { resultSet: true, fetchArraySize: 110 });
      (result.resultSet.metaData[0]).name.should.eql('EMPLOYEES_ID');
      (result.resultSet.metaData[1]).name.should.eql('EMPLOYEES_NAME');
      const rs = result.resultSet;
      while (true) {     // eslint-disable-line
        const rows = await rs.getRows(numRows);
        if (rows.length == 0)
          break;
      }
      await rs.close();
    });

  });

  describe('3.11 refcursor.js', function() {
    let conn = null;
    const script =
        "BEGIN \
            DECLARE \
                e_table_missing EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE nodb_eg_emp11 PURGE'); \
            EXCEPTION \
                WHEN e_table_missing \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE nodb_eg_emp11 ( \
                    name VARCHAR2(40),  \
                    salary NUMBER, \
                    hire_date DATE \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Steven'',24000, TO_DATE(''20030617'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Neena'',17000, TO_DATE(''20050921'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Lex'',17000, TO_DATE(''20010112'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Nancy'',12008, TO_DATE(''20020817'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Karen'',14000, TO_DATE(''20050104'', ''yyyymmdd'')) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO nodb_eg_emp11  \
                   (name, salary, hire_date) VALUES \
                   (''Peter'',9000, TO_DATE(''20100525'', ''yyyymmdd'')) \
            '); \
        END; ";

    const proc =
        "CREATE OR REPLACE PROCEDURE get_emp_rs11 (p_sal IN NUMBER, p_recordset OUT SYS_REFCURSOR) \
           AS \
           BEGIN \
             OPEN p_recordset FOR  \
               SELECT * FROM nodb_eg_emp11\
               WHERE salary > p_sal; \
           END; ";

    before(async function() {
      conn = await oracledb.getConnection(dbConfig);
      await conn.execute(script);
      await conn.execute(proc);
    });

    after(async function() {
      if (conn) {
        await conn.execute("DROP PROCEDURE get_emp_rs11");
        await conn.execute('DROP TABLE nodb_eg_emp11 PURGE');
        await conn.close();
      }
    }); // after

    it('3.11.1 REF CURSOR', async function() {
      const numRows = 100;  // number of rows to return from each call to getRows()
      const binds = {
        sal: 12000,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
      };
      const result = await conn.execute(
        "BEGIN get_emp_rs11(:sal, :cursor); END;", binds);
      const rs = result.outBinds.cursor;
      rs.metaData[0].name.should.eql('NAME');
      rs.metaData[1].name.should.eql('SALARY');
      rs.metaData[2].name.should.eql('HIRE_DATE');
      const rows = await rs.getRows(numRows);
      rows.length.should.be.exactly(5);
      await rs.close();
    });
  });

});
