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
 * NAME
 *   12. resultSet.js
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
var should = require('should');
var async = require('async');
var dbConfig = require('./dbConfig.js');

describe('12. resultSet.js', function() {
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
    
    it.skip('12.2.* cannot set prefetchRows to be null', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: undefined, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          console.log(result);
          done();
        }
      );
    })
    
    it.skip('12.* set prefetchRows to be 0', function(done) {
      connection.should.be.ok;
    
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 0, maxRows: 1000 },
        function(err, result) {
          should.not.exist(err);
          
          console.log(result);
          
          done();
        }
      );
    })
    
  })

  describe('12.3 getRows() function', function() {
    it('12.3.1 retrived set is exactly the size of result', function(done) {
      connection.should.be.ok;
      var nRows = rowsAmount;
      var accessRS = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessRS++;
            return processEmp(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessRS.should.be.exactly(1);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.2 retrived set is greater than the size of result', function(done) {
      connection.should.be.ok;
      var nRows = rowsAmount * 2;
      var accessRS = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessRS++;
            return processEmp(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessRS.should.be.exactly(1);
              done();
            });
          }  
        });
      }
    })

    it('12.3.3 retrived set is half of the size of result', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/2);
      var accessRS = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessRS++;
            return processEmp(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessRS.should.be.exactly(2);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.4 retrived set is one tenth of the size of the result', function(done) {
      connection.should.be.ok;
      var nRows = Math.ceil(rowsAmount/10);
      var accessRS = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            accessRS++;
            return processEmp(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              accessRS.should.be.exactly(10);
              done();
            });
          }  
        });
      }
    })
    
    it.skip('12.3.5 Negative - the size of retrived set is 1', function(done) {
      connection.should.be.ok;
      var nRows = 1;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            return processEmp(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          }  
        });
      }
    })

    it.skip('12.3.6 Negative - To omit the first parameter', function(done) {
      connection.should.be.ok;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          
          /* result.resultSet.getRows(function(err, rows) {
            //should.exist(err);
            console.log(err);
            console.log(rows);
            done();
          }); */
          
          processEmp(result.resultSet);
        }
      );
      
      function processEmp(rs) {
        rs.getRows(function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            console.log("length of rows " + rows.length);
            for(var i = 0; i < rows.length; i++) 
              console.log(rows[i]);
            
            return processEmp(rs);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          }  
        });
      }
    })
    
    it('12.3.7 Negative - set the 1st parameter of getRows() to be 0', function(done) {
      connection.should.be.ok;
      var nRows = 0;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
        rs.getRows(numRows, function(err, rows) {
          should.not.exist(err);
          
          if(rows.length > 0) {
            return processEmp(rs, numRows);
          } else {
            rs.close(function(err) {
              should.not.exist(err);
              done();
            });
          }  
        });
      }
    })
    
    it.skip('12.3.8 Negative - set the 1st parameter of getRows() to be -5', function(done) {
      connection.should.be.ok;
      var nRows = -5;
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
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
    
    it.skip('12.3.9 Negative - set the 1st parameter of getRows() to be null', function(done) {
      connection.should.be.ok;
      var nRows = null;  // setting to 'undefined' is the same
      
      connection.execute(
        "SELECT employees_name FROM oracledb_employees",
        [],
        { resultSet: true, prefetchRows: 100 },
        function(err, result) {
          should.not.exist(err);
          processEmp(result.resultSet, nRows);
        }
      );
      
      function processEmp(rs, numRows) {
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
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
})


