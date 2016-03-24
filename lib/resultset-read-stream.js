/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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

var util = require('util');
var stream = require('stream');
var Readable = stream.Readable;
var resultset = require('./resultset.js');

// A node.js read stream for resultsets (based on https://github.com/sagiegurari/simple-oracledb/blob/master/lib/resultset-read-stream.js).
function ResultSetReadStream(conn, sql, binding, options) {
  var self = this;

  binding = binding || [];
  options = options || {};

  options.resultSet = true;

  self.streamNumRows = conn._oracledb.maxRows || 100;

  Readable.call(self, {
    objectMode: true
  });

  Object.defineProperty(self, 'nextRow', {
    // Sets the nextRow value.
    set: function (nextRow) {
      self.next = nextRow;

      if (self.inRead) {
        self._read();
      }
    }
  });

  conn._execute(sql, binding, options, function(err, result) {
    self._onExecuteDone(err, result);
  });
}

util.inherits(ResultSetReadStream, Readable);

// The stream _read implementation which fetches the next row from the resultset.
ResultSetReadStream.prototype._read = function () {
  var self = this;

  self.inRead = false;

  if (self.next) {
    self.next(function onNextRowRead(error, data) {
      if (error) {
        self.emit('error', error);
      } else if (data) {
        self.push(data);
      } else {
        self.push(null);
      }
    });
  } else {
    self.inRead = true;
  }
};

ResultSetReadStream.prototype._onExecuteDone = function(err, result) {
  var self = this;

  if (err) {
    self.nextRow = function emitError(streamCallback) {
      streamCallback(err);
    };

    return;
  }

  resultset.extend(result.resultSet);

  self.emit('metadata', result.resultSet.metaData);

  var close = function (streamCallback, causeError) {
    result.resultSet.close(function onClose(closeError) {
      streamCallback(causeError || closeError);
    });
  };

  var readRows;

  self.nextRow = function fetchNextRow(streamCallback) {
    if (readRows && readRows.length) {
      streamCallback(null, readRows.shift());
    } else {
      result.resultSet.getRows(self.streamNumRows, function onRow(rowError, rows) {
        if (rowError) {
          close(streamCallback, rowError);
        } else if ((!rows) || (!rows.length)) {
          close(streamCallback);
        } else {
          readRows = rows;

          streamCallback(null, readRows.shift());
        }
      });
    }
  };
};

module.exports = ResultSetReadStream;
