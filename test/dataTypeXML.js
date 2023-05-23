/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 *   181. dataTypeXML.js
 *
 * DESCRIPTION
 *   Test XML data type support.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('181. dataTypeXML.js', function() {

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

  before('create table and insert a row', async function() {
    if (oracledb.thin) {
      this.skip();
      return;
    }

    const connection = await oracledb.getConnection(dbConfig);

    let sql =
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

    const conn = await oracledb.getConnection(dbConfig);

    sql = "insert into " + tableName + " ( num, content ) values ( :id, XMLType(:bv) )";
    let bindValues = { id: testRowID, bv: testXMLData };
    let result = await conn.execute(sql, bindValues);
    assert.strictEqual(result.rowsAffected, 1);

    await conn.commit();
    await conn.close();

  }); // before

  after('drop table', async () => {
    const connection = await oracledb.getConnection(dbConfig);
    let sql = "BEGIN EXECUTE IMMEDIATE 'DROP TABLE " + tableName + "'; " +
              "EXCEPTION WHEN OTHERS THEN IF SQLCODE <> -942 THEN RAISE; END IF; END;";
    await connection.execute(sql);
    await connection.commit();
    await connection.close();
  }); // after

  it('181.1 basic case, insert XML data and query back', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    let sql = "select content from " + tableName + " where num = :id";
    let bindVar = { id: testRowID };
    let options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    let result = await conn.execute(sql, bindVar, options);
    assert.strictEqual(result.rows[0].CONTENT, testXMLData);
    await conn.close();
  }); // 181.1

  it('181.2 query XML data as CLOB', async () => {
    const conn = await oracledb.getConnection(dbConfig);

    let sql = "select xmltype.getclobval(content) as mycontent from " + tableName + " where num = :id";
    let bindVar = { id: testRowID };
    let options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo: { "MYCONTENT": { type: oracledb.STRING } }
    };
    let result = await conn.execute(sql, bindVar, options);
    assert.strictEqual(result.rows[0].MYCONTENT, testXMLData);

    await conn.close();
  }); // 181.2

  it('181.3 another query as CLOB syntax', async function() {
    const conn = await oracledb.getConnection(dbConfig);
    if (conn.oracleServerVersion < 1200000000) {
      await conn.close();
      this.skip();
    }

    let sql = "select extract(content, '/').getclobval() as mycontent " +
              "from " + tableName + " where num = :id";
    let bindVar = { id: testRowID };
    let options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo: { "MYCONTENT": { type: oracledb.STRING } }
    };
    let result = await conn.execute(sql, bindVar, options);
    assert.strictEqual(result.rows[0].MYCONTENT, testXMLData);
    await conn.close();
  }); // 181.3

  it('181.4 Negative - try to insert Null', async () => {
    let ID = 20;
    let XML = '';
    const conn = await oracledb.getConnection(dbConfig);

    let sql = "insert into " + tableName + " ( num, content ) values ( :id, XMLType(:bv) )";
    let bindValues = { id: ID, bv: XML };

    if (conn.oracleServerVersion < 1200000000) {
      await assert.rejects(
        async () => await conn.execute(sql, bindValues),
        /ORA-19032:/
      );
      // ORA-19032: Expected XML tag , got no content
    } else {
      await assert.rejects(
        async () => await conn.execute(sql, bindValues),
        /ORA-01400:/
      );
      // ORA-01400: cannot insert NULL into...
    }

    await conn.commit();
    await conn.close();
  }); // 181.4

  // ORA-19011: Character string buffer too small
  it.skip('181.5 inserts data that larger than 4K', async () => {

    let ID = 50;
    let str = 'a'.repeat(31 * 1024);
    let head = '<data>', tail = '</data>\n';
    let xml = head.concat(str).concat(tail);

    const conn = await oracledb.getConnection(dbConfig);

    let sql = "insert into " + tableName + " ( num, content ) values ( :id, XMLType(:bv) )";
    let bindValues = { id: ID, bv: xml };
    let result = await conn.execute(sql, bindValues);
    assert.strictEqual(result.rowsAffected, 1);

    sql = "select content from " + tableName + " where num = :id";
    let bindVar = { id: ID };
    let options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
    result = await conn.execute(sql, bindVar, options);
    assert.strictEqual(result.rows[0].CONTENT, xml);
    await conn.commit();
    await conn.close();
  }); // 181.5

});
