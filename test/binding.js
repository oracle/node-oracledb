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
var dbConfig = require('./dbconfig.js');
var assist = require('./dataTypeAssist.js');

describe('4. binding.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  describe('4.1 test STRING, NUMBER, ARRAY & JSON format', function() {
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
    
    it('4.1.1 VARCHAR2 binding, Object & Array formats', function(done) {
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

    it('4.1.2 NUMBER binding, Object & Array formats', function(done) {
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

    it('4.1.3 Multiple binding values, Object & Array formats', function(done) {
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

    it('4.1.4 Multiple binding values, Change binding order', function(done) {
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

    it('4.1.5 default bind type - STRING', function(done) {
      connection.should.be.ok;
      var sql = "begin :n := 1001; end;";
      var bindVar = { n : { dir: oracledb.BIND_OUT } };  
      var options = { };
    
      connection.execute(
        sql, 
        bindVar,
        options,
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.outBinds.n.should.be.a.String;
          result.outBinds.n.should.eql('1001');
          done();
        }
      );      
    })

  })
  
  describe('4.2 mixing named with positional binding', function() {
    var connection = null;
    var createTable = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE oracledb_binding'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE oracledb_binding ( \
                  id NUMBER(4),  \
                  name VARCHAR2(32) \
              ) \
          '); \
      END; ";
    var insert = 'insert into oracledb_binding (id, name) values (:0, :1) returning id into :2';
    var param1 = [ 1, 'changjie', { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } ];
    var param2 = [ 2, 'changjie', { ignored_name: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } } ];
    var options = { autoCommit: true, outFormat: oracledb.OBJECT };

    beforeEach(function(done) {
      oracledb.getConnection(credential, function(err, conn) {
        should.not.exist(err);
        connection = conn;
        conn.execute(
          createTable,
          function(err) {
            should.not.exist(err);
            done();
          }
        );
      });
    })
  
    afterEach(function(done) {
      connection.should.be.ok;
      connection.execute(
        "DROP TABLE oracledb_binding",
        function(err) {
          should.not.exist(err);
          connection.release(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    })

    it('4.2.1 array binding is ok', function(done) {
      connection.execute(
        insert,
        param1,
        options,
        function(err, result) {
          should.not.exist(err);
          result.rowsAffected.should.be.exactly(1);
          result.outBinds[0].should.eql([1]);
          // console.log(result);
          connection.execute(
            "SELECT * FROM oracledb_binding",
            [],
            options,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              result.rows[0].ID.should.be.exactly(1);
              result.rows[0].NAME.should.eql('changjie');
              done();
            }
          );
        }
      );
    })

    it.skip('4.2.2 array binding with mixing JSON should throw an error', function(done) {
      connection.execute(
        insert,
        param2,
        options,
        function(err, result) {
          should.exist(err);  // pending to fix
          result.rowsAffected.should.be.exactly(1);
          //result.outBinds[0].should.eql([1]);
          //console.log(result);
          connection.execute(
            "SELECT * FROM oracledb_binding",
            [],
            options,
            function(err, result) {
              should.not.exist(err);
              //console.log(result);
              result.rows[0].ID.should.be.exactly(2);
              result.rows[0].NAME.should.eql('changjie');
              done();
            }
          );
        }
      );
    })
 
  })
  
  describe('4.3 insert with DATE column and DML returning', function(done) {
    var connection = null;
    var createTable = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE oracledb_binding'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE oracledb_binding ( \
                  num NUMBER(4),  \
                  str VARCHAR2(32), \
                  dt DATE \
              ) \
          '); \
      END; ";

    beforeEach(function(done) {
      oracledb.getConnection(credential, function(err, conn) {
        should.not.exist(err);
        connection = conn;
        conn.execute(
          createTable,
          function(err) {
            should.not.exist(err);
            done();
          }
        );
      });
    })
  
    afterEach(function(done) {
      connection.should.be.ok;
      connection.execute(
        "DROP TABLE oracledb_binding",
        function(err) {
          should.not.exist(err);
          connection.release(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    })

    var insert1 = 'insert into oracledb_binding (num, str, dt) values (:0, :1, :2)';
    var insert2 = 'insert into oracledb_binding (num, str, dt) values (:0, :1, :2) returning num into :3';
    var param1 = { 0: 123, 1: 'str', 2: new Date() }; 
    var param2 = { 0: 123, 1: 'str', 2: new Date(), 3: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } };
    var param3 = [ 123, 'str', new Date() ];
    var param4 = [ 123, 'str', new Date(), { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } ];

    var options = { autoCommit: true };
 
    it('4.3.1 passes in object syntax without returning into', function(done) {
      connection.execute(
        insert1,
        param1,
        options,
        function(err, result) {
          should.not.exist(err); 
          result.rowsAffected.should.be.exactly(1);
          connection.execute(
            "SELECT * FROM oracledb_binding",
            [],
            options,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    })

    it('4.3.2 passes in object syntax with returning into', function(done) {
      connection.execute(
        insert2,
        param2,
        options,
        function(err, result) {
          should.not.exist(err); 
          result.rowsAffected.should.be.exactly(1);
          //console.log(result);
          result.outBinds.should.eql({ '3': [123] });
          connection.execute(
            "SELECT * FROM oracledb_binding",
            [],
            options,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    })

    it('4.3.3 passes in array syntax without returning into', function(done) {
      connection.execute(
        insert1,
        param3,
        options,
        function(err, result) {
          should.not.exist(err); 
          result.rowsAffected.should.be.exactly(1);
          // console.log(result);
          connection.execute(
            "SELECT * FROM oracledb_binding",
            [],
            options,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    })

    it ('4.3.4 should pass but fail in array syntax with returning into', function(done) {
      connection.execute(
        insert2,
        param4,
        options,
        function(err, result) {
          should.not.exist(err);  
          result.rowsAffected.should.be.exactly(1);
          // console.log(result);
          result.outBinds[0].should.eql([123]);
          connection.execute(
            "SELECT * FROM oracledb_binding",
            [],
            options,
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    })

  })
  
  describe('4.4 test maxSize option', function() {
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

    it('4.4.1 outBind & maxSize restriction', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PROCEDURE oracledb_testproc (p_out OUT VARCHAR2) \
                      AS \
                      BEGIN \
                        p_out := 'ABCDEF GHIJK LMNOP QRSTU'; \
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
              err.message.should.startWith('ORA-06502:');  // ORA-06502: PL/SQL: numeric or value error: character string buffer too small
              // console.log(result);
              callback();
            }
          );
        }, 
        function(callback) {
          connection.execute(
            "BEGIN oracledb_testproc(:o); END;",
            [
              { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:22 }
            ],
            function(err, result) {
              should.exist(err);
              // console.log(err.message);
              err.message.should.startWith('ORA-06502:');
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

    it('4.4.2 default value is 200', function(done) {
      connection.execute(
        "BEGIN :o := lpad('A', 200, 'x'); END;",
        { o: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
        function(err, result) {
          should.not.exist(err);
          (result.outBinds.o.length).should.be.exactly(200);
          done();
        }
      );
    })

    it('4.4.3 Negative - bind out data exceeds default length', function(done) {
      connection.execute(
        "BEGIN :o := lpad('A',201,'x'); END;", 
         { o: { type: oracledb.STRING, dir : oracledb.BIND_OUT } }, 
         function (err, result) { 
           should.exist(err);
           // ORA-06502: PL/SQL: numeric or value error
           err.message.should.startWith('ORA-06502:');
           // console.log(result.outBinds.o.length); 
           done();
         }
      );
    })

    it.skip('4.4.4 maximum value is 32767', function(done) {
      connection.execute(
        "BEGIN :o := lpad('A',32767,'x'); END;", 
        { o: { type: oracledb.STRING, dir : oracledb.BIND_OUT, maxSize:50000 } },
        function(err, result) {
          should.exist(err);
          done();
        }
      );
    })
  }) // 4.4 

  describe('4.5 The default direction for binding is BIND_IN', function() {
    var connection = null;
    var tableName = "oracledb_raw";

    before(function(done) {
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        assist.createTable(connection, tableName, done);
      });
    })
  
    after(function(done) {
      async.series([
        function(callback) {
          connection.execute(
            "DROP TABLE " + tableName,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.release( function(err) {
            should.not.exist(err);
            callback();
          });
        }
      ], done);
    })

    
    it('4.5.1 ',function(done) {
      connection.execute(
        "insert into oracledb_raw (num) values (:id)",
        { id: { val: 1, type: oracledb.NUMBER } },  // fails with error  NJS-013: invalid bind direction
        // { id: { val: 1, type: oracledb.NUMBER, dir: oracledb.BIND_IN } }, // works
        function(err, result) {
          should.not.exist(err);
          done();
        }
      );
    })
  }) // 4.5

  describe('4.6 PL/SQL block with empty outBinds', function() {

    it('4.6.1 ', function(done) {
      
      var sql = "begin execute immediate 'drop table does_not_exist'; " 
        + "exception when others then " 
        + "if sqlcode <> -942 then " 
        + "raise; " 
        + "end if; end;"; 
      var binds = []; 
      var options = {}; 

      oracledb.getConnection(
        credential,
        function(err, connection)
        {
          should.not.exist(err);
          connection.execute(
            sql, 
            binds, 
            options,
            function(err, result) 
            {
              should.not.exist(err);
              result.should.eql(
                { rowsAffected: undefined,
                  outBinds: undefined,
                  rows: undefined,
                  metaData: undefined }
              );
              done();
            }
          );
        }
      );

    })
  })
})
