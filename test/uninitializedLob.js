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
 *   65. uninitializedLob.js
 *
 * DESCRIPTION
 *   This test is provided by GitHub user for issue #344
 *   It tests an uninitialized LOB returns from a PL/SQL block.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const crypto   = require('crypto');
const stream   = require('stream');
const dbConfig = require('./dbconfig.js');

describe('65. uninitializedLob.js', function() {

  let connection;
  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    let proc =  "BEGIN \n" +
                "  DECLARE \n" +
                "    e_table_missing EXCEPTION; \n" +
                "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                "   BEGIN \n" +
                "     EXECUTE IMMEDIATE ('DROP TABLE nodb_lobdpi PURGE'); \n" +
                "   EXCEPTION \n" +
                "     WHEN e_table_missing \n" +
                "     THEN NULL; \n" +
                "   END; \n" +
                "   EXECUTE IMMEDIATE (' \n" +
                "     CREATE TABLE nodb_lobdpi ( \n" +
                "       id NUMBER NOT NULL PRIMARY KEY, \n" +
                "       spoc_cm_id NUMBER, \n" +
                "       created_timestamp TIMESTAMP(5) DEFAULT SYSTIMESTAMP, \n" +
                "       modified_timestamp TIMESTAMP(5) DEFAULT SYSTIMESTAMP \n" +
                "     ) \n" +
                "   '); \n" +
                "END; ";
    await connection.execute(proc);
    proc =  "BEGIN \n" +
                "  DECLARE \n" +
                "    e_sequence_exists EXCEPTION; \n" +
                "    PRAGMA EXCEPTION_INIT(e_sequence_exists, -02289);\n " +
                "   BEGIN \n" +
                "     EXECUTE IMMEDIATE ('DROP SEQUENCE nodb_lobdpi_seq'); \n" +
                "   EXCEPTION \n" +
                "     WHEN e_sequence_exists \n" +
                "     THEN NULL; \n" +
                "   END; \n" +
                "   EXECUTE IMMEDIATE (' \n" +
                "     CREATE SEQUENCE nodb_lobdpi_seq INCREMENT BY 1 START WITH 1 NOMAXVALUE CACHE 50 ORDER  \n" +
                "   '); \n" +
                "END; ";
    await connection.execute(proc);
    proc = "create or replace trigger nodb_lobdpi_rbi  \n" +
               "  before insert on nodb_lobdpi referencing old as old new as new \n" +
               "  for each row \n" +
               "begin \n" +
               "  :new.id := nodb_lobdpi_seq.nextval;\n" +
               "end;";
    await connection.execute(proc);
    proc = "create or replace trigger nodb_lobdpi_rbu  \n" +
               "  before update on nodb_lobdpi referencing old as old new as new \n" +
               "  for each row \n" +
               "begin \n" +
               "  :new.modified_timestamp := systimestamp;\n" +
               "end;";
    await connection.execute(proc);
    const sql = "ALTER TABLE nodb_lobdpi ADD (blob_1 BLOB, unit32_1 NUMBER, date_1 TIMESTAMP(5), " +
              "  string_1 VARCHAR2(250), CONSTRAINT string_1_uk UNIQUE (string_1))";
    await connection.execute(sql);
  }); // before

  after(async function() {
    await connection.execute("DROP SEQUENCE nodb_lobdpi_seq");
    await connection.execute("DROP TABLE nodb_lobdpi PURGE");
    await connection.close();
  }); // after

  it('65.1 an uninitialized Lob is returned from a PL/SQL block', async function() {
    for (let i = 0; i < 3; i++) {
      const string_1 = i % 2;
      const proc = "DECLARE \n" +
                 "  row_count NUMBER := 0;" +
                 "  negative_one NUMBER := -1;" +
                 "BEGIN \n" +
                 "  SELECT COUNT(*) INTO row_count FROM nodb_lobdpi WHERE (string_1 = :string_1);" +
                 "    IF (row_count = 0 ) THEN\n" +
                 "      INSERT INTO nodb_lobdpi (blob_1, string_1, spoc_cm_id) \n" +
                 "      VALUES (empty_blob(), :string_1, :spoc_cm_id) \n" +
                 "      RETURNING id, blob_1 INTO :id, :blob_1; \n" +
                 "    ELSE \n" +
                 "      :id     := negative_one;\n" +
                 "      :blob_1 := null; \n" +   // <---- make sure :blob_1 always has a value. Or it hits DPI-007 error.
                 "    END IF;\n" +
                 "END; ";
      const binds = {
        id        : {type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
        blob_1    : {type: oracledb.BLOB, dir: oracledb.BIND_OUT},
        string_1  : string_1,
        spoc_cm_id: 1
      };
      const options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: false
      };
      const result = await connection.execute(proc, binds, options);
      if (result.outBinds.id !== -1) {
        await new Promise((resolve, reject) => {
          const passthrough = new stream.PassThrough();
          crypto.randomBytes(16, function(ex, buf) {
            passthrough.on('error', reject);
            result.outBinds.blob_1.on('error', reject);
            result.outBinds.blob_1.on('finish', resolve);
            passthrough.write(buf, function() {
              passthrough.pipe(result.outBinds.blob_1);
              passthrough.end();
            });
          });
        });
      }
    }
  }); //65.1

});
