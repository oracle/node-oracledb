/* Copyright (c) 2024, 2026, Oracle and/or its affiliates. */

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
 *   307. traceCalls.js
 *
 * DESCRIPTION
 *   Testing traces.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');

describe('307. traceCalls.js', function() {

  let conn;
  let roundTripSpans = 4; // pre-23ai

  after(async () => {
    // restore to default tracing.
    oracledb.traceHandler.setTraceInstance();
    if (conn) {
      await conn.close();
    }
  });

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);
    if (!oracledb.thin) {
      roundTripSpans = 0; // onBeginRoundTrip, onBeginRoundTrip are not called.
    } else if (conn.oracleServerVersion >= 2304002405) {
      roundTripSpans = 2;
    }
  });

  describe('307.1 test the default traceHandler interface behaviour', () => {
    let conn;
    const traceHandler = oracledb.traceHandler;
    let traceInstance;
    let logs = [];
    const userContext = {k1: 'val1'};

    class myTraceHandler extends traceHandler.TraceHandlerBase {
      constructor(config) {
        super(config);
      }

      onBeginRoundTrip(traceContext) {
        logs.push(traceContext);
        return userContext;
      }

      onEndRoundTrip(traceContext, userContext) {
        logs.push({...traceContext, ...userContext});
      }

      onEnterFn(traceContext) {
        logs.push(traceContext);
        return userContext;
      }

      onExitFn(traceContext, userContext) {
        logs.push({...traceContext, ...userContext});
      }
    }

    beforeEach(() => {
      logs = [];
      conn = undefined;
      traceInstance = new myTraceHandler({enable: true});
    });

    afterEach(async () => {
      // release the custom instance.
      oracledb.traceHandler.setTraceInstance();
      if (conn) {
        await conn.close();
      }
    });

    it('307.1.1 getConnection default behaviour with no instance set', async function() {
      conn = await oracledb.getConnection(dbConfig);
      assert((logs.length === 0));
    });

    it('307.1.2 getConnection behaviour with a custom instance enabling trace', async function() {
      traceInstance.enable();
      oracledb.traceHandler.setTraceInstance(traceInstance);
      conn = await oracledb.getConnection(dbConfig);

      // getConnection causes onEnterFn, onExitFn to be called for
      // public API getConnection. onBeginRoundTrip, onEndRoundTrip callbacks are called
      // for each roundtrip to DB.
      assert((logs.length === (roundTripSpans * 2 + 2)));
    }); // 307.1.4

    it('307.1.3 getConnection behaviour with a custom instance disabling trace', async function() {
      traceInstance.disable();
      oracledb.traceHandler.setTraceInstance(traceInstance);
      conn = await oracledb.getConnection(dbConfig);

      // getConnection causes onEnterFn, onExitFn to be called for
      // public API getConnection. onBeginRoundTrip, onEndRoundTrip callbacks are called
      // for each roundtrip to DB.
      assert((logs.length === 0));
    }); // 307.1.4

    it('307.1.4 test getConnection fail behaviour with custom instance enabling trace ', async function() {
      traceInstance.enable();
      oracledb.traceHandler.setTraceInstance(traceInstance);
      const wrongConfig = Object.assign({}, dbConfig);
      wrongConfig.password = 'nil';
      await assert.rejects(
        async () => await oracledb.getConnection(wrongConfig),
        /ORA-01017:/
      );
      assert((logs.length === (roundTripSpans * 2 + 2)));
    }); // 307.1.4

    it('307.1.5 test getConnection fail behaviour with custom instance disabling trace ', async function() {
      traceInstance.disable();
      oracledb.traceHandler.setTraceInstance(traceInstance);
      const wrongConfig = Object.assign({}, dbConfig);
      wrongConfig.password = 'nil';
      await assert.rejects(
        async () => await oracledb.getConnection(wrongConfig),
        /ORA-01017:/
      );
      assert((logs.length === 0));
    }); // 307.1.5

  }); // 307.1

  describe('307.2 connectTraceConfig', () => {
    let connection;

    before(async () => {
      connection = await oracledb.getConnection(dbConfig);
    });

    after(async () => {
      if (connection) {
        await connection.close();
      }
    });

    it('307.2.1 exposes connection level trace details', function() {
      const traceConfig = connection.connectTraceConfig;

      assert(traceConfig, 'Expected connectTraceConfig to return value');
      assert.strictEqual(typeof traceConfig, 'object');

      if (dbConfig.user) {
        assert.strictEqual(traceConfig.user, dbConfig.user);
      } else if (dbConfig.username) {
        assert.strictEqual(traceConfig.user, dbConfig.username);
      }

      const cfgConnectString = dbConfig.connectString || dbConfig.connectionString;
      if (cfgConnectString) {
        if (!oracledb.thickModeDSNPassthrough) {
          assert.ok(/\(DESCRIPTION=/.test(traceConfig.connectString));
        } else {
          assert.strictEqual(traceConfig.connectString, cfgConnectString);
        }
      }

      const commonProps = ['serviceName', 'instanceName', 'pdbName', 'dbName', 'domainName'];
      for (const prop of commonProps) {
        assert(Object.prototype.hasOwnProperty.call(traceConfig, prop), `Missing property ${prop}`);
      }

      if (oracledb.thin) {
        const thinProps = ['hostName', 'port', 'protocol', 'dbUniqueName'];
        for (const prop of thinProps) {
          assert(Object.prototype.hasOwnProperty.call(traceConfig, prop), `Missing thin property ${prop}`);
        }
      }
    });
  });
});

