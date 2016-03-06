/* Copyright (c) 2015, 2016, Oracle and/or its affiliates.
   All rights reserved. */

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
 *  njsMessages.cpp
 *
 * DESCRIPTION
 *  Static function composes a displayable (error) string with replacements
 *
 *****************************************************************************/

#include <stdio.h>
#include <stdarg.h>
#include <string>
using namespace std;

#include "njsMessages.h"

// Maximum buffer size to compose error message
#define MAX_ERROR_MSG_LEN 1024

static const char *errMsg[] =
{
  "NJS-001: expected callback as last parameter",
  "NJS-002: invalid pool",
  "NJS-003: invalid connection",
  "NJS-004: invalid value for property %s",
  "NJS-005: invalid value for parameter %d",
  "NJS-006: invalid type for parameter %d",
  "NJS-007: invalid value for \"%s\" in parameter %d",
  "NJS-008: invalid type for \"%s\" in parameter %d",
  "NJS-009: invalid number of parameters",
  "NJS-010: unsupported data type in select list",
  "NJS-011: encountered bind value and type mismatch in parameter %d",
  "NJS-012: encountered invalid bind datatype in parameter %d",
  "NJS-013: invalid bind direction",
  "NJS-014: %s is a read-only property",
  "NJS-016: buffer is too small for OUT binds",
  "NJS-017: concurrent operations on resultSet are not allowed",
  "NJS-018: invalid result set",
  "NJS-019: resultSet cannot be returned for non-query statements",
  "NJS-020: empty array was specified to fetch values as string",
  "NJS-021: invalid type for conversion specified",
  "NJS-022: invalid LOB",
  "NJS-023: concurrent operations on LOB are not allowed",
  "NJS-024: memory allocation failed",
  "NJS-025: overflow when calculating results area size",
  "NJS-026: maxRows must be greater than zero",
  "NJS-027: unexpected SQL parsing error",
  "NJS-028: raw database type is not supported with DML Returning statements",
  "NJS-029: Invalid object from javascript",
  "NJS-030: connection cannot be released because Lob operations are in"
            " progress",
  "NJS-031: connection cannot be released because ResultSet operations are"
            " in progress",
  "NJS-032: connection cannot be released because a database call is in"
            " progress",
  "NJS-033: an internal error occurred. [%s][%s]",
  "NJS-034: data type is unsupported for array bind",
  "NJS-035: maxArraySize is required for IN OUT array bind",
  "NJS-036: given array is of size greater than maxArraySize",
  "NJS-037: incompatible type of value provided",
  "NJS-038: maxArraySize value should be greater than 0",
  "NJS-039: empty array is not allowed for IN bind",
  "NJS-040: connection request timeout",
};

string NJSMessages::getErrorMsg ( NJSErrorType err, ... )
{
  char msg[MAX_ERROR_MSG_LEN + 1]; // buffer to get formatted/substituted error msg
  va_list vlist;                   // variable argument list
  std::string str;

  if ( err > 0 && err < errMaxErrors )
  {
    // print all specified arguments
    va_start (vlist, err);
    if ( vsnprintf (msg, MAX_ERROR_MSG_LEN, errMsg[err-1], vlist) <= 0)
    {
      msg[0] = 0;
    }

    va_end (vlist);

    str = msg;
  }
  return str;
}



//end of NJSMessages.cpp

