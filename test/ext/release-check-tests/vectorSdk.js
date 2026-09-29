/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   332. vectorSdk.js
 *
 * DESCRIPTION
 *   Tests for vectorSdk.
 *
 * SETUP
 *   Tests that require an embedding model need additional setup. As a
 *   privileged user connected to the same PDB as the test user, run:
 *
 *     CREATE OR REPLACE DIRECTORY MODEL_DIRECTORY AS '/opt/oracle/onnx/';
 *     GRANT READ, WRITE ON DIRECTORY MODEL_DIRECTORY TO testuser;
 *     GRANT DB_DEVELOPER_ROLE, CREATE MINING MODEL TO testuser;
 *     ALTER USER testuser QUOTA UNLIMITED ON users;
 *
 *   Replace the directory path, user, and tablespace names as appropriate.
 *   The directory path must exist on the database server, be accessible to the
 *   Oracle Database process, and contain the model file. The test creates
 *   uniquely named models and drops them during cleanup.
 *
 * ENVIRONMENT VARIABLES
 *   Set these variables to enable tests that use an embedding model:
 *
 *     MODEL_DIR=MODEL_DIRECTORY
 *     MODEL_FILE=<model_file>.onnx
 *     MODEL_DIMS=DIMENSIONS
 *
 *   MODEL_DIR is the Oracle directory object name, not its filesystem path.
 *   MODEL_DIMS must match the model output dimensions. Tests that require a
 *   model are skipped without MODEL_DIR and MODEL_FILE. Tests that generate or
 *   store embeddings are skipped without MODEL_DIMS.
 *
 *****************************************************************************/

'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('../../dbconfig.js');
const {dropTable, isVectorBinaryRunnable} = require('../../testsUtil.js');
const {
  OracleVecDB,
  describeModel,
  dropModel,
  getIndexBuildStatus,
  listModels,
  loadModel
} = require('../../../plugins/vectorsdk/index.js');
const {prepareVector} = require('../../../plugins/vectorsdk/utils.js');

