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
 *   60. clobPlsqlString.js
 *
 * DESCRIPTION
 *
 *   PL/SQL OUT CLOB parameters can also be bound as `STRING`
 *   The returned length is limited to the maximum size of maxSize option.
 *
 *   When the types of bind out variables are not STRING or BUFFER,
 *   maxSize option will not take effect.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const stream   = require('stream');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('60. clobPlsqlString.js', function() {

  let connection = null;
  const tableName = `nodb_myclobs`;

  before('get one connection, prepare table', async function() {

    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(assist.sqlCreateTable(tableName));
  }); // before

  after('release connection', async  function() {

    await connection.execute(`DROP TABLE nodb_myclobs purge`);
    await connection.close();
  }); // after

  describe('60.1 BIND OUT as STRING', function() {
    before('insert data', async function() {
      await  connection.execute(`INSERT INTO nodb_myclobs (num, content) VALUES (1, 'abcdefghijklmnopqrstuvwxyz')`);
    }); // before

    it('60.1.1 PL/SQL OUT CLOB parameters can also be bound as STRING',  async function() {
      const result =  await connection.execute(`BEGIN SELECT content INTO :cbv FROM nodb_myclobs WHERE num = :id; END;`,
        {
          id: 1,
          cbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT}
        });
      assert.strictEqual(typeof result.outBinds.cbv, "string");
      assert.strictEqual(result.outBinds.cbv, 'abcdefghijklmnopqrstuvwxyz');
    }); // 60.1.1

    it('60.1.2 The returned length is limited to the maximum size', async function() {
      await assert.rejects(
        async () => {
          await connection.execute(`BEGIN SELECT content INTO :cbv FROM nodb_myclobs WHERE num = :id; END;`,
            {
              id: 1,
              cbv: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 5 }});
        },
        /ORA-06502:/ // PL/SQL: numeric or value error
      );
    }); // 60.1.2
  }); // 60.1

  describe('60.2 BIND OUT as CLOB', function() {
    const dataLength = 1000000;
    const rawData = assist.createCharString(dataLength);

    it('60.2.1 maxSize option does not take effect when bind out type is clob', async function() {

      let result = await connection.execute(
        `INSERT INTO ` + tableName + ` VALUES (2, EMPTY_CLOB()) RETURNING content INTO :lobbv`,
        { lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
        { autoCommit: false });

      const lob = result.outBinds.lobbv[0];

      await new Promise((resolve, reject) => {

        lob.on("error", reject);

        const inStream = new stream.Readable();
        inStream._read = function noop() {};
        inStream.push(rawData);
        inStream.push(null);

        inStream.on('error', reject);

        inStream.on('end', resolve);

        inStream.pipe(lob);
      });
      await connection.commit();

      result = await connection.execute(
        "BEGIN SELECT content INTO :bv FROM " + tableName + " WHERE num = 2; END;",
        { bv: {dir: oracledb.BIND_OUT, type: oracledb.CLOB} },
        { maxRows: 500 }
      );

      const content = await result.outBinds.bv.getData();
      assert.strictEqual(content.length, dataLength);
      assert.strictEqual(content, rawData);
    }); // 60.2
  });
});
