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
 *   62. lobProperties.js
 *
 * DESCRIPTION
 *   Testing getters and setters for LOB class.
 *   This test aims to increase the code coverage rate.
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
var fs       = require('fs');
var should = require('should');
var async = require('async');
var dbConfig = require('./dbconfig.js');

describe('62. lobProperties.js', function() {

	if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  var tableName = "oracledb_mylobs";
  var connection = null;
  var sqlSelect = "SELECT * FROM " + tableName + " WHERE id = :i";
  var defaultChunkSize = null;


  before('prepare table and LOB data', function(done) {
  		
  	var sqlCreateTab = 
  	    " BEGIN "  
  	  + "   DECLARE " 
      + "     e_table_exists EXCEPTION; " 
      + "     PRAGMA EXCEPTION_INIT(e_table_exists, -00942); "  
      + "   BEGIN " 
      + "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); "
      + "   EXCEPTION "
      + "     WHEN e_table_exists "
      + "     THEN NULL; "
      + "   END;  "
      + "   EXECUTE IMMEDIATE (' "
      + "     CREATE TABLE " + tableName + " ( "
      + "       id NUMBER, c CLOB, b BLOB "
      + "     ) " 
      + "   '); " 
      + " END; ";
  
    var sqlInsert = "INSERT INTO " + tableName + " VALUES (:i, EMPTY_CLOB(), EMPTY_BLOB()) " 
                     + " RETURNING c, b INTO :clob, :blob";

    var bindVar = 
       {
         i: 1,
         clob: { type: oracledb.CLOB, dir: oracledb.BIND_OUT },
         blob: { type: oracledb.BLOB, dir: oracledb.BIND_OUT }
       };
    var clobFileName = './test/clobexample.txt';
    var blobFileName = './test/fuzzydinosaur.jpg';

    async.series([
      function(cb) {
        oracledb.getConnection(credential, function(err, conn) {
          should.not.exist(err);
          connection = conn;
          cb();
        });
      },
      function(cb) {
        connection.execute(
          sqlCreateTab,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function insertLobData(cb) {
        connection.execute(
          sqlInsert,
          bindVar,
          function(err, result) {
            should.not.exist(err);
            
            var clob = result.outBinds.clob[0];
            var blob = result.outBinds.blob[0];
            var clobStream = fs.createReadStream(clobFileName);
            var blobStream = fs.createReadStream(blobFileName);

            clobStream.on('error', function(err) {
              should.not.exist(err);
            });

            blobStream.on('error', function(err) {
              should.not.exist(err);
            });

            clob.on('error', function(err) {
              should.not.exist(err);
            });

            blob.on('error', function(err) {
              should.not.exist(err);
            });

            async.parallel([
              function(callback) {
                clobStream.on('end', function() {
                  callback();
                });
              },
              function(callback) {
                blobStream.on('end', function() {
                  callback();
                });
              }
            ], function() {
              connection.commit( function(err) {
                should.not.exist(err);
                cb();
              });
            });

            clobStream.pipe(clob);
            blobStream.pipe(blob);
          }
        );
      },
      function saveDefaultChunkSize(cb) {
        connection.execute(
          sqlSelect,
          { i: 1 },
          function(err, result) {
            should.not.exist(err);
            var clob = result.rows[0][1];

            defaultChunkSize = clob.chunkSize;
            cb();
          }
        );
      }
    ], done);
  }) // before
  
  after(function(done) {
    
    async.series([
      function(cb) {
        connection.execute(
          "DROP TABLE " + tableName,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        connection.release( function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }) // after

  it('62.1 chunkSize (read-only)', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];
        
        var t1 = clob.chunkSize,
            t2 = blob.chunkSize;

        t1.should.be.a.Number;
        t2.should.be.a.Number;
        t1.should.eql(t2);
        defaultChunkSize = clob.chunkSize;

        try {
          clob.chunkSize = t1 + 1;
        } catch(err) {
          should.exist(err);
          // console.log(err.message);
          // Cannot assign to read only property 'chunkSize' of #<Lob>
        }
      
        try {
          blob.chunkSize = t2 + 1;
        } catch(err) {
          should.exist(err);
          // console.log(err.message);
          // Cannot assign to read only property 'chunkSize' of #<Lob>
        }
        done();
      }
    );
  }) // 62.1

  it('62.2 length (read-only)', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        var t1 = clob.length,
            t2 = blob.length;

        t1.should.be.a.Number;
        t2.should.be.a.Number;
        t1.should.not.eql(t2);

        try {
          clob.length = t1 + 1;
        } catch(err) {
          should.exist(err);
          //console.log(err.message);
          // Cannot set property length of #<Lob> which has only a getter
        }

        try {
          blob.length = t2 + 1;
        } catch(err) {
          should.exist(err);
          //console.log(err.message);
          // Cannot set property length of #<Lob> which has only a getter
        }
        done();
      }
    );
  }) // 62.2

  it('62.3 pieceSize -default value is chunkSize', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        var t1 = clob.pieceSize,
            t2 = blob.pieceSize;
        t1.should.eql(defaultChunkSize);
        t2.should.eql(defaultChunkSize);
        done();
      }
    );
  }) // 62.3

  it('62.4 pieceSize - can be increased', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        var newValue = clob.pieceSize * 5;

        clob.pieceSize = clob.pieceSize * 5;
        blob.pieceSize = blob.pieceSize * 5;

        (clob.pieceSize).should.eql(newValue);
        (blob.pieceSize).should.eql(newValue);

        // Remember to restore the value
        clob.pieceSize = defaultChunkSize;
        blob.pieceSize = defaultChunkSize;

        done();
      }
    );
  }) // 62.4

  it('62.5 pieceSize - can be decreased', function(done) {
    if (defaultChunkSize <= 500) {
      console.log('As default chunkSize is too small, this case is not applicable');
      done();
    } else {
      connection.execute(
        sqlSelect,
        { i: 1 },
        function(err, result) {
          should.not.exist(err);
          var clob = result.rows[0][1],
              blob = result.rows[0][2];

          var newValue = clob.pieceSize - 500;
  
          clob.pieceSize -= 500;
          blob.pieceSize -= 500;
          (clob.pieceSize).should.eql(newValue);
          (blob.pieceSize).should.eql(newValue);

          // Restore
          clob.pieceSize = defaultChunkSize;
          blob.pieceSize = defaultChunkSize;

          done();
        }
      );
    }
  }) // 62.5

  it('62.6 pieceSize - can be zero', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        clob.pieceSize = 0;
        blob.pieceSize = 0;

        (clob.pieceSize).should.eql(0);
        (blob.pieceSize).should.eql(0);

        // Remember to restore the value
        clob.pieceSize = defaultChunkSize;
        blob.pieceSize = defaultChunkSize;

        done();
      }
    );
  }) // 62.6

  it('62.7 pieceSize - cannot be less than zero', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        try {
          clob.pieceSize = -100;
        } catch(err) {
          should.exist(err);
          (err.message).should.startWith('NJS-004');
          // NJS-004: invalid value for property pieceSize
        }

        // Remember to restore the value
        clob.pieceSize = defaultChunkSize;
        blob.pieceSize = defaultChunkSize;

        done();
      }
    );
  }) // 62.7

  it('62.8 pieceSize - cannot be null', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        try {
          clob.pieceSize = null;
        } catch(err) {
          should.exist(err);
          (err.message).should.startWith('NJS-004');
          // NJS-004: invalid value for property pieceSize
        }

        // Remember to restore the value
        clob.pieceSize = defaultChunkSize;
        blob.pieceSize = defaultChunkSize;

        done();
      }
    );
  }) // 62.8

  it('62.9 pieceSize - must be a number', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        try {
          clob.pieceSize = NaN;
        } catch(err) {
          should.exist(err);
          (err.message).should.startWith('NJS-004');
          // NJS-004: invalid value for property pieceSize
        }

        // Remember to restore the value
        clob.pieceSize = defaultChunkSize;
        blob.pieceSize = defaultChunkSize;

        done();
      }
    );
  }) // 62.9

  it('62.10 type (read-only)', function(done) {
    connection.execute(
      sqlSelect,
      { i: 1 },
      function(err, result) {
        should.not.exist(err);
        var clob = result.rows[0][1],
            blob = result.rows[0][2];

        var t1 = clob.type,
            t2 = blob.type;

        t1.should.eql(oracledb.CLOB);
        t2.should.eql(oracledb.BLOB);

        try {
          clob.type = t2;
        } catch(err) {
          should.exist(err);
          // console.log(err);
          // [TypeError: Cannot set property type of #<Lob> which has only a getter]
        }

        try {
          blob.type = t1;
        } catch(err) {
          should.exist(err);
          // console.log(err);
          // [TypeError: Cannot set property type of #<Lob> which has only a getter]
        }

        done();
      }
    );
  }) // 62.10
})
