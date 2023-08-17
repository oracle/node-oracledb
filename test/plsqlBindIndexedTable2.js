/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

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
 *   44. plsqlBindIndexedTable2.js
 *
 * DESCRIPTION
 *   Testing PL/SQL indexed tables (associative arrays).
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');

describe('44. plsqlBindIndexedTable2.js', function() {

  let connection;

  beforeEach(async function() {

    connection = await  oracledb.getConnection(dbConfig);

    let proc =  "BEGIN \n" +
                    "  DECLARE \n" +
                    "    e_table_missing EXCEPTION; \n" +
                    "    PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                    "   BEGIN \n" +
                    "     EXECUTE IMMEDIATE ('DROP TABLE nodb_waveheight PURGE'); \n" +
                    "   EXCEPTION \n" +
                    "     WHEN e_table_missing \n" +
                    "     THEN NULL; \n" +
                    "   END; \n" +
                    "   EXECUTE IMMEDIATE (' \n" +
                    "     CREATE TABLE nodb_waveheight (beach VARCHAR2(50), depth NUMBER)  \n" +
                    "   '); \n" +
                    "END; ";

    await connection.execute(proc);

    proc = "CREATE OR REPLACE PACKAGE nodb_beachpkg IS\n" +
                   "  TYPE beachType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                   "  TYPE depthType IS TABLE OF NUMBER       INDEX BY BINARY_INTEGER;\n" +
                   "  PROCEDURE array_in(beaches IN beachType, depths IN depthType);\n" +
                   "  PROCEDURE array_out(beaches OUT beachType, depths OUT depthType); \n" +
                   "  PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType); \n" +
                   "END;";

    await connection.execute(proc);
    proc = "CREATE OR REPLACE PACKAGE BODY nodb_beachpkg IS \n" +
                   "  PROCEDURE array_in(beaches IN beachType, depths IN depthType) IS \n" +
                   "  BEGIN \n" +
                   "    IF beaches.COUNT <> depths.COUNT THEN \n" +
                   "      RAISE_APPLICATION_ERROR(-20000, 'Array lengths must match for this example.'); \n" +
                   "    END IF; \n" +
                   "    FORALL i IN INDICES OF beaches \n" +
                   "      INSERT INTO nodb_waveheight (beach, depth) VALUES (beaches(i), depths(i)); \n" +
                   "  END; \n" +
                   "  PROCEDURE array_out(beaches OUT beachType, depths OUT depthType) IS \n" +
                   "  BEGIN \n" +
                   "    SELECT beach, depth BULK COLLECT INTO beaches, depths FROM nodb_waveheight; \n" +
                   "  END; \n" +
                   "  PROCEDURE array_inout(beaches IN OUT beachType, depths IN OUT depthType) IS \n" +
                   "  BEGIN \n" +
                   "    IF beaches.COUNT <> depths.COUNT THEN \n" +
                   "      RAISE_APPLICATION_ERROR(-20001, 'Array lenghts must match for this example.'); \n" +
                   "    END IF; \n" +
                   "    FORALL i IN INDICES OF beaches \n" +
                   "      INSERT INTO nodb_waveheight (beach, depth) VALUES (beaches(i), depths(i)); \n" +
                   "      SELECT beach, depth BULK COLLECT INTO beaches, depths FROM nodb_waveheight ORDER BY 1; \n" +
                   "  END; \n  " +
                   "END;";

    await connection.execute(proc);

    await connection.commit();
  }); // before

  afterEach(async function() {
    await connection.execute("DROP TABLE nodb_waveheight PURGE");
    await connection.execute("DROP PACKAGE nodb_beachpkg");
    await connection.close();
  });

  it('44.1 example case', async function() {

    await connection.execute("BEGIN nodb_beachpkg.array_in(:beach_in, :depth_in); END;",
      {
        beach_in: { type: oracledb.STRING,
          dir:  oracledb.BIND_IN,
          val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
        depth_in: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_IN,
          val:  [45, 30, 67]
        }
      }
    );

    let result = await connection.execute(
      "BEGIN nodb_beachpkg.array_out(:beach_out, :depth_out); END;",
      {
        beach_out: { type: oracledb.STRING,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 },
        depth_out: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 }
      });

    assert.deepStrictEqual(result.outBinds.beach_out, ([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]));
    assert.deepStrictEqual(result.outBinds.depth_out, ([45, 30, 67]));

    await connection.rollback();
    result = await connection.execute(
      "BEGIN nodb_beachpkg.array_inout(:beach_inout, :depth_inout); END;",
      {
        beach_inout: { type: oracledb.STRING,
          dir:  oracledb.BIND_INOUT,
          val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
          maxArraySize: 3},
        depth_inout: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_INOUT,
          val:  [8, 3, 70],
          maxArraySize: 3}
      });
    assert.deepStrictEqual(result.outBinds.beach_inout, ([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]));
    assert.deepStrictEqual(result.outBinds.depth_inout, ([ 70, 3, 8 ]));

  }); // 44.1

  it('44.2 example case binding by position', async function() {

    await connection.execute(
      "BEGIN nodb_beachpkg.array_in(:1, :2); END;",
      [
        { type: oracledb.STRING,
          dir:  oracledb.BIND_IN,
          val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
        { type: oracledb.NUMBER,
          dir:  oracledb.BIND_IN,
          val:  [45, 30, 67]
        }
      ]);

    let result = await connection.execute(
      "BEGIN nodb_beachpkg.array_out(:1, :2); END;",
      [
        { type: oracledb.STRING,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 },
        { type: oracledb.NUMBER,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 }
      ]);
    assert.deepStrictEqual(result.outBinds[0], ([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]));
    assert.deepStrictEqual(result.outBinds[1], ([45, 30, 67]));

    await connection.rollback();
    result = await connection.execute(
      "BEGIN nodb_beachpkg.array_inout(:1, :2); END;",
      [
        { type: oracledb.STRING,
          dir:  oracledb.BIND_INOUT,
          val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
          maxArraySize: 3},
        { type: oracledb.NUMBER,
          dir:  oracledb.BIND_INOUT,
          val:  [8, 3, 70],
          maxArraySize: 3}
      ]);
    assert.deepStrictEqual(result.outBinds[0], ([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]));
    assert.deepStrictEqual(result.outBinds[1], ([ 70, 3, 8 ]));

  });

  it('44.3 default binding type and direction with binding by name', async function() {

    await connection.execute(
      "BEGIN nodb_beachpkg.array_in(:beach_in, :depth_in); END;",
      {
        beach_in: { //type: oracledb.STRING,
          //dir:  oracledb.BIND_IN,
          val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
        depth_in: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_IN,
          val:  [45, 30, 67]
        }
      }
    );

    let result = await connection.execute("BEGIN nodb_beachpkg.array_out(:beach_out, :depth_out); END;",
      {
        beach_out: { type: oracledb.STRING,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 },
        depth_out: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 }
      });
    assert.deepStrictEqual(result.outBinds.beach_out, ([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]));
    assert.deepStrictEqual(result.outBinds.depth_out, ([45, 30, 67]));


    await connection.rollback();
    result = await connection.execute(
      "BEGIN nodb_beachpkg.array_inout(:beach_inout, :depth_inout); END;",
      {
        beach_inout: { type: oracledb.STRING,
          dir:  oracledb.BIND_INOUT,
          val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
          maxArraySize: 3},
        depth_inout: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_INOUT,
          val:  [8, 3, 70],
          maxArraySize: 3}
      });

    //console.log(result.outBinds);
    assert.deepStrictEqual(result.outBinds.beach_inout, ([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]));
    assert.deepStrictEqual(result.outBinds.depth_inout, ([ 70, 3, 8 ]));
  }); // 44.3

  it('44.4 default binding type and direction with binding by position', async function() {

    await connection.execute("BEGIN nodb_beachpkg.array_in(:1, :2); END;",
      [
        { type: oracledb.STRING,
          // dir:  oracledb.BIND_IN,
          val:  ["Malibu Beach", "Bondi Beach", "Waikiki Beach"] },
        { type: oracledb.NUMBER,
          dir:  oracledb.BIND_IN,
          val:  [45, 30, 67]
        }
      ]);


    let result = await connection.execute(
      "BEGIN nodb_beachpkg.array_out(:1, :2); END;",
      [
        { type: oracledb.STRING,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 },
        { type: oracledb.NUMBER,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 3 }
      ]);

    assert.deepStrictEqual(result.outBinds[0], ([ 'Malibu Beach', 'Bondi Beach', 'Waikiki Beach' ]));
    assert.deepStrictEqual(result.outBinds[1], ([45, 30, 67]));

    await connection.rollback();
    result = await connection.execute(
      "BEGIN nodb_beachpkg.array_inout(:1, :2); END;",
      [
        { type: oracledb.STRING,
          dir:  oracledb.BIND_INOUT,
          val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
          maxArraySize: 3},
        { type: oracledb.NUMBER,
          dir:  oracledb.BIND_INOUT,
          val:  [8, 3, 70],
          maxArraySize: 3}
      ]);
    assert.deepStrictEqual(result.outBinds[0], ([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach' ]));
    assert.deepStrictEqual(result.outBinds[1], ([ 70, 3, 8 ]));

  });

  it('44.5 null elements in String and Number arrays', async function() {

    await connection.execute(
      "BEGIN nodb_beachpkg.array_in(:beach_in, :depth_in); END;",
      {
        beach_in: { type: oracledb.STRING,
          dir:  oracledb.BIND_IN,
          val:  ["Malibu Beach", "Bondi Beach", null, "Waikiki Beach", '', null] },
        depth_in: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_IN,
          val:  [null, null, 45, 30, 67, null, ]
        }
      });

    let result = await connection.execute(
      "BEGIN nodb_beachpkg.array_out(:beach_out, :depth_out); END;",
      {
        beach_out: { type: oracledb.STRING,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 10 },
        depth_out: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_OUT,
          maxArraySize: 10 }
      });
    assert.deepStrictEqual(result.outBinds.beach_out, ([ 'Malibu Beach', 'Bondi Beach', null, 'Waikiki Beach', null, null ]));
    assert.deepStrictEqual(result.outBinds.depth_out, ([ null, null, 45, 30, 67, null ]));


    await connection.rollback();

    result = await connection.execute(
      "BEGIN nodb_beachpkg.array_inout(:beach_inout, :depth_inout); END;",
      {
        beach_inout: { type: oracledb.STRING,
          dir:  oracledb.BIND_INOUT,
          val:  ["Port Melbourne Beach", "Eighty Mile Beach", '', "Chesil Beach", null, ''],
          maxArraySize: 10},
        depth_inout: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_INOUT,
          val:  [null, 8, null, 3, null, 70],
          maxArraySize: 10}
      });

    // console.log(result.outBinds);
    assert.deepStrictEqual(result.outBinds.beach_inout, ([ 'Chesil Beach', 'Eighty Mile Beach', 'Port Melbourne Beach', null, null, null ]));
    assert.deepStrictEqual(result.outBinds.depth_inout, ([ 3, 8, null, null, 70, null ]));
  }); // 44.5

  it('44.6 empty array for BIND_IN and BIND_INOUT', async function() {

    await connection.execute("BEGIN nodb_beachpkg.array_in(:beach_in, :depth_in); END;",
      {
        beach_in: { type: oracledb.STRING,
          dir:  oracledb.BIND_IN,
          val:  [] },
        depth_in: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_IN,
          val:  []
        }
      });

    await assert.rejects(

      async () => await connection.execute(
        "BEGIN nodb_beachpkg.array_inout(:beach_inout, :depth_inout); END;",
        {
          beach_inout: { type: oracledb.STRING,
            dir:  oracledb.BIND_INOUT,
            val:  [],
            maxArraySize: 0
          },
          depth_inout: { type: oracledb.NUMBER,
            dir:  oracledb.BIND_INOUT,
            val:  [],
            maxArraySize: 3}
        }),
      /NJS-007:/);


  }); // 44.6

  it('44.7 empty array for BIND_OUT', async function() {

    let proc = "CREATE OR REPLACE PACKAGE\n" +
                      "oracledb_testpack\n" +
                      "IS\n" +
                      "  TYPE stringsType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                      "  PROCEDURE test(p OUT stringsType);\n" +
                      "END;";
    await connection.execute(proc);

    proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                     "oracledb_testpack\n" +
                     "IS\n" +
                     "  PROCEDURE test(p OUT stringsType) IS BEGIN NULL; END;\n" +
                     "END;";
    await connection.execute(proc);

    const result = await connection.execute("BEGIN oracledb_testpack.test(:0); END;",
      [
        {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxArraySize: 1}
      ]
    );
    assert.deepStrictEqual(result.outBinds[0], []);

    await connection.execute("DROP PACKAGE oracledb_testpack");

  }); // 44.7

  it('44.8 maxSize option applies to each elements of an array', async function() {

    await connection.execute("BEGIN nodb_beachpkg.array_in(:beach_in, :depth_in); END;",
      {
        beach_in: { type: oracledb.STRING,
          dir:  oracledb.BIND_IN,
          val:  ["Malibu", "Bondi", "Waikiki"] },
        depth_in: { type: oracledb.NUMBER,
          dir:  oracledb.BIND_IN,
          val:  [45, 30, 67]
        }
      });
    await assert.rejects(

      async () => await connection.execute(
        "BEGIN nodb_beachpkg.array_out(:beach_out, :depth_out); END;",
        {
          beach_out: { type: oracledb.STRING,
            dir:  oracledb.BIND_OUT,
            maxArraySize: 3,
            maxSize: 6 },
          depth_out: { type: oracledb.NUMBER,
            dir:  oracledb.BIND_OUT,
            maxArraySize: 3 }
        }
      ),

      /ORA-06502:/
    );

    await connection.rollback();
    await assert.rejects(

      async () => await connection.execute(
        "BEGIN nodb_beachpkg.array_inout(:beach_inout, :depth_inout); END;",
        {
          beach_inout: { type: oracledb.STRING,
            dir:  oracledb.BIND_INOUT,
            val:  ["Port Melbourne Beach", "Eighty Mile Beach", "Chesil Beach"],
            maxArraySize: 3,
            maxSize : 5},
          depth_inout: { type: oracledb.NUMBER,
            dir:  oracledb.BIND_INOUT,
            val:  [8, 3, 70],
            maxArraySize: 3}
        }),
      /NJS-058:/
    );


  }); // 44.8

});
