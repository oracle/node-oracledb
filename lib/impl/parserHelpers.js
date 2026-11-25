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

const {
  createNVPair,
  findNVPair,
  findNVPairRecurse
} = require('../thin/sqlnet/nvStrToNvPair.js');
const EZConnectResolver = require('../thin/sqlnet/ezConnectResolver.js');
const { NLParamParser, tnsnamesFilePath } = require('../thin/sqlnet/paramParser.js');
const errors = require('../errors.js');
const { getTokenAuthKey } = require('../util.js');
const { getSecurityParams } = require('./tokenAuthHelpers.js');
const process = require('process');

const NJS_PREFIX = 'njs.';
const RHS_LIST = 2;
const NUMBER_KEYS = new Set([
  'poolIncrement', 'poolMax', 'poolMin', 'poolTimeout', 'queueTimeout',
  'maxLifetimeSession', 'poolMaxPerShard', 'poolPingInterval',
  'poolPingTimeout', 'stmtCacheSize', 'mode', 'getMode'
]);

const BOOLEAN_KEYS = new Set([
  'events', 'externalAuth', 'homogeneous', 'useTcpFastOpen',
  'disableOob', 'sodaMetaDataCache', 'useEzTLS'
]);

const STRING_KEYS = new Set([
  'driverName', 'edition', 'machine', 'osUser', 'program', 'terminal'
]);

const nlParamParser = new NLParamParser();
const childLookupCache = new WeakMap();

/**
 * Formats a boolean value as a string 'true' or 'false'.
 * @param {boolean} value - The boolean value to format.
 * @returns {string} 'true' if value is true, 'false' otherwise.
 */
function formatBooleanTrueFalse(value) {
  return value ? 'true' : 'false';
}

const CONNECT_OVERRIDES = [
  // DESCRIPTION-level parameters
  { opt: 'sdu', section: ['DESCRIPTION', 'SDU'], fmt: String },
  { opt: 'failover', section: ['DESCRIPTION', 'FAILOVER'] },
  { opt: 'loadBalance', section: ['DESCRIPTION', 'LOAD_BALANCE'] },
  { opt: 'retryCount', section: ['DESCRIPTION', 'RETRY_COUNT'], fmt: String },
  { opt: 'retryDelay', section: ['DESCRIPTION', 'RETRY_DELAY'], fmt: String },
  { opt: 'sourceRoute', section: ['DESCRIPTION', 'SOURCE_ROUTE'] },
  { opt: 'transportConnectTimeout', section: ['DESCRIPTION', 'TRANSPORT_CONNECT_TIMEOUT'], fmt: String },
  { opt: 'useSNI', section: ['DESCRIPTION', 'USE_SNI'], fmt: formatBooleanTrueFalse },
  { opt: 'useEzTLS', section: ['DESCRIPTION', 'SECURITY', 'USE_EZ_TLS'], fmt: formatBooleanTrueFalse },

  // CONNECT_DATA parameters
  { opt: 'poolBoundary', section: ['DESCRIPTION', 'CONNECT_DATA', 'POOL_BOUNDARY'] },
  { opt: 'poolConnectionClass', section: ['DESCRIPTION', 'CONNECT_DATA', 'POOL_CONNECTION_CLASS'] },
  { opt: 'poolName', section: ['DESCRIPTION', 'CONNECT_DATA', 'POOL_NAME'] },
  { opt: 'poolPurity', section: ['DESCRIPTION', 'CONNECT_DATA', 'POOL_PURITY'] },
  { opt: 'expireTime', section: ['DESCRIPTION', 'CONNECT_DATA', 'EXPIRE_TIME'], fmt: String },

  // SECURITY parameters
  { opt: 'walletLocation', section: ['DESCRIPTION', 'SECURITY', 'MY_WALLET_DIRECTORY'] },
  { opt: 'sslServerCertDN', section: ['DESCRIPTION', 'SECURITY', 'SSL_SERVER_CERT_DN'] },
  { opt: 'sslServerDNMatch', section: ['DESCRIPTION', 'SECURITY', 'SSL_SERVER_DN_MATCH'] },

  // ADDRESS parameters
  { opt: 'httpsProxy', section: ['DESCRIPTION', 'ADDRESS', 'HTTPS_PROXY'], perAddress: true },
  { opt: 'httpsProxyPort', section: ['DESCRIPTION', 'ADDRESS', 'HTTPS_PROXY_PORT'], perAddress: true, fmt: String }
];

