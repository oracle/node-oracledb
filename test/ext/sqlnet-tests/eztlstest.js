/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const dbConfig = require('../../dbconfig.js');

/*
 * EZTLS integration test configuration
 *
 * Set NODE_ORACLEDB_CONNECTIONSTRING to an Oracle Database service
 * configured to support EZTLS.
 *
 * Example: TCP EZTLS
 *
 * export NODE_ORACLEDB_CONNECTIONSTRING='(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=<db-host>)(PORT=<tcp-port>))(CONNECT_DATA=(SERVICE_NAME=<service-name>))(SECURITY=(USE_EZ_TLS=TRUE)))'
 *
 * Example: TCPS EZTLS
 *
 * export NODE_ORACLEDB_CONNECTIONSTRING='(DESCRIPTION=(ADDRESS=(PROTOCOL=TCPS)(HOST=<db-host>)(PORT=<tcps-port>))(CONNECT_DATA=(SERVICE_NAME=<service-name>)))'
 *
 * Run the tests:
 *
 * npx mocha --timeout 0 test/ext/sqlnet-tests/eztlstest.js
 *

 */

describe('EZTLS public API integration test', function() {
  before(function() {
    if (!oracledb.thin) this.skip();
  });

  it('connects and executes SQL with EZTLS enabled', async function() {
    const connectionConfig = {
      ...dbConfig,
      useEzTLS: true
    };
    let connection;

    try {
      connection = await oracledb.getConnection(connectionConfig);
      const result = await connection.execute('select 1+1 from dual');
      assert.strictEqual(result.rows[0][0], 2);
      // Continue on the same physical connection after the first protected
      // exchange to exercise ordinary TLS application output as well.
      const value = 'x'.repeat(20000);
      const repeated = await connection.execute(
        'select length(:value) from dual', { value });
      assert.deepStrictEqual(repeated.rows, [[value.length]]);
      const pipeline = new oracledb.Pipeline();
      pipeline.addFetchAll('select 3 from dual');
      pipeline.addFetchAll('select 4 from dual');
      const results = await connection.runPipeline(pipeline);
      assert.deepStrictEqual(results.map(result => result.rows), [[[3]], [[4]]]);
    } finally {
      if (connection) await connection.close();
    }
  });

  it('connects with EZTLS when the negotiated SDU is the minimum', async function() {
    const connectionConfig = {
      ...dbConfig,
      useEzTLS: true,
      // 512 is the minimum valid TNS SDU. The EZTLS ANO handshake is larger
      // than this, so this exercises NS fragmentation and reassembly.
      sdu: 512
    };
    let connection;

    try {
      connection = await oracledb.getConnection(connectionConfig);
      const value = 'x'.repeat(20000);

      const result = await connection.execute(
        `select length(:value) as len from dual`,
        { value }
      );

      assert.deepStrictEqual(result.rows, [[value.length]]);
    } finally {
      if (connection) await connection.close();
    }
  });
});

