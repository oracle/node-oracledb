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
 *   71. lobBind1.js
 *
 * DESCRIPTION
 *   Testing binding LOB data.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var fs       = require('fs');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe('71. lobBind1.js', function() {

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

  describe('71.1 persistent CLOB', function() {

    before('create the tables', function(done) {

      var proc1 ="BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob1 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_clob1 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      var proc2 ="BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_clob2 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_clob2 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  CLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      async.series([
        function(cb) {
          executeSQL(proc1, cb);
        },
        function(cb) {
          executeSQL(proc2, cb);
        }
      ], done);

    }); // before

    after(function(done) {

      async.series([
        function(cb) {
          var sql = "DROP TABLE nodb_tab_clob1 PURGE";
          executeSQL(sql, cb);
        },
        function(cb) {
          var sql = "DROP TABLE nodb_tab_clob2 PURGE";
          executeSQL(sql, cb);
        }
      ], done);

    }); // after

    var inFileName = './test/clobexample.txt';

    var prepareTableWithClob = function(sequence, callback) {

      var sql = "INSERT INTO nodb_tab_clob1 (id, content) " +
                "VALUES (:i, EMPTY_CLOB()) RETURNING content " +
                "INTO :lobbv";
      var bindVar = { i: sequence, lobbv: { type: oracledb.CLOB, dir: oracledb.BIND_OUT } };

      connection.execute(
        sql,
        bindVar,
        { autoCommit: false }, // a transaction needs to span the INSERT and pipe()
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

            connection.commit( function(err) {
              should.not.exist(err);

              return callback();
            });
          });

          inStream.pipe(lob); // copies the text to the CLOB
        }
      );

    };

    var verifyClobValue = function(sequence, callback) {

      var sql = "SELECT content FROM nodb_tab_clob2 WHERE id = :id";

      connection.execute(
        sql,
        { id: sequence },
        function(err, result) {
          should.not.exist(err);

          if (sequence == 2) {
            (result.rows).should.eql([[null]]);
            return callback();
          }

          var lob = result.rows[0][0];
          should.exist(lob);

          // set the encoding so we get a 'string' not a 'buffer'
          lob.setEncoding('utf8');
          var clobData = '';

          lob.on('data', function(chunk) {
            clobData += chunk;
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function() {

            if (sequence == 1) {

              should.strictEqual(clobData, 'some CLOB data');
              return callback();

            } else {

              fs.readFile( inFileName, { encoding: 'utf8' }, function(err, originalData) {
                should.not.exist(err);

                should.strictEqual(clobData, originalData);
                return callback();
              });
            }

          });

        }
      );

    }; // verifyClobValue

    it('71.1.1 BIND_IN, DML, a String variable', function(done) {

      var seq = 1;
      var lobData = "some CLOB data";

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_clob1 VALUES(:i, :d)";
          var bindVar = {
            i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
            d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.STRING }
          };

          connection.execute(
            sql,
            bindVar,
            { autoCommit: true },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function bindCLOB(cb) {
          var sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
          var sql2 = "INSERT INTO nodb_tab_clob2 (id, content) VALUES (:i, :c)";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);

              var lob = result.rows[0][0];

              connection.execute(
                sql2,
                {
                  i: seq,
                  c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
                },
                { autoCommit: true },
                function(err) {
                  should.not.exist(err);
                  // console.log(result2);
                  lob.close(cb);
                }
              );
            }
          );
        },
        function(cb) {

          verifyClobValue(seq, cb);

        }
      ], done);

    }); // 71.1.1

    it('71.1.2 BIND_IN, DML, null', function(done) {

      var seq = 2;
      var lobData = null;

      async.series([
        function(cb) {
          var sql = "INSERT INTO nodb_tab_clob1 VALUES(:i, :d)";
          var bindVar = {
            i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
            d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.STRING }
          };

          connection.execute(
            sql,
            bindVar,
            { autoCommit: true },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          var sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
          var sql2 = "INSERT INTO nodb_tab_clob2 (id, content) VALUES (:i, :c)";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);

              var lob = result.rows[0][0];

              connection.execute(
                sql2,
                {
                  i: seq,
                  c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
                },
                { autoCommit: true },
                function(err) {
                  should.not.exist(err);
                  // console.log(result2);
                  cb();
                }
              );
            }
          );
        },
        function(cb) {

          verifyClobValue(seq, cb);

        }
      ], done);

    }); // 71.1.2

    it('71.1.3 BIND_IN, DML, a txt file', function(done) {

      var seq = 3;

      async.series([
        function(cb) {

          prepareTableWithClob(seq, cb);

        },
        function bindCLOB(cb) {
          var sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
          var sql2 = "INSERT INTO nodb_tab_clob2 (id, content) VALUES (:i, :c)";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);

              var lob = result.rows[0][0];

              connection.execute(
                sql2,
                {
                  i: seq,
                  c: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
                },
                { autoCommit: true },
                function(err) {
                  should.not.exist(err);
                  lob.close(cb);
                }
              );
            }
          );
        },
        function verify(cb) {

          verifyClobValue(seq, cb);

        }
      ], done);

    }); // 71.1.3

    it('71.1.4 BIND_IN, PL/SQL, a txt file', function(done) {

      var seq = 4;
      var proc = "CREATE OR REPLACE PROCEDURE nodb_clobinproc1 (p_num IN NUMBER, p_lob IN CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_clobinproc1;";

      async.series([
        function(cb) {

          executeSQL(proc, cb);

        },
        function(cb) {
          prepareTableWithClob(seq, cb);
        },
        function bindCLOB(cb) {
          var sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
          var sql2 = "begin nodb_clobinproc1(:1, :2); end;";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);

              var lob = result.rows[0][0];

              connection.execute(
                sql2,
                [
                  { val: seq, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
                  { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_IN }
                ],
                { autoCommit: true },
                function(err) {
                  should.not.exist(err);
                  lob.close(cb);
                }

              );
            }
          );
        },
        function verify(cb) {
          verifyClobValue(seq, cb);
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_clobinproc1";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.1.4

    it('71.1.5 BIND_OUT, PL/SQL, a string', function(done) {

      var proc = "CREATE OR REPLACE PROCEDURE nodb_cloboutproc_str(p_lob OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select to_clob('I love the sunshine today.') into p_lob from dual; \n" +
                 "END nodb_cloboutproc_str;";

      var sql = "begin nodb_cloboutproc_str(:c); end;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          connection.execute(
            sql,
            { c: { dir: oracledb.BIND_OUT, type: oracledb.CLOB } },
            function(err, result) {
              should.not.exist(err);
              // console.log(result);
              var lob = result.outBinds.c;

              lob.setEncoding("utf8");
              var clobData = '';

              lob.on('data', function(chunk) {
                clobData += chunk;
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {
                should.strictEqual(clobData, "I love the sunshine today.");
                return cb();
              });
            }
          );
        },
        function(cb) {
          var sqlDrop =  "DROP PROCEDURE nodb_cloboutproc_str";
          executeSQL(sqlDrop, cb);
        }
      ], done);

    }); // 71.1.5

    it('71.1.6 BIND_OUT, PL/SQL, a txt file', function(done) {

      var seq = 6;
      var proc = "CREATE OR REPLACE PROCEDURE nodb_cloboutproc1(p_num IN NUMBER, p_lob OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select content into p_lob from nodb_tab_clob1 WHERE id = p_num; \n" +
                 "END nodb_cloboutproc1;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          prepareTableWithClob(seq, cb);
        },
        function(cb) {
          var sql = "begin nodb_cloboutproc1(:id, :c); end;";

          connection.execute(
            sql,
            {
              id: { val: seq, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
              c:  { dir: oracledb.BIND_OUT, type: oracledb.CLOB }
            },
            function(err, result) {
              should.not.exist(err);

              var lob = result.outBinds.c;
              should.exist(lob);

              lob.setEncoding("utf8");
              var clobData = '';

              lob.on('data', function(chunk) {
                clobData += chunk;
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {
                fs.readFile( inFileName, { encoding: 'utf8' }, function(err, originalData) {
                  should.not.exist(err);

                  should.strictEqual(clobData, originalData);
                  return cb();
                });
              });

            }
          );
        },
        function(cb) {
          var sql =  "DROP PROCEDURE nodb_cloboutproc1";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.1.6

    it('71.1.7 BIND_INOUT, PL/SQL, A String. IN LOB gets closed automatically.', function(done) {

      var seq = 7;
      var inStr  = "I love the sunshine today!",
        outStr = "A new day has come.";

      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout1 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout1;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "INSERT INTO nodb_tab_clob1 (id, content) VALUES \n" +
                    " (:i, '" + inStr + "')";

          connection.execute(
            sql,
            { i: seq },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
          var sql2 = "begin nodb_proc_clob_inout1(:id, :io); end;";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);

              var lobin = result.rows[0][0];

              connection.execute(
                sql2,
                {
                  id: seq,
                  io: { val: lobin, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result2) {
                  should.not.exist(err);

                  var lobout = result2.outBinds.io;

                  lobout.setEncoding("utf8");
                  var clobData = "";

                  lobout.on("data", function(chunk) {
                    clobData += chunk;
                  });

                  lobout.on("error", function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lobout.on("end", function() {
                    should.strictEqual(clobData, outStr);

                    return cb();
                  });
                }
              );
            }
          );
        },
        function verifyBindInVal(cb) {
          var sql = "SELECT content FROM nodb_tab_clob2 WHERE id = :1";

          connection.execute(
            sql,
            [ seq ],
            function(err, result) {
              should.not.exist(err);

              var lobin = result.rows[0][0];

              lobin.setEncoding('utf8');
              var clobData = '';

              lobin.on('data', function(chunk) {
                clobData += chunk;
              });

              lobin.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lobin.on('end', function() {
                should.strictEqual(clobData, inStr);
                return cb();
              });

            }
          );
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_clob_inout1";
          executeSQL(sql, cb);
        }
      ], done);

    });

    it('71.1.8 BIND_INOUT, PL/SQL, a txt file', function(done) {

      var seq = 8;
      var outStr = "It binds IN a txt file, and binds OUT a String.";

      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout2 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout2;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          prepareTableWithClob(seq, cb);
        },
        function(cb) {
          var sql1 = "SELECT content FROM nodb_tab_clob1 WHERE id = :id";
          var sql2 = "begin nodb_proc_clob_inout2(:id, :io); end;";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);

              var lob = result.rows[0][0];

              connection.execute(
                sql2,
                {
                  id: seq,
                  io: { val: lob, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result2) {
                  should.not.exist(err);

                  var lobout = result2.outBinds.io;

                  lobout.setEncoding("utf8");
                  var clobData = '';

                  lobout.on('data', function(chunk) {
                    clobData += chunk;
                  });

                  lobout.on('error', function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lobout.on('end', function() {
                    should.strictEqual(clobData, outStr);
                    return cb();
                  });
                }

              );
            }
          );
        },
        function verify(cb) {
          verifyClobValue(seq, cb);
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_clob_inout2";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.1.8

    it('71.1.9 BIND_INOUT, PL/SQL, a String as the bind IN Value', function(done) {

      var seq = 9;
      var inStr = "I love the sunshine today!";
      var outStr = "A new day has come.";

      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_clob_inout3 \n" +
                 "  (p_num IN NUMBER, p_inout IN OUT CLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_clob2 (id, content) values (p_num, p_inout); \n" +
                 "    select to_clob('" + outStr + "') into p_inout from dual; \n" +
                 "END nodb_proc_clob_inout3;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          var sql = "begin nodb_proc_clob_inout3(:id, :io); end;";

          connection.execute(
            sql,
            {
              id: seq,
              io: { val: inStr, type: oracledb.CLOB, dir: oracledb.BIND_INOUT }
            },
            { autoCommit: true },
            function(err, result) {
              should.not.exist(err);
              should.exist(result);
              var lobout = result.outBinds.io;

              lobout.setEncoding("utf8");
              var clobData = '';

              lobout.on('data', function(chunk) {
                clobData += chunk;
              });

              lobout.on('error',function(err) {
                should.not.exist(err, "lob.on 'error' event!");
              });

              lobout.on('end', function() {
                should.strictEqual(clobData, outStr);
                return cb();
              });
            }
          );
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_clob_inout3";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.1.9

  }); // 71.1

  describe("71.2 persistent BLOB", function() {

    before('create the tables', function(done) {

      var proc1 ="BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob1 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_blob1 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  BLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      var proc2 ="BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE('DROP TABLE nodb_tab_blob2 PURGE'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_tab_blob2 ( \n" +
                 "            id       NUMBER, \n" +
                 "            content  BLOB \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      async.series([
        function(cb) {
          executeSQL(proc1, cb);
        },
        function(cb) {
          executeSQL(proc2, cb);
        }
      ], done);

    }); // before

    after(function(done) {
      async.series([
        function(cb) {

          var sql = "DROP TABLE nodb_tab_blob1 PURGE";
          executeSQL(sql, cb);

        },
        function(cb) {

          var sql = "DROP TABLE nodb_tab_blob2 PURGE";
          executeSQL(sql, cb);

        }
      ], done);
    }); // after

    var jpgFileName = './test/fuzzydinosaur.jpg';
    var treeAnotherJPG = './test/tree.jpg';

    var prepareTableWithBlob = function(sequence, filepath, callback) {

      var sql = "INSERT INTO nodb_tab_blob1 (id, content) " +
                "VALUES (:i, EMPTY_BLOB()) RETURNING content " +
                "INTO :lobbv";
      var bindVar = { i: sequence, lobbv: { type: oracledb.BLOB, dir: oracledb.BIND_OUT } };

      connection.execute(
        sql,
        bindVar,
        { autoCommit: false }, // a transaction needs to span the INSERT and pipe()
        function(err, result) {
          should.not.exist(err);
          (result.rowsAffected).should.be.exactly(1);
          (result.outBinds.lobbv.length).should.be.exactly(1);

          var inStream = fs.createReadStream( filepath );
          var lob = result.outBinds.lobbv[0];

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event");
          });

          inStream.on('error', function(err) {
            should.not.exist(err, "inStream.on 'error' event");
          });

          lob.on('finish', function() {

            connection.commit( function(err) {
              should.not.exist(err);

              return callback();
            });
          });

          inStream.pipe(lob);
        }
      );
    }; // prepareTableWithBlob()

    var bindBlob = function(sequence, callback) {

      var sql1 = "SELECT content FROM nodb_tab_blob1 WHERE id = :id",
        sql2 = "INSERT INTO nodb_tab_blob2 (id, content) VALUES (:1, :2)";

      connection.execute(
        sql1,
        { id: sequence },
        function(err, result) {
          should.not.exist(err);
          (result.rows.length).should.not.eql(0);

          var lob = result.rows[0][0];

          connection.execute(
            sql2,
            [
              sequence,
              { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
            ],
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              if (lob) return lob.close(callback);
              callback();
            }
          );
        }
      );
    }; // bindBlob()

    var verifyBlobValue = function(sequence, inlob, callback) {

      var sql = "SELECT content FROM nodb_tab_blob2 WHERE id = :id";

      connection.execute(
        sql,
        { id: sequence },
        function(err, result) {
          should.not.exist(err);

          var lob = result.rows[0][0];
          should.exist(lob);

          var blobData,
            totalLength = 0;

          blobData = Buffer.alloc(0);

          lob.on('data', function(chunk) {
            totalLength = totalLength + chunk.length;
            blobData = Buffer.concat([blobData, chunk], totalLength);
          });

          lob.on('error', function(err) {
            should.not.exist(err, "lob.on 'error' event.");
          });

          lob.on('end', function() {

            if ( (sequence == 1) || (sequence == 7) ) {

              blobData.should.eql(inlob);

            } else {

              fs.readFile( inlob, function(err, originalData) {
                should.not.exist(err);

                should.strictEqual(totalLength, originalData.length);
                originalData.should.eql(blobData);
              });

            }

            return callback();

          });

        }
      );

    }; // verifyBlobValue()

    it('71.2.1 BIND_IN, DML, a Buffer value', function(done) {

      var seq = 1,
        bufSize = 10000;
      var buf = assist.createBuffer(bufSize);

      async.series([
        function insertBufToTab1(cb) {
          var sql = "INSERT INTO nodb_tab_blob1 VALUES (:1, :2)";
          var bindVar = [
            { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
            { val: buf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
          ];

          connection.execute(
            sql,
            bindVar,
            { autoCommit: true },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(result.rowsAffected, 1);
              cb();
            }
          );
        },
        function(cb) {
          bindBlob(seq, cb);
        },
        function(cb) {
          verifyBlobValue(seq, buf, cb);
        }
      ], done);

    }); // 71.2.1

    it('71.2.2 BIND_IN, DML, null', function(done) {

      var seq = 2;
      var lobData = Buffer.alloc(0);

      async.series([
        function(cb) {
          var sql = "insert into nodb_tab_blob1 values (:i, :d)";
          var bindVar = {
            i: { val: seq, dir: oracledb.BIND_IN, type: oracledb.NUMBER },
            d: { val: lobData, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
          };

          connection.execute(
            sql,
            bindVar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          bindBlob(seq, cb);
        },
        function(cb) {
          var sql = "SELECT content FROM nodb_tab_blob2 WHERE id = :id";

          connection.execute(
            sql,
            { id: seq },
            function(err, result) {
              should.not.exist(err);

              (result.rows).should.eql([ [ null ] ]);
              cb();
            }
          );
        }
      ], done);

    }); // 71.2.2

    it('71.2.3 BIND_IN, DML, a jpg file', function(done) {

      var seq = 3;

      async.series([
        function(cb) {
          prepareTableWithBlob(seq, jpgFileName, cb);
        },
        function(cb) {
          bindBlob(seq, cb);
        },
        function(cb) {
          verifyBlobValue(seq, jpgFileName, cb);
        }
      ], done);

    }); // 71.2.3

    it('71.2.4 BIND_IN, PL/SQL, a jpg file', function(done) {

      var seq = 4;
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_in (p_num IN NUMBER, p_lob IN BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) VALUES (p_num, p_lob); \n" +
                 "END nodb_proc_blob_in;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          prepareTableWithBlob(seq, jpgFileName, cb);
        },
        function bindBLOB(cb) {
          var sql1 = "SELECT content FROM nodb_tab_blob1 WHERE id = :id",
            sql2 = "begin nodb_proc_blob_in(:1, :2); end;";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.not.eql(0);

              var lob = result.rows[0][0];

              connection.execute(
                sql2,
                [
                  seq,
                  { val: lob, type: oracledb.BLOB, dir: oracledb.BIND_IN }
                ],
                { autoCommit: true },
                function(err) {
                  should.not.exist(err);
                  lob.close(cb);
                }
              );
            }
          );
        },
        function verify(cb) {
          verifyBlobValue(seq, jpgFileName, cb);
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_blob_in";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.2.4

    it('71.2.5 BIND_OUT, PL/SQL, a Buffer value', function(done) {

      var seq = 5,
        bufSize = 1000;
      var buf = assist.createBuffer(bufSize);

      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_out1 (p_num IN NUMBER, p_lob OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select content into p_lob from nodb_tab_blob2 where id = p_num; \n" +
                 "END nodb_proc_blob_out1;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function insertBuftoTab(cb) {
          var sql = "insert into nodb_tab_blob2 values (:1, :2)";
          var bindvar = [
            seq,
            { val: buf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
          ];

          connection.execute(
            sql,
            bindvar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {

          var sql = "begin nodb_proc_blob_out1(:i, :b); end;";
          var bindvar = {
            i: seq,
            b: { dir: oracledb.BIND_OUT, type: oracledb.BLOB }
          };

          connection.execute(
            sql,
            bindvar,
            function(err, result) {
              should.not.exist(err);

              var lob = result.outBinds.b;
              should.exist(lob);

              var blobData,
                totalLength = 0;

              blobData = Buffer.alloc(0);

              lob.on('data', function(chunk) {
                totalLength = totalLength + chunk.length;
                blobData = Buffer.concat([blobData, chunk], totalLength);
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {
                blobData.should.eql(buf);

                return cb();
              });
            }
          );
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_blob_out1";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.2.5

    it('71.2.6 BIND_OUT, PL/SQL, a jpg file', function(done) {

      var seq = 6;
      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_out2 (p_num IN NUMBER, p_lob OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    select content into p_lob from nodb_tab_blob1 where id = p_num; \n" +
                 "END nodb_proc_blob_out2;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          prepareTableWithBlob(seq, jpgFileName, cb);
        },
        function(cb) {

          var sql = "begin nodb_proc_blob_out2(:1, :2); end;";
          var bindvar = [
            seq,
            { dir: oracledb.BIND_OUT, type: oracledb.BLOB }
          ];

          connection.execute(
            sql,
            bindvar,
            function(err, result) {
              should.not.exist(err);

              var lob = result.outBinds[0];
              should.exist(lob);

              var blobData,
                totalLength = 0;

              blobData = Buffer.alloc(0);

              lob.on('data', function(chunk) {
                totalLength = totalLength + chunk.length;
                blobData = Buffer.concat([blobData, chunk], totalLength);
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {

                fs.readFile( jpgFileName, function(err, originalData) {
                  should.not.exist(err);

                  should.strictEqual(totalLength, originalData.length);
                  originalData.should.eql(blobData);

                  return cb();
                });

              });
            }
          );
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_blob_out2";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.2.6

    it('71.2.7 BIND_INOUT, PL/SQL, a Buffer value', function(done) {

      var seq = 7,
        outBufID = 70;

      var inBuf  = assist.createBuffer(10),
        outBuf = assist.createBuffer(100);

      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_inout1 \n" +
                 "  (p_in IN NUMBER, p_outbufid IN NUMBER, p_inout IN OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) values (p_in, p_inout); \n" +
                 "    select content into p_inout from nodb_tab_blob1 where id = p_outbufid; \n" +
                 "END nodb_proc_blob_inout1;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function prepareInBuf(cb) {
          var sql = "insert into nodb_tab_blob1 values (:1, :2)";
          var bindvar = [
            seq,
            { val: inBuf, dir: oracledb.BIND_IN, type: oracledb.BUFFER }
          ];

          connection.execute(
            sql,
            bindvar,
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function prepareOutBuf(cb) {
          connection.execute(
            "insert into nodb_tab_blob1 values (:i, :b)",
            {
              i: outBufID,
              b: { val: outBuf, dir:oracledb.BIND_IN, type: oracledb.BUFFER }
            },
            { autoCommit: true },
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {

          connection.execute(
            "select content from nodb_tab_blob1 where id = :1",
            [ seq ],
            function(err, result1) {
              should.not.exist(err);

              var lobin = result1.rows[0][0];

              connection.execute(
                "begin nodb_proc_blob_inout1 (:in, :oid, :io); end;",
                {
                  in: seq,
                  oid: outBufID,
                  io: { val: lobin, type: oracledb.BLOB, dir: oracledb.BIND_INOUT }
                },
                { autoCommit: true },
                function(err, result2) {
                  should.not.exist(err);

                  var lobout = result2.outBinds.io;

                  var blobData,
                    totalLength = 0;

                  blobData = Buffer.alloc(0);

                  lobout.on('data', function(chunk) {
                    totalLength = totalLength + chunk.length;
                    blobData = Buffer.concat([blobData, chunk], totalLength);
                  });

                  lobout.on('error', function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lobout.on('end', function() {
                    blobData.should.eql(outBuf);

                    return cb();

                  });
                }
              );

            }
          );
        },

        function(cb) {
          verifyBlobValue(seq, inBuf, cb);
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_blob_inout1";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.2.7

    it('71.2.8 BIND_INOUT, PL/SQL, a jpg file', function(done) {

      var seq = 8;
      var treeID = 100;

      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_inout2 \n" +
                 "  (p_in_seq IN NUMBER, p_in_tree IN NUMBER, p_inout IN OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) values (p_in_seq, p_inout); \n" +
                 "    select content into p_inout from nodb_tab_blob1 where id = p_in_tree; \n" +
                 "END nodb_proc_blob_inout2;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          prepareTableWithBlob(seq, jpgFileName, cb);
        },
        function(cb) {
          prepareTableWithBlob(treeID, treeAnotherJPG, cb);
        },
        function(cb) {

          var sql1 = "select content from nodb_tab_blob1 where id = :id";
          var sql2 = "begin nodb_proc_blob_inout2(:i, :tree, :io); end;";

          connection.execute(
            sql1,
            { id: seq },
            function(err, result) {
              should.not.exist(err);

              // bindin lob is the tree.jpg
              var inlob = result.rows[0][0];

              connection.execute(
                sql2,
                {
                  i: seq,
                  tree: treeID,
                  io: { val: inlob, dir: oracledb.BIND_INOUT, type: oracledb.BLOB }
                },
                { autoCommit: true },
                function(err, result2) {
                  should.not.exist(err);
                  (result.rows.length).should.not.eql(0);

                  var lob = result2.outBinds.io;

                  var blobData,
                    totalLength = 0;

                  blobData = Buffer.alloc(0);

                  lob.on('data', function(chunk) {
                    totalLength = totalLength + chunk.length;
                    blobData = Buffer.concat([blobData, chunk], totalLength);
                  });

                  lob.on('error', function(err) {
                    should.not.exist(err, "lob.on 'error' event.");
                  });

                  lob.on('end', function() {

                    fs.readFile( treeAnotherJPG, function(err, treeData) {
                      should.not.exist(err);

                      should.strictEqual(totalLength, treeData.length);
                      treeData.should.eql(blobData);

                      return cb();
                    });
                  });
                }
              );
            }
          );

        },
        function(cb) {
          verifyBlobValue(seq, jpgFileName, cb);
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_blob_inout2";
          executeSQL(sql, cb);
        }
      ], done);

    }); // 71.2.8

    it('71.2.9 BIND_INOUT, PL/SQL, a Buffer as the bind IN value', function(done) {

      var seq = 9;
      var inBuf  = assist.createBuffer(10);

      var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_blob_inout3 \n" +
                 "  (p_in IN NUMBER, p_inout IN OUT BLOB) \n" +
                 "AS \n" +
                 "BEGIN \n" +
                 "    insert into nodb_tab_blob2 (id, content) values (p_in, p_inout); \n" +
                 "    select content into p_inout from nodb_tab_blob1 where id = p_in; \n" +
                 "END nodb_proc_blob_inout3;";

      async.series([
        function(cb) {
          executeSQL(proc, cb);
        },
        function(cb) {
          prepareTableWithBlob(seq, jpgFileName, cb);
        },
        function(cb) {

          var sql = "begin nodb_proc_blob_inout3 (:i, :io); end;",
            bindvar = {
              i:  seq,
              io: { val: inBuf, type: oracledb.BLOB, dir: oracledb.BIND_INOUT }
            };

          connection.execute(
            sql,
            bindvar,
            { autoCommit: true },
            function(err, result) {
              should.not.exist(err);
              should.exist(result);
              var lob = result.outBinds.io;
              should.exist(lob);

              var blobData, totalLength = 0;
              blobData = Buffer.alloc(0);

              lob.on('data', function(chunk) {
                totalLength = totalLength + chunk.length;
                blobData = Buffer.concat([blobData, chunk], totalLength);
              });

              lob.on('error', function(err) {
                should.not.exist(err, "lob.on 'error' event.");
              });

              lob.on('end', function() {
                fs.readFile(jpgFileName, function(err, originalData) {
                  should.not.exist(err);
                  should.strictEqual(totalLength, originalData.length);
                  return cb();
                });
              });

            }
          );
        },
        function(cb) {
          var sql = "DROP PROCEDURE nodb_proc_blob_inout3";
          executeSQL(sql, cb);
        }
      ], done);
    }); // 71.2.9

  }); // 71.2

});
