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
 *   22. dataTypeChar.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - CHAR.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests 
 * 
 *****************************************************************************/
"use strict"

var oracledb = require('oracledb');
var should   = require('should');
var assist   = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');
var async    = require('async');

describe('22. dataTypeChar.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_char";

  var strLen = [100, 1000, 2000];  // char string length
  var strs = 
  [
    assist.createCharString(strLen[0]),
    assist.createCharString(strLen[1]),
    assist.createCharString(strLen[2]),
  ];

  before('get one connection', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  })
  
  after('release connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  })           

  describe('22.1 testing CHAR data in various lengths', function() {
    
    before('create table, insert data',function(done) {
      assist.setUp(connection, tableName, strs, done);
    })

    after(function(done) {
      connection.execute(
        "DROP table " + tableName,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    })

    it('22.1.1 works well with SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, strs, done);
    })

    it('22.1.2 works well with result set', function(done) {
      assist.verifyResultSet(connection, tableName, strs, done);
    })

    it('22.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, strs, done);
    })
  })

  describe('22.2 stores null value correctly', function() {
    it('22.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })

  describe('22.3 PL/SQL binding scalar', function() {

    it('22.3.1 PL/SQL binding scalar values IN', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE\n" +
                     "FUNCTION testchar(stringValue IN CHAR) RETURN CHAR\n" +
                     "IS\n" +
                     "BEGIN\n" +
                     "  RETURN 'Hello ' || stringValue || ' world!';\n" +
                     "END testchar;";
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
            result:      {type: oracledb.STRING, dir: oracledb.BIND_OUT},
            stringValue: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: 'Node.js'}
          };
          connection.execute(
            "BEGIN :result := testchar(:stringValue); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP FUNCTION testchar",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);  
    }) // 22.3.1

    it('22.3.2 bind scalar values INOUT', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE\n" +
                     "PROCEDURE test(stringValue IN OUT NOCOPY CHAR)\n" +
                     "IS\n" +
                     "BEGIN\n" +
                     "  stringValue := '(' || stringValue || ')';\n" +
                     "END test;\n";
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }, 
        function(callback) {
          var bindvars = { stringValue: {type: oracledb.STRING, dir: oracledb.BIND_INOUT, val: 'Node.js'} };
          connection.execute(
            "BEGIN test(:stringValue); END;",
            bindvars,
            function(err, result) {
              should.exist(err);
              // Error: ORA-06502: PL/SQL: numeric or value error: character string buffer too small
              // For SQL*PLUS driver, the behavior is the same
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
    }) // 22.3.2

    it('22.3.3 bind scalar values OUT', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE\n" +
                     "PROCEDURE test(stringValue OUT NOCOPY CHAR)\n" +
                     "IS\n" +
                     "BEGIN\n" +
                     "  stringValue := 'Hello Node.js World!';\n" +
                     "END test;\n";
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }, 
        function(callback) {
          var bindvars = { stringValue: {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:200} };
          connection.execute(
            "BEGIN test(:stringValue); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              // There are trailing spaces with the outBind value as CHAR is a kind of 
              // fix-size data type. So the case uses trim() function.
              (result.outBinds.stringValue.trim()).should.be.exactly('Hello Node.js World!');
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
    }) // 22.3.3
  }) // 22.3

  describe('22.4 PL/SQL binding indexed tables', function() {
    
    it.skip('22.4.1 bind indexed table IN', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PACKAGE\n" +
                      "oracledb_testpack\n" +
                      "IS\n" +
                      "  TYPE stringsType IS TABLE OF CHAR(30) INDEX BY BINARY_INTEGER;\n" +
                      "  FUNCTION test(strings IN stringsType) RETURN CHAR;\n" +
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
                     "  FUNCTION test(strings IN stringsType) RETURN CHAR\n" +
                     "  IS\n" +
                     "    s CHAR(2000) := '';\n" +
                     "  BEGIN\n" +
                     "    FOR i IN 1 .. strings.COUNT LOOP\n" +
                     "      s := s || strings(i);\n" +
                     "    END LOOP;\n" +
                     "    RETURN s;\n" +
                     "  END;\n" +
                     "END;";
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
            result:  {type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2000},
            strings: {type: oracledb.STRING, dir: oracledb.BIND_IN, val: ['John', 'Doe']}
          };
          connection.execute(
            "BEGIN :result := oracledb_testpack.test(:strings); END;",
            bindvars,
            function(err, result) {
              should.not.exist(err);
              console.log(result);
              //result.outBinds.result.should.be.exactly('JohnDoe');
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
    })
  })
})
