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
 *   326. appContext.js
 *
 * DESCRIPTION
 *    Testing column metadata schema and annotations.
 *
 *****************************************************************************/
"use strict";

const oracledb = require("oracledb");
const assert = require("assert");
const dbConfig = require("./dbconfig.js");

describe("326. appContext.js", () => {
  let connection = null;
  let pool;

  before("get one connection", async () => {
    connection = await oracledb.getConnection(dbConfig);
    pool = await oracledb.createPool({ ...dbConfig, poolMin: 1 });
  });

  after("release connection", async () => {
    if (connection) {
      await connection.close();
    }
    if (pool) {
      await pool.close();
    }
  });

  describe("326.1 Test configuring application context dynamically ", () => {
    it("326.1.1 check setting and clearing context", async () => {
      const nameSpaceName = "CLIENTCONTEXT";
      connection.appContext(nameSpaceName, [
        { traceCtx: "12" },
        { version: "1" },
      ]);

      let result =
        await connection.execute(`SELECT SYS_CONTEXT('${nameSpaceName}', 'traceCtx') AS ctx_val
FROM dual`);
      assert.deepStrictEqual(result.rows[0], ["12"]);

      // The context is available until its cleared.
      result =
        await connection.execute(`SELECT SYS_CONTEXT('${nameSpaceName}', 'version') AS ctx_val
FROM dual`);
      assert.deepStrictEqual(result.rows[0], ["1"]);

      // Verify update context for 'CLIENTCONTEXT'
      connection.appContext(nameSpaceName, [
        { traceCtx: "13" },
        { version: "2" },
      ]);
      result =
        await connection.execute(`SELECT SYS_CONTEXT('${nameSpaceName}', 'traceCtx') AS ctx_val
FROM dual`);
      assert.deepStrictEqual(result.rows[0], ["13"]);
      result =
        await connection.execute(`SELECT SYS_CONTEXT('${nameSpaceName}', 'version') AS ctx_val
FROM dual`);
      assert.deepStrictEqual(result.rows[0], ["2"]);

      //Verify context is cleared after issuing clearAppContext.
      connection.clearAppContext("CLIENTCONTEXT");
      result =
        await connection.execute(`SELECT SYS_CONTEXT('${nameSpaceName}', 'traceCtx') AS ctx_val
FROM dual`);
      assert.deepStrictEqual(result.rows[0], [null]);

      result =
        await connection.execute(`SELECT SYS_CONTEXT('${nameSpaceName}', 'version') AS ctx_val
FROM dual`);
      assert.deepStrictEqual(result.rows[0], [null]);

      // Verify context name other than default CLIENTCONTEXT throws an error
      const multiByteContextName = "𠜎".repeat(2);

      if (oracledb.thin) {
        connection.appContext(multiByteContextName, [
          { traceCtx: "13" },
          { version: "2" },
        ]);

        await assert.rejects(
          async () =>
            await connection.execute(`SELECT SYS_CONTEXT('${multiByteContextName}', 'traceCtx') AS ctx_val
FROM dual`),
          /ORA-28267:/ /* An invalid value was provided for the context namespace. */,
        );
      } else {
        // thick mode client does not allow other than CLIENTCONTEXT.
        assert.throws(
          () =>
            connection.appContext(multiByteContextName, [
              { traceCtx: "13" },
              { version: "2" },
            ]),
          /ORA-28267:/ /* An invalid value was provided for the context namespace. */,
        );
      }
    }); // 326.1.1

    it("326.1.2 check setting appContext with various inputs", async () => {
      const nameSpaceName = "CLIENTCONTEXT";

      // null namespace should throw error
      assert.throws(() => {
        connection.appContext(null, [{ key: "value" }]);
      }, /NJS-005/);

      // undefined namespace should throw error
      assert.throws(() => {
        connection.appContext(undefined, [{ key: "value" }]);
      }, /NJS-005/);

      // empty namespace with non-empty keyvalues should throw error
      assert.throws(() => {
        connection.appContext("", [{ traceCtx: "empty_ns_value" }]);
      }, /NJS-184/); // ERR_APP_CONTEXT_EMPTY_NAMESPACE

      connection.appContext(nameSpaceName, null);
      connection.appContext(nameSpaceName, undefined);
      connection.appContext(nameSpaceName, []);

      // Non-array keyValues should raise NJS-005 for parameter 2.
      assert.throws(() => {
        connection.appContext(nameSpaceName, { traceCtx: "invalid" });
      }, /NJS-005:/); // invalid value for parameter 2

      if (oracledb.thin) {
        await assert.rejects(
          async () =>
            await connection.execute(
              `SELECT SYS_CONTEXT('${nameSpaceName}', 'traceCtx') AS ctx_val FROM dual`,
            ),
          /ORA-01031:/,
        ); // insufficient privileges when querying SYS_CONTEXT
      } else {
        const emptyResult = await connection.execute(
          `SELECT SYS_CONTEXT('${nameSpaceName}', 'traceCtx') AS ctx_val FROM dual`,
        );
        assert.strictEqual(emptyResult.rows[0][0], null);
      }

      // Context values must be strings.
      assert.throws(() => {
        connection.appContext(nameSpaceName, [
          { traceCtx: 1 },
          { version: "updated" },
        ]);
      }, /NJS-185/); // ERR_APP_CONTEXT_INVALID_KEY_VALUE

      // Non-object entries should surface ERR_APP_CONTEXT_INVALID_KEY_VALUE with entry type.
      assert.throws(() => {
        connection.appContext(nameSpaceName, [
          ["traceCtx", "still invalid"],
        ]);
      }, /NJS-005:/);

      // Check valid application Context works
      connection.appContext(nameSpaceName, [
        { traceCtx: "15" },
        { version: "updated" },
      ]);
      const result = await connection.execute(
        `SELECT SYS_CONTEXT('${nameSpaceName}', 'version') AS ctx_val FROM dual`,
      );
      assert.strictEqual(result.rows[0][0], "updated");
    }); // 326.1.2

    // Keys longer than 128 characters raise ERR_APP_CONTEXT_KEY_TOO_LONG.
    // Values longer than 4 * 1000 characters raise ERR_APP_CONTEXT_VALUE_TOO_LONG.
    it("326.1.3 check Max values for key and value", async () => {
      const MAXK = 128;
      const MAXV = (4 * 1000);
      const maxKeyName = "A".repeat(MAXK);
      const maxValName = "B".repeat(MAXV);

      connection.appContext("CLIENTCONTEXT", [
        { [maxKeyName]: "12" },
        { version: "1" },
      ]);

      let result = await connection.execute(
        `SELECT SYS_CONTEXT('CLIENTCONTEXT', :key) AS ctx_val FROM dual`,
        { key: maxKeyName },
      );
      assert.deepStrictEqual(result.rows[0], ["12"]);

      connection.appContext("CLIENTCONTEXT", [
        { [maxKeyName]: maxValName },
        { version: "1" },
      ]);

      result = await connection.execute(
        `SELECT SYS_CONTEXT('CLIENTCONTEXT', :key, ${MAXV}) AS ctx_val FROM dual`,
        { key: maxKeyName },
      );
      assert.deepStrictEqual(result.rows[0], [maxValName]); // Fails if maxValName is > 256

      // Check Max key and Value limits.
      const tooLongKey = "A".repeat(MAXK + 1);
      const tooLongValue = "B".repeat(MAXV + 10);
      assert.throws(() => {
        connection.appContext("CLIENTCONTEXT", [
          { [tooLongKey]: "12" },
        ]);
      }, /NJS-186/); // ERR_APP_CONTEXT_KEY_TOO_LONG
      connection.clearAppContext("CLIENTCONTEXT");

      assert.throws(() => {
        connection.appContext("CLIENTCONTEXT", [
          { version: tooLongValue },
        ]);
      }, /NJS-187/); // ERR_APP_CONTEXT_VALUE_TOO_LONG
      connection.clearAppContext("CLIENTCONTEXT");
    });

    it("326.1.4 clearAppContext frees native allocations", async function() {
      if (typeof global.gc !== "function") {
        this.skip();
      }

      this.timeout(30000);
      const namespace = "CLIENTCONTEXT";
      const iterations = 100;

      global.gc();
      const initialExternal = process.memoryUsage().external;

      for (let i = 0; i < iterations; i++) {
        const key = `ctx_key_${i}`;
        const value = `ctx_value_${i}`;
        connection.appContext(namespace, [{ [key]: value }]);

        const setResult = await connection.execute(
          `SELECT SYS_CONTEXT('${namespace}', :attr) AS ctx_val FROM dual`,
          { attr: key },
        );
        assert.strictEqual(setResult.rows[0][0], value);

        connection.clearAppContext(namespace);

        const clearedResult = await connection.execute(
          `SELECT SYS_CONTEXT('${namespace}', :attr) AS ctx_val FROM dual`,
          { attr: key },
        );
        assert.strictEqual(clearedResult.rows[0][0], null);

        global.gc();
      }

      global.gc();
      const finalExternal = process.memoryUsage().external;
      const delta = finalExternal - initialExternal;
      assert(
        delta <= 2 * 1024 * 1024,
        `AppContext operations should not leak native memory; external delta was ${delta}`,
      );
    });

    it("326.1.5 appends key values across multiple appContext calls", async () => {
      const namespace = "CLIENTCONTEXT";
      const firstKey = "multiFirstKey";
      const secondKey = "multiSecondKey";
      const firstValue = "first-value";
      const secondValue = "second-value";

      connection.clearAppContext(namespace);

      try {
        connection.appContext(namespace, [{ [firstKey]: firstValue }]);
        await connection.execute("SELECT 1 FROM dual");

        connection.appContext(namespace, [{ [secondKey]: secondValue }]);
        await connection.execute("SELECT 1 FROM dual");

        let result = await connection.execute(
          `SELECT SYS_CONTEXT('${namespace}', :attr) AS ctx_val FROM dual`,
          { attr: firstKey },
        );
        assert.strictEqual(result.rows[0][0], firstValue);

        result = await connection.execute(
          `SELECT SYS_CONTEXT('${namespace}', :attr) AS ctx_val FROM dual`,
          { attr: secondKey },
        );
        assert.strictEqual(result.rows[0][0], secondValue);
      } finally {
        connection.clearAppContext(namespace);
      }
    });

    it("326.1.6 updates previously set key values on subsequent appContext calls", async () => {
      const namespace = "CLIENTCONTEXT";
      const key = "multiUpdateKey";
      const initialValue = "initial-value";
      const updatedValue = "updated-value";

      connection.clearAppContext(namespace);

      try {
        connection.appContext(namespace, [{ [key]: initialValue }]);
        await connection.execute("SELECT 1 FROM dual");

        connection.appContext(namespace, [{ [key]: updatedValue }]);
        await connection.execute("SELECT 1 FROM dual");

        const result = await connection.execute(
          `SELECT SYS_CONTEXT('${namespace}', :attr) AS ctx_val FROM dual`,
          { attr: key },
        );
        assert.strictEqual(result.rows[0][0], updatedValue);
      } finally {
        connection.clearAppContext(namespace);
      }
    });
  });

  describe("326.2 appContext with reserved keyword for OpenTelemetry Context Propagation", () => {
    it("326.2.1  check OpenTelemetry spans propagation ", async () => {
      // Enable context propagation on server
      await connection.execute("alter session set sql_trace=true");

      const traceContext =
        "traceparent: 00-78e1dd49763c1f048852ab0d7d61b906-509de95f8cabb61e-1\r\n traceState: congo=t61rcWkgMzE\r\n";
      // Run DBMS_SESSION.SET_CONTEXT with bind variables
      await connection.execute(
        `BEGIN
         DBMS_SESSION.SET_CONTEXT('clientcontext', :attr, :val);
       END;`,
        {
          attr: "ora$opentelem$tracectx", // bind variable for attribute
          val: traceContext, // bind variable for value
        },
      );

      // This context will be sent as piggyback in next roundtrip.
      // It causes server to create a span as child of client span.
      connection.appContext("clientcontext", [
        { ora$opentelem$tracectx: traceContext },
      ]);

      // Query back the value
      const result = await connection.execute(
        `SELECT SYS_CONTEXT('clientcontext', :attr) AS ctx_val FROM dual`,
        { attr: "ora$opentelem$tracectx" },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      assert.strictEqual(result.rows[0].CTX_VAL, traceContext);
      connection.clearAppContext("clientcontext");
    }); // 326.2.1
  }); // 326.2

  describe("326.3 appContext with pool ", () => {
    it("326.3.1  check appContext is retained with Pool acquire and release ", async () => {
      const namespace = "CLIENTCONTEXT";
      let poolConnection;
      let secondConnection;

      try {
        poolConnection = await pool.getConnection();

        poolConnection.appContext(namespace, [
          { traceCtx: "12" },
          { version: "1" },
        ]);

        let result = await poolConnection.execute(
          `SELECT SYS_CONTEXT('${namespace}', 'traceCtx') AS ctx_val FROM dual`,
        );
        assert.deepStrictEqual(result.rows[0], ["12"]);

        result = await poolConnection.execute(
          `SELECT SYS_CONTEXT('${namespace}', 'version') AS ctx_val FROM dual`,
        );
        assert.deepStrictEqual(result.rows[0], ["1"]);

        poolConnection.clearAppContext(namespace);

        result = await poolConnection.execute(
          `SELECT SYS_CONTEXT('${namespace}', 'traceCtx') AS ctx_val FROM dual`,
        );
        assert.deepStrictEqual(result.rows[0], [null]);

        result = await poolConnection.execute(
          `SELECT SYS_CONTEXT('${namespace}', 'version') AS ctx_val FROM dual`,
        );
        assert.deepStrictEqual(result.rows[0], [null]);

        poolConnection.appContext(namespace, [
          { traceCtx: "12" },
          { version: "1" },
        ]);

        await poolConnection.close(); // should retain any context inside connection.
        poolConnection = null;

        secondConnection = await pool.getConnection();
        result = await secondConnection.execute(
          `SELECT SYS_CONTEXT('${namespace}', 'traceCtx') AS ctx_val FROM dual`,
        );

        assert.deepStrictEqual(result.rows[0], ["12"]); // secondConnection retains old context.

        result = await secondConnection.execute(
          `SELECT SYS_CONTEXT('${namespace}', 'version') AS ctx_val FROM dual`,
        );
        assert.deepStrictEqual(result.rows[0], ["1"]);
      } finally {
        if (secondConnection) {
          await secondConnection.close();
          secondConnection = null;
        }
        if (poolConnection) {
          await poolConnection.close();
          poolConnection = null;
        }
      }
    }); // 326.3.1
  });
});
