/* Copyright (c) 2016, 2023, Oracle and/or its affiliates. */

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
 *   18. constants.js
 *
 * DESCRIPTION
 *   Check the mapping between names and numbers of oracledb constants.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');

describe('18. constants.js', function() {

  it('18.1 Query outFormat Constants', () => {
    assert.strictEqual(4001, oracledb.OUT_FORMAT_ARRAY);
    assert.strictEqual(4002, oracledb.OUT_FORMAT_OBJECT);
  });

  it('18.2 Node-oracledb Type Constants', () => {
    assert.strictEqual(2019, oracledb.BLOB.num);
    assert.strictEqual(2006, oracledb.BUFFER.num);
    assert.strictEqual(2017, oracledb.CLOB.num);
    assert.strictEqual(2021, oracledb.CURSOR.num);
    assert.strictEqual(2014, oracledb.DATE.num);
    assert.strictEqual(0,    oracledb.DEFAULT);
    assert.strictEqual(2010, oracledb.NUMBER.num);
    assert.strictEqual(2001, oracledb.STRING.num);

  });

  it('18.3 Oracle Database Type Constants', function() {

    assert.strictEqual(2020, oracledb.DB_TYPE_BFILE.num);
    assert.strictEqual(2008, oracledb.DB_TYPE_BINARY_DOUBLE.num);
    assert.strictEqual(2007, oracledb.DB_TYPE_BINARY_FLOAT.num);
    assert.strictEqual(2009, oracledb.DB_TYPE_BINARY_INTEGER.num);
    assert.strictEqual(2019, oracledb.DB_TYPE_BLOB.num);
    assert.strictEqual(2022, oracledb.DB_TYPE_BOOLEAN.num);
    assert.strictEqual(2003, oracledb.DB_TYPE_CHAR.num);
    assert.strictEqual(2017, oracledb.DB_TYPE_CLOB.num);
    assert.strictEqual(2021, oracledb.DB_TYPE_CURSOR.num);
    assert.strictEqual(2011, oracledb.DB_TYPE_DATE.num);
    assert.strictEqual(2015, oracledb.DB_TYPE_INTERVAL_DS.num);
    assert.strictEqual(2016, oracledb.DB_TYPE_INTERVAL_YM.num);
    assert.strictEqual(2024, oracledb.DB_TYPE_LONG.num);
    assert.strictEqual(2025, oracledb.DB_TYPE_LONG_RAW.num);
    assert.strictEqual(2004, oracledb.DB_TYPE_NCHAR.num);
    assert.strictEqual(2018, oracledb.DB_TYPE_NCLOB.num);
    assert.strictEqual(2010, oracledb.DB_TYPE_NUMBER.num);
    assert.strictEqual(2002, oracledb.DB_TYPE_NVARCHAR.num);
    assert.strictEqual(2023, oracledb.DB_TYPE_OBJECT.num);
    assert.strictEqual(2006, oracledb.DB_TYPE_RAW.num);
    assert.strictEqual(2005, oracledb.DB_TYPE_ROWID.num);
    assert.strictEqual(2012, oracledb.DB_TYPE_TIMESTAMP.num);
    assert.strictEqual(2014, oracledb.DB_TYPE_TIMESTAMP_LTZ.num);
    assert.strictEqual(2013, oracledb.DB_TYPE_TIMESTAMP_TZ.num);
    assert.strictEqual(2001, oracledb.DB_TYPE_VARCHAR.num);

  });

  it('18.4 Execute Bind Direction Constants', () => {
    assert.strictEqual(3001, oracledb.BIND_IN);
    assert.strictEqual(3002, oracledb.BIND_INOUT);
    assert.strictEqual(3003, oracledb.BIND_OUT);
  });

  it('18.5 Privileged Connection Constants', () => {
    assert.strictEqual(32768,   oracledb.SYSASM);
    assert.strictEqual(131072,  oracledb.SYSBACKUP);
    assert.strictEqual(2,       oracledb.SYSDBA);
    assert.strictEqual(262144,  oracledb.SYSDG);
    assert.strictEqual(524288,  oracledb.SYSKM);
    assert.strictEqual(4,       oracledb.SYSOPER);
    assert.strictEqual(1048576, oracledb.SYSRAC);
  });

  it('18.6 SQL Statement Type Constants', () => {
    assert.strictEqual(7,  oracledb.STMT_TYPE_ALTER);
    assert.strictEqual(8,  oracledb.STMT_TYPE_BEGIN);
    assert.strictEqual(10, oracledb.STMT_TYPE_CALL);
    assert.strictEqual(21, oracledb.STMT_TYPE_COMMIT);
    assert.strictEqual(5,  oracledb.STMT_TYPE_CREATE);
    assert.strictEqual(9,  oracledb.STMT_TYPE_DECLARE);
    assert.strictEqual(3,  oracledb.STMT_TYPE_DELETE);
    assert.strictEqual(6,  oracledb.STMT_TYPE_DROP);
    assert.strictEqual(15, oracledb.STMT_TYPE_EXPLAIN_PLAN);
    assert.strictEqual(4,  oracledb.STMT_TYPE_INSERT);
    assert.strictEqual(16, oracledb.STMT_TYPE_MERGE);
    assert.strictEqual(17, oracledb.STMT_TYPE_ROLLBACK);
    assert.strictEqual(1,  oracledb.STMT_TYPE_SELECT);
    assert.strictEqual(0,  oracledb.STMT_TYPE_UNKNOWN);
    assert.strictEqual(2,  oracledb.STMT_TYPE_UPDATE);
  });

  it('18.7 Subscription Constants', () => {
    assert.strictEqual(100, oracledb.SUBSCR_EVENT_TYPE_AQ);
    assert.strictEqual(5,   oracledb.SUBSCR_EVENT_TYPE_DEREG);
    assert.strictEqual(6,   oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE);
    assert.strictEqual(7,   oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE);
    assert.strictEqual(2,   oracledb.SUBSCR_EVENT_TYPE_SHUTDOWN);
    assert.strictEqual(3,   oracledb.SUBSCR_EVENT_TYPE_SHUTDOWN_ANY);
    assert.strictEqual(1,   oracledb.SUBSCR_EVENT_TYPE_STARTUP);
    assert.strictEqual(1,   oracledb.SUBSCR_GROUPING_CLASS_TIME);
    assert.strictEqual(2,   oracledb.SUBSCR_GROUPING_TYPE_LAST);
    assert.strictEqual(1,   oracledb.SUBSCR_GROUPING_TYPE_SUMMARY);
    assert.strictEqual(16,  oracledb.SUBSCR_QOS_BEST_EFFORT);
    assert.strictEqual(2,   oracledb.SUBSCR_QOS_DEREG_NFY);
    assert.strictEqual(8,   oracledb.SUBSCR_QOS_QUERY);
    assert.strictEqual(1,   oracledb.SUBSCR_QOS_RELIABLE);
    assert.strictEqual(4,   oracledb.SUBSCR_QOS_ROWIDS);
    assert.strictEqual(1,   oracledb.SUBSCR_NAMESPACE_AQ);
    assert.strictEqual(2,   oracledb.SUBSCR_NAMESPACE_DBCHANGE);
  });

  it('18.8 Advanced Queuing Constants', () => {
    assert.strictEqual(1, oracledb.AQ_DEQ_MODE_BROWSE);
    assert.strictEqual(2, oracledb.AQ_DEQ_MODE_LOCKED);
    assert.strictEqual(3, oracledb.AQ_DEQ_MODE_REMOVE);
    assert.strictEqual(4, oracledb.AQ_DEQ_MODE_REMOVE_NO_DATA);

    assert.strictEqual(1, oracledb.AQ_DEQ_NAV_FIRST_MSG);
    assert.strictEqual(2, oracledb.AQ_DEQ_NAV_NEXT_TRANSACTION);
    assert.strictEqual(3, oracledb.AQ_DEQ_NAV_NEXT_MSG);

    assert.strictEqual(0, oracledb.AQ_DEQ_NO_WAIT);
    assert.strictEqual(4294967295, oracledb.AQ_DEQ_WAIT_FOREVER);

    assert.strictEqual(1, oracledb.AQ_MSG_DELIV_MODE_PERSISTENT);
    assert.strictEqual(2, oracledb.AQ_MSG_DELIV_MODE_BUFFERED);
    assert.strictEqual(3, oracledb.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED);

    assert.strictEqual(0, oracledb.AQ_MSG_STATE_READY);
    assert.strictEqual(1, oracledb.AQ_MSG_STATE_WAITING);
    assert.strictEqual(2, oracledb.AQ_MSG_STATE_PROCESSED);
    assert.strictEqual(3, oracledb.AQ_MSG_STATE_EXPIRED);

    assert.strictEqual(1, oracledb.AQ_VISIBILITY_IMMEDIATE);
    assert.strictEqual(2, oracledb.AQ_VISIBILITY_ON_COMMIT);

  });

  it('18.9 Continuous Query Notification Constants', () => {
    assert.strictEqual(0,  oracledb.CQN_OPCODE_ALL_OPS);
    assert.strictEqual(1,  oracledb.CQN_OPCODE_ALL_ROWS);
    assert.strictEqual(16, oracledb.CQN_OPCODE_ALTER);
    assert.strictEqual(8,  oracledb.CQN_OPCODE_DELETE);
    assert.strictEqual(32, oracledb.CQN_OPCODE_DROP);
    assert.strictEqual(2,  oracledb.CQN_OPCODE_INSERT);
    assert.strictEqual(4,  oracledb.CQN_OPCODE_UPDATE);
  });

  it('18.10 Pool Status Constants', () => {
    assert.strictEqual(6003, oracledb.POOL_STATUS_RECONFIGURING);
    assert.strictEqual(6002, oracledb.POOL_STATUS_CLOSED);
    assert.strictEqual(6001, oracledb.POOL_STATUS_DRAINING);
    assert.strictEqual(6000, oracledb.POOL_STATUS_OPEN);

  });

  it('18.11 Simple Oracle Document Access (SODA) Constants', () => {
    assert.strictEqual(5001, oracledb.SODA_COLL_MAP_MODE);
  });

});
