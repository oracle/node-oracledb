/* Copyright (c) 2019, 2022, Oracle and/or its affiliates. */

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
 *   testsUtil.js
 *
 * DESCRIPTION
 *   The utility functions for tests.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbconfig = require('./dbconfig.js');
const sodaUtil = require('./sodaUtil.js');
const assert   = require('assert');
const os       = require('os');

let testsUtil = exports;
module.exports = testsUtil;

testsUtil.sqlCreateTable = function(tableName, sql) {
  const dropSql = testsUtil.sqlDropTable(tableName);
  return `
    BEGIN
        ${dropSql}
        EXECUTE IMMEDIATE ('${sql}');
    END;
  `;
};

testsUtil.sqlDropSource = function(sourceType, sourceName) {
  return `
    DECLARE
        e_source_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_source_missing, -4043);
    BEGIN
        EXECUTE IMMEDIATE ('DROP ${sourceType} ${sourceName}');
    EXCEPTION
        WHEN e_source_missing THEN NULL;
    END;
  `;
};

testsUtil.sqlDropTable = function(tableName) {
  return `
    DECLARE
        e_table_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_table_missing, -942);
    BEGIN
        EXECUTE IMMEDIATE ('DROP TABLE ${tableName} PURGE');
    EXCEPTION
        WHEN e_table_missing THEN NULL;
    END;
  `;
};

testsUtil.sqlDropType = function(typeName) {
  return `
    DECLARE
        e_type_missing EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_type_missing, -4043);
    BEGIN
        EXECUTE IMMEDIATE ('DROP TYPE ${typeName} FORCE');
    EXCEPTION
        WHEN e_type_missing THEN NULL;
    END;
  `;
};

testsUtil.createTable = async function(tableName, sql) {
  let plsql = testsUtil.sqlCreateTable(tableName, sql);
  const conn = await oracledb.getConnection(dbconfig);
  await conn.execute(plsql);
  await conn.close();
};

testsUtil.dropSource = async function(sourceType, sourceName) {
  let plsql = testsUtil.sqlDropSource(sourceType, sourceName);
  const conn = await oracledb.getConnection(dbconfig);
  await conn.execute(plsql);
  await conn.close();
};

testsUtil.dropTable = async function(tableName) {
  let plsql = testsUtil.sqlDropTable(tableName);
  const conn = await oracledb.getConnection(dbconfig);
  await conn.execute(plsql);
  await conn.close();
};

testsUtil.checkPrerequisites = async function(clientVersion = 1805000000, serverVersion = 1805000000) {
  if (testsUtil.getClientVersion() < clientVersion) return false;
  try {
    let connection = await oracledb.getConnection(dbconfig);
    if (connection.oracleServerVersion < serverVersion) return false;
    await connection.close();
    return true;
  } catch (err) {
    console.log('Error in checking prerequistes:\n', err);
  }
};

testsUtil.isSodaRunnable = async function() {
  const clientVersion = testsUtil.getClientVersion();
  let serverVersion;
  try {
    const conn = await oracledb.getConnection(dbconfig);
    serverVersion = conn.oracleServerVersion;

    await conn.close();
  } catch (error) {
    console.log('Error in checking SODA prerequistes:\n', error);
  }

  if ((clientVersion < 1805000000) || (serverVersion < 1805000000)) return false;

  if ((serverVersion >= 2000000000) && (clientVersion < 2000000000)) return false;

  if ((clientVersion >= 1909000000) && (serverVersion < 1909000000)) return false;

  let sodaRole = await sodaUtil.isSodaRoleGranted();
  if (!sodaRole) return false;

  return true;
};

testsUtil.generateRandomPassword = function(length = 6) {
  let result = "";
  const choices = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < length; i++) {
    result += choices.charAt(Math.floor(Math.random() * choices.length));
  }
  return result;
};

