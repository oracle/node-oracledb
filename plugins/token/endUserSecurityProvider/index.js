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

/**
 * End-user security context token provider. Each configured pool or standalone
 * connection owns its provider; there is no process-global provider setting.
 */
const oracledb = require('oracledb');
const { createHash } = require('crypto');
const securityContextProvider = oracledb.getSecurityContextProvider();

const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
// These endUserSecParams fields are consumed by this provider and must not be
// forwarded to an Azure or OCI token extension as token configuration.
const PROVIDER_CONTROL_FIELDS = new Set([
  'spiType', 'authFlow', 'endUserToken', 'endUserName',
  'dataRoles', 'attributes', 'key',
  'cacheOptions', 'contextResolution'
]);
const DEFAULT_METADATA_FIELDS = [
  'endUserToken', 'endUserName', 'dataRoles', 'attributes', 'key',
];
const PROVIDER_MODULE_PATHS = {
  azure: '../extensionAzure/index.js',
  oci: '../extensionOci/index.js',
};
const SINGLE_TOKEN_OBO_MIN_DB_VERSION = 2326040000;

function throwErr(message, code) {
  const err = new Error(message);
  if (code) {
    err.code = code;
  }
  throw err;
}

function ensureInvocationHook() {
  if (!securityContextProvider.getInvocationHook?.()) {
    securityContextProvider.setInvocationHook(
      securityContextProvider.createInvocationHook()
    );
  }
}

function normalizeAuthFlow(value) {
  const flow = String(value ?? 'onBehalfOf').trim().toLowerCase();
  if (flow === 'app' || flow === 'clientcredentials' ||
      flow === 'client_credentials' || flow === 'client-credentials') {
    return 'app';
  }
  if (flow === 'obo' || flow === 'onbehalfof' ||
      flow === 'on_behalf_of' || flow === 'on-behalf-of') {
    return 'obo';
  }
  throwErr("endUserSecParams.authFlow must be 'app' or 'onBehalfOf'.");
}

function normalizeContextResolution(value) {
  const resolution = String(value ?? 'connection').trim().toLowerCase();
  if (resolution === 'connection' || resolution === 'operation') {
    return resolution;
  }
  throwErr("endUserSecParams.contextResolution must be 'connection' or 'operation'.");
}

function normalizeProvider(params) {
  const spiType = String(params.spiType ?? 'oci').trim().toLowerCase();
  const modulePath = PROVIDER_MODULE_PATHS[spiType];
  if (!modulePath) {
    throwErr("endUserSecParams.spiType must be 'azure' or 'oci'.");
  }
  // Start with the supplied parameters, then remove fields interpreted by this
  // end-user-security provider. The remaining tokenConfig is passed only to
  // the selected Azure or OCI extension, so request metadata and provider
  // controls cannot accidentally be treated as token-client options.
  const tokenConfig = { ...params };
  for (const key of PROVIDER_CONTROL_FIELDS) {
    delete tokenConfig[key];
  }
  // Azure's application-token helper expects this value. It is harmless for
  // OBO-capable configurations because both flows use the same credentials.
  if (spiType === 'azure' && !tokenConfig.authType) {
    tokenConfig.authType = 'azureserviceprincipal';
  }
  return {
    vendor: spiType,
    modulePath,
    tokenConfig,
    cacheOptions: params.cacheOptions ? { ...params.cacheOptions } : undefined
  };
}

/**
 * Creates a provider from the `endUserSecParams` shape. Configuration fields
 * that describe the identity provider are static. `endUserToken`,
 * `endUserName`, `key`, `dataRoles`, and `attributes` are defaults only: request
 * metadata supplied by runWithContext() wins.
 */
function configureUnifiedContextProvider(params) {
  ensureInvocationHook();
  const config = normalizeConfig(params);
  const provider = loadProviderModule(config.provider);
  return createProviderFn(config, provider);
}

