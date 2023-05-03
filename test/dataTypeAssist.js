/* Copyright (c) 2015, 2023, Oracle and/or its affiliates. */

/******************************************************************************
 *
 * This software is dual-licensed to you under the Universal Permissive License
 * (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
 * 2.0 as shown at https://www.apache.org/licenses/LICENSE-2.0. You may choose
 * either license.
 *
 * If you elect to accept the software under the Apache License, Version 2.0,
 * the following applies:
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   21. datatypeAssist.js
 *
 * DESCRIPTION
 *   Helper functions and data for Oracle Data Type support tests.
 *
 *****************************************************************************/
'use strict';

const oracledb = require('oracledb');
const assert = require('assert');

const assist = exports;

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
  "nodb_timestamp4"   : "TIMESTAMP (4) WITH TIME ZONE",
  "nodb_timestamp5"   : "TIMESTAMP WITH LOCAL TIME ZONE",
  "nodb_timestamp6"   : "TIMESTAMP (9) WITH LOCAL TIME ZONE",
  "nodb_rowid"        : "ROWID",
  "nodb_urowid"       : "UROWID",
  "nodb_nclob"        : "NCLOB",
  "nodb_myclobs"      : "CLOB",
  "nodb_myblobs"      : "BLOB",
  "nodb_raw"          : "RAW(2000)",
  "nodb_long"         : "LONG",
  "nodb_longraw"      : "LONG RAW",
  "nodb_json"         : "JSON"
};

