// Copyright (c) 2025, Oracle and/or its affiliates.

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
const oracledb = require('oracledb');
const msal = require('@azure/msal-node');
const { TokenCache, hashValue } = require('../cache.js');

const OBO_DEFAULT_CLOCK_SKEW_MS = 60 * 1000;
const TOKEN_CACHE_MAX_ENTRIES = 100;
// Process-wide, bounded LRU cache of completed OBO exchanges. Connections
// safely share entries only when their cache key has the same caller-token
// hash and every Azure credential/request input that can change the result.
// Values are obfuscated at rest.
const oboTokenCache = new TokenCache(TOKEN_CACHE_MAX_ENTRIES);
// Process-wide, bounded cache of service-principal tokens. Its key includes
// every credential and request input that can change the resulting token, so
// pools can share only compatible entries. Values are obfuscated at rest.
const appTokenCache = new TokenCache(TOKEN_CACHE_MAX_ENTRIES);


// Internal Deep Security API. The driver's ordinary token-authentication hook
// below returns this result's access-token string.
async function getTokenResult(params) {
  if (typeof params?.authType !== 'string') {
    throwErr('Azure authentication type is required.');
  }
  switch (params.authType.toLowerCase()) {
    case 'azureserviceprincipal':
      return await servicePrincipalCredentials(params);
    default:
      throwErr(`Invalid authentication type ${params.authType} in extensionAzure plugins.`);
  }
}

//---------------------------------------------------------------------------
// throwErr()
//---------------------------------------------------------------------------
function throwErr(message) {
  throw new Error(message);
}

//---------------------------------------------------------------------------
// Returns the access token for authentication as a service principal. This
// authentication method requires a client ID and client secret.
// ---------------------------------------------------------------------------
async function servicePrincipalCredentials(params) {
  const clientId = params.clientId ??
    throwErr("Token based authentication config parameter clientId is missing for azureServicePrincipal in extensionAzure plugins.");
  const authority = params.authority ??
    throwErr("Token based authentication config parameter authority is missing for azureServicePrincipal in extensionAzure plugins.");
  const clientSecret = params.clientSecret ??
    throwErr("Token based authentication config parameter clientSecret is missing for azureServicePrincipal in extensionAzure plugins.");
  const scopes = params.scopes ??
    throwErr("Token based authentication config parameter scopes is missing for azureServicePrincipal in extensionAzure plugins.");
  const normalizedScopes = normalizeScopes(scopes);
  const config = { ...params, clientId, authority, clientSecret };
  const cacheKey = computeAppCacheKey(config, normalizedScopes);
  const result = await appTokenCache.get(cacheKey, async () => {
    const authResponse = await createClient(config).acquireTokenByClientCredential({
      scopes: normalizedScopes,
    });
    if (!authResponse?.accessToken) {
      throwErr('Failed to acquire application access token from Azure.');
    }
    return {
      value: authResponse.accessToken,
      validUntil: calculateExpiry(authResponse, OBO_DEFAULT_CLOCK_SKEW_MS),
    };
  });
  return { accessToken: result.value, isNewToken: !result.isCacheHit };
}

// ---------------------------------------------------------------------------
// hookFn()
// hookFn is registered to driver while loading plugins.
// ---------------------------------------------------------------------------

function hookFn(options) {
  if (options.tokenAuthConfigAzure) {
    options.accessToken = async function callbackFn(refresh, config) {
      return (await getTokenResult(config)).accessToken;
    };
    options.accessTokenConfig = options.tokenAuthConfigAzure;
  }
}
oracledb.registerProcessConfigurationHook(hookFn);

//---------------------------------------------------------------------------
// normalizeScopes()
//---------------------------------------------------------------------------
function normalizeScopes(scopes) {
  const normalized = Array.isArray(scopes)
    ? scopes
    : (typeof scopes === 'string' ? [scopes] : null);
  if (!normalized || normalized.some((scope) =>
    typeof scope !== 'string' || !scope.trim())) {
    throwErr('Azure scopes must be a string or an array of non-empty strings.');
  }
  return normalized.map((scope) => scope.trim()).sort();
}

