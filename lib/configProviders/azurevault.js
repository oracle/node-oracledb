// Copyright (c) 2025, Oracle and/or its affiliates.

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

const { base } = require("./base.js");

let SecretClient;
class azureVault extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    if (provider_arg)
      this._addParam("azuresecreturl", provider_arg);
  }
  init() {
    ({SecretClient}  = require("@azure/keyvault-secrets"));
  }
  async returnConfig(credential) {
    if (!credential) {
      const azureClass = require('./azure.js');
      var azureObject = new azureClass();
      azureObject.paramMap = this.paramMap;
      this.credential = await azureObject.returnAzureCredential();
    } else
      this.credential = credential;

    const vault_detail = await this._parsePwd(this.paramMap.get('azuresecreturl'));
    const client1 = new SecretClient(vault_detail[0], this.credential);
    const resp = (await client1.getSecret(vault_detail[1])).value;

    try {
      this.obj = JSON.parse(resp);
    } catch {
      return resp; //when password is of type azurevault
    }
    //
    const userAlias = this.paramMap.get('key'); // alias
    if (userAlias) {
      this.obj = this.obj[userAlias];
    }
    return this.obj;
  }
}
module.exports = azureVault;
