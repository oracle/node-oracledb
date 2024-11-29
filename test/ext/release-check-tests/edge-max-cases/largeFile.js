/* Copyright (c) 2024, Oracle and/or its affiliates. All rights reserved. */

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
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   largeFile.js
 *
 * DESCRIPTION
 *   generate large file
 *****************************************************************************/
'use strict';
const fs       = require('fs');
const random = require('../../../random.js');

const largeFile = exports;
module.exports = largeFile;

// generate large file which size is ((fileSizeInGB)GB-minusNum)
largeFile.createFileInGB = function(fileName, fileSizeInGB, minusNum) {
  fs.closeSync(fs.openSync(fileName, 'w'));
  let bigBuffer = Buffer.from("", 'utf8');
  const loop = fileSizeInGB * 8;
  const stringSizeInEachLoop = 128 * 1024 * 1024;
  let bigStr;
  for (let i = 1; i <= loop - 1 ; i++) {
    bigStr = random.getRandomLengthString(stringSizeInEachLoop);
    bigBuffer = Buffer.from(bigStr, 'utf8');
    fs.appendFileSync(fileName, bigBuffer);
  }

  let bigBuffer_last, bigStr_last, length;
  if (minusNum > 0) {
    length = stringSizeInEachLoop - minusNum;
    bigStr_last = random.getRandomLengthString(length);
    bigBuffer_last = Buffer.from(bigStr_last, 'utf8');
  } else {
    length = stringSizeInEachLoop;
    bigStr_last = random.getRandomLengthString(length);
    bigBuffer_last = Buffer.from(bigStr_last, 'utf8');
  }
  fs.appendFileSync(fileName, bigBuffer_last);
};

// generate large file which size is ((length)KB)
largeFile.createFileInKB = function(fileName, length, specialStr) {
  const bigStr = random.getRandomString(length, specialStr);
  fs.writeFileSync(fileName, bigStr);
};
