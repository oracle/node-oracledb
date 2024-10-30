/* Copyright (c) 2024, Oracle and/or its affiliates. */

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
});
