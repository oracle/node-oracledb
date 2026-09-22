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

let Storage;

class GCPStorageProvider extends base {
  constructor(provider_arg, urlExtendedPart) {
    super(urlExtendedPart);
    this.parseProviderArg(provider_arg);
  }

  init() {
    ({ Storage } = require("@google-cloud/storage"));
  }

  parseProviderArg(providerArg) {
    for (const entry of providerArg.split(";")) {
      const [key, ...valueParts] = entry.split("=");
      const value = valueParts.join("=");

      if (!key || !value) {
        throw new Error(
          "GCP Storage Config Provider argument must use bucket=<bucket>;object=<object>;project=<project> is optional."
        );
      }

      this._addParam(key.trim(), decodeURIComponent(value.trim()));
    }

    for (const key of ["bucket", "object"]) {
      if (!this.paramMap.get(key)) {
        throw new Error(
          `GCP Storage Config Provider missing required ${key} value.`
        );
      }
    }
  }

  async returnConfig() {
    const bucket = this.paramMap.get("bucket");
    const object = this.paramMap.get("object");

    const storageOptions = {};
    const projectId = this.paramMap.get("project");
    if (projectId) {
      storageOptions.projectId = projectId;
    }

    // The Storage client manages the lifecycle of its underlying connections,
    // no explicit close is required after downloading the configuration.
    const storage = new Storage(storageOptions);

    try {
      const [contents] = await storage
        .bucket(bucket)
        .file(object)
        .download();
      return JSON.parse(contents.toString("utf-8"));
    } catch (e) {
      const errmsg = util.format(
        "Failed to retrieve or parse config from GCP Storage: %s\n%s",
        e.message,
        e.stack
      );
      throw new Error(errmsg);
    }
  }
}

module.exports = GCPStorageProvider;

async function hookFn(args) {
  const configProvider = new GCPStorageProvider(
    args.provider_arg,
    args.urlExtendedPart
  );

  try {
    configProvider.init();
  } catch (err) {
    const errmsg = util.format(
      "GCP Storage Config Provider failed to load required modules: %s\n%s",
      err.message,
      err.stack
    );
    throw new Error(errmsg);
  }

  const cfg = await configProvider.returnConfig();
  return [cfg, null];
}

oracledb.registerConfigurationProviderHook("gcpstorage", hookFn);
