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
const identitydataplane = require("oci-identitydataplane");
const common = require("oci-common");
const { generateKeyPair } = require('crypto');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');
const { TokenCache, hashValue } = require('../cache.js');
const TOKEN_REQUEST_TIMEOUT_MS = 30000;
const APP_TOKEN_CACHE_CLOCK_SKEW_MS = 60 * 1000;
const APP_TOKEN_CACHE_MAX_ENTRIES = 100;
// Process-wide, bounded LRU cache for OCI client-credentials tokens. Its key
// includes the authentication inputs that can change a token. Other OCI
// authentication modes retain their pre-cache behavior.
const appTokenCache = new TokenCache(APP_TOKEN_CACHE_MAX_ENTRIES);

// Internal Deep Security API. The driver's ordinary token-authentication hook
// below formats this result as a string or token/private-key pair.
async function getTokenResult(params) {
  if (typeof params?.authType !== 'string') {
    throwErr('OCI authentication type is required.');
  }
  const authType = params.authType.toLowerCase();
  let result;
  if (authType === 'clientcredentials') {
    const cacheKey = computeAppCacheKey(params);
    result = await appTokenCache.get(cacheKey, () => acquireToken(params));
  } else {
    result = { value: (await acquireToken(params)).value, isCacheHit: false };
  }
  if (typeof result.value === 'string') {
    return { accessToken: result.value, isNewToken: !result.isCacheHit };
  }
  return { ...result.value, isNewToken: !result.isCacheHit };
}

async function acquireToken(params) {
  let result;
  switch (params.authType.toLowerCase()) {
    case 'configfilebasedauthentication':
      result = await configFileBasedAuthentication(params);
      break;
    case 'simpleauthentication':
      result = await simpleAuthentication(params);
      break;
    case 'instanceprincipal':
      result = await instancePrincipalAuthentication(params);
      break;
    case 'clientcredentials':
      result = await clientCredentialsAuthentication(params);
      break;
    case 'resourceprincipal':
      result = await resourcePrincipalAuthentication(params);
      break;
    default:
      throwErr(`Invalid authentication type ${params.authType} in extensionOci plugins.`);
  }
  return { value: result.value, validUntil: calculateValidUntil(result) };
}

//---------------------------------------------------------------------------
// throwErr()
//---------------------------------------------------------------------------
function throwErr(message) {
  throw new Error(message);
}

//---------------------------------------------------------------------------
// Requests an access token from the dataplane service
// Generating security token
//---------------------------------------------------------------------------
async function generateAccessToken(provider, scope) {
  // Scope uses the * character to identify all databases in the cloud
  // tenancy of the authenticated user. urn:oracle:db::id::*, default

  // A scope that authorizes access to all databases within a compartment has
  // the form: urn:oracle:db::id::<compartment-ocid>
  // String scope = "urn:oracle:db::id::ocid1.compartment.oc1..xxxxxxxx"

  // A scope that authorizes access to a single database within a compartment
  // has the form: urn:oracle:db::id::<compartment-ocid>::<database-ocid>
  // String scope = "urn:oracle:db::id::ocid1.compartment.oc1..xxxxxx::ocid1.autonomousdatabase.oc1.phx.xxxxxx"

  const client = new identitydataplane.DataplaneClient({
    authenticationDetailsProvider: provider
  });
  const keyPair = await _getKeyPair();

  const generateScopedAccessTokenRequest = {
    generateScopedAccessTokenDetails: {
      scope: scope ?? "urn:oracle:db::id::*",
      publicKey: keyPair.publicKey
    }
  };

  const generateScopedAccessTokenResponse =
    await client.generateScopedAccessToken(generateScopedAccessTokenRequest);

  const securityToken = generateScopedAccessTokenResponse.securityToken;
  if (typeof securityToken?.token !== 'string' || !securityToken.token.trim()) {
    throwErr('OCI scoped access token response is missing a token.');
  }
  return {
    value: {
      token: securityToken.token,
      privateKey: keyPair.privateKey
    },
    expiresOn: securityToken.expirationTime
  };
}

