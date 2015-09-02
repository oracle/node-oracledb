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
 *   21. datatypeAssist.js
 *
 * DESCRIPTION
 *   Helper functions and data for Oracle Data Type support tests.
 *
 * NUMBERING RULE
 *   Test numbers follow this numbering rule:
 *     1  - 20  are reserved for basic functional tests
 *     21 - 50  are reserved for data type supporting tests
 *     51 -     are for other tests  
 * 
 *****************************************************************************/

var oracledb = require('oracledb');
var should = require('should');
var async = require('async');

var assist = exports;
assist.data = {
  specialChars: [
    '\"',
    ' ',
    '\'',
    '%', 
    '&',
    '^',
    '~',
    '`',
    '*',
    '!',
    '@',
    '#',
    '$',
    '(',
    ')',
    '[',
    ']',
    '{',
    '}',
    '_',
    '-',
    '=',
    '+',
    ',',
    '.',
    '/',
    '<',
    '>',
    '?',
    ';',
    ':',
    '\\',
    '|'
  ], 
  strings: [
    null,
    "true",
    "false",
    "1",
    "0",
    "8",
    "http://www.ORACLE.com",
    "https://github.com/oracle/node-oracledb/blob/master/doc/api.md",
    "1234",
    "9876.54321",
    "1991-06-01",
    "07:56:34",
    "2009-07-09 02:00:00",
    "1999-09-04 04:04:04 PST",
    "06 05:04:03.0",
    "7-9",
    "AAABBBCCCAAABBBCC1",
    "<t>this is xml</t>",
    "01-JAN-99 11.01.11.110000000 AM",
    "03-MAY-03 12.31.56.780000000 PM US/PACIFIC",
    "30-09-2005 17:27:05",
    "03-MAY-13 11.01.11",
    "03-MAY-13"
  ],
  alphabet: [
    'A', 'B', 'C', 'D', 'E',
    'F', 'G', 'H', 'I', 'J', 
    'K', 'L', 'M', 'N', 'O',
    'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y',
    'Z', 'a', 'b', 'c', 'd',
    'e', 'f', 'g', 'h', 'i',
    'j', 'k', 'l', 'm', 'n',
    'o', 'p', 'q', 'r', 's',
    't', 'u', 'v', 'w', 'x',
    'y', 'z'
  ],
  dates: [
    new Date(-100000000),
    new Date(0),
    new Date(10000000000),
    new Date(100000000000),
    new Date(1995, 11, 17),
    new Date('1995-12-17T03:24:00'),
    new Date('2015-07-23 21:00:00'),
    new Date('2015-07-23 22:00:00'),
    new Date('2015-07-23 23:00:00'),
    new Date('2015-07-24 00:00:00')
  ]
};

var StringBuffer = function() {
    this.buffer = [];
    this.index = 0;
};

StringBuffer.prototype = {
    append: function(s) {
      this.buffer[this.index] = s;
      this.index += 1;
      return this;
    },
    
    toString: function() {
      return this.buffer.join("");
    }   
};

assist.createCharString = function(size) {
  var buffer = new StringBuffer();
  var scSize = assist.data.specialChars.length;
  var scIndex = 0;
  var cIndex = 0;
  for(var i = 0; i < size; i++) {
    if(i % 10 == 0) {
      buffer.append(assist.data.specialChars[scIndex]);
      scIndex = (scIndex + 1) % scSize;
    } else {
      cIndex = Math.floor(Math.random() * 52); // generate a random integer among 0-51
      buffer.append(assist.data.alphabet[cIndex]);
    }
  }
  return buffer.toString();
}

