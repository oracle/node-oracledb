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
 *   54. releaseAfterFailingTerminate.js
 *
 * DESCRIPTION
 *   Testing connection release after pool's failing termination.
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

describe('54. releaseAfterFailingTerminate.js', function(){

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  it('can still release connections after failing pool termination', function(done){
    oracledb.createPool(
      credential,
      function(err, pool) {
        should.not.exist(err);
        pool.getConnection( function(err, connection){
          should.not.exist(err);
          pool.terminate( 
            function(err){
              should.exist(err);
              (err.message).should.startWith('ORA-24422:');
              
              connection.release( function(err){
                should.not.exist(err);
                done();
              });
            }
          );
        });
      }
    );
  })
})
