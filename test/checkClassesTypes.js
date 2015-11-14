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
 *   61. checkClassesTypes.js
 *
 * DESCRIPTION
 *
 *   Check the types of all the classes we defined.
 * 
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests  
 * 
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbConfig.js');

describe('61. checkClassesTypes.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  it('61.1 Oracledb class', function() {
    var type = Object.prototype.toString.call(oracledb);
    type.should.eql('[object Oracledb]');
  })

  it('61.2 Connection class', function(done) {
    async.waterfall(
      [
        function(callback) 
        {
          oracledb.getConnection(credential, callback);
        },
        function(connection, callback) 
        {
          var type = Object.prototype.toString.call(connection);
          type.should.eql('[object Connection]');
          callback(null, connection);
        },
        function(connection, callback)
        {
          connection.release( callback );
        }
      ],
      function(err) 
      {
        should.not.exist(err);
        done();
      }
    );
  })

  it('61.3 Lob Class', function(done) {
    var connection = null,
        clob = null,
        blob = null;
    
    var clobTableName = "oracledb_myclobs";
    var blobTableName = "oracledb_myblobs";
    
    async.series([
      function(callback) {
        oracledb.getConnection(credential, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          callback();
        });
      },
      function(callback) {
        callback();
      },
      function(callback) {
        connection.release( function(err) {
          should.not.exist(err);
          callback();
        });
      }
    ], done);
  })
})

