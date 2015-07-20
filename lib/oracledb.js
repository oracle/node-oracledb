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
 *****************************************************************************/

var oracledb = null;

try {
  oracledb =  require("../build/Release/oracledb");
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    oracledb = require("../build/Debug/oracledb");
  } else {
    throw err;
  }
} 

var oracledb_ins = new oracledb.Oracledb();

oracledb_ins.STRING  = 2001;
oracledb_ins.NUMBER  = 2002;
oracledb_ins.DATE    = 2003;
oracledb_ins.CURSOR  = 2004;

oracledb_ins.BIND_IN     = 3001;
oracledb_ins.BIND_INOUT  = 3002;
oracledb_ins.BIND_OUT    = 3003;

oracledb_ins.ARRAY   = 4001;
oracledb_ins.OBJECT  = 4002;

module.exports = oracledb_ins;
