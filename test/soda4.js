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
 *   168. soda4.js
 *
 * DESCRIPTION
 *   sodaDocument class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert    = require('assert');
const dbConfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('168. soda4.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('168.1 insertOneAndGet() fetches attributes without content', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_1';
    const coll = await sd.createCollection(collectionName);

    // Insert a new document
    const testContent = {
      name:    "Changjie Lin",
      address: {city: "Shenzhen", country: "China"},
      company: "Oracle Corporation",
      manager: null,
      VP:      "Bruce"
    };

    const myDoc = await coll.insertOneAndGet(testContent);
    const myKey = myDoc.key;
    assert(myKey);
    assert.strictEqual(typeof (myKey), "string");
    assert.strictEqual(typeof (myDoc), "object");

    const content1 = myDoc.getContent();
    assert.ifError(content1);

    // Fetch it back
    const doc2 = await coll.find().key(myKey).getOne();
    const content2 = doc2.getContent();
    assert.strictEqual(content2.name, testContent.name);
    assert.strictEqual(content2.company, testContent.company);
    assert.strictEqual(content2.manager, null);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

    await conn.close();
  }); // 168.1

  it('168.2 content is null', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_2';
    const coll = await sd.createCollection(collectionName);

    // Insert a new document
    // Content is empty
    const testContent = {};

    const myDoc = await coll.insertOneAndGet(testContent);
    const myKey = myDoc.key;
    assert(myKey);
    assert.strictEqual(typeof (myKey), "string");
    assert.strictEqual(typeof (myDoc), "object");

    // Fetch it back
    const doc2 = await coll.find().key(myKey).getOne();
    const content2 = doc2.getContent();
    assert.deepEqual(content2, testContent);

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

    await conn.close();
  }); // 168.2

  it('168.3 get mediaType', async () => {
    const conn = await oracledb.getConnection(dbConfig);
    const sd = conn.getSodaDatabase();
    const collectionName = 'soda_test_168_3';
    const coll = await sd.createCollection(collectionName);

    // Insert a new document
    // Content is empty
    const testContent = {};

    const myDoc = await coll.insertOneAndGet(testContent);
    const myMediaType = myDoc.mediaType;
    assert(myMediaType);
    assert.strictEqual(myMediaType, 'application/json');
    const myKey = myDoc.key;

    // Fetch it back
    const doc2 = await coll.find().key(myKey).getOne();
    assert.strictEqual(doc2.mediaType, 'application/json');

    await conn.commit();
    const res = await coll.drop();
    assert.strictEqual(res.dropped, true);

    await conn.close();
  }); // 168.3

});
