/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   deepDataSecurityPool.js
 *
 * DESCRIPTION
 *   Demonstrates propagating an end-user security context to the database.
 *   This variant authenticates users against Azure AD, obtains an
 *   on-behalf-of (OBO) token, and attaches it directly to the connection used
 *   to service each request. All outbound HTTP calls honor the configured HTTPS
 *   proxy so the sample works from restricted networks.
 *
 *   Database environment variables:
 *     NODE_ORACLEDB_USER
 *       Database user for the connection pool.
 *     NODE_ORACLEDB_PASSWORD
 *       Password for NODE_ORACLEDB_USER.
 *     NODE_ORACLEDB_CONNECTIONSTRING
 *       TCPS connect string for the database service.
 *     NODE_ORACLEDB_WALLET_LOCATION
 *       Optional directory containing the database wallet.
 *     NODE_ORACLEDB_WALLET_PASSWORD
 *       Optional password protecting the database wallet.
 *     PORT
 *       Optional HTTP listener port; defaults to 7000.
 *     HTTPS_PROXY or HTTP_PROXY
 *       Optional proxy used for Azure HTTP requests. HTTPS_PROXY takes
 *       precedence when both are supplied.
 *
 *   Azure environment variables:
 *     AZURE_TENANT_ID
 *       Azure AD tenant for /login and application-token authentication.
 *     AZURE_CLIENT_ID
 *       Client ID of the confidential Azure application used by /login and
 *       /employees/app-default.
 *     AZURE_CLIENT_SECRET
 *       Client secret for AZURE_CLIENT_ID. Keep this value out of source code.
 *     AZURE_SCOPE
 *       Azure scope requested by /login and application-token authentication.
 *
 *       This example assumes AZURE_* identifies one confidential application
 *       that supports both flows: /login uses ROPC (client credentials plus a
 *       user password), while /employees/app-default uses client credentials
 *       only. If those flows require different Azure applications or scopes in
 *       your tenant, split this configuration into separate variable sets.
 *     DEEPSEC_AZURE_CLIENT_ID
 *       Client ID of the confidential Azure application performing the OBO
 *       exchange for /employees/obo and OBO-mode /employees/manual requests.
 *     DEEPSEC_AZURE_CLIENT_CREDENTIAL
 *       Client secret for DEEPSEC_AZURE_CLIENT_ID.
 *     DEEPSEC_AZURE_TENANT_ID
 *       Azure AD tenant hosting the OBO application.
 *     DEEPSEC_AZURE_SCOPE
 *       Scope requested for the OBO database access token.
 *
 * RUNNING THE EXAMPLE
 *
 *   1. Set the required database and Azure environment variables above.
 *
 *   2. From the node-oracledb repository root, start the server:
 *
 *        node examples/deepDataSecurityPool.js
 *
 *      The server listens on http://localhost:7000 by default. Set PORT to use
 *      a different port.
 *
 *   3. In a browser, open the application-token example:
 *
 *        http://localhost:7000/employees/app-default
 *
 *   4. To make an OBO request, first obtain an Azure user access token:
 *
 *        curl -X POST http://localhost:7000/login \
 *          -H 'Content-Type: application/json' \
 *          -d '{"username":"<user>","password":"<password>"}'
 *
 *      The response contains an access_token. Copy its value and send it as a
 *      bearer token:
 *
 *        ACCESS_TOKEN='eyJ...'
 *        curl http://localhost:7000/employees/obo \
 *          -H "Authorization: Bearer $ACCESS_TOKEN"
 *
 * ENDPOINTS
 *
 *   POST /login
 *      Authenticates the supplied Azure username and password, returning an
 *      access_token for use in OBO requests.
 *
 *      Request:
 *        curl -X POST http://localhost:7000/login \
 *          -H 'Content-Type: application/json' \
 *          -d '{"username":"alice@example.com","password":"your-password"}'
 *      Response:
 *         {
 *            "access_token": "eyJ..."
 *         }
 *
 *   GET /employees
 *      Uses OBO mode with an Authorization bearer token; otherwise uses an
 *      application token.
 *
 *   GET /employees/obo
 *      Uses OBO mode and requires an Authorization: Bearer <access_token>
 *      header.
 *
 *   GET /employees/app-default
 *      Uses an application token with the example's default user, roles, and
 *      context attributes.
 *
 *   GET /employees/manual
 *      Demonstrates direct context construction: it resolves an Azure app or
 *      OBO token, creates an EndUserSecurityContext, and calls
 *      connection.setEndUserSecurityContext() before executing SQL.
 *
 *      OBO request (uses the supplied user token):
 *        curl http://localhost:7000/employees/manual \
 *          -H 'Authorization: Bearer <access_token>'
 *
 *      Application-token request (no user token required):
 *        curl http://localhost:7000/employees/manual \
 *          -H 'x-auth-mode: app'
 *
 *****************************************************************************/
