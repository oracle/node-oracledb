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
  isSimpleSqlName,
  enquoteName
} = require('oracledb');

const {
  assertNonEmptyString,
  assertPlainObject,
  assertOptionalBoolean,
  assertBoolean
} = require('./utils');

//-----------------------------------------------------------------------------
// Constants and defaults
//-----------------------------------------------------------------------------
const VECTOR_STORAGE_FORMATS = new Set([
  '*',
  'BINARY',
  'FLOAT32',
  'FLOAT64',
  'INT8'
]);

const VECTOR_STORAGE_TYPES = new Set([
  'DENSE',
  'SPARSE'
]);

const DEFAULT_COLUMNS = {
  rowid: 'id',
  id: 'external_id',
  content: 'text',
  metadata: 'metadata'
};

//-----------------------------------------------------------------------------
// Identifier normalization and rendering
//-----------------------------------------------------------------------------
function normalizeIdentifier(
  value,
  label,
  quoteIdentifiers = false
) {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string`);
  }

  if (value.includes('"')) {
    throw new TypeError(`${label} must not include double quotes`);
  }

  if (quoteIdentifiers) {
    if (value.length === 0) {
      throw new TypeError(`${label} must not be empty`);
    }

    if (value.includes('\0')) {
      throw new TypeError(`${label} must not include the null character`);
    }

    return value;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new TypeError(`${label} must not be empty`);
  }

  if (!isSimpleSqlName(normalized)) {
    throw new TypeError(`${label} contains invalid characters`);
  }

  return normalized;
}

function normalizeTableName(value, label, quoteIdentifiers = false) {
  if (typeof value === 'string') {
    return normalizeIdentifier(value, label, quoteIdentifiers);
  }

  assertPlainObject(value, label);
  return {
    schema: normalizeIdentifier(
      value.schema,
      `${label}.schema`,
      quoteIdentifiers
    ),
    name: normalizeIdentifier(
      value.name,
      `${label}.name`,
      quoteIdentifiers
    )
  };
}

function renderIdentifier(value, label, quoteIdentifiers = false) {
  const name = normalizeIdentifier(
    value,
    label,
    quoteIdentifiers
  );

  return quoteIdentifiers ? enquoteName(name, false) : name;
}

function renderQualifiedName(tableName, label, quoteIdentifiers = false) {
  if (typeof tableName === 'string') {
    return renderIdentifier(tableName, label, quoteIdentifiers);
  }

  assertPlainObject(tableName, label);
  const schema = renderIdentifier(
    tableName.schema,
    `${label}.schema`,
    quoteIdentifiers
  );

  const name = renderIdentifier(
    tableName.name,
    `${label}.name`,
    quoteIdentifiers
  );

  return `${schema}.${name}`;
}

function escapeSingleQuotes(value) {
  return value.replace(/'/g, "''");
}

//-----------------------------------------------------------------------------
// Definition normalization
//-----------------------------------------------------------------------------
function normalizeVectorStorageFormat(storageFormat, dimensions) {
  if (storageFormat == null) {
    return 'FLOAT32';
  }
  const value = String(storageFormat).trim().toUpperCase();
  if (!VECTOR_STORAGE_FORMATS.has(value)) {
    throw new TypeError(
      `Vector storage format must be one of: ${[...VECTOR_STORAGE_FORMATS].join(', ')}`
    );
  }
  if (value === 'BINARY' && dimensions % 8 !== 0) {
    throw new TypeError(
      'BINARY vector format requires dimensions to be a multiple of 8'
    );
  }
  return value;
}

function normalizeVectorStorageType(storageType) {
  if (storageType == null) {
    return 'DENSE';
  }
  const value = String(storageType).trim().toUpperCase();
  if (!VECTOR_STORAGE_TYPES.has(value)) {
    throw new TypeError(
      `Vector storage type must be one of: ${[...VECTOR_STORAGE_TYPES].join(', ')}`
    );
  }
  return value;
}

function normalizeVectorDef(vector) {
  if (vector === null || typeof vector !== 'object' || Array.isArray(vector)) {
    throw new TypeError('vector must be an object.');
  }

  const { dimensions } = vector;
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new TypeError(
      'vector.dimensions must be a positive integer.'
    );
  }

  const storageFormat = normalizeVectorStorageFormat(
    vector.storageFormat,
    dimensions
  );
  const storageType = normalizeVectorStorageType(vector.storageType);

  // node-oracledb does not currently support BINARY values with SPARSE storage.
  if (storageType === 'SPARSE' && storageFormat === 'BINARY') {
    throw new TypeError(
      'BINARY format is not supported for SPARSE vectors.'
    );
  }

  return { dimensions, storageFormat, storageType };
}

function normalizeColumn(column, defaultName, label, quoteIdentifiers) {
  if (column == null || typeof column === 'string') {
    return {
      name: normalizeIdentifier(
        column ?? defaultName,
        label,
        quoteIdentifiers
      ),
      annotation: null
    };
  }

  assertPlainObject(column, label);
  const name = normalizeIdentifier(column.name ?? defaultName, `${label}.name`, quoteIdentifiers);
  let annotation = null;
  if (column.annotation != null) {
    assertNonEmptyString(column.annotation, `${label}.annotation`);
    annotation = column.annotation.trim();
  }
  return {name, annotation};
}

// Validate table options and normalize the configured column identifiers.
function normalizeTableDef(options) {
  assertPlainObject(options, 'options');
  assertOptionalBoolean(options.quoteIdentifiers, 'options.quoteIdentifiers');

  const quoteIdentifiers = options.quoteIdentifiers ?? false;
  const tableName = normalizeTableName(
    options.tableName,
    'tableName',
    quoteIdentifiers
  );
  const rawColumns = options.columns ?? {};
  assertPlainObject(rawColumns, 'options.columns');

  const rawVector = options.vector;
  const vectorDefinition = normalizeVectorDef(rawVector);
  const vector = {...vectorDefinition};
  const columns = {};
  const annotations = {};
  // The name "distance" is reserved for vector search results.
  const usedNames = new Set(['DISTANCE', 'distance']);
  const columnConfigs = [
    ['rowid', rawColumns.rowid, DEFAULT_COLUMNS.rowid, 'columns.rowid'],
    ['id', rawColumns.id, DEFAULT_COLUMNS.id, 'columns.id'],
    ['content', rawColumns.content, DEFAULT_COLUMNS.content, 'columns.content'],
    ['metadata', rawColumns.metadata, DEFAULT_COLUMNS.metadata, 'columns.metadata'],
    ['vector', rawVector.column, 'embedding', 'vector.column']
  ];

  for (const [key, rawColumn, defaultName, label] of columnConfigs) {
    const column = normalizeColumn(rawColumn, defaultName, label, quoteIdentifiers);
    const lookupName = quoteIdentifiers ? column.name : column.name.toUpperCase();
    if (usedNames.has(lookupName)) {
      throw new TypeError(`${label} duplicates another generated column name.`);
    }
    usedNames.add(lookupName);
    if (key === 'vector') {
      vector.column = column.name;
    } else {
      columns[key] = column.name;
    }
    if (column.annotation != null) {
      annotations[column.name] = column.annotation;
    }
  }

  if (options.description != null) {
    assertNonEmptyString(options.description, 'options.description');
  }
  const description = options.description?.trim() ?? null;
  return {
    tableName,
    columns,
    vector,
    description,
    annotations,
    quoteIdentifiers
  };
}

//-----------------------------------------------------------------------------
// SQL generation
//-----------------------------------------------------------------------------
function buildVectorType(vector) {
  const sparse = vector.storageType === 'SPARSE' ? ', SPARSE' : '';
  return `VECTOR(${vector.dimensions}, ${vector.storageFormat}${sparse})`;
}

function buildColumnDefinitions(definition) {
  const { columns, quoteIdentifiers, vector } = definition;
  return [
    [columns.rowid, 'RAW(16) DEFAULT SYS_GUID() PRIMARY KEY'],
    [columns.id, 'VARCHAR2(255) UNIQUE'],
    [vector.column, buildVectorType(vector)],
    [columns.content, 'CLOB'],
    [columns.metadata, 'JSON']
  ].map(([name, type]) =>
    `${renderIdentifier(name, 'columnName', quoteIdentifiers)} ${type}`);
}

function buildCommentStatements(definition, sqlTableName) {
  const { annotations, description, quoteIdentifiers } = definition;
  const statements = [];

  if (description != null) {
    statements.push(
      `COMMENT ON TABLE ${sqlTableName} IS ` +
      `'${escapeSingleQuotes(description)}'`
    );
  }

  for (const [columnName, comment] of Object.entries(annotations ?? {})) {
    const sqlColumnName = renderIdentifier(
      columnName,
      'annotation column',
      quoteIdentifiers
    );
    statements.push(
      `COMMENT ON COLUMN ${sqlTableName}.${sqlColumnName} IS ` +
      `'${escapeSingleQuotes(comment)}'`
    );
  }

  return statements;
}

//-----------------------------------------------------------------------------
// dropTable()

// Drop vector table.
//-----------------------------------------------------------------------------
async function dropTable(
  connection,
  definition,
  purge = false
) {
  assertBoolean(purge, 'purge');
  const sqlTableName = renderQualifiedName(
    definition.tableName,
    'tableName',
    definition.quoteIdentifiers
  );

  const ddl = `DROP TABLE IF EXISTS ${sqlTableName}${purge ? ' PURGE' : ''}`;
  await connection.execute(ddl);
}

//-----------------------------------------------------------------------------
// createVectorTable()

// Create the vector-ready table if it does not exist.
//-----------------------------------------------------------------------------
async function createVectorTable(connection, definition) {
  const sqlTableName = renderQualifiedName(
    definition.tableName,
    'tableName',
    definition.quoteIdentifiers
  );

  const columnDefinitions = buildColumnDefinitions(definition);
  const sqlStatement =
    `CREATE TABLE IF NOT EXISTS ${sqlTableName} (${columnDefinitions.join(', ')})`;
  const statements = [
    sqlStatement,
    ...buildCommentStatements(definition, sqlTableName)
  ].map((statement) =>
    `EXECUTE IMMEDIATE '${escapeSingleQuotes(statement)}';`);

  await connection.execute(`
    BEGIN
      ${statements.join('\n      ')}
    END;
  `);

  return sqlTableName;
}

module.exports = {
  createVectorTable,
  dropTable,
  normalizeIdentifier,
  normalizeTableDef,
  renderIdentifier,
  renderQualifiedName
};
