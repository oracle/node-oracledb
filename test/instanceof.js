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
 * NAME
 *   45. instanceof.js
 *
 * DESCRIPTION
 *   Testing JS instanceof.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests 
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

describe('45. instanceof.js', function() {
  
  it('45.1 all constructors have been accounted for', function(done) {
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
  
  it('45.2 instanceof works for the oracledb instance', function(done) {
    (oracledb instanceof oracledb.Oracledb).should.be.true;

    done();
  });
  
  it('45.3 instanceof works for pool instances', function(done) {
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
  
  it('45.4 instanceof works for connection instances', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      
      (conn instanceof oracledb.Connection).should.be.true;
      
      conn.release(function(err) {
        should.not.exist(err);

        done();
      });
    });   
  });
  
  it('45.5 instanceof works for resultset instances', function(done) {
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
  
  it('45.6 instanceof works for lob instances', function(done) {
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