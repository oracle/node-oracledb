/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   file.js
 *
 * DESCRIPTION
 *   file manipulate
 *****************************************************************************/
'use strict';
var should   = require('should');
var fs       = require('fs');
var random   = require('./random.js');

var file = exports;
module.exports = file;

file.create = function(filePath) {
  fs.closeSync(fs.openSync(filePath, 'w'));
};

file.write = function(filePath, content) {
  var stream = fs.createWriteStream(filePath, { flags: 'w', defaultEncoding: 'utf8', autoClose: true });
  stream.write(content);
  stream.end();
};

file.delete = function(filePath) {
  if (fs.existsSync(filePath) === true) {
    fs.unlink(filePath, function(err) {
      should.not.exist(err);
    });
  }
};

file.createFileInKB = function(fileName, length, specialStr) {
  var bigStr = random.getRandomString(length, specialStr);
  var stream = fs.createWriteStream(fileName, { flags: 'w', defaultEncoding: 'utf8', autoClose: true });
  stream.write(bigStr);
  stream.end();
};
