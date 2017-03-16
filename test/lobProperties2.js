/* Copyright (c) 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   79. lobProperties2.js
 *
 * DESCRIPTION
 *   Testing the properties of LOB that created by createLob().
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
var dbConfig = require('./dbconfig.js');

describe("79. lobProperties2.js", function() {

  var connection;

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  }); // before

  after(function(done) {
    connection.close(function(err) {
      should.not.exist(err);
      done();
    });
  });

  var checkChunkSize = function(type, callback) {

    connection.createLob(type, function(err, lob) {
      should.not.exist(err);

      var t = lob.chunkSize;
      t.should.be.a.Number();

      try {
        lob.chunkSize = t + 1;
      } catch(err) {
        should.exist(err);
        // Cannot assign to read only property 'chunkSize' of object '#<Lob>'
      }

      lob.close(function(err) {
        should.not.exist(err);
        return callback();
      });

    });
  }; // checkChunkSize

  it("79.1 CLOB: chunkSize (read-only)", function(done) {
    checkChunkSize(oracledb.CLOB, done);
  });

  it("79.2 BLOB: chunkSize (read-only)", function(done) {
    checkChunkSize(oracledb.BLOB, done);
  });

  var checkLength = function(type, callback) {

    connection.createLob(type, function(err, lob) {
      should.not.exist(err);

      var t = lob.length;
      t.should.be.a.Number();

      try {
        lob.length = t + 1;
      } catch(err) {
        should.exist(err);
        // Cannot set property length of #<Lob> which has only a getter
      }

      lob.close(function(err) {
        should.not.exist(err);
        return callback();
      });
    });
  }; // checkLength

  it("79.3 CLOB: length (read-only)", function(done) {
    checkLength(oracledb.CLOB, done);
  });

  it("79.4 BLOB: length (read-only)", function(done) {
    checkLength(oracledb.BLOB, done);
  });

  var checkType = function(lobtype, callback) {

    connection.createLob(lobtype, function(err, lob) {
      should.not.exist(err);

      var t = lob.type;
      t.should.eql(lobtype);

      try {
        lob.type = oracledb.BUFFER;
      } catch(err) {
        should.exist(err);
        // Cannot set property type of #<Lob> which has only a getter
      }

      lob.close(function(err) {
        should.not.exist(err);
        return callback();
      });
    });
  }; // checkType

  it("79.5 CLOB: type (read-only)", function(done) {
    checkType(oracledb.CLOB, done);
  });

  it("79.6 BLOB: type (read-only)", function(done) {
    checkType(oracledb.CLOB, done);
  });

  describe("79.7 pieceSize", function() {

    var defaultChunkSize;
    var clob, blob;

    before("get the lobs", function(done) {
      async.parallel([
        function(cb) {
          connection.createLob(oracledb.CLOB, function(err, lob) {
            should.not.exist(err);

            clob = lob;
            defaultChunkSize = clob.chunkSize;
            cb();
          });
        },
        function(cb) {
          connection.createLob(oracledb.BLOB, function(err, lob) {
            should.not.exist(err);

            blob = lob;
            cb();
          });
        }
      ], done);
    }); // before

    after("close the lobs", function(done) {
      async.parallel([
        function(cb) {
          clob.close(cb);
        },
        function(cb) {
          blob.close(cb);
        }
      ], done);
    }); // after

    it("79.7.1 default value is chunkSize", function(done) {
      var t1 = clob.pieceSize,
        t2 = blob.pieceSize;

      t1.should.eql(defaultChunkSize);
      t2.should.eql(defaultChunkSize);
      done();
    });

    it("79.7.2 can be increased", function(done) {
      var newValue = clob.pieceSize * 5;

      clob.pieceSize = clob.pieceSize * 5;
      blob.pieceSize = blob.pieceSize * 5;

      (clob.pieceSize).should.eql(newValue);
      (blob.pieceSize).should.eql(newValue);

      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("79.7.3 can be decreased", function(done) {
      if (defaultChunkSize <= 500) {
        console.log('As default chunkSize is too small, this case is not applicable');
      } else {
        var newValue = clob.pieceSize - 500;

        clob.pieceSize -= 500;
        blob.pieceSize -= 500;
        (clob.pieceSize).should.eql(newValue);
        (blob.pieceSize).should.eql(newValue);

        // Restore
        clob.pieceSize = defaultChunkSize;
        blob.pieceSize = defaultChunkSize;
      }
      return done();
    });

    it("79.7.4 can be zero", function(done) {
      clob.pieceSize = 0;
      blob.pieceSize = 0;

      (clob.pieceSize).should.eql(0);
      (blob.pieceSize).should.eql(0);

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("79.7.5 cannot be less than zero", function(done) {
      try {
        clob.pieceSize = -100;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004:');
        // NJS-004: invalid value for property pieceSize
      }

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("79.7.6 cannot be null", function(done) {
      try {
        clob.pieceSize = null;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004:');
        // NJS-004: invalid value for property pieceSize
      }

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("79.7.7 must be a number", function(done) {
      try {
        clob.pieceSize = NaN;
      } catch(err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004:');
        // NJS-004: invalid value for property pieceSize
      }

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });
  }); // 79.7

});
