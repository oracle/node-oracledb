// Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved

//-----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

class SodaDocument {

  _extend() {
    this._sodaDocumentMarker = true;
  }

  // returns the document content as a Javascript object
  getContent() {
    return JSON.parse(this._getContentAsString());
  }

  // returns the document content as a buffer
  getContentAsBuffer() {
    return this._getContentAsBuffer();
  }

  // returns the document content as a string
  getContentAsString() {
    return this._getContentAsString();
  }

}

module.exports = SodaDocument;
