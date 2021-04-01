/* Copyright (c) 2018, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   181. dataTypeXML.js
 *
 * DESCRIPTION
 *   Test XML data type support.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('181. dataTypeXML.js', () => {

  const tableName = "nodb_tab_xml";
  const testRowID = 1;
  const testXMLData =
    '<Warehouse>\n  ' +
    '<WarehouseId>1</WarehouseId>\n  ' +
    '<WarehouseName>Melbourne, Australia</WarehouseName>\n  ' +
    '<Building>Owned</Building>\n  ' +
    '<Area>2020</Area>\n  ' +
    '<Docks>1</Docks>\n  ' +
    '<DockType>Rear load</DockType>\n  ' +
    '<WaterAccess>false</WaterAccess>\n  ' +
    '<RailAccess>N</RailAccess>\n  ' +
    '<Parking>Garage</Parking>\n  ' +
    '<VClearance>20</VClearance>\n' +
    '</Warehouse>\n';

  before('create table and insert a row', async () => {

    try {
      const connection = await oracledb.getConnection(dbconfig);

      const sql =
        "BEGIN \n" +
        "    DECLARE \n" +
        "        e_table_missing EXCEPTION; \n" +
        "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
        "    BEGIN \n" +
        "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
        "    EXCEPTION \n" +
        "        WHEN e_table_missing \n" +
        "        THEN NULL; \n" +
        "    END; \n" +
        "    EXECUTE IMMEDIATE (' \n" +
        "        CREATE TABLE " + tableName + " ( \n" +
        "            num        number(9) not null, \n" +
        "            content    xmltype not null \n" +
        "        ) \n" +
        "    '); \n" +
        "END; ";
      await connection.execute(sql);
      await connection.commit();
      await connection.close();
    } catch (err) {
      should.not.exist(err);
    }

    try {
      const conn = await oracledb.getConnection(dbconfig);

      let sql = "insert into " + tableName + " ( num, content ) values ( :id, XMLType(:bv) )";
      let bindValues = { id: testRowID, bv: testXMLData };
      let result = await conn.execute(sql, bindValues);
      should.strictEqual(result.rowsAffected, 1);

      await conn.commit();
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }

  }); // before

  after('drop table', async () => {
    try {
      const connection = await oracledb.getConnection(dbconfig);
      let sql = "BEGIN EXECUTE IMMEDIATE 'DROP TABLE " + tableName + "'; " +
                "EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END;";
      await connection.execute(sql);
      await connection.commit();
      await connection.close();
    } catch (err) {
      should.not.exist(err);
    }
  }); // after

  it('181.1 basic case, insert XML data and query back', async () => {

    try {
      const conn = await oracledb.getConnection(dbconfig);

      let sql = "select content from " + tableName + " where num = :id";
      let bindVar = { id: testRowID };
      let options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      let result = await conn.execute(sql, bindVar, options);
      should.strictEqual(result.rows[0].CONTENT, testXMLData);
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }
  }); // 181.1

  it('181.2 query XML data as CLOB', async () => {

    try {
      const conn = await oracledb.getConnection(dbconfig);

      let sql = "select xmltype.getclobval(content) as mycontent from " + tableName + " where num = :id";
      let bindVar = { id: testRowID };
      let options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { "MYCONTENT": { type: oracledb.STRING } }
      };
      let result = await conn.execute(sql, bindVar, options);
      should.strictEqual(result.rows[0].MYCONTENT, testXMLData);

      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }

  }); // 181.2

  it('181.3 another query as CLOB syntax', async () => {

    try {
      const conn = await oracledb.getConnection(dbconfig);

      let sql = "select extract(content, '/').getclobval() as mycontent " +
                "from " + tableName + " where num = :id";
      let bindVar = { id: testRowID };
      let options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: { "MYCONTENT": { type: oracledb.STRING } }
      };
      let result = await conn.execute(sql, bindVar, options);
      should.strictEqual(result.rows[0].MYCONTENT, testXMLData);
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }

  }); // 181.3

  it('181.4 Negative - try to insert Null', async () => {
    let ID = 20;
    let XML = '';
    try {
      const conn = await oracledb.getConnection(dbconfig);

      let sql = "insert into " + tableName + " ( num, content ) values ( :id, XMLType(:bv) )";
      let bindValues = { id: ID, bv: XML };
      await testsUtil.assertThrowsAsync(
        async () => await conn.execute(sql, bindValues),
        /ORA-01400:/
      );
      // ORA-01400: cannot insert NULL into...

      await conn.commit();
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }

  }); // 181.4

  // ORA-19011: Character string buffer too small
  it.skip('181.5 inserts data that larger than 4K', async () => {

    let ID = 50;
    let str = 'a'.repeat(31 * 1024);
    let head = '<data>', tail = '</data>\n';
    let xml = head.concat(str).concat(tail);

    try {
      const conn = await oracledb.getConnection(dbconfig);

      let sql = "insert into " + tableName + " ( num, content ) values ( :id, XMLType(:bv) )";
      let bindValues = { id: ID, bv: xml };
      let result = await conn.execute(sql, bindValues);
      should.strictEqual(result.rowsAffected, 1);

      sql = "select content from " + tableName + " where num = :id";
      let bindVar = { id: ID };
      let options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      result = await conn.execute(sql, bindVar, options);
      should.strictEqual(result.rows[0].CONTENT, xml);
      await conn.commit();
      await conn.close();

    } catch (err) {
      should.not.exist(err);
    }
  }); // 181.5

});
