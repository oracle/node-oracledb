/* Copyright (c) 2016, 2017, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *****************************************************************************/

'use strict';

var Duplex = require('stream').Duplex;
var util = require('util');
var nodbUtil = require('./util.js');
var closePromisified;

util.inherits(Lob, Duplex);

// the Lob class is used to support the streaming of LOB data to/from the
// database; the iLob refers to the C++ implementation of the Lob class
function Lob(iLob, opt, oracledb) {
  Duplex.call(this, opt);

  this.iLob = iLob;

  Object.defineProperties(
    this,
    {
      _oracledb: { // _oracledb property used by promisify () in util.js
        value: oracledb
      },
      _autoCloseLob: { // Tells whether to close at the end of stream or not
        value: iLob.autoCloseLob,
        writable: false
      },
      chunkSize: {
        value: iLob.chunkSize,
        writable: false
      },
      length: {
        get: function() {
          return iLob.length;
        }
      },
      pieceSize: {
        get: function() {
          return iLob.pieceSize;
        },
        set: function(newPieceSize) {
          iLob.pieceSize = newPieceSize;
        }
      },
      type: {
        get: function() {
          return iLob.type;
        }
      },
      close: {
        value: closePromisified,
        enumerable: true,
        writable: true
      }
    });

  if (this._autoCloseLob) {
    this.once('finish', function() {
      this.close(function() {});
    });
  }
}

// implementation of streaming read; if lob is set to auto-close, the lob is
// automatically closed within the C++ code when an error occurs or when there
// are no more bytes to transfer; all that needs to be done in the JS layer is
// to emit the close and/or error events
Lob.prototype._read = function() {
  var self = this;

  self.iLob.read(
    function(err, str) {
      if (err) {
        self.emit('error', err);
        if (self._autoCloseLob) {
          self.emit('close');
        }
        return;
      }

      self.push(str);

      if (self._autoCloseLob && !str) {
        process.nextTick(function() {
          self.emit('close');
        });
      }
    }
  );
};

// implementation of streaming write; if lob is set to auto-close, the lob is
// automatically closed in the "finish" event; all that needs to be done here
// is to emit the close event in the event of an error
Lob.prototype._write = function(data, encoding, cb) {
  var self = this;

  self.iLob.write(
    data,
    function(err) {
      if (err && self._autoCloseLob) {
        self.emit('close');
      }
      cb(err);
    }
  );
};

Lob.prototype.close = function(closeCb) {
  var self = this;

  nodbUtil.assert(arguments.length === 1, 'NJS-009');
  nodbUtil.assert(typeof closeCb === 'function', 'NJS-006', 1);

  // Return if LOB already closed to support multiple close() calls should be
  // no-op
  if (!self.iLob.valid) {
    closeCb(null);
    return;
  }

  self.iLob.close(function(err) {
    if (err) {
      self.emit('error', err);
    } else  {
      self.emit('close');
    }

    closeCb(err);
  });
};

closePromisified = nodbUtil.promisify(Lob.prototype.close);

module.exports.Lob = Lob;
