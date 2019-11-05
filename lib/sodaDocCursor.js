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

const nodbUtil = require('./util.js');

//-----------------------------------------------------------------------------
// getNext
//   To obtain the next document from the cursor
//-----------------------------------------------------------------------------
function getNext(cb) {
  nodbUtil.checkAsyncArgs(arguments, 1, 1);

  this._getNext(cb);
}


//-----------------------------------------------------------------------------
//  close
//    to close an open cursor to clear of the resources allocated
//----------------------------------------------------------------------------
function close(cb) {
  nodbUtil.checkAsyncArgs(arguments, 1, 1);

  this._close(cb);
}


class SodaDocCursor {

  _extend(oracledb) {
    this.close = nodbUtil.promisify(oracledb, close);
    this.getNext = nodbUtil.promisify(oracledb, getNext);
  }

}

module.exports = SodaDocCursor;
