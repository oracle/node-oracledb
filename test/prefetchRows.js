/* Copyright (c) 2017, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   147. prefetchRows.js
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const assert   = require('assert');
const dbconfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe("147. prefetchRows.js", function() {

  let conn;

  const sql = `
    select 1, 'String 1' from dual
    union all
    select 2, 'String 2' from dual
    union all
    select 3, 'String 3' from dual
    union all
    select 4, 'String 4' from dual
    union all
    select 5, 'String 5' from dual
    order by 1`;

  const DefaultPrefetchRows = oracledb.prefetchRows;
  before(async () => {
    try {
      conn = await oracledb.getConnection(dbconfig);
    } catch (error) {
      should.not.exist(error);
    }
  });

  after(async () => {
    try {
      oracledb.prefetchRows = DefaultPrefetchRows;

      await conn.close();
    } catch (error) {
      should.not.exist(error);
    }
  });

  afterEach(() => {
    try {
      oracledb.prefetchRows = DefaultPrefetchRows;
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.1 set oracledb.prefetchRows to be 0', async function() {
    try {
      oracledb.prefetchRows = 0;
      await conn.execute("select 'foobar' from dual");
    } catch (error) {
      should.not.exist(error);
    }
  }); // 147.1

  it('147.2 Negative - negative value', async function() {
    try {
      should.throws(
        function() {
          oracledb.prefetchRows = -9;
        },
        'NJS-004: invalid value for property prefetchRows'
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.3 Negative - NaN', async function() {
    try {
      should.throws(
        function() {
          oracledb.prefetchRows = NaN;
        },
        'NJS-004: invalid value for property prefetchRows'
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.4 Negative - undefined', async function() {
    try {
      should.throws(
        function() {
          oracledb.prefetchRows = undefined;
        },
        'NJS-004: invalid value for property prefetchRows'
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.5 Negative - null', async function() {
    try {
      should.throws(
        function() {
          oracledb.prefetchRows = null;
        },
        'NJS-004: invalid value for property prefetchRows'
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.6 Negative - random string', async function() {
    try {
      should.throws(
        function() {
          oracledb.prefetchRows = "random string";
        },
        'NJS-004: invalid value for property prefetchRows'
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.7 Negative - Boolean', async function() {
    try {
      should.throws(
        function() {
          oracledb.prefetchRows = true;
        },
        'NJS-004: invalid value for property prefetchRows'
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.8 execute() option, value of 0', async function() {
    try {
      const options = { prefetchRows: 0 };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.9 Negative - negative value', async function() {
    try {
      const options = { prefetchRows: -10 };
      await assert.rejects(
        async () => {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007/
      );
      // NJS-007: invalid value for "prefetchRows" in parameter 3
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.10 Negative - NaN', async function() {
    try {
      const options = { prefetchRows: NaN };
      await assert.rejects(
        async () => {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007/
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.11 execute() option, undefined, get overrided by global attribute', async function() {
    try {
      const options = { prefetchRows: undefined };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.12 Negative - null', async function() {
    try {
      const options = { prefetchRows: null };
      await assert.rejects(
        async () => {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007/
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.13 Negative - random string', async function() {
    try {
      const options = { prefetchRows: 'random string' };
      await assert.rejects(
        async () => {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007/
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.14 Negative - Boolean', async function() {
    try {
      const options = { prefetchRows: true };
      await assert.rejects(
        async () => {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007/
      );
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.15 Query round-trips with no prefetch', async function() {
    if (!dbconfig.test.DBA_PRIVILEGE) {
      this.skip();
      return;
    }
    try {
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 0 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      should.strictEqual(rt, 2);

    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.16 Query round-trips with prefetch equal to row count', async function() {
    if (!dbconfig.test.DBA_PRIVILEGE) {
      this.skip();
      return;
    }
    try {
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 5 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      should.strictEqual(rt, 2);

    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.16 Query round-trips with prefetch larger than row count', async function() {
    if (!dbconfig.test.DBA_PRIVILEGE) {
      this.skip();
      return;
    }
    try {
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 6 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      should.strictEqual(rt, 1);

    } catch (error) {
      should.not.exist(error);
    }
  });

});
