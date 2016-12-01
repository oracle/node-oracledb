/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   devnull.js
 *
 * DESCRIPTION
 *   /dev/null for Node streams
 *
 *****************************************************************************/
'use strict';

var stream = require('stream');
var util   = require('util');

module.exports = DevNull;

// step 2 - to call the Writable constructor in our own constructor
function DevNull(opts) {
  if ( !(this instanceof DevNull) ) return new DevNull(opts);

  opts = opts || {};
  stream.Writable.call(this, opts);

};

// step 1 - to extend the Writable Class
util.inherits(DevNull, stream.Writable);

// step 3 -define a '_write()' method in the prototype of our stream object
DevNull.prototype._write = function(chunk, encoding, cb) {
  setImmediate(cb);
};