"use strict";

const http = require("http");
const { randomUUID } = require("crypto");
const { URL } = require("url");
const querystring = require("querystring");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { ProxyAgent, fetch } = require("undici");
const msal = require("@azure/msal-node");
const oracledb = require("oracledb");

const {
  NODE_ORACLEDB_USER,
  NODE_ORACLEDB_PASSWORD,
  NODE_ORACLEDB_CONNECTIONSTRING,
  NODE_ORACLEDB_WALLET_LOCATION,
  NODE_ORACLEDB_WALLET_PASSWORD,
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET,
  AZURE_SCOPE,
  DEEPSEC_AZURE_CLIENT_ID,
  DEEPSEC_AZURE_CLIENT_CREDENTIAL,
  DEEPSEC_AZURE_TENANT_ID,
  DEEPSEC_AZURE_SCOPE,
  HTTPS_PROXY,
  HTTP_PROXY,
} = process.env;

const TOKEN_URL = AZURE_TENANT_ID
  ? `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
  : null;
const DEEPSEC_TOKEN_URL = DEEPSEC_AZURE_TENANT_ID
  ? `https://login.microsoftonline.com/${DEEPSEC_AZURE_TENANT_ID}`
  : null;

const HTTP_PORT = process.env.PORT ? Number(process.env.PORT) : 7000;

const DEFAULT_PROXY = "http://www-sampleproxy.com:80/";
const proxyUrl = HTTPS_PROXY || HTTP_PROXY || DEFAULT_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null;
const azureNetworkClient = dispatcher ? createMsalNetworkClient() : null;

const AUTH_MODES = {
  OBO: "obo",
  APP: "app",
};

const axiosRequestDefaults = proxyAgent
  ? { httpsAgent: proxyAgent, proxy: false }
  : { proxy: false };

const { azureApp, azureObo } = createAzureTokenConfigs();

const handleOboRequest = withResolvedSecurityContext(
  resolveOboSecurityMetadata,
  createEmployeeListRouteHandler("obo-headers"),
);

const handleAppRequest = withResolvedSecurityContext(
  resolveAppSecurityMetadata,
  createEmployeeListRouteHandler("app-default"),
);

const handleManualRequest = withResolvedSecurityContext(
  resolveManualSecurityMetadata,
  createEmployeeListRouteHandler("manual-direct"),
);

// Creates the database pool and starts the HTTP server.
async function main() {
  const poolOptions = {
    user: NODE_ORACLEDB_USER || "db_usr",
    password: NODE_ORACLEDB_PASSWORD || "***",
    connectString: NODE_ORACLEDB_CONNECTIONSTRING,
    poolMin: 0,
    poolMax: 10,
    poolIncrement: 1,
  };

  if (NODE_ORACLEDB_WALLET_LOCATION) {
    poolOptions.walletLocation = NODE_ORACLEDB_WALLET_LOCATION;
  }

  if (NODE_ORACLEDB_WALLET_PASSWORD) {
    poolOptions.walletPassword = NODE_ORACLEDB_WALLET_PASSWORD;
  } else {
    poolOptions.walletPassword = "*****";
  }

  await oracledb.createPool(poolOptions);

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error("Request handling error", err);
      sendJson(res, 500, { error: "Internal Server Error" });
    });
  });

  server.listen(HTTP_PORT, () => {
    console.log(`Server listening on http://localhost:${HTTP_PORT}`);
  });

  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    server.close();
    try {
      await oracledb.getPool().close(0);
    } finally {
      process.exit(0);
    }
  });
}

