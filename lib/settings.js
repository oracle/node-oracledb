// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const constants = require('./constants.js');
const errors = require('./errors.js');

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
    this.createFetchTypeMap(this.fetchAsString, this.fetchAsBuffer);
  }

  //---------------------------------------------------------------------------
  // addToOptions()
  //
  // Adds the named settingsto the options, if no option has already been
  // specified.
  //---------------------------------------------------------------------------
  addToOptions(options) {
    for (let i = 1; i < arguments.length; i++) {
      const key = arguments[i];
      if (options[key] === undefined)
        options[key] = this[key];
    }
  }

  //---------------------------------------------------------------------------
  // createFetchTypeMap()
  //
  // Creates the fetch type map. This overrides the default fetch type mapping
  // used by the driver with the contents of the fetchAsString and
  // fetchAsBuffer arrays. The error checking is performed here as well in
  // order to eliminate repeated code.
  // ---------------------------------------------------------------------------
  createFetchTypeMap(fetchAsString, fetchAsBuffer) {

    // create a copy of the default fetch type map
    const map = new Map(constants.DB_TYPE_FETCH_TYPE_MAP);

    // adjust map for fetchAsString settings
    for (const element of fetchAsString) {
      switch (element) {
        case constants.DB_TYPE_NUMBER:
          map.set(constants.DB_TYPE_BINARY_DOUBLE, constants.DB_TYPE_VARCHAR);
          map.set(constants.DB_TYPE_BINARY_FLOAT, constants.DB_TYPE_VARCHAR);
          map.set(constants.DB_TYPE_BINARY_INTEGER, constants.DB_TYPE_VARCHAR);
          map.set(constants.DB_TYPE_NUMBER, constants.DB_TYPE_VARCHAR);
          break;
        case constants.DB_TYPE_TIMESTAMP_LTZ:
          map.set(constants.DB_TYPE_DATE, constants.DB_TYPE_VARCHAR);
          map.set(constants.DB_TYPE_TIMESTAMP, constants.DB_TYPE_VARCHAR);
          map.set(constants.DB_TYPE_TIMESTAMP_TZ, constants.DB_TYPE_VARCHAR);
          map.set(constants.DB_TYPE_TIMESTAMP_LTZ, constants.DB_TYPE_VARCHAR);
          break;
        case constants.DB_TYPE_CLOB:
        case constants.DB_TYPE_NCLOB:
          map.set(constants.DB_TYPE_CLOB, constants.DB_TYPE_VARCHAR);
          map.set(constants.DB_TYPE_NCLOB, constants.DB_TYPE_NVARCHAR);
          break;
        case constants.DB_TYPE_RAW:
          map.set(constants.DB_TYPE_RAW, constants.DB_TYPE_VARCHAR);
          break;
        case constants.DB_TYPE_JSON:
          map.set(constants.DB_TYPE_JSON, constants.DB_TYPE_VARCHAR);
          break;
        default:
          errors.throwErr(errors.ERR_INVALID_TYPE_FOR_CONVERSION);
      }
    }

    // adjust map for fetchAsBuffer settings
    for (const element of fetchAsBuffer) {
      switch (element) {
        case constants.DB_TYPE_BLOB:
          map.set(constants.DB_TYPE_BLOB, constants.DB_TYPE_RAW);
          break;
        default:
          errors.throwErr(errors.ERR_INVALID_TYPE_FOR_CONVERSION);
      }
    }

    // assign calculated fetchTypeMap for later use
    this.fetchTypeMap = map;

  }

}

module.exports = new Settings();
