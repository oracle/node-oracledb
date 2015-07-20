/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   4. binding.js
 *
 * DESCRIPTION
 *   This suite tests the data binding, including:
 *     The cases uses PL/SQL to test in-bind, out-bind and in-out-bind.
 *     The cases take bind value in OBJECT and ARRAY formats.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests 
 * 
 *****************************************************************************/

var oracledb = require('oracledb');
var should = require('should');
var async = require('async');
var dbConfig = require('./dbConfig.js');

describe('4. binding.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  beforeEach(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;
      done();
    });
  })
  
  afterEach(function(done) {
    connection.release( function(err) {
      if(err) { console.error(err.message); return; }
      done();
    });
  })
  
  
  it('4.1 VARCHAR2 binding, Object & Array formats', function(done) {
    async.series([
      function(callback) {
        var proc = "CREATE OR REPLACE PROCEDURE oracledb_testproc (p_out OUT VARCHAR2) \
                    AS \
                    BEGIN \
                      p_out := 'abcdef'; \
                    END;";
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
        connection.execute(
          "BEGIN oracledb_testproc(:o); END;",
          {
            o: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.o.should.be.exactly('abcdef');
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "BEGIN oracledb_testproc(:o); END;",
          [
            { type: oracledb.STRING, dir: oracledb.BIND_OUT }
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.should.be.eql(['abcdef']);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PROCEDURE oracledb_testproc",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('4.2 NUMBER binding, Object & Array formats', function(done) {
    async.series([
      function(callback) {
        var proc = "CREATE OR REPLACE PROCEDURE oracledb_testproc (p_out OUT NUMBER) \
                    AS \
                    BEGIN \
                      p_out := 10010; \
                    END;";
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
        connection.execute(
          "BEGIN oracledb_testproc(:o); END;",
          {
            o: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.o.should.be.exactly(10010);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "BEGIN oracledb_testproc(:o); END;",
          [
            { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.should.be.eql([ 10010 ]);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PROCEDURE oracledb_testproc",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('4.3 Multiple binding values, Object & Array formats', function(done) {
    async.series([
      function(callback) {
        var proc = "CREATE OR REPLACE PROCEDURE oracledb_testproc (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER) \
                      AS \
                    BEGIN \
                      p_inout := p_in || ' ' || p_inout; \
                      p_out := 101; \
                    END; ";
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
        connection.execute(
          "BEGIN oracledb_testproc(:i, :io, :o); END;",
          {
            i:  'Alan',  // bind type is determined from the data type
            io: { val: 'Turing', dir : oracledb.BIND_INOUT },
            o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.io.should.be.exactly('Alan Turing');
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "BEGIN oracledb_testproc(:i, :io, :o); END;",
          [
            'Alan',  // bind type is determined from the data type
            { val: 'Turing', dir : oracledb.BIND_INOUT },
            { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.should.be.eql([ 'Alan Turing', 101 ]);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PROCEDURE oracledb_testproc",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('4.4 Multiple binding values, Change binding order', function(done) {
    async.series([
      function(callback) {
        var proc = "CREATE OR REPLACE PROCEDURE oracledb_testproc (p_inout IN OUT VARCHAR2, p_out OUT NUMBER, p_in IN VARCHAR2) \
                      AS \
                    BEGIN \
                      p_inout := p_in || ' ' || p_inout; \
                      p_out := 101; \
                    END; ";
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
        connection.execute(
          "BEGIN oracledb_testproc(:io, :o, :i); END;",
          {
            i:  'Alan',  // bind type is determined from the data type
            io: { val: 'Turing', dir : oracledb.BIND_INOUT },
            o:  { type: oracledb.NUMBER, dir : oracledb.BIND_OUT }
          },
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.io.should.be.exactly('Alan Turing');
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "BEGIN oracledb_testproc(:io, :o, :i); END;",
          [
            { val: 'Turing', dir : oracledb.BIND_INOUT },
            { type: oracledb.NUMBER, dir : oracledb.BIND_OUT },
            'Alan',  // bind type is determined from the data type
          ],
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.outBinds.should.be.eql([ 'Alan Turing', 101 ]);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PROCEDURE oracledb_testproc",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('4.5 outBind & maxSize restriction', function(done) {
    async.series([
      function(callback) {
        var proc = "CREATE OR REPLACE PROCEDURE oracledb_testproc (p_out OUT VARCHAR2) \
                    AS \
                    BEGIN \
                      p_out := 'ABCDEF'; \
                    END;";
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
        connection.execute(
          "BEGIN oracledb_testproc(:o); END;",
          {
            o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:2 }
          },
          function(err, result) {
            should.exist(err);
            // console.log(err.message);
            err.message.should.startWith('ORA-06502: PL/SQL: numeric or value error: character string buffer too small');
            // console.log(result);
            callback();
          }
        );
      }, 
      function(callback) {
        connection.execute(
          "BEGIN oracledb_testproc(:o); END;",
          [
            { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:3 }
          ],
          function(err, result) {
            should.exist(err);
            // console.log(err.message);
            err.message.should.startWith('ORA-06502: PL/SQL: numeric or value error: character string buffer too small');
            // console.log(result);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "DROP PROCEDURE oracledb_testproc",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })

})
