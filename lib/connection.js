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
'use strict';

var Stream = require('./resultset-read-stream');

/*jslint debug: true */
/**
 * This class holds all the extended capabilities added the C++ oracledb connection.<br>
 * This file is based on simple-oracledb connection.js https://github.com/sagiegurari/simple-oracledb/blob/master/lib/connection.js
 *
 * @author Sagie Gur-Ari
 * @class Connection
 * @public
 */
function Connection() {
  //should not be called
}
/*jslint debug: false */

/**
 * Extends the C++ oracledb connection.execute to provide additional behavior.
 *
 * @function
 * @memberof! Connection
 * @public
 * @param {string} sql - The SQL to execute
 * @param {object} [bindParams] - Optional bind parameters
 * @param {object} [options] - Optional execute options
 * @param {function} [callback] - Callback function with the execution results
 * @returns {ResultSetReadStream} The stream to read the results from (if stream=true in options)
 */
Connection.prototype.execute = function () {
  var self = this;

  var stream;
  if ((arguments.length === 3) && (typeof arguments[2] === 'object') && arguments[2].stream && (typeof arguments[2].stream === 'boolean')) { //stream results of queries
    var sql = arguments[0];
    var binding = arguments[1];
    var options = arguments[2];

    options.resultSet = true;

    stream = new Stream();

    self.nativeExecute(sql, binding, options, function onExecuteDone(error, result) {
      if (error || (!result) || (!result.resultSet)) {
        stream.nextRow = function emitError(streamCallback) {
          streamCallback(error || new Error('No Results'));
        };
      } else {
        stream.nextRow = function fetchNextRow(streamCallback) {
          result.resultSet.getRow(function onRow(rowError, row) {
            if (rowError) {
              streamCallback(rowError);
            } else if ((!row) || (row.length === 0)) {
              streamCallback();
            } else if (row.length) {
              streamCallback(null, row);
            }
          });
        };
      }
    });
  } else {
    self.nativeExecute.apply(self, arguments);
  }

  return stream;
};

module.exports = {
  /**
   * Returns a getConnection callback wrapper which extends the connection and
   * calls the original callback.
   *
   * @function
   * @memberof! Connection
   * @public
   * @param {function} callback - The getConnection callback
   * @returns {function} The getConnection callback wrapper.
   */
  wrapOnConnection: function wrapOnConnection(callback) {
    var self = this;

    return function onConnection(error, connection) {
      if ((!error) && connection) {
        self.modify(connection);
      }

      callback(error, connection);
    };
  },
  /**
   * Modifies the C++ connection object with js implemented functions.
   *
   * @function
   * @memberof! Connection
   * @public
   * @param {object} connection - The oracledb connection instance
   */
  modify: function modify(connection) {
    if (connection && (!connection.nativeExecute)) {
      connection.nativeExecute = connection.execute;
      connection.execute = Connection.prototype.execute;
    }
  }
};
