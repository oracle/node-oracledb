/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
 *   56. fetchAs.js
 *
 * DESCRIPTION
 *   Testing driver fetchAs feature.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 onwards are for other tests 
 * 
 *****************************************************************************/
 
var oracledb = require ( 'oracledb' );
var should = require ( 'should' );
var async = require ( 'async' );
var dbConfig = require ( './dbConfig.js' );

describe ('56. fetchAs.js', 
  function () 
  {
    if (dbConfig.externalAuth )
    {
      var credential = { externalAuth : true,
                         connectString : dbConfig.connectString 
                       };
    }
    else
    {
      var credential = dbConfig;
    }
    
    var connection = false;
    
    
    /* preparation work before test case(s). */
    before ( 
      function ( done ) 
      {
        oracledb.getConnection ( credential, 
          function ( err, conn )
          {
            if ( err )
            {
              console.error ( err.message );
              return;
            }
            connection = conn;
            done ();
          }
        );
      }
    );
    

    /* clean up after test case(s) */
    after (
      function ( done )
      {
        connection.release ( 
          function ( err )
          {
            oracledb.fetchAsString = [] ;
            
            if ( err )
            {
              console.error ( err.message );
              return;
            }
            done ();
            
          }
        );
      }
    );
    

    /* Fetch DATE column values as STRING - by-Column name */    
    it ('56.1 FetchAs - DATE type as STRING',
      function ( done ) 
      {
        connection.should.be.ok;
        
        connection.execute ( 
          "SELECT FIRST_NAME, LAST_NAME, HIRE_DATE FROM EMPLOYEES",
          [],
          { 
            outFormat : oracledb.OBJECT,
            fetchInfo : { "HIRE_DATE" : { type : oracledb.STRING } }
          },
          function ( err, result )
          {
            should.not.exist ( err ) ;
            done ();
          }
        );
      }
    );

    /* Fetch DATE, NUMBER column values STRING - by Column-name */
    it ('56.2 FetchAs NUMBER & DATE type as STRING',
      function ( done ) 
      {
        connection.should.be.ok;
        
        connection.execute ( 
          "SELECT employee_id as SEMPID, employee_id, " +
          "hire_date as SHDATE, hire_date FROM EMPLOYEES",
          [],
          { 
            outFormat : oracledb.OBJECT,
            fetchInfo : 
            { 
              "SEMPID" : { type : oracledb.STRING },
              "SHDATE" : { type : oracledb.STRING }
            }
          },
          function ( err, result )
          {
            should.not.exist ( err ) ;
            done ();
          }
        );
      }
    );

    /* Fetch DATE, NUMBER as STRING by-time configuration and by-name */
    it ('56.3 FetchAs Oracledb property by-type',
      function ( done ) 
      {
        connection.should.be.ok;
        
        oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
        
        connection.execute ( 
          "SELECT employee_id, first_name, last_name, hire_date " +
          "FROM EMPLOYEES",
          [],
          { 
            outFormat : oracledb.OBJECT,
            fetchInfo : 
            { 
              "HIRE_DATE" : { type : oracledb.STRING }
            }
          },
          function ( err, result )
          {
            should.not.exist ( err ) ;
            done ();
          }
        );
      }
    );

    
    /* 
     * Fetch DATE, NUMBER column as STRING by-type and override 
     * HIRE_DATE to use default (from metadata type).
     */
    it ('56.4 FetchAs override oracledb by-type (for DATE) at execute time',
      function ( done ) 
      {
        connection.should.be.ok;
        
        oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
        
        connection.execute ( 
          "SELECT employee_id, first_name, last_name, hire_date " +
          "FROM EMPLOYEES",
          [],
          { 
            outFormat : oracledb.OBJECT,
            fetchInfo : 
            { 
              "HIRE_DATE" : { type : oracledb.DEFAULT },
              "EMPLOYEE_ID" : { type : oracledb.STRING }
            }
          },
          function ( err, result )
          {
            should.not.exist ( err ) ;
            done ();
          }
        );
      }
    );

    /* Fetch ROWID column values STRING - non-ResultSet */
    it ('56.5 FetchInfo ROWID column values STRING non-ResultSet',
        function ( done ) 
        {
          connection.should.be.ok;
          
          connection.execute ( 
            "SELECT ROWID from DUAL",
            [],
            { 
              outFormat : oracledb.OBJECT,
              fetchInfo : 
              { 
                "ROWID" : { type : oracledb.STRING }
              }
            },
            function ( err, result )
            {
              should.not.exist ( err ) ;
              done ();
            }
          );
        }
       );

    /* Fetch ROWID column values STRING - ResultSet */
    it ('56.6 FetchInfo ROWID column values STRING ResultSet',
        function ( done ) 
        {
          connection.should.be.ok;
          
          connection.execute ( 
            "SELECT ROWID from DUAL",
            [],
            { 
              outFormat : oracledb.OBJECT,
              resultSet : true,
              fetchInfo : 
              { 
                "ROWID" : { type : oracledb.STRING }
              }
            },
            function ( err, result )
            {
              should.not.exist ( err ) ;
              done ();
            }
          );
        }
       );
  }
);
