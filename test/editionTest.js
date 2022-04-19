/* Copyright (c) 2018, 2022, Oracle and/or its affiliates. */

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
 * NAME
 *   160. editionTest.js
 *
 * DESCRIPTION
 *   Test Edition Based Redefinition.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbConfig = require('./dbconfig.js');

const timestamp = +new Date();
const edition1 = "edition_1_" + timestamp;
const edition2 = "edition_2_" + timestamp;
const schemaEdition = "schema_" + timestamp;

function generateRandomPassword(length) {
  let result = "";
  const choices = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < length; i++) {
    result += choices.charAt(Math.floor(Math.random() * choices.length));
  }
  return result;
}

describe('160. editionTest.js', function() {

  var dbaConn;
  var isRunnable;
  var nodbSchemaEditionPassword = generateRandomPassword(6);
  var editionList = [];

  before(function(done) {
    var conn;

    function checkRunnable(callback) {
      if (!dbConfig.test.DBA_PRIVILEGE) {
        isRunnable = false;
        callback(null);
        return;
      }

      oracledb.getConnection(dbConfig, function(err, connection) {
        if (err) {
          callback(err);
          return;
        }
        if (connection.oracleServerVersion < 1202000100) {
          isRunnable = false;
        } else {
          isRunnable = true;
        }
        connection.close(function(err) {
          if (err) callback(err);
          else callback(null);
        });
      });
    } // checkRunnable()

    // Call isRunnable check. Take actions in its callback.
    checkRunnable(function(err) {
      should.not.exist(err);
      if (!isRunnable) {
        done();
      } else {
        async.series([
          // SYSDBA connection
          function(cb) {
            var credential = {
              user:             dbConfig.test.DBA_user,
              password:         dbConfig.test.DBA_password,
              connectionString: dbConfig.connectString,
              privilege:        oracledb.SYSDBA
            };

            oracledb.getConnection(
              credential,
              function(err, connection) {
                should.not.exist(err);
                dbaConn = connection;
                cb();
              }
            );
          },
          function(cb) {
            var sql = "BEGIN \n" +
                       "    DECLARE \n" +
                       "        e_edition_missing EXCEPTION; \n" +
                       "        PRAGMA EXCEPTION_INIT(e_edition_missing, -38802); \n" +
                       "    BEGIN \n" +
                       `        EXECUTE IMMEDIATE('DROP EDITION ${edition1} CASCADE'); \n` +
                       "    EXCEPTION \n" +
                       "        WHEN e_edition_missing \n" +
                       "        THEN NULL; \n" +
                       "    END; \n" +
                       "    EXECUTE IMMEDIATE (' \n" +
                       `        CREATE EDITION ${edition1}\n` +
                       "    '); \n" +
                       "END; ";
            dbaConn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          function(cb) {
            var sql = "BEGIN \n" +
                       "    DECLARE \n" +
                       "        e_edition_missing EXCEPTION; \n" +
                       "        PRAGMA EXCEPTION_INIT(e_edition_missing, -38802); \n" +
                       "    BEGIN \n" +
                       `        EXECUTE IMMEDIATE('DROP EDITION ${edition2} CASCADE'); \n` +
                       "    EXCEPTION \n" +
                       "        WHEN e_edition_missing \n" +
                       "        THEN NULL; \n" +
                       "    END; \n" +
                       "    EXECUTE IMMEDIATE (' \n" +
                       `        CREATE EDITION ${edition2}\n` +
                       "    '); \n" +
                       "END; ";
            dbaConn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          function(cb) {
            var sql = `SELECT EDITION_NAME, PARENT_EDITION_NAME FROM ALL_EDITIONS`;
            dbaConn.execute(
              sql,
              function(err, result) {
                should.not.exist(err);
                if (result && result.rows) {
                  var parentEdition = "ORA$BASE";
                  for (var i = 1; i < result.rows.length; i++) {
                    for (var j = 0; j < result.rows.length; j++) {
                      if (result.rows[j][1] === parentEdition) {
                        editionList.push(result.rows[j][0]);
                        parentEdition = result.rows[j][0];
                        break;
                      }
                    }
                  }
                }
                cb();
              }
            );
          },
          // Create user
          function(cb) {
            var sql = "BEGIN \n" +
                      "    DECLARE \n" +
                      "        e_user_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_user_missing, -01918); \n" +
                      "    BEGIN \n" +
                      `        EXECUTE IMMEDIATE('DROP USER ${schemaEdition} CASCADE'); \n` +
                      "    EXCEPTION \n" +
                      "        WHEN e_user_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE (' \n" +
                      `        CREATE USER ${schemaEdition} IDENTIFIED BY ${nodbSchemaEditionPassword}\n` +
                      "    '); \n" +
                      "END; ";
            dbaConn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          function(cb) {
            var sql = `GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, \
                          CREATE VIEW, CREATE PROCEDURE, CREATE TRIGGER to ${schemaEdition}`;
            dbaConn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          // Allow editions for user
          function(cb) {
            var sql = `alter user ${schemaEdition} enable editions`;
            dbaConn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          function(cb) {
            var sql = `grant use on edition ${edition1} to ${schemaEdition}`;
            dbaConn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          function(cb) {
            var sql = `grant use on edition ${edition2} to ${schemaEdition}`;
            dbaConn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          // Get user connection
          function(cb) {
            var credential = {
              user:             schemaEdition,
              password:         nodbSchemaEditionPassword,
              connectionString: dbConfig.connectString
            };
            oracledb.getConnection(
              credential,
              function(err, connection) {
                should.not.exist(err);
                conn = connection;
                cb();
              }
            );
          },
          // Create procedure (without any editions)
          function(cb) {
            var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_edition (str OUT STRING) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    str := 'E0'; \n" +
                       "END nodb_proc_edition;";
            conn.execute(
              proc,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          // Change to Edition e1
          function(cb) {
            var sql = `alter session set edition = ${edition1}`;
            conn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          // Create procedure in context of Edition E1
          function(cb) {
            var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_edition (str OUT STRING) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    str := 'E1'; \n" +
                       "END nodb_proc_edition;";
            conn.execute(
              proc,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          function(cb) {
            var sql = `alter session set edition = ${edition2}`;
            conn.execute(
              sql,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          // Create procedure in context of Edition E2
          function(cb) {
            var proc = "CREATE OR REPLACE PROCEDURE nodb_proc_edition (str OUT STRING) \n" +
                       "AS \n" +
                       "BEGIN \n" +
                       "    str := 'E2'; \n" +
                       "END nodb_proc_edition;";
            conn.execute(
              proc,
              function(err) {
                should.not.exist(err);
                cb();
              }
            );
          },
          function(cb) {
            conn.close(function(err) {
              should.not.exist(err);
              cb();
            });
          }
        ], done);
      }
    });


  }); // before()

  after(async function() {
    if (isRunnable && dbConfig.test.DBA_PRIVILEGE) {
      try {
        for (var i = editionList.length - 1; i >= 0 ; i--) {
          await dbaConn.execute(`DROP EDITION ${editionList[i]} CASCADE`);
        }
      } catch (err) {
        // ORA-38810: Implementation restriction: cannot drop edition that has a parent and a child
        if (err && !err.message.startsWith("ORA-38810")) {
          should.not.exist(err);
        }
      } finally {
        await dbaConn.execute(`DROP USER ${schemaEdition} CASCADE`);
        await dbaConn.close();
      }
    }

  }); // after()

  it('160.1 Default. No edition. Direct connection.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
      ], done);
    }

  }); // 160.1

  it('160.2 Default. No edition. Pooled connection.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var poolInst, connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              connInst = connection;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.2

  it('160.3 Direct connection. Set edition at getting connection.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          edition2
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.3

  it('160.4 Pooled connection. Set edition at creating pool.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var poolInst, connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          edition1
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              connInst = connection;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E1'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.4

  it('160.5 Direct connection. Change session edition.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          edition2
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        // Change to Edition e1
        function(cb) {
          var sql = `alter session set edition = ${edition1}`;
          connInst.execute(
            sql,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E1'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.5

  it('160.6 Pooled connection. Change session edition.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var poolInst, connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition          : edition1
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              connInst = connection;
              cb();
            }
          );
        },
        // Change to Edition default
        function(cb) {
          var sql = "alter session set edition = ora$base";
          connInst.execute(
            sql,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.6

  it('160.7 sets edition globally. Direct connection.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          oracledb.edition = edition2;
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          oracledb.edition = '';
          cb();
        },
        // This global property only takes effect at connection creation.
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
      ], done);
    }

  }); // 160.7

  it('160.8 sets edition globally. Pooled connection.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var poolInst, connInst, conn2;
      async.series([
        function(cb) {
          oracledb.edition = edition2;
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              connInst = connection;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          oracledb.edition = '';
          cb();
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              conn2 = connection;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          conn2.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          conn2.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },

      ], done);
    }

  }); // 160.8

  it('160.9 Negative - sets nonexistent edition globally', function(done) {

    if (!isRunnable) {
      done();
    } else {
      async.series([
        function(cb) {
          oracledb.edition = 'nonexistence';
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.exist(err);
              should.not.exist(conn);
              (err.message).should.startWith("ORA-38802: ");
              // ORA-38802: edition does not exist
              cb();
            }
          );
        },
        function(cb) {
          oracledb.edition = '';
          cb();
        },
      ], done);
    }

  }); // 160.9

  it('160.10 Direct connection. Set nonexistent edition.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var credential = {
        user:             schemaEdition,
        password:         nodbSchemaEditionPassword,
        connectionString: dbConfig.connectString,
        edition:          "nonexistence"
      };
      oracledb.getConnection(
        credential,
        function(err, conn) {
          should.exist(err);
          should.not.exist(conn);
          (err.message).should.startWith("ORA-38802: ");
          done();
        }
      );
    }

  }); // 160.10

  it('160.11 Pooled connection. Set nonexistent edition.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var poolInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          "nonexistence"
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.exist(err);
              should.not.exist(connection);
              (err.message).should.startWith("ORA-38802: ");
              cb();
            }
          );
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.11

  it('160.12 sets to ora$base with direct connection', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          "ora$base"
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.12

  it('160.13 resets to ora$base in direct connection', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          edition2
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        // Change to Edition e1
        function(cb) {
          var sql = "alter session set edition = ora$base";
          connInst.execute(
            sql,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.13

  it('160.14 sets to ora$base with pooled connection', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var poolInst, connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          "ora$base"
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              connInst = connection;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        }
      ], done);
    }

  }); // 160.14

  it('160.15 sets to ora$base globally', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          oracledb.edition = 'ora$base';
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          oracledb.edition = edition2;
          cb();
        },
        // This global property only takes effect at connection creation.
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
      ], done);
    }

  }); // 160.15

  it('160.16 overrides the global setting. Direct connection', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          oracledb.edition = edition1;
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          edition2
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          oracledb.edition = '';
          cb();
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
      ], done);
    }

  }); // 160.16

  it('160.17 sets to empty string. Direct connection.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          ""
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E0'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
      ], done);
    }

  }); // 160.17

  it('160.18 Negative - invalid type. Direct connection.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var credential = {
        user:             schemaEdition,
        password:         nodbSchemaEditionPassword,
        connectionString: dbConfig.connectString,
        edition:          123
      };
      oracledb.getConnection(
        credential,
        function(err, conn) {
          should.exist(err);
          should.not.exist(conn);
          should.strictEqual(
            err.message,
            'NJS-007: invalid value for "edition" in parameter 1'
          );
          done();
        }
      );
    }

  }); // 160.18

  it('160.19 Negative - invalid type. Pooled connection.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var credential = {
        user:             schemaEdition,
        password:         nodbSchemaEditionPassword,
        connectionString: dbConfig.connectString,
        edition:          123
      };
      oracledb.createPool(
        credential,
        function(err, pool) {
          should.exist(err);
          should.strictEqual(
            err.message,
            'NJS-007: invalid value for "edition" in parameter 1'
          );
          should.not.exist(pool);
          done();
        }
      );
    }

  }); // 160.19

  it('160.20 sets ORA_EDITION. Direct connection.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var connInst;
      async.series([
        function(cb) {
          process.env.ORA_EDITION = edition1;
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E1'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          delete process.env.ORA_EDITION;
          cb();
        }
      ], done);
    }

  }); // 160.20

  it('160.21 sets ORA_EDITION. Pooled connection.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var poolInst, connInst;
      async.series([
        function(cb) {
          process.env.ORA_EDITION = edition2;
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              connInst = connection;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          delete process.env.ORA_EDITION;
          cb();
        }
      ], done);
    }

  }); // 160.21

  it('160.22 sets ORA_EDITION. Direct connection. Set edition at getting connection.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var connInst;

      async.series([
        function(cb) {
          process.env.ORA_EDITION = edition1;
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          edition2
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.not.exist(err);
              connInst = conn;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E2'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          delete process.env.ORA_EDITION;
          cb();
        }
      ], done);
    }

  }); // 160.22

  it('160.23 sets ORA_EDITION. Pooled connection. Set edition at creating pool.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      var poolInst, connInst;

      async.series([
        function(cb) {
          process.env.ORA_EDITION = edition2;
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString,
            edition:          edition1
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.not.exist(err);
              connInst = connection;
              cb();
            }
          );
        },
        function(cb) {
          var proc = "begin nodb_proc_edition(:out); end;";
          connInst.execute(
            proc,
            { out: { type: oracledb.STRING, dir: oracledb.BIND_OUT } },
            function(err, result) {
              should.not.exist(err);
              should.strictEqual(
                result.outBinds.out,
                'E1'
              );
              cb();
            }
          );
        },
        function(cb) {
          connInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          delete process.env.ORA_EDITION;
          cb();
        }
      ], done);
    }

  }); // 160.23

  it('160.24 Negative - Sets ORA_EDITION with nonexistent value. Direct connection.', function(done) {

    if (!isRunnable) {
      done();
    } else {
      async.series([
        function(cb) {
          process.env.ORA_EDITION = 'nonexistence';
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.getConnection(
            credential,
            function(err, conn) {
              should.exist(err);
              should.not.exist(conn);
              (err.message).should.startWith("ORA-38802: ");
              // ORA-38802: edition does not exist
              cb();
            }
          );
        },
        function(cb) {
          delete process.env.ORA_EDITION;
          cb();
        }
      ], done);
    }

  }); // 160.24

  it('160.25 Negative - Sets ORA_EDITION with nonexistent value. Pooled connection.', function(done) {
    if (!isRunnable) {
      done();
    } else {
      var poolInst;

      async.series([
        function(cb) {
          process.env.ORA_EDITION = 'nonexistence';
          cb();
        },
        function(cb) {
          var credential = {
            user:             schemaEdition,
            password:         nodbSchemaEditionPassword,
            connectionString: dbConfig.connectString
          };
          oracledb.createPool(
            credential,
            function(err, pool) {
              should.not.exist(err);
              poolInst = pool;
              cb();
            }
          );
        },
        function(cb) {
          poolInst.getConnection(
            function(err, connection) {
              should.exist(err);
              should.not.exist(connection);
              (err.message).should.startWith("ORA-38802: ");
              cb();
            }
          );
        },
        function(cb) {
          poolInst.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
        function(cb) {
          delete process.env.ORA_EDITION;
          cb();
        }
      ], done);
    }

  }); // 160.25

});
