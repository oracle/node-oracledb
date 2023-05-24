/* Copyright (c) 2023, Oracle and/or its affiliates. */

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
 * Licensed under the Apache License, Version 2.0 (the `License`);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an `AS IS` BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   281. optimisticLock.js
 *
 * DESCRIPTION
 *   Testing optimistic locking to handle concurrent updates to a database
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('281. optimisticLock.js', function() {

  let isRunnable = false;
  let TABLE = 'my_table';

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2100000000, 2300000000);
    if (!isRunnable) {
      this.skip();
    }
  });

  describe('281.1 locking in tables', function() {
    let connection = null;
    // Function to simulate a 1-second delay
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      let sql = `CREATE TABLE ${TABLE} (
        id NUMBER(10) PRIMARY KEY,
        value VARCHAR2(100),
        version NUMBER(10)
      )`;
      // Set up database table with a version number column
      await testsUtil.createTable(connection, TABLE, sql);
    });

    after(async function() {
      await testsUtil.dropTable(connection, TABLE);
      await connection.close();
    });

    afterEach(async function() {
      await connection.execute(`TRUNCATE TABLE ${TABLE}`);
    });

    it('281.1.1 multiple workers that update the same row in the database at the same time', async function() {

      // Insert a row into the table
      await connection.execute(
        `INSERT INTO ${TABLE} (id, value, version) VALUES (:id, :value, :version)`,
        { id: 1, value: 'foo', version: 1 }
      );

      // Define a function to simulate a worker updating the row
      async function updateRow(workerId) {

        //incrementing the version column to indicate that the row has been modified
        const updateQuery = `
          UPDATE ${TABLE}
          SET value = :value, version = version + 1
          WHERE id = :id AND version = :version
        `;

        const updateParams = { id: 1, value: `worker ${workerId}`, version: workerId };
        const result = await connection.execute(updateQuery, updateParams);
        assert.strictEqual(result.rowsAffected, 1);
      }

      // Start multiple workers to update the row concurrently
      const workerCount = 10;
      const workers = [];
      for (let i = 1; i <= workerCount; i++) {
        workers.push(updateRow(i));
      }

      // Wait for all workers to finish
      await Promise.all(workers);

      // Verify that the final value of the row is the expected value
      const selectQuery = `SELECT value FROM ${TABLE} WHERE id = :id`;
      const selectParams = { id: 1 };
      const selectResult = await connection.execute(selectQuery, selectParams);
      const finalValue = selectResult.rows[0][0];
      assert.strictEqual(finalValue, `worker ${workerCount}`);
    });

    it('281.1.2 two workers update and insert data into the same table at the same time', async function() {
      /*
       One of the workers will insert a new row and not commit the transaction,
       while the other worker will update an existing row.
       This should result in the second worker being blocked by the first worker,
       until the first worker either commits or rolls back its transaction.*/

      // Insert a row into the table
      await connection.execute(
        `INSERT INTO ${TABLE} (id, value, version) VALUES (:id, :value, :version)`,
        { id: 1, value: 'foo', version: 1 }
      );

      // Define a function to simulate a worker inserting a row and not committing
      async function insertRow(workerId) {
        const insertQuery = `
          INSERT INTO ${TABLE} (id, value, version)
          VALUES (:id, :value, :version)
        `;
        const insertParams = { id: 2, value: `worker ${workerId}`, version: 1 };
        await connection.execute(insertQuery, insertParams, { autoCommit: false });
      }

      // Define a function to simulate a worker updating a row
      async function updateRow(workerId) {
        const updateQuery = `
          UPDATE ${TABLE}
          SET value = :value, version = version + 1
          WHERE id = :id AND version = :version
        `;
        const updateParams = { id: 1, value: `worker ${workerId}`, version: 1 };
        await connection.execute(updateQuery, updateParams);
        await connection.commit();
      }

      // Start the insert and update workers concurrently
      const workers = [];
      workers.push(insertRow(1));
      workers.push(updateRow(2));

      // Wait for all workers to finish
      await Promise.all(workers);

      // Verify that the final values of the rows are the expected values
      const selectQuery = `SELECT value FROM ${TABLE} WHERE id IN (:id1, :id2) ORDER BY id`;
      const selectParams = { id1: 1, id2: 2 };
      const selectResult = await connection.execute(selectQuery, selectParams);
      const finalValues = selectResult.rows.map(row => row[0]);
      assert.strictEqual(finalValues[0], "worker 2");
      assert.strictEqual(finalValues[1], "worker 1");

      // Roll back the uncommitted transaction
      await connection.rollback();
    });

    it('281.1.3 two workers suspends the current session to update and insert', async function() {
      /*
        Each worker will acquire a lock on the row and prevent other workers from updating it.
        The worker then simulates a delay before updating the row where multiple workers might
        be contending to access and update the same row simultaneously.

        After updating the row, the worker checks if the update affected exactly one row and
        commits the transaction if successful.

        The test case waits for both threads to finish and collects their results. It then
        verifies that exactly one thread succeeded and one thread failed, indicating that
        the optimistic locking mechanism prevented concurrent updates and handled errors correctly.
      */

      await connection.execute(`
        INSERT INTO ${TABLE} (id, value, version)
        VALUES (1, 'initial', 1)
      `);
      const numworkers = 2;
      const results = [];

      const workerTasks = [];
      for (let i = 0; i < numworkers; i++) {
        workerTasks.push(runworkerTask(i));
      }

      async function runworkerTask(i) {
        let workerResult;

        try {
          /*
            This is done to simulate multiple users accessing a shared resource
            at the same time, and to observe how the nodejs driver behaves when
            two or more users are attempting to access the same tables simultaneously
          */
          // Delay execution for 1 second
          await sleep(1000);

          // Select the row for update
          const result = await connection.execute(`
            SELECT id, value, version
            FROM ${TABLE}
            WHERE id = 1
            FOR UPDATE
          `, [], { isAutoCommit: false });

          const row = result.rows[0];

          // Simulate a delay before updating the row
          // Delay execution for 1 second
          await sleep(1000);

          // Increment the version number and update the row
          const updateResult = await connection.execute(`
            UPDATE ${TABLE}
            SET value = :value, version = :newVersion
            WHERE id = :id AND version = :oldVersion
          `, {
            value: `worker ${i}`,
            newVersion: row[2] + 1,
            id: row[0],
            oldVersion: row[2]
          }, { isAutoCommit: false });

          // Check that the update affected exactly one row
          if (updateResult.rowsAffected !== 1) {
            throw new Error('Failed to update row');
          }

          // Commit the transaction
          await connection.commit();

          workerResult = 'success';
        } catch (err) {
          workerResult = err.message;
        }

        return workerResult;
      }

      const workerResults = await Promise.all(workerTasks);


      // Wait for all workers to finish and collect the results
      for (let i = 0; i < numworkers; i++) {
        results.push(await workerResults[i]);
      }

      // Verify that one worker succeeded and one worker failed
      assert.strictEqual(results.includes('success'), true);
      assert.strictEqual(results.includes('Failed to update row'), true);
    });
  });

  describe('281.2 optimistic Locking in JSON Relational Duality View', function() {
    let connection = null;
    const createTableEmp = `CREATE TABLE employees (employee_id NUMBER(6)
                              primary key, first_name varchar2(4000),
                              last_name varchar2(4000), version NUMBER(10), department_id  NUMBER(4))`;

    const createTableDept = `CREATE TABLE departments (department_id NUMBER(4)
                              primary key, department_name VARCHAR2(30),
                              manager_id NUMBER(6))`;


    const alterTableEmp = `ALTER TABLE employees ADD
                            (CONSTRAINT emp_dept_fk FOREIGN KEY (department_id)
                            REFERENCES departments)`;

    const createEmpView = `CREATE or replace JSON relational duality VIEW EMP_OV
                            AS
                            select JSON {
                              'EMPLOYEE_ID' is emp.EMPLOYEE_ID,
                               'FIRST_NAME'  is emp.FIRST_NAME,
                                'LAST_NAME' is emp.last_name,
                                'VERSION' is emp.version,
                                'department_info' is
                                (
                                select JSON
                                  {
                                     'DEPARTMENT_ID' is dept.department_id,
                                      'departmentname' is dept.department_name WITH(UPDATE)
                                      }
                                      from departments dept WITH(UPDATE,CHECK ETAG)
                                      where dept.department_id = emp.department_id
                                    )
                                    returning JSON}
                                from employees emp WITH(INSERT,UPDATE,DELETE)`;

    const createDeptView = `CREATE OR REPLACE JSON relational duality VIEW dept_ov
                              AS
                              select JSON{
                              'department_id' is dept.DEPARTMENT_ID,
                              'department_name'  is dept.DEPARTMENT_NAME,
                              'EMP_INFO' is
                             ( select
                            json_arrayagg
                              (
                              JSON
                              {
                                     'employee_id' is emp.employee_id,
                                     'FIRST_NAME'  is emp.FIRST_NAME
                              }
                              )
                                     from employees emp WITH (INSERT,UPDATE,DELETE)
                                    where emp.department_id = dept.department_id
                              )
                                    returning json
                              }
                              from departments dept WITH (INSERT,UPDATE,DELETE,CHECK ETAG)`;

    before(async function() {
      connection = await oracledb.getConnection(dbConfig);
      await testsUtil.createTable(connection, 'employees', createTableEmp);
      await testsUtil.createTable(connection, 'departments', createTableDept);
      await connection.execute(alterTableEmp);
      await connection.execute(createEmpView);
      await connection.execute(createDeptView);
    });

    after(async function() {
      await testsUtil.dropTable(connection, 'employees');
      await testsUtil.dropTable(connection, 'departments');
      await connection.execute(`DROP VIEW  emp_ov`);
      await connection.execute(`DROP VIEW  dept_ov`);
      await connection.close();
    });

    afterEach(async function() {
      await connection.execute(`DELETE from employees`);
      await connection.execute(`DELETE from departments`);
    });

    it('281.2.1 multiple workers that update the view at the same time', async function() {

      // Insert a row into the table
      await connection.execute(`INSERT INTO departments VALUES
                                 ( 10
                                 ,'Administration'
                                 , 100
                                 )`);


      await connection.execute(`INSERT INTO employees VALUES
                                ( 100
                                , 'Steven'
                                , 'King'
                                , 1
                                , 10
                                )`);

      // Define a function to simulate a worker updating the row
      async function updateRow(workerId) {
        const queryUpdate = `update emp_ov set data = '{"EMPLOYEE_ID":100,"FIRST_NAME":"Lex","LAST_NAME":"De Haan",
        "VERSION": ` + workerId + `,"department_info":{"DEPARTMENT_ID":10,"departmentname":"newdept"}}'
                      where json_value(data,'$.EMPLOYEE_ID') = 100`;
        let result = await connection.execute(queryUpdate);
        assert.strictEqual(result.rowsAffected, 1);
      }

      // Start multiple workers to update the row concurrently
      const workerCount = 10;
      const workers = [];
      for (let i = 1; i <= workerCount; i++) {
        workers.push(updateRow(i));
      }

      // Wait for all workers to finish
      await Promise.all(workers);

      // Verify that the final value of the row is the expected value
      const query = `select * from emp_ov order by 1`;
      let result = await connection.execute(query);
      assert.strictEqual(result.rows[0][0].VERSION, workerCount);
    });

    it('281.2.2 two workers update and insert data into the same table at the same time', async function() {
      /*
       One of the workers will insert a new row and not commit the transaction,
       while the other worker will update an existing row.
       This should result in the second worker being blocked by the first worker,
       until the first worker either commits or rolls back its transaction.*/

      // Insert a row into the departments table
      await connection.execute(`INSERT INTO departments VALUES
                                 ( 10
                                 ,'Administration'
                                 , 100
                                 )`);


      await connection.execute(`INSERT INTO employees VALUES
                                ( 100
                                , 'Steven'
                                , 'King'
                                , 0
                                , 10
                                )`);


      // Define a function to simulate a worker inserting a row and not committing
      async function insertRow(workerId) {
        const queryInsert = `insert into emp_ov values ('{"EMPLOYEE_ID":` + 100 + workerId + `,"FIRST_NAME":"Lex",
        "LAST_NAME":"De Haan","VERSION": ` + workerId + `,"department_info":{"DEPARTMENT_ID":10,"departmentname":"Administration"}}')`;

        let result = await connection.execute(queryInsert, {}, { autoCommit: false });
        assert.strictEqual(result.rowsAffected, 1);
      }

      // Define a function to simulate a worker updating a row
      async function updateRow(workerId) {
        const queryUpdate = `update emp_ov set data = '{"EMPLOYEE_ID":100,"FIRST_NAME":"Harry","LAST_NAME":"Potter",
        "VERSION": ` + workerId + `,"department_info":{"DEPARTMENT_ID":10,"departmentname":"Wizardry"}}'
                      where json_value(data,'$.EMPLOYEE_ID') = 100`;
        let result = await connection.execute(queryUpdate);
        assert.strictEqual(result.rowsAffected, 1);
        await connection.commit();
      }

      // Start the insert and update workers concurrently
      const workers = [];
      workers.push(insertRow(1));
      workers.push(updateRow(2));

      // Wait for all workers to finish
      await Promise.all(workers);

      // Verify that the final value of the row is the expected value
      const query = `select * from emp_ov order by 1`;
      let result = await connection.execute(query);

      assert.strictEqual(result.rows.length, 2);
      assert.strictEqual(result.rows[0][0].VERSION, 2);
      assert.strictEqual(result.rows[1][0].VERSION, 1);

      // Roll back the uncommitted transaction
      await connection.rollback();
    });
  });
});