//---------------------------------------------------------------------------
// Generates a public-private key pair for proof of possession when token
// requested by this provider is presented for validation.
//---------------------------------------------------------------------------
async function _getKeyPair() {
  return await new Promise((resolve, reject) => {
    generateKeyPair('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      }
    }, (err, publicKey, privateKey) => {
      if (err) return reject(err);
      resolve({publicKey, privateKey});
    });
  });
}

//---------------------------------------------------------------------------
//  User defined function for reading token and private key values
//  generated by the OCI SDK.
//  Returns the OCI SDK's token request details object for the given
//  config parameters, where a scope parameter specifies the
//  scope of requested access. The request will specify a public key
//  as being paired with a private key that the presenter of the token must
//  prove to be in possession of.
//
//  The path and profile of the config file may be configured by optional
//  parameters in object accessTokenConfig. If values not provided in
//  accessTokenConfig then this method will read the DEFAULT
//  profile from $HOME/.oci/config.
//  accessTokenConfig.configFileLocation, Not null.
//  accessTokenConfig.profile, Not null.
//
//  Return API Key-Based Authentication.
//---------------------------------------------------------------------------
async function configFileBasedAuthentication(accessTokenConfig) {
  const provider =
    new common.ConfigFileAuthenticationDetailsProvider(accessTokenConfig.configFileLocation, accessTokenConfig.profile);

  return await generateAccessToken(provider, accessTokenConfig.scope);
}

//---------------------------------------------------------------------------
// simpleAuthentication()
// Returns authentication details for the provided credentials.
//   tenancy: OCID of the tenancy
//   user: OCID of the user
//   fingerprint: Fingerprint of the public key
//   privateKey: Private key
//   passPhrase: Passphrase that is used to encrypt the private key.
//               null if not used.
// Return API Key-Based Authentication.
//---------------------------------------------------------------------------
async function simpleAuthentication(accessTokenConfig) {
  const tenancy = accessTokenConfig.tenancy ??
    throwErr("Token based authentication config parameter tenancy is missing for simpleauthentication in extensionOci plugins.");
  const user = accessTokenConfig.user ??
    throwErr("Token based authentication config parameter user is missing for simpleauthentication in extensionOci plugins.");
  const fingerprint = accessTokenConfig.fingerprint ??
    throwErr("Token based authentication config parameter fingerprint is missing for simpleauthentication in extensionOci plugins.");
  const passphrase = accessTokenConfig.passphrase ?? null; // optional
  const privateKeyLocation = accessTokenConfig.privateKeyLocation ??
    throwErr("Token based authentication config parameter privateKeyLocation is missing for simpleauthentication in extensionOci plugins.");
  const privateKey = fs.readFileSync(privateKeyLocation, 'utf-8'); // ~/.oci/oci_api_key.pem
  const regionId = accessTokenConfig.regionId ??      // ex : us-ashburn-1
    throwErr("Token based authentication config parameter regionId is missing for simpleauthentication in extensionOci plugins.");

  const region = common.Region.values().find(
    (item) => item.regionId === regionId
  );
  if (!region) {
    throwErr(`Invalid OCI regionId ${regionId}.`);
  }
  const provider = new common.SimpleAuthenticationDetailsProvider(
    tenancy,
    user,
    fingerprint,
    privateKey,
    passphrase,
    region
  );

  return await generateAccessToken(provider, accessTokenConfig.scope);
}

//---------------------------------------------------------------------------
// instancePrincipalAuthentication()
//
// Authentication in a Compute Instance, without credentials, as an instance
// principal. This authentication method should only work on compute
// instances where internal network endpoints are reachable.
// Return Instance Principal Authentication.
//---------------------------------------------------------------------------
async function instancePrincipalAuthentication(accessTokenConfig) {
  const provider = await new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();

  return await generateAccessToken(provider, accessTokenConfig.scope);
}

