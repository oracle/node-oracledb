/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

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
 *   83. lobProperties2.js
 *
 * DESCRIPTION
 *   Testing the properties of LOB that created by createLob().
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe("83. lobProperties2.js", function() {

  let connection;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  const checkChunkSize = async function(type) {
    const lob = await connection.createLob(type);
    const t = lob.chunkSize;
    assert.strictEqual(typeof t, 'number');
    assert.throws(
      () => lob.chunkSize = t + 1,
      /TypeError: Cannot set property chunkSize/
    );
    await lob.close();
  };

  it("83.1 CLOB: chunkSize (read-only)", async function() {
    await checkChunkSize(oracledb.CLOB);
  });

  it("83.2 BLOB: chunkSize (read-only)", async function() {
    await checkChunkSize(oracledb.BLOB);
  });

  const checkLength = async function(type) {
    const lob = await connection.createLob(type);
    const t = lob.length;
    assert.strictEqual(typeof t, 'number');
    assert.throws(
      () => lob.length = t + 1,
      /TypeError: Cannot set property length/
    );
    await lob.close();
  }; // checkLength

  it("83.3 CLOB: length (read-only)", async function() {
    await checkLength(oracledb.CLOB);
  });

  it("83.4 BLOB: length (read-only)", async function() {
    await checkLength(oracledb.BLOB);
  });

  const checkType = async function(lobtype) {
    const lob = await connection.createLob(lobtype);
    const t = lob.type;
    assert.strictEqual(t, lobtype);
    assert.throws(
      () => lob.type = oracledb.BUFFER,
      /TypeError: Cannot set property type/
    );
    await lob.close();
  }; // checkType

  it("83.5 CLOB: type (read-only)", async function() {
    await checkType(oracledb.CLOB);
  });

  it("83.6 BLOB: type (read-only)", async function() {
    await checkType(oracledb.CLOB);
  });

  describe("83.7 pieceSize", function() {

    let defaultChunkSize;
    let clob, blob;

    before("get the lobs", async function() {
      clob = await connection.createLob(oracledb.CLOB);
      defaultChunkSize = clob.chunkSize;
      blob = await connection.createLob(oracledb.BLOB);
    });

    after("close the lobs", async function() {
      await clob.close();
      await blob.close();
    });

    afterEach(function() {
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;
    });

    it("83.7.1 default value is chunkSize", function() {
      assert.strictEqual(clob.pieceSize, defaultChunkSize);
      assert.strictEqual(blob.pieceSize, defaultChunkSize);
    });

    it("83.7.2 can be increased", function() {
      const newValue = clob.pieceSize * 5;

      clob.pieceSize = clob.pieceSize * 5;
      blob.pieceSize = blob.pieceSize * 5;

      assert.strictEqual(clob.pieceSize, newValue);
      assert.strictEqual(blob.pieceSize, newValue);
    });

    it("83.7.3 can be decreased", function() {
      if (defaultChunkSize <= 500)
        return this.skip();
      const newValue = clob.pieceSize - 500;

      clob.pieceSize -= 500;
      blob.pieceSize -= 500;
      assert.strictEqual(clob.pieceSize, newValue);
      assert.strictEqual(blob.pieceSize, newValue);
    });

    it("83.7.4 can be zero", function() {
      clob.pieceSize = 0;
      blob.pieceSize = 0;

      assert.strictEqual(clob.pieceSize, 0);
      assert.strictEqual(blob.pieceSize, 0);
    });

    it("83.7.5 cannot be less than zero", function() {
      assert.throws(
        () => clob.pieceSize = -100,
        /NJS-004:/
      );
    });

    it("83.7.6 cannot be null", function() {
      assert.throws(
        () => clob.pieceSize = null,
        /NJS-004:/
      );
    });

    it("83.7.7 must be a number", function() {
      assert.throws(
        () => clob.pieceSize = NaN,
        /NJS-004:/
      );
    });
  }); // 83.7

});
