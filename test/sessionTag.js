/* Copyright (c) 2019, Oracle and/or its affiliates. All rights reserved. */

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
 *   sessionTag.js
 *
 * DESCRIPTION
 *   The functionality tests on session tagging and session fixup callback
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const dbconfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

const tag1 = "LANGUAGE=FRENCH";
const tag2 = "LANGUAGE=GERMAN";
const tagBad = "XXX=YYY";
const tagMulti = "LANGUAGE=FRENCH;USER_TZ=UTC";

async function showConnTags(conn) {
  const result = await conn.execute(`
    select * from plsql_fixup_calls
    order by fixup_timestamp desc
    fetch next 1 rows only
  `);
  return result.rows;
}

async function truncateTable() {
  let conn, result;
  try {
    conn = await oracledb.getConnection(dbconfig);
    result = await conn.execute("truncate table plsql_fixup_calls");
    return result;
  } catch (err) {
    should.not.exist(err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch(err) {
        should.not.exist(err);
      }
    }
  }
}

async function dropTable() {
  let conn, result;
  try {
    conn = await oracledb.getConnection(dbconfig);
    result = await conn.execute("drop table plsql_fixup_calls");
    result = await conn.execute("drop package plsql_fixup_test");
    return result;
  } catch (err) {
    should.not.exist(err);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch(err) {
        should.not.exist(err);
      }
    }
  }
}

