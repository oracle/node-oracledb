/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   328. endUserSecurityContext.js
 *
 * DESCRIPTION
 *   Tests for EndUserSecurityContext.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');
const dbConfig = require('./dbconfig.js');

describe('328. endUserSecurityContext.js', function() {
  let connection;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
  });

  after(async function() {
    if (connection) {
      await connection.close();
    }
  });

  function decodeContextPayload(context) {
    assert(context instanceof oracledb.EndUserSecurityContext);
    const encoded = context.getDeobfuscatedValue();
    try {
      return connection.decodeOSON(encoded);
    } finally {
      encoded.fill(0);
    }
  }

  describe('328.1 EndUserSecurityContext attributes', function() {
    it('328.1.1 ignores non-enumerable nested attribute properties', function() {
      const hcm = {
        p1: 327,
        p2: 'visible',
      };
      Object.defineProperty(hcm, 'secretPassword', {
        value: 'hidden-secret',
        enumerable: false,
      });

      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: 'db-token-hidden-attrs',
        endUserToken: 'user-token-hidden-attrs',
        attributes: {
          'EUC.HCM': hcm,
        },
      });

      assert.deepStrictEqual(Object.keys(hcm), ['p1', 'p2']);
      assert.strictEqual(JSON.stringify(hcm).includes('secretPassword'), false);
      assert.deepStrictEqual(decodeContextPayload(securityContext).attributes, [
        {name: 'EUC.HCM', values: {p1: 327, p2: 'visible'}},
      ]);
    }); // 328.1.1

    it('328.1.2 rejects unsupported nested JSON values', function() {
      const invalidValues = [
        123n,
        Symbol('not-json'),
        () => {},
      ];

      for (const invalidValue of invalidValues) {
        assert.throws(
          () =>
            new oracledb.EndUserSecurityContext({
              databaseAccessToken: 'db-token-invalid-json',
              endUserToken: 'user-token-invalid-json',
              attributes: {
                'EUC.HCM': {
                  invalidValue,
                },
              },
            }),
          /NJS-194:/,
        );
        assert.throws(
          () =>
            new oracledb.EndUserSecurityContext({
              databaseAccessToken: 'db-token-invalid-json-array',
              endUserToken: 'user-token-invalid-json-array',
              attributes: {
                'EUC.HCM': [invalidValue],
              },
            }),
          /NJS-194:/,
        );
      }

      for (const invalidValue of [NaN, Infinity, -Infinity]) {
        assert.throws(
          () =>
            new oracledb.EndUserSecurityContext({
              databaseAccessToken: 'db-token-invalid-json-number',
              endUserToken: 'user-token-invalid-json-number',
              attributes: {
                'EUC.HCM': {
                  invalidValue,
                },
              },
            }),
          /NJS-195:/,
        );
        assert.throws(
          () =>
            new oracledb.EndUserSecurityContext({
              databaseAccessToken: 'db-token-invalid-json-number-array',
              endUserToken: 'user-token-invalid-json-number-array',
              attributes: {
                'EUC.HCM': [invalidValue],
              },
            }),
          /NJS-195:/,
        );
      }
    }); // 328.1.2

    it('328.1.3 rejects unsupported nested field names', function() {
      const invalidFieldNames = [
        '__proto__',
        'constructor',
        'prototype',
      ];

      for (const fieldName of invalidFieldNames) {
        const hcm = {
          p1: 123,
          p2: 'invalid-field-name',
        };
        Object.defineProperty(hcm, fieldName, {
          enumerable: true,
          value: 'invalid',
        });

        assert.throws(
          () =>
            new oracledb.EndUserSecurityContext({
              databaseAccessToken: 'db-token-invalid-field-name',
              endUserToken: 'user-token-invalid-field-name',
              attributes: {
                'EUC.HCM': hcm,
              },
            }),
          /NJS-196:/,
        );
      }
    }); // 328.1.3

    it('328.1.4 rejects circular attribute values', function() {
      const circular = {
        region: 'US',
      };
      circular.self = circular;

      assert.throws(
        () =>
          new oracledb.EndUserSecurityContext({
            databaseAccessToken: 'db-token-circular-attrs',
            endUserToken: 'user-token-circular-attrs',
            attributes: {
              'EUC.HCM': circular,
            },
          }),
        /NJS-005:/,
      );
    }); // 328.1.4
  }); // 328.1

  describe('328.2 EndUserSecurityContext application direct logon', function() {
    it('328.2.1 encodes a database-token-only application context', function() {
      const securityContext = new oracledb.EndUserSecurityContext({
        databaseAccessToken: 'application-direct-db-token',
      });

      assert.deepStrictEqual(decodeContextPayload(securityContext), {
        ver: '1.0',
        database_access_token: 'application-direct-db-token',
      });
    }); // 328.2.1
  }); // 328.2
});
