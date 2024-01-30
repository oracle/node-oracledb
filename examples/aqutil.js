/* Copyright (c) 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   aqutil.js
 *
 * DESCRIPTION
 *   Setup the user credentials for all the Advanced Queuing (AQ) examples.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');

const aqUtil = exports;
module.exports = aqUtil;

aqUtil.createAQtestUser = async function(AQ_USER, AQ_USER_PWD) {

  const dbaCredential = {
    user: dbConfig.DBA_user,
    password: dbConfig.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  };

  const plsql = `
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

};

aqUtil.dropAQtestUser = async function(AQ_USER) {
  const dbaCredential = {
    user: dbConfig.DBA_user,
    password: dbConfig.DBA_password,
    connectString: dbConfig.connectString,
    privilege: oracledb.SYSDBA
  };

  const connAsDBA = await oracledb.getConnection(dbaCredential);
  const sql = `DROP USER ${AQ_USER} CASCADE`;
  await connAsDBA.execute(sql);
  await connAsDBA.close();

};

aqUtil.generateRandomPassword = function(length = 6) {
  let result = "";
  const choices = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < length; i++) {
    result += choices.charAt(Math.floor(Math.random() * choices.length));
  }
  return result;
};
