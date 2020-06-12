/* Copyright (c) 2017, 2020, Oracle and/or its affiliates. All rights reserved. */

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

describe("147. prefetchRows.js", function() {

  let conn;

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

  it('147.1 set oracledb.prefetchRows to be 0', async () => {
    try {
      oracledb.prefetchRows = 0;
      await conn.execute("select 'foobar' from dual");
    } catch (error) {
      should.not.exist(error);
    }
  }); // 147.1

  it('147.2 Negative - negative value', () => {
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

  it('147.3 Negative - NaN', () => {
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

  it('147.4 Negative - undefined', () => {
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

  it('147.5 Negative - null', () => {
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

  it('147.6 Negative - random string', () => {
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

  it('147.7 Negative - Boolean', () => {
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

  it('147.8 execute() option, value of 0', async () => {
    try {
      const options = { prefetchRows: 0 };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.9 Negative - negative value', async () => {
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

  it('147.10 Negative - NaN', async () => {
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

  it('147.11 execute() option, undefined, get overrided by global attribute', async () => {
    try {
      const options = { prefetchRows: undefined };
      await conn.execute("select 'prefetchRows' from dual", [], options);
    } catch (error) {
      should.not.exist(error);
    }
  });

  it('147.12 Negative - null', async () => {
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

  it('147.13 Negative - random string', async () => {
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

  it('147.14 Negative - Boolean', async () => {
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

});