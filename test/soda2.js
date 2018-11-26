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
 *   165. soda2.js
 *
 * DESCRIPTION
 *   Some more tests of sodaDatabase object and createCollection() method.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');

describe('165. soda2.js', () => {

  before(async function() {
    const runnable = await sodaUtil.checkPrerequisites();
    if (!runnable) this.skip();

    await sodaUtil.cleanup();
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

  // The reason of skipping this case is that the returned metaData
  // is String type rather than JSON object according to FS
  it.skip('165.4 create collection with metadata', async () => {
    let conn;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let t_metadata = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : "myTableName",
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

      let t_collname = "soda_test_165_4";
      let options = { metaData: t_metadata };
      let coll = await sd.createCollection(t_collname, options);

      await conn.commit();
      should.strictEqual(coll.name, t_collname);
      //should.strictEqual(coll.metaData.schemaName, t_metadata.schemaName);
      console.log(typeof coll.metaData);
      console.log(t_metadata);
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
  }); // 165.4

  it('165.5 Negative - create collection with an invalid metadata', async () => {
    let conn, coll;
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

      let t_collname = "soda_test_165_5";
      let options = { metaData: t_metadata };
      coll = await sd.createCollection(t_collname, options);
    } catch(err) {
      // ORA-01918: user \'nonexistent\' does not exist
      should.exist(err);
      (err.message).should.startWith('ORA-01918:');
    } finally {
      should.not.exist(coll);
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  }); // 165.5

  it('165.6 throw error when creating collection with the existing name and different metadata', async () => {
    let conn;
    let collection1, collection2;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let t_metadata1 = {
        "schemaName" : dbconfig.user.toUpperCase(),
        "tableName" : "nodb_tab_164_6",
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
      let t_collname = "soda_test_165_5";
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

      await sodaUtil.assertThrowsAsync(
        async () => await sd.createCollection(t_collname, options2),
        {
          errorNum: 40669,
          offset: 0,
          message: /^ORA-40669/
        }
      );
      // ORA-40669: Collection create failed: collection with same name but different metadata exists.

    } catch(err) {
      should.not.exist(err);
    } finally {
      if (collection1) {
        try {
          await collection1.drop();
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
  }); // 165.6

  it('165.7 Negative - createCollection() when collection name is empty string', async () => {
    let conn, coll;
    try {
      conn = await oracledb.getConnection(dbconfig);
      let sd = conn.getSodaDatabase();

      let collName = "";
      await sodaUtil.assertThrowsAsync(
        async () => await sd.createCollection(collName),
        {
          errorNum: 40658,
          offset: 0,
          message: /^ORA-40658/
        }
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
  }); // 165.7

});