//---------------------------------------------------------------------------
// buildNetworkClient()
//---------------------------------------------------------------------------
function buildNetworkClient(proxyConfig) {
  if (!proxyConfig) {
    return null;
  }
  if (typeof proxyConfig.sendGetRequestAsync === 'function' &&
      typeof proxyConfig.sendPostRequestAsync === 'function') {
    return proxyConfig;
  }
  throwErr('Azure proxy configuration must implement sendGetRequestAsync() and sendPostRequestAsync().');
}

//---------------------------------------------------------------------------
// computeOboCacheKey()
//---------------------------------------------------------------------------
function computeOboCacheKey(config, scopes, endUserToken) {
  // Do not put the assertion or client secret itself in a process-wide Map.
  // The secret hash separates entries if a client secret is rotated while the
  // process is running.
  return JSON.stringify([
    config.authType?.toLowerCase(), config.clientId,
    hashValue(config.clientSecret), config.authority, scopes,
    hashValue(endUserToken),
  ]);
}

function computeAppCacheKey(config, scopes) {
  // Hash the secret rather than retaining it in the process-wide key. A
  // changed secret creates a new entry, leaving the old one bounded and
  // eligible for LRU eviction.
  return JSON.stringify([
    config.authType?.toLowerCase(), config.clientId,
    hashValue(config.clientSecret), config.authority, scopes,
  ]);
}

function createClient(config) {
  const networkClient = buildNetworkClient(config.proxy);
  const msalConfig = {
    auth: {
      clientId: config.clientId ?? throwErr("OBO configuration requires clientId."),
      authority: config.authority ?? throwErr("OBO configuration requires authority."),
      clientSecret: config.clientSecret ?? throwErr("OBO configuration requires clientSecret."),
    }
  };
  if (networkClient) {
    msalConfig.system = { networkClient };
  }

  return new msal.ConfidentialClientApplication(msalConfig);
}

//---------------------------------------------------------------------------
// calculateExpiry()
//---------------------------------------------------------------------------
function calculateExpiry(result, clockSkewMs) {
  if (result?.expiresOn instanceof Date) {
    return result.expiresOn.getTime() - clockSkewMs;
  }
  throwErr('Azure token response did not include an expiration time.');
}

//---------------------------------------------------------------------------
// getOnBehalfOfToken()
//---------------------------------------------------------------------------
async function getOnBehalfOfToken({ endUserToken, oboConfig, cacheOptions }) {
  if (!endUserToken) {
    throwErr('An end user access token must be supplied for OBO exchange.');
  }
  if (!oboConfig) {
    throwErr('OBO configuration is required.');
  }

  const scopes = normalizeScopes(oboConfig.scopes);
  const cacheEnabled = cacheOptions?.enabled !== false;
  const clockSkewMs = cacheOptions?.clockSkewMs ?? OBO_DEFAULT_CLOCK_SKEW_MS;
  // This process-wide bounded cache is authoritative. Do not use MSAL's
  // per-client cache because clients are intentionally short-lived so they do
  // not retain credentials in a long-lived object graph.

  const cacheKey = computeOboCacheKey(oboConfig, scopes, endUserToken);
  const result = await oboTokenCache.get(cacheKey, async () => {
    const authResponse = await createClient(oboConfig).acquireTokenOnBehalfOf({
      oboAssertion: endUserToken,
      scopes,
      skipCache: true
    });
    if (!authResponse?.accessToken) {
      throwErr('Failed to acquire on-behalf-of access token from Azure.');
    }
    return {
      value: authResponse.accessToken,
      validUntil: calculateExpiry(authResponse, clockSkewMs),
    };
  }, { enabled: cacheEnabled });
  return {
    accessToken: result.value,
    expiresOn: new Date(result.validUntil + clockSkewMs),
    isNewToken: !result.isCacheHit,
  };
}

module.exports = {
  getTokenResult,
  getOnBehalfOfToken
};
