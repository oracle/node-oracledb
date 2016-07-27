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

'use strict';

var util = require('util');
var Readable = require('stream').Readable;

// This class was originally based on https://github.com/sagiegurari/simple-oracledb/blob/master/lib/resultset-read-stream.js
function QueryStream(resultSet, oracledb) {
  var self = this;

  Object.defineProperties(
    self,
    {
      _oracledb: { // storing a reference to the base instance to avoid circular references with require
        value: oracledb
      },
      _resultSet: {
        value: resultSet,
        writable: true
      },
      _fetchedRows: { // a local cache of rows fetched from a call to resultSet.getRows
        value: [],
        writable: true
      },
      _fetchedAllRows: { // used to avoid an unnecessary call to resultSet.getRows
        value: false,
        writable: true
      },
      _fetching: { // used to serialize method calls on the resultset
        value: false,
        writable: true
      },
      _closed: { // used to track that the stream is closed
        value: false,
        writable: true
      }
    }
  );

  Readable.call(self, {
    objectMode: true
  });

  if (self._resultSet) { // If true, no need to invoke _open, we are ready to go.
    self.emit('metadata', self._resultSet.metaData);

    self.emit('open');
  }
}

util.inherits(QueryStream, Readable);

// The _open method is only meant to be called when a QueryStream is created
// but not passed in the resultSet during initialization. In those cases the
// QueryStream object will have been returned immediately and the _open method
// will be called later to pass the resultset (or error getting the resultset)
// along.
QueryStream.prototype._open = function(err, rs) {
  var self = this;

  if (err) {
    self.emit('error', err);
    return;
  }

  self._resultSet = rs;

  self.emit('metadata', self._resultSet.metaData);

  // Trigger the event listener that may have been added in _read now that the
  // resultset is ready.
  self.emit('open');
};

// The stream _read implementation which fetches the next row from the resultset.
QueryStream.prototype._read = function () {
  var self = this;
  var fetchCount;

  if (!self._resultSet) {
    // Still waiting on the resultset, add an event listener to retry when ready
    return self.once('open', function() {
      self._read();
    });
  }

  if (self._closed) {
    return;
  }

  if (self._fetchedRows.length) {
    // We have rows already fetched that need to be pushed
    self.push(self._fetchedRows.shift());
  } else if (self._fetchedAllRows) {
    // Calling the C layer close directly to avoid assertions on the public method
    self._resultSet._close(function(err) {
      if (err) {
        self.emit('error', err);
        return;
      }

      // Signal the end of the stream
      self.push(null);
    });
  } else {
    // Using _fetching to indicate that the resultset is working to avoid potential
    // errors related to close w/conncurrent operations on resultsets
    self._fetching = true;

    fetchCount = self._oracledb.maxRows || 100;

    // Calling the C layer getRows directly to avoid assertions on the public method
    self._resultSet._getRows(fetchCount, function(err, rows) {
      if (err) {
        // We'll return the error from getRows, but first try to close the resultSet.
        // Calling the C layer close directly to avoid assertions on the public method
        self._resultSet._close(function() {
          self.emit('error', err);
        });

        return;
      }

      self._fetching = false;

      // Close may have been called while the resultset was fetching.
      if (self._closed) {
        // Trigger the event listener that may have been added in close now that
        // the resultset has finished working.
        self.emit('_doneFetching');
        return;
      }

      self._fetchedRows = rows;

      if (self._fetchedRows.length < fetchCount) {
        self._fetchedAllRows = true;
      }

      if (self._fetchedRows.length) {
        self.push(self._fetchedRows.shift());
      } else { // No more rows to fetch
        // Calling the C layer close directly to avoid assertions on the public method
        self._resultSet._close(function(err) {
          if (err) {
            self.emit('error', err);
            return;
          }

          // Signal the end of the stream
          self.push(null);
        });
      }
    });
  }
};

// The close method is not a standard method on stream instances in Node.js but
// it was added to provide developers with a means of stopping the flow of data
// and closing the stream without having to allow the entire resultset to finish
// streaming.
function close(callback) {
  var self = this;

  // Setting _closed early to prevent _read invocations from being processed and
  // to allow _doneFetching to be emitted if needed.
  self._closed = true;

  // Node.js 0.10 didn't have an isPaused method that could be used to prevent
  // an unnecessary pause event from being emitted (added in 0.11.14). We'll
  // check for the existence of such a method and use it if possible, otherwise
  // we'll just call pause. This could be simplified a little when support for
  // Node.js 0.10 is dropped.
  if (typeof self.isPaused === 'function' && !self.isPaused()) {
    self.pause();
  } else {
    self.pause();
  }

  // We can't close the resultset if it's currently fetching. Add a listener
  // to call close when the resulset is done fetching.
  if (self._fetching) {
    self.once('_doneFetching', function() {
      self._close(callback);
    });

    return;
  }

  if (callback) {
    self.once('close', callback);
  }

  // It's possible for close to be called very early, even before the resultset
  // has been set via _open (if needed).
  if (!self._resultSet) {
    self.emit('close');
  } else {
    // Calling the C layer close directly to avoid assertions on the public method
    self._resultSet._close(function(err) {
      if (err) {
        self.emit('error', err);
        return;
      }

      self.emit('close');
    });
  }
}

// Exposing close as a private method for now.
Object.defineProperty(
  QueryStream.prototype,
  '_close',
  {
    value: close,
    writable: true
  }
);

module.exports = QueryStream;
