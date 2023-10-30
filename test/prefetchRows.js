/* Copyright (c) 2017, 2023, Oracle and/or its affiliates. */

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
 *   147. prefetchRows.js
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
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
    union all
    select 6, 'String 6' from dual
    union all
    select 7, 'String 7' from dual
    union all
    select 8, 'String 8' from dual
    union all
    select 9, 'String 9' from dual
    union all
    select 10, 'String 10' from dual
    union all
    select 11, 'String 11' from dual
    union all
    select 12, 'String 12' from dual
    order by 1`;

  const DefaultPrefetchRows = oracledb.prefetchRows;
  before(async function() {
    conn = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    oracledb.prefetchRows = DefaultPrefetchRows;
    await conn.close();
  });

  afterEach(() => {
    oracledb.prefetchRows = DefaultPrefetchRows;
  });

  describe("147.1 prefetchRows with simple execution", function() {
    it('147.1.1 set oracledb.prefetchRows to be 0', async function() {
      oracledb.prefetchRows = 0;
      await conn.execute("select 'foobar' from dual");
    }); // 147.1.1

    it('147.1.2 Negative - negative value', () => {
      assert.throws(
        () => oracledb.prefetchRows = -9,
        /NJS-004:/
      );
    });

    it('147.1.3 Negative - NaN', () => {
      assert.throws(
        () => oracledb.prefetchRows = NaN,
        /NJS-004:/
      );
    });

    it('147.1.4 Negative - undefined', () => {
      assert.throws(
        () => oracledb.prefetchRows = undefined,
        /NJS-004:/
      );
    });

    it('147.1.5 Negative - null', () => {
      assert.throws(
        function() {
          oracledb.prefetchRows = null;
        },
        /NJS-004:/
      );
    });

    it('147.1.6 Negative - random string', () => {
      assert.throws(
        () => oracledb.prefetchRows = "random string",
        /NJS-004:/
      );
    });

    it('147.1.7 Negative - Boolean', () => {
      assert.throws(
        () => oracledb.prefetchRows = true,
        /NJS-004:/
      );
    });

    it('147.1.8 execute() option, value of 0', async function() {
      const options = { prefetchRows: 0 };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    });

    it('147.1.9 Negative - negative value', async function() {
      const options = { prefetchRows: -10 };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
      // NJS-007: invalid value for "prefetchRows" in parameter 3
    });

    it('147.1.10 Negative - NaN', async function() {
      const options = { prefetchRows: NaN };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
    });

    it('147.1.11 execute() option, undefined, get overrided by global attribute', async function() {
      const options = { prefetchRows: undefined };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    });

    it('147.1.12 Negative - null', async function() {
      const options = { prefetchRows: null };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
    });

    it('147.1.13 Negative - random string', async function() {
      const options = { prefetchRows: 'random string' };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
    });

    it('147.1.14 Negative - Boolean', async function() {
      const options = { prefetchRows: true };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007/
      );
    });

    it('147.1.15 Query round-trips with no prefetch', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 0 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.1.16 Query round-trips with prefetch equal to row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 12 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.1.17 Query round-trips with prefetch > row count and fetchArraySize > row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 13 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 1);
    });

    it('147.1.18 Query round-trips with prefetch > row count and fetchArraySize < row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 13, fetchArraySize: 2 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 1);
    });

    it('147.1.19 Query round-trips with prefetch < row count and fetchArraySize > total rows', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 3, fetchArraySize: 13 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.1.20 Query round-trips with prefetch < row count and fetchArraySize = total rows', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 3, fetchArraySize: 12 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 3);
    });

    it('147.1.21 Query round-trips with prefetch < row count fetchArraySize < total rows', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      await conn.execute(sql, [], { prefetchRows: 3, fetchArraySize: 5 });
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 4);
    });

  });

  describe("147.2 prefetchRows with resultSet", function() {

    it('147.2.1 set oracledb.prefetchRows to be 0', async function() {
      oracledb.prefetchRows = 0;
      await conn.execute("select 'foobar' from dual", [], { resultSet: true });
    });

    it('147.2.2 execute() option, value of 0', async function() {
      const options = { resultSet: true, prefetchRows: 0 };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    });

    it('147.2.3 Negative - negative value', async function() {
      const options = { resultSet: true, prefetchRows: -10 };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
      // NJS-007: invalid value for "prefetchRows" in parameter 3
    });

    it('147.2.4 Negative - NaN', async function() {
      const options = { resultSet: true, prefetchRows: NaN };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
    });

    it('147.2.5 execute() option, undefined, get overrided by global attribute', async function() {
      const options = { resultSet: true, prefetchRows: undefined };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    });

    it('147.2.6 Negative - null', async function() {
      const options = { resultSet: true, prefetchRows: null };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
    });

    it('147.2.7 Negative - random string', async function() {
      const options = { resultSet: true, prefetchRows: 'random string' };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
    });

    it('147.2.8 Negative - Boolean', async function() {
      const options = { resultSet: true, prefetchRows: true };
      await assert.rejects(
        async function() {
          await conn.execute("select 'prefetchRows' from dual", [], options);
        },
        /NJS-007:/
      );
    });

    it('147.2.9 Query round-trips with no prefetch', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const result = await conn.execute(sql, [], { resultSet: true, prefetchRows: 0 });
      await result.resultSet.getRows();
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.2.10 Query round-trips with prefetch equal to row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const result = await conn.execute(sql, [], { resultSet: true, prefetchRows: 12 });
      await result.resultSet.getRows();
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.2.11 Query round-trips with prefetch larger than row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const result = await conn.execute(sql, [], { resultSet: true, prefetchRows: 13 });
      await result.resultSet.getRows();
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 1);
    });

    it('147.2.12 Query round-trips with prefetch < row count, fetchArraySize < row count and getRows()', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const result = await conn.execute(sql, [], { resultSet: true, prefetchRows: 2, fetchArraySize: 2 });
      await result.resultSet.getRows();
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 7);
    });

    it('147.2.13 Query round-trips with prefetch < row count, fetchArraySize > row count and getRows(n < row count)', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const result = await conn.execute(sql, [], { resultSet: true, prefetchRows: 2, fetchArraySize: 2 });
      await result.resultSet.getRows(12);
      await result.resultSet.getRows();
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 3);
    });

    it('147.2.14 Query round-trips with prefetch < row count, fetchArraySize > row count and getRows(n > row count)', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const result = await conn.execute(sql, [], { resultSet: true, prefetchRows: 2, fetchArraySize: 100 });
      await result.resultSet.getRows(13);
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.2.15 Query round-trips with prefetch < row count, fetchArraySize > row count and getRows()', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const result = await conn.execute(sql, [], { resultSet: true, prefetchRows: 2, fetchArraySize: 100 });
      await result.resultSet.getRows();
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });


  });

  describe("147.3 prefetchRows with queryStream", function() {

    it('147.3.1 set oracledb.prefetchRows to be 0', async function() {
      oracledb.prefetchRows = 0;
      const stream = conn.queryStream("select 'foobar' from dual");
      await testsUtil.doStream(stream);
    });

    it('147.3.2 execute() option, value of 0', async function() {
      const options = { prefetchRows: 0 };
      const stream = conn.queryStream("select 'prefetchRows' from dual", [], options);
      await testsUtil.doStream(stream);
    });

    it('147.3.3 execute() option, undefined, get overrided by global attribute', async function() {
      const options = { prefetchRows: undefined };
      const stream = conn.queryStream("select 'prefetchRows' from dual", [], options);
      await testsUtil.doStream(stream);
    });

    it('147.3.4 Query round-trips with no prefetch', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const stream = conn.queryStream(sql, [], { prefetchRows: 0 });
      await testsUtil.doStream(stream);
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.3.5 Query round-trips with prefetch equal to row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const stream = conn.queryStream(sql, [], { prefetchRows: 12 });
      await testsUtil.doStream(stream);
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

    it('147.3.6 Query round-trips with prefetch larger than row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const stream = conn.queryStream(sql, [], { prefetchRows: 13 });
      await testsUtil.doStream(stream);
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 1);
    });

    it('147.3.7 Query round-trips with prefetch < row count and fetchArraySize < row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const stream = conn.queryStream(sql, [], { prefetchRows: 2, fetchArraySize: 2 });
      await testsUtil.doStream(stream);
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 7);
    });

    it('147.3.8 Query round-trips with prefetch < row count and fetchArraySize > row count', async function() {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        this.skip();
      }
      const sid = await testsUtil.getSid(conn);
      let rt = await testsUtil.getRoundTripCount(sid);

      const stream = conn.queryStream(sql, [], { prefetchRows: 2, fetchArraySize: 100 });
      await testsUtil.doStream(stream);
      rt = await testsUtil.getRoundTripCount(sid) - rt;

      assert.strictEqual(rt, 2);
    });

  });

});
