// Copyright (c) 2015, 2022, Oracle and/or its affiliates.

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
    size_t typeNameLength = NAPI_AUTO_LENGTH;
    char propertyName[100];
    const char *typeName;
    napi_value temp;

    switch (oracleTypeNum) {
        case DPI_ORACLE_TYPE_VARCHAR:
            typeName = "VARCHAR2";
            break;
        case DPI_ORACLE_TYPE_NVARCHAR:
            typeName = "NVARCHAR2";
            break;
        case DPI_ORACLE_TYPE_CHAR:
            typeName = "CHAR";
            break;
        case DPI_ORACLE_TYPE_NCHAR:
            typeName = "NCHAR";
            break;
        case DPI_ORACLE_TYPE_ROWID:
            typeName = "ROWID";
            break;
        case DPI_ORACLE_TYPE_RAW:
            typeName = "RAW";
            break;
        case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            typeName = "BINARY_FLOAT";
            break;
        case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            typeName = "BINARY_DOUBLE";
            break;
        case DPI_ORACLE_TYPE_NATIVE_INT:
            typeName = "BINARY_INTEGER";
            break;
        case DPI_ORACLE_TYPE_NUMBER:
            typeName = "NUMBER";
            break;
        case DPI_ORACLE_TYPE_DATE:
            typeName = "DATE";
            break;
        case DPI_ORACLE_TYPE_TIMESTAMP:
            typeName = "TIMESTAMP";
            break;
        case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
            typeName = "TIMESTAMP WITH TIME ZONE";
            break;
        case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
            typeName = "TIMESTAMP WITH LOCAL TIME ZONE";
            break;
        case DPI_ORACLE_TYPE_CLOB:
            typeName = "CLOB";
            break;
        case DPI_ORACLE_TYPE_NCLOB:
            typeName = "NCLOB";
            break;
        case DPI_ORACLE_TYPE_BLOB:
            typeName = "BLOB";
            break;
        case DPI_ORACLE_TYPE_LONG_VARCHAR:
            typeName = "LONG";
            break;
        case DPI_ORACLE_TYPE_LONG_RAW:
            typeName = "LONG RAW";
            break;
        case DPI_ORACLE_TYPE_OBJECT:
            typeName = objType->fqn;
            typeNameLength = objType->fqnLength;
            break;
        case DPI_ORACLE_TYPE_INTERVAL_DS:
            typeName = "INTERVAL DAY TO SECOND";
            break;
        case DPI_ORACLE_TYPE_INTERVAL_YM:
            typeName = "INTERVAL YEAR TO MONTH";
            break;
        case DPI_ORACLE_TYPE_BFILE:
            typeName = "BFILE";
            break;
        case DPI_ORACLE_TYPE_BOOLEAN:
            typeName = "BOOLEAN";
            break;
        case DPI_ORACLE_TYPE_STMT:
            typeName = "CURSOR";
            break;
        case DPI_ORACLE_TYPE_JSON:
            typeName = "JSON";
            break;
        default:
            typeName = "UNKNOWN";
            break;
    }

    // set the type (integer constant)
    NJS_CHECK_NAPI(env, napi_create_uint32(env, oracleTypeNum, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, propertyNamePrefix,
            temp))

    // set the type name
    (void) snprintf(propertyName, sizeof(propertyName), "%sName",
            propertyNamePrefix);
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, typeName, typeNameLength,
            &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, propertyName, temp))

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
                "internal error in file %s, line %d (%s)", fileName, lineNum,
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
        NJS_CHECK_NAPI(env, napi_get_element(env, value, i, &element))
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
// njsUtils_getNamedPropertyUnsignedIntArray()
//   Returns the value of the named property, which is assumed to be an array
// of unsigned integers. If the value is not found, the array is left
// unchanged.
//-----------------------------------------------------------------------------
bool njsUtils_getNamedPropertyUnsignedIntArray(napi_env env, napi_value value,
        const char *name, uint32_t *numElements, uint32_t **elements)
{
    napi_value array, element;
    uint32_t i;

    // get value of the named property, if not found, nothing to do
    if (!njsUtils_getNamedProperty(env, value, name, &array))
        return false;
    if (!array)
        return true;

    // free memory, if applicable
    if (*elements) {
        free(*elements);
        *elements = NULL;
        *numElements = 0;
    }

    // get the elements from the array
    NJS_CHECK_NAPI(env, napi_get_array_length(env, array, numElements))
    *elements = calloc(*numElements, sizeof(uint32_t));
    if (!elements && *numElements > 0)
        return njsUtils_throwInsufficientMemory(env);
    for (i = 0; i < *numElements; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, array, i, &element))
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, element,
                &((*elements)[i])))
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
