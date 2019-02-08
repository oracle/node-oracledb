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
 *   testsUtil.js
 *
 * DESCRIPTION
 *   The utility functions for tests.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbconfig = require('./dbconfig.js');
const assert = require('assert');

let testsUtil = exports;
module.exports = testsUtil;

testsUtil.assertThrowsAsync = async function(fn, RegExp) {
  let f = () => {};
  try {
    await fn();
  } catch(e) {
    f = () => { throw e; };
  } finally {
    assert.throws(f, RegExp);
  }
};

testsUtil.checkPrerequisites = async function(clientVersion=1803000000, serverVersion=1803000000) {
  if (oracledb.oracleClientVersion < clientVersion) return false;
  try {
    let connection = await oracledb.getConnection(dbconfig);
    if (connection.oracleServerVersion < serverVersion) return false;
    await connection.close();
    return true;
  } catch(err) {
    console.log('Error in checking prerequistes:\n', err);
  }
};

testsUtil.generateRandomPassword = function(length=6) {
  let result = "";
  const choices = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < length; i++) {
    result += choices.charAt(Math.floor(Math.random() * choices.length));
  }
  return result;
};
