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
 *   2. pool.js
 *
 * DESCRIPTION
 *   Testing properties of connection pool.
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
var dbConfig = require('./dbConfig.js');

describe('2. pool.js', function(){
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  describe('2.1 default values', function(){
    it('2.1.1 set properties to default values if not explicitly specified', function(done){
      oracledb.createPool(credential, function(err, pool){
        should.not.exist(err);
        pool.should.be.ok;
        
        var defaultMin = 0;
        var defaultMax = 4;
        var defaultIncrement = 1;
        var defaultTimeout = 60;
        var defaultStmtCacheSize = 30;
        
        pool.poolMin.should.be.exactly(defaultMin).and.be.a.Number;
        pool.poolMax.should.be.exactly(defaultMax).and.be.a.Number;
        pool.poolIncrement.should.be.exactly(defaultIncrement).and.be.a.Number;
        pool.poolTimeout.should.be.exactly(defaultTimeout).and.be.a.Number;
        pool.stmtCacheSize.should.be.exactly(defaultStmtCacheSize).and.be.a.Number;
        
        pool.connectionsOpen.should.equal(0);
        pool.connectionsInUse.should.equal(0);
        
        pool.terminate(function(err){
          should.not.exist(err);
          done();
        });
      });
    })
  })
  
  describe('2.2 poolMin', function(){
    it('2.2.1 poolMin cannot be a negative number', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : -5,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  
    it('2.2.2 poolMin must be a Number', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : NaN,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
    
    it('2.2.3 poolMin cannot equal to poolMax', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 5,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23
        },
        function(err, pool){
          if(!credential.externalAuth){
            should.exist(err);
            (err.message).should.equal('ORA-24413: Invalid number of sessions specified');
          }
          done();
        }
      );
    })
  
    it('2.2.4 poolMin cannot greater than poolMax', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 10,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23
        },
        function(err, pool){  
          if(!credential.externalAuth){
            should.exist(err);
            (err.message).should.equal('ORA-24413: Invalid number of sessions specified');
          }
          done();
        }
      );
    })
  
    it('2.2.5 (poolMin + poolIncrement) cannot greater than poolMax', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 4,
          poolIncrement     : 4,
          poolTimeout       : 28,
          stmtCacheSize     : 23
        },
        function(err, pool){
          if(!credential.externalAuth){
            should.exist(err);
            (err.message).should.equal('ORA-24413: Invalid number of sessions specified');
          }
          done();
        }
      );
    })
  
    it('2.2.6 (poolMin + poolIncrement) can equal to poolMax', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 4,
          poolTimeout       : 28,
          stmtCacheSize     : 23
        },
        function(err, pool){
          should.not.exist(err);
          pool.should.be.ok;
          if(credential.externalAuth){
            pool.connectionsOpen.should.be.exactly(0);
          } else {
            pool.connectionsOpen.should.be.exactly(pool.poolMin);
          }
          pool.connectionsInUse.should.be.exactly(0);
        
          pool.terminate(function(err){
            should.not.exist(err);
            done();
          });
        }
      );
      
      
    })
    
  })
  
  describe('2.3 poolMax', function(){
    it('2.3.1 poolMax cannot be a negative value', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 5,
          poolMax           : -5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  
    it('2.3.2 poolMax cannot be 0', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 0,
          poolMax           : 0,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.equal('ORA-24413: Invalid number of sessions specified');
          done();
        }
      );
    })
    
    it('2.3.3 poolMax must be a number', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : true,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-008: invalid type for');
          done();
        }
      );
    })
  
    it('2.3.4 poolMax limits the pool capacity', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 2,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool) {
          should.not.exist(err);
          pool.should.be.ok;
          if(!credential.externalAuth){
            pool.connectionsOpen.should.be.exactly(1);
          } else {
            pool.connectionsOpen.should.be.exactly(0);
          }
          pool.connectionsInUse.should.be.exactly(0);
          
          pool.getConnection( function(err, conn1){
            should.not.exist(err);
            conn1.should.be.ok;
            pool.connectionsOpen.should.be.exactly(1);
            pool.connectionsInUse.should.be.exactly(1);
          
            pool.getConnection( function(err, conn2){
              should.not.exist(err);
              conn2.should.be.ok;
              pool.connectionsOpen.should.be.exactly(2);
              pool.connectionsInUse.should.be.exactly(2);
            
              // Error occurs
              pool.getConnection( function(err, conn3){
                should.exist(err);
                (err.message).should.equal('ORA-24418: Cannot open further sessions.');
              
                conn2.release( function(err){
                  should.not.exist(err);
                  conn1.release( function(err){
                    should.not.exist(err);
                    pool.terminate( function(err){
                      should.not.exist(err);
                      done();
                    }); 
                  });
                });
              });
            });
          });
      
        }
      );
    })
    
  })
  
  describe('2.4 poolIncrement', function(){
    it('2.4.1 poolIncrement cannot be a negative value', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : -1,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  
    it('2.4.2 poolIncrement cannot be 0', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 10,
          poolIncrement     : 0,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);  // Bug 20774464 - Occurs on External Authentication
          (err.message).should.equal('ORA-24413: Invalid number of sessions specified');
          done();
        }
      );
    })
    
    it('2.4.3 poolIncrement must be a Number', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 10,
          poolIncrement     : false,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-008: invalid type for');
          done();
        }
      );
    })
  
    it('2.4.4 the amount of open connections equals to poolMax when (connectionsOpen + poolIncrement) > poolMax', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 4,
          poolIncrement     : 2,
          poolTimeout       : 28,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.not.exist(err);
          pool.should.be.ok;
        
          pool.getConnection( function(err, conn1){
            should.not.exist(err);
            conn1.should.be.ok;
            pool.connectionsOpen.should.be.exactly(1);
            pool.connectionsInUse.should.be.exactly(1);
         
            pool.getConnection( function(err, conn2){
              should.not.exist(err);
              conn2.should.be.ok;
              pool.connectionsOpen.should.be.exactly(3);   // Bug 20774464 - Occurs on External Authentication
              pool.connectionsInUse.should.be.exactly(2);
            
              pool.getConnection( function(err, conn3){
                should.not.exist(err);
                conn3.should.be.ok;
                pool.connectionsOpen.should.be.exactly(3);
                pool.connectionsInUse.should.be.exactly(3);
              
                // (connectionsOpen + poolIncrement) > poolMax
                pool.getConnection( function(err, conn4){
                  should.not.exist(err);
                  conn4.should.be.ok;
                  pool.connectionsOpen.should.be.exactly(4);
                  pool.connectionsOpen.should.be.exactly(4);
                  conn4.release( function(err){
                    should.not.exist(err);
                    conn3.release( function(err){
                      should.not.exist(err);
                      conn2.release( function(err){
                        should.not.exist(err);
                        conn1.release( function(err){
                          should.not.exist(err);
                          pool.terminate( function(err){
                            should.not.exist(err);
                            done();
                          });
                        });
                      });
                    });
                  });
                });
              });
            });       
          });
        }
      );
    })
  
  })
  
  describe('2.5 poolTimeout', function(){
    it('2.5.1 poolTimeout cannot be a negative number', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : -5,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  
    it('2.5.2 poolTimeout can be 0, which disables timeout feature', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 0,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.not.exist(err);
          pool.should.be.ok;
          
          pool.terminate(function(err){
            should.not.exist(err);
            done();
          });
        }
      );
    })
    
    it('2.5.3 poolTimeout must be a number', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : NaN,
          stmtCacheSize     : 23        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  
  })
  
  describe('2.6 stmtCacheSize', function(){
    it('2.6.1 stmtCacheSize cannot be a negative value', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : -9        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  
    it('2.6.2 stmtCacheSize can be 0', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : 0     
        },
        function(err, pool){
          should.not.exist(err);
          pool.should.be.ok;
          pool.terminate(function(err){
            should.not.exist(err);
            done();
          });
        }
      );
    })
    
    it('2.6.3 stmtCacheSize must be a Number', function(done){
      oracledb.createPool(
        {
          externalAuth    : credential.externalAuth,
          user              : credential.user,
          password          : credential.password,
          connectString     : credential.connectString,
          poolMin           : 1,
          poolMax           : 5,
          poolIncrement     : 1,
          poolTimeout       : 28,
          stmtCacheSize     : NaN        
        },
        function(err, pool){
          should.exist(err);
          (err.message).should.startWith('NJS-007: invalid value for');
          done();
        }
      );
    })
  
  })
})
