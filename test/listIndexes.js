/* Copyright (c) 2023, 2024, Oracle and/or its affiliates. */

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
 *   286. listIndexes.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   Test cases for JSON payload type with AQ.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');
const sodaUtil  = require('./sodaUtil.js');

describe('286. listIndexes.js', function() {
  let conn = null;

  before(async function() {
    let runnable = await testsUtil.isSodaRunnable();
    // For listIndexes, Oracle Client library version 19.13 (or later DBRU)
    // or version 21.3 (or higher) is needed
    runnable = runnable && (testsUtil.getClientVersion >= 1913000000 ||
      (testsUtil.getClientVersion >= 2100000000 && testsUtil.getClientVersion >= 2103000000));
    if (!oracledb.thin) {
      await sodaUtil.cleanup();
    }
    if (!runnable) {
      this.skip();
    }
    conn = await oracledb.getConnection(dbconfig);
  });

  after(async function() {
    if (conn) {
      await conn.close ();
    }
  });    // after

  it('286.1 listIndexes before creating any indexes', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_285_1");
    const fetchedIndexArr = await collection.listIndexes();
    assert.strictEqual(fetchedIndexArr.length, 0);
    collection.drop();
  });


  it('286.2 listIndexes after 1-createIndex', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_286_2");
    const indexSpec = {
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

    const fetchedIndexArr = await collection.listIndexes();
    assert.strictEqual(fetchedIndexArr.length, 1);
    assert.strictEqual(fetchedIndexArr[0].name, indexSpec.name);
    collection.drop();
  });

  it('286.3 listIndexes after 2-createIndex', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_286_3");
    const indexArr = [
      {
        "name": "HOME_IDX",
        "fields": [
          {
            "path": "home",
            "datatype": "string",
            "order": "asc"
          }
        ]
      },
      {
        "name": "OFFICE_IDX",
        "fields": [
          {
            "path": "office",
            "datatype": "string",
            "order": "asc"
          }
        ]
      }
    ];

    await collection.createIndex(indexArr[0]);
    await collection.createIndex(indexArr[1]);

    const fetchedIndexArr  = await collection.listIndexes();

    fetchedIndexArr.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    assert.strictEqual(fetchedIndexArr.length, 2);
    assert.strictEqual(fetchedIndexArr[0].name, indexArr[0].name);
    assert.strictEqual(fetchedIndexArr[1].name, indexArr[1].name);

    collection.drop();
  });

  it('286.4 listIndexes after 2-createIndex 1 drop index', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_286_4");
    const indexSpec1 = {
      "name": "OFFICE_IDX",
      "fields": [
        {
          "path": "office",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };
    const indexSpec2 = {
      "name": "HOME_IDX",
      "fields": [
        {
          "path": "home",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };
    await collection.dropIndex(indexSpec1.name);
    await collection.dropIndex(indexSpec2.name);

    await collection.createIndex(indexSpec1);
    await collection.createIndex(indexSpec2);
    await collection.dropIndex(indexSpec2.name);

    const fetchedIndexArr = await collection.listIndexes();
    assert.strictEqual(fetchedIndexArr.length, 1);
    assert.strictEqual(fetchedIndexArr[0].name, indexSpec1.name);
    collection.drop();
  });


  it('286.5 listIndexes after 2-createIndex 2-drop index', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_286_5");
    const indexSpec1 = {
      "name": "OFFICE_IDX",
      "fields": [
        {
          "path": "office",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };
    const indexSpec2 = {
      "name": "HOME_IDX",
      "fields": [
        {
          "path": "home",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };
    await collection.createIndex(indexSpec1);
    await collection.createIndex(indexSpec2);
    await collection.dropIndex(indexSpec2.name);
    await collection.dropIndex(indexSpec1.name);

    const fetchedIndexArr = await collection.listIndexes();
    assert.strictEqual(fetchedIndexArr.length, 0);
    collection.drop();
  });


  it('286.6 listIndexes after 3-createIndex', async () => {
    const soda = conn.getSodaDatabase();
    const collection = await soda.createCollection("soda_test_286_3");
    const indexSpec1 = {
      "name": "OFFICE_IDX",
      "fields": [
        {
          "path": "office",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };
    const indexSpec2 = {
      "name": "HOME_IDX",
      "fields": [
        {
          "path": "home",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };
    const indexSpec3 = {
      "name": "CAFE_IDX",
      "fields": [
        {
          "path": "cafe",
          "datatype": "string",
          "order": "asc"
        }
      ]
    };

    const indexArr = [indexSpec3, indexSpec2, indexSpec1];

    await collection.createIndex(indexSpec1);
    await collection.createIndex(indexSpec2);
    await collection.createIndex(indexSpec3);

    const fetchedIndexArr = await collection.listIndexes();

    fetchedIndexArr.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    assert.strictEqual(fetchedIndexArr.length, 3);
    assert.strictEqual(fetchedIndexArr[0].name, indexArr[0].name);
    assert.strictEqual(fetchedIndexArr[1].name, indexArr[1].name);
    assert.strictEqual(fetchedIndexArr[2].name, indexArr[2].name);

    collection.drop();
  });

});
