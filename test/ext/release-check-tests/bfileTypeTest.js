/* Copyright (c) 2024, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICE22NSE-2.0. You may choose
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
 *   308. bfileTypeTest.js
 *
 * DESCRIPTION
 *   Test cases for BFILE type support.
 *   This test can be run only if the DB server and client are on the same
 *   machine and DB is not running on a Docker environment.
 *   Environment variables to be set:
 *     BFILEDIR - BFile Directory on the Database server side
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const assert    = require('assert');
const dbConfig  = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');

describe('308. bfileTestType.js', function() {
  let conn, dbaConn;
  const bFileDir = process.env.BFILEDIR;
  let mkDirCmd, rmDirCmd;
  let isDBWin = false;
  const tableName = 'TBL_BFILE';
  const dirAlias = 'BFILEDIR';

  async function setPlatformConfig() {
    // Execute SQL to retrieve the operating system of the database server
    const result = await dbaConn.execute(
      `SELECT UPPER(DBMS_UTILITY.PORT_STRING) AS os FROM DUAL`
    );

    const dbOs = result.rows[0][0];
    // Set the BFile directory path and mkdir command based on the DB's OS
    if (dbOs.includes('WINDOWS') || dbOs.includes('WIN')) {
      // Update mkdir command for Windows
      mkDirCmd = `cmd.exe /c mkdir "%1"`;
      rmDirCmd = `cmd.exe /c rmdir /s /q "%1"`;
      isDBWin = true;
    } else {
      // Update mkdir command path for non-Windows
      mkDirCmd = '/bin/mkdir';
      rmDirCmd = `/bin/rm -rf`;
    }
  }

  // NOTE: This function creates a temporary subdirectory in /tmp or $TEMP directory.
  async function createDir() {

    // retrieves the directory path and job action command for
    // temporary BFile storage based on the OS of the DB server.
    // await setPlatformConfig();

    // Step 1: Create an Oracle Directory Object
    const createDirectorySQL = `
      CREATE OR REPLACE DIRECTORY ${dirAlias} AS '${bFileDir}'
    `;
    await dbaConn.execute(createDirectorySQL);

    // Step 2: Use a PL/SQL Block to Create the Folder
    const createJobSQL = `
      BEGIN
        DBMS_SCHEDULER.create_job (
          job_name        => 'CREATE_TEMP_DIR_JOB',
          job_type        => 'EXECUTABLE',
          job_action      => '${mkDirCmd}',
          number_of_arguments => 1,
          auto_drop       => TRUE,
          enabled         => FALSE
        );

        DBMS_SCHEDULER.set_job_argument_value(
          job_name        => 'CREATE_TEMP_DIR_JOB',
          argument_position => 1,
          argument_value  => '${bFileDir}'
        );

        DBMS_SCHEDULER.enable(
          name            => 'CREATE_TEMP_DIR_JOB'
        );

        -- DBMS_SCHEDULER.run_job(
        --   job_name        => 'CREATE_TEMP_DIR_JOB'
        -- );
      END;
    `;

    await testsUtil.sleep(2000);

    await dbaConn.execute(createJobSQL);

    await testsUtil.sleep(2000);

    const createFile = `DECLARE
       file_handle UTL_FILE.FILE_TYPE;
       BEGIN
         -- Open the file for writing
         file_handle := UTL_FILE.FOPEN('${dirAlias}', 'A.JPG', 'W');

         -- Write the content to the file
         UTL_FILE.PUT_LINE(file_handle, 'abcdefghijklmnopqrstuvwxyz zyxwvutsrqponmlkjihgfedcba');

         -- Close the file
         UTL_FILE.FCLOSE(file_handle);
      END;
      `;
    await dbaConn.execute(createFile);
    await testsUtil.sleep(2000);
  }

  async function removeDir() {
    const removeDir = `
      -- Step 1: Use a PL/SQL Block to Remove the Directory and its Contents
      BEGIN
        DBMS_SCHEDULER.create_job (
          job_name        => 'DELETE_TEMP_DIR_JOB',
          job_type        => 'EXECUTABLE',
          job_action      => '${rmDirCmd}',
          number_of_arguments => 1,
          auto_drop       => TRUE,
          enabled         => FALSE
       );

       DBMS_SCHEDULER.set_job_argument_value(
         job_name        => 'DELETE_TEMP_DIR_JOB',
         argument_position => 1,
         argument_value  => '${bFileDir}'
       );

       DBMS_SCHEDULER.enable(
         name            => 'DELETE_TEMP_DIR_JOB'
       );

       -- DBMS_SCHEDULER.run_job(
       --  job_name        => 'DELETE_TEMP_DIR_JOB'
       -- );
   END;
   `;

    await dbaConn.execute(removeDir);
    await testsUtil.sleep(2000);
  }

  before(async function() {
    if (!bFileDir) {
      console.log("BFILEDIR environment variable for the database server is not set. They can be set as follows:\n" +
                  "- Windows: C:\\Windows\\Temp\\bfiletest\n" +
                  "- Linux: /tmp/bfiletest\n");
      this.skip();
    }
    conn = await oracledb.getConnection(dbConfig);
    const sql = `CREATE TABLE ${tableName} (
                  ID NUMBER,
                  NAME VARCHAR2(256),
                  BFILECOL BFILE
                )`;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await conn.execute(plsql);

    const user = dbConfig.user;

    dbaConn = await oracledb.getConnection ({
      user: dbConfig.test.DBA_user,
      password: dbConfig.test.DBA_password,
      connectString: dbConfig.connectString,
      privilege: oracledb.SYSDBA
    });

    await setPlatformConfig();
    await createDir();
    await dbaConn.execute(`
          CREATE OR REPLACE DIRECTORY ${dirAlias} AS '${bFileDir}'`);
    await dbaConn.execute(`
          GRANT READ ON DIRECTORY ${dirAlias} TO ${user}`);

    // insert 1 row
    await conn.execute(`
          INSERT INTO TBL_BFILE VALUES
          (:ID, :NAME, BFILENAME(:BFILEDIR, :BFILENAME))`,
    [101, "AJPG", dirAlias, "A.JPG"]);
    await conn.commit();
  });

  after(async () => {
    if (!bFileDir) return;
    await conn.execute(testsUtil.sqlDropTable(tableName));
    await conn.close();
    // remove the temp directory created and files in it.
    await removeDir();
    await dbaConn.close();
  });

  it('308.1 metadata with BFILE column type', async function() {
    const result = await conn.execute(`
        SELECT BFILECOL FROM TBL_BFILE
    `);
    assert.equal(result.metaData[0].dbType, oracledb.DB_TYPE_BFILE);
    assert.equal(result.metaData[0].fetchType, oracledb.DB_TYPE_BFILE);
    assert.equal(result.metaData[0].name, "BFILECOL");
  }); // 308.1

  it('308.2 SELECT query with BFILE type', async function() {
    const result = await conn.execute(`
          SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);
    const lob = result.rows[0][0];
    const dirFile = lob.getDirFileName();
    assert.strictEqual(dirFile.dirName, dirAlias);
    assert.strictEqual(dirFile.fileName, "A.JPG");
  }); // 308.2

  it('308.3 SELECT using BFILENAME from dual', async function() {
    const fileName = 'A.JPG';
    const oldOutFormat = oracledb.outFormat;

    oracledb.outFormat = oracledb.OUT_FORMAT_ARRAY;
    const result = await conn.execute(
      `SELECT BFILENAME('${bFileDir}', '${fileName}') FROM DUAL`);
    const lob = result.rows[0][0];
    const dirFile = lob.getDirFileName();

    assert.strictEqual(dirFile.dirName, bFileDir);
    assert.strictEqual(dirFile.fileName, fileName);
    oracledb.outFormat = oldOutFormat;
  }); // 308.3

  it('308.4 INSERT using BFILENAME', async function() {
    const dirName = "NONEXISTDIR";
    const fileName = "B.JPG";

    const sql = `INSERT INTO TBL_BFILE (ID, NAME, BFILECOL) VALUES
                (:ID, :NAME, BFILENAME(:DIRNAME, :FILENAME))`;
    await conn.execute (sql, [105, "TC308.5", dirName, fileName]);
    await conn.commit();
  }); // 308.4

  it('308.5 UPDATE using BFILENAME', async function() {
    const dirName = "NONEXISTDIR2";
    const fileName = "C.JPG";
    const sql = `UPDATE TBL_BFILE
      SET
        BFILECOL = BFILENAME(:DIRNAME, :FILENAME)
      WHERE ID = :ID`;
    await conn.execute (sql, [dirName, fileName, 105]);
    await conn.commit();
  }); // 308.5

  it('308.6 OUT BIND WITH BFILE type', async function() {
    const fileName = '308.6.JPG';
    const sqlProc = `
        CREATE OR REPLACE PROCEDURE NODB_BFILEPROC(BFILEVAL OUT BFILE) AS
        BEGIN
          SELECT
            BFILENAME('${dirAlias}', '${fileName}') INTO BFILEVAL FROM DUAL;
        END;
    `;
    await conn.execute(sqlProc);

    const result2 = await conn.execute(`BEGIN NODB_BFILEPROC(:bFileVal); END;`,
      {bFileVal: { type: oracledb.DB_TYPE_BFILE,
        dir: oracledb.BIND_OUT}});
    const lob = result2.outBinds.bFileVal;
    const dirFile = lob.getDirFileName();
    assert.equal(dirFile.dirName, dirAlias);
    assert.equal(dirFile.fileName, fileName);
  }); // 308.6

  it('308.7 fileExists on existing file', async function() {
    const result = await conn.execute(`
          SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);

    const lob = result.rows[0][0];
    const exists = await lob.fileExists();
    assert.equal(exists, true);
  }); // 308.7

  it('308.8 Check BFILE existence in a loop', async function() {
    const result = await conn.execute(`
          SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);
    const lob = result.rows[0][0];

    for (let i = 0; i < 5; i++) {
      const exists = await lob.fileExists();
      assert.equal(exists, true);
    }
  }); // 308.8

  it('308.9 SELECT query with BFILE type and INSERT', async function() {
    const result = await conn.execute(`
        SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);
    const lob = result.rows[0][0];
    const result2 = await conn.execute(`
        INSERT INTO TBL_BFILE (ID, NAME, BFILECOL)
        VALUES (:id, :name, :bfile)`,
    {id: {val: 102, dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_NUMBER},
    name: {val: "ABCD", dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_VARCHAR},
    bfile: {val: lob, dir: oracledb.BIND_IN,
      type: oracledb.DB_TYPE_BFILE}});
    await conn.commit();
    assert.equal(result2.rowsAffected, 1);
  }); // 308.9

  it('308.10 setDirFileName()', async function() {
    if (!oracledb.thin) {
      this.skip();
    }

    const result = await conn.execute(`
        SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);
    const lob = result.rows[0][0];
    const dirFile = lob.getDirFileName();
    assert.strictEqual(dirFile.dirName, dirAlias);
    assert.strictEqual(dirFile.fileName, "A.JPG");
    const dirName = 'NEW_ALIAS_NAME';
    const fileName = 'NEW_FILE_NAME.JPG';
    lob.setDirFileName({dirName: dirName, fileName: fileName});
    const newDirObj = lob.getDirFileName();
    assert.strictEqual(newDirObj.dirName, dirName);
    assert.strictEqual(newDirObj.fileName, fileName);
  }); // 308.10

  it('308.11 throws error for chunkSize', async function() {
    const result = await conn.execute(`
        SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);
    const lob = result.rows[0][0];
    assert.throws(
      () => lob.chunkSize,
      /NJS-155:/  // NJS-155: operation is not supported on BFILE LOBs
    );
  }); // 308.11

  it('308.12 accessing non-existent BFILE', async function() {
    const result = await conn.execute(`
        SELECT BFILENAME(:dirName, :fileName) FROM TBL_BFILE`,
    { dirName: 'NON_EXISTENT_DIR', fileName: 'NON_EXISTENT_FILE.JPG' }
    );

    const lob = result.rows[0][0];
    await assert.rejects(
      async () => await lob.fileExists(),
      /ORA-22285:/ //ORA-22285: non-existent directory or file for FILEEXISTS operation
    );
  }); // 308.12

  it('308.13 reading BFILE content', async function() {
    const result = await conn.execute(`
        SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]
    );
    const lob = result.rows[0][0];

    const exists = await lob.fileExists();
    assert.equal(exists, true);
    assert(lob, 'BFILE LOB should not be null');

    const content = await lob.getData(1, 200);

    if (isDBWin)
      assert.equal(content, 'abcdefghijklmnopqrstuvwxyz zyxwvutsrqponmlkjihgfedcba\r\n');
    else
      assert.equal(content, 'abcdefghijklmnopqrstuvwxyz zyxwvutsrqponmlkjihgfedcba\n');
  }); // 308.13

  it('308.14 updating BFILE with some other directory', async function() {
    const dirName = "OTHER_DIR";
    const fileName = "OTHER_FILE.JPG";
    let result = await conn.execute(`
      SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);
    let lob = result.rows[0][0];
    let dirFile = lob.getDirFileName();
    assert.strictEqual(dirFile.dirName, dirAlias);
    assert.strictEqual(dirFile.fileName, "A.JPG");
    await conn.execute(`
          UPDATE TBL_BFILE
          SET BFILECOL = BFILENAME(:DIRNAME, :FILENAME)
          WHERE ID = :ID`, [dirName, fileName, 101]
    );

    result = await conn.execute(`SELECT * FROM TBL_BFILE`);
    result = await conn.execute(`
      SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [101]);
    lob = result.rows[0][0];dirFile = lob.getDirFileName();
    dirFile = lob.getDirFileName();
    assert.strictEqual(dirFile.dirName, "OTHER_DIR");
    assert.strictEqual(dirFile.fileName, "OTHER_FILE.JPG");
  }); // 308.14

  it('308.15 deleting BFILE entry', async function() {
    await conn.execute(`
        DELETE FROM TBL_BFILE WHERE ID = :ID`, [101]
    );
    await conn.commit();
    const result = await conn.execute(`
        SELECT COUNT(*) FROM TBL_BFILE WHERE ID = :ID`, [101]
    );
    assert.equal(result.rows[0][0], 0);
  }); // 308.15

  it('308.16 test BFILE methods on non-BFILE LOBs', async function() {
    const lobTypes = [
      oracledb.BLOB,
      oracledb.CLOB,
      oracledb.NCLOB,
      oracledb.DB_TYPE_BLOB,
      oracledb.DB_TYPE_CLOB,
      oracledb.DB_TYPE_NCLOB
    ];

    for (const typ of lobTypes) {
      const lob = await conn.createLob(typ);
      assert.throws(
        () => lob.getDirFileName(), // Ensure this returns a promise that rejects
        /NJS-156:/ // Correctly placed regex
      );

      assert.throws(
        () => lob.setDirFileName({dirName: 'dirName', fileName: 'fileName'}),
        /NJS-156:/ // NJS-156: operation is only supported on BFILE LOBs
      );

      await assert.rejects(
        async () => await lob.fileExists(),
        /NJS-156/ // NJS-156: operation is only supported on BFILE LOBs
      );
    }
  }); // 308.16

  it('308.17 Insert BFILE with invalid directory', async function() {
    const dirName = "INVALID_DIR";
    const fileName = "B.JPG";

    const sql = `INSERT INTO TBL_BFILE (ID, NAME, BFILECOL) VALUES
                (:ID, :NAME, BFILENAME(:DIRNAME, :FILENAME))`;

    await conn.execute (sql, [106, "TC308.16", dirName, fileName]);
    const result = await conn.execute(`
      SELECT BFILENAME(:dirName, :fileName) FROM TBL_BFILE`,
    { dirName: dirName, fileName: fileName }
    );

    const lob = result.rows[0][0];
    await assert.rejects(
      async () => await lob.fileExists(),
      /ORA-22285:/ //ORA-22285: non-existent directory or file for FILEEXISTS operation
    );
  }); // 308.17

  it('308.18 Test BFILE deletion with explicit commit', async function() {
    // Insert a new row with BFILE
    await conn.execute(`
        INSERT INTO TBL_BFILE (ID, NAME, BFILECOL) VALUES
        (:ID, :NAME, BFILENAME(:DIRNAME, :BFILENAME))`,
    [107, "TestDelete", dirAlias, "B.jpg"]);

    // Delete the row with BFILE
    await conn.execute(`
        DELETE FROM TBL_BFILE WHERE ID = :ID`, [107]);

    // Explicitly commit the deletion
    await conn.commit();

    // Verify the row is deleted
    const result = await conn.execute(`
        SELECT COUNT(*) FROM TBL_BFILE WHERE ID = :ID`, [107]);
    assert.equal(result.rows[0][0], 0);
  });  // 308.18

  it('308.19 simulate file permission errors from the other user', async function() {
    if (dbConfig.test.drcp) this.skip();
    const user = 'scott2';
    const pwd = testsUtil.generateRandomPassword();
    await dbaConn.execute(`CREATE USER ${user} IDENTIFIED BY ${pwd}`);
    await dbaConn.execute(`GRANT CREATE SESSION, RESOURCE, CONNECT,
                           unlimited tablespace to ${user}`);

    const conn2 = await oracledb.getConnection({user: user,
      password: pwd,
      connectString: dbConfig.connectString
    });

    const sql = `CREATE TABLE ${tableName} (
      ID NUMBER,
      NAME VARCHAR2(256),
      BFILECOL BFILE
     )`;
    const plsql = testsUtil.sqlCreateTable(tableName, sql);
    await conn2.execute(plsql);

    // insert 1 row
    await conn2.execute(`
      INSERT INTO TBL_BFILE VALUES
      (:ID, :NAME, BFILENAME(:BFILEDIR, :BFILENAME))`,
    [110, "CJPG", dirAlias, "C.JPG"]);
    await conn2.commit();

    const result = await conn2.execute(`
      SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [110]);

    const lob = result.rows[0][0];
    const dirFile = lob.getDirFileName();
    assert.strictEqual(dirFile.dirName, dirAlias);
    assert.strictEqual(dirFile.fileName, 'C.JPG');
    await assert.rejects(
      async () => await lob.fileExists(),
      /ORA-22285:/ //ORA-22285: non-existent directory or file for FILEEXISTS operation
    );
    await conn2.execute(testsUtil.sqlDropTable(tableName));
    await conn2.close();
    await dbaConn.execute(`DROP USER ${user} CASCADE`);
  }); // 308.19

  it('308.20 verify BFILE is empty after deletion and insertion', async function() {
    const fileName = 'E.JPG';

    await conn.execute(`DELETE FROM TBL_BFILE WHERE ID = :ID`, [105]);
    await conn.commit();

    await conn.execute(`
          INSERT INTO TBL_BFILE VALUES
          (:ID, :NAME, BFILENAME(:BFILEDIR, :BFILENAME))`,
    [105, "EJPG", dirAlias, fileName]);
    await conn.commit();

    const result = await conn.execute(`
        SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [105]);
    const lob = result.rows[0][0];
    const dirFile = lob.getDirFileName();
    assert.strictEqual(dirFile.dirName, dirAlias);
    assert.strictEqual(dirFile.fileName, fileName);
  }); // 308.20

  it('308.21 BFILE Metadata Check for Null BFILE', async function() {
    await conn.execute(`
      INSERT INTO TBL_BFILE (ID, NAME, BFILECOL) VALUES (:ID, :NAME, NULL)`,
    [109, "Null BFILE"]
    );
    await conn.commit();

    const result = await conn.execute(`
      SELECT BFILECOL FROM TBL_BFILE WHERE ID = :ID`, [109]);
    const lob = result.rows[0][0];
    assert.strictEqual(lob, null);
  }); // 308.21

  it('308.22 Test BFILE with temporary table', async function() {
    const tempTableName = 'TEMP_BFILE_TABLE';
    // Create a temporary table with a BFILE column
    await conn.execute(`
      CREATE GLOBAL TEMPORARY TABLE ${tempTableName} (
        id NUMBER,
        bfile_col BFILE
      ) ON COMMIT PRESERVE ROWS
    `);

    try {
      // Insert a row with a BFILE
      await conn.execute(`
        INSERT INTO ${tempTableName} (id, bfile_col)
        VALUES (:id, BFILENAME('${dirAlias}', 'A.JPG'))
      `, {id: 1});

      // Test SELECT operation
      let result = await conn.execute(`
        SELECT bfile_col FROM ${tempTableName} WHERE id = :id
      `, [1]);

      let lob = result.rows[0][0];
      let dirFile = lob.getDirFileName();
      assert.strictEqual(dirFile.dirName, dirAlias);
      assert.strictEqual(dirFile.fileName, 'A.JPG');

      // Test fileExists()
      const exists = await lob.fileExists();
      assert.strictEqual(exists, true);

      // Test reading content
      const content = await lob.getData(1, 200);
      assert(content.length > 0, "BFILE content should not be empty");

      // Test UPDATE operation
      await conn.execute(`
        UPDATE ${tempTableName}
        SET bfile_col = BFILENAME('${dirAlias}', 'B.JPG')
        WHERE id = :id
      `, {id: 1});

      // Verify the update
      result = await conn.execute(`
        SELECT bfile_col FROM ${tempTableName} WHERE id = :id
      `, [1]);

      lob = result.rows[0][0];
      dirFile = lob.getDirFileName();
      assert.strictEqual(dirFile.fileName, 'B.JPG');

      // Test DELETE operation
      await conn.execute(`
        DELETE FROM ${tempTableName} WHERE id = :id
      `, [1]);

      // Verify the deletion
      result = await conn.execute(`
        SELECT COUNT(*) FROM ${tempTableName} WHERE id = :id
      `, [1]);
      assert.strictEqual(result.rows[0][0], 0);

      // Test inserting multiple rows
      await conn.execute(`
        INSERT ALL
          INTO ${tempTableName} (id, bfile_col) VALUES (2, BFILENAME(:dir, 'C.JPG'))
          INTO ${tempTableName} (id, bfile_col) VALUES (3, BFILENAME(:dir, 'D.JPG'))
        SELECT * FROM dual
      `, {
        dir: dirAlias
      });

      // Verify multiple inserts
      result = await conn.execute(`
        SELECT COUNT(*) FROM ${tempTableName}
      `);
      assert.strictEqual(result.rows[0][0], 2);

      // Test querying all rows
      result = await conn.execute(`
        SELECT id, bfile_col FROM ${tempTableName} ORDER BY id
      `);
      assert.strictEqual(result.rows.length, 2);

      for (const row of result.rows) {
        const id = row[0];
        const bfile = row[1];
        const dirFile = await bfile.getDirFileName();
        assert.strictEqual(dirFile.dirName, dirAlias);
        assert.strictEqual(dirFile.fileName, id === 2 ? 'C.JPG' : 'D.JPG');
      }
    } finally {
      // Truncate the temporary table instead of dropping it
      await conn.execute(`TRUNCATE TABLE ${tempTableName}`);
      // Drop the temporary table
      await conn.execute(`DROP TABLE ${tempTableName} PURGE`);
    }
  }); // 308.22
});
