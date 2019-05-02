/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   170. poolDrain.js
 *
 * DESCRIPTION
 *   The poolDrain feature:
 *   `pool.close()` should iterate open connections and close them.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('170. poolDrain.js', () => {
  before(function() {
    if (process.versions.modules < 57) this.skip();
  });

  const settings = {
    user: dbconfig.user,
    password: dbconfig.password,
    connectString: dbconfig.connectString,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1
  };

  it('170.1 close pool with force flag, and prevent new connection', async () => {
    try {
      let pool = await oracledb.createPool(settings);
      await pool.getConnection();
      let drainTime = 5;
      pool.close(drainTime);
      await pool.getConnection();
    } catch(err) {
      should.exist(err);
      should.strictEqual(
        err.message,
        "NJS-064: connection pool is closing"
      );
    } finally {
      await sleep(6000);
    }
  }); // 170.1

  it('170.2 close pool without force flag (will give out an error ), and prevent new connections', async () => {
    let pool;
    try {
      pool = await oracledb.createPool(settings);
      await pool.getConnection();
      await pool.close();
    } catch(err) {
      should.exist(err);
      (err.message).should.startWith('ORA-24422:');
    } finally {
      await pool.close(0);
    }
  }); // 170.2

  it('170.3 pool.status OPEN and DRAINING', async () => {
    try {
      let pool = await oracledb.createPool(settings);
      await pool.getConnection();
      should.strictEqual(pool.status, oracledb.POOL_STATUS_OPEN);
      let drainTime = 2;
      pool.close(drainTime);
      should.strictEqual(pool.status, oracledb.POOL_STATUS_DRAINING);
    } catch(err) {
      should.not.exist(err);
    } finally {
      await sleep(3000);
    }
  }); // 170.3

  it('170.4 pool.status CLOSED', async () => {
    try {
      let pool = await oracledb.createPool(settings);
      await pool.getConnection();
      should.strictEqual(pool.status, oracledb.POOL_STATUS_OPEN);
      let drainTime = 2;
      await pool.close(drainTime);
      should.strictEqual(pool.status, oracledb.POOL_STATUS_CLOSED);
    } catch(err) {
      should.not.exist(err);
    }
  }); // 170.4

  it.skip('170.5 basic case - iterate open connections and close them', async () => {
    try {
      let pool = await oracledb.createPool(settings);

      await pool.getConnection();
      let conn = await pool.getConnection();
      await pool.getConnection();
      should.strictEqual(pool.connectionsInUse, 3);

      let drainTime = 2;
      await pool.close(drainTime);

      conn.execute('select (7+8) from dual');
    } catch(err) {
      should.exist(err);
      console.log(err.message);
    }
  }); // 170.5

  it.skip('170.6 pool is closed after drainTime', async () => {
    try {
      let pool = await oracledb.createPool(settings);

      await pool.getConnection();
      await pool.getConnection();
      await pool.getConnection();
      should.strictEqual(pool.connectionsInUse, 3);

      let drainTime = 2;
      await pool.close(drainTime);

      pool.close();
    } catch(err) {
      should.exist(err);
      console.log(err.message);
    }
  }); // 170.6

  it('170.7 closes pool if no connection', async () => {
    try {
      let pool = await oracledb.createPool(settings);
      let drainTime = 2;
      await pool.close(drainTime);
    } catch(err) {
      should.not.exist(err);
    }
  }); // 170.7

  it('170.8 works with poolAlias', async () => {
    try {
      let cred = {
        user: dbconfig.user,
        password: dbconfig.password,
        connectString: dbconfig.connectString,
        poolAlias: 'nodb_pool_alias'
      };
      let pool = await oracledb.createPool(cred);
      let drainTime = 2;
      await pool.close(drainTime);
    } catch(err) {
      should.not.exist(err);
    }
  }); // 170.8

  it('170.9 works with and without poolAlias', async () => {
    try {
      let cred = {
        user: dbconfig.user,
        password: dbconfig.password,
        connectString: dbconfig.connectString,
        poolAlias: 'nodb_pool_alias'
      };
      let pool_1 = await oracledb.createPool(cred);
      let pool_2 = await oracledb.createPool(settings);
      let drainTime = 2;
      pool_1.close(drainTime);
      pool_2.close(drainTime);
    } catch(err) {
      should.not.exist(err);
    } finally {
      await sleep(3000);
    }
  }); // 170.9

  it('170.10 Negative - try to modify read-only property pool.status', async () => {
    try {
      let pool = await oracledb.createPool(settings);
      should.strictEqual(pool.status, oracledb.POOL_STATUS_OPEN);
      let random_num = 789;
      should.throws(
        () => {
          pool.status = random_num;
        },
        'Cannot set property status of #<Pool> which has only a getter'
      );
      await pool.close();
    } catch(err) {
      should.not.exist(err);
    }
  }); // 170.10

  it('170.11 drainTime = 0', async () => {
    try {
      let pool = await oracledb.createPool(settings);

      await pool.getConnection();
      await pool.getConnection();
      await pool.getConnection();
      should.strictEqual(pool.connectionsInUse, 3);

      let drainTime = 0;
      await pool.close(drainTime);
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('170.12 drainTime = -3', async () => {
    let pool;
    try {
      pool = await oracledb.createPool(settings);

      await pool.getConnection();
      await pool.getConnection();
      await pool.getConnection();
      should.strictEqual(pool.connectionsInUse, 3);

      let drainTime = -3;
      await pool.close(drainTime);
    } catch(err) {
      should.exist(err);
      should.strictEqual(err.message, "NJS-005: invalid value for parameter 1");
    } finally {
      await pool.close(0);
    }
  });

  it('170.13 drainTime = NaN', async () => {
    let pool;
    try {
      pool = await oracledb.createPool(settings);

      await pool.getConnection();
      await pool.getConnection();
      await pool.getConnection();
      should.strictEqual(pool.connectionsInUse, 3);

      let drainTime = NaN;
      await pool.close(drainTime);
    } catch(err) {
      should.exist(err);
      should.strictEqual(err.message, "NJS-005: invalid value for parameter 1");
    } finally {
      await pool.close(0);
    }
  });

  it('170.14 draining a pool will not block the other pool', async () => {
    try {
      let pool_1 = await oracledb.createPool(settings);
      let pool_2 = await oracledb.createPool(settings);

      await pool_1.getConnection();
      await pool_1.getConnection();
      await pool_1.getConnection();

      await pool_2.getConnection();
      let conn = await pool_2.getConnection();

      let drainTime = 3;
      pool_1.close(drainTime);

      let result = await conn.execute('select (3+5) from dual');
      should.strictEqual(result.rows[0][0], 8);
      pool_2.close(1);
    } catch(err) {
      should.not.exist(err);
    } finally {
      await sleep(4000);
    }
  });

  it('170.15 draining a pool will not block another aliased pool', async () => {
    try {
      let pool_1 = await oracledb.createPool(settings);
      let cred = {
        user: dbconfig.user,
        password: dbconfig.password,
        connectString: dbconfig.connectString,
        poolAlias: 'nodb_pool_15'
      };
      let pool_2 = await oracledb.createPool(cred);

      await pool_1.getConnection();
      await pool_1.getConnection();
      await pool_1.getConnection();

      await pool_2.getConnection();
      let conn = await pool_2.getConnection();

      let drainTime = 3;
      pool_1.close(drainTime);

      let result = await conn.execute('select (3+5) from dual');
      should.strictEqual(result.rows[0][0], 8);
      pool_2.close(1);
    } catch(err) {
      should.not.exist(err);
    } finally {
      await sleep(4000);
    }
  });

});
