/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * NAME
 *   deepDataSecurityPoolWithPlugins.js
 *
 * DESCRIPTION
 *   HTTP employee-listing example that configures end-user security with the
 *   token plugins. Unlike deepDataSecurityPool.js, this example does not
 *   acquire tokens or call setEndUserSecurityContext() itself. The
 *   endUserSecParams option passed to createPool() registers
 *   the provider. runWithContext() scopes the inbound request metadata; the
 *   driver resolves and applies the database context. Its lifetime is selected
 *   with DEEPSEC_CONTEXT_RESOLUTION.
 *
 * ENVIRONMENT VARIABLES
 *   NODE_ORACLEDB_USER, NODE_ORACLEDB_PASSWORD,
 *   NODE_ORACLEDB_CONNECTIONSTRING, NODE_ORACLEDB_WALLET_LOCATION,
 *   NODE_ORACLEDB_WALLET_PASSWORD
 *     Database pool configuration. The connection string must use TCPS.
 *   DEEPSEC_AZURE_TENANT_ID, DEEPSEC_AZURE_CLIENT_ID,
 *   DEEPSEC_AZURE_CLIENT_CREDENTIAL, DEEPSEC_AZURE_SCOPE
 *     One Azure configuration used for both application-token and OBO flows.
 *     A scoped endUserToken selects OBO; otherwise application-token access is
 *     used. Request metadata can override the static endUserName, dataRoles,
 *     and attributes in endUserSecParams.
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SCOPE
 *     Azure ROPC login settings used only by POST /login to obtain a browser
 *     access token for the OBO examples.
 *   HTTPS_PROXY or HTTP_PROXY
 *     Optional proxy for Azure calls. PORT defaults to 7000.
 *   DEEPSEC_CONTEXT_RESOLUTION
 *     Optional "connection" (default) or "operation". Connection resolution
 *     keeps the first resolved context on a borrowed connection until it is
 *     closed. Operation resolution applies and clears a context for every SQL
 *     operation; use it when an ORM/dialect owns and reuses connections across
 *     HTTP requests.
 *
 * RUN
 *   # Connection-level resolution (the default for this example)
 *   DEEPSEC_CONTEXT_RESOLUTION=connection \
 *     node examples/deepDataSecurityPoolWithPlugins.js
 *
 *   # Per-operation resolution, useful with ORM-managed connections
 *   DEEPSEC_CONTEXT_RESOLUTION=operation \
 *     node examples/deepDataSecurityPoolWithPlugins.js
 *
 * ENDPOINTS
 *   POST /login                    Obtain a user bearer token with ROPC.
 *   GET  /employees                OBO with a bearer token; app fallback otherwise.
 *   GET  /employees/obo            OBO; requires Authorization: Bearer <token>.
 *   GET  /employees/app-default    App-token context.
 *
 *   curl http://localhost:7000/employees/obo \
 *     -H "Authorization: Bearer $ACCESS_TOKEN"
 *
 *****************************************************************************/
"use strict";

const http = require("http");
const { URL } = require("url");
const querystring = require("querystring");
const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { ProxyAgent, fetch } = require("undici");
const oracledb = require("oracledb");

// Loading the provider registers the createPool() configuration hook.
require("../plugins/token/endUserSecurityProvider");

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
  DEEPSEC_AZURE_TENANT_ID,
  DEEPSEC_AZURE_CLIENT_ID,
  DEEPSEC_AZURE_CLIENT_CREDENTIAL,
  DEEPSEC_AZURE_SCOPE,
  HTTPS_PROXY,
  HTTP_PROXY,
} = process.env;

const HTTP_PORT = process.env.PORT ? Number(process.env.PORT) : 7000;
const TOKEN_URL = AZURE_TENANT_ID
  ? `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
  : null;
const proxyUrl = HTTPS_PROXY || HTTP_PROXY;
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null;
const azureNetworkClient = dispatcher ? createMsalNetworkClient() : undefined;
const axiosRequestDefaults = proxyAgent
  ? { httpsAgent: proxyAgent, proxy: false }
  : { proxy: false };

const AUTH_MODES = { OBO: "obo", APP: "app" };
const CONTEXT_RESOLUTION = normalizeContextResolution(
  process.env.DEEPSEC_CONTEXT_RESOLUTION || "connection",
);

// createPool() supplies this config to the plugin's process configuration hook.
const unifiedConfig = {
  user: requireEnv("NODE_ORACLEDB_USER", NODE_ORACLEDB_USER),
  password: requireEnv("NODE_ORACLEDB_PASSWORD", NODE_ORACLEDB_PASSWORD),
  connectString: requireEnv(
    "NODE_ORACLEDB_CONNECTIONSTRING",
    NODE_ORACLEDB_CONNECTIONSTRING,
  ),
  poolMin: 0,
  poolMax: 10,
  poolIncrement: 1,
  endUserSecParams: {
    spiType: "azure",
    authFlow: "onBehalfOf",
    // "connection" is safe here because each request borrows and closes its
    // own connection. Set DEEPSEC_CONTEXT_RESOLUTION=operation when another
    // library retains and reuses a node-oracledb connection across requests.
    contextResolution: CONTEXT_RESOLUTION,
    clientId: requireEnv("DEEPSEC_AZURE_CLIENT_ID", DEEPSEC_AZURE_CLIENT_ID),
    clientSecret: requireEnv(
      "DEEPSEC_AZURE_CLIENT_CREDENTIAL", DEEPSEC_AZURE_CLIENT_CREDENTIAL,
    ),
    authority: `https://login.microsoftonline.com/${requireEnv(
      "DEEPSEC_AZURE_TENANT_ID", DEEPSEC_AZURE_TENANT_ID,
    )}`,
    scopes: requireEnv("DEEPSEC_AZURE_SCOPE", DEEPSEC_AZURE_SCOPE),
    proxy: azureNetworkClient,
    cacheOptions: { enabled: true },
    endUserName: "bks1",
    dataRoles: ["HR_DYNAMIC_ROLE1", "FINANCE_DYNAMIC_ROLE1"],
    attributes: { "EUC.HCM": { p1: 50, p2: "test1" } },
  },
};

if (NODE_ORACLEDB_WALLET_LOCATION) {
  unifiedConfig.walletLocation = NODE_ORACLEDB_WALLET_LOCATION;
}
if (NODE_ORACLEDB_WALLET_PASSWORD) {
  unifiedConfig.walletPassword = NODE_ORACLEDB_WALLET_PASSWORD;
}

async function main() {
  await oracledb.createPool(unifiedConfig);
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error("Request handling error", err);
      if (!res.headersSent && !res.writableEnded) {
        sendJson(res, 500, { error: "Internal Server Error" });
      }
    });
  });
  server.listen(HTTP_PORT, () => {
    console.log(`Server listening on http://localhost:${HTTP_PORT}`);
  });
  process.on("SIGINT", async () => {
    server.close();
    await oracledb.getPool().close(0);
    process.exit(0);
  });
}

