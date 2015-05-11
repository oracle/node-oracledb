/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 * NAME
 *   dbconfig.js
 *
 * DESCRIPTION
 *   Holds the credentials used by node-oracledb examples to connect
 *   to the database.  Production applications should instead consider
 *   using External Authentication to avoid hard coded credentials.
 *
 *   Applications can set the connectString value to an Easy Connect
 *   string, or a Net Service Name from a tnsnames.ora file or
 *   external naming service, or it can be the name of a local Oracle
 *   database instance.
 *
 *   The Easy Connect syntax is:
 *     [//]host_name[:port][/service_name][:server_type][/instance_name]
 *
 *   If using a tnsnames.ora file, the file can be in a default
 *   location such as $ORACLE_HOME/network/admin/tnsnames.ora or
 *   /etc/tnsnames.ora.  Alternatively set the TNS_ADMIN environment
 *   variable and put the file in $TNS_ADMIN/tnsnames.ora.
 *
 *   If connectString is not specified, the empty string "" is used
 *   which indicates to connect to the local, default database.
 *
 * TROUBLESHOOTING
 *   Errors like:
 *     ORA-12541: TNS:no listener
 *   or
 *     ORA-12154: TNS:could not resolve the connect identifier specified
 *   indicate connectString is invalid.
 *
 *   The error:
 *     ORA-12514: TNS:listener does not currently know of requested in connect descriptor
 *   indicates connectString is invalid.  You are reaching a computer
 *   with Oracle installed but the service name isn't known.
 *
 *****************************************************************************/

module.exports = {
  user          : "hr",
  password      : "welcome",
  // For information on connection strings see:
  // https://github.com/oracle/node-oracledb/blob/master/doc/api.md#connectionstrings
  connectString : "localhost/XE"  // Easy Connect syntax
};
