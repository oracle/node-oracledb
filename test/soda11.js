/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 *   179. soda11.js
 *
 * DESCRIPTION
 *   SODA tests which use modified collections.
 *   Oracle Cloud currently does not support collection modification.
 *   So this file should be out of Cloud test suite.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('179. soda11.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('179.1 create collection with metadata', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let t_tablename = "myTableName";
      let t_metadata = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : t_tablename,
        "keyColumn" :
                      {
                        "name" : "ID",
                        "sqlType" : "VARCHAR2",
                        "maxLength" : 255,
                        "assignmentMethod" : "UUID"
                      },
        "contentColumn" :
                      {
                        "name" : "JSON_DOCUMENT",
                        "sqlType" : "BLOB",
                        "compress" : "NONE",
                        "cache" : true,
                        "encrypt" : "NONE",
                        "validation" : "STANDARD"
                      },
        "versionColumn" :
                      {
                        "name" : "VERSION",
                        "method" : "SHA256"
                      },
        "lastModifiedColumn" :
                      {
                        "name" : "LAST_MODIFIED"
                      },
        "creationTimeColumn" :
                      {
                        "name" : "CREATED_ON"
                      },
        "readOnly" : true
      };

      let t_collname = "soda_test_179_1";
      let options = { metaData: t_metadata };
      collection = await sd.createCollection(t_collname, options);

      await conn.commit();

      assert.strictEqual(collection.name, t_collname);

      assert.strictEqual(typeof (collection.metaData), "object");
      assert.deepEqual(collection.metaData, t_metadata);

    } catch (err) {
      assert.fail(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }

      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.1

  it('179.2 Negative - create collection with an invalid metadata', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let t_metadata = {
        "schemaName" : "nonexistent",
        "tableName" : "bar",
        "keyColumn" :
                      {
                        "name" : "ID",
                        "sqlType" : "VARCHAR2",
                        "maxLength" : 255,
                        "assignmentMethod" : "UUID"
                      },
        "contentColumn" :
                      {
                        "name" : "JSON_DOCUMENT",
                        "sqlType" : "BLOB",
                        "compress" : "NONE",
                        "cache" : true,
                        "encrypt" : "NONE",
                        "validation" : "STANDARD"
                      },
        "versionColumn" :
                      {
                        "name" : "VERSION",
                        "method" : "SHA256"
                      },
        "lastModifiedColumn" :
                      {
                        "name" : "LAST_MODIFIED"
                      },
        "creationTimeColumn" :
                      {
                        "name" : "CREATED_ON"
                      },
        "readOnly" : false
      };

      let t_collname = "soda_test_179_2";
      let options = { metaData: t_metadata };
      await testsUtil.assertThrowsAsync(
        async () => await sd.createCollection(t_collname, options),
        /ORA-01918:/
      );
      // ORA-01918: user \'nonexistent\' does not exist

    } catch (err) {
      assert.fail(err);
    } finally {
      await conn.commit();

      if (collection) {
        let res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }

      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.2

  it('179.3 throw error when creating collection with the existing name and different metadata', async () => {
    let conn;
    let collection1;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let t_metadata1 = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : "nodb_tab_179_3",
        "keyColumn" :
                       {
                         "name" : "ID",
                         "sqlType" : "VARCHAR2",
                         "maxLength" : 255,
                         "assignmentMethod" : "UUID"
                       },
        "contentColumn" :
                       {
                         "name" : "JSON_DOCUMENTS",
                         "sqlType" : "BLOB",
                         "compress" : "NONE",
                         "cache" : true,
                         "encrypt" : "NONE",
                         "validation" : "STRICT"
                       },
        "versionColumn" :
                       {
                         "name" : "VERSION",
                         "type":"String",
                         "method":"SHA256"
                       },
        "lastModifiedColumn" :
                       {
                         "name":"LAST_MODIFIED"
                       },
        "creationTimeColumn":
                       {
                         "name":"CREATED_ON"
                       },
        "readOnly": false
      };
      let t_collname = "soda_test_179_3";
      let options = { metaData: t_metadata1 };
      collection1 = await sd.createCollection(t_collname, options);

      let t_metadata2 = {
        "schemaName" : "foo",
        "tableName" : "bar",
        "keyColumn" :
                       {
                         "name" : "ID",
                         "sqlType" : "VARCHAR2",
                         "maxLength" : 255,
                         "assignmentMethod" : "UUID"
                       },
        "contentColumn" :
                       {
                         "name" : "JSON_DOCUMENTS",
                         "sqlType" : "BLOB",
                         "compress" : "NONE",
                         "cache" : true,
                         "encrypt" : "NONE",
                         "validation" : "STRICT"
                       },
        "versionColumn" :
                       {
                         "name" : "VERSION",
                         "type":"String",
                         "method":"SHA256"
                       },
        "lastModifiedColumn" :
                       {
                         "name":"LAST_MODIFIED"
                       },
        "creationTimeColumn":
                       {
                         "name":"CREATED_ON"
                       },
        "readOnly": true
      };

      let options2 = { metaData: t_metadata2 };

      await testsUtil.assertThrowsAsync(
        async () => await sd.createCollection(t_collname, options2),
        /ORA-40669:/
      );
      // ORA-40669: Collection create failed: collection with same name but different metadata exists.

    } catch (err) {
      assert.fail(err);
    } finally {
      if (collection1) {
        try {
          await collection1.drop();
        } catch (err) {
          assert.fail(err);
        }
      }
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.3

  it('179.4 customize the key value, String value', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_179_4';
      let testMetaData = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : collectionName,
        "keyColumn" :
                       {
                         "name" : "ID",
                         "sqlType" : "NUMBER",
                         "assignmentMethod" : "CLIENT"
                       },
        "contentColumn" :
                       {
                         "name" : "JSON_DOCUMENTS",
                         "sqlType" : "BLOB",
                         "compress" : "NONE",
                         "cache" : true,
                         "encrypt" : "NONE",
                         "validation" : "STRICT"
                       },
        "versionColumn" :
                       {
                         "name" : "VERSION",
                         "type":"String",
                         "method":"SHA256"
                       },
        "lastModifiedColumn" :
                       {
                         "name":"LAST_MODIFIED"
                       },
        "creationTimeColumn":
                       {
                         "name":"CREATED_ON"
                       },
        "readOnly": false
      };

      let coll = await sd.createCollection(collectionName, { metaData: testMetaData});

      let testContent = {
        name:    "Shelly",
        address: {city: "Shenzhen", country: "China"}
      };

      /* The key must always be a string and is always returned a string as
         well -- even if the "type" in the database is numeric. */
      let testKey = '86755';
      let testDoc = sd.createDocument(testContent, { key: testKey });
      assert.strictEqual(testDoc.key, testKey);
      await coll.insertOne(testDoc);

      // Fetch it back
      let docGot = await coll.find().key(testKey).getOne();
      let contentGot = docGot.getContent();
      assert.strictEqual(contentGot.name, testContent.name);
      assert.strictEqual(
        contentGot.address.country,
        testContent.address.country
      );

      await conn.commit();
      let res = await coll.drop();
      assert.strictEqual(res.dropped, true);

    } catch (err) {
      assert.fail(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.4

  // A variation of 179.4
  it('179.5 Negative - customize the key value, numeric value', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_179_5';
      let testMetaData = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : collectionName,
        "keyColumn" :
                       {
                         "name" : "ID",
                         "sqlType" : "NUMBER",
                         "assignmentMethod" : "CLIENT"
                       },
        "contentColumn" :
                       {
                         "name" : "JSON_DOCUMENTS",
                         "sqlType" : "BLOB",
                         "compress" : "NONE",
                         "cache" : true,
                         "encrypt" : "NONE",
                         "validation" : "STRICT"
                       },
        "versionColumn" :
                       {
                         "name" : "VERSION",
                         "type":"String",
                         "method":"SHA256"
                       },
        "lastModifiedColumn" :
                       {
                         "name":"LAST_MODIFIED"
                       },
        "creationTimeColumn":
                       {
                         "name":"CREATED_ON"
                       },
        "readOnly": false
      };

      coll = await sd.createCollection(collectionName, { metaData: testMetaData});

      let testContent = {
        name:    "Shelly",
        address: {city: "Shenzhen", country: "China"}
      };

      /* The key must always be a string and is always returned a string as
         well -- even if the "type" in the database is numeric. */
      let testKey = 86755;
      await testsUtil.assertThrowsAsync(
        async () => await sd.createDocument(testContent, { key: testKey }),
        /NJS-007: invalid value for "key" in parameter 2/
      );

    } catch (err) {
      assert.fail(err);
    } finally {
      if (coll) {
        try {
          let res = await coll.drop();
          assert.strictEqual(res.dropped, true);
        } catch (err) {
          assert.fail(err);
        }
      }

      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.5

  it('179.6 customize the value of mediaType', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_179_6';
      let testMetaData = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : collectionName,
        "keyColumn" :
                     {
                       "name" : "ID",
                       "sqlType" : "NUMBER",
                       "assignmentMethod" : "CLIENT"
                     },
        "mediaTypeColumn":
                         {
                           "name": "MediaType"
                         },
        "contentColumn" :
                       {
                         "name" : "DOCUMENT",
                         "sqlType" : "BLOB",
                         "compress" : "NONE",
                         "cache" : true,
                         "encrypt" : "NONE",
                         "validation" : "STRICT"
                       },
        "versionColumn" :
                       {
                         "name" : "VERSION",
                         "type":"String",
                         "method":"SHA256"
                       },
        "lastModifiedColumn" :
                       {
                         "name":"LAST_MODIFIED"
                       },
        "creationTimeColumn":
                       {
                         "name":"CREATED_ON"
                       },
        "readOnly": false
      };

      coll = await sd.createCollection(collectionName, { metaData: testMetaData});

      // Insert a new document
      let testContent = {};
      let testMediaType = 'image/png';
      let testKey = '86755';
      let testDoc = sd.createDocument(
        testContent,
        { mediaType: testMediaType, key: testKey }
      );
      assert.strictEqual(testDoc.mediaType, testMediaType);

      let myKey = testDoc.key;

      await coll.insertOne(testDoc);

      // Fetch the document back
      let myDoc = await coll.find().key(myKey).getOne();

      assert.strictEqual(myDoc.mediaType, testMediaType);

    } catch (err) {
      assert.fail(err);
    } finally {
      await conn.commit();
      if (coll) {
        try {
          let res = await coll.drop();
          assert.strictEqual(res.dropped, true);
        } catch (err) {
          assert.fail(err);
        }
      }

      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.6

  it('179.7 Negative - customize mediaType, invalid type, numeric value', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_179_7';
      let testMetaData = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : collectionName,
        "keyColumn" :
                     {
                       "name" : "ID",
                       "sqlType" : "NUMBER",
                       "assignmentMethod" : "CLIENT"
                     },
        "mediaTypeColumn":
                         {
                           "name": "MediaType"
                         },
        "contentColumn" :
                       {
                         "name" : "DOCUMENT",
                         "sqlType" : "BLOB",
                         "compress" : "NONE",
                         "cache" : true,
                         "encrypt" : "NONE",
                         "validation" : "STRICT"
                       },
        "versionColumn" :
                       {
                         "name" : "VERSION",
                         "type":"String",
                         "method":"SHA256"
                       },
        "lastModifiedColumn" :
                       {
                         "name":"LAST_MODIFIED"
                       },
        "creationTimeColumn":
                       {
                         "name":"CREATED_ON"
                       },
        "readOnly": false
      };

      coll = await sd.createCollection(collectionName, { metaData: testMetaData});

      // Insert a new document
      let testContent = {};

      /* Negative value */
      let testMediaType = 65432;
      let testKey = '86755';
      await testsUtil.assertThrowsAsync(
        async () => await sd.createDocument(
          testContent,
          { mediaType: testMediaType, key: testKey }
        ),
        /NJS-007: invalid value for "mediaType" in parameter 2/
      );

    } catch (err) {
      assert.fail(err);
    } finally {
      await conn.commit();
      if (coll) {
        try {
          let res = await coll.drop();
          assert.strictEqual(res.dropped, true);
        } catch (err) {
          assert.fail(err);
        }
      }

      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.7

  it('179.8 insert an empty document with customized metadata', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();
      let collectionName = 'soda_test_179_8';
      let testMetaData = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : collectionName,
        "keyColumn" :
                     {
                       "name" : "ID",
                       "sqlType" : "NUMBER",
                       "assignmentMethod" : "CLIENT"
                     },
        "mediaTypeColumn":
                         {
                           "name": "MediaType"
                         },
        "contentColumn" :
                       {
                         "name" : "DOCUMENT",
                         "sqlType" : "BLOB",
                         "compress" : "NONE",
                         "cache" : true,
                         "encrypt" : "NONE",
                         "validation" : "STRICT"
                       },
        "versionColumn" :
                       {
                         "name" : "VERSION",
                         "type":"String",
                         "method":"SHA256"
                       },
        "lastModifiedColumn" :
                       {
                         "name":"LAST_MODIFIED"
                       },
        "creationTimeColumn":
                       {
                         "name":"CREATED_ON"
                       },
        "readOnly": false
      };

      coll = await sd.createCollection(collectionName, { metaData: testMetaData });

      let testContent = {};
      let testKey = '86755';
      let testDoc = sd.createDocument(testContent, { key: testKey });

      let outDocument = await coll.insertOneAndGet(testDoc);
      assert(outDocument);

    } catch (err) {
      assert.fail(err);
    } finally {
      await conn.commit();
      if (coll) {
        try {
          let res = await coll.drop();
          assert.strictEqual(res.dropped, true);
        } catch (err) {
          assert.fail(err);
        }
      }

      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          assert.fail(err);
        }
      }
    }
  }); // 179.8

});
