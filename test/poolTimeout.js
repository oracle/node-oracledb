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
 *   11. poolTimeout.js
 *
 * DESCRIPTION
 *   Testing time-out property of pool.
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

describe('11. poolTimeout.js', function(){
  this.timeout(0); // disable suite-level Time-out
  var pool = false;
  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  before(function(done){
    oracledb.createPool(
      {
        externalAuth  : credential.externalAuth,
        user            : credential.user,
        password        : credential.password,
        connectString   : credential.connectString,
        poolMin         : 1,
        poolMax         : 5,
        poolIncrement   : 2,
        poolTimeout     : 2,
        stmtCacheSize   : 23
      },
      function(err, pooling){
        if(err) { console.log(err.message); return; }
        //console.log("---- Pool created.");
        pool = pooling;
        done();
      }
    ); 
  })
  
  after(function(done){
    pool.terminate(function(err){
      if(err) { console.log(err.message); return; }
      //console.log("---- pool terminated.");
      done();
    }); 
  })
  
  it(' pool terminates idle connections after specify time', function(done){
    pool.should.be.ok;
    if(!credential.externalAuth){
      pool.connectionsOpen.should.be.exactly(1).and.be.a.Number;
    } else {
      pool.connectionsOpen.should.be.exactly(0);
    }
    pool.connectionsInUse.should.be.exactly(0).and.be.a.Number;
    
    var conn1 = false;
    var conn2 = false;
    var conn3 = false;
    var conn4 = false;
    async.series([
      function(callback){
        pool.getConnection( function(err, conn){
          should.not.exist(err);
          conn.should.be.ok;
          conn1 = conn;
          //console.log("-- create conn 1");
          callback();
        });
      }, 
      function(callback){
        pool.connectionsOpen.should.be.exactly(1);
        pool.connectionsInUse.should.be.exactly(1);
        pool.getConnection( function(err, conn){
          should.not.exist(err);
          conn.should.be.ok;
          conn2 = conn;
          //console.log("-- create conn 2");
          callback();
        });
      },
      function(callback){
        if(!credential.externalAuth){
          pool.connectionsOpen.should.be.exactly(3);
        } else {
          pool.connectionsOpen.should.be.exactly(2);
        }
        pool.connectionsInUse.should.be.exactly(2);
        pool.getConnection( function(err, conn){
          should.not.exist(err);
          conn.should.be.ok;
          conn3 = conn;
          //console.log("-- create conn 3");
          callback();
        });
      },
      function(callback){
        pool.connectionsOpen.should.be.exactly(3);
        pool.connectionsInUse.should.be.exactly(3);
        conn1.should.be.ok;
        conn1.release( function(err){
          should.not.exist(err);
          //console.log("-- release conn 1");
          callback();
        });
      },
      function(callback){
        pool.connectionsOpen.should.be.exactly(3);
        pool.connectionsInUse.should.be.exactly(2);
        conn2.should.be.ok;
        conn2.release( function(err){
          should.not.exist(err);
          //console.log("-- release conn 2");
          callback();
        });
      },
      function(callback){
        pool.connectionsOpen.should.be.exactly(3);
        pool.connectionsInUse.should.be.exactly(1);
        conn3.should.be.ok;
        conn3.release( function(err){
          should.not.exist(err);
          //console.log("-- release conn 3");
          callback();
        });
      },
      function(callback){
        setTimeout( function(){
          /* Sleep over poolTimeout time */
          //console.log("-- sleep over poolTimeout time");
          pool.connectionsOpen.should.be.exactly(3);
          pool.connectionsInUse.should.be.exactly(0);
          //console.log("-- 7s later");
          callback();
        }, 7000);
      },
      function(callback){
        pool.connectionsOpen.should.be.exactly(3);
        pool.connectionsInUse.should.be.exactly(0);
        pool.getConnection( function(err, conn){
          should.not.exist(err);
          conn.should.be.ok;
          conn4 = conn;
          //console.log("-- create conn 4");
          callback();
        });
      },
      function(callback){
        /*11g client timeout idle connctions as part of session release */
        //pool.connectionsOpen.should.be.exactly(3);
        
        /*12c client is done as part of get connection*/
        //pool.connectionsOpen.should.be.exactly(1);
         
        pool.connectionsInUse.should.be.exactly(1);
        conn4.should.be.ok;
        conn4.release( function(err){
          should.not.exist(err);
          pool.connectionsOpen.should.be.exactly(1);
          pool.connectionsInUse.should.be.exactly(0);
          //console.log("-- release conn 4");
          callback();
        });
      }
    ], done);
    
  })
    
})