testsUtil.getDBCompatibleVersion = async function() {
  let compatibleVersion;
  if (dbconfig.test.DBA_PRIVILEGE) {
    const connectionDetails = {
      user          : dbconfig.test.DBA_user,
      password      : dbconfig.test.DBA_password,
      connectString : dbconfig.connectString,
      privilege     : oracledb.SYSDBA,
    };
    let conn = await oracledb.getConnection(connectionDetails);
    let res = await conn.execute("select name, value from v$parameter where name = 'compatible'");
    if (res.rows.length > 0) {
      compatibleVersion = res.rows[0][1];
    }
    await conn.close();
  }
  return compatibleVersion;
};

// Function versionStringCompare returns:
// * 1 if version1 is greater than version2
// * -1 if version1 is smaller than version2
// * 0 if version1 is equal to version2
// * undefined if eigher version1 or version2 is not string
testsUtil.versionStringCompare = function(version1, version2) {
  if (typeof version1 === 'string' && typeof version2 === 'string') {
    let tokens1 = version1.split('.');
    let tokens2 = version2.split('.');
    let len = Math.min(tokens1.length, tokens2.length);
    for (let i = 0; i < len; i++) {
      const t1 = parseInt(tokens1[i]), t2 = parseInt(tokens2[i]);
      if (t1 > t2) return 1;
      if (t1 < t2) return -1;
    }
    if (tokens1.length < tokens2.length) return 1;
    if (tokens1.length > tokens2.length) return -1;
    return 0;
  }
  return undefined;
};

testsUtil.getLocalIPAddress = function() {
  const ifaces = os.networkInterfaces();
  let result = [];
  Object.keys(ifaces).forEach(function(ifname) {
    var alias = 0;
    ifaces[ifname].forEach(function(iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) return undefined;
      if (alias >= 1) {
        result.push({"name": `${ifname}:${alias}`, "address": iface.address});
      } else {
        result.push({"name": ifname, "address": iface.address});
      }
      ++alias;
    });
  });
  return result;
};

testsUtil.measureNetworkRoundTripTime = async function() {
  const startTime = +new Date();
  const conn = await oracledb.getConnection(dbconfig);
  await conn.execute("select * from dual");
  await conn.close();
  return new Date() - startTime;
};

testsUtil.getSid = async function(conn) {
  const sql = `select sys_context('userenv','sid') from dual`;
  const result = await conn.execute(sql);
  return result.rows[0][0];  // session id
};

testsUtil.getRoundTripCount = async function(sid) {
  if (!dbconfig.test.DBA_PRIVILEGE) {
    let msg = "Note: DBA privilege environment variable is not true!\n";
    msg += "Without DBA privilege the test cannot get the current round trip count!";
    throw new Error(msg);
  } else {
    let dbaCredential = {
      user:          dbconfig.test.DBA_user,
      password:      dbconfig.test.DBA_password,
      connectString: dbconfig.connectString,
      privilege:     oracledb.SYSDBA
    };

    const sql = `
      select ss.value
      from v$sesstat ss, v$statname sn
      where ss.sid = :sid
        and ss.statistic# = sn.statistic#
        and sn.name like '%roundtrip%client%'`;
    const conn = await oracledb.getConnection(dbaCredential);
    const result = await conn.execute(sql, [sid]);
    await conn.close();
    return result.rows[0][0];  // number of round-trips executed so far in the session
  }
};


testsUtil.getParseCount = async function(systemconn, sid) {
  const sql = `
     select ss.value
     from v$sesstat ss, v$statname sn
     where ss.sid = :sid
       and ss.statistic# = sn.statistic#
       and sn.name = 'parse count (total)'`;
  const result = await systemconn.execute(sql, [sid]);
  return result.rows[0][0];  // parse count so far in the session
};


