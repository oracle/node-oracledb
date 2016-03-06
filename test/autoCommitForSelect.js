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
 *   8. autoCommitForSelect.js
 *
 * DESCRIPTION
 *   Testing autoCommit feature for SELECTs feature.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests 
 * 
 *****************************************************************************/

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('8. autoCommitForSelect.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  var connection = false;
  var anotherConnection = false;
  
  var script = 
      "BEGIN \
          DECLARE \
              e_table_exists EXCEPTION; \
              PRAGMA EXCEPTION_INIT(e_table_exists, -00942); \
          BEGIN \
              EXECUTE IMMEDIATE ('DROP TABLE oracledb_departments'); \
          EXCEPTION \
              WHEN e_table_exists \
              THEN NULL; \
          END; \
          EXECUTE IMMEDIATE (' \
              CREATE TABLE oracledb_departments ( \
                  department_id NUMBER,  \
                  department_name VARCHAR2(20) \
              ) \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   (department_id, department_name) VALUES \
                   (40,''Human Resources'') \
          '); \
          EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   (department_id, department_name) VALUES \
                   (20, ''Marketing'') \
          '); \
      END; ";
  
  before(function(done){
    async.parallel([
      function(callback){
        oracledb.getConnection(credential, function(err, conn){
          if(err) { console.error(err.message); return; }
          connection = conn;
          callback();
        });
      },
      function(callback){
        oracledb.getConnection(credential, function(err, conn){
          if(err) { console.error(err.message); return; }
          anotherConnection = conn;
          callback();
        });
      }
    ], done);   
  })
  
  after(function(done){
    async.parallel([
      function(callback){
        connection.release( function(err){
          if(err) { console.error(err.message); return; }
          callback();
        });
      },
      function(callback){
        anotherConnection.release( function(err){
          if(err) { console.error(err.message); return; }
          callback();
        });
      }
    ], done);
  })
  
  beforeEach(function(done){
    connection.execute(script, function(err){
      if(err) { console.error(err.message); return; }
      // DML 'insert' statement does not commit automatically.
      // So the explicit commit is added.
      connection.commit( function(err){
        should.not.exist(err);
        done();
      });
    });
  })
  
  afterEach(function(done){
    connection.execute(
        'DROP TABLE oracledb_departments',
        function(err){
          if(err) { console.error(err.message); return; }
          done();
        }
      );
  })
  
  it('8.1 should return previous value when autoCommit is false', function(done){
    connection.should.be.ok;
    oracledb.autoCommit = false;
    
    async.series([
      function(callback){
        connection.execute(
          "INSERT INTO oracledb_departments VALUES (180, 'Construction')",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "UPDATE oracledb_departments SET department_id = 99 WHERE department_name = 'Marketing'",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "SELECT * FROM oracledb_departments",
          function(err, result){
            should.not.exist(err);
            (result.rows).should.containEql([180, 'Construction']);
            callback();
          }
        );
      },
      function(callback){
        anotherConnection.execute(
          "SELECT * FROM oracledb_departments",
          function(err, result){
            should.not.exist(err);
            (result.rows).should.not.containEql([180, 'Construction']);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Marketing'",
          function(err, result){
            should.not.exist(err);
            (result.rows[0][0]).should.eql(99);
            callback();
          }
        );
      },
      function(callback){
        anotherConnection.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Marketing'",
          function(err, result){
            should.not.exist(err);
            (result.rows[0][0]).should.eql(20);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('8.2 can use explicit commit() to keep data consistent', function(done){
    connection.should.be.ok;
    oracledb.autoCommit = false;
    
    async.series([
      function(callback){
        connection.execute(
          "INSERT INTO oracledb_departments VALUES (180, 'Construction')",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "UPDATE oracledb_departments SET department_id = 99 WHERE department_name = 'Marketing'",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.commit( function(err){
          should.not.exist(err);
          callback();
        });
      },
      function(callback){
        connection.execute(
          "SELECT * FROM oracledb_departments",
          function(err, result){
            should.not.exist(err);
            (result.rows).should.containEql([180, 'Construction']);
            callback();
          }
        );
      },
      function(callback){
        anotherConnection.execute(
          "SELECT * FROM oracledb_departments",
          function(err, result){
            should.not.exist(err);
            (result.rows).should.containEql([180, 'Construction']);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Marketing'",
          function(err, result){
            should.not.exist(err);
            (result.rows[0][0]).should.eql(99);
            callback();
          }
        );
      },
      function(callback){
        anotherConnection.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Marketing'",
          function(err, result){
            should.not.exist(err);
            (result.rows[0][0]).should.eql(99);
            callback();
          }
        );
      }
    ], done);
  })
  
  it('8.3 can also use the autoCommit for SELECTs feature', function(done){
    connection.should.be.ok;
    oracledb.autoCommit = false;
    
    async.series([
      function(callback){
        connection.execute(
          "INSERT INTO oracledb_departments VALUES (180, 'Construction')",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "UPDATE oracledb_departments SET department_id = 99 WHERE department_name = 'Marketing'",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback){
        connection.commit( function(err){
          should.not.exist(err);
          callback();
        });
      },
      function(callback){
        connection.execute(
          "SELECT * FROM oracledb_departments",
          {},
          {autoCommit: true},
          function(err, result){
            should.not.exist(err);
            (result.rows).should.containEql([180, 'Construction']);
            callback();
          }
        );
      },
      function(callback){
        anotherConnection.execute(
          "SELECT * FROM oracledb_departments",
          function(err, result){
            should.not.exist(err);
            (result.rows).should.containEql([180, 'Construction']);
            callback();
          }
        );
      },
      function(callback){
        connection.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Marketing'",
          function(err, result){
            should.not.exist(err);
            (result.rows[0][0]).should.eql(99);
            callback();
          }
        );
      },
      function(callback){
        anotherConnection.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Marketing'",
          function(err, result){
            should.not.exist(err);
            (result.rows[0][0]).should.eql(99);
            callback();
          }
        );
      }
    ], done);
  })
})
