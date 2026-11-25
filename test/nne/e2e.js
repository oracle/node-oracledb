'use strict';

const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const net = require('node:net');
const { once } = require('node:events');
const { test } = require('node:test');
const { Buffer } = require('node:buffer');
const oracledb = require('../..');

const credentials = {
  user: process.env.NODE_ORACLEDB_USER || 'nne_test',
  password: process.env.NODE_ORACLEDB_PASSWORD || 'NneTest9876',
  connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING ||
    `127.0.0.1:${process.env.NNE_ORACLE_PORT || '11521'}/FREEPDB1`,
};
const nne = { ...credentials, nativeNetworkEncryption: 'required' };
const plaintextServer = process.env.NNE_ORACLE_POLICY === 'plaintext';
const localEndpoint = /^127\.0\.0\.1:(\d+)\/(.+)$/.exec(credentials.connectString);

async function verifyProtection(connection) {
  const result = await connection.execute(`
    SELECT network_service_banner
    FROM SYS.NNE_TEST_SESSION_BANNERS
  `);
  const banners = result.rows.map(([banner]) => banner).join('\n');
  assert.match(banners, /AES256 Encryption service adapter/i);
  assert.match(banners, /SHA256 Crypto-checksumming service adapter/i);
}

test('rejects a required-NNE server without the NNE option', { skip: plaintextServer }, async () => {
  await assert.rejects(async () => {
    const connection = await oracledb.getConnection(credentials);
    await connection.close();
  }, /ORA-126(?:50|60)|NJS-533/);
});

test('requires NNE, authenticates, and exchanges multi-packet query data', { skip: plaintextServer }, async () => {
  assert.equal(oracledb.thin, true);
  const connection = await oracledb.getConnection(nne);
  const table = `NNE_PAYLOAD_${randomBytes(6).toString('hex')}`;
  try {
    await verifyProtection(connection);
    await connection.execute(`CREATE TABLE ${table} (payload CLOB)`);
    try {
      const payload = 'encrypted payload '.repeat(8_192);
      await connection.execute(`INSERT INTO ${table} VALUES (:payload)`, {
        payload: { val: payload, type: oracledb.CLOB },
      });
      const result = await connection.execute(`SELECT payload FROM ${table}`, [], {
        fetchTypeHandler: () => ({ type: oracledb.STRING }),
      });
      assert.deepEqual(result.rows, [[payload]]);
      await connection.rollback();
      const health = await connection.execute(`SELECT COUNT(*) FROM ${table}`);
      assert.deepEqual(health.rows, [[0]]);
    } finally {
      await connection.execute(`DROP TABLE ${table} PURGE`);
    }
  } finally {
    await connection.close();
  }
});

test('a Thin pool negotiates NNE on every physical connection', { skip: plaintextServer }, async () => {
  const pool = await oracledb.createPool({ ...nne, poolMin: 0, poolMax: 2 });
  try {
    const first = await pool.getConnection();
    try {
      const second = await pool.getConnection();
      try {
        await Promise.all([verifyProtection(first), verifyProtection(second)]);
      } finally {
        await second.close();
      }
    } finally {
      await first.close();
    }
  } finally {
    await pool.close(0);
  }
});

test('resynchronizes protection after cancelling an Oracle call', { skip: plaintextServer }, async () => {
  const connection = await oracledb.getConnection(nne);
  try {
    connection.callTimeout = 500;
    await assert.rejects(connection.execute('BEGIN DBMS_SESSION.SLEEP(5); END;'), /NJS-123:/);
    connection.callTimeout = 0;
    await verifyProtection(connection);
  } finally {
    await connection.close();
  }
});

test('refuses to fall back to plaintext when the server rejects NNE', { skip: !plaintextServer }, async () => {
  const connection = await oracledb.getConnection(credentials);
  try {
    const result = await connection.execute('SELECT 42 FROM dual');
    assert.deepEqual(result.rows, [[42]]);
  } finally {
    await connection.close();
  }
  await assert.rejects(async () => {
    const unprotected = await oracledb.getConnection(nne);
    await unprotected.close();
  }, /NJS-(?:53[1-3]|539)|ORA-126(?:50|60)/);
});

test('closes the connection when a protected response is corrupted in transit',
  { skip: plaintextServer || !localEndpoint, timeout: 15_000 }, async () => {
    let corrupt = false;
    let upstream;
    let downstream;
    let pending = Buffer.alloc(0);
    const proxy = net.createServer((client) => {
      downstream = client;
      upstream = net.createConnection(Number(localEndpoint[1]), '127.0.0.1');
      upstream.on('error', () => client.destroy());
      client.on('error', () => upstream.destroy());
      upstream.on('close', () => client.destroy());
      client.on('close', () => upstream.destroy());
      client.pipe(upstream);
      upstream.on('data', (chunk) => {
        if (!corrupt) {
          client.write(chunk);
          return;
        }
        pending = Buffer.concat([pending, chunk]);
        if (pending.length > 10) {
          assert.equal(pending[4], 6, 'expected an Oracle Net DATA packet');
          pending[10] ^= 0x80;
          corrupt = false;
          client.write(pending);
        }
      });
    });
    proxy.listen(0, '127.0.0.1');
    await once(proxy, 'listening');
    let connection;
    try {
      connection = await oracledb.getConnection({
        ...nne,
        connectString: `127.0.0.1:${proxy.address().port}/${localEndpoint[2]}`,
      });
      corrupt = true;
      await assert.rejects(connection.execute('SELECT 42 FROM dual'), { code: 'NJS-540' });
      assert.equal(connection.isHealthy(), false);
    } finally {
      await connection?.close();
      downstream?.destroy();
      upstream?.destroy();
      await new Promise((resolve) => proxy.close(resolve));
    }
  });
