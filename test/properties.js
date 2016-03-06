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
 *   58. properties.js
 *
 * DESCRIPTION
 *   Testing getters and setters for oracledb and pool classes.
 *   This test aims to increase the code coverage rate.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests 
 * 
 *****************************************************************************/
"use strict"

var oracledb = require('oracledb');
var fs       = require('fs');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('58. properties.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  describe('58.1 Oracledb Class', function() {
    
    var defaultValues = {};

    before('save the default values', function() {
      defaultValues.poolMin         = oracledb.poolMin;
      defaultValues.poolMax         = oracledb.poolMax;
      defaultValues.poolIncrement   = oracledb.poolIncrement;
      defaultValues.poolTimeout     = oracledb.poolTimeout;
      defaultValues.maxRows         = oracledb.maxRows;
      defaultValues.prefetchRows    = oracledb.prefetchRows;
      defaultValues.autoCommit      = oracledb.autoCommit;
      defaultValues.version         = oracledb.version;
      defaultValues.connClass       = oracledb.connClass;
      defaultValues.externalAuth    = oracledb.externalAuth;
      defaultValues.fetchAsString   = oracledb.fetchAsString;
      defaultValues.outFormat       = oracledb.outFormat;
      defaultValues.lobPrefetchSize = oracledb.lobPrefetchSize;   
    })

    after('restore the values', function() {
      oracledb.poolMin          = defaultValues.poolMin;        
      oracledb.poolMax          = defaultValues.poolMax;        
      oracledb.poolIncrement    = defaultValues.poolIncrement;  
      oracledb.poolTimeout      = defaultValues.poolTimeout;    
      oracledb.maxRows          = defaultValues.maxRows;        
      oracledb.prefetchRows     = defaultValues.prefetchRows;   
      oracledb.autoCommit       = defaultValues.autoCommit;     
      // oracledb.version          = defaultValues.version;         // version is a read-only property. it needn't to restore.
      oracledb.connClass        = defaultValues.connClass;      
      oracledb.externalAuth     = defaultValues.externalAuth;   
      oracledb.fetchAsString    = defaultValues.fetchAsString;  
      oracledb.outFormat        = defaultValues.outFormat;      
      oracledb.lobPrefetchSize  = defaultValues.lobPrefetchSize;
    })
   
    it('58.1.1 poolMin', function() {
      var t = oracledb.poolMin;
      oracledb.poolMin = t + 1;

      t.should.eql(defaultValues.poolMin);
      (oracledb.poolMin).should.eql(defaultValues.poolMin + 1);
    })

    it('58.1.2 poolMax', function() {
      var t = oracledb.poolMax;
      oracledb.poolMax = t + 1;

      t.should.eql(defaultValues.poolMax);
      (oracledb.poolMax).should.eql(defaultValues.poolMax + 1);
    })

    it('58.1.3 poolIncrement', function() {
      var t = oracledb.poolIncrement;
      oracledb.poolIncrement = t + 1;

      t.should.eql(defaultValues.poolIncrement);
      (oracledb.poolIncrement).should.eql(defaultValues.poolIncrement + 1);
    })

    it('58.1.4 poolTimeout', function() {
      var t = oracledb.poolTimeout;
      oracledb.poolTimeout = t + 1;

      t.should.eql(defaultValues.poolTimeout);
      (oracledb.poolTimeout).should.eql(defaultValues.poolTimeout + 1);
    })

    it('58.1.5 maxRows', function() {
      var t = oracledb.maxRows;
      oracledb.maxRows = t + 1;

      t.should.eql(defaultValues.maxRows);
      (oracledb.maxRows).should.eql(defaultValues.maxRows + 1);
    })

    it('58.1.6 prefetchRows', function() {
      var t = oracledb.prefetchRows;
      oracledb.prefetchRows = t + 1;

      t.should.eql(defaultValues.prefetchRows);
      (oracledb.prefetchRows).should.eql(defaultValues.prefetchRows + 1);
    })

    it('58.1.7 autoCommit', function() {
      var t = oracledb.autoCommit;
      oracledb.autoCommit = !t;

      t.should.eql(defaultValues.autoCommit);
      (oracledb.autoCommit).should.eql( !defaultValues.autoCommit );
    })

    it('58.1.8 version (read-only)', function() {
      (oracledb.version).should.be.a.Number;
      
      try {
        oracledb.version = 5;
      } catch(err) {
        should.exist(err);
        // console.log(err.message);
        (err.message).should.startWith('NJS-014');
      }
    })

    it('58.1.9 connClass', function() {
      oracledb.connClass = "cc";
      (oracledb.connClass).should.be.a.String;
    })

    it('58.1.10 externalAuth', function() {
      var t = oracledb.externalAuth;
      oracledb.externalAuth = !t;

      t.should.eql(defaultValues.externalAuth);
      (oracledb.externalAuth).should.eql( !defaultValues.externalAuth );
    })

    it('58.1.11 fetchAsString', function() {
      var t = oracledb.fetchAsString;
      oracledb.fetchAsString = [oracledb.DATE];

      t.should.eql(defaultValues.fetchAsString);
      (oracledb.fetchAsString).should.not.eql(defaultValues.fetchAsString);
    })

    it('58.1.12 outFormat', function() {
      var t = oracledb.outFormat;
      oracledb.outFormat = oracledb.OBJECT;

      t.should.eql(oracledb.ARRAY);
      (oracledb.outFormat).should.not.eql(defaultValues.outFormat);
    })

    it('58.1.13 lobPrefetchSize', function() {
      var t = oracledb.lobPrefetchSize;
      oracledb.lobPrefetchSize = t + 1;

      t.should.eql(defaultValues.lobPrefetchSize);
      (oracledb.lobPrefetchSize).should.eql(defaultValues.lobPrefetchSize + 1);
    })

    it('58.1.14 oracleClientVersion (read-only)', function () {
      var t = oracledb.oracleClientVersion ;
      t.should.be.a.Number;

      try {
        oracledb.oracleClientVersion = t + 1;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      }
    } );

  }) // 58.1

  describe('58.2 Pool Class', function() {
    var pool = null;

    before(function(done) {
      oracledb.createPool(
        dbConfig,
        function(err, p) {
          should.not.exist(err);
          pool = p;
          done();
        }
      );
    })

    after(function(done) {
      pool.terminate(function(err) {
        should.not.exist(err);
        done();
      });
    })

    it('58.2.1 poolMin', function() {
      var t = pool.poolMin;
      t.should.be.a.Number;

      try {
        pool.poolMin = t + 1;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      } 
    })

    it('58.2.2 poolMax', function() {
      var t = pool.poolMax;
      t.should.be.a.Number;

      try {
        pool.poolMax = t + 1;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      }
    })

    it('58.2.3 poolIncrement', function() {
      var t = pool.poolIncrement;
      t.should.be.a.Number;

      try {
        pool.poolIncrement = t + 1;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      }
    })

    it('58.2.4 poolTimeout', function() {
      var t = pool.poolTimeout;
      t.should.be.a.Number;

      try {
        pool.poolTimeout = t + 1;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      }
    })

    it('58.2.5 stmtCacheSize', function() {
      var t = pool.stmtCacheSize;
      t.should.be.a.Number;

      try {
        pool.stmtCacheSize = t + 1;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      }
    })
  }) // 58.2

  describe('58.3 Connection Class', function() {
    var connection = null;

    before('get one connection', function(done) {
      oracledb.getConnection(credential, function(err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
      });
    })

    after('release connection', function(done) {
      connection.release( function(err) {
        should.not.exist(err);
        done();
      });
    })

    it('58.3.1 Connection object initial toString values', function() {
      connection.should.be.an.Object;

      should.equal(connection.action, null);
      should.equal(connection.module, null);
      should.equal(connection.clientId, null);

      (connection.stmtCacheSize).should.be.a.Number;
      (connection.stmtCacheSize).should.be.greaterThan(0);
    })

    it('58.3.2 stmtCacheSize (read-only)', function() {
      var t = connection.stmtCacheSize;
      t.should.be.a.Number;

      try {
        connection.stmtCacheSize = t + 1;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      }
    })

    it('58.3.3 clientId (write-only)', function() {
      try {
        var t = connection.clientId;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-015'); // write-only
      }

      try {
        connection.clientId = 4;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004');  // invalid value
      }

      connection.clientId = "103.3";
    })

    it('58.3.4 action (write-only)', function() {
      
      try {
        var t = connection.action;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-015');
      }

      try {
        connection.action = 4;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004');  // invalid value
      }

      connection.action = "103.3 action";
    })

    it('58.3.5 module (write-only)', function() {
   
      try {
        var t = connection.module;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-015');
      }   

      try {
        connection.module = 4;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004');  // invalid value
      }
      
      connection.module = "103.3 module";
    })

    it('58.3.6 oracleServerVersion (read-only)', function () {
      var t = connection.oracleServerVersion;
      t.should.be.a.Number;

      try {
        connection.oracleServerVersion = t + 1;
      }
      catch (err) {
        should.exist ( err );
        (err.message).should.startWith('NJS-014');
      }
    });

  }) // 58.3

  describe('58.4 ResultSet Class', function() {
    
    var tableName = "oracledb_number";
    var numbers = assist.data.numbers;
    var connection = null;
    var resultSet = null;

    before('get resultSet class', function(done) {
      async.series([
        function(callback) {
          oracledb.getConnection(credential, function(err, conn) {
            should.not.exist(err);
            connection = conn;
            callback();
          });
        },
        function(callback) {
          assist.setUp(connection, tableName, numbers, callback);
        },
        function(callback) {
          connection.execute(
            "SELECT * FROM " + tableName,
            [],
            { resultSet: true, outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);
              resultSet = result.resultSet;
              callback();
            }
          );
        }
      ], done);
    })

    after( function(done) {
      connection.execute(
        "DROP TABLE " + tableName,
        function(err) {
          should.not.exist(err);
          
          connection.release( function(err) {
            should.not.exist(err);
            done();
          });
        }
      );
    })

    it('58.4.1 metaData (read-only)', function() {
      should.exist(resultSet.metaData);
      var t = resultSet.metaData;
      t.should.eql( [ { name: 'NUM' }, { name: 'CONTENT' } ] );
      
      try {
        resultSet.metaData = {"foo": "bar"};
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-014');
      } 
    })

  }) // 58.5
})
