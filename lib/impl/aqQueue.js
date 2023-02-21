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

class AqQueueImpl {

  //---------------------------------------------------------------------------
  // _getConnImpl()
  //
  // Common method on all classes that make use of a connection -- used to
  // ensure serialization of all use of the connection.
  //---------------------------------------------------------------------------
  _getConnImpl() {
    return this._connection;
  }

  //---------------------------------------------------------------------------
  // deqMany()
  //
  // Dequeues multiple items from a queue.
  //---------------------------------------------------------------------------
  deqMany() {
    errors.throwNotImplemented("dequeuing multiple items from a queue");
  }

  //---------------------------------------------------------------------------
  // deqOne()
  //
  // Dequeues a single item from a queue.
  //---------------------------------------------------------------------------
  deqOne() {
    errors.throwNotImplemented("dequeuing a single item from a queue");
  }

  //---------------------------------------------------------------------------
  // enqMany()
  //
  // Enqueues multiple items from a queue.
  //---------------------------------------------------------------------------
  enqMany() {
    errors.throwNotImplemented("enqueuing multiple items from a queue");
  }

  //---------------------------------------------------------------------------
  // enqOne()
  //
  // Enqueues a single item from a queue.
  //---------------------------------------------------------------------------
  enqOne() {
    errors.throwNotImplemented("enqueuing a single item from a queue");
  }

}

module.exports = AqQueueImpl;
