/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   173. soda5.js
 *
 * DESCRIPTION
 *   More tests for sodaCollection class
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

const t_contents = sodaUtil.t_contents;

describe('173. soda5.js', () => {

  before(async function() {
    const runnable = await testsUtil.checkPrerequisites();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('173.1 create index, basic case', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);

      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_1");

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

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.1

  it('173.2 query row not via indexSpec', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);

      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_2");

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

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );
    } catch(err) {
      should.not.exist(err);
    }

    try {
      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "name": {"$like": "Changjie"} })
        .count();
      should.strictEqual(empInShenzhen.count, 1);

    } catch(err) {
      should.not.exist(err);
    }

    try {
      await conn.commit();
    }
    catch(err) {
      should.not.exist(err);
    }

    if (collection) {
      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    }
    if (conn) {
      try {
        await conn.close();
      } catch(err) {
        should.not.exist(err);
      }
    }
  }); // 173.2

  it('173.3 Negative - invalid indexSpec, invalid index property', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);

      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_3");

    } catch(err) {
      should.not.exist(err);
    }

    let indexSpec = { "foo": "bar" };
    await testsUtil.assertThrowsAsync(
      async () => await collection.createIndex(indexSpec),
      // {
      //   errorNum: 40719,
      //   offset: 0,
      //   message: /^ORA-40719/
      // }
      /ORA-40719:/
    );

    // ORA-40719: invalid index property foo

    if (collection) {
      let res = await collection.drop();
      should.strictEqual(res.dropped, true);
    }
    if (conn) {
      try {
        await conn.close();
      } catch(err) {
        should.not.exist(err);
      }
    }
  }); // 173.3

  it('173.4 collection.drop(), basic case', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collName = "soda_test_173_4";
      collection = await sd.createCollection(collName);

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.4

  it('173.5 drop multiple times, no error thrown', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collName = "soda_test_173_5";
      collection = await sd.createCollection(collName);

      let res = await collection.drop();
      should.strictEqual(res.dropped, true);

      res = await collection.drop();
      should.strictEqual(res.dropped, false);

      res = await collection.drop();
      should.strictEqual(res.dropped, false);

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
  }); // 173.5

  it('173.6 dropIndex(), basic case', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);

      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_6");

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

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      // drop index
      let indexName = indexSpec.name;
      await collection.dropIndex(indexName);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.6

  it('173.7 dropping index does not impact query', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);

      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_7");

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

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // drop index
      let indexName = indexSpec.name;
      await collection.dropIndex(indexName);

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.7

  it('173.8 The index is dropped regardless of the auto commit mode', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);

      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_8");

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

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      // drop index
      let indexName = indexSpec.name;
      await collection.dropIndex(indexName);

      // Does not commit changes
      // await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.8

  it('173.9 Negative - dropIndex() no parameter', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);

      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_9");

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

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      // drop index multiple times
      let indexName = indexSpec.name;

      await collection.dropIndex(indexName);
      await collection.dropIndex(indexName);
      await collection.dropIndex(indexName);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.9

  it('173.10 option object of dropIndex(), basic case', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_10");

      await collection.createIndex({
        "name": "OFFICE_IDX_SP",
        "spatial": "geometry",
      });

      await Promise.all(
        sodaUtil.t_contents_spatial.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      // drop index
      await collection.dropIndex("OFFICE_IDX_SP", { "force" : true });
      await conn.commit();
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.10

  it('173.11 option object of dropIndex(), boolean value is false', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_173_11");

      await collection.createIndex({
        "name": "OFFICE_IDX",
        "fields": [
          {
            "path": "office",
            "datatype": "string",
            "order": "asc"
          }
        ]
      });

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let empInShenzhen = await collection.find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .count();
      should.strictEqual(empInShenzhen.count, 2);

      // drop index
      await collection.dropIndex("OFFICE_IDX", { "force" : false });
      await conn.commit();
    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection) {
        let res = await collection.drop();
        should.strictEqual(res.dropped, true);
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 173.11

  it('173.12 getDataGuide(), basic case', async () => {

    let conn, collection;

    try {

      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection('soda_test_173_12');

      let myContent = { name: "Sally", address: {city: "Melbourne"} };
      await collection.insertOne(myContent);

      myContent = { name: "Matilda", address: {city: "Sydney"} };
      await collection.insertOne(myContent);

      myContent = { name: "May", address: {city: "London"} };
      await collection.insertOne(myContent);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    }

    /*
     * if isCreateIndexEligible >= 0: Can Create Index without error
     * if isCreateIndexEligible < 0: Create Index will throw error ORA-00406
     * if isCreateIndexEligible = undefined: Getting COMPATIBLE VERSION string failed, the following part is skipped
     */
    const isCreateIndexEligible = testsUtil.versionStringCompare(await testsUtil.getDBCompatibleVersion(), '12.2.0.0.0');
    try {
      let indexSpec = {
        "name": "TEST_IDX",
        "search_on": "none",
        "dataguide": "on"
      };
      if (isCreateIndexEligible >= 0) {
        await collection.createIndex(indexSpec);
        let outDocument = await collection.getDataGuide();
        should.exist(outDocument);
      } else if(isCreateIndexEligible < 0){
        await testsUtil.assertThrowsAsync(async () => {await collection.createIndex(indexSpec);}, /ORA-00406:/);
      }
    } catch(err) {
      should.not.exist(err);
    }

    if (isCreateIndexEligible >= 0) {
      try {
        let result = await collection.dropIndex('TEST_IDX');
        should.strictEqual(result.dropped, true);
        await conn.commit();
      } catch(err) {
        should.not.exist(err);
      }
    }

    try {
      if (collection) await collection.drop();
    } catch (err) {
      should.not.exist(err);
    }
    try {
      if (conn) await conn.close();
    } catch (err) {
      should.not.exist(err);
    }

  }); // 173.12

});
