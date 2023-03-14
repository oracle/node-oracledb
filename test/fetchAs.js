/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   56. fetchAs.js
 *
 * DESCRIPTION
 *   Testing driver fetchAs feature.
 *
 *****************************************************************************/
'use strict';

const oracledb = require ('oracledb');
const assert   = require('assert');
const dbConfig = require ('./dbconfig.js');
const assist   = require ('./dataTypeAssist.js');


describe('56. fetchAs.js', function() {

  let connection = null;
  beforeEach('get one connection', async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  afterEach('release connection, reset fetchAsString property', async function() {
    oracledb.fetchAsString = [];
    await connection.close();
  });

  it('56.1 property value check', function() {

    assert.deepStrictEqual(oracledb.fetchAsString, []);

    oracledb.fetchAsString = [oracledb.DATE];
    assert.deepStrictEqual(oracledb.fetchAsString, [ oracledb.DATE ]);

    oracledb.fetchAsString = [ oracledb.NUMBER ];
    assert.deepStrictEqual(oracledb.fetchAsString, [ oracledb.NUMBER ]);

    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
    assert.deepStrictEqual(oracledb.fetchAsString, [ oracledb.DATE, oracledb.NUMBER ]);

    oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON ];
    assert.deepStrictEqual(oracledb.fetchAsString, [ oracledb.DB_TYPE_JSON ]);

    oracledb.fetchAsString = [ oracledb.DB_TYPE_JSON, oracledb.DATE, oracledb.NUMBER ];
    assert.deepStrictEqual(oracledb.fetchAsString, [ oracledb.DB_TYPE_JSON, oracledb.DATE, oracledb.NUMBER ]);
  });

  it('56.2 Fetch DATE column values as STRING - by-Column name', async function() {
    let result = await connection.execute(
      "SELECT TO_DATE('2005-01-06', 'YYYY-DD-MM') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo : { "TS_DATE": { type : oracledb.STRING } }
      }
    );
    assert.strictEqual(typeof result.rows[0].TS_DATE, "string");
  });

  it('56.3 Fetch DATE, NUMBER column values STRING - by Column-name', async function() {
    let result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo :
        {
          "TS_DATE" : { type : oracledb.STRING },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      }
    );
    assert.strictEqual(typeof result.rows[0].TS_DATE, "string");
    assert.strictEqual(typeof result.rows[0].TS_NUM, "string");
    assert.strictEqual(Number(result.rows[0].TS_NUM), 1234567);
  });

  it('56.4 Fetch DATE, NUMBER as STRING by-time configuration and by-name', async function() {
    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];

    let result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo :
        {
          "TS_DATE" : { type : oracledb.STRING },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      }
    );
    assert.strictEqual(typeof result.rows[0].TS_DATE, "string");
    assert.strictEqual(typeof result.rows[0].TS_NUM, "string");
    assert.strictEqual(Number(result.rows[0].TS_NUM), 1234567);
  });

  it('56.5 Fetch DATE, NUMBER column as STRING by-type and override at execute time', async function() {
    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];

    let result = await connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo :
        {
          "TS_DATE" : { type : oracledb.DEFAULT },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      }
    );
    assert.strictEqual(typeof result.rows[0].TS_DATE, "object");
    assert.strictEqual(typeof result.rows[0].TS_NUM, "string");
    assert.strictEqual(Number(result.rows[0].TS_NUM), 1234567);
  });

  it('56.6 Fetch ROWID column values STRING - non-ResultSet', async function() {
    let result = await connection.execute(
      "SELECT ROWID from DUAL",
      [],
      {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        fetchInfo :
        {
          "ROWID" : { type : oracledb.STRING }
        }
      }
    );
    assert.strictEqual(typeof result.rows[0].ROWID, "string");
  });

  it('56.7 Fetch ROWID column values STRING - ResultSet', async function() {
    let result = await connection.execute(
      "SELECT ROWID from DUAL",
      [],
      {
        outFormat : oracledb.OUT_FORMAT_OBJECT,
        resultSet : true,
        fetchInfo :
        {
          "ROWID" : { type : oracledb.STRING }
        }
      }
    );
    let row = await result.resultSet.getRow();
    assert.strictEqual(typeof row.ROWID, "string");
    await result.resultSet.close();
  });

  /*
  * The maximum safe integer in JavaScript is (2^53 - 1).
  * The minimum safe integer in JavaScript is (-(2^53 - 1)).
  * Numbers out of above range will be rounded.
  * The last element is out of Oracle database standard Number range. It will be rounded by database.
  */
  let numStrs =
    [
      '17249138680355831',
      '-17249138680355831',
      '0.17249138680355831',
      '-0.17249138680355831',
      '0.1724913868035583123456789123456789123456'
    ];

  let numResults =
    [
      '17249138680355831',
      '-17249138680355831',
      '.17249138680355831',
      '-.17249138680355831',
      '.172491386803558312345678912345678912346'
    ];

  it('56.8 large numbers with fetchInfo', async function() {
    for (let element of numStrs) {
      let result = await connection.execute(
        "SELECT TO_NUMBER( " + element + " ) AS TS_NUM FROM DUAL",
        [],
        {
          outFormat : oracledb.OUT_FORMAT_OBJECT,
          fetchInfo :
          {
            "TS_NUM"  : { type : oracledb.STRING }
          }
        }
      );
      assert.strictEqual(typeof result.rows[0].TS_NUM, "string");
      assert.strictEqual(result.rows[0].TS_NUM, numResults[numStrs.indexOf(element)]);
    }
  });

  it('56.9 large numbers with setting fetchAsString property', async function() {
    oracledb.fetchAsString = [ oracledb.NUMBER ];

    for (let element of numStrs) {
      let result = await connection.execute(
        "SELECT TO_NUMBER( " + element + " ) AS TS_NUM FROM DUAL",
        [],
        { outFormat : oracledb.OUT_FORMAT_OBJECT }
      );
      assert.strictEqual(typeof result.rows[0].TS_NUM, "string");
      assert.strictEqual(result.rows[0].TS_NUM, numResults[numStrs.indexOf(element)]);
    }
  });

  // FetchInfo format should <columName> : {type : oracledb.<type> }
  it('56.10 invalid syntax for type should result in error', async function() {
    await assert.rejects(
      async () => {
        await connection.execute(
          "SELECT SYSDATE AS THE_DATE FROM DUAL",
          { },
          { fetchInfo : { "THE_DATE" : oracledb.STRING }}
        );
      },
      // NJS-015: type was not specified for conversion
      / NJS-015:/
    );
  });

  it('56.11 assigns an empty array to fetchAsString', function() {
    oracledb.fetchAsString = [];
    assert.deepStrictEqual(oracledb.fetchAsString, []);
  });

  it('56.12 Negative - empty string', function() {
    assert.throws(
      function() {
        oracledb.fetchAsString = '';
      },
      /NJS-004:/
    );
  });

  it('56.13 Negative - null', function() {
    assert.throws(
      function() {
        oracledb.fetchAsString = null;
      },
      /NJS-004:/
    );
  });

  it('56.14 Negative - undefined', function() {
    assert.throws(
      function() {
        oracledb.fetchAsString = undefined;
      },
      /NJS-004:/
    );
  });

  it('56.15 Negative - NaN', function() {
    assert.throws(
      function() {
        oracledb.fetchAsString = NaN;
      },
      /NJS-004:/
    );
  });

  it('56.16 Negative - invalid type of value, number', function() {
    assert.throws(
      function() {
        oracledb.fetchAsString = 10;
      },
      /NJS-004:/
    );
  });

  it('56.17 Negative - invalid type of value, string', function() {
    assert.throws(
      function() {
        oracledb.fetchAsString = 'abc';
      },
      /NJS-004:/
    );
  });

  it('56.18 Negative - passing oracledb.DATE type to fetchInfo', async function() {
    await assert.rejects(
      async () => {
        await connection.execute(
          "select sysdate as ts_date from dual",
          { },
          {
            fetchInfo: { ts_date: { type: oracledb.DATE } }
          }
        );
      },
      // NJS-021: invalid type for conversion specified
      /NJS-021:/
    );
  });

  it('56.19 Negative - passing empty JSON to fetchInfo', async function() {
    let result = await connection.execute(
      "select sysdate as ts_date from dual",
      { },
      {
        fetchInfo: {}
      }
    );
    assert(result);
    assert.strictEqual(result.rows[0][0] instanceof Date, true);
  });

  it('56.20 Negative - passing oracledb.NUMBER type to fetchInfo', async function() {
    await assert.rejects(
      async () => {
        await connection.execute(
          "select sysdate as ts_date from dual",
          { },
          {
            fetchInfo: { ts_date: { type: oracledb.NUMBER } }
          }
        );
      },
      // NJS-021: invalid type for conversion specified
      /NJS-021:/
    );
  });

  it('56.21 Negative - invalid type of value, Date', function() {
    assert.throws(
      function() {
        let dt = new Date ();
        oracledb.fetchAsString = dt;
      },
      /NJS-004:/
    );
  });

  it('56.22 Negative - invalid type of value, Buffer', function() {
    assert.throws(
      function() {
        let buf = assist.createBuffer (10) ;  // arbitary sized buffer
        oracledb.fetchAsString = buf;
      },
      /NJS-004:/
    );
  });

});
