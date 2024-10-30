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
const errors = require("../errors.js");
const { base } = require("./base.js");
const fs = require('fs');

const cloud_net_naming_pattern_oci = new RegExp("(?<objservername>[A-Za-z0-9._-]+)/n/" + "(?<namespace>[A-Za-z0-9._-]+)/b/" + "(?<bucketname>[A-Za-z0-9._-]+)/o/" + "(?<filename>[A-Za-z0-9._-]+)$");
// object to store module references that will be populated by init()
const oci = {};
class OCIProvider extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    const match = provider_arg.match(cloud_net_naming_pattern_oci);
    if (match) {
      this._addParam("objservername", match.groups.objservername);
      this._addParam("namespace", match.groups.namespace);
      this._addParam("bucketname", match.groups.bucketname);
      this._addParam("filename", match.groups.filename);
    }
  }

  //---------------------------------------------------------------------------
  // init()
  //
  // Require/import modules from ociobject
  //---------------------------------------------------------------------------
  init() {
    oci.common = require('oci-common');
    oci.objectstorage = require('oci-objectstorage');
  }

  //---------------------------------------------------------------------------
  // _streamToString()
  //
  // Converts data stored in a Readable stream to string
  //---------------------------------------------------------------------------
  async _streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  //---------------------------------------------------------------------------
  // _returnCredential()
  //
  // Returns credential to access OCI Object Store on the basis of
  // authentication parameters given by the user.
  //---------------------------------------------------------------------------
  async _returnCredential() {
    let provider = null;
    let auth = null;
    if (this.paramMap.get('authentication')) {
      auth = this.paramMap.get('authentication').toUpperCase();
    }
    // authentication parameter given and its not OCI_DEFAULT
    if (auth && !(auth == 'OCI_DEFAULT')) {
      if (auth == 'OCI_INSTANCE_PRINCIPAL') {
        provider = await new oci.common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
      } else if (auth == 'OCI_RESOURCE_PRINCIPAL') {
        provider = await new oci.common.ResourcePrincipalAuthenticationDetailsProvider.builder();
      } else
        errors.throwErr(errors.ERR_OCIOBJECT_CONFIG_PROVIDER_AUTH_FAILED, auth);
    } else {
      // default authentication
      try {
        //authentication parameters exist in the configurationFile
        provider = new oci.common.ConfigFileAuthenticationDetailsProvider(
          this.paramMap.get("oci_profile_path"), //default path ~/.oci/config
          this.paramMap.get("oci_profile")
        );
      } catch (err) {
        //throw error for wrong profile or wrong path
        if (!this.paramMap.get("oci_tenancy") || !this.paramMap.get("oci_user")) {
          throw (err);
        }
        // authentication parameters are directly given in the connectString
        const publicKey = fs.readFileSync(this.paramMap.get('oci_key_file'), { encoding: "utf8" });
        const region = this.retrieveRegion(this.paramMap.get('objservername'));
        provider = new oci.common.SimpleAuthenticationDetailsProvider(
          this.paramMap.get("oci_tenancy"),
          this.paramMap.get("oci_user"),
          this.paramMap.get("oci_fingerprint"),
          publicKey,
          undefined,
          oci.common.Region[region]
        );
      }
    }
    return provider;
  }

  //---------------------------------------------------------------------------
  // returnConfig()
  //
  // Returns config stored in the OCI Object Store and
  // parses and gets password field stored in OCI/Azure Vault
  //---------------------------------------------------------------------------
  async returnConfig() {
    const configObject = {};
    this.credential = await this._returnCredential();
    // oci object store
    const client_oci = new (oci.objectstorage).ObjectStorageClient({
      authenticationDetailsProvider: this.credential
    });
    const getObjectRequest = {
      objectName: this.paramMap.get('filename'),
      bucketName: this.paramMap.get('bucketname'),
      namespaceName: this.paramMap.get('namespace')
    };
    const getObjectResponse = await client_oci.getObject(getObjectRequest);
    const resp = await this._streamToString(getObjectResponse.value);
    // Entire object we get from OCI Object Storage
    this.obj = JSON.parse(resp);
    const userAlias = this.paramMap.get('key'); // alias
    if (userAlias) {
      this.obj = this.obj[userAlias];
    }
    const pmSection = 'node-oracledb';
    const params = this.obj[pmSection];
    for (const key in params) {
      var val = params[key];
      configObject[key] = val;
    }
    configObject.connectString = this.obj.connect_descriptor;
    configObject.user = this.obj.user;
    if (this.obj.password) {
      configObject.password = await this.retrieveParamValueFromVault('password');
    }
    if (this.obj.wallet_location) {
      // retrieve wallet_location
      configObject.walletContent = await this.retrieveParamValueFromVault('wallet_location');
      //only Pem file supported
      if (!this.isPemFile(configObject.walletContent))
        errors.throwErr(errors.ERR_WALLET_TYPE_NOT_SUPPORTED);
    }
    return configObject;
  }

  //---------------------------------------------------------------------------
  // retrieveRegion(objservername)
  //
  // returns region from the given objservername.
  //---------------------------------------------------------------------------
  retrieveRegion(objservername) {
    const arr = objservername.split(".");
    return arr[1].toUpperCase().replaceAll('-', '_');
  }

  async retrieveParamValueFromVault(param) {
    if (this.obj[param].type == "azurevault") {
      if (this.obj[param].authentication) {
        const { SecretClient } = require("@azure/keyvault-secrets");
        const {ClientSecretCredential, ClientCertificateCredential} = require("@azure/identity");
        if (this.obj[param].authentication.azure_client_secret)
          this.credential = new ClientSecretCredential(this.obj[param].authentication.azure_tenant_id, this.obj[param].authentication.azure_client_id, this.obj[param].authentication.azure_client_secret);
        else if (this.obj[param].authentication.azure_client_certificate_path)
          this.credential = new ClientCertificateCredential(this.obj[param].authentication.azure_tenant_id, this.obj[param].authentication.azure_client_id, this.obj[param].authentication.azure_client_certificate_path);
        else
          errors.throwErr(errors.ERR_AZURE_VAULT_AUTH_FAILED);
        const vault_detail = await this._parsePwd(this.obj[param].value);
        const client1 = new SecretClient(vault_detail[0], this.credential);
        return (await client1.getSecret(vault_detail[1])).value;
      } else {
        errors.throwErr(errors.ERR_AZURE_VAULT_AUTH_FAILED);
      }
    } else if (this.obj[param].type == "ocivault") {
      const secrets = require('oci-secrets');
      const secretClientOci =  new secrets.SecretsClient({
        authenticationDetailsProvider: this.credential
      });
      const getSecretBundleRequest = {
        secretId: this.obj[param].value
      };
      const getSecretBundleResponse = await secretClientOci.getSecretBundle(getSecretBundleRequest);
      const base64content = getSecretBundleResponse.secretBundle.secretBundleContent.content;
      // decode base64 content
      const returnVal = Buffer.from(base64content, "base64").toString("utf-8");
      return returnVal;
    }  else {
      return this.obj[param];
    }
  }
}
module.exports = OCIProvider;