async function handleRequest(req, res) {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || `localhost:${HTTP_PORT}`}`,
  );
  if (req.method === "POST" && requestUrl.pathname === "/login") {
    await handleLogin(req, res);
  } else if (req.method === "GET" && requestUrl.pathname === "/employees/obo") {
    await listEmployees(req, res, { requireBearer: true });
  } else if (req.method === "GET" && requestUrl.pathname === "/employees/app-default") {
    await listEmployees(req, res, { authMode: AUTH_MODES.APP });
  } else if (req.method === "GET" && requestUrl.pathname === "/employees") {
    await listEmployees(req, res);
  } else {
    sendJson(res, 404, { error: "Not Found" });
  }
}

async function handleLogin(req, res) {
  try {
    const { username, password } = await readRequestBody(req);
    if (!username || !password) {
      sendJson(res, 400, { error: "username and password required" });
      return;
    }
    sendJson(res, 200, { access_token: await getAzureToken(username, password) });
  } catch (err) {
    sendJson(res, err.response?.status ?? 401, {
      error: err.response?.data?.error_description || err.message || "Authentication failed",
    });
  }
}

async function listEmployees(req, res, options = {}) {
  const authorization = req.headers.authorization;
  const hasBearer = typeof authorization === "string" &&
    authorization.toLowerCase().startsWith("bearer ");
  if (options.requireBearer && !hasBearer) {
    sendJson(res, 401, { error: "Missing Authorization header" });
    return;
  }
  const metadata = {
    authMode: options.authMode || (hasBearer ? AUTH_MODES.OBO : AUTH_MODES.APP),
    ...(hasBearer && {
      endUserToken: authorization.substring("Bearer ".length).trim(),
      attributes: { "EUC.HCM": {p1: 50, p2: "test1"}},
      dataRoles: ["HR_DYNAMIC_ROLE1", "FINANCE_DYNAMIC_ROLE1"]
    }),
  };
  const securityContextProvider = oracledb.getSecurityContextProvider();
  const connection = await oracledb.getConnection();
  try {
    const result = await securityContextProvider.runWithContext(metadata, () =>
      connection.execute("select * from hr.employees"),
    );
    sendJson(res, 200, { authMode: metadata.authMode, employees: result.rows });
  } finally {
    await connection.close();
  }
}

async function getAzureToken(username, password) {
  if (!TOKEN_URL) {
    throw new Error("Unable to determine Azure token URL.");
  }
  const response = await axios.post(TOKEN_URL, querystring.stringify({
    client_id: requireEnv("AZURE_CLIENT_ID", AZURE_CLIENT_ID),
    client_secret: requireEnv("AZURE_CLIENT_SECRET", AZURE_CLIENT_SECRET),
    grant_type: "password",
    username,
    password,
    scope: requireEnv("AZURE_SCOPE", AZURE_SCOPE),
  }), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
    ...axiosRequestDefaults,
  });
  return response.data.access_token;
}

function createMsalNetworkClient() {
  return {
    sendGetRequestAsync: (url, options, timeout) =>
      fetchWithProxy("GET", url, options, timeout),
    sendPostRequestAsync: (url, options, timeout) =>
      fetchWithProxy("POST", url, options, timeout),
  };
}

async function fetchWithProxy(method, url, options = {}, timeout = 30000) {
  const controller = new globalThis.AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
      ...(dispatcher && { dispatcher }),
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: text ? JSON.parse(text) : {},
    };
  } finally {
    clearTimeout(timer);
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Request body must be JSON"));
      }
    });
    req.on("error", reject);
  });
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }
  return value;
}

function normalizeContextResolution(value) {
  const resolution = String(value).trim().toLowerCase();
  if (resolution === "connection" || resolution === "operation") {
    return resolution;
  }
  throw new Error("DEEPSEC_CONTEXT_RESOLUTION must be connection or operation.");
}

function sendJson(res, status, payload) {
  if (res.headersSent || res.writableEnded) {
    return;
  }
  const json = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

main().catch((err) => {
  console.error("Failed to start example", err);
  process.exit(1);
});
