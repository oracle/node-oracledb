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

const crypto = require('crypto');
const oracledb = require('oracledb');
const {
  assertOptionalArray,
  assertOptionalBoolean,
  assertPlainObject,
  assertNonEmptyString,
  prepareVector,
  assertNonEmptyArray
} = require('./utils.js');
const {
  renderIdentifier,
  renderQualifiedName
} = require('./vectorSchema.js');
const {generateEmbeddings} = require('./vectorEmbedding.js');

function validateAddOptions(options) {
  assertPlainObject(options, 'options');
  assertOptionalBoolean(options.upsert, 'options.upsert');
  assertOptionalBoolean(options.autoCommit, 'options.autoCommit');

  // Ensure returned IDs refer to committed records.
  if (options.autoCommit != true) {
    throw new TypeError(
      'autoCommit: false is not supported by OracleVecDB operations.'
    );
  }
}

function validateIds(ids, name = 'options.ids') {
  assertOptionalArray(ids, name);

  if (ids != null) {
    ids.forEach((id, index) => {
      resolveVectorId(id, `${name}[${index}]`);
    });
  }
}

function resolveVectorId(id, idPath) {
  assertNonEmptyString(id, idPath);

  if (Buffer.byteLength(id) > 255) {
    throw new TypeError(`${idPath} exceeds 255 bytes.`);
  }

  return id;
}

function prepareInputs(documents, suppliedIds, vectors, vectorDef) {
  assertOptionalArray(suppliedIds, 'options.ids');
  assertNonEmptyArray(documents, 'documents');

  if (vectors != null && vectors.length !== documents.length) {
    throw new TypeError(
      'The number of documents must match the number of vectors.'
    );
  }

  if (suppliedIds != null && suppliedIds.length !== documents.length) {
    throw new TypeError(
      `The number of options.ids must match the number of ${vectors ? 'vectors' : 'documents'}.`
    );
  }

  const ids = new Array(documents.length);
  const texts = vectors == null ? new Array(documents.length) : null;
  const bindRows = new Array(documents.length);

  for (let i = 0; i < documents.length; i++) {
    const document = documents[i];
    const path = `documents[${i}]`;

    assertPlainObject(document, path);
    assertNonEmptyString(document.content, `${path}.content`);
    assertPlainObject(document.metadata, `${path}.metadata`);

    const id = suppliedIds == null
      ? crypto.randomUUID()
      : resolveVectorId(suppliedIds[i], `options.ids[${i}]`);

    ids[i] = id;

    bindRows[i] = {
      id,
      content: document.content,
      metadata: document.metadata
    };

    if (vectors == null) {
      texts[i] = document.content;
    } else {
      bindRows[i].vector = prepareVector(vectors[i], vectorDef);
    }
  }

  return {ids, texts, bindRows};
}

function renderVectorTableIdentifiers(tableDef) {
  return {
    table: renderQualifiedName(
      tableDef.tableName,
      'tableName',
      tableDef.quoteIdentifiers
    ),
    id: renderIdentifier(
      tableDef.columns.id,
      'columns.id',
      tableDef.quoteIdentifiers
    ),
    vector: renderIdentifier(
      tableDef.vector.column,
      'vector.column',
      tableDef.quoteIdentifiers
    ),
    content: renderIdentifier(
      tableDef.columns.content,
      'columns.content',
      tableDef.quoteIdentifiers
    ),
    metadata: renderIdentifier(
      tableDef.columns.metadata,
      'columns.metadata',
      tableDef.quoteIdentifiers
    )
  };
}

function insertSql(tableIdentifiers) {
  const { table, id, vector, content, metadata } = tableIdentifiers;
  return `
    INSERT INTO ${table} (${id}, ${vector}, ${content}, ${metadata})
    VALUES (:id, :vector, :content, :metadata)
  `;
}

function mergeSql(tableIdentifiers) {
  const { table, id, vector, content, metadata } = tableIdentifiers;
  return `
    MERGE INTO ${table} target
    USING (
      SELECT :id AS source_id, :vector AS source_vector,
             :content AS source_content, :metadata AS source_metadata
      FROM DUAL
    ) source
    ON (target.${id} = source.source_id)
    WHEN MATCHED THEN
      UPDATE SET
        target.${vector} = source.source_vector,
        target.${content} = source.source_content,
        target.${metadata} = source.source_metadata
    WHEN NOT MATCHED THEN
      INSERT (${id}, ${vector}, ${content}, ${metadata})
      VALUES (
        source.source_id,
        source.source_vector,
        source.source_content,
        source.source_metadata
      )
  `;
}

async function storeVectors(
  connection,
  tableDef,
  {ids, bindRows},
  options
) {
  const identifiers = renderVectorTableIdentifiers(tableDef);
  const sql = options.upsert
    ? mergeSql(identifiers)
    : insertSql(identifiers);

  await connection.executeMany(sql, bindRows, {
    autoCommit: options.autoCommit,
    bindDefs: {
      id: {type: oracledb.DB_TYPE_VARCHAR, maxSize: 255},
      vector: {type: oracledb.DB_TYPE_VECTOR},
      content: {type: oracledb.DB_TYPE_CLOB},
      metadata: {type: oracledb.DB_TYPE_JSON}
    }
  });

  return ids;
}
//-----------------------------------------------------------------------------
// addVectors()

