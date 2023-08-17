/* Copyright (c) 2019, 2023, Oracle and/or its affiliates. */

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
 *   220. examineOwnedProperties.js
 *
 * DESCRIPTION
 *   Add this test from GitHub issue 1129 to prevent regression.
 *   https://github.com/oracle/node-oracledb/issues/1129
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbConfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('220. examineOwnedProperties.js', () => {

  let conn;
  const TABLE = "nodb_tab_rating";

  before(async () => {
    conn = await oracledb.getConnection(dbConfig);

    const sql = `
      CREATE TABLE ${TABLE} (
          "RATE_TIME" VARCHAR2(32),
          "RATE_USER" VARCHAR2(128),
          "ITEM_PRICE" NUMBER,
          "RATING" VARCHAR2(4000)
      )
    `;
    const plsql = testsUtil.sqlCreateTable(TABLE, sql);
    await conn.execute(plsql);
  }); // before()

  after(async () => {
    const sql = `DROP TABLE ${TABLE} PURGE`;
    await conn.execute(sql);
    await conn.close();
  }); // after()

  it('220.1 Only examine "owned" properties on objects', async () => {
    const sql = `
      MERGE INTO ${TABLE} R USING (
        SELECT
          :item_price as itemPrice,
          :rate_time as rateTime,
          :rate_user as rateUser,
          :rating as rating
        FROM DUAL ) T ON (
          R.RATE_TIME     = T.rateTime
          AND R.RATE_USER = T.rateUser
      ) WHEN MATCHED THEN UPDATE SET
          R.ITEM_PRICE = T.itemPrice
          , R.RATING   = T.rating
      WHEN NOT MATCHED THEN INSERT (
          RATE_TIME
          , RATE_USER
          , ITEM_PRICE
          , RATING
      ) VALUES (
        T.rateTime
        , T.rateUser
        , T.itemPrice
        , T.rating
      )
    `;
    const data = [
      { "rate_user": "Bob",
        "rate_time": "2019-07-26 19:42:36",
        "item_price":338,
        "rating":"I like it"
      },
      { "rate_user": "Alice",
        "rate_time": "2019-07-26 19:42:36",
        "item_price":338,
        "rating":"I like it too"
      }
    ];
    const options = {
      autoCommit: true,
      bindDefs: {
        item_price : { type: oracledb.NUMBER },
        rate_time  : { type: oracledb.STRING, maxSize: 32 },
        rate_user  : { type: oracledb.STRING, maxSize: 128 },
        rating     : { type: oracledb.STRING, maxSize: 4000 },
      }
    };

    Object.prototype.noop = () => {};

    await conn.executeMany(sql, data, options);

    delete Object.prototype.noop;

  }); // 220.1
});