/**
 * Returns the uppercase name of the node if it exists and is a string.
 * @param {Object} node - The node to get the name from.
 * @returns {string|undefined} Uppercase name or undefined.
 */
function getUpperName(node) {
  if (!node || typeof node.name !== 'string') {
    return undefined;
  }
  return node.name.toUpperCase();
}
// Drops the cached child-name lookup for a node so the next search rebuilds it after structural changes.
function invalidateChildLookup(node) {
  if (node) {
    childLookupCache.delete(node);
  }
}
// Builds (or reuses) a per-parent map from uppercase child names to their node arrays for quick lookups.
function getChildLookup(parent) {
  if (!parent || !Array.isArray(parent.list) || parent.list.length === 0) {
    return null;
  }
  let lookup = childLookupCache.get(parent);
  if (!lookup) {
    lookup = Object.create(null);
    for (const child of parent.list) {
      const key = getUpperName(child);
      if (!key) {
        continue;
      }
      if (lookup[key]) {
        lookup[key].push(child);
      } else {
        lookup[key] = [child];
      }
    }
    childLookupCache.set(parent, lookup);
  }
  return lookup;
}
// Uses the cached lookup to return the first child whose name matches the provided string, or undefined if absent.
function findFirstChild(parent, name) {
  if (typeof name !== 'string') {
    return undefined;
  }
  const lookup = getChildLookup(parent);
  if (!lookup) {
    return undefined;
  }
  const key = name.toUpperCase();
  const list = lookup[key];
  return list ? list[0] : undefined;
}

/**
 * Collects all DESCRIPTION nodes from the root NVPair tree.
 * Traverses the tree using a stack to find DESCRIPTION nodes.
 * @param {Object} root - The root NVPair node.
 * @returns {Array} Array of DESCRIPTION nodes.
 */
function collectDescriptions(root) {
  if (!root || typeof root.name !== 'string') {
    return [];
  }
  const stack = [root];
  const descriptions = [];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node.name !== 'string') {
      continue;
    }
    const name = node.name.toUpperCase();
    if (name === 'DESCRIPTION' && node.rhsType === RHS_LIST) {
      descriptions.push(node);
      continue;
    }
    if (name === 'DESCRIPTION_LIST' && node.list) {
      for (let i = 0; i < node.list.length; i++) {
        stack.push(node.list[i]);
      }
    }
  }
  return descriptions;
}

/**
 * Collects all descendants with the given name from an NVPair tree.
 * @param {Object} root - The root NVPair node.
 * @param {string} name - The node name to find.
 * @returns {Array} Matching nodes.
 */
function collectNodes(root, name) {
  if (!root || typeof root.name !== 'string') {
    return [];
  }
  const stack = [root];
  const nodes = [];
  const targetName = name.toUpperCase();
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node.name !== 'string') {
      continue;
    }
    if (node.name.toUpperCase() === targetName) {
      nodes.push(node);
    }
    if (node.rhsType === RHS_LIST && node.list) {
      for (let i = 0; i < node.list.length; i++) {
        stack.push(node.list[i]);
      }
    }
  }
  return nodes;
}

/**
 * Ensures a child node with the given name exists under the parent.
 * Creates it if necessary.
 * @param {Object} parent - The parent NVPair node.
 * @param {string} name - The name of the child node.
 * @returns {Object} The child node.
 */
function ensureNode(parent, name) {
  const key = name.toUpperCase();
  if (parent.rhsType === RHS_LIST && Array.isArray(parent.list)) {
    const cached = findFirstChild(parent, key);
    if (cached) {
      return cached;
    }
  }
  const created = new parent.constructor(key);
  parent.addListElement(created);
  invalidateChildLookup(parent);
  return created;
}

/**
 * Finds all child nodes with the given name under the parent.
 * @param {Object} parent - The parent NVPair node.
 * @param {string} name - The name to search for.
 * @returns {Array} Array of matching child nodes.
 */
function findChildren(parent, name) {
  if (typeof name !== 'string') {
    return [];
  }
  const lookup = getChildLookup(parent);
  if (!lookup) {
    return [];
  }
  const key = name.toUpperCase();
  const matches = lookup[key];
  if (!matches || matches.length === 0) {
    return [];
  }
  return matches.slice();
}

/**
 * Places a parameter node in the correct position within a DESCRIPTION list.
 * Positions before ADDRESS, ADDRESS_LIST, or CONNECT_DATA.
 * @param {Object} description - The DESCRIPTION NVPair node.
 * @param {Object} node - The parameter node to place.
 */
