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

/* Mapping between table names and data types */
assist.allDataTypeNames =
{
  "nodb_char"         : "CHAR(2000)",
  "nodb_nchar"        : "NCHAR(1000)",
  "nodb_varchar2"     : "VARCHAR2(4000)",
  "nodb_nvarchar2"    : "NVARCHAR2(2000)",
  "nodb_number"       : "NUMBER",
  "nodb_number2"      : "NUMBER(15, 5)",
  "nodb_float"        : "FLOAT",
  "nodb_float2"       : "FLOAT(90)",
  "nodb_binary_float" : "BINARY_FLOAT",
  "nodb_double"       : "BINARY_DOUBLE",
  "nodb_date"         : "DATE",
  "nodb_timestamp1"   : "TIMESTAMP",
  "nodb_timestamp2"   : "TIMESTAMP(5)",
  "nodb_timestamp3"   : "TIMESTAMP WITH TIME ZONE",
  "nodb_timestamp4"   : "TIMESTAMP (2) WITH TIME ZONE",
  "nodb_timestamp5"   : "TIMESTAMP WITH LOCAL TIME ZONE",
  "nodb_timestamp6"   : "TIMESTAMP (9) WITH LOCAL TIME ZONE",
  "nodb_rowid"        : "ROWID",
  "nodb_myclobs"      : "CLOB",
  "nodb_myblobs"      : "BLOB",
  "nodb_raw"          : "RAW(2000)"
};

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
  numbers: [
    1,
    0,
    8,
    -8,
    1234,
    -1234,
    9876.54321,
    -9876.54321,
    0.01234,
    -0.01234,
    0.00000123,
    -0.00000123,
    1234567890.0123,
    -1234567890.0123
  ],
  numbersForBinaryFloat:
  [
    1,
    0,
    8,
    -8,
    1234,
    -1234,
    234567,
    -234567,
    12345678,
    -12345678
  ],
  numbersForBinaryDouble:
  [
    2345.67,
    9876.54321,
    0.01234,
    1234567890.0123
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
    new Date('2015-07-24 00:00:00'),
    new Date(2003, 09, 23, 11, 50, 30, 123)
  ]
};

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

// for TIMESTAMP WITH TIME ZONE
assist.TIMESTAMP_TZ_STRINGS =
[
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.1 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.12 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.0123 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.1234 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.00123 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.12345 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123456 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.1234567 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:20:02.0000123 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.12345678 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123456789 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00 -8:00', 'YYYY-MM-DD HH:MI:SS TZH:TZM')"
];

// content serves as reference logs
assist.content =
{
  dates:
  [
    '01-06-2005',
    '01-09-2005',
    '05-08-2005',
    '05-07-1998',
    '07-05-1998',
    '01-12-1999'
  ],
  timestamps1:
  [
    '01-06-2005 00:00:00.000000',
    '01-09-2005 00:00:00.000000',
    '05-08-2005 00:00:00.000000',
    '05-07-1998 00:00:00.000000',
    '07-05-1998 00:00:00.000000',
    '01-09-2005 07:05:19.000000',
    '01-12-1999 11:00:00.100000',
    '01-12-1999 11:00:00.120000',
    '01-12-1999 11:00:00.123000',
    '01-12-1999 11:01:10.012300',
    '01-12-1999 11:00:00.123400',
    '01-12-1999 11:00:00.001230',
    '01-12-1999 11:00:00.123450',
    '01-12-1999 11:00:00.123456',
    '01-12-1999 11:00:00.123457',
    '01-12-1999 11:02:20.000012',
    '01-12-1999 11:00:00.123457',
    '01-12-1999 11:00:00.123457',
    '10-09-2002 14:10:10.123000'
  ],
  timestamps2:
  [
    '01-06-2005 00:00:00.00000',
    '01-09-2005 00:00:00.00000',
    '05-08-2005 00:00:00.00000',
    '05-07-1998 00:00:00.00000',
    '07-05-1998 00:00:00.00000',
    '01-09-2005 07:05:19.00000',
    '01-12-1999 11:00:00.10000',
    '01-12-1999 11:00:00.12000',
    '01-12-1999 11:00:00.12300',
    '01-12-1999 11:01:10.01230',
    '01-12-1999 11:00:00.12340',
    '01-12-1999 11:00:00.00123',
    '01-12-1999 11:00:00.12345',
    '01-12-1999 11:00:00.12346',
    '01-12-1999 11:00:00.12346',
    '01-12-1999 11:02:20.00001',
    '01-12-1999 11:00:00.12346',
    '01-12-1999 11:00:00.12346',
    '10-09-2002 14:10:10.12300'
  ],
  timestamps5:
  [
    '01-12-1999 11:00:00.100000 -08:00',
    '01-12-1999 11:00:00.120000 -08:00',
    '01-12-1999 11:00:00.123000 -08:00',
    '01-12-1999 11:00:00.012300 -08:00',
    '01-12-1999 11:00:00.123400 -08:00',
    '01-12-1999 11:00:00.001230 -08:00',
    '01-12-1999 11:00:00.123450 -08:00',
    '01-12-1999 11:00:00.123456 -08:00',
    '01-12-1999 11:00:00.123457 -08:00',
    '01-12-1999 11:20:02.000012 -08:00',
    '01-12-1999 11:00:00.123457 -08:00',
    '01-12-1999 11:00:00.123457 -08:00',
    '01-12-1999 11:00:00.000000 -08:00'
  ],
  timestamps6:
  [
    '01-12-1999 11:00:00.100000000 -08:00',
    '01-12-1999 11:00:00.120000000 -08:00',
    '01-12-1999 11:00:00.123000000 -08:00',
    '01-12-1999 11:00:00.012300000 -08:00',
    '01-12-1999 11:00:00.123400000 -08:00',
    '01-12-1999 11:00:00.001230000 -08:00',
    '01-12-1999 11:00:00.123450000 -08:00',
    '01-12-1999 11:00:00.123456000 -08:00',
    '01-12-1999 11:00:00.123456700 -08:00',
    '01-12-1999 11:20:02.000012300 -08:00',
    '01-12-1999 11:00:00.123456780 -08:00',
    '01-12-1999 11:00:00.123456789 -08:00',
    '01-12-1999 11:00:00.000000000 -08:00'
  ]
};