describe('332. vectorSdk.js', function() {
  const nameSuffix = Date.now();
  let nameCounter = 0;
  let modelDims;
  let connection;
  let runnable = false;
  let modelRunnable = false;
  let embeddingRunnable = false;
  let dirName;
  let modelFile;
  let modelName;
  let pool;

  function uniqueName(prefix) {
    nameCounter += 1;
    return `${prefix}_${nameSuffix}_${nameCounter}`;
  }

  // OracleVecDB recognizes a connection by its execute() and executeMany() methods.
  const mockConnection = {
    oracleServerVersion: 2326020000,
    execute: () => Promise.reject(
      new Error('Unit test unexpectedly executed SQL.')
    ),
    executeMany: () => Promise.reject(
      new Error('Unit test unexpectedly executed SQL.')
    )
  };

  function createMockVectorStore(options = {}) {
    return new OracleVecDB({
      dbSource: mockConnection,
      tableName: 'NJS_VSDK_UNIT',
      vector: {dimensions: 3},
      ...options
    });
  }

  async function hasModel(connection, modelName) {
    const sql = `
      SELECT COUNT(*)
      FROM user_mining_models
      WHERE model_name = :name
    `;
    const result = await connection.execute(sql, {
      name: modelName.toUpperCase()
    });
    return result.rows[0][0] > 0;
  }

  async function dropEmbedModel(connection, modelName) {
    const dropModelSql = `
      BEGIN
        DBMS_VECTOR.DROP_ONNX_MODEL(model_name => :model_name, FORCE => TRUE);
      END;`;
    await connection.execute(dropModelSql, { model_name: modelName });
  }

  async function ensureModelLoaded() {
    if (!embeddingRunnable || !modelName) {
      return false;
    }

    if (!(await hasModel(connection, modelName))) {
      await loadModel(connection, {
        dirName,
        modelFile,
        modelName
      });
    }

    return true;
  }

  before(async function() {
    modelDims = dbConfig.test.modelDims;

    pool = await oracledb.createPool(dbConfig);
    connection = await pool.getConnection();
    runnable = connection.oracleServerVersion >= 2304000000;
    if (!runnable) {
      this.skip();
    }

    dirName = dbConfig.test.modelDir;
    modelFile = dbConfig.test.modelFile;
    modelRunnable = !!(dirName && modelFile);
    embeddingRunnable = modelRunnable && modelDims !== undefined;

    if (modelRunnable) {
      modelName = uniqueName('NJS_VSDK_MODEL');
    }
  });

  after(async function() {
    if (connection && modelName && await hasModel(connection, modelName)) {
      await dropEmbedModel(connection, modelName);
    }
    if (connection) {
      await connection.close();
    }
    if (pool) {
      await pool.close();
    }
  });

  describe('332.1 Vector table management', function() {
    it('332.1.1 validates column annotations during construction', function() {
      assert.throws(
        () => createMockVectorStore({
          columns: {id: {annotation: ''}}
        }),
        /columns.id.annotation/
      );
      const vectorStore = createMockVectorStore({
        columns: {content: {name: 'DOCUMENT_TEXT', annotation: 'Document text'}},
        vector: {
          dimensions: 3,
          column: {name: 'DOCUMENT_EMBEDDING', annotation: 'Embedding'}
        }
      });
      assert.deepStrictEqual(vectorStore.config.annotations, {
        DOCUMENT_TEXT: 'Document text',
        DOCUMENT_EMBEDDING: 'Embedding'
      });
    });

    it('332.1.2 rejects duplicate generated column names', function() {
      assert.throws(
        () => createMockVectorStore({
          columns: {content: 'text'},
          vector: {column: 'text', dimensions: 3}
        }),
        /duplicates another generated column name/
      );
    });

    it('332.1.3 createVectorTable creates the configured table', async function() {
      const tableName = uniqueName('NJS_VSDK');
      const store = new OracleVecDB({
        dbSource: pool,
        tableName,
        vector: { dimensions: 3 },
        modelParams: {
          provider: 'database',
          model: modelName
        }
      });
      try {
        const table = await store.createVectorTable();
        assert.deepStrictEqual(table, tableName);

        const verify = await connection.execute(
          `SELECT COUNT(*) FROM user_tables WHERE table_name = :name`,
          { name: tableName }
        );
        assert.strictEqual(verify.rows[0][0], 1);
      } finally {
        await dropTable(connection, tableName);
      }
    });

    it('332.1.4 createVectorTable respects quoteIdentifiers option', async function() {
      const quotedTableName = uniqueName('njs_vsdk_q');
      const quotedvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: quotedTableName,
        vector: { dimensions: 3 },
        quoteIdentifiers: true
      });

      try {
        const table = await quotedvecdb.createVectorTable();
        assert.deepStrictEqual(table, `"${quotedTableName}"`);

        const tableVerify = await connection.execute(
          `SELECT COUNT(*) FROM user_tables WHERE table_name = :name`,
          { name: quotedTableName }
        );
        assert.strictEqual(tableVerify.rows[0][0], 1);

        const columnVerify = await connection.execute(
          `SELECT column_name FROM user_tab_columns
         WHERE table_name = :name
         ORDER BY column_id`,
          { name: quotedTableName }
        );
        assert.deepStrictEqual(
          columnVerify.rows.map((row) => row[0]),
          ['id', 'external_id', 'embedding', 'text', 'metadata']
        );
      } finally {
        await dropTable(connection, `"${quotedTableName}"`);
      }
    });

    it('332.1.5 createVectorTable quotes custom column names when quoteIdentifiers is true', async function() {
      const quotedTableName = uniqueName('njs_vsdk_qc');
      const quotedvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: quotedTableName,
        columns: {
          rowid: 'myId',
          id: 'myExternalId',
          content: 'myText',
          metadata: 'myMetadata'
        },
        vector: {
          column: 'myEmbedding',
          dimensions: 3
        },
        quoteIdentifiers: true
      });

      try {
        const table = await quotedvecdb.createVectorTable();
        assert.deepStrictEqual(table, `"${quotedTableName}"`);

        const columnVerify = await connection.execute(
          `SELECT column_name FROM user_tab_columns
         WHERE table_name = :name
         ORDER BY column_id`,
          { name: quotedTableName }
        );
        assert.deepStrictEqual(
          columnVerify.rows.map((row) => row[0]),
          ['myId', 'myExternalId', 'myEmbedding', 'myText', 'myMetadata']
        );
      } finally {
        await dropTable(connection, `"${quotedTableName}"`);
      }
    });

    it('332.1.6 createVectorTable creates table with column comments', async function() {
      const commentTableName = uniqueName('NJS_VSDK_COMM');
      const commentvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: commentTableName,
        description: "Vector table for node-oracledb's SDK",
        vector: {
          dimensions: 3,
          column: {
            annotation: "Embedding column for node-oracledb's SDK"
          }
        },
        columns: {
          content: {
            annotation: "Text column for node-oracledb's SDK"
          }
        }
      });

      try {
        await commentvecdb.createVectorTable();

        const tableComment = await connection.execute(
          `SELECT comments
         FROM user_tab_comments
         WHERE table_name = :name`,
          { name: commentTableName }
        );
        assert.strictEqual(
          tableComment.rows[0][0],
          "Vector table for node-oracledb's SDK"
        );

        const columnComments = await connection.execute(
          `SELECT column_name, comments
         FROM user_col_comments
         WHERE table_name = :name
           AND column_name IN ('EMBEDDING', 'TEXT')
         ORDER BY column_name`,
          { name: commentTableName }
        );
        assert.deepStrictEqual(columnComments.rows, [
          ['EMBEDDING', "Embedding column for node-oracledb's SDK"],
          ['TEXT', "Text column for node-oracledb's SDK"]
        ]);
      } finally {
        await dropTable(connection, commentTableName);
      }
    });

    it('332.1.7 dropTable validates purge', async function() {
      await assert.rejects(
        createMockVectorStore().dropTable('true'),
        /purge must be a boolean/
      );
    });

    it('332.1.8 dropTable drops the table', async function() {
      const dropTableName = uniqueName('NJS_VSDK_DROP');
      const dropvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: dropTableName,
        vector: {dimensions: 3}
      });

      try {
        await dropvecdb.createVectorTable();
        await dropvecdb.dropTable(true);

        const verify = await connection.execute(
          `SELECT COUNT(*) FROM user_tables WHERE table_name = :name`,
          {name: dropTableName}
        );
        assert.strictEqual(verify.rows[0][0], 0);
      } finally {
        await dropTable(connection, dropTableName);
      }
    });
  });

  describe('332.2 Vector formats', function() {
    it('332.2.1 prepares dense vector values', function() {
      const dense = prepareVector([1, 2, 3], {
        dimensions: 3,
        storageFormat: 'FLOAT32',
        storageType: 'DENSE'
      });

      assert.deepStrictEqual(dense, new Float32Array([1, 2, 3]));
    });

    it('332.2.2 prepares and validates INT8 vectors', function() {
      const definition = {
        dimensions: 3,
        storageFormat: 'INT8',
        storageType: 'DENSE'
      };

      assert.deepStrictEqual(
        prepareVector([1.2, -2.8, 3], definition),
        new Int8Array([1, -3, 3])
      );

      assert.throws(
        () => prepareVector([1, Infinity, 3], definition),
        /Vector value at index 1 must be finite/
      );
    });

    it('332.2.3 rejects vectors with the wrong dimensions', function() {
      assert.throws(
        () => prepareVector([1, 2], {
          dimensions: 3,
          storageFormat: 'FLOAT32',
          storageType: 'DENSE'
        }),
        /Vector dimensions must be 3; received 2/
      );
    });

    it('332.2.4 rejects unsupported vector inputs and formats', function() {
      assert.throws(
        () => prepareVector(null, {
          dimensions: 3,
          storageFormat: 'FLOAT32',
          storageType: 'DENSE'
        }),
        /Vector must not be null or undefined/
      );

      assert.throws(
        () => prepareVector({}, {
          dimensions: 3,
          storageFormat: 'FLOAT32',
          storageType: 'DENSE'
        }),
        /Unsupported vector representation/
      );

      assert.throws(
        () => prepareVector([1, 2, 3], {
          dimensions: 3,
          storageFormat: 'INVALID',
          storageType: 'DENSE'
        }),
        /Unsupported vector format/
      );
    });
  });

  describe('332.3 Sparse vectors', function() {
    it('332.3.1 rejects incompatible sparse vector configurations', async function() {
      assert.throws(
        () => createMockVectorStore({
          vector: {
            dimensions: 8,
            storageFormat: 'BINARY',
            storageType: 'SPARSE'
          }
        }),
        /BINARY format is not supported for SPARSE vectors/
      );

      const sparseVector = new oracledb.SparseVector({
        numDimensions: 3,
        indices: [0],
        values: new Float32Array([1])
      });
      await assert.rejects(
        createMockVectorStore().addVectors(
          [sparseVector],
          [{content: 'sparse document', metadata: {}}],
          {autoCommit: true}
        ),
        /A SparseVector cannot be used with DENSE storage/
      );
    });

    it('332.3.2 validates sparse vector dimensions before execution', async function() {
      const store = createMockVectorStore({
        vector: {
          dimensions: 5,
          storageFormat: 'FLOAT32',
          storageType: 'SPARSE'
        }
      });
      const wrongDimensions = new oracledb.SparseVector({
        numDimensions: 4,
        indices: [0],
        values: new Float32Array([1])
      });

      await assert.rejects(
        store.addVectors(
          [wrongDimensions],
          [{content: 'wrong dimensions', metadata: {}}],
          {autoCommit: true}
        ),
        /Vector dimensions must be 5; received 4/
      );
      await assert.rejects(
        store.search({queryBy: {vector: wrongDimensions}, topK: 1}),
        /Vector dimensions must be 5; received 4/
      );
    });

    it('332.3.3 rejects invalid sparse INT8 values', async function() {
      const store = createMockVectorStore({
        vector: {
          dimensions: 4,
          storageFormat: 'INT8',
          storageType: 'SPARSE'
        }
      });

      await assert.rejects(
        store.addVectors(
          [new oracledb.SparseVector({
            numDimensions: 4,
            indices: [0],
            values: [129]
          })],
          [{content: 'invalid INT8 value', metadata: {}}],
          {autoCommit: true}
        ),
        /INT8 vector value at index 0 must be within \[-128, 127\]/
      );
    });

    it('332.3.4 search accepts a sparse vector', async function() {
      const sparseTableName = uniqueName('NJS_VSDK_SPARSE_QUERY');
      const sparsevecdb = new OracleVecDB({
        dbSource: pool,
        tableName: sparseTableName,
        vector: {
          dimensions: 5,
          storageFormat: 'FLOAT32',
          storageType: 'SPARSE'
        }
      });
      const matchingVector = new oracledb.SparseVector({
        numDimensions: 5,
        indices: [0, 3],
        values: new Float32Array([1, 0.5])
      });
      const otherVector = new oracledb.SparseVector({
        numDimensions: 5,
        indices: [1],
        values: new Float32Array([1])
      });

      try {
        await sparsevecdb.createVectorTable();
        await sparsevecdb.addVectors(
          [matchingVector, otherVector],
          [
            {content: 'matching document', metadata: {}},
            {content: 'other document', metadata: {}}
          ],
          {
            ids: ['matching', 'other'],
            autoCommit: true
          }
        );

        const rows = await sparsevecdb.search({
          queryBy: {vector: matchingVector},
          topK: 1,
          includeVector: true
        });

        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].id, 'matching');
        assert.strictEqual(rows[0].content, 'matching document');
        assert(rows[0].vector instanceof oracledb.SparseVector);
      } finally {
        await dropTable(connection, sparseTableName);
      }
    });

    it('332.3.5 addDocuments stores generated embeddings as sparse vectors', async function() {
      if (!(await ensureModelLoaded())) {
        this.skip();
      }

      const sparseTableName = uniqueName('NJS_VSDK_SPARSE_DOCUMENTS');
      const sparsevecdb = new OracleVecDB({
        dbSource: pool,
        tableName: sparseTableName,
        vector: {
          dimensions: modelDims,
          storageFormat: 'FLOAT32',
          storageType: 'SPARSE'
        },
        modelParams: {
          provider: 'database',
          model: modelName
        }
      });

      try {
        await sparsevecdb.createVectorTable();
        const ids = await sparsevecdb.addDocuments(
          [{
            content: 'Oracle Database supports sparse vector search.',
            metadata: {storage: 'sparse'}
          }],
          {
            ids: ['sparse-document'],
            autoCommit: true
          }
        );

        assert.deepStrictEqual(ids, ['sparse-document']);
        const result = await connection.execute(
          `SELECT embedding
             FROM ${sparseTableName}
             WHERE external_id = :externalId`,
          {externalId: 'sparse-document'}
        );
        assert.strictEqual(result.metaData[0].isSparseVector, true);
        assert(result.rows[0][0] instanceof oracledb.SparseVector);
        assert.strictEqual(result.rows[0][0].numDimensions, modelDims);
      } finally {
        await dropTable(connection, sparseTableName);
      }
    });

    it('332.3.6 addVectors updates sparse vectors on duplicate IDs', async function() {
      const sparseTableName = uniqueName('NJS_VSDK_SPARSE_UPSERT');
      const sparsevecdb = new OracleVecDB({
        dbSource: pool,
        tableName: sparseTableName,
        vector: {
          dimensions: 5,
          storageFormat: 'FLOAT32',
          storageType: 'SPARSE'
        }
      });

      try {
        await sparsevecdb.createVectorTable();
        await sparsevecdb.addVectors(
          [new oracledb.SparseVector({
            numDimensions: 5,
            indices: [0],
            values: new Float32Array([1])
          })],
          [{content: 'original', metadata: {version: 1}}],
          {
            ids: ['document'],
            autoCommit: true
          }
        );

        const ids = await sparsevecdb.addVectors(
          [new Float32Array([0, 0, 0.5, 0, 1])],
          [{content: 'updated', metadata: {version: 2}}],
          {
            ids: ['document'],
            upsert: true,
            autoCommit: true
          }
        );

        assert.deepStrictEqual(ids, ['document']);
        const result = await connection.execute(
          `SELECT embedding, text, metadata
             FROM ${sparseTableName}
             WHERE external_id = :externalId`,
          {externalId: 'document'},
          {
            fetchInfo: {
              TEXT: {type: oracledb.STRING}
            }
          }
        );
        assert.deepStrictEqual(
          result.rows[0][0].dense(),
          new Float32Array([0, 0, 0.5, 0, 1])
        );
        assert.deepStrictEqual(
          result.rows[0].slice(1),
          ['updated', {version: 2}]
        );
      } finally {
        await dropTable(connection, sparseTableName);
      }
    });

    it('332.3.7 search converts a dense vector for sparse storage', async function() {
      const sparseTableName = uniqueName('NJS_VSDK_SPARSE_DENSE_QUERY');
      const sparsevecdb = new OracleVecDB({
        dbSource: pool,
        tableName: sparseTableName,
        vector: {
          dimensions: 5,
          storageFormat: 'FLOAT32',
          storageType: 'SPARSE'
        }
      });

      try {
        await sparsevecdb.createVectorTable();
        await sparsevecdb.addVectors(
          [
            new Float32Array([1, 0, 0, 0.5, 0]),
            new Float32Array([0, 1, 0, 0, 0])
          ],
          [
            {content: 'matching document', metadata: {}},
            {content: 'other document', metadata: {}}
          ],
          {
            ids: ['matching', 'other'],
            autoCommit: true
          }
        );

        const rows = await sparsevecdb.search({
          queryBy: {vector: [1, 0, 0, 0.5, 0]},
          topK: 1,
          includeVector: true
        });

        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].id, 'matching');
        assert(rows[0].vector instanceof oracledb.SparseVector);
      } finally {
        await dropTable(connection, sparseTableName);
      }
    });

    it('332.3.8 supports FLOAT64 and INT8 sparse vector formats', async function() {
      const cases = [
        {
          storageFormat: 'FLOAT64',
          values: new Float64Array([1.25, -2.5]),
          expected: new Float64Array([1.25, 0, 0, -2.5])
        },
        {
          storageFormat: 'INT8',
          values: new Int8Array([-128, 127]),
          expected: new Int8Array([-128, 0, 0, 127])
        }
      ];

      for (const testCase of cases) {
        const sparseTableName = uniqueName(
          `NJS_VSDK_SPARSE_${testCase.storageFormat}`
        );
        const sparsevecdb = new OracleVecDB({
          dbSource: pool,
          tableName: sparseTableName,
          vector: {
            dimensions: 4,
            storageFormat: testCase.storageFormat,
            storageType: 'SPARSE'
          }
        });

        try {
          await sparsevecdb.createVectorTable();
          await sparsevecdb.addVectors(
            [new oracledb.SparseVector({
              numDimensions: 4,
              indices: [0, 3],
              values: testCase.values
            })],
            [{
              content: `${testCase.storageFormat} document`,
              metadata: {}
            }],
            {
              ids: [testCase.storageFormat],
              autoCommit: true
            }
          );

          const result = await connection.execute(
            `SELECT embedding FROM ${sparseTableName}`
          );
          assert(result.rows[0][0] instanceof oracledb.SparseVector);
          assert.deepStrictEqual(
            result.rows[0][0].dense(),
            testCase.expected
          );
        } finally {
          await dropTable(connection, sparseTableName);
        }
      }
    });

    it('332.3.9 database rejects non-finite sparse vector values', async function() {
      const floatvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: uniqueName('NJS_VSDK_SPARSE_FLOAT_VALUES'),
        vector: {
          dimensions: 4,
          storageFormat: 'FLOAT64',
          storageType: 'SPARSE'
        }
      });
      const sparseTableName = floatvecdb.config.tableName;
      try {
        await floatvecdb.createVectorTable();
        await assert.rejects(
          floatvecdb.addVectors(
            [new oracledb.SparseVector({
              numDimensions: 4,
              indices: [0, 1, 2],
              values: [Infinity, -Infinity, NaN]
            })],
            [{content: 'non-finite values', metadata: {}}],
            {autoCommit: true}
          ),
          /ORA-51805:/
        );
      } finally {
        await dropTable(connection, sparseTableName);
      }
    });
  });

  describe('332.4 Binary vectors', function() {
    it('332.4.1 prepares binary vector values', function() {
      const binary = prepareVector(
        [1, 0, 0, 0, 0, 0, 0, 1],
        {
          dimensions: 8,
          storageFormat: 'BINARY',
          storageType: 'DENSE'
        }
      );

      assert.deepStrictEqual(binary, new Uint8Array([0x81]));
    });

    it('332.4.2 validates unpacked binary vectors', function() {
      const definition = {
        dimensions: 8,
        storageFormat: 'BINARY',
        storageType: 'DENSE'
      };

      assert.throws(
        () => prepareVector([1, 0], definition),
        /Vector dimensions must be 8; received 2/
      );

      assert.throws(
        () => prepareVector(
          [1, 0, 0, NaN, 0, 0, 0, 1],
          definition
        ),
        /Vector value at index 3 must be finite/
      );
    });

    it('332.4.3 validates binary configuration and distance metrics',
      function() {
        const defaultStore = createMockVectorStore();
        assert.deepStrictEqual(defaultStore.config.vector, {
          dimensions: 3,
          storageFormat: 'FLOAT32',
          storageType: 'DENSE',
          column: 'embedding'
        });
        assert.strictEqual(defaultStore.config.vectorDistanceType, 'COSINE');

        assert.throws(
          () => createMockVectorStore({
            vector: {dimensions: 7, storageFormat: 'BINARY'}
          }),
          /dimensions to be a multiple of 8/
        );
        assert.throws(
          () => createMockVectorStore({vectorDistanceType: 'JACCARD'}),
          /JACCARD distance requires BINARY/
        );
      });

    it('332.4.4 supports JACCARD and validates binary byte length', async function() {
      const store = createMockVectorStore({
        vector: {dimensions: 16, storageFormat: 'BINARY'},
        vectorDistanceType: 'JACCARD'
      });
      assert.strictEqual(store.config.vectorDistanceType, 'JACCARD');

      await assert.rejects(
        store.addVectors(
          [new Uint8Array([0x80])],
          [{content: 'short binary vector', metadata: {}}],
          {autoCommit: true}
        ),
        /BINARY vector must contain 2 bytes/
      );
    });

    it('332.4.5 stores packed and byte-array binary vectors', async function() {
      // Requires SYSDBA privileges
      if (!await isVectorBinaryRunnable()) {
        this.skip();
      }

      const binaryTableName = uniqueName('NJS_VSDK_BINARY');
      const binaryvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: binaryTableName,
        vector: {dimensions: 16, storageFormat: 'BINARY'}
      });
      const unpacked = [
        1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1
      ];

      // BINARY's default distance metric is HAMMING
      assert.strictEqual(binaryvecdb.config.vectorDistanceType, 'HAMMING');

      try {
        await binaryvecdb.createVectorTable();
        await binaryvecdb.addVectors(
          [unpacked, new Uint8Array([0x40, 0])],
          [
            {content: 'packed input', metadata: {}},
            {content: 'byte input', metadata: {}}
          ],
          {ids: ['packed', 'bytes'], autoCommit: true}
        );

        const stored = await connection.execute(
          `SELECT external_id, embedding
             FROM ${binaryTableName}
             ORDER BY external_id`
        );
        assert.deepStrictEqual(
          stored.rows,
          [
            ['bytes', new Uint8Array([0x40, 0])],
            ['packed', new Uint8Array([0x80, 0x01])]
          ]
        );

        const rows = await binaryvecdb.search({
          queryBy: {vector: unpacked},
          topK: 1,
          includeVector: true
        });
        assert.strictEqual(rows[0].id, 'packed');
        assert.deepStrictEqual(rows[0].vector, new Uint8Array([0x80, 0x01]));
      } finally {
        await dropTable(connection, binaryTableName);
      }
    });
  });
  describe('332.5 addVectors', function() {
    it('332.5.1 addVectors validates parallel array lengths', async function() {
      const store = createMockVectorStore();

      await assert.rejects(
        store.addVectors(
          [[1, 0, 0]],
          [
            {content: 'first document', metadata: {}},
            {content: 'second document', metadata: {}}
          ],
          {autoCommit: true}
        ),
        /number of documents must match the number of vectors/
      );
      await assert.rejects(
        store.addVectors(
          [[1, 0, 0]],
          [{content: 'first document', metadata: {}}],
          {ids: ['doc-1', 'doc-2'], autoCommit: true}
        ),
        /number of options\.ids must match the number of vectors/
      );
    });

    it('332.5.2 addVectors validates documents, IDs, and vectors', async function() {
      const store = createMockVectorStore();
      const document = {content: 'document', metadata: {}};

      await assert.rejects(
        store.addVectors([], [], {autoCommit: true}),
        /vectors must be a non-empty array/
      );
      await assert.rejects(
        store.addVectors(
          [[1, 0, 0]],
          [{content: 'document', metadata: []}],
          {autoCommit: true}
        ),
        /documents\[0\]\.metadata must be an object/
      );
      await assert.rejects(
        store.addVectors(
          [[1, 0, 0]],
          [document],
          {ids: ['  '], autoCommit: true}
        ),
        /options\.ids\[0\] must be a non-empty string/
      );
      await assert.rejects(
        store.addVectors([[1, 0]], [document], {autoCommit: true}),
        /Vector dimensions must be 3; received 2/
      );
    });

    it('332.5.3 addVectors inserts a batch by default', async function() {
      const queryTableName = uniqueName('NJS_VSDK_ADD');
      const searchvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: queryTableName,
        vector: { dimensions: 3 }
      });

      try {
        await searchvecdb.createVectorTable();

        const ids = await searchvecdb.addVectors(
          [
            new Float32Array([1, 0, 0]),
            new Float32Array([0, 1, 0])
          ],
          [
            {
              content: 'first document',
              metadata: { category: 'first' }
            },
            {
              content: 'second document',
              metadata: { category: 'second' }
            }
          ],
          {
            ids: ['doc-1', 'doc-2'],
            autoCommit: true
          }
        );

        assert.deepStrictEqual(ids, ['doc-1', 'doc-2']);

        const result = await connection.execute(
          `SELECT external_id, text, metadata
          FROM ${queryTableName}
          ORDER BY external_id`,
          {},
          {
            fetchInfo: {
              TEXT: {type: oracledb.STRING}
            }
          }
        );

        assert.deepStrictEqual(result.rows, [
          ['doc-1', 'first document', { category: 'first' }],
          ['doc-2', 'second document', { category: 'second' }]
        ]);
      } finally {
        await dropTable(connection, queryTableName);
      }
    });

    it('332.5.4 addVectors optionally updates duplicate IDs', async function() {
      const queryTableName = uniqueName('NJS_VSDK_UPSERT');
      const searchvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: queryTableName,
        vector: { dimensions: 3 }
      });

      try {
        await searchvecdb.createVectorTable();
        await searchvecdb.addVectors(
          [new Float32Array([1, 0, 0])],
          [{
            content: 'original',
            metadata: { version: 1 }
          }],
          {
            ids: ['doc-1'],
            autoCommit: true
          }
        );

        // RAWTOHEX converts IDs to readable 32-character hexadecimal strings
        // since the driver returns RAW values as Buffers.
        const original = await connection.execute(
          `SELECT RAWTOHEX(id) FROM ${queryTableName}
           WHERE external_id = :externalId`,
          {externalId: 'doc-1'}
        );

        await assert.rejects(
          searchvecdb.addVectors(
            [new Float32Array([0, 1, 0])],
            [{
              content: 'duplicate',
              metadata: { version: 2 }
            }],
            {
              ids: ['doc-1'],
              autoCommit: true
            }
          ),
          /ORA-00001:/
        );

        const ids = await searchvecdb.addVectors(
          [
            new Float32Array([0, 1, 0]),
            new Float32Array([0, 0, 1])
          ],
          [
            {
              content: 'updated',
              metadata: { version: 2 }
            },
            {
              content: 'inserted',
              metadata: { version: 1 }
            }
          ],
          {
            ids: ['doc-1', 'doc-2'],
            upsert: true,
            autoCommit: true
          }
        );

        assert.deepStrictEqual(ids, ['doc-1', 'doc-2']);

        const result = await connection.execute(
          `SELECT RAWTOHEX(id), external_id, text, metadata
           FROM ${queryTableName}
           ORDER BY external_id`,
          {},
          {
            fetchInfo: {
              TEXT: {type: oracledb.STRING}
            }
          }
        );

        assert.strictEqual(result.rows.length, 2);
        assert.deepStrictEqual(
          result.rows[0],
          [original.rows[0][0], 'doc-1', 'updated', { version: 2 }]
        );
        assert.deepStrictEqual(
          result.rows[1].slice(1),
          ['doc-2', 'inserted', { version: 1 }]
        );
      } finally {
        await dropTable(connection, queryTableName);
      }
    });

    it('332.5.5 addVectors generates IDs when none are provided', async function() {
      const queryTableName = uniqueName('NJS_VSDK_ADD_GENERATED');
      const searchvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: queryTableName,
        vector: { dimensions: 3 }
      });

      try {
        await searchvecdb.createVectorTable();
        const ids = await searchvecdb.addVectors(
          [new Float32Array([1, 0, 0])],
          [{
            content: 'first document',
            metadata: { id: 'metadata-id' }
          }],
          { autoCommit: true }
        );

        assert.strictEqual(ids.length, 1);
        // Assert the generated id is a valid UUID version 4
        assert.match(
          ids[0],
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        );

        const result = await connection.execute(
          `SELECT external_id FROM ${queryTableName}`
        );
        assert.deepStrictEqual(result.rows, [[ids[0]]]);
      } finally {
        await dropTable(connection, queryTableName);
      }
    });

    it('332.5.6 addVectors supports quoted identifiers', async function() {
      const quotedTableName = uniqueName('njs_vsdk_add_q');
      const quotedvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: quotedTableName,
        columns: {
          content: 'Text',
          metadata: 'Metadata'
        },
        vector: {
          column: 'Embedding',
          dimensions: 3
        },
        quoteIdentifiers: true
      });

      try {
        await quotedvecdb.createVectorTable();

        const ids = await quotedvecdb.addVectors(
          [
            new Float32Array([1, 0, 0]),
            new Float32Array([0, 1, 0])
          ],
          [
            {
              content: 'quoted first row',
              metadata: {id: 1}
            },
            {
              content: 'quoted second row',
              metadata: {id: 2}
            }
          ],
          {
            ids: ['doc-1', 'doc-2'],
            autoCommit: true
          }
        );

        assert.deepStrictEqual(ids, ['doc-1', 'doc-2']);

        const result = await connection.execute(
          `SELECT "external_id", "Text", "Metadata"
          FROM "${quotedTableName}"
          ORDER BY "external_id"`,
          {},
          {
            fetchInfo: {
              // With quoted identifiers, fetchInfo keys must match the exact column case.
              Text: {type: oracledb.STRING}
            }
          }
        );

        assert.deepStrictEqual(result.rows, [
          ['doc-1', 'quoted first row', {id: 1}],
          ['doc-2', 'quoted second row', {id: 2}]
        ]);
      } finally {
        await dropTable(connection, `"${quotedTableName}"`);
      }
    });
  });

  describe('332.6 Embeddings and model management', function() {
    it('332.6.1 loadModel binds optional model metadata', async function() {
      let executed;
      const connection = {
        execute: (sql, binds) => {
          executed = {sql, binds};
        }
      };
      const modelMetadata = {
        description: 'Test embedding model',
        version: 1
      };

      await loadModel(connection, {
        dirName: 'MODEL_DIR',
        modelFile: 'embedding.onnx',
        modelName: 'NJS_TEST_MODEL',
        modelMetadata
      });

      assert(
        executed.sql.includes('metadata => :model_metadata')
      );
      assert.deepStrictEqual(
        executed.binds.model_metadata,
        {
          val: modelMetadata,
          type: oracledb.DB_TYPE_JSON
        }
      );
    });

    it('332.6.2 loadModel loads a model into the database', async function() {
      if (!modelRunnable) {
        this.skip();
      }

      if (!(await hasModel(connection, modelName))) {
        await loadModel(connection, {
          dirName,
          modelFile,
          modelName
        });
      }

      const result = await connection.execute(
        `SELECT COUNT(*) FROM user_mining_models WHERE model_name = :name`,
        { name: modelName }
      );

      assert.strictEqual(result.rows[0][0], 1);
    });

    it('332.6.3 insertWithEmbeddings inserts rows using database embeddings', async function() {
      if (!(await ensureModelLoaded())) {
        this.skip();
      }

      const sourceTableName = uniqueName('NJS_VSDK_SRC');
      const targetTableName = uniqueName('NJS_VSDK_ING');
      const ingestvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: targetTableName,
        vector: { dimensions: modelDims },
        modelParams: {
          provider: 'database',
          model: modelName
        }
      });

      try {
        await ingestvecdb.createVectorTable();
        await connection.execute(
          `CREATE TABLE ${sourceTableName} (
            source_id VARCHAR2(255) PRIMARY KEY,
            source_text CLOB,
            source_metadata JSON
          )`
        );
        await connection.execute(
          `INSERT INTO ${sourceTableName}
             (source_id, source_text, source_metadata)
           VALUES (:id, :text, JSON(:metadata))`,
          {
            id: 'source-document-1',
            text: 'Oracle Database supports vector search.',
            metadata: JSON.stringify({source: 'database'})
          }
        );
        await connection.commit();

        const rowsAffected = await ingestvecdb.insertWithEmbeddings({
          sourceTable: sourceTableName,
          idColumn: 'source_id',
          contentColumn: 'source_text',
          metadataColumn: 'source_metadata',
          autoCommit: true
        });
        assert.strictEqual(rowsAffected, 1);

        const result = await connection.execute(
          `SELECT COUNT(*)
         FROM ${targetTableName}
         WHERE external_id = :id
           AND DBMS_LOB.SUBSTR(text, 4000, 1) = :text
           AND JSON_VALUE(metadata, '$.source') = 'database'
           AND embedding IS NOT NULL`,
          {
            id: 'source-document-1',
            text: 'Oracle Database supports vector search.'
          }
        );
        assert.strictEqual(result.rows[0][0], 1);
      } finally {
        await dropTable(connection, sourceTableName);
        await dropTable(connection, targetTableName);
      }
    });

    it('332.6.4 generateEmbeddings returns a vector for a loaded model', async function() {
      if (!(await ensureModelLoaded())) {
        this.skip();
      }

      const tableName = uniqueName('NJS_VSDK');
      const vecdb = new OracleVecDB({
        dbSource: pool,
        tableName,
        vector: { dimensions: modelDims },
        modelParams: {
          provider: 'database',
          model: modelName
        }
      });

      const [out] = await vecdb.generateEmbeddings(['hello']);

      assert(out);
      assert.strictEqual(out.length, modelDims);
    });

    it('332.6.5 describes, lists, and drops a model', async function() {
      if (!modelRunnable || connection.oracleServerVersion < 2326020000) {
        this.skip();
      }

      const helperModelName = uniqueName('NJS_VSDK_HELPER_MODEL');
      try {
        await loadModel(connection, {
          dirName,
          modelFile,
          modelName: helperModelName
        });

        const description = await describeModel(connection, helperModelName);
        assert.strictEqual(description.model_name, helperModelName);
        const models = await listModels(connection);
        assert(models !== null);
        assert.strictEqual(typeof models, 'object');

        await dropModel(connection, helperModelName, true);
        assert.strictEqual(
          await hasModel(connection, helperModelName),
          false
        );
      } finally {
        if (await hasModel(connection, helperModelName)) {
          await dropEmbedModel(connection, helperModelName);
        }
      }
    });
  });

  describe('332.7 addDocuments', function() {
    it('332.7.1 addDocuments validates input before embedding', async function() {
      const store = createMockVectorStore({
        modelParams: {provider: 'database', model: 'unused'}
      });

      await assert.rejects(
        store.addDocuments(
          [{content: 'first document', metadata: {}}],
          {ids: ['doc-1', 'doc-2'], autoCommit: true}
        ),
        /number of options\.ids must match the number of documents/
      );
      await assert.rejects(
        store.addDocuments(
          [{content: 'missing metadata'}],
          {autoCommit: true}
        ),
        /documents\[0\]\.metadata must be an object/
      );
      await assert.rejects(
        store.addDocuments([{metadata: {}}], {autoCommit: true}),
        /documents\[0\]\.content must be a non-empty string/
      );
    });

    it('332.7.2 addDocuments generates and inserts vectors', async function() {
      if (!(await ensureModelLoaded())) {
        this.skip();
      }

      const documentTableName = uniqueName('NJS_VSDK_ADD_DOCUMENTS');
      const documentvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: documentTableName,
        vector: { dimensions: modelDims },
        modelParams: {
          provider: 'database',
          model: modelName
        }
      });

      try {
        await documentvecdb.createVectorTable();
        const ids = await documentvecdb.addDocuments(
          [{
            content: 'Oracle Database supports vector search.',
            metadata: { category: 'database' }
          }],
          {
            ids: ['document-1'],
            autoCommit: true
          }
        );

        assert.deepStrictEqual(ids, ['document-1']);
        const result = await connection.execute(
          `SELECT external_id, text, metadata
            FROM ${documentTableName}
            WHERE embedding IS NOT NULL`,
          {},
          {
            fetchInfo: {
              TEXT: {type: oracledb.STRING}
            }
          }
        );
        assert.deepStrictEqual(result.rows, [[
          'document-1',
          'Oracle Database supports vector search.',
          { category: 'database' }
        ]]);
      } finally {
        await dropTable(connection, documentTableName);
      }
    });
  });

  describe('332.8 Vector index creation', function() {
    it('332.8.1 createVectorIndex validates options before execution', async function() {
      const store = createMockVectorStore();
      const invalidOptions = [
        {
          options: {indexName: 'IDX', parameters: {}, type: 'invalid'},
          error: /options\.type must be either HNSW or IVF/
        },
        {
          options: {indexName: 'IDX', parameters: {}, accuracy: 0},
          error: /options\.accuracy must be an integer between 1 and 100/
        },
        {
          options: {indexName: 'IDX', parameters: {}, parallel: 0},
          error: /options\.parallel must be a positive integer/
        },
        {
          options: {indexName: 'IDX'},
          error: /options\.parameters must be an object/
        },
        {
          options: {
            indexName: 'IDX',
            parameters: {},
            includeColumns: ['bad name']
          },
          error: /contains invalid characters/
        }
      ];

      for (const testCase of invalidOptions) {
        await assert.rejects(
          store.createVectorIndex(testCase.options),
          testCase.error
        );
      }
    });

    it('332.8.2 createVectorIndex creates a vector index', async function() {
      const indexTableName = uniqueName('NJS_VSDK_IDX_TAB');
      const indexName = uniqueName('NJS_VSDK_IDX');
      const indexvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: indexTableName,
        vector: { dimensions: 3 }
      });

      try {
        await indexvecdb.createVectorTable();
        try {
          await indexvecdb.createVectorIndex({
            indexName,
            parameters: {
              neighbors: 3,
              efConstruction: 4
            }
          });
        } catch (err) {
          if (err.errorNum === 51962) {
            this.skip();
          }
          throw err;
        }

        const indexResult = await connection.execute(
          `SELECT index_name FROM user_indexes WHERE table_name = :tableName AND index_name = :indexName`,
          { tableName: indexTableName, indexName: indexName },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const indexRow = indexResult.rows?.[0];
        const idxName = indexRow?.INDEX_NAME ?? indexRow?.index_name;
        assert.strictEqual(idxName, indexName);
      } finally {
        await dropTable(connection, indexTableName);
      }
    });

    it('332.8.3 createVectorIndex supports IVF includeColumns with quoted identifiers', async function() {
      const quotedTableName = uniqueName('njs_vsdk_ivf_q');
      const quotedIdxName = uniqueName('njs_vsdk_ivf_idx_q');
      const quotedvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: quotedTableName,
        columns: {
          content: 'Text',
          metadata: 'Metadata'
        },
        vector: {
          column: 'Embedding',
          dimensions: 3
        },
        quoteIdentifiers: true
      });

      try {
        await quotedvecdb.createVectorTable();
        await quotedvecdb.addVectors(
          [
            new Float32Array([1, 0, 0]),
            new Float32Array([0, 1, 0])
          ],
          [
            {
              content: 'ivf quoted first row',
              metadata: {id: 1}
            },
            {
              content: 'ivf quoted second row',
              metadata: {id: 2}
            }
          ],
          {
            ids: ['doc-1', 'doc-2'],
            autoCommit: true
          }
        );

        await assert.rejects(
          quotedvecdb.createVectorIndex({
            indexName: `${quotedIdxName}_BAD`,
            type: 'IVF',
            includeColumns: ['text'],
            parameters: {
              partitions: 1
            }
          }),
          /ORA-/
        );

        await quotedvecdb.createVectorIndex({
          indexName: quotedIdxName,
          type: 'IVF',
          includeColumns: ['Text'],
          parameters: {
            partitions: 1
          }
        });

        const verify = await connection.execute(
          `SELECT COUNT(*) FROM user_indexes WHERE index_name = :name`,
          { name: quotedIdxName }
        );
        assert.strictEqual(verify.rows[0][0], 1);
      } finally {
        await dropTable(connection, `"${quotedTableName}"`);
      }
    });

    it('332.8.4 getIndexBuildStatus returns index build information', async function() {
      const tableName = uniqueName('NJS_VSDK_STATUS_TAB');
      const indexName = uniqueName('NJS_VSDK_STATUS_IDX');
      const vecdb = new OracleVecDB({
        dbSource: pool,
        tableName,
        vector: {dimensions: 3}
      });

      try {
        await vecdb.createVectorTable();

        await vecdb.addVectors(
          [
            new Float32Array([1, 0, 0]),
            new Float32Array([0, 1, 0])
          ],
          [
            {content: 'first document', metadata: {}},
            {content: 'second document', metadata: {}}
          ],
          {
            ids: ['doc-1', 'doc-2'],
            autoCommit: true
          }
        );

        try {
          await vecdb.createVectorIndex({
            indexName,
            parameters: {
              neighbors: 3,
              efConstruction: 4
            }
          });
        } catch (err) {
          if (err.errorNum === 51962) {
            this.skip();
          }
          throw err;
        }

        const status = await getIndexBuildStatus(connection, tableName);

        assert(status !== null);
        assert.strictEqual(typeof status, 'object');
        assert.strictEqual(typeof status['Index Status'], 'string');
        assert(
          status['Index Status'].includes(`"${indexName}"`),
          `Expected status for index "${indexName}", received: ${status['Index Status']}`
        );
      } finally {
        await dropTable(connection, tableName);
      }
    });
  });

  describe('332.9 Vector search', function() {
    it('332.9.1 search groups $in values in one JSON_EXISTS', async function() {
      let executed;

      const connection = {
        execute: (sql, binds) => {
          executed = {sql, binds};
          return Promise.resolve({rows: []});
        },
        executeMany: () => {
          assert.fail('search() must not call executeMany()');
        }
      };

      const store = createMockVectorStore({dbSource: connection});

      await store.search({
        queryBy: {vector: [1, 0, 0]},
        filter: {status: {$in: ['active', 'pending']}},
        topK: 2
      });

      assert.strictEqual(
        executed.sql.split('JSON_EXISTS').length - 1,
        1
      );

      assert(
        executed.sql.includes(
          '$."status"?(@ == $vf_1 || @ == $vf_2)'
        )
      );

      assert.strictEqual(executed.binds.vf_1, 'active');
      assert.strictEqual(executed.binds.vf_2, 'pending');
    });

    it('332.9.2 search rejects invalid metadata filters', async function() {
      const store = createMockVectorStore();
      const invalidFilters = [
        {filter: {$and: []}, error: /must be a non-empty array/},
        {filter: {year: {$between: [2024]}}, error: /two-item array/},
        {filter: {tenant: {$in: []}}, error: /non-empty array/},
        {filter: {'bad path': 'value'}, error: /Invalid metadata filter path/},
        {
          filter: {$or: [{tenant: 'acme'}], year: 2024},
          error: /must contain exactly one logical operator/
        },
        {
          filter: {year: {$not: 1}},
          error: /Unsupported metadata filter operator/
        }
      ];

      for (const testCase of invalidFilters) {
        await assert.rejects(
          store.search({
            queryBy: {vector: [1, 0, 0]},
            filter: testCase.filter
          }),
          testCase.error
        );
      }
    });

    it('332.9.3 search validates query options before execution', async function() {
      const store = createMockVectorStore();
      const invalidQueries = [
        {options: {queryBy: {}}, error: /exactly one of: vector, text/},
        {
          options: {queryBy: {vector: [1, 0, 0], text: 'both'}},
          error: /exactly one of: vector, text/
        },
        {
          options: {queryBy: {vector: [1, 0, 0]}, topK: 0},
          error: /options\.topK must be a positive integer/
        },
        {
          options: {queryBy: {vector: [1, 0, 0]}, accuracy: 101},
          error: /options\.accuracy must be an integer between 1 and 100/
        },
        {
          options: {queryBy: {vector: [1, 0]}},
          error: /Vector dimensions must be 3; received 2/
        }
      ];

      for (const testCase of invalidQueries) {
        await assert.rejects(store.search(testCase.options), testCase.error);
      }
    });

    it('332.9.4 search returns results for a text search', async function() {
      if (!(await ensureModelLoaded())) {
        this.skip();
      }

      const queryTableName = uniqueName('NJS_VSDK_TEXT_QUERY');
      const searchvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: queryTableName,
        vector: { dimensions: modelDims },
        modelParams: {
          provider: 'database',
          model: modelName
        }
      });

      try {
        await searchvecdb.createVectorTable();
        const matchingText = 'Oracle Database supports vector search.';
        const texts = [
          matchingText,
          'A tropical beach has white sand and clear water.',
          'The bakery sells fresh bread and pastries every morning.',
          'Space telescopes observe distant galaxies and stars.'
        ];
        await searchvecdb.addDocuments(
          texts.map((content) => ({content, metadata: {}})),
          {
            ids: ['doc-1', 'doc-2', 'doc-3', 'doc-4'],
            autoCommit: true
          }
        );

        const rows = await searchvecdb.search({
          queryBy: { text: 'Does Oracle DB supports vector Search' },
          topK: 2
        });

        assert.strictEqual(rows.length, 2);
        assert.strictEqual(rows[0].content, matchingText);
      } finally {
        await dropTable(connection, queryTableName);
      }
    });

    it('332.9.5 search with metadata filters', async function() {
      const queryTableName = uniqueName('NJS_VSDK_FILTER_QUERY');
      const searchvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: queryTableName,
        vector: { dimensions: 3 }
      });

      try {
        await searchvecdb.createVectorTable();
        await searchvecdb.addVectors(
          [
            new Float32Array([1, 0, 0]),
            new Float32Array([1, 0, 0]),
            new Float32Array([1, 0, 0])
          ],
          [
            {
              content: 'matching document',
              metadata: { tenant: 'acme', document: { year: 2024 } }
            },
            {
              content: 'older document',
              metadata: { tenant: 'acme', document: { year: 2023 } }
            },
            {
              content: 'other tenant',
              metadata: { tenant: 'other', document: { year: 2025 } }
            }
          ],
          {
            autoCommit: true
          }
        );

        const rows = await searchvecdb.search({
          queryBy: { vector: [1, 0, 0] },
          topK: 3,
          filter: {
            tenant: 'acme',
            'document.year': { $gte: 2024 }
          }
        });

        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].content, 'matching document');
      } finally {
        await dropTable(connection, queryTableName);
      }
    });

    it('332.9.6 search supports metadata filter operators', async function() {
      const queryTableName = uniqueName('NJS_VSDK_FILTER_OPS');
      const searchvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: queryTableName,
        vector: {dimensions: 3}
      });

      const testCases = [
        {
          name: '$and',
          filter: {$and: [{tenant: 'acme'}, {active: true}]},
          expectedIds: ['doc-1']
        },
        {
          name: '$or',
          filter: {$or: [{year: 2023}, {tenant: 'other'}]},
          expectedIds: ['doc-1', 'doc-3']
        },
        {
          name: '$eq',
          filter: {tenant: {$eq: 'acme'}},
          expectedIds: ['doc-1', 'doc-2']
        },
        {
          name: '$ne',
          filter: {category: {$ne: 'database'}},
          expectedIds: ['doc-1', 'doc-3']
        },
        {
          name: '$gt',
          filter: {year: {$gt: 2023}},
          expectedIds: ['doc-2', 'doc-3']
        },
        {
          name: '$gte',
          filter: {year: {$gte: 2024}},
          expectedIds: ['doc-2', 'doc-3']
        },
        {
          name: '$lt',
          filter: {year: {$lt: 2025}},
          expectedIds: ['doc-1', 'doc-2']
        },
        {
          name: '$lte',
          filter: {year: {$lte: 2024}},
          expectedIds: ['doc-1', 'doc-2']
        },
        {
          name: '$between',
          filter: {year: {$between: [2023, 2024]}},
          expectedIds: ['doc-1', 'doc-2']
        },
        {
          name: '$in',
          filter: {tenant: {$in: ['acme', 'missing']}},
          expectedIds: ['doc-1', 'doc-2']
        },
        {
          name: 'array shorthand for $in',
          filter: {tenant: ['acme', 'missing']},
          expectedIds: ['doc-1', 'doc-2']
        },
        {
          name: '$nin',
          filter: {category: {$nin: ['database', 'javascript']}},
          expectedIds: ['doc-1', 'doc-3']
        },
        {
          name: '$like',
          filter: {title: {$like: 'Oracle%'}},
          expectedIds: ['doc-1', 'doc-3']
        },
        {
          name: '$exists true',
          filter: {category: {$exists: true}},
          expectedIds: ['doc-1', 'doc-2']
        },
        {
          name: '$exists false',
          filter: {category: {$exists: false}},
          expectedIds: ['doc-3']
        },
        {
          name: 'null equality',
          filter: {category: null},
          expectedIds: ['doc-1']
        },
        {
          name: 'boolean equality',
          filter: {active: true},
          expectedIds: ['doc-1', 'doc-3']
        },
        {
          name: 'multiple operators on one field',
          filter: {year: {$gte: 2023, $lte: 2024}},
          expectedIds: ['doc-1', 'doc-2']
        }
      ];

      try {
        await searchvecdb.createVectorTable();
        await searchvecdb.addVectors(
          [
            new Float32Array([1, 0, 0]),
            new Float32Array([1, 0, 0]),
            new Float32Array([1, 0, 0])
          ],
          [
            {
              content: 'first document',
              metadata: {
                tenant: 'acme',
                year: 2023,
                active: true,
                category: null,
                title: 'Oracle Database'
              }
            },
            {
              content: 'second document',
              metadata: {
                tenant: 'acme',
                year: 2024,
                active: false,
                category: 'database',
                title: 'Node.js Driver'
              }
            },
            {
              content: 'third document',
              metadata: {
                tenant: 'other',
                year: 2025,
                active: true,
                title: 'Oracle Vector Search'
              }
            }
          ],
          {
            ids: ['doc-1', 'doc-2', 'doc-3'],
            autoCommit: true
          }
        );

        for (const testCase of testCases) {
          const rows = await searchvecdb.search({
            queryBy: {vector: [1, 0, 0]},
            filter: testCase.filter,
            topK: 4
          });

          assert.deepStrictEqual(
            rows.map((row) => row.id).sort(),
            [...testCase.expectedIds].sort(),
            `Unexpected results for ${testCase.name}`
          );
        }
      } finally {
        await dropTable(connection, queryTableName);
      }
    });

  });

  describe('332.10 Delete operations', function() {
    it('332.10.1 delete validates options and IDs', async function() {
      const store = createMockVectorStore();

      await assert.rejects(store.delete(), /options must be an object/);
      await assert.rejects(
        store.delete({ids: ['']}),
        /options\.ids\[0\] must be a non-empty string/
      );
      await assert.rejects(
        store.delete({deleteAll: 'true'}),
        /options\.deleteAll must be a boolean/
      );
      await assert.rejects(
        store.delete({autoCommit: 1}),
        /options\.autoCommit must be a boolean/
      );
    });

    it('332.10.2 deletes selected documents and can delete all documents', async function() {
      const deleteTableName = uniqueName('NJS_VSDK_DELETE');
      const deleteStore = new OracleVecDB({
        dbSource: pool,
        tableName: deleteTableName,
        vector: {dimensions: 3}
      });

      try {
        await deleteStore.createVectorTable();
        await deleteStore.addVectors(
          [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
          [
            {content: 'keep', metadata: {}},
            {content: 'delete', metadata: {}},
            {content: 'also keep', metadata: {}}
          ],
          {
            ids: ['id_1', 'id_2', 'id_3'],
            autoCommit: true
          }
        );

        await deleteStore.delete({
          ids: ['id_2'],
          autoCommit: true
        });

        let result = await connection.execute(
          `SELECT external_id FROM ${deleteTableName} ORDER BY external_id`
        );
        assert.deepStrictEqual(result.rows, [['id_1'], ['id_3']]);

        await deleteStore.delete({deleteAll: true});

        result = await connection.execute(
          `SELECT COUNT(*) FROM ${deleteTableName}`
        );
        assert.strictEqual(result.rows[0][0], 0);
      } finally {
        await dropTable(connection, deleteTableName);
      }
    });

  });

  describe('332.11 Connection sources', function() {
    it('332.11.1 rejects an invalid connection source', async function() {
      const store = createMockVectorStore({dbSource: {}});

      await assert.rejects(
        store.createVectorTable(),
        /dbSource must be an Oracle Database Pool or Connection/
      );
    });

    it('332.11.2 keeps a directly supplied connection open', async function() {
      const directConnection = await pool.getConnection();
      const directTableName = uniqueName('NJS_VSDK_DIRECT');
      const directvecdb = new OracleVecDB({
        dbSource: directConnection,
        tableName: directTableName,
        vector: {dimensions: 3}
      });

      try {
        await directvecdb.createVectorTable();
        const result = await directConnection.execute(
          `SELECT COUNT(*) FROM ${directTableName}`
        );
        assert.strictEqual(result.rows[0][0], 0);
        await directvecdb.dropTable(true);
        await directConnection.execute('SELECT 1 FROM DUAL');
      } finally {
        await dropTable(directConnection, directTableName);
        await directConnection.close();
      }
    });

    it('332.11.3 resolves a connection provider function', async function() {
      const providerConnection = await pool.getConnection();
      const providerTableName = uniqueName('NJS_VSDK_PROVIDER');
      let calls = 0;
      const providervecdb = new OracleVecDB({
        dbSource: () => {
          calls += 1;
          return Promise.resolve(providerConnection);
        },
        tableName: providerTableName,
        vector: {dimensions: 3}
      });

      try {
        await providervecdb.createVectorTable();
        assert.strictEqual(calls, 1);
        await providerConnection.execute('SELECT 1 FROM DUAL');
      } finally {
        await dropTable(providerConnection, providerTableName);
        await providerConnection.close();
      }
    });

    it('332.11.4 releases pool connections after success and failure', async function() {
      const pooledTableName = uniqueName('NJS_VSDK_POOL_SOURCE');
      const pooledvecdb = new OracleVecDB({
        dbSource: pool,
        tableName: pooledTableName,
        vector: {dimensions: 3}
      });
      const connectionsInUse = pool.connectionsInUse;

      try {
        await pooledvecdb.createVectorTable();
        assert.strictEqual(pool.connectionsInUse, connectionsInUse);

        await assert.rejects(
          pooledvecdb.addVectors(
            [[1, 0, 0]],
            [{content: 'duplicate one', metadata: {}}],
            {ids: ['duplicate'], autoCommit: true}
          ).then(() => pooledvecdb.addVectors(
            [[1, 0, 0]],
            [{content: 'duplicate two', metadata: {}}],
            {ids: ['duplicate'], autoCommit: true}
          )),
          /ORA-00001:/
        );
        assert.strictEqual(pool.connectionsInUse, connectionsInUse);
      } finally {
        await dropTable(connection, pooledTableName);
      }
    });
  });
});
