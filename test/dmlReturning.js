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
 *   6. dmlReturning.js
 *
 * DESCRIPTION
 *   Testing driver DML Returning feature.
 *   
 *   When DML affects multiple rows we can still use the RETURING INTO, 
 *   but now we must return the values into a collection using the 
 *   BULK COLLECT clause.
 *   
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

describe('6. dmlReturning.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  describe('6.1 NUMBER & STRING driver data type', function() {
    
    var connection = null;
    beforeEach('get connection and prepare table', function(done) {
      var makeTable = 
      "BEGIN \
            DECLARE \
                e_table_exists EXCEPTION; \
                PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
            BEGIN \
                EXECUTE IMMEDIATE ('DROP TABLE oracledb_dmlreturn'); \
            EXCEPTION \
                WHEN e_table_exists \
                THEN NULL; \
            END; \
            EXECUTE IMMEDIATE (' \
                CREATE TABLE oracledb_dmlreturn ( \
                    id NUMBER,  \
                    name VARCHAR2(4000) \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_dmlreturn  \
                   VALUES \
                   (1001,''Chris Jones'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_dmlreturn  \
                   VALUES \
                   (1002,''Tom Kyte'') \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_dmlreturn  \
                   VALUES \
                   (2001, ''Karen Morton'') \
            '); \
        END; ";
      oracledb.getConnection(credential, function(err, conn) {
        if(err) { console.error(err.message); return; }
        connection = conn;
        conn.execute(
          makeTable,
          function(err){
            if(err) { console.error(err.message); return; }
            done(); 
          }
        );
      });
    })
  
    afterEach('drop table and release connection', function(done) {
      connection.execute(
        "DROP TABLE oracledb_dmlreturn",
        function(err){
          if(err) { console.error(err.message); return; }
          connection.release( function(err){
            if(err) { console.error(err.message); return; }
            done();
          });
        }
      );
    })
      
    it('6.1.1 INSERT statement with Object binding', function(done) {
      connection.should.be.ok;
      connection.execute(
        "INSERT INTO oracledb_dmlreturn VALUES (1003, 'Robyn Sands') RETURNING id, name INTO :rid, :rname",
        {
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT} 
        },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.be.exactly(1);
          result.outBinds.rid.should.eql([1003]);
          result.outBinds.rname.should.eql(['Robyn Sands']);
          done();
        }
      );
    })
    
    it('6.1.2 INSERT statement with Array binding', function(done) {
      connection.should.be.ok;
      connection.execute(
        "INSERT INTO oracledb_dmlreturn VALUES (1003, 'Robyn Sands') RETURNING id, name INTO :rid, :rname",
        [
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT } 
        ],
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.be.exactly(1);
          result.outBinds[0].should.eql([1003]);
          result.outBinds[1].should.eql(['Robyn Sands']);
          done();
        }
      );
    })
    
    // it currently fails on OS X
    it.skip('6.1.3 INSERT statement with small maxSize restriction', function(done) {
      connection.should.be.ok;
      connection.execute(
        "INSERT INTO oracledb_dmlreturn VALUES (1003, 'Robyn Sands Delaware') RETURNING id, name INTO :rid, :rname",
        {
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 2 } 
        },
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          err.message.should.startWith('NJS-016'); // NJS-016: buffer is too small for OUT binds
          //console.log(result);
          done();
        }
      );
    })
    
    it('6.1.4 UPDATE statement with single row matched', function(done) {
      connection.should.be.ok;
      connection.execute(
        "UPDATE oracledb_dmlreturn SET name = :n WHERE id = :i RETURNING id, name INTO :rid, :rname",
        {
          n: "Kerry Osborne",
          i: 2001,
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.be.exactly(1);
          result.outBinds.rid.should.eql([2001]);
          result.outBinds.rname.should.eql(['Kerry Osborne']);
          done();
        }
      );
    })
    
    it('6.1.5 UPDATE statement with single row matched & Array binding', function(done) {
      connection.should.be.ok;
      connection.execute(
        "UPDATE oracledb_dmlreturn SET name = :n WHERE id = :i RETURNING id, name INTO :rid, :rname",
        [
          "Kerry Osborne",
          2001,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ],
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.be.exactly(1);
          result.outBinds[0].should.eql([2001]);
          result.outBinds[1].should.eql(['Kerry Osborne']);
          done();
        }
      );
    })
    
    it('6.1.6 UPDATE statements with multiple rows matched', function(done) {
      connection.should.be.ok;
      connection.execute(
        "UPDATE oracledb_dmlreturn SET id = :i RETURNING id, name INTO :rid, :rname",
        {
          i: 999,
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.be.exactly(3);
          result.outBinds.rid.should.eql([999, 999, 999]);
          result.outBinds.rname.should.eql([ 'Chris Jones', 'Tom Kyte', 'Karen Morton' ]);
          done();
        }
      );
    })
    
    it('6.1.7 UPDATE statements with multiple rows matched & Array binding', function(done) {
      connection.should.be.ok;
      connection.execute(
        "UPDATE oracledb_dmlreturn SET id = :i RETURNING id, name INTO :rid, :rname",
        [
          999,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ],
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.be.exactly(3);
          result.outBinds[0].should.eql([999, 999, 999]);
          result.outBinds[1].should.eql([ 'Chris Jones', 'Tom Kyte', 'Karen Morton' ]);
          done();
        }
      );
    })
    
    it('6.1.8 DELETE statement with Object binding', function(done){
      connection.should.be.ok;
      connection.execute(
        "DELETE FROM oracledb_dmlreturn WHERE name like '%Chris%' RETURNING id, name INTO :rid, :rname",
        {
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.exactly(1);
          result.outBinds.rid.should.eql([1001]);
          result.outBinds.rname.should.eql([ 'Chris Jones' ]);
          done();
        }
      );
    })
    
    it('6.1.9 DELETE statement with Array binding', function(done){
      connection.should.be.ok;
      connection.execute(
        "DELETE FROM oracledb_dmlreturn WHERE name like '%Chris%' RETURNING id, name INTO :rid, :rname",
        [
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        ],
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rowsAffected.should.exactly(1);
          result.outBinds[0].should.eql([1001]);
          result.outBinds[1].should.eql([ 'Chris Jones' ]);
          done();
        }
      );
    })
    
    // it currently fails with 11.2 database
    it('6.1.10 Stress test - support 4k varchars', function(done){
      
      /*** Helper functions ***/
      var makeString = function(size) {
        var buffer = new StringBuffer();
        for(var i = 0; i < size; i++) 
          buffer.append('A');
  
        return buffer.toString();
      }

      var StringBuffer = function() {
        this.buffer = [];
        this.index = 0;
      };

      StringBuffer.prototype = {
        append: function(s) {
          this.buffer[this.index] = s;
          this.index += 1; 
          return this;
        },
  
        toString: function() {
          return this.buffer.join("");
        }
      };
      /*** string length **/
      var size = 4000;
      
      connection.should.be.ok;
      connection.execute(
        "INSERT INTO oracledb_dmlreturn VALUES (:i, :n) RETURNING id, name INTO :rid, :rname",
        {
          i: size,
          n: makeString(size),
          rid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT},
          rname: { type: oracledb.STRING, dir: oracledb.BIND_OUT, maxSize: 4000} 
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.outBinds.rid.should.eql([size]);
          result.outBinds.rname[0].length.should.be.exactly(size);
          done();
        }
      );  
    })
    
    it('6.1.11 Negative test - wrong SQL got correct error thrown', function(done) {
      connection.should.be.ok;
      var wrongSQL = "UPDATE oracledb_dmlreturn SET doesnotexist = 'X' WHERE id = :id RETURNING name INTO :rn";
      
      connection.execute(
        wrongSQL,
        {
          id: 2001,
          rn: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
        },
        function(err, result) {
          should.exist(err);
          // console.log(err.message);
          (err.message).should.startWith('ORA-00904: ');
          should.not.exist(result);
          done();
        }
      );
    })

    it('6.1.12 Negative test - data type is not supported with DML Returning statments', function(done) {
      var sql = "UPDATE oracledb_dmlreturn SET name = 'Leslie Lin' WHERE id = :id RETURNING name INTO :rn ";
      var bindVar = 
        {
          id: 1002,
          rn: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT }
        };

      connection.execute(sql, bindVar, function(err, result) {
        should.exist(err);
        // NJS-028: raw database type is not supported with DML Returning statements
        (err.message).should.startWith('NJS-028: ');
        done();
      });

    })
   
  }) // 6.1 

  describe('6.2 DATE and TIMESTAMP data', function() {
    
    var connection = null;
    var tableName = "oracledb_date";
    var dates = assist.DATE_STRINGS;

    beforeEach('get connection, prepare table', function(done) {
      async.series([
        function(callback) {
          oracledb.getConnection(credential, function(err, conn) {
            should.not.exist(err);
            connection = conn;
            callback();
          });
        },
        function(callback) {
          assist.setUp4sql(connection, tableName, dates, callback);
        }
      ], done);
    }) // before
    
    afterEach('drop table, release connection', function(done) {
      async.series([
        function(callback) {
          connection.execute(
            "DROP table " + tableName,
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

    function runSQL(sql, bindVar, isSingleMatch, callback)
    {
      var beAffectedRows = (isSingleMatch ? 1 : dates.length);

      connection.execute(
        sql, 
        bindVar, 
        function(err, result) {
          should.not.exist(err);
          result.rowsAffected.should.be.exactly(beAffectedRows);
          // console.log(result);
          callback();
        }
      );
    } 

    it('6.2.1 INSERT statement, single row matched, Object binding, no bind in data', function(done) {
      var sql = "INSERT INTO " + tableName + " VALUES (50, TO_DATE('2015-01-11','YYYY-DD-MM')) RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        {
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      var isSingleMatch = true;

      runSQL(sql, bindVar, isSingleMatch, done);

    })
    
    it('6.2.2 INSERT statement with JavaScript date bind in ', function(done) {
      var sql = "INSERT INTO " + tableName + " VALUES (:no, :c) RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        {
          no: 51,
          c: new Date(2003, 09, 23, 11, 50, 30, 123),
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      var isSingleMatch = true;

      runSQL(sql, bindVar, isSingleMatch, done);

    })

    it('6.2.3 INSERT statement with Array binding', function(done) {
      var sql = "INSERT INTO " + tableName + " VALUES (50, TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123456 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')) RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        [
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        ];
      var isSingleMatch = true;

      runSQL(sql, bindVar, isSingleMatch, done);

    })

    it('6.2.4 UPDATE statement with single row matched', function(done) {
      var sql = "UPDATE " + tableName + " SET content = :c WHERE num = :n RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        {
          c: { type: oracledb.DATE, dir: oracledb.BIND_IN, val: new Date(2003, 09, 23, 11, 50, 30, 123) },
          n: 0,
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      var isSingleMatch = true;

      runSQL(sql, bindVar, isSingleMatch, done);

    })

    it('6.2.5 UPDATE statements with multiple rows matched, ARRAY binding format', function(done) {
      var sql = "UPDATE " + tableName + " SET content = :c WHERE num < :n RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        [
          { type: oracledb.DATE, dir: oracledb.BIND_IN, val: new Date(2003, 09, 23, 11, 50, 30, 123) },
          100,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        ];
      var isSingleMatch = false;

      runSQL(sql, bindVar, isSingleMatch, done);

    })

    it('6.2.6 UPDATE statements, multiple rows, TIMESTAMP data', function(done) {
      var sql = "UPDATE " + tableName + " SET content = TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123456 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM') " + 
        " WHERE num < :n RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        {
          n: 100,
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        }
      var isSingleMatch = false;

      runSQL(sql, bindVar, isSingleMatch, done);

    })
    
    it('6.2.7 DELETE statement, single row matched, Object binding format', function(done) {
      var sql = "DELETE FROM " + tableName + " WHERE num = :n RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        {
          n: 0,
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        };
      var isSingleMatch = true;

      runSQL(sql, bindVar, isSingleMatch, done);

    })

    it('6.2.8 DELETE statement, multiple rows matched, Array binding format', function(done) {
      var sql = "DELETE FROM " + tableName + " WHERE num >= :n RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        [
          0,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.DATE, dir: oracledb.BIND_OUT }
        ];
      var isSingleMatch = false;

      runSQL(sql, bindVar, isSingleMatch, done);
    })

    it('6.2.9 Negative test - bind value and type mismatch', function(done) {
      var wrongSQL = "UPDATE " + tableName + " SET content = :c WHERE num = :n RETURNING num, content INTO :rnum, :rcontent";
      var bindVar = 
        {
          n: 0,
          c: { type: oracledb.STRING, dir: oracledb.BIND_IN, val: new Date(2003, 09, 23, 11, 50, 30, 123) },
          rnum: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rcontent: { type: oracledb.DATE, dir: oracledb.BIND_OUT } 
        };
      
      connection.execute(
        wrongSQL,
        bindVar,
        function(err, result) {
          should.exist(err);
          // console.log(err.message);
          // NJS-011: encountered bind value and type mismatch 
          (err.message).should.startWith('NJS-011:');
          done();
        }
      );

    })

  }) // 6.2 

  describe('6.3 BULK COLLECT clause', function() {
    
    var connection = null;
    var tableName = "oracledb_varchar2";
    var dataLength = 500;
    var rows = [];
    for (var i = 0; i < dataLength; i++)
      rows[i] = "Row Number " + i;

    before(function(done) {
      async.series([
        function(cb) {
          oracledb.getConnection(credential, function(err, conn) {
            should.not.exist(err);
            connection = conn;
            cb();
          });
        },
        function insertRows(cb) {
          assist.setUp(connection, tableName, rows, cb);
        }
      ], done);
    }) // before

    after(function(done) {
      async.series([
        function(cb) {
          connection.execute(
            "DROP table " + tableName,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.release( function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }) // after

    /* Pending case*/
    it.skip('6.3.1 ', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        function(err, result) {
          //console.log(result); 
          console.log(result.rows.length);
          done();
        }
      );
    })
    
  }) // 6.3
})
