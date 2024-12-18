/*
 * The issue is reported here
 * https://github.com/oracle/node-oracledb/issues/1711
 *
 * It basically verifies if the object type created for a given type is freed along with
 * its attributes. If memory has increased more than 10MB , issue is present
 * and program asserts.
 *
 * The program runs for 5 mins and exits which means memory is not leaking.
 *
 * Run the program using node --expose-gc dbObjectMemLeakCheck.js
 */

const oracledb = require("oracledb");
const dbConfig = require('../../dbconfig.js');
let pool = {};
const plsql = `
declare
    P_IN MY_CUSTOM_TYPE;
    P_IN_OUT MY_CUSTOM_TYPE;
begin
    MY_CUSTOM_PROC(P_IN => :P_IN, P_IN_OUT => :P_IN_OUT);
end;`;
const binds = {
  "P_IN": {
    "type": "MY_CUSTOM_TYPE", "val": { "ID": 123, "NAME": "hello" },
    "dir": 3001
  }, "P_IN_OUT": {
    "type": "MY_CUSTOM_TYPE",
    "val": { "ID": 456, "NAME": "world" }, "dir": 3002
  }
};

async function setUp() {
  let connection;
  try {
    connection = await pool.getConnection();

    let sql = `CREATE OR REPLACE TYPE my_custom_type AS OBJECT (
  id NUMBER,
  name VARCHAR2(100)
);`;

    await connection.execute(sql);

    sql = `CREATE OR REPLACE PROCEDURE my_custom_proc (
  p_in IN my_custom_type,
  p_in_out IN OUT my_custom_type
) IS
BEGIN
  p_in_out.id := p_in_out.id + p_in.id;
  p_in_out.name := p_in_out.name || p_in.name;
END my_custom_proc;
`;
    await connection.execute(sql);
  } finally {
    await connection.close();
  }
}

/*
 * Added just to avoid unused variable objClass
 */
function nullLogger() {
  // Do nothing
}

async function terminate() {
  if (pool) {
    await pool.close(10);
  }
}

async function initPool() {
  try {
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 20,
      poolMax: 64,
      poolIncrement: 2,
      poolTimeout: 60
    });
    console.log("Connection pool initialized successfully.");
  } catch (err) {
    console.error("Connection pool initialization failed:", err);
  }
}

async function executeProcedure() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(plsql, binds);
  } catch (err) {
    console.error("Failed to execute stored procedure:", err);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function executeCreateObjclass() {
  let connection;
  let objClass;
  try {
    connection = await pool.getConnection();
    objClass = await connection.getDbObjectClass("MY_CUSTOM_TYPE");
  } catch (err) {
    console.error("connection.getDbObjectClass failed with error:", err);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
  nullLogger(typeof objClass);
}

async function executeProcedureWithReftoObjType() {
  let connection;
  let objClass;
  try {
    connection = await pool.getConnection();
    await connection.execute(plsql, binds);
  } catch (err) {
    console.error("Failed to execute stored procedure:", err);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
  nullLogger(typeof objClass);
}

// It runs the given function in loop.
// The loop simulates a storm of 50 webrequests coming
// in every second.
// We run this for 5 minutes and if memory has not exceeded
// threshHold, we treat it as success else throw an error.
//
async function runTestLoop(fn) {
  const counter = 50; // concurrent requests.
  const threshHold = 10;
  const initialMem = process.memoryUsage().heapUsed / 1024 / 1024;
  let finalMem;

  const intervalId = setInterval(() => {
    global.gc();
    for (let i = 0; i < counter; i++) {
      fn();
      global.gc();
    }
    finalMem = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory Usage: ${finalMem.toFixed(2)} MB`);

    if (finalMem - initialMem > threshHold) {
      console.warn('Memory usage exceeded 10 MB! Stopping execution.');
      clearInterval(intervalId); // Stops the interval
      throw new Error(`Memory Usage Exceeded 10MB ${fn.name}: Intial:
        ${initialMem} and Final: ${finalMem}`);
    }
  }, 1000);

  // wait for 5 mins
  await new Promise(r => setTimeout(r, 300000));
  clearInterval(intervalId);
  console.log(`Timer for 5 Mins finished. No Memory Leaks Found for
    ${fn.name}: Intial: ${initialMem} and Final: ${finalMem}`);
}

async function main() {
  try {
    await initPool();
    await setUp();
    await runTestLoop(executeProcedure);
    await runTestLoop(executeProcedureWithReftoObjType);
    await runTestLoop(executeCreateObjclass);
  } catch (err) {
    console.log(err);
  } finally {
    await terminate();
  }
}

main();
