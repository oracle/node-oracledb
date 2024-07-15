// Copyright (c) 2024, Oracle and/or its affiliates.

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

class base {
  constructor(url) {
    const params = new URLSearchParams(url);
    this.paramMap = new URLSearchParams([...params].map(([key, value]) => [key.toLowerCase(), value])); //parse the extended part and store parameters in Map
  }

  /**
  * Sets precedence for different parameters in cloudConfig/userConfig
  * @param {cloudConfig} object - object retreived from cloud
  * @param {userConfig} object -  user input Object
  */
  modifyOptionsPrecedence(cloudConfig, userConfig) {
    // create a copy of userConfig object
    userConfig = { ...userConfig };
    if (!userConfig.user)
      userConfig.user = cloudConfig.user;
    if (!userConfig.password)
      userConfig.password = cloudConfig.password;
    if (cloudConfig.connectString) {
      userConfig.connectString = cloudConfig.connectString;
      userConfig.connectionString = undefined;
    }
    if (cloudConfig.poolMin)
      userConfig.poolMin = cloudConfig.poolMin;
    if (cloudConfig.poolMax)
      userConfig.poolMax = cloudConfig.poolMax;
    if (cloudConfig.poolIncrement)
      userConfig.poolIncrement = cloudConfig.poolIncrement;
    if (cloudConfig.poolTimeout)
      userConfig.poolTimeout = cloudConfig.poolTimeout;
    if (cloudConfig.poolPingInterval)
      userConfig.poolPingInterval = cloudConfig.poolPingInterval;
    if (cloudConfig.poolPingTimeout)
      userConfig.poolPingTimeout = cloudConfig.poolPingTimeout;
    if (cloudConfig.stmtCacheSize)
      userConfig.stmtCacheSize = cloudConfig.stmtCacheSize;
    if (cloudConfig.prefetchRows)
      userConfig.prefetchRows = cloudConfig.prefetchRows;
    if (cloudConfig.lobPrefetch)
      userConfig.lobPrefetch = cloudConfig.lobPrefetch;

    return userConfig;

  }

  //---------------------------------------------------------------------------
  // _addParam()
  // Adds key,value pairs to the Map
  //---------------------------------------------------------------------------
  _addParam(key, value) {
    const aliasKeyName = key.toLowerCase();
    this.paramMap.set(aliasKeyName, value);
  }

  //---------------------------------------------------------------------------
  // _parsePwd()
  // Parse password which is in url format
  // “uri”:“https://mykeyvault.vault.azure.net/secrets/secretkey”}
  //---------------------------------------------------------------------------
  _parsePwd(str) {
    const vault_uri = new RegExp("(?<vault_url>https://[A-Za-z0-9._-]+)/secrets/(?<secretKey>[A-Za-z][A-Za-z0-9-]*)$", 'g');
    const vault_detail = [];
    for (const match of str.matchAll(vault_uri)) {
      vault_detail[0] = match.groups.vault_url;
      vault_detail[1] = match.groups.secretKey;
    }
    return vault_detail;
  }

}
module.exports = {base};
