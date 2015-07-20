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
module.exports = assist;