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
 *   32. dataTypeDate.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - DATE.
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

describe('32. dataTypeDate.js', function() {
  
  if(dbConfig.externalAuth) {
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_date";

  beforeEach(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;

      var sqlCreate = assist.sqlCreateTable(tableName);
      connection.execute(
        sqlCreate,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    });
  })
  
  afterEach( function(done){
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
  })

  it('32.1 insert JavaScript Date data. Verify SELECT query, result set', function(done) {
    var dates = assist.data.dates;
    var numRows = 3;  // number of rows to return from each call to getRows()

    async.series([
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
      },
      function verifyDataJS(callback) {
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
          callback();
        });
      },
      function verifyRS(callback) {
        connection.execute(
          "SELECT * FROM " + tableName,
          [],
          { resultSet: true, outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.resultSet.metaData[0]).name.should.eql('NUM');
            (result.resultSet.metaData[1]).name.should.eql('CONTENT');
            fetchRowsFromRS(result.resultSet, dates, callback);
          }
        );
      }, 
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
            // fetchRowsFromRS()
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
  })
  
  it('32.2 insert Date data via SQL. Verify SELECT query, result set', function(done) {
    var dates = assist.DATE_STRINGS;
    
    async.series([
      function insertDataSQL(callback) {
        async.forEach(dates, function(date, cb) {
          var sql = "INSERT INTO " + tableName + " VALUES(:no, " + date + " )";
          // var bv  = array.indexOf(element) + dates.length;
          var bv  = dates.indexOf(date);
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
      function verifyDataSQL(callback) {
        async.forEach(dates, function(date, cb) {
          var bv = dates.indexOf(date);
          connection.execute(
            "SELECT content FROM " + tableName + " WHERE num = :no",
            { no: bv },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              (result.rows[0].CONTENT.toUTCString()).should.equal(assist.content.dates[bv]);
              cb();
            } 
          );
        }, function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function verifyRS(callback) {
        connection.execute(
          "SELECT * FROM " + tableName,
          [],
          { resultSet: true, outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.resultSet.metaData[0]).name.should.eql('NUM');
            (result.resultSet.metaData[1]).name.should.eql('CONTENT');
            var array = assist.content.dates;
            fetchOneRowFromRS(result.resultSet, array, callback);
          }
        );
      }
    ], done);

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
  })
  
  it.skip('32.3 stores null value correctly', function(done) {
    assist.nullValueSupport(connection, tableName, done);
  })   

  
})
