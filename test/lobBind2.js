/* Copyright (c) 2016, 2020, Oracle and/or its affiliates. All rights reserved. */

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
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var fs       = require('fs');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

describe("72. lobBind2.js", function() {

  var connection = null;

  before(function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
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

      try {
        connection.createLob('CLOB', function(err, lob) {
          should.exist(err);
          should.not.exist(lob);
          done();
        });
      } catch (err) {
        should.exist(err);
        (err.message).should.startWith('NJS-005:');
        // NJS-005: invalid value for parameter 1
        done();
      }
    }); // 72.1.3

    it("72.1.4 Negative - invalid value", function(done) {

      try {
        connection.createLob(oracledb.STRING, function(err, lob) {
          should.exist(err);
          should.not.exist(lob);
          done();
        });
      } catch (err) {
        should.exist(err);
        (err.message).should.startWith('NJS-005:');
        // NJS-005: invalid value for parameter 1
        done();
      }

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

    it("72.1.7 BIND_INOUT, PL/SQL, IN LOB gets closed automatically", function(done) {

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
                { autoCommit: true },
                function(err, result) {
                  should.not.exist(err);
                  // The IN LOB closed automatically after execute call, need
                  // close the OUT LOB

                  var lobout = result.outBinds.io;

                  lobout.on("close", function(err) {
                    should.not.exist(err);

                    return cb();
                  }); // close event of lobout

                  lobout.on("error", function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lobout.setEncoding("utf8");
                  var clobData;
                  lobout.on("data", function(chunk) {
                    clobData += chunk;
                  });

                  lobout.on("finish", function() {

                    should.strictEqual(clobData, outStr);

                    lobout.close(function(err) {
                      should.not.exist(err);
                    });
                  });

                }
              );
            }); // finish event of lob

            var inStream = fs.createReadStream(inFileName);

            inStream.on("error", function(err) {
              should.not.exist(err, "inStream.on 'error' event.");
            });

            inStream.pipe(lob);
          });

        },
        function(cb) {
          verifyClobValue(seq, inFileName, cb);
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

          blobData = Buffer.alloc(0);

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

  describe("72.3 NCLOB", function() {

    before(async function() {

      const sql = `
          BEGIN
              DECLARE
                  e_table_missing EXCEPTION;
                  PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
              BEGIN
                  EXECUTE IMMEDIATE('DROP TABLE nodb_tab_nclob72 PURGE');
              EXCEPTION
                  WHEN e_table_missing
                      THEN NULL;
              END;
              EXECUTE IMMEDIATE ('
                  CREATE TABLE nodb_tab_nclob72 (
                      id       NUMBER,
                      content  NCLOB
                  )');
              END;`;

      await connection.execute(sql);

    }); // before

    after(async function() {
      const sql = `DROP TABLE nodb_tab_nclob72 PURGE`;
      await connection.execute(sql);
    }); // after

    const verifyNclobValue = async function(sequence, expectLob) {

      const sql = `select content from nodb_tab_nclob72 where id = :i`;
      const result = await connection.execute(sql, { i: sequence });
      const lob = result.rows[0][0];
      should.exist(lob);
      lob.setEncoding("utf8");

      await new Promise((resolve, reject) => {

        let nclobData = "";

        lob.on("data", function(chunk) {
          nclobData += chunk;
        });

        lob.on("error", function(err) {
          should.not.exist(err, "lob.on 'error' event.");
        });

        lob.on("end", function() {

          fs.readFile(expectLob, { encoding: "utf8"}, function(err, originalData) {
            should.not.exist(err);

            should.strictEqual(nclobData, originalData);
            resolve();
          });

        }); // end event
      });

    }; // verifyNclobValue

    const inFileName = './test/clobexample.txt';

    it("72.3.1 BIND_IN, DML, a txt file", async function() {

      const seq = 1;

      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);

      await new Promise((resolve, reject) => {

        lob.on("close", function(err) {
          should.not.exist(err);

          connection.commit(function(err) {
            should.not.exist(err);
            resolve();
          });
        }); // close event

        lob.on("error", function(err) {
          should.not.exist(err, "lob.on 'error' event.");
        });

        lob.on("finish", async function() {
          const sql = `insert into nodb_tab_nclob72 (id, content)
              values (:id, :bindvar)`;
          const result = await connection.execute(sql,
              { id: seq, bindvar: lob});
          should.strictEqual(result.rowsAffected, 1);
          await lob.close();
        }); // finish event

        const inStream = fs.createReadStream(inFileName);

        inStream.on("error", function(err) {
          should.not.exist(err, "inStream.on 'error' event.");
        });

        inStream.pipe(lob);

      });

      await verifyNclobValue(seq, inFileName);

    }); // 72.3.1

    it("72.3.2 BIND_IN, PL/SQL, a txt file", async function() {

      const seq = 2;
      const sql = `
          CREATE OR REPLACE PROCEDURE nodb_proc_nclob_in (
              p_num IN NUMBER,
              p_lob IN NCLOB
          ) AS
          BEGIN
              insert into nodb_tab_nclob72 (id, content) VALUES (p_num, p_lob);
          END;`;

      await connection.execute(sql);

      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);

      await new Promise((resolve, reject) => {

        lob.on("close", function(err) {
          should.not.exist(err);
          connection.commit(function(err) {
            should.not.exist(err);
            resolve();
          });
        });

        lob.on("error", function(err) {
          should.not.exist(err, "lob.on 'error' event.");
        });

        lob.on("finish", async function() {
          const sql = `begin nodb_proc_nclob_in(:1, :2); end;`;
          await connection.execute(sql, [seq, lob]);
          await lob.close();
        });

        const inStream = fs.createReadStream(inFileName);

        inStream.on("error", function(err) {
          should.not.exist(err, "inStream.on 'error' event.");
        });

        inStream.pipe(lob);

      });

      await verifyNclobValue(seq, inFileName);

      await connection.execute("DROP PROCEDURE nodb_proc_nclob_in");

    }); // 72.3.2

    it("72.3.3 Negative - invalid type", function(done) {
      try {
        connection.createLob('NCLOB', function(err, lob) {
          should.exist(err);
          should.not.exist(lob);
          done();
        });
      } catch (err) {
        should.exist(err);
        (err.message).should.startWith('NJS-005:');
        // NJS-005: invalid value for parameter 1
        done();
      }
    }); // 72.3.3

    it("72.3.4 Negative - invalid value", function(done) {

      try {
        connection.createLob(oracledb.STRING, function(err, lob) {
          should.exist(err);
          should.not.exist(lob);
          done();
        });
      } catch (err) {
        should.exist(err);
        (err.message).should.startWith('NJS-005:');
        // NJS-005: invalid value for parameter 1
        done();
      }

    }); // 72.3.4

    it("72.3.5 DML - UPDATE statement", async function() {

      const seq = 5;

      const sql = `
          begin
              insert into nodb_tab_nclob72 (id, content)
              values ( :1, to_nclob('This is nclob data.') );
          end;`;
      await connection.execute(sql, [seq]);

      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);

      await new Promise((resolve, reject) => {

        lob.on("error", function(err) {
          should.not.exist(err, "lob.on 'error' event.");
        });

        lob.on("finish", async function() {
          const sql = `update nodb_tab_nclob72 set content = :bindvar
              where id = :id`;
          const result = await connection.execute(sql,
              { id: seq, bindvar: lob});
          should.strictEqual(result.rowsAffected, 1);
          await lob.close();
          await connection.commit();
          resolve();
        });

        const inStream = fs.createReadStream(inFileName);

        inStream.on("error", function(err) {
          should.not.exist(err, "inStream.on 'error' event.");
        });

        inStream.pipe(lob);

      });

      await verifyNclobValue(seq, inFileName);

    }); // 72.3.5

    it("72.3.6 BIND_INOUT, PL/SQL, IN LOB gets closed automatically", async function() {

      const seq = 7;
      const outStr = "This is a out bind string.";
      const sql = `
          CREATE OR REPLACE PROCEDURE nodb_proc_nclob_inout1 (
              p_num IN NUMBER,
              p_inout IN OUT NCLOB
            ) AS
            BEGIN
                insert into nodb_tab_nclob72 (id, content)
                values (p_num, p_inout);

                select to_nclob('${outStr}') into p_inout from dual;
            END;`;

      await connection.execute(sql);

      const lob = await connection.createLob(oracledb.DB_TYPE_NCLOB);

      await new Promise((resolve, reject) => {

        lob.on("error", function(err) {
          should.not.exist(err, "lob.on 'error' event.");
        });

        lob.on("finish", async function() {
          const sql = `begin nodb_proc_nclob_inout1(:id, :io); end;`;
          const binds = {
            id: seq,
            io: { type: oracledb.DB_TYPE_NCLOB,
                  dir: oracledb.BIND_INOUT, val: lob }
          };
          const options = { autoCommit: true };
          const result = await connection.execute(sql, binds, options);

          const lobout = result.outBinds.io;
          lobout.setEncoding("utf8");

          await new Promise((resolve, reject) => {

            let nclobData = "";
            lobout.on("data", function(chunk) {
              nclobData += chunk;
            });

            lobout.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lobout.on("end", async function() {
              should.strictEqual(nclobData, outStr);
              await lobout.close();
              resolve();
            });

          });

          resolve();

        });

        const inStream = fs.createReadStream(inFileName);

        inStream.on("error", function(err) {
          should.not.exist(err, "inStream.on 'error' event.");
        });

        inStream.pipe(lob);

      });

      await verifyNclobValue(seq, inFileName);

      await connection.execute("DROP PROCEDURE nodb_proc_nclob_inout1");

    }); // 72.3.6

  }); // 72.3

});
