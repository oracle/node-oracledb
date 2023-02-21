/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   dbconfig.js
 *
 * DESCRIPTION
 *   This file conduct the configuration work for all the tests.
 *   There are TWO options for users to choose:
 *
 *   1. Edit the credential section of this file.
 *   2. Set these environment variables:
 *      NODE_ORACLEDB_USER, NODE_ORACLEDB_PASSWORD, NODE_ORACLEDB_CONNECTIONSTRING,
 *      NODE_ORACLEDB_EXTERNALAUTH,
 *      NODE_ORACLEDB_DBA_PRIVILEGE,
 *      NODE_ORACLEDB_DBA_USER, NODE_ORACLEDB_DBA_PASSWORD
 *
 *****************************************************************************/

const config = {
  test: {
    externalAuth:  false,
    DBA_PRIVILEGE: false,
    printDebugMsg: false,
    isCloudService: false
  }
};

if (process.env.NODE_ORACLEDB_CONNECTIONSTRING) {
  config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING;
} else {
  throw new Error("Database Connect String is not Set! Try Set Environment Variable NODE_ORACLEDB_CONNECTIONSTRING.");
}

if (process.env.NODE_ORACLEDB_EXTERNALAUTH) {
  let eauth = process.env.NODE_ORACLEDB_EXTERNALAUTH;
  eauth = String(eauth);
  eauth = eauth.toLowerCase();
  if (eauth == 'true') {
    config.test.externalAuth = true;
  }
}

if (!config.test.externalAuth) {
  if (process.env.NODE_ORACLEDB_USER) {
    config.user = process.env.NODE_ORACLEDB_USER;
  } else {
    throw new Error("Schema User name is not Set! Try Set Environment Variable NODE_ORACLEDB_USER.");
  }

  if (process.env.NODE_ORACLEDB_PASSWORD) {
    config.password = process.env.NODE_ORACLEDB_PASSWORD;
  } else {
    throw new Error("Schema User Password is not Set! Try Set Environment Variable NODE_ORACLEDB_PASSWORD.");
  }

}

if (process.env.NODE_ORACLEDB_QA) {
  let isQA = process.env.NODE_ORACLEDB_QA;
  isQA = String(isQA);
  isQA = isQA.toLowerCase();
  if (isQA == 'true') {
    config.test.NODE_ORACLEDB_QA = true;
  }
}

if (process.env.NODE_ORACLEDB_DBA_PRIVILEGE) {
  let priv = process.env.NODE_ORACLEDB_DBA_PRIVILEGE;
  priv = String(priv);
  priv = priv.toLowerCase();
  if (priv == 'true') {
    config.test.DBA_PRIVILEGE = true;
  }
}

if (process.env.NODE_ORACLEDB_DBA_USER) {
  config.test.DBA_user = process.env.NODE_ORACLEDB_DBA_USER;
} else if (config.test.DBA_PRIVILEGE) {
  throw new Error("DBA Privilege is set to True but DBA username is not Set! Try Set Environment Variable NODE_ORACLEDB_DBA_USER.");
}

if (process.env.NODE_ORACLEDB_DBA_PASSWORD) {
  config.test.DBA_password = process.env.NODE_ORACLEDB_DBA_PASSWORD;
} else if (config.test.DBA_PRIVILEGE) {
  throw new Error("DBA Privilege is set to True but DBA Password is not Set! Try Set Environment Variable NODE_ORACLEDB_DBA_PASSWORD.");
}

if (process.env.NODE_ORACLEDB_PROXY_SESSION_USER) {
  config.test.proxySessionUser = process.env.NODE_ORACLEDB_PROXY_SESSION_USER;
}

if (process.env.NODE_PRINT_DEBUG_MESSAGE) {
  let printDebugMsg = process.env.NODE_PRINT_DEBUG_MESSAGE;
  printDebugMsg = String(printDebugMsg);
  printDebugMsg = printDebugMsg.toLowerCase();
  if (printDebugMsg == 'true') {
    config.test.printDebugMsg = true;
  }
}

module.exports = config;