function mergeMetadata(defaults, current) {
  if (!current || typeof current !== 'object') {
    return defaults;
  }
  return { ...defaults, ...current };
}

function getEndUserToken(metadata) {
  return metadata.endUserToken;
}

function createProviderFn(config, provider) {
  const unifiedProvider = async function unifiedProvider(connection) {
    const current = securityContextProvider.getCurrentContext();
    if (!current || typeof current !== "object") {
      // Do not acquire an application token for normal work outside a scope.
      return undefined;
    }
    if (hasOwn(current, 'authorization')) {
      throwErr('Security context metadata.authorization is not supported; use endUserToken.');
    }
    const metadata = mergeMetadata(config.defaultMetadata, current);
    const endUserToken = getEndUserToken(metadata);
    const hasEndUserToken = endUserToken != null;
    const hasEndUserName = metadata.endUserName != null;
    const hasKey = metadata.key != null;

    // Check the merged defaults too: excluding a token from the wire must not
    // silently discard a conflicting named identity or context key.
    if (hasEndUserToken && (hasEndUserName || hasKey)) {
      throwErr('Security context cannot combine endUserToken with endUserName or key.');
    }
    if (hasKey && !hasEndUserName) {
      throwErr('Security context requires endUserName when key is supplied.');
    }
    const namedAppContext = config.authFlow === 'app' && hasEndUserName;

    // authFlow is fixed when the pool or standalone connection is created.
    // Per-request metadata supplies identity only; it cannot select a token
    // exchange for which the configured provider may lack credentials.
    if (config.authFlow === "obo") {
      if (config.provider.vendor !== 'azure') {
        throwErr('On-behalf-of security contexts are supported only with spiType "azure".');
      }
      if (typeof endUserToken !== 'string' || !endUserToken.trim()) {
        throwErr("authFlow=obo requires a non-empty end-user token.");
      }

      const omitEndUserToken = connection.getOracleServerVersion() >=
        SINGLE_TOKEN_OBO_MIN_DB_VERSION;
      const tokenResult = await acquireOboToken(config, provider, endUserToken);
      return getOrCreateScopedSecurityContext(unifiedProvider, config,
        tokenResult, () => createSecurityContext(
          finalizeTokenMode(metadata, tokenResult.accessToken,
            omitEndUserToken)));
    }

    const tokenResult = await acquireAppToken(config, provider);
    const databaseAccessToken = tokenResult.accessToken;
    // App flows retain the supplied identity, including an end-user token.
    // Only OBO on supported database versions omits that token automatically.
    return getOrCreateScopedSecurityContext(unifiedProvider, config,
      tokenResult, () => createSecurityContext(namedAppContext
        ? finalizeAppMode(metadata, databaseAccessToken)
        : finalizeTokenMode(metadata, databaseAccessToken, false)));
  };
  // The driver reads this private property to choose the provider lifecycle.
  unifiedProvider._contextResolution = config.contextResolution;
  return unifiedProvider;
}

function createSecurityContext(context) {
  return new oracledb.EndUserSecurityContext(context);
}

// Operation resolution calls the provider for every database operation so the
// token extension remains authoritative for expiry and refresh. When it
// reports a cached database token, reuse the encoded EUSC for this scope. The
// scope cache holds no plaintext token and is released when the async scope
// completes.
function getOrCreateScopedSecurityContext(provider, config, tokenResult,
  createContext) {
  if (config.contextResolution !== 'operation') {
    return createContext();
  }

  // A shared token cache may have been refreshed by another scope. A cache
  // hit alone does not guarantee that this scope's EUSC contains that token.
  const tokenHash = createHash('sha256').update(tokenResult.accessToken)
    .digest('hex');
  const cached = securityContextProvider._getScopedValue(provider);
  if (cached && tokenResult.isNewToken === false &&
      cached.tokenHash === tokenHash) {
    return cached.securityContext;
  }
  const securityContext = createContext();
  securityContextProvider._setScopedValue(provider,
    { securityContext, tokenHash });
  return securityContext;
}

