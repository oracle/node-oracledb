/* Copyright (c) 2018, Oracle and/or its affiliates.  All rights reserved */

/**************************************************************************
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
 *****************************************************************************/

'use strict';

const nodbUtil = require('./util.js');
const sodaDocument = require('./sodaDocument.js');

var getNextPromisified;
var closePromisified;


//-----------------------------------------------------------------------------
// getNext
//   To obtain the next document from the cursor
//-----------------------------------------------------------------------------
function getNext(cb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  self._getNext(function(err, doc) {
    if (doc) {
      sodaDocument.extend(doc);
    }
    cb(err, doc);
  });
}

getNextPromisified = nodbUtil.promisify(getNext);


//-----------------------------------------------------------------------------
//  close
//    to close an open cursor to clear of the resources allocated
//----------------------------------------------------------------------------
function close(cb) {

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof cb === 'function', 'NJS-006', 1);

  this._close(cb);
}

closePromisified = nodbUtil.promisify(close);


// The extend method is used to extend the SodaDocCursor instance from C Layer
// with custom properties and method overrides.  References to the original
// methods are maintained so they can be invoked by the overriding method at
// the right time
function extend(cursor, oracledb) {
  // Using Object.defineProperties to add properties to the soda instance with
  // special properties
  Object.defineProperties (
    cursor,
    {
      _oracledb: {
        value: oracledb
      },
      _getNext: {
        value: cursor.getNext
      },
      getNext: {
        value: getNextPromisified,
        enumerable: true,
        writable: true
      },
      _close: {
        value: cursor.close
      },
      close:  {
        value: closePromisified,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
