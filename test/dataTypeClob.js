/* Copyright (c) 2015, 2016 Oracle and/or its affiliates. All rights reserved. */

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
 *   40. dataTypeClob.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB. 
 *    This test corresponds to example files: 
 *         clobinsert1.js, clobstream1.js and clobstream2.js
 *    Firstly, reads text from clobexample.txt and INSERTs it into a CLOB column.
 *    Secondly, SELECTs a CLOB and pipes it to a file, clobstreamout.txt 
 *    Thirdly, SELECTs the CLOB and compares it with the content in clobexample.txt.
 *    Fourthly, query the CLOB with Object outFormat.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests  
 * 
 *****************************************************************************/
"use strict";

var oracledb = require('oracledb');
var fs       = require('fs');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

var inFileName = './test/clobexample.txt';  // the file with text to be inserted into the database
var outFileName = './test/clobstreamout.txt';

describe('40. dataTypeClob.js', function() {
  this.timeout(15000);  

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_myclobs";

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

  describe('40.1 testing CLOB data type', function() {
    before('create table', function(done) {
      assist.createTable(connection, tableName, done);
    })

    after(function(done) {
      connection.execute(
        "DROP table " + tableName,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    })

    it('40.1.1 stores CLOB value correctly', function(done) {
      connection.should.be.ok;
      async.series([
        function clobinsert1(callback) {

          var lobFinishEventFired = false;
          setTimeout( function() {
            lobFinishEventFired.should.equal(true, "lob does not fire 'finish' event!");
            callback();
          }, 2000);

          connection.execute(
            "INSERT INTO oracledb_myclobs (num, content) VALUES (:n, EMPTY_CLOB()) RETURNING content INTO :lobbv",
            { n: 1, lobbv: {type: oracledb.CLOB, dir: oracledb.BIND_OUT} },
            { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
            function(err, result) {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
              (result.outBinds.lobbv.length).should.be.exactly(1);

              var inStream = fs.createReadStream(inFileName);
              var lob = result.outBinds.lobbv[0];

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event");
              });

              inStream.on('error', function(err) {
                should.not.exist(err, "inStream.on 'error' event");
              });

              lob.on('finish', function() {
                lobFinishEventFired = true;
                // now commit updates
                connection.commit( function(err) {
                  should.not.exist(err);
                });
              });

              inStream.pipe(lob); // copies the text to the CLOB
            }
          );
        },
        function clobstream1(callback) {
          var streamFinishEventFired = false;
          setTimeout( function() {
            streamFinishEventFired.should.equal(true, "stream does not call 'Finish' Event!");
            callback();
          }, 2000);

          connection.execute(
            "SELECT content FROM oracledb_myclobs WHERE num = :n",
            { n: 1 },
            function(err, result) {
              should.not.exist(err);

              var lob = result.rows[0][0];
              should.exist(lob);
              lob.setEncoding('utf8');

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event");
              });

              var outStream = fs.createWriteStream(outFileName);
              outStream.on('error', function(err) {
                should.not.exist(err, "outStream.on 'error' event");
              });

              lob.pipe(outStream);

              outStream.on('finish', function() {
                
                fs.readFile( inFileName, { encoding: 'utf8' }, function(err, originalData) {
                  should.not.exist(err);
                  
                  fs.readFile( outFileName, { encoding: 'utf8' }, function(err, generatedData) {
                    should.not.exist(err);
                    originalData.should.equal(generatedData);

                    streamFinishEventFired = true;
                  });
                });
              });
            }
          );
        },
        function clobstream2(callback) {
          var lobEndEventFired = false;
          var lobDataEventFired = false;
          setTimeout( function(){
            lobDataEventFired.should.equal(true, "lob does not call 'data' event!");
            lobEndEventFired.should.equal(true, "lob does not call 'end' event!");
            callback();
          }, 2000);

          connection.execute(
            "SELECT content FROM oracledb_myclobs WHERE num = :n",
            { n: 1 },
            function(err, result) {
              should.not.exist(err);

              var clob = '';
              var lob = result.rows[0][0];
              should.exist(lob);
              lob.setEncoding('utf8'); // set the encoding so we get a 'string' not a 'buffer'
              
              lob.on('data', function(chunk) {
                // console.log("lob.on 'data' event");
                // console.log('  - got %d bytes of data', chunk.length);
                lobDataEventFired = true;
                clob += chunk;
              });

              lob.on('end', function() {
                fs.readFile( inFileName, { encoding: 'utf8' }, function(err, data) {
                  should.not.exist(err);
                  lobEndEventFired = true;
                  
                  data.length.should.be.exactly(clob.length);
                  data.should.equal(clob);
                });
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event");
              });
            }
          );
        },
        function objectOutFormat(callback) {
          var lobEndEventFired = false;
          var lobDataEventFired = false;
          setTimeout( function(){
            lobDataEventFired.should.equal(true, "lob does not call 'data' event!");
            lobEndEventFired.should.equal(true, "lob does not call 'end' event!");
            callback();
          }, 2000);

          connection.execute(
            "SELECT content FROM oracledb_myclobs WHERE num = :n",
            { n: 1 },
            { outFormat: oracledb.OBJECT },
            function(err, result) {
              should.not.exist(err);

              var clob = '';
              var row = result.rows[0];
              var lob = row['CONTENT'];

              lob.setEncoding('utf8');

              lob.on('data', function(chunk) {
                lobDataEventFired = true;
                clob += chunk;
              });

              lob.on('end', function() {
                lobEndEventFired = true;
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event");
              });
            }
          );
        }
      ], done);  // async
     
    }) // 40.1.1

  }) // 40.1

  describe('40.2 stores null value correctly', function() {
    it('40.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })

})
