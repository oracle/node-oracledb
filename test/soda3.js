/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   167. soda3.js
 *
 * DESCRIPTION
 *   SODA tests that use many collections.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
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
    isRunnable = await testsUtil.checkPrerequisites();
    if (!isRunnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();

    try {
      conn = await oracledb.getConnection(dbconfig);
      sd = conn.getSodaDatabase();

      t_collections = await Promise.all(
        t_collectionNames.map(function(name) {
          return sd.createCollection(name);
        })
      );
    } catch(err) {
      should.not.exist(err);
    }
  }); // before

  after('drop collections, close connection', async () => {
    if (!isRunnable) return;

    try {
      if (t_collections) {
        await Promise.all(
          t_collections.map(function(coll) {
            return coll.drop();
          })
        );
      }
      await conn.close();
    } catch(err) {
      should.not.exist(err);
    }
  }); // after

  it('167.1 get collection names', async () => {
    try {
      let cNames = await sd.getCollectionNames();
      should.strictEqual(cNames.length, t_collectionNames.length);
      should.deepEqual(cNames, t_collectionNames.sort());
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.2 getCollectionNames() - limit option', async () => {
    try {
      let options = { limit: 1 };
      let cNames = await sd.getCollectionNames(options);
      should.strictEqual(cNames.length, 1);
      should.deepEqual(cNames, t_collectionNames.sort().slice(0, 1));
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.3 getCollectionNames() - limit is "undefined"', async () => {
    try {
      let options = { limit: undefined };
      let cNames = await sd.getCollectionNames(options);
      should.strictEqual(cNames.length, t_collectionNames.length);
      should.deepEqual(cNames, t_collectionNames.sort());
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.4 getCollectionNames() - limit is 0', async () => {
    try {
      let options = { limit: 0 };
      let cNames = await sd.getCollectionNames(options);
      should.strictEqual(cNames.length, t_collectionNames.length);
      should.deepEqual(cNames, t_collectionNames.sort());
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.5 getCollectionNames() - limit is null', async () => {
    try {
      let options = { limit: null };
      await testsUtil.assertThrowsAsync(
        async () => await sd.getCollectionNames(options),
        /NJS-007: invalid value for "limit" in parameter 1/
      );
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.6 getCollectionNames() - limit is an empty string', async () => {
    try {
      let options = { limit: '' };
      await testsUtil.assertThrowsAsync(
        async () => await sd.getCollectionNames(options),
        /NJS-008: invalid type for "limit" in parameter 1/
      );
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.7 getCollectionNames() - limit is a negative number', async () => {
    try {
      let options = { limit: -7 };
      let cNames = await sd.getCollectionNames(options);
      should.strictEqual(cNames.length, t_collectionNames.length);
      should.deepEqual(cNames, t_collectionNames.sort());
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.8 startsWith option - basic test', async () => {
    try {
      let options = { startsWith: "changjie" };
      let cNames = await sd.getCollectionNames(options);
      should.deepEqual(cNames, t_collectionNames.sort().slice(2));
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.9 startsWith is case sensitive', async () => {
    try {
      let options = { startsWith: "Changjie" };
      let cNames = await sd.getCollectionNames(options);
      should.strictEqual(cNames.length, t_collectionNames.length);
      should.deepEqual(cNames, t_collectionNames.sort());
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.10 startsWith is an empty string', async () => {
    try {
      let options = { startsWith: "" };
      let cNames = await sd.getCollectionNames(options);
      should.strictEqual(cNames.length, t_collectionNames.length);
      should.deepEqual(cNames, t_collectionNames.sort());
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.11 startsWith is null', async () => {
    try {
      let options = { startsWith: null };
      await testsUtil.assertThrowsAsync(
        async () => await sd.getCollectionNames(options),
        /NJS-007: invalid value for "startsWith" in parameter 1/
      );
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.12 Negative - startsWith has invalid type, a Number', async () => {
    try {
      let options = { startsWith: 7 };
      await testsUtil.assertThrowsAsync(
        async () => await sd.getCollectionNames(options),
        /NJS-008: invalid type for "startsWith" in parameter 1/
      );
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.13 openCollection() basic case 1', async () => {
    try {
      let candidate = "Changjie_3";
      let coll = await sd.openCollection(candidate);
      should.strictEqual(coll.name, candidate);
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.14 openCollection() basic case 2', async () => {
    try {
      let candidate = "chris_1";
      let coll = await sd.openCollection(candidate);
      should.strictEqual(coll.name, candidate);
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.15 the returned value is null if the requested collection does not exist', async () => {
    try {
      let candidate = "nonexistent_collection";
      let coll = await sd.openCollection(candidate);
      should.strictEqual(coll, undefined);
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('167.16 the requested collection name is case sensitive', async () => {
    try {
      let candidate = "changjie_3";
      let coll = await sd.openCollection(candidate);
      should.strictEqual(coll, undefined);
    } catch(err) {
      should.not.exist(err);
    }
  });

});
