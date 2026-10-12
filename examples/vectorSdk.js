/* Copyright (c) 2026, Oracle and/or its affiliates. */

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
 *   vectorSdk.js
 *
 * DESCRIPTION
 *   Demonstrates semantic search with the node-oracledb Vector SDK.
 *   Creates a vector store, generates and stores document embeddings,
 *   and searches by text with and without metadata filters.
 *
 * PREREQUISITES
 *   - Oracle AI Database 26ai.
 *   - Configure the database connection as described in examples/README.md.
 *   - Download and extract the 384-dimensional all_MiniLM_L12_v2 ONNX model
 *     into a directory accessible to the database server, such as
 *     /opt/oracle/onnx.
 *
 * DATABASE SETUP
 *
 *   Connect as SYSDBA to the same PDB that this example connects to, then
 *   run the SQL below. Replace testuser with your database username and
 *   /opt/oracle/onnx/ with the model directory on the database server.
 *
 *     CREATE OR REPLACE DIRECTORY model_dir AS '/opt/oracle/onnx/';
 *     GRANT READ, WRITE ON DIRECTORY model_dir TO testuser;
 *     GRANT DB_DEVELOPER_ROLE, CREATE MINING MODEL TO testuser;
 *     ALTER USER testuser QUOTA UNLIMITED ON USERS;
 *
 *   The directory object points to a directory on the database server.
 *   The ONNX file must exist there and be readable by the database process.
 *
 *   HNSW index creation requires sufficient Vector Pool memory.
 *   If the pool has not been configured, have your DBA configure it.
 *   The following is an example for an instance using an SPFILE;
 *   adjust the size for your workload and available memory:
 *
 *     ALTER SYSTEM SET vector_memory_size = 800M SCOPE = SPFILE;
 *     SHUTDOWN IMMEDIATE;
 *     STARTUP;
 *
 * USAGE
 *   Initial setup:
 *     node examples/vectorSdk.js --load-model --add-documents --create-index
 *
 *   Search existing documents:
 *     node examples/vectorSdk.js
 *
 *   Setup flags:
 *     --load-model     Load EMBED_MODEL from MODEL_DIR / MODEL_FILE.
 *     --add-documents  Insert the sample documents using fixed document IDs.
 *     --create-index   Create SDK_IDX_HNSW.
 *
 *   Run only the setup steps that have not already completed.
 *   If setup fails partway through, omit the completed steps when retrying.
 *
 *   Repeating setup flags may fail when the model, document IDs, or index
 *   already exist. This example does not explicitly skip or replace them.
 *****************************************************************************/

'use strict';

Error.stackTraceLimit = 50;

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const {
  OracleVecDB,
  describeModel,
  loadModel
} = require('oracledb/plugins/vectorsdk');

// This example runs in both node-oracledb Thin and Thick modes.
//
// Optionally run in node-oracledb Thick mode
if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {

  // Thick mode requires Oracle Client or Oracle Instant Client libraries.
  // On Windows and macOS you can specify the directory containing the
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
}

console.log(oracledb.thin ? 'Running in thin mode' : 'Running in thick mode');

// Oracle Database directory object name.
const dirName = process.env.MODEL_DIR;

// Model filename within the directory.
const modelFile = process.env.MODEL_FILE;

// Embedding model name
const modelName = 'EMBED_MODEL';

const supportedFlags = new Set([
  '--load-model',
  '--add-documents',
  '--create-index'
]);

const documents = [
  {
    content:
      'Connection pooling lets a Node.js application reuse database ' +
      'connections across requests. Return each connection to the pool after use.',
    metadata: { category: 'database', topic: 'connections' }
  },
  {
    content:
      'A transaction groups database changes. Commit to save them, ' +
      'or roll back to undo changes that have not been committed.',
    metadata: { category: 'database', topic: 'transactions' }
  },
  {
    content:
      'To recover access to your account, request a password reset ' +
      'and follow the instructions sent to your registered email address.',
    metadata: { category: 'account', topic: 'passwords' }
  },
  {
    content:
      'Track your shipment using the tracking number provided ' +
      'in your order confirmation email.',
    metadata: { category: 'orders', topic: 'shipping' }
  }
];

const documentIds = [
  'doc-pooling',
  'doc-transactions',
  'doc-password',
  'doc-shipping'
];

function parseFlags(args) {
  const unknownFlags = args.filter((arg) => !supportedFlags.has(arg));

  if (unknownFlags.length > 0) {
    throw new Error(
      `Unknown arguments: ${unknownFlags.join(', ')}\n` +
      `Supported flags: ${[...supportedFlags].join(', ')}`
    );
  }

  return new Set(args);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  const loadModelFlag = flags.has('--load-model');
  const addDocumentsFlag = flags.has('--add-documents');
  const createIndexFlag = flags.has('--create-index');
  let connection;

  if (loadModelFlag && (!dirName || !modelFile)) {
    throw new Error(
      'Loading the embedding model requires:\n' +
      '  MODEL_DIR\n' +
      '  MODEL_FILE'
    );
  }

  try {
    // Open a standalone database connection.
    connection = await oracledb.getConnection(dbConfig);

    // Load the embedding model when requested.
    if (loadModelFlag) {
      await loadModel(connection, { dirName, modelFile, modelName });

      const model = await describeModel(connection, modelName);
      console.log('Embedding model:', model);
      console.log('Embedding model loaded and inspected successfully.');
    }

    // Configure the vector store.
    const vectorStore = new OracleVecDB({
      dbSource: connection,
      tableName: 'DOCUMENT_VECTORS',
      vector: {
        dimensions: 384,
        storageFormat: 'FLOAT32',
        storageType: 'DENSE'
      },
      vectorDistanceType: 'COSINE',
      modelParams: {
        provider: 'database',
        model: modelName
      }
    });

    // Create the table if it does not already exist.
    await vectorStore.createVectorTable();

    // Generate embeddings and store the documents.
    if (addDocumentsFlag) {
      await vectorStore.addDocuments(documents, {
        ids: documentIds,
        autoCommit: true
      });

      console.log('Documents added successfully.');
    }

    // Create the vector index when requested.
    if (createIndexFlag) {
      await vectorStore.createVectorIndex({
        indexName: 'SDK_IDX_HNSW',
        type: 'HNSW',
        accuracy: 90,
        parameters: {
          neighbors: 16,
          efConstruction: 200
        }
      });

      console.log('Vector index created successfully.');
    }

    const question = 'How can requests share database connections?';
    console.log(`\nQuestion: ${question}`);

    // Search across all categories.
    const results = await vectorStore.search({
      queryBy: { text: question },
      topK: 3,
      accuracy: 90
    });

    console.log('\nClosest matches across all categories:');
    console.log(results);

    // Restrict the search to the database category.
    const databaseResults = await vectorStore.search({
      queryBy: { text: question },
      topK: 3,
      accuracy: 90,
      filter: {
        category: 'database'
      }
    });

    console.log('\nClosest matches in the database category:');
    console.log(
      databaseResults.map(({ id, content, metadata, distance }) => ({
        id,
        content,
        topic: metadata.topic,
        distance
      }))
    );
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Failed to close the connection:', error);
        process.exitCode = 1;
      }
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exitCode = 1;
});
