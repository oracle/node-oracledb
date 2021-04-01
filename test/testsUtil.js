/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
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
const assert = require('assert');
const should = require('should');
const os = require('os');

let testsUtil = exports;
module.exports = testsUtil;

testsUtil.assertThrowsAsync = async function(fn, RegExp) {
  let f = () => {};
  try {
    await fn();
  } catch (e) {
    f = () => {
      throw e;
    };
  } finally {
    assert.throws(f, RegExp);
  }
};

testsUtil.sqlCreateTable = function(tableName, sql) {
  const dropSql = testsUtil.sqlDropTable(tableName);
  return `
    BEGIN
        ${dropSql}
        EXECUTE IMMEDIATE ('${sql}');
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

testsUtil.dropTable = async function(tableName) {
  let plsql = testsUtil.sqlDropTable(tableName);
  const conn = await oracledb.getConnection(dbconfig);
  await conn.execute(plsql);
  await conn.close();
};

testsUtil.checkPrerequisites = async function(clientVersion = 1805000000, serverVersion = 1805000000) {
  if (oracledb.oracleClientVersion < clientVersion) return false;
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
  const clientVersion = oracledb.oracleClientVersion;
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

  if (!dbconfig.test.DBA_PRIVILEGE) return false;

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
    try {
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
    } catch (err) {
      should.not.exist(err);
    }
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
  try {
    let conn = await oracledb.getConnection(dbconfig);
    await conn.execute("select * from dual");
    await conn.close();
  } catch (err) {
    should.not.exist(err);
  }
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

    try {
      const connAsDBA = await oracledb.getConnection(dbaCredential);
      await connAsDBA.execute(plsql);
      await connAsDBA.close();
    } catch (err) {
      should.not.exist(err);
    }

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

    try {
      const connAsDBA = await oracledb.getConnection(dbaCredential);
      let sql = `DROP USER ${AQ_USER} CASCADE`;
      await connAsDBA.execute(sql);
    } catch (err) {
      should.not.exist(err);
    }
  }
};

testsUtil.sleep = function(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
};
