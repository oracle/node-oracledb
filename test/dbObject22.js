/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   327. dbObject22.js
 *
 * DESCRIPTION
 *   Test fetching DbObjects with attribute counts either side of 100.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('327. dbObject22.js', function() {
  let connection;
  const objectTypes = [
    { attributeCount: 99, typeName: 'NODB_OBJ_99_ATTRS', tableName: 'NODB_TAB_99_ATTRS' },
    { attributeCount: 101, typeName: 'NODB_OBJ_101_ATTRS', tableName: 'NODB_TAB_101_ATTRS' },
  ];

  function getAttributeList(attributeCount) {
    return Array.from(
      { length: attributeCount },
      (_, index) => `A${index + 1} NUMBER`,
    ).join(', ');
  }

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    for (const { attributeCount, typeName, tableName } of objectTypes) {
      await testsUtil.createType(
        connection,
        typeName,
        `CREATE OR REPLACE TYPE ${typeName} AS OBJECT (${getAttributeList(attributeCount)})`,
      );
      await testsUtil.createTable(
        connection,
        tableName,
        `CREATE TABLE ${tableName} (id NUMBER, value ${typeName})`,
      );
    }
  });

  after(async function() {
    for (const { typeName, tableName } of objectTypes) {
      await testsUtil.dropTable(connection, tableName);
      await testsUtil.dropType(connection, typeName);
    }
    await connection.close();
  });

  for (const [ index, { attributeCount, typeName, tableName } ] of objectTypes.entries()) {
    it(`327.1.${index + 1} fetches a DbObject with ${attributeCount} attributes`, async function() {
      const objectClass = await connection.getDbObjectClass(typeName);
      const attributes = Object.keys(objectClass.prototype.attributes);
      const lastAttribute = `A${attributeCount}`;

      assert.strictEqual(attributes.length, attributeCount);
      assert.strictEqual(attributes[attributeCount - 1], lastAttribute);

      for (let id = 1; id <= 3; id++) {
        const value = new objectClass({ A1: id, [lastAttribute]: id * 10 });
        await connection.execute(
          `INSERT INTO ${tableName} (id, value) VALUES (:id, :value)`,
          { id, value },
        );
      }

      const result = await connection.execute(
        `SELECT value FROM ${tableName} ORDER BY id`,
        [],
        { fetchArraySize: 2 },
      );
      assert.strictEqual(result.rows.length, 3);
      for (let index = 0; index < result.rows.length; index++) {
        assert.strictEqual(result.rows[index][0].A1, index + 1);
        assert.strictEqual(result.rows[index][0][lastAttribute], (index + 1) * 10);
      }
    });
  }

  it('327.1.3 rejects a DbObject with a different DbObject type', async function() {
    // This test requires Oracle Database 21c or later in Thin Mode
    if (oracledb.thin && connection.oracleServerVersion < 2100000000)
      this.skip();

    const smallType = objectTypes[0];
    const largeType = objectTypes[1];
    const smallClass = await connection.getDbObjectClass(smallType.typeName);
    const largeClass = await connection.getDbObjectClass(largeType.typeName);

    await assert.rejects(
      async () =>
        await connection.execute(
          `DECLARE value ${smallType.typeName}; BEGIN value := :value; END;`,
          { value: { type: smallClass, val: new largeClass({ A1: 1 }) } },
        ),
      /(ORA-03101|DPI-1056):/,
    );
  });

  it('327.1.4 rejects a non-existent DbObject type', async function() {
    await assert.rejects(
      connection.getDbObjectClass('NODB_NO_SUCH_OBJECT_TYPE'),
      /NJS-129:/,
    );
  });
});
