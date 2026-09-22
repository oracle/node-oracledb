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
const securityContextProvider = oracledb.getSecurityContextProvider();

const hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
// These endUserSecParams fields are consumed by this provider and must not be
// forwarded to an Azure or OCI token extension as token configuration.
const PROVIDER_CONTROL_FIELDS = new Set([
  'spiType', 'authFlow', 'endUserToken', 'endUserName',
  'dataRoles', 'attributes', 'contextId', 'authMode',
  'cacheOptions', 'contextResolution'
]);
const DEFAULT_METADATA_FIELDS = [
  'endUserToken', 'endUserName', 'dataRoles', 'attributes', 'contextId',
  'authMode'
];
const PROVIDER_MODULE_PATHS = {
  azure: '../extensionAzure/index.js',
  oci: '../extensionOci/index.js',
};

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
 * `endUserName`, `dataRoles`, and `attributes` are defaults only: request
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
  const unifiedProvider = async function unifiedProvider() {
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
    const authMode = metadata.authMode ?? config.authFlow;

    if (authMode === "obo") {
      if (config.provider.vendor !== 'azure') {
        throwErr('On-behalf-of security contexts are supported only with spiType "azure".');
      }
      if (!endUserToken) {
        throwErr("authFlow=obo requires an end-user token.");
      }

      const tokenResult = await acquireOboToken(config, provider, endUserToken);
      return getOrCreateScopedSecurityContext(unifiedProvider, config,
        tokenResult, () => createSecurityContext(finalizeOboMode(metadata,
          tokenResult.accessToken)));
    }

    const tokenResult = await acquireAppToken(config, provider);
    const databaseAccessToken = tokenResult.accessToken;
    // No end-user identity means the database resolves the application
    // identity directly from the client-credential database access token.
    if (!endUserToken && !metadata.endUserName) {
      return getOrCreateScopedSecurityContext(unifiedProvider, config,
        tokenResult, () => createSecurityContext(
          buildContext({ databaseAccessToken })));
    }
    // App mode uses the application token to authorize database access and
    // carries a supplied end-user token directly in the EUSC. This is not an
    // OBO exchange; Azure and OCI both support this explicit identity form.
    if (endUserToken) {
      if (metadata.endUserName || metadata.contextId) {
        throwErr('App mode cannot combine endUserToken with endUserName or contextId.');
      }
      return getOrCreateScopedSecurityContext(unifiedProvider, config,
        tokenResult, () => createSecurityContext(finalizeAppTokenMode(metadata,
          databaseAccessToken)));
    }
    if (!metadata.endUserName) {
      throwErr("authFlow 'app' requires endUserName when endUserToken is supplied.");
    }
    return getOrCreateScopedSecurityContext(unifiedProvider, config,
      tokenResult, () => createSecurityContext(
        finalizeAppMode(metadata, databaseAccessToken)));
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
// confirms the same database token came from its cache, reuse the already
// encoded EUSC for this runWithContext() scope. The scope cache holds no
// plaintext token and is released when the async scope completes.
function getOrCreateScopedSecurityContext(provider, config, tokenResult,
  createContext) {
  if (config.contextResolution !== 'operation') {
    return createContext();
  }
  const cached = securityContextProvider._getScopedValue(provider);
  if (cached && tokenResult.isNewToken === false) {
    return cached;
  }
  const securityContext = createContext();
  securityContextProvider._setScopedValue(provider, securityContext);
  return securityContext;
}

function finalizeOboMode(metadata, databaseAccessToken) {
  const attributeResolution = resolveAttributesForRequest(metadata);
  const context = {
    databaseAccessToken,
    dataRoles: metadata.dataRoles,
    attributes: attributeResolution.payload
  };
  context.endUserToken = getEndUserToken(metadata);
  return buildContext(context);
}

function finalizeAppMode(metadata, databaseAccessToken) {
  const context = buildContext({
    databaseAccessToken,
    endUserName: metadata.endUserName,
    dataRoles: metadata.dataRoles,
    key: metadata.contextId,
    attributes: metadata.attributes
  });
  return context;
}

function finalizeAppTokenMode(metadata, databaseAccessToken) {
  return buildContext({
    databaseAccessToken,
    endUserToken: metadata.endUserToken,
    dataRoles: metadata.dataRoles,
    attributes: metadata.attributes
  });
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

function resolveAttributesForRequest(metadata) {
  if (!hasOwn(metadata, 'attributes')) {
    return { payload: undefined };
  }
  try {
    JSON.stringify(metadata.attributes);
  } catch (err) {
    const error = new Error('security context attributes must be JSON-serializable.');
    error.cause = err;
    throw error;
  }
  return { payload: metadata.attributes };
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
