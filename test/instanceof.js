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

describe('instanceof.js', function() {
  it('all constructors have been accounted for', function(done) {
    var cLibKeysIdx;
    var cLibKeys;
    var instKeysIdx;
    var instKeys;
    var foundAllConstructors = true;
    
    cLibKeys = Object.keys(oracledbCLib);
    instKeys = Object.keys(oracledb);

    cLibLoop:
    for (cLibKeysIdx = 0; cLibKeysIdx < cLibKeys.length; cLibKeysIdx += 1) {
      if (typeof oracledbCLib[cLibKeys[cLibKeysIdx]] !== 'function') {
        continue cLibLoop;
      }
      
      for (instKeysIdx = 0; instKeysIdx < instKeys.length; instKeysIdx += 1) {
        if (cLibKeys[cLibKeysIdx] === instKeys[instKeysIdx] ||
          // The following exception is because the Lob class is documented as "Lob"
          // so that's how it was exposed on the instance
          cLibKeys[cLibKeysIdx] === 'ILob' && instKeys[instKeysIdx] === 'Lob' 
        ) {
          continue cLibLoop;
        }
      }
      
      foundAllConstructors = false;
      console.log('Failed to account for ' + cLibKeys[cLibKeysIdx]);
      
      break cLibLoop;
    }
    
    foundAllConstructors.should.be.true;
    
    done();
  });
  
  it('instanceof works for the oracledb instance', function(done) {
    (oracledb instanceof oracledb.Oracledb).should.be.true;

    done();
  });
  
  it('instanceof works for pool instances', function(done) {
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
        should.not.exist(err);
        
        (pool instanceof oracledb.Pool).should.be.true;
        
        pool.terminate(function(err) {
          should.not.exist(err);
          
          done();
        });
      }
    );
  });
  
  it('instanceof works for connection instances', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      
      (conn instanceof oracledb.Connection).should.be.true;
      
      conn.release(function(err) {
        should.not.exist(err);

        done();
      });
    });   
  });
  
  it('instanceof works for resultset instances', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      
      conn.execute(
        'select 1 from dual union select 2 from dual',
        [], // no binds
        {
          resultSet: true
        },
        function(err, result) {
          should.not.exist(err);
          
          (result.resultSet instanceof oracledb.ResultSet).should.be.true;
          
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
  
  it('instanceof works for lob instances', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      
      conn.execute(
        'select to_clob(dummy) from dual',
        function(err, result) {
          should.not.exist(err);
          
          (result.rows[0][0] instanceof oracledb.Lob).should.be.true;
          
          conn.release(function(err) {
            should.not.exist(err);

            done();
          });
        }
       );
    });   
  });
});