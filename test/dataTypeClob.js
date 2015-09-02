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
 *   40. dataTypeClob.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB. 
 *    This test corresponds to example files: 
 *         clobinsert1.js, clobstream1.js and clobstream2.js
 *    Firstly, reads text from clobexample.txt and INSERTs it into a CLOB column.
 *    Secondly, SELECTs a CLOB and pipes it to a file, clobstreamout.txt 
 *    Thirdly, SELECTs the CLOB and compares it with the content in clobexample.txt 
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests  
 * 
 *****************************************************************************/
 
var oracledb = require('oracledb');
var fs       = require('fs');
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbConfig.js');
var assist   = require('./dataTypeAssist.js');

var inFileName = './test/clobexample.txt';  // the file with text to be inserted into the database
var outFileName = './test/clobstreamout.txt';

describe('40. dataTypeClob.js', function() {

  this.timeout(10000);  
  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }
  
  var connection = null;
  var tableName = "oracledb_myclobs";
  var sqlCreate = 
        "BEGIN " +
           "   DECLARE " +
           "       e_table_exists EXCEPTION; " +
           "       PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
           "   BEGIN " +
           "       EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); " +
           "   EXCEPTION " +
           "       WHEN e_table_exists " +
           "       THEN NULL; " +
           "   END; " +
           "   EXECUTE IMMEDIATE (' " +
           "       CREATE TABLE " + tableName +" ( " +
           "           num NUMBER, " + 
           "           content CLOB "  +
           "       )" +
           "   '); " +
           "END; ";

  before(function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      if(err) { console.error(err.message); return; }
      connection = conn;
      conn.execute(
        sqlCreate,
        function(err) {
          if(err) { console.error(err.message); return; }
          done();
        }
      );
    });
  })

  after( function(done){
    connection.execute(
      "DROP table " + tableName,
      function(err) {
        if(err) { console.error(err.message); return; }
        connection.release( function(err) {
          if(err) { console.error(err.message); return; }
          done();
        });
      }
    );
  })

  it('40.1 processes null value correctly', function(done) {
    assist.nullValueSupport(connection, tableName, done);
  })

  it('40.2 stores CLOB value correctly', function(done) {
    connection.should.be.ok;
    async.series([
      function clobinsert1(callback) {
        var streamEndEventFired = false;
        setTimeout( function() {
          streamEndEventFired.should.equal(true, "inStream does not call 'end' event!")
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
              should.not.exist(err, "inStream.on 'end' event");
            });

            inStream.on('end', function() {
              streamEndEventFired = true;
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
              should.not.exist(err, "lob.on 'end' event");
            });

            var outStream = fs.createWriteStream(outFileName);
            outStream.on('error', function(err) {
              should.not.exist(err, "outStream.on 'end' event");
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
            })
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
              should.not.exist(err, "lob.on 'end' event");
            });
          }
        );
      }
    ], done);
   
  })
})