describe('184. sessionTag.js', function () {

  before(async function() {
    let isRunnable = true;

    if (oracledb.oracleClientVersion < 1202000100) isRunnable = false;

    try {
      const connection = await oracledb.getConnection(dbconfig);
      const serverVersion = connection.oracleServerVersion;
      if (serverVersion < 1202000100) isRunnable = false;

      await connection.close();
    } catch(err) {
      should.not.exist(err);
    }

    if (!isRunnable) this.skip();
  });

  describe('184.1 Remote PL/SQL Callback', function () {

    before(async function () {
      let conn;
      try {
        conn = await oracledb.getConnection(dbconfig);
        let sql = "BEGIN \n" +
          "    DECLARE \n" +
          "        e_table_missing EXCEPTION; \n" +
          "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "    BEGIN \n" +
          "        EXECUTE IMMEDIATE('DROP TABLE plsql_fixup_calls PURGE'); \n" +
          "    EXCEPTION \n" +
          "        WHEN e_table_missing \n" +
          "        THEN NULL; \n" +
          "    END; \n" +
          "    EXECUTE IMMEDIATE (' \n" +
          "        CREATE TABLE plsql_fixup_calls ( \n" +
          "            requested_tag    varchar2(250), \n" +
          "            actual_tag       varchar2(250), \n" +
          "            fixup_timestamp  timestamp \n" +
          "        ) \n" +
          "    '); \n" +
          "END; ";
        await conn.execute(sql);
        sql = "create or replace package plsql_fixup_test as \n" +
          "  type property_t is table of varchar2(64) index by varchar2(64); \n" +
          "  procedure log_tag ( \n" +
          "    requested_tag       varchar2, \n" +
          "    actual_tag          varchar2 \n" +
          "  ); \n" +
          "  procedure log_tag_callback ( \n" +
          "    requested_tag       varchar2, \n" +
          "    actual_tag          varchar2 \n" +
          "  ); \n" +
          "  procedure build_tab ( \n" +
          "    tag                 in  varchar2, \n" +
          "    property_tab        out property_t \n" +
          "  ); \n" +
          "  procedure set_tag_callback ( \n" +
          "    requested_tag       in  varchar2, \n" +
          "    actual_tag          in  varchar2 \n" +
          "  ); \n" +
          "end; \n";
        await conn.execute(sql);
        sql = "create or replace package body plsql_fixup_test as \n" +
          "  procedure log_tag ( \n" +
          "    requested_tag       varchar2, \n" +
          "    actual_tag          varchar2 \n" +
          "  ) is \n" +
          "    pragma autonomous_transaction; \n" +
          "  begin \n" +
          "    insert into plsql_fixup_calls \n" +
          "    values (requested_tag, actual_tag, systimestamp); \n" +
          "    commit; \n" +
          "  end; \n" +
          "  procedure log_tag_callback ( \n" +
          "    requested_tag       varchar2, \n" +
          "    actual_tag          varchar2 \n" +
          "  ) is \n" +
          "  begin \n" +
          "    log_tag(requested_tag, actual_tag); \n" +
          "  end; \n" +
          "  procedure build_tab(tag in varchar2, property_tab out property_t) is \n" +
          "    property  varchar2(64); \n" +
          "    property_name  varchar2(64); \n" +
          "    property_value varchar2(64); \n" +
          "    property_end_pos number := 1; \n" +
          "    property_start_pos number := 1; \n" +
          "    property_name_end_pos number := 1; \n" +
          "  begin \n" +
          "    while (length(tag) > property_end_pos) \n" +
          "    loop \n" +
          "      property_end_pos := instr(tag, ';', property_start_pos); \n" +
          "      if (property_end_pos = 0) then \n" +
          "        property_end_pos := length(tag) + 1; \n" +
          "      end if; \n" +
          "      property_name_end_pos := instr(tag, '=', property_start_pos); \n" +
          "      property_name := substr(tag, property_start_pos, \n" +
          "                  property_name_end_pos - property_start_pos); \n" +
          "      property_value := substr(tag, property_name_end_pos + 1, \n" +
          "                    property_end_pos - property_name_end_pos - 1); \n" +
          "      property_tab(property_name) := property_value; \n" +
          "      property_start_pos := property_end_pos + 1; \n" +
          "    end loop; \n" +
          "  end; \n" +
          "  procedure set_tag_callback ( \n" +
          "    requested_tag in varchar2, \n" +
          "    actual_tag in varchar2 \n" +
          "  ) is \n" +
          "    req_prop_tab property_t; \n" +
          "    act_prop_tab property_t; \n" +
          "    property_name varchar2(64); \n" +
          "  begin \n" +
          "    build_tab(requested_tag, req_prop_tab); \n" +
          "    build_tab(actual_tag, act_prop_tab); \n" +
          "    property_name := req_prop_tab.first; \n" +
          "    while (property_name is not null) \n" +
          "    loop \n" +
          "      if ((not act_prop_tab.exists(property_name)) or \n" +
          "        (act_prop_tab(property_name) != req_prop_tab(property_name))) then \n" +
          "        execute immediate 'alter session set ' || property_name || '=''' || req_prop_tab(property_name) || ''''; \n" +
          "      end if; \n" +
          "      property_name := req_prop_tab.next(property_name); \n" +
          "    end loop; \n" +
          "  end; \n" +
          "end plsql_fixup_test; \n";
        await conn.execute(sql);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    beforeEach(async function () {
      await truncateTable();
    });

    after(async function () {
      await dropTable();
    });

    it('184.1.1 Acquire connection without tag', async function () {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        const res = await showConnTags(conn);
        should.strictEqual(res.length, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.2 Acquire connection from pool without tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection();
        const res = await showConnTags(conn);
        should.strictEqual(res.length, 0);
        should.strictEqual(conn.tag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.3 Acquire connection from pool with empty string tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: ''});
        const res = await showConnTags(conn);
        should.strictEqual(res.length, 0);
        should.strictEqual(conn.tag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.4 Acquire connection from pool with valid tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag1});
        const res = await showConnTags(conn);
        should.strictEqual(res[0][0], tag1);
        should.strictEqual(res[0][1], null);
        should.strictEqual(conn.tag, tag1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.5 Acquire connection from pool with error in callback', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.set_tag_callback",
        });
        await testsUtil.assertThrowsAsync(
          async () => {
            conn = await pool.getConnection({tag: tagBad});
          },
          /ORA-02248/ // ORA-02248 invalid option for ALTER SESSION
        );
        should.not.exist(conn);
        should.strictEqual(pool.connectionsOpen, 0);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.6 Acquire connection from pool twice with same tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        await truncateTable();
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        const res = await showConnTags(conn);
        should.strictEqual(res.length, 0);
        should.strictEqual(conn.tag, tag1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.7 Acquire connection from pool twice with different tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        await truncateTable();
        conn = await pool.getConnection({tag: tag2});
        should.strictEqual(pool.connectionsOpen, 2);
        should.strictEqual(pool.connectionsInUse, 1);
        const res = await showConnTags(conn);
        should.strictEqual(res[0][0], tag2);
        should.strictEqual(res[0][1], null);
        should.strictEqual(conn.tag, tag2);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.8 Acquire connection from pool twice with different tag using matchAnyTag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        await truncateTable();
        conn = await pool.getConnection({tag: tag2, matchAnyTag: true});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        const res = await showConnTags(conn);
        should.strictEqual(res[0][0], tag2);
        should.strictEqual(res[0][1], tag1);
        should.strictEqual(conn.tag, tag2);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.9 Acquire connection from pool twice with different multi-tag using matchAnyTag', async function () {
      if (oracledb.oracleClientVersion < 1202000000) this.skip();
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag2});
        await conn.close();
        conn = await pool.getConnection({tag: tagMulti});
        await conn.close();
        await truncateTable();
        conn = await pool.getConnection({tag: tag1, matchAnyTag: true});
        should.strictEqual(pool.connectionsOpen, 2);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(conn.tag, tagMulti);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.10 Acquire connection from pool twice with empty string tag using matchAnyTag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        await truncateTable();
        conn = await pool.getConnection({tag: '', matchAnyTag: true});
        should.strictEqual(pool.connectionsOpen, 2);
        should.strictEqual(pool.connectionsInUse, 1);
        const res = await showConnTags(conn);
        should.strictEqual(res.length, 0);
        should.strictEqual(conn.tag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it.skip('184.1.11 Acquire connection from pool twice with first connection\'s tag set to ""', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag1});
        conn.tag = '';
        await conn.close();
        await truncateTable();
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        const res = await showConnTags(conn);
        should.strictEqual(res[0][0], tag1);
        should.strictEqual(res[0][1], null);
        should.strictEqual(conn.tag, tag1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.1.12 Acquire connection from pool twice with different tag after setting first connection\'s tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: "plsql_fixup_test.log_tag_callback",
        });
        conn = await pool.getConnection({tag: tag1});
        conn.tag = tag2;
        await conn.close();
        await truncateTable();
        conn = await pool.getConnection({tag: tag2});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        const res = await showConnTags(conn);
        should.strictEqual(res.length, 0);
        should.strictEqual(conn.tag, tag2);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });
  });


  describe('184.2 Local Javascript Callback', function () {

    let callbackRequestedTag, callbackActualTag;

    async function asyncTagFixup(conn, requestedTag, cb) {
      callbackRequestedTag = requestedTag;
      callbackActualTag = conn.tag;

      if (requestedTag) {
        const tagParts = requestedTag.split('=');
        try {
          conn.tag = requestedTag;
          await conn.execute(`ALTER SESSION SET nls_language = '${tagParts[1]}'`);

        } catch (err) {
          cb(err);
        }
      } else {
        cb();
      }
    }

    function tagFixup(conn, requestedTag, cb) {
      callbackRequestedTag = requestedTag;
      callbackActualTag = conn.tag;

      if (requestedTag) {
        const tagParts = requestedTag.split('=');
        conn.execute(`ALTER SESSION SET nls_language = '${tagParts[1]}'`, (err) => {
          if (!err) conn.tag = requestedTag;
          cb(err);
        });
      } else {
        cb();
      }
    }

    function simpleTagFixup(conn, requestedTag, cb) {
      callbackRequestedTag = requestedTag;
      callbackActualTag = conn.tag;

      if (requestedTag) conn.tag = requestedTag;
      cb();
    }

    function resetTag() {
      callbackRequestedTag = null;
      callbackActualTag = null;
    }

    beforeEach(function () {
      resetTag();
    });

    it('184.2.1 Acquire connection without tag', async function () {
      let conn;
      try {
        conn = await oracledb.getConnection({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        should.strictEqual(callbackRequestedTag, null);
        should.strictEqual(callbackActualTag, null);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.2 Acquire connection from pool without tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection();
        should.strictEqual(callbackRequestedTag, '');
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.3 Acquire connection from pool with empty string tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: ''});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, '');
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.4 Acquire connection from default pool with valid tag', async function () {
      let pool, conn;
      pool = await oracledb.createPool(dbconfig);
      try {
        pool = await oracledb.getPool('default');
        await pool.close();
      } catch (err) {
        // NJS-047: poolAlias "default" not found in the connection pool cache
        if (!err.message.startsWith("NJS-047:")) this.skip();
      }
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await oracledb.getConnection({poolAlias: 'default', tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, tag1);
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.5 Acquire connection from pool with valid tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(callbackRequestedTag, tag1);
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.6 Acquire connection from pool with bad tag using async session callback', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: asyncTagFixup,
        });
        await testsUtil.assertThrowsAsync(
          async () => {
            conn = await pool.getConnection({tag: tagBad});
          },
          /ORA-12705/ //ORA-12705: Cannot access NLS data files or invalid environment specified
        );
        should.not.exist(conn);
        should.strictEqual(pool.connectionsOpen, 0);
        should.strictEqual(callbackRequestedTag, tagBad);
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.7 Acquire connection from pool with bad tag using sync session callback', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        await testsUtil.assertThrowsAsync(
          async () => {
            conn = await pool.getConnection({tag: tagBad});
          },
          /ORA-12705/ //ORA-12705: Cannot access NLS data files or invalid environment specified
        );
        should.not.exist(conn);
        should.strictEqual(pool.connectionsOpen, 0);
        should.strictEqual(callbackRequestedTag, tagBad);
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.8 Acquire connection from pool twice with same tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        resetTag();
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, null);
        should.strictEqual(callbackActualTag, null);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.9 Acquire connection from pool twice with different tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        resetTag();
        conn = await pool.getConnection({tag: tag2});
        should.strictEqual(pool.connectionsOpen, 2);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, tag2);
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.10 Acquire connection from pool twice with different tag using matchAnyTag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        resetTag();
        conn = await pool.getConnection({tag: tag2, matchAnyTag: true});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, tag2);
        should.strictEqual(callbackActualTag, tag1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.11 Acquire connection from pool twice with different multi-tag using matchAnyTag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: simpleTagFixup,
        });
        conn = await pool.getConnection({tag: tag2});
        await conn.close();
        conn = await pool.getConnection({tag: tagMulti});
        await conn.close();
        resetTag();
        conn = await pool.getConnection({tag: tag1, matchAnyTag: true});
        should.strictEqual(pool.connectionsOpen, 2);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, tag1);
        should.strictEqual(callbackActualTag, tagMulti);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.12 Acquire connection from pool twice with first connection\'s tag set to ""', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        conn.tag = '';
        await conn.close();
        resetTag();
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, tag1);
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.2.13 Acquire connection from pool twice with different tag after setting first connection\'s tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        conn.tag = tag2;
        await conn.close();
        resetTag();
        conn = await pool.getConnection({tag: tag2});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, null);
        should.strictEqual(callbackActualTag, null);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });
  });

  describe('184.3 Change connection\'s tag before the connection is closed', function () {

    function tagFixup(conn, requestedTag, cb) {
      if (requestedTag)
        conn.tag = requestedTag;
      cb();
    }

    it('184.3.1 Setting connection\'s tag to undefined triggers error NJS-004', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        await testsUtil.assertThrowsAsync(() => {
          conn.tag = undefined;
        },
        /NJS-004/ //NJS-004: invalid value for property
        );
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.3.2 Setting connection\'s tag to random object triggers error NJS-004', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        await testsUtil.assertThrowsAsync(() => {
          conn.tag = {data: ["doesn't matter"], status: "SUCC"};
        },
        /NJS-004/ //NJS-004: invalid value for property
        );
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it.skip('184.3.3 Closing randomly tagged connection triggers error ORA-24488', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        conn.tag = "it doesn't matter";
        await testsUtil.assertThrowsAsync(async () => {
          await conn.close();
        },
        /ORA-24488/ //ORA-24488: Invalid properties or values provided for OCISessionRelease
        );
        conn.tag = tag1;
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });
  });

  describe('184.4 Dropping Session From Pool', function () {

    let callbackRequestedTag, callbackActualTag;

    function tagFixup(conn, requestedTag, cb) {
      callbackRequestedTag = requestedTag;
      callbackActualTag = conn.tag;
      if (requestedTag)
        conn.tag = requestedTag;
      cb();
    }

    function resetTag() {
      callbackRequestedTag = null;
      callbackActualTag = null;
    }

    async function dropUserSession(sql) {
      try {
        const connectionDetails = {
          user          : dbconfig.test.DBA_user,
          password      : dbconfig.test.DBA_password,
          connectString : dbconfig.connectString,
          privilege     : oracledb.SYSDBA,
        };
        let conn = await oracledb.getConnection(connectionDetails);
        await conn.execute(sql);
        await conn.close();
      } catch (err) {
        should.not.exist(err);
      }
    }

    async function checkConnValid(conn) {
      try {
        let res = await conn.execute("select * from dual");
        return res.rows[0][0] === 'X';
      } catch (err) {
        return false;
      }
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    beforeEach(function () {
      resetTag();
    });

    it('184.4.1 Acquire connection from pool, close with tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
        });
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close({tag: tag1});
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 1);
            should.strictEqual(pool.connectionsInUse, 0);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.2 Acquire connection from pool, drop session', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool(dbconfig);
        conn = await pool.getConnection();
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close({drop: true});
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 0);
            should.strictEqual(pool.connectionsInUse, 0);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.3 Acquire connection from pool, drop session with tag', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
          poolPingInterval: 10,
        });
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close({tag: tag1, drop: true});
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 0);
            should.strictEqual(pool.connectionsInUse, 0);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.4 Acquire connection from pool, wait for pool ping to call session fixup', async function () {
      if (!dbconfig.test.DBA_PRIVILEGE) this.skip();
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
          poolMax: 1,
          poolPingInterval: 10,
        });
        conn = await pool.getConnection({tag: tag1});
        const sql = `select unique 'alter system kill session '''||sid||','||serial#||'''' from v$session_connect_info where sid = sys_context('USERENV', 'SID')`;
        let res = await conn.execute(sql);
        await conn.close();
        await dropUserSession(res.rows[0][0]);
        resetTag();
        await sleep(15000);
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(await checkConnValid(conn), true);
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
        should.strictEqual(callbackRequestedTag, tag1);
        should.strictEqual(callbackActualTag, '');
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.5 Acquire connection from pool, wait for pool timeout to drop', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
          poolTimeout: 5,
        });
        conn = await pool.getConnection({tag: tag1});
        await conn.close();
        resetTag();
        await sleep(10000);
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 0);
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(callbackRequestedTag, tag1);
        should.strictEqual(callbackActualTag, '');
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.6 Drop connection from pool with poolMin=0', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool({
          ...dbconfig,
          sessionCallback: tagFixup,
          poolMax: 1,
          poolMin: 0,
        });

        conn = await pool.getConnection({tag: tag1});
        await conn.close({drop: true});
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.7 Close connection from pool with {drop: false}', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool(dbconfig);
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await conn.close({drop: false});
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 1);
            should.strictEqual(pool.connectionsInUse, 0);
          }
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.8 Close connection from pool with {drop: randomObject}', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool(dbconfig);
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await testsUtil.assertThrowsAsync(
              async () => {
                await conn.close({drop: {data: ["doesn't matter"], status: "SUCC"}});
              },
              /NJS-007/ //NJS-007: invalid value for %s in parameter
            );
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 1);
            should.strictEqual(pool.connectionsInUse, 1);
          }
          await conn.close();
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.9 Close connection from pool with {drop: 0}', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool(dbconfig);
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await testsUtil.assertThrowsAsync(
              async () => {
                await conn.close({drop: 0});
              },
              /NJS-007/ //NJS-007: invalid value for %s in parameter
            );
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 1);
            should.strictEqual(pool.connectionsInUse, 1);
          }
          await conn.close();
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.10 Close connection from pool with empty object', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool(dbconfig);
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await testsUtil.assertThrowsAsync(
              async () => {
                await conn.close({drop: {}});
              },
              /NJS-007/ //NJS-007: invalid value for %s in parameter
            );
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 1);
            should.strictEqual(pool.connectionsInUse, 1);
          }
          await conn.close();
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

    it('184.4.11 Close connection from pool with {drop: random string}', async function () {
      let conn, pool;
      try {
        pool = await oracledb.createPool(dbconfig);
        conn = await pool.getConnection({tag: tag1});
        should.strictEqual(pool.connectionsOpen, 1);
        should.strictEqual(pool.connectionsInUse, 1);
      } catch (err) {
        should.not.exist(err);
      } finally {
        if (conn) {
          try {
            await testsUtil.assertThrowsAsync(
              async () => {
                await conn.close({drop: "it doesn't matter"});
              },
              /NJS-007/ //NJS-007: invalid type for %s in parameter
            );
          } catch(err) {
            should.not.exist(err);
          } finally {
            should.strictEqual(pool.connectionsOpen, 1);
            should.strictEqual(pool.connectionsInUse, 1);
          }
          await conn.close();
        }
        if (pool) {
          try {
            await pool.close();
          } catch(err) {
            should.not.exist(err);
          }
        }
      }
    });

  });
});
