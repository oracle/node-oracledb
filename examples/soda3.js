/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   soda3.js
 *
 * DESCRIPTION
 *   Simple Oracle Document Access (SODA) example with extended data types
 *   for JSON.
 *
 *   Requires Oracle Database 18.3 and Oracle Client 23.4, or higher.
 *   The user must have been granted the SODA_APP and CREATE TABLE privileges.
 *   https://node-oracledb.readthedocs.io/en/latest/user_guide/soda.html#sodaoverview
 *
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

// This example requires node-oracledb Thick mode.
//
// Thick mode requires Oracle Client or Oracle Instant Client libraries.  On
// Windows and macOS you can specify the directory containing the
// libraries at runtime or before Node.js starts.  On other platforms (where
// Oracle libraries are available) the system library search path must always
// include the Oracle library path before Node.js starts.  If the search path
// is not correct, you will get a DPI-1047 error.  See the node-oracledb
// installation documentation.
let clientOpts = {};
// On Windows and macOS platforms, set the environment variable
// NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
if (process.platform === 'win32' || process.platform === 'darwin') {
  clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
}
oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode

// The general recommendation for simple SODA usage is to enable autocommit
oracledb.autoCommit = true;

async function run() {
  let connection, collection;

  try {
    let content, doc, res;

    connection = await oracledb.getConnection(dbConfig);
    if (oracledb.oracleClientVersion < 2304000000) {
      throw new Error('This example requires Oracle Client libraries 23.4 or greater');
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
        "name": "ID"
      },
      "contentColumn": {
        "name": "JSON_DOCUMENT"
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
    content = {name: "Matilda", address: {city: "Melbourne"}, age: 38,
      dob: new Date('11-06-1987')};
    console.log("The content to be inserted is:", content);
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
    content = doc.getContentAsBuffer();              // A Buffer
    console.log('Retrieved SODA document as a buffer:');
    console.log(content);
    console.log('SODA Document Version:', doc.version);

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
      const res = await collection.drop();
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
