/* Copyright (c) 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   264. methodName.js
 *
 * DESCRIPTION
 *   Test to verify the code to keep the method name in internally bound
 *   functions.
 *
 *   Note: These tests uses additional file test/testMethodName.js which is
 *         spawned and the output is compared.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');

describe('264. methodName.js', () => {

  it('264.1 check for methodName getConnection', function() {
    assert.equal(oracledb.getConnection.name, 'getConnection');
  });

});
