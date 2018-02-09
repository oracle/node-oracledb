/* Copyright (c) 2016, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   45. instanceof.js
 *
 * DESCRIPTION
 *   Testing JS instanceof.
 *
 *****************************************************************************/
'use strict';

var oracledb = require('oracledb');
var should   = require('should');
var dbConfig = require('./dbconfig.js');

describe('45. instanceof.js', function() {

  it('45.1 instanceof works for the oracledb instance', function(done) {
    (oracledb instanceof oracledb.Oracledb).should.be.true();

    done();
  });

  it('45.2 instanceof works for pool instances', function(done) {
    oracledb.createPool(
      {
        user              : dbConfig.user,
        password          : dbConfig.password,
        connectString     : dbConfig.connectString,
        poolMin           : 0,
        poolMax           : 1,
        poolIncrement     : 1
      },
      function(err, pool){
        should.not.exist(err);

        (pool instanceof oracledb.Pool).should.be.true();

        pool.terminate(function(err) {
          should.not.exist(err);

          done();
        });
      }
    );
  });

  it('45.3 instanceof works for connection instances', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        should.not.exist(err);

        (conn instanceof oracledb.Connection).should.be.true();

        conn.release(function(err) {
          should.not.exist(err);

          done();
        });
      }
    );
  });

  it('45.4 instanceof works for resultset instances', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        should.not.exist(err);

        conn.execute(
          'select 1 from dual union select 2 from dual',
          [], // no binds
          {
            resultSet: true
          },
          function(err, result) {
            should.not.exist(err);

            (result.resultSet instanceof oracledb.ResultSet).should.be.true();

            result.resultSet.close(function(err) {
              should.not.exist(err);

              conn.release(function(err) {
                should.not.exist(err);

                done();
              });
            });
          }
        );
      }
    );
  });

  it('45.5 instanceof works for lob instances', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        should.not.exist(err);

        conn.execute(
          'select to_clob(dummy) from dual',
          function(err, result) {
            should.not.exist(err);

            (result.rows[0][0] instanceof oracledb.Lob).should.be.true();

            var lob = result.rows[0][0];

            lob.on("close", function(err) {
              should.not.exist(err);

              conn.release(function(err) {
                should.not.exist(err);

                done();
              });

            }); // lob close event

            lob.on("error", function(err) {
              should.not.exist(err, "lob.on 'error' event.");
            });

            lob.close(function(err) {
              should.not.exist(err);
            });

          }
        );
      }
    );
  }); // 45.5

});
