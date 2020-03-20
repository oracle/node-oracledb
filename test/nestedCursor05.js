/* Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved. */

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
 * NAME
 *   236. nestedCursor05.js
 *
 * DESCRIPTION
 *   Multi-level nested cursors.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('236. nestedCursor05.js', () => {

  let conn;
  const childrenTab    = 'nodb_tab_children';
  const parentTab      = 'nodb_tab_parent';
  const grandParentTab = 'nodb_tab_grandparent';

  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);

      let sql =
        `create table ${childrenTab} (
           id number,
           parentID number,
           description varchar2(200)
        )`;
      let plsql = testsUtil.sqlCreateTable(childrenTab, sql);
      await conn.execute(plsql);

      sql =
        `create table ${parentTab} (
           id number,
           parentID number,
           description varchar2(200)
        )`;
      plsql = testsUtil.sqlCreateTable(parentTab, sql);
      await conn.execute(plsql);

      sql =
        `create table ${grandParentTab} (
           id number,
           description varchar2(200)
        )`;
      plsql = testsUtil.sqlCreateTable(grandParentTab, sql);
      await conn.execute(plsql);

      const binds1 = [
        [101, 201, "Child 101"],
        [102, 201, "Child 102"],
        [103, 201, "Child 103"],
        [104, 202, "Child 104"],
        [105, 202, "Child 105"],
        [106, 203, "Child 106"],
      ];
      const opt1 = {
        autoCommit: true,
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.NUMBER },
          { type: oracledb.STRING, maxSize: 20 },
        ]
      };
      const sql1 = `INSERT INTO ${childrenTab} VALUES (:1, :2, :3)`;
      const result1 = await conn.executeMany(sql1, binds1, opt1);
      should.strictEqual(result1.rowsAffected, binds1.length);

      const binds2 = [
        [201, 301, "Parent 201" ],
        [202, 301, "Parent 202" ],
        [203, 302, "Parent 203" ]
      ];
      const opt2 = {
        autoCommit: true,
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.NUMBER },
          { type: oracledb.STRING, maxSize: 20 }
        ]
      };
      const sql2 = `INSERT INTO ${parentTab} VALUES (:1, :2, :3)`;
      const result2 = await conn.executeMany(sql2, binds2, opt2);
      should.strictEqual(result2.rowsAffected, binds2.length);

      const binds3 = [
        [301, "Grandparent 301"],
        [302, "Grandparent 302"]
      ];
      const opt3 = {
        autoCommit: true,
        bindDefs: [
          { type: oracledb.NUMBER },
          { type: oracledb.STRING, maxSize: 20 }
        ]
      };
      const sql3 = `INSERT INTO ${grandParentTab} VALUES (:1, :2)`;
      const result3 = await conn.executeMany(sql3, binds3, opt3);
      should.strictEqual(result3.rowsAffected, binds3.length);

    } catch (err) {
      should.not.exist(err);
    }
  }); // before()

  after(async () => {
    try {
      let sql = `drop table ${childrenTab} purge`;
      await conn.execute(sql);

      sql = `drop table ${parentTab} purge`;
      await conn.execute(sql);

      sql = `drop table ${grandParentTab} purge`;
      await conn.execute(sql);

      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  }); // after()

  const sqlOne =`
        select g.description,
        cursor(select p.description,
               cursor(select c.description
                      from ${childrenTab} c
                      where c.parentID = p.id
               ) as grandchildren
               from ${parentTab} p
               where p.parentID = g.id
        ) as children
        from ${grandParentTab} g
      `;
  it('236.1 multi-level nested cursors', async () => {
    try {

      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await conn.execute(sqlOne, [], options);

      should.strictEqual(result.metaData[0].name, 'DESCRIPTION');
      should.strictEqual(result.metaData[1].name, 'CHILDREN');

      should.strictEqual(result.metaData[1].metaData[0].name, 'DESCRIPTION');
      should.strictEqual(result.metaData[1].metaData[1].name, 'GRANDCHILDREN');
      should.strictEqual(result.metaData[1].metaData[1].metaData[0].name, 'DESCRIPTION');

      should.strictEqual(result.rows[0].DESCRIPTION, 'Grandparent 301');
      should.strictEqual(result.rows[1].DESCRIPTION, 'Grandparent 302');

      should.strictEqual(result.rows[0].CHILDREN[0].DESCRIPTION, 'Parent 201');
      should.strictEqual(result.rows[0].CHILDREN[1].DESCRIPTION, 'Parent 202');
      should.strictEqual(result.rows[1].CHILDREN[0].DESCRIPTION, 'Parent 203');

      should.strictEqual(result.rows[0].CHILDREN[0].GRANDCHILDREN[0].DESCRIPTION, 'Child 101');
      should.strictEqual(result.rows[0].CHILDREN[0].GRANDCHILDREN[1].DESCRIPTION, 'Child 102');
      should.strictEqual(result.rows[0].CHILDREN[0].GRANDCHILDREN[2].DESCRIPTION, 'Child 103');

      should.strictEqual(result.rows[0].CHILDREN[1].GRANDCHILDREN[0].DESCRIPTION, 'Child 104');
      should.strictEqual(result.rows[0].CHILDREN[1].GRANDCHILDREN[1].DESCRIPTION, 'Child 105');

      should.strictEqual(result.rows[1].CHILDREN[0].GRANDCHILDREN[0].DESCRIPTION, 'Child 106');
    } catch (err) {
      should.not.exist(err);
    }
  }); // 236.1

  it('236.2 maxRows option is respected at all levels of nested cursors', async () => {
    try {
      const LIMIT = 1;
      const options = {
        maxRows: LIMIT,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlOne, [], options);

      should.strictEqual(result.rows.length, LIMIT);
      should.strictEqual(result.rows[0].DESCRIPTION, 'Grandparent 301');

      should.strictEqual(result.rows[0].CHILDREN.length, LIMIT);
      should.strictEqual(result.rows[0].CHILDREN[0].DESCRIPTION, 'Parent 201');

      should.strictEqual(result.rows[0].CHILDREN[0].GRANDCHILDREN.length, LIMIT);
      should.strictEqual(result.rows[0].CHILDREN[0].GRANDCHILDREN[0].DESCRIPTION, 'Child 101');

    } catch (err) {
      should.not.exist(err);
    }
  }); // 236.2

  it('236.3 fetchArraySize option is respected at all levels of nested cursors', async () => {
    try {

      const options = {
        fetchArraySize: 3,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlOne, [], options);

      should.strictEqual(result.rows.length, 2);

      should.strictEqual(result.rows[0].CHILDREN.length, 2);
      should.strictEqual(result.rows[1].CHILDREN.length, 1);

      should.strictEqual(result.rows[0].CHILDREN[0].GRANDCHILDREN.length, 3);
      should.strictEqual(result.rows[0].CHILDREN[1].GRANDCHILDREN.length, 2);
      should.strictEqual(result.rows[1].CHILDREN[0].GRANDCHILDREN.length, 1);

    } catch (err) {
      should.not.exist(err);
    }
  }); // 236.3

  it('236.4 extendedMetaData option is respected at all levels of nested cursors', async () => {
    try {

      const options = {
        extendedMetaData: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlOne, [], options);

      const stringMetaData = {
        name: 'DESCRIPTION',
        fetchType: 2001,
        dbType: 2001,
        dbTypeName: 'VARCHAR2',
        nullable: true,
        byteSize: 200
      };
      should.deepEqual(result.metaData[0], stringMetaData);
      should.strictEqual(result.metaData[1].name, 'CHILDREN');
      should.strictEqual(result.metaData[1].fetchType, 2021);
      should.strictEqual(result.metaData[1].dbType, 2021);
      should.strictEqual(result.metaData[1].dbTypeName, 'CURSOR');

      should.deepEqual(result.metaData[1].metaData[0], stringMetaData);
      should.strictEqual(result.metaData[1].metaData[1].name, 'GRANDCHILDREN');
      should.strictEqual(result.metaData[1].metaData[1].fetchType, 2021);
      should.strictEqual(result.metaData[1].metaData[1].dbType, 2021);
      should.strictEqual(result.metaData[1].metaData[1].dbTypeName, 'CURSOR');

      should.deepEqual(result.metaData[1].metaData[1].metaData[0], stringMetaData);

    } catch (err) {
      should.not.exist(err);
    }
  }); // 236.4

  it('236.5 combination of options maxRows, fetchArraySize, extendedMetaData', async () => {
    try {
      const LIMIT = 1;
      const options = {
        maxRows: LIMIT,
        fetchArraySize: 3,
        extendedMetaData: true,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      };
      const result = await conn.execute(sqlOne, [], options);

      should.strictEqual(result.rows.length, LIMIT);
      should.strictEqual(result.rows[0].CHILDREN.length, LIMIT);
      should.strictEqual(result.rows[0].CHILDREN[0].GRANDCHILDREN.length, LIMIT);

    } catch (err) {
      should.not.exist(err);
    }
  }); // 236.5
});