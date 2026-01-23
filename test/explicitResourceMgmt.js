/* Copyright (c) 2026, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   explicitResourceMgmt.js
 *
 * DESCRIPTION
 *   Testing Explicit Resource Management (using) for Connection, Pool, and
 *   ResultSet objects.
 *   This feature requires Node.js 24 or later.
 *
 *****************************************************************************/

'use strict';

const majorNodeJsVersion = parseInt(process.version.substring(1).split('.')[0]);

if (majorNodeJsVersion >= 24) {
  require('./explicitResourceMgmtInner.js');
} else {
  describe('323. explicitResourceMgmt.js', function() {
    it('Skipping tests for Node.js version < 24', function() {
      this.skip();
    });
  });
}
