/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   70. plsqlBindScalar.js
 *
 * DESCRIPTION
 *   Testing PL/SQL bind scalars.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('70. plsqlBindScalar.js', function() {

  var connection = null;

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  }); // before

  after(function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  }); // after

  describe('70.1 PL/SQL bind scalar, dir: BIND_IN and BIND_OUT, type: STRING', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc71(strValue IN VARCHAR2) RETURN VARCHAR2 \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN strValue;\n" +
                 "END nodb_plsqlbindfunc71;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after(function(done) {
      var sql = "DROP FUNCTION nodb_plsqlbindfunc71";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "BEGIN :output := nodb_plsqlbindfunc71(:strValue); END;";
    var resultBind = {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000};

    it('70.1.1 basic case: a simple string', function(done) {
      var bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: "PL/SQL Binding Scalar"}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, "PL/SQL Binding Scalar");
          done();
        }
      );
    }); // 70.1.1

    it('70.1.2 negative: bind value and type mismatch', function(done) {
      var bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: 42}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          // NJS-011: encountered bind value and type mismatch in parameter 2
          done();
        }
      );
    }); // 70.1.2

    it('70.1.3 val: null', function(done) {
      var bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: null}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.1.3

    it('70.1.4 val: empty string', function(done) {
      var bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ''}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.1.4

    it('70.1.5 val: undefined', function(done) {
      var bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: undefined}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    });

    it('70.1.6 tests default dir & type', function(done) {
      var bindVar = {
        output:   resultBind,
        strValue: "PL/SQL Binding Scalar"
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, "PL/SQL Binding Scalar");
          done();
        }
      );
    }); // 70.1.6

    it('70.1.7 val: NaN', function(done) {
      var bindVar = {
        output:   resultBind,
        strValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: NaN}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          // console.log(result);
          (err.message).should.startWith('NJS-011');
          done();
        }
      );
    });

  }); // 70.1

  describe('70.2 dir: BIND_IN and BIND_OUT, type: NUMBER', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc72(numValue IN NUMBER) RETURN NUMBER \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN numValue;\n" +
                 "END nodb_plsqlbindfunc72;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after(function(done) {
      var sql = "DROP FUNCTION nodb_plsqlbindfunc72";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "BEGIN :output := nodb_plsqlbindfunc72(:numValue); END;";
    var resultBind = {type: oracledb.NUMBER, dir: oracledb.BIND_OUT};

    it('70.2.1 basic case', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 755}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, 755);
          done();
        }
      );
    }); // 70.2.1

    it('70.2.2 auto detect number type', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: 755
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, 755);
          done();
        }
      );
    }); // 70.2.2

    it('70.2.3 val: null', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: null}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.2.3

    it('70.2.4 Negatvie: bind value and type mismatch - val: empty string', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: ''}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011');
          // console.log(result);
          done();
        }
      );
    }); // 70.2.4

    it('70.2.5 val: 0', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 0}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, 0);
          done();
        }
      );
    }); // 70.2.5

    it('70.2.6 val: undefined', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: undefined}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.2.6

    it.skip('70.2.7 val: NaN', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: NaN}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          // console.log(result);
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.2.

  }); // 70.2

  describe('70.3 dir: BIND_IN and BIND_OUT, type: DATE', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc73(dateValue IN DATE) RETURN DATE \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN dateValue;\n" +
                 "END nodb_plsqlbindfunc73;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after(function(done) {
      var sql = "DROP FUNCTION nodb_plsqlbindfunc73";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "BEGIN :output := nodb_plsqlbindfunc73(:dateValue); END;";
    var resultBind = {type: oracledb.DATE, dir: oracledb.BIND_OUT};
    var dt = new Date(2016, 8, 1);

    it('70.3.1 basic case', function(done) {
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: dt}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.output).should.eql(dt);
          done();
        }
      );
    }); // 70.3.1

    it('70.3.2 auto detect Date type', function(done) {
      var bindVar = {
        output:   resultBind,
        dateValue: dt
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.output).should.eql(dt);
          done();
        }
      );
    }); // 70.3.2

    it('70.3.3 val: null', function(done) {
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: null}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.3.3

    it('70.3.4 val: empty string, negative - bind value and type mismatch', function(done) {
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: ''}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          // console.log(result);
          done();
        }
      );
    }); // 70.3.4

    it('70.3.5 val: undefined', function(done) {
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: undefined}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.3.5

    it('70.3.6 val: NaN', function(done) {
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: NaN}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          // console.log(result);
          done();
        }
      );
    }); // 70.3.6

  }); // 70.3

  describe('70.4 dir: BIND_IN and BIND_OUT, type: BUFFER', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE \n" +
                 "FUNCTION nodb_plsqlbindfunc74(bufValue IN RAW) RETURN RAW \n" +
                 "IS \n" +
                 "BEGIN \n" +
                 "    RETURN bufValue;\n" +
                 "END nodb_plsqlbindfunc74;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after(function(done) {
      var sql = "DROP FUNCTION nodb_plsqlbindfunc74";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "BEGIN :output := nodb_plsqlbindfunc74(:bufValue); END;";
    var resultBind = {type: oracledb.BUFFER, dir: oracledb.BIND_OUT};
    var bufsize = 100;
    var bindValue = assist.createBuffer(bufsize);

    it('70.4.1 basic case', function(done) {
      var bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: bindValue}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.output).should.eql(bindValue);
          done();
        }
      );
    }); // 70.4.1

    it('70.4.2 auto detect Buffer type', function(done) {
      var bindVar = {
        output:   resultBind,
        bufValue: bindValue
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.output).should.eql(bindValue);
          done();
        }
      );
    }); // 70.4.2

    it('70.4.3 val: null', function(done) {
      var bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: null}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.4.3

    it('70.4.4 val: empty string', function(done) {
      var bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: ''}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          // console.log(result);
          done();
        }
      );
    }); // 70.4.4

    it('70.4.5 val: undefined', function(done) {
      var bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: undefined}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.output, null);
          done();
        }
      );
    }); // 70.4.5

    it('70.4.6 val: NaN', function(done) {
      var bindVar = {
        output:   resultBind,
        bufValue: {type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: NaN}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.4.6

  }); // 70.4

  describe('70.5 dir: BIND_INOUT, type: STRING', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc5 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc5;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );

    }); // before

    after(function(done) {
      var sql = "DROP PROCEDURE nodb_inoutproc5";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "begin nodb_inoutproc5(p_inout => :p_inout); end;";

    it('70.5.1 basic case: a simple string', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  "PL/SQL Binding INOUT Scalar"
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, "PL/SQL Binding INOUT Scalar");
          done();
        }
      );
    }); // 70.5.1

    it('70.5.2 tests default type', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  "PL/SQL Binding INOUT Scalar"
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, "PL/SQL Binding INOUT Scalar");
          done();
        }
      );
    }); // 70.5.2

    it('70.5.3 negative: bind value and type mismatch', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  755
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011');
          done();
        }
      );
    }); // 70.5.3

    it('70.5.4 val: null', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  null
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
          done();
        }
      );
    }); // 70.5.4

    it('70.5.5 val: empty string', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  ''
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
          done();
        }
      );
    }); // 70.5.5

    it('70.5.6 val: undefined', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  undefined
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
          done();
        }
      );
    }); // 70.5.6

    it('70.5.7 val: NaN', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  NaN
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011');
          done();
        }
      );
    }); // 70.5.7

  }); // 70.5

  describe('70.6 dir: BIND_INOUT, type: NUMBER', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc6 (p_inout IN OUT NUMBER) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc6;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );

    }); // before

    after(function(done) {
      var sql = "DROP PROCEDURE nodb_inoutproc6";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "begin nodb_inoutproc6(p_inout => :p_inout); end;";

    it('70.6.1 basic case', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  8396
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, 8396);
          done();
        }
      );
    }); // 70.6.1

    it('70.6.2 auto detect number type', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  8396
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, 8396);
          done();
        }
      );
    }); // 70.6.2

    it('70.6.3 negative: bind value and type mismatch - val: empty string', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  ''
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.6.3

    it.skip('70.6.4 val: null', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  null
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
          done();
        }
      );
    }); // 70.6.4

    it.skip('70.6.5 val: undefined',function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  undefined
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
          done();
        }
      );
    }); // 70.6.5

    it.skip('70.6.6 val: NaN', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  NaN
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
          done();
        }
      );
    }); // 70.6.6

    it('70.6.7 val: 0', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  0
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, 0);
          done();
        }
      );
    }); // 70.6.7

  }); // 70.6

  describe('70.7 dir: BIND_INOUT, type: DATE', function() {

    before(function(done) {
      var proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc7 (p_inout IN OUT DATE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc7;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );

    }); // before

    after(function(done) {
      var sql = "DROP PROCEDURE nodb_inoutproc7";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "begin nodb_inoutproc7(p_inout => :p_inout); end;";
    var daterun = new Date(2016, 7, 5);

    it('70.7.1 basic case', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  daterun
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.p_inout).should.eql(daterun);
          done();
        }
      );
    }); // 70.7.1

    it('70.7.2 auto detect Date type', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  daterun
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.p_inout).should.eql(daterun);
          done();
        }
      );
    }); // 70.7.2

    it.skip('70.7.3 val: null', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          console.log(result);
          // should.strictEqual(result.outBinds.p_inout, null);
          done();
        }
      );
    }); // 70.7.3

    it('70.7.4 val: empty string, negative - bind value and type mismatch', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  ''
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.7.4

    it.skip('70.7.5 val: undefined', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  undefined
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
           console.log(result);
          //(result.outBinds.p_inout).should.eql(daterun);
          done();
        }
      );
    }); // 70.7.5

    it('70.7.6 val: NaN', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  NaN
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.7.6

  }); // 70.7

  describe('70.8 dir: BIND_INOUT, type: BUFFER', function() {
    before(function(done) {
      var proc = "CREATE OR REPLACE PROCEDURE nodb_inoutproc8 (p_inout IN OUT RAW) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := p_inout; \n" +
                 "END nodb_inoutproc8;";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );

    }); // before

    after(function(done) {
      var sql = "DROP PROCEDURE nodb_inoutproc8";
      connection.execute(
        sql,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    var sqlrun = "begin nodb_inoutproc8(p_inout => :p_inout); end;";

    var bufsize = 201;
    var bufValue = assist.createBuffer(bufsize);

    it('70.8.1 basic case', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  bufValue,
          maxSize: 32767 // max allowed value of maxSize in PL/SQL
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.p_inout).should.eql(bufValue);
          done();
        }
      );
    }); // 70.8.1

    it('70.8.2 auto detect BUFFER type', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          val:  bufValue,
          maxSize: 32767
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          (result.outBinds.p_inout).should.eql(bufValue);
          done();
        }
      );
    }); // 70.8.2

    it.skip('70.8.3 val: null', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  null,
          maxSize: 32767
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          console.log(result);
          //(result.outBinds.p_inout).should.eql(bufValue);
          done();
        }
      );
    }); // 70.8.3

    it('70.8.4 val: empty string', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  '',
          maxSize: 32767
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.8.4

    it.skip('70.8.5 val: undefined', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  undefined,
          maxSize: 32767
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          console.log(result);
          //(result.outBinds.p_inout).should.eql(bufValue);
          done();
        }
      );
    }); // 70.8.5

    it('70.8.6 val: NaN', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  NaN,
          maxSize: 32767
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.8.6

  }); // 70.8

});
