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
 *   282. aq7.js
 *
 * DESCRIPTION
 *   Test Oracle Advanced Queueing (AQ).
 *   Test cases for JSON payload type with AQ.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const dbconfig  = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');
const assert    = require('assert');
const fs       = require('fs');

describe('282. aq7.js', function() {
  let conn = null;
  let isRunnable = false;

  const AQ_USER      = "NODB_SCHEMA_AQTEST7";
  const AQ_USER_PWD  =  testsUtil.generateRandomPassword();

  const objQueueName = "NODB_ADDR_QUEUE7";
  const objType      = "JSON";
  const objTable     = "NODB_TAB_JSON";

  const plsqlCreateQueue = `
    BEGIN
      DBMS_AQADM.CREATE_QUEUE_TABLE(
        QUEUE_TABLE => '${AQ_USER}.${objTable}',
        multiple_consumers =>  FALSE,
        QUEUE_PAYLOAD_TYPE => '${objType}'
      );
      DBMS_AQADM.CREATE_QUEUE(
        QUEUE_NAME => '${AQ_USER}.${objQueueName}',
        QUEUE_TABLE => '${AQ_USER}.${objTable}'
      );
      DBMS_AQADM.START_QUEUE(
        QUEUE_NAME => '${AQ_USER}.${objQueueName}'
      );
    END;
  `;

  const credential = {
    user: AQ_USER,
    password: AQ_USER_PWD,
    connectString: dbconfig.connectString
  };

  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2100000000, 2100000000);
    if (!dbconfig.test.DBA_PRIVILEGE || oracledb.thin || !isRunnable) {
      this.skip();
    }
    await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);
    conn = await oracledb.getConnection(credential);

    await conn.execute(plsqlCreateQueue);
  }); // before

  after(async function() {
    if (!dbconfig.test.DBA_PRIVILEGE || oracledb.thin || !isRunnable) {
      return;
    }
    await conn.close();
    await testsUtil.dropAQtestUser(AQ_USER);
  }); // after

  it('282.1 JSON type in enqOne/deqOne', async () => {
    const queue = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    await queue.enqOne ({
      payload: {
        empName: "employee name",
        empCity: "City"
      },
    });

    await conn.commit();

    const options = { payloadType: oracledb.DB_TYPE_JSON };
    const queue2 = await conn.getQueue(objQueueName, options);
    const msg = await queue2.deqOne();
    await conn.commit();
    assert.strictEqual(msg.payload.empName, "employee name");
    assert.strictEqual(msg.payload.empCity, "City");
  });

  it('282.2 JSON type in enqMany/deqMany', async () => {
    const queue3 = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON });

    const empList = [
      {payload: { empName: "Employee #1", empId: 101 }},
      {payload: { empName: "Employee #2", empId: 102 }},
      {payload: { empName: "Employee #3", empId: 103 }}
    ];

    await queue3.enqMany (empList);
    await conn.commit ();

    const queue4 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue4.deqOptions,
      {
        //  consumerName: "sub1",
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue4.deqMany(5); // get at most 5 messages

    assert.equal(msgs[0].payload.empName, "Employee #1");
    assert.equal(msgs[1].payload.empName, "Employee #2");
    assert.equal(msgs[2].payload.empName, "Employee #3");

    assert.equal(msgs[0].payload.empId, 101);
    assert.equal(msgs[1].payload.empId, 102);
    assert.equal(msgs[2].payload.empId, 103);
  });

  it('282.3 Map javascript object directly into JSON', async () => {
    const queue = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const data = {
      empName: "employee name",
      empCity: "City"
    };

    await queue.enqOne ({
      payload: data,
    });

    await conn.commit ();

    const queue2 = await conn.getQueue (objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne ();
    await conn.commit ();
    assert.equal (msg.payload.empName, "employee name");
    assert.equal (msg.payload.empCity, "City");
  });

  it('282.4 Boolean and null value', async function() {
    const queue = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const data = {
      empName: null,
      empCity: true
    };

    await queue.enqOne ({
      payload: data,
    });

    await conn.commit ();

    const queue2 = await conn.getQueue (objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne ();
    await conn.commit ();
    assert.equal (msg.payload.empName, null);
    assert.equal (msg.payload.empCity, true);
  });

  it('282.5 enqOne and deqOne Json val as array type', async function() {
    const queue = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    await queue.enqOne ({
      payload: { "employees":[ "Employee1", "Employee2", "Employee3" ] },
    });

    await conn.commit ();

    const queue2 = await conn.getQueue (objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne ();
    await conn.commit ();
    assert.deepEqual (msg.payload.employees, [ "Employee1", "Employee2", "Employee3" ]);
  });

  it('282.6 enqMany() with Json val as array type', async function() {
    const queue3 = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON });

    const empList = [
      {payload: { empName1: ["Employee #1", 101] }},
      {payload: { empName2: ["Employee #2", 102] }},
      {payload: { empName3: ["Employee #3", 103] }}
    ];

    await queue3.enqMany (empList);
    await conn.commit ();

    const queue4 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue4.deqOptions,
      {
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue4.deqMany(3); // get at most 3 messages

    assert.deepEqual(msgs[0].payload.empName1, ["Employee #1", 101]);
    assert.deepEqual(msgs[1].payload.empName2, ["Employee #2", 102]);
    assert.deepEqual(msgs[2].payload.empName3, ["Employee #3", 103]);
  });

  it('282.7 enqOne and deqOne Json val as object type', async function() {
    const queue = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    await queue.enqOne ({
      payload: { "employee": { "name":"Employee1", "age":30, "city":"New City" } },
    });

    await conn.commit ();

    const queue2 = await conn.getQueue (objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne ();
    await conn.commit ();
    assert.deepEqual (msg.payload.employee, { "name":"Employee1", "age":30, "city":"New City" });
  });

  it('282.8 enqMany() with Json val as object type', async function() {
    const queue3 = await conn.getQueue (objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});

    const empList = [
      {payload: { empDetails1: { "name":"Employee1", "age":24, "city":"New City" } }},
      {payload: { empDetails2: { "name":"Employee2", "age":30, "city":"New York" } }},
      {payload: { empDetails3: { "name":"Employee3", "age":28, "city":"New Land" } }}
    ];

    await queue3.enqMany (empList);
    await conn.commit ();

    const queue4 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue4.deqOptions,
      {
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue4.deqMany(3); // get at most 3 messages

    assert.deepEqual(msgs[0].payload.empDetails1, { "name":"Employee1", "age":24, "city":"New City" });
    assert.deepEqual(msgs[1].payload.empDetails2, { "name":"Employee2", "age":30, "city":"New York" });
    assert.deepEqual(msgs[2].payload.empDetails3, { "name":"Employee3", "age":28, "city":"New Land" });
  });

  it('282.9 enqOne and deqOne CLOB value into a JSON key ', async function() {
    const inFileName = './test/clobexample.txt';
    const jsonDoc = {
      employees: [ "Employee1", "Employee2", "Employee3" ],
      clobData: fs.readFileSync(inFileName, { encoding: 'utf8' }),
    };

    const queue = await conn.getQueue (objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    await queue.enqOne ({
      payload: jsonDoc,
    });

    await conn.commit ();

    const queue2 = await conn.getQueue (objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON });
    const msg = await queue2.deqOne ();
    await conn.commit ();

    assert.deepEqual (msg.payload, jsonDoc);
  });
});
