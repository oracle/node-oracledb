/* Copyright (c) 2017, 2022, Oracle and/or its affiliates. */

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
 *   140. jsObjectGetter1.js
 *
 * DESCRIPTION
 *   These tests overwrite the getter methods of node-oracledb javaScript
 *   objects.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const testsUtil = require('./testsUtil.js');

describe('140. jsObjectGetter1.js', function() {

  let connection = null;
  const tableName = "nodb_tab_v8getter";

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);

    const proc = "BEGIN \n" +
               "    DECLARE \n" +
               "        e_table_missing EXCEPTION; \n" +
               "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
               "    BEGIN \n" +
               "        EXECUTE IMMEDIATE('DROP TABLE " + tableName + " PURGE'); \n" +
               "    EXCEPTION \n" +
               "        WHEN e_table_missing \n" +
               "        THEN NULL; \n" +
               "    END; \n" +
               "    EXECUTE IMMEDIATE (' \n" +
               "        CREATE TABLE " + tableName + " ( \n" +
               "            department_id      NUMBER, \n" +
               "            department_name    VARCHAR2(50) \n" +
               "        ) \n" +
               "    '); \n" +
               "END; ";

    await connection.execute(proc);

    const sql = "INSERT INTO " + tableName + " VALUES(23, 'Jonh Smith')";

    await connection.execute(sql);
  });

  after(async function() {
    const sql = "DROP TABLE " + tableName + " PURGE";
    await connection.execute(sql);
    await connection.close();
  });

  describe('140.1 Negative: overwrite the getter() function of bind in objects', function() {
    const sql = "select * from " + tableName + " where department_id = :id";
    const bindObj = {id: 23};
    Object.defineProperty(bindObj, 'id', {
      get: function() {
        throw new Error('Nope');
      }
    });

    it('140.1.1 ProcessBindsByName()', async function() {
      await testsUtil.assertThrowsAsync(
        async () => {
          await connection.execute(sql, bindObj);
        },
        /Nope/
      );
    });

    it('140.1.2 ProcessBindsByPos()', async function() {
      await testsUtil.assertThrowsAsync(
        async () => {
          await connection.execute(sql, [bindObj]);
        },
        /NJS-044:/
      );
    });

  }); // 140.1

  describe('140.2 Negative (ProcessBind): OUT bind with properties altered', function() {
    it('140.2.1 ', async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_proc_v8_out (p_in IN VARCHAR2, p_out OUT VARCHAR2) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_out := 'OUT: ' || p_in; \n" +
                 "END; ";
      await connection.execute(proc);
      const foo = { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 200 };
      Object.defineProperty(foo, 'dir', {
        get: function() {
          throw new Error('No Dir');
        }
      });

      Object.defineProperty(foo, 'type', {
        get: function() {
          throw new Error('No Type');
        }
      });

      Object.defineProperty(foo, 'maxSize', {
        get: function() {
          throw new Error('No maxSize');
        }
      });

      await testsUtil.assertThrowsAsync(
        async () => {
          await connection.execute(
            "begin nodb_proc_v8_out(:i, :o); end;",
            {
              i: "Changjie",
              o: foo
            }
          );
        },
        /No Dir/
      );
      const sql = "drop procedure nodb_proc_v8_out";
      await connection.execute(sql);
    });
  }); // 140.2

  describe('140.3 Negative: PL/SQL Indexed Table', function() {
    before(async function() {
      let sql =  "BEGIN \n" +
                  "  DECLARE \n" +
                  "    e_table_missing EXCEPTION; \n" +
                  "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                  "   BEGIN \n" +
                  "     EXECUTE IMMEDIATE ('DROP TABLE nodb_tab_waveheight PURGE'); \n" +
                  "   EXCEPTION \n" +
                  "     WHEN e_table_missing \n" +
                  "     THEN NULL; \n" +
                  "   END; \n" +
                  "   EXECUTE IMMEDIATE (' \n" +
                  "     CREATE TABLE nodb_tab_waveheight (beach VARCHAR2(50), depth NUMBER)  \n" +
                  "   '); \n" +
                  "END; ";

      await connection.execute(sql);
      sql = "CREATE OR REPLACE PACKAGE nodb_v8pkg IS \n" +
                 "  TYPE beachType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                 "  TYPE depthType IS TABLE OF NUMBER       INDEX BY BINARY_INTEGER; \n" +
                 "  PROCEDURE array_in(beaches IN beachType, depths IN depthType); \n" +
                 "END; ";

      await connection.execute(sql);
      sql = "CREATE OR REPLACE PACKAGE BODY nodb_v8pkg IS \n" +
                 "  PROCEDURE array_in(beaches IN beachType, depths IN depthType) IS \n" +
                 "  BEGIN \n" +
                 "    IF beaches.COUNT <> depths.COUNT THEN \n" +
                 "      RAISE_APPLICATION_ERROR(-20000, 'Array lengths must match for this example.');" +
                 "    END IF; \n" +
                 "    FORALL i IN INDICES OF beaches \n" +
                 "      INSERT INTO nodb_tab_waveheight (beach, depth) VALUES (beaches(i), depths(i)); \n" +
                 "  END; \n" +
                 "END;";

      await connection.execute(sql);
    });

    after(async function() {
      await connection.execute("drop package nodb_v8pkg");
      await connection.execute("drop table nodb_tab_waveheight");
    });

    it('140.3.1 bind an element being altered-JSON object', async function() {
      const foo =
        {
          beach_in: { type: oracledb.STRING, dir:  oracledb.BIND_IN, val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
          depth_in: { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val:  [45, 30, 67] }
        };

      Object.defineProperty(foo, 'depth_in', {
        get: function() {
          throw new Error('No type');
        }
      });

      await testsUtil.assertThrowsAsync(
        async () => {
          const sql = "BEGIN nodb_v8pkg.array_in(:beach_in, :depth_in); END;";
          await connection.execute(sql, foo);
        },
        /No type/
      );
    }); // 140.3.1

    it('140.3.2 GetBindTypeAndSizeFromValue()', async function() {
      const foo = { type: oracledb.NUMBER, dir:  oracledb.BIND_IN, val:  [45, 30, 67] };
      Object.defineProperty(foo, 'type', {
        get: function() {
          throw new Error('No type');
        }
      });

      await testsUtil.assertThrowsAsync(
        async () => {
          const sql = "BEGIN nodb_v8pkg.array_in(:beach_in, :depth_in); END;";
          const binds = {
            beach_in: { type: oracledb.STRING,
              dir:  oracledb.BIND_IN,
              val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
            depth_in: foo
          };
          await connection.execute(sql, binds);
        },
        /No type/
      );
    }); // 140.3.2
  }); // 140.3

  describe('140.4 Negative: fetchInfo', function() {
    it('140.4.1 changes getter() of fetchInfo itself', async function() {
      const foo = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo : { "TS_DATE": { type : oracledb.STRING } }
      };

      Object.defineProperty(foo, 'fetchInfo', {
        get: function() {
          throw new Error('No fetchInfo');
        }
      });

      await testsUtil.assertThrowsAsync(
        async () => {
          const sql = "SELECT TO_DATE('2017-01-09', 'YYYY-DD-MM') FROM DUAL";
          await connection.execute(sql, [], foo);
        },
        /No fetchInfo/
      );

    }); // 140.4.1

    it('140.4.2 changes getter() of the value of fetchInfo object', async function() {
      const foo = { type : oracledb.STRING };

      Object.defineProperty(foo, 'type', {
        get: function() {
          throw new Error('No type');
        }
      });

      const option = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo : { "TS_DATE": foo }
      };

      await testsUtil.assertThrowsAsync(
        async () => {
          const sql = "SELECT TO_DATE('2017-01-09', 'YYYY-DD-MM') FROM DUAL";
          await connection.execute(sql, [], option);
        },
        /No type/
      );

    }); // 140.4.2
  }); // 140.4

  describe("140.5 Negative: Bool type", function() {

    const dotest = async function(opt) {
      const sql = "INSERT INTO " + tableName + " VALUES(1405, 'Changjie Lin')";
      await testsUtil.assertThrowsAsync(
        async () => {
          await connection.execute(sql, opt);
        },
        /Wrong boolean value/
      );
    };

    it('140.5.1 option - autoCommit', async function() {

      const options = { autoCommit: true };
      Object.defineProperty(options, 'autoCommit', {
        get: function() {
          throw new Error('Wrong boolean value');
        }
      });
      await dotest(options);

    });

    it('140.5.2 option - extendedMetaData', async function() {

      const options = { extendedMetaData: true };
      Object.defineProperty(options, 'extendedMetaData', {
        get: function() {
          throw new Error('Wrong boolean value');
        }
      });
      await dotest(options);

    });
  }); // 140.5

  describe('140.6 Negative: positive Int type', function() {

    it('140.6.1 option - fetchArraySize', async function() {

      const options = { fetchArraySize: 200 };
      Object.defineProperty(options, 'fetchArraySize', {
        get: function() {
          throw new Error('No value');
        }
      });

      const sql = "select * from " + tableName;
      await testsUtil.assertThrowsAsync(
        async () => {
          await connection.execute(sql, options);
        },
        /No value/
      );
    });
  }); // 140.6

  describe('140.7 Negative: Pool object', function() {

    const dotest = async function(opt) {
      await testsUtil.assertThrowsAsync(
        async () => {
          await oracledb.createPool(opt);
        },
        /Nope/
      );
    };

    it('140.7.1 String type - user', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'user', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

    it('140.7.2 String type - password', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'password', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

    it('140.7.3 String type - connectString', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'connectString', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

    it('140.7.4 poolMin', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolMin', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

    it('140.7.5 poolMax', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolMax', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

    it('140.7.6 poolIncrement', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolIncrement', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

    it('140.7.7 poolTimeout', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolTimeout', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

    it('140.7.8 poolPingInterval', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'poolPingInterval', {
        get: function() {
          throw new Error('Nope');
        }
      });

      await dotest(cred);
    });

    it('140.7.9 stmtCacheSize', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty(cred, 'stmtCacheSize', {
        get: function() {
          throw new Error('Nope');
        }
      });
      await dotest(cred);
    });

  }); // 140.7

  describe('140.8 Negative: Get Connection', function()  {

    it('140.8.1 String type: user', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'user', {
        get : function() {
          throw new Error('Nope');
        }
      });

      await testsUtil.assertThrowsAsync(
        async () => {
          await oracledb.getConnection(cred);
        },
        /Nope/
      );
    });

    it('140.8.2 String type: password', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'password', {
        get : function() {
          throw new Error('Nope');
        }
      });

      await testsUtil.assertThrowsAsync(
        async () => {
          await oracledb.getConnection(cred);
        },
        /Nope/
      );
    });

    it('140.8.3 String type: connectionString', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'connectString', {
        get : function() {
          throw new Error('Nope');
        }
      });

      await testsUtil.assertThrowsAsync(
        async () => {
          await oracledb.getConnection(cred);
        },
        /Nope/
      );
    });

    it('140.8.4 Constant type: privilege', async function() {

      const cred = JSON.parse(JSON.stringify(dbConfig));
      Object.defineProperty (cred, 'privilege', {
        get : function() {
          throw new Error('Nope');
        }
      });
      await testsUtil.assertThrowsAsync(
        async () => {
          await oracledb.getConnection(cred);
        },
        /Nope/
      );
    });

  }); // 140.8

});
