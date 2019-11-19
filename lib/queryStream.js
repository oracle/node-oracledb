// Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved

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

const util = require('util');
const Readable = require('stream').Readable;

// This class was originally based on https://github.com/sagiegurari/simple-oracledb/blob/master/lib/resultset-read-stream.js
function QueryStream(resultSet) {
  const self = this;

  Object.defineProperties(
    self,
    {
      _resultSet: {
        value: resultSet,
        writable: true
      },
      _fetching: { // used to serialize method calls on the ResultSet
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
    objectMode: true,
    emitClose: false // Prevents duplicate close events
  });

  // Check if QueryStream was created via ResultSet.toQueryStream() then the
  // ResultSet will already be available.
  if (self._resultSet) {
    // Emitting the events via process.nextTick to allow event handlers to be
    // registered prior to the events being emitted.
    process.nextTick(function() {
      self.emit('open');

      if (!self._closed) {
        self.emit('metadata', self._resultSet.metaData);
      }
    });
  }

  self.on('end', function() {
    // Using setImmediate to ensure that end event handlers are processed
    // before the destroy logic is invoked.
    setImmediate(function() {
      self._destroy(null, function(err) {
        if (err) {
          self.emit('error', err);
        }
      });
    });
  });
}

util.inherits(QueryStream, Readable);

// The _open method is called by Connection.execute() when the ResultSet is
// ready.
QueryStream.prototype._open = function(err, rs) {
  const self = this;

  if (err) {
    self.emit('error', err);
    return;
  }

  self._resultSet = rs;

  // Trigger the event listener that may have been added in _read now that the
  // ResultSet is ready.
  self.emit('open');

  if (!self._closed) {
    self.emit('metadata', self._resultSet.metaData);
  }
};

QueryStream.prototype._read = function() {
  const self = this;

  if (!self._resultSet) {
    // Still waiting on the ResultSet to be added via _open, add an event listener
    // to retry when ready.
    self.once('open', function() {
      self._read();
    });

    return;
  }

  if (self._closed) {
    return;
  }

  // Using _fetching to indicate that the ResultSet is working to avoid potential
  // errors related to concurrent operations on ResultSets (such as calling _close).
  self._fetching = true;

  // Using the JS getRow to leverage the JS row cache. The ResultSet's
  // _allowGetRowCall is set to true to allow the call for queryStreams
  // created via ResultSet.toQueryStream().
  self._resultSet._allowGetRowCall = true;

  self._resultSet.getRow(function(getRowErr, row) {
    self._fetching = false;

    if (getRowErr) {
      self._close(function(closeErr) {
        if (closeErr) {
          self.emit('error', new Error(getRowErr.message + '\n' + closeErr.message));
          return;
        }

        self.emit('error', getRowErr);
        self.emit('close');
      });

      return;
    }

    // _close may have been called while the ResultSet was fetching.
    if (self._closed) {
      // Trigger the event listener that may have been added in _close now that
      // the ResultSet has finished working.
      self.emit('_doneFetching');
      return;
    }

    if (row) {
      self.push(row);
    } else {
      // Pushing null will signal the end of the stream. The 'end' event will
      // be emitted when the streams internal buffer is flushed out.
      self.push(null);
    }
  });
};

// The _close method is used to close the QueryStream and underlying ResultSet.
// The destroyCallback is only used when _close is invoked by _destroy. In that
// case, errors are passed back via the callback rather than emitted.
QueryStream.prototype._close = function(callback) {
  const self = this;

  if (self._closed) {
    return;
  }

  // Setting _closed early to prevent _read invocations from being processed and
  // to allow '_doneFetching' to be emitted from _read
  self._closed = true;

  // It's possible for close to be called very early, even before the ResultSet
  // has been set via _open (used by Connection.queryStream).
  if (!self._resultSet) {
    self.once('open', function() {
      self._closed = false; // Need to reset this to allow the _close call to work.
      self._close(callback);
    });

    return;
  }

  // We can't close the ResultSet if it's currently fetching. Add a listener
  // to call _close when the ResultSet is done fetching.
  if (self._fetching) {
    self.once('_doneFetching', function() {
      self._closed = false; // Need to reset this to allow the _close call to work.
      self._close(callback);
    });

    return;
  }

  // Calling the C layer close directly to avoid assertions on the public method.
  // The 'close' event is not emitted in the callback function here because,
  // according to the doc, the event should be the last one emitted.
  self._resultSet._close(function(err) {
    if (err) {
      callback(err);

      return;
    }

    callback(null);
  });
};

// _destroy is called when the user invokes destroy on the stream. The user can
// pass an error that will be emitted after the ResultSet is closed (provided
// no other errors occur).
QueryStream.prototype._destroy = function(userErr, callback) {
  const self = this;

  this._close(function(closeErr) {
    // Invoking this callback will signal the end of destroy. If an error is
    // passed in it will be emitted via core stream logic.
    callback(closeErr || userErr || null);

    if (!closeErr) {
      // Using setImmediate to ensure that the 'end' event is emitted before
      // 'close'.
      setImmediate(function() {
        self.emit('close');
      });
    }
  });
};

module.exports = QueryStream;
