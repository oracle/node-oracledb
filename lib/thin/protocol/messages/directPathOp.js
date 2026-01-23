// Copyright (c) 2025, Oracle and/or its affiliates.

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

const BaseMessage = require('./base.js');
const constants = require('../constants.js');

class DirectPathOpMessage extends BaseMessage {

  constructor(connection) {
    super(connection);
    this.cursorId = 0;
    this.opCode = 0;
    this.functionCode = constants.TNS_FUNC_DIRECT_PATH_OP;
  }

  processReturnParameter(buf) {
    const numOutValues = buf.readUB2();
    for (let i = 0; i < numOutValues; i++) {
      buf.skipUB4();
    }
  }

  encode(buf) {
    this.writeFunctionHeader(buf);
    buf.writeUB4(this.opCode);
    buf.writeUB2(this.cursorId);
    buf.writeUInt8(0); // pointer (input values)
    buf.writeUB4(0); // number of input values
    buf.writeUInt8(1); // pointer (output values)
    buf.writeUInt8(1); // pointer (output values length)
  }

  prepare(cursorId, opCode) {
    this.cursorId = cursorId;
    this.opCode = opCode;
  }

}

module.exports = DirectPathOpMessage;
