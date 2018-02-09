/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *****************************************************************************/
'use strict';

var oracledb = require ('oracledb');
var should   = require ('should');
var async    = require ('async');
var dbConfig = require ('./dbconfig.js');
var assist   = require ('./dataTypeAssist.js');


describe('56. fetchAs.js', function() {

  var connection = null;
  beforeEach('get one connection', function(done) {
    oracledb.getConnection(dbConfig, function(err, conn) {
      should.not.exist(err);
      connection = conn;
      done();
    });
  });

  afterEach('release connection, reset fetchAsString property', function(done) {
    oracledb.fetchAsString = [];
    connection.release( function(err) {
      should.not.exist(err);
      done();
    });
  });

  it('56.1 property value check', function() {

    (oracledb.fetchAsString).should.eql([]);

    oracledb.fetchAsString=[oracledb.DATE];
    (oracledb.fetchAsString).should.eql( [2003] );

    oracledb.fetchAsString = [ oracledb.NUMBER ];
    (oracledb.fetchAsString).should.eql( [2002] );

    oracledb.fetchAsString = [ oracledb.DATE, oracledb.NUMBER ];
    (oracledb.fetchAsString).should.eql( [2003, 2002] );
  });

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
        result.rows[0].TS_DATE.should.be.a.String();
        done();
      }
    );
  });

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
        result.rows[0].TS_DATE.should.be.a.String();
        result.rows[0].TS_NUM.should.be.a.String();
        Number(result.rows[0].TS_NUM).should.equal(1234567);
        done();
      }
    );
  });

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
        result.rows[0].TS_DATE.should.be.a.String();
        result.rows[0].TS_NUM.should.be.a.String();
        Number(result.rows[0].TS_NUM).should.equal(1234567);
        done();
      }
    );
  });

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
        result.rows[0].TS_NUM.should.be.a.String();
        Number(result.rows[0].TS_NUM).should.equal(1234567);
        done();
      }
    );
  });

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
        result.rows[0].ROWID.should.be.a.String();
        done();
      }
    );
  });

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
          row.ROWID.should.be.a.String();
          result.resultSet.close( function(err) {
            should.not.exist(err);
            done();
          });
        });
      }
    );
  });

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
          result.rows[0].TS_NUM.should.be.a.String();
          (result.rows[0].TS_NUM).should.eql(numResults[numStrs.indexOf(element)]);
          callback();
        }
      );
    }, function(err) {
      should.not.exist(err);
      done();
    });
  });

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
          result.rows[0].TS_NUM.should.be.a.String();
          (result.rows[0].TS_NUM).should.eql(numResults[numStrs.indexOf(element)]);
          callback();
        }
      );
    }, function(err) {
      should.not.exist(err);
      done();
    });
  });

  // FetchInfo format should <columName> : {type : oracledb.<type> }
  it('56.10 invalid syntax for type should result in error', function (done){
    connection.execute (
      "SELECT SYSDATE AS THE_DATE FROM DUAL",
      { },
      { fetchInfo : { "THE_DATE" : oracledb.STRING }},
      function ( err ) {
        should.exist ( err ) ;
        should.strictEqual(err.message, 'NJS-015: type was not specified for conversion');
        done ();
      } );
  });

  it('56.11 assigns an empty array to fetchAsString', function() {
    oracledb.fetchAsString = [];
    (oracledb.fetchAsString).should.eql([]);
  });

  it('56.12 Negative - empty string', function() {
    should.throws(
      function() {
        oracledb.fetchAsString = '';
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

  it('56.13 Negative - null', function() {
    should.throws(
      function() {
        oracledb.fetchAsString = null;
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

  it('56.14 Negative - undefined', function() {
    should.throws(
      function() {
        oracledb.fetchAsString = undefined;
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

  it('56.15 Negative - NaN', function() {
    should.throws(
      function() {
        oracledb.fetchAsString = NaN;
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

  it('56.16 Negative - invalid type of value, number', function() {
    should.throws(
      function() {
        oracledb.fetchAsString = 10;
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

  it('56.17 Negative - invalid type of value, string', function() {
    should.throws(
      function() {
        oracledb.fetchAsString = 'abc';
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

  it('56.18 Negative - passing oracledb.DATE type to fetchInfo', function(done) {
    connection.execute(
      "select sysdate as ts_date from dual",
      { },
      {
        fetchInfo: { ts_date: { type: oracledb.DATE } }
      },
      function(err, result) {
        should.exist(err);
        should.strictEqual(
          err.message,
          'NJS-021: invalid type for conversion specified'
        );
        should.not.exist(result);
        done();
      }
    );
  });

  it('56.19 Negative - passing empty JSON to fetchInfo', function(done) {
    connection.execute(
      "select sysdate as ts_date from dual",
      { },
      {
        fetchInfo: { }
      },
      function(err, result) {
        should.exist(err);
        should.strictEqual(
          err.message,
          'NJS-020: empty array was specified to fetch values as string'
        );
        should.not.exist(result);
        done();
      }
    );
  });

  it('56.20 Negative - passing oracledb.NUMBER type to fetchInfo', function(done) {
    connection.execute(
      "select sysdate as ts_date from dual",
      { },
      {
        fetchInfo: { ts_date: { type: oracledb.NUMBER } }
      },
      function(err, result) {
        should.exist(err);
        should.strictEqual(
          err.message,
          'NJS-021: invalid type for conversion specified'
        );
        should.not.exist(result);
        done();
      }
    );
  });

  it('56.21 Negative - invalid type of value, Date', function() {
    should.throws(
      function() {
        var dt = new Date ();
        oracledb.fetchAsString = dt;
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

  it('56.22 Negative - invalid type of value, Buffer', function() {
    should.throws(
      function() {
        var buf = assist.createBuffer ( 10 ) ;  // arbitary sized buffer
        oracledb.fetchAsString = buf;
      },
      /NJS-004: invalid value for property fetchAsString/
    );
  });

});
