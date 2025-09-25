/* Copyright (c) 2024, 2025, Oracle and/or its affiliates. */

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
 *   283. aq7.js
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

describe('283. aq7.js', function() {
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
    if (!dbconfig.test.DBA_PRIVILEGE) this.skip();

    isRunnable = await testsUtil.checkPrerequisites(2100000000, 2100000000);
    if (!isRunnable) this.skip();

    await testsUtil.createAQtestUser(AQ_USER, AQ_USER_PWD);
    conn = await oracledb.getConnection(credential);
    await conn.execute(plsqlCreateQueue);
  }); // before

  after(async function() {
    if (!dbconfig.test.DBA_PRIVILEGE || !isRunnable) {
      return;
    }
    await conn.close();
    await testsUtil.dropAQtestUser(AQ_USER);
  }); // after

  it('283.1 JSON type in enqOne/deqOne', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );
    const dt = new Date(1990, 3, 2);
    const intYM = new oracledb.IntervalYM({ years: 1, months: 6 });
    const intDS = new oracledb.IntervalDS({ days: 5, hours: 12, minutes: 10, seconds: 15, fseconds: 0 });

    await queue.enqOne ({
      payload: {
        empName: "Chris",
        empCity: "Melbourne",
        hiredate: dt,
        experience: intYM,
        timeIn: intDS
      },
    });

    await conn.commit();

    const options = { payloadType: oracledb.DB_TYPE_JSON };
    const queue2 = await conn.getQueue(objQueueName, options);
    const msg = await queue2.deqOne();
    await conn.commit();

    assert.strictEqual(msg.payload.empName, "Chris");
    assert.strictEqual(msg.payload.empCity, "Melbourne");
    assert.deepStrictEqual(msg.payload.hiredate, dt);
    assert.deepStrictEqual(msg.payload.experience, intYM);
    assert.deepStrictEqual(msg.payload.timeIn, intDS);
  }); // 283.1

  it('283.2 JSON type in enqMany/deqMany', async function() {
    const queue3 = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON });

    const birthdate1 = new Date(1990, 3, 2);
    const birthdate2 = new Date(1985, 10, 21);
    const birthdate3 = new Date(2010, 6, 15);
    const intYM = new oracledb.IntervalYM({ years: 1, months: 6 });
    const intDS = new oracledb.IntervalDS({ days: 5, hours: 12, minutes: 10, seconds: 15, fseconds: 0 });

    const empList = [
      {payload: {
        empName: "Employee #1",
        empId: 101,
        birthdate: birthdate1,
        experience: intYM,
        timeIn: intDS }
      },
      {payload: {
        empName: "Employee #2",
        empId: 102,
        birthdate: birthdate2,
        experience: intYM,
        timeIn: intDS }
      },
      {payload: {
        empName: "Employee #3",
        empId: 103,
        birthdate: birthdate3,
        experience: intYM,
        timeIn: intDS }
      }
    ];

    await queue3.enqMany(empList);
    await conn.commit();

    const queue4 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue4.deqOptions,
      {
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

    assert.deepStrictEqual(msgs[0].payload.birthdate, birthdate1);
    assert.deepStrictEqual(msgs[1].payload.birthdate, birthdate2);
    assert.deepStrictEqual(msgs[2].payload.birthdate, birthdate3);

    assert.deepStrictEqual(msgs[0].payload.experience, intYM);
    assert.deepStrictEqual(msgs[1].payload.experience, intYM);
    assert.deepStrictEqual(msgs[2].payload.experience, intYM);

    assert.deepStrictEqual(msgs[0].payload.timeIn, intDS);
    assert.deepStrictEqual(msgs[1].payload.timeIn, intDS);
    assert.deepStrictEqual(msgs[2].payload.timeIn, intDS);
    assert.strictEqual(queue4.deqOptions.navigation, oracledb.AQ_DEQ_NAV_FIRST_MSG);
  }); // 283.2

  it('283.3 Map JS object directly into JSON - enqOne/deqOne', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const data = {
      empName: "employee name",
      empCity: "City"
    };

    await queue.enqOne({
      payload: data,
    });

    await conn.commit();

    const queue2 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne();
    await conn.commit ();

    assert.equal(msg.payload.empName, "employee name");
    assert.equal(msg.payload.empCity, "City");
  }); // 283.3

  it('283.4 Map JS object directly into JSON - enqMany/deqMany', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const dataList = [
      {payload: { empName: "Employee #1", empCity: "City1" }},
      {payload: { empName: "Employee #2", empCity: "City2" }},
      {payload: { empName: "Employee #3", empCity: "City3" }}
    ];

    await queue.enqMany(dataList);
    await conn.commit();

    const queue2 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue2.deqOptions,
      {
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue2.deqMany(5); // get at most 5 messages

    assert.equal(msgs[0].payload.empName, "Employee #1");
    assert.equal(msgs[1].payload.empName, "Employee #2");
    assert.equal(msgs[2].payload.empName, "Employee #3");

    assert.equal(msgs[0].payload.empCity, "City1");
    assert.equal(msgs[1].payload.empCity, "City2");
    assert.equal(msgs[2].payload.empCity, "City3");
    assert.strictEqual(queue2.deqOptions.navigation, oracledb.AQ_DEQ_NAV_FIRST_MSG);
  }); // 283.4

  it('283.5 enqOne and deqOne Null & Boolean in JSON', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const data = {
      empName: null,
      empCity: true
    };

    await queue.enqOne({
      payload: data,
    });
    await conn.commit();

    const queue2 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne();
    await conn.commit();

    assert.equal(msg.payload.empName, null);
    assert.equal(msg.payload.empCity, true);
  }); // 283.5

  it('283.6 enqMany and deqMany Null & Boolean in JSON', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const dataList = [
      {payload: { empName: null, empCity: true }},
      {payload: { empName: null, empCity: false }},
      {payload: { empName: null, empCity: true }}
    ];

    await queue.enqMany(dataList);
    await conn.commit();

    const queue2 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue2.deqOptions,
      {
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue2.deqMany(5); // get at most 5 messages

    assert.equal(msgs[0].payload.empName, null);
    assert.equal(msgs[1].payload.empName, null);
    assert.equal(msgs[2].payload.empName, null);

    assert.equal(msgs[0].payload.empCity, true);
    assert.equal(msgs[1].payload.empCity, false);
    assert.equal(msgs[2].payload.empCity, true);
    assert.strictEqual(queue2.deqOptions.navigation, oracledb.AQ_DEQ_NAV_FIRST_MSG);
  }); // 283.6

  it('283.7 enqOne and deqOne with JSON val as array type', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    await queue.enqOne({
      payload: { "employees": [ "Employee1", "Employee2", "Employee3" ] },
    });
    await conn.commit();

    const queue2 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne();
    await conn.commit();

    assert.deepStrictEqual(msg.payload.employees,
      [ "Employee1", "Employee2", "Employee3" ]);
  }); // 283.7

  it('283.8 enqMany and deqMany with JSON val as array type', async function() {
    const queue3 = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON });

    const empList = [
      {payload: { empName1: ["Employee #1", 101] }},
      {payload: { empName2: ["Employee #2", 102] }},
      {payload: { empName3: ["Employee #3", 103] }}
    ];

    await queue3.enqMany(empList);
    await conn.commit();

    const queue4 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue4.deqOptions,
      {
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue4.deqMany(3); // get at most 3 messages

    assert.deepStrictEqual(msgs[0].payload.empName1, ["Employee #1", 101]);
    assert.deepStrictEqual(msgs[1].payload.empName2, ["Employee #2", 102]);
    assert.deepStrictEqual(msgs[2].payload.empName3, ["Employee #3", 103]);
    assert.strictEqual(queue4.deqOptions.navigation, oracledb.AQ_DEQ_NAV_FIRST_MSG);
  }); // 283.8

  it('283.9 enqOne and deqOne JSON val as object type', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    await queue.enqOne({
      payload:
        { "employee": { "name": "Employee1", "age": 30, "city": "New City" } },
    });
    await conn.commit();

    const queue2 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    const msg = await queue2.deqOne();
    await conn.commit();

    assert.deepStrictEqual(msg.payload.employee,
      { "name": "Employee1", "age": 30, "city": "New City" });
  }); // 283.9

  it('283.10 enqMany and deqMany with JSON val as object type', async function() {
    const queue3 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});

    const empList = [
      {payload: { empDetails1:
        { "name": "Employee1", "age": 24, "city": "New City" } }},
      {payload: { empDetails2:
        { "name": "Employee2", "age": 30, "city": "New York" } }},
      {payload: { empDetails3:
        { "name": "Employee3", "age": 28, "city": "New Land" } }}
    ];

    await queue3.enqMany(empList);
    await conn.commit();

    const queue4 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON});
    Object.assign(queue4.deqOptions,
      {
        navigation: oracledb.AQ_DEQ_NAV_FIRST_MSG,
        wait: oracledb.AQ_DEQ_NO_WAIT
      }
    );

    const msgs = await queue4.deqMany(3); // get at most 3 messages

    assert.deepStrictEqual(msgs[0].payload.empDetails1,
      { "name": "Employee1", "age": 24, "city": "New City" });
    assert.deepStrictEqual(msgs[1].payload.empDetails2,
      { "name": "Employee2", "age": 30, "city": "New York" });
    assert.deepStrictEqual(msgs[2].payload.empDetails3,
      { "name": "Employee3", "age": 28, "city": "New Land" });
    assert.strictEqual(queue4.deqOptions.navigation, oracledb.AQ_DEQ_NAV_FIRST_MSG);
  }); // 283.10

  it('283.11 enqOne and deqOne CLOB value into a JSON key', async function() {
    const inFileName = './test/clobexample.txt';
    const jsonDoc = {
      employees: [ "Employee1", "Employee2", "Employee3" ],
      clobData: fs.readFileSync(inFileName, { encoding: 'utf8' }),
    };

    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    await queue.enqOne({
      payload: jsonDoc,
    });

    await conn.commit();

    const queue2 = await conn.getQueue(objQueueName,
      {payloadType: oracledb.DB_TYPE_JSON });
    const msg = await queue2.deqOne();
    await conn.commit();

    assert.deepStrictEqual(msg.payload, jsonDoc);
  }); // 283.11

  it('283.12 enqOne/deqOne with empty JSON object/array', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    // Test empty object
    await queue.enqOne({
      payload: {}
    });
    await conn.commit();

    let msg = await queue.deqOne();
    assert.deepStrictEqual(msg.payload, {});

    // Test empty array
    await queue.enqOne({
      payload: []
    });
    await conn.commit();

    msg = await queue.deqOne();
    assert.deepStrictEqual(msg.payload, []);
  }); // 283.12

  it('283.13 JSON with deeply nested structure', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const deeplyNested = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                data: "Deep data",
                array: [1, 2, [3, 4, [5, 6]]]
              }
            }
          }
        }
      }
    };

    await queue.enqOne({
      payload: deeplyNested
    });
    await conn.commit();

    const msg = await queue.deqOne();
    assert.deepStrictEqual(msg.payload, deeplyNested);
  });  // 283.13

  it('283.14 concurrent enqueue/dequeue operations', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const numMessages = 10;
    const messages = Array.from({ length: numMessages }, (_, i) => ({
      payload: { id: i, data: `Message ${i}` }
    }));

    // Enqueue messages concurrently
    await Promise.all(messages.map(msg => queue.enqOne(msg)));
    await conn.commit();

    // Dequeue messages concurrently
    const results = await Promise.all(
      Array(numMessages).fill().map(() => queue.deqOne())
    );
    await conn.commit();

    // Verify all messages were received
    const receivedIds = new Set(results.map(msg => msg.payload.id));
    assert.strictEqual(receivedIds.size, numMessages);
  }); // 283.14

  it('283.15 JSON with special characters and Unicode', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    const specialData = {
      specialChars: "!@#$%^&*()_+{}[]|\\:;\"'<>,.?/~`",
      unicode: "Hello, 世界! привет มир 안녕하세요",
      multiline: "Line 1\nLine 2\rLine 3\r\nLine 4",
      whitespace: "\t\n\r\f\v"
    };

    await queue.enqOne({
      payload: specialData
    });
    await conn.commit();

    const msg = await queue.deqOne();
    assert.deepStrictEqual(msg.payload, specialData);
  }); // 283.15

  it('283.16 large JSON payload size limits', async function() {
    const queue = await conn.getQueue(objQueueName,
      { payloadType: oracledb.DB_TYPE_JSON }
    );

    // Create a large JSON object
    const largeData = {
      array: Array(10000).fill().map((_, i) => ({
        id: i,
        data: "x".repeat(100)
      }))
    };

    await queue.enqOne({
      payload: largeData
    });
    await conn.commit();

    const msg = await queue.deqOne();
    assert.deepStrictEqual(msg.payload, largeData);
  }); // 283.16
});
