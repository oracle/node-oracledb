// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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

const nodbUtil = require('./util.js');


class SodaDocCursor {

  _getConnection() {
    return this._operation._getConnection();
  }

  //---------------------------------------------------------------------------
  // getNext()
  //   Return the new document available from the cursor.
  //---------------------------------------------------------------------------
  async getNext() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    return await this._getNext();
  }

  //---------------------------------------------------------------------------
  // close()
  //
  // Close the cursor and make it unusable for further operations.
  //--------------------------------------------------------------------------
  async close() {
    nodbUtil.checkArgCount(arguments, 0, 0);
    await this._close();
  }

}

nodbUtil.wrap_fns(SodaDocCursor.prototype,
  "close",
  "getNext");

module.exports = SodaDocCursor;
