/* Copyright (c) 2016, 2022, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   83. lobProperties2.js
 *
 * DESCRIPTION
 *   Testing the properties of LOB that created by createLob().
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const should   = require('should');
const async    = require('async');
const dbConfig = require('./dbconfig.js');

describe("83. lobProperties2.js", function() {

  let connection;

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

  const checkChunkSize = function(type, callback) {

    connection.createLob(type, function(err, lob) {
      should.not.exist(err);

      const t = lob.chunkSize;
      t.should.be.a.Number();

      try {
        lob.chunkSize = t + 1;
      } catch (err) {
        should.exist(err);
        // Cannot assign to read only property 'chunkSize' of object '#<Lob>'
      }

      lob.close(function(err) {
        should.not.exist(err);
        return callback();
      });

    });
  }; // checkChunkSize

  it("83.1 CLOB: chunkSize (read-only)", function(done) {
    checkChunkSize(oracledb.CLOB, done);
  });

  it("83.2 BLOB: chunkSize (read-only)", function(done) {
    checkChunkSize(oracledb.BLOB, done);
  });

  const checkLength = function(type, callback) {

    connection.createLob(type, function(err, lob) {
      should.not.exist(err);

      const t = lob.length;
      t.should.be.a.Number();

      try {
        lob.length = t + 1;
      } catch (err) {
        should.exist(err);
        // Cannot set property length of #<Lob> which has only a getter
      }

      lob.close(function(err) {
        should.not.exist(err);
        return callback();
      });
    });
  }; // checkLength

  it("83.3 CLOB: length (read-only)", function(done) {
    checkLength(oracledb.CLOB, done);
  });

  it("83.4 BLOB: length (read-only)", function(done) {
    checkLength(oracledb.BLOB, done);
  });

  const checkType = function(lobtype, callback) {

    connection.createLob(lobtype, function(err, lob) {
      should.not.exist(err);

      const t = lob.type;
      t.should.eql(lobtype);

      try {
        lob.type = oracledb.BUFFER;
      } catch (err) {
        should.exist(err);
        // Cannot set property type of #<Lob> which has only a getter
      }

      lob.close(function(err) {
        should.not.exist(err);
        return callback();
      });
    });
  }; // checkType

  it("83.5 CLOB: type (read-only)", function(done) {
    checkType(oracledb.CLOB, done);
  });

  it("83.6 BLOB: type (read-only)", function(done) {
    checkType(oracledb.CLOB, done);
  });

  describe("83.7 pieceSize", function() {

    let defaultChunkSize;
    let clob, blob;

    before("get the lobs", function(done) {
      async.series([
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
      async.series([
        function(cb) {
          clob.close(cb);
        },
        function(cb) {
          blob.close(cb);
        }
      ], done);
    }); // after

    it("83.7.1 default value is chunkSize", function(done) {
      const t1 = clob.pieceSize,
        t2 = blob.pieceSize;

      t1.should.eql(defaultChunkSize);
      t2.should.eql(defaultChunkSize);
      done();
    });

    it("83.7.2 can be increased", function(done) {
      const newValue = clob.pieceSize * 5;

      clob.pieceSize = clob.pieceSize * 5;
      blob.pieceSize = blob.pieceSize * 5;

      (clob.pieceSize).should.eql(newValue);
      (blob.pieceSize).should.eql(newValue);

      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("83.7.3 can be decreased", function(done) {
      if (defaultChunkSize <= 500) {
        console.log('As default chunkSize is too small, this case is not applicable');
      } else {
        const newValue = clob.pieceSize - 500;

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

    it("83.7.4 can be zero", function(done) {
      clob.pieceSize = 0;
      blob.pieceSize = 0;

      (clob.pieceSize).should.eql(0);
      (blob.pieceSize).should.eql(0);

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("83.7.5 cannot be less than zero", function(done) {
      try {
        clob.pieceSize = -100;
      } catch (err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004:');
        // NJS-004: invalid value for property pieceSize
      }

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("83.7.6 cannot be null", function(done) {
      try {
        clob.pieceSize = null;
      } catch (err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004:');
        // NJS-004: invalid value for property pieceSize
      }

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });

    it("83.7.7 must be a number", function(done) {
      try {
        clob.pieceSize = NaN;
      } catch (err) {
        should.exist(err);
        (err.message).should.startWith('NJS-004:');
        // NJS-004: invalid value for property pieceSize
      }

      // Remember to restore the value
      clob.pieceSize = defaultChunkSize;
      blob.pieceSize = defaultChunkSize;

      done();
    });
  }); // 83.7

});
