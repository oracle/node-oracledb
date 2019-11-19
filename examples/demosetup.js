/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   demosetup.js
 *
 * DESCRIPTION
 *   Functions to create schema objects used by some node-oracledb examples
 *
 *****************************************************************************/

const fs = require('fs');

//
// Create a table for example queries
//

async function setupBf(connection) {

  try {

    const stmts = [

      `ALTER SESSION SET nls_date_format = 'YYYY-MM-DD HH24:MI:SS'`,

      `DROP TABLE no_banana_farmer PURGE`,

      `CREATE TABLE no_banana_farmer (
         id       NUMBER NOT NULL,
         farmer   VARCHAR2(40),
         weight   NUMBER,
         ripeness VARCHAR2(25),
         picked   DATE
       )`,

      `INSERT INTO no_banana_farmer VALUES (1, 'Gita',    100, 'All Green',              '2019-07-21 17:00:00')`,

      `INSERT INTO no_banana_farmer VALUES (2, 'Antonio',  90, 'Full Yellow',            '2019-07-30 12:00:00')`,

      `INSERT INTO no_banana_farmer VALUES (3, 'Mindy',    92, 'More Yellow than Green', '2019-07-16 14:30:00')`,

      `INSERT INTO no_banana_farmer VALUES (4, 'Bruce',    78, 'More Yellow than Green', '2019-08-01 11:00:00')`,

    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch(e) {
        if (e.errorNum != 942)
          throw(e);
      }
    }
    await connection.commit();

  } catch (err) {
    console.error(err);
  }
}

//
// Create a table and (optionally) data for LOB examples
//

async function setupLobs(connection, insertData) {

  const clobInFileName = 'clobexample.txt';    // the file with text to be inserted into the database
  const blobInFileName = 'fuzzydinosaur.jpg';  // contains the image to be inserted into the database

  try {

    const stmts = [

      `DROP TABLE no_lobs PURGE`,

      `CREATE TABLE no_lobs (id NUMBER, c CLOB, b BLOB)`,

      `CREATE OR REPLACE PROCEDURE no_lobs_in (p_id IN NUMBER, c_in IN CLOB, b_in IN BLOB)
       AS
       BEGIN
         INSERT INTO no_lobs (id, c, b) VALUES (p_id, c_in, b_in);
       END;`,

      `CREATE OR REPLACE PROCEDURE no_lobs_out (p_id IN NUMBER, c_out OUT CLOB, b_out OUT BLOB)
       AS
       BEGIN
         SELECT c, b INTO c_out, b_out FROM no_lobs WHERE id = p_id;
       END;`,

      `CREATE OR REPLACE PROCEDURE no_lob_in_out (p_id IN NUMBER, c_inout IN OUT CLOB)
       AS
       BEGIN
         INSERT INTO no_lobs (id, c) VALUES (p_id, c_inout);
         SELECT 'New LOB: ' || c INTO c_inout FROM no_lobs WHERE id = p_id;
       END;`

    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch(e) {
        if (e.errorNum != 942)
          throw(e);
      }
    }

    if (insertData) {
      const str = fs.readFileSync(clobInFileName, 'utf8');
      await connection.execute(
        `INSERT INTO no_lobs (id, c) VALUES (:id, :c)`,
        { id: 1, c: str }
      );

      const buf = fs.readFileSync(blobInFileName);
      await connection.execute(
        `INSERT INTO no_lobs (id, b) VALUES (:id, :b)`,
        { id: 2, b: buf },
        { autoCommit: true }
      );
    }

  } catch (err) {
    console.error(err);
  }
}

//
// Create a table for executeMany() examples
//
async function setupEm(connection) {

  try {

    const stmts = [

      `DROP TABLE no_em_tab PURGE`,

      `DROP TABLE no_em_childtab PURGE`,

      `DROP TABLE no_em_parenttab PURGE`,

      `CREATE TABLE no_em_tab (
         id  NUMBER NOT NULL,
         val VARCHAR2(20)
       )`,

      `CREATE TABLE no_em_parenttab (
         parentid    NUMBER NOT NULL,
         description VARCHAR2(60) NOT NULL,
         CONSTRAINT parenttab_pk PRIMARY KEY (parentid)
       )`,

      `CREATE TABLE no_em_childtab (
         childid     NUMBER NOT NULL,
         parentid    NUMBER NOT NULL,
         description VARCHAR2(30) NOT NULL,
         CONSTRAINT no_em_childtab_pk PRIMARY KEY (childid),
         CONSTRAINT no_em_childtab_fk FOREIGN KEY (parentid) REFERENCES no_em_parenttab
      )`,

      `CREATE OR REPLACE PROCEDURE no_em_proc (
         a_num IN NUMBER,
         a_outnum OUT NUMBER,
         a_outstr OUT VARCHAR2)
       AS
       BEGIN
         a_outnum := a_num * 2;
         FOR i IN 1..a_num LOOP
           a_outstr := a_outstr || 'X';
         END LOOP;
       END;`,

      `INSERT INTO no_em_parenttab VALUES (10, 'Parent 10')`,

      `INSERT INTO no_em_parenttab VALUES (20, 'Parent 20')`,

      `INSERT INTO no_em_parenttab VALUES (30, 'Parent 30')`,

      `INSERT INTO no_em_parenttab VALUES (40, 'Parent 40')`,

      `INSERT INTO no_em_parenttab VALUES (50, 'Parent 50')`,

      `INSERT INTO no_em_childtab VALUES (1001, 10, 'Child 1001 of Parent 10')`,

      `INSERT INTO no_em_childtab VALUES (1002, 20, 'Child 1002 of Parent 20')`,

      `INSERT INTO no_em_childtab VALUES (1003, 20, 'Child 1003 of Parent 20')`,

      `INSERT INTO no_em_childtab VALUES (1004, 20, 'Child 1004 of Parent 20')`,

      `INSERT INTO no_em_childtab VALUES (1005, 30, 'Child 1005 of Parent 30')`,

      `INSERT INTO no_em_childtab VALUES (1006, 30, 'Child 1006 of Parent 30')`,

      `INSERT INTO no_em_childtab VALUES (1007, 40, 'Child 1007 of Parent 40')`,

      `INSERT INTO no_em_childtab VALUES (1008, 40, 'Child 1008 of Parent 40')`,

      `INSERT INTO no_em_childtab VALUES (1009, 40, 'Child 1009 of Parent 40')`,

      `INSERT INTO no_em_childtab VALUES (1010, 40, 'Child 1010 of Parent 40')`,

      `INSERT INTO no_em_childtab VALUES (1011, 40, 'Child 1011 of Parent 40')`,

      `INSERT INTO no_em_childtab VALUES (1012, 50, 'Child 1012 of Parent 50')`,

      `INSERT INTO no_em_childtab VALUES (1013, 50, 'Child 1013 of Parent 50')`,

      `INSERT INTO no_em_childtab VALUES (1014, 50, 'Child 1014 of Parent 50')`,

      `INSERT INTO no_em_childtab VALUES (1015, 50, 'Child 1015 of Parent 50')`

    ];

    for (const s of stmts) {
      try {
        await connection.execute(s);
      } catch(e) {
        if (e.errorNum != 942)
          throw(e);
      }
    }
    await connection.commit();

  } catch (err) {
    console.error(err);
  }
}

module.exports.setupBf = setupBf;

module.exports.setupLobs = setupLobs;

module.exports.setupEm = setupEm;
