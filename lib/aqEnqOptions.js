// Copyright (c) 2019, 2022, Oracle and/or its affiliates.

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

const constants = require('./constants.js');
const errors = require('./errors.js');

class AqEnqOptions {

  //---------------------------------------------------------------------------
  // deliveryMode
  //
  // Property for the delivery mode to use for enqueuing messages.
  //---------------------------------------------------------------------------
  get deliveryMode() {
    return this._impl.getDeliveryMode();
  }

  set deliveryMode(value) {
    errors.assertPropValue(value === constants.AQ_MSG_DELIV_MODE_PERSISTENT ||
      value === constants.AQ_MSG_DELIV_MODE_BUFFERED ||
      value === constants.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED, "deliveryMode");
    this._impl.setDeliveryMode(value);
  }

  //---------------------------------------------------------------------------
  // transformation
  //
  // Property for the transformation to use for enqueuing messages.
  //---------------------------------------------------------------------------
  get transformation() {
    return this._impl.getTransformation();
  }

  set transformation(value) {
    errors.assertPropValue(typeof value === 'string', "transformation");
    this._impl.setTransformation(value);
  }

  //---------------------------------------------------------------------------
  // visibility
  //
  // Property for the visibility to use for enqueuing messages.
  //---------------------------------------------------------------------------
  get visibility() {
    return this._impl.getVisibility();
  }

  set visibility(value) {
    errors.assertPropValue(value === constants.AQ_VISIBILITY_IMMEDIATE ||
      value === constants.AQ_VISIBILITY_ON_COMMIT, "visibility");
    this._impl.setVisibility(value);
  }

}

module.exports = AqEnqOptions;
