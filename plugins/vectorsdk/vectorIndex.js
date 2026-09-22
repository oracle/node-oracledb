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

const oracledb = require('oracledb');
const {
  assertIntegerInRange,
  assertNonEmptyString,
  assertOptionalArray,
  assertPlainObject,
  assertPositiveInteger,
  normalizeVectorDistanceType,
  readLobAsString,
  assertDatabaseVersion
} = require('./utils.js');
const {
  renderIdentifier,
  renderQualifiedName
} = require('./vectorSchema.js');


//-----------------------------------------------------------------------------
// createVectorIndex()

// Create the vector index on a database table.
//-----------------------------------------------------------------------------
async function createVectorIndex(connection, tableDef, options) {
  assertPlainObject(options, 'options');

  const {
    tableName,
    vector,
    quoteIdentifiers,
    vectorDistanceType
  } = tableDef;

  const vectorColumn = vector.column;

  if (vector.storageFormat === 'BINARY' &&
      vectorDistanceType !== 'HAMMING' && vectorDistanceType !== 'JACCARD') {
    throw new TypeError(
      'BINARY vector indexes require HAMMING or JACCARD distance.'
    );
  }

  const {
    indexName,
    includeColumns = null,
    partitioningScheme = 'GLOBAL',
    type = 'HNSW',
    accuracy = 90,
    parameters,
    parallel = 1,
  } = options;

  assertNonEmptyString(partitioningScheme, 'options.partitioningScheme');
  assertNonEmptyString(type, 'options.type');
  assertIntegerInRange(accuracy, 'options.accuracy', 1, 100);
  assertPositiveInteger(parallel, 'options.parallel');
  assertOptionalArray(includeColumns, 'options.includeColumns');
  assertPlainObject(parameters, 'options.parameters');

  const indexType = type.trim().toUpperCase();
  if (!['HNSW', 'IVF'].includes(indexType)) {
    throw new TypeError('options.type must be either HNSW or IVF.');
  }

  const organization = indexType === "HNSW"
    ? "INMEMORY NEIGHBOR GRAPH"
    : "NEIGHBOR PARTITIONS";

  const dbParameters = {...parameters, type: indexType};
  const includeColumnsSql = includeColumns == null
    ? null
    : includeColumns.map((name, index) =>
      renderIdentifier(
        name,
        `includeColumns[${index}]`,
        quoteIdentifiers
      )
    ).join(',');
  const binds = {
    index_name: renderIdentifier(
      indexName,
      'indexName',
      quoteIdentifiers
    ),
    table_name: renderQualifiedName(
      tableName,
      'tableName',
      quoteIdentifiers
    ),
    vector_column: renderIdentifier(
      vectorColumn,
      'vectorColumn',
      quoteIdentifiers
    ),
    include_columns: includeColumnsSql,
    partitioning_scheme: partitioningScheme,
    organization,
    distance_metric: normalizeVectorDistanceType(vectorDistanceType),
    accuracy,
    parallel,
    parameters: {
      val: JSON.stringify(dbParameters),
      type: oracledb.DB_TYPE_CLOB
    }
  };

  const plsql = `
    BEGIN
      DBMS_VECTOR.CREATE_INDEX(
        idx_name => :index_name,
        table_name => :table_name,
        idx_vector_col => :vector_column,
        idx_include_cols => :include_columns,
        idx_partitioning_scheme => :partitioning_scheme,
        idx_organization => :organization,
        idx_distance_metric => :distance_metric,
        idx_accuracy => :accuracy,
        idx_parameters => :parameters,
        idx_parallel_creation => :parallel
      );
    END;
  `;

  await connection.execute(plsql, binds);
}

// Return the build status of the vector index associated with this table.
async function getIndexBuildStatus(connection, tableName) {
  assertDatabaseVersion(connection, 'getIndexBuildStatus()');
  const binds = {
    table_name: tableName,
    result: {
      dir: oracledb.BIND_OUT,
      type: oracledb.DB_TYPE_CLOB
    }
  };

  const plsql = `
    BEGIN
      :result := DBMS_VECTOR_DATABASE.INDEX_BUILD_STATUS(
        TABLE_NAME  => :table_name
      );
    END;`;

  const res = await connection.execute(plsql, binds);
  const output = await readLobAsString(res.outBinds.result);
  return JSON.parse(output);
}

module.exports = {createVectorIndex, getIndexBuildStatus};
