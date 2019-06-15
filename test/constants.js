/* Copyright (c) 2016, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 * The node-oracledb test suite uses 'mocha', 'should' and 'async'.
 * See LICENSE.md for relevant licenses.
 *
 * NAME
 *   18. constants.js
 *
 * DESCRIPTION
 *   Check the mapping between names and numbers of oracledb constants.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');

describe('18. constants.js', function() {

  it('18.1 dbTypes maps correctly between names and numbers', function() {

    should.exist(oracledb);
    (oracledb.DB_TYPE_VARCHAR).should.be.exactly(1);
    (oracledb.DB_TYPE_NUMBER).should.be.exactly(2);
    (oracledb.DB_TYPE_DATE).should.be.exactly(12);
    (oracledb.DB_TYPE_RAW).should.be.exactly(23);
    (oracledb.DB_TYPE_CHAR).should.be.exactly(96);
    (oracledb.DB_TYPE_BINARY_FLOAT).should.be.exactly(100);
    (oracledb.DB_TYPE_BINARY_DOUBLE).should.be.exactly(101);
    (oracledb.DB_TYPE_ROWID).should.be.exactly(104);
    (oracledb.DB_TYPE_CLOB).should.be.exactly(112);
    (oracledb.DB_TYPE_BLOB).should.be.exactly(113);
    (oracledb.DB_TYPE_TIMESTAMP).should.be.exactly(187);
    (oracledb.DB_TYPE_TIMESTAMP_TZ).should.be.exactly(188);
    (oracledb.DB_TYPE_TIMESTAMP_LTZ).should.be.exactly(232);

  });

  it('18.2 jsTypes maps correctly', function() {

    (oracledb.DEFAULT).should.be.exactly(0);
    (oracledb.STRING).should.be.exactly(2001);
    (oracledb.NUMBER).should.be.exactly(2002);
    (oracledb.DATE).should.be.exactly(2003);
    (oracledb.CURSOR).should.be.exactly(2004);
    (oracledb.BUFFER).should.be.exactly(2005);
    (oracledb.CLOB).should.be.exactly(2006);
    (oracledb.BLOB).should.be.exactly(2007);

  });

  it('18.3 binding contants maps correctly', function() {

    (oracledb.BIND_IN).should.be.exactly(3001);
    (oracledb.BIND_INOUT).should.be.exactly(3002);
    (oracledb.BIND_OUT).should.be.exactly(3003);
    (oracledb.OUT_FORMAT_ARRAY).should.be.exactly(4001);
    (oracledb.OUT_FORMAT_OBJECT).should.be.exactly(4002);

  });

  it('18.4 SQL Statement Type Constants', function() {

    should.strictEqual(oracledb.STMT_TYPE_UNKNOWN, 0);
    should.strictEqual(oracledb.STMT_TYPE_SELECT, 1);
    should.strictEqual(oracledb.STMT_TYPE_UPDATE, 2);
    should.strictEqual(oracledb.STMT_TYPE_DELETE, 3);
    should.strictEqual(oracledb.STMT_TYPE_INSERT, 4);
    should.strictEqual(oracledb.STMT_TYPE_CREATE, 5);
    should.strictEqual(oracledb.STMT_TYPE_DROP, 6);
    should.strictEqual(oracledb.STMT_TYPE_ALTER, 7);
    should.strictEqual(oracledb.STMT_TYPE_BEGIN, 8);
    should.strictEqual(oracledb.STMT_TYPE_DECLARE, 9);
    should.strictEqual(oracledb.STMT_TYPE_CALL, 10);
    should.strictEqual(oracledb.STMT_TYPE_EXPLAIN_PLAN, 15);
    should.strictEqual(oracledb.STMT_TYPE_MERGE, 16);
    should.strictEqual(oracledb.STMT_TYPE_ROLLBACK, 17);
    should.strictEqual(oracledb.STMT_TYPE_COMMIT, 21);

  });

});
