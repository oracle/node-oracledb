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

// returns the document content as a Javascript object
function getContent() {
  return JSON.parse(this._getContentAsString());
}


// returns the document content as a string
function getContentAsString() {
  return this._getContentAsString();
}


// returns the document content as a buffer
function getContentAsBuffer() {
  return this._getContentAsBuffer();
}


// extends the SodaDocument instance from the C layer with custom properties
// and method overrides; references to the original methods are maintained so
// that they can be invoked by the overriding method at the right time
function extend(doc) {
  Object.defineProperties (
    doc,
    {
      _sodaDocumentMarker: {
        value: true
      },
      _getContentAsString: {
        value: doc.getContentAsString
      },
      _getContentAsBuffer: {
        value: doc.getContentAsBuffer
      },
      getContent: {
        value: getContent,
        enumerable: true,
        writable: true
      },
      getContentAsString: {
        value: getContentAsString,
        enumerable: true,
        writable: true
      },
      getContentAsBuffer: {
        value: getContentAsBuffer,
        enumerable: true,
        writable: true
      },
    }
  );
}

module.exports.extend = extend;
