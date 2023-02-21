/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

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
 *   72. lobBind2.js
 *
 * DESCRIPTION
 *   Testing connection.createLob() function.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const fs       = require('fs');
const fsPromises = require('fs/promises');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe("72. lobBind2.js", function() {

  let connection;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    await connection.close();
  });

  describe("72.1 CLOB", function() {

    before(async function() {
      const proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob72 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_clob72 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP TABLE nodb_tab_clob72 PURGE";
      await connection.execute(sql);
    });

    const verifyClobValue = async function(sequence, expectLob) {
      const sql = "select content from nodb_tab_clob72 where id = :i";
      const result = await connection.execute(sql, { i: sequence });
      const lob = result.rows[0][0];
      lob.setEncoding("utf8");
      let clobData = "";
      await new Promise((resolve, reject) => {
        lob.on("data", function(chunk) {
          clobData += chunk;
        });
        lob.on("error", reject);
        lob.on("end", resolve);
      });
      const data = await fsPromises.readFile(expectLob, {encoding: "utf8"});
      assert.strictEqual(clobData, data);
    }; // verifyClobValue

    const inFileName = './test/clobexample.txt';

    it("72.1.1 BIND_IN, DML, a txt file", async function() {
      const seq = 1;
      const lob = await connection.createLob(oracledb.CLOB);
      const inStream = fs.createReadStream(inFileName);
      await new Promise((resolve, reject) => {
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "insert into nodb_tab_clob72 (id, content) values (:id, :bindvar)";
      const result = await connection.execute(sql, { id: seq, bindvar: lob});
      assert.strictEqual(result.rowsAffected, 1);
      lob.destroy();
      await connection.commit();
      await verifyClobValue(seq, inFileName);
    }); // 72.1.1

    it("72.1.2 BIND_IN, PL/SQL, a txt file", async function() {
      const seq = 2;
      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_in (p_num IN NUMBER, p_lob IN CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob72 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_proc_clob_in;";
      await connection.execute(proc);
      const lob = await connection.createLob(oracledb.CLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(inFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "begin nodb_proc_clob_in(:1, :2); end;";
      await connection.execute(sql, [seq, lob]);
      lob.destroy();
      await connection.commit();
      await verifyClobValue(seq, inFileName);
      await connection.execute("DROP PROCEDURE nodb_proc_clob_in");
    }); // 72.1.2

    it("72.1.3 Negative - invalid type", async function() {
      await assert.rejects(
        async () => await connection.createLob('CLOB'),
        /NJS-005:/
      );
    }); // 72.1.3

    it("72.1.4 Negative - invalid value", async function() {
      await assert.rejects(
        async () => await connection.createLob(oracledb.STRING),
        /NJS-005:/
      );
    }); // 72.1.4

    it("72.1.5 DML - UPDATE statement", async function() {
      const seq = 5;
      const proc = "begin \n" +
                 "    insert into nodb_tab_clob72 (id, content) values ( :1, to_clob('This is clob data.') ); \n" +
                 "end; ";
      await connection.execute(proc, [seq]);
      const lob = await connection.createLob(oracledb.CLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(inFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "update nodb_tab_clob72 set content = :bindvar where id = :id";
      const result = await connection.execute(sql, { id: seq, bindvar: lob});
      assert.strictEqual(result.rowsAffected, 1);
      lob.destroy();
      await connection.commit();
      await verifyClobValue(seq, inFileName);
    }); // 72.1.5

    it("72.1.6 BIND_INOUT, PL/SQL, IN LOB gets closed automatically", async function() {
      const seq = 7;
      const outStr = "This is a out bind string.";
      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout1 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob72 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout1;";
      await connection.execute(proc);
      const lob = await connection.createLob(oracledb.CLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(inFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "begin nodb_proc_clob_inout1(:id, :io); end;";
      const binds = {
        id: seq,
        io: { type: oracledb.CLOB, dir: oracledb.BIND_INOUT, val: lob}
      };
      const options = { autoCommit: true };
      const result = await connection.execute(sql, binds, options);
      const lobout = result.outBinds.io;
      let clobData = "";
      await new Promise((resolve, reject) => {
        lobout.setEncoding("utf8");
        lobout.on("close", resolve);
        lobout.on("finish", async function() {
          await lobout.close();
        });
        lobout.on("error", reject);
        lobout.on("data", function(chunk) {
          clobData += chunk;
        });
      });
      assert.strictEqual(clobData, outStr);
      await lobout.close();
      await verifyClobValue(seq, inFileName);
      await connection.execute("DROP PROCEDURE nodb_proc_clob_inout1");
    }); // 72.1.6

  }); // 72.1

  describe("72.2 BLOB", function() {

    before(async function() {
      const proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob72 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_blob72 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  BLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP TABLE nodb_tab_blob72 PURGE";
      await connection.execute(sql);
    });

    const jpgFileName = './test/fuzzydinosaur.jpg';

    const verifyBlobValue = async function(sequence, expectLob) {
      const sql = "select content from nodb_tab_blob72 where id = :i";
      const result = await connection.execute(sql, { i: sequence });
      const lob = result.rows[0][0];
      let blobData = Buffer.alloc(0);
      let totalLength = 0;
      await new Promise((resolve, reject) => {
        lob.on("data", function(chunk) {
          totalLength = totalLength + chunk.length;
          blobData = Buffer.concat([blobData, chunk]);
        });
        lob.on("error", reject);
        lob.on("end", resolve);
      });
      const data = await fsPromises.readFile(expectLob);
      assert.strictEqual(totalLength, data.length);
      assert.deepEqual(blobData, data);
    }; // verifyBlobValue

    it("72.2.1 BIND_IN, DML, a jpg file", async function() {
      const seq = 1;
      const lob = await connection.createLob(oracledb.BLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(jpgFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "insert into nodb_tab_blob72 (id, content) values (:id, :bindvar)";
      const result = await connection.execute(sql, { id: seq, bindvar: lob});
      assert.strictEqual(result.rowsAffected, 1);
      lob.destroy();
      await connection.commit();
      await verifyBlobValue(seq, jpgFileName);
    }); // 72.2.1

    it("72.2.2 BIND_IN, PL/SQL, a jpg file", async function() {
      const seq = 2;
      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_in (p_num IN NUMBER, p_lob IN BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob72 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_proc_blob_in;";
      await connection.execute(proc);
      const lob = await connection.createLob(oracledb.BLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(jpgFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "begin nodb_proc_blob_in(:1, :2); end;";
      await connection.execute(sql, [seq, lob]);
      lob.destroy();
      await connection.commit();
      await verifyBlobValue(seq, jpgFileName);
      await connection.execute("DROP PROCEDURE nodb_proc_blob_in");
    }); // 72.2.2

    it("72.2.3 Negative - inconsistent datatypes", async function() {
      const seq = 3;
      const lob = await connection.createLob(oracledb.CLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(jpgFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "insert into nodb_tab_blob72 (id, content) values (:id, :bindvar)";
      const binds = { id: seq, bindvar: lob};
      await assert.rejects(
        async () => await connection.execute(sql, binds),
        /ORA-00932:/
      );
      lob.destroy();
      await connection.commit();
    }); // 72.2.3

    it("72.2.4 Negative - not providing first parameter", async function() {
      await assert.rejects(
        async () => await connection.createLob(),
        /NJS-009:/
      );
    }); // 72.2.4

    it("72.2.5 call lob.close() multiple times sequentially", async function() {
      const seq = 7000;
      const lob = await connection.createLob(oracledb.BLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(jpgFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = "insert into nodb_tab_blob72 (id, content) values (:id, :bindvar)";
      const result = await connection.execute(sql, { id: seq, bindvar: lob});
      assert.strictEqual(result.rowsAffected, 1);
      lob.destroy();
      await connection.commit();
      await verifyBlobValue(seq, jpgFileName);
    }); // 72.2.5

  }); // 72.2

  describe("72.3 NCLOB", function() {

    before(async function() {
      const sql = `
          BEGIN
              DECLARE
                  e_table_missing EXCEPTION;
                  PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
              BEGIN
                  EXECUTE IMMEDIATE('DROP TABLE nodb_tab_nclob72 PURGE');
              EXCEPTION
                  WHEN e_table_missing
                      THEN NULL;
              END;
              EXECUTE IMMEDIATE ('
                  CREATE TABLE nodb_tab_nclob72 (
                      id       NUMBER,
                      content  NCLOB
                  )');
              END;`;
      await connection.execute(sql);
    });

    after(async function() {
      const sql = `DROP TABLE nodb_tab_nclob72 PURGE`;
      await connection.execute(sql);
    });

    const verifyNclobValue = async function(sequence, expectLob) {
      const sql = `select content from nodb_tab_nclob72 where id = :i`;
      const result = await connection.execute(sql, { i: sequence });
      const lob = result.rows[0][0];
      lob.setEncoding("utf8");
      let nclobData = "";
      await new Promise((resolve, reject) => {
        lob.on("end", resolve);
        lob.on("error", reject);
        lob.on("data", function(chunk) {
          nclobData += chunk;
        });
      });
      const data = await fsPromises.readFile(expectLob, {encoding: "utf8"});
      assert.strictEqual(nclobData, data);
    }; // verifyNclobValue

    const inFileName = './test/clobexample.txt';

    it("72.3.1 BIND_IN, DML, a txt file", async function() {
      const seq = 1;
      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(inFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      const sql = `insert into nodb_tab_nclob72 (id, content)
          values (:id, :bindvar)`;
      const result = await connection.execute(sql, { id: seq, bindvar: lob});
      assert.strictEqual(result.rowsAffected, 1);
      await lob.close();
      await connection.commit();
      await verifyNclobValue(seq, inFileName);
    }); // 72.3.1

    it("72.3.2 BIND_IN, PL/SQL, a txt file", async function() {
      const seq = 2;
      let sql = `
          CREATE OR REPLACE PROCEDURE nodb_proc_nclob_in (
              p_num IN NUMBER,
              p_lob IN NCLOB
          ) AS
          BEGIN
              insert into nodb_tab_nclob72 (id, content) VALUES (p_num, p_lob);
          END;`;
      await connection.execute(sql);
      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(inFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      sql = `begin nodb_proc_nclob_in(:1, :2); end;`;
      await connection.execute(sql, [seq, lob]);
      await lob.close();
      await connection.commit();
      await verifyNclobValue(seq, inFileName);
      await connection.execute("DROP PROCEDURE nodb_proc_nclob_in");
    }); // 72.3.2

    it("72.3.3 Negative - invalid type", async function() {
      await assert.rejects(
        async () => await connection.createLob('NCLOB'),
        /NJS-005:/
      );
    }); // 72.3.3

    it("72.3.4 Negative - invalid value", async function() {
      await assert.rejects(
        async () => await connection.createLob(oracledb.STRING),
        /NJS-005:/
      );
    }); // 72.3.4

    it("72.3.5 DML - UPDATE statement", async function() {
      const seq = 5;
      let sql = `
          begin
              insert into nodb_tab_nclob72 (id, content)
              values ( :1, to_nclob('This is nclob data.') );
          end;`;
      await connection.execute(sql, [seq]);
      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(inFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      sql = `update nodb_tab_nclob72 set content = :bindvar where id = :id`;
      const result = await connection.execute(sql, { id: seq, bindvar: lob});
      assert.strictEqual(result.rowsAffected, 1);
      await lob.close();
      await connection.commit();
      await verifyNclobValue(seq, inFileName);
    }); // 72.3.5

    it("72.3.6 BIND_INOUT, PL/SQL, IN LOB gets closed automatically", async function() {
      const seq = 7;
      const outStr = "This is a out bind string.";
      let sql = `
          CREATE OR REPLACE PROCEDURE nodb_proc_nclob_inout1 (
              p_num IN NUMBER,
              p_inout IN OUT NCLOB
            ) AS
            BEGIN
                insert into nodb_tab_nclob72 (id, content)
                values (p_num, p_inout);

                select to_nclob('${outStr}') into p_inout from dual;
            END;`;
      await connection.execute(sql);
      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);
      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(inFileName);
        inStream.on("error", reject);
        lob.on("error", reject);
        lob.on("finish", resolve);
        inStream.pipe(lob);
      });
      sql = `begin nodb_proc_nclob_inout1(:id, :io); end;`;
      const binds = {
        id: seq,
        io: { type: oracledb.DB_TYPE_NCLOB,
          dir: oracledb.BIND_INOUT, val: lob }
      };
      const options = { autoCommit: true };
      const result = await connection.execute(sql, binds, options);
      const lobout = result.outBinds.io;
      lobout.setEncoding("utf8");
      let nclobData = "";
      await new Promise((resolve, reject) => {
        lobout.on("data", function(chunk) {
          nclobData += chunk;
        });
        lobout.on("error", reject);
        lobout.on("end", resolve);
      });
      assert.strictEqual(nclobData, outStr);
      await lobout.close();
      await verifyNclobValue(seq, inFileName);
      await connection.execute("DROP PROCEDURE nodb_proc_nclob_inout1");
    }); // 72.3.6

  }); // 72.3

});
