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
 *   12. resultSet1.js
 *
 * DESCRIPTION
 *   Testing driver resultSet feature.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests 
 * 
 *****************************************************************************/
 
var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('12. resultSet1.js', function() {
  var connection = false;
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var createTable = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE oracledb_employees'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE oracledb_employees ( \
                  employees_id NUMBER,  \
                  employees_name VARCHAR2(20) \
              ) \
          '); \
      END; ";
      
  var insertRows = 
      "DECLARE \
          x NUMBER := 0; \
          n VARCHAR2(20); \
       BEGIN \
          FOR i IN 1..217 LOOP \
             x := x + 1; \
             n := 'staff ' || x; \
             INSERT INTO oracledb_employees VALUES (x, n); \
          END LOOP; \
       END; ";
  var rowsAmount = 217;
  
  before(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;
      connection.execute(createTable, function(err) {
        if(err) { console.error(err.message); return; }
        connection.execute(insertRows, function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      });
    });
  })
  
  after(function(done) {
    connection.execute(
      'DROP TABLE oracledb_employees',
      function(err) {
        if(err) { console.error(err.message); return; }
        connection.release(function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      }
    );
  })
  
  describe('12.1 Testing resultSet option', function() {
    it('12.1.1 when resultSet option = false, content of result is correct', function(done) {
      connection.should.be.ok;

      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: false, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
     
          should.exist(result.rows);
          result.rows.length.should.be.exactly(rowsAmount);
          // console.log(result.rows);
          should.not.exist(result.resultSet);       
          done();
        }
      );
    })
   
    it('12.1.2 when resultSet option = true, content of result is correct', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.not.exist(result.rows);
          should.exist(result.resultSet);       
          done();
        }
      );
    })
    
    it('12.1.3 when resultSet option = 0, it behaves like false', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: 0, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.exist(result.rows);
          result.rows.length.should.be.exactly(rowsAmount);
          // console.log(result.rows);
          should.not.exist(result.resultSet);       
          done();
        }
      );
    })
    
    it('12.1.4 when resultSet option = null, it behaves like false',function(done) {
      connection.should.be.ok;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: null, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.exist(result.rows);
          result.rows.length.should.be.exactly(rowsAmount);
          should.not.exist(result.resultSet);       
          done();
        }
      );
    })
    
    it('12.1.5 when resultSet option = undefined, it behaves like false', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: undefined, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.exist(result.rows);
          result.rows.length.should.be.exactly(rowsAmount);
          should.not.exist(result.resultSet);       
          done();
        }
      );
    })
    
    it('12.1.6 when resultSet option = NaN, it behaves like false', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: NaN, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.exist(result.rows);
          result.rows.length.should.be.exactly(rowsAmount);
          should.not.exist(result.resultSet);       
          done();
        }
      );
    })
    
    it('12.1.7 when resultSet option = 1, it behaves like true', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: 1, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.not.exist(result.rows);
          should.exist(result.resultSet);       
          done();
        }
      );
    })
    
    it('12.1.8 when resultSet option = -1, it behaves like true', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: -1, prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.not.exist(result.rows);
          should.exist(result.resultSet);       
          done();
        }
      );
    })
    
    it('12.1.9 when resultSet option is a random string, it behaves like true', function(done) {
      connection.should.be.ok;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: 'foo', prefetchRows: 100, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          should.not.exist(result.rows);
          should.exist(result.resultSet);       
          done();
        }
      );
    })
    
  })
  
  describe('12.2 Testing prefetchRows option', function(done) {
    it('12.2.1 cannot set prefetchRows to be a negative value', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: -10, maxRows: 1000 },
        function(err, result) {
          should.exist(err);
          err.message.should.startWith('NJS-007: invalid value for "prefetchRows"');        
          done();
        }
      );
    })
    
    it('12.2.2 cannot set prefetchRows to be a random string', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 'bar', maxRows: 1000 },
        function(err, result) {
          should.exist(err);
          err.message.should.startWith('NJS-008: invalid type for "prefetchRows"'); 
          done();
        }
      );
    })
    
    it('12.2.3 cannot set prefetchRows to be NaN', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: NaN, maxRows: 1000 },
        function(err, result) {
          should.exist(err);
          err.message.should.startWith('NJS-007: invalid value for "prefetchRows"');    
          done();
        }
      );
    })
    
    it('12.2.4 cannot set prefetchRows to be null', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: null, maxRows: 1000 },
        function(err, result) {
          should.exist(err);
          // console.log(result);
          done();
        }
      );
    })
    
    it('12.2.5 prefetchRows can be set to 0', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 0, maxRows: 1000 },  
        function(err, result) {
          should.not.exist(err);
          done();
        }
      );
    })
    
  })

  describe('12.3 Testing function getRows()', function() {
    it('12.3.1 retrieved set is exactly the size of result', function(done) {
      connection.should.be.ok;
      var nRows = rowsAmount;
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(1);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.2 retrieved set is greater than the size of result', function(done) {
      connection.should.be.ok;
      var nRows = rowsAmount * 2;
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(1);
              done();
            });
          }  
        });
      }
    })

    it('12.3.3 retrieved set is half of the size of result', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/2);
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(2);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.4 retrieved set is one tenth of the size of the result', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(10);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.5 data in resultSet is array when setting outFormat ARRAY', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100, outFormat: oracledb.ARRAY },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            for(var i = 0; i < rows.length; i++)
              (rows[i]).should.be.an.Array; 
            
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(10);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.6 data in resultSet is object when setting outFormat OBJECT', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100, outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            for(var i = 0; i < rows.length; i++)
              (rows[i]).should.be.an.Object; 
            
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(10);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.7 the size of retrieved set can be set to 1', function(done) {
      connection.should.be.ok;
      var nRows = 1;
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(rowsAmount);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.8 query 0 row', function(done) {
      connection.should.be.ok;
      var nRows = 5;
      var accessCount = 0;
      connection.execute(
        "SELECT employees_name FROM oracledb_employees WHERE employees_id > 300",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          fetchRowsFromRS(result.resultSet);
        }
      );
      
      function fetchRowsFromRS(rs, numRows) {
        rs.getRow(function(err, rows) {
          should.not.exist(err);
          if(rows) {
            accessCount++;
            row[0].should.eql('staff ' + accessCount);
            row.should.be.an.Array;
            return fetchRowsFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(0);
              done();
            });
          }  
        });
      }
    })

    it('12.3.9 Negative - To omit the first parameter', function(done) {
      connection.should.be.ok;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet);
        }
      );
      
      function fetchRowFromRS(rs) {
        rs.getRows(function(err, rows) {
          should.exist(err);
          err.message.should.eql('NJS-009: invalid number of parameters');
          should.not.exist(rows);  
          rs.close(function(err) {
            should.not.exist(err);
            done();
          });       
        });
      }
    })
    
    it('12.3.10 Negative - set the 1st parameter of getRows() to be 0', function(done) {
      connection.should.be.ok;
      var nRows = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.exist(err);
          err.message.should.eql('NJS-005: invalid value for parameter 1');
          rs.close(function(err) {
            should.not.exist(err);
            done();
          });
        });
      }
    })
    
    it('12.3.11 Negative - set the 1st parameter of getRows() to be -5', function(done) {
      connection.should.be.ok;
      var nRows = -5;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.exist(err);
          err.message.should.startWith('NJS-006: invalid type for parameter 1');
          rs.close(function(err) {
            should.not.exist(err);
            done();
          }); 
        });
      }
    })
    
    it('12.3.12 Negative - set the 1st parameter of getRows() to be null', function(done) {
      connection.should.be.ok;
      var nRows = null;  // setting to 'undefined' is the same
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.exist(err);
          err.message.should.startWith('NJS-006: invalid type for parameter 1');
          rs.close(function(err) {
            should.not.exist(err);
            done();
          });  
        });
      }
    })
  }) 
  
  describe('12.4 Testing function getRow()', function() {
    it('12.4.1 works well with all correct setting', function(done) {
      connection.should.be.ok;
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet);
        }
      );
      
      function fetchRowFromRS(rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          
          if(row) {
            accessCount++;
            row[0].should.eql('staff ' + accessCount);
            return fetchRowFromRS(rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(rowsAmount);
              done();
            });
          }  
        });
      }
    })
    
    it('12.4.2 data in resultSet is array when setting outFormat ARRAY', function(done) {
      connection.should.be.ok;
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100, outFormat: oracledb.ARRAY },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet);
        }
      );
      
      function fetchRowFromRS(rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          
          if(row) {
            accessCount++;
            row[0].should.eql('staff ' + accessCount);
            row.should.be.an.Array;
            return fetchRowFromRS(rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(rowsAmount);
              done();
            });
          }  
        });
      }
    })
    
    it('12.4.3 data in resultSet is object when setting outFormat OBJECT', function(done) {
      connection.should.be.ok;
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100, outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet);
        }
      );
      
      function fetchRowFromRS(rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          
          if(row) {
            accessCount++;
            row.EMPLOYEES_NAME.should.eql('staff ' + accessCount);
            row.should.be.an.Object;
            return fetchRowFromRS(rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(rowsAmount);
              done();
            });
          }  
        });
      }
    })
    
    it('12.4.4 query 0 row', function(done) {
      connection.should.be.ok;
      var accessCount = 0;
      connection.execute(
        "SELECT employees_name FROM oracledb_employees WHERE employees_id > 300",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet);
        }
      );
      
      function fetchRowFromRS(rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            accessCount++;
            row[0].should.eql('staff ' + accessCount);
            row.should.be.an.Array;
            return fetchRowFromRS(rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(0);
              done();
            });
          }  
        });
      }
    })
    
    it('12.4.5 Negative - set the first parameter like getRows()', function(done){
      connection.should.be.ok;
      var nRows = 2;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRow(numRows, function(err, row) {
          should.exist(err);
          err.message.should.eql('NJS-009: invalid number of parameters');
          should.not.exist(row);
          rs.close(function(err) {
            should.not.exist(err);
            done();
          }); 
        });
      }
    })
    
  })
  
  describe('12.5 Testing function close()', function() {
    it('12.5.1 does not call close()', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            accessCount.should.be.exactly(10);
            done();
          }  
        });
      }
    })
    
    it('12.5.2 invokes close() twice', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(10);
              rs.close(function(err) {
                should.exist(err);
                err.message.should.eql("NJS-018: invalid result set");
                done();
              });
            });
          }  
        });
      } 
    })
    
    it('12.5.3 uses getRows after calling close()', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessCount = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet, nRows);
        }
      );
      
      function fetchRowFromRS(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              rs.getRows(numRows, function(err, rows) {
                should.exist(err);
                err.message.should.eql("NJS-018: invalid result set");
                done();
              });
            });
          }  
        });
      }
    })
    
    it('12.5.4 closes one resultSet and then open another resultSet', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessCount = 0;
      
      async.series([
        function(callback) {
          connection.execute(
            "SELECT employees_name FROM oracledb_employees",
            [],
            { resultSet: true, prefetchRows: 100 },
            function(err, result) {
              should.not.exist(err);
              fetchRowFromRS(result.resultSet, nRows, callback);
            }
          );
        },
        function(callback) {
          accessCount = 0;
          connection.execute(
            "SELECT * FROM oracledb_employees",
            [],
            { resultSet: true, prefetchRows: 100 },
            function(err, result) {
              should.not.exist(err);
              fetchRowFromRS(result.resultSet, nRows, callback);
            }
          );
        }
      ], done);
      
      function fetchRowFromRS(rs, numRows, callback) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessCount++;
            return fetchRowFromRS(rs, numRows, callback);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessCount.should.be.exactly(10);
              callback();
            });
          }
        });
      }
    })
    
  })
  
  describe('12.6 Testing metaData', function() {
    this.timeout(0);
    
    it('12.6.1 the amount and value of metaData should be correct', function(done) {
      connection.should.be.ok;

      /* Helper functions */
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

      var createTab = function(size) {
        var buffer = new StringBuffer();
        buffer.append("CREATE TABLE oracledb_manycolumns( ");
        
        for(var i = 0; i < size-1; i++) {
          buffer.append("c" + i + " NUMBER, ");
        }
        buffer.append("c" + (size-1) + " NUMBER");
        buffer.append(" )");

        return buffer.toString();
      }
      /*********************/
      var columnsAmount = 1000;
      async.series([
        function(callback) {
          var sql = createTab(columnsAmount);
          // console.log(sql);
          connection.execute(
            sql,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "SELECT * FROM oracledb_manycolumns",
            [],
            { resultSet: true},
            function(err, result){
              should.not.exist(err);
              //console.log(result.resultSet.metaData);
              for(var i = 0; i < columnsAmount; i++) {
                (result.resultSet.metaData[i].name).should.be.exactly('C' + i);
              }
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP TABLE oracledb_manycolumns",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
    
    it('12.6.2 can distinguish lower case and upper case', function(done) {
      connection.should.be.ok;
      var tableName = "oracledb_uppercase";
      var createTable = 
        " BEGIN " +
        "   DECLARE " +
        "     e_table_exists EXCEPTION; " +
        "     PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); " + 
        "   EXCEPTION " +
        "     WHEN e_table_exists " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "       CREATE TABLE " + tableName + " ( " + 
        '         "c" NUMBER, ' +
        '         "C" NUMBER ' +
        "       ) " +
        "   '); " +
        " END; ";
      
      async.series([
        function(callback) {
          connection.execute(
            createTable,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "SELECT * FROM " + tableName,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              // console.log(result.resultSet.metaData);
              (result.resultSet.metaData[0].name).should.be.exactly('c');
              (result.resultSet.metaData[1].name).should.be.exactly('C');
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP TABLE " + tableName, 
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
    
    it('12.6.3 can contain quotes', function(done) {
      connection.should.be.ok;
      var tableName = "oracledb_quotes";
      var createTable = 
        " BEGIN " +
        "   DECLARE " +
        "     e_table_exists EXCEPTION; " +
        "     PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); " + 
        "   EXCEPTION " +
        "     WHEN e_table_exists " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "       CREATE TABLE " + tableName + " ( " + 
        '         "c' + "''" + '" NUMBER, ' + 
        '         "c" NUMBER ' +
        "       ) " +
        "   '); " +
        " END; ";
        
      async.series([
        function(callback) {
          connection.execute(
            createTable,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "SELECT * FROM " + tableName,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              // console.log(result.resultSet.metaData);
              (result.resultSet.metaData[0].name).should.be.exactly("c'");
              (result.resultSet.metaData[1].name).should.be.exactly('c');
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP TABLE " + tableName,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
    
    it('12.6.4 can contain underscore', function(done) {
      connection.should.be.ok;
      var tableName = "oracledb_underscore";
      var createTable = 
        " BEGIN " +
        "   DECLARE " +
        "     e_table_exists EXCEPTION; " +
        "     PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); " + 
        "   EXCEPTION " +
        "     WHEN e_table_exists " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "     CREATE TABLE " + tableName + " ( " + 
        '         "c_" NUMBER, ' +
        '         "c__" NUMBER ' +
        "     ) " +
        "   '); " +
        " END; ";       
      
      async.series([
        function(callback) {
          connection.execute(
            createTable,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "SELECT * FROM " + tableName,
            [],
            { resultSet: true },
            function(err, result) {
              should.not.exist(err);
              // console.log(result.resultSet.metaData);
              (result.resultSet.metaData[0].name).should.be.exactly("c_");
              (result.resultSet.metaData[1].name).should.be.exactly('c__');
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            "DROP TABLE " + tableName,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    })
  })
  
  describe('12.7 Testing maxRows', function() {
    it('12.7.1 maxRows option is ignored when resultSet option is true', function(done) {
      connection.should.be.ok;
      var accessCount = 0;
      var rowsLimit = 50;
      connection.execute(
        "SELECT * FROM oracledb_employees",
        [],
        { resultSet: true, maxRows: rowsLimit },
        function(err, result) {
          should.not.exist(err);
          fetchRowFromRS(result.resultSet);
        }
      );
      function fetchRowFromRS(rs) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            accessCount++;
            return fetchRowFromRS(rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          }
        });
      }
    })
    
    it('12.7.2 maxRows option is ignored with REF Cursor', function(done) {
      connection.should.be.ok;
      var rowCount = 0;
      var queryAmount = 100; 
      var proc = 
        "CREATE OR REPLACE PROCEDURE get_emp_rs (p_in IN NUMBER, p_out OUT SYS_REFCURSOR) \
           AS \
           BEGIN \
             OPEN p_out FOR  \
               SELECT * FROM oracledb_employees \
               WHERE employees_id <= p_in; \
           END; ";
      
      async.series([
        function(callback) {
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
            "BEGIN get_emp_rs(:in, :out); END;",
            {
              in: queryAmount,
              out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
            },
            { maxRows: 10 },
            function(err, result) {
              should.not.exist(err);
              fetchRowFromRS(result.outBinds.out, callback);
            }
          );
        }, 
        function(callback) {
          connection.execute(
            "DROP PROCEDURE get_emp_rs",
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
      
      function fetchRowFromRS(rs, cb) {
        rs.getRow(function(err, row) {
          should.not.exist(err);
          if(row) {
            rowCount++;
            return fetchRowFromRS(rs, cb);
          } else {
            rs.close( function(err) {
              should.not.exist(err);
              rowCount.should.eql(queryAmount);
              cb();
            });
          }
        });
      }
    })
  })
  
})


