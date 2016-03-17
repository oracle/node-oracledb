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

var Duplex = require('stream').Duplex;
var util = require('util');

util.inherits(Lob, Duplex);

// The Lob class is used to support the streaming of LOB data to/from the database.
function Lob(iLob, opt) {
  Duplex.call(this, opt);

  this.iLob = iLob;
  this.once('finish', this.close);

  Object.defineProperties(
    this,
    {
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
      }
    });
}

Lob.prototype._read = function() {
  var self = this;

  self.iLob.read(
    function(err, str) {
      if (err) {
        self.close(); // Ignore if any error occurs during close
        self.emit('error', err);
        self.emit('close');
        return;
      }

      self.push(str);

      if (!str) {
        process.nextTick(function() {
          err = self.close();

          if (err) {
            self.emit('error', err);
          }

          self.emit('close');
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
        self.close();   // Ignore if any error occurs during close
        return cb(err);
      }

      cb();
    }
  );
};

Lob.prototype.close = function(cb) {
  var self = this;

  if (cb) {
    this.once('close', cb);
  }

  if (self.iLob != null) {
    try {
      self.iLob.release();
    } catch(err) {
        self.iLob = null;
        return err;
    }

    self.iLob = null;
  }
};

module.exports.Lob = Lob;
