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

// This close function is just a place holder to allow for easier extension later.
function close() {
  var self = this;

  self._close.apply(self, arguments);
}

// This getRow function is just a place holder to allow for easier extension later.
function getRow() {
  var self = this;

  self._getRow.apply(self, arguments);
}

// This getRows function is just a place holder to allow for easier extension later.
function getRows() {
  var self = this;

  self._getRows.apply(self, arguments);
}

// The extend method is used to extend the ResultSet instance from the C layer with
// custom properties and method overrides. References to the original methods are
// maintained so they can be invoked by the overriding method at the right time.
function extend(resultSet) {
  // Using Object.defineProperties to add properties to the ResultSet instance with
  // special properties, such as enumerable but not writable.
  Object.defineProperties(
    resultSet,
    {
      _close: {
        value: resultSet.close
      },
      close: {
        value: close,
        enumerable: true,
        writable: true
      },
      _getRow: {
        value: resultSet.getRow
      },
      getRow: {
        value: getRow,
        enumerable: true,
        writable: true
      },
      _getRows: {
        value: resultSet.getRows
      },
      getRows: {
        value: getRows,
        enumerable: true,
        writable: true
      }
    }
  );
}

module.exports.extend = extend;