// Insert supplied vectors or update matching rows in the target table
//-----------------------------------------------------------------------------

function addVectors(
  connection,
  tableDef,
  vectors,
  documents,
  options = {}
) {
  validateAddOptions(options);
  assertNonEmptyArray(vectors, 'vectors');

  const prepared = prepareInputs(
    documents,
    options.ids,
    vectors,
    tableDef.vector
  );

  return storeVectors(
    connection,
    tableDef,
    prepared,
    options
  );
}

//-----------------------------------------------------------------------------
// addDocuments()

// Generate embeddings for documents, then insert or update their rows
//-----------------------------------------------------------------------------

async function addDocuments(
  connection,
  tableDef,
  documents,
  options = {}
) {
  validateAddOptions(options);
  const prepared = prepareInputs(
    documents,
    options.ids,
    null,
    tableDef.vector
  );

  const vectors = await generateEmbeddings(
    connection,
    tableDef.modelParams,
    prepared.texts
  );

  for (let i = 0; i < vectors.length; i++) {
    prepared.bindRows[i].vector =
      prepareVector(vectors[i], tableDef.vector);
  }

  return storeVectors(
    connection,
    tableDef,
    prepared,
    options
  );
}

//-----------------------------------------------------------------------------
// insertWithEmbedding()

// Insert rows with embeddings generated in the database from source table text
//-----------------------------------------------------------------------------

async function insertWithEmbedding(connection, tableDef, options) {
  assertPlainObject(options, 'options');
  assertOptionalBoolean(options.autoCommit, 'options.autoCommit');
  assertOptionalBoolean(options.quoteSource, 'options.quoteSource');

  const quoteSource = options.quoteSource ?? false;
  const { table, id, content, metadata, vector } = renderVectorTableIdentifiers(tableDef);
  const modelParams = tableDef.modelParams;
  assertPlainObject(modelParams, 'modelParams');

  const srcTable = renderQualifiedName(
    options.sourceTable,
    'options.sourceTable',
    quoteSource
  );
  const sourceContentIdentifier = renderIdentifier(
    options.contentColumn,
    'options.contentColumn',
    quoteSource
  );

  const sourceId = renderIdentifier(options.idColumn, 'options.idColumn', quoteSource);
  const sourceMetadata = options.metadataColumn == null
    ? null
    : renderIdentifier(options.metadataColumn, 'options.metadataColumn', quoteSource);

  const insertColumns = [
    id,
    content,
    sourceMetadata && metadata,
    vector
  ].filter(Boolean).join(', ');

  const selectExpressions = [
    sourceId,
    sourceContentIdentifier,
    sourceMetadata,
    `DBMS_VECTOR.UTL_TO_EMBEDDING(
      ${sourceContentIdentifier},
      :model_params
    )`
  ].filter(Boolean).join(', ');

  const sql = `
    INSERT INTO ${table} (${insertColumns})
    SELECT ${selectExpressions}
    FROM ${srcTable}
  `;

  const result = await connection.execute(
    sql,
    {
      model_params: {
        val: modelParams,
        type: oracledb.DB_TYPE_JSON
      }
    },
    { autoCommit: options.autoCommit }
  );

  return result.rowsAffected;
}

//-----------------------------------------------------------------------------
// deleteByIds()

// delete Records by external_id
//-----------------------------------------------------------------------------

async function deleteByIds(connection, tableDef, options) {
  assertPlainObject(options, 'options');
  validateIds(options.ids);
  assertOptionalBoolean(options.deleteAll, 'options.deleteAll');
  assertOptionalBoolean(options.autoCommit, 'options.autoCommit');

  if (options.ids?.length > 0 && options.deleteAll === true) {
    throw new TypeError(
      'options.ids and options.deleteAll cannot be used together.'
    );
  }

  const {table, id} = renderVectorTableIdentifiers(tableDef);
  const deleteAll = options.deleteAll ?? false;

  if (options.ids && options.ids.length > 0) {

    const query = `DELETE FROM ${table} WHERE ${id} = :id`;
    const binds = options.ids.map((value) => ({id: value}));

    const result = await connection.executeMany(query, binds, {
      autoCommit: options.autoCommit,
      bindDefs: {
        id: {
          type: oracledb.DB_TYPE_VARCHAR,
          maxSize: 255
        }
      }
    });

    return {
      message: `Deleted ${result.rowsAffected} vector records`
    };
  // deleteAll cannot be rolled back
  } else if (deleteAll) {
    await connection.execute(`TRUNCATE TABLE ${table}`, []);

    return { message: 'Deleted all vector records' };
  }
}

module.exports = {
  addDocuments,
  addVectors,
  insertWithEmbedding,
  deleteByIds
};
