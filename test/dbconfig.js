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
 *   Holds the dbConfigs used by node-oracledb tests to connect to
 *   the database.  The user requires privileges to connect and create
 *   tables.
 *
 *   See examples/dbconfig.js for details about connection dbConfigs.
 *
 *****************************************************************************/

var config = {};

config.user = process.env.NODE_ORACLEDB_USER || 'hr';
config.password  = process.env.NODE_ORACLEDB_PASSWORD || 'hr';
config.connectString = process.env.NODE_ORACLEDB_CONNECTIONSTRING || 'localhost/orcl';

// Has external authentication set up? Negative by default.
config.externalAuth = process.env.NODE_ORACLEDB_EXTERNALAUTH || false;

// Have you got DBA privilege? Positive by default.
config.DBA_PRIVILEGE = process.env.NODE_DBA_PRIVILEGE || true;

config.DBA_user = process.env.NODE_ORACLEDB_DBA_USER || 'sys';
config.DBA_password = process.env.NODE_ORACLEDB_DBA_PASSWORD || 'oracle';

module.exports = config;