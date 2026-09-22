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

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------
const DISTANCE_METRICS = new Set([
  'COSINE',
  'EUCLIDEAN',
  'MANHATTAN',
  'HAMMING',
  'JACCARD',
  'DOT',
  'L2_SQUARED',
  'EUCLIDEAN_SQUARED'
]);

//-----------------------------------------------------------------------------
// Distance metric
//-----------------------------------------------------------------------------
function normalizeVectorDistanceType(vectorDistanceType) {
  if (vectorDistanceType == null) {
    return null;
  }
  const metric = String(vectorDistanceType).trim().toUpperCase();
  if (!DISTANCE_METRICS.has(metric)) {
    throw new TypeError(
      `Distance Metric must be one of: ${[...DISTANCE_METRICS].join(', ')}`
    );
  }
  return metric;
}

//-----------------------------------------------------------------------------
// Assertions
//-----------------------------------------------------------------------------
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  // Accepts only ordinary objects, reject class instances and built-in objects
  // such as Date, Map, and Set
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

function assertPlainObject(value, name) {
  assertCondition(
    isPlainObject(value),
    `${name} must be an object.`
  );
}

function assertOptionalPlainObject(value, name) {
  if (value != null) {
    assertPlainObject(value, name);
  }
}

function assertBoolean(value, name) {
  assertCondition(
    typeof value === 'boolean',
    `${name} must be a boolean.`
  );
}

function assertOptionalBoolean(value, name) {
  if (value !== undefined) {
    assertBoolean(value, name);
  }
}

function assertNonEmptyString(value, name) {
  assertCondition(
    typeof value === 'string' && value.trim() !== '',
    `${name} must be a non-empty string.`
  );
}

function assertPositiveInteger(value, name) {
  assertCondition(
    Number.isInteger(value) && value > 0,
    `${name} must be a positive integer.`
  );
}

function assertIntegerInRange(value, name, min, max) {
  assertCondition(
    Number.isInteger(value) && value >= min && value <= max,
    `${name} must be an integer between ${min} and ${max}.`
  );
}

function assertArray(value, name) {
  assertCondition(
    Array.isArray(value),
    `${name} must be an array.`
  );
}

function assertNonEmptyArray(value, name) {
  assertCondition(
    Array.isArray(value) && value.length > 0,
    `${name} must be a non-empty array.`
  );
}

function assertOptionalArray(value, name) {
  if (value != null) {
    assertArray(value, name);
  }
}

//-----------------------------------------------------------------------------
// Database helpers
//-----------------------------------------------------------------------------
async function readLobAsString(value) {
  // CLOB output may already be materialized or may expose the Lob getData API.
  if (value == null || typeof value === 'string') return value;
  if (typeof value.getData !== 'function') {
    throw new Error(
      'Expected a CLOB LOB or string value from Oracle Database.'
    );
  }
  try {
    return await value.getData();
  } finally {
    value.destroy();
  }
}

function assertDatabaseVersion(connection, label) {
  // oracleServerVersion encodes 23.26.2.0.0 as 2326020000.
  if (connection.oracleServerVersion < 2326020000) {
    throw new Error(
      `${label} requires Oracle Database 23.26.2.0.0 or later.`
    );
  }
}

//-----------------------------------------------------------------------------
// Vector preparation
//-----------------------------------------------------------------------------
function isVectorValue(value) {
  return (value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof Int8Array || (Object.getPrototypeOf(value)
      === Uint8Array.prototype) || value instanceof oracledb.SparseVector);
}

function assertDimensions(vector, definition) {
  const dimensions = vector instanceof oracledb.SparseVector
    ? vector.numDimensions
    : vector.length;

  if (dimensions !== definition.dimensions) {
    throw new TypeError(
      `Vector dimensions must be ${definition.dimensions}; ` +
      `received ${dimensions}`
    );
  }
}

