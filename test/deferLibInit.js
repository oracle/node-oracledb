/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   182. deferLibInit.js
 *
 * DESCRIPTION
 *   Test deferring initialization of ODPI-C library.
 *   This is a node-oracledb v3.1+ feature.
 *
 *****************************************************************************/
'use strict';

const should   = require('should');
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
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('182.2 Negative: throws error when asking for ODPI-C attributes', async () => {
    try {
      delete process.env.LD_LIBRARY_PATH;
      await negativeCase();
    } catch(err) {
      should.not.exist(err);
    }
  });

  it('183.3 Negative: call oracledb method', async () => {
    try {
      delete process.env.LD_LIBRARY_PATH;
      await callMethodCase();
    } catch(err) {
      should.not.exist(err);
    }
  });
  
});

async function positiveCase() {
  const { stdout } = await execFile('mocha', ['test/deferLibInit1.js']);
  should.exist(stdout);
}

async function negativeCase() {
  const { stdout } = await execFile('mocha', ['test/deferLibInit2.js']);
  should.exist(stdout);
}

async function callMethodCase() {
  const { stdout } = await execFile('mocha', ['test/deferLibInit3.js']);
  should.exist(stdout);
}