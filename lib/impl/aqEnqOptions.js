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

class AqEnqOptionsImpl {

  //---------------------------------------------------------------------------
  // getDeliveryMode()
  //
  // Returns the delivery mode to use for enqueuing messages.
  //---------------------------------------------------------------------------
  getDeliveryMode() {
    errors.throwNotImplemented("getting delivery mode (enqueue options)");
  }

  //---------------------------------------------------------------------------
  // getTransformation()
  //
  // Returns the transformation to use for enqueuing messages.
  //---------------------------------------------------------------------------
  getTransformation() {
    errors.throwNotImplemented("getting transformation (enqueue options)");
  }

  //---------------------------------------------------------------------------
  // getVisibility()
  //
  // Returns the visibility to use for enqueuing messages.
  //---------------------------------------------------------------------------
  getVisibility() {
    errors.throwNotImplemented("getting visibility (enqueue options)");
  }

  //---------------------------------------------------------------------------
  // setDeliveryMode()
  //
  // Sets the delivery mode to use for enqueuing messages.
  //---------------------------------------------------------------------------
  setDeliveryMode() {
    errors.throwNotImplemented("setting delivery mode (enqueue options)");
  }

  //---------------------------------------------------------------------------
  // setTransformation()
  //
  // Sets the transformation to use for enqueuing messages.
  //---------------------------------------------------------------------------
  setTransformation() {
    errors.throwNotImplemented("setting transformation (enqueue options)");
  }

  //---------------------------------------------------------------------------
  // setVisibility()
  //
  // Sets the visibility to use for enqueuing messages.
  //---------------------------------------------------------------------------
  setVisibility() {
    errors.throwNotImplemented("setting visibility (enqueue options)");
  }

}

module.exports = AqEnqOptionsImpl;
