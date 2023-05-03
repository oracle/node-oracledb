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
 *   167. soda3.js
 *
 * DESCRIPTION
 *   SODA tests that use many collections.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('167. soda3.js', () => {

  let isRunnable;
  let conn, sd, t_collections;
  let t_collectionNames = [
    "chris_1", "chris_2", "chris_3", "chris_4",
    "changjie_1", "changjie_2", "Changjie_3", "Changjie_4",
    "venkat_1", "venkat_2", "venkat_3", "venkat_4"
  ];

  before('create collections', async function() {
    isRunnable = await testsUtil.isSodaRunnable();
    if (!isRunnable) {
      this.skip();
    }

    await sodaUtil.cleanup();

    conn = await oracledb.getConnection(dbConfig);
    sd = conn.getSodaDatabase();

    t_collections = await Promise.all(
      t_collectionNames.map(function(name) {
        return sd.createCollection(name);
      })
    );
  }); // before

  after('drop collections, close connection', async () => {
    if (!isRunnable) return;

    if (t_collections) {
      await Promise.all(
        t_collections.map(function(coll) {
          return coll.drop();
        })
      );
    }
    await conn.close();
  }); // after

  it('167.1 get collection names', async () => {
    const cNames = await sd.getCollectionNames();
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.2 getCollectionNames() - limit option', async () => {
    const options = { limit: 1 };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, 1);
    assert.deepStrictEqual(cNames, t_collectionNames.sort().slice(0, 1));
  });

  it('167.3 getCollectionNames() - limit is "undefined"', async () => {
    const options = { limit: undefined };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.4 getCollectionNames() - limit is 0', async () => {
    const options = { limit: 0 };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.5 getCollectionNames() - limit is null', async () => {
    let options = { limit: null };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "limit" in parameter 1/
    );
  });

  it('167.6 getCollectionNames() - limit is an empty string', async () => {
    const options = { limit: '' };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "limit" in parameter 1/
    );
  });

  it('167.7 getCollectionNames() - limit is a negative number', async () => {
    const options = { limit: -7 };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.8 startsWith option - basic test', async () => {
    const options = { startsWith: "changjie" };
    const cNames = await sd.getCollectionNames(options);
    assert.deepStrictEqual(cNames, t_collectionNames.sort().slice(2));
  });

  it('167.9 startsWith is case sensitive', async () => {
    const options = { startsWith: "Changjie" };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.10 startsWith is an empty string', async () => {
    const options = { startsWith: "" };
    const cNames = await sd.getCollectionNames(options);
    assert.strictEqual(cNames.length, t_collectionNames.length);
    assert.deepStrictEqual(cNames, t_collectionNames.sort());
  });

  it('167.11 startsWith is null', async () => {
    const options = { startsWith: null };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "startsWith" in parameter 1/
    );
  });

  it('167.12 Negative - startsWith has invalid type, a Number', async () => {
    const options = { startsWith: 7 };
    await assert.rejects(
      async () => await sd.getCollectionNames(options),
      /NJS-007: invalid value for "startsWith" in parameter 1/
    );
  });

  it('167.13 openCollection() basic case 1', async () => {
    const candidate = "Changjie_3";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll.name, candidate);
  });

  it('167.14 openCollection() basic case 2', async () => {
    const candidate = "chris_1";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll.name, candidate);
  });

  it('167.15 the returned value is null if the requested collection does not exist', async () => {
    const candidate = "nonexistent_collection";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll, undefined);
  });

  it('167.16 the requested collection name is case sensitive', async () => {
    const candidate = "changjie_3";
    const coll = await sd.openCollection(candidate);
    assert.strictEqual(coll, undefined);
  });

});