testsUtil.createAQtestUser = async function(AQ_USER, AQ_USER_PWD) {

  if (!dbconfig.test.DBA_PRIVILEGE) {
    let msg = "Note: DBA privilege environment variable is not true!\n";
    msg += "Without DBA privilege, the test cannot create the schema!";
    throw new Error(msg);
  } else {
    let dbaCredential = {
      user:          dbconfig.test.DBA_user,
      password:      dbconfig.test.DBA_password,
      connectString: dbconfig.connectString,
      privilege:     oracledb.SYSDBA
    };

    let plsql = `
      BEGIN
        DECLARE
          e_user_missing EXCEPTION;
          PRAGMA EXCEPTION_INIT(e_user_missing, -01918);
        BEGIN
          EXECUTE IMMEDIATE('DROP USER ${AQ_USER} CASCADE');
        EXCEPTION
          WHEN e_user_missing
          THEN NULL;
        END;
        EXECUTE IMMEDIATE ('
          CREATE USER ${AQ_USER} IDENTIFIED BY ${AQ_USER_PWD}
        ');
        EXECUTE IMMEDIATE ('
          GRANT CONNECT, RESOURCE, UNLIMITED TABLESPACE TO ${AQ_USER}
        ');
        EXECUTE IMMEDIATE ('
          GRANT AQ_ADMINISTRATOR_ROLE, AQ_USER_ROLE TO ${AQ_USER}
        ');
        EXECUTE IMMEDIATE ('
          GRANT EXECUTE ON DBMS_AQ TO ${AQ_USER}
        ');
    END;
    `;

    const connAsDBA = await oracledb.getConnection(dbaCredential);
    await connAsDBA.execute(plsql);
    await connAsDBA.close();

  }
};

testsUtil.dropAQtestUser = async function(AQ_USER) {
  if (!dbconfig.test.DBA_PRIVILEGE) {
    let msg = "Note: DBA privilege environment variable is not true!\n";
    msg += "Without DBA privilege, the test cannot drop the schema!\n";
    throw new Error(msg);
  } else {
    let dbaCredential = {
      user:          dbconfig.test.DBA_user,
      password:      dbconfig.test.DBA_password,
      connectString: dbconfig.connectString,
      privilege:     oracledb.SYSDBA
    };

    const connAsDBA = await oracledb.getConnection(dbaCredential);
    let sql = `DROP USER ${AQ_USER} CASCADE`;
    await connAsDBA.execute(sql);
  }
};

testsUtil.doStream = async function(stream) {
  const consumeStream = new Promise((resolve, reject) => {
    stream.on('data', function(data) {
      assert(data);
    });
    stream.on('end', function() {
      stream.destroy();
    });
    stream.on('error', function(error) {
      assert.fail(error);
      reject(error);
    });
    stream.on('close', function() {
      resolve();
    });
  });

  await consumeStream;
};

testsUtil.isLongUserNameRunnable = async function() {
  if (!dbconfig.test.DBA_PRIVILEGE) {
    return false;
  } else {
    let checkVersions = await testsUtil.checkPrerequisites(1800000000, 1800000000);
    let checkCompatible = await testsUtil.versionStringCompare(await testsUtil.getDBCompatibleVersion(), '12.2.0.0.0');
    if (checkVersions && (checkCompatible >= 0)) {
      return true;
    } else {
      return false;
    }
  }
};

testsUtil.getPoolConnection = async function(pool) {
  if (dbconfig.test.proxySessionUser && dbconfig.test.externalAuth) {
    return await pool.getConnection({user: dbconfig.test.proxySessionUser});
  } else {
    return await pool.getConnection();
  }
};

testsUtil.sleep = function(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

testsUtil.isDate = function(date) {
  if (isNaN(Date.parse(date))) {
    return false;
  } else {
    return true;
  }
};

// return client version in use
testsUtil.getClientVersion = function() {
  return oracledb.oracleClientVersion;
};

// function to determine if objects are equal to each other
testsUtil.isDeepEqual = function(x, y) {

  // if values match, no need to check further
  if (x === y)
    return true;

  // both values must not be null
  if (x === null || y === null)
    return false;

  // both values must be an object
  if (typeof x !== 'object' || typeof y !== 'object')
    return false;

  // both objects must have the same number of keys
  if (Object.keys(x).length != Object.keys(y).length)
    return false;

  // each key must have the same value
  for (let key in x) {
    if (!testsUtil.isDeepEqual(x[key], y[key]))
      return false;
  }

  return true;
};

// function to assert that an array contains the specified value
testsUtil.assertOneOf = function(array, value) {
  let matches = false;
  for (let i = 0; i < array.length; i++) {
    if (testsUtil.isDeepEqual(array[i], value)) {
      matches = true;
      break;
    }
  }
  assert(matches);
};
