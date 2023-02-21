/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   212. dbObject13.js
 *
 * DESCRIPTION
 *   examples/plsqlvarrayrecord.js
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('212. dbObject13.js', function() {

  let isRunnable = false;

  let conn;
  const PKG = 'NODB_NETBALL_PKG';

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites();
    if (!isRunnable) {
      this.skip();
      return;
    } else {
      conn = await oracledb.getConnection(dbconfig);

      let plsql = `
        CREATE OR REPLACE PACKAGE ${PKG} AS
          TYPE playerType IS RECORD (name VARCHAR2(40), position VARCHAR2(20), shirtnumber NUMBER);
          TYPE teamType IS VARRAY(10) OF playerType;
          PROCEDURE assignShirtNumbers (t_in IN teamType, t_out OUT teamType);
        END ${PKG};
      `;
      await conn.execute(plsql);

      plsql = `
        CREATE OR REPLACE PACKAGE BODY ${PKG} AS
          PROCEDURE assignShirtNumbers (t_in IN teamType, t_out OUT teamType) AS
            p teamType := teamType();
          BEGIN
            FOR i in 1..t_in.COUNT LOOP
              p.EXTEND;
              p(i) := t_in(i);
              p(i).SHIRTNUMBER := i;
            END LOOP;
            t_out := p;
          END;

        END ${PKG};
      `;
      await conn.execute(plsql);
    }

  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      const sql = `DROP PACKAGE ${PKG}`;
      await conn.execute(sql);
      await conn.close();
    }

  }); // after()

  it('212.1 examples/plsqlvarrayrecord.js', async () => {
    const CALL = `CALL ${PKG}.assignShirtNumbers(:inbv, :outbv)`;

    const players = [
      { NAME: 'Jay',    POSITION: 'GOAL ATTACK',  SHIRTNUMBER: 1 },
      { NAME: 'Leslie', POSITION: 'CENTRE',       SHIRTNUMBER: 2 },
      { NAME: 'Chris',  POSITION: 'WING DEFENCE', SHIRTNUMBER: 3 }
    ];
    const binds = {
      inbv:
      {
        type: `${PKG}.TEAMTYPE`,
        val: players
      },
      outbv:
      {
        type: `${PKG}.TEAMTYPE`,
        dir: oracledb.BIND_OUT
      }
    };
    const result = await conn.execute(CALL, binds);

    for (let i = 0, out = result.outBinds.outbv; i < players.length; i++) {
      assert.strictEqual(out[i].NAME, players[i].NAME);
      assert.strictEqual(out[i].POSITION, players[i].POSITION);
      assert.strictEqual(out[i].SHIRTNUMBER, players[i].SHIRTNUMBER);
    }
  }); // 212.1

});