function placeDescriptionParam(description, node) {
  const list = description.list;
  const idx = list.indexOf(node);
  if (idx > -1) {
    list.splice(idx, 1);
  }
  let pos = 0;
  while (pos < list.length) {
    const childName = getUpperName(list[pos]);
    if (childName === 'ADDRESS' || childName === 'ADDRESS_LIST' || childName === 'CONNECT_DATA') {
      break;
    }
    pos++;
  }
  list.splice(pos, 0, node);
  invalidateChildLookup(description);
}

/**
 * Applies overrides from the options object to the connectString.
 * Handles NVPair format, TNS alias resolution, and updates the options.connectString in place.
 * Only adds parameters if not already present in the descriptor.
 * Supports EZConnect strings, TNS aliases (via tnsnames.ora), and full descriptors.
 *
 * @param {Object} options - The connection options object containing connectString and override parameters.
 * @example
 * // Example with full descriptor
 * const options = {
 *   connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=host)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=service)))',
 *   sdu: 8192,
 *   retryCount: 3
 * };
 * await applyConnectStringOverrides(options);
 * // options.connectString now includes (SDU=8192) and (RETRY_COUNT=3) if not already present
 *
 * // Example with TNS alias
 * const options = {
 *   connectString: 'mydb',
 *   configDir: '/path/to/network/admin',
 *   sdu: 8192
 * };
 * await applyConnectStringOverrides(options);
 * // Resolves 'mydb' from tnsnames.ora and applies SDU if not present
 *
 * // Example with EZConnect
 * const options = {
 *   connectString: 'tcps://host:1521/service',
 *   walletLocation: '/path/to/wallet'
 * };
 * await applyConnectStringOverrides(options);
 * // Converts to descriptor and adds (SECURITY=(MY_WALLET_DIRECTORY=/path/to/wallet))
 */
async function applyConnectStringOverrides(options) {
  const connectString = options.connectString;
  const cachedRoot = await getCachedConnectStringNVPair(options, connectString);
  // Keep the parsed source tree unchanged. Normalized options may share that
  // cached tree with other connection attempts, each of which can apply a
  // different set of overrides.
  const root = createNVPair(cachedRoot.toString());
  const descriptions = collectDescriptions(root);
  if (!descriptions.length) return;

  const configured = [];
  for (const def of CONNECT_OVERRIDES) {
    const raw = options[def.opt];
    if (raw === undefined) {
      continue;
    }
    // Treat walletLocation=SYSTEM as "use system certs" -> do not inject into descriptor
    if (def.opt === 'walletLocation' && typeof raw === 'string' && raw.trim().toUpperCase() === 'SYSTEM') {
      continue;
    }
    const formatter = def.fmt || (v => v);
    const value = formatter(raw);
    configured.push({ def, value });
  }

  if (!configured.length) return;

  for (const description of descriptions) {
    for (const entry of configured) {
      const def = entry.def;
      const value = entry.value;
      const { section, perAddress } = def;
      if (perAddress) {
        const addresses = findChildren(description, section[1]);
        if (!addresses.length) continue;
        for (const addr of addresses) {
          const existingNode = findFirstChild(addr, section[2]);
          if (!existingNode) {
            ensureNode(addr, section[2]).setAtom = value;
          }
        }
        continue;
      }
      let node = description;
      let existing = false;
      for (let k = 1; k < section.length; k++) {
        const child = findFirstChild(node, section[k]);
        if (!child) break;
        node = child;
        if (k === section.length - 1) existing = true;
      }
      if (!existing) {
        node = description;
        for (let k = 1; k < section.length; k++) {
          node = ensureNode(node, section[k]);
        }
        node.setAtom = value;
        if (section.length === RHS_LIST && section[0] === 'DESCRIPTION') {
          placeDescriptionParam(description, node);
        }
      }
    }
  }

  options.connectString = root.toString();
  setConnectStringNVPairCache(options, root, options.connectString);
}

/**
 * Merges extended parameters from the EZConnect resolver into the options object.
 * Only processes keys starting with 'njs.' and coerces values based on predefined sets.
 * @param {Object} options - The options object to merge into.
 * @param {Object} resolver - The EZConnect resolver containing connection properties.
 * @returns {Object} The updated options object.
 * @example
 * const resolver = new EZConnectResolver('tcp://host:port/service?njs.stmtCacheSize=10&njs.events=true');
 * const options = {};
 * const merged = mergeExtendedParams(options, resolver);
 * // merged = { stmtCacheSize: 10, events: true }
 */
