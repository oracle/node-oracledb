/* Copyright (c) 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   252. sodaMetaDataCache.js
 *
 * DESCRIPTION
 *    To test the values set on sodaMetaDataCache flag
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('252. sodaMetaDataCache.js', function() {

  before(async function() {
    // The SODA metadata cache is available with Oracle Client 21.3 and
    // in 19 from 19.11
    if (oracledb.oracleClientVersion < 2103000000) {
      if (oracledb.oracleClientVersion < 1911000000 ||
          oracledb.oracleClientVersion >= 2000000000) {
        this.skip();
        return;
      }
    }

    const runnable = await testsUtil.isSodaRunnable ();
    if (!runnable) {
      this.skip();
      return;
    }
  });

  it('252.1 sodaMetaDataCache set to TRUE', async function() {
    let pool = null;

    try {
      pool = await oracledb.createPool({...dbconfig, sodaMetaDataCache : true});
      should.equal(pool.sodaMetaDataCache, true);
    }
    catch(err) {
      should.not.exist(err);
    }
    finally {
      if (pool)
        await pool.close();
    }
  });

  it('252.2 sodaMetaDataCache set to FALSE', async function () {
    let pool = null;

    try {
      pool = await oracledb.createPool({...dbconfig, sodaMetaDataCache : false});
      should.equal(pool.sodaMetaDataCache, false);
    }
    catch(err) {
      should.not.exist(err);
    }
    finally {
      await pool.close();
    }
  });


  it('252.3 sodaMetaDataCache not specified', async function() {
    let pool;

    try {
      pool = await oracledb.createPool(dbconfig);
      should.equal(pool.sodaMetaDataCache, false);
    }
    catch(err) {
      should.not.exist(err);
    }
    finally {
      await pool.close();
    }
  });


  it('252.4 sodaMetaDataCache from closed pool', async function() {
    const pool = await oracledb.createPool(dbconfig);
    await pool.close();
    should.equal(pool.sodaMetaDataCache, undefined);
  });

});
