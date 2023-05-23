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
 *   70. plsqlBindScalar.js
 *
 * DESCRIPTION
 *   Testing PL/SQL bind scalars.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert   = require('assert');
const dbConfig = require('./dbconfig.js');
const assist   = require('./dataTypeAssist.js');

describe('70. plsqlBindScalar.js', function() {

  let connection;

  before(async function() {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute("alter session set time_zone='UTC'");
  });

  after(async function() {
    await connection.close();
  });

  describe('70.1 PL/SQL bind scalar, dir: BIND_IN and BIND_OUT, type: STRING', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc71(strValue IN VARCHAR2) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN strValue;\n" +
                 "END nodb_plsqlbindfunc71;";

      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc71";
      await connection.execute(sql);
    });

    const sqlrun = "BEGIN :output := nodb_plsqlbindfunc71(:strValue); END;";
    const resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000};

    it('70.1.1 basic case: a simple string', async function() {
      const bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: "PL/SQL Binding Scalar"}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, "PL/SQL Binding Scalar");
    }); // 70.1.1

    it('70.1.2 negative: bind in value and type mismatch', async function() {
      const bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: 42}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.1.2

    it('70.1.3 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.1.3

    it('70.1.4 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ''}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.1.4

    it('70.1.5 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    });

    it('70.1.6 tests default dir & type', async function() {
      const bindVar = {
        output:   resultBind,
        strValue: "PL/SQL Binding Scalar"
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, "PL/SQL Binding Scalar");
    }); // 70.1.6

    it('70.1.7 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    });// 70.1.7

  }); // 70.1

  describe('70.2 dir: BIND_IN and BIND_OUT, type: NUMBER', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc72(numValue IN NUMBER) RETURN NUMBER \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN numValue;\n" +
                 "END nodb_plsqlbindfunc72;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc72";
      await connection.execute(sql);
    });

    const sqlrun = "BEGIN :output := nodb_plsqlbindfunc72(:numValue); END;";
    const resultBind = {type: oracledb.NUMBER, dir: oracledb.BIND_OUT};

    it('70.2.1 basic case', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 755}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, 755);
    }); // 70.2.1

    it('70.2.2 auto detect number type', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: 755
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, 755);
    }); // 70.2.2

    it('70.2.3 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.2.3

    it('70.2.4 Negative: bind value and type mismatch - val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.2.4

    it('70.2.5 val: 0', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 0}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, 0);
    }); // 70.2.5

    it('70.2.6 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.2.6

    it('70.2.7 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-105:/
      );
    }); // 70.2.7

    it('70.2.8 val: -1', async function() {
      const bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: -1}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, -1);
    }); // 70.2.8

  }); // 70.2

  describe('70.3 dir: BIND_IN and BIND_OUT, type: DATE', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc73(dateValue IN DATE) RETURN DATE \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN dateValue;\n" +
                 "END nodb_plsqlbindfunc73;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc73";
      await connection.execute(sql);
    });

    const sqlrun = "BEGIN :output := nodb_plsqlbindfunc73(:dateValue); END;";
    const resultBind = {type: oracledb.DATE, dir: oracledb.BIND_OUT};
    const dt = new Date(2016, 8, 1);

    it('70.3.1 basic case', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: dt}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.output, dt);
    }); // 70.3.1

    it('70.3.2 auto detect Date type', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: dt
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.output, dt);
    }); // 70.3.2

    it('70.3.3 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.3.3

    it('70.3.4 val: empty string, negative - bind value and type mismatch', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.3.4

    it('70.3.5 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.3.5

    it('70.3.6 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.3.6

    it('70.3.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date (2016, 1, 30);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun, bindVar);
      const resultDate = new Date (2016, 2, 1);
      assert.deepStrictEqual(result.outBinds.output, resultDate);
    }); // 70.3.7

    it('70.3.8 val: 1969-12-31', async function() {
      const date = new Date (1969, 11, 31);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.3.8

    it('70.3.9 val: epoch date 1970-1-1', async function() {
      const date = new Date (1970, 0, 1);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.3.9

    it('70.3.10 val: create Date value using numeric value: new Date(number)', async function() {
      const date = new Date (1476780296673);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun, bindVar);

      // Oracle stores only the fractions up to second in a DATE field.
      const dateResult = new Date (1476780296000);
      assert.deepStrictEqual(result.outBinds.output, dateResult);
    }); // 70.3.10

    it('70.3.11 val: create Date value using numeric value: new Date(7 number)', async function() {
      const date = new Date (2011, 5, 3, 4, 6, 23, 123);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun, bindVar);

      // Oracle stores only the fractions up to second in a DATE field.
      const dateResult = new Date (2011, 5, 3, 4, 6, 23, 0);
      assert.deepStrictEqual(result.outBinds.output, dateResult);
    }); // 70.3.11

    it('70.3.12 val: create Date value using numeric value: 0', async function() {
      // Zero time is 01 January 1970 00:00:00 UTC
      const date = new Date(0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun, bindVar);
      const dateResult = new Date (Date.UTC(1970, 0, 1));
      assert.deepStrictEqual(result.outBinds.output, dateResult);
    }); // 70.3.12

  }); // 70.3

  describe('70.4 dir: BIND_IN and BIND_OUT, type: BUFFER', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc74(bufValue IN RAW) RETURN RAW \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN bufValue;\n" +
                 "END nodb_plsqlbindfunc74;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc74";
      await connection.execute(sql);
    });

    const sqlrun = "BEGIN :output := nodb_plsqlbindfunc74(:bufValue); END;";
    const resultBind = {type: oracledb.BUFFER, dir: oracledb.BIND_OUT};
    const bufsize = 100;
    const bindValue = assist.createBuffer(bufsize);

    it('70.4.1 basic case', async function() {
      const bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: bindValue}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.output, bindValue);
    }); // 70.4.1

    it('70.4.2 auto detect Buffer type', async function() {
      const bindVar = {
        output:   resultBind,
        bufValue: bindValue
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.output, bindValue);
    }); // 70.4.2

    it('70.4.3 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.4.3

    it('70.4.4 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.4.4

    it('70.4.5 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.4.5

    it('70.4.6 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.4.6

  }); // 70.4

  describe('70.5 dir: BIND_INOUT, type: STRING', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc5 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc5;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP PROCEDURE nodb_inoutproc5";
      await connection.execute(sql);
    });

    const sqlrun = "begin nodb_inoutproc5(p_inout => :p_inout); end;";

    it('70.5.1 basic case: a simple string', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  "PL/SQL Binding INOUT Scalar"
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, "PL/SQL Binding INOUT Scalar");
    }); // 70.5.1

    it('70.5.2 tests default type', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  "PL/SQL Binding INOUT Scalar"
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, "PL/SQL Binding INOUT Scalar");
    }); // 70.5.2

    it('70.5.3 negative: bind value and type mismatch', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  755
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.5.3

    it('70.5.4 val: null', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  null
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.5.4

    it('70.5.5 val: empty string', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  ''
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.5.5

    it('70.5.6 val: undefined', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  undefined
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.5.6

    it('70.5.7 val: NaN', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  NaN
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.5.7

    it('70.5.8 NULL IN and NON-NULL out', async function() {
      const proc508 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc508 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := 'abc'; \n" +
                 "END nodb_inoutproc508;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  null
        }
      };
      const sqlrun508 = "begin nodb_inoutproc508(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc508";
      await connection.execute(proc508);
      const result = await connection.execute(sqlrun508, bindVar);
      assert.strictEqual(result.outBinds.p_inout, 'abc');
      await connection.execute(sqldrop);
    }); // 70.5.8

    it('70.5.9 NON-NULL IN and NULL OUT', async function() {
      const proc509 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc509 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := null; \n" +
                 "END nodb_inoutproc509;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  "abc"
        }
      };
      const sqlrun509 = "begin nodb_inoutproc509(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc509";

      await connection.execute(proc509);
      const result = await connection.execute(sqlrun509, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
      await connection.execute(sqldrop);
    }); // 70.5.9

    it('70.5.10 n Length IN and 2n OUT', async function() {
      const proc510 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc510 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := concat (p_inout, p_inout); \n" +
                 "END nodb_inoutproc510;";
      const strVar = "abcdefghijklmnopqrstuvwxyz";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  strVar
        }
      };
      const sqlrun510 = "begin nodb_inoutproc510(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc510";
      await connection.execute(proc510);
      const result = await connection.execute(sqlrun510, bindVar);
      const resutVar = strVar + strVar;
      assert.strictEqual(result.outBinds.p_inout, resutVar);
      await connection.execute(sqldrop);
    }); // 70.5.10

    it('70.5.11 2n Length IN and n OUT', async function() {
      const proc511 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc511 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := substr ( p_inout, 1, Length(p_inout)/2 ); \n" +
                 "END nodb_inoutproc511;";
      const strVar = "Pack my bag with five dozen liquor jugs";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  strVar
        }
      };
      const sqlrun511 = "begin nodb_inoutproc511(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc511";
      await connection.execute(proc511);
      const result = await connection.execute(sqlrun511, bindVar);
      const resultVar = "Pack my bag with fiv";
      assert.strictEqual(result.outBinds.p_inout, resultVar);
      await connection.execute(sqldrop);
    }); // 70.5.11

  }); // 70.5

  describe('70.6 dir: BIND_INOUT, type: NUMBER', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc6 (p_inout IN OUT NUMBER) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc6;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP PROCEDURE nodb_inoutproc6";
      await connection.execute(sql);
    });

    const sqlrun = "begin nodb_inoutproc6(p_inout => :p_inout); end;";

    it('70.6.1 basic case', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  8396
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, 8396);
    }); // 70.6.1

    it('70.6.2 auto detect number type', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  8396
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, 8396);
    }); // 70.6.2

    it('70.6.3 negative: bind value and type mismatch - val: empty string', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  ''
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.6.3

    it('70.6.4 val: null', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  null
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.6.4

    it('70.6.5 val: undefined', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  undefined
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.6.5

    it('70.6.6 val: NaN', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  NaN
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-105:/
      );
    }); // 70.6.6

    it('70.6.7 val: 0', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  0
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, 0);
    }); // 70.6.7

    it('70.6.8 val: -1', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  -1
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, -1);
    }); // 70.6.8

    it('70.6.10 NULL IN and NON-NULL out', async function() {
      const proc610 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc610 (p_inout IN OUT NUMBER) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    p_inout := 3; \n" +
                   "END nodb_inoutproc610;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  null
        }
      };
      const sqlrun610 = "begin nodb_inoutproc610(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc610";

      await connection.execute(proc610);
      const result = await connection.execute(sqlrun610, bindVar);
      assert.strictEqual(result.outBinds.p_inout, 3);
      await connection.execute(sqldrop);
    }); // 70.6.10

    it('70.6.11 NON-NULL IN and NULL OUT', async function() {
      const proc611 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc611 (p_inout IN OUT NUMBER) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    p_inout := null; \n" +
                   "END nodb_inoutproc611;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  3
        }
      };
      const sqlrun611 = "begin nodb_inoutproc611(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc611";

      await connection.execute(proc611);
      const result = await connection.execute(sqlrun611, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
      await connection.execute(sqldrop);
    });// 70.6.11

  }); // 70.6

  describe('70.7 dir: BIND_INOUT, type: DATE', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc7 (p_inout IN OUT DATE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc7;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP PROCEDURE nodb_inoutproc7";
      await connection.execute(sql);
    });

    const sqlrun = "begin nodb_inoutproc7(p_inout => :p_inout); end;";
    const daterun = new Date(2016, 7, 5);

    it('70.7.1 basic case', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  daterun
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, daterun);
    }); // 70.7.1

    it('70.7.2 auto detect Date type', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  daterun
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, daterun);
    }); // 70.7.2

    it('70.7.3 val: null', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.7.3

    it('70.7.4 val: empty string, negative - bind value and type mismatch', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  ''
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.7.4

    it('70.7.5 val: undefined', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  undefined
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.7.5

    it('70.7.6 val: NaN', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  NaN
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.7.6

    it('70.7.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date (2016, 1, 30);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      const resultDate = new Date (2016, 2, 1);
      assert.deepStrictEqual(result.outBinds.p_inout, resultDate);
    }); // 70.7.7

    it('70.7.8 val: 1969-12-31', async function() {
      const date = new Date (1969, 11, 31);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.7.8

    it('70.7.9 val: epoch date 1970-1-1', async function() {
      const date = new Date (1970, 0, 1);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.7.9

    it('70.7.10 NULL IN and NON-NULL out', async function() {
      const proc710 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc710 (p_inout IN OUT DATE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := TO_DATE('5-AUG-2016'); \n" +
                 "END nodb_inoutproc710;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const sqlrun710 = "begin nodb_inoutproc710(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc710";
      await connection.execute(proc710);
      const result = await connection.execute(sqlrun710, bindVar);
      const date = new Date("2016-08-05 00:00:00");
      assert.deepStrictEqual(result.outBinds.p_inout, date);
      await connection.execute(sqldrop);
    }); // 70.7.10

    it('70.7.11 NON-NULL IN and NULL OUT', async function() {
      const proc711 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc711 (p_inout IN OUT DATE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := null; \n" +
                 "END nodb_inoutproc711;";
      const date = new Date(2011, 0, 12);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const sqlrun711 = "begin nodb_inoutproc711(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc711";
      await connection.execute(proc711);
      const result = await connection.execute(sqlrun711, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
      await connection.execute(sqldrop);
    }); // 70.7.11

  }); // 70.7

  describe('70.8 dir: BIND_INOUT, type: BUFFER', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc8 (p_inout IN OUT RAW) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc8;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP PROCEDURE nodb_inoutproc8";
      await connection.execute(sql);
    });

    const sqlrun = "begin nodb_inoutproc8(p_inout => :p_inout); end;";

    const bufsize = 201;
    const bufValue = assist.createBuffer(bufsize);

    it('70.8.1 basic case', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  bufValue,
          maxSize: 32767 // max allowed value of maxSize in PL/SQL
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, bufValue);
    }); // 70.8.1

    it('70.8.2 auto detect BUFFER type', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  bufValue,
          maxSize: 32767
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, bufValue);
    }); // 70.8.2

    it('70.8.3 val: null', async function() {
      const emptybuf = Buffer.alloc (0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.8.3

    it('70.8.4 val: empty string', async function() {
      const emptybuf = Buffer.from ("", "utf-8");
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.8.4

    it('70.8.5 val: undefined', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  undefined,
          maxSize: 32767
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.8.5

    it('70.8.6 val: NaN', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  NaN,
          maxSize: 32767
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.8.6

  }); // 70.8

  describe('70.9 Query the binded data by SQL', function() {

    before(async function() {
      const proc1 = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_plsqlbindtab PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_plsqlbindtab ( \n" +
                 "            id     NUMBER, \n" +
                 "            str    VARCHAR2(4000), \n" +
                 "            num    NUMBER, \n" +
                 "            dat    DATE, \n" +
                 "            buf    RAW(2000) \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      const proc2 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc9 ( \n" +
                 "    p_in IN NUMBER, p_inout1 IN OUT VARCHAR2, \n" +
                 "    p_inout2 IN OUT NUMBER, p_inout3 IN OUT DATE, p_inout4 IN OUT RAW) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_plsqlbindtab(id, str, num, dat, buf) values (p_in, p_inout1, p_inout2, p_inout3, p_inout4); \n" +
                 "END nodb_inoutproc9;";

      const proc3 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc10 ( \n" +
                 "    p_in IN NUMBER, p_str IN VARCHAR2, \n" +
                 "    p_num IN NUMBER, p_dat IN DATE, p_buf IN RAW) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_plsqlbindtab(id, str, num, dat, buf) values (p_in, p_str, p_num, p_dat, p_buf); \n" +
                 "END nodb_inoutproc10;";

      await connection.execute(proc1);
      await connection.execute(proc2);
      await connection.execute(proc3);
    });

    after(async function() {
      await connection.execute("DROP PROCEDURE nodb_inoutproc9");
      await connection.execute("DROP PROCEDURE nodb_inoutproc10");
      await connection.execute("DROP TABLE nodb_plsqlbindtab PURGE");
    });

    const sqlinout = "begin nodb_inoutproc9(:p_in, :p_inout1, :p_inout2, :p_inout3, :p_inout4); end;";
    const sqlin    = "begin nodb_inoutproc10(:p_in, :p_str, :p_num, :p_dat, :p_buf); end;";

    it('70.9.1 basic case', async function() {

      const rowid = 1;
      const bufsize = 201;
      const bufValue = assist.createBuffer(bufsize);
      const daterun = new Date(2016, 7, 5);

      const bindVar = {
        p_in: rowid,
        p_inout1: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  "PL/SQL Binding INOUT Scalar"
        },
        p_inout2: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  101
        },
        p_inout3: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  daterun
        },
        p_inout4: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  bufValue,
          maxSize: 32767
        }
      };

      let result = await connection.execute(sqlinout, bindVar);
      assert.strictEqual(result.outBinds.p_inout1, "PL/SQL Binding INOUT Scalar");
      assert.strictEqual(result.outBinds.p_inout2, 101);
      assert.deepStrictEqual(result.outBinds.p_inout3, daterun);
      assert.deepStrictEqual(result.outBinds.p_inout4, bufValue);
      const sql = "select * from nodb_plsqlbindtab where id = :i";
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      result = await connection.execute(sql, [rowid], options);
      assert.strictEqual(result.rows[0].STR, "PL/SQL Binding INOUT Scalar");
      assert.strictEqual(result.rows[0].NUM, 101);
      assert.deepStrictEqual(result.rows[0].DAT, daterun);
      assert.deepStrictEqual(result.rows[0].BUF, bufValue);
    }); // 70.9.1

    it('70.9.2 dir: BIND_INOUT, val: null', async function() {

      const rowid = 2;
      const emptybuf = Buffer.alloc(0);

      const bindVar = {
        p_in: rowid,
        p_inout1: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  null
        },
        p_inout2: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  null
        },
        p_inout3: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        },
        p_inout4: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
        }
      };

      let result = await connection.execute(sqlinout, bindVar);
      assert.strictEqual(result.outBinds.p_inout1, null);
      assert.strictEqual(result.outBinds.p_inout2, null);
      assert.strictEqual(result.outBinds.p_inout3, null);
      assert.strictEqual(result.outBinds.p_inout4, null);
      const sql = "select * from nodb_plsqlbindtab where id = :i";
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      result = await connection.execute(sql, [rowid], options);
      assert.strictEqual(result.rows[0].STR, null);
      assert.strictEqual(result.rows[0].NUM, null);
      assert.strictEqual(result.rows[0].DAT, null);
      assert.strictEqual(result.rows[0].BUF, null);
    }); // 70.9.2

    it('70.9.3 dir: BIND_IN, val: null', async function() {

      const rowid = 3;
      const emptybuf = Buffer.alloc(0);

      const bindVar = {
        p_in: rowid,
        p_str: {
          dir:  oracledb.BIND_IN,
          type: oracledb.STRING,
          val:  null
        },
        p_num: {
          dir:  oracledb.BIND_IN,
          type: oracledb.NUMBER,
          val:  null
        },
        p_dat: {
          dir:  oracledb.BIND_IN,
          type: oracledb.DATE,
          val:  null
        },
        p_buf: {
          dir:  oracledb.BIND_IN,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
        }
      };

      await connection.execute(sqlin, bindVar);
      const sql = "select * from nodb_plsqlbindtab where id = :i";
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, [rowid], options);
      assert.strictEqual(result.rows[0].STR, null);
      assert.strictEqual(result.rows[0].NUM, null);
      assert.strictEqual(result.rows[0].DAT, null);
      assert.strictEqual(result.rows[0].BUF, null);
    }); // 70.9.3

    it('70.9.4 dir: BIND_INOUT, val: undefined', async function() {
      const rowid = 4;
      const emptybuf = Buffer.alloc(0);

      const bindVar = {
        p_in: rowid,
        p_inout1: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  undefined
        },
        p_inout2: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  undefined
        },
        p_inout3: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  undefined
        },
        p_inout4: {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
        }
      };

      let result = await connection.execute(sqlinout, bindVar);
      assert.strictEqual(result.outBinds.p_inout1, null);
      assert.strictEqual(result.outBinds.p_inout2, null);
      assert.strictEqual(result.outBinds.p_inout3, null);
      assert.strictEqual(result.outBinds.p_inout4, null);
      const sql = "select * from nodb_plsqlbindtab where id = :i";
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      result = await connection.execute(sql, [rowid], options);
      assert.strictEqual(result.rows[0].STR, null);
      assert.strictEqual(result.rows[0].NUM, null);
      assert.strictEqual(result.rows[0].DAT, null);
      assert.strictEqual(result.rows[0].BUF, null);
    }); // 70.9.4

    it('70.9.5 dir: BIND_IN, val: undefined', async function() {

      const rowid = 5;
      const emptybuf = Buffer.alloc(0);

      const bindVar = {
        p_in: rowid,
        p_str: {
          dir:  oracledb.BIND_IN,
          type: oracledb.STRING,
          val:  undefined
        },
        p_num: {
          dir:  oracledb.BIND_IN,
          type: oracledb.NUMBER,
          val:  undefined
        },
        p_dat: {
          dir:  oracledb.BIND_IN,
          type: oracledb.DATE,
          val:  undefined
        },
        p_buf: {
          dir:  oracledb.BIND_IN,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
        }
      };

      await connection.execute(sqlin, bindVar);
      const sql = "select * from nodb_plsqlbindtab where id = :i";
      const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };
      const result = await connection.execute(sql, [rowid], options);
      assert.strictEqual(result.rows[0].STR, null);
      assert.strictEqual(result.rows[0].NUM, null);
      assert.strictEqual(result.rows[0].DAT, null);
      assert.strictEqual(result.rows[0].BUF, null);
    }); // 70.9.5

  }); // 70.9

  describe('70.10 Check the bind-in values in PL/SQL', function() {

    it('70.10.1 STRING, basic', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue1 (p_in IN OUT VARCHAR2) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in = 'Shenzhen City' THEN \n" +
                 "        comparison := 'the same'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'different'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Shenzhen City'}
      };
      let sql = "begin :output := nodb_checkplsqlvalue1 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'the same');
      assert.strictEqual(result.outBinds.p_in, 'Shenzhen City');
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Shenzhen city'}
      };
      sql = "begin :output := nodb_checkplsqlvalue1 (:p_in); end;";
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'different');
      assert.strictEqual(result.outBinds.p_in, 'Shenzhen city');
      await connection.execute("drop function nodb_checkplsqlvalue1");
    }); // 70.10.1

    it('70.10.2 STRING, null, empty string, undefined', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue2 (p_in IN OUT VARCHAR2) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in IS NULL THEN \n" +
                 "        comparison := 'correct'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'wrong'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: null}
      };
      const sql = "begin :output := nodb_checkplsqlvalue2 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ''}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: undefined}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'foobar'}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'wrong');
      assert.strictEqual(result.outBinds.p_in, 'foobar');
      await connection.execute("drop function nodb_checkplsqlvalue2");
    }); // 70.10.2

    it('70.10.3 NUMBER, null values', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue3 (p_in IN OUT NUMBER) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in IS NULL THEN \n" +
                 "        comparison := 'correct'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'wrong'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: null}
      };
      const sql = "begin :output := nodb_checkplsqlvalue3 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: undefined}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: 0}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'wrong');
      assert.strictEqual(result.outBinds.p_in, 0);
      await connection.execute("drop function nodb_checkplsqlvalue3");
    }); // 70.10.3

    it('70.10.4 DATE, null values', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue4 (p_in IN OUT DATE) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in IS NULL THEN \n" +
                 "        comparison := 'correct'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'wrong'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: null}
      };
      const sql = "begin :output := nodb_checkplsqlvalue4 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      const today = new Date();
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: { type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: today }
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'wrong');
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: undefined}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      await connection.execute("drop function nodb_checkplsqlvalue4");
    }); // 70.10.4

    it('70.10.5 BUFFER', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue5 (p_in IN OUT RAW) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in IS NULL THEN \n" +
                 "        comparison := 'correct'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'wrong'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: null}
      };
      const sql = "begin :output := nodb_checkplsqlvalue5 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: Buffer.from('')}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: undefined}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      const bufsize = 21;
      const bufValue = assist.createBuffer(bufsize);
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: bufValue}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'wrong');
      assert.deepStrictEqual(result.outBinds.p_in, bufValue);
      await connection.execute("drop function nodb_checkplsqlvalue5");
    }); // 70.10.5

    it('70.10.6 TIMESTAMP, null values', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue6 (p_in IN OUT TIMESTAMP) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in IS NULL THEN \n" +
                 "        comparison := 'correct'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'wrong'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: null}
      };
      const sql = "begin :output := nodb_checkplsqlvalue6 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      const today = new Date();
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: { type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: today }
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'wrong');
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: undefined}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      await connection.execute("drop function nodb_checkplsqlvalue6");
    }); // 70.10.6

    it('70.10.7 TIMESTAMP WITH TIME ZONE, null values', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue7 (p_in IN OUT TIMESTAMP WITH TIME ZONE) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in IS NULL THEN \n" +
                 "        comparison := 'correct'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'wrong'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: null}
      };
      const sql = "begin :output := nodb_checkplsqlvalue7 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      const today = new Date();
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: { type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: today }
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'wrong');
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: undefined}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      await connection.execute("drop function nodb_checkplsqlvalue7");
    }); // 70.10.7

    it('70.10.8 TIMESTAMP WITH LOCAL TIME ZONE, null values', async function() {
      const proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue8 (p_in IN OUT TIMESTAMP WITH LOCAL TIME ZONE) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "    comparison VARCHAR2(20); \n" +
                 "BEGIN \n" +
                 "    IF p_in IS NULL THEN \n" +
                 "        comparison := 'correct'; \n" +
                 "    ELSE \n" +
                 "        comparison := 'wrong'; \n" +
                 "    END IF; \n" +
                 "    RETURN comparison; \n" +
                 "END;";
      await connection.execute(proc);
      let bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: null}
      };
      const sql = "begin :output := nodb_checkplsqlvalue8 (:p_in); end;";
      let result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      const today = new Date();
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: { type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: today }
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'wrong');
      bindVar = {
        output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
        p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: undefined}
      };
      result = await connection.execute(sql, bindVar);
      assert.strictEqual(result.outBinds.output, 'correct');
      assert.strictEqual(result.outBinds.p_in, null);
      await connection.execute("drop function nodb_checkplsqlvalue8");
    }); // 70.10.8

  }); // 70.10

  describe('70.11 dir: BIND_IN and BIND_OUT, type: TIMESTAMP(convert STRING to TIMESTAMP)', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc711(dateValue IN TIMESTAMP) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN TO_CHAR(dateValue,'YYYY-MM-DD HH24:MI:SS.FF');\n" +
                 "END nodb_plsqlbindfunc711;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc711";
      await connection.execute(sql);
    });

    const sqlrun_str = "BEGIN :output := nodb_plsqlbindfunc711(TO_TIMESTAMP(:dateValue, 'YYYY-MM-DD HH24:MI:SS.FF')); END;";
    const resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT};

    it('70.11.1 basic case', async function() {
      const date = '1999-12-01 11:00:00.001231000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, date);
    }); // 70.11.1

    it('70.11.2 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.11.2

    it('70.11.3 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ''}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.11.3

    it('70.11.4 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.11.4

    it('70.11.5 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_str, bindVar),
        /NJS-011:/
      );
    }); // 70.11.5

    it('70.11.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = '2016-02-30 00:00:00.000000000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_str, bindVar),
        /ORA-01839:/
      );
    }); // 70.11.7

    it('70.11.8 val: 1969-12-31', async function() {
      const date = '1969-12-31 00:00:00.000000000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.11.8

    it('70.11.9 val: epoch date 1970-1-1', async function() {
      const date = '1970-01-01 00:00:00.000000000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.11.9

  });//70.11

  describe('70.12 dir: BIND_IN and BIND_OUT, type: TIMESTAMP(WITH VARCHAR2 RETURN)', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc712(dateValue IN TIMESTAMP) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN TO_CHAR(dateValue,'YYYY-MM-DD HH24:MI:SS.FF');\n" +
                 "END nodb_plsqlbindfunc712;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc712";
      await connection.execute(sql);
    });

    const sqlrun_dt = "BEGIN :output := nodb_plsqlbindfunc712(:dateValue); END;";
    const resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT};

    it('70.12.1 basic case', async function() {
      const date = new Date("2016-09-10 14:10:10.123");
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const expectDate = "2016-09-10 14:10:10.123000000";
      assert.deepStrictEqual(result.outBinds.output, expectDate);
    }); // 70.12.1

    it('70.12.2 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.12.2

    it('70.12.3 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_dt, bindVar),
        /NJS-011:/
      );
    }); // 70.12.3

    it('70.12.4 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.12.4

    it('70.12.5 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_dt, bindVar),
        /NJS-011:/
      );
    }); // 70.12.5

    it('70.12.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date(2016, 1, 30, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "2016-03-01 00:00:00.000000000";
      assert.deepStrictEqual(result.outBinds.output, resultDate);
    }); // 70.12.7

    it('70.12.8 val: 1969-12-31', async function() {
      const date = new Date(1969, 11, 31, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1969-12-31 00:00:00.000000000";
      assert.deepStrictEqual(result.outBinds.output, resultDate);
    }); // 70.12.8

    it('70.12.9 val: epoch date 1970-1-1', async function() {
      const date = new Date(1970, 0, 1, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1970-01-01 00:00:00.000000000";
      assert.deepStrictEqual(result.outBinds.output, resultDate);
    }); // 70.12.9

    it('70.12.10 val: create Date value using numeric value: new Date(number)', async function() {
      const date = new Date(1476780296673); //Integer value representing the number of milliseconds since 1 January 1970 00:00:00 UTC
      const bindVar = {
        output:   resultBind,
        dateValue: {
          type: oracledb.DB_TYPE_TIMESTAMP_TZ,
          dir: oracledb.BIND_IN,
          val: date
        }
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "2016-10-18 08:44:56.673000000";
      assert.deepStrictEqual(result.outBinds.output, resultDate);
    }); // 70.12.10

    it('70.12.11 val: create Date value using numeric value: 0', async function() {
      //Zero time is 01 January 1970 00:00:00 UTC
      const date = new Date(0);
      const bindVar = {
        output:   resultBind,
        dateValue: {
          type: oracledb.DB_TYPE_TIMESTAMP_TZ,
          dir: oracledb.BIND_IN,
          val: date
        }
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1970-01-01 00:00:00.000000000";
      assert.deepStrictEqual(result.outBinds.output, resultDate);
    }); // 70.12.11

  });//70.12

  describe('70.13 dir: BIND_IN and BIND_OUT, type: TIMESTAMP', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc713(dateValue IN TIMESTAMP) RETURN TIMESTAMP \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN dateValue;\n" +
                 "END nodb_plsqlbindfunc713;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc713";
      await connection.execute(sql);
    });

    const sqlrun = "BEGIN :output := nodb_plsqlbindfunc713(:dateValue); END;";
    const resultBind = {type: oracledb.DATE, dir: oracledb.BIND_OUT};

    it('70.13.1 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.13.1

    it('70.13.2 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.13.2

    it('70.13.3 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.13.3

  });//70.13

  describe('70.14 dir: BIND_INOUT, type:TIMESTAMP', function() {
    before(async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc714 (p_inout IN OUT TIMESTAMP) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc714;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP PROCEDURE nodb_inoutproc714";
      await connection.execute(sql);
    });

    const sqlrun = "begin nodb_inoutproc714(p_inout => :p_inout); end;";

    it('70.14.1 basic case', async function() {
      const date = new Date(2016, 7, 5, 12, 13, 14, 123);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    });//70.14.1

    it('70.14.2 auto detect data type', async function() {
      const date = new Date(2016, 7, 5, 12, 13, 14, 123);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.14.2

    it('70.14.3 val: null', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.14.3

    it('70.14.4 val: empty string', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  ''
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.14.4

    it('70.14.5 val: undefined', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  undefined
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.14.5

    it('70.14.6 val: NaN', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  NaN
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.14.6

    it('70.14.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date (2016, 1, 30, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      const resultDate = new Date (2016, 2, 1, 0, 0, 0, 0);
      assert.deepStrictEqual(result.outBinds.p_inout, resultDate);
    }); // 70.14.7

    it('70.14.8 val: 1969-12-31', async function() {
      const date = new Date (1969, 11, 31, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.14.8

    it('70.14.9 val: epoch date 1970-1-1', async function() {
      const date = new Date (1970, 0, 1, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.14.9

    it('70.14.10 NULL IN and NON-NULL out', async function() {
      const proc71410 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc71410 (p_inout IN OUT TIMESTAMP) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := TO_TIMESTAMP('1999-12-01 11:00:00.001231000', 'YYYY-MM-DD HH24:MI:SS.FF'); \n" +
                 "END nodb_inoutproc71410;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const sqlrun71410 = "begin nodb_inoutproc71410(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc71410";
      await connection.execute(proc71410);
      const result = await connection.execute(sqlrun71410, bindVar);
      assert(result.outBinds.p_inout !== null);
      await connection.execute(sqldrop);
    }); // 70.14.10

    it('70.14.11 NON-NULL IN and NULL OUT', async function() {
      const proc71411 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc71411 (p_inout IN OUT TIMESTAMP) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := null; \n" +
                 "END nodb_inoutproc71411;";
      const date = new Date(2011, 0, 12, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const sqlrun71411 = "begin nodb_inoutproc71411(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc71411";
      await connection.execute(proc71411);
      const result = await connection.execute(sqlrun71411, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
      await connection.execute(sqldrop);
    }); // 70.14.11

  });//70.14

  describe('70.15 dir: BIND_IN and BIND_OUT, type: TIMESTAMP WITH TIME ZONE(convert STRING to TIMESTAMP)', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc715(dateValue IN TIMESTAMP WITH TIME ZONE) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN TO_CHAR(dateValue, 'YYYY-MM-DD HH24:MI:SS.FF TZH:TZM');\n" +
                 "END nodb_plsqlbindfunc715;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc715";
      await connection.execute(sql);
    });

    const sqlrun_str = "BEGIN :output := nodb_plsqlbindfunc715(TO_TIMESTAMP_TZ(:dateValue, 'YYYY-MM-DD HH24:MI:SS.FF TZH:TZM')); END;";
    const resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT};

    it('70.15.1 basic case', async function() {
      const date = '1999-12-01 11:00:00.123450000 -08:00';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.15.1

    it('70.15.2 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.15.2

    it('70.15.3 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ''}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.15.3

    it('70.15.4 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.15.4

    it('70.15.5 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_str, bindVar),
        /NJS-011:/
      );
    }); // 70.15.5

    it('70.15.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = '2016-02-30 00:00:00.000000000 -08:00';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_str, bindVar),
        /ORA-01839:/
      );
    }); // 70.15.7

    it('70.15.8 val: 1969-12-31', async function() {
      const date = '1969-12-31 00:00:00.000000000 -08:00';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.15.8

    it('70.15.9 val: epoch date 1970-1-1', async function() {
      const date = '1970-01-01 00:00:00.000000000 -08:00';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.15.9

  });//70.15

  describe('70.16 dir: BIND_IN and BIND_OUT, type: TIMESTAMP WITH TIME ZONE(WITH VARCHAR2 RETURN)', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc716(dateValue IN TIMESTAMP WITH TIME ZONE) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN TO_CHAR(dateValue,'YYYY-MM-DD HH24:MI:SS.FF');\n" +
                 "END nodb_plsqlbindfunc716;";
      await connection.execute(proc);
    }); // before

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc716";
      await connection.execute(sql);
    }); // after

    const sqlrun_dt = "BEGIN :output := nodb_plsqlbindfunc716(:dateValue); END;";
    const resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT};

    it('70.16.1 basic case', async function() {
      const date = new Date("2016-09-10 14:10:10.123");
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const expectDate = "2016-09-10 14:10:10.123000000";
      assert.deepStrictEqual(result.outBinds.output, expectDate);
    }); // 70.16.1

    it('70.16.2 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.16.2

    it('70.16.3 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_dt, bindVar),
        /NJS-011:/
      );
    }); // 70.16.3

    it('70.16.4 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.16.4

    it('70.16.5 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_dt, bindVar),
        /NJS-011:/
      );
    }); // 70.16.5

    it('70.16.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date(2016, 1, 30, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "2016-03-01 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.16.7

    it('70.16.8 val: 1969-12-31', async function() {
      const date = new Date(1969, 11, 31, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1969-12-31 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.16.8

    it('70.16.9 val: epoch date 1970-1-1', async function() {
      const date = new Date(1970, 0, 1, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1970-01-01 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.16.9

    it('70.16.10 val: create Date value using numeric value: new Date(number)', async function() {
      const date = new Date(1476780296673);
      const bindVar = {
        output:   resultBind,
        dateValue: {
          type: oracledb.DB_TYPE_TIMESTAMP_TZ,
          dir: oracledb.BIND_IN,
          val: date
        }
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "2016-10-18 08:44:56.673000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.16.10

    it('70.16.11 val: create Date value using numeric value: 0', async function() {
      //Zero time is 01 January 1970 00:00:00 UTC
      const date = new Date(0);
      const bindVar = {
        output: resultBind,
        dateValue: {
          type: oracledb.DB_TYPE_TIMESTAMP_TZ,
          dir: oracledb.BIND_IN,
          val: date
        }
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1970-01-01 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.16.11

  });//70.16

  describe('70.17 dir: BIND_IN and BIND_OUT, type: TIMESTAMP WITH TIME ZONE', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc717(dateValue IN TIMESTAMP WITH TIME ZONE) RETURN TIMESTAMP WITH TIME ZONE \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN dateValue;\n" +
                 "END nodb_plsqlbindfunc717;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc717";
      await connection.execute(sql);
    }); // after

    const sqlrun = "BEGIN :output := nodb_plsqlbindfunc717(:dateValue); END;";
    const resultBind = {type: oracledb.DATE, dir: oracledb.BIND_OUT};

    it('70.17.1 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.17.1

    it('70.17.2 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.17.2

    it('70.17.3 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.17.3

  });//70.17

  describe('70.18 dir: BIND_INOUT, type:TIMESTAMP WITH TIME ZONE', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc718 (p_inout IN OUT TIMESTAMP WITH TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc718;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP PROCEDURE nodb_inoutproc718";
      await connection.execute(sql);
    });

    const sqlrun = "begin nodb_inoutproc718(p_inout => :p_inout); end;";

    it('70.18.1 basic case', async function() {
      const date = new Date(2016, 7, 5, 12, 13, 14, 123);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    });//70.18.1

    it('70.18.2 auto detect data type', async function() {
      const date = new Date(2016, 7, 5, 12, 13, 14, 123);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.18.2

    it('70.18.3 val: null', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.18.3

    it('70.18.4 val: empty string', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  ''
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.18.4

    it('70.18.5 val: undefined', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  undefined
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.18.5

    it('70.18.6 val: NaN', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  NaN
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.18.6

    it('70.18.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date (2016, 1, 30, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      const resultDate = new Date (2016, 2, 1, 0, 0, 0, 0);
      assert.deepStrictEqual(result.outBinds.p_inout, resultDate);
    }); // 70.18.7

    it('70.18.8 val: 1969-12-31', async function() {
      const date = new Date (1969, 11, 31, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.18.8

    it('70.18.9 val: epoch date 1970-1-1', async function() {
      const date = new Date (1970, 0, 1, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.18.9

    it('70.18.10 NULL IN and NON-NULL out', async function() {
      const proc71810 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc71810 (p_inout IN OUT TIMESTAMP WITH TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := TO_TIMESTAMP_TZ('1999-12-01 11:00:00.001231000', 'YYYY-MM-DD HH24:MI:SS.FF'); \n" +
                 "END nodb_inoutproc71810;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const sqlrun71810 = "begin nodb_inoutproc71810(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc71810";
      await connection.execute(proc71810);
      const result = await connection.execute(sqlrun71810, bindVar);
      assert(result.outBinds.p_inout !== null);
      await connection.execute(sqldrop);
    }); // 70.18.10

    it('70.18.11 NON-NULL IN and NULL OUT', async function() {
      const proc71811 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc71811 (p_inout IN OUT TIMESTAMP WITH TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := null; \n" +
                 "END nodb_inoutproc71811;";
      const date = new Date(2011, 0, 12, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const sqlrun71811 = "begin nodb_inoutproc71811(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc71811";
      await connection.execute(proc71811);
      const result = await connection.execute(sqlrun71811, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
      await connection.execute(sqldrop);
    }); // 70.18.11

  });//70.18

  describe('70.19 dir: BIND_IN and BIND_OUT, type: TIMESTAMP WITH LOCAL TIME ZONE(convert STRING to TIMESTAMP)', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc719(dateValue IN TIMESTAMP WITH LOCAL TIME ZONE) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN TO_CHAR(dateValue, 'YYYY-MM-DD HH24:MI:SS.FF');\n" +
                 "END nodb_plsqlbindfunc719;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc719";
      await connection.execute(sql);
    });

    const sqlrun_str = "BEGIN :output := nodb_plsqlbindfunc719(TO_TIMESTAMP_TZ(:dateValue, 'YYYY-MM-DD HH24:MI:SS.FF')); END;";
    const resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT};

    it('70.19.1 basic case', async function() {
      const date = '1999-12-01 11:00:00.123450000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.deepStrictEqual(result.outBinds.output, date);
    }); // 70.19.1

    it('70.19.2 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.19.2

    it('70.19.3 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ''}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.19.3

    it('70.19.4 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.19.4

    it('70.19.5 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_str, bindVar),
        /NJS-011:/
      );
    }); // 70.19.5

    it('70.19.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = '2016-02-30 00:00:00.000000000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_str, bindVar),
        /ORA-01839:/
      );
    }); // 70.19.7

    it('70.19.8 val: 1969-12-31', async function() {
      const date = '1969-12-31 00:00:00.000000000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      const resultDate = result.outBinds.output.toLowerCase();
      assert.deepStrictEqual(resultDate, date);
    }); // 70.19.8

    it('70.19.9 val: epoch date 1970-1-1', async function() {
      const date = '1970-01-01 00:00:00.000000000';
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_str, bindVar);
      const resultDate = result.outBinds.output.toLowerCase();
      assert.deepStrictEqual(resultDate, date);
    }); // 70.19.9

  });//70.19

  describe('70.20 dir: BIND_IN and BIND_OUT, type: TIMESTAMP WITH LOCAL TIME ZONE(WITH VARCHAR2 RETURN)', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc720(dateValue IN TIMESTAMP WITH LOCAL TIME ZONE) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN TO_CHAR(dateValue,'YYYY-MM-DD HH24:MI:SS.FF');\n" +
                 "END nodb_plsqlbindfunc720;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc720";
      await connection.execute(sql);
    });

    const sqlrun_dt = "BEGIN :output := nodb_plsqlbindfunc720(:dateValue); END;";
    const resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT};

    it('70.20.1 basic case', async function() {
      const date = new Date("2016-09-10 14:10:10.123");
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const expectDate = "2016-09-10 14:10:10.123000000";
      assert.strictEqual(result.outBinds.output, expectDate);
    }); // 70.20.1

    it('70.20.2 val: null', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: null}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.20.2

    it('70.20.3 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_dt, bindVar),
        /NJS-011:/
      );
    }); // 70.20.3

    it('70.20.4 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.20.4

    it('70.20.5 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun_dt, bindVar),
        /NJS-011:/
      );
    }); // 70.20.5

    it('70.20.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date(2016, 1, 30, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "2016-03-01 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.20.7

    it('70.20.8 val: 1969-12-31', async function() {
      const date = new Date(1969, 11, 31, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1969-12-31 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.20.8

    it('70.20.9 val: epoch date 1970-1-1', async function() {
      const date = new Date(1970, 0, 1, 0, 0, 0, 0);
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1970-01-01 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.20.9

    it('70.20.10 val: create Date value using numeric value: new Date(number)', async function() {
      const date = new Date(1476780296673);
      const bindVar = {
        output: resultBind,
        dateValue: {
          type: oracledb.DB_TYPE_TIMESTAMP_TZ,
          dir: oracledb.BIND_IN,
          val: date
        }
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "2016-10-18 08:44:56.673000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.20.10

    it('70.20.11 val: create Date value using numeric value: 0', async function() {
      //Zero time is 01 January 1970 00:00:00 UTC
      const date = new Date(0);
      const bindVar = {
        output: resultBind,
        dateValue: {
          type: oracledb.DB_TYPE_TIMESTAMP_TZ,
          dir: oracledb.BIND_IN,
          val: date
        }
      };
      const result = await connection.execute(sqlrun_dt, bindVar);
      const resultDate = "1970-01-01 00:00:00.000000000";
      assert.strictEqual(result.outBinds.output, resultDate);
    }); // 70.20.11

  });//70.20

  describe('70.21 dir: BIND_IN and BIND_OUT, type: TIMESTAMP WITH LOCAL TIME ZONE', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc721(dateValue IN TIMESTAMP WITH LOCAL TIME ZONE) RETURN TIMESTAMP WITH LOCAL TIME ZONE \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN dateValue;\n" +
                 "END nodb_plsqlbindfunc721;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP FUNCTION nodb_plsqlbindfunc721";
      await connection.execute(sql);
    });

    const sqlrun = "BEGIN :output := nodb_plsqlbindfunc721(:dateValue); END;";
    const resultBind = {type: oracledb.DATE, dir: oracledb.BIND_OUT};

    it('70.21.1 val: empty string', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.21.1

    it('70.21.2 val: undefined', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.output, null);
    }); // 70.21.2

    it('70.21.3 val: NaN', async function() {
      const bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.21.3

  });//70.21

  describe('70.22 dir: BIND_INOUT, type:TIMESTAMP WITH LOCAL TIME ZONE', function() {

    before(async function() {
      const proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc722 (p_inout IN OUT TIMESTAMP WITH LOCAL TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc722;";
      await connection.execute(proc);
    });

    after(async function() {
      const sql = "DROP PROCEDURE nodb_inoutproc722";
      await connection.execute(sql);
    });

    const sqlrun = "begin nodb_inoutproc722(p_inout => :p_inout); end;";

    it('70.22.1 basic case', async function() {
      const date = new Date(2016, 7, 5, 12, 13, 14, 123);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    });//70.22.1

    it('70.22.2 auto detect data type', async function() {
      const date = new Date(2016, 7, 5, 12, 13, 14, 123);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.22.2

    it('70.22.3 val: null', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.22.3

    it('70.22.4 val: empty string', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  ''
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.22.4

    it('70.22.5 val: undefined', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  undefined
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
    }); // 70.22.5

    it('70.22.6 val: NaN', async function() {
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  NaN
        }
      };
      await assert.rejects(
        async () => await connection.execute(sqlrun, bindVar),
        /NJS-011:/
      );
    }); // 70.22.6

    it('70.22.7 val: invalid Date Value: Feb 30, 2016', async function() {
      const date = new Date (2016, 1, 30, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      const resultDate = new Date (2016, 2, 1, 0, 0, 0, 0);
      assert.deepStrictEqual(result.outBinds.p_inout, resultDate);
    }); // 70.22.7

    it('70.22.8 val: 1969-12-31', async function() {
      const date = new Date (1969, 11, 31, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.22.8

    it('70.22.9 val: epoch date 1970-1-1', async function() {
      const date = new Date (1970, 0, 1, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const result = await connection.execute(sqlrun, bindVar);
      assert.deepStrictEqual(result.outBinds.p_inout, date);
    }); // 70.22.9

    it('70.22.10 NULL IN and NON-NULL OUT', async function() {
      const proc72210 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc72210 (p_inout IN OUT TIMESTAMP WITH LOCAL TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := TO_TIMESTAMP_TZ('1999-12-01 11:00:00.001231000', 'YYYY-MM-DD HH24:MI:SS.FF'); \n" +
                 "END nodb_inoutproc72210;";
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };
      const sqlrun72210 = "begin nodb_inoutproc72210(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc72210";
      await connection.execute(proc72210);
      const result = await connection.execute(sqlrun72210, bindVar);
      assert(result.outBinds.p_inout !== null);
      await connection.execute(sqldrop);
    }); // 70.22.10

    it('70.22.11 NON-NULL IN and NULL OUT', async function() {
      const proc72211 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc72211 (p_inout IN OUT TIMESTAMP WITH LOCAL TIME ZONE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := null; \n" +
                 "END nodb_inoutproc72211;";
      const date = new Date(2011, 0, 12, 0, 0, 0, 0);
      const bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };
      const sqlrun72211 = "begin nodb_inoutproc72211(p_inout => :p_inout); end;";
      const sqldrop = "DROP PROCEDURE nodb_inoutproc72211";
      await connection.execute(proc72211);
      const result = await connection.execute(sqlrun72211, bindVar);
      assert.strictEqual(result.outBinds.p_inout, null);
      await connection.execute(sqldrop);
    }); // 70.22.11

  });//70.22

});
