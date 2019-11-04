/* Copyright (c) 2016, 2019, Oracle and/or its affiliates. All rights reserved. */

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

const oracledb = require('oracledb');
const should   = require('should');

describe('18. constants.js', function() {

  it('18.1 Query outFormat Constants', () => {
    should.strictEqual(4001, oracledb.OUT_FORMAT_ARRAY);
    should.strictEqual(4002, oracledb.OUT_FORMAT_OBJECT);
  });

  it('18.2 Node-oracledb Type Constants', () => {
    should.strictEqual(2019, oracledb.BLOB);
    should.strictEqual(2006, oracledb.BUFFER);
    should.strictEqual(2017, oracledb.CLOB);
    should.strictEqual(2021, oracledb.CURSOR);
    should.strictEqual(2014, oracledb.DATE);
    should.strictEqual(0,    oracledb.DEFAULT);
    should.strictEqual(2010, oracledb.NUMBER);
    should.strictEqual(2001, oracledb.STRING);

  });

  it('18.3 Oracle Database Type Constants', function() {

    should.strictEqual(2020, oracledb.DB_TYPE_BFILE);
    should.strictEqual(2008, oracledb.DB_TYPE_BINARY_DOUBLE);
    should.strictEqual(2007, oracledb.DB_TYPE_BINARY_FLOAT);
    should.strictEqual(2009, oracledb.DB_TYPE_BINARY_INTEGER);
    should.strictEqual(2019, oracledb.DB_TYPE_BLOB);
    should.strictEqual(2022, oracledb.DB_TYPE_BOOLEAN);
    should.strictEqual(2003, oracledb.DB_TYPE_CHAR);
    should.strictEqual(2017, oracledb.DB_TYPE_CLOB);
    should.strictEqual(2021, oracledb.DB_TYPE_CURSOR);
    should.strictEqual(2011, oracledb.DB_TYPE_DATE);
    should.strictEqual(2015, oracledb.DB_TYPE_INTERVAL_DS);
    should.strictEqual(2016, oracledb.DB_TYPE_INTERVAL_YM);
    should.strictEqual(2024, oracledb.DB_TYPE_LONG);
    should.strictEqual(2025, oracledb.DB_TYPE_LONG_RAW);
    should.strictEqual(2004, oracledb.DB_TYPE_NCHAR);
    should.strictEqual(2018, oracledb.DB_TYPE_NCLOB);
    should.strictEqual(2010, oracledb.DB_TYPE_NUMBER);
    should.strictEqual(2002, oracledb.DB_TYPE_NVARCHAR);
    should.strictEqual(2023, oracledb.DB_TYPE_OBJECT);
    should.strictEqual(2006, oracledb.DB_TYPE_RAW);
    should.strictEqual(2005, oracledb.DB_TYPE_ROWID);
    should.strictEqual(2012, oracledb.DB_TYPE_TIMESTAMP);
    should.strictEqual(2014, oracledb.DB_TYPE_TIMESTAMP_LTZ);
    should.strictEqual(2013, oracledb.DB_TYPE_TIMESTAMP_TZ);
    should.strictEqual(2001, oracledb.DB_TYPE_VARCHAR);

  });

  it('18.4 Execute Bind Direction Constants', () => {
    should.strictEqual(3001, oracledb.BIND_IN);
    should.strictEqual(3002, oracledb.BIND_INOUT);
    should.strictEqual(3003, oracledb.BIND_OUT);
  });

  it('18.5 Privileged Connection Constants', () => {
    should.strictEqual(32768,   oracledb.SYSASM);
    should.strictEqual(131072,  oracledb.SYSBACKUP);
    should.strictEqual(2,       oracledb.SYSDBA);
    should.strictEqual(262144,  oracledb.SYSDG);
    should.strictEqual(524288,  oracledb.SYSKM);
    should.strictEqual(4,       oracledb.SYSOPER);
    should.strictEqual(1048576, oracledb.SYSRAC);
  });

  it('18.6 SQL Statement Type Constants', () => {
    should.strictEqual(7,  oracledb.STMT_TYPE_ALTER);
    should.strictEqual(8,  oracledb.STMT_TYPE_BEGIN);
    should.strictEqual(10, oracledb.STMT_TYPE_CALL);
    should.strictEqual(21, oracledb.STMT_TYPE_COMMIT);
    should.strictEqual(5,  oracledb.STMT_TYPE_CREATE);
    should.strictEqual(9,  oracledb.STMT_TYPE_DECLARE);
    should.strictEqual(3,  oracledb.STMT_TYPE_DELETE);
    should.strictEqual(6,  oracledb.STMT_TYPE_DROP);
    should.strictEqual(15, oracledb.STMT_TYPE_EXPLAIN_PLAN);
    should.strictEqual(4,  oracledb.STMT_TYPE_INSERT);
    should.strictEqual(16, oracledb.STMT_TYPE_MERGE);
    should.strictEqual(17, oracledb.STMT_TYPE_ROLLBACK);
    should.strictEqual(1,  oracledb.STMT_TYPE_SELECT);
    should.strictEqual(0,  oracledb.STMT_TYPE_UNKNOWN);
    should.strictEqual(2,  oracledb.STMT_TYPE_UPDATE);
  });

  it('18.7 Subscription Constants', () => {
    should.strictEqual(100, oracledb.SUBSCR_EVENT_TYPE_AQ);
    should.strictEqual(5,   oracledb.SUBSCR_EVENT_TYPE_DEREG);
    should.strictEqual(6,   oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
    should.strictEqual(7,   oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
    should.strictEqual(2,   oracledb.SUBSCR_EVENT_TYPE_SHUTDOWN);
    should.strictEqual(3,   oracledb.SUBSCR_EVENT_TYPE_SHUTDOWN_ANY);
    should.strictEqual(1,   oracledb.SUBSCR_EVENT_TYPE_STARTUP);
    should.strictEqual(1,   oracledb.SUBSCR_GROUPING_CLASS_TIME);
    should.strictEqual(2,   oracledb.SUBSCR_GROUPING_TYPE_LAST);
    should.strictEqual(1,   oracledb.SUBSCR_GROUPING_TYPE_SUMMARY);
    should.strictEqual(16,  oracledb.SUBSCR_QOS_BEST_EFFORT);
    should.strictEqual(2,   oracledb.SUBSCR_QOS_DEREG_NFY);
    should.strictEqual(8,   oracledb.SUBSCR_QOS_QUERY);
    should.strictEqual(1,   oracledb.SUBSCR_QOS_RELIABLE);
    should.strictEqual(4,   oracledb.SUBSCR_QOS_ROWIDS);
    should.strictEqual(1,   oracledb.SUBSCR_NAMESPACE_AQ);
    should.strictEqual(2,   oracledb.SUBSCR_NAMESPACE_DBCHANGE);
  });

  it('18.8 Advanced Queuing Constants', () => {
    should.strictEqual(1, oracledb.AQ_DEQ_MODE_BROWSE);
    should.strictEqual(2, oracledb.AQ_DEQ_MODE_LOCKED);
    should.strictEqual(3, oracledb.AQ_DEQ_MODE_REMOVE);
    should.strictEqual(4, oracledb.AQ_DEQ_MODE_REMOVE_NO_DATA);

    should.strictEqual(1, oracledb.AQ_DEQ_NAV_FIRST_MSG);
    should.strictEqual(2, oracledb.AQ_DEQ_NAV_NEXT_TRANSACTION);
    should.strictEqual(3, oracledb.AQ_DEQ_NAV_NEXT_MSG);

    should.strictEqual(0, oracledb.AQ_DEQ_NO_WAIT);
    should.strictEqual(4294967295, oracledb.AQ_DEQ_WAIT_FOREVER);

    should.strictEqual(1, oracledb.AQ_MSG_DELIV_MODE_PERSISTENT);
    should.strictEqual(2, oracledb.AQ_MSG_DELIV_MODE_BUFFERED);
    should.strictEqual(3, oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED);

    should.strictEqual(0, oracledb.AQ_MSG_STATE_READY);
    should.strictEqual(1, oracledb.AQ_MSG_STATE_WAITING);
    should.strictEqual(2, oracledb.AQ_MSG_STATE_PROCESSED);
    should.strictEqual(3, oracledb.AQ_MSG_STATE_EXPIRED);

    should.strictEqual(1, oracledb.AQ_VISIBILITY_IMMEDIATE);
    should.strictEqual(2, oracledb.AQ_VISIBILITY_ON_COMMIT);

  });

  it('18.9 Continuous Query Notification Constants', () => {
    should.strictEqual(0,  oracledb.CQN_OPCODE_ALL_OPS);
    should.strictEqual(1,  oracledb.CQN_OPCODE_ALL_ROWS);
    should.strictEqual(16, oracledb.CQN_OPCODE_ALTER);
    should.strictEqual(8,  oracledb.CQN_OPCODE_DELETE);
    should.strictEqual(32, oracledb.CQN_OPCODE_DROP);
    should.strictEqual(2,  oracledb.CQN_OPCODE_INSERT);
    should.strictEqual(4,  oracledb.CQN_OPCODE_UPDATE);
  });

  it('18.10 Pool Status Constants', () => {
    should.strictEqual(6002, oracledb.POOL_STATUS_CLOSED);
    should.strictEqual(6001, oracledb.POOL_STATUS_DRAINING);
    should.strictEqual(6000, oracledb.POOL_STATUS_OPEN);
  });

  it('18.11 Simple Oracle Document Access (SODA) Constants', () => {
    should.strictEqual(5001, oracledb.SODA_COLL_MAP_MODE);
  });

});