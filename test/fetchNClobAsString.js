/* Copyright (c) 2021, 2022, Oracle and/or its affiliates. */

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
 *   251. fetchNClobAsString.js
 *
 * DESCRIPTION
 *    To fetch NCLOB columns as strings by setting oracledb.fetchAsString
 *    This could be very useful for smaller CLOB size as it can be fetched
 *    as string and processed in memory itself.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');

describe('251. fetchNClobAsString.js', function() {
  let conn = null;
  const create_table_sql = `
      BEGIN
          DECLARE
              e_table_missing EXCEPTION;
              PRAGMA EXCEPTION_INIT (e_table_missing, -00942);
          BEGIN
              EXECUTE IMMEDIATE ('DROP TABLE nodb_nclobStr');
          EXCEPTION
              WHEN e_table_missing THEN NULL;
          END;

          EXECUTE IMMEDIATE ('
              CREATE TABLE nodb_nclobStr (
                  ID NUMBER,
                  C  CLOB,
                  NC NCLOB
              )
          ');
      END;`;

  const drop_table_sql = `DROP TABLE nodb_nclobStr`;
  const insert_sql = `INSERT INTO nodb_nclobStr values (:1, :2, :3)`;
  const select_query_sql =
        'SELECT ID, C, NC FROM nodb_nclobStr WHERE ID = :ID';
  const cValue  = "abcdef";
  const ncValue = "zyxwvu";
  const rowID = 101;
  let   outFormat, stmtCacheSize;

  before(async function() {
    outFormat = oracledb.outFormat;
    oracledb.outFormat = oracledb.OUT_FORMAT_ARRAY;
    stmtCacheSize = oracledb.stmtCacheSize;
    oracledb.stmtCacheSize = 0;  // varying define types used for same SQL
    try {
      conn = await oracledb.getConnection(dbconfig);
      await conn.execute(create_table_sql);
      await conn.execute(insert_sql, [rowID, cValue, ncValue]);
    } catch (err) {
      should.not.exist(err);
    }
  });

  after(async function() {
    oracledb.outFormat = outFormat;
    oracledb.stmtCacheSize = stmtCacheSize;
    try {
      await conn.execute(drop_table_sql);
      await conn.close();
    } catch (err) {
      should.not.exist(err);
    }
  });

  describe('251.1 NCLOB in fetchAsString', function() {
    // Test to fetch NCLOB column as string
    it('251.1.1 NCLOB type in fetchAsString', function() {
      // check to see if NCLOB is an accepted value for fetchAsString
      try {
        oracledb.fetchAsString = [oracledb.NCLOB];
      } catch (err) {
        should.not.exist(err);
      } finally {
        oracledb.fetchAsString = [];
      }
    });

    // Test to fetch NCLOB column as string with fetchAsString having NCLOB
    it('251.1.2 NCLOB type in fetchAsString and fetch NCLOB data',
      async function() {
        let result;

        try {
          oracledb.fetchAsString = [oracledb.NCLOB];
          result = await conn.execute(select_query_sql, [rowID]);
        } catch (err) {
          should.not.exist(err);
        } finally {
          oracledb.fetchAsString = [];
        }
        should.equal (typeof result.rows[0][2], "string");
        should.equal (result.rows[0][2], ncValue);
      });

    // Test to fetch NCLOB column as string with fetchAsString having CLOB
    it('251.1.3 CLOB type in fetchAsString and fetch NCLOB data',
      async function() {
        let result;

        try {
          oracledb.fetchAsString = [oracledb.CLOB];
          result = await conn.execute(select_query_sql, [rowID]);
        } catch (err) {
          should.not.exist(err);
        } finally {
          oracledb.fetchAsString = [];
        }
        should.equal(typeof result.rows[0][2], "string");
        should.equal(result.rows[0][2], ncValue);
      });

    // Test to fetch CLOB column as string with fetchAsString having NCLOB
    it('251.1.4 NCLOB type in fetchAsString and fetch CLOB data',
      async function() {
        let result;

        try {
          oracledb.fetchAsString = [oracledb.NCLOB];
          result = await conn.execute(select_query_sql, [rowID]);
        } catch (err) {
          should.not.exist(err);
        } finally {
          oracledb.fetchAsString = [];
        }
        should.strictEqual(typeof result.rows[0][1], "string");
        should.strictEqual(result.rows[0][1], cValue);
      });

    // Test to fetch CLOB column as string with fetchAsString having CLOB
    it('251.1.5 CLOB type in fetchAsString and fetch CLOB', async function() {
      let result;

      try {
        oracledb.fetchAsString = [oracledb.CLOB];
        result = await conn.execute(select_query_sql, [rowID]);
      } catch (err) {
        should.not.exist(err);
      } finally {
        oracledb.fetchAsString = [];
      }
      should.equal(typeof result.rows[0][1], "string");
      should.equal(result.rows[0][1], cValue);
    });

    // Test to fetch CLOB, NCLOB column as string with both CLOB & NCLOB in
    // fetchAsString
    it('251.1.6 CLOB & NCLOB in fetchAsString and fetch both CLOB & NCLOB',
      async function() {
        let result;

        try {
          oracledb.fetchAsString = [oracledb.CLOB, oracledb.NCLOB];
          result = await conn.execute(select_query_sql, [rowID]);
        } catch (err) {
          should.not.exist(err);
        } finally {
          oracledb.fetchAsString = [];
        }
        should.equal(typeof result.rows[0][1], "string");
        should.equal(typeof result.rows[0][2], "string");
        should.equal(result.rows[0][1], cValue);
        should.equal(result.rows[0][2], ncValue);
      });

  });

  describe ('251.2 NCLOB in fetchInfo', function() {

    it('251.2.1 NCLOB in fetchInfo', async function() {
      let result;

      try {
        result = await conn.execute (
          select_query_sql,
          [rowID],
          {
            fetchInfo : {
              "NC" :  { type : oracledb.STRING }
            }
          });
      } catch (err) {
        should.not.exist (err);
      }
      should.equal (typeof result.rows[0][2], "string");
      should.equal (result.rows[0][2], ncValue);
    });
  });


});
