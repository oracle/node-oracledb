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
const { renderIdentifier, renderQualifiedName } = require('./vectorSchema.js');
const { generateEmbeddings } = require('./vectorEmbedding.js');
const {
  assertIntegerInRange,
  assertNonEmptyString,
  assertOptionalBoolean,
  assertOptionalPlainObject,
  assertPlainObject,
  assertPositiveInteger,
  isPlainObject,
  prepareVector,
  normalizeVectorDistanceType
} = require('./utils.js');

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------
// Field values may be scalars, shorthand arrays, or an object of comparison
// operators. Logical operators are valid only as a complete filter node.
const COMPARISON_OPERATORS = new Set([
  '$between',
  '$eq',
  '$exists',
  '$gt',
  '$gte',
  '$in',
  '$like',
  '$lt',
  '$lte',
  '$ne',
  '$nin'
]);
const LOGICAL_OPERATORS = new Set(['$and', '$or']);

// Field names are embedded in JSON path literals. Restrict them to dotted,
// unquoted identifiers rather than accepting arbitrary JSON path syntax.
const JSON_PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;

//-----------------------------------------------------------------------------
// Metadata filter primitives
//-----------------------------------------------------------------------------
// Metadata comparisons accept JSON scalars. Ordered comparisons exclude null
// and booleans because JSON path ordering is defined only for strings/numbers.
function assertScalar(value, label, orderedOnly = false) {
  const type = typeof value;
  const isOrdered = type === 'string' ||
    (type === 'number' && Number.isFinite(value));

  const valid = orderedOnly
    ? isOrdered
    : value === null || type === 'boolean' || isOrdered;

  if (!valid) {
    const expected = orderedOnly
      ? 'a string or finite number'
      : 'a JSON scalar';

    throw new TypeError(`${label} must be ${expected}`);
  }
}

// Unquoted JSON field name may contain only letters and digits. Names
// containing _ must be double quoted.
function validatePath(path) {
  if (typeof path !== 'string' || !JSON_PATH_RE.test(path)) {
    throw new Error(`Invalid metadata filter path: ${JSON.stringify(path)}`);
  }

  return '$.' + path
    .split('.')
    .map(part => `"${part}"`)
    .join('.');
}

function newBind(state, value) {
  state.bindCount++;

  const name = `vf_${state.bindCount}`;
  state.binds[name] = value;
  // PASSING makes this SQL bind available to the JSON path as $vf_<n>.
  return {
    passing: `:${name} AS "${name}"`,
    variable: `$${name}`
  };
}

function renderOperand(state, value) {
  // These literals are safe to embed. Strings and numbers remain binds so they
  // cannot alter the JSON path expression.
  if (value === null) {
    return { expression: 'null', passedValues: [] };
  }
  if (typeof value === 'boolean') {
    return { expression: String(value), passedValues: [] };
  }

  const bind = newBind(state, value);
  return {
    expression: bind.variable,
    passedValues: [bind.passing]
  };
}

function jsonExists(state, path, predicate = null, passedValues = []) {
  const jsonPath = predicate === null ? path : `${path}?(${predicate})`;
  const passing = passedValues.length === 0
    ? ''
    : ` PASSING ${passedValues.join(', ')}`;
  const condition = `JSON_EXISTS(${state.metadataColumnSql}, ` +
    `'${jsonPath}'${passing})`;
  return `(${condition})`;
}

//-----------------------------------------------------------------------------
// Metadata comparison generation
//-----------------------------------------------------------------------------
function generateComparison(state, path, operator, operand, label) {
  if (!COMPARISON_OPERATORS.has(operator)) {
    throw new Error(`Unsupported metadata filter operator: ${operator}`);
  }

  if (operator === '$exists') {
    if (typeof operand !== 'boolean') {
      throw new TypeError(`${label} must be a boolean`);
    }
    const condition = jsonExists(state, path);
    return operand ? condition : `NOT (${condition})`;
  }

  // Build a single JSON_EXISTS predicate for all $in/$nin operands
  if (operator === '$in' || operator === '$nin') {
    if (!Array.isArray(operand) || operand.length === 0) {
      throw new TypeError(`${label} must be a non-empty array`);
    }

    const predicates = [];
    const passedValues = [];

    for (let index = 0; index < operand.length; index += 1) {
      const value = operand[index];

      assertScalar(value, `${label}[${index}]`);

      const comparison = renderOperand(state, value);

      predicates.push(`@ == ${comparison.expression}`);
      passedValues.push(...comparison.passedValues);
    }

    const condition = jsonExists(
      state,
      path,
      predicates.join(' || '),
      passedValues
    );

    return operator === '$in'
      ? condition
      : `NOT (${condition})`;
  }

  if (operator === '$like') {
    if (typeof operand !== 'string') {
      throw new TypeError(`${label} must be a string`);
    }
    const pattern = newBind(state, operand);
    return jsonExists(
      state,
      path,
      `@ like ${pattern.variable}`,
      [pattern.passing]
    );
  }

  if (operator === '$between') {
    if (!Array.isArray(operand) || operand.length !== 2) {
      throw new TypeError(`${label} must be a two-item array`);
    }
    assertScalar(operand[0], `${label}[0]`, true);
    assertScalar(operand[1], `${label}[1]`, true);
    if (typeof operand[0] !== typeof operand[1]) {
      throw new TypeError(`${label} values must have the same type`);
    }

    const low = newBind(state, operand[0]);
    const high = newBind(state, operand[1]);
    return jsonExists(
      state,
      path,
      `@ >= ${low.variable} && @ <= ${high.variable}`,
      [low.passing, high.passing]
    );
  }

  const sqlOperators = {
    '$eq': '==',
    '$gt': '>',
    '$gte': '>=',
    '$lt': '<',
    '$lte': '<=',
    '$ne': '=='
  };
  const orderedOnly = !['$eq', '$ne'].includes(operator);
  assertScalar(operand, label, orderedOnly);
  const comparison = renderOperand(state, operand);
  const condition = jsonExists(
    state,
    path,
    `@ ${sqlOperators[operator]} ${comparison.expression}`,
    comparison.passedValues
  );
  return operator === '$ne' ? `NOT (${condition})` : condition;
}

