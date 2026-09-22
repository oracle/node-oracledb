// Copyright (c) 2026, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const {
  addDocuments: addDocumentsImpl,
  addVectors: addVectorsImpl,
  insertWithEmbedding: insertWithEmbeddingsImpl,
  deleteByIds
} = require('./vectorRecords.js');
const {
  generateEmbeddings: generateEmbeddingsImpl
} = require('./vectorEmbedding.js');
const {
  createVectorTable: createVectorTableImpl,
  dropTable: dropVectorTable,
  normalizeTableDef
} = require('./vectorSchema.js');
const {search: searchImpl} = require('./vectorSearch.js');
const {
  createVectorIndex: createVectorIndexImpl
} = require('./vectorIndex.js');
const {
  normalizeVectorDistanceType,
  assertPlainObject
} = require('./utils.js');

function isPool(dbSource) {
  return dbSource != null &&
    typeof dbSource.getConnection === 'function';
}

function isConnection(dbSource) {
  return dbSource != null &&
    typeof dbSource.execute === 'function' &&
    typeof dbSource.executeMany === 'function';
}

// Resolve a configured Pool, Connection, or provider function.
// Borrowed pool connections are released by the returned lease;
// directly supplied connections remain caller owned.
async function acquireConnection(dbSource) {
  const resolvedSource = typeof dbSource === 'function'
    ? await dbSource()
    : dbSource;

  if (!isPool(resolvedSource) && !isConnection(resolvedSource)) {
    throw new TypeError(
      'dbSource must be an Oracle Database Pool or Connection.'
    );
  }

  if (isPool(resolvedSource)) {
    const connection = await resolvedSource.getConnection();

    return {
      connection,
      release: async () => {
        await connection.close();
      }
    };
  }

  return {
    connection: resolvedSource,
    release: async () => {}
  };
}

class OracleVecDB {
  /**
   * Provides Oracle Database vector operations.
   *
   * @param options
   * @param {object|Function} options.dbSource - Oracle Database connection, pool,
   *   or a function that returns a Promise resolving to either one.
   * @param {string|{schema: string, name: string}} options.tableName - A simple
   *   table name, or an object specifying a schema qualified table name.
   * @param {object} options.vector - Vector column configuration.
   * @param {number} options.vector.dimensions - Number of vector dimensions.
   * @param {string|{name?: string, annotation?: string}} [options.vector.column]
   *   Vector column name or configuration. Defaults to `embedding`.
   * @param {string} [options.vector.storageFormat='FLOAT32'] - Vector
   *   storage format.
   * @param {string} [options.vector.storageType='DENSE'] - Vector
   *   storage type.
   * @param {object} [options.columns] - Custom table column names.
   * @param {string|{name?: string, annotation?: string}} [options.columns.rowid]
   *   Primary-key column name or configuration. Defaults to `id`.
   * @param {string|{name?: string, annotation?: string}} [options.columns.id]
   *   External-ID column name or configuration. Defaults to `external_id`.
   * @param {string|{name?: string, annotation?: string}} [options.columns.content]
   *   Content column name or configuration. Defaults to `text`.
   * @param {string|{name?: string, annotation?: string}} [options.columns.metadata]
   *   Metadata column name or configuration. Defaults to `metadata`.
   * @param {object} [options.modelParams] - Database embedding model parameters.
   * @param {string} [options.vectorDistanceType] - Vector distance type.
   * @param {string} [options.description] - Database table comment.
   * @param {boolean} [options.quoteIdentifiers] - Whether the configured
   *   identifiers should be quoted and preserved exactly.
   */
  constructor(options) {
    const tableConfig = normalizeTableDef(options);

    this.dbSource = options.dbSource;

    if (options.modelParams != null) {
      assertPlainObject(options.modelParams, 'options.modelParams');
    }

    const storageFormat = tableConfig.vector.storageFormat;

    // If the vector storage format is BINARY, default to HAMMING.
    const defaultDistanceType = storageFormat === 'BINARY'
      ? 'HAMMING'
      : 'COSINE';

    const vectorDistanceType = normalizeVectorDistanceType(
      options.vectorDistanceType ?? defaultDistanceType
    );

    // JACCARD requires BINARY vectors.
    if (vectorDistanceType === 'JACCARD' && storageFormat !== 'BINARY') {
      throw new TypeError(
        'JACCARD distance requires BINARY vector format.'
      );
    }

    this.config = {
      ...tableConfig,
      modelParams: options.modelParams ?? null,
      vectorDistanceType
    };
  }

  // Acquire a connection for one operation. Connections borrowed from a pool
  // are returned afterward and directly supplied connections remain caller owned.
  async _withConnection(fn) {
    const lease = await acquireConnection(this.dbSource);

    try {
      return await fn(lease.connection);
    } finally {
      await lease.release();
    }
  }

  /**
   * Creates the configured vector table if it does not already exist.
   *
   * @returns {Promise<string>} The SQL table identifier.
   */
  createVectorTable() {
    return this._withConnection((connection) =>
      createVectorTableImpl(connection, this.config)
    );
  }

