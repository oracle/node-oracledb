// Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved

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

const Duplex = require('stream').Duplex;
const nodbUtil = require('./util.js');
const util = require('util');

function close(closeCb) {
  nodbUtil.checkAsyncArgs(arguments, 1, 1);

  // Return if LOB already closed to support multiple close() calls should be
  // no-op
  if (!this.valid) {
    closeCb(null);
    return;
  }

  this._close(function(err) {
    if (err) {
      this.emit('error', err);
    } else  {
      this.emit('close');
    }

    closeCb(err);
  });
}


function getData(getDataCb) {
  nodbUtil.checkAsyncArgs(arguments, 1, 1);
  this._getData(getDataCb);
}


class Lob {

  constructor() {
    Duplex.call(this, {decodeStrings: false});
    this.offset = 1;
    this.once('finish', function() {
      if (this._autoCloseLob) {
        this.close(function() {});
      }
    });
  }

  _extend(oracledb) {
    this._oracledb = oracledb;
    this.close = nodbUtil.promisify(oracledb, close);
    this.getData = nodbUtil.promisify(oracledb, getData);
  }

  // implementation of streaming read; if lob is set to auto-close, the lob is
  // automatically closed within the C++ code when an error occurs or when
  // there are no more bytes to transfer; all that needs to be done in the JS
  // layer is to emit the close and/or error events
  _read() {
    const self = this;

    self.__read(self.offset,
      function(err, data) {
        if (err) {
          self.emit('error', err);
          if (self._autoCloseLob) {
            self.emit('close');
          }
          return;
        }

        if (data) {
          self.offset += data.length;
        }

        self.push(data);

        if (self._autoCloseLob && !data) {
          process.nextTick(function() {
            self.emit('close');
          });
        }
      }
    );
  }

  // implementation of streaming write; if lob is set to auto-close, the lob is
  // automatically closed in the "finish" event; all that needs to be done here
  // is to emit the close event in the event of an error
  _write(data, encoding, cb) {
    const self = this;

    if (self.type == self._oracledb.BLOB && !Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    } else if (self.type == self._oracledb.CLOB && Buffer.isBuffer(data)) {
      data = data.toString();
    }
    self.__write(
      self.offset,
      data,
      function(err) {
        if (err && self._autoCloseLob) {
          self.emit('close');
        }
        if (!err) {
          self.offset += data.length;
        }
        cb(err);
      }
    );
  }

}

util.inherits(Lob, Duplex);

module.exports = Lob;
