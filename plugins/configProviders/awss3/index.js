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
const oracledb = require("oracledb");

const process = require('node:process');
process.loadEnvFile();

let S3Client, GetObjectCommand, fromNodeProviderChain, loadSharedConfigFiles, NodeHttpHandler, HttpsProxyAgent;
let myAgentHandler;

class AWSS3Provider extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    const url = new URL(provider_arg);
    this._addParam("bucket", url.hostname);
    this._addParam("key", url.pathname.substring(1));
  }

  init() {
    ({ S3Client, GetObjectCommand } = require("@aws-sdk/client-s3"));
    ({ fromNodeProviderChain } = require("@aws-sdk/credential-providers"));
    ({ loadSharedConfigFiles } = require("@smithy/shared-ini-file-loader"));
    ({ NodeHttpHandler } = require("@smithy/node-http-handler"));
    ({ HttpsProxyAgent } = require("hpagent"));

    const agent = new HttpsProxyAgent({
      proxy: process.env.HTTPS_PROXY || process.env.https_proxy,
    });

    myAgentHandler = new NodeHttpHandler({
      httpAgent: agent,
      httpsAgent: agent,
    });
  }

  async resolveRegion() {
    if (this.paramMap.get("aws_region")) return this.paramMap.get("aws_region");
    if (process.env.AWS_REGION) return process.env.AWS_REGION;
    let region = null;
    try {
      const { configFile, credentialsFile } = await loadSharedConfigFiles();
      const profile = process.env.AWS_PROFILE || "default";
      region = configFile[profile]?.region || credentialsFile[profile]?.region;

      if (!region) {
        throw new Error(`Region not found in AWS config/credentials for profile: ${profile}`);
      }

      return region;
    } catch (err) {

      throw new Error(util.format(
        "AWS Region Resolution Failed: %s. Ensure AWS_REGION is set or ~/.aws/config is accessible.",
        err.message
      ));
    }
  }

  async dataFromStream(stream) {
    const chunks = [];
    return await new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        try {
          const data = Buffer.concat(chunks).toString("utf-8");
          resolve(data);
        } catch (error) {
          reject(new Error(`Rejected with error: ${error.message}`));
        }
      });
      stream.on("error", (error) => {
        reject(new Error(`Stream error: ${error.message}`));
      });
    });
  };

  async returnConfig() {
    const fetchRegion = await this.resolveRegion();

    this.credential = fromNodeProviderChain({
      profile: process.env.AWS_PROFILE,
      clientConfig: {
        requestHandler: myAgentHandler,
        region: fetchRegion
      }
    });

    const s3Client = new S3Client({
      region: fetchRegion,
      credentials: this.credential,
      requestHandler: myAgentHandler,
    });

    const params = {
      Bucket: this.paramMap.get("bucket"),
      Key: this.paramMap.get("key"),
    };

    try {
      const cmd = new GetObjectCommand(params);
      const resp = await s3Client.send(cmd);

      if (!resp.Body) {
        throw new Error(`S3 response body is empty for key: ${params.Key}`);
      }

      const data = await this.dataFromStream(resp.Body);
      const configObject = JSON.parse(data);
      return configObject;
    } catch (e) {
      const errmsg = util.format(
        "Failed to retrieve or parse config: %s\n%s",
        e.message,
        e.stack
      );
      throw new Error(errmsg);
    } finally {
      s3Client.destroy();
    }
  }
}

module.exports = AWSS3Provider;

async function hookFn(args) {
  const configProvider = new AWSS3Provider(
    args.provider_arg,
    args.urlExtendedPart
  );
  try {
    configProvider.init();
  } catch (err) {
    const errmsg = util.format(
      "AWS Config Provider failed to load required modules: %s\n%s",
      err.message,
      err.stack
    );
    throw new Error(errmsg);
  }

  const cfg = await configProvider.returnConfig();
  // Return config object
  return [cfg, configProvider.credential];
}

oracledb.registerConfigurationProviderHook("awss3", hookFn);
