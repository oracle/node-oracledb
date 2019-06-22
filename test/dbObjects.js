/* Copyright (c) 2019. Oracle and/or its affiliates.  All rights reserved. */
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
 *   193. dbObject.js
 *
 * DESCRIPTION
 *    Testing Oracle Database Object type(s)
 *
 *****************************************************************************/
'use strict';

var oracledb = require ('oracledb');
var should   = require ( 'should' );
var async    = require ( 'async' ) ;
var dbConfig = require ('./dbconfig.js');


describe ('193. Database Object type(s)', function () {

  var connection = null;
  before ('get one connection', function (done) {
    oracledb.getConnection (
      {
        user :  dbConfig.user,
        password : dbConfig.password, 
        connectString : dbConfig.connectString
      },
      function (err, conn) {
        should.not.exist (err);
        connection = conn;
        done();
      }
    );
  });


  after ('release connection', function(done) {
    connection.release (function (err) {
      should.not.exist(err);
      done();
    });
  });
  
  it('193.1 Insert an object with normal numeric/string values of attributes',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST1_TYP AS OBJECT (  \n" +
                    "    ID  NUMBER, \n" +
                    "    NAME VARCHAR2(30) \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr1 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr1 ( \n" +
           "      PERSON       NODB_TEST1_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr1 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST1_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit ( function (err) {
               should.not.exist (err);
               cb();
             });
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR1 VALUES (:1)';
         var objData = {
           ID : 201,
           NAME : 'Christopher Jones'
         };
         connection.getDbObjectClass (
           "NODB_TEST1_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR1";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               should.strictEqual ( obj['ID'], 201);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );


  it('193.2 Insert an object with null numeric/string values of attributes',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST2_TYP AS OBJECT (  \n" +
                    "    ID  NUMBER, \n" +
                    "    NAME VARCHAR2(30) \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr2 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr2 ( \n" +
           "      PERSON       NODB_TEST2_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr2 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST2_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR2 VALUES (:1)';
         var objData = {
           ID : null,
           NAME : 'Christopher Jones'
         };
         connection.getDbObjectClass (
           "NODB_TEST2_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR2";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               should.strictEqual ( obj['ID'], undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );


  it('193.3 Insert an object with null string values of attributes',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST3_TYP AS OBJECT (  \n" +
                    "    ID  NUMBER, \n" +
                    "    NAME VARCHAR2(30) \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr3 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr3 ( \n" +
           "      PERSON       NODB_TEST3_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr3 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST3_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR3 VALUES (:1)';
         var objData = {
           ID :301,
           NAME : null
         };
         connection.getDbObjectClass (
           "NODB_TEST3_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR3";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               should.strictEqual ( obj.NAME, undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );



  it('193.4 Insert an object with undefined numeric values of attributes',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST4_TYP AS OBJECT (  \n" +
                    "    ID  NUMBER, \n" +
                    "    NAME VARCHAR2(30) \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr4 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr4 ( \n" +
           "      PERSON       NODB_TEST4_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr4 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST4_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR4 VALUES (:1)';
         var objData = {
           ID : undefined,
           NAME : 'Christopher Jones'
         };
         connection.getDbObjectClass (
           "NODB_TEST4_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR2";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               should.strictEqual ( obj['ID'], undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );


  it('193.5 Insert an object with undefined string values of attributes',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST5_TYP AS OBJECT (  \n" +
                    "    ID  NUMBER, \n" +
                    "    NAME VARCHAR2(30) \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr5 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr5 ( \n" +
           "      PERSON       NODB_TEST5_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr5 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST5_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR5 VALUES (:1)';
         var objData = {
           ID :301,
           NAME : undefined
         };
         connection.getDbObjectClass (
           "NODB_TEST5_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR5";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               should.strictEqual ( obj.NAME, undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );


  it('193.6 Insert an empty object - no attributes',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST6_TYP AS OBJECT (  \n" +
                    "    ID  NUMBER, \n" +
                    "    NAME VARCHAR2(30) \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr6 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr6 ( \n" +
           "      PERSON       NODB_TEST6_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr6 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST6_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR6 VALUES (:1)';
         var objData = {  };    // Empty object
         connection.getDbObjectClass (
           "NODB_TEST6_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR6";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               should.strictEqual ( obj.NAME, undefined);
               should.strictEqual ( obj['ID'], undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );



  it('193.7 Insert value for timestamp attribute',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST7_TYP AS OBJECT (  \n" +
                    "    ENTRY  TIMESTAMP, \n" +
                    "    EXIT   TIMESTAMP \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr7 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr7 ( \n" +
           "      PERSON       NODB_TEST7_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr7 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST7_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR7 VALUES (:1)';
         var objData = {
           ENTRY : new Date (1986, 8, 18, 12, 14, 27, 0).getTime(), 
           EXIT : new Date (1989, 3, 4, 10, 27, 16, 201).getTime()
         };
         connection.getDbObjectClass (
           "NODB_TEST7_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR7";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               // should.strictEqual ( obj.ENTRY, undefined);
               // should.strictEqual ( obj['EXIT'], undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );



  it('193.8 nsert null value for timestamp attribute',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST8_TYP AS OBJECT (  \n" +
                    "    ENTRY  TIMESTAMP, \n" +
                    "    EXIT   TIMESTAMP \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
           "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr8 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr8 ( \n" +
           "      PERSON       NODB_TEST8_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr8 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST8_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR8 VALUES (:1)';
         var objData = {
           ENTRY : null, 
           EXIT : null
         };
         connection.getDbObjectClass (
           "NODB_TEST8_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR8";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               // should.strictEqual ( obj.ENTRY, undefined);
               // should.strictEqual ( obj['EXIT'], undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );




  it('193.9 Insert null value for timestamp attribute',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST9_TYP AS OBJECT (  \n" +
                    "    ENTRY  TIMESTAMP, \n" +
                    "    EXIT   TIMESTAMP \n" +
                    "  ); \n" ;

                    
         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
         "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr9 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr9 ( \n" +
           "      PERSON       NODB_TEST9_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr9 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };
       
       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST9_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };
       
       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR9 VALUES (:1)';
         var objData = {
           ENTRY : null,
           EXIT : null
         };
         connection.getDbObjectClass (
           "NODB_TEST9_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR9";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               // should.strictEqual ( obj.ENTRY, undefined);
               // should.strictEqual ( obj['EXIT'], undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );



  it('193.10 Insert empty JSON value for timestamp attribute',
     function (done) {
       var doCreateType = function(cb) {
         var sql =  "  CREATE TYPE NODB_TEST10_TYP AS OBJECT (  \n" +
                    "    ENTRY  TIMESTAMP, \n" +
                    "    EXIT   TIMESTAMP \n" +
                    "  ); \n" ;

         connection.execute (
           sql,
           { },
           { autoCommit : true },
           function (err, result) {
             should.not.exist (err);
             cb();
           }
         );
       };

       var doCreateTable = function (cb) {
         var proc =
           "BEGIN \n" +
           "  DECLARE \n" +
           "  e_table_missing EXCEPTION; \n" +
           "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
           "  BEGIN \n" +
         "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr10 PURGE');\n" +
           "    EXCEPTION \n" +
           "      WHEN e_table_missing \n" +
           "      THEN NULL; \n" +
           "  END; \n" +
           "  EXECUTE IMMEDIATE (' \n" +
           "    CREATE TABLE nodb_tab_dbobjattr10 ( \n" +
           "      PERSON       NODB_TEST10_TYP \n" +
           "    ) \n" +
           "  '); \n" +
           "END; ";
         connection.execute(
           proc,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };

       var doDropTable = function (cb) {
         var sql = "DROP TABLE nodb_tab_dbObjattr10 PURGE";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             connection.commit (function (err) {
               should.not.exist (err);
               cb ();
             });
           }
         );
       };

       var doDropType = function(cb) {
         var sql = "DROP TYPE NODB_TEST10_TYP";
         connection.execute(
           sql,
           function(err) {
             should.not.exist(err);
             cb();
           }
         );
       };

       var doInsert = function (cb) {
         var sql = 'INSERT INTO NODB_TAB_DBOBJATTR10 VALUES (:1)';

         // empty JSOB object
         var objData = {
         };
         connection.getDbObjectClass (
           "NODB_TEST10_TYP",
           function (err, objType) {
             var testObj = new objType (objData);
             connection.execute (sql, [testObj], function (err, result) {
               should.not.exist (err);
               connection.commit (function (err) {
                 should.not.exist(err);
                 cb();
               });
             });
           }
         );
       };

       var doQuery = function (cb) {
         var sql = "select * from NODB_TAB_DBOBJATTR10";
         connection.execute(
           sql,
           function(err, result) {
             should.not.exist(err);
             var count = result.rows.length;
             for ( var row = 0; row < count; row++) {
               var obj = result.rows[row][0];
               // should.strictEqual ( obj.ENTRY, undefined);
               // should.strictEqual ( obj['EXIT'], undefined);
             }
             cb();
           }
         );
       };

       async.series ([
         doCreateType,
         doCreateTable,
         doInsert,
         doDropTable,
         doDropType
       ], done);
     }
  );


  it ('193.11 Insert normal value for TSZ type attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST11_TYP AS OBJECT ( \n" +
                  "    ENTRY TIMESTAMP WITH TIME ZONE, \n" +
                  "    EXIT  TIMESTAMP WITH TIME ZONE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr11 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr11 ( \n" +
          "      ENTRY_EXIT       NODB_TEST11_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };


      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr11 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };


      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST11_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR11 VALUES (:1)';
        var objData = {
          ENTRY : new Date (1986, 8, 18, 12, 14, 27, 0).getTime(),
          EXIT : new Date (1989, 3, 4, 10, 27, 16, 201).getTime()
        };
        connection.getDbObjectClass (
          "NODB_TEST11_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR11";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );



  it ('193.12 Insert null value for TSZ type attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST12_TYP AS OBJECT ( \n" +
                  "    ENTRY TIMESTAMP WITH TIME ZONE, \n" +
                  "    EXIT  TIMESTAMP WITH TIME ZONE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr12 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr12 ( \n" +
          "      ENTRY_EXIT       NODB_TEST12_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr12 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };


      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST12_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR12 VALUES (:1)';
        var objData = {
          ENTRY : null,
          EXIT : null
        };
        connection.getDbObjectClass (
          "NODB_TEST12_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR12";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );



  it ('193.13 Insert undefined value for TSZ type attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST13_TYP AS OBJECT ( \n" +
                  "    ENTRY TIMESTAMP WITH TIME ZONE, \n" +
                  "    EXIT  TIMESTAMP WITH TIME ZONE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr13 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr13 ( \n" +
          "      ENTRY_EXIT       NODB_TEST13_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };


      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr13 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };


      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST13_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR13 VALUES (:1)';
        var objData = {
          ENTRY : undefined,
          EXIT : undefined
        };
        connection.getDbObjectClass (
          "NODB_TEST13_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR13";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );




  it ('193.14 Insert normal value for LTZ type attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST14_TYP AS OBJECT ( \n" +
                  "    ENTRY TIMESTAMP WITH LOCAL TIME ZONE, \n" +
                  "    EXIT  TIMESTAMP WITH LOCAL TIME ZONE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr14 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr14 ( \n" +
          "      ENTRY_EXIT       NODB_TEST14_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr14 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };

      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST14_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR14 VALUES (:1)';
        var objData = {
          ENTRY : new Date (1986, 8, 18, 12, 14, 27, 0).getTime(),
          EXIT : new Date (1989, 3, 4, 10, 27, 16, 201).getTime()
        };
        connection.getDbObjectClass (
          "NODB_TEST14_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR14";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );



  it ('193.15 Insert null value for LTZ type attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST15_TYP AS OBJECT ( \n" +
                  "    ENTRY TIMESTAMP WITH LOCAL TIME ZONE, \n" +
                  "    EXIT  TIMESTAMP WITH LOCAL TIME ZONE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr15 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr15 ( \n" +
          "      ENTRY_EXIT       NODB_TEST15_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr15 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };

      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST15_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR15 VALUES (:1)';
        var objData = {
          ENTRY : null,
          EXIT : null
        };
        connection.getDbObjectClass (
          "NODB_TEST15_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR15";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );



  it ('193.16 Insert undefined value for LTZ attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST16_TYP AS OBJECT ( \n" +
                  "    ENTRY TIMESTAMP WITH LOCAL TIME ZONE, \n" +
                  "    EXIT  TIMESTAMP WITH LOCAL TIME ZONE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr16 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr16 ( \n" +
          "      ENTRY_EXIT       NODB_TEST16_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr16 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };

      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST16_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR16 VALUES (:1)';
        var objData = {
          ENTRY : undefined,
          EXIT : undefined
        };
        connection.getDbObjectClass (
          "NODB_TEST16_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR16";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );




  it ('193.17 Insert normal value for DATE type attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST17_TYP AS OBJECT ( \n" +
                  "    ENTRY DATE, \n" +
                  "    EXIT  DATE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr17 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr17 ( \n" +
          "      ENTRY_EXIT       NODB_TEST17_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr17 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };

      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST17_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR17 VALUES (:1)';
        var objData = {
          ENTRY : new Date (1986, 8, 18).getTime(),
          EXIT : new Date (1989, 3, 4).getTime()
        };
        connection.getDbObjectClass (
          "NODB_TEST17_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR17";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );



  it ('193.18 Insert null value for DATE type attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST18_TYP AS OBJECT ( \n" +
                  "    ENTRY DATE, \n" +
                  "    EXIT  DATE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr18 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr18 ( \n" +
          "      ENTRY_EXIT       NODB_TEST18_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr18 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };

      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST18_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR18 VALUES (:1)';
        var objData = {
          ENTRY : null,
          EXIT : null
        };
        connection.getDbObjectClass (
          "NODB_TEST18_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR18";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );



  it ('193.19 Insert undefined value for DATE attribute',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST19_TYP AS OBJECT ( \n" +
                  "    ENTRY DATE, \n" +
                  "    EXIT  DATE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr19 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr19 ( \n" +
          "      ENTRY_EXIT       NODB_TEST19_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr19 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };

      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST19_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR19 VALUES (:1)';
        var objData = {
          ENTRY : undefined,
          EXIT : undefined
        };
        connection.getDbObjectClass (
          "NODB_TEST19_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [testObj], function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR19";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              // should.strictEqual ( obj.ENTRY, undefined);
              // should.strictEqual ( obj['EXIT'], undefined);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doDropTable,
        doDropType
      ], done);
    }
  );



  it ('193.20 Insert NULL value for OBJECT type',
    function (done) {
      var doCreateType = function (cb) {
        var sql = "  CREATE OR REPLACE TYPE NODB_TEST20_TYP AS OBJECT ( \n" +
                  "    ENTRY DATE, \n" +
                  "    EXIT  DATE \n" +
                  "  ); \n";

        connection.execute (sql,
                            {},
                            {autoCommit : true},
                            function (err, result) {
          should.not.exist (err);
          cb();
        });
      };

      var doCreateTable = function (cb) {
        var proc =
          "BEGIN \n" +
          "  DECLARE \n" +
          "  e_table_missing EXCEPTION; \n" +
          "      PRAGMA EXCEPTION_INIT(e_table_missing, -00942); \n" +
          "  BEGIN \n" +
          "    EXECUTE IMMEDIATE('DROP TABLE nodb_tab_dbobjattr20 PURGE');\n" +
          "    EXCEPTION \n" +
          "      WHEN e_table_missing \n" +
          "      THEN NULL; \n" +
          "  END; \n" +
          "  EXECUTE IMMEDIATE (' \n" +
          "    CREATE TABLE nodb_tab_dbobjattr20 ( \n" +
          "      ENTRY_EXIT       NODB_TEST20_TYP \n" +
          "    ) \n" +
          "  '); \n" +
          "END; ";
        connection.execute(
          proc,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doDropTable = function (cb) {
        var sql = "DROP TABLE nodb_tab_dbObjattr20 PURGE";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            connection.commit (function (err) {
              should.not.exist (err);
              cb ();
            });
          }
        );
      };

      var doDropType = function(cb) {
        var sql = "DROP TYPE NODB_TEST20_TYP";
        connection.execute(
          sql,
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      };

      var doInsert = function (cb) {
        var sql = 'INSERT INTO NODB_TAB_DBOBJATTR20 VALUES (:1)';
        var objData = {
          ENTRY : undefined,
          EXIT : undefined
        };
        connection.getDbObjectClass (
          "NODB_TEST20_TYP",
          function (err, objType) {
            var testObj = new objType (objData);
            connection.execute (sql, [{ type : objType, val : null}],
                 function (err, result) {
              should.not.exist (err);
              connection.commit (function (err) {
                should.not.exist(err);
                cb();
              });
            });
          }
        );
      };

      var doQuery = function (cb) {
        var sql = "select * from NODB_TAB_DBOBJATTR20";
        connection.execute(
          sql,
          function(err, result) {
            should.not.exist(err);
            var count = result.rows.length;
            for ( var row = 0; row < count; row++) {
              var obj = result.rows[row][0];
              should.strictEqual (obj, null);
            }
            cb();
          }
        );
      };

      async.series ([
        doCreateType,
        doCreateTable,
        doInsert,
        doQuery,
        doDropTable,
        doDropType
      ], done);
    }
  );

});
