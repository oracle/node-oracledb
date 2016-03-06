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
 *   41. dataTypeBlob.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - BLOB. 
 *    This test corresponds to example files: 
 *         blobinsert1.js, blobstream1.js and blobstream2.js
 *    Firstly, Loads an image data and INSERTs it into a BLOB column.
 *    Secondly, SELECTs the BLOB and pipes it to a file, blobstreamout.jpg 
 *    Thirdly, SELECTs the BLOB and compares it with the original image
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
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

var inFileName = './test/fuzzydinosaur.jpg';  // contains the image to be inserted
var outFileName = './test/blobstreamout.jpg';

describe('41. dataTypeBlob', function() {
  this.timeout(10000);

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  var connection = null;
  var tableName = "oracledb_myblobs";

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

  describe('41.1 testing BLOB data type', function() {
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

    it('41.1.1 stores BLOB value correctly', function(done) {
      connection.should.be.ok;
      async.series([
        function blobinsert1(callback) {
          
          var lobFinishEventFired = false;
          setTimeout( function() {
            lobFinishEventFired.should.equal(true, "lob does not call 'finish' event!")
            callback();
          }, 2000);

          connection.execute(
            "INSERT INTO oracledb_myblobs (num, content) VALUES (:n, EMPTY_BLOB()) RETURNING content INTO :lobbv",
            { n: 2, lobbv: {type: oracledb.BLOB, dir: oracledb.BIND_OUT} },
            { autoCommit: false },  // a transaction needs to span the INSERT and pipe()
            function(err, result) {
              should.not.exist(err);
              (result.rowsAffected).should.be.exactly(1);
              (result.outBinds.lobbv.length).should.be.exactly(1);
              
              var inStream = fs.createReadStream(inFileName);
              inStream.on('error', function(err) {
                should.not.exist(err, "inStream.on 'end' event");
              });

              var lob = result.outBinds.lobbv[0];

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event");
              });

              inStream.pipe(lob);  // pipes the data to the BLOB

              lob.on('finish', function() {
                lobFinishEventFired = true;
                // now commit updates
                connection.commit(function(err) {
                  should.not.exist(err);
                });
              });

            }
          );
        },
        function blobstream1(callback) {
          var streamFinishEventFired = false;
          setTimeout( function() {
            streamFinishEventFired.should.equal(true, "stream does not call 'finish' Event!");
            callback();
          }, 2000);

          connection.execute(
            "SELECT content FROM oracledb_myblobs WHERE num = :n",
            { n: 2 },
            function(err, result) {
              should.not.exist(err);

              var lob = result.rows[0][0];
              should.exist(lob);

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event");
              });

              var outStream = fs.createWriteStream(outFileName);

              outStream.on('error', function(err) {
                should.not.exist(err, "outStream.on 'error' event");
              });

              lob.pipe(outStream);
              outStream.on('finish', function() {
                fs.readFile( inFileName, function(err, originalData) {
                  should.not.exist(err);
                  
                  fs.readFile( outFileName, function(err, generatedData) {
                    should.not.exist(err);
                    originalData.should.eql(generatedData);

                    streamFinishEventFired = true;
                  });
                });

              }); // finish event
            }
          );
        },
        function blobstream2(callback) {
          var lobEndEventFired = false;
          var lobDataEventFired = false;
          setTimeout( function(){
            lobDataEventFired.should.equal(true, "lob does not call 'data' event!");
            lobEndEventFired.should.equal(true, "lob does not call 'end' event!");
            callback();
          }, 2000);

          connection.execute(
            "SELECT content FROM oracledb_myblobs WHERE num = :n",
            { n: 2 },
            function(err, result) {
              should.not.exist(err);
              
              var blob = Buffer(0);
              var blobLength = 0;
              var lob = result.rows[0][0];

              should.exist(lob);

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event");
              });

              lob.on('data', function(chunk) {
                // console.log("lob.on 'data' event");
                // console.log('  - got %d bytes of data', chunk.length);
                lobDataEventFired = true;
                blobLength = blobLength + chunk.length;
                blob = Buffer.concat([blob, chunk], blobLength);
              });
              
              lob.on('end', function() {
                fs.readFile( inFileName, function(err, data) {
                  should.not.exist(err);
                  lobEndEventFired = true;
                  
                  data.length.should.be.exactly(blob.length);
                  data.should.eql(blob);
                });
              });  // end event

            }
          );
        }
      ], done);
    }) // 41.1.1
  }) //41.1

  describe('41.2 stores null value correctly', function() {
    it('41.2.1 testing Null, Empty string and Undefined', function(done) {
      assist.verifyNullValues(connection, tableName, done);
    })
  })

})
