/* Copyright (c) 2018, 2023, Oracle and/or its affiliates. */

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
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('179. soda11.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
    }

    await sodaUtil.cleanup();
  });

  it('179.1 create collection with metadata', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();

      const t_tablename = "myTableName";
      const t_metadata = {
        "schemaName" : dbConfig.user.toUpperCase(),
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

      const t_collname = "soda_test_179_1";
      const options = { metaData: t_metadata };
      collection = await sd.createCollection(t_collname, options);

      await conn.commit();

      assert.strictEqual(collection.name, t_collname);

      assert.strictEqual(typeof (collection.metaData), "object");
      assert.deepStrictEqual(collection.metaData, t_metadata);

    } finally {
      await conn.commit();

      if (collection) {
        const res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }

      await conn.close();
    }
  }); // 179.1

  it('179.2 Negative - create collection with an invalid metadata', async () => {
    let conn, collection;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();

      const t_metadata = {
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

      const t_collname = "soda_test_179_2";
      const options = { metaData: t_metadata };
      await assert.rejects(
        async () => await sd.createCollection(t_collname, options),
        /ORA-01918:/
      );
      // ORA-01918: user \'nonexistent\' does not exist

    } finally {
      await conn.commit();

      if (collection) {
        const res = await collection.drop();
        assert.strictEqual(res.dropped, true);
      }

      await conn.close();
    }
  }); // 179.2

  it('179.3 throw error when creating collection with the existing name and different metadata', async () => {
    let conn;
    let collection1;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();

      const t_metadata1 = {
        "schemaName" : dbConfig.user.toUpperCase(),
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
      const t_collname = "soda_test_179_3";
      const options = { metaData: t_metadata1 };
      collection1 = await sd.createCollection(t_collname, options);

      const t_metadata2 = {
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

      const options2 = { metaData: t_metadata2 };

      await assert.rejects(
        async () => await sd.createCollection(t_collname, options2),
        /ORA-40669:/
      );
      // ORA-40669: Collection create failed: collection with same name but different metadata exists.

    } finally {
      if (collection1) {
        await collection1.drop();
      }
      if (conn) {
        await conn.close();
      }
    }
  }); // 179.3

  it('179.4 customize the key value, String value', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collectionName = 'soda_test_179_4';
      const testMetaData = {
        "schemaName" : dbConfig.user.toUpperCase(),
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

      const coll = await sd.createCollection(collectionName, { metaData: testMetaData});

      const testContent = {
        name:    "Shelly",
        address: {city: "Shenzhen", country: "China"}
      };

      /* The key must always be a string and is always returned a string as
         well -- even if the "type" in the database is numeric. */
      const testKey = '86755';
      const testDoc = sd.createDocument(testContent, { key: testKey });
      assert.strictEqual(testDoc.key, testKey);
      await coll.insertOne(testDoc);

      // Fetch it back
      const docGot = await coll.find().key(testKey).getOne();
      const contentGot = docGot.getContent();
      assert.strictEqual(contentGot.name, testContent.name);
      assert.strictEqual(
        contentGot.address.country,
        testContent.address.country
      );

      await conn.commit();
      const res = await coll.drop();
      assert.strictEqual(res.dropped, true);

    } finally {
      if (conn) {
        await conn.close();
      }
    }
  }); // 179.4

  // A variation of 179.4
  it('179.5 Negative - customize the key value, numeric value', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collectionName = 'soda_test_179_5';
      const testMetaData = {
        "schemaName" : dbConfig.user.toUpperCase(),
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

      const testContent = {
        name:    "Shelly",
        address: {city: "Shenzhen", country: "China"}
      };

      /* The key must always be a string and is always returned a string as
         well -- even if the "type" in the database is numeric. */
      const testKey = 86755;
      await assert.rejects(
        async () => await sd.createDocument(testContent, { key: testKey }),
        /NJS-007: invalid value for "key" in parameter 2/
      );

    } finally {
      if (coll) {
        const res = await coll.drop();
        assert.strictEqual(res.dropped, true);
      }

      if (conn) {
        await conn.close();
      }
    }
  }); // 179.5

  it('179.6 customize the value of mediaType', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collectionName = 'soda_test_179_6';
      const testMetaData = {
        "schemaName" : dbConfig.user.toUpperCase(),
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
      const testContent = {};
      const testMediaType = 'image/png';
      const testKey = '86755';
      const testDoc = sd.createDocument(
        testContent,
        { mediaType: testMediaType, key: testKey }
      );
      assert.strictEqual(testDoc.mediaType, testMediaType);

      const myKey = testDoc.key;

      await coll.insertOne(testDoc);

      // Fetch the document back
      const myDoc = await coll.find().key(myKey).getOne();

      assert.strictEqual(myDoc.mediaType, testMediaType);

    } finally {
      await conn.commit();
      if (coll) {
        const res = await coll.drop();
        assert.strictEqual(res.dropped, true);
      }

      if (conn) {
        await conn.close();
      }
    }
  }); // 179.6

  it('179.7 Negative - customize mediaType, invalid type, numeric value', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collectionName = 'soda_test_179_7';
      const testMetaData = {
        "schemaName" : dbConfig.user.toUpperCase(),
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
      const testContent = {};

      /* Negative value */
      const testMediaType = 65432;
      const testKey = '86755';
      await assert.rejects(
        async () => await sd.createDocument(
          testContent,
          { mediaType: testMediaType, key: testKey }
        ),
        /NJS-007: invalid value for "mediaType" in parameter 2/
      );

    } finally {
      await conn.commit();
      if (coll) {
        const res = await coll.drop();
        assert.strictEqual(res.dropped, true);
      }

      if (conn) {
        await conn.close();
      }
    }
  }); // 179.7

  it('179.8 insert an empty document with customized metadata', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbConfig);
      const sd = conn.getSodaDatabase();
      const collectionName = 'soda_test_179_8';
      const testMetaData = {
        "schemaName" : dbConfig.user.toUpperCase(),
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

      const testContent = {};
      const testKey = '86755';
      const testDoc = sd.createDocument(testContent, { key: testKey });

      const outDocument = await coll.insertOneAndGet(testDoc);
      assert(outDocument);

    } finally {
      await conn.commit();
      if (coll) {
        const res = await coll.drop();
        assert.strictEqual(res.dropped, true);
      }

      if (conn) {
        await conn.close();
      }
    }
  }); // 179.8

});
