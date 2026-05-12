// Copyright (c) 2026, Oracle and/or its affiliates.
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

"use strict";

const util = require("node:util");
const { base } = require("../base.js");
const {
  createAwsCredential,
  initAwsCommon,
  initAwsRequestHandler,
  resolveRegion
} = require("../awsCommon.js");
const oracledb = require("oracledb");

let SecretsManagerClient, GetSecretValueCommand;

class AWSSecretsManagerProvider extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    if (provider_arg) {
      this._addParam("secretname", provider_arg);
    }
  }

  init() {
    initAwsCommon();
    ({ SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager"));
    this.requestHandler = initAwsRequestHandler(this.paramMap);
  }

  resolveSecretString(response) {
    let secretString = response.SecretString;
    if (!secretString && response.SecretBinary) {
      secretString = Buffer.from(response.SecretBinary, "base64").toString(
        "utf-8"
      );
    }

    if (!secretString) {
      throw new Error("Secret payload is empty");
    }

    return secretString;
  }

  async returnConfig() {
    const fetchRegion = await resolveRegion(this.paramMap);

    this.credential = createAwsCredential(
      this.paramMap,
      this.requestHandler,
      fetchRegion
    );

    const secretsManagerClient = new SecretsManagerClient({
      region: fetchRegion,
      credentials: this.credential,
      requestHandler: this.requestHandler,
    });

    const secretIdentifier = this.paramMap.get("secretname");
    if (!secretIdentifier) {
      throw new Error(
        "Secret identifier not provided for AWS Secrets Manager ConfigProvider."
      );
    }

    const input = {
      SecretId: secretIdentifier,
    };

    const versionId = this.paramMap.get("versionid");
    if (versionId) {
      input.VersionId = versionId;
    }

    try {
      const command = new GetSecretValueCommand(input);
      const response = await secretsManagerClient.send(command);

      const secretString = this.resolveSecretString(response);

      try {
        return JSON.parse(secretString);
      } catch {
        return secretString;
      }
    } catch (e) {
      throw new Error(
        `Failed to retrieve configuration from AWS Secrets Manager: ${e.message}`
      );
    } finally {
      secretsManagerClient.destroy();
    }
  }
}


async function hookFn(args) {
  const configProvider = new AWSSecretsManagerProvider(
    args.provider_arg,
    args.urlExtendedPart
  );

  if (args.paramMap) {
    configProvider.paramMap = args.paramMap;
  }

  try {
    configProvider.init();
  } catch (err) {
    const errmsg = util.format(
      "AWS Secrets Manager Config Provider failed to load required modules: %s\n%s",
      err.message,
      err.stack
    );
    throw new Error(errmsg);
  }

  const cfg = await configProvider.returnConfig();
  return [cfg, null];
}

oracledb.registerConfigurationProviderHook("awssecretsmanager", hookFn);
