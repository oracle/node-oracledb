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
var async = require('async');
var dbConfig = require ( './dbconfig.js' );

describe('56. fetchAs.js', function() {

  if(dbConfig.externalAuth){
    var credential = { externalAuth: true, connectString: dbConfig.connectString };
  } else {
    var credential = dbConfig;
  }

  var connection = null;
  beforeEach('get one connection', function(done) {
    oracledb.getConnection(credential, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  })
    
  afterEach('release connection, reset fetchAsString property', function(done) {
    oracledb.fetchAsString = [];
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  })

  it('56.1 property value check', function() {

    (oracledb.fetchAsString).should.eql([]);

    oracledb.fetchAsString=[oracledb.DATE];
    (oracledb.fetchAsString).should.eql( [2003] );

    oracledb.fetchAsString = [ oracledb.NUMBER ];
    (oracledb.fetchAsString).should.eql( [2002] );

    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
    (oracledb.fetchAsString).should.eql( [2003, 2002] );
  })

  it('56.2 Fetch DATE column values as STRING - by-Column name', function(done) {
    connection.execute(
      "SELECT TO_DATE('2005-01-06', 'YYYY-DD-MM') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OBJECT,
        fetchInfo : { "TS_DATE": { type : oracledb.STRING } }
      },
      function(err, result) {
        should.not.exist(err);
        // console.log(result.rows[0]);
        result.rows[0].TS_DATE.should.be.a.String;
        done();
      }
    );
  })

  it('56.3 Fetch DATE, NUMBER column values STRING - by Column-name', function(done) {
    connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OBJECT,
        fetchInfo : 
        { 
          "TS_DATE" : { type : oracledb.STRING },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      },
      function(err, result) {
        should.not.exist(err);
        // console.log(result.rows[0]);
        result.rows[0].TS_DATE.should.be.a.String;
        result.rows[0].TS_NUM.should.be.a.String;
        Number(result.rows[0].TS_NUM).should.equal(1234567);
        done();
      }
    );
  })

  it('56.4 Fetch DATE, NUMBER as STRING by-time configuration and by-name', function(done) {
    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];

    connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OBJECT,
        fetchInfo : 
        { 
          "TS_DATE" : { type : oracledb.STRING },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      },
      function(err, result) {
        should.not.exist(err);
        // console.log(result.rows[0]);
        result.rows[0].TS_DATE.should.be.a.String;
        result.rows[0].TS_NUM.should.be.a.String;
        Number(result.rows[0].TS_NUM).should.equal(1234567);
        done();
      }
    );
  })

  it('56.5 Fetch DATE, NUMBER column as STRING by-type and override at execute time', function(done) {
    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
    
    connection.execute(
      "SELECT 1234567 AS TS_NUM, TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF') AS TS_DATE FROM DUAL",
      [],
      {
        outFormat: oracledb.OBJECT,
        fetchInfo : 
        { 
          "TS_DATE" : { type : oracledb.DEFAULT },
          "TS_NUM"  : { type : oracledb.STRING }
        }
      },
      function(err, result) {
        should.not.exist(err);
        // console.log(result.rows[0]);
        result.rows[0].TS_DATE.should.be.an.Object;
        result.rows[0].TS_NUM.should.be.a.String;
        Number(result.rows[0].TS_NUM).should.equal(1234567);
        done();
      }
    );
  })
  
  it('56.6 Fetch ROWID column values STRING - non-ResultSet', function(done) {
    connection.execute(
      "SELECT ROWID from DUAL",
      [],
      { 
        outFormat : oracledb.OBJECT,
        fetchInfo : 
        { 
          "ROWID" : { type : oracledb.STRING }
        }
      },
      function(err, result) {
        should.not.exist(err);
        // console.log(result.rows[0].TS_DATA);
        result.rows[0].ROWID.should.be.a.String;
        done();
      }
    );
  })

  it('56.7 Fetch ROWID column values STRING - ResultSet', function(done) {
    connection.execute(
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
      function(err, result) {
        should.not.exist(err);
 
        result.resultSet.getRow( function(err, row) {
          should.not.exist(err);
          // console.log(row);
          row.ROWID.should.be.a.String;
          result.resultSet.close( function(err) {
            should.not.exist(err);
            done();
          });
        });
      }
    );
  })
  
  /*
  * The maximum safe integer in JavaScript is (2^53 - 1). 
  * The minimum safe integer in JavaScript is (-(2^53 - 1)).
  * Numbers out of above range will be rounded. 
  * The last element is out of Oracle database standard Number range. It will be rounded by database.
  */
  var numStrs = 
  [
    '17249138680355831',
    '-17249138680355831',
    '0.17249138680355831',
    '-0.17249138680355831',
    '0.1724913868035583123456789123456789123456'
  ];

  var numResults = 
  [
    '17249138680355831',
    '-17249138680355831',
    '.17249138680355831',
    '-.17249138680355831',
    '.172491386803558312345678912345678912346'
  ];

  it('56.8 large numbers with fetchInfo', function(done) {
    async.forEach(numStrs, function(element, callback) {
      connection.execute(
        "SELECT TO_NUMBER( " + element + " ) AS TS_NUM FROM DUAL",
        [],
        {
          outFormat : oracledb.OBJECT,
          fetchInfo : 
          { 
            "TS_NUM"  : { type : oracledb.STRING }
          }
        },
        function(err, result) {
          should.not.exist(err);
          result.rows[0].TS_NUM.should.be.a.String;
          (result.rows[0].TS_NUM).should.eql(numResults[numStrs.indexOf(element)]);
          callback();
        }
      );
    }, function(err) {
      should.not.exist(err);
      done();
    });
  })

  it('56.9 large numbers with setting fetchAsString property', function(done) {
    oracledb.fetchAsString = [ oracledb.NUMBER ];

    async.forEach(numStrs, function(element, callback) {
      connection.execute(
        "SELECT TO_NUMBER( " + element + " ) AS TS_NUM FROM DUAL",
        [],
        { outFormat : oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          // console.log(result.rows[0].TS_NUM);
          result.rows[0].TS_NUM.should.be.a.String;
          (result.rows[0].TS_NUM).should.eql(numResults[numStrs.indexOf(element)]);
          callback();
        }
      );
    }, function(err) {
      should.not.exist(err);
      done();
    });
  })
})
