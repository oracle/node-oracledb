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

var util = require('util');
var stream = require('stream');
var Readable = stream.Readable;

/**
 * A node.js read stream for resultsets (based on https://github.com/sagiegurari/simple-oracledb/blob/master/lib/resultset-read-stream.js).
 *
 * @author Sagie Gur-Ari
 * @class ResultSetReadStream
 * @public
 */
function ResultSetReadStream() {
    var self = this;

    Readable.call(self, {
        objectMode: true
    });

    Object.defineProperty(self, 'nextRow', {
        /**
         * Sets the nextRow value.
         *
         * @function
         * @memberof! ResultSetReadStream
         * @alias ResultSetReadStream.nextRow.set
         * @private
         * @param {function} nextRow - The next row callback function
         */
        set: function (nextRow) {
            self.next = nextRow;

            if (self.inRead) {
                /*jslint nomen: true */
                /*eslint-disable no-underscore-dangle*/
                //jscs:disable disallowDanglingUnderscores
                self._read();
                //jscs:enable disallowDanglingUnderscores
                /*eslint-enable no-underscore-dangle*/
                /*jslint nomen: false */
            }
        }
    });
}

util.inherits(ResultSetReadStream, Readable);

/*jslint nomen: true */
/*eslint-disable no-underscore-dangle*/
//jscs:disable disallowDanglingUnderscores
/**
 * The stream _read implementation which fetches the next row from the resultset.
 *
 * @function
 * @memberof! ResultSetReadStream
 * @private
 */
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
//jscs:enable disallowDanglingUnderscores
/*eslint-enable no-underscore-dangle*/
/*jslint nomen: false */

module.exports = ResultSetReadStream;
