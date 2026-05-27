// Copyright (c) 2026, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

function isUnicodeLetter(ch) {
  return /^\p{L}$/u.test(ch);
}

function isUnicodeDigit(ch) {
  return /^\p{Nd}$/u.test(ch);
}

function isUnicodeMark(ch) {
  return /^\p{M}$/u.test(ch);
}

function isWhitespace(ch) {
  return /^\s$/u.test(ch);
}

function isUnquotedIdentifierChar(ch) {
  return isUnicodeLetter(ch) || isUnicodeMark(ch) || isUnicodeDigit(ch) ||
    ch === '_' || ch === '$' || ch === '#';
}

//-----------------------------------------------------------------------------
// enquoteLiteral()
//
// Returns a quoted SQL literal with embedded single quotes doubled.
//-----------------------------------------------------------------------------
function enquoteLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

//-----------------------------------------------------------------------------
// readChar()
//
// Returns the Unicode character at the specified UTF-16 index together with the
// number of UTF-16 code units consumed. This keeps parser indexing correct for
// supplementary characters.
//-----------------------------------------------------------------------------
function readChar(str, index) {
  if (index >= str.length) {
    return;
  }
  // Read one complete Unicode code point so surrogate pairs are handled as a
  // single character by the parser.
  const cp = str.codePointAt(index);
  const ch = String.fromCodePoint(cp);
  return { ch, size: ch.length };
}

//-----------------------------------------------------------------------------
// skipSpaces()
//
// Advances past any Unicode whitespace characters and returns the next
// non-whitespace index.
//-----------------------------------------------------------------------------
function skipSpaces(str, index) {
  while (index < str.length) {
    const next = readChar(str, index);
    if (!isWhitespace(next.ch)) {
      break;
    }
    // Advance by the width of the full code point rather than a single code
    // unit.
    index += next.size;
  }
  return index;
}

//-----------------------------------------------------------------------------
// parseQuotedSimpleSqlName()
//
// Parses a quoted identifier. The opening quote is assumed to be at the
// supplied index. Quoted identifiers must be non-empty and cannot contain a
// raw double quote or a \u0000 character. The returned index points just after
// the closing quote.
//-----------------------------------------------------------------------------
function parseQuotedSimpleSqlName(str, index) {
  index += 1;
  let hasContent = false;

  while (index < str.length) {
    const cur = readChar(str, index);
    if (cur.ch === '"') {
      // Reject empty quoted identifiers; otherwise consume the closing quote.
      return hasContent ? index + cur.size : undefined;
    }
    if (cur.ch === '\u0000') {
      return;
    }

    // Any non-quote, non-NUL character is accepted inside quoted names.
    hasContent = true;
    index += cur.size;
  }
}

//-----------------------------------------------------------------------------
// parseUnquotedSimpleSqlName()
//
// Parses an unquoted identifier. The first character must be a Unicode letter.
// Remaining characters may be Unicode letters, combining marks, decimal
// digits, or _, $, #. Parsing stops before the first character that is not part
// of the identifier.
//-----------------------------------------------------------------------------
function parseUnquotedSimpleSqlName(str, index) {
  const first = readChar(str, index);
  if (!first || !isUnicodeLetter(first.ch)) {
    return;
  }

  // Consume the required leading Unicode letter first.
  index += first.size;
  while (index < str.length) {
    const cur = readChar(str, index);
    if (!isUnquotedIdentifierChar(cur.ch)) {
      break;
    }
    index += cur.size;
  }

  return index;
}

//-----------------------------------------------------------------------------
// parseSimpleSqlName()
//
// Parses one simple identifier component, quoted or unquoted, and returns the
// index just after the parsed component.
//-----------------------------------------------------------------------------
function parseSimpleSqlName(str, index) {
  const cur = readChar(str, index);
  if (!cur) {
    return;
  }
  return cur.ch === '"' ? parseQuotedSimpleSqlName(str, index)
    : parseUnquotedSimpleSqlName(str, index);
}

//-----------------------------------------------------------------------------
// parseQualifiedSqlName()
//
// Parses a qualified SQL name made up of one or more simple SQL names
// separated by dots, optionally followed by an @ database link name that can
// itself contain dotted simple SQL names. The returned index points just
// after the parsed qualified name; undefined is returned if parsing fails.
//-----------------------------------------------------------------------------
function parseQualifiedSqlName(str, index) {
  let foundDbLink = false;

  while (true) {
    const parsedIndex = parseSimpleSqlName(str, index);
    if (parsedIndex === undefined) {
      return;
    }

    index = skipSpaces(str, parsedIndex);

    if (index === str.length) {
      return index;
    }

    const separator = readChar(str, index);
    index = skipSpaces(str, index + separator.size);

    if (!foundDbLink && separator.ch === '@') {
      foundDbLink = true;
    } else if (separator.ch !== '.') {
      return;
    }
  }
}

module.exports = {
  enquoteLiteral,
  parseQualifiedSqlName,
  parseSimpleSqlName
};