assist.setup = function(connection, tableName, sqlCreate, array, done) {
  async.series([
    function(callback) {
      connection.execute(
        sqlCreate,
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    },
    function(callback) {
      async.forEach(array, function(element, cb) {
        connection.execute(
          "INSERT INTO " + tableName + " VALUES(:no, :bindValue)",
          { no: array.indexOf(element), bindValue: element },
          function(err) {
            should.not.exist(err);
            cb();
          }
        );
      }, function(err) {
        should.not.exist(err);
        callback();
      });
    }
  ], done);
}

assist.dataTypeSupport = function(connection, tableName, array, done) {
  connection.should.be.ok;
  connection.execute(
    "SELECT * FROM " + tableName,
    [],
    { outFormat: oracledb.OBJECT },
    function(err, result) {
      should.not.exist(err);
      // console.log(result);
      for(var i = 0; i < array.length; i++) {
        if( (typeof result.rows[i].CONTENT) === 'string' )   
		      result.rows[i].CONTENT.trim().should.eql(array[result.rows[i].NUM]);
        else if( (typeof result.rows[i].CONTENT) === 'number' )
          result.rows[i].CONTENT.should.eql(array[result.rows[i].NUM]);
		    else
          result.rows[i].CONTENT.toUTCString().should.eql(array[result.rows[i].NUM].toUTCString());
      }	  
      done();
    }  
  );
}

assist.resultSetSupport = function(connection, tableName, array, done) {
  connection.should.be.ok;
  var numRows = 3;  // number of rows to return from each call to getRows()
  connection.execute(
    "SELECT * FROM " + tableName,
    [],
    { resultSet: true, outFormat: oracledb.OBJECT },
    function(err, result) {
      should.not.exist(err);
      (result.resultSet.metaData[0]).name.should.eql('NUM');
      (result.resultSet.metaData[1]).name.should.eql('CONTENT');
      fetchRowsFromRS(result.resultSet);
    }
  );
  
  function fetchRowsFromRS(rs) {
    rs.getRows(numRows, function(err, rows) {
      should.not.exist(err);
      if(rows.length > 0) {
        for(var i = 0; i < rows.length; i++) {
          if( (typeof rows[i].CONTENT) === 'string' ) 
		    rows[i].CONTENT.trim().should.eql(array[rows[i].NUM]); 
          else if( (typeof rows[i].CONTENT) === 'number' )
            rows[i].CONTENT.should.eql(array[rows[i].NUM]);
          else
            rows[i].CONTENT.toUTCString().should.eql(array[rows[i].NUM].toUTCString()); 		  
        }
        return fetchRowsFromRS(rs);
      } else if(rows.length == 0) {
        rs.close(function(err) {
          should.not.exist(err);
          done();
        });
      } else {
        var lengthLessThanZero = true;
        should.not.exist(lengthLessThanZero);
        done();
      }
    });
  }
}

assist.nullValueSupport = function(connection, tableName, done) {
  connection.should.be.ok;
  var sqlInsert = "INSERT INTO " + tableName + " VALUES(:no, :bindValue)";
  async.series([
    function(callback) {
      connection.execute(
        sqlInsert,
        { no: 998, bindValue: '' },
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    },
    function(callback) {
      connection.execute(
        sqlInsert,
        { no: 999, bindValue: null },
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    },
    function(callback) {
      connection.execute(
        "SELECT * FROM " + tableName + " WHERE num > :1 ORDER BY num",
        [990],
        function(err, result) {
          should.not.exist(err);
          // console.log(result);
          result.rows.should.eql([ [998, null],  [999, null] ]);
          callback();
        }
      );
    }
  ], done);
}

assist.DATE_STRINGS = 
[
  "TO_DATE('2005-01-06','YYYY-DD-MM') ",
  "TO_DATE('2005-09-01', 'YYYY-MM-DD')",
  "TO_DATE('2005-08-05', 'YYYY-MM-DD')",
  "TO_DATE('07-05-1998', 'MM-DD-YYYY')",
  "TO_DATE('07-05-1998', 'DD-MM-YYYY')",
  "TO_TIMESTAMP('1999-12-01 11:10:01.00123', 'YYYY-MM-DD HH:MI:SS.FF')"
];

// for TIMESTAMP WITHOUT TIME ZONE
assist.TIMESTAMP_STRINGS = 
[
  "TO_TIMESTAMP('2005-01-06', 'YYYY-DD-MM') ",
   "TO_TIMESTAMP('2005-09-01', 'YYYY-MM-DD')",
   "TO_TIMESTAMP('2005-08-05', 'YYYY-MM-DD')",
   "TO_TIMESTAMP('07-05-1998', 'MM-DD-YYYY')",
   "TO_TIMESTAMP('07-05-1998', 'DD-MM-YYYY')",
   "TO_TIMESTAMP('2005-09-01 07:05:19', 'YYYY-MM-DD HH:MI:SS')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.1', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.12', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.123', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:01:10.0123', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.1234', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.00123', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.12345', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.123456', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.1234567', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:02:20.0000123', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.12345678', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('1999-12-01 11:00:00.123456789', 'YYYY-MM-DD HH:MI:SS.FF')",
   "TO_TIMESTAMP('10-Sep-02 14:10:10.123000', 'DD-Mon-RR HH24:MI:SS.FF')"
];

// content serves as reference logs
assist.content = 
{
  dates:
  [
    'Wed, 01 Jun 2005 07:00:00 GMT',
    'Thu, 01 Sep 2005 07:00:00 GMT',
    'Fri, 05 Aug 2005 07:00:00 GMT',
    'Sun, 05 Jul 1998 07:00:00 GMT',
    'Thu, 07 May 1998 07:00:00 GMT',
    'Wed, 01 Dec 1999 18:10:01 GMT'
  ],
  timestamps:
  [
    'Wed, 01 Jun 2005 07:00:00 GMT',
    'Thu, 01 Sep 2005 07:00:00 GMT',
    'Fri, 05 Aug 2005 07:00:00 GMT',
    'Sun, 05 Jul 1998 07:00:00 GMT',
    'Thu, 07 May 1998 07:00:00 GMT',
    'Thu, 01 Sep 2005 14:05:19 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:01:10 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:02:20 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Wed, 01 Dec 1999 18:00:00 GMT',
    'Tue, 10 Sep 2002 21:10:10 GMT'  
  ]
};

assist.allDataTypeNames = 
{
  "oracledb_timestamp1" : "TIMESTAMP",
  "oracledb_date"       : "DATE"
};

assist.sqlCreateTable = function(tableName) 
{
  var createTab = 
        "BEGIN " + 
        "  DECLARE " +
        "    e_table_exists EXCEPTION; " +
        "    PRAGMA EXCEPTION_INIT(e_table_exists, -00942); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP TABLE " + tableName + " '); " +
        "   EXCEPTION " +
        "     WHEN e_table_exists " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "     CREATE TABLE " + tableName +" ( " +
        "       num NUMBER(10), " + 
        "       content " + assist.allDataTypeNames[tableName] + ", " +
        "       CONSTRAINT " + tableName + "_pk PRIMARY KEY (num) " + 
        "     )" +
        "   '); " + 
        "END; ";

  return createTab;
}

assist.sqlCreateProcedure = function(tableName)
{
  var createProc = 
        "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
        "AS " + 
        "BEGIN " +
        "  OPEN p_out FOR " +
        "    SELECT * FROM " + tableName  + "; " +  
        "END; ";

  return createProc;
}

/*assist.sqlCreateSequence = function(seqName)
{
  var createSeq = 
        "BEGIN " + 
        "  DECLARE " +
        "    e_seq_exists EXCEPTION; " +
        "    PRAGMA EXCEPTION_INIT(e_seq_exists, -02289); " +
        "   BEGIN " +
        "     EXECUTE IMMEDIATE ('DROP SEQUENCE " + seqName + " '); " +
        "   EXCEPTION " +
        "     WHEN e_seq_exists " +
        "     THEN NULL; " +
        "   END; " +
        "   EXECUTE IMMEDIATE (' " +
        "     CREATE SEQUENCE " + seqName + 
        "   '); " +  
        "END; ";
        
  return createSeq;
}*/

module.exports = assist;
