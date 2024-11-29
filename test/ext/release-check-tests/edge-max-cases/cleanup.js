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
 *   cleanup.js
 *
 * DESCRIPTION
 *   clean the txt file left due to test failure.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

const fs = require('fs');

describe('cleanup.js', function() {
  describe('cleanup', function() {
    it('', function() {
      fs.readdirSync(__dirname).forEach(fileName => {
        const suffix = fileName.substring(fileName.length - 4, fileName.length);
        if (suffix === '.txt' && fileName != 'list.txt') {
          const filePath = __dirname + "/" + fileName;
          if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
        }
      });
    });
  });

});
