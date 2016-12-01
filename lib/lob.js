/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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

// The Lob class is used to support the streaming of LOB data to/from the database.
function Lob(iLob, opt, oracledb) {
  Duplex.call(this, opt);

  this.iLob = iLob;

  if (!iLob.tempLob) {
    this.once('finish', this._closeSync);
  }

  Object.defineProperties(
    this,
    {
      _oracledb: { // _oracledb property used by promisify () in util.js
        value: oracledb
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
      tempLob: {
        get: function() {
          return iLob.tempLob;
        },
        set: function() {
          throw new Error(nodbUtil.getErrorMessage('NJS-014', 'tempLob'));
        }
      },
      close: {
        value: closePromisified,
        enumerable: true,
        writable: true
      }
    });
}

Lob.prototype._read = function() {
  var self = this;

  self.iLob.read(
    function(err, str) {
      if (err) {
        // Ignore if any error occurs during close
        // Emits 'close' event after closing LOB
        self._closeSync();
        self.emit('error', err);
        return;
      }

      self.push(str);

      if (!str) {
        process.nextTick(function() {
          err = self._closeSync(); // Emits 'close' event after closing LOB

          if (err) {
            self.emit('error', err);
          }

        });
      }
    }
  );
};

Lob.prototype._write = function(data, encoding, cb) {
  var self = this;

  self.iLob.write(
    data,
    function(err) {
      if (err) {
        self._closeSync();   // Ignore if any error occurs during close
        return cb(err);
      }
      cb();
    }
  );
};

// This function will be deprecated in the future
// This internal function used to close the LOB at the end of writable
// stream in synchronus way to avoid race condition between this function and
// application's listener function on 'finish' event.
Lob.prototype._closeSync = function() {
  var self = this;

  if (self.iLob != null) {
    try {
      self.iLob.release();
    } catch(err) {
        self.iLob = null;
        return err;
    }
    self.emit('close');
  }
};

Lob.prototype.close = function(closeCb) {
  var self = this;

   nodbUtil.assert(arguments.length === 1, 'NJS-009');
   nodbUtil.assert(typeof closeCb === 'function', 'NJS-006', 1);

   self.iLob.close(function(err) {
     if (!err) {
       self.emit('close');
     }
     closeCb(err);
   });
};

closePromisified = nodbUtil.promisify(Lob.prototype.close);

module.exports.Lob = Lob;
