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

const { AsyncLocalStorage } = require('async_hooks');
const errors = require('./errors.js');

const asyncLocalStorage = new AsyncLocalStorage();
// One driver-wide invocation hook dispatches every supported operation. It
// does not hold security configuration: applyForOperation() selects the
// provider from the individual connection, so pools may use different
// providers concurrently.
let invocationHook = null;

//---------------------------------------------------------------------------
// getInvocationHook()
//---------------------------------------------------------------------------
function getInvocationHook() {
  return invocationHook;
}

//---------------------------------------------------------------------------
// setInvocationHook()
//---------------------------------------------------------------------------
function setInvocationHook(hook) {
  invocationHook = hook;
}

//---------------------------------------------------------------------------
// _getProvider()
//
// Determines the provider associated with the supplied connection.
//---------------------------------------------------------------------------
function _getProvider(connection) {
  // A token configuration hook attaches a provider to an individual pool or
  // standalone connection. This permits multiple pools to use different
  // identity providers in the same process without process-global state.
  return connection?._securityContextProvider;
}

//---------------------------------------------------------------------------
// _clearConnection()
//
// Clears cached security context for the provided connection.
//---------------------------------------------------------------------------
function _clearConnection(connection) {
  connection.clearEndUserSecurityContext();
}

//---------------------------------------------------------------------------
// getCurrentContext()
//
// Returns the current context stored in AsyncLocalStorage.
//---------------------------------------------------------------------------
function getCurrentContext() {
  return asyncLocalStorage.getStore()?.metadata ?? null;
}

//---------------------------------------------------------------------------
// _getScopedValue() / _setScopedValue()
//
// Internal per-runWithContext() scratch storage; it never holds application
// metadata. The built-in provider uses it to cache an encoded EUSC in
// operation resolution. Values are keyed by provider because one scope may
// use connections from differently configured pools. The Map is fresh for
// every scope and is released with that asynchronous scope.
//---------------------------------------------------------------------------
function _getScopedValue(key) {
  return asyncLocalStorage.getStore()?.values.get(key);
}

function _setScopedValue(key, value) {
  const scope = asyncLocalStorage.getStore();
  if (scope) {
    scope.values.set(key, value);
  }
}

//---------------------------------------------------------------------------
// applyForOperation()
//
// Invokes the registered provider before the supplied database operation. A
// provider returns a ready-to-apply EndUserSecurityContext, or undefined when
// this operation should use the normal database login.
//---------------------------------------------------------------------------
async function applyForOperation(connection) {
  const provider = _getProvider(connection);
  if (!provider) {
    return;
  }
  const perOperation = provider._contextResolution === 'operation';
  if (!perOperation && connection._securityContextInitialized) {
    return;
  }
  let securityContext;
  try {
    securityContext = await provider();
  } catch (err) {
    const error = errors.getErr(errors.ERR_END_USER_SECURITY_CONTEXT_PROVIDER);
    error.cause = err;
    throw error;
  }

  if (securityContext) {
    connection.setEndUserSecurityContext(securityContext);
  }
  if (!perOperation) {
    // The implementation already owns the installed context. Keep only the
    // fact that this borrowed connection has resolved its provider.
    connection._securityContextInitialized = true;
  } else if (securityContext) {
    return { connection };
  }
}

//---------------------------------------------------------------------------
// _validateContext()
//
// Security metadata is an object assembled by the application. Token syntax is
// deliberately not validated here; the configured identity provider remains
// authoritative for token validation and exchange.
//---------------------------------------------------------------------------
function _validateContext(context) {
  if (context === null || typeof context !== 'object' || Array.isArray(context)) {
    errors.throwErr(errors.ERR_INVALID_SECURITY_CONTEXT_METADATA);
  }
  const hasEndUserToken = context.endUserToken !== undefined &&
    context.endUserToken !== null;
  const hasEndUserName = context.endUserName !== undefined &&
    context.endUserName !== null;
  const hasKey = context.key !== undefined && context.key !== null;
  // These fields represent mutually exclusive EUSC identity forms. Validate
  // them before entering the callback so a conflicting request cannot perform
  // unrelated work or reach a database operation before being rejected.
  if (hasEndUserToken && (hasEndUserName || hasKey)) {
    errors.throwErr(errors.ERR_CONFLICTING_SECURITY_CONTEXT_IDENTITIES);
  }
}

//---------------------------------------------------------------------------
// runWithContext()
//
// Associates the supplied metadata object with the callback's asynchronous
// work. Applications must treat the metadata object, including nested values, as
// immutable until the callback and all its database operations complete. The
// separate Map is mutable driver-only scratch storage, not a copy of metadata.
//---------------------------------------------------------------------------
function runWithContext(context, fn, ...args) {
  _validateContext(context);
  if (typeof fn !== 'function') {
    errors.throwErr(errors.ERR_INVALID_SECURITY_CONTEXT_CALLBACK);
  }
  return asyncLocalStorage.run({ metadata: context, values: new Map() },
    () => fn(...args));
}

//---------------------------------------------------------------------------
function createInvocationHook() {
  return {
    before: async ({ connection }) => {
      if (!connection) {
        return undefined;
      }
      return await applyForOperation(connection);
    },
    after: (state) => {
      if (state?.connection) {
        _clearConnection(state.connection);
      }
    }
  };
}

module.exports = {
  applyForOperation,
  runWithContext,
  getCurrentContext,
  _getScopedValue,
  _setScopedValue,
  getInvocationHook,
  setInvocationHook,
  createInvocationHook
};
