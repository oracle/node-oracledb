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
 *   51. accessTerminatedPoolAttributes.js
 *
 * DESCRIPTION
 *   Testing driver's behaviour when access attributes of terminated pool.
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
var dbConfig = require('./dbconfig.js');

describe('51. accessTerminatedPoolAttributes.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  it('can not access attributes of terminated pool', function(done){
    oracledb.createPool(
      {
        externalAuth    : credential.externalAuth,
        user            : credential.user,
        password        : credential.password,
        connectString   : credential.connectString,
        poolMin         : 2,
        poolMax         : 10
      },
      function(err, pool){
        should.not.exist(err);
        pool.should.be.ok;
        if(credential.externalAuth){
          pool.connectionsOpen.should.be.exactly(0);
        } else {
          pool.connectionsOpen.should.be.exactly(pool.poolMin);
        }
        //(pool.connectionsOpen).should.eql(2);
        (pool.connectionsInUse).should.eql(0);
        
        pool.getConnection( function(err, connection){
          (pool.connectionsInUse).should.eql(1);
          
          connection.release( function(err){
            should.not.exist(err);
            (pool.connectionsInUse).should.eql(0);
            
            pool.terminate( function(err){
              should.not.exist(err);
              try{
                (pool.connectionsOpen).should.eql(2);
              } 
              catch(err){
                should.exist(err);
                (err.message).should.eql('NJS-002: invalid pool');
              }
              done();
            });
          });
        });
      }
    );
  
  })
})
