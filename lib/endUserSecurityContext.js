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
const crypto = require('crypto');
const errors = require('./errors.js');
const oson = require('./impl/datahandlers/oson.js');
const { ObfuscatedValue } = require('./obfuscation.js');
const transformer = require('./transformer.js');

const DEFAULT_MAX_FIELD_NAME_SIZE = 65535;
const DEFAULT_MAX_PAYLOAD_LENGTH = 65535;

function hasNonEmptyText(value) {
  return (typeof value === 'string') && value.trim().length > 0;
}

// The EUSC hash protocol orders role names by Unicode code point and measures
// each role's length in Unicode characters.
function compareTextByCodePoint(first, second) {
  const firstPoints = Array.from(first);
  const secondPoints = Array.from(second);
  const length = Math.min(firstPoints.length, secondPoints.length);
  for (let i = 0; i < length; i++) {
    const difference = firstPoints[i].codePointAt(0) -
      secondPoints[i].codePointAt(0);
    if (difference !== 0) {
      return difference;
    }
  }
  return firstPoints.length - secondPoints.length;
}

function getDataRoleHashValue(dataRoles) {
  return dataRoles.slice().sort(compareTextByCodePoint).map(
    (role) => `${Array.from(role).length}:${role}`,
  ).join('');
}

/*
Represents a Deep Data Security credential set. A single database token can
identify an end user, a delegated end user, or an application.

Required properties
- databaseAccessToken: non-empty string accepted by the database driver.

Optional properties
- endUserToken or endUserName: at most one may be supplied. Omit both to use
  only the identity represented by databaseAccessToken.
- key: look-up identifier the database maps to stored context attributes; may be
  supplied only with endUserName.
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
    const hasEndUserToken = endUserToken !== undefined && endUserToken !== null;
    const hasEndUserName = endUserName !== undefined && endUserName !== null;
    const hasKey = key !== undefined && key !== null;

    // The database access token is always required. A single-token context
    // uses its identity without a separate end-user token or name.
    errors.assertParamValue(hasNonEmptyText(databaseAccessToken), 1);
    errors.assertParamValue(
      (hasEndUserToken && !hasEndUserName && !hasKey) ||
      (!hasEndUserToken && hasEndUserName) ||
      (!hasEndUserToken && !hasEndUserName && !hasKey), 1);

    // When supplied, token/name/key values must contain non-whitespace text.
    if (hasEndUserToken) {
      errors.assertParamValue(hasNonEmptyText(endUserToken), 1);
    }

    if (hasEndUserName) {
      errors.assertParamValue(hasNonEmptyText(endUserName), 1);
    }

    if (hasKey) {
      errors.assertParamValue(hasEndUserName, 1);
      errors.assertParamValue(hasNonEmptyText(key), 1);
    }

    const payload = {
      ver: '1.0',
      database_access_token: databaseAccessToken
    };
    const hashValueParts = [databaseAccessToken];
    let partialPayload;

    if (endUserToken != null) {
      payload.end_user_token = endUserToken;
      hashValueParts.unshift(endUserToken);
    }

    if (endUserName != null) {
      payload.end_user_name = endUserName;
    }

    if (key != null) {
      payload.end_user_contextid = key;
    }

    // Data roles are optional, but must be passed as an array when present.
    if (dataRoles != null) {
      errors.assertParamValue(
        Array.isArray(dataRoles) && dataRoles.every(hasNonEmptyText),
        1
      );
      payload.data_roles = Array.from(dataRoles);
      // The server treats roles as a set when matching a security-context
      // hash, so preserve that behavior regardless of caller ordering.
      hashValueParts.push(getDataRoleHashValue(dataRoles));
    }

    // Attributes are encoded as name/value entries expected by the OSON payload.
    if (attributes != null) {
      errors.assertParamValue(
        typeof attributes === 'object' && !Array.isArray(attributes),
        1
      );
      payload.attributes = Object.entries(attributes).map(
        ([name, values]) => ({ name, values: values ?? null }));
      partialPayload = { attributes: payload.attributes };
    }

    // Thin-mode connection validation uses this to gate a context that has no
    // separate end-user token or named identity on the negotiated server
    // version.
    this._isSingleToken = !hasEndUserToken && !hasEndUserName;
    this._fullPayloadStore = new ObfuscatedValue();
    this._partialPayloadStore = new ObfuscatedValue();
    this._hashStore = new ObfuscatedValue();
    this._encodeAndStorePayload(payload, this._fullPayloadStore);

    // A named identity can have server-managed context semantics, so it must
    // always be sent in full. Token and application-direct identities can use
    // the server-negotiated hash representation on subsequent operations.
    if (!hasEndUserName) {
      if (partialPayload) {
        this._encodeAndStorePayload(partialPayload, this._partialPayloadStore);
      }
      this._hashStore.set(crypto.createHash('sha256').update(
        hashValueParts.join(''), 'utf8').digest('base64'));
    }
  }

  // Encode EUSC payloads with strict validation of unsupported JSON values and
  // field names.
  _encodePayload(value) {
    const encoder = new oson.OsonEncoder();
    return encoder.encode(
      transformer.transformJsonValue(value, {
        rejectUnsupportedTypes: true
      }),
      DEFAULT_MAX_FIELD_NAME_SIZE
    );
  }

  _encodeAndStorePayload(payload, payloadStore) {
    const encodedPayload =
      this._encodePayload(payload);
    this._setEncodedPayload(encodedPayload, payloadStore);
  }

  _setEncodedPayload(encodedPayload, payloadStore = this._fullPayloadStore) {
    errors.assertParamValue(Buffer.isBuffer(encodedPayload), 1);
    const payloadLength = encodedPayload.length;
    if (payloadLength > DEFAULT_MAX_PAYLOAD_LENGTH) {
      encodedPayload.fill(0);
      errors.throwErr(
        errors.ERR_INVALID_END_USER_SECURITY_CONTEXT_LENGTH,
        payloadLength
      );
    }
    payloadStore.set(encodedPayload, { returnBuffer: true });
    encodedPayload.fill(0);
  }

  _getDeobfuscatedFullPayload() {
    return this._fullPayloadStore.get({ returnBuffer: true });
  }

  // The following accessors are internal Thin protocol helpers. Each returns
  // a short-lived deobfuscated value which the caller must clear when it is a
  // Buffer.
  _getDeobfuscatedPartialPayload() {
    return this._partialPayloadStore.get({ returnBuffer: true });
  }

  _getDeobfuscatedHash() {
    return this._hashStore.get();
  }
}

module.exports = EndUserSecurityContext;
