/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 *   182. deferLibInit.js
 *
 * DESCRIPTION
 *   Test deferring initialization of ODPI-C library.
 *   This is a node-oracledb v3.1+ feature.
 *
 *   Note: These tests will not succeed unless LD_LIBRARY_PATH is used to
 *         point to the path of Oracle Instant Client. Please also make sure
 *         you don't have any other Oracle Clients installed except for that
 *         sepcified by LD_LIBRARY_PATH.
 *
 *****************************************************************************/
'use strict';

const assert   = require('assert');
const util     = require('util');
const execFile = util.promisify(require('child_process').execFile);

describe('182. deferLibInit.js', () => {

  before('it only works on Linux', function() {
    if (process.platform !== 'linux') this.skip();
  });

  it('182.1 defers initializatiion of ODPI-C', async () => {
    try {
      delete process.env.LD_LIBRARY_PATH;
      await positiveCase();
    } catch (err) {
      assert.fail(err);
    }
  });

  it('182.2 Negative: throws error when asking for ODPI-C attributes without LD_LIBRARY_PATH and ORACLE_HOME set', async () => {
    try {
      delete process.env.LD_LIBRARY_PATH;
      await negativeCase();
    } catch (err) {
      if (err && err.stdout.includes("failing")) {
        throw new Error("The test will not succeed unless LD_LIBRARY_PATH is used to point to the path of Oracle Instant Client.\n" +
          "Please also make sure you don't have any other Oracle Clients installed except for that sepcified by LD_LIBRARY_PATH.\n" +
          err.stdout);
      }
      assert.fail(err);
    }
  });

  it('182.3 Negative: throws error when calling oracledb method without LD_LIBRARY_PATH and ORACLE_HOME set', async () => {
    try {
      delete process.env.LD_LIBRARY_PATH;
      await callMethodCase();
    } catch (err) {
      if (err && err.stdout.includes("failing")) {
        throw new Error("The test will not succeed unless LD_LIBRARY_PATH is used to point to the path of Oracle Instant Client.\n" +
          "Please also make sure you don't have any other Oracle Clients installed except for that sepcified by LD_LIBRARY_PATH.\n" +
          err.stdout);
      }
      assert.fail(err);
    }
  });

});

async function positiveCase() {
  const { stdout } = await execFile(process.argv[1], ['test/deferLibInit1.js']);
  assert(stdout);
}

async function negativeCase() {
  const { stdout } = await execFile(process.argv[1], ['test/deferLibInit2.js']);
  assert(stdout);
}

async function callMethodCase() {
  const { stdout } = await execFile(process.argv[1], ['test/deferLibInit3.js']);
  assert(stdout);
}
