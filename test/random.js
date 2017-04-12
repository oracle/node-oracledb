/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   random.js
 *
 * DESCRIPTION
 *   generate a random string which length is 'length', with specialStr
 *   in it's head and tail
 *****************************************************************************/
'use strict';

var random = exports;
module.exports = random;

// generate a random string which length is 'length', with specialStr in it's head and tail
random.getRandomString = function (length, specialStr) {
  var str='';
  var strLength = length - specialStr.length * 2;
  for( ; str.length < strLength; str += Math.random().toString(36).slice(2));
  str = str.substr(0, strLength);
  str = specialStr + str + specialStr;
  return str;
};

random.getRandomLenString = function (length) {
  var str='';
  for( ; str.length < length; str += Math.random().toString(36).slice(2));
  str = str.substr(0, length);
  return str;
};