assist.data = {
  specialChars: [
    '"',
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
    ' }',
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
    "https://github.com/oracle/node-oracledb/blob/main/doc/api.md",
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
    new Date(2003, 9, 23, 11, 50, 30, 123)
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
assist.TIMESTAMP_TZ_STRINGS_1 =
[
  "TO_TIMESTAMP_TZ('2005-01-06 11:00:00.1 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('2005-09-01 11:00:00.1 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('2005-08-05 11:00:00.1 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('07-05-1998 11:00:00.1 -8:00', 'MM-DD-YYYY HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('07-05-1998 11:00:00.123 -8:00', 'DD-MM-YYYY HH:MI:SS.FF TZH:TZM')",
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
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00.123456189 -8:00', 'YYYY-MM-DD HH:MI:SS.FF TZH:TZM')",
  "TO_TIMESTAMP_TZ('1999-12-01 11:00:00 -8:00', 'YYYY-MM-DD HH:MI:SS TZH:TZM')",
  "TO_TIMESTAMP_TZ('10-Sep-02 14:10:10.123000 -8:00', 'DD-Mon-RR HH24:MI:SS.FF TZH:TZM')"
];

// for TIMESTAMP WITH TIME ZONE
assist.TIMESTAMP_TZ_STRINGS_2 =
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

// for INTERVAL MONTH TO YEAR
assist.INTERVAL_MONTH_TO_YEAR =
[
  "TO_YMINTERVAL('01-02')",
  "TO_YMINTERVAL('P1Y2M')",
  "TO_YMINTERVAL('1x-02' DEFAULT '00-00' ON CONVERSION ERROR)",
  "TO_YMINTERVAL ('22-02')",
  "TO_YMINTERVAL ('33-03')"
];

// for INTERVAL DAY TO SECOND
assist.INTERVAL_DAY_TO_SECOND =
[
  "TO_DSINTERVAL('20 00:00:20')",
  "TO_DSINTERVAL('10 00:00:10')",
  "TO_DSINTERVAL('1o 1:02:10' DEFAULT '10 8:00:00' ON CONVERSION ERROR)",
  "TO_DSINTERVAL ('11 00:00:11')",
  "TO_DSINTERVAL ('12 00:00:22')"
];

// for RAW
assist.RAW =
[
  "UTL_RAW.cast_to_raw('0x0002')",
  "UTL_RAW.cast_to_raw('0x48')",
  "UTL_RAW.cast_to_raw('0x65')",
  "UTL_RAW.cast_to_raw('0x6c')",
  "UTL_RAW.cast_to_raw('0x6f')",
  "UTL_RAW.cast_to_raw('0x2c')",
  "UTL_RAW.cast_to_raw('0x20')",
  "UTL_RAW.cast_to_raw('0x4f')",
  "UTL_RAW.cast_to_raw('0x72')",
  "UTL_RAW.cast_to_raw('0x21')"
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
  timestamps3:
  [
    '06-01-2005 11:00:00.100000 -08:00',
    '01-09-2005 11:00:00.100000 -08:00',
    '05-08-2005 11:00:00.100000 -08:00',
    '05-07-1998 11:00:00.100000 -08:00',
    '07-05-1998 11:00:00.123000 -08:00',
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
    '01-12-1999 11:00:00.123456 -08:00',
    '01-12-1999 11:00:00.000000 -08:00',
    '10-09-2002 14:10:10.123000 -08:00'
  ],
  timestamps4:
  [
    '06-01-2005 11:00:00.1000 -08:00',
    '01-09-2005 11:00:00.1000 -08:00',
    '05-08-2005 11:00:00.1000 -08:00',
    '05-07-1998 11:00:00.1000 -08:00',
    '07-05-1998 11:00:00.1230 -08:00',
    '01-12-1999 11:00:00.1000 -08:00',
    '01-12-1999 11:00:00.1200 -08:00',
    '01-12-1999 11:00:00.1230 -08:00',
    '01-12-1999 11:00:00.0123 -08:00',
    '01-12-1999 11:00:00.1234 -08:00',
    '01-12-1999 11:00:00.0012 -08:00',
    '01-12-1999 11:00:00.1235 -08:00',
    '01-12-1999 11:00:00.1235 -08:00',
    '01-12-1999 11:00:00.1235 -08:00',
    '01-12-1999 11:20:02.0000 -08:00',
    '01-12-1999 11:00:00.1235 -08:00',
    '01-12-1999 11:00:00.1235 -08:00',
    '01-12-1999 11:00:00.0000 -08:00',
    '10-09-2002 14:10:10.1230 -08:00'
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
  ],
  timestamp_1_1:
  [
    [ '2005-06-01 00:00:00.000000' ],
    [ '2005-09-01 00:00:00.000000' ],
    [ '2005-08-05 00:00:00.000000' ],
    [ '1998-07-05 00:00:00.000000' ],
    [ '1998-05-07 00:00:00.000000' ],
    [ '2005-09-01 07:05:19.000000' ],
    [ '1999-12-01 11:00:00.100000' ],
    [ '1999-12-01 11:00:00.120000' ],
    [ '1999-12-01 11:00:00.123000' ],
    [ '1999-12-01 11:01:10.012300' ],
    [ '1999-12-01 11:00:00.123400' ],
    [ '1999-12-01 11:00:00.001230' ],
    [ '1999-12-01 11:00:00.123450' ],
    [ '1999-12-01 11:00:00.123456' ],
    [ '1999-12-01 11:00:00.123457' ],
    [ '1999-12-01 11:02:20.000012' ],
    [ '1999-12-01 11:00:00.123457' ],
    [ '1999-12-01 11:00:00.123457' ],
    [ '2002-09-10 14:10:10.123000' ]
  ],
  timestamp_1_2:
  [
    { CONTENT: '2005-06-01 00:00:00.000000' },
    { CONTENT: '2005-09-01 00:00:00.000000' },
    { CONTENT: '2005-08-05 00:00:00.000000' },
    { CONTENT: '1998-07-05 00:00:00.000000' },
    { CONTENT: '1998-05-07 00:00:00.000000' },
    { CONTENT: '2005-09-01 07:05:19.000000' },
    { CONTENT: '1999-12-01 11:00:00.100000' },
    { CONTENT: '1999-12-01 11:00:00.120000' },
    { CONTENT: '1999-12-01 11:00:00.123000' },
    { CONTENT: '1999-12-01 11:01:10.012300' },
    { CONTENT: '1999-12-01 11:00:00.123400' },
    { CONTENT: '1999-12-01 11:00:00.001230' },
    { CONTENT: '1999-12-01 11:00:00.123450' },
    { CONTENT: '1999-12-01 11:00:00.123456' },
    { CONTENT: '1999-12-01 11:00:00.123457' },
    { CONTENT: '1999-12-01 11:02:20.000012' },
    { CONTENT: '1999-12-01 11:00:00.123457' },
    { CONTENT: '1999-12-01 11:00:00.123457' },
    { CONTENT: '2002-09-10 14:10:10.123000' }
  ],
  timestamp_3_1:
  [
    [ '2005-01-06 11:00:00.100000' ],
    [ '2005-09-01 11:00:00.100000' ],
    [ '2005-08-05 11:00:00.100000' ],
    [ '1998-07-05 11:00:00.100000' ],
    [ '1998-05-07 11:00:00.123000' ],
    [ '1999-12-01 11:00:00.100000' ],
    [ '1999-12-01 11:00:00.120000' ],
    [ '1999-12-01 11:00:00.123000' ],
    [ '1999-12-01 11:00:00.012300' ],
    [ '1999-12-01 11:00:00.123400' ],
    [ '1999-12-01 11:00:00.001230' ],
    [ '1999-12-01 11:00:00.123450' ],
    [ '1999-12-01 11:00:00.123456' ],
    [ '1999-12-01 11:00:00.123457' ],
    [ '1999-12-01 11:20:02.000012' ],
    [ '1999-12-01 11:00:00.123457' ],
    [ '1999-12-01 11:00:00.123456' ],
    [ '1999-12-01 11:00:00.000000' ],
    [ '2002-09-10 14:10:10.123000' ]
  ],
  timestamp_3_2:
  [
    { CONTENT: '2005-01-06 11:00:00.100000' },
    { CONTENT: '2005-09-01 11:00:00.100000' },
    { CONTENT: '2005-08-05 11:00:00.100000' },
    { CONTENT: '1998-07-05 11:00:00.100000' },
    { CONTENT: '1998-05-07 11:00:00.123000' },
    { CONTENT: '1999-12-01 11:00:00.100000' },
    { CONTENT: '1999-12-01 11:00:00.120000' },
    { CONTENT: '1999-12-01 11:00:00.123000' },
    { CONTENT: '1999-12-01 11:00:00.012300' },
    { CONTENT: '1999-12-01 11:00:00.123400' },
    { CONTENT: '1999-12-01 11:00:00.001230' },
    { CONTENT: '1999-12-01 11:00:00.123450' },
    { CONTENT: '1999-12-01 11:00:00.123456' },
    { CONTENT: '1999-12-01 11:00:00.123457' },
    { CONTENT: '1999-12-01 11:20:02.000012' },
    { CONTENT: '1999-12-01 11:00:00.123457' },
    { CONTENT: '1999-12-01 11:00:00.123456' },
    { CONTENT: '1999-12-01 11:00:00.000000' },
    { CONTENT: '2002-09-10 14:10:10.123000' }
  ],
  timestamp_3_3:
  [
    [ '06-JAN-2005 11:00:00:100000' ],
    [ '01-SEP-2005 11:00:00:100000' ],
    [ '05-AUG-2005 11:00:00:100000' ],
    [ '05-JUL-1998 11:00:00:100000' ],
    [ '07-MAY-1998 11:00:00:123000' ],
    [ '01-DEC-1999 11:00:00:100000' ],
    [ '01-DEC-1999 11:00:00:120000' ],
    [ '01-DEC-1999 11:00:00:123000' ],
    [ '01-DEC-1999 11:00:00:012300' ],
    [ '01-DEC-1999 11:00:00:123400' ],
    [ '01-DEC-1999 11:00:00:001230' ],
    [ '01-DEC-1999 11:00:00:123450' ],
    [ '01-DEC-1999 11:00:00:123456' ],
    [ '01-DEC-1999 11:00:00:123457' ],
    [ '01-DEC-1999 11:20:02:000012' ],
    [ '01-DEC-1999 11:00:00:123457' ],
    [ '01-DEC-1999 11:00:00:123456' ],
    [ '01-DEC-1999 11:00:00:000000' ],
    [ '10-SEP-2002 14:10:10:123000' ]
  ]
};

assist.jsonValues = [
  '{ "key1" : 1 }',
  '{ "key2" : -3.1415 }',
  '{ "key3" : false }',
  '{ "key4" : null }',
  '{ "key5" : "2018/11/01 18:30:00" }',
  '{ "key6" : [1,2,3,99] }',
  '{ "key7" : ["json array1", "json array2"], "key8" : [true, false] }',
  '{ "key9" : "#$%^&*()@!~`-+=" }',
  '{ "key10" : "_:;?><,.|/" }',
  '{ "key11" : "Math.pow(2, 53) -1" }',
  '{ "key12" : "-Math.pow(2, 53) -1" }',
  '{ "key13" : {"key13-1" : "value13-1", "key13-2" : "value13-2"} }',
  '{ "#$%^&*()@!~`-+=" : "special key14 name" }',
  null
];

assist.jsonExpectedResults = [
  { key1: 1 },
  { key2: -3.1415 },
  { key3: false },
  { key4: null },
  { key5: "2018/11/01 18:30:00" },
  { key6: [ 1, 2, 3, 99 ] },
  {
    key7: [ 'json array1', 'json array2' ],
    key8: [ true, false]
  },
  { key9: '#$%^&*()@!~`-+=' },
  { key10: '_:;?><,.|/' },
  { key11: 'Math.pow(2, 53) -1' },
  { key12: '-Math.pow(2, 53) -1' },
  { key13: { 'key13-1': 'value13-1', 'key13-2': 'value13-2' } },
  { '#$%^&*()@!~`-+=': 'special key14 name' },
  null
];

assist.schema = {
  specialChars: [
    '`',
    '~',
    '!',
    '@',
    '#',
    '$',
    '%',
    '^',
    '&',
    '*',
    '(',
    ')',
    '-',
    '+',
    '=',
    '[',
    ']',
    '{',
    '}',
    '\\',
    '|',
    ';',
    ':',
    '\'',
    '<',
    '>',
    ',',
    '.',
    '?',
    '/'
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
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9
  ]
};


/******************************* Helper Functions ***********************************/


const StringBuffer = function() {
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
  const buffer = new StringBuffer();
  const scSize = assist.data.specialChars.length;
  let scIndex = 0;
  let cIndex = 0;
  for (let i = 0; i < size; i++) {
    if (i % 10 == 0) {
      buffer.append(assist.data.specialChars[scIndex].substr(0, 1));
      scIndex = (scIndex + 1) % scSize;
    } else {
      cIndex = Math.floor(Math.random() * 52); // generate a random integer among 0-51
      buffer.append(assist.data.alphabet[cIndex]);
    }
  }
  return buffer.toString();
};

assist.createBuffer = function(size) {
  const array = [];
  for (let i = 0; i < size; i++) {
    const b = Math.floor(Math.random() * 256); // generate a random integer among 0-255
    array.push(b);
  }
  return Buffer.from(array, "utf-8");
};

assist.createSchemaString = function(size) {
  const buffer = new StringBuffer();
  const schema_prefix = "\"";
  let scIndex = 0;
  let cIndex = 0;
  let nIndex = 0;

  for (let i = 0; i < size - 2; i++) {
    if (i % 3 == 0) {
      scIndex = Math.floor(Math.random() * 30);
      buffer.append(assist.schema.specialChars[scIndex]);
    } else if (i % 3 == 1) {
      cIndex = Math.floor(Math.random() * 52);
      buffer.append(assist.schema.alphabet[cIndex]);
    } else {
      nIndex = Math.floor(Math.random() * 10);
      buffer.append(assist.schema.numbers[nIndex]);
    }
  }
  return schema_prefix + buffer.toString() + schema_prefix;
};


assist.compare2Buffers = function(originalBuf, compareBuf) {
  return originalBuf.equals(compareBuf);
};

assist.setUp = async function(connection, tableName, array) {
  await assist.createTable(connection, tableName);
  await assist.insertDataArray(connection, tableName, array);
};

assist.setUp4sql = async function(connection, tableName, array) {
  await assist.createTable(connection, tableName);
  await assist.insertData4sql(connection, tableName, array);
};

assist.createTable = async function(connection, tableName) {
  const sqlCreate = assist.sqlCreateTable(tableName);
  await connection.execute(sqlCreate);
};

assist.insertDataArray = async function(connection, tableName, array) {
  await Promise.all(array.map(async function(element) {
    await connection.execute(
      `INSERT INTO ` + tableName + ` VALUES(:no, :bindValue)`,
      { no: array.indexOf(element), bindValue: element },
      { autoCommit: true });
  }));
};

assist.insertData4sql = async function(connection, tableName, array) {
  await Promise.all(array.map(async function(element) {
    const sql = "INSERT INTO " + tableName + " VALUES(:no, " + element + " )";
    const binds = { no: array.indexOf(element) };
    await connection.execute(sql, binds);
  }));
};

assist.sqlCreateTable = function(tableName) {
  // The NOCOMPRESS option for CREATE TABLE ensures Hybrid Columnar Compression (HCC)
  // is disabled for tables with LONG & LONG RAW columns in all types of Oracle DB.
  // (Note: HCC is enabled in Oracle ADB-S and ADB-D by default)
  // When HCC is enabled, tables with LONG & LONG RAW columns cannot be created.
  const createTab =
        `BEGIN
           DECLARE
             e_table_missing EXCEPTION;
             PRAGMA EXCEPTION_INIT(e_table_missing, -00942);
           BEGIN
             EXECUTE IMMEDIATE ('DROP TABLE ${tableName} PURGE');
             EXCEPTION
               WHEN e_table_missing
               THEN NULL;
           END;
           EXECUTE IMMEDIATE ('
             CREATE TABLE ${tableName} (
               num NUMBER(10),
               content ${assist.allDataTypeNames[tableName]},
               CONSTRAINT ${tableName}_pk PRIMARY KEY (num)
             ) NOCOMPRESS
           ');
         END; `;
  return createTab;
};


/************************* Functions for Verifiction *********************************/

assist.dataTypeSupport = async function(connection, tableName, array) {
  const result = await connection.execute(
    `SELECT * FROM ` + tableName + ` ORDER BY num`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

  for (let i = 0; i < array.length; i++) {
    // console.log(result.rows[i].CONTENT);
    if ((typeof result.rows[i].CONTENT) === 'string')
      assert.strictEqual(result.rows[i].CONTENT.trim(), array[result.rows[i].NUM]);
    else if ((typeof result.rows[i].CONTENT) === 'number')
      assert.strictEqual(result.rows[i].CONTENT, array[result.rows[i].NUM]);
    else if (Buffer.isBuffer(result.rows[i].CONTENT))
      assert.strictEqual(result.rows[i].CONTENT.toString('hex'), array[result.rows[i].NUM].toString('hex'));
    else if (Object.prototype.toString.call(result.rows[i].CONTENT) === '[object Date]')
      assert.strictEqual(result.rows[i].CONTENT.getTime(), array[result.rows[i].NUM].getTime());
    else if (typeof result.rows[i].CONTENT === 'object')
      assert.deepStrictEqual(result.rows[i].CONTENT, assist.jsonExpectedResults[result.rows[i].NUM]);
    else
      assert.ifError(new Error('Uncaught data type!'));
  }
};


assist.verifyResultSet = async function(connection, tableName, array) {
  const result = await connection.execute(
    "SELECT * FROM " + tableName,
    [],
    { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });

  assert.strictEqual((result.resultSet.metaData[0]).name, 'NUM');
  assert.strictEqual((result.resultSet.metaData[1]).name, 'CONTENT');
  await fetchRowsFromRS(result.resultSet, array);
};

assist.verifyRefCursor = async function(connection, tableName, array) {
  const createProc =
        `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) ` +
        `AS ` +
        `BEGIN ` +
        `  OPEN p_out FOR ` +
        `SELECT * FROM ` + tableName  + `; ` +
        `END; `;

  await connection.execute(createProc);

  const result = await connection.execute(
    `BEGIN testproc(:o); END;`,
    [
      { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    ],
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

  await fetchRowsFromRS(result.outBinds[0], array);

  await connection.execute(`DROP PROCEDURE testproc`);
};

async function fetchRowsFromRS(rs, array) {
  const numRows = 3;
  const rows = await rs.getRows(numRows);
  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i++) {
      if ((typeof rows[i].CONTENT) === 'string')
        assert.strictEqual(rows[i].CONTENT.trim(), array[rows[i].NUM]);
      else if ((typeof rows[i].CONTENT) === 'number')
        assert.strictEqual(rows[i].CONTENT, array[rows[i].NUM]);
      else if (Buffer.isBuffer(rows[i].CONTENT))
        assert.strictEqual(rows[i].CONTENT.toString('hex'), array[rows[i].NUM].toString('hex'));
      else if (Object.prototype.toString.call(rows[i].CONTENT) === '[object Date]')
        assert.strictEqual(rows[i].CONTENT.getTime(), array[rows[i].NUM].getTime());
      else if (typeof rows[i].CONTENT === 'object')
        assert.deepStrictEqual(rows[i].CONTENT, assist.jsonExpectedResults[rows[i].NUM]);
      else
        assert.ifError(new Error('Uncaught data type!'));
    }
    return fetchRowsFromRS(rs, array);
  } else {
    await rs.close();
  }
}

assist.selectOriginalData = async function(connection, tableName, array) {
  await Promise.all(array.map(async function(element) {
    await connection.execute(
      `SELECT * FROM ` + tableName + ` WHERE num = :no`,
      { no: array.indexOf(element) });
  }));
};

/* Null value verfication */
assist.verifyNullValues = async function(connection, tableName) {
  const sqlInsert = `INSERT INTO ` + tableName + ` VALUES(:no, :bindValue)`;

  const sqlCreate = await assist.sqlCreateTable(tableName);
  await connection.execute(sqlCreate);
  let num = 1;
  await connection.execute(
    sqlInsert,
    { no: num, bindValue: '' });
  await verifyNull(num);

  num = 2;
  await connection.execute(
    sqlInsert,
    { no: num, bindValue: null });
  await verifyNull(num);

  num = 3;
  await connection.execute(
    sqlInsert,
    { no: num, bindValue: undefined });
  await verifyNull(num);

  num = 4;
  await connection.execute(
    `INSERT INTO ` + tableName + ` VALUES(:1, NULL)`,
    [num]);
  await verifyNull(num);
  num = 5;
  await connection.execute(
    `INSERT INTO ` + tableName + ` VALUES(:1, '')`,
    [num]);
  await verifyNull(num);

  num = 6;
  await connection.execute(`INSERT INTO ` + tableName + `(num) VALUES(:1)`,
    [num]);

  await verifyNull(num);

  await connection.execute(`DROP table ` + tableName + ` PURGE`);

  async function verifyNull(id) {
    const result = await connection.execute(`SELECT content FROM ` + tableName + ` WHERE num = :1`,
      [id]);
    assert.deepStrictEqual(result.rows, [ [null] ]);
  }
};

assist.compareNodejsVersion = function(nowVersion, comparedVersion) {
  // return true if nowVersion > or = comparedVersion;
  // else return false;
  const now = nowVersion.split(".");
  const compare = comparedVersion.split(".");
  if (now[0] > compare[0]) {
    return true;
  } else if (now[0] === compare[0] && now[1] > compare[1]) {
    return true;
  } else if (now[0] === compare[0] && now[1] === compare[1] && now[2] > compare[2]) {
    return true;
  } else if (now[0] === compare[0] && now[1] === compare[1] && now[2] === compare[2]) {
    return true;
  } else {
    return false;
  }
};

assist.verifyRefCursorWithFetchInfo = async function(connection, tableName, array) {
  const createProc =
        `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) ` +
        `AS ` +
        `BEGIN ` +
        `  OPEN p_out FOR ` +
        `SELECT * FROM ` + tableName  + `; ` +
        `END; `;

  await connection.execute(createProc);

  const result = await connection.execute(
    `begin testproc(:out); end;`,
    {
      out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo:
          {
            "CONTENT": { type: oracledb.STRING }
          }
    });
  await _verifyFetchedValues(connection, result.outBinds.out, array, tableName);
  await connection.execute(`DROP PROCEDURE testproc`);
};

assist.verifyRefCursorWithFetchAsString = async function(connection, tableName, array) {
  const createProc =
        `CREATE OR REPLACE PROCEDURE testproc (p_out OUT SYS_REFCURSOR) ` +
        `AS ` +
        `BEGIN ` +
        `  OPEN p_out FOR ` +
        `SELECT * FROM ` + tableName  + `; ` +
        `END; `;

  await connection.execute(createProc);

  const result = await connection.execute(
    `begin testproc(:out); end;`,
    {
      out: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    },
    { outFormat: oracledb.OUT_FORMAT_OBJECT });

  await _verifyFetchedValues(connection, result.outBinds.out, array, tableName);

  await connection.execute(`DROP PROCEDURE testproc`);
};

const _verifyFetchedValues = async function(connection, rs, array, tableName) {
  const amount = array.length;
  const rows = await rs.getRows(amount);

  const queryAndCompare = async function(row) {
    const sql = `select content from ` + tableName + ` where num = ` + row.NUM;
    const result = await connection.execute(
      sql,
      [],
      { fetchInfo: { "CONTENT": { type: oracledb.STRING } } });

    assert.strictEqual(row.CONTENT, result.rows[0][0]);
  };

  await Promise.all(rows.map(async function(row) {
    await queryAndCompare(row);
  }));

  await rs.close();


}; // await _verifyFetchedValues()

module.exports = assist;
