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
 *   327. securityContext.js
 *
 * DESCRIPTION
 *   Tests for Connection#setEndUserSecurityContext().
 *
 *****************************************************************************/
"use strict";

const oracledb = require("oracledb");
const assert = require("assert");
const fs = require("fs");
const dbConfig = require("./dbconfig.js");

(oracledb.thin ? describe : describe.skip)("327. securityContext.js", () => {
  let connection;
  let connectionProto;
  let protocolDescriptor;

  before(async () => {
    connection = await oracledb.getConnection(dbConfig);
    assert(connection);
    connectionProto = Object.getPrototypeOf(connection);

    // Force TCPS for tests that interact with the real connection instance.
    protocolDescriptor = Object.getOwnPropertyDescriptor(
      connectionProto,
      "protocol",
    );
    Object.defineProperty(connectionProto, "protocol", {
      configurable: true,
      get: () => "TCPS",
    });
  });

  after(async () => {
    if (connection) {
      await connection.close();
      connection = null;
    }

    // Clean up the stubbed protocol accessor.
    if (connectionProto) {
      if (protocolDescriptor) {
        Object.defineProperty(connectionProto, "protocol", protocolDescriptor);
      } else {
        delete connectionProto.protocol;
      }
    }
    connectionProto = null;
    protocolDescriptor = null;
  });

  function createStubConnection({
    protocol = "TCPS",
    osonFieldNameSize = 65535,
  } = {}) {
    assert(connectionProto);
    const stub = Object.create(connectionProto);
    Object.defineProperty(stub, "protocol", {
      configurable: true,
      get: () => protocol,
    });
    stub._impl = {
      _osonMaxFieldNameSize: osonFieldNameSize,
      setEndUserSecurityContext() {},
      clearEndUserSecurityContext() {},
    };
    return stub;
  }

  function createInvalidStubConnection() {
    assert(connectionProto);
    const stub = Object.create(connectionProto);
    stub._impl = null;
    return stub;
  }

  function makeSecurityContext(options) {
    return new oracledb.EndUserSecurityContext(options);
  }

  function decodeContextPayload(context) {
    assert(context instanceof oracledb.EndUserSecurityContext);
    const encoded = context.getDeobfuscatedValue();
    if (!encoded) {
      return null;
    }
    try {
      const decoded = connection.decodeOSON(encoded);
      if (!decoded) {
        return decoded;
      }
      if (Array.isArray(decoded.data_roles)) {
        Object.freeze(decoded.data_roles);
      }
      if (Array.isArray(decoded.attributes)) {
        for (const attribute of decoded.attributes) {
          Object.freeze(attribute);
        }
        Object.freeze(decoded.attributes);
      }
      return Object.freeze(decoded);
    } finally {
      encoded.fill(0);
    }
  }

  function payloadForWire(context) {
    const decoded = decodeContextPayload(context);
    if (!decoded) {
      return null;
    }
    const clone = JSON.parse(JSON.stringify(decoded));
    if (Array.isArray(clone.data_roles)) {
      Object.freeze(clone.data_roles);
    }
    if (Array.isArray(clone.attributes)) {
      for (const attribute of clone.attributes) {
        Object.freeze(attribute);
      }
      Object.freeze(clone.attributes);
    }
    return Object.freeze(clone);
  }

  let driverSupportsSecurityContextCache = null;
  function driverSupportsSecurityContext() {
    if (driverSupportsSecurityContextCache !== null) {
      return driverSupportsSecurityContextCache;
    }
    if (!connection || !connection._impl ||
        typeof connection._impl.setEndUserSecurityContext !== "function") {
      driverSupportsSecurityContextCache = false;
      return driverSupportsSecurityContextCache;
    }
    const probeContext = new oracledb.EndUserSecurityContext({
      databaseAccessToken: "probe-db-token",
      endUserToken: "probe-user-token",
    });
    try {
      connection._impl.setEndUserSecurityContext(probeContext);
      connection._impl.clearEndUserSecurityContext();
      driverSupportsSecurityContextCache = true;
    } catch {
      driverSupportsSecurityContextCache = false;
    }
    return driverSupportsSecurityContextCache;
  }

  describe("327.1 setEndUserSecurityContext()", () => {
    it("327.1.1 Security context from EndUserSecurityContext instance", () => {
      const stub = createStubConnection();
      let captured;
      stub._impl.setEndUserSecurityContext = (...args) => {
        captured = args;
      };

      const context = {
        databaseAccessToken: "db-token-plain",
        endUserToken: "user-token-plain",
        endUserName: "plain-user",
        key: "context-key",
        dataRoles: ["role1", "role2"],
        attributes: {
          region: ["us", "uk"],
          department: "finance",
        },
      };

      const securityContext = makeSecurityContext(context);
      stub.setEndUserSecurityContext(securityContext);

      assert(captured);
      assert.strictEqual(captured.length, 1);
      const capturedContext = captured[0];
      assert.strictEqual(capturedContext, securityContext);

      const payload = payloadForWire(capturedContext);
      assert.deepStrictEqual(payload, {
        ver: "1.0",
        database_access_token: "db-token-plain",
        end_user_token: "user-token-plain",
        end_user_name: "plain-user",
        end_user_contextid: "context-key",
        data_roles: ["role1", "role2"],
        attributes: [
          { name: "region", values: ["us", "uk"] },
          { name: "department", values: "finance" },
        ],
      });
    });

    it("327.1.2 Case and embedded quotes in endUserName", () => {
      const stub = createStubConnection();
      let captured;
      stub._impl.setEndUserSecurityContext = (...args) => {
        captured = args;
      };

      const quotedName = 'User "CaseSensitive" Name';
      const context = {
        databaseAccessToken: "db-token-quotes",
        endUserToken: "user-token-quotes",
        endUserName: quotedName,
        key: "quotes-key",
      };

      const securityContext = makeSecurityContext(context);
      stub.setEndUserSecurityContext(securityContext);

      assert(captured);
      const [capturedContext] = captured;
      const payload = payloadForWire(capturedContext);
      assert.strictEqual(payload.end_user_name, quotedName);
      assert.notStrictEqual(payload.end_user_name, quotedName.toLowerCase());
    });

    it("327.1.3 Encoded security context larger than 252 bytes", () => {
      const stub = createStubConnection();
      const largeValue = "x".repeat(260);
      const context = {
        databaseAccessToken: "db-token-large",
        endUserToken: "user-token-large",
        attributes: {
          region: largeValue,
        },
      };

      let captured;
      stub._impl.setEndUserSecurityContext = (...args) => {
        captured = args;
      };

      stub.setEndUserSecurityContext(makeSecurityContext(context));

      assert(captured);
      assert.strictEqual(captured.length, 1);
      const [capturedContext] = captured;
      assert(capturedContext instanceof oracledb.EndUserSecurityContext);
      const encoded = capturedContext.getDeobfuscatedValue();
      assert(Buffer.isBuffer(encoded));
      assert(encoded.length > 252);
      encoded.fill(0);
      const decoded = payloadForWire(capturedContext);
      const expected = payloadForWire(makeSecurityContext(context));
      assert.deepStrictEqual(decoded, expected);
    });

    it("327.1.4 EndUserSecurityContext instance input", () => {
      const stub = createStubConnection();
      let captured;
      stub._impl.setEndUserSecurityContext = (...args) => {
        captured = args;
      };

      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: "db-token-instance",
        endUserToken: "user-token-instance",
      });

      stub.setEndUserSecurityContext(securityContext);

      assert(captured);
      const [capturedContext] = captured;
      assert.strictEqual(capturedContext, securityContext);
      assert.deepStrictEqual(payloadForWire(capturedContext), {
        ver: "1.0",
        database_access_token: "db-token-instance",
        end_user_token: "user-token-instance",
      });
    });

    it("327.1.5 Missing parameter", () => {
      assert.throws(() => connection.setEndUserSecurityContext(), /NJS-009:/);
    });

    it("327.1.6 Invalid parameter value", () => {
      assert.throws(
        () => makeSecurityContext({
          databaseAccessToken: "db-token-invalid",
        }),
        /NJS-005:/, // No endUserToken or endUserName given
      );

      assert.throws(
        () => connection.setEndUserSecurityContext(null),
        /NJS-005:/,
      );
    });

    it("327.1.7 Encoded security context exceeding the supported size", () => {
      assert.throws(
        () => makeSecurityContext({
          databaseAccessToken: "db-token-oversized",
          endUserToken: "user-token-oversized",
          attributes: {
            massive: "x".repeat(70000),
          },
        }),
        /NJS-189: Specified .* exceeds the maximum supported size \d+/,
      );
    });

    it("327.1.8 Non-TCPS protocol with security context", () => {
      const stub = createStubConnection({ protocol: "TCP" });

      assert.throws(
        () =>
          stub.setEndUserSecurityContext(makeSecurityContext({
            databaseAccessToken: "db-token-tcp",
            endUserToken: "user-token-tcp",
          })),
        /NJS-190:/,
      );
    });

    it("327.1.9 endUserName without key", () => {
      assert.throws(
        () => makeSecurityContext({
          databaseAccessToken: "db-token-name-only",
          endUserName: "name-only-user",
        }),
        /NJS-005:/,
      );
    });

    it("327.1.10 Context with only endUserToken", () => {
      const context = {
        databaseAccessToken: "db-token-token-only",
        endUserToken: "user-token-only",
      };

      const stub = createStubConnection();
      let captured;
      stub._impl.setEndUserSecurityContext = (...args) => {
        captured = args;
      };

      stub.setEndUserSecurityContext(makeSecurityContext(context));

      assert(captured);
      const [capturedContext] = captured;
      const payload = payloadForWire(capturedContext);
      assert.deepStrictEqual(payload, {
        ver: "1.0",
        database_access_token: "db-token-token-only",
        end_user_token: "user-token-only",
      });
      assert.strictEqual(
        Object.hasOwn(payload, "end_user_name"),
        false,
      );
      assert.strictEqual(
        Object.hasOwn(payload, "end_user_contextid"),
        false,
      );
    });

    it("327.1.11 Context with endUserName and key but without endUserToken", () => {
      const context = {
        databaseAccessToken: "db-token-name-key",
        endUserName: "named-user",
        key: "named-key",
      };

      const stub = createStubConnection();
      let captured;
      stub._impl.setEndUserSecurityContext = (...args) => {
        captured = args;
      };

      stub.setEndUserSecurityContext(makeSecurityContext(context));

      assert(captured);
      assert.strictEqual(captured.length, 1);
      const capturedContext = captured[0];
      assert(capturedContext instanceof oracledb.EndUserSecurityContext);
      const decoded = decodeContextPayload(capturedContext);
      assert.deepStrictEqual(decoded, {
        ver: "1.0",
        database_access_token: "db-token-name-key",
        end_user_name: "named-user",
        end_user_contextid: "named-key",
      });
      assert.strictEqual(
        Object.hasOwn(decoded, "end_user_token"),
        false,
      );
    });

    it("327.1.12 Extra parameters to setEndUserSecurityContext", () => {
      assert.throws(
        () =>
          connection.setEndUserSecurityContext(
            {
              databaseAccessToken: "db-token-extra-arg",
              endUserToken: "user-token-extra-arg",
            },
            "extra",
          ),
        /NJS-009:/,
      );
    });

    it("327.1.13 Non-object parameter values", () => {
      assert.throws(
        () => connection.setEndUserSecurityContext("not-an-object"),
        /NJS-005:/,
      );

      assert.throws(
        () => connection.setEndUserSecurityContext([]),
        /NJS-005:/,
      );
    });

    it("327.1.14 Invalid connection for setEndUserSecurityContext", () => {
      const stub = createInvalidStubConnection();

      assert.throws(
        () =>
          stub.setEndUserSecurityContext(makeSecurityContext({
            databaseAccessToken: "db-token-invalid-conn",
            endUserToken: "user-token-invalid-conn",
          })),
        /NJS-003:/,
      );
    });

    it("327.1.15 Extra parameters to setEndUserSecurityContext", () => {
      assert.throws(
        () =>
          connection.setEndUserSecurityContext(
            makeSecurityContext({
              databaseAccessToken: "db-token-extra-arg",
              endUserToken: "user-token-extra-arg",
            }),
            "extra",
          ),
        /NJS-009:/,
      );
    });

    it("327.1.16 Thin mode disabled on the connection", () => {
      const stub = createStubConnection();
      Object.defineProperty(stub, "thin", {
        configurable: true,
        get: () => false,
      });
      stub._impl.setEndUserSecurityContext = () => {
        throw new Error(
          "NJS-089: End-user security context is not supported by node-oracledb in Thick mode"
        );
      };

      assert.throws(
        () =>
          stub.setEndUserSecurityContext(makeSecurityContext({
            databaseAccessToken: "db-token-thick",
            endUserToken: "user-token-thick",
          })),
        /NJS-089:/
        // NJS-089: End-user security context is only supported in thin mode
      );
    });

    it("327.1.17 Passing undefined is not allowed", () => {
      const stub = createStubConnection();
      const callArgs = [];
      stub._impl.setEndUserSecurityContext = (...args) => {
        callArgs.push(args);
      };
      stub._impl.clearEndUserSecurityContext = (...args) => {
        callArgs.push(args);
      };

      const securityContext = makeSecurityContext({
        databaseAccessToken: "db-token-undefined",
        endUserToken: "user-token-undefined",
      });

      stub.setEndUserSecurityContext(securityContext);
      assert.throws(
        () => stub.setEndUserSecurityContext(undefined),
        /NJS-005:/,
      );

      assert.strictEqual(callArgs.length, 1);
      assert.strictEqual(callArgs[0].length, 1);
      assert.strictEqual(callArgs[0][0], securityContext);
    });

    it("327.1.18 Replacing thin security context clears previous payload", () => {
      const impl = Object.create(Object.getPrototypeOf(connection._impl));
      impl._protocol = {
        caps: {
          supportsEndUserSecurityContext: true,
        },
      };

      const firstSecurityContext = makeSecurityContext({
        databaseAccessToken: "db-token-replace-one",
        endUserToken: "user-token-replace-one",
      });
      const secondSecurityContext = makeSecurityContext({
        databaseAccessToken: "db-token-replace-two",
        endUserToken: "user-token-replace-two",
      });

      let clearCount = 0;
      const originalClear = firstSecurityContext.clearEncodedPayload.bind(
        firstSecurityContext
      );
      firstSecurityContext.clearEncodedPayload = () => {
        clearCount++;
        originalClear();
      };

      impl.setEndUserSecurityContext(firstSecurityContext);
      impl.setEndUserSecurityContext(secondSecurityContext);

      assert.strictEqual(clearCount, 1);
      assert.strictEqual(impl.securityContext, secondSecurityContext);
      assert(Buffer.isBuffer(secondSecurityContext.getDeobfuscatedValue()));
    });
  });

  describe("327.2 clearEndUserSecurityContext()", () => {
    it("327.2.1 Security context clearing on the driver implementation", () => {
      const context = {
        databaseAccessToken: "db-token-clear",
        endUserToken: "user-token-clear",
      };

      const callArgs = [];
      const stub = createStubConnection();
      stub._impl.setEndUserSecurityContext = (...args) => {
        callArgs.push(args);
      };
      stub._impl.clearEndUserSecurityContext = (...args) => {
        callArgs.push(args);
      };

      const securityContext = makeSecurityContext(context);
      stub.setEndUserSecurityContext(securityContext);
      stub.clearEndUserSecurityContext();

      assert.strictEqual(callArgs.length, 2);
      assert.strictEqual(callArgs[0].length, 1);
      assert.strictEqual(callArgs[0][0], securityContext);
      assert.strictEqual(callArgs[1].length, 0);
    });

    it("327.2.2 New security context after clearing", () => {
      const stub = createStubConnection();
      const callArgs = [];

      stub._impl.setEndUserSecurityContext = (...args) => {
        callArgs.push(args);
      };
      stub._impl.clearEndUserSecurityContext = (...args) => {
        callArgs.push(args);
      };

      const firstContext = {
        databaseAccessToken: "db-token-one",
        endUserToken: "token-one",
        endUserName: "user-one",
        key: "key-one",
      };

      const secondContext = {
        databaseAccessToken: "db-token-two",
        endUserToken: "token-two",
        endUserName: "user-two",
        key: "key-two",
      };

      const firstSecurityContext = makeSecurityContext(firstContext);
      const secondSecurityContext = makeSecurityContext(secondContext);

      stub.setEndUserSecurityContext(firstSecurityContext);
      stub.clearEndUserSecurityContext();
      stub.setEndUserSecurityContext(secondSecurityContext);

      assert.strictEqual(callArgs.length, 3);
      assert.strictEqual(callArgs[0].length, 1);
      const firstContextArg = callArgs[0][0];
      assert.strictEqual(firstContextArg, firstSecurityContext);
      assert.strictEqual(callArgs[1].length, 0);
      assert.strictEqual(callArgs[2].length, 1);
      const secondContextArg = callArgs[2][0];
      assert.strictEqual(secondContextArg, secondSecurityContext);

      const secondPayload = payloadForWire(secondSecurityContext);
      assert.strictEqual(secondPayload.end_user_token, "token-two");
      assert.strictEqual(secondPayload.end_user_name, "user-two");
      assert.strictEqual(secondPayload.end_user_contextid, "key-two");
      assert.strictEqual(secondPayload.database_access_token, "db-token-two");
    });

    it("327.2.3 Extra parameters to clearEndUserSecurityContext", () => {
      assert.throws(
        () => connection.clearEndUserSecurityContext("extra"),
        /NJS-009:/,
      );
    });

    it("327.2.4 Invalid connection for clearEndUserSecurityContext", () => {
      const stub = createInvalidStubConnection();

      assert.throws(
        () => stub.clearEndUserSecurityContext(),
        /NJS-003:/,
      );
    });

    it("327.2.5 Clearing without a previously set security context", () => {
      const stub = createStubConnection();
      const callArgs = [];
      stub._impl.clearEndUserSecurityContext = (...args) => {
        callArgs.push(args);
      };

      stub.clearEndUserSecurityContext();

      assert.strictEqual(callArgs.length, 1);
      assert.strictEqual(callArgs[0].length, 0);
    });
  });

  describe("327.3 EndUserSecurityContext attributes normalization", () => {
    it("327.3.1 Scalar and array attribute values", () => {
      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: "db-token-attrs",
        endUserToken: "user-token-attrs",
        attributes: {
          region: "us",
          departments: ["finance", "hr"],
        },
      });

      const payload = decodeContextPayload(securityContext);
      assert.deepStrictEqual(payload.attributes, [
        { name: "region", values: "us" },
        { name: "departments", values: ["finance", "hr"] },
      ]);
    });

    it("327.3.2 Null and undefined attribute values", () => {
      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: "db-token-attrs-filter",
        endUserName: "user-attrs-filter",
        key: "attrs-key",
        attributes: {
          keep: "value",
          dropNull: null,
          dropUndefined: undefined,
        },
      });

      const payload = decodeContextPayload(securityContext);
      assert.deepStrictEqual(payload.attributes, [
        { name: "keep", values: "value" },
        { name: "dropNull", values: null },
        { name: "dropUndefined", values: null },
      ]);
    });

    it("327.3.3 Non-object attribute containers", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-invalid-attrs",
            endUserToken: "user-invalid-attrs",
            attributes: ["not-an-object"],
          }),
        /NJS-005:/,
      );
    });

    it("327.3.4 Data role entries and array copy", () => {
      const roles = ["role-one", null];
      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: "db-token-roles",
        endUserToken: "user-token-roles",
        dataRoles: roles,
      });

      const payload = decodeContextPayload(securityContext);
      assert.deepStrictEqual(payload.data_roles, ["role-one", null]);
      assert.notStrictEqual(payload.data_roles, roles);
    });

    it("327.3.5 Source dataRoles mutation after constructor", () => {
      const roles = ["role-one"];
      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: "db-token-role-mutation",
        endUserToken: "user-token-role-mutation",
        dataRoles: roles,
      });

      roles.push("role-two");

      assert.deepStrictEqual(
        decodeContextPayload(securityContext).data_roles,
        ["role-one"],
      );
    });
  });

  describe("327.4 pooled connections", () => {
    let pool;
    let connectionsToClose;
    let implRestorations;

    before(async function() {
      if (!driverSupportsSecurityContext()) {
        this.skip();
        return;
      }
      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
      });
    });

    beforeEach(() => {
      connectionsToClose = [];
      implRestorations = [];
    });

    afterEach(async () => {
      while (connectionsToClose.length > 0) {
        const conn = connectionsToClose.pop();
        await conn.close();
      }

      while (implRestorations.length > 0) {
        const restore = implRestorations.pop();
        restore();
      }
    });

    after(async () => {
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it("327.4.1 Set and clear on pooled connections", async () => {
      const context = {
        databaseAccessToken: "db-token-pool",
        endUserToken: "user-token-pool",
        endUserName: "pooled-user",
        key: "pool-key",
        attributes: {
          region: "emea",
        },
      };

      const callArgs = [];
      const pooledConn = await pool.getConnection();
      connectionsToClose.push(pooledConn);
      assert(pooledConn);

      const impl = pooledConn._impl;
      assert(impl);

      const originalSet = impl.setEndUserSecurityContext
        ? impl.setEndUserSecurityContext.bind(impl)
        : undefined;
      const originalClear = impl.clearEndUserSecurityContext
        ? impl.clearEndUserSecurityContext.bind(impl)
        : undefined;
      implRestorations.push(() => {
        impl.setEndUserSecurityContext = originalSet;
      });
      implRestorations.push(() => {
        impl.clearEndUserSecurityContext = originalClear;
      });
      impl.setEndUserSecurityContext = (...args) => {
        callArgs.push(args);
        return originalSet ? originalSet(...args) : undefined;
      };
      impl.clearEndUserSecurityContext = (...args) => {
        callArgs.push(args);
        return originalClear ? originalClear(...args) : undefined;
      };

      pooledConn.setEndUserSecurityContext(makeSecurityContext(context));
      assert(callArgs.length >= 1);
      assert.strictEqual(callArgs[0].length, 1);
      const pooledContextArg = callArgs[0][0];
      assert(pooledContextArg instanceof oracledb.EndUserSecurityContext);

      const decoded = decodeContextPayload(pooledContextArg);
      const expected = decodeContextPayload(makeSecurityContext(context));
      assert.deepStrictEqual(decoded, expected);

      pooledConn.clearEndUserSecurityContext();
      const clearCall = callArgs.find((args) => args.length === 0);
      assert(clearCall);
    });

    it("327.4.2 Pooled connection close and reuse with security context", async () => {
      const firstContext = {
        databaseAccessToken: "db-token-first",
        endUserToken: "user-token-first",
      };

      const firstSetCalls = [];
      const firstClearCalls = [];
      const firstConn = await pool.getConnection();
      connectionsToClose.push(firstConn);
      const firstImpl = firstConn._impl;
      assert(firstImpl);

      const firstOriginalSet = firstImpl.setEndUserSecurityContext
        ? firstImpl.setEndUserSecurityContext.bind(firstImpl)
        : undefined;
      const firstOriginalClear = firstImpl.clearEndUserSecurityContext
        ? firstImpl.clearEndUserSecurityContext.bind(firstImpl)
        : undefined;

      implRestorations.push(() => {
        firstImpl.setEndUserSecurityContext = firstOriginalSet;
      });
      implRestorations.push(() => {
        firstImpl.clearEndUserSecurityContext = firstOriginalClear;
      });

      firstImpl.setEndUserSecurityContext = (...args) => {
        firstSetCalls.push(args);
        return firstOriginalSet ? firstOriginalSet(...args) : undefined;
      };
      firstImpl.clearEndUserSecurityContext = (...args) => {
        firstClearCalls.push(args);
        return firstOriginalClear ? firstOriginalClear(...args) : undefined;
      };

      firstConn.setEndUserSecurityContext(makeSecurityContext(firstContext));
      assert(firstSetCalls.length >= 1);
      const firstCapturedContext = firstSetCalls[0][0];
      assert(firstCapturedContext instanceof oracledb.EndUserSecurityContext);

      await firstConn.close();
      connectionsToClose.pop();

      if (firstClearCalls.length > 0) {
        assert.strictEqual(firstClearCalls[0].length, 0);
      }

      const secondContext = {
        databaseAccessToken: "db-token-second",
        endUserToken: "user-token-second",
      };

      const reusedSetCalls = [];
      const reusedClearCalls = [];
      const reusedConn = await pool.getConnection();
      connectionsToClose.push(reusedConn);
      const reusedImpl = reusedConn._impl;
      assert(reusedImpl);

      const reusedOriginalSet = reusedImpl.setEndUserSecurityContext
        ? reusedImpl.setEndUserSecurityContext.bind(reusedImpl)
        : undefined;
      const reusedOriginalClear = reusedImpl.clearEndUserSecurityContext
        ? reusedImpl.clearEndUserSecurityContext.bind(reusedImpl)
        : undefined;

      implRestorations.push(() => {
        reusedImpl.setEndUserSecurityContext = reusedOriginalSet;
      });
      implRestorations.push(() => {
        reusedImpl.clearEndUserSecurityContext = reusedOriginalClear;
      });

      reusedImpl.setEndUserSecurityContext = (...args) => {
        reusedSetCalls.push(args);
        return reusedOriginalSet ? reusedOriginalSet(...args) : undefined;
      };
      reusedImpl.clearEndUserSecurityContext = (...args) => {
        reusedClearCalls.push(args);
        return reusedOriginalClear ? reusedOriginalClear(...args) : undefined;
      };

      reusedConn.setEndUserSecurityContext(makeSecurityContext(secondContext));
      assert(reusedSetCalls.length >= 1);
      const reusedCapturedContext = reusedSetCalls[0][0];
      assert(reusedCapturedContext instanceof oracledb.EndUserSecurityContext);

      await reusedConn.close();
      connectionsToClose.pop();

      assert(reusedClearCalls.length >= 1);
      assert.strictEqual(reusedClearCalls[0].length, 0);
    });
  });

  describe("327.5 EndUserSecurityContext constructor", () => {
    it("327.5.1 Non-object constructor input", () => {
      assert.throws(
        () => new oracledb.EndUserSecurityContext("not-an-object"),
        /NJS-005:/,
      );

      assert.throws(
        () => new oracledb.EndUserSecurityContext(["not-an-object"]),
        /NJS-005:/,
      );
    });

    it("327.5.2 Missing or empty databaseAccessToken", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            endUserToken: "user-token-no-db-token",
          }),
        /NJS-005:/,
      );

      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "",
            endUserToken: "user-token-empty-db-token",
          }),
        /NJS-005:/,
      );
    });

    it("327.5.3 Non-string endUserToken values", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-invalid-end-user-token",
            endUserToken: 42,
          }),
        /NJS-005:/,
      );
    });

    it("327.5.4 Non-string endUserName values", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-invalid-end-user-name",
            endUserName: 42,
            key: "name-key",
          }),
        /NJS-005:/,
      );
    });

    it("327.5.5 Non-string key values", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-invalid-key",
            endUserName: "named-user",
            key: 42,
          }),
        /NJS-005:/,
      );
    });

    it("327.5.6 Non-array dataRoles", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-invalid-roles",
            endUserToken: "user-token-invalid-roles",
            dataRoles: "role-one",
          }),
        /NJS-005:/,
      );
    });

    it("327.5.7 Optional fields omitted in payloadForWire", () => {
      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: "db-token-minimal",
        endUserToken: "user-token-minimal",
      });

      assert.deepStrictEqual(decodeContextPayload(securityContext), {
        ver: "1.0",
        database_access_token: "db-token-minimal",
        end_user_token: "user-token-minimal",
      });
    });

    it("327.5.8 Repeated payloadForWire calls", () => {
      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: "db-token-repeat-payload",
        endUserToken: "user-token-repeat-payload",
      });

      const firstPayload = decodeContextPayload(securityContext);
      const secondPayload = decodeContextPayload(securityContext);

      assert.notStrictEqual(firstPayload, secondPayload);
      assert.deepStrictEqual(secondPayload, {
        ver: "1.0",
        database_access_token: "db-token-repeat-payload",
        end_user_token: "user-token-repeat-payload",
      });
    });

    it("327.5.9 Non-string databaseAccessToken values", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: 42,
            endUserToken: "user-token-non-string-db-token",
          }),
        /NJS-005:/,
      );
    });

    it("327.5.10 Missing both endUserToken and endUserName", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-missing-end-user",
          }),
        /NJS-005:/,
      );
    });

    it("327.5.11 Empty endUserToken", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-empty-end-user-token",
            endUserToken: "",
          }),
        /NJS-005:/,
      );
    });

    it("327.5.12 Whitespace-only token strings", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "   \t\n",
            endUserToken: "user-token-valid",
          }),
        /NJS-005:/,
      );

      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-valid",
            endUserToken: "   \t\n",
          }),
        /NJS-005:/,
      );
    });

    it("325.5.13 Null-valued endUserToken is rejected", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-null-token",
            endUserToken: null,
          }),
        /NJS-005:/,
      );
    });

    it("325.5.14 Null-valued endUserName is rejected", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-null-name",
            endUserName: null,
            key: "contextid",
          }),
        /NJS-005:/,
      );
    });

    it("325.5.15 Empty key is rejected", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-empty-key",
            endUserName: "named-user",
            key: "",
          }),
        /NJS-005:/,
      );
    });

    it("325.5.16 Whitespace-only key is rejected", () => {
      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: "db-token-whitespace-key",
            endUserName: "named-user",
            key: "   \t\n",
          }),
        /NJS-005:/,
      );
    });
  });

  describe("327.6 token-backed security contexts", () => {
    let pool;
    let midtierToken;
    let userToken1;
    let userToken2;
    let userToken3;
    let connectionsToClose;
    let implRestorations;

    function readTokenFromEnv(name) {
      return fs.readFileSync(process.env[name], "utf8").trim();
    }

    function getSessionXsUser(sessionContext) {
      if (sessionContext.SESSION_XS_USER &&
          sessionContext.SESSION_XS_USER !== "XS$NULL") {
        return sessionContext.SESSION_XS_USER;
      }
      if (sessionContext.CURRENT_XS_USER &&
          sessionContext.CURRENT_XS_USER !== "XS$NULL") {
        return sessionContext.CURRENT_XS_USER;
      }
      return null;
    }

    function assertSchemaUserContext(sessionContext) {
      const expectedUser = dbConfig.user.toUpperCase();
      assert.strictEqual(getSessionXsUser(sessionContext), null);
      assert.strictEqual(sessionContext.CURRENT_USER.toUpperCase(), expectedUser);
      assert.strictEqual(sessionContext.SESSION_USER.toUpperCase(), expectedUser);
    }

    async function getXsSessionContext(conn) {
      const result = await conn.execute(
        `SELECT XS_SYS_CONTEXT('XS$SESSION', 'SESSION_XS_USER') AS session_xs_user,
                  XS_SYS_CONTEXT('XS$SESSION', 'CURRENT_XS_USER') AS current_xs_user,
                  SYS_CONTEXT('USERENV', 'CURRENT_USER') AS current_user,
                  SYS_CONTEXT('USERENV', 'SESSION_USER') AS session_user
           FROM dual`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return result.rows[0];
    }

    before(async function() {
      if (!driverSupportsSecurityContext()) {
        this.skip();
        return;
      }
      midtierToken = "midtier-token-sample";
      userToken1 = "user-token-sample-1";
      userToken2 = "user-token-sample-2";
      userToken3 = "user-token-sample-3";

      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin: 0,
        poolMax: 1,
        poolIncrement: 1,
      });
    });

    beforeEach(() => {
      connectionsToClose = [];
      implRestorations = [];
    });

    afterEach(async () => {
      while (connectionsToClose.length > 0) {
        const conn = connectionsToClose.pop();
        await conn.close();
      }

      while (implRestorations.length > 0) {
        const restore = implRestorations.pop();
        restore();
      }
    });

    after(async () => {
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it("327.6.1 Configured tokens across pooled connection close and reuse", async () => {
      const firstSetCalls = [];
      const firstClearCalls = [];
      const firstConn = await pool.getConnection();
      connectionsToClose.push(firstConn);
      const firstImpl = firstConn._impl;
      const firstOriginalSet = firstImpl.setEndUserSecurityContext
        ? firstImpl.setEndUserSecurityContext.bind(firstImpl)
        : undefined;
      const firstOriginalClear = firstImpl.clearEndUserSecurityContext
        ? firstImpl.clearEndUserSecurityContext.bind(firstImpl)
        : undefined;

      implRestorations.push(() => {
        firstImpl.setEndUserSecurityContext = firstOriginalSet;
      });
      implRestorations.push(() => {
        firstImpl.clearEndUserSecurityContext = firstOriginalClear;
      });

      firstImpl.setEndUserSecurityContext = (...args) => {
        firstSetCalls.push(args);
        return firstOriginalSet ? firstOriginalSet(...args) : undefined;
      };
      firstImpl.clearEndUserSecurityContext = (...args) => {
        firstClearCalls.push(args);
        return firstOriginalClear ? firstOriginalClear(...args) : undefined;
      };

      const firstSecurityContext = makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken1,
        attributes: {
          region: "emea",
        },
      });
      firstConn.setEndUserSecurityContext(firstSecurityContext);

      assert.strictEqual(firstSetCalls.length, 1);
      const firstCapturedContext = firstSetCalls[0][0];
      assert.strictEqual(firstCapturedContext, firstSecurityContext);
      const firstDecoded = decodeContextPayload(firstCapturedContext);
      assert(firstDecoded);

      await firstConn.close();
      connectionsToClose.pop();

      assert(firstClearCalls.length >= 1);
      assert.strictEqual(firstClearCalls[0].length, 0);

      const reusedSetCalls = [];
      const reusedClearCalls = [];
      const reusedConn = await pool.getConnection();
      connectionsToClose.push(reusedConn);
      const reusedImpl = reusedConn._impl;
      const reusedOriginalSet = reusedImpl.setEndUserSecurityContext
        ? reusedImpl.setEndUserSecurityContext.bind(reusedImpl)
        : undefined;
      const reusedOriginalClear = reusedImpl.clearEndUserSecurityContext
        ? reusedImpl.clearEndUserSecurityContext.bind(reusedImpl)
        : undefined;

      implRestorations.push(() => {
        reusedImpl.setEndUserSecurityContext = reusedOriginalSet;
      });
      implRestorations.push(() => {
        reusedImpl.clearEndUserSecurityContext = reusedOriginalClear;
      });

      reusedImpl.setEndUserSecurityContext = (...args) => {
        reusedSetCalls.push(args);
        return reusedOriginalSet ? reusedOriginalSet(...args) : undefined;
      };
      reusedImpl.clearEndUserSecurityContext = (...args) => {
        reusedClearCalls.push(args);
        return reusedOriginalClear ? reusedOriginalClear(...args) : undefined;
      };

      reusedConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken2,
        attributes: {
          region: "apac",
        },
      }));

      const reusedCapturedContext = reusedSetCalls[0][0];
      assert(reusedCapturedContext instanceof oracledb.EndUserSecurityContext);
      const reusedDecoded = decodeContextPayload(reusedCapturedContext);
      assert.strictEqual(firstDecoded.end_user_token, userToken1);
      assert.strictEqual(reusedDecoded.end_user_token, userToken2);
      assert.deepStrictEqual(firstDecoded.attributes, [
        { name: "region", values: "emea" },
      ]);
      assert.deepStrictEqual(reusedDecoded.attributes, [
        { name: "region", values: "apac" },
      ]);
      assert.strictEqual(reusedClearCalls.length, 0);
    });

    it("327.6.2 Configured tokens, attributes, and dataRoles across pooled reuse", async () => {
      const firstConn = await pool.getConnection();
      connectionsToClose.push(firstConn);
      const firstImpl = firstConn._impl;
      const firstOriginalSet = firstImpl.setEndUserSecurityContext
        ? firstImpl.setEndUserSecurityContext.bind(firstImpl)
        : undefined;
      const firstSetCalls = [];

      implRestorations.push(() => {
        firstImpl.setEndUserSecurityContext = firstOriginalSet;
      });
      firstImpl.setEndUserSecurityContext = (...args) => {
        firstSetCalls.push(args);
        return firstOriginalSet ? firstOriginalSet(...args) : undefined;
      };

      const firstSecurityContext = makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken2,
        dataRoles: ["role-two"],
        attributes: {
          department: "finance",
        },
      });
      firstConn.setEndUserSecurityContext(firstSecurityContext);

      const firstCaptured = firstSetCalls[0][0];
      assert.strictEqual(firstCaptured, firstSecurityContext);
      const firstDecoded = decodeContextPayload(firstCaptured);

      await firstConn.close();
      connectionsToClose.pop();

      const secondConn = await pool.getConnection();
      connectionsToClose.push(secondConn);
      const secondImpl = secondConn._impl;
      const secondOriginalSet = secondImpl.setEndUserSecurityContext
        ? secondImpl.setEndUserSecurityContext.bind(secondImpl)
        : undefined;
      const secondSetCalls = [];

      implRestorations.push(() => {
        secondImpl.setEndUserSecurityContext = secondOriginalSet;
      });
      secondImpl.setEndUserSecurityContext = (...args) => {
        secondSetCalls.push(args);
        return secondOriginalSet ? secondOriginalSet(...args) : undefined;
      };

      const secondSecurityContext = makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken3,
        dataRoles: ["role-three"],
        attributes: {
          department: "support",
        },
      });
      secondConn.setEndUserSecurityContext(secondSecurityContext);

      const secondCaptured = secondSetCalls[0][0];
      assert.strictEqual(secondCaptured, secondSecurityContext);
      const secondDecoded = decodeContextPayload(secondCaptured);
      assert.deepStrictEqual(firstDecoded.data_roles, ["role-two"]);
      assert.deepStrictEqual(secondDecoded.data_roles, ["role-three"]);
      assert.deepStrictEqual(firstDecoded.attributes, [
        { name: "department", values: "finance" },
      ]);
      assert.deepStrictEqual(secondDecoded.attributes, [
        { name: "department", values: "support" },
      ]);
      assert.notDeepStrictEqual(firstDecoded, secondDecoded);
    });

    it("327.6.3 Token-backed context visible in the database session", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken1 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");

      const pooledConn = await pool.getConnection();
      connectionsToClose.push(pooledConn);

      pooledConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken1,
      }));

      const sessionContext = await getXsSessionContext(pooledConn);
      assert(getSessionXsUser(sessionContext));
      assert.strictEqual(sessionContext.CURRENT_USER, "XS$NULL");
      assert.strictEqual(sessionContext.SESSION_USER, "XS$NULL");
    });

    it("327.6.4 Different user tokens in database session users", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN2) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken1 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");
      const userToken2 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN2");

      const pooledConn = await pool.getConnection();
      connectionsToClose.push(pooledConn);

      pooledConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken1,
      }));
      const firstSessionContext = await getXsSessionContext(pooledConn);

      pooledConn.clearEndUserSecurityContext();
      pooledConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken2,
      }));
      const secondSessionContext = await getXsSessionContext(pooledConn);

      const firstSessionUser = getSessionXsUser(firstSessionContext);
      const secondSessionUser = getSessionXsUser(secondSessionContext);

      assert(firstSessionUser);
      assert(secondSessionUser);
      assert.notStrictEqual(firstSessionUser, secondSessionUser);
      assert.strictEqual(firstSessionContext.CURRENT_USER, "XS$NULL");
      assert.strictEqual(secondSessionContext.CURRENT_USER, "XS$NULL");
    });

    it("327.6.5 clearEndUserSecurityContext and schema user in the database session", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");

      const pooledConn = await pool.getConnection();
      connectionsToClose.push(pooledConn);

      const baseSessionContext = await getXsSessionContext(pooledConn);
      assertSchemaUserContext(baseSessionContext);

      pooledConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken,
      }));

      const securedSessionContext = await getXsSessionContext(pooledConn);
      assert(getSessionXsUser(securedSessionContext));
      assert.strictEqual(securedSessionContext.CURRENT_USER, "XS$NULL");
      assert.strictEqual(securedSessionContext.SESSION_USER, "XS$NULL");

      pooledConn.clearEndUserSecurityContext();

      const clearedSessionContext = await getXsSessionContext(pooledConn);
      assertSchemaUserContext(clearedSessionContext);
    });

    it("327.6.6 Token switching and clearEndUserSecurityContext in live XS session", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN2) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken1 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");
      const userToken2 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN2");

      const pooledConn = await pool.getConnection();
      connectionsToClose.push(pooledConn);

      pooledConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken1,
      }));
      const firstSessionContext = await getXsSessionContext(pooledConn);

      pooledConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken2,
      }));
      const secondSessionContext = await getXsSessionContext(pooledConn);

      const firstSessionUser = getSessionXsUser(firstSessionContext);
      const secondSessionUser = getSessionXsUser(secondSessionContext);

      assert(firstSessionUser);
      assert(secondSessionUser);
      assert.notStrictEqual(firstSessionUser, secondSessionUser);
      assert.strictEqual(secondSessionContext.CURRENT_USER, "XS$NULL");

      pooledConn.clearEndUserSecurityContext();

      const clearedSessionContext = await getXsSessionContext(pooledConn);
      assertSchemaUserContext(clearedSessionContext);
    });

    it("327.6.7 Security context across pooled connection close and reacquire", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");

      const firstConn = await pool.getConnection();
      connectionsToClose.push(firstConn);

      firstConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken,
      }));

      const securedSessionContext = await getXsSessionContext(firstConn);
      assert(getSessionXsUser(securedSessionContext));
      assert.strictEqual(securedSessionContext.CURRENT_USER, "XS$NULL");

      await firstConn.close();
      connectionsToClose.pop();

      const reusedConn = await pool.getConnection();
      connectionsToClose.push(reusedConn);

      const reusedSessionContext = await getXsSessionContext(reusedConn);
      assertSchemaUserContext(reusedSessionContext);
    });

    it("327.6.8 Multiple security contexts before the first round-trip", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN2) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken1 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");
      const userToken2 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN2");

      const pendingConn = await oracledb.getConnection(dbConfig);
      const token1Conn = await oracledb.getConnection(dbConfig);
      const token2Conn = await oracledb.getConnection(dbConfig);
      connectionsToClose.push(pendingConn, token1Conn, token2Conn);

      pendingConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken1,
      }));
      pendingConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken2,
      }));

      token1Conn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken1,
      }));
      token2Conn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken2,
      }));

      const [pendingSessionContext, token1SessionContext, token2SessionContext] =
        await Promise.all([
          getXsSessionContext(pendingConn),
          getXsSessionContext(token1Conn),
          getXsSessionContext(token2Conn),
        ]);

      const pendingSessionUser = getSessionXsUser(pendingSessionContext);
      const token1SessionUser = getSessionXsUser(token1SessionContext);
      const token2SessionUser = getSessionXsUser(token2SessionContext);

      assert(pendingSessionUser);
      assert(token1SessionUser);
      assert(token2SessionUser);
      assert.strictEqual(pendingSessionUser, token2SessionUser);
      assert.notStrictEqual(pendingSessionUser, token1SessionUser);
      assert.strictEqual(pendingSessionContext.CURRENT_USER, "XS$NULL");
    });

    it("327.6.9 clearEndUserSecurityContext before the first round-trip", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");

      const pendingConn = await oracledb.getConnection(dbConfig);
      connectionsToClose.push(pendingConn);

      pendingConn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken,
      }));
      pendingConn.clearEndUserSecurityContext();

      const sessionContext = await getXsSessionContext(pendingConn);
      assertSchemaUserContext(sessionContext);
    });

    it("327.6.10 Simultaneous live sessions with different user tokens", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN ||
            !process.env.NODE_ORACLEDB_USER_TOKEN2) {
        this.skip();
      }
      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const userToken1 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN");
      const userToken2 = readTokenFromEnv("NODE_ORACLEDB_USER_TOKEN2");

      const conn1 = await oracledb.getConnection(dbConfig);
      const conn2 = await oracledb.getConnection(dbConfig);
      connectionsToClose.push(conn1, conn2);

      conn1.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken1,
      }));
      conn2.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: userToken2,
      }));

      const [sessionContext1, sessionContext2] = await Promise.all([
        getXsSessionContext(conn1),
        getXsSessionContext(conn2),
      ]);

      const sessionUser1 = getSessionXsUser(sessionContext1);
      const sessionUser2 = getSessionXsUser(sessionContext2);

      assert(sessionUser1);
      assert(sessionUser2);
      assert.notStrictEqual(sessionUser1, sessionUser2);
      assert.strictEqual(sessionContext1.CURRENT_USER, "XS$NULL");
      assert.strictEqual(sessionContext2.CURRENT_USER, "XS$NULL");
    });

  });

  describe("327.7 OBO token-backed security contexts", () => {
    let pool;
    let connectionsToClose;

    function readTokenFromEnv(name) {
      return fs.readFileSync(process.env[name], "utf8").trim();
    }

    function getSessionXsUser(sessionContext) {
      if (sessionContext.SESSION_XS_USER &&
          sessionContext.SESSION_XS_USER !== "XS$NULL") {
        return sessionContext.SESSION_XS_USER;
      }
      if (sessionContext.CURRENT_XS_USER &&
          sessionContext.CURRENT_XS_USER !== "XS$NULL") {
        return sessionContext.CURRENT_XS_USER;
      }
      return null;
    }

    async function getXsSessionContext(conn) {
      const result = await conn.execute(
        `SELECT XS_SYS_CONTEXT('XS$SESSION', 'SESSION_XS_USER') AS session_xs_user,
                  XS_SYS_CONTEXT('XS$SESSION', 'CURRENT_XS_USER') AS current_xs_user,
                  SYS_CONTEXT('USERENV', 'CURRENT_USER') AS current_user,
                  SYS_CONTEXT('USERENV', 'SESSION_USER') AS session_user
           FROM dual`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return result.rows[0];
    }

    before(function() {
      if (!driverSupportsSecurityContext()) {
        this.skip();
      }
    });

    before(async () => {
      pool = await oracledb.createPool({
        ...dbConfig,
        poolMin: 0,
        poolMax: 2,
        poolIncrement: 1,
      });
    });

    beforeEach(() => {
      connectionsToClose = [];
    });

    afterEach(async () => {
      while (connectionsToClose.length > 0) {
        const conn = connectionsToClose.pop();
        await conn.close();
      }
    });

    after(async () => {
      if (pool) {
        await pool.close(0);
        pool = null;
      }
    });

    it("327.7.1 OBO token-backed context visible in the database session", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
          !process.env.NODE_ORACLEDB_OBO_MIDTIERAPP_USER1_TOKEN) {
        this.skip();
      }

      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const oboUser1Token = readTokenFromEnv("NODE_ORACLEDB_OBO_MIDTIERAPP_USER1_TOKEN");

      const conn = await pool.getConnection();
      connectionsToClose.push(conn);

      conn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: oboUser1Token,
      }));

      const sessionContext = await getXsSessionContext(conn);
      assert(getSessionXsUser(sessionContext));
      assert.strictEqual(sessionContext.CURRENT_USER, "XS$NULL");
      assert.strictEqual(sessionContext.SESSION_USER, "XS$NULL");
    });

    it("327.7.2 Different OBO user tokens map to different XS users", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
          !process.env.NODE_ORACLEDB_OBO_MIDTIERAPP_USER1_TOKEN ||
          !process.env.NODE_ORACLEDB_OBO_MIDTIERAPP_USER2_TOKEN) {
        this.skip();
      }

      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const oboUser1Token = readTokenFromEnv("NODE_ORACLEDB_OBO_MIDTIERAPP_USER1_TOKEN");
      const oboUser2Token = readTokenFromEnv("NODE_ORACLEDB_OBO_MIDTIERAPP_USER2_TOKEN");

      const conn = await pool.getConnection();
      connectionsToClose.push(conn);

      conn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: oboUser1Token,
      }));
      const firstSessionContext = await getXsSessionContext(conn);

      conn.clearEndUserSecurityContext();

      conn.setEndUserSecurityContext(makeSecurityContext({
        databaseAccessToken: midtierToken,
        endUserToken: oboUser2Token,
      }));
      const secondSessionContext = await getXsSessionContext(conn);

      const firstSessionUser = getSessionXsUser(firstSessionContext);
      const secondSessionUser = getSessionXsUser(secondSessionContext);

      assert(firstSessionUser);
      assert(secondSessionUser);
      assert.notStrictEqual(firstSessionUser, secondSessionUser);
      assert.strictEqual(firstSessionContext.CURRENT_USER, "XS$NULL");
      assert.strictEqual(secondSessionContext.CURRENT_USER, "XS$NULL");
    });

    it("327.7.3 OBO tokens with direct HR table access", async function() {
      if (!process.env.NODE_ORACLEDB_MIDTIER_TOKEN ||
          !process.env.NODE_ORACLEDB_OBO_MIDTIERAPP_USER1_TOKEN ||
          !process.env.NODE_ORACLEDB_OBO_MIDTIERAPP_USER2_TOKEN) {
        this.skip();
      }

      const midtierToken = readTokenFromEnv("NODE_ORACLEDB_MIDTIER_TOKEN");
      const oboTokens = [
        readTokenFromEnv("NODE_ORACLEDB_OBO_MIDTIERAPP_USER1_TOKEN"),
        readTokenFromEnv("NODE_ORACLEDB_OBO_MIDTIERAPP_USER2_TOKEN"),
      ];

      for (const oboToken of oboTokens) {
        const conn = await oracledb.getConnection(dbConfig);
        connectionsToClose.push(conn);

        conn.setEndUserSecurityContext(makeSecurityContext({
          databaseAccessToken: midtierToken,
          endUserToken: oboToken,
        }));

        const sessionContext = await getXsSessionContext(conn);
        assert(getSessionXsUser(sessionContext));
        assert.strictEqual(sessionContext.CURRENT_USER, "XS$NULL");

        await assert.rejects(
          async () => await conn.execute("SELECT COUNT(salary) FROM hr.employees"),
          /ORA-00942:/,
        );
      }
    });
  });

});
