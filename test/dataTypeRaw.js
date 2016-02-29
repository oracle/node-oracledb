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
 *   42. dataTypeRaw.js
 *
 * DESCRIPTION
 *   Testing Oracle data type support - RAW.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests  
 * 
 *****************************************************************************/
"use strict";

var oracledb = require('oracledb');
var should = require('should');
var async = require('async');
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbconfig.js');

describe('42. dataTypeRaw.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_raw";

  var bufLen = [10 ,100, 1000, 2000]; // buffer length
  var bufs = [];
  for(var i = 0; i < bufLen.length; i++) 
    bufs[i] = assist.createBuffer(bufLen[i]);
  
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
  
  describe('42.1 testing RAW data in various lengths', function() {
    
    before('create table, insert data', function(done) {
      assist.setUp(connection, tableName, bufs, done);
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

    it('42.1.1 SELECT query', function(done) {
      assist.dataTypeSupport(connection, tableName, bufs, done);
    })

    it('42.1.2 resultSet stores RAW data correctly', function(done) {
      assist.verifyResultSet(connection, tableName, bufs, done);
    })

    it('42.1.3 works well with REF Cursor', function(done) {
      assist.verifyRefCursor(connection, tableName, bufs, done);
    })

    it('42.1.4 result set getRow() function works well with RAW', function(done) {
      
      var sql1 = "select dummy, HEXTORAW('0123456789ABCDEF0123456789ABCDEF') from dual";
      connection.execute(
        sql1,
        [], 
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          fetchOneRowFromRS(result.resultSet, done);
        }
      );

      function fetchOneRowFromRS(rs, cb)
      {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            fetchOneRowFromRS(rs, cb);
          } else {
            rs.close( function(err) {
              should.not.exist(err);
              cb();
            });
          }
        });
      }
    }) // 42.1.4

    it('42.1.5 a negative case which hits NJS-011 error', function(done) {
      connection.execute(
        "INSERT INTO " + tableName + " (content ) VALUES (:c)",
         { c : { val: 1234, type: oracledb.BUFFER, dir:oracledb.BIND_IN } },
         function(err, result) {
          should.exist(err);
          // NJS-011: encountered bind value and type mismatch 
          (err.message).should.startWith('NJS-011:');
          done();
         }
      );
    }) 

  })
  
  describe('42.2 stores null value correctly', function() {
    it('42.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })

  describe('42.3 DML Returning - Currently not support RAW', function() {
    
    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
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

    it('42.3.1 INSERT statement with Object binding', function(done) {
      var seq = 1;
      var size = 10;
      var bindValue = assist.createBuffer(size);
      
      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-028');
          // NJS-028: raw database type is not supported with DML Returning statements
          done();
        }
      );
    })  // 42.3.1

    it('42.3.2 INSERT statement with ARRAY binding', function(done) {
      var seq = 2;
      var size = 10;
      var bindValue = assist.createBuffer(size);

      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        [
          seq,
          { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        ],
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-028');
          done();
        }
      );
    }) // 42.3.2

    it('42.3.3 INSERT statement with exact maxSize restriction', function(done) {
      var seq = 3;
      var size = 100;
      var bindValue = assist.createBuffer(size);

      connection.execute(
        "INSERT INTO " + tableName + " VALUES (:n, :c) RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: size * 2 }  // should be size
        },
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-028');
          done();
        }
      );
    })

    it('42.3.4 UPDATE statement', function(done) {
      var seq = 2;
      var size = 10;
      var bindValue = assist.createBuffer(size);
 
      connection.execute(
        "UPDATE " + tableName + " SET content = :c WHERE num = :n RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          c   : { type: oracledb.BUFFER, val: bindValue, dir: oracledb.BIND_IN },
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-028');
          done();
        }
      );
    }) // 42.3.4

    it('42.3.6 DELETE statement with single row matching', function(done) {
      var seq = 1;

      connection.execute(
        "DELETE FROM " + tableName + " WHERE num = :1 RETURNING num, content INTO :2, :3",
        [
          seq,
          { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        ],
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-028');
          done();
        }
      );
    }) 

    it('42.3.7 DELETE statement with multiple rows matching', function(done) {
      var seq = 1;

      connection.execute(
        "DELETE FROM " + tableName + " WHERE num > :n RETURNING num, content INTO :rid, :rc",
        {
          n   : seq,
          rid : { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rc  : { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 2000 }
        },
        { autoCommit: true },
        function(err, result) {
          should.exist(err);
          (err.message).should.startWith('NJS-028');
          done();
        }
      );
    }) 

  }) // 42.3

  describe('42.4 in PL/SQL, the maximum size is 32767', function() {
    
    var proc = 
      "CREATE OR REPLACE PROCEDURE oracledb_testraw (p_in IN RAW, p_out OUT RAW) " +
      "AS " +
      "BEGIN " +
      "  p_out := p_in; " +
      "END; "; 

    before('create procedure', function(done) {
      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    })

    after(function(done) {
      connection.execute(
        "DROP PROCEDURE oracledb_testraw",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    })
   
    it('42.4.1 when data length is less than maxSize', function(done) {
      var size = 5;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN oracledb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 10}
        },
        function(err, result) {
          should.not.exist(err);

          ( Buffer.isBuffer(result.outBinds.o) ).should.equal(true, "Error: the bind out data is not a Buffer");
          (result.outBinds.o.length).should.be.exactly(size);
          done();
        }
      );
    })

    it('42.4.2 when data length is 32767', function(done) {
      var size = 32767;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN oracledb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32767}
        },
        function(err, result) {
          should.not.exist(err);

          ( Buffer.isBuffer(result.outBinds.o) ).should.equal(true, "Error: the bind out data is not a Buffer");
          (result.outBinds.o.length).should.be.exactly(size);
          done();
        }
      );
    })

    it('42.4.3 when data length greater than maxSize', function(done) {
      var size = 32800;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN oracledb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 32767}
        },
        function(err, result) {
          should.exist(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460');
          done();
        }
      );
    })

    it('42.4.4 when maxSize is greater than 32767', function(done) {
      var size = 32800;
      var buf = assist.createBuffer(size);

      connection.execute(
        "BEGIN oracledb_testraw(:i, :o); END;",
        {
          i: { type: oracledb.BUFFER, dir: oracledb.BIND_IN, val: buf },
          o: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT, maxSize: 40000}
        },
        function(err, result) {
          should.exist(err);
          // ORA-01460: unimplemented or unreasonable conversion requested
          (err.message).should.startWith('ORA-01460');
          done();
        }
      );
    })
  }) // 42.4

})
