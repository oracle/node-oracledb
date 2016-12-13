/* Copyright (c) 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   72. lobBind2.js
 *
 * DESCRIPTION
 *   Testing connection.createLob() function.
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
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe("72. lobBind2.js", function() {

  var connection = null;
  var node6plus  = false; // assume node runtime version is lower than 6

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;

      // Check whether node runtime version is >= 6 or not
      if ( process.versions["node"].substring (0, 1) >= "6")
        node6plus = true;

      done();
    });
  }); // before

  after(function(done) {
    connection.release(function(err) {
      should.not.exist(err);
      done();
    });
  }); // after

  var executeSQL = function(sql, callback) {
    connection.execute(
      sql,
      function(err) {
        should.not.exist(err);
        callback();
      }
    );
  };

  describe("72.1 CLOB", function() {

    before(function(done) {

      var proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob72 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_clob72 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      executeSQL(proc, done);

    }); // before

    after(function(done) {

      var sql = "DROP TABLE nodb_tab_clob72 PURGE";
      executeSQL(sql, done);

    }); // after

    var verifyClobValue = function(sequence, expectLob, callback) {

      var sql = "select content from nodb_tab_clob72 where id = :i";

      connection.execute(
        sql,
        { i: sequence },
        function(err, result) {
          should.not.exist(err);

          var lob = result.rows[0][0];
          should.exist(lob);

          lob.setEncoding("utf8");
          var clobData = "";

          lob.on("data", function(chunk) {
            clobData += chunk;
          });

          lob.on("error", function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on("end", function() {

            fs.readFile(expectLob, { encoding: "utf8"}, function(err, originalData) {
              should.not.exist(err);

              should.strictEqual(clobData, originalData);
              return callback();
            });

          }); // end event
        }
      );

    }; // verifyClobValue

    var inFileName = './test/clobexample.txt';

    it("72.1.1 BIND_IN, DML, a txt file", function(done) {

      var seq = 1;

      async.series([
        function(cb) {
          connection.createLob(oracledb.CLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "insert into nodb_tab_clob72 (id, content) values (:id, :bindvar)",
                { id: seq, bindvar: lob},
                function(err, result) {
                  should.not.exist(err);

                  should.strictEqual(result.rowsAffected, 1);

                  lob.close(function(err) {
                    should.not.exist(err);
                  });
                }
              );
            }); // finish event

            var inStream = fs.createReadStream(inFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          }); // createLob()
        },
        function(cb) {
          verifyClobValue(seq, inFileName, cb);
        }
      ], done);

    }); // 72.1.1

    it("72.1.2 BIND_IN, PL/SQL, a txt file", function(done) {

      var seq = 2;
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_in (p_num IN NUMBER, p_lob IN CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob72 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_proc_clob_in;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function dotest(cb) {
          connection.createLob(oracledb.CLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "begin nodb_proc_clob_in(:1, :2); end;",
                [seq, lob],
                function(err) {
                  should.not.exist(err);

                  lob.close(function(err) {
                    should.not.exist(err);
                  });
                }
              );
            }); // finish event

            var inStream = fs.createReadStream(inFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          }); // createLob()
        },
        function(cb) {
          verifyClobValue(seq, inFileName, cb);
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_clob_in";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 72.1.2

    it("72.1.3 Negative - invalid type", function(done) {

      connection.createLob('CLOB', function(err, lob) {
        should.exist(err);
        (err.message).should.startWith('NJS-006:');
        // NJS-006: invalid type for parameter 1

        should.not.exist(lob);

        done();
      });

    }); // 72.1.3

    it("72.1.4 Negative - invalid value", function(done) {

      connection.createLob(oracledb.STRING, function(err, lob) {
        should.exist(err);
        (err.message).should.startWith('NJS-005:');
        // NJS-005: invalid value for parameter 1

        should.not.exist(lob);

        done();
      });

    }); // 72.1.4


    it("72.1.5 DML - UPDATE statement", function(done) {

      var seq = 5;

      async.series([
        function(cb) {
          var proc = "begin \n" +
                     "    insert into nodb_tab_clob72 (id, content) values ( :1, to_clob('This is clob data.') ); \n" +
                     "end; ";

          connection.execute(
            proc,
            [seq],
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          connection.createLob(oracledb.CLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "update nodb_tab_clob72 set content = :bindvar where id = :id",
                { id: seq, bindvar: lob},
                function(err, result) {
                  should.not.exist(err);

                  should.strictEqual(result.rowsAffected, 1);

                  lob.close(function(err) {
                    should.not.exist(err);
                  });
                }
              );
            }); // finish event

            var inStream = fs.createReadStream(inFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          }); // createLob()
        },
        function(cb) {
          verifyClobValue(seq, inFileName, cb);
        }
      ], done);

    }); // 72.1.5

    it("72.1.6 promise test of createLob()", function(done) {

      var seq = 6;

      if (oracledb.Promise) {
        connection.createLob(oracledb.CLOB)
          .then(function(lob) {
            should.exist(lob);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit()
                .then(function() {
                  verifyClobValue(seq, inFileName, done);
                });
            });

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "insert into nodb_tab_clob72 (id, content) values (:id, :bindvar)",
                { id: seq, bindvar: lob}
              ).then(function(result) {
                should.strictEqual(result.rowsAffected, 1);

                var lobClosePromise = lob.close();
                lobClosePromise.should.be.an.instanceOf(oracledb.Promise);
              });
            });

            var inStream = fs.createReadStream(inFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          })
          .catch(function(err) {
            should.not.exist(err);
            return done();
          });
      }
      else {
        // This version of Node.js does not support Promise
        return done();
      }

    }); // 72.1.6

    it("72.1.7 Negative - BIND_INOUT, PL/SQL", function(done) {

      var seq = 7;
      var outStr = "This is a out bind string.";
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout1 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob72 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout1;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          connection.createLob(oracledb.CLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "begin nodb_proc_clob_inout1(:id, :io); end;",
                {
                  id: seq,
                  io: { type: oracledb.CLOB, dir: oracledb.BIND_INOUT, val: lob}
                },
                function(err) {
                  should.exist(err);
                  (err.message).should.startWith("NJS-049:");
                  // NJS-049: cannot use bind direction IN OUT for temporary LOBs
                  lob.close(function(err) {
                    should.not.exist(err);
                  });
                }
              );
            }); // finish event

            var inStream = fs.createReadStream(inFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);
          });

        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_clob_inout1";
          executeSQL(sql, cb);
        }
      ], done);
    }); // 72.1.7

  }); // 72.1

  describe("72.2 BLOB", function() {

    before(function(done) {

      var proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob72 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_blob72 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  BLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      executeSQL(proc, done);

    }); // before

    after(function(done) {

      var sql = "DROP TABLE nodb_tab_blob72 PURGE";
      executeSQL(sql, done);

    }); // after

    var jpgFileName = './test/fuzzydinosaur.jpg';

    var verifyBlobValue = function(sequence, expectLob, callback) {

      var sql = "select content from nodb_tab_blob72 where id = :i";

      connection.execute(
        sql,
        { i: sequence },
        function(err, result) {
          should.not.exist(err);

          var lob = result.rows[0][0];
          should.exist(lob);

          var blobData,
            totalLength = 0;

          blobData = node6plus ? Buffer.alloc(0) : new Buffer(0);

          lob.on("data", function(chunk) {
            totalLength = totalLength + chunk.length;
            blobData    = Buffer.concat([blobData, chunk], totalLength);
          });

          lob.on("error", function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on("end", function() {

            fs.readFile(expectLob, function(err, originalData) {
              should.not.exist(err);

              should.strictEqual(totalLength, originalData.length);
              originalData.should.eql(blobData);

              return callback();
            });

          }); // end event
        }
      );

    }; // verifyBlobValue

    it("72.2.1 BIND_IN, DML, a jpg file", function(done) {

      var seq = 1;

      async.series([
        function(cb) {
          connection.createLob(oracledb.BLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "insert into nodb_tab_blob72 (id, content) values (:id, :bindvar)",
                { id: seq, bindvar: lob},
                function(err, result) {
                  should.not.exist(err);

                  should.strictEqual(result.rowsAffected, 1);

                  lob.close(function(err) {
                    should.not.exist(err);
                  });
                }
              );
            }); // finish event

            var inStream = fs.createReadStream(jpgFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          }); // createLob()
        },
        function(cb) {
          verifyBlobValue(seq, jpgFileName, cb);
        }
      ], done);

    }); // 72.2.1

    it("72.2.2 BIND_IN, PL/SQL, a jpg file", function(done) {

      var seq = 2;
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_in (p_num IN NUMBER, p_lob IN BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob72 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_proc_blob_in;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function dotest(cb) {
          connection.createLob(oracledb.BLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "begin nodb_proc_blob_in(:1, :2); end;",
                [seq, lob],
                function(err) {
                  should.not.exist(err);

                  lob.close(function(err) {
                    should.not.exist(err);
                  });
                }
              );
            }); // finish event

            var inStream = fs.createReadStream(jpgFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          }); // createLob()
        },
        function(cb) {
          verifyBlobValue(seq, jpgFileName, cb);
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_blob_in";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 72.2.2

    it("72.2.3 Negative - inconsistent datatypes", function(done) {

      var seq = 3;

      async.series([
        function(cb) {
          connection.createLob(oracledb.CLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "insert into nodb_tab_blob72 (id, content) values (:id, :bindvar)",
                { id: seq, bindvar: lob},
                function(err) {
                  should.exist(err);
                  (err.message).should.startWith("ORA-00932:");
                  // ORA-00932: inconsistent datatypes: expected BLOB got CLOB

                  lob.close(function(err) {
                    should.not.exist(err);
                  });
                }
              );
            }); // finish event

            var inStream = fs.createReadStream(jpgFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          }); // createLob()
        }
      ], done);

    }); // 72.2.3

    it("72.2.4 Negative - not providing first parameter", function(done) {

      try {
        connection.createLob(function(err, lob) {
          should.not.exist(err);
          should.not.exist(lob);

        });
      } catch(error) {
        should.exist(error);
        (error.message).should.startWith("NJS-009:");
        // NJS-009: invalid number of parameters

        return done();
      }

    }); // 72.2.4

    it("72.2.5 promise test of createLob()", function(done) {

      var seq = 5;

      if (oracledb.Promise) {
        connection.createLob(oracledb.BLOB)
          .then(function(lob) {
            should.exist(lob);

            lob.on("close", function(err) {
              should.not.exist(err);

              connection.commit()
                .then(function() {
                  verifyBlobValue(seq, jpgFileName, done);
                });
            });

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "insert into nodb_tab_blob72 (id, content) values (:id, :bindvar)",
                { id: seq, bindvar: lob}
              ).then(function(result) {
                should.strictEqual(result.rowsAffected, 1);

                var lobClosePromise = lob.close();
                lobClosePromise.should.be.an.instanceOf(oracledb.Promise);
              });
            });

            var inStream = fs.createReadStream(jpgFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          })
          .catch(function(err) {
            should.not.exist(err);
            return done();
          });
      }
      else {
        // This version of Node.js does not support Promise
        return done();
      }

    }); // 72.2.5

    it("72.2.6 call lob.close() multiple times sequentially", function(done) {

      var seq = 7000;

      async.series([
        function(cb) {
          connection.createLob(oracledb.BLOB, function(err, lob) {
            should.not.exist(err);

            lob.on("close", function(err) {
              should.not.exist(err);

              lob.close(function(err) {
                should.not.exist(err);
              });
              connection.commit(function(err) {
                should.not.exist(err);

                return cb();
              });
            }); // close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.on("finish", function() {
              connection.execute(
                "insert into nodb_tab_blob72 (id, content) values (:id, :bindvar)",
                { id: seq, bindvar: lob},
                function(err, result) {
                  should.not.exist(err);

                  should.strictEqual(result.rowsAffected, 1);

                  lob.close(function(err) {
                    should.not.exist(err);
                  });

                }
              );
            }); // finish event

            var inStream = fs.createReadStream(jpgFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);

          }); // createLob()
        },
        function(cb) {
          verifyBlobValue(seq, jpgFileName, cb);
        }
      ], done);

    }); // 72.2.6

  }); // 72.2

});
