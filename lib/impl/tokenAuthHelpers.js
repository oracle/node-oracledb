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

const errors = require('../errors.js');
const { getTokenAuthKey } = require('../util.js');

// Parameters used by any built-in Oracle Net TOKEN_AUTH method. Plugins use
// this list to distinguish a parameter for another auth method from a generic
// SECURITY setting.
const TOKEN_AUTH_SPECIFIC_PARAMS = [
  'token_location', 'oci_config_file', 'oci_profile', 'oci_compartment',
  'oci_database', 'azure_db_app_id_uri', 'tenant_id', 'client_id',
  'client_secret'
];
const TOKEN_AUTH_PARAM_NAMES = ['token_auth', ...TOKEN_AUTH_SPECIFIC_PARAMS];

/**
 * Returns SECURITY parameters from a DESCRIPTION, merging repeated SECURITY
 * sections in descriptor order. The last occurrence of a parameter wins.
 * @param {Object} description - DESCRIPTION NVPair.
 * @returns {Object} Lowercase parameter names mapped to their values.
 */
function getSecurityParams(description) {
  const params = {};
  for (let i = 0; i < description.getListSize(); i++) {
    const child = description.getListElement(i);
    if (child.name.toUpperCase() !== 'SECURITY') {
      continue;
    }
    for (let j = 0; j < child.getListSize(); j++) {
      const param = child.getListElement(j);
      params[param.name.toLowerCase()] = param.atom;
    }
  }
  return params;
}

function validateTokenAuthParams(tokenAuth, tokenParams, authConfig) {
  const isMissing = value => typeof value !== 'string' || value.trim() === '';
  const missing = authConfig.required.find(param =>
    isMissing(tokenParams[param]));
  if (missing) {
    errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
      `missing required TOKEN_AUTH parameter: ${missing.toUpperCase()}`);
  }

  const unsupported = TOKEN_AUTH_SPECIFIC_PARAMS.find(param =>
    tokenParams[param] !== undefined && !authConfig.allowed.includes(param));
  if (unsupported) {
    errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
      `${unsupported.toUpperCase()} is not valid for TOKEN_AUTH=${tokenAuth.toUpperCase()}`);
  }

  const empty = authConfig.allowed.find(param =>
    tokenParams[param] !== undefined && isMissing(tokenParams[param]));
  if (empty) {
    errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
      `TOKEN_AUTH parameter ${empty.toUpperCase()} must not be empty`);
  }

  for (const [param, requiredParam] of
    Object.entries(authConfig.dependencies || {})) {
    if (tokenParams[param] !== undefined &&
        tokenParams[requiredParam] === undefined) {
      errors.throwErr(errors.ERR_INVALID_CONNECT_STRING_PARAMETERS,
        `${param.toUpperCase()} requires ${requiredParam.toUpperCase()}`);
    }
  }
}

function getTokenAuthProfileKey(params) {
  const authParams = { token_auth: params.token_auth };
  for (const param of TOKEN_AUTH_SPECIFIC_PARAMS) {
    if (params[param] !== undefined) {
      authParams[param] = params[param];
    }
  }
  return getTokenAuthKey(authParams);
}

module.exports = {
  getSecurityParams,
  getTokenAuthProfileKey,
  validateTokenAuthParams,
  TOKEN_AUTH_PARAM_NAMES
};
