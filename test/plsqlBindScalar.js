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
  var nodever6   = false;  // assume node runtime version is lower than 6

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;

      // Note down whether node runtime version is >= 6 or not
      if ( process.versions["node"].substring ( 0, 1 ) >= "6" )
        nodever6 = true;

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
    });// 70.1.7

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

    it('70.2.7 val: NaN', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: NaN}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          // (err.message).should.startWith('NJS-011:');
          done();
        }
      );
    }); // 70.2.7

    it('70.2.8 val: -1', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: -1}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, -1);
          done();
        }
      );
    }); // 70.2.8

    it.skip('70.2.9 val: maxval', function(done) {
      var bindVar = {
        output:   resultBind,
        numValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 0x0FFFFFFFFFFFFFFF}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.output, 0x0FFFFFFFFFFFFFFF);
          done();
        }
      );
    }); // 70.2.9
   
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
    var dt = new Date( 2016, 8, 1 );

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

    it('70.3.7 val: invalid Date Value: Feb 30, 2016', function(done) {
      var date = new Date ( 2016, 1, 30 );
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var resultDate = new Date ( 2016, 2, 1);
          (result.outBinds.output).should.eql(resultDate);
          done();
        }
      );
    }); // 70.3.7

    it('70.3.8 val: 1969-12-31', function(done) {
      var date = new Date ( 1969, 11, 31 );
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          (result.outBinds.output).should.eql(date);
          done();
        }
      );
    }); // 70.3.8

    it('70.3.9 val: epoc date 1970-1-1', function(done) {
      var date = new Date ( 1970, 0, 1 );
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          (result.outBinds.output).should.eql(date);
          done();
        }
      );
    }); // 70.3.9

    it('70.3.10 val: create Date value using numeric value: new Date(number)', function(done) {
      var date = new Date ( 1476780296673 );
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          //Oracle stores only the fractions up to second in a DATE field.
          var dateResult = new Date ( 1476780296000 );
          (result.outBinds.output).should.eql(dateResult);
          done();
        }
      );
    }); // 70.3.10

    it('70.3.11 val: create Date value using numeric value: new Date(7 number)', function(done) {
      var date = new Date ( 2011, 5, 3, 4, 6, 23, 123 );
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          //Oracle stores only the fractions up to second in a DATE field.
          var dateResult = new Date ( 2011, 5, 3, 4, 6, 23, 0 );
          (result.outBinds.output).should.eql(dateResult);
          done();
        }
      );
    }); // 70.3.11

    it('70.3.12 val: create Date value using numeric value: 0', function(done) {
      //Zero time is 01 January 1970 00:00:00 UTC
      var date = new Date ( 0 );
      var bindVar = {
        output:   resultBind,
        dateValue: {type: oracledb.DATE, dir: oracledb.BIND_IN, val: date}
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          var dateResult = new Date ( Date.UTC( 1970, 0, 1 ) );
          (result.outBinds.output).should.eql(dateResult);
          done();
        }
      );
    }); // 70.3.12

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

    it('70.5.8 NULL IN and NON-NULL out', function(done) {
      var proc508 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc508 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := 'abc'; \n" +
                 "END nodb_inoutproc508;";
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  null
        }
      };
      var sqlrun508 = "begin nodb_inoutproc508(p_inout => :p_inout); end;";
      var sqldrop = "DROP PROCEDURE nodb_inoutproc508";
      async.series([
        function(cb) {
          connection.execute(
             proc508,
             function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
        function(cb) {
          connection.execute(
            sqlrun508,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.p_inout, 'abc');
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqldrop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.5.8
  
    it('70.5.9 NON-NULL IN and NULL OUT', function(done) {
      var proc509 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc509 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := null; \n" +
                 "END nodb_inoutproc509;"      
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  "abc"
        }
      };
      var sqlrun509 = "begin nodb_inoutproc509(p_inout => :p_inout); end;";
      var sqldrop = "DROP PROCEDURE nodb_inoutproc509";

      async.series([
        function(cb) {
          connection.execute(
             proc509,
             function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
        function(cb) {
          connection.execute(
            sqlrun509,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.p_inout, null);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqldrop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.5.9

    it('70.5.10 n Length IN and 2n OUT', function(done) {
      var proc510 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc510 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := concat (p_inout, p_inout); \n" +
                 "END nodb_inoutproc510;"
      var strVar = "abcdefghijklmnopqrstuvwxyz";
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  strVar
        }
      };
      var sqlrun510 = "begin nodb_inoutproc510(p_inout => :p_inout); end;";
    var sqldrop = "DROP PROCEDURE nodb_inoutproc510";
    async.series([
        function(cb) {
          connection.execute(
             proc510,
             function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
        function(cb) {
          connection.execute(
            sqlrun510,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              var resutVar = strVar + strVar;
              should.strictEqual(result.outBinds.p_inout, resutVar);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqldrop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.5.10

    it('70.5.11 2n Length IN and n OUT', function(done) {
      var proc511 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc511 (p_inout IN OUT STRING) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := substr ( p_inout, 1, Length(p_inout)/2 ); \n" +
                 "END nodb_inoutproc511;"
      var strVar = "Pack my bag with five dozen liquor jugs";
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.STRING,
          val:  strVar
        }
      };
      var sqlrun511 = "begin nodb_inoutproc511(p_inout => :p_inout); end;";
      var sqldrop = "DROP PROCEDURE nodb_inoutproc511";
      async.series([
          function(cb) {
            connection.execute(
               proc511,
               function(err) {
                  should.not.exist(err);
                  cb();
                }
              );
            },
          function(cb) {
            connection.execute(
              sqlrun511,
              bindVar,
              function(err, result) {
                should.not.exist(err);
                // console.log(result);
                var resultVar = "Pack my bag with fiv";
                //var resultVar=strVar.substr(0,(strVar.length-1)/2);
                should.strictEqual(result.outBinds.p_inout, resultVar);
                cb();
              }
            );
          },
          function(cb) {
            connection.execute(
              sqldrop,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          }
        ], done);
      }); // 70.5.11

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

    it('70.6.4 val: null', function(done) {
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

    it('70.6.5 val: undefined',function(done) {
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

    it('70.6.8 val: -1', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  -1
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, -1);
          done();
        }
      );
    }); // 70.6.8

    it.skip('70.6.9 val: maxval', function(done) {
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  0x0FFFFFFFFFFFFFFF
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.p_inout, Number.MAX_VALUE);
          done();
        }
      );
    }); // 70.6.9

    it('70.6.10 NULL IN and NON-NULL out', function(done) {
      var proc610 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc610 (p_inout IN OUT NUMBER) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    p_inout := 3; \n" +
                   "END nodb_inoutproc610;";
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  null
        }
      };  
      var sqlrun610 = "begin nodb_inoutproc610(p_inout => :p_inout); end;";
      var sqldrop = "DROP PROCEDURE nodb_inoutproc610";

      async.series([
        function(cb) {
          connection.execute(
             proc610,
             function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
        function(cb) {
          connection.execute(
            sqlrun610,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.p_inout, 3);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqldrop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.6.10 

    it('70.6.11 NON-NULL IN and NULL OUT', function(done) {
      var proc611 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc611 (p_inout IN OUT NUMBER) \n" +
                   "AS \n" +
                   "BEGIN \n" +
                   "    p_inout := null; \n" +
                   "END nodb_inoutproc611;";
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.NUMBER,
          val:  3
        }
      };  
      var sqlrun611 = "begin nodb_inoutproc611(p_inout => :p_inout); end;";
      var sqldrop = "DROP PROCEDURE nodb_inoutproc611";

      async.series([
        function(cb) {
          connection.execute(
             proc611,
             function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
        function(cb) {
          connection.execute(
            sqlrun611,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.p_inout, null);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqldrop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done); 
    });// 70.6.11

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
    var daterun = new Date( 2016, 7, 5 );

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

    it('70.7.3 val: null', function(done) {
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
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
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

    it('70.7.5 val: undefined', function(done) {
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
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
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

    it('70.7.7 val: invalid Date Value: Feb 30, 2016', function(done) {
      var date = new Date ( 2016, 1, 30 );
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          //console.log(result);
          var resultDate = new Date ( 2016, 2, 1 );
          (result.outBinds.p_inout).should.eql(resultDate);
          done();
        }
      );
    }); // 70.7.7

    it('70.7.8 val: 1969-12-31', function(done) {
      var date = new Date ( 1969, 11, 31 );
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          (result.outBinds.p_inout).should.eql(date);
          done();
        }
      );
    }); // 70.7.8

    it('70.7.9 val: epoc date 1970-1-1', function(done) {
      var date = new Date ( 1970, 0, 1 );
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  date
        }
      };

      connection.execute(
        sqlrun,
        bindVar,
        function(err, result) {
          should.not.exist(err);
          (result.outBinds.p_inout).should.eql(date);
          done();
        }
      );
    }); // 70.7.9

    it('70.7.10 NULL IN and NON-NULL out', function(done) {
      var proc710 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc710 (p_inout IN OUT DATE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := TO_DATE('5-AUG-2016'); \n" +
                 "END nodb_inoutproc710;";
      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.DATE,
          val:  null
        }
      }; 
      var sqlrun710 = "begin nodb_inoutproc710(p_inout => :p_inout); end;";
      var sqldrop = "DROP PROCEDURE nodb_inoutproc710";
      async.series([
        function(cb) {
          connection.execute(
             proc710,
             function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
        function(cb) {
          connection.execute(
            sqlrun710,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              var date = new Date( 2016, 7, 5 );
              (result.outBinds.p_inout).should.eql(date);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqldrop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.7.10 
  
    it('70.7.11 NON-NULL IN and NULL OUT', function(done) {
      var proc711 = "CREATE OR REPLACE PROCEDURE nodb_inoutproc711 (p_inout IN OUT DATE) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    p_inout := null; \n" +
                 "END nodb_inoutproc711;";
      var date = new Date( 2011, 0, 12 );
      var bindVar = {
          p_inout : {
            dir:  oracledb.BIND_INOUT,
            type: oracledb.DATE,
            val:  date
          }
        };
      var sqlrun711 = "begin nodb_inoutproc711(p_inout => :p_inout); end;";
      var sqldrop = "DROP PROCEDURE nodb_inoutproc711";
      async.series([
        function(cb) {
          connection.execute(
             proc711,
             function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
        function(cb) {
          connection.execute(
            sqlrun711,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.p_inout, null);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            sqldrop,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.7.11

      
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

    it('70.8.3 val: null', function(done) {
      var emptybuf;
      if ( nodever6 )
        emptybuf = new Buffer.alloc ( 0 ) ;
      else
        emptybuf = new Buffer ( 0 );

      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
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
    }); // 70.8.3

    it('70.8.4 val: empty string', function(done) {
      var emptybuf;

      if ( nodever6 )
        emptybuf = new Buffer.from ("", "utf-8" );
      else
        emptybuf = new Buffer ( "", "utf-8" ) ;

      var bindVar = {
        p_inout : {
          dir:  oracledb.BIND_INOUT,
          type: oracledb.BUFFER,
          val:  emptybuf,
          maxSize: 32767
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
    }); // 70.8.4

    it('70.8.5 val: undefined', function(done) {
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
          // console.log(result);
          should.strictEqual(result.outBinds.p_inout, null);
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

  describe('70.9 Query the binded data by SQL', function() {
    before(function(done) {

      var proc1 ="BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_plsqlbindtab'); \n" +
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

      var proc2 ="CREATE OR REPLACE PROCEDURE nodb_inoutproc9 ( \n" +
                 "    p_in IN NUMBER, p_inout1 IN OUT VARCHAR2, \n" +
                 "    p_inout2 IN OUT NUMBER, p_inout3 IN OUT DATE, p_inout4 IN OUT RAW) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_plsqlbindtab(id, str, num, dat, buf) values (p_in, p_inout1, p_inout2, p_inout3, p_inout4); \n" +
                 "END nodb_inoutproc9;";

      var proc3 ="CREATE OR REPLACE PROCEDURE nodb_inoutproc10 ( \n" +
                 "    p_in IN NUMBER, p_str IN VARCHAR2, \n" +
                 "    p_num IN NUMBER, p_dat IN DATE, p_buf IN RAW) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_plsqlbindtab(id, str, num, dat, buf) values (p_in, p_str, p_num, p_dat, p_buf); \n" +
                 "END nodb_inoutproc10;";

      async.series([
        function(cb) {
          connection.execute(
            proc1,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc2,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            proc3,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);

    }); // before

    after(function(done) {

      async.series([
        function(cb) {
          connection.execute(
            "DROP PROCEDURE nodb_inoutproc9",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP PROCEDURE nodb_inoutproc10",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP TABLE nodb_plsqlbindtab",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // after

    var sqlinout = "begin nodb_inoutproc9(:p_in, :p_inout1, :p_inout2, :p_inout3, :p_inout4); end;";
    var sqlin    = "begin nodb_inoutproc10(:p_in, :p_str, :p_num, :p_dat, :p_buf); end;";

    it('70.9.1 basic case', function(done) {

      var rowid = 1;
      var bufsize = 201;
      var bufValue = assist.createBuffer(bufsize);
      var daterun = new Date( 2016, 7, 5 );

      var bindVar = {
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

      async.series([
        function(cb) {
          connection.execute(
            sqlinout,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.p_inout1, "PL/SQL Binding INOUT Scalar");
              should.strictEqual(result.outBinds.p_inout2, 101);
              (result.outBinds.p_inout3).should.eql(daterun);
              (result.outBinds.p_inout4).should.eql(bufValue);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_plsqlbindtab where id = :i",
            [rowid],
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.rows[0].STR, "PL/SQL Binding INOUT Scalar");
              should.strictEqual(result.rows[0].NUM, 101);
              (result.rows[0].DAT).should.eql(daterun);
              (result.rows[0].BUF).should.eql(bufValue);
              cb();
            }
          );
        }
      ], done);

    }); // 70.9.1

    it('70.9.2 dir: BIND_INOUT, val: null', function(done) {

      var rowid = 2;
      var emptybuf;

      if ( nodever6 )
        emptybuf = new Buffer.alloc ( 0 ) ;
      else
        emptybuf = new Buffer ( 0 ) ;

      var bindVar = {
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

      async.series([
        function(cb) {
          connection.execute(
            sqlinout,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              should.strictEqual(result.outBinds.p_inout1, null);
              should.strictEqual(result.outBinds.p_inout2, null);
              should.strictEqual(result.outBinds.p_inout3, null);
              should.strictEqual(result.outBinds.p_inout4, null);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_plsqlbindtab where id = :i",
            [rowid],
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.rows[0].STR, null);
              should.strictEqual(result.rows[0].NUM, null);
              should.strictEqual(result.rows[0].DAT, null);
              should.strictEqual(result.rows[0].BUF, null);
              cb();
            }
          );
        }
      ], done);

    }); // 70.9.2

    it('70.9.3 dir: BIND_IN, val: null', function(done) {

      var rowid = 3;
      var emptybuf;

      if ( nodever6 )
        emptybuf = new Buffer.alloc ( 0 ) ;
      else
        emptybuf = new Buffer ( 0 ) ;

      var bindVar = {
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

      async.series([
        function(cb) {
          connection.execute(
            sqlin,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_plsqlbindtab where id = :i",
            [rowid],
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.rows[0].STR, null);
              should.strictEqual(result.rows[0].NUM, null);
              should.strictEqual(result.rows[0].DAT, null);
              should.strictEqual(result.rows[0].BUF, null);
              cb();
            }
          );
        }
      ], done);

    }); // 70.9.3

    it('70.9.4 dir: BIND_INOUT, val: undefined', function(done) {
      var rowid = 4;
      var emptybuf;

      if ( nodever6 )
        emptybuf = new Buffer.alloc ( 0 ) ;
      else
        emptybuf = new Buffer ( 0 ) ;

      var bindVar = {
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

      async.series([
        function(cb) {
          connection.execute(
            sqlinout,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              should.strictEqual(result.outBinds.p_inout1, null);
              should.strictEqual(result.outBinds.p_inout2, null);
              should.strictEqual(result.outBinds.p_inout3, null);
              should.strictEqual(result.outBinds.p_inout4, null);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_plsqlbindtab where id = :i",
            [rowid],
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.rows[0].STR, null);
              should.strictEqual(result.rows[0].NUM, null);
              should.strictEqual(result.rows[0].DAT, null);
              should.strictEqual(result.rows[0].BUF, null);
              cb();
            }
          );
        }
      ], done);
    }); // 70.9.4

    it('70.9.5 dir: BIND_IN, val: undefined', function(done) {

      var rowid = 5;
      var emptybuf;

      if ( nodever6 )
        emptybuf = new Buffer.alloc ( 0 ) ;
      else
        emptybuf = new Buffer ( 0 ) ;

      var bindVar = {
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

      async.series([
        function(cb) {
          connection.execute(
            sqlin,
            bindVar,
            function(err, result) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "select * from nodb_plsqlbindtab where id = :i",
            [rowid],
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.rows[0].STR, null);
              should.strictEqual(result.rows[0].NUM, null);
              should.strictEqual(result.rows[0].DAT, null);
              should.strictEqual(result.rows[0].BUF, null);
              cb();
            }
          );
        }
      ], done);

    }); // 70.9.5

  }); // 70.9

  describe('70.10 Check the bind-in values in PL/SQL', function() {

    it('70.10.1 STRING, basic', function(done) {

      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue1 (p_in IN OUT VARCHAR2) RETURN VARCHAR2 \n" +
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

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function theSame(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Shenzhen City'}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue1 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'the same');
              should.strictEqual(result.outBinds.p_in, 'Shenzhen City');
              cb();
            }
          );
        },
        function diff(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Shenzhen city'}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue1 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'different');
              should.strictEqual(result.outBinds.p_in, 'Shenzhen city');
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "drop function nodb_checkplsqlvalue1",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);

    }); // 70.10.1

    it('70.10.2 STRING, null, empty string, undefined', function(done) {
      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue2 (p_in IN OUT VARCHAR2) RETURN VARCHAR2 \n" +
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

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: null}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue2 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ''}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue2 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: undefined}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue2 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function wrong(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'foobar'}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue2 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'wrong');
              should.strictEqual(result.outBinds.p_in, 'foobar');
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "drop function nodb_checkplsqlvalue2",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.10.2

    it('70.10.3 NUMBER, null values', function(done) {

      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue3 (p_in IN OUT NUMBER) RETURN VARCHAR2 \n" +
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

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: null}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue3 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: undefined}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue3 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function wrong(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: 0}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue3 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'wrong');
              should.strictEqual(result.outBinds.p_in, 0);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "drop function nodb_checkplsqlvalue3",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);

    }); // 70.10.3

    it('70.10.4 DATE, null values', function(done) {

      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue4 (p_in IN OUT DATE) RETURN VARCHAR2 \n" +
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

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: null}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue4 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function diff(cb) {
          var today = new Date();
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: { type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: today }
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue4 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'wrong');
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.DATE, dir: oracledb.BIND_INOUT, val: undefined}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue4 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "drop function nodb_checkplsqlvalue4",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);

    }); // 70.10.4

    it('70.10.5 BUFFER', function(done) {
      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE FUNCTION nodb_checkplsqlvalue5 (p_in IN OUT RAW) RETURN VARCHAR2 \n" +
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

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: null}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue5 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: new Buffer('')}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue5 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function correct(cb) {
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: undefined}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue5 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'correct');
              should.strictEqual(result.outBinds.p_in, null);
              cb();
            }
          );
        },
        function wrong(cb) {

          var bufsize = 21;
          var bufValue = assist.createBuffer(bufsize);
          var bindVar = {
            output:   { type: oracledb.STRING, dir: oracledb.BIND_OUT },
            p_in: {type: oracledb.BUFFER, dir: oracledb.BIND_INOUT, val: bufValue}
          };
          connection.execute(
            "begin :output := nodb_checkplsqlvalue5 (:p_in); end;",
            bindVar,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              should.strictEqual(result.outBinds.output, 'wrong');
              (result.outBinds.p_in).should.eql(bufValue);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "drop function nodb_checkplsqlvalue5",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);
    }); // 70.10.5

  }); // 70.10

});