function parseFieldOperators(state, path, operators, label) {
  const conditions = [];
  for (const [operator, operand] of Object.entries(operators)) {
    if (!operator.startsWith('$')) {
      throw new Error(
        `${label} must contain metadata filter operators, not nested values`
      );
    }
    conditions.push(generateComparison(
      state,
      path,
      operator,
      operand,
      `${label}.${operator}`
    ));
  }
  return conditions.length === 1
    ? conditions[0]
    : `(${conditions.join(' AND ')})`;
}

function parseField(state, field, value) {
  const path = validatePath(field);

  // A scalar means equality; an array is shorthand for $in; a plain object
  // supplies one or more comparison operators for this field.
  if (Array.isArray(value)) {
    return generateComparison(
      state,
      path,
      '$in',
      value,
      `filter.${field}`
    );
  }
  if (isPlainObject(value)) {
    if (Object.keys(value).length === 0) {
      throw new Error(`Metadata filter field ${field} cannot be empty`);
    }
    return parseFieldOperators(state, path, value, `filter.${field}`);
  }

  return generateComparison(
    state,
    path,
    '$eq',
    value,
    `filter.${field}`
  );
}

//-----------------------------------------------------------------------------
// Metadata filter tree parsing
//-----------------------------------------------------------------------------
function parseLogical(state, operator, operand) {
  if (!Array.isArray(operand) || operand.length === 0) {
    throw new TypeError(`filter.${operator} must be a non-empty array`);
  }
  const conditions = operand.map((condition, index) => {
    assertPlainObject(condition, `filter.${operator}[${index}]`);
    if (Object.keys(condition).length === 0) {
      throw new Error(`filter.${operator}[${index}] cannot be empty`);
    }
    return parseMapping(state, condition);
  });
  // The grouping preserves the caller's explicitly requested logical scope.
  const joiner = operator === '$and' ? ' AND ' : ' OR ';
  return `(${conditions.join(joiner)})`;
}

function parseMapping(state, filter) {
  assertPlainObject(filter, 'filter');

  const keys = Object.keys(filter);
  if (keys.length === 0) {
    throw new Error('Metadata filter nodes cannot be empty');
  }

  for (const operator of keys) {
    if (!operator.startsWith('$')) {
      continue;
    }

    if (keys.length !== 1) {
      throw new Error(
        'A logical metadata filter node must contain exactly one logical operator'
      );
    }

    if (!LOGICAL_OPERATORS.has(operator)) {
      throw new Error(
        `Unsupported logical metadata filter operator: ${operator}`
      );
    }

    return parseLogical(state, operator, filter[operator]);
  }

  const conditions = new Array(keys.length);

  for (let index = 0; index < keys.length; index += 1) {
    const field = keys[index];
    conditions[index] = parseField(state, field, filter[field]);
  }

  // Multiple fields in one filter node form an implicit conjunction.
  return conditions.length === 1
    ? conditions[0]
    : `(${conditions.join(' AND ')})`;
}

function compileMetadataFilter(filter, options) {
  assertPlainObject(filter, 'filter');
  assertPlainObject(options, 'metadata filter options');

  const state = {
    bindCount: 0,
    binds: {},
    metadataColumnSql: renderIdentifier(
      options.metadataColumn,
      'metadataColumn',
      options.quoteIdentifiers ?? false
    )
  };

  return {
    clause: parseMapping(state, filter),
    binds: state.binds
  };
}

