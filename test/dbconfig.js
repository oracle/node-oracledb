/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   dbConfig.js
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

var config = {};

/***************** OPTION 1 - Edit credentials at this section ******************/
config.user          = 'hr';
config.password      = 'hr';
config.connectString = 'localhost/orcl';

config.test = {};

// Have you set up the External Authentication? Negative by default.
config.test.externalAuth  = false;

// Do you have DBA privilege? Negative by default.
config.test.DBA_PRIVILEGE = false;
config.test.DBA_user      = 'sys';
config.test.DBA_password  = 'oracle';


/****************** OPTION 2 - Set environment variables **********************/
if (process.env.NODE_ORACLEDB_USER) {
  config.user = process.env.NODE_ORACLEDB_USER;
}

if (process.env.NODE_ORACLEDB_PASSWORD) {
  config.password = process.env.NODE_ORACLEDB_PASSWORD;
}

if (process.env.NODE_ORACLEDB_CONNECTIONSTRING) {
  config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING;
}

if (process.env.NODE_ORACLEDB_EXTERNALAUTH) {
  var eauth = process.env.NODE_ORACLEDB_EXTERNALAUTH;
  eauth = String(eauth);
  eauth = eauth.toLowerCase();

  if (eauth == 'true') {
    config.test.externalAuth = true;
  } else {
    config.test.externalAuth = false;
  }

}

if (process.env.NODE_ORACLEDB_DBA_PRIVILEGE) {
  var priv = process.env.NODE_ORACLEDB_DBA_PRIVILEGE;
  priv = String(priv);
  priv = priv.toLowerCase();

  if (priv == 'true') {
    config.test.DBA_PRIVILEGE = true;
  } else {
    config.test.DBA_PRIVILEGE = false;
  }

}

if (process.env.NODE_ORACLEDB_DBA_USER) {
  config.test.DBA_user = process.env.NODE_ORACLEDB_DBA_USER;
}

if (process.env.NODE_ORACLEDB_DBA_PASSWORD) {
  config.test.DBA_password = process.env.NODE_ORACLEDB_DBA_PASSWORD;
}

if (process.env.NODE_ORACLEDB_PROXY_SESSION_USER) {
  config.test.proxySessionUser = process.env.NODE_ORACLEDB_PROXY_SESSION_USER;
}

module.exports = config;
