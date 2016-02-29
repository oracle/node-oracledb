/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *****************************************************************************/
'use strict';

var oracledbCLib;
var oracledb = require('oracledb');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var credential;

try {
  oracledbCLib =  require('../build/Release/oracledb');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    oracledbCLib = require('../build/Debug/oracledb');
  } else {
    throw err;
  }
}

if (dbConfig.externalAuth) {
  credential = { externalAuth: true, connectString: dbConfig.connectString };
} else {
  credential = dbConfig;
}

describe('66. writeableProperties.js', function() {
  it('66.1 allows overwriting of public methods on the oracledb instance', function(done) {
    var keys = Object.keys(oracledb);
    var keysIdx;
    var originalFunction;
    
    function isConstructorFunction(name) {
      // The following has an exception for ILob, which was documented and 
      // exposed on oracledb as Lob
      return typeof oracledbCLib[name] === 'function' || name === 'Lob';
    }
    
    for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {      
      if (typeof oracledb[keys[keysIdx]] === 'function' &&
        !isConstructorFunction(keys[keysIdx]) // skip constructor functions from the C layer
      ) {        
        try {
          originalFunction = oracledb[keys[keysIdx]];
          
          oracledb[keys[keysIdx]] = function() {};
          
          oracledb[keys[keysIdx]] = originalFunction;
        } catch (err) {
          should.not.exist(err);
        }
      }
    }
    
    done();
  });
  
  it('66.2 allows overwriting of public methods on pool instances', function(done) {
    oracledb.createPool(
      {
        externalAuth    : credential.externalAuth,
        user              : credential.user,
        password          : credential.password,
        connectString     : credential.connectString,
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1     
      },
      function(err, pool){
        var keys;
        var keysIdx;
        var originalFunction;
        
        should.not.exist(err);
        
        keys = Object.keys(pool);
        
        for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
          if (typeof pool[keys[keysIdx]] === 'function') {     
            try {   
              originalFunction = pool[keys[keysIdx]]; 
              
              pool[keys[keysIdx]] = function() {};
              
              pool[keys[keysIdx]] = originalFunction;
            } catch (err) {
              should.not.exist(err);
            }
          }
        }
        
        pool.terminate(function(err) {
          should.not.exist(err);
          
          done();
        });
      }
    );
  });
  
  it('66.3 allows overwriting of public methods on connection instances', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      var keys;
      var keysIdx;
      var originalFunction;
      
      should.not.exist(err);
        
      keys = Object.keys(conn);
      
      for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
        if (typeof conn[keys[keysIdx]] === 'function') {     
          try {   
            originalFunction = conn[keys[keysIdx]]; 

            conn[keys[keysIdx]] = function() {};

            conn[keys[keysIdx]] = originalFunction;
          } catch (err) {
            should.not.exist(err);
          }
        }
      }
      
      conn.release(function(err) {
        should.not.exist(err);

        done();
      });
    });   
  });
  
  it('66.4 allows overwriting of public methods on resultset instances', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      
      conn.execute(
        'select 1 from dual union select 2 from dual',
        [], // no binds
        {
          resultSet: true
        },
        function(err, result) {
          var keys;
          var keysIdx;
          var originalFunction;
          
          should.not.exist(err);
        
          keys = Object.keys(result.resultSet);
          
          for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
            if (typeof result.resultSet[keys[keysIdx]] === 'function') {     
              try {   
                originalFunction = result.resultSet[keys[keysIdx]]; 

                result.resultSet[keys[keysIdx]] = function() {};

                result.resultSet[keys[keysIdx]] = originalFunction;
              } catch (err) {
                should.not.exist(err);
              }
            }
          }
          
          result.resultSet.close(function(err) {
            should.not.exist(err);
            
            conn.release(function(err) {
              should.not.exist(err);

              done();
            });
          });
        }
       );
    });   
  });
  
  it('66.5 allows overwriting of public methods on lob instances', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      
      conn.execute(
        'select to_clob(dummy) from dual',
        function(err, result) {
          var keys;
          var keysIdx;
          var originalFunction;
          var lob;
          
          should.not.exist(err);
          
          lob = result.rows[0][0];
          
          keys = Object.keys(lob);
          
          for (keysIdx = 0; keysIdx < keys.length; keysIdx += 1) {
            if (typeof lob[keys[keysIdx]] === 'function') {     
              try {   
                originalFunction = lob[keys[keysIdx]]; 

                lob[keys[keysIdx]] = function() {};

                lob[keys[keysIdx]] = originalFunction;
              } catch (err) {
                should.not.exist(err);
              }
            }
          }
          
          conn.release(function(err) {
            should.not.exist(err);

            done();
          });
        }
       );
    });   
  });
});
