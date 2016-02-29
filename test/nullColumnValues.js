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
 *   10. nullColumnValues.js
 *
 * DESCRIPTION
 *    Tests to check that a NULL data value in a column is returned as a JavaScript null.
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

describe('10. nullColumnValues.js', function() {
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = false;
  beforeEach('get connection & create table', function(done){
    var makeTable = 
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
                    department_name VARCHAR2(20), \
                    manager_id NUMBER, \
                    location_id NUMBER \
                ) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   VALUES \
                   (40,''Human Resources'', 203, 2400) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   VALUES \
                   (50,''Shipping'', 121, 1500) \
            '); \
            EXECUTE IMMEDIATE (' \
              INSERT INTO oracledb_departments  \
                   VALUES \
                   (90, ''Executive'', 100, 1700) \
            '); \
        END; ";
    oracledb.getConnection(credential, function(err, conn){
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
  
  afterEach('drop table and release connection', function(done){
    connection.execute(
      "DROP TABLE oracledb_departments",
      function(err){
        if(err) { console.error(err.message); return; }
        connection.release( function(err){
          if(err) { console.error(err.message); return; }
          done();
        });
      }
    );
  })
  
  it('10.1 a simple query for null value', function(done) {
    connection.should.be.ok;
    
    connection.execute(
      "SELECT null FROM DUAL",
      function(err, result) {
        should.not.exist(err);
        result.rows[0].should.eql( [null] );
        done();
      } 
    );
  })
  
  it('10.2 in-bind for null column value', function(done) {
    connection.should.be.ok;
    
    async.series([
      function(callback) {
        connection.execute(
          "INSERT INTO oracledb_departments VALUES(:did, :dname, :mid, :mname)",
          {
            did: 101,
            dname: 'Facility',
            mid: '',
            mname: null
          },
          function(err, result) {
            should.not.exist(err);
            result.rowsAffected.should.be.exactly(1);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "SELECT * FROM oracledb_departments WHERE department_id = :did",
          { did: 101 },
          { outFormat: oracledb.OBJECT },
          function(err, result) {
            should.not.exist(err);
            // console.log(result);
            result.rows[0].DEPARTMENT_ID.should.be.exactly(101);
            result.rows[0].DEPARTMENT_NAME.should.eql('Facility');
            should.not.exist(result.rows[0].MANAGER_ID); // null
            should.not.exist(result.rows[0].LOCATION_ID); // null
            callback();
          }
        );
      }
    ], done);
    
  })
  
  it('10.3 out-bind for null column value', function(done) {
    connection.should.be.ok;
    
    async.series([
      function(callback) {
        var proc = "CREATE OR REPLACE PROCEDURE oracledb_testproc (p_out OUT VARCHAR2) \
                    AS \
                    BEGIN \
                      p_out := ''; \
                    END;";
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
            should.not.exist(result.outBinds.o); // null
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
  
  it('10.4 DML Returning for null column value', function(done) {
    connection.should.be.ok;
    
    connection.execute(
      "UPDATE oracledb_departments SET department_name = :dname, \
        manager_id = :mid WHERE department_id = :did \
        RETURNING department_id, department_name, manager_id INTO \
        :rdid, :rdname, :rmid",
        {
          dname: '',
          mid: null,
          did: 90,
          rdid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
          rdname: { type: oracledb.STRING, dir: oracledb.BIND_OUT },
          rmid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true },
        function(err, result) {
          should.not.exist(err);
          //console.log(result);
          result.outBinds.should.eql({rdid: [90], rdname: [null], rmid: [null]});
          result.outBinds.rdid.should.eql( [90] );
          should.not.exist(result.outBinds.rdname[0]); // null
          should.not.exist(result.outBinds.rmid[0]);  // null
          done();
        }
    );
  })
  
  it('10.5 resultSet for null value', function(done) {
    connection.should.be.ok;
    
    async.series([
      function(callback) {
        connection.execute(
          "UPDATE oracledb_departments SET department_name = :dname, \
          manager_id = :mid WHERE department_id = :did ",
          {
            dname: '',
            mid: null,
            did: 50
          },
          { autoCommit: true },
          function(err) {
            should.not.exist(err);
            callback();
          }
        );
      },
      function(callback) {
        connection.execute(
          "SELECT * FROM oracledb_departments WHERE department_id = :1",
          [50],
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
              // console.log(row);
              row.should.eql([50, null, null, 1500]);
              return fetchRowFromRS(rs);
            } else {
              rs.close(function(err) {
                should.not.exist(err);
                callback();
              });
            }
          });
        }
      }
    ], done);
  })
  
})
