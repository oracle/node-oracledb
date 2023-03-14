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
 *   68. multipleLobInsertion.js
 *
 * DESCRIPTION
 *   Testing multiple insertions of Large Objects including BLOB and CLOB
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const dbConfig = require('./dbconfig.js');

describe('68. multipleLobInsertion.js', function() {

  let connection = null;
  before(async function() {

    connection = await oracledb.getConnection(dbConfig);

    // create the BLOB table
    let proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE('DROP TABLE nodb_multi_blob PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE nodb_multi_blob ( \n" +
               "            id    NUMBER, \n" +
               "            b1    BLOB, \n" +
               "            b2    BLOB, \n" +
               "            b3    BLOB, \n" +
               "            b4    BLOB, \n" +
               "            b5    BLOB \n" +
               "        ) \n" +
               "    '); \n" +
               "END; ";
    await connection.execute(proc);

    // create the CLOB table
    proc = "BEGIN \n" +
           "    DECLARE \n" +
           "        e_table_missing EXCEPTION; \n" +
           "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "    BEGIN \n" +
           "        EXECUTE IMMEDIATE('DROP TABLE nodb_multi_clob PURGE'); \n" +
           "    EXCEPTION \n" +
           "        WHEN e_table_missing \n" +
           "        THEN NULL; \n" +
           "    END; \n" +
           "    EXECUTE IMMEDIATE (' \n" +
           "        CREATE TABLE nodb_multi_clob ( \n" +
           "            id    NUMBER, \n" +
           "            c1    CLOB, \n" +
           "            c2    CLOB, \n" +
           "            c3    CLOB, \n" +
           "            c4    CLOB, \n" +
           "            c5    CLOB \n" +
           "        ) \n" +
           "    '); \n" +
           "END; ";
    await connection.execute(proc);
  }); // before

  after(async function() {
    await connection.execute("DROP TABLE nodb_multi_clob PURGE");
    await connection.execute("DROP TABLE nodb_multi_blob PURGE");
    await connection.close();
  }); // after

  const lobInsert = async function(sql, bindv, inFileName) {
    const result = await connection.execute(sql, bindv, { autoCommit: false });
    for (let item in result.outBinds) {
      const lob = result.outBinds[item][0];
      const inStream = fs.createReadStream(inFileName);
      await new Promise((resolve, reject) => {
        inStream.on('error', reject);
        lob.on('error', reject);
        lob.on('finish', resolve);
        inStream.pipe(lob);
      });
    }
    await connection.commit();
  };

  it('68.1 inserts multiple BLOBs', async function() {

    const sql = "insert into nodb_multi_blob values(1, " +
              " EMPTY_BLOB(), EMPTY_BLOB(), EMPTY_BLOB(), EMPTY_BLOB(), EMPTY_BLOB() ) " +
              "  returning b1, b2, b3, b4, b5 into :lobbv1, :lobbv2, :lobbv3, :lobbv4, :lobbv5";

    const bindvars = {
      lobbv1: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv2: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv3: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv4: { type: oracledb.BLOB, dir: oracledb.BIND_OUT },
      lobbv5: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
    };

    const inFileName = './test/fuzzydinosaur.jpg';

    await lobInsert(sql, bindvars, inFileName);

  }); // 68.1

  it('68.2 inserts multiple CLOBs', async function() {

    const sql = "insert into nodb_multi_clob values(1, " +
              " EMPTY_CLOB(), EMPTY_CLOB(), EMPTY_CLOB(), EMPTY_CLOB(), EMPTY_CLOB() ) " +
              "  returning c1, c2, c3, c4, c5 into :lobbv1, :lobbv2, :lobbv3, :lobbv4, :lobbv5";

    const bindvars = {
      lobbv1: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv2: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv3: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv4: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
      lobbv5: { type: oracledb.CLOB, dir: oracledb.BIND_OUT }
    };

    const inFileName = './test/clobexample.txt';

    await lobInsert(sql, bindvars, inFileName);

  }); // 68.2

});
