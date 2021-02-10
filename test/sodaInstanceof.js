/* Copyright (c) 2019, 2021, Oracle and/or its affiliates. All rights reserved. */

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
 *   186. sodaInstanceof.js
 *
 * DESCRIPTION
 *   The instanceof checks for SODA classes.
 *
 *****************************************************************************/
'use strict';

const oracledb  = require('oracledb');
const should    = require('should');
const dbConfig  = require('./dbconfig.js');
const sodaUtil  = require('./sodaUtil.js');
const testsUtil = require('./testsUtil.js');

describe('186. sodaInstanceof.js', function() {

  before(async function() {
    let isSodaRunnable = await testsUtil.isSodaRunnable();

    const clientVersion = oracledb.oracleClientVersion;
    let isClientOK;
    if (clientVersion < 2000000000) {
      isClientOK = false;
    } else {
      isClientOK = true;
    }

    const isRunnable = isClientOK && isSodaRunnable;
    if (!isRunnable) {
      this.skip();
      return;
    }

    await sodaUtil.cleanup();
    await sodaUtil.grantPrivilege();
  });

  it('186.1 instanceof checks for SODA classes', async function() {
    let conn, coll, cursor;
    try {
      conn = await oracledb.getConnection(dbConfig);

      let sodaDB = conn.getSodaDatabase();
      let isInstanceofCorrect = (sodaDB instanceof oracledb.SodaDatabase);
      isInstanceofCorrect.should.be.true();

      let doc = sodaDB.createDocument({name: "Chris", city: "Melbourne"});
      isInstanceofCorrect = (doc instanceof oracledb.SodaDocument);
      isInstanceofCorrect.should.be.true();

      coll = await sodaDB.createCollection("node_test_186_1");
      isInstanceofCorrect = (coll instanceof oracledb.SodaCollection);
      isInstanceofCorrect.should.be.true();

      let operation = coll.find();
      isInstanceofCorrect = (operation instanceof oracledb.SodaOperation);
      isInstanceofCorrect.should.be.true();

      cursor = await operation.getCursor();
      isInstanceofCorrect = (cursor instanceof oracledb.SodaDocCursor);
      isInstanceofCorrect.should.be.true();

    } catch (err) {
      should.not.exist(err);
    } finally {
      if (cursor) {
        try {
          await cursor.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
      if (coll) {
        try {
          await coll.drop();
        } catch(err) {
          should.not.exist(err);
        }
      }
      if (conn) {
        try {
          await conn.close();
        } catch(err) {
          should.not.exist(err);
        }
      }
    }
  });

});