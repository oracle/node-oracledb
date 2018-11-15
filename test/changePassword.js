/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   161. changePassword.js
 *
 * DESCRIPTION
 *   Test changing passords feature and connecting with an expired password.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var async    = require('async');
var dbconfig = require('./dbconfig.js');

describe('161. changePassword.js', function() {

  var DBA_config;
  var myUser = "nodb_schema_changepw";
  if (dbconfig.test.DBA_PRIVILEGE == true) {
    DBA_config = {
      user:          dbconfig.test.DBA_user,
      password:      dbconfig.test.DBA_password,
      connectString: dbconfig.connectString,
      privilege:     oracledb.SYSDBA
    };
  }

  before(function(done) {

    if (!dbconfig.test.DBA_PRIVILEGE) this.skip();

    var dbaConn;
    async.series([
      // create schema for test
      function(cb) {
        oracledb.getConnection(
          DBA_config,
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
                      "        e_user_missing EXCEPTION; \n" +
                      "        PRAGMA EXCEPTION_INIT(e_user_missing, -01918); \n" +
                      "    BEGIN \n" +
                      "        EXECUTE IMMEDIATE('DROP USER " + myUser + " CASCADE'); \n" +
                      "    EXCEPTION \n" +
                      "        WHEN e_user_missing \n" +
                      "        THEN NULL; \n" +
                      "    END; \n" +
                      "    EXECUTE IMMEDIATE (' \n" +
                      "        CREATE USER " + myUser + " IDENTIFIED BY " + myUser + "\n" +
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
        var sql = "GRANT CREATE SESSION to " + myUser;
        dbaConn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        dbaConn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // before

  after(function(done) {
    if (!dbconfig.test.DBA_PRIVILEGE) {
      done();
    } else {
      var dbaConn;
      async.series([
        function(cb) {
          oracledb.getConnection(
            DBA_config,
            function(err, connection) {
              should.not.exist(err);
              dbaConn = connection;
              cb();
            }
          );
        },
        function(cb) {
          var sql = "DROP USER " + myUser +" CASCADE";
          dbaConn.execute(
            sql,
            function(err) {
              should.not.exist(err);
              cb();
            }
          );
        },
        function(cb) {
          dbaConn.close(function(err) {
            should.not.exist(err);
            cb();
          });
        },
      ], done);
    }
  }); // after

  it('161.1 basic case', function(done) {

    var conn;
    var tpass = 'secret';

    async.series([
      function doconnect(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
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
      function dochange(cb) {
        conn.changePassword(myUser, myUser, tpass, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         tpass,
          connectionString: dbconfig.connectString
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
      function dorestore(cb) {
        conn.changePassword(myUser, tpass, myUser, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
    ], done);
  }); // 161.1

  it('161.2 pooled connection', function(done) {

    var pool, conn;
    var tpass = 'secret';

    async.series([
      function dopool(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
        };
        oracledb.createPool(
          credential,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;
            cb();
          }
        );
      },
      function doconnect(cb) {
        pool.getConnection(function(err, connection) {
          should.not.exist(err);
          conn = connection;
          cb();
        });
      },
      function dochange(cb) {
        conn.changePassword(myUser, myUser, tpass, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      // Still able to get connections
      function(cb) {
        pool.getConnection(function(err, connection) {
          should.not.exist(err);
          conn = connection;
          cb();
        });
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function donegative(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
        };
        oracledb.createPool(
          credential,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;
            cb();
          }
        );
      },
      function errorOut(cb) {
        pool.getConnection(function(err, connection) {
          should.exist(err);
          (err.message).should.startWith('ORA-01017: ');
          // ORA-01017: invalid username/password
          should.not.exist(connection);
          cb();
        });
      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         tpass,
          connectionString: dbconfig.connectString
        };
        oracledb.createPool(
          credential,
          function(err, pooling) {
            should.not.exist(err);
            pool = pooling;
            cb();
          }
        );
      },
      function doconnect(cb) {
        pool.getConnection(function(err, connection) {
          should.not.exist(err);
          conn = connection;
          cb();
        });
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        pool.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
    ], done);
  }); // 161.2

  it('161.3 DBA changes password', function(done) {

    var dbaConn, conn;
    var tpass = 'secret';

    async.series([
      function(cb) {
        oracledb.getConnection(
          DBA_config,
          function(err, connection) {
            should.not.exist(err);
            dbaConn = connection;
            cb();
          }
        );
      },
      function(cb) {
        dbaConn.changePassword(myUser, '', tpass, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function errorOut(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
        };

        oracledb.getConnection(
          credential,
          function(err, connection) {
            should.exist(err);
            (err.message).should.startWith('ORA-01017: ');
            // ORA-01017: invalid username/password
            should.not.exist(connection);
            cb();
          }
        );
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         tpass,
          connectionString: dbconfig.connectString
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
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function dorestore(cb) {
        dbaConn.changePassword(myUser, '', myUser, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        dbaConn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // 161.3

  it('161.4 connects with an expired password', function(done) {

    var dbaConn, conn;
    var tpass = 'secret';

    async.series([
      function(cb) {
        oracledb.getConnection(
          DBA_config,
          function(err, connection) {
            should.not.exist(err);
            dbaConn = connection;
            cb();
          }
        );
      },
      function doexpire(cb) {
        var sql = "alter user " + myUser + " password expire";
        dbaConn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
        };

        oracledb.getConnection(
          credential,
          function(err, connection) {
            should.exist(err);
            (err.message).should.startWith('ORA-28001:');
            // ORA-28001: the password has expired
            should.not.exist(connection);
            cb();
          }
        );
      },
      function dotest(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          newPassword:      tpass,
          connectionString: dbconfig.connectString
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
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function dorestore(cb) {
        dbaConn.changePassword(myUser, '', myUser, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
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
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        dbaConn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // 161.4

  it('161.5 for DBA, the original password is ignored', function(done) {

    var dbaConn, conn;
    var tpass = 'secret';

    async.series([
      function(cb) {
        oracledb.getConnection(
          DBA_config,
          function(err, connection) {
            should.not.exist(err);
            dbaConn = connection;
            cb();
          }
        );
      },
      function(cb) {
        dbaConn.changePassword(myUser, 'foobar', tpass, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function errorOut(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
        };

        oracledb.getConnection(
          credential,
          function(err, connection) {
            should.exist(err);
            (err.message).should.startWith('ORA-01017: ');
            // ORA-01017: invalid username/password
            should.not.exist(connection);
            cb();
          }
        );
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         tpass,
          connectionString: dbconfig.connectString
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
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function dorestore(cb) {
        dbaConn.changePassword(myUser, '', myUser, function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        dbaConn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // 161.5

  it('161.6 Negative: basic case, wrong original password', function(done) {

    var conn;
    var tpass = 'secret';

    async.series([
      function doconnect(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
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
      function dochange(cb) {
        var wrongOne = 'foobar';

        conn.changePassword(myUser, wrongOne, tpass, function(err) {
          should.exist(err);
          // ORA-28008: invalid old password
          (err.message).should.startWith('ORA-28008:');
          cb();
        });
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         tpass,
          connectionString: dbconfig.connectString
        };
        oracledb.getConnection(
          credential,
          function(err) {
            should.exist(err);
            // ORA-01017: invalid username/password
            (err.message).should.startWith('ORA-01017: ');
            cb();
          }
        );
      },
    ], done);
  }); // 161.6

  it('161.7 Negative: basic case. invalid parameter', function(done) {
    var conn;
    var tpass = 123;

    async.series([
      function doconnect(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
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
      function dochange(cb) {
        should.throws(
          function() {
            conn.changePassword(myUser, myUser, tpass, function(err) {
              should.exist(err);
              console.log(err);
            });
          },
          /NJS-006: invalid type for parameter 3/
        );
        cb();
      },
      function(cb) {
        conn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
    ], done);
  }); // 161.7

  it('161.8 Negative: non-DBA tries to change the password', function(done) {

    var tUser = "nodb_schema_temp";
    var dbaConn, tConn;
    var tpass = 'secret';

    async.series([
      function(cb) {
        oracledb.getConnection(
          DBA_config,
          function(err, connection) {
            should.not.exist(err);
            dbaConn = connection;
            cb();
          }
        );
      },
      // Create user
      function(cb) {
        var sql = "CREATE USER " + tUser + " IDENTIFIED BY " + tUser;
        dbaConn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        var sql = "GRANT CREATE SESSION to " + tUser;
        dbaConn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function doconnect(cb) {
        var credential = {
          user:             tUser,
          password:         tUser,
          connectionString: dbconfig.connectString
        };

        oracledb.getConnection(
          credential,
          function(err, connection) {
            should.not.exist(err);
            tConn = connection;
            cb();
          }
        );
      },
      function(cb) {
        tConn.changePassword(myUser, myUser, tpass, function(err) {
          should.exist(err);
          // ORA-01031: insufficient privileges
          (err.message).should.startWith('ORA-01031: ');
          cb();
        });
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         tpass,
          connectionString: dbconfig.connectString
        };
        oracledb.getConnection(
          credential,
          function(err) {
            should.exist(err);
            // ORA-01017: invalid username/password
            (err.message).should.startWith('ORA-01017: ');
            cb();
          }
        );
      },
      function(cb) {
        tConn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      },
      function(cb) {
        var sql = "DROP USER " + tUser +" CASCADE";
        dbaConn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function(cb) {
        dbaConn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);

  }); // 161.8

  it("161.9 Negative: invalid type of 'newPassword'", function(done) {

    var wrongOne = 123;
    var credential = {
      user:             myUser,
      password:         myUser,
      newPassword:      wrongOne,
      connectionString: dbconfig.connectString
    };

    oracledb.getConnection(
      credential,
      function(err, connection) {
        should.exist(err);
        should.not.exist(connection);
        should.strictEqual(
          err.message,
          'NJS-008: invalid type for "newPassword" in parameter 1'
        );
        done();
      }
    );
  }); // 161.9

  it('161.10 sets "newPassword" to be an empty string. password unchanged', function(done) {
    var dbaConn;
    async.series([
      function(cb) {
        oracledb.getConnection(
          DBA_config,
          function(err, connection) {
            should.not.exist(err);
            dbaConn = connection;
            cb();
          }
        );
      },
      function doexpire(cb) {
        var sql = "alter user " + myUser + " password expire";
        dbaConn.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      },
      function dotest(cb) {
        // set empty string
        var credential = {
          user:             myUser,
          password:         myUser,
          newPassword:      '',
          connectionString: dbconfig.connectString
        };

        oracledb.getConnection(
          credential,
          function(err, connection) {
            should.exist(err);
            (err.message).should.startWith('ORA-28001:');
            // ORA-28001: the password has expired
            should.not.exist(connection);
            cb();
          }
        );
      },
      function doverify(cb) {
        var credential = {
          user:             myUser,
          password:         myUser,
          connectionString: dbconfig.connectString
        };

        oracledb.getConnection(
          credential,
          function(err, connection) {
            should.exist(err);
            (err.message).should.startWith('ORA-28001:');
            // ORA-28001: the password has expired
            should.not.exist(connection);
            cb();
          }
        );
      },
      function(cb) {
        dbaConn.close(function(err) {
          should.not.exist(err);
          cb();
        });
      }
    ], done);
  }); // 161.10

});
