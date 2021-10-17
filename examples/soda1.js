/* Copyright (c) 2018, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   soda1.js
 *
 * DESCRIPTION
 *   Basic Simple Oracle Document Access (SODA) example.
 *
 *   Requires Oracle Database and Client 18.3, or higher.
 *   The user must have been granted the SODA_APP and CREATE TABLE privileges.
 *   See https://oracle.github.io/node-oracledb/doc/api.html#sodaoverview
 *
 *   This example requires node-oracledb 3.0 or later.
 *
 *   This example uses Node 8's async/await syntax.
 *
 *****************************************************************************/

const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// On Windows and macOS, you can specify the directory containing the Oracle
// Client Libraries at runtime, or before Node.js starts.  On other platforms
// the system library search path must always be set before Node.js is started.
// See the node-oracledb installation documentation.
// If the search path is not correct, you will get a DPI-1047 error.
let libPath;
if (process.platform === 'win32') {           // Windows
  libPath = 'C:\\oracle\\instantclient_19_12';
} else if (process.platform === 'darwin') {   // macOS
  libPath = process.env.HOME + '/Downloads/instantclient_19_8';
}
if (libPath && fs.existsSync(libPath)) {
  oracledb.initOracleClient({ libDir: libPath });
}

// The general recommendation for simple SODA usage is to enable autocommit
oracledb.autoCommit = true;

async function run() {
  let connection, collection;

  try {
    let content, doc, res;

    connection = await oracledb.getConnection(dbConfig);
    if (oracledb.oracleClientVersion < 1803000000) {
      throw new Error('node-oracledb SODA requires Oracle Client libraries 18.3 or greater');
    }

    if (connection.oracleServerVersion < 1803000000) {
      throw new Error('node-oracledb SODA requires Oracle Database 18.3 or greater');
    }

    // Create the parent object for SODA
    const soda = connection.getSodaDatabase();

    // Explicit metadata is used for maximum version portability.
    // Refer to the documentation.
    const md = {
      "keyColumn": {
        "name":"ID"
      },
      "contentColumn": {
        "name": "JSON_DOCUMENT",
        "sqlType": "BLOB"
      },
      "versionColumn": {
        "name": "VERSION",
        "method": "UUID"
      },
      "lastModifiedColumn": {
        "name": "LAST_MODIFIED"
      },
      "creationTimeColumn": {
        "name": "CREATED_ON"
      }
    };

    // Create a new SODA collection and index
    // This will open an existing collection, if the name is already in use.
    collection = await soda.createCollection("mycollection", { metaData: md });
    const indexSpec = { "name": "CITY_IDX",
      "fields": [ {
        "path": "address.city",
        "datatype": "string",
        "order": "asc" } ] };
    await collection.createIndex(indexSpec);

    // Insert a document.
    // A system generated key is created by default.
    content = {name: "Matilda", address: {city: "Melbourne"}};
    doc = await collection.insertOneAndGet(content);
    const key = doc.key;
    console.log("The key of the new SODA document is: ", key);

    // Fetch the document back
    doc = await collection.find().key(key).getOne(); // A SodaDocument
    content = doc.getContent();                      // A JavaScript object
    console.log('Retrieved SODA document as an object:');
    console.log(content);
    content = doc.getContentAsString();              // A JSON string
    console.log('Retrieved SODA document as a string:');
    console.log(content);

    // Replace document contents
    content = {name: "Matilda", address: {city: "Sydney"}};
    await collection.find().key(key).replaceOne(content);

    // Insert some more documents without caring about their keys
    content = {name: "Venkat", address: {city: "Bengaluru"}};
    await collection.insertOne(content);
    content = {name: "May", address: {city: "London"}};
    await collection.insertOne(content);
    content = {name: "Sally-Ann", address: {city: "San Francisco"}};
    await collection.insertOne(content);

    // Find all documents with city names starting with 'S'
    console.log('Cities starting with S');
    const documents = await collection.find()
      .filter({"address.city": {"$like": "S%"}})
      .getDocuments();

    for (let i = 0; i < documents.length; i++) {
      content = documents[i].getContent();
      console.log('  city is: ', content.address.city);
    }

    // Count all documents
    res = await collection.find().count();
    console.log('Collection has ' + res.count + ' documents');

    // Remove documents with cities containing 'o'
    console.log('Removing documents');
    res = await collection.find().filter({"address.city": {"$regex": ".*o.*"}}).remove();
    console.log('Dropped ' + res.count + ' documents');

    // Count all documents
    res = await collection.find().count();
    console.log('Collection has ' + res.count + ' documents');

  } catch (err) {
    console.error(err);
  } finally {
    if (collection) {
      // Drop the collection
      let res = await collection.drop();
      if (res.dropped) {
        console.log('Collection was dropped');
      }
    }
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();
