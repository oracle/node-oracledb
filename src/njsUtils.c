// Copyright (c) 2015, 2025, Oracle and/or its affiliates.

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
// NAME
//   njsUtils.c
//
// DESCRIPTION
//   Implementation of common methods used throughout driver.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

//-----------------------------------------------------------------------------
// njsUtils_addTypeProperties()
//   Add type properties to the specified object given the ODPI-C Oracle type
// number and (optionally) the object type structure.
//-----------------------------------------------------------------------------
bool njsUtils_addTypeProperties(napi_env env, napi_value obj,
        const char *propertyNamePrefix, uint32_t oracleTypeNum,
        njsDbObjectType *objType)
{
    char propertyName[100];
    napi_value temp;

    // set the type (integer constant)
    NJS_CHECK_NAPI(env, napi_create_uint32(env, oracleTypeNum, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, propertyNamePrefix,
            temp))

    // set the type class, if applicable
    if (objType) {
        (void) snprintf(propertyName, sizeof(propertyName), "%sClass",
                propertyNamePrefix);
        NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                objType->jsDbObjectType, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, propertyName,
                temp))
    }

    return true;
}

//-----------------------------------------------------------------------------
// njsUtils_addMetaDataProperties()
//   Add Metadata properties to the specified object given the ODPI-C type info
//-----------------------------------------------------------------------------
bool njsUtils_addMetaDataProperties(napi_env env, napi_value obj,
        dpiDataTypeInfo *info)
{
    napi_value temp;

    if (info->dbSizeInBytes > 0) {
        // set the maxSize
        NJS_CHECK_NAPI(env, napi_create_uint32(env, info->dbSizeInBytes, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, "maxSize",
            temp))
    }

    if (info->precision != 0 || info->scale != 0) {
        // set the precision
        NJS_CHECK_NAPI(env, napi_create_int32(env, info->precision, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, "precision",
                temp))

        // set the scale
        NJS_CHECK_NAPI(env, napi_create_int32(env, info->scale, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, "scale",
                temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_copyString()
//   Copy an array with the specified number of elements to the destination,
// returning a boolean indicating if this was done successfully or not.
//-----------------------------------------------------------------------------
bool njsUtils_copyString(napi_env env, char *source, size_t sourceLength,
        char **dest, size_t *destLength)
{
    if (source && sourceLength > 0) {
        *dest = malloc(sourceLength);
        if (!*dest)
            return njsUtils_throwInsufficientMemory(env);
        memcpy(*dest, source, sourceLength);
        *destLength = sourceLength;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_copyStringFromJS()
//   Copies the contents of a Javascript string into the provided buffer. If
// the buffer already has something in it, it is freed first.
//-----------------------------------------------------------------------------
bool njsUtils_copyStringFromJS(napi_env env, napi_value value, char **result,
        size_t *resultLength)
{
    // determine the length of the string
    NJS_CHECK_NAPI(env, napi_get_value_string_utf8(env, value, NULL, 0,
            resultLength))

    // allocate memory to store the string
    if (*result)
        free(*result);
    *result = malloc(*resultLength + 1);
    if (!*result)
        return njsUtils_throwInsufficientMemory(env);

    // get the string value contents
    NJS_CHECK_NAPI(env, napi_get_value_string_utf8(env, value, *result,
            *resultLength + 1, resultLength))
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_createBaton()
//   Create the baton used for asynchronous methods and initialize all values.
// If this fails for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsUtils_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, const njsClassDef *classDef,
        njsBaton **baton)
{
    njsBaton *tempBaton;

    // allocate and zero memory
    tempBaton = calloc(1, sizeof(njsBaton));
    if (!tempBaton)
        return njsUtils_throwInsufficientMemory(env);

    // perform common checks and populate common attributes in the baton
    if (!njsBaton_create(tempBaton, env, info, numArgs, args, classDef)) {
        njsBaton_free(tempBaton, env);
        return false;
    }

    *baton = tempBaton;
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_genericNew()
//   Generic method for creating a JS instance with the specified structure
// size and finalize function.
//-----------------------------------------------------------------------------
bool njsUtils_genericNew(napi_env env, const njsClassDef *classDef,
        napi_ref constructorRef, napi_value *instanceObj, void **instance)
{
    napi_value constructor;
    size_t numProperties;
    void *data;

    // acquire a reference to the constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, constructorRef,
            &constructor))

    // create the new instance
    NJS_CHECK_NAPI(env, napi_new_instance(env, constructor, 0, NULL,
            instanceObj))

    // allocate memory for structure; memory is zero-ed
    data = calloc(1, classDef->structSize);
    if (!data)
        return njsUtils_throwInsufficientMemory(env);

    // wrap the structure for use by JavaScript
    if (napi_wrap(env, *instanceObj, data, classDef->finalizeFn, NULL,
            NULL) != napi_ok) {
        free(data);
        return njsUtils_genericThrowError(env, __FILE__, __LINE__);
    }

    // define properties on instance, if applicable
    if (classDef->propertiesOnInstance) {
        for (numProperties = 0; classDef->properties[numProperties].utf8name;
                numProperties++);
        NJS_CHECK_NAPI(env, napi_define_properties(env, *instanceObj,
                numProperties, classDef->properties))
    }

    *instance = data;
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_genericThrowError()
//   This method is called when the last Node-API call was unsuccessful and
// throws an error if one is not already pending. Returns false as a convenience
// to the caller.
//-----------------------------------------------------------------------------
bool njsUtils_genericThrowError(napi_env env, const char *fileName,
        int lineNum)
{
    const napi_extended_error_info *errorInfo;
    char internalError[1024];
    const char *errorMessage;
    bool isPending;

    napi_get_last_error_info(env, &errorInfo);
    napi_is_exception_pending(env, &isPending);
    if (!isPending) {
        errorMessage = errorInfo->error_message;
        if (!errorMessage)
            errorMessage = "no error message";
        (void) snprintf(internalError, sizeof(internalError),
                " %sin file %s, line %d (%s)", NJS_ERR_INTERNAL, fileName, lineNum,
                errorMessage);
        napi_throw_error(env, NULL, internalError);
    }
    return false;
}


//-----------------------------------------------------------------------------
// njsUtils_getError()
//   This method will create an error object and, if it is an ODPI-C error,
// also acquire the error number and offset and store those as properties on
// the error object. A boolean is returned indicating if the creation of the
// error object was successful. If not an exception will be pending.
//-----------------------------------------------------------------------------
bool njsUtils_getError(napi_env env, dpiErrorInfo *errorInfo,
        const char *errorBuffer, napi_value *error)
{
    napi_value message, temp, tempError;
    size_t errorBufferLength;

    // create message object
    if (errorInfo) {
        errorBuffer = errorInfo->message;
        errorBufferLength = errorInfo->messageLength;
    } else {
        errorBufferLength = NAPI_AUTO_LENGTH;
    }
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, errorBuffer,
            errorBufferLength, &message))

    // create error object
    NJS_CHECK_NAPI(env, napi_create_error(env, NULL, message, &tempError))

    // let the top layer know that the stack needs to be captured
    NJS_CHECK_NAPI(env, napi_get_boolean(env, true, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, tempError,
            "requiresStackCapture", temp))

    // for ODPI-C errors, store error number and offset
    if (errorInfo) {

        // store error number property
        NJS_CHECK_NAPI(env, napi_create_int32(env, errorInfo->code, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, tempError, "errorNum",
                temp))

        // store offset property
        NJS_CHECK_NAPI(env, napi_create_uint32(env, errorInfo->offset, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, tempError, "offset",
                temp))

        // store isRecoverable property
        NJS_CHECK_NAPI(env, napi_get_boolean(env, errorInfo->isRecoverable, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, tempError,
                "isRecoverable", temp))

    }

    *error = tempError;
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedProperty()
//   Returns the value of the named property along with a boolean value
// indicating whether or not it was found (a value other than undefined).
//-----------------------------------------------------------------------------
bool njsUtils_getNamedProperty(napi_env env, napi_value value,
        const char *name, napi_value *propertyValue)
{
    napi_valuetype valueType;

    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, name,
            propertyValue))
    NJS_CHECK_NAPI(env, napi_typeof(env, *propertyValue, &valueType))
    if (valueType == napi_undefined)
        *propertyValue = NULL;

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedPropertyBool()
//   Returns the value of the named property, which is assumed to be a boolean
// value. If the value is not found, the boolean value is left unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyBool(napi_env env, napi_value value,
        const char *name, bool *outValue)
{
    napi_value outValueObj;

    if (!njsUtils_getNamedProperty(env, value, name, &outValueObj))
        return false;
    if (outValueObj) {
        NJS_CHECK_NAPI(env, napi_get_value_bool(env, outValueObj, outValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedPropertyInt()
//   Returns the value of the named property, which is assumed to be a signed
// integer value. If the value is not found, the int32_t value is left
// unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyInt(napi_env env, napi_value value,
        const char *name, int32_t *outValue)
{
    napi_value outValueObj;

    if (!njsUtils_getNamedProperty(env, value, name, &outValueObj))
        return false;
    if (outValueObj) {
        NJS_CHECK_NAPI(env, napi_get_value_int32(env, outValueObj, outValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedPropertyShardingKey()
//   Returns the value of the named property, which is assumed to be a string
// value. If the value is not found, the string value is left unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyShardingKey(napi_env env, napi_value value,
        const char *name, uint8_t *numShardingKeyColumns,
        dpiShardingKeyColumn **shardingKeyColumns)
{
    napi_value asNumber, shardingKey, element;
    dpiShardingKeyColumn *shards;
    napi_valuetype valueType;
    uint32_t arrLen, i;
    size_t numBytes;
    bool check;

    // allocate space for sharding key columns; if array is empty, nothing
    // further to do!
    if (!njsUtils_getNamedProperty(env, value, name, &shardingKey))
        return false;
    if (!shardingKey)
        return true;
    NJS_CHECK_NAPI(env, napi_get_array_length(env, shardingKey, &arrLen))
    if (arrLen == 0)
        return true;
    shards = calloc(arrLen, sizeof(dpiShardingKeyColumn));
    if (!shards)
        return njsUtils_throwInsufficientMemory(env);
    *shardingKeyColumns = shards;
    *numShardingKeyColumns = (uint8_t) arrLen;

    // process each element
    for (i = 0; i < arrLen; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, shardingKey, i, &element))
        NJS_CHECK_NAPI(env, napi_typeof(env, element, &valueType))

        // handle strings
        if (valueType == napi_string) {
            shards[i].nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
            shards[i].oracleTypeNum = DPI_ORACLE_TYPE_VARCHAR;
            if (!njsUtils_copyStringFromJS(env, element,
                    &shards[i].value.asBytes.ptr, &numBytes))
                return false;
            shards[i].value.asBytes.length = (uint32_t) numBytes;
            continue;
        }

        // handle numbers
        if (valueType == napi_number) {
            shards[i].nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
            shards[i].oracleTypeNum = DPI_ORACLE_TYPE_NUMBER;
            NJS_CHECK_NAPI(env, napi_get_value_double(env, element,
                    &shards[i].value.asDouble));
            continue;
        }

        // handle objects
        if (valueType == napi_object) {

            // handle buffers
            NJS_CHECK_NAPI(env, napi_is_buffer(env, element, &check))
            if (check) {
                shards[i].nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
                shards[i].oracleTypeNum = DPI_ORACLE_TYPE_RAW;
                NJS_CHECK_NAPI(env, napi_get_buffer_info(env, element,
                        (void*) &shards[i].value.asBytes.ptr, &numBytes))
                shards[i].value.asBytes.length = (uint32_t) numBytes;
                continue;
            }

            // handle dates
            NJS_CHECK_NAPI(env, napi_is_date(env, element, &check))
            if (check) {
                shards[i].nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
                shards[i].oracleTypeNum = DPI_ORACLE_TYPE_DATE;
                NJS_CHECK_NAPI(env, napi_coerce_to_number(env, element,
                        &asNumber))
                NJS_CHECK_NAPI(env, napi_get_value_double(env, asNumber,
                        &shards[i].value.asDouble))
                continue;
            }

        }

        // no support for other types (should be checked in JavaScript layer)
        return njsUtils_genericThrowError(env, __FILE__, __LINE__);
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedPropertyString()
//   Returns the value of the named property, which is assumed to be a string
// value. If the value is not found, the string value is left unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyString(napi_env env, napi_value value,
        const char *name, char **result, size_t *resultLength)
{
    napi_value resultObj;

    if (!njsUtils_getNamedProperty(env, value, name, &resultObj))
        return false;
    if (resultObj)
        return njsUtils_copyStringFromJS(env, resultObj, result, resultLength);

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedPropertyStringArray()
//   Returns the value of the named property, which is assumed to be an array
// of strings. If the value is not found, the string array is left unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyStringArray(napi_env env, napi_value value,
        const char *name, uint32_t *resultNumElems, char ***resultElems,
        uint32_t **resultElemLengths)
{
    uint32_t arrayLength, i, *tempLengths;
    napi_value array, element;
    char **tempStrings;
    size_t tempLength;

    // get array; if array is missing or has no elements, nothing further needs
    // to be done!
    if (!njsUtils_getNamedProperty(env, value, name, &array))
        return false;
    if (!array)
        return true;
    NJS_CHECK_NAPI(env, napi_get_array_length(env, array, &arrayLength))
    if (arrayLength == 0)
        return true;

    // allocate memory for the results
    tempStrings = calloc(arrayLength, sizeof(char*));
    if (!tempStrings)
        return njsUtils_throwInsufficientMemory(env);
    *resultElems = tempStrings;
    tempLengths = calloc(arrayLength, sizeof(uint32_t));
    if (!tempLengths)
        return njsUtils_throwInsufficientMemory(env);
    *resultElemLengths = tempLengths;

    // populate the results
    *resultNumElems = arrayLength;
    for (i = 0; i < arrayLength; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, array, i, &element))
        if (!njsUtils_copyStringFromJS(env, element, &tempStrings[i],
                &tempLength))
            return false;
        tempLengths[i] = (uint32_t) tempLength;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedPropertyStringOrBuffer()
//   Returns the value of the named property, which is assumed to be a string
// or Buffer value. If the value is not found, the string value is left
// unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyStringOrBuffer(napi_env env, napi_value value,
        const char *name, char **result, size_t *resultLength)
{
    napi_value resultObj;
    size_t bufLen;
    bool check;
    void *buf;

    if (!njsUtils_getNamedProperty(env, value, name, &resultObj))
        return false;
    if (resultObj) {
        NJS_CHECK_NAPI(env, napi_is_buffer(env, resultObj, &check))
        if (!check)
            return njsUtils_copyStringFromJS(env, resultObj, result,
                    resultLength);
        NJS_CHECK_NAPI(env, napi_get_buffer_info(env, resultObj, &buf,
                &bufLen))
        if (!njsUtils_copyString(env, buf, bufLen, result, resultLength))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNamedPropertyUnsignedInt()
//   Returns the value of the named property, which is assumed to be an
// unsigned integer value. If the value is not found, the uint32_t value is
// left unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyUnsignedInt(napi_env env, napi_value value,
        const char *name, uint32_t *outValue)
{
    napi_value outValueObj;

    if (!njsUtils_getNamedProperty(env, value, name, &outValueObj))
        return false;
    if (outValueObj) {
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, outValueObj, outValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getXid()
//   Returns the XID from the specified N-API value.
//-----------------------------------------------------------------------------
bool njsUtils_getXid(napi_env env, napi_value value, dpiXid **xid)
{
    napi_valuetype valueType;
    dpiXid *tempXid;
    int32_t fmtId;
    size_t len;

    // if value is undefined, nothing further to do!
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
    if (valueType == napi_undefined) {
        *xid = NULL;
        return true;
    }

    // allocate memory for the XID structure
    tempXid = calloc(1, sizeof(dpiXid));
    if (!tempXid)
        return njsUtils_throwInsufficientMemory(env);
    *xid = tempXid;

    // get formatId
    if (!njsUtils_getNamedPropertyInt(env, value, "formatId", &fmtId))
        return false;
    tempXid->formatId = (long) fmtId;

    // get globalTransactionId
    if (!njsUtils_getNamedPropertyStringOrBuffer(env, value,
            "globalTransactionId", (char**) &tempXid->globalTransactionId,
            &len))
        return false;
    tempXid->globalTransactionIdLength = (uint32_t) len;

    // get branchQualifier
    if (!njsUtils_getNamedPropertyStringOrBuffer(env, value, "branchQualifier",
            (char**) &tempXid->branchQualifier, &len))
        return false;
    tempXid->branchQualifierLength = len;

    return true;

}


//-----------------------------------------------------------------------------
// njsUtils_getDateValue()
//   Return the value of the timestamp as a JavaScript date. The _makeDate()
// function is called to use the local JS time zone for DATE and TIMESTAMP and
// an absolute JS date for TIMESTAMP WITH TIME ZONE and TIMESTAMP WITH LOCAL
// TIME ZONE.
//-----------------------------------------------------------------------------
bool njsUtils_getDateValue(uint32_t varTypeNum, napi_env env,
        napi_value makeDateFn, dpiTimestamp *timestamp, napi_value *value)
{
    napi_value global, args[9];
    int32_t tzOffset = 0;
    bool useLocal;

    useLocal = (varTypeNum == DPI_ORACLE_TYPE_DATE ||
            varTypeNum == DPI_ORACLE_TYPE_TIMESTAMP);
    NJS_CHECK_NAPI(env, napi_get_global(env, &global))
    NJS_CHECK_NAPI(env, napi_get_boolean(env, useLocal, &args[0]))
    NJS_CHECK_NAPI(env, napi_create_int32(env, timestamp->year, &args[1]))
    NJS_CHECK_NAPI(env, napi_create_uint32(env, timestamp->month, &args[2]))
    NJS_CHECK_NAPI(env, napi_create_uint32(env, timestamp->day, &args[3]))
    NJS_CHECK_NAPI(env, napi_create_uint32(env, timestamp->hour, &args[4]))
    NJS_CHECK_NAPI(env, napi_create_uint32(env, timestamp->minute, &args[5]))
    NJS_CHECK_NAPI(env, napi_create_uint32(env, timestamp->second, &args[6]))
    NJS_CHECK_NAPI(env, napi_create_uint32(env,
            timestamp->fsecond / (1000 * 1000), &args[7]))
    if (!useLocal) {
        tzOffset = timestamp->tzHourOffset * 60;
        if (tzOffset < 0) {
            tzOffset -= timestamp->tzMinuteOffset;
        } else {
            tzOffset += timestamp->tzMinuteOffset;
        }
    }
    NJS_CHECK_NAPI(env, napi_create_int32(env, tzOffset,
            &args[8]))
    NJS_CHECK_NAPI(env, napi_call_function(env, global, makeDateFn, 9, args,
            value))
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_setDateValue()
//   Set the value of the timestamp from a JavaScript date. The value sent to
// the database will depend on the Oracle data type. DATE and TIMESTAMP contain
// no time zone information so they are sent in the JavaScript time zone.
// TIMESTAMP WITH TIME ZONE and TIMESTAMP WITH LOCAL TIME ZONE contain time
// zone information so they are sent to the database in UTC (JavaScript's
// native format).
//-----------------------------------------------------------------------------
bool njsUtils_setDateValue(uint32_t varTypeNum, napi_env env, napi_value value,
        napi_value getComponentsFn, dpiTimestamp *timestamp)
{
    napi_value args[2], global, array, temp;
    uint32_t temp_unsigned;
    int32_t temp_signed;
    bool useLocalTime;

    // call the JS function to get the individual components as an Array
    useLocalTime = (varTypeNum == DPI_ORACLE_TYPE_DATE ||
            varTypeNum == DPI_ORACLE_TYPE_TIMESTAMP);
    NJS_CHECK_NAPI(env, napi_get_global(env, &global))
    NJS_CHECK_NAPI(env, napi_get_boolean(env, useLocalTime, &args[0]))
    args[1] = value;
    NJS_CHECK_NAPI(env, napi_call_function(env, global, getComponentsFn, 2,
            args, &array))

    // store year
    NJS_CHECK_NAPI(env, napi_get_element(env, array, 0, &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &temp_signed))
    timestamp->year = (uint16_t) temp_signed;

    // store month
    NJS_CHECK_NAPI(env, napi_get_element(env, array, 1, &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &temp_unsigned))
    timestamp->month = (uint8_t) temp_unsigned;

    // store day
    NJS_CHECK_NAPI(env, napi_get_element(env, array, 2, &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &temp_unsigned))
    timestamp->day = (uint8_t) temp_unsigned;

    // store hour
    NJS_CHECK_NAPI(env, napi_get_element(env, array, 3, &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &temp_unsigned))
    timestamp->hour = (uint8_t) temp_unsigned;

    // store minute
    NJS_CHECK_NAPI(env, napi_get_element(env, array, 4, &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &temp_unsigned))
    timestamp->minute = (uint8_t) temp_unsigned;

    // store second
    NJS_CHECK_NAPI(env, napi_get_element(env, array, 5, &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &temp_unsigned))
    timestamp->second = (uint8_t) temp_unsigned;

    // store fractional seconds
    NJS_CHECK_NAPI(env, napi_get_element(env, array, 6, &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &timestamp->fsecond))

    // always use UTC when time zones are used (JavaScript native format)
    timestamp->tzHourOffset = 0;
    timestamp->tzMinuteOffset = 0;

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_throwErrorDPI()
//   Get the error message from ODPI-C and throw an equivalent JavaScript
// error. False is returned as a convenience to the caller.
//-----------------------------------------------------------------------------
bool njsUtils_throwErrorDPI(napi_env env, njsModuleGlobals *globals)
{
    dpiErrorInfo errorInfo;
    napi_value error;

    dpiContext_getError(globals->context, &errorInfo);
    if (!njsUtils_getError(env, &errorInfo, NULL, &error))
        return false;
    napi_throw(env, error);
    return false;
}


//-----------------------------------------------------------------------------
// njsUtils_throwInsufficientMemory()
//   Throw an error indicating that insufficient memory could be allocated. The
// value false is returned as a convenience to the caller.
//-----------------------------------------------------------------------------
bool njsUtils_throwInsufficientMemory(napi_env env)
{
    napi_throw_error(env, NULL, NJS_ERR_INSUFFICIENT_MEMORY);
    return false;
}


//-----------------------------------------------------------------------------
// njsUtils_throwUnsupportedDataType()
//   Set the error on the baton to indicate that an unsupported data type was
// encountered during a fetch. Returns false as a convenience to the caller.
//-----------------------------------------------------------------------------
bool njsUtils_throwUnsupportedDataType(napi_env env, uint32_t oracleTypeNum,
        uint32_t columnNum)
{
    char errorMessage[100];

    (void) snprintf(errorMessage, sizeof(errorMessage),
            NJS_ERR_UNSUPPORTED_DATA_TYPE, oracleTypeNum, columnNum);
    napi_throw_error(env, NULL, errorMessage);
    return false;
}


//-----------------------------------------------------------------------------
// njsUtils_validateArgs()
//   Gets the instance associated with the object and gets the arguments as
// well. If the number of arguments is incorrect, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsUtils_validateArgs(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsModuleGlobals **globals,
        napi_value *callingObj, const njsClassDef *classDef, void **instance)
{
    napi_value localCallingObj;
    size_t actualArgs;

    // get callback information and validate the number of arguments
    actualArgs = numArgs;
    NJS_CHECK_NAPI(env, napi_get_cb_info(env, info, &actualArgs, args,
            &localCallingObj, (void**) globals))
    if (actualArgs != numArgs)
        return njsUtils_genericThrowError(env, __FILE__, __LINE__);

    // unwrap instance, if applicable
    if (callingObj)
        *callingObj = localCallingObj;
    if (instance) {
        if (classDef == &njsClassDefDbObject) {
            if (!njsDbObject_getInstance(*globals, env, localCallingObj,
                    (njsDbObject**) instance))
                return false;
        } else if (classDef) {
            *instance = calloc(1, classDef->structSize);
            if (!*instance)
                return njsUtils_throwInsufficientMemory(env);
            if (napi_wrap(env, localCallingObj, *instance,
                    classDef->finalizeFn, NULL, NULL) != napi_ok) {
                free(*instance);
                return njsUtils_genericThrowError(env, __FILE__, __LINE__);
            }
        } else {
            NJS_CHECK_NAPI(env, napi_unwrap(env, localCallingObj,
                    (void**) instance))
        }
    }
    return true;
}

//-----------------------------------------------------------------------------
// njsUtils_setIntervalYM()
//   Set the value of the interval year-to-month(YM) value from a JavaScript
// IntervalYM object. It includes the "year" and "month" properties. At this
// point it is assumed that the property values are intergers.
//-----------------------------------------------------------------------------
bool njsUtils_setIntervalYM(napi_env env, napi_value value,
        dpiIntervalYM *data)
{
    napi_value temp;

    // set years and months
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "years", &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &data->years))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "months", &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &data->months))
    return true;
}

//-----------------------------------------------------------------------------
// njsUtils_setIntervalDS()
//   Set the value of the interval day-to-second(DS) value from a JavaScript
// IntervalYM object. It includes the "days", "hours", "minutes", "seconds"
// and "fseconds" (fractional seconds denoted in ns) properties. At this
// point it is assumed that the property values are intergers.
//-----------------------------------------------------------------------------
bool njsUtils_setIntervalDS(napi_env env, napi_value value,
        dpiIntervalDS *data)
{
    napi_value temp;

    // set day and time units
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "days", &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &data->days))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "hours", &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &data->hours))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "minutes", &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &data->minutes))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "seconds", &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &data->seconds))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "fseconds",
            &temp))
    NJS_CHECK_NAPI(env, napi_get_value_int32(env, temp, &data->fseconds))
    return true;
}
