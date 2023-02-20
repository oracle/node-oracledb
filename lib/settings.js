// Copyright (c) 2022, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const constants = require('./constants.js');

class Settings {

  constructor() {
    this.autoCommit = false;
    this.connectionClass = '';
    this.dbObjectAsPojo = false;
    this.edition = '';
    this.errorOnConcurrentExecute = false;
    this.events = false;
    this.externalAuth = false;
    this.fetchArraySize = 100;
    this.fetchAsBuffer = [];
    this.fetchAsString = [];
    this.lobPrefetchSize = 16384;
    this.maxRows = 0;
    this.outFormat = constants.OUT_FORMAT_ARRAY;
    this.poolIncrement = 1;
    this.poolMax = 4;
    this.poolMaxPerShard = 0;
    this.poolMin = 0;
    this.poolPingInterval = 60;
    this.poolTimeout = 60;
    this.prefetchRows = 2;
    this.queueTimeout = 60000;
    this.queueMax = 500;
    this.stmtCacheSize = 30;
  }

}

module.exports = new Settings();
