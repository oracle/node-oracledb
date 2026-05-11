'use strict';
const oracledb = require("oracledb");
const assert = require('assert');

describe('1. Extended Params Ezconnect Test', function() {
  let host, port, serviceName, user, password;
  before(function() {
    oracledb.thickModeDSNPassthrough = false;
    // This test runs in both node-oracledb Thin and Thick modes.
    // Optionally run in node-oracledb Thick mode
    if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
      console.log("Thick mode selected");
      // Thick mode requires Oracle Client or Oracle Instant Client libraries.
      // On Windows and macOS Intel you can specify the directory containing the
      // libraries at runtime or before Node.js starts.  On other platforms (where
      // Oracle libraries are available) the system library search path must always
      // include the Oracle library path before Node.js starts.  If the search path
      // is not correct, you will get a DPI-1047 error.  See the node-oracledb
      // installation documentation.
      let clientOpts = {};
      // On Windows and macOS Intel platforms, set the environment
      // variable NODE_ORACLEDB_CLIENT_LIB_DIR to the Oracle Client library path
      if (process.platform === 'win32' || (process.platform === 'darwin' && process.arch === 'x64')) {
        clientOpts = { libDir: process.env.NODE_ORACLEDB_CLIENT_LIB_DIR };
      }
      oracledb.initOracleClient(clientOpts);  // enable node-oracledb Thick mode
    } else {
      console.log("Thin mode selected");
    }
    // Validate required environment variables
    if (!process.env.NODE_ORACLEDB_HOST ||
      !process.env.NODE_ORACLEDB_SERVICENAME ||
      !process.env.NODE_ORACLEDB_PORT) {
      throw new Error('Please set NODE_ORACLEDB_HOST, NODE_ORACLEDB_PORT, and NODE_ORACLEDB_SERVICENAME');
    }
    host = process.env.NODE_ORACLEDB_HOST;
    port = process.env.NODE_ORACLEDB_PORT;
    serviceName = process.env.NODE_ORACLEDB_SERVICENAME;
    user = process.env.NODE_ORACLEDB_USER;
    password = process.env.NODE_ORACLEDB_PASSWORD;

  });

  async function withConnection(dbConfig, fn) {
    const connection = await oracledb.getConnection(dbConfig);
    try {
      const result = await connection.execute("select 1+1 from dual");
      assert.strictEqual(result.rows[0][0], 2);
      await fn(connection);
    } finally {
      await connection.close();
    }
  }

  async function withPool(dbConfig, fn) {
    const pool = await oracledb.createPool(dbConfig);
    try {
      await fn(pool);
    } finally {
      await pool.close(0);
    }
  }

  const EXTENDED_PARAM_ASSERTIONS = [
    {
      run: async (dbConfig) => {
        await withConnection(dbConfig, (connection) => {
          assert.strictEqual(connection.stmtCacheSize, 2);
        });
      },
    },
    {
      run: async (dbConfig) => {
        await withPool({ ...dbConfig, poolAlias: undefined }, (pool) => {
          assert.strictEqual(pool.poolMax, 5);
          assert.strictEqual(pool.poolMin, 1);
          assert.strictEqual(pool.poolIncrement, 2);
          assert.strictEqual(pool.poolTimeout, 30);
          assert.strictEqual(pool.queueTimeout, 60000);
          assert.strictEqual(pool.maxLifetimeSession, 3600);
          assert.strictEqual(pool.poolPingInterval, 60);
          assert.strictEqual(pool.poolPingTimeout, 5000);
          assert.strictEqual(pool.events, true);
          assert.strictEqual(pool.externalAuth, false);
          assert.strictEqual(pool.homogeneous, true);
        });
      },
    },
  ];
  it("1.1 Extended params via dbConfig object", async function() {
    const dbConfig = {
      user,
      password,
      connectString:
        "tcp://" +
        host +
        ":" +
        port +
        "/" +
        serviceName +
        "?njs.poolMax=5&njs.stmtCacheSize=2&njs.poolMin=1&njs.poolIncrement=2&njs.poolTimeout=30&njs.queueTimeout=60000&njs.maxLifetimeSession=3600&njs.poolPingInterval=60&njs.poolPingTimeout=5000&njs.events=true&njs.externalAuth=false&njs.homogeneous=true",
    };
    for (const { run } of EXTENDED_PARAM_ASSERTIONS) {
      await run(dbConfig);
    }
  });

  it("1.2 Standalone connection parameters", async function() {
    // This test case verifies standalone connection parameters provided in the EZConnect string.
    // We construct an EZConnect string with various njs.* parameters appended after '?'.
    // Then, we establish a connection using this string.
    // We assert:
    // - stmtCacheSize is set to 2 on the connection object.
    // - A query using SYS_CONTEXT verifies that program is set as MODULE, terminal as TERMINAL, and machine as HOST in the session context.
    // Other parameters like disableOob, driverName, events, externalAuth, mode, useTcpFastOpen are included but not asserted directly, as their effects may not be queryable via SYS_CONTEXT or exposed on the connection object in this test environment.
    const dbConfig = {
      user,
      password,
      connectString:
        "tcp://" +
        host +
        ":" +
        port +
        "/" +
        serviceName +
        "?njs.stmtCacheSize=2&njs.disableOob=true&njs.driverName=myDriver&njs.events=true&njs.externalAuth=false&njs.machine=myMachine&njs.mode=1&njs.program=myProgram&njs.terminal=myTerminal&njs.useTcpFastOpen=true",
    };
    await withConnection (dbConfig, async (connection) => {
      assert.strictEqual(connection.stmtCacheSize, 2);
      const result = await connection.execute(`
      SELECT SYS_CONTEXT('USERENV', 'MODULE') AS module,
             SYS_CONTEXT('USERENV', 'TERMINAL') AS terminal,
             SYS_CONTEXT('USERENV', 'HOST') AS host
      FROM DUAL
    `);
      const row = result.rows[0];
      assert.strictEqual(row[0], "myProgram"); // program -> MODULE
      assert.strictEqual(row[1], "myTerminal"); // terminal
      assert.strictEqual(row[2], "myMachine"); // machine -> HOST
    });
  });
});
