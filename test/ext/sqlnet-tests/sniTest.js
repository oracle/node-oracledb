/* Copyright (c) 2025, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
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
 *   1. sniTest.js
 *
 * DESCRIPTION
 *   This test checks that the SNI (Server Name Indication) extension is
 *   correctly used when connecting to a TLS-enabled database.  With
 *   NODE_ORACLEDB_DEBUG_PACKETS=on, the packet dump should not show a
 *   RESEND(NSPTRS) packet with SNI set to true.
 *
 *   SNI can be set in dbconfig or the connection string.
 *   To test SNI using connection string and config, you can try the following
 *   - Set useSNI to true in dbconfig and USE_SNI = on in the connect string.
 *   - Set useSNI to false in dbconfig and USE_SNI = off in the connect string.
 *   - Set useSNI to false in dbconfig and USE_SNI = on in the connect string.
 *   - Set useSNI to true in dbconfig and USE_SNI = off in the connect string.
 *
 *****************************************************************************/
'use strict';
const oracledb = require("oracledb");
const assert = require('assert');
const fs = require('fs').promises;
const dbConfig = require('../../dbconfig.js');
const testsUtil = require('../../testsUtil.js');
const path = require('path');
const os = require('os');

describe('1. SNI (Server Name Indication) test', function() {
  let isRunnable = false;
  before(async function() {
    isRunnable = await testsUtil.checkPrerequisites(2306000000, 2306000000);

    if (!isRunnable || !oracledb.thin) this.skip();

    process.env.NODE_ORACLEDB_DEBUG_PACKETS = 1; // Set to '1' to enable packet debugging
  });

  after(function() {
    process.env.NODE_ORACLEDB_DEBUG_PACKETS = 0; // Set to '0' to disable packet debugging
  });

  it('1.1 useSNI parameter set to true in the config', async function() {
    const tmpobj = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
    const tmpfile = path.join(tmpobj, "sniTest.txt");
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (string) => {
      fs.appendFile(tmpfile, string, (err) => {
        if (err) {
          console.error(err);
        }
      });
      originalStdoutWrite.apply(process.stdout, arguments);
    };
    dbConfig.useSNI = true;
    try {
      const conn = await oracledb.getConnection(dbConfig);
      const result = await conn.execute(`SELECT 'Hello World' FROM DUAL`);
      assert.strictEqual(result.rows[0][0], 'Hello World');
      await conn.close();
      process.stdout.write = originalStdoutWrite;
      const contents = await fs.readFile(tmpfile, {encoding: 'utf8'});
      assert(!contents.includes('Receiving packet 3 on stream 3:\n' +
                                '0000 : 00 08 00 00 0B 08 00 00 |........|'));
    } finally {
      await fs.unlink(tmpfile);
      await fs.rmdir(tmpobj);
    }
  }); // 1.1

  it('1.2 useSNI parameter set to false in the config', async function() {
    const tmpobj = await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-'));
    const tmpfile = path.join(tmpobj, "sniTest.txt");
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (string) => {
      fs.appendFile(tmpfile, string, (err) => {
        if (err) {
          console.error(err);
        }
      });
      originalStdoutWrite.apply(process.stdout, arguments);
    };
    dbConfig.useSNI = false;
    try {
      const conn = await oracledb.getConnection(dbConfig);
      const result = await conn.execute(`SELECT 'Hello World' FROM DUAL`);
      assert.strictEqual(result.rows[0][0], 'Hello World');
      await conn.close();
      process.stdout.write = originalStdoutWrite;
      const contents = await fs.readFile(tmpfile, {encoding: 'utf8'});
      assert(contents.includes('Receiving packet 3 on stream 3:\n' +
        '0000 : 00 08 00 00 0B 08 00 00 |........|'));
    } finally {
      await fs.unlink(tmpfile);
      await fs.rmdir(tmpobj);
    }
  }); // 1.2
});
