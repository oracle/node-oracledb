// Copyright (c) 2018, 2020, Oracle and/or its affiliates. All rights reserved

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

//-----------------------------------------------------------------------------
// getNext()
//   Return the new document available from the cursor.
//-----------------------------------------------------------------------------
async function getNext() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  return await this._getNext();
}


//-----------------------------------------------------------------------------
// close()
//   Close the cursor and make it unusable for further operations.
//----------------------------------------------------------------------------
async function close() {
  nodbUtil.checkArgCount(arguments, 0, 0);
  await this._close();
}


class SodaDocCursor {

  _extend() {
    this.close = nodbUtil.callbackify(close);
    this.getNext = nodbUtil.callbackify(getNext);
  }

}

module.exports = SodaDocCursor;
