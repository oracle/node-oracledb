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
 *   76. fetchClobAsString.js
 *
 * DESCRIPTION
 *    Testing Oracle data type support - CLOB.
 *    To fetch CLOB columns as strings
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
var async    = require('async');
var should   = require('should');
var dbConfig = require('./dbconfig.js');
var assist   = require('./dataTypeAssist.js');

describe ('76. fetchClobAsString.js', function () {
  this.timeout ( 100000 );
  
  oracledb.fetchAsString = [ oracledb.CLOB ];

  var connection = null;
  var tableName = "nodb_myclobs_str" ;
            
  before ( 'get one connection', function ( done ) {
    oracledb.getConnection ( 
      {
        user : dbConfig.user,
        password : dbConfig.password,
        connectString : dbConfig.connectString 
      },
      function ( err, conn ) {
        should.not.exist ( err );
        connection = conn;
        done();
      }
    );
  });

    
  after ( 'release connection', function ( done ) {
    connection.release ( function ( err ) {
      should.not.exist ( err ) ;
      done ();
    });
  });

  
  describe ( '76.1 test fetching CLOB columns as STRING by type',  function() {
    before ( 'create Table and populate', function ( done ) {
      connection.execute (
        "CREATE TABLE nodb_myclobs_str (ID NUMBER, C CLOB)",
        function ( err, result ) {
          should.not.exist ( err ) ;

          connection.execute (
            "INSERT INTO nodb_myclobs_str VALUES ( :ID, :C)",
            [101, null ],
            function ( err, results ) {
            }
          );

          connection.execute (
            "INSERT INTO nodb_myclobs_str VALUES ( :ID, :C)",
            [ 102, "abcdefghijklmnopqrstuvwxyz" ],
            function ( err, results ) {
            }
          );
          
          
          done () ;
      });
    });

    after ( 'drop table', function ( done ) {
      connection.execute (
        "DROP TABLE nodb_myclobs_str", 
        { }, 
        {
          autoCommit : true
        },
        function ( err, result ) {
          should.not.exist ( err ) ;
          done ();
        }
      );

      // Clear the By type specification.
      oracledb.fetchAsString = [];
    });    
    
    it ( '76.1.1 Test case to fetch CLOB column as string with NULL value',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C from nodb_myclobs_str WHERE ID = :id", 
          { id : 101 },
          { },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0][1], null ) ;
            
            done ();
          }
        );
      }
    );

    it (
      '76.1.2 Test case to fetch CLOB column as string with small (26) value',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C from nodb_myclobs_str WHERE ID = :id", 
          { id : 102 },
          { },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0][1].length, 26 ) ;
            
            done ();
          }
        );
      }
    );

    it (
      '76.1.3 Test case to fetch multiple CLOB column as string',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C from nodb_myclobs_str", 
          { },
          { },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0].length, 2 ) ;
            should.equal ( result.rows[1][1].length, 26 ) ;
            
            done ();
          }
        );
      }
    );

    it (
      '76.1.4 Test case to fetch same CLOB column multiple times',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C AS C1, C AS C2 from nodb_myclobs_str", 
          { },
          { },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0].length, 3 ) ;
            should.equal ( result.rows[1][1].length, 26 ) ;
            should.equal ( result.rows[1][2].length, 26 ) ;
            
            done ();
          }
        );
      }
    );


  });



  describe ( '76.2 test fetching CLOB columns as STRING by column name',
    function() {
    before ( 'create Table and populate', function ( done ) {
      connection.execute (
        "CREATE TABLE nodb_myclobs_str (ID NUMBER, C CLOB)",
        function ( err, result ) {
          should.not.exist ( err ) ;

          connection.execute (
            "INSERT INTO nodb_myclobs_str VALUES ( :ID, :C)",
            [101, null ],
            function ( err, results ) {
            }
          );

          connection.execute (
            "INSERT INTO nodb_myclobs_str VALUES ( :ID, :C)",
            [ 102, "abcdefghijklmnopqrstuvwxyz" ],
            function ( err, results ) {
            }
          );
          
          
          done () ;
      });
    });

    after ( 'drop table', function ( done ) {
      connection.execute (
        "DROP TABLE nodb_myclobs_str", 
        { }, 
        {
          autoCommit : true
        },
        function ( err, result ) {
          should.not.exist ( err ) ;
          done ();
        }
      );
    });    
    
    it ( '76.2.1 Test case to fetch CLOB column as string with NULL value',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C from nodb_myclobs_str WHERE ID = :id", 
          { id : 101 },
          { fetchInfo :  { C : { type : oracledb.STRING } } },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0][1], null ) ;
            
            done ();
          }
        );
      }
    );

    it (
      '76.2.2 Test case to fetch CLOB column as string with small (26) value',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C from nodb_myclobs_str WHERE ID = :id", 
          { id : 102 },
          { fetchInfo : { C : { type : oracledb.STRING} } },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0].length, 2 ) ;
            should.equal ( result.rows[0][1].length, 26 ) ;
            
            done ();
          }
        );
      }
    );

    it (
      '76.2.3 Test case to fetch multiple CLOB column as string',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C from nodb_myclobs_str", 
          { },
          {  fetchInfo : { C : { type : oracledb.STRING} } },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0].length, 2 ) ;
            should.equal ( result.rows[1][1].length, 26 ) ;
            
            done ();
          }
        );
      }
    );

    it (
      '76.2.4 Test case to fetch same CLOB column multiple times',
      function ( done ) {
        connection.should.be.ok();

        connection.execute (
          "SELECT ID, C AS C1, C AS C2 from nodb_myclobs_str", 
          { },
          { fetchInfo : 
            {
              C1 : { type : oracledb.STRING},
              C2 : { type : oracledb.STRING} 
            }
          },
          function ( err, result ) {
            should.not.exist ( err ) ;
            should.equal ( result.rows[0].length, 3 ) ;
            should.equal ( result.rows[1][1].length, 26 ) ;
            should.equal ( result.rows[1][2].length, 26 ) ;
            
            done ();
          }
        );
      }
    );
  });
});
