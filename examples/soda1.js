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
 * NAME
 *   soda1.js
 *
 * DESCRIPTION
 *   Basic Simple Oracle Document Access (SODA) example.
 *
 *   Creates and uses a SODA collection.
 *   Requires Oracle Database and Client 18.3, or higher.
 *   The user must have been granted the SODA_APP privilege.
 *   See https://oracle.github.io/node-oracledb/doc/api.html#sodaoverview
 *
 *   This uses Node 8's async/await syntax but could be rewritten to
 *   use callbacks.
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

// The general recommendation for simple SODA usage is to enable autocommit
oracledb.autoCommit = true;

async function run() {
  let conn, collection;

  try {
    let soda, indexSpec, content, doc, key, documents, res;

    conn = await oracledb.getConnection(dbConfig);

    // Create the parent object for SODA
    soda = conn.getSodaDatabase();

    // Create a new SODA collection and index
    // This will open an existing collection, if the name is already in use.
    collection = await soda.createCollection("mycollection");
    indexSpec = { "name": "CITY_IDX",
      "fields": [ {
        "path": "address.city",
        "datatype": "string",
        "order": "asc" } ] };
    await collection.createIndex(indexSpec);

    // Insert a document.
    // A system generated key is created by default.
    content = {name: "Matilda", address: {city: "Melbourne"}};
    doc = await collection.insertOneAndGet(content);
    key = doc.key;
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
    documents = await collection.find()
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
    if (conn) {
      try {
        await conn.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

run();
