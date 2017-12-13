/* Copyright (c) 2015, 2017, Oracle and/or its affiliates.
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
 *  njsMessages.h
 *
 * DESCRIPTION
 *   Error message consolidation and composing
 *   All error messages are stored in variable now and is displayed after
 *   any substitution. These messages can be exported to a text file for
 *   localization later
 *
 *****************************************************************************/

#ifndef __NJSMESSAGES_H__
#define __NJSMESSAGES_H__

#include <string>
using namespace std;

//-----------------------------------------------------------------------------
// njsErrorType
//   Enumeration for all error messages used within the driver.
//-----------------------------------------------------------------------------
typedef enum {
    errSuccess = 0,
    errMissingCallback,
    errInvalidPool,
    errInvalidConnection,
    errInvalidPropertyValue,
    errInvalidParameterValue,
    errInvalidParameterType,
    errInvalidPropertyValueInParam,
    errInvalidPropertyTypeInParam,
    errInvalidNumberOfParameters,
    errUnsupportedDatType,
    errBindValueAndTypeMismatch,
    errInvalidBindDataType,
    errInvalidBindDirection,
    errReadOnly,
    errNoTypeForConversion,
    errInsufficientBufferForBinds,
    errBusyResultSet,
    errInvalidResultSet,
    errInvalidNonQueryExecution,
    errEmptyArrayForFetchAs,
    errInvalidTypeForConversion,
    errInvalidLob,
    errBusyLob,
    errInsufficientMemory,
    errResultsTooLarge,
    errInvalidmaxRows,
    errSQLSyntaxError,
    errBufferReturningInvalid,
    errInvalidJSObject,
    errBusyConnLOB,
    errBusyConnRS,
    errBusyConnDB,
    errInternalError,
    errInvalidTypeForArrayBind,
    errReqdMaxArraySize,
    errInvalidArraySize,
    errIncompatibleTypeArrayBind,
    errInvalidValueArrayBind,
    errConnRequestTimeout,
    errCannotConvertRsToStream,
    errCannotInvokeRsMethods,
    errResultSetAlreadyConverted,
    errNamedJSON,
    errCannotLoadBinary,
    errPoolWithAliasAlreadyExists,
    errPoolWithAliasNotFound,
    errIncompatibleTypeArrayIndexBind,
    errNonArrayProvided,
    errNoBinaryInstalled,

    // New ones should be added here

    errMaxErrors                // Max # of errors plus one
} njsErrorType;


//-----------------------------------------------------------------------------
// njsMessages
//   Class used for producing error messages.
//-----------------------------------------------------------------------------
class njsMessages {
public:
    static string Get(int err, ...);
};

#endif                                             /* __NJSMESSAGES_H__ */