describe('307.3 CLIENTCONTEXT trace propagation', function() {
  const traceHandler = oracledb.traceHandler;
  const traceParentValue = '00-0000000000000000000000000000feed-000000000000beef-01';

  class EnterFnTraceHandler extends traceHandler.TraceHandlerBase {
    constructor() {
      super();
      this.enable();
    }

    onEnterFn(traceContext) {
      const self = traceContext.additionalConfig?.self;
      if (self?.appContext) {
        self.appContext('CLIENTCONTEXT', [{ora$opentelem$tracectx: traceParentValue}]);
      }
    }
  }

  class BeginRoundTripTraceHandler extends traceHandler.TraceHandlerBase {
    constructor() {
      super();
      this.enable();
    }

    onBeginRoundTrip(traceContext) {
      const userContext = traceContext.userContext || {};
      userContext.traceParent = traceParentValue;
      traceContext.userContext = userContext;
    }
  }

  let connection;

  afterEach(async () => {
    oracledb.traceHandler.setTraceInstance();
    if (connection) {
      try {
        connection.clearAppContext('CLIENTCONTEXT');
      } catch {
        // ignore cleanup failures so the connection still closes
      }
      await connection.close();
      connection = undefined;
    }
  });

  async function createConnectionWithHandler(handler) {
    traceHandler.setTraceInstance(handler);
    connection = await oracledb.getConnection(dbConfig);
  }

  async function fetchTraceParentValue() {
    await connection.execute('SELECT 1 FROM dual');
    const queryResult = await connection.execute(
      "SELECT SYS_CONTEXT('CLIENTCONTEXT', 'ora$opentelem$tracectx') FROM dual"
    );
    return queryResult.rows[0][0];
  }

  it('307.3.1 sets trace context in CLIENTCONTEXT when userContext.traceParent exists', async () => {
    await createConnectionWithHandler(new EnterFnTraceHandler());
    const resultValue = await fetchTraceParentValue();
    assert.strictEqual(resultValue, traceParentValue);
  });

  (oracledb.thin ? it : it.skip)('307.3.2 sets trace context in CLIENTCONTEXT when userContext.traceParent is populated during onBeginRoundTrip', async () => {
    await createConnectionWithHandler(new BeginRoundTripTraceHandler());
    const resultValue = await fetchTraceParentValue();
    assert.strictEqual(resultValue, traceParentValue);
  });

  (oracledb.thin ? it : it.skip)('307.3.3 preserves existing CLIENTCONTEXT entries when trace handler appends traceParent', async () => {
    await createConnectionWithHandler(new BeginRoundTripTraceHandler());
    await connection.appContext('CLIENTCONTEXT', [{ usertrace: 'userValue1' }]);
    await connection.appContext('CLIENTCONTEXT', [{ usertrace: 'userValue2' }]);
    const result = await connection.execute(
      "SELECT SYS_CONTEXT('CLIENTCONTEXT', 'usertrace'), SYS_CONTEXT('CLIENTCONTEXT', 'ora$opentelem$tracectx') FROM dual"
    );
    assert.deepStrictEqual(result.rows[0], ['userValue2', traceParentValue]);
  });
});
