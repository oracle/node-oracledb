/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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

var oracledb = null;

try {
  oracledb =  require("../build/Release/oracledb");
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    oracledb = require("../build/Debug/oracledb");
  } else {
    throw err;
  }
}

var Duplex = require('stream').Duplex;
var util = require('util');

util.inherits(Lob, Duplex);

function Lob(iLob, opt)
{
  Duplex.call(this, opt);
  this.iLob = iLob;
  this.once('finish', this.close);
  Object.defineProperties(
    this,
    {
      "chunkSize": {value: iLob.chunkSize,
                    writable: false },
      
      "length": {get: function() {return iLob.length}},
      
      "pieceSize": {get: function() {return iLob.pieceSize;},
                    set: function(newPieceSize) {iLob.pieceSize = newPieceSize;}},

      "type": {get: function() {return iLob.type}}
    });
}

Lob.prototype._read = function()
{
  var self = this;

  self.iLob.read(
    function(err, str)
    {
      if (err) {
        self.close();
        self.emit('error', err);
        return;
      }
      self.push(str);
      if (!str) {
        process.nextTick(function() {
          self.close();
        });
      }
    });
}

Lob.prototype._write = function(data, encoding, cb)
{
  var self = this;

  self.iLob.write(
    data,
    function(err)
    {
      if (err) {
        self.close();
        return cb(err);
      }
      cb();
    });
}

Lob.prototype.close = function(cb)
{
  var self = this;

  if (cb) {
    this.once('close', cb);
  }

  if (self.iLob != null) {
    self.iLob.release();
    self.iLob = null;
  }
  self.emit('close');
}

oracledb.Oracledb.prototype.newLob = function(iLob)
{
  return new Lob(iLob, null);
}

var oracledb_ins = new oracledb.Oracledb();

oracledb_ins.DEFAULT    = 0;
oracledb_ins.STRING     = 2001;
oracledb_ins.NUMBER     = 2002;
oracledb_ins.DATE       = 2003;
oracledb_ins.CURSOR     = 2004;
oracledb_ins.BUFFER     = 2005;
oracledb_ins.CLOB       = 2006;
oracledb_ins.BLOB       = 2007;

oracledb_ins.BIND_IN    = 3001;
oracledb_ins.BIND_INOUT = 3002;
oracledb_ins.BIND_OUT   = 3003;

oracledb_ins.ARRAY      = 4001;
oracledb_ins.OBJECT     = 4002;

module.exports = oracledb_ins;
