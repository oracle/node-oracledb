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

const cloud_net_naming_pattern_oci = new RegExp("(?<objservername>[A-Za-z0-9._-]+)/n/" + "(?<namespace>[A-Za-z0-9._-]+)/b/" + "(?<bucketname>[A-Za-z0-9._-]+)/o/" + "(?<filename>[A-Za-z0-9._-]+)" + "(/c/(?<alias>.+))?$");
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
      if (match.groups.alias)
        this._addParam("alias", match.groups.alias);
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
    const credential = await this._returnCredential();
    // oci object store
    const client_oci = new (oci.objectstorage).ObjectStorageClient({
      authenticationDetailsProvider: credential
    });
    const getObjectRequest = {
      objectName: this.paramMap.get('filename'),
      bucketName: this.paramMap.get('bucketname'),
      namespaceName: this.paramMap.get('namespace')
    };
    let credential1;
    const getObjectResponse = await client_oci.getObject(getObjectRequest);
    const resp = await this._streamToString(getObjectResponse.value);
    // Entire object we get from OCI Object Storage
    let obj = JSON.parse(resp);
    const userAlias = this.paramMap.get('alias');
    if (userAlias) {
      obj = obj[userAlias];
    }
    const pmSection = 'node-oracledb';
    const params = obj[pmSection];
    for (const key in params) {
      var val = params[key];
      configObject[key] = val;
    }
    configObject.connectString = obj.connect_descriptor;
    configObject.user = obj.user;
    if (obj.password) {
      if (obj.password.type == "vault-azure") {
        if (obj.password.authentication) {
          const { SecretClient } = require("@azure/keyvault-secrets");
          const {ClientSecretCredential, ClientCertificateCredential} = require("@azure/identity");
          if (obj.password.authentication.azure_client_secret)
            credential1 = new ClientSecretCredential(obj.password.authentication.azure_tenant_id, obj.password.authentication.azure_client_id, obj.password.authentication.azure_client_secret);
          else if (obj.password.authentication.azure_client_certificate_path)
            credential1 = new ClientCertificateCredential(obj.password.authentication.azure_tenant_id, obj.password.authentication.azure_client_id, obj.password.authentication.azure_client_certificate_path);
          else
            errors.throwErr(errors.ERR_AZURE_VAULT_AUTH_FAILED);
          const vault_detail = await this._parsePwd(obj.password.value);
          const client1 = new SecretClient(vault_detail[0], credential1);
          configObject.password = (await client1.getSecret(vault_detail[1])).value;
        } else {
          errors.throwErr(errors.ERR_AZURE_VAULT_AUTH_FAILED);
        }
      } else if (obj.password.type == "vault-oci") {
        const secrets = require('oci-secrets');
        const secretClientOci =  new secrets.SecretsClient({
          authenticationDetailsProvider: credential
        });
        const getSecretBundleRequest = {
          secretId: obj.password.value
        };
        const getSecretBundleResponse = await secretClientOci.getSecretBundle(getSecretBundleRequest);
        configObject.password = getSecretBundleResponse.secretBundle.secretBundleContent.content;
      } else if (obj.password) {
        configObject.password = obj.password;
      }
    } else {
      configObject.password = null;
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
}
module.exports = OCIProvider;
