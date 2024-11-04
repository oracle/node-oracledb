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

let AppConfigurationClient;
let ClientSecretCredential, ClientCertificateCredential, ChainedTokenCredential, ManagedIdentityCredential, EnvironmentCredential;
const errors = require("../errors.js");
const { base } = require("./base.js");

class AzureProvider extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    this._addParam("appconfigname", provider_arg);
  }

  //---------------------------------------------------------------------------
  // init()
  //
  // Require/import modules from Azure SDK
  //---------------------------------------------------------------------------
  init() {
    ({ AppConfigurationClient } = require("@azure/app-configuration"));
    ({ ClientSecretCredential, ClientCertificateCredential, ChainedTokenCredential, ManagedIdentityCredential, EnvironmentCredential } = require("@azure/identity"));
  }

  //---------------------------------------------------------------------------
  // _withChainedTokenCredential()
  //
  // Use of ChainedTokenCredential class which provides the ability to link
  // together multiple credential instances to be tried sequentially when authenticating.
  // Default authentication to try when no authentication parameter is given by the user
  //---------------------------------------------------------------------------
  _withChainedTokenCredential() {
    const tokens = [];
    if ((this.paramMap.get("azure_client_secret")))
      tokens.push(new ClientSecretCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_secret")));
    if ((this.paramMap.get("azure_client_certificate_path")))
      tokens.push(new ClientCertificateCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_certificate_path")));
    if ((this.paramMap.get('azure_managed_identity_client_id')))
      tokens.push(this.paramMap.get('azure_managed_identity_client_id'));
    tokens.push(new EnvironmentCredential());
    const credential = new ChainedTokenCredential(...tokens);
    return credential;
  }

  //---------------------------------------------------------------------------
  // _returnCredential()
  //
  // Returns credential to access Azure Config Store on the basis of
  // authentication parameters given by the user.
  //---------------------------------------------------------------------------
  _returnCredential() {
    let auth = null;
    if (this.paramMap.get('authentication')) {
      auth = this.paramMap.get('authentication').toUpperCase();
    }
    if (auth && !(auth == 'AZURE_DEFAULT')) {
      // do the given authentication
      if (auth == 'AZURE_SERVICE_PRINCIPAL') {
        if (this.paramMap.get("azure_client_certificate_path"))
          return new ClientCertificateCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_certificate_path"));
        else if (this.paramMap.get("azure_client_secret"))
          return new ClientSecretCredential(this.paramMap.get("azure_tenant_id"), this.paramMap.get("azure_client_id"), this.paramMap.get("azure_client_secret"));
        else
          errors.throwErr(errors.ERR_AZURE_SERVICE_PRINCIPAL_AUTH_FAILED);
      } else if (auth == 'AZURE_MANAGED_IDENTITY') {
        return new ManagedIdentityCredential(this.paramMap.get('azure_managed_identity_client_id'));
      } else {
        errors.throwErr(errors.ERR_AZURE_CONFIG_PROVIDER_AUTH_FAILED, auth);
      }
    } else {
      //return default token credential
      return this._withChainedTokenCredential();
    }
  }

  //---------------------------------------------------------------------------
  // _getConfigurationSetting()
  //
  // Get configuration setting from the config provider given a key
  //and an optional label
  //---------------------------------------------------------------------------
  async _getConfigurationSetting(client, key, label) {
    return await client.getConfigurationSetting({ key: key, label: label });

  }

  async returnConfig() {
    const configObject = {};
    const label = this.paramMap.get("label");
    this.credential = this._returnCredential();
    // azure config store
    const client = new AppConfigurationClient(
      "https://" + this.paramMap.get("appconfigname"), // ex: <https://<your appconfig resource>.azconfig.io>
      this.credential
    );
    // retrieve connect_description
    configObject.connectString = (await this._getConfigurationSetting(client, this.paramMap.get("key") + 'connect_descriptor', label)).value;

    // retrieve node-oracledb parameters
    try {
      const params = (await this._getConfigurationSetting(client, this.paramMap.get("key") + 'node-oracledb', label)).value;
      const obj = JSON.parse(params);
      for (const key in obj) {
        var val = obj[key];
        configObject[key] = val;
      }
    } catch {
      configObject['node-oracledb'] = null;
    }
    try {
      // retrieve user
      configObject.user = (await this._getConfigurationSetting(client, this.paramMap.get("key") + 'user', label)).value;
    } catch {
      configObject.user = null;
    }
    //retrieve password
    configObject.password = await this.retrieveParamValueFromVault(client, label, 'password');
    // retrieve wallet_location
    configObject.walletContent = await this.retrieveParamValueFromVault(client, label, 'wallet_location');
    if (configObject.walletContent) {
      //only Pem file supported
      if (!this.isPemFile(configObject.walletContent))
        errors.throwErr(errors.ERR_WALLET_TYPE_NOT_SUPPORTED);
    }
    return configObject;
  }
  async retrieveParamValueFromVault(client, label, param) {
    let paramJson = null;
    try {
      paramJson = await this._getConfigurationSetting(client, this.paramMap.get("key") + param, label);
    } catch {
      return null;
    }
    if (paramJson) {
      let obj;
      try {
        obj = JSON.parse(paramJson.value);
      } catch {
        obj = paramJson.value;
      }
      if (obj.uri) {
        const { SecretClient } = require("@azure/keyvault-secrets");
        const vault_detail = await this._parsePwd(obj.uri);
        const client1 = new SecretClient(vault_detail[0], this.credential);
        return  (await client1.getSecret(vault_detail[1])).value;
      } else {
        return paramJson.value;
      }
    }

  }
}
module.exports = AzureProvider;
