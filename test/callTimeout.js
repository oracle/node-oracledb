/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   222. callTimeout.js
 *
 * DESCRIPTION
 *   Test "Connection.callTimeout" property.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe.skip('222. callTimeout.js', () => {

  let isRunnable = true;
  let conn;

  before(async function() {
    const isRunnable = await testsUtil.checkPrerequisites();
    if (!isRunnable) {
      this.skip();
      return;
    } else {
      conn = await oracledb.getConnection(dbconfig);
    }
  }); // before()

  after(async function() {
    if (!isRunnable) {
      this.skip();
      return;
    } else {
      await conn.close();
    }
  });

  it('222.1 examples/calltimeout.js', async () => {
    try {
      const TIME_OUT = 2;
      const DB_OP_TIME = 4;

      conn.callTimeout = TIME_OUT * 1000;  // milliseconds

      await assert.rejects(
        async () => {
          await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [DB_OP_TIME]);
        },
        /DPI-1067/
      );
    } catch (err) {
      should.not.exist(err);
    }

  }); // 222.1

  it('222.2 the timeout value is greater than the operation time', async () => {
    try {
      const TIME_OUT = 10;
      const DB_OP_TIME = 2;

      conn.callTimeout = TIME_OUT * 1000;  // milliseconds

      await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [DB_OP_TIME]);

    } catch (err) {
      should.not.exist(err);
    }
  }); // 222.2

  it('222.3 callTimeout is 0', async () => {
    try {
      const TIME_OUT = 0;
      const DB_OP_TIME = 2;

      conn.callTimeout = TIME_OUT;

      await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [DB_OP_TIME]);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 222.3

  it('222.4 callTimeout is a negative value', async () => {
    try {
      const TIME_OUT = -5;

      should.throws(
        () => {
          conn.callTimeout = TIME_OUT;
        },
        "NJS-004: invalid value for property callTimeout"
      );
    } catch (err) {
      should.not.exist(err);
    }
  }); // 222.4

  it('222.5 callTimeout == NaN', async () => {
    try {
      const TIME_OUT = NaN;

      should.throws(
        () => {
          conn.callTimeout = TIME_OUT;
        },
        "NJS-004: invalid value for property callTimeout"
      );
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('222.6 callTimeout is a String', async () => {
    try {
      const TIME_OUT = 'foobar';

      should.throws(
        () => {
          conn.callTimeout = TIME_OUT;
        },
        "NJS-004: invalid value for property callTimeout"
      );
    } catch (err) {
      should.not.exist(err);
    }
  });

  it('222.7 The callTimeout value applies not to the sum of all round-trips', async () => {
    try {
      const TIME_OUT = 4;

      conn.callTimeout = TIME_OUT * 1000;  // milliseconds

      await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [2]);
      await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [3]);
      await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [2]);
    } catch (err) {
      should.not.exist(err);
    }
  }); // 222.7

  it('222.8 The callTimeout value applies to each round-trip individually', async () => {
    try {
      const TIME_OUT = 2;
      const DB_OP_TIME = 4;

      conn.callTimeout = TIME_OUT * 1000;  // milliseconds

      await assert.rejects(
        async () => {
          await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [DB_OP_TIME]);
        },
        /DPI-1067/
      );

      await conn.execute(`BEGIN DBMS_SESSION.SLEEP(:sleepsec); END;`, [1]);
      let result = await conn.execute(`SELECT (1+2) AS SUM FROM DUAL`);
      should.strictEqual(3, result.rows[0][0]);

    } catch (err) {
      should.not.exist(err);
    }
  });
});
