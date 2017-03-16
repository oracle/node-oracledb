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
#define NJS_MAX_ERROR_MSG_LEN 1024

static const char *errMsg[] =
{
  "NJS-000: success",                              // errSuccess
  "NJS-001: expected callback as last parameter",  // errMissingCallback
  "NJS-002: invalid pool",                         // errInvalidPool
  "NJS-003: invalid connection",                   // errInvalidConnection
  "NJS-004: invalid value for property %s",        // errInvalidPropertyValue
  "NJS-005: invalid value for parameter %d",       // errInvalidParameterValue
  "NJS-006: invalid type for parameter %d",        // errInvalidParameterType
  "NJS-007: invalid value for \"%s\" in parameter %d", // errInvalidPropertyValueInParam
  "NJS-008: invalid type for \"%s\" in parameter %d",  // errInvalidPropertyTypeInParam
  "NJS-009: invalid number of parameters",         // errInvalidNumberOfParameters
  "NJS-010: unsupported data type in select list", // errUnsupportedDatType
  "NJS-011: encountered bind value and type mismatch in parameter %d", // errBindValueAndTypeMismatch
  "NJS-012: encountered invalid bind data type in parameter %d", // errInvalidBindDataType
  "NJS-013: invalid bind direction",               // errInvalidBindDirection
  "NJS-014: %s is a read-only property",           // errReadOnly
  "NJS-015: type was not specified for conversion", // errNoTypeForConversion
  "NJS-016: buffer is too small for OUT binds",    // errInsufficientBufferForBinds
  "NJS-017: concurrent operations on ResultSet are not allowed", // errBusyResultSet
  "NJS-018: invalid ResultSet",                   // errInvalidResultSet
  "NJS-019: ResultSet cannot be returned for non-query statements", // errInvalidNonQueryExecution
  "NJS-020: empty array was specified to fetch values as string", // errEmptyArrayForFetchAs
  "NJS-021: invalid type for conversion specified", // errInvalidTypeForConversion
  "NJS-022: invalid Lob",                           // errInvalidLob
  "NJS-023: concurrent operations on a Lob are not allowed",  // errBusyLob
  "NJS-024: memory allocation failed",  // errInsufficientMemory
  "NJS-025: overflow when calculating the result area size", // errResultsTooLarge
  "NJS-026: maxRows must be greater than zero",   // errInvalidmaxRows
  "NJS-027: unexpected SQL parsing error",        // errSQLSyntaxError
  "NJS-028: RAW database type is not supported with DML Returning statements", // errBufferReturningInvalid
  "NJS-029: invalid object from JavaScript",      // errInvalidJSObject
  "NJS-030: connection cannot be released because Lob operations are in progress",  // errBusyConnLOB
  "NJS-031: connection cannot be released because ResultSet operations are in progress", // errBusyConnRS
  "NJS-032: connection cannot be released because a database call is in progress", // errBusyConnDB
  "NJS-033: an internal error occurred. [%s][%s]", // errInternalError
  "NJS-034: data type is unsupported for array bind", // errInvalidTypeForArrayBind
  "NJS-035: maxArraySize is required for IN OUT array bind", // errReqdMaxArraySize
  "NJS-036: given array is of size greater than maxArraySize", // errInvalidArraySize
  "NJS-037: invalid data type at array index %d for bind \"%s\"", // errIncompatibleTypeArrayBind
  "NJS-038: maxArraySize value should be greater than zero", // errInvalidValueArrayBind
  "NJS-039: empty array is not allowed for IN bind", // errEmptyArray
  "NJS-040: connection request timeout",  // errConnRequestTimeout
  "NJS-041: cannot convert ResultSet to QueryStream after invoking methods", // errCannotConvertRsToStream
  "NJS-042: cannot invoke ResultSet methods after converting to QueryStream", // errCannotInvokeRsMethods
  "NJS-043: ResultSet already converted to QueryStream", // errResultSetAlreadyConverted
  "NJS-044: named JSON object is not expected in this context", // errNamedJSON
  "NJS-045: cannot load the oracledb add-on binary", // errCannotLoadBinary
  "NJS-046: pool alias \"%s\" already exists in the connection pool cache", // errPoolWithAliasAlreadyExists
  "NJS-047: pool alias \"%s\" not found in the connection pool cache", // errPoolWithAliasNotFound
  "NJS-048: operation not permitted while Lob object is active in a bind operation", // errLOBBindActive
  "NJS-049: Temporary LOBs were open when the connection was closed", // errBusyConnTEMPLOB
  "NJS-050: data must be shorter than %d", // errBindValueTooLarge
  "NJS-051: \"%s\" must be less than %d", // errMaxValueTooLarge
  "NJS-052: invalid data type at array index %d for bind position %d", // errIncompatibleTypeArrayIndexBind
};

string NJSMessages::getErrorMsg ( NJSErrorType err, ... )
{
  char msg[NJS_MAX_ERROR_MSG_LEN + 1]; // buffer to get formatted/substituted error msg
  va_list vlist;                   // variable argument list
  std::string str;

  if ( err > 0 && err < errMaxErrors )
  {
    // print all specified arguments
    va_start (vlist, err);
    if ( vsnprintf (msg, NJS_MAX_ERROR_MSG_LEN, errMsg[err], vlist) <= 0)
    {
      msg[0] = 0;
    }

    va_end (vlist);

    str = msg;
  }
  return str;
}



//end of NJSMessages.cpp