  /**
   * Drops the configured vector table if it exists.
   *
   * @param {boolean} [purge] - Whether to bypass the recycle bin.
   * @returns {Promise<void>} Resolves when the operation completes.
   */
  dropTable(purge = false) {
    return this._withConnection((connection) =>
      dropVectorTable(connection, this.config, purge)
    );
  }

  /**
   * Creates a vector index for the configured vector column.
   *
   * @param options
   * @param {string} options.indexName - Name of the index.
   * @param {object} options.parameters - HNSW- or IVF-specific parameters.
   * @param {string} [options.type='HNSW'] - Index type: `HNSW` or `IVF`.
   * @param {string} [options.partitioningScheme] - Index partitioning scheme.
   * @param {number} [options.accuracy] - Target accuracy from 1 through 100.
   * @param {number} [options.parallel] - Parallel creation degree.
   * @param {string[]} [options.includeColumns] - Additional columns to include.
   * @returns {Promise<void>} Resolves when the index has been created.
   */
  createVectorIndex(options) {
    return this._withConnection((connection) =>
      createVectorIndexImpl(
        connection,
        this.config,
        options
      )
    );
  }

  /**
   * Inserts rows from a source table into the vector table, generating an
   * embedding from each source row's content column.
   *
   * Requires `modelParams` to be configured on this store.
   *
   * @param options
   * @param {string|{schema: string, name: string}} options.sourceTable - Simple
   *   or schema qualified source table name.
   * @param {string} options.idColumn - Source external-ID column.
   * @param {string} options.contentColumn - Source text column to embed.
   * @param {string} [options.metadataColumn] - Source metadata column.
   * @param {boolean} [options.quoteSource=false] - Whether source table
   *   identifiers should be quoted.
   * @param {boolean} [options.autoCommit] - Whether to commit automatically.
   * @returns {Promise<number>} Number of inserted rows.
   */
  insertWithEmbeddings(options) {
    return this._withConnection((connection) =>
      insertWithEmbeddingsImpl(
        connection,
        this.config,
        options
      )
    );
  }

  /**
   * Adds vectors and their associated documents to the configured table.
   *
   * @param vectors - Vectors to store.
   * @param documents - Documents associated with the vectors.
   * @param {string[]} [options.ids] - External document IDs. UUIDs are generated
   *   when IDs are not provided.
   * @param {boolean} [options.upsert] - Whether to update rows whose IDs
   *   already exist.
   * @param {boolean} [options.autoCommit] - Whether to commit automatically.
   * @returns {Promise<string[]>} The supplied or generated document IDs.
   */
  addVectors(vectors, documents, options = {}) {
    return this._withConnection((connection) =>
      addVectorsImpl(
        connection,
        this.config,
        vectors,
        documents,
        options
      )
    );
  }

  /**
   * Generates embeddings for documents and adds them to the configured table.
   *
   * @param documents - Documents to embed and store.
   * @param {string[]} [options.ids] - External document IDs. UUIDs are generated when omitted.
   * @param {boolean} [options.upsert] - Whether to update rows whose IDs already exist.
   * @param {boolean} [options.autoCommit] - Whether to commit automatically.
   * @returns {Promise<string[]>} The supplied or generated document IDs.
   */
  addDocuments(documents, options = {}) {
    return this._withConnection((connection) =>
      addDocumentsImpl(
        connection,
        this.config,
        documents,
        options
      )
    );
  }

  /**
   * Searches for documents similar to a supplied vector or text value.
   *
   * Text search requires configured modelParams
   *
   * @param options
   * @param {object} options.queryBy - Query input. must contain vector or text.
   * @param {vector} [options.queryBy.vector] - Query vector.
   * @param {string} [options.queryBy.text] - Text to embed and use as the query.
   * @param {number} [options.topK] - Maximum number of results to return.
   * @param {number} [options.accuracy] - Target accuracy from 1 through 100.
   * @param {object} [options.filter] - Metadata filter applied to the results.
   * @param {boolean} [options.includeVector] - Whether to include the
   *   stored vector in each result.
   * @returns {Promise<object[]>} Matching documents ordered by distance.
   */
  search(options) {
    return this._withConnection((connection) =>
      searchImpl(connection, this.config, options)
    );
  }

  /**
   * Generates vector embeddings for one or more text values.
   *
   * Requires `modelParams` to be configured on this store.
   *
   * @param {string[]} texts - Non empty text values to embed.
   * @returns {Promise<TypedArray[]>} Generated embeddings in input order.
   */
  generateEmbeddings(texts) {
    return this._withConnection((connection) =>
      generateEmbeddingsImpl(connection, this.config.modelParams, texts)
    );
  }

  /**
   * Deletes documents by external ID, or truncates the table.
   *
   * When `ids` is non empty, only those documents are deleted. Otherwise,
   * `deleteAll: true` truncates the table.
   *
   * @param options
   * @param {string[]} [options.ids] - External document IDs to delete.
   * @param {boolean} [options.deleteAll] - Whether to truncate the table
   *   when no IDs are supplied.
   * @param {boolean} [options.autoCommit] - Whether an ID-based deletion
   *   is committed automatically.
   * @returns {Promise<{message: string}>} A deletion result message.
   */
  delete(options) {
    return this._withConnection((connection) =>
      deleteByIds(connection, this.config, options)
    );
  }
}

module.exports = OracleVecDB;
