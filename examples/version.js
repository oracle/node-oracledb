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
 *   version.js
 *
 * DESCRIPTION
 *   Shows the oracledb version attributes
 *
 *****************************************************************************/

var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var addonVer, clientVer, serverVer;
var major, minor, update, port, portUpdate;

console.log("Node.js version: " + process.version);

addonVer = oracledb.version;
major  = Math.floor(addonVer / 10000);
minor  = Math.floor(addonVer / 100) % 100;
update = addonVer % 100;
console.log("Node-oracledb version: " + addonVer);
console.log("Node-oracledb text format: " + major + "." + minor + "." + update);

clientVer = oracledb.oracleClientVersion;
major      = Math.floor (clientVer / 100000000);
minor      = Math.floor (clientVer / 1000000) % 100 ;
update     = Math.floor (clientVer / 10000) % 100 ;
port       = Math.floor (clientVer / 100) % 100 ;
portUpdate = clientVer % 100 ;
console.log("Oracle Client library version: " + clientVer);
console.log("Oracle Client library text format: " + major + "." + minor + "." + update + "." + port + "." + portUpdate);

oracledb.getConnection(
  {
    user          : dbConfig.user,
    password      : dbConfig.password,
    connectString : dbConfig.connectString
  },
  function(err, connection)
  {
    if (err) {
      console.error(err.message);
      return;
    }

    serverVer = connection.oracleServerVersion;
    major      = Math.floor (serverVer / 100000000);
    minor      = Math.floor (serverVer / 1000000) % 100 ;
    update     = Math.floor (serverVer / 10000) % 100 ;
    port       = Math.floor (serverVer / 100) % 100 ;
    portUpdate = serverVer % 100 ;
    console.log("Oracle Database version: " + serverVer);
    console.log("Oracle Database text format: " + major + "." + minor + "." + update + "." + port + "." + portUpdate);
  });
