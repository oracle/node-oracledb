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
 *   33. dataTypeTimestamp1.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - TIMESTAMP.
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
var assist = require('./dataTypeAssist.js');
var dbConfig = require('./dbConfig.js');

describe('33. dataTypeTimestamp1.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_timestamp1";
  // var dates = assist.data.dates;
      
  /*before(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;

      var sqlCreate = assist.sqlCreateTable(tableName);
      assist.setup(connection, tableName, sqlCreate, dates, done);
    });
  })
  
  after( function(done){
    connection.execute(
      "DROP table " + tableName,
      function(err) {
        if(err) { console.error(err.message); return; }
        connection.release( function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      }
    );
  })*/
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

  describe('33.1 Insert JavaScript Date data', function() {
    var dates = assist.data.dates;
    var numRows = 3;  // number of rows to return from each call to getRows()
    
    before(function(done) {
      async.series([
        function createTable(callback) {
          var sqlCreate = assist.sqlCreateTable(tableName);
          connection.execute(
            sqlCreate,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }, 
        function insertDataJS(callback) {
          async.forEach(dates, function(date, cb) {
            connection.execute(
              "INSERT INTO " + tableName + " VALUES(:no, :bindValue)",
              { no: dates.indexOf(date), bindValue: date },
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          }, function(err) {
            should.not.exist(err);
            callback();
          });
        }
      ], done);
    }) // before

    after(function(done) {
      connection.execute(
        "DROP table " + tableName,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }) // after
    
    it('33.1.1 works well with SELECT query', function(done) {
      async.forEach(dates, function(date, cb) {
        var bv  = dates.indexOf(date);

        connection.execute(
          "SELECT content FROM " + tableName + " WHERE num = :no",
          { no: bv },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].CONTENT.toUTCString().should.eql(dates[bv].toUTCString());
            cb();
          }
        );
      }, function(err) {
        should.not.exist(err);
        done();
      });
    }) // 33.1.1

    it('33.1.2 works well with result set', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          (result.resultSet.metaData[0]).name.should.eql('NUM');
          (result.resultSet.metaData[1]).name.should.eql('CONTENT');
          fetchRowsFromRS(result.resultSet, dates, done);
        }
      );
    }) // 33.1.2
    
    it.skip('33.1.3 works well with REF Cursor', function(done) {
      async.series([
        function createProcedure(callback) {
          var proc = assist.sqlCreateProcedure(tableName);
          connection.execute(
            proc,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function verifyRefCursor(callback) {
          connection.execute(
            "BEGIN testproc(:o); END;",
            [
              { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            ],
            function(err, result) {
              should.not.exist(err);
              console.log(result.outBinds.o);
              callback();
              // fetchRowsFromRS(result.outBinds.o, dates, callback);
            }
          );
        },
        function dropProcedure(callback) {
          connection.execute(
            "DROP PROCEDURE testproc",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    }) // 33.1.3

    function fetchRowsFromRS(rs, array, cb) 
    {
      rs.getRows(numRows, function(err, rows) {
        should.not.exist(err);
        if(rows.length > 0) {
          for(var i = 0; i < rows.length; i++) {
            (rows[i].CONTENT.toUTCString()).should.eql(array[ (rows[i].NUM) ].toUTCString());
            return fetchRowsFromRS(rs, array, cb);
          } 
        } else {
          rs.close( function(err) {
            should.not.exist(err);
            cb();
          });
        } 
      });
    }
  }) // end of 33.1 suite

  describe('33.2 insert SQL TIMESTAMP data', function() {
    var timestamps = assist.TIMESTAMP_STRINGS;

    before(function(done) {
      async.series([
        function createTable(callback) {
          var sqlCreate = assist.sqlCreateTable(tableName);
          connection.execute(
            sqlCreate,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }, 
        function insertDataSQL(callback) {
          async.forEach(timestamps, function(timestamp, cb) {
            var sql = "INSERT INTO " + tableName + " VALUES(:no, " + timestamp + " )";
            var bv  = timestamps.indexOf(timestamp);

            connection.execute(
              sql,
              { no: bv },
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          }, function(err) {
            should.not.exist(err);
            callback();
          });
        } 
      ], done);
    }) // before

    after(function(done) {
      connection.execute(
        "DROP table " + tableName,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }) // after

    it('33.2.1 works well with SELECT query', function(done) {
      async.forEach(timestamps, function(timestamp, cb) {
        var bv = timestamps.indexOf(timestamp);
        connection.execute(
          "SELECT content FROM " + tableName + " WHERE num = :no",
          { no: bv },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows[0].CONTENT.toUTCString()).should.equal(assist.content.timestamps[bv]);
            cb();
          } 
        );
      }, function(err) {
          should.not.exist(err);
          done();
      });
    }) // 33.2.1

    it('33.2.2 works well with result set', function(done) {
      connection.execute(
        "SELECT * FROM " + tableName,
        [],
        { resultSet: true, outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          (result.resultSet.metaData[0]).name.should.eql('NUM');
          (result.resultSet.metaData[1]).name.should.eql('CONTENT');
          var array = assist.content.timestamps;
          fetchOneRowFromRS(result.resultSet, array, done);
        }
      );
    }) // 33.2.2

    function fetchOneRowFromRS(rs, array, cb) 
    {
      rs.getRow( function(err, row) {
        should.not.exist(err);
        if(row) {
          (row.CONTENT.toUTCString()).should.eql(array[row.NUM]);
          return fetchOneRowFromRS(rs, array, cb);     
        } else {
          rs.close( function(err) {
            should.not.exist(err);
            cb();
          });
        } 
      });
    }

  }) // end of 33.2 suite
  
  /*it('33.1 supports TIMESTAMP data type', function(done) {
    assist.dataTypeSupport(connection, tableName, dates, done);
  })
  
  it('33.2 resultSet stores TIMESTAMP data correctly', function(done) {
    assist.resultSetSupport(connection, tableName, dates, done);
  })
  
  it('33.3 stores null value correctly', function(done) {
    assist.nullValueSupport(connection, tableName, done);
  }) 

  it('33.4 inserts TIMESTAMP data via sql', function(done) {
    var array = assist.TIMESTAMP_STRINGS;

    async.series([
      function insertData(callback) {
        async.forEach(array, function(element, cb) {
          var sql = "INSERT INTO " + tableName + " VALUES(:no, " + element + " )";
          var bv  = array.indexOf(element) + dates.length;
          connection.execute(
            sql,
            { no: bv },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        }, function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function verifyData(callback) {
        async.forEach(array, function(element, cb) {
          var bv  = array.indexOf(element) + dates.length;
          connection.execute(
            "SELECT * FROM " + tableName + " WHERE num = :no",
            { no: bv },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              //console.log(bv - dates.length);
              //console.log(result.rows[0].CONTENT.toUTCString());
              //console.log(assist.content.timestamps[bv - dates.length]);
              (result.rows[0].CONTENT.toUTCString()).should.equal(assist.content.timestamps[bv - dates.length]);
              cb();
            } 
          );
        }, function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  })*/
})
