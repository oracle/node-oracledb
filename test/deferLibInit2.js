/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   deferLibInit2.js
 *
 * DESCRIPTION
 *   Testing late loading of Oracle Client libraries
 *
 *****************************************************************************/

const oracledb = require('oracledb');
const assert   = require('assert');

describe('deferLibInit2.js', () => {

  it('child process #2 of test/deferLibInit.js', () => {

    delete process.env.ORACLE_HOME;

    assert.throws(
      () => {
        console.log(oracledb.oracleClientVersion);
      },
      /DPI-1047:/
    );
    // DPI-1047: 64-bit Oracle Client library cannot be loaded...
  });
});
