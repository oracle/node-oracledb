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
// Shared process-wide token-cache support for built-in token extensions.
//-----------------------------------------------------------------------------
'use strict';

const crypto = require('crypto');
const { ObfuscatedValue } = require('../../lib/obfuscation.js');

//---------------------------------------------------------------------------
// hashValue()
//
// Hash a secret before it becomes part of a process-wide cache key. A changed
// secret gets a distinct entry without retaining plaintext credentials in a
// Map key.
//---------------------------------------------------------------------------
function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

//---------------------------------------------------------------------------
// TokenCache
//
// A process-wide bounded LRU cache with expiry-aware lookup and single-flight
// acquisition. Cached token values are obfuscated, including object values
// such as OCI token/private-key pairs. acquire() may be synchronous or async
// and returns { value, validUntil }. Entries without a future validUntil are
// returned but intentionally not cached.
//---------------------------------------------------------------------------
class TokenCache {
  constructor(maxEntries) {
    this._maxEntries = maxEntries;
    this._entries = new Map();
    this._inFlight = new Map();
  }

  async get(key, acquire, { enabled = true } = {}) {
    if (enabled) {
      const cached = this._entries.get(key);
      if (cached?.validUntil > Date.now()) {
        // Moving the hit to the end maintains insertion-order LRU semantics.
        this._entries.delete(key);
        this._entries.set(key, cached);
        return {
          value: restoreValue(cached.value),
          validUntil: cached.validUntil,
          isCacheHit: true,
        };
      }
      if (cached) {
        clearValue(cached.value);
        this._entries.delete(key);
      }
    }

    let request = this._inFlight.get(key);
    if (!request) {
      request = Promise.resolve().then(acquire).then((result) => {
        if (enabled && result?.validUntil > Date.now()) {
          this._evictLeastRecentlyUsed();
          this._entries.set(key, {
            value: protectValue(result.value),
            validUntil: result.validUntil,
          });
        }
        return result;
      });
      this._inFlight.set(key, request);
    }
    try {
      const result = await request;
      return {
        value: result.value,
        validUntil: result.validUntil,
        isCacheHit: false,
      };
    } finally {
      if (this._inFlight.get(key) === request) {
        this._inFlight.delete(key);
      }
    }
  }

  _evictLeastRecentlyUsed() {
    while (this._entries.size >= this._maxEntries) {
      const oldestKey = this._entries.keys().next().value;
      const oldestEntry = this._entries.get(oldestKey);
      clearValue(oldestEntry.value);
      this._entries.delete(oldestKey);
    }
  }
}

function protectValue(value) {
  if (typeof value === 'string') {
    return new ObfuscatedValue(value);
  }
  if (Array.isArray(value)) {
    return value.map(protectValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
      [key, protectValue(entry)]));
  }
  return value;
}

function restoreValue(value) {
  if (value instanceof ObfuscatedValue) {
    return value.get();
  }
  if (Array.isArray(value)) {
    return value.map(restoreValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) =>
      [key, restoreValue(entry)]));
  }
  return value;
}

function clearValue(value) {
  if (value instanceof ObfuscatedValue) {
    value.clear();
  } else if (Array.isArray(value)) {
    value.forEach(clearValue);
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(clearValue);
  }
}

module.exports = { TokenCache, hashValue };