function finalizeTokenMode(metadata, databaseAccessToken, omitEndUserToken) {
  const context = {
    databaseAccessToken,
    dataRoles: metadata.dataRoles,
    attributes: metadata.attributes
  };
  if (!omitEndUserToken) {
    context.endUserToken = getEndUserToken(metadata);
  }
  return buildContext(context);
}

function finalizeAppMode(metadata, databaseAccessToken) {
  const context = buildContext({
    databaseAccessToken,
    endUserName: metadata.endUserName,
    dataRoles: metadata.dataRoles,
    key: metadata.key,
    attributes: metadata.attributes
  });
  return context;
}

async function acquireAppToken(config, provider) {
  const result = await provider.getTokenResult(config.provider.tokenConfig);
  return {
    accessToken: getAccessToken(result,
      'Token provider failed to return an application access token.'),
    isNewToken: result?.isNewToken !== false,
  };
}

async function acquireOboToken(config, provider, endUserToken) {
  const result = await provider.getOnBehalfOfToken({
    endUserToken,
    oboConfig: config.provider.tokenConfig,
    cacheOptions: config.provider.cacheOptions
  });
  const accessToken = getAccessToken(result,
    'Token provider failed to return an access token for on-behalf-of exchange.');
  return {
    accessToken,
    // Extensions set false only when returning a valid cached database token.
    // Unknown/custom provider results are conservative and force a new EUSC.
    isNewToken: result?.isNewToken !== false,
  };
}

function getAccessToken(result, errorMessage) {
  const accessToken = typeof result === 'string'
    ? result
    : (result?.accessToken ?? result?.token);
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throwErr(errorMessage);
  }
  return accessToken;
}

function loadProviderModule(descriptor) {
  return require(descriptor.modulePath);
}

function buildContext(base) {
  const context = { databaseAccessToken: base.databaseAccessToken };
  for (const key of ['endUserToken', 'endUserName', 'dataRoles', 'key', 'attributes']) {
    if (base[key] !== undefined) {
      context[key] = base[key];
    }
  }
  return context;
}

function normalizeConfig(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new TypeError('endUserSecParams must be an object.');
  }
  const defaultMetadata = {};
  for (const key of DEFAULT_METADATA_FIELDS) {
    if (hasOwn(params, key)) {
      defaultMetadata[key] = params[key];
    }
  }
  const authFlow = normalizeAuthFlow(params.authFlow);
  const provider = normalizeProvider(params);
  if (authFlow === 'obo' && provider.vendor !== 'azure') {
    throwErr('On-behalf-of security contexts are supported only with spiType "azure".');
  }
  return {
    authFlow,
    contextResolution: normalizeContextResolution(params.contextResolution),
    defaultMetadata: snapshotDefaultMetadata(defaultMetadata),
    provider
  };
}

// Provider defaults are static after pool/connection creation. Snapshot the
// mutable fields so changes to the caller's configuration object cannot alter
// a scope after the provider has been configured.
function snapshotDefaultMetadata(metadata) {
  const snapshot = { ...metadata };
  if (Array.isArray(metadata.dataRoles)) {
    snapshot.dataRoles = [...metadata.dataRoles];
  }
  if (metadata.attributes && typeof metadata.attributes === 'object') {
    snapshot.attributes = JSON.parse(JSON.stringify(metadata.attributes));
  }
  return snapshot;
}

/**
 * Process configuration hook. `endUserSecParams` is copied to the pool or
 * standalone connection being created. Dynamic request metadata is supplied
 * later with runWithContext().
 */
function hookFn(options) {
  if (!options.endUserSecParams) {
    return;
  }
  options._securityContextProvider =
    configureUnifiedContextProvider(options.endUserSecParams);
}

oracledb.registerProcessConfigurationHook(hookFn);
