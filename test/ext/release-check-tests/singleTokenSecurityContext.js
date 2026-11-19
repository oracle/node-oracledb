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
 * DESCRIPTION
 *   Single-token EUSC version gates and Thin piggyback encoding. No database
 *   is required. Run with mocha test/ext/release-check-tests/singleTokenSecurityContext.js.
 *
 *****************************************************************************/
'use strict';

const assert = require('assert');
const oracledb = require('../../../');
const ThinConnectionImpl = require('../../../lib/thin/connection.js');
const Message = require('../../../lib/thin/protocol/messages/base.js');
const { OsonDecoder } = require('../../../lib/impl/datahandlers/oson.js');

describe('singleTokenSecurityContext.js', function() {
  function createConnection(serverVersion, supportsContext = true) {
    const connection = new ThinConnectionImpl();
    connection.serverVersion = serverVersion;
    connection._protocol = {
      caps: { supportsEndUserSecurityContext: supportsContext },
    };
    return connection;
  }

  it('rejects single tokens before 23.26.4 without replacing an installed context', function() {
    const single = new oracledb.EndUserSecurityContext({
      databaseAccessToken: 'db-token',
    });
    const dual = new oracledb.EndUserSecurityContext({
      databaseAccessToken: 'db-token', endUserToken: 'user-token',
    });
    for (const version of [2307000000, 2326030000, 2326039999]) {
      const connection = createConnection(version);
      connection.setEndUserSecurityContext(dual);
      assert.throws(() => connection.setEndUserSecurityContext(single),
        (err) => {
          assert.strictEqual(err.code, 'NJS-204');
          assert.match(err.message, /Upgrade.*two-token flow/);
          return true;
        });
      assert.strictEqual(connection.securityContext, dual);
    }
  });

  it('accepts single tokens at and above the version boundary', function() {
    const single = new oracledb.EndUserSecurityContext({
      databaseAccessToken: 'db-token',
    });
    for (const version of [2326040000, 2326040001, 2326100000, 2600000000]) {
      const connection = createConnection(version);
      connection.setEndUserSecurityContext(single);
      assert.strictEqual(connection.securityContext, single);
      connection._securityContextInitialized = true;
      connection.clearEndUserSecurityContext();
      assert.strictEqual(connection.securityContext, null);
      assert.strictEqual(connection._securityContextInitialized, false);
      connection.setEndUserSecurityContext(single);
      assert.strictEqual(connection.securityContext, single);
    }
  });

  it('retains named-user support on older databases', function() {
    const connection = createConnection(2307000000);
    const context = new oracledb.EndUserSecurityContext({
      databaseAccessToken: 'db-token', endUserName: 'user', key: 'context-id',
    });
    connection.setEndUserSecurityContext(context);
    assert.strictEqual(connection.securityContext, context);
  });

  it('still requires the general EUSC capability', function() {
    const connection = createConnection(2326100000, false);
    const context = new oracledb.EndUserSecurityContext({
      databaseAccessToken: 'db-token',
    });
    assert.throws(() => connection.setEndUserSecurityContext(context),
      /NJS-191:/);
    assert.strictEqual(connection.securityContext, undefined);
  });

  for (const endUserToken of [undefined, 'user-token']) {
    it(`resends the complete ${endUserToken ? 'dual' : 'single'} token payload`, function() {
      const connection = createConnection(2326100000);
      connection.setEndUserSecurityContext(new oracledb.EndUserSecurityContext({
        databaseAccessToken: 'db-token', endUserToken,
        dataRoles: ['PAYROLL_READER'],
        attributes: { 'HR.HCM_CONTEXT': { department: 'FINANCE' } },
      }));
      const expected = {
        ver: '1.0', database_access_token: 'db-token',
        data_roles: ['PAYROLL_READER'],
        attributes: [{
          name: 'HR.HCM_CONTEXT', values: { department: 'FINANCE' },
        }],
      };
      if (endUserToken) {
        expected.end_user_token = endUserToken;
      }
      const message = new Message(connection);
      for (let operation = 0; operation < 2; operation++) {
        const fields = [];
        let plaintext;
        message._writeEndUserSecurityContextPiggyback({
          caps: { ttcFieldVersion: 0 },
          writeUInt8(value) {
            fields.push(['byte', value]);
          },
          writeUB4(value) {
            fields.push(['ub4', value]);
          },
          writeSeqNum() {
            fields.push(['sequence']);
          },
          writeStrKeywordValuePair(key, value) {
            assert.strictEqual(key, 'ORCL_XS_AUTHZ_CONTEXT');
            assert.deepStrictEqual(new OsonDecoder(value).decode(), expected);
            plaintext = value;
          },
        });
        assert.deepStrictEqual(fields, [
          ['byte', 17], ['byte', 205], ['sequence'],
          ['ub4', 1], ['byte', 1], ['ub4', 1],
        ]);
        assert(plaintext.every((value) => value === 0));
      }
    });
  }

  it('clears the temporary token buffer when encoding fails', function() {
    const connection = createConnection(2326100000);
    connection.setEndUserSecurityContext(new oracledb.EndUserSecurityContext({
      databaseAccessToken: 'db-token',
    }));
    let plaintext;
    const failure = new Error('write failed');
    assert.throws(() => new Message(connection)
      ._writeEndUserSecurityContextPiggyback({
        caps: { ttcFieldVersion: 0 },
        writeUInt8() {}, writeUB4() {}, writeSeqNum() {},
        writeStrKeywordValuePair(key, value) {
          plaintext = value;
          throw failure;
        },
      }), (err) => err === failure);
    assert(plaintext.every((value) => value === 0));
  });
});