describe('EZTLS sequential TTC operations at SDU 512', function() {
  let connection;

  before(async function() {
    if (!oracledb.thin) this.skip();
    connection = await oracledb.getConnection({ ...dbConfig, useEzTLS: true, sdu: 512 });
  });

  after(async function() {
    if (connection) await connection.close();
  });

  async function readAll(resultSet) {
    const rows = [];
    try {
      for (;;) {
        const batch = await resultSet.getRows(11);
        if (batch.length === 0) break;
        rows.push(...batch);
      }
      return rows;
    } finally {
      await resultSet.close();
    }
  }

  it('fetches multiple implicit results beyond prefetch and then executes again', async function() {
    const result = await connection.execute(`
      declare c1 sys_refcursor; c2 sys_refcursor;
      begin
        open c1 for select level from dual connect by level <= 150;
        dbms_sql.return_result(c1);
        open c2 for select level + 1000 from dual connect by level <= 120;
        dbms_sql.return_result(c2);
      end;`, [], { resultSet: true, prefetchRows: 2, fetchArraySize: 7 });
    assert.strictEqual(result.implicitResults.length, 2);
    const first = await readAll(result.implicitResults[0]);
    const second = await readAll(result.implicitResults[1]);
    assert.deepStrictEqual(first, Array.from({ length: 150 }, (_, i) => [i + 1]));
    assert.deepStrictEqual(second, Array.from({ length: 120 }, (_, i) => [i + 1001]));
    assert.deepStrictEqual((await connection.execute('select 1 from dual')).rows, [[1]]);
  });

  it('fetches a REF CURSOR in batches and recovers from a database error', async function() {
    const result = await connection.execute(`begin
      open :cursor for select level from dual connect by level <= 200;
      end;`, { cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR } },
    { prefetchRows: 0, fetchArraySize: 7 });
    assert.deepStrictEqual(await readAll(result.outBinds.cursor),
      Array.from({ length: 200 }, (_, i) => [i + 1]));
    await assert.rejects(connection.execute("begin raise_application_error(-20001, 'EZTLS test'); end;"),
      /ORA-20001/);
    await connection.ping();
  });

  it('writes and reads temporary CLOBs and BLOBs across several SDUs', async function() {
    for (const [type, value] of [
      [oracledb.CLOB, 'Oracle EZTLS '.repeat(2000)],
      [oracledb.BLOB, Buffer.alloc(24000, 42)]
    ]) {
      const lob = await connection.createLob(type);
      try {
        await lob.setData(value);
        assert.deepStrictEqual(await lob.getData(), value);
        assert.deepStrictEqual(await lob.getData(9, 100), value.slice(8, 108));
      } finally {
        await lob.close();
      }
    }
    await connection.ping();
  });

  it('enqueues and dequeues RAW AQ messages singly and in arrays', async function() {
    const queueName = `NODB_EZ_Q_${process.pid}`;
    const tableName = `NODB_EZ_QT_${process.pid}`;
    let tableCreated = false;
    try {
      try {
        await connection.execute(`begin dbms_aqadm.create_queue_table(
          queue_table => :name, queue_payload_type => 'RAW'); end;`, [tableName]);
      } catch (err) {
        if (err.errorNum === 6550 && /PLS-00201.*'DBMS_AQADM'/.test(err.message)) {
          console.log('AQ coverage pending: test account requires access to SYS.DBMS_AQADM.');
          this.skip();
        }
        throw err;
      }
      tableCreated = true;
      await connection.execute(`begin
        dbms_aqadm.create_queue(queue_name => :q, queue_table => :t);
        dbms_aqadm.start_queue(queue_name => :q);
        end;`, { q: queueName, t: tableName });
      const queue = await connection.getQueue(queueName);
      queue.deqOptions.wait = oracledb.AQ_DEQ_NO_WAIT;
      const payload = Buffer.alloc(2000, 65);
      await queue.enqOne(payload);
      await connection.commit();
      assert.deepStrictEqual((await queue.deqOne()).payload, payload);
      await connection.commit();
      const payloads = [Buffer.alloc(1800, 66), Buffer.alloc(1600, 67)];
      await queue.enqMany(payloads);
      await connection.commit();
      const messages = await queue.deqMany(2);
      assert.deepStrictEqual(messages.map(message => message.payload), payloads);
      await connection.commit();
      assert.strictEqual(await queue.deqOne(), undefined);
      await connection.rollback();
      await connection.ping();
    } finally {
      if (tableCreated) {
        await connection.rollback();
        await connection.execute(`begin dbms_aqadm.drop_queue_table(
          queue_table => :name, force => true); end;`, [tableName]);
      }
    }
  });
});

describe('EZTLS TTC pipelining at SDU 512', function() {
  let connection;

  before(async function() {
    if (!oracledb.thin) this.skip();
    connection = await oracledb.getConnection({
      ...dbConfig,
      useEzTLS: true,
      sdu: 512
    });
    if (!connection._impl.supportsPipelining()) {
      await connection.close();
      connection = null;
      this.skip();
    }
  });

  after(async function() {
    if (connection) await connection.close();
  });

  it('runs pipelined fetches across several EZTLS packets', async function() {
    const value = 'x'.repeat(20000);
    const pipeline = new oracledb.Pipeline();
    pipeline.addFetchOne('select length(:value) from dual', { value });
    pipeline.addFetchOne('select :value from dual', { value: 'pipelined' });
    pipeline.addFetchOne('select 3 from dual');

    const results = await connection.runPipeline(pipeline);

    assert.deepStrictEqual(results.map(result => result.rows), [
      [[value.length]],
      [['pipelined']],
      [[3]]
    ]);
  });

  it('continues an EZTLS pipeline after an operation error', async function() {
    const pipeline = new oracledb.Pipeline();
    pipeline.addExecute("begin raise_application_error(-20001, 'EZTLS pipeline'); end;");
    pipeline.addFetchOne('select 42 from dual');

    const results = await connection.runPipeline(pipeline, true);

    assert.strictEqual(results[0].error.code, 'ORA-20001');
    assert.deepStrictEqual(results[1].rows, [[42]]);
    assert.deepStrictEqual((await connection.execute('select 1 from dual')).rows,
      [[1]]);
  });
});