function mergeExtendedParams(options, resolver) {
  for (const [rawKey, rawValue] of resolver.connectionProps.entries()) {
    let key = rawKey;
    if (key.startsWith(NJS_PREFIX)) {
      key = key.slice(NJS_PREFIX.length);
    } else {
      continue;
    }
    let value = rawValue;
    if (NUMBER_KEYS.has(key)) {
      value = Number(rawValue);
      if (isNaN(value) || !Number.isInteger(value)) continue;
    } else if (BOOLEAN_KEYS.has(key)) {
      const lower = rawValue.toLowerCase();
      value = (lower === 'true' || lower === 'on' || lower === 'yes');
    } else if (STRING_KEYS.has(key)) {
      value = rawValue;
    } else {
      continue;
    }
    options[key] = value;
  }
  return options;
}

/**
 * Resolves an EZConnect string to a connect descriptor.
 * @param {string} connStr - The EZConnect string.
 * @returns {Object} Object containing connectString and resolver.
 * @example
 * const result = getConnectDescriptorFromEZConnect('tcp://host:1521/service');
 * // result = { connectString: '(DESCRIPTION=...)' , resolver: EZConnectResolver instance }
 */
function getConnectDescriptorFromEZConnect(connStr) {
  if (connStr && ((connStr.indexOf(')') == -1) || (connStr.indexOf('(') != 0))) {
    if (connStr.indexOf(':') !== -1 || connStr.indexOf('/') !== -1) {
      const resolver = new EZConnectResolver(connStr);
      return { connectString: resolver.getResolvedUrl(), resolver };
    }
  }
  return { connectString: connStr, resolver: null };
}

/**
 * Resolves a connect string, handling EZConnect or TNS aliases.
 * @param {string} connectString - The connect string to resolve.
 * @param {string} configDir - Directory for tnsnames.ora.
 * @returns {Promise<Object|string>} Resolved connect descriptor or string.
 * @example
 * const resolved = await resolveConnectStr('mydb', '/path/to/network/admin');
 * // Resolves 'mydb' from tnsnames.ora in the given directory
 */
async function resolveConnectStr(connectString, configDir) {
  const connStr = connectString.trim();
  let resolvedVal = connStr;
  if ((connStr.indexOf(')') === -1) || (connStr.indexOf('(') != 0)) {
    if ((connStr.indexOf(':') != -1) || (connStr.indexOf('/') != -1)) {
      const ezcnObj = new EZConnectResolver(connStr);
      resolvedVal = ezcnObj.getResolvedUrl();
      return resolvedVal;
    } else {
      //try tns alias
      const namesFilePath = tnsnamesFilePath(configDir);
      const p = await nlParamParser.initializeNlpa(namesFilePath);
      resolvedVal = p.get(connStr.toUpperCase());
      if (!resolvedVal)
        errors.throwErr(errors.ERR_TNS_ENTRY_NOT_FOUND, connStr, configDir ? configDir + '/tnsnames.ora' : process.env.TNS_ADMIN + '/tnsnames.ora');
      if (resolvedVal.rhsType == 1) {
        const rString = resolvedVal.atom;
        if ((rString.indexOf(':') != -1) || (rString.indexOf('/') != -1)) {
          return new EZConnectResolver(rString).getResolvedUrl();
        }
      }
      resolvedVal = resolvedVal.getListElement(0);
    }

  }
  return resolvedVal;
}

/**
 * Resolves and parses a connect string into its NVPair representation.
 * @param {string} connectString - A descriptor, Easy Connect string, or TNS alias.
 * @param {string} configDir - Directory for tnsnames.ora.
 * @returns {Promise<Object>} The resolved NVPair tree.
 */
async function getConnectStringNVPair(connectString, configDir) {
  const resolved = await resolveConnectStr(connectString, configDir);
  return typeof resolved === 'string' ? createNVPair(resolved) : resolved;
}

function getConnectStringNVPairCacheKey(options, connectString) {
  return JSON.stringify([
    connectString,
    options.configDir,
    process.env.TNS_ADMIN
  ]);
}

function setConnectStringNVPairCache(options, root, source) {
  Object.defineProperties(options, {
    _connectStringNVPair: {
      value: root,
      writable: true,
      configurable: true
    },
    _connectStringNVPairSource: {
      value: source,
      writable: true,
      configurable: true
    },
    _connectStringNVPairCacheKey: {
      value: getConnectStringNVPairCacheKey(options, source),
      writable: true,
      configurable: true
    }
  });
}