function convertInt8(values) {
  const converted = new Int8Array(values.length);

  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Vector value at index ${index} must be finite.`
      );
    }

    const rounded = Math.round(value);
    if (rounded < -128 || rounded > 127) {
      throw new TypeError(
        `INT8 vector value at index ${index} must be within [-128, 127].`
      );
    }
    converted[index] = rounded;
  }

  return converted;
}

function packBinaryVector(values, dimensions) {
  if (values.length !== dimensions) {
    throw new TypeError(
      `Vector dimensions must be ${dimensions}; received ${values.length}`
    );
  }

  const packed = new Uint8Array(dimensions / 8);

  for (let index = 0; index < dimensions; index++) {
    const value = values[index];

    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Vector value at index ${index} must be finite.`
      );
    }

    // Pack positive dimensions as one, from the most significant bit to the
    // least significant bit within each byte.
    if (value > 0) {
      packed[index >> 3] |= 1 << (7 - (index & 7));
    }
  }

  return packed;
}

function convertValuesForFormat(values, format) {
  switch (format) {
    case 'FLOAT32':
      return values instanceof Float32Array
        ? values
        : new Float32Array(values);
    // We use a consistent default for wildcard (*) formats. Otherwise, similarity
    // search fails when the stored and query vector formats do not match.
    case '*':
    case 'FLOAT64':
      return values instanceof Float64Array
        ? values
        : new Float64Array(values);
    case 'INT8':
      return values instanceof Int8Array
        ? values
        : convertInt8(values);
    default:
      throw new TypeError(
        `Unsupported vector format: ${format}.`
      );
  }
}

function convertDenseVector(values, definition) {
  if (definition.storageFormat === 'BINARY') {
    if (values instanceof Uint8Array) {
      if (values.length !== definition.dimensions / 8) {
        throw new TypeError(
          `BINARY vector must contain ${definition.dimensions / 8} bytes.`
        );
      }
      return values;
    }
    return packBinaryVector(values, definition.dimensions);
  }

  assertDimensions(values, definition);
  return convertValuesForFormat(values, definition.storageFormat);
}

function convertDenseToSparseVector(vector, format) {
  // Convert before identifying nonzero values. This matters for INT8 because
  // values may become zero after rounding.
  const converted = convertValuesForFormat(vector, format);

  const indices = [];
  const values = [];

  for (let i = 0; i < converted.length; i++) {
    if (converted[i] !== 0) {
      indices.push(i);
      values.push(converted[i]);
    }
  }

  return new oracledb.SparseVector({
    numDimensions: vector.length,
    indices: new Uint32Array(indices),
    values: new converted.constructor(values),
  });
}

function prepareVector(vector, vectorDefinition) {

  if (vector == null) {
    throw new TypeError('Vector must not be null or undefined.');
  }

  if (!Array.isArray(vector) && !isVectorValue(vector)) {
    throw new TypeError('Unsupported vector representation.');
  }

  const definition = vectorDefinition;

  if (definition.storageType === 'SPARSE') {
    if (vector instanceof oracledb.SparseVector) {
      assertDimensions(vector, definition);
      return new oracledb.SparseVector({
        numDimensions: vector.numDimensions,
        indices: vector.indices,
        values: convertValuesForFormat(
          vector.values,
          definition.storageFormat
        )
      });
    }

    assertDimensions(vector, definition);
    // Convert a dense input when the configured column uses sparse storage.
    return convertDenseToSparseVector(vector, definition.storageFormat);
  }

  if (vector instanceof oracledb.SparseVector) {
    throw new TypeError(
      'A SparseVector cannot be used with DENSE storage.'
    );
  }

  return convertDenseVector(vector, definition);
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

module.exports = {
  normalizeVectorDistanceType,
  prepareVector,
  assertDatabaseVersion,
  readLobAsString,
  assertBoolean,
  assertIntegerInRange,
  assertNonEmptyArray,
  assertNonEmptyString,
  assertOptionalArray,
  assertOptionalBoolean,
  assertOptionalPlainObject,
  assertPlainObject,
  assertPositiveInteger,
  isPlainObject
};
