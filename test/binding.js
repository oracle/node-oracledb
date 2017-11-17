/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *     51 onwards are for other tests
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('4. binding.js', function() {

  describe('4.1 test STRING, NUMBER, ARRAY & JSON format', function() {

    var connection = null;
    before(function(done) {
      oracledb.getConnection(dbConfig, function(err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
      });
    });

    after(function(done) {
      connection.release( function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('4.1.1 VARCHAR2 binding, Object & Array formats', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc1 (p_out OUT VARCHAR2) \
                      AS \
                      BEGIN \
                        p_out := 'abcdef'; \
                      END;";
          connection.should.be.ok();
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
            "BEGIN nodb_bindproc1(:o); END;",
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
            "BEGIN nodb_bindproc1(:o); END;",
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
            "DROP PROCEDURE nodb_bindproc1",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('4.1.2 NUMBER binding, Object & Array formats', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc2 (p_out OUT NUMBER) \
                      AS \
                      BEGIN \
                        p_out := 10010; \
                      END;";
          connection.should.be.ok();
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
            "BEGIN nodb_bindproc2(:o); END;",
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
            "BEGIN nodb_bindproc2(:o); END;",
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
            "DROP PROCEDURE nodb_bindproc2",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    }); // 4.1.2

    it('4.1.3 Multiple binding values, Object & Array formats', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc3 (p_in IN VARCHAR2, p_inout IN OUT VARCHAR2, p_out OUT NUMBER) \
                        AS \
                      BEGIN \
                        p_inout := p_in || ' ' || p_inout; \
                        p_out := 101; \
                      END; ";
          connection.should.be.ok();
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
            "BEGIN nodb_bindproc3(:i, :io, :o); END;",
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
            "BEGIN nodb_bindproc3(:i, :io, :o); END;",
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
            "DROP PROCEDURE nodb_bindproc3",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('4.1.4 Multiple binding values, Change binding order', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc4 (p_inout IN OUT VARCHAR2, p_out OUT NUMBER, p_in IN VARCHAR2) \
                        AS \
                      BEGIN \
                        p_inout := p_in || ' ' || p_inout; \
                        p_out := 101; \
                      END; ";
          connection.should.be.ok();
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
            "BEGIN nodb_bindproc4(:io, :o, :i); END;",
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
            "BEGIN nodb_bindproc4(:io, :o, :i); END;",
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
            "DROP PROCEDURE nodb_bindproc4",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

    it('4.1.5 default bind type - STRING', function(done) {
      connection.should.be.ok();
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
          result.outBinds.n.should.be.a.String();
          result.outBinds.n.should.eql('1001');
          done();
        }
      );
    });

  });

  describe('4.2 mixing named with positional binding', function() {
    var connection = null;
    var createTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_binding1 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_binding1 ( \
                  id NUMBER(4),  \
                  name VARCHAR2(32) \
              ) \
          '); \
      END; ";
    var insert = 'insert into nodb_binding1 (id, name) values (:0, :1) returning id into :2';
    var param1 = [ 1, 'changjie', { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } ];
    var param2 = [ 2, 'changjie', { ignored_name: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } } ];
    var options = { autoCommit: true, outFormat: oracledb.OBJECT };

    beforeEach(function(done) {
      oracledb.getConnection(dbConfig, function(err, conn) {
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
    });

    afterEach(function(done) {
      connection.should.be.ok();
      connection.execute(
        "DROP TABLE nodb_binding1 PURGE",
        function(err) {
          should.not.exist(err);
          connection.release(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    });

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
            "SELECT * FROM nodb_binding1 ORDER BY id",
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
    });

    it('4.2.2 array binding with mixing JSON should throw an error', function(done) {
      connection.execute(
        insert,
        param2,
        options,
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-044');
          // NJS-044: named JSON object is not expected in this context

          should.not.exist(result);

          connection.execute(
            "SELECT * FROM nodb_binding1 ORDER BY id",
            [],
            options,
            function(err, result) {
              should.not.exist(err);
              (result.rows).should.be.eql([]);
              done();
            }
          );
        }
      );
    });

  });

  describe('4.3 insert with DATE column and DML returning', function() {
    var connection = null;
    var createTable =
      "BEGIN \
          DECLARE \
              e_table_missing EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE nodb_binding2 PURGE'); \
          EXCEPTION \
              WHEN e_table_missing \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE nodb_binding2 ( \
                  num NUMBER(4),  \
                  str VARCHAR2(32), \
                  dt DATE \
              ) \
          '); \
      END; ";

    beforeEach(function(done) {
      oracledb.getConnection(dbConfig, function(err, conn) {
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
    });

    afterEach(function(done) {
      connection.should.be.ok();
      connection.execute(
        "DROP TABLE nodb_binding2 PURGE",
        function(err) {
          should.not.exist(err);
          connection.release(function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    });

    var insert1 = 'insert into nodb_binding2 (num, str, dt) values (:0, :1, :2)';
    var insert2 = 'insert into nodb_binding2 (num, str, dt) values (:0, :1, :2) returning num into :3';
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
            "SELECT * FROM nodb_binding2 ORDER BY num",
            [],
            options,
            function(err) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    });

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
            "SELECT * FROM nodb_binding2 ORDER BY num",
            [],
            options,
            function(err) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    });

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
            "SELECT * FROM nodb_binding2 ORDER BY num",
            [],
            options,
            function(err) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    });

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
            "SELECT * FROM nodb_binding2 ORDER BY num",
            [],
            options,
            function(err) {
              should.not.exist(err);
              // console.log(result);
              done();
            }
          );
        }
      );
    });

  });

  describe('4.4 test maxSize option', function() {
    var connection = null;

    before(function(done) {
      oracledb.getConnection(dbConfig, function(err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
      });
    });

    after(function(done) {
      connection.release( function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('4.4.1 outBind & maxSize restriction', function(done) {
      async.series([
        function(callback) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_bindproc4 (p_out OUT VARCHAR2) \
                      AS \
                      BEGIN \
                        p_out := 'ABCDEF GHIJK LMNOP QRSTU'; \
                      END;";
          connection.should.be.ok();
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
            "BEGIN nodb_bindproc4(:o); END;",
            {
              o: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize:2 }
            },
            function(err, result) {
              should.exist(err);
              // console.log(err.message);
              err.message.should.startWith('ORA-06502:');  // ORA-06502: PL/SQL: numeric or value error: character string buffer too small
              // console.log(result);
              should.not.exist(result);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP PROCEDURE nodb_bindproc4",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });

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
    });

    it('4.4.3 Negative - bind out data exceeds default length', function(done) {
      connection.execute(
        "BEGIN :o := lpad('A',201,'x'); END;",
        { o: { type: oracledb.STRING, dir : oracledb.BIND_OUT } },
        function (err, result) {
          should.exist(err);
          // ORA-06502: PL/SQL: numeric or value error
          err.message.should.startWith('ORA-06502:');
          // console.log(result.outBinds.o.length);
          should.not.exist(result);
          done();
        }
      );
    });

    it('4.4.4 maximum value of maxSize option is 32767', function(done) {
      connection.execute(
        "BEGIN :o := lpad('A',32767,'x'); END;",
        { o: { type: oracledb.STRING, dir : oracledb.BIND_OUT, maxSize:50000 } },
        function(err, result) {
          should.not.exist(err);
          should.strictEqual(result.outBinds.o.length, 32767);
          done();
        }
      );
    });
  }); // 4.4

  describe('4.5 The default direction for binding is BIND_IN', function() {
    var connection = null;
    var tableName = "nodb_raw";

    before(function(done) {
      oracledb.getConnection(dbConfig, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        assist.createTable(connection, tableName, done);
      });
    });

    after(function(done) {
      async.series([
        function(callback) {
          connection.execute(
            "DROP TABLE " + tableName + " PURGE",
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
    });


    it('4.5.1 DML default bind',function(done) {
      connection.execute(
        "insert into nodb_raw (num) values (:id)",
        { id: { val: 1, type: oracledb.NUMBER } },
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });


    it('4.5.2 negative - DML invalid bind direction',function(done) {
      connection.execute(
        "insert into nodb_raw (num) values (:id)",
        { id: { val: 1, type: oracledb.NUMBER, dir : 0 } },
        function(err, result ) {
          should.exist(err);
          (err.message).should.startWith ( 'NJS-013' );
          should.not.exist ( result );
          done();
        }
      );
    });



  }); // 4.5

  describe('4.6 PL/SQL block with empty outBinds', function() {

    it('4.6.1 ', function(done) {

      var sql = "begin execute immediate 'drop table does_not_exist purge'; "
        + "exception when others then "
        + "if sqlcode <> -942 then "
        + "raise; "
        + "end if; end;";
      var binds = [];
      var options = {};

      oracledb.getConnection(
        dbConfig,
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

    });
  });

  // Test cases involving JSON value as input
  describe ('4.7 Value as JSON named/unamed test cases', function () {
    it ( '4.7.1 valid case when numeric values are passed as it is',
      function (done ) {
        var sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        var binds = [ 1, 456 ];

        oracledb.getConnection (
          dbConfig,
          function (err, connection ){

            should.not.exist ( err ) ;
            connection.execute (
              sql,
              binds,
              function ( err, result ) {
                (result.rows[0][0]).should.be.a.Date();
                should.not.exist ( err );
                done ();
              }
            );
          });
      });

    it ( '4.7.2 Valid values when one of the value is passed as JSON ',
      function (done ) {
        var sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        var binds = [ 1, { val : 456 } ];

        oracledb.getConnection (
          dbConfig,
          function (err, connection ){

            should.not.exist ( err ) ;
            connection.execute (
              sql,
              binds,
              function ( err, result ) {
                (result.rows[0][0]).should.be.a.Date();
                should.not.exist ( err );
                done ();
              } );
          });
      });

    it ( '4.7.3 Valid test case when one of the value is passed as JSON ',
      function (done ) {
        var sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        var binds = [ {val :  1}, 456 ];

        oracledb.getConnection (
          dbConfig,
          function (err, connection ){

            should.not.exist ( err ) ;
            connection.execute (
              sql,
              binds,
              function ( err, result ) {
                (result.rows[0][0]).should.be.a.Date();
                should.not.exist ( err );
                done ();
              } );
          });
      });

    it ( '4.7.4 Valid Test case when both values are passed as JSON',
      function (done ) {
        var sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        var binds = [ {val : 1}, {val : 456 } ];

        oracledb.getConnection (
          dbConfig,
          function (err, connection ){

            should.not.exist ( err ) ;
            connection.execute (
              sql,
              binds,
              function ( err, result ) {
                (result.rows[0][0]).should.be.a.Date();
                should.not.exist ( err );
                done ();
              } );
          });
      });

    it ( '4.7.5 Invalid Test case when value is passed as named JSON',
      function (done ) {
        var sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        var binds = [ {val : 1}, { c: {val : 456 } } ];

        oracledb.getConnection (
          dbConfig,
          function (err, connection ){
            should.not.exist ( err ) ;
            connection.execute (
              sql,
              binds,
              function ( err, result ) {
                should.exist ( err );
                (err.message).should.startWith ( 'NJS-044:');
                should.not.exist(result);
                done ();
              } );
          });
      });

    it ( '4.7.6 Invalid Test case when other-value is passed as named JSON',
      function (done ) {
        var sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        var binds = [ { b: {val : 1} }, {val : 456 } ];

        oracledb.getConnection (
          dbConfig,
          function (err, connection ){
            should.not.exist ( err ) ;
            connection.execute (
              sql,
              binds,
              function ( err, result ) {
                should.exist ( err );
                (err.message).should.startWith ( 'NJS-044:');
                should.not.exist(result);
                done ();
              } );
          });
      });

    it ( '4.7.7 Invalid Test case when all values is passed as named JSON',
      function (done ) {
        var sql = "SELECT SYSDATE FROM DUAL WHERE :b = 1 and :c = 456 ";
        var binds = [ { b: {val : 1} }, { c: {val : 456 } } ];

        oracledb.getConnection (
          dbConfig,
          function (err, connection ){
            should.not.exist ( err ) ;
            connection.execute (
              sql,
              binds,
              function ( err, result ) {
                should.exist ( err );
                (err.message).should.startWith ( 'NJS-044:');
                should.not.exist(result);
                done ();
              } );
          });
      }); // 4.7.7
  }); // 4.7

  describe('4.8 bind DATE', function() {

    var connection = null;
    before(function(done) {
      async.series([
        function(cb) {
          oracledb.getConnection(dbConfig, function(err, conn) {
            should.not.exist(err);
            connection = conn;
            cb();
          });
        },
        function(cb) {
          connection.execute(
            "alter session set time_zone='UTC'",
            function(err) {
              should.not.exist(err);
              cb();
            });
        }
      ],done);
    }); // before

    after(function(done) {
      connection.release(function(err) {
        should.not.exist(err);
        done();
      });
    }); // after

    it('4.8.1 binding out in Object & Array formats', function(done) {

      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_binddate1 ( \n" +
                     "    p_out1 OUT DATE, \n" +
                     "    p_out2 OUT DATE \n" +
                     ") \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_out1 := SYSDATE + 10; \n" +
                     "    p_out2 := TO_DATE('2016-08-05', 'YYYY-MM-DD'); \n" +
                     "END;";

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "BEGIN nodb_binddate1(:o1, :o2); END;",
            {
              o1: { type: oracledb.DATE, dir: oracledb.BIND_OUT },
              o2: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
            },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              (result.outBinds.o1).should.be.a.Date();

              var vdate = new Date( "2016-08-05T00:00:00.000Z" );
              (result.outBinds.o2).should.eql(vdate);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "BEGIN nodb_binddate1(:o1, :o2); END;",
            [
              { type: oracledb.DATE, dir: oracledb.BIND_OUT },
              { type: oracledb.DATE, dir: oracledb.BIND_OUT }
            ],
            function(err, result) {
              should.not.exist(err);
              (result.outBinds[0]).should.be.a.Date();

              var vdate = new Date( "2016-08-05T00:00:00.000Z" );
              (result.outBinds[1]).should.eql(vdate);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP PROCEDURE nodb_binddate1",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);

    }); // 4.8.1

    it('4.8.2 BIND_IN', function(done) {

      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_binddate2 ( \n" +
                     "    p_in IN DATE, \n" +
                     "    p_out OUT DATE \n" +
                     ") \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_out := p_in; \n" +
                     "END;";

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var vdate = new Date( Date.UTC( 2016, 7, 5 ) );
          connection.execute(
            "BEGIN nodb_binddate2(:i, :o); END;",
            {
              i: { type: oracledb.DATE, dir: oracledb.BIND_IN, val: vdate },
              o: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
            },
            function(err, result) {
              should.not.exist(err);
              var vdate = new Date( "2016-08-05T00:00:00.000Z" );
              (result.outBinds.o).should.eql(vdate);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP PROCEDURE nodb_binddate2",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);

    }); // 4.8.2

    it('4.8.3 BIND_INOUT', function(done) {

      async.series([
        function(cb) {
          var proc = "CREATE OR REPLACE PROCEDURE nodb_binddate3 ( \n" +
                     "    p_inout IN OUT DATE \n" +
                     ") \n" +
                     "AS \n" +
                     "BEGIN \n" +
                     "    p_inout := p_inout; \n" +
                     "END;";

          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var vdate = new Date( Date.UTC( 2016, 7, 5 ) );
          connection.execute(
            "BEGIN nodb_binddate3(:io); END;",
            {
              io: { val: vdate, dir : oracledb.BIND_INOUT, type: oracledb.DATE }
            },
            function(err, result) {
              should.not.exist(err);
              var vdate = new Date( "2016-08-05T00:00:00.000Z" );
              (result.outBinds.io).should.eql(vdate);
              cb();
            }
          );
        },
        function(cb) {
          connection.execute(
            "DROP PROCEDURE nodb_binddate3",
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }
      ], done);

    }); // 4.8.3

  }); // 4.8
});
