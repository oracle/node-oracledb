/* Copyright (c) 2015, 2024, Oracle and/or its affiliates. */

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
 *   This file provides the configuration for all the tests.
 *   There are TWO options for users to choose:
 *
 *   1. Edit the credentials section of this file.
 *   2. Set these environment variables:
 *      NODE_ORACLEDB_USER, NODE_ORACLEDB_PASSWORD, NODE_ORACLEDB_CONNECTIONSTRING,
 *      NODE_ORACLEDB_DBA_PRIVILEGE,
 *      NODE_ORACLEDB_DBA_USER, NODE_ORACLEDB_DBA_PASSWORD
 *      If required:
 *      NODE_ORACLEDB_EXTERNALAUTH,
 *      NODE_ORACLEDB_PROXY_SESSION_USER, NODE_ORACLEDB_DRCP,
 *      NODE_ORACLEDB_WALLET_LOCATION, NODE_ORACLEDB_WALLET_PASSWORD
 *
 *****************************************************************************/

const oracledb = require('oracledb');

const config = {
  test: {
    externalAuth: false,
    DBA_PRIVILEGE: false,
    printDebugMsg: false,
    mode: 'thin',
    instantClientPath: '',
    isCloudService: false,
    isCmanTdm: false,
    drcp: false
  }
};

let counter = 0;

if (process.env.NODE_ORACLEDB_CONNECTIONSTRING) {
  config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING;
} else {
  throw new Error("Database Connect String is not set! Set the Environment Variable NODE_ORACLEDB_CONNECTIONSTRING.");
}

if (process.env.NODE_ORACLEDB_EXTERNALAUTH) {
  const eauth = process.env.NODE_ORACLEDB_EXTERNALAUTH;
  if (eauth.toLowerCase() === 'true') {
    if (oracledb.thin) {
      throw new Error("Cannot use externalAuth with thin driver.");
    }
    config.test.externalAuth = true;
  }
}

if (process.env.NODE_ORACLEDB_DRCP) {
  config.test.drcp = (process.env.NODE_ORACLEDB_DRCP.toLowerCase() === 'true');
}

if (process.env.NODE_ORACLEDB_USER) {
  config.user = process.env.NODE_ORACLEDB_USER;
} else {
  throw new Error("Schema User name is not set! Set the Environment Variable NODE_ORACLEDB_USER.");
}

if (process.env.NODE_ORACLEDB_PASSWORD) {
  config.password = process.env.NODE_ORACLEDB_PASSWORD;
} else {
  throw new Error("Schema User Password is not set! Set the Environment Variable NODE_ORACLEDB_PASSWORD.");
}

if (process.env.NODE_ORACLEDB_QA) {
  const isQA = process.env.NODE_ORACLEDB_QA;
  if (isQA.toLowerCase() === 'true') {
    config.test.NODE_ORACLEDB_QA = true;
  }
}

if (process.env.NODE_ORACLEDB_DBA_PRIVILEGE) {
  const priv = process.env.NODE_ORACLEDB_DBA_PRIVILEGE;
  if (priv.toLowerCase() == 'true') {
    config.test.DBA_PRIVILEGE = true;
  }
}

if (process.env.NODE_ORACLEDB_WALLET_PASSWORD) {
  config.walletPassword = process.env.NODE_ORACLEDB_WALLET_PASSWORD;
}

if (process.env.NODE_ORACLEDB_WALLET_LOCATION) {
  config.walletLocation = process.env.NODE_ORACLEDB_WALLET_LOCATION;
}

if (process.env.NODE_ORACLEDB_DBA_USER) {
  config.test.DBA_user = process.env.NODE_ORACLEDB_DBA_USER;
} else if (config.test.DBA_PRIVILEGE) {
  throw new Error("DBA Privilege is set to True but DBA username is not set! Set the Environment Variable NODE_ORACLEDB_DBA_USER.");
}

if (process.env.NODE_ORACLEDB_DBA_PASSWORD) {
  config.test.DBA_password = process.env.NODE_ORACLEDB_DBA_PASSWORD;
} else if (config.test.DBA_PRIVILEGE) {
  throw new Error("DBA Privilege is set to True but DBA Password is not set! Set the Environment Variable NODE_ORACLEDB_DBA_PASSWORD.");
}

if (process.env.NODE_ORACLEDB_PROXY_SESSION_USER) {
  config.test.proxySessionUser = process.env.NODE_ORACLEDB_PROXY_SESSION_USER;
}

if (process.env.NODE_PRINT_DEBUG_MESSAGE) {
  const printDebugMsg = process.env.NODE_PRINT_DEBUG_MESSAGE;
  if (printDebugMsg.toLowerCase() == 'true') {
    config.test.printDebugMsg = true;
  }
}

if (process.env.NODE_ORACLEDB_CLIENT_LIB_DIR) {
  config.test.instantClientPath = process.env.NODE_ORACLEDB_CLIENT_LIB_DIR;
}

if (process.env.NODE_ORACLEDB_DRIVER_MODE === 'thick') {
  config.test.mode = 'thick';
  console.log("Thick mode selected");
  oracledb.initOracleClient({ libDir: config.test.instantClientPath });
} else {
  console.log("Thin mode selected");
}

config.createUser = () => {
  ++counter;
  return "NJS_" + counter.toString() + config.user;
};
module.exports = config;