//---------------------------------------------------------------------------
// clientCredentialsAuthentication()
//
// Requests an access token from an OCI Identity Domain using the OAuth 2.0
// client-credentials grant.
//---------------------------------------------------------------------------
async function clientCredentialsAuthentication(config) {
  const authority = config.authority ??
    throwErr("Token based authentication config parameter authority is missing for clientcredentials in extensionOci plugins.");
  const clientId = config.clientId ??
    throwErr("Token based authentication config parameter clientId is missing for clientcredentials in extensionOci plugins.");
  const clientSecret = config.clientSecret ??
    throwErr("Token based authentication config parameter clientSecret is missing for clientcredentials in extensionOci plugins.");
  if (config.scopes !== undefined && typeof config.scopes !== 'string') {
    throwErr('OCI OAuth scopes must be a string.');
  }

  const params = new URLSearchParams();

  params.set("grant_type", "client_credentials");
  if (config.scopes) {
    // OAuth defines a singular form parameter; the driver configuration uses
    // the same plural `scopes` spelling as the Azure token configuration.
    params.set("scope", config.scopes);
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const requestBody = params.toString();
  const response = await postForm(authority, {
    'Authorization': `Basic ${basicAuth}`
  }, requestBody, config.tokenRequestTimeoutMs);

  let payload = null;
  if (response && response.body) {
    try {
      payload = JSON.parse(response.body);
    } catch {
      payload = null;
    }
  }

  const statusCode = Number(response?.statusCode ?? 0);
  if (statusCode < 200 || statusCode >= 300) {
    const statusText = response?.statusMessage || `HTTP ${statusCode}`;
    const errorMessage =
      payload?.error_description ||
      payload?.error ||
      statusText;
    throwErr(`OCI client credentials token request failed: ${errorMessage}`);
  }

  const accessToken = payload?.access_token;
  if (!accessToken) {
    throwErr("OCI client credentials token response is missing access_token.");
  }

  return { value: accessToken, expiresIn: payload?.expires_in };
}

function calculateValidUntil(result) {
  let expiresAt;
  if (result.expiresOn instanceof Date) {
    expiresAt = result.expiresOn.getTime();
  } else if (typeof result.expiresOn === 'number') {
    expiresAt = result.expiresOn;
  } else if (typeof result.expiresOn === 'string') {
    expiresAt = Date.parse(result.expiresOn);
  } else if (Number.isFinite(Number(result.expiresIn)) &&
      Number(result.expiresIn) > 0) {
    expiresAt = Date.now() + (Number(result.expiresIn) * 1000);
  }
  return Number.isFinite(expiresAt) ?
    expiresAt - APP_TOKEN_CACHE_CLOCK_SKEW_MS : undefined;
}

function computeAppCacheKey(config) {
  // This function is called only for clientcredentials. Array positions are
  // fixed, and JSON serialization makes the result unambiguous.
  return JSON.stringify([
    config.authType.toLowerCase(), config.authority, config.clientId,
    hashValue(config.clientSecret), config.scopes,
  ]);
}

//---------------------------------------------------------------------------
// postForm()
//
// Minimal HTTPS helper for posting x-www-form-urlencoded payloads.
//---------------------------------------------------------------------------
function postForm(endpoint, extraHeaders, body, timeoutMs = TOKEN_REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:') {
        throwErr('OCI token endpoint must use HTTPS.');
      }
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
        throwErr('OCI token request timeout must be a positive integer.');
      }
      const headers = Object.assign({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }, extraHeaders);

      const requestOptions = {
        method: 'POST',
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : undefined),
        path: `${url.pathname}${url.search}`,
        headers
      };

      const req = https.request(requestOptions, (res) => {
        let responseBody = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            body: responseBody
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error('OCI token request timed out.'));
      });
      req.write(body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// resourcePrincipalAuthentication()
//
// Authentication in an OCI resource-principal-enabled service. Credentials
// are supplied by the OCI runtime, so no API key material is needed.
//---------------------------------------------------------------------------
async function resourcePrincipalAuthentication(accessTokenConfig) {
  const provider = common.ResourcePrincipalAuthenticationDetailsProvider.builder();

  return await generateAccessToken(provider, accessTokenConfig.scope);
}

//---------------------------------------------------------------------------
//  hookFn()
//  hookFn will get registerd to driver while loading plugins.
//---------------------------------------------------------------------------
function hookFn(options) {
  if (options.tokenAuthConfigOci) {
    options.accessToken = async function callbackFn(refresh, config) {
      const result = await getTokenResult(config);
      if (result.privateKey !== undefined) {
        return { token: result.token, privateKey: result.privateKey };
      }
      return result.accessToken;
    };
    options.accessTokenConfig = options.tokenAuthConfigOci;
  }
}
oracledb.registerProcessConfigurationHook(hookFn);

module.exports = {
  getTokenResult
};
