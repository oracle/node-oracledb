// Copyright (c) 2018, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

class SodaDocument {

  //---------------------------------------------------------------------------
  // createdOn
  //
  // Property for the created date of the document.
  //---------------------------------------------------------------------------
  get createdOn() {
    return this._impl.getCreatedOn();
  }

  //---------------------------------------------------------------------------
  // getContent()
  //
  // Returns the document content in native JavaScript format.
  // Non-JSON content is returned as a JavaScript Buffer.
  //---------------------------------------------------------------------------
  getContent() {
    const content = this._impl.getContent();
    if (typeof content === 'string' && this.mediaType === 'application/json')
      return JSON.parse(content);
    return content;
  }

  //---------------------------------------------------------------------------
  // getContentAsBuffer()
  //
  // Returns the document content as a buffer.
  //---------------------------------------------------------------------------
  getContentAsBuffer() {
    const content = this._impl.getContent();
    if (Buffer.isBuffer(content))
      return content;
    else if (typeof content == 'string')
      return Buffer.from(content);

    // assumed to be a JSON Object (available from Oracle Client 23ai)
    return Buffer.from(JSON.stringify(content));
  }

  //---------------------------------------------------------------------------
  // getContentAsString()
  //
  // Returns the document content as a string.
  //---------------------------------------------------------------------------
  getContentAsString() {
    const content = this._impl.getContent();
    if (typeof content === 'string')
      return content;
    else if (Buffer.isBuffer(content))
      return content.toString();

    // assumed to be a JSON Object (available from Oracle Client 23ai)
    return JSON.stringify(content);
  }

  //---------------------------------------------------------------------------
  // key
  //
  // Property for the key of the document.
  //---------------------------------------------------------------------------
  get key() {
    return this._impl.getKey();
  }

  //---------------------------------------------------------------------------
  // lastModified
  //
  // Property for the last modified date of the document.
  //---------------------------------------------------------------------------
  get lastModified() {
    return this._impl.getLastModified();
  }

  //---------------------------------------------------------------------------
  // mediaType
  //
  // Property for the media type of the document.
  //---------------------------------------------------------------------------
  get mediaType() {
    return this._impl.getMediaType();
  }

  //---------------------------------------------------------------------------
  // version
  //
  // Property for the version of the document.
  //---------------------------------------------------------------------------
  get version() {
    return this._impl.getVersion();
  }

}

SodaDocument.prototype._sodaDocumentMarker = true;

module.exports = SodaDocument;