/******************************* Helper Functions ***********************************/


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

assist.createBuffer = function(size) {
  var array = [];
  for(var i = 0; i < size; i++) {
    var b = Math.floor(Math.random() * 256); // generate a random integer among 0-255
    array.push(b);
  }
  return new Buffer(array);
}

assist.setUp = function(connection, tableName, array, done)
{
  async.series([
    function(callback) {
      assist.createTable(connection, tableName, callback);
    },
    function(callback) {
      assist.insertDataArray(connection, tableName, array, callback);
    }
  ], done);
}

assist.setUp4sql = function(connection, tableName, array, done)
{
  async.series([
    function(callback) {
      assist.createTable(connection, tableName, callback);
    },
    function(callback) {
      assist.insertData4sql(connection, tableName, array, callback);
    }
  ], done);
}

assist.createTable = function(connection, tableName, done)
{
  var sqlCreate = assist.sqlCreateTable(tableName);
  connection.execute(
    sqlCreate,
    function(err) {
      should.not.exist(err);
      done();
    }
  );
}

assist.insertDataArray = function(connection, tableName, array, done)
{
  async.forEach(array, function(element, cb) {
    connection.execute(
      "INSERT INTO " + tableName + " VALUES(:no, :bindValue)",
      { no: array.indexOf(element), bindValue: element },
      { autoCommit: true },
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  }, function(err) {
    should.not.exist(err);
    done();
  });
}

assist.insertData4sql = function(connection, tableName, array, done)
{
  async.forEach(array, function(element, cb) {
    var sql = "INSERT INTO " + tableName + " VALUES(:no, " + element + " )";

    connection.execute(
      sql,
      { no: array.indexOf(element) },
      function(err) {
        should.not.exist(err);
        cb();
      }
    );
  }, function(err) {
    should.not.exist(err);
    done();
  });
}

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


/************************* Functions for Verifiction *********************************/

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
        else if( Buffer.isBuffer(result.rows[i].CONTENT) )
          result.rows[i].CONTENT.toString('hex').should.eql(array[result.rows[i].NUM].toString('hex'));
        else if (Object.prototype.toString.call(result.rows[i].CONTENT) === '[object Date]')
          result.rows[i].CONTENT.getTime().should.eql(array[result.rows[i].NUM].getTime());
        else
          should.not.exist(new Error('Uncaught data type!'));
      }
      done();
    }
  );
}

assist.verifyResultSet = function(connection, tableName, array, done)
{
  connection.execute(
    "SELECT * FROM " + tableName,
    [],
    { resultSet: true, outFormat: oracledb.OBJECT },
    function(err, result) {
      should.not.exist(err);
      (result.resultSet.metaData[0]).name.should.eql('NUM');
      (result.resultSet.metaData[1]).name.should.eql('CONTENT');
      fetchRowsFromRS(result.resultSet, array, done);
    }
  );
}

