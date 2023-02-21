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
 *   175. soda7.js
 *
 * DESCRIPTION
 *   Tests for terminal methods of SodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

const t_contents = sodaUtil.t_contents;

describe('175. soda7.js', () => {

  before(async function() {
    const runnable = await testsUtil.isSodaRunnable();
    if (!runnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
  });

  it('175.1 count(), basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_1");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let emps = await collection.find().count();
      assert.strictEqual(emps.count, t_contents.length);

      await conn.commit();

    } catch (err) {
      assert.fail(err);
    } finally {
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
  }); // 175.1

  it('175.2 Negative - skip().count()', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_2");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let numberToSkip = 3;
      await testsUtil.assertThrowsAsync(
        async () => await collection.find().skip(numberToSkip).count(),
        /ORA-40748:/
      );
      // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.

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
  }); // 175.2

  it('175.3 Negative - limit().count()', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_3");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let numberToLimit = 5;
      await testsUtil.assertThrowsAsync(
        async () => await collection.find().skip(numberToLimit).count(),
        /ORA-40748:/
      );
      // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.

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
  }); // 175.3

  it('175.4 keys().count()', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_4");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      // Fetch back
      let keysToCount = [ myKeys[2], myKeys[3] ];
      let emps = await collection.find().keys(keysToCount).count();
      assert.strictEqual(emps.count, keysToCount.length);

      await conn.commit();

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
  }); // 175.4

  it('175.5 getCursor(), basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_5");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let docCursor = await collection.find().getCursor();

      let myContents = [];
      let hasNext = true;
      let myDocument;
      for (let i = 0; hasNext; i++) {
        myDocument = await docCursor.getNext();
        if (!myDocument) {
          hasNext = false;
        } else {
          myContents[i] = myDocument.getContent();
          (t_contents).includes(myContents[i]);
        }
      }

      assert.strictEqual(myContents.length, t_contents.length);

      await docCursor.close();

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
  }); // 175.5

  it('175.6 skip().getCursor()', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_6");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let numberToSkip = 3;
      let docCursor = await collection.find().skip(numberToSkip).getCursor();

      let myContents = [];
      let hasNext = true;
      let myDocument;
      for (let i = 0; hasNext; i++) {
        myDocument = await docCursor.getNext();
        if (!myDocument) {
          hasNext = false;
        } else {
          myContents[i] = myDocument.getContent();
          (t_contents).includes(myContents[i]);
        }
      }

      assert.strictEqual(myContents.length, (t_contents.length - numberToSkip));
      await docCursor.close();

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
  }); // 175.6

  it('175.7 getCursor(), empty document matched', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_7");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let numberToSkip = t_contents.length + 3;
      let docCursor = await collection.find().skip(numberToSkip).getCursor();

      let myDocument = await docCursor.getNext();
      assert.strictEqual(myDocument, undefined);
      await docCursor.close();

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
  }); // 175.7

  it('175.8 Negative - close document cursor two times', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_8");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let docCursor = await collection.find().getCursor();

      let myContents = [];
      let hasNext = true;
      let myDocument;
      for (let i = 0; hasNext; i++) {
        myDocument = await docCursor.getNext();
        if (!myDocument) {
          hasNext = false;
        } else {
          myContents[i] = myDocument.getContent();
          (t_contents).includes(myContents[i]);
        }
      }

      assert.strictEqual(myContents.length, t_contents.length);

      await docCursor.close();
      await testsUtil.assertThrowsAsync(
        async () => await docCursor.close(),
        /NJS-066: invalid SODA document cursor/
      );

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
  }); // 175.8

  it('175.9 getDocuments(), basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_9");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let documents = await collection.find().getDocuments();

      // Get contents
      let myContents = [];
      for (let i = 0; i < documents.length; i++) {
        myContents[i] = documents[i].getContent();
        (t_contents).includes(myContents[i]);
      }

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
  }); // 175.9

  it('175.10 getDocuments(), no documents matched', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_10");

      // Fetch back
      let documents = await collection.find().getDocuments();
      assert.deepEqual(documents, []);

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
  }); // 175.10

  it('175.11 getOne(), basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_11");

      let myKeys = [];
      for (let i = 0; i < t_contents.length; i++) {
        let content = t_contents[i];
        let doc = await collection.insertOneAndGet(content);
        myKeys[i] = doc.key;
      }

      // Fetch back
      let document = await collection.find().key(myKeys[1]).getOne();
      let content = document.getContent();
      (t_contents).includes(content);

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
  }); // 175.11

  it('175.12 getOne(), the filter matches multiple documents', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_12");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let document = await collection.find().getOne();
      let content = document.getContent();
      (t_contents).includes(content);

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
  }); // 175.12

  it('175.13 remove(), basic case', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_13");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let result = await collection
        .find()
        .filter({ "office": {"$like": "Shenzhen"} })
        .remove();

      assert.strictEqual(result.count, 2);

      let remainingLength = await collection.find().count();
      assert.strictEqual(remainingLength.count, (t_contents.length - result.count));

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
  }); // 175.13

  it('175.14 remove(), remove zero document', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_14");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let result = await collection
        .find()
        .key('4A5AF2AAEB124FD4BFF80BC3630CB048')
        .remove();

      assert.strictEqual(result.count, 0);

      let remainingLength = await collection.find().count();
      assert.strictEqual(remainingLength.count, (t_contents.length - result.count));

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
  }); // 175.14

  it('175.15 remove(), remove multiple times', async () => {
    let conn, collection;

    try {
      conn = await oracledb.getConnection(dbconfig);
      let soda = conn.getSodaDatabase();
      collection = await soda.createCollection("soda_test_175_13");

      await Promise.all(
        t_contents.map(function(content) {
          return collection.insertOne(content);
        })
      );

      // Fetch back
      let result = await collection.find().remove();
      result = await collection.find().remove();

      assert.strictEqual(result.count, 0);

      let remainingLength = await collection.find().count();
      assert.strictEqual(remainingLength.count, 0);

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
  }); // 175.15
});