// Builds the Azure client-credential and OBO token configurations.
function createAzureTokenConfigs() {
  const proxyClient = azureNetworkClient || undefined;

  const azureApp = {
    clientId: requireEnv("AZURE_CLIENT_ID", AZURE_CLIENT_ID),
    clientSecret: requireEnv("AZURE_CLIENT_SECRET", AZURE_CLIENT_SECRET),
    authority: `https://login.microsoftonline.com/${requireEnv(
      "AZURE_TENANT_ID",
      AZURE_TENANT_ID,
    )}`,
    scopes: requireEnv("AZURE_SCOPE", AZURE_SCOPE),
    proxy: proxyClient,
    authType: "azureserviceprincipal",
  };

  const azureObo = {
    clientId: requireEnv("DEEPSEC_AZURE_CLIENT_ID", DEEPSEC_AZURE_CLIENT_ID),
    clientSecret: requireEnv(
      "DEEPSEC_AZURE_CLIENT_CREDENTIAL",
      DEEPSEC_AZURE_CLIENT_CREDENTIAL,
    ),
    authority:
      DEEPSEC_TOKEN_URL ||
      `https://login.microsoftonline.com/${requireEnv(
        "DEEPSEC_AZURE_TENANT_ID",
        DEEPSEC_AZURE_TENANT_ID,
      )}`,
    scopes: requireEnv("DEEPSEC_AZURE_SCOPE", DEEPSEC_AZURE_SCOPE),
    proxy: proxyClient,
  };

  return { azureApp, azureObo };
}

