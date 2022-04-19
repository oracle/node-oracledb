/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   211. dbObject12.js
 *
 * DESCRIPTION
 *   examples/plsqlrecord.js
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('211. dbObject12.js', function() {

  let isRunnable = false;
  let conn;

  const PKG  = 'NODB_REC_PKG';
  const TYPE = 'NODB_REC_TYP';

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites();
    if (!isRunnable) {
      this.skip();
      return;
    } else {
      try {
        conn = await oracledb.getConnection(dbconfig);

        let plsql = `
          CREATE OR REPLACE PACKAGE ${PKG} AS
            TYPE ${TYPE} IS RECORD (name VARCHAR2(40), pos NUMBER);
            PROCEDURE myproc (p_in IN ${TYPE}, p_out OUT ${TYPE});
          END ${PKG};
        `;
        await conn.execute(plsql);

        plsql = `
          CREATE OR REPLACE PACKAGE BODY ${PKG} AS
            PROCEDURE myproc (p_in IN ${TYPE}, p_out OUT ${TYPE}) AS
            BEGIN
              p_out := p_in;
              p_out.pos := p_out.pos * 2;
            END;
          END ${PKG};
        `;
        await conn.execute(plsql);

      } catch (err) {
        assert.fail(err);
      }
    }

  }); // before()

  after(async function() {
    if (!isRunnable) {
      return;
    } else {
      try {
        let sql = `DROP PACKAGE ${PKG}`;
        await conn.execute(sql);

        await conn.close();
      } catch (err) {
        assert.fail(err);
      }
    }

  }); // after()

  it('211.1 examples/plsqlrecord.js', async () => {
    try {
      const CALL = `CALL ${PKG}.myproc(:inbv, :outbv)`;
      const RecTypeClass = await conn.getDbObjectClass(`${PKG}.${TYPE}`);

      // Using the constructor to create an object
      const obj1 = new RecTypeClass({ NAME: 'Ship', POS: 12 });
      let binds = {
        inbv: obj1,
        outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
      };
      const result1 = await conn.execute(CALL, binds);
      let out = result1.outBinds.outbv;
      assert.strictEqual(out.NAME, obj1.NAME);
      assert.strictEqual(out.POS, (obj1.POS * 2));

      // Binding the record values directly'
      const obj2 = { NAME: 'Plane', POS: 34 };
      binds = {
        inbv: { type: RecTypeClass, val: obj2 },
        outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
      };
      const result2 = await conn.execute(CALL, binds);
      out = result2.outBinds.outbv;
      assert.strictEqual(out.NAME, obj2.NAME);
      assert.strictEqual(out.POS, (obj2.POS * 2));

      // Using the type name
      const obj3 = { NAME: 'Car', POS: 56 };
      binds = {
        inbv: { type: `${PKG}.${TYPE}`, val: obj3 },
        outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT }
      };
      const result3 = await conn.execute(CALL, binds);
      out = result3.outBinds.outbv;
      assert.strictEqual(out.NAME, obj3.NAME);
      assert.strictEqual(out.POS, (obj3.POS * 2));

      // Batch exeuction with executeMany()
      const obj4 = [
        { NAME: 'Train', POS: 78 },
        { NAME: 'Bike', POS: 83 }
      ];
      binds = [
        { inbv: obj4[0] },
        { inbv: obj4[1] }
      ];
      const opts = {
        bindDefs: {
          inbv: { type: RecTypeClass },
          outbv: { type: RecTypeClass, dir: oracledb.BIND_OUT },
        }
      };
      const result4 = await conn.executeMany(CALL, binds, opts);
      for (let i = 0, out = result4.outBinds; i < binds.length; i++) {
        assert.strictEqual(out[i].outbv.NAME, obj4[i].NAME);
        assert.strictEqual(out[i].outbv.POS, (obj4[i].POS * 2));
      }
    } catch (err) {
      assert.fail(err);
    }
  }); // 211.1
});
