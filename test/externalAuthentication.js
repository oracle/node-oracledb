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
 *   5. externalAuthentication.js
 *
 * DESCRIPTION
 *   Testing external authentication functionality.
 *
 * NOTE
 *   The External Authentication should be configured on DB side if 
 *    "externalAuth" is true.
 *   You may refer to the doc about external authentication at
 *   https://github.com/oracle/node-oracledb/blob/master/doc/api.md#extauth
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
var dbConfig = require('./dbconfig.js');

describe('5. externalAuthentication.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  it('5.1 connection should succeed when setting externalAuth to be false and providing user/password', function(done){
    oracledb.getConnection(
      {
        externalAuth: false,
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn){
        should.not.exist(err);
        conn.should.be.ok;
        conn.execute(
          "select (7+8) from dual",
          function(err, result){
            should.not.exist(err);
            (result.rows[0][0]).should.equal(15);
            conn.release( function(err){
              should.not.exist(err);
              done();
            });
          }
        );
      }
    );
  })
  
  it('5.2 error should be thrown when setting externalAuth to be true and providing user/password', function(done){
    oracledb.getConnection(
      {
        externalAuth: true,
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn){
        should.exist(err);
        err.message.should.eql('DPI-006: user and password should not be set when using external authentication');
        done();
      }
    );  
  })
  
  it('5.3 can get connection from oracledb', function(done){
    // console.log(credential);
    if(dbConfig.externalAuth){
      oracledb.getConnection(
        credential,
        function(err, connection){
          should.not.exist(err);
          connection.should.be.ok;
          sql = "select (1+4) from dual";
          connection.execute(
            sql,
            function(err, result){
              should.not.exist(err);
              (result.rows[0][0]).should.equal(5);
              connection.release(function(err){
                should.not.exist(err);
                done();
              });
            }
          );
        }
      );
    } else {
      // console.log("External Authentication Off.");
      done();
    } 
  })
  
  it('5.4 can create pool', function(done){
    if(dbConfig.externalAuth){
      oracledb.createPool(
        credential,
        function(err, pool){
          should.not.exist(err);
          pool.should.be.ok;
          
          pool.getConnection(function(err, connection){
            should.not.exist(err);
            connection.should.be.ok;
              
            sql = "select (1+4) from dual";
            connection.execute(
              sql,
              function(err, result){
                should.not.exist(err);
                (result.rows[0][0]).should.equal(5);  
                connection.release( function(err){
                  should.not.exist(err);
                    
                  pool.terminate(function(err){
                    should.not.exist(err);
                    done();
                  });
                });
              }
            );
          });
        }
      );
    } else {
      // console.log("External Authentication off.");
      done();
    }
  })
  
})
