/* Copyright (c) 2018, 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *   165. soda2.js
 *
 * DESCRIPTION
 *   Some more tests of sodaDatabase object and createCollection() method.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('165. soda2.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
    await sodaUtil.grantPrivilege();
  });

  it('165.1 create two sodaDatabase objects which point to the same instance', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd1 = conn.getSodaDatabase();
      let sd2 = conn.getSodaDatabase();
      // sd1 creates the collection
      let collName = "soda_test_165_1";
      let coll_create = await sd1.createCollection(collName);
      // sd2 opens the collection
      let coll_open = await sd2.openCollection(collName);
      should.exist(coll_open);
      await coll_create.drop();
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }

  }); // 165.1

  it('165.2 create two sodaDatabase objects from two connections', async () => {
    let conn1, conn2;
    try {
      conn1 = await oracledb.getConnection(dbconfig);
      let sd1 = conn1.getSodaDatabase();
      conn2 = await oracledb.getConnection(dbconfig);
      let sd2 = conn1.getSodaDatabase();

      let t_collname = "soda_test_165_2";
      let coll = await sd1.createCollection(t_collname);

      let cNames = await sd2.getCollectionNames();
      should.deepEqual(cNames, [ t_collname ] );

      await coll.drop();
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn1) {
        try {
          await conn1.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
      if (conn2) {
        try {
          await conn2.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 165.2

  it('165.3 will open this collection when creating a collection with the existing name', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let t_collname = "soda_test_165_3";
      await sd.createCollection(t_collname);
      let coll = await sd.createCollection(t_collname);

      let cNames = await sd.getCollectionNames();
      should.deepEqual(cNames, [ t_collname ] );

      await coll.drop();
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 165.3

  it('165.4 Negative - createCollection() when collection name is empty string', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collName = "";
      await testsUtil.assertThrowsAsync(
        async () => await sd.createCollection(collName),
        /ORA-40658:/
      );
      // ORA-40658: Collection name cannot be null for this operation.

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (coll) {
        try {
          await coll.drop();
        } catch(err) {
          should.not.exist(err);
        }
      }

      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 165.4

  // This is a variation of 173.1
  it('165.5 connections from a pool concurrently insert documents into the same collection', async () => {

    const collectionName = "soda_test_165.5";

    try {
      await prepareCollection(collectionName);
    } catch(err) {
      should.not.exist(err);
    }

    try {
      let pool = await oracledb.createPool(dbconfig);

      const t_contents = sodaUtil.t_contents;
      await Promise.all(
        t_contents.map(function(content) {
          return insertDocument(pool, collectionName, content);
        })
      );

      await pool.close();

    } catch(err) {
      should.not.exist(err);
    }

    try {
      await dropCollection(collectionName);
    } catch(err) {
      should.not.exist(err);
    }

    async function prepareCollection(collName) {

      try {
        let conn = await oracledb.getConnection(dbconfig);
        let soda = conn.getSodaDatabase();
        let collection = await soda.createCollection(collName);
        let indexSpec = {
          "name": "OFFICE_IDX",
          "fields": [
            {
              "path": "office",
              "datatype": "string",
              "order": "asc"
            }
          ]
        };
        await collection.createIndex(indexSpec);
        await conn.commit();
        await conn.close();

      } catch(err) {
        should.not.exist(err);
      }

    } // prepareCollection()

    async function insertDocument(pool, collName, content) {

      try {
        let conn = await pool.getConnection();
        let soda = conn.getSodaDatabase();
        let collection = await soda.openCollection(collName);

        await collection.insertOne(content);

        await conn.commit();
        await conn.close();
      } catch(err) {
        should.not.exist(err);
      }
    } // insertDocument()

    async function dropCollection(collName) {

      try {
        let conn = await oracledb.getConnection(dbconfig);
        let soda = conn.getSodaDatabase();
        let collection = await soda.openCollection(collName);

        let result = await collection.drop();
        should.strictEqual(result.dropped, true);

        await conn.commit();
        await conn.close();

      } catch(err) {
        should.not.exist(err);
      }
    } // dropCollection()

  }); // 165.5

});
