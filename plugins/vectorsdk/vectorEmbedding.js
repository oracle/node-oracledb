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
const { normalizeIdentifier } = require('./vectorSchema.js');
const {
  assertBoolean,
  assertNonEmptyString,
  assertOptionalPlainObject,
  assertPlainObject,
  readLobAsString,
  assertDatabaseVersion,
  assertNonEmptyArray
} = require('./utils.js');

//-----------------------------------------------------------------------------
// generateEmbeddings()

// Generate a vector embedding for input text using a preloaded model.
//-----------------------------------------------------------------------------
async function generateEmbeddings(connection, modelParams, texts) {
  assertNonEmptyArray(texts, 'texts');
  assertPlainObject(modelParams, 'modelParams');

  const embeddingSql = `
    DECLARE
      generated_embedding VECTOR;
    BEGIN
      generated_embedding := DBMS_VECTOR.UTL_TO_EMBEDDING(
        :query_text,
        :model_params
      );
      :embedding := generated_embedding;
    END;
  `;

  const result = await connection.executeMany(
    embeddingSql,
    texts.map((text, index) => {
      assertNonEmptyString(text, `texts[${index}]`);
      return {
        query_text: text,
        model_params: modelParams
      };
    }),
    {
      bindDefs: {
        query_text: {
          type: oracledb.DB_TYPE_CLOB
        },
        model_params: {
          type: oracledb.DB_TYPE_JSON
        },
        embedding: {
          dir: oracledb.BIND_OUT,
          type: oracledb.DB_TYPE_VECTOR
        }
      }
    }
  );

  return result.outBinds.map((binds) => binds.embedding);
}

//-----------------------------------------------------------------------------
// loadModel()

// Load an embedding model into Oracle AI Database.
//-----------------------------------------------------------------------------
async function loadModel(connection, options) {
  assertPlainObject(options, 'options');

  const {
    dirName,
    modelFile,
    modelName,
    modelMetadata = null,
  } = options;

  assertNonEmptyString(modelFile, 'options.modelFile');
  assertOptionalPlainObject(
    modelMetadata,
    'options.modelMetadata'
  );

  const binds = {
    dir_name: normalizeIdentifier(dirName, 'options.dirName'),
    model_file: modelFile,
    model_name: normalizeIdentifier(modelName, 'options.modelName')
  };

  const plsqlParams = [
    'directory => :dir_name',
    'file_name => :model_file',
    'model_name => :model_name'
  ];

  if (modelMetadata != null) {
    binds.model_metadata = {
      val: modelMetadata,
      type: oracledb.DB_TYPE_JSON
    };
    plsqlParams.push('metadata => :model_metadata');
  }

  const plsql = `
    BEGIN
      DBMS_VECTOR.LOAD_ONNX_MODEL(
        ${plsqlParams.join(', ')}
      );
    END;
  `;

  await connection.execute(plsql, binds);
}

//-----------------------------------------------------------------------------
// describeModel()

// Return metadata for a loaded model, including its algorithm, mining function,
// creation date, and attributes.
//-----------------------------------------------------------------------------
async function describeModel(connection, modelName) {
  // requires Oracle Database 23.26.2.0.0 or later
  assertDatabaseVersion(connection, 'describeModel()');

  const binds = {
    model_name: normalizeIdentifier(modelName, 'modelName'),
    result: {
      dir: oracledb.BIND_OUT,
      type: oracledb.STRING,
      maxSize: 1024 * 1024
    }
  };

  const plsql = `
    BEGIN
      :result := DBMS_VECTOR_DATABASE.DESCRIBE_MODEL(MODEL_NAME  => :model_name);
    END;`;

  const res = await connection.execute(plsql, binds);
  return JSON.parse(res.outBinds.result);
}

//-----------------------------------------------------------------------------
// listModels()

// Return the models available in the current schema.
//-----------------------------------------------------------------------------
async function listModels(connection) {
  // requires Oracle Database 23.26.2.0.0 or later
  assertDatabaseVersion(connection, 'listModels()');

  const binds = {
    result: {
      dir: oracledb.BIND_OUT,
      type: oracledb.DB_TYPE_CLOB
    }
  };

  const plsql = `
    BEGIN
      :result := DBMS_VECTOR_DATABASE.LIST_MODELS();
    END;`;

  const res = await connection.execute(plsql, binds);
  const output = await readLobAsString(res.outBinds.result);
  return JSON.parse(output);
}

//-----------------------------------------------------------------------------
// dropModel()

// Remove an embedding model from Oracle AI Database.
//-----------------------------------------------------------------------------
async function dropModel(connection, modelName, force = false) {
  assertBoolean(force, 'force');

  const safeModelName = normalizeIdentifier(modelName, 'modelName');
  const dropModelSql = `
      BEGIN
        DBMS_VECTOR.DROP_ONNX_MODEL(
          model_name => :model_name,
          force => ${force ? 'TRUE' : 'FALSE'}
        );
      END;
    `;

  await connection.execute(dropModelSql, { model_name: safeModelName });
}

module.exports = {
  generateEmbeddings,
  loadModel,
  describeModel,
  listModels,
  dropModel
};
