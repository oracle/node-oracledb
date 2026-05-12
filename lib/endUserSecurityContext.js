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

'use strict';

const { Buffer } = require('buffer');
const errors = require('./errors.js');
const oson = require('./impl/datahandlers/oson.js');
const { ObfuscatedValue } = require('./obfuscation.js');
const transformer = require('./transformer.js');

const DEFAULT_MAX_FIELD_NAME_SIZE = 65535;
const DEFAULT_MAX_PAYLOAD_LENGTH = 65535;

function hasNonEmptyText(value) {
  return (typeof value === 'string') && value.trim().length > 0;
}

/*
Represents the credential set an application associates with an end user.

Required properties
- databaseAccessToken: non-empty string accepted by the database driver.
- endUserToken or endUserName: at least one must be supplied as a string.
- key: required whenever endUserName is supplied; otherwise optional.

Optional properties
- key: look-up identifier the database maps to stored context attributes; may be
  omitted only when identifying users via endUserToken.
- dataRoles: data roles enabled/disabled by the application logic, rather
  than a database security policy.
- attributes: Attributes are contained in JSON objects conforming
  to a JSON schema of an END USER CONTEXT declared in the database.

*/
class EndUserSecurityContext {
  constructor(options) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(
      typeof options === 'object' && options !== null && !Array.isArray(options),
      1
    );

    const {
      databaseAccessToken,
      endUserToken,
      endUserName,
      key,
      dataRoles,
      attributes
    } = options;

    // The database access token is always required, and the end user must be
    // identified either by token or by name.
    errors.assertParamValue(hasNonEmptyText(databaseAccessToken), 1);
    errors.assertParamValue(
      (endUserToken !== undefined && endUserToken !== null) ||
      (endUserName !== undefined && endUserName !== null),
      1
    );

    // When supplied, token/name/key values must contain non-whitespace text.
    if (endUserToken !== undefined && endUserToken !== null) {
      errors.assertParamValue(hasNonEmptyText(endUserToken), 1);
    }

    // Name-based contexts require a key so the database can locate the stored
    // end user context attributes.
    if (endUserName !== undefined && endUserName !== null) {
      errors.assertParamValue(hasNonEmptyText(endUserName), 1);
      errors.assertParamValue(key !== undefined && key !== null, 1);
    }

    if (key !== undefined && key !== null) {
      errors.assertParamValue(hasNonEmptyText(key), 1);
    }

    const payload = {
      ver: '1.0',
      database_access_token: databaseAccessToken
    };

    if (endUserToken != null) {
      payload.end_user_token = endUserToken;
    }

    if (endUserName != null) {
      payload.end_user_name = endUserName;
    }

    if (key != null) {
      payload.end_user_contextid = key;
    }

    // Data roles are optional, but must be passed as an array when present.
    if (dataRoles != null) {
      errors.assertParamValue(Array.isArray(dataRoles), 1);
      payload.data_roles = Array.from(dataRoles);
    }

    // Attributes are encoded as name/value entries expected by the OSON payload.
    if (attributes != null) {
      errors.assertParamValue(
        typeof attributes === 'object' && !Array.isArray(attributes),
        1
      );
      payload.attributes = Object.entries(attributes).map(
        ([name, values]) => ({ name, values }));
    }

    this._payloadStore = new ObfuscatedValue();
    this._encodeAndStorePayload(payload);
  }

  _encodePayload(value) {
    const encoder = new oson.OsonEncoder();
    return encoder.encode(
      transformer.transformJsonValue(value),
      DEFAULT_MAX_FIELD_NAME_SIZE
    );
  }

  _encodeAndStorePayload(payload) {
    const encodedPayload =
      this._encodePayload(payload);
    this.setEncodedPayload(encodedPayload);
  }

  setEncodedPayload(encodedPayload) {
    errors.assertParamValue(Buffer.isBuffer(encodedPayload), 1);
    const payloadLength = encodedPayload.length;
    if (payloadLength > DEFAULT_MAX_PAYLOAD_LENGTH) {
      encodedPayload.fill(0);
      errors.throwErr(
        errors.ERR_INVALID_END_USER_SECURITY_CONTEXT_LENGTH,
        payloadLength
      );
    }
    this.clearEncodedPayload();
    this._payloadStore.set(encodedPayload, { returnBuffer: true });
    encodedPayload.fill(0);
  }

  getDeobfuscatedValue() {
    return this._payloadStore.get({ returnBuffer: true });
  }

  clearEncodedPayload() {
    this._payloadStore.clear();
  }
}

module.exports = EndUserSecurityContext;