// Routes incoming HTTP requests to login or employee-list handlers.
async function handleRequest(req, res) {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || `localhost:${HTTP_PORT}`}`,
  );

  if (req.method === "POST" && requestUrl.pathname === "/login") {
    await handleLogin(req, res);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/employees/obo") {
    await handleOboRequest(req, res, requestUrl);
    return;
  }

  if (
    req.method === "GET" &&
    requestUrl.pathname === "/employees/app-default"
  ) {
    await handleAppRequest(req, res, requestUrl);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/employees/manual") {
    await handleManualRequest(req, res, requestUrl);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/employees") {
    await handleOboRequest(req, res, requestUrl);
    return;
  }

  sendJson(res, 404, { error: "Not Found" });
}

// Authenticates a username and password, returning an Azure access token.
async function handleLogin(req, res) {
  try {
    const body = await readRequestBody(req);
    const { username, password } = body;

    if (!username || !password) {
      sendJson(res, 400, { error: "username and password required" });
      return;
    }

    const token = await getAzureToken(username, password);
    sendJson(res, 200, { access_token: token });
  } catch (err) {
    const status = err.response?.status ?? 401;
    const message =
      err.response?.data?.error_description ||
      err.response?.data?.error ||
      err.message ||
      "Authentication failed";
    sendJson(res, status, { error: message });
  }
}

// Collects OBO metadata and requires a bearer token when OBO is selected.
function resolveOboSecurityMetadata(req, res) {
  const authorization = req.headers.authorization;
  const hasUserToken =
    typeof authorization === "string" &&
    authorization.toLowerCase().startsWith("bearer ");
  const authMode = resolveAuthMode(req, hasUserToken);

  if (authMode === AUTH_MODES.OBO && !hasUserToken) {
    sendJson(res, 401, { error: "Missing Authorization header" });
    return null;
  }

  const userAccessToken = hasUserToken
    ? authorization.substring("Bearer ".length).trim()
    : null;

  const metadata = buildRequestMetadata(req, {
    authMode,
    endUserToken: userAccessToken || undefined,
  });

  return {
    metadata,
    context: { authMode, source: "obo-headers" },
  };
}

// Supplies default metadata for an application-token request.
function resolveAppSecurityMetadata(req, _res, requestUrl) {
  const metadata = buildRequestMetadata(req, { authMode: AUTH_MODES.APP });

  if (!metadata.contextId) {
    metadata.contextId = `app-${randomUUID()}`;
  }

  if (!metadata.dataRoles) {
    metadata.dataRoles = ["finance:reader"];
  }

  metadata.attributes = {
    ...(metadata.attributes || {}),
    endpoint: "app-default",
    requestPath: requestUrl.pathname,
  };

  if (!metadata.endUserName) {
    metadata.endUserName = "system-app";
  }

  return {
    metadata,
    context: { authMode: AUTH_MODES.APP, source: "app-default" },
  };
}

// Collects metadata for the direct context-construction demonstration endpoint.
// The route can use OBO mode with a bearer token or app mode with x-auth-mode: app.
function resolveManualSecurityMetadata(req) {
  // x-auth-mode explicitly selects app or OBO mode. Without it, the resolver
  // selects OBO when a bearer token is present and app mode otherwise.
  const metadata = buildRequestMetadata(req);
  metadata.framework = "manual-direct";
  metadata.attributes = {
    ...(metadata.attributes || {}),
    endpoint: "manual-direct",
  };

  return {
    metadata,
    context: { authMode: metadata.authMode, source: "manual-direct" },
  };
}

// Selects the requested auth mode, defaulting from bearer-token availability.
function resolveAuthMode(req, hasUserToken) {
  const raw = headerValue(req, "x-auth-mode");
  const normalized =
    typeof raw === "string" ? raw.trim().toLowerCase() : undefined;
  if (normalized === AUTH_MODES.APP || normalized === AUTH_MODES.OBO) {
    return normalized;
  }
  return hasUserToken ? AUTH_MODES.OBO : AUTH_MODES.APP;
}

// Uses Azure ROPC to obtain the caller's initial access token.
async function getAzureToken(username, password) {
  requireEnv("AZURE_TENANT_ID", AZURE_TENANT_ID);
  requireEnv("AZURE_CLIENT_ID", AZURE_CLIENT_ID);
  requireEnv("AZURE_CLIENT_SECRET", AZURE_CLIENT_SECRET);
  requireEnv("AZURE_SCOPE", AZURE_SCOPE);
  if (!TOKEN_URL) {
    throw new Error("Unable to determine Azure token URL.");
  }

  const response = await axios.post(
    TOKEN_URL,
    querystring.stringify({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      grant_type: "password",
      username,
      password,
      scope: AZURE_SCOPE,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
      ...axiosRequestDefaults,
    },
  );

  return response.data.access_token;
}

// Adapts the configured proxy to the interface expected by the Azure SDK.
function createMsalNetworkClient() {
  return {
    sendGetRequestAsync: (url, options, timeout) =>
      fetchWithProxy("GET", url, options, timeout),
    sendPostRequestAsync: (url, options, timeout) =>
      fetchWithProxy("POST", url, options, timeout),
  };
}

// Sends an Azure SDK HTTP request through the configured proxy with a timeout.
async function fetchWithProxy(method, url, options = {}, timeout = 30000) {
  const controller = new globalThis.AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const requestOptions = {
      method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
    };
    if (dispatcher) {
      requestOptions.dispatcher = dispatcher;
    }

    const response = await fetch(url, requestOptions);
    const bodyText = await response.text();
    let body;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = bodyText;
    }
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Builds security metadata from request headers and caller-provided defaults.
function buildRequestMetadata(req, baseMetadata = {}) {
  const metadata = { ...baseMetadata };

  const requestedMode = headerValue(req, "x-auth-mode");
  if (requestedMode) {
    const normalized = requestedMode.trim().toLowerCase();
    if (normalized === AUTH_MODES.APP || normalized === AUTH_MODES.OBO) {
      metadata.authMode = normalized;
    }
  }

  const headerEndUserToken = headerValue(req, "x-end-user-token");
  if (headerEndUserToken) {
    metadata.endUserToken = headerEndUserToken;
  }

  const endUserName = headerValue(req, "x-end-user-name");
  if (endUserName) {
    metadata.endUserName = endUserName;
  }

  const dataRolesHeader = headerValue(req, "x-data-roles");
  if (dataRolesHeader) {
    metadata.dataRoles = dataRolesHeader
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const contextId = headerValue(req, "x-context-id");
  if (contextId) {
    metadata.contextId = contextId;
  }

  const attributesHeader = headerValue(req, "x-security-attributes");
  if (attributesHeader) {
    try {
      const parsed = JSON.parse(attributesHeader);
      if (parsed && typeof parsed === "object") {
        metadata.attributes = parsed;
      }
    } catch {
      metadata.attributes = { raw: attributesHeader };
    }
  }

  if (!metadata.endUserToken && !metadata.endUserName) {
    metadata.endUserName =
      metadata.authMode === AUTH_MODES.APP ? "system-app" : "anonymous";
  }

  return metadata;
}

// Returns one request-header value, handling Node's repeated-header form.
function headerValue(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[value.length - 1] : value;
}

// Reads and parses a JSON request body while enforcing a size limit.
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Request body must be JSON"));
      }
    });

    req.on("error", reject);
  });
}

// Returns a required environment value or reports the missing setting.
function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }
  return value;
}

// Sends a JSON response with the supplied HTTP status.
function sendJson(res, status, payload) {
  const json = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

// Creates a handler that applies a context, lists employees, and releases the connection.
function createEmployeeListRouteHandler(sourceLabel) {
  return async function employeeListRoute(req, res, requestUrl, context = {}) {
    try {
      const conn = await oracledb.getConnection();
      try {
        conn.setEndUserSecurityContext(context.securityContext);
        const result = await conn.execute("select * from hr.employees");
        const payload = {
          requestId: randomUUID(),
          httpMethod: req.method,
          requestPath: requestUrl.pathname,
          source: context.source || sourceLabel,
          securityContext: context.securityContext,
          employees: result.rows,
          authMode: context.authMode,
        };
        sendJson(res, 200, payload);
      } finally {
        conn.clearEndUserSecurityContext();
        await conn.close();
      }
    } catch (err) {
      console.error(`Failed to handle ${sourceLabel} request`, err);
      sendJson(res, 500, { error: err.message || "Internal Server Error" });
    }
  };
}

// Resolves request metadata into a database context before invoking a route handler.
function withResolvedSecurityContext(metadataFactory, handler) {
  return async function securityContextWrapper(req, res, ...args) {
    const metadataResult = await metadataFactory(req, res, ...args);
    if (!metadataResult) {
      return;
    }
    const { metadata, context = {} } = metadataResult;
    const securityContext = await resolveSecurityContext(metadata);
    return handler(req, res, ...args, {
      ...context,
      authMode: metadata.authMode ?? context.authMode,
      securityContext,
    });
  };
}

// Acquires an app or OBO database token and constructs its direct connection context.
async function resolveSecurityContext(metadata) {
  const endUserToken = metadata.endUserToken;
  const authMode =
    metadata.authMode || (endUserToken ? AUTH_MODES.OBO : AUTH_MODES.APP);

  if (authMode === AUTH_MODES.APP) {
    metadata.authMode = AUTH_MODES.APP;
    return new oracledb.EndUserSecurityContext({
      databaseAccessToken: await getApplicationToken(azureApp),
      endUserName: metadata.endUserName || "system-app",
      ...(metadata.dataRoles && { dataRoles: metadata.dataRoles }),
      ...(metadata.contextId && { key: metadata.contextId }),
      ...(metadata.attributes && { attributes: metadata.attributes }),
    });
  }

  if (!endUserToken) {
    throw new Error("End user token is required for on-behalf-of exchange.");
  }

  const databaseAccessToken = await getOnBehalfOfToken(endUserToken, azureObo);
  metadata.authMode = AUTH_MODES.OBO;
  return new oracledb.EndUserSecurityContext({
    databaseAccessToken,
    endUserToken,
    ...(metadata.dataRoles && { dataRoles: metadata.dataRoles }),
    ...(metadata.attributes && { attributes: metadata.attributes }),
  });
}

// Acquires an application token for the database using client credentials.
async function getApplicationToken(config) {
  const client = createMsalClient(config);
  const result = await client.acquireTokenByClientCredential({
    scopes: Array.isArray(config.scopes) ? config.scopes : [config.scopes],
  });
  if (!result?.accessToken) {
    throw new Error("Failed to acquire application token from Azure.");
  }
  return result.accessToken;
}

// Exchanges the caller's bearer token for an OBO token used by the database.
async function getOnBehalfOfToken(endUserToken, config) {
  if (!endUserToken) {
    throw new Error("End user token is required for on-behalf-of exchange.");
  }
  const client = createMsalClient(config);
  const result = await client.acquireTokenOnBehalfOf({
    oboAssertion: endUserToken,
    scopes: Array.isArray(config.scopes) ? config.scopes : [config.scopes],
    skipCache: true,
  });
  if (!result?.accessToken) {
    throw new Error("Failed to acquire on-behalf-of access token from Azure.");
  }
  return result.accessToken;
}

// Creates an Azure confidential-client instance and applies the optional proxy.
function createMsalClient(config) {
  const msalConfig = {
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      clientSecret: config.clientSecret,
    },
  };
  if (config.proxy) {
    msalConfig.system = { networkClient: config.proxy };
  }
  return new msal.ConfidentialClientApplication(msalConfig);
}

main().catch((err) => {
  console.error("Failed to start example", err);
  process.exit(1);
});
