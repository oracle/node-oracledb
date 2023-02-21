// Copyright (c) 2022, Oracle and/or its affiliates.

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

const errors = require('../errors.js');

class SodaDocCursorImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._operation._getConnImpl();
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Closes the cursor.
  //---------------------------------------------------------------------------
  close() {
    errors.throwNotImplemented("closing a SODA document cursor");
  }

  //---------------------------------------------------------------------------
  // getNext()
  //
  // Returns the next document from the cursor.
  //---------------------------------------------------------------------------
  getNext() {
    errors.throwNotImplemented("getting a document from a SODA doc cursor");
  }

}

module.exports = SodaDocCursorImpl;