//-----------------------------------------------------------------------------
// Search option normalization
//-----------------------------------------------------------------------------
function normalizeQueryOptions(config, options) {
  assertPlainObject(options, 'options');
  assertPlainObject(options.queryBy, 'options.queryBy');

  const queryModes = ['vector', 'text'].filter((key) =>
    Object.prototype.hasOwnProperty.call(options.queryBy, key));
  if (queryModes.length !== 1) {
    throw new TypeError(
      'options.queryBy must contain exactly one of: vector, text.'
    );
  }

  const topK = options.topK ?? 5;
  assertPositiveInteger(topK, 'options.topK');

  if (options.accuracy != null) {
    assertIntegerInRange(options.accuracy, 'options.accuracy', 1, 100);
  }
  assertOptionalPlainObject(options.filter, 'options.filter');
  assertOptionalBoolean(options.includeVector, 'options.includeVector');
  const normalized = {
    queryMode: queryModes[0],
    topK,
    filter: options.filter,
    vectorDistanceType: config.vectorDistanceType,
    accuracy: options.accuracy,
    includeVector: options.includeVector ?? false
  };

  if (normalized.queryMode === 'vector') {
    normalized.queryVector = options.queryBy.vector;
    return normalized;
  }

  assertNonEmptyString(options.queryBy.text, 'options.queryBy.text');
  normalized.queryText = options.queryBy.text;
  normalized.modelParams = config.modelParams;
  assertPlainObject(normalized.modelParams, 'modelParams');

  return normalized;
}

//-----------------------------------------------------------------------------
// Search SQL and result helpers
//-----------------------------------------------------------------------------
function getExecuteOptions(config) {
  const contentColumn = config.quoteIdentifiers
    ? config.columns.content
    : config.columns.content.toUpperCase();

  return {
    outFormat: oracledb.OUT_FORMAT_ARRAY,
    fetchInfo: {
      [contentColumn]: { type: oracledb.DB_TYPE_VARCHAR }
    }
  };
}

function mapRows(rows, outputColumns) {
  return rows.map((values) => {
    const row = {};

    for (let index = 0; index < outputColumns.length; index += 1) {
      const value = values[index];
      row[outputColumns[index]] = Buffer.isBuffer(value)
        ? value.toString('hex')
        : value;
    }

    row.distance = values[outputColumns.length];
    return row;
  });
}

//-----------------------------------------------------------------------------
// search()

// Search for vectors similar to the supplied vector or text query. Set
// options.includeVector to return the stored embedding with each result.
//-----------------------------------------------------------------------------
async function search(connection, config, options) {
  const normalized = normalizeQueryOptions(config, options);
  const table = renderQualifiedName(
    config.tableName,
    'tableName',
    config.quoteIdentifiers
  );
  const vectorColumn = renderIdentifier(
    config.vector.column,
    'vector.column',
    config.quoteIdentifiers
  );
  const metric = normalizeVectorDistanceType(normalized.vectorDistanceType);
  const filter = normalized.filter;
  const hasFilter = filter != null && Object.keys(filter).length > 0;

  const compiledFilter = hasFilter
    ? compileMetadataFilter(filter, {
      metadataColumn: config.columns.metadata,
      quoteIdentifiers: config.quoteIdentifiers
    })
    : { clause: '', binds: {} };

  const rawVector = normalized.queryMode === 'text'
    ? (await generateEmbeddings(
      connection,
      normalized.modelParams,
      [normalized.queryText]
    ))[0]
    : normalized.queryVector;
  const vector = prepareVector(rawVector, config.vector);
  const binds = {
    vector: { val: vector, type: oracledb.DB_TYPE_VECTOR },
    top_k: normalized.topK,
    ...compiledFilter.binds
  };

  const resultColumns = [
    config.columns.id,
    config.columns.content,
    config.columns.metadata
  ];

  const outputColumns = ['id', 'content', 'metadata'];

  if (normalized.includeVector) {
    resultColumns.push(config.vector.column);
    outputColumns.push('vector');
  }

  const projection = resultColumns.map((column) =>
    renderIdentifier(column, 'resultColumns', config.quoteIdentifiers)
  ).join(', ');

  const selectClause = !hasFilter
    ? `SELECT /*+ VECTOR_INDEX_TRANSFORM(${table}) */`
    : "SELECT";

  let sql = `
    ${selectClause} ${projection},
           VECTOR_DISTANCE(${vectorColumn}, :vector, ${metric}) AS distance
    FROM ${table}
  `;
  if (hasFilter) {
    sql += ` WHERE ${compiledFilter.clause}`;
  }
  sql += ` ORDER BY distance FETCH APPROX` + ' FIRST :top_k ROWS ONLY';
  if (normalized.accuracy != null) {
    binds.accuracy = normalized.accuracy;
    sql += ' WITH TARGET ACCURACY :accuracy';
  }

  const result = await connection.execute(
    sql,
    binds,
    getExecuteOptions(config)
  );
  return mapRows(result.rows, outputColumns);
}

module.exports = { search };
