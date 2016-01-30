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
 *   43. PLSQLbinds.js
 *
 * DESCRIPTION
 *    Testing PL/SQL Array binds
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests 
 * 
 *****************************************************************************/var oracledb = require('oracledb');
var should = require('should');
var async = require('async');

var dbConfig = require('./dbConfig.js');

describe('43. PL/SQL binds', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  describe('43.1 binding PL/SQL indexed table', function() {
    var connection = null;

    before(function(done) {
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    })
  
    after(function(done) {
      connection.release( function(err) {
        if(err) { console.error(err.message); return; }
        done();
      });
    })

    it('43.1.1 binding PL/SQL indexed table IN', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE\n" +
                      "oracledb_testpack\n" +
                      "IS\n" +
                      "  TYPE stringsType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                      "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                      "  FUNCTION test(strings IN stringsType, numbers IN numbersType) RETURN VARCHAR2;\n" +
                      "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                     "oracledb_testpack\n" +
                     "IS\n" +
                     "  FUNCTION test(strings IN stringsType, numbers IN numbersType) RETURN VARCHAR2\n" +
                     "  IS\n" +
                     "    s VARCHAR2(2000) := '';\n" +
                     "  BEGIN\n" +
                     "    FOR i IN 1 .. strings.COUNT LOOP\n" +
                     "      s := s || NVL(strings(i), 'NULL');\n" +
                     "    END LOOP;\n" +
                     "    FOR i IN 1 .. numbers.COUNT LOOP\n" +
                     "       s := s || NVL(numbers(i), 0);\n" +
                     "    END LOOP;\n" +
                     "    RETURN s;\n" +
                     "  END;\n" +
                     "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var bindvars = {
            result: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000},
            strings:  {type: oracledb.STRING, dir: oracledb.BIND_IN, val: [null, 'John', 'Doe']},
            numbers: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [null, 8, 11]}
          };
          connection.execute(
            "BEGIN :result := oracledb_testpack.test(:strings, :numbers); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              result.outBinds.result.should.be.exactly('NULLJohnDoe0811');
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PACKAGE oracledb_testpack",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('43.1.2 binding PL/SQL indexed table IN OUT', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE\n" +
                      "oracledb_testpack\n" +
                      "IS\n" +
                      "  TYPE stringsType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                      "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                      "  PROCEDURE test(strings IN OUT NOCOPY stringsType, numbers IN OUT NOCOPY numbersType);\n" +
                      "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                     "oracledb_testpack\n" +
                     "IS\n" +
                     "  PROCEDURE test(strings IN OUT NOCOPY stringsType, numbers IN OUT NOCOPY numbersType)\n" +
                     "  IS\n" +
                     "  BEGIN\n" +
                     "    FOR i IN 1 .. strings.COUNT LOOP\n" +
                     "      strings(i) := '(' || strings(i) || ')';\n" +
                     "    END LOOP;\n" +
                     "    FOR i IN 1 .. numbers.COUNT LOOP\n" +
                     "      numbers(i) := numbers(i) * 10;\n" +
                     "    END LOOP;\n" +
                     "    numbers(numbers.COUNT + 1) := 4711;\n" +
                     "  END;\n" +
                     "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var bindvars = {
            strings:  {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: ['John', 'Doe'], maxArraySize: 2},
            numbers:  {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 4}
          };
          connection.execute(
            "BEGIN oracledb_testpack.test(:strings, :numbers); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              should.deepEqual(result.outBinds.strings, ['(John)', '(Doe)']);
              should.deepEqual(result.outBinds.numbers, [10, 20, 30, 4711]);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PACKAGE oracledb_testpack",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('43.1.3 binding PL/SQL indexed table OUT', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE\n" +
                      "oracledb_testpack\n" +
                      "IS\n" +
                      "  TYPE stringsType IS TABLE OF VARCHAR2(30) INDEX BY BINARY_INTEGER;\n" +
                      "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                      "  PROCEDURE test(items IN NUMBER, strings OUT NOCOPY stringsType, numbers OUT NOCOPY numbersType);\n" +
                      "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                     "oracledb_testpack\n" +
                     "IS\n" +
                     "  PROCEDURE test(items IN NUMBER, strings OUT NOCOPY stringsType, numbers OUT NOCOPY numbersType)\n" +
                     "  IS\n" +
                     "  BEGIN\n" +
                     "    FOR i IN 1 .. items LOOP\n" +
                     "      strings(i) := i;\n" +
                     "    END LOOP;\n" +
                     "    FOR i IN 1 .. items LOOP\n" +
                     "      numbers(i) := i;\n" +
                     "    END LOOP;\n" +
                     "  END;\n" +
                     "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var bindvars = {
            items: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 3},
            strings:  {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxArraySize: 3},
            numbers:  {type: oracledb.NUMBER, dir: oracledb.BIND_OUT, maxArraySize: 3}
          };
          connection.execute(
            "BEGIN oracledb_testpack.test(:items, :strings, :numbers); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              should.deepEqual(result.outBinds.strings, ['1', '2', '3']);
              should.deepEqual(result.outBinds.numbers, [1, 2, 3]);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PACKAGE oracledb_testpack",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    //
    //  Test exceptions when using PL/SQL indexed table bindings
    //
    it('43.1.4 binding PL/SQL indexed table exceptions', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE\n" +
                      "oracledb_testpack\n" +
                      "IS\n" +
                      "  TYPE datesType IS TABLE OF DATE INDEX BY BINARY_INTEGER;\n" +
                      "  TYPE numbersType IS TABLE OF NUMBER INDEX BY BINARY_INTEGER;\n" +
                      "  TYPE stringsType IS TABLE OF VARCHAR2(2000) INDEX BY BINARY_INTEGER;\n" +
                      "  PROCEDURE test1(p IN numbersType);\n" +
                      "  PROCEDURE test2(p IN OUT NOCOPY numbersType);\n" +
                      "  PROCEDURE test3(p IN datesType);\n" +
                      "  PROCEDURE test4(p IN stringsType);\n" +
                      "  PROCEDURE test5(p IN numbersType);\n" +
                      "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE BODY\n" +
                     "oracledb_testpack\n" +
                     "IS\n" +
                     "  PROCEDURE test1(p IN numbersType) IS BEGIN NULL; END;\n" +
                     "  PROCEDURE test2(p IN OUT NOCOPY numbersType) IS BEGIN NULL; END;\n" +
                     "  PROCEDURE test3(p IN datesType) IS BEGIN NULL; END;\n" +
                     "  PROCEDURE test4(p IN stringsType) IS BEGIN NULL; END;\n" +
                     "  PROCEDURE test5(p IN numbersType) IS BEGIN NULL; END;\n" +
                     "END;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        // EXCEPTION: NJS-036:
        function(callback) {
          var bindvars = {
            p:  {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3]}
          };
          connection.execute(
            "BEGIN oracledb_testpack.test2(:p); END;",
            bindvars,
            function(err, result) {
              should.exist(err);
              err.message.should.startWith('NJS-036:');
              should.not.exist(result);
              callback();
            }
          );
        },
        // EXCEPTION: NJS-036:
        function(callback) {
          var bindvars = {
            p:  {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: [1, 2, 3], maxArraySize: 2}
          };
          connection.execute(
            "BEGIN oracledb_testpack.test3(:p); END;",
            bindvars,
            function(err, result) {
              should.exist(err);
              err.message.should.startWith('NJS-036:');
              should.not.exist(result);
              callback();
            }
          );
        },
        // EXCEPTION: NJS-034: 
        function(callback) {
          var bindvars = {
            p:  {type: oracledb.DATE, dir: oracledb.BIND_IN, val: [new Date(), new Date()]}
          };
          connection.execute(
            "BEGIN oracledb_testpack.test3(:p); END;",
            bindvars,
            function(err, result) {
              should.exist(err);
              err.message.should.startWith('NJS-034:');
              should.not.exist(result);
              callback();
            }
          );
        },
        // EXCEPTION: NJS-037:
        function(callback) {
          var bindvars = {
            p:  {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ['hello', 1]}
          };
          connection.execute(
            "BEGIN oracledb_testpack.test4(:p); END;",
            bindvars,
            function(err, result) {
              should.exist(err);
              err.message.should.startWith('NJS-037:');
              should.not.exist(result);
              callback();
            }
          );
        },

        // EXCEPTION: NJS-037: 
        function(callback) {
          var bindvars = {
            p:  {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: [1, 'hello']}
          };
          connection.execute(
            "BEGIN oracledb_testpack.test5(:p); END;",
            bindvars,
            function(err, result) {
              should.exist(err);
              err.message.should.startWith('NJS-037:');
              should.not.exist(result);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PACKAGE oracledb_testpack",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

  });

  describe('43.2 binding PL/SQL scalar', function() {
    var connection = null;

    before(function(done) {
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        done();
      });
    })
  
    after(function(done) {
      connection.release( function(err) {
        if(err) { console.error(err.message); return; }
        done();
      });
    })

    it('43.2.1 binding PL/SQL scalar IN', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE\n" +
                     "FUNCTION test(stringValue IN VARCHAR2, numberValue IN NUMBER) RETURN VARCHAR2\n" +
                     "IS\n" +
                     "BEGIN\n" +
                     "  RETURN stringValue || ' ' || numberValue;\n" +
                     "END test;";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var bindvars = {
            result: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000},
            stringValue:  {type: oracledb.STRING, dir: oracledb.BIND_IN, val: 'Space odyssey'},
            numberValue: {type: oracledb.NUMBER, dir: oracledb.BIND_IN, val: 2001}
          };
          connection.execute(
            "BEGIN :result := test(:stringValue, :numberValue); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              result.outBinds.result.should.be.exactly('Space odyssey 2001');
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP FUNCTION test",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('43.2.2 binding PL/SQL scalar IN/OUT', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE\n" +
                     "PROCEDURE test(stringValue IN OUT NOCOPY VARCHAR2, numberValue IN OUT NOCOPY NUMBER)\n" +
                     "IS\n" +
                     "BEGIN\n" +
                     "  stringValue := '(' || stringValue || ')';\n" +
                     "  numberValue := NumberValue + 100;\n" +
                     "END test;\n";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var bindvars = {
            stringValue:  {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Space odyssey'},
            numberValue: {type: oracledb.NUMBER, dir: oracledb.BIND_INOUT, val: 2001}
          };
          connection.execute(
            "BEGIN test(:stringValue, :numberValue); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              result.outBinds.stringValue.should.be.exactly('(Space odyssey)');
              result.outBinds.numberValue.should.be.exactly(2101);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PROCEDURE test",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('43.2.2 binding PL/SQL scalar OUT', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE\n" +
                     "PROCEDURE test(stringValue IN OUT NOCOPY VARCHAR2, numberValue IN OUT NOCOPY NUMBER)\n" +
                     "IS\n" +
                     "BEGIN\n" +
                     "  stringValue := 'Space odyssey';\n" +
                     "  numberValue := 2001;\n" +
                     "END test;\n";
          connection.should.be.ok;
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          var bindvars = {
            stringValue:  {type: oracledb.STRING, dir: oracledb.BIND_OUT},
            numberValue: {type: oracledb.NUMBER, dir: oracledb.BIND_OUT}
          };
          connection.execute(
            "BEGIN test(:stringValue, :numberValue); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              result.outBinds.stringValue.should.be.exactly('Space odyssey');
              result.outBinds.numberValue.should.be.exactly(2001);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PROCEDURE test",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

  });

});
