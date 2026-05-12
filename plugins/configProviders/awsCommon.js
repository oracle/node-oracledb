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


let fromNodeProviderChain;
let loadSharedConfigFiles;
let NodeHttpHandler;
let HttpsProxyAgent;

function initAwsCommon() {
  if (fromNodeProviderChain) {
    return;
  }

  ({ fromNodeProviderChain } = require("@aws-sdk/credential-providers"));
  ({ loadSharedConfigFiles } = require("@smithy/shared-ini-file-loader"));
  ({ NodeHttpHandler } = require("@smithy/node-http-handler"));
  ({ HttpsProxyAgent } = require("hpagent"));
}

function resolveProxy(paramMap) {
  const proxyHost = paramMap.get("https_proxy") ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy;

  const proxyPort = paramMap.get("https_proxy_port") ||
    process.env.HTTPS_PROXY_PORT ||
    process.env.https_proxy_port;

  if (!proxyHost) {
    return null;
  }

  const proxy = /^[a-z][a-z0-9+.-]*:\/\//i.test(proxyHost) ?
    proxyHost :
    `http://${proxyHost}`;

  if (!proxyPort) {
    return proxy;
  }

  const proxyUrl = new URL(proxy);
  if (!proxyUrl.port) {
    proxyUrl.port = proxyPort;
  }

  return proxyUrl.toString().replace(/\/$/, "");
}

function initAwsRequestHandler(paramMap) {
  const proxy = resolveProxy(paramMap);

  if (proxy) {
    const agent = new HttpsProxyAgent({ proxy });
    return new NodeHttpHandler({
      httpAgent: agent,
      httpsAgent: agent,
    });
  }

  return new NodeHttpHandler();
}

async function resolveRegion(paramMap) {
  if (paramMap.get("aws_region")) return paramMap.get("aws_region");
  if (process.env.AWS_REGION) return process.env.AWS_REGION;
  let region = null;
  try {
    const { configFile, credentialsFile } = await loadSharedConfigFiles();
    const profile = paramMap.get("aws_profile") || process.env.AWS_PROFILE || "default";
    region = configFile[profile]?.region || credentialsFile[profile]?.region;

    if (!region) {
      throw new Error(`Region not found in AWS config/credentials for profile: ${profile}`);
    }

    return region;
  } catch (err) {
    throw new Error(
      `AWS Region Resolution Failed: ${err.message}. Ensure AWS_REGION is set or ~/.aws/config is accessible.`
    );
  }
}

function createAwsCredential(paramMap, requestHandler, region) {
  return fromNodeProviderChain({
    profile: paramMap.get("aws_profile") || process.env.AWS_PROFILE || "default",
    clientConfig: {
      requestHandler,
      region
    }
  });
}

module.exports = {
  createAwsCredential,
  initAwsCommon,
  initAwsRequestHandler,
  resolveProxy,
  resolveRegion,
};