assist.verifyRefCursor = function(connection, tableName, array, done)
{
  var createProc =
        "CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) " +
        "AS " +
        "BEGIN " +
        "  OPEN p_out FOR " +
        "SELECT * FROM " + tableName  + "; " +
        "END; ";
  async.series([
    function createProcedure(callback) {
      connection.execute(
        createProc,
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    },
    function verify(callback) {
      connection.execute(
        "BEGIN testproc(:o); END;",
        [
          { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        ],
        { outFormat: oracledb.OBJECT },
        function(err, result) {
          should.not.exist(err);
          fetchRowsFromRS(result.outBinds[0], array, callback);
        }
      );
    },
    function dropProcedure(callback) {
      connection.execute(
        "DROP PROCEDURE testproc",
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    }
  ], done);
}

var numRows = 3;  // number of rows to return from each call to getRows()
function fetchRowsFromRS(rs, array, cb)
{
  rs.getRows(numRows, function(err, rows) {
    if(rows.length > 0) {
      for(var i = 0; i < rows.length; i++) {
        if( (typeof rows[i].CONTENT) === 'string' )
          rows[i].CONTENT.trim().should.eql(array[rows[i].NUM]);
        else if( (typeof rows[i].CONTENT) === 'number' )
          rows[i].CONTENT.should.eql(array[rows[i].NUM]);
        else if( Buffer.isBuffer(rows[i].CONTENT) )
          rows[i].CONTENT.toString('hex').should.eql(array[rows[i].NUM].toString('hex'));
        else if (Object.prototype.toString.call(rows[i].CONTENT) === '[object Date]')
          rows[i].CONTENT.getTime().should.eql(array[rows[i].NUM].getTime());
        else
          should.not.exist(new Error('Uncaught data type!'));
      }
      return fetchRowsFromRS(rs, array, cb);
    } else {
      rs.close(function(err) {
        should.not.exist(err);
        cb();
      });
    }
  });
}

assist.selectOriginalData = function(connection, tableName, array, done)
{
  async.forEach(array, function(element, cb) {
    connection.execute(
      "SELECT * FROM " + tableName + " WHERE num = :no",
      { no: array.indexOf(element) },
      function(err, result) {
        should.not.exist(err);
        // console.log(result.rows);
        cb();
      }
    );
  }, function(err) {
    should.not.exist(err);
    done();
  });
}

/* Null value verfication */
assist.verifyNullValues = function(connection, tableName, done)
{
  var sqlInsert = "INSERT INTO " + tableName + " VALUES(:no, :bindValue)";

  connection.should.be.ok;
  async.series([
    function createTable(callback) {
      var sqlCreate = assist.sqlCreateTable(tableName);
      connection.execute(
        sqlCreate,
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    },
    function JSEmptyString(callback) {
      var num = 1;
      connection.execute(
        sqlInsert,
        { no: num, bindValue: '' },
        function(err) {
          should.not.exist(err);
          verifyNull(num, callback);
        }
      );
    },
    function JSNull(callback) {
      var num = 2;
      connection.execute(
        sqlInsert,
        { no: num, bindValue: null },
        function(err) {
          should.not.exist(err);
          verifyNull(num, callback);
        }
      );
    },
    function JSUndefined(callback) {
      var num = 3;
      var foobar;  // undefined value
      connection.execute(
        sqlInsert,
        { no: num, bindValue: foobar },
        function(err) {
          should.not.exist(err);
          verifyNull(num, callback);
        }
      );
    },
    function sqlNull(callback) {
      var num = 4;
      connection.execute(
        "INSERT INTO " + tableName + " VALUES(:1, NULL)",
        [num],
        function(err) {
          should.not.exist(err);
          verifyNull(num, callback);
        }
      );
    },
    function sqlEmpty(callback) {
      var num = 5;
      connection.execute(
        "INSERT INTO " + tableName + " VALUES(:1, '')",
        [num],
        function(err) {
          should.not.exist(err);
          verifyNull(num, callback);
        }
      );
    },
    function sqlNullColumn(callback) {
      var num = 6;
      connection.execute(
        "INSERT INTO " + tableName + "(num) VALUES(:1)",
        [num],
        function(err) {
          should.not.exist(err);
          verifyNull(num, callback);
        }
      );
    },
    function dropTable(callback) {
      connection.execute(
        "DROP table " + tableName,
        function(err) {
          should.not.exist(err);
          callback();
        }
      );
    }
  ], done);

  function verifyNull(id, cb)
  {
    connection.execute(
      "SELECT content FROM " + tableName + " WHERE num = :1",
      [id],
      function(err, result) {
        should.not.exist(err);
        // console.log(result);
        result.rows.should.eql([ [null] ]);
        cb();
      }
    );
  }

}

module.exports = assist;
