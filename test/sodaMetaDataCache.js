/* Copyright (c) 2021, 2023, Oracle and/or its affiliates. */

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
 *   252. sodaMetaDataCache.js
 *
 * DESCRIPTION
 *    To test the values set on sodaMetaDataCache flag
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('252. sodaMetaDataCache.js', function() {

  before(async function() {
    // The SODA metadata cache is available with Oracle Client 21.3 and
    // in 19 from 19.11
    const clientVersion = testsUtil.getClientVersion();
    if (clientVersion < 2103000000) {
      if (clientVersion < 1911000000 || clientVersion >= 2000000000) {
        this.skip();
      }
    }

    const runnable = await testsUtil.isSodaRunnable ();
    if (!runnable) {
      this.skip();
    }
  });

  it('252.1 sodaMetaDataCache set to TRUE', async function() {
    const pool = await oracledb.createPool({...dbConfig, sodaMetaDataCache : true});
    assert.strictEqual(pool.sodaMetaDataCache, true);
    await pool.close(0);
  });

  it('252.2 sodaMetaDataCache set to FALSE', async function() {
    const pool = await oracledb.createPool({...dbConfig, sodaMetaDataCache : false});
    assert.strictEqual(pool.sodaMetaDataCache, false);
    await pool.close(0);
  });


  it('252.3 sodaMetaDataCache not specified', async function() {
    const pool = await oracledb.createPool(dbConfig);
    assert.strictEqual(pool.sodaMetaDataCache, false);
    await pool.close(0);
  });


  it('252.4 sodaMetaDataCache from closed pool', async function() {
    const pool = await oracledb.createPool(dbConfig);
    await pool.close(0);
    assert.strictEqual(pool.sodaMetaDataCache, undefined);
  });

});
