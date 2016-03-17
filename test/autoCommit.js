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
 *   7. autoCommit.js
 *
 * DESCRIPTION
 *   Testing general autoCommit feature.
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
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe('7. autoCommit.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var pool = null;
  var connection  = null;

  before('create pool, get one connection, create table', function(done) {
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
        END; ";

    async.series([
      function(callback) {
        oracledb.createPool(
          {
            externalAuth  : credential.externalAuth,
            user          : credential.user,
            password      : credential.password,
            connectString : credential.connectString,
            poolMin       : 3,
            poolMax       : 7,
            poolIncrement : 1
          },
          function(err, connectionPool) {
            should.not.exist(err);
            pool = connectionPool;
            callback();
          }
        );
      },
      function(callback) {
        pool.getConnection( function(err, conn) {
          should.not.exist(err);
          connection = conn;
          callback();
        }); 
      },
      function(callback) {
        connection.execute( 
          script,
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      }
    ], done);
  })
  
  after('drop table, release connection, terminate pool', function(done) {    
    async.series([
      function(callback) {
        connection.execute(
          "DROP TABLE oracledb_departments",
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
      },
      function(callback) {
        pool.terminate(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  })

  afterEach('truncate table, reset the oracledb properties', function(done) {
    oracledb.autoCommit = false;  /* Restore to default value */

    connection.execute(
      "TRUNCATE TABLE oracledb_departments",
      function(err) {
        should.not.exist(err);
        done();
      } 
    );
  })
  
  it('7.1 autoCommit takes effect when setting oracledb.autoCommit before connecting', function(done) {
    var conn1 = null;
    var conn2 = null;

    oracledb.autoCommit = true;

    async.series([
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "INSERT INTO oracledb_departments VALUES (82, 'Security')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {           // get another connection
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(82).and.be.a.Number;
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "UPDATE oracledb_departments SET department_id = 101 WHERE department_name = 'Security'",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(101).and.be.a.Number;
            callback();
          }
        );
      },
      function(callback) {
        conn1.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function(callback) {
        conn2.release(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  })

  it('7.2 autoCommit takes effect when setting oracledb.autoCommit after connecting', function(done) {
    var conn1 = null;
    var conn2 = null;

    async.series([
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          }
        );
      },
      function(callback) {
        oracledb.autoCommit = true;   // change autoCommit after connection
        conn1.execute(
          "INSERT INTO oracledb_departments VALUES (82, 'Security')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {     
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(82).and.be.a.Number;
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "UPDATE oracledb_departments SET department_id = 101 WHERE department_name = 'Security'",
          function(err){
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].DEPARTMENT_ID.should.eql(101).and.be.a.Number;
            callback();
          }
        );
      },
      function(callback) {
        conn1.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function(callback) {
        conn2.release(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  })

  it('7.3 autoCommit setting does not affect previous SQL result', function(done) {
    var conn1 = null;
    var conn2 = null;
    
    async.series([
      function(callback) {
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn1 = conn;
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "INSERT INTO oracledb_departments VALUES (82, 'Security')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {     
        pool.getConnection(
          function(err, conn) {
            should.not.exist(err);
            conn2 = conn;
            callback();
          }
        );
      },
      function(callback) {
        oracledb.autoCommit = true;   // change autoCommit after connection
        conn2.execute(
          "SELECT department_id FROM oracledb_departments WHERE department_name = 'Security'",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            (result.rows).should.eql([]);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "INSERT INTO oracledb_departments VALUES (99, 'Marketing')",
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        conn2.execute(
          "SELECT COUNT(*) as amount FROM oracledb_departments",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].AMOUNT.should.eql(1);
            callback();
          }
        );
      },
      function(callback) {
        conn1.execute(
          "SELECT COUNT(*) as amount FROM oracledb_departments",
          [],
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            result.rows[0].AMOUNT.should.eql(2);   // autoCommit for SELECT
            callback();
          }
        );
      },
      function(callback) {
        conn1.release(function(err) {
          should.not.exist(err);
          callback();
        });
      },
      function(callback) {
        conn2.release(function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  }) 
  
})

