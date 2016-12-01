/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
 *   9. columnMetadata.js
 *
 * DESCRIPTION
 *   Testing properties of column meta data.
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

describe('9. columnMetadata.js', function(){

  var connection = null;
  before('get a connection', function(done) {
    oracledb.getConnection(
      {
        user:          dbConfig.user,
        password:      dbConfig.password,
        connectString: dbConfig.connectString
      },
      function(err, conn) {
        should.not.exist(err);
        connection = conn;
        done();
      }
    );
  });

  after('release the connection', function(done) {
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  describe('9.1 tests with the same table', function() {

    before('create the table', function(done) {
      var proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE ('DROP TABLE nodb_cmd'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_cmd ( \n" +
                 "            department_id NUMBER,  \n" +
                 "            department_name VARCHAR2(20), \n" +
                 "            manager_id NUMBER, \n" +
                 "            location_id NUMBER \n" +
                 "        ) \n" +
                 "    '); \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        INSERT INTO nodb_cmd VALUES \n" +
                 "        (40,''Human Resources'', 203, 2400) \n" +
                 "    '); \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        INSERT INTO nodb_cmd VALUES \n" +
                 "        (50,''Shipping'', 121, 1500) \n" +
                 "    '); \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        INSERT INTO nodb_cmd VALUES \n" +
                 "        (90, ''Executive'', 100, 1700) \n" +
                 "    '); \n" +
                 "END; ";

      connection.execute(
        proc,
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // before

    after(function(done) {
      connection.execute(
        "DROP TABLE nodb_cmd",
        function(err) {
          should.not.exist(err);
          done();
        }
      );
    }); // after

    it('9.1.1 shows metaData correctly when retrieving 1 column from a 4-column table', function(done){

      connection.execute(
        "SELECT location_id FROM nodb_cmd WHERE department_id = :did",
        [50],
        function(err, result){
          should.not.exist(err);
          (result.rows[0][0]).should.be.exactly(1500);
          (result.metaData[0].name).should.eql('LOCATION_ID');
          done();
        }
      );
    }); // 9.1.1

    it('9.1.2 shows metaData when retrieving 2 columns. MetaData is correct in content and sequence', function(done){

      connection.execute(
        "SELECT department_id, department_name FROM nodb_cmd WHERE location_id = :lid",
        [1700],
        function(err, result){
          should.not.exist(err);
          (result.rows[0]).should.eql([ 90, 'Executive' ]);
          (result.metaData[0].name).should.eql('DEPARTMENT_ID');
          (result.metaData[1].name).should.eql('DEPARTMENT_NAME');
          done();
        }
      );
    });

    it('9.1.3 shows metaData correctly when retrieve 3 columns', function(done){

      connection.execute(
        "SELECT department_id, department_name, manager_id FROM nodb_cmd WHERE location_id = :lid",
        [2400],
        function(err, result){
          should.not.exist(err);
          (result.rows[0]).should.eql([ 40, 'Human Resources', 203 ]);
          (result.metaData[0].name).should.eql('DEPARTMENT_ID');
          (result.metaData[1].name).should.eql('DEPARTMENT_NAME');
          (result.metaData[2].name).should.eql('MANAGER_ID');
          done();
        }
      );
    });

    it('9.1.4 shows metaData correctly when retrieving all columns with [SELECT * FROM table] statement', function(done){

      connection.execute(
        "SELECT * FROM nodb_cmd ORDER BY department_id",
        function(err, result){
          should.not.exist(err);
          result.rows.length.should.be.exactly(3);
          result.metaData.length.should.be.exactly(4);
          result.metaData[0].name.should.eql('DEPARTMENT_ID');
          result.metaData[1].name.should.eql('DEPARTMENT_NAME');
          result.metaData[2].name.should.eql('MANAGER_ID');
          result.metaData[3].name.should.eql('LOCATION_ID');
          done();
        }
      );
    }); // 9.1.4

    it('9.1.5 works for SELECT count(*)', function(done){

      connection.execute(
        "SELECT count(*) FROM nodb_cmd",
        function(err, result){
          should.not.exist(err);
          result.rows[0][0].should.be.exactly(3);
          result.metaData.should.be.ok();
          result.metaData[0].name.should.eql('COUNT(*)');
          done();
        }
      );
    }); // 9.1.5

    it('9.1.6 works when a query returns no rows', function(done){

      connection.execute(
        "SELECT * FROM nodb_cmd WHERE department_id = :did",
        [100],
        function(err, result){
          should.not.exist(err);
          (result.rows.length).should.be.exactly(0);
          result.metaData[0].name.should.eql('DEPARTMENT_ID');
          result.metaData[1].name.should.eql('DEPARTMENT_NAME');
          result.metaData[2].name.should.eql('MANAGER_ID');
          result.metaData[3].name.should.eql('LOCATION_ID');
          done();
        }
      );
    }); // 9.1.6

    it('9.1.7 only works for SELECT statement, does not work for INSERT', function(done){

      connection.execute(
        "INSERT INTO nodb_cmd VALUES (99, 'FACILITY', 456, 1700)",
        function(err, result){
          should.not.exist(err);
          (result.rowsAffected).should.be.exactly(1);
          should.not.exist(result.metaData);

          connection.execute(
            'SELECT * FROM nodb_cmd WHERE department_id = :1',
            [99],
            function(err, result){
              should.not.exist(err);
              result.metaData.should.be.ok();
              result.metaData.length.should.be.exactly(4);
              result.metaData[0].name.should.eql('DEPARTMENT_ID');
              result.metaData[1].name.should.eql('DEPARTMENT_NAME');
              result.metaData[2].name.should.eql('MANAGER_ID');
              result.metaData[3].name.should.eql('LOCATION_ID');
              result.rows[0].should.eql([ 99, 'FACILITY', 456, 1700 ]);
              done();
            }
          );
        }
      );
    }); // 9.1.7

    it('9.1.8 only works for SELECT statement, does not work for UPDATE', function(done){

      connection.execute(
        "UPDATE nodb_cmd SET department_name = 'Finance' WHERE department_id = :did",
        { did: 40 },
        function(err, result){
          should.not.exist(err);
          (result.rowsAffected).should.be.exactly(1);
          should.not.exist(result.metaData);

          connection.execute(
            "SELECT department_name FROM nodb_cmd WHERE department_id = :1",
            [40],
            function(err, result){
              should.not.exist(err);
              result.metaData.should.be.ok();
              result.metaData[0].name.should.eql('DEPARTMENT_NAME');
              result.rows[0][0].should.eql('Finance');
              done();
            }
          );
        }
      );
    }); // 9.1.8

    it('9.1.9 works with a SQL WITH statement', function(done){

      var sqlWith = "WITH nodb_dep AS " +
                    "(SELECT * FROM nodb_cmd WHERE location_id < 2000) " +
                    "SELECT * FROM nodb_dep WHERE department_id > 50 ORDER BY department_id";

      connection.execute(
        sqlWith,
        function(err, result) {
          should.not.exist(err);
          result.rows[0].should.eql([ 90, 'Executive', 100, 1700 ]);
          result.metaData[0].name.should.eql('DEPARTMENT_ID');
          result.metaData[1].name.should.eql('DEPARTMENT_NAME');
          result.metaData[2].name.should.eql('MANAGER_ID');
          result.metaData[3].name.should.eql('LOCATION_ID');
          done();
        }
      );
    }); // 9.1.9

    it('9.1.10 displays metaData correctly with result set', function(done) {
      connection.execute(
        "SELECT * FROM nodb_cmd ORDER BY department_id",
        [],
        { resultSet: true },
        function(err, result) {
          should.not.exist(err);
          (result.metaData[0].name).should.eql('DEPARTMENT_ID');
          (result.metaData[1].name).should.eql('DEPARTMENT_NAME');
          (result.metaData[2].name).should.eql('MANAGER_ID');
          (result.metaData[3].name).should.eql('LOCATION_ID');
          done();
        }
      );
    });

  }); // 9.1

  describe('9.2 case sensitive', function() {
    it('9.2.1 works for tables whose column names were created case sensitively', function(done){

      async.series([
        function(callback){

          var proc = "BEGIN \n" +
                     "    DECLARE \n" +
                     "        e_table_missing EXCEPTION; \n" +
                     "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                     "    BEGIN \n" +
                     "        EXECUTE IMMEDIATE ('DROP TABLE nodb_casesensitive'); \n" +
                     "    EXCEPTION \n" +
                     "        WHEN e_table_missing \n" +
                     "        THEN NULL; \n" +
                     "    END; \n" +
                     "    EXECUTE IMMEDIATE (' \n" +
                     "        CREATE TABLE nodb_casesensitive ( \n" +
                     "            id NUMBER,  \n" +
                     '           "nAme" VARCHAR2(20) \n' +
                     "        ) \n" +
                     "    '); \n" +
                     "END; ";

          connection.execute(
            proc,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "SELECT * FROM nodb_casesensitive",
            function(err, result) {
              should.not.exist(err);
              (result.rows.length).should.be.exactly(0);
              result.metaData[0].name.should.eql('ID');
              result.metaData[1].name.should.eql('nAme');
              callback();
            }
          );
        },
        function(callback){
          connection.execute(
            "DROP TABLE nodb_casesensitive",
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    }); // 9.2.1
  });  // 9.2

  describe('9.3 Large number of columns', function() {

    it('9.10 works with a large number of columns', function(done){

      var column_size = 100;
      var columns_string = genColumns(column_size);

      function genColumns(size) {
        var buffer = [];
        for(var i = 0; i < size; i++) {
          buffer[i] = " column_" + i + " NUMBER";
        }
        return buffer.join();
      }

      var table_name = "nodb_large_columns";
      var sqlSelect = "SELECT * FROM " + table_name;
      var sqlDrop = "DROP TABLE " + table_name;

      var proc = "BEGIN \n" +
                 "    DECLARE \n" +
                 "        e_table_missing EXCEPTION; \n" +
                 "        PRAGMA EXCEPTION_INIT(e_table_missing, -00942);\n " +
                 "    BEGIN \n" +
                 "        EXECUTE IMMEDIATE ('DROP TABLE nodb_large_columns'); \n" +
                 "    EXCEPTION \n" +
                 "        WHEN e_table_missing \n" +
                 "        THEN NULL; \n" +
                 "    END; \n" +
                 "    EXECUTE IMMEDIATE (' \n" +
                 "        CREATE TABLE nodb_large_columns ( \n" +
                 columns_string +
                 "        ) \n" +
                 "    '); \n" +
                 "END; ";

      async.series([
        function(callback) {
          connection.execute(
            proc,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            sqlSelect,
            function(err, result) {
              should.not.exist(err);
              for(var i = 0; i < column_size; i++){
                result.metaData[i].name.should.eql('COLUMN_' + i);
              }
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            sqlDrop,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });
  }); // 9.3

  describe('9.4 single character column', function() {

    it('9.4.1 works with column names consisting of single characters', function(done){

      var tableName = "nodb_single_char";
      var sqlCreate =
          "BEGIN \n" +
          "   DECLARE \n" +
          "       e_table_missing EXCEPTION; \n" +
          "       PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "   BEGIN \n" +
          "       EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); \n" +
          "   EXCEPTION \n" +
          "       WHEN e_table_missing \n" +
          "       THEN NULL; \n" +
          "   END; \n" +
          "   EXECUTE IMMEDIATE (' \n" +
          "       CREATE TABLE " + tableName +" ( \n" +
          "           a VARCHAR2(20),  \n" +
          '           b VARCHAR2(20) \n' +
          "       ) \n" +
          "   '); \n" +
          "END; \n";
      var sqlSelect = "SELECT * FROM " + tableName;
      var sqlDrop = "DROP TABLE " + tableName;

      async.series([
        function(callback) {
          connection.execute(
            sqlCreate,
            function(err){
              should.not.exist(err);
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            sqlSelect,
            function(err, result){
              should.not.exist(err);
              result.metaData[0].name.should.eql('A');
              result.metaData[1].name.should.eql('B');
              callback();
            }
          );
        },
        function(callback) {
          connection.execute(
            sqlDrop,
            function(err) {
              should.not.exist(err);
              callback();
            }
          );
        }
      ], done);
    });
  }); // 9.4

  describe('9.5 duplicate column alias', function() {

    it('9.5.1 works when using duplicate column alias', function(done) {
      connection.execute(
        "SELECT 1 a, 'abc' a FROM dual",
        function(err, result) {
          should.not.exist(err);
          result.metaData[0].name.should.eql('A');
          result.metaData[1].name.should.eql('A');
          done();
        }
      );
    });
  });

});