/**
 * Returns the cached NVPair tree when it matches the current connect string
 * and TNS configuration, otherwise resolves the current string. Connect
 * strings used for redirects are parsed without replacing the cache. This
 * cache is intended for one connection-configuration lifecycle; it does not
 * track changes to the contents of tnsnames.ora. Use a fresh options object
 * to resolve a TNS alias again after its entry changes.
 * @param {Object} options - Connection options containing the NVPair cache.
 * @param {string} connectString - Optional connect string to resolve.
 * @returns {Promise<Object>} The resolved NVPair tree.
 */
async function getCachedConnectStringNVPair(options, connectString) {
  const source = connectString === undefined ?
    (options.connectString || options.connectionString) : connectString;
  const currentSource = options.connectString || options.connectionString;
  const isCurrentSource = source === currentSource;
  const cacheKey = getConnectStringNVPairCacheKey(options, source);

  if (isCurrentSource && options._connectStringNVPair &&
      options._connectStringNVPairSource === source &&
      options._connectStringNVPairCacheKey === cacheKey) {
    return options._connectStringNVPair;
  }

  const root = await getConnectStringNVPair(source, options.configDir);
  if (isCurrentSource) {
    setConnectStringNVPairCache(options, root, source);
  }
  return root;
}

/**
 * Returns TOKEN_AUTH settings from the SECURITY sections of DESCRIPTION
 * entries in a connect string. The connect string may be a descriptor,
 * Easy Connect Plus string, or TNS alias.
 * @param {string} connectString - The connect string to inspect.
 * @param {string} configDir - Directory for tnsnames.ora.
 * @param {Object} options - Optional connection options containing the cache.
 * @returns {Promise<Object|null>} Token parameters with resolved address
 * protocols and server DN match settings.
 */
async function getTokenAuthParams(connectString, configDir, options) {
  if (!connectString) {
    return null;
  }
  const root = options ?
    await getCachedConnectStringNVPair(options, connectString) :
    await getConnectStringNVPair(connectString, configDir);
  const descriptions = [];
  for (const description of collectDescriptions(root)) {
    const params = getSecurityParams(description);
    descriptions.push({
      description,
      params,
      addressProtocols: [],
      tlsServerDNMatches: []
    });
  }
  const tokenDescriptions = descriptions.filter(desc =>
    Object.prototype.hasOwnProperty.call(desc.params, 'token_auth'));
  if (tokenDescriptions.length === 0) {
    return null;
  }

  for (const tokenDesc of tokenDescriptions) {
    const desc = tokenDesc.description;
    const addresses = collectNodes(desc, 'ADDRESS');
    if (addresses.length === 0) {
      tokenDesc.addressProtocols.push(undefined);
    }
    for (const address of addresses) {
      tokenDesc.addressProtocols.push(findNVPair(address, 'PROTOCOL')?.atom);
    }

    const tlsDNMatchKey = 'tls_server_dn_match';
    const sslDNMatchKey = 'ssl_server_dn_match';
    if (Object.prototype.hasOwnProperty.call(tokenDesc.params,
      tlsDNMatchKey)) {
      tokenDesc.tlsServerDNMatches.push(tokenDesc.params[tlsDNMatchKey]);
    } else if (Object.prototype.hasOwnProperty.call(tokenDesc.params,
      sslDNMatchKey)) {
      tokenDesc.tlsServerDNMatches.push(tokenDesc.params[sslDNMatchKey]);
    } else {
      tokenDesc.tlsServerDNMatches.push(undefined);
    }
  }

  return {
    params: tokenDescriptions[0].params,
    descriptionCount: descriptions.length,
    descriptions: tokenDescriptions.map(desc => ({
      params: desc.params,
      key: getTokenAuthKey(desc.params),
      addressProtocols: desc.addressProtocols,
      tlsServerDNMatches: desc.tlsServerDNMatches
    })),
    addressProtocols: tokenDescriptions.flatMap(desc => desc.addressProtocols),
    tlsServerDNMatches: tokenDescriptions.flatMap(desc => desc.tlsServerDNMatches)
  };
}

module.exports = {
  applyConnectStringOverrides,
  mergeExtendedParams,
  getConnectDescriptorFromEZConnect,
  resolveConnectStr,
  getCachedConnectStringNVPair,
  getConnectStringNVPair,
  getTokenAuthParams
};
