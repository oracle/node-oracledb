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
 *   175. soda7.js
 *
 * DESCRIPTION
 *   Tests for terminal methods of SodaOperation class
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');

const t_contents = [
  { id: 1001, name: "Gillian",  office: "Shenzhen" },
  { id: 1002, name: "Chris",    office: "Melbourne" },
  { id: 1003, name: "Changjie", office: "Shenzhen" },
  { id: 1004, name: "Venkat",   office: "Bangalore" },
  { id: 1005, name: "May",      office: "London" },
  { id: 1006, name: "Joe",      office: "San Francisco" },
  { id: 1007, name: "Gavin",    office: "New York" }
];

describe('175. soda7.js', () => {
  
  before(async function() {
    const runnable = await sodaUtil.checkPrerequisites();
    if (!runnable) this.skip();

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
      should.strictEqual(emps.count, t_contents.length);

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
      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().skip(numberToSkip).count(),
        /ORA-40748:/
      );
      // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();
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
      await sodaUtil.assertThrowsAsync(
        async () => await collection.find().skip(numberToLimit).count(),
        /ORA-40748:/
      );
      // ORA-40748: SKIP and LIMIT attributes cannot be used for count operation.

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();
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
      should.strictEqual(emps.count, keysToCount.length);

      await conn.commit();

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
        if(!myDocument) {
          hasNext = false;
        } else {
          myContents[i] = await myDocument.getContent();
          (myContents[i]).should.be.oneOf(t_contents);
        }
      }

      should.strictEqual(myContents.length, t_contents.length);

      await docCursor.close();

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
        if(!myDocument) {
          hasNext = false;
        } else {
          myContents[i] = await myDocument.getContent();
          (myContents[i]).should.be.oneOf(t_contents);
        }
      }

      should.strictEqual( myContents.length, (t_contents.length - numberToSkip) );
      await docCursor.close();

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
      should.strictEqual(myDocument, undefined);
      await docCursor.close();

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
        if(!myDocument) {
          hasNext = false;
        } else {
          myContents[i] = await myDocument.getContent();
          (myContents[i]).should.be.oneOf(t_contents);
        }
      }

      should.strictEqual(myContents.length, t_contents.length);

      await docCursor.close();
      await sodaUtil.assertThrowsAsync(
        async () => await docCursor.close(),
        /NJS-066: invalid SODA document cursor/
      );

    } catch(err) {
      should.not.exist(err);
    } finally {
      await conn.commit();

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
  }); // 175.8

});