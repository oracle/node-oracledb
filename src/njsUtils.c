// Copyright (c) 2015, 2022, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// You may not use the identified files except in compliance with the Apache
// License, Version 2.0 (the "License.")
//
// You may obtain a copy of the License at
// http://www.apache.org/licenses/LICENSE-2.0.
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
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
                objType->jsDbObjectConstructor, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, obj, propertyName,
                temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_convertToBoolean()
//   Convert a C boolean value to a JavaScript boolean value.
//-----------------------------------------------------------------------------
napi_value njsUtils_convertToBoolean(napi_env env, bool value)
{
    napi_value jsValue;

    if (napi_get_boolean(env, value, &jsValue) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return jsValue;
}


//-----------------------------------------------------------------------------
// njsUtils_convertToInt()
//   Convert a C integer to a JavaScript number value.
//-----------------------------------------------------------------------------
napi_value njsUtils_convertToInt(napi_env env, int32_t value)
{
    napi_value jsValue;

    if (napi_create_int32(env, value, &jsValue) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return jsValue;
}


//-----------------------------------------------------------------------------
// njsUtils_convertToString()
//   Convert a C string value to a JavaScript string value.
//-----------------------------------------------------------------------------
napi_value njsUtils_convertToString(napi_env env, const char *value,
        uint32_t valueLength)
{
    napi_value jsValue;

    if (napi_create_string_utf8(env, value, valueLength,
            &jsValue) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return jsValue;
}


//-----------------------------------------------------------------------------
// njsUtils_convertToUnsignedInt()
//   Convert a C unsigned integer to a JavaScript number value.
//-----------------------------------------------------------------------------
napi_value njsUtils_convertToUnsignedInt(napi_env env, uint32_t value)
{
    napi_value jsValue;

    if (napi_create_uint32(env, value, &jsValue) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return jsValue;
}


//-----------------------------------------------------------------------------
// njsUtils_convertToUnsignedIntArray()
//   Convert an array of C unsigned integers to a JavaScript array value.
//-----------------------------------------------------------------------------
napi_value njsUtils_convertToUnsignedIntArray(napi_env env, uint32_t numValues,
        uint32_t *values)
{
    napi_value jsValue, temp;
    uint32_t i;

    if (napi_create_array_with_length(env, numValues, &jsValue) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    for (i = 0; i < numValues; i++) {
        if (napi_create_uint32(env, values[i], &temp) != napi_ok) {
            njsUtils_genericThrowError(env);
            return NULL;
        }
        if (napi_set_element(env, jsValue, i, temp) != napi_ok) {
            njsUtils_genericThrowError(env);
            return NULL;
        }
    }

    return jsValue;
}


//-----------------------------------------------------------------------------
// njsUtils_copyArray()
//   Copy an array with the specified number of elements to the destination,
// returning a boolean indicating if this was done successfully or not.
//-----------------------------------------------------------------------------
bool njsUtils_copyArray(napi_env env, void *sourceArray, uint32_t numElements,
        size_t elementSize, void **destArray, uint32_t *destNumElements)
{
    if (sourceArray) {
        *destArray = malloc(numElements * elementSize);
        if (!*destArray)
            return njsUtils_throwError(env, errInsufficientMemory);
        memcpy(*destArray, sourceArray, numElements * elementSize);
        *destNumElements = numElements;
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
            return njsUtils_throwError(env, errInsufficientMemory);
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
        return njsUtils_throwError(env, errInsufficientMemory);

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
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsBaton *tempBaton;
    napi_value callback;

    // if only one argument is being passed it is always expected to be the
    // callback; rather than force the caller to provide the memory for this
    // allow for it to be ignored
    if (numArgs == 1 && !args)
        args = &callback;

    // allocate and zero memory
    tempBaton = calloc(1, sizeof(njsBaton));
    if (!tempBaton) {
        njsUtils_throwError(env, errInsufficientMemory);
        return false;
    }

    // perform common checks and populate common attributes in the baton
    if (!njsBaton_create(tempBaton, env, info, numArgs, args)) {
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
        napi_ref constructorRef, napi_value *instanceObj,
        njsBaseInstance **instance)
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
    if (!data) {
        njsUtils_throwError(env, errInsufficientMemory);
        return false;
    }

    // wrap the structure for use by JavaScript
    if (napi_wrap(env, *instanceObj, data, classDef->finalizeFn, NULL,
            NULL) != napi_ok) {
        free(data);
        return njsUtils_genericThrowError(env);
    }

    // define properties on instance, if applicable
    if (classDef->propertiesOnInstance) {
        for (numProperties = 0; classDef->properties[numProperties].utf8name;
                numProperties++);
        NJS_CHECK_NAPI(env, napi_define_properties(env, *instanceObj,
                numProperties, classDef->properties))
    }

    *instance = (njsBaseInstance*) data;
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_genericThrowError()
//   This method is called when the last Node-API call was unsuccessful and
// throws an error if one is not already pending. Returns false as a convenience
// to the caller.
//-----------------------------------------------------------------------------
bool njsUtils_genericThrowError(napi_env env)
{
    const napi_extended_error_info *errorInfo;
    const char *errorMessage;
    bool isPending;

    napi_get_last_error_info(env, &errorInfo);
    napi_is_exception_pending(env, &isPending);
    if (!isPending) {
        errorMessage = errorInfo->error_message;
        if (!errorMessage)
            errorMessage = "no error message?";
        napi_throw_error(env, NULL, errorMessage);
    }
    return false;
}


//-----------------------------------------------------------------------------
// njsUtils_getBoolArg()
//   Gets a boolean from the specified parameter. If the value is not a
// boolean, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_getBoolArg(napi_env env, napi_value *args, int index,
        bool *result)
{
    if (!njsUtils_validateArgType(env, args, napi_boolean, index))
        return false;
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, args[index], result))

    return true;
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
// njsUtils_getIntArg()
//   Gets an integer from the specified parameter. If the value is not an
// integer, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_getIntArg(napi_env env, napi_value *args, int index,
        int32_t *result)
{
    double doubleValue;

    // validate the parameter has the correct type
    if (!njsUtils_validateArgType(env, args, napi_number, index))
        return false;

    // get the numeric value
    NJS_CHECK_NAPI(env, napi_get_value_double(env, args[index], &doubleValue))

    // if the value is not an integer, return an error
    *result = (int32_t) doubleValue;
    if ((double) *result != doubleValue)
        return njsUtils_throwError(env, errInvalidParameterValue, index + 1);

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getNull()
//   Convenience function which returns the Node-API null value.
//-----------------------------------------------------------------------------
napi_value njsUtils_getNull(napi_env env)
{
    napi_value result;

    if (napi_get_null(env, &result) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }

    return result;
}


//-----------------------------------------------------------------------------
// njsUtils_getOwnPropertyNames()
//   Returns an array of property names owned specifically by the given object.
//-----------------------------------------------------------------------------
bool njsUtils_getOwnPropertyNames(napi_env env, napi_value value,
        napi_value *names)
{
    napi_value global, globalObject, method;

    NJS_CHECK_NAPI(env, napi_get_global(env, &global))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, global, "Object",
            &globalObject))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, globalObject,
            "getOwnPropertyNames", &method))
    NJS_CHECK_NAPI(env, napi_call_function(env, globalObject, method, 1,
            &value, names))

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getStringArg()
//   Gets a string from the specified parameter. If the value is not a string,
// an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_getStringArg(napi_env env, napi_value *args, int index,
        char **result, size_t *resultLength)
{
    if (!njsUtils_validateArgType(env, args, napi_string, index))
        return false;
    return njsUtils_copyStringFromJS(env, args[index], result, resultLength);
}


//-----------------------------------------------------------------------------
// njsUtils_getStringFromArg()
//   Gets a string value from the specified JavaScript object property, if
// possible. If the given property is undefined, no error is set and the value
// is left untouched; otherwise, if the value is not a string, the error
// message is populated.
//-----------------------------------------------------------------------------
bool njsUtils_getStringFromArg(napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found, char *errorBuffer)
{
    char localError[NJS_MAX_ERROR_MSG_LEN + 1];
    napi_value value;

    // if no error buffer was provided, call the routine a second time with
    // the local error buffer; if an error was written, throw it
    if (!errorBuffer) {
        localError[0] = '\0';
        if (!njsUtils_getStringFromArg(env, args, argIndex, propertyName,
                result, resultLength, found, localError)) {
            if (localError[0] != '\0')
                napi_throw_error(env, NULL, localError);
            return false;
        }
        return true;
    }

    // get the value from the object and verify it is a string
    if (!njsUtils_getValueFromArg(env, args, argIndex, propertyName,
            napi_string, &value, found, errorBuffer))
        return false;
    if (!value)
        return true;

    return njsUtils_copyStringFromJS(env, value, result, resultLength);
}


//-----------------------------------------------------------------------------
// njsUtils_getUnsignedIntArg()
//   Gets an unsigned integer from the specified parameter. If the value is not
// an integer, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_getUnsignedIntArg(napi_env env, napi_value *args, int index,
        uint32_t *result)
{
    double doubleValue;

    // validate the parameter has the correct type
    if (!njsUtils_validateArgType(env, args, napi_number, index))
        return false;

    // get the numeric value
    NJS_CHECK_NAPI(env, napi_get_value_double(env, args[index], &doubleValue))

    // if the value is not an integer, return an error
    *result = (uint32_t) doubleValue;
    if (doubleValue < 0 || (double) *result != doubleValue)
        return njsUtils_throwError(env, errInvalidParameterValue, index + 1);

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_getValueFromArg()
//   Gets the value from the specified JavaScript object property, if possible.
// If the given property is undefined, no error is set and the value is
// returned as NULL. If the value is null, a "value" error is set; otherwise,
// if the value is not the specified type, a "type" error is set.
//-----------------------------------------------------------------------------
bool njsUtils_getValueFromArg(napi_env env, napi_value *args,
        int argIndex, const char *propertyName, napi_valuetype expectedType,
        napi_value *value, bool *found, char *errorBuffer)
{
    napi_valuetype actualType;

    // initialize found, if applicable
    if (found)
        *found = false;

    // acquire the value and get its type
    NJS_CHECK_NAPI(env, napi_get_named_property(env, args[argIndex],
            propertyName, value))
    NJS_CHECK_NAPI(env, napi_typeof(env, *value, &actualType))

    // a value of undefined is accepted (property not defined)
    if (actualType == napi_undefined) {
        *value = NULL;
        return true;

    // other types other than the expected type generate an error
    } else if (actualType != expectedType) {
        njsErrors_getMessage(errorBuffer, errInvalidPropertyValueInParam,
                propertyName, argIndex + 1);
        return false;
    }

    if (found)
        *found = true;
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_isBuffer()
//   Return true if the specified value refers to a buffer object.
//-----------------------------------------------------------------------------
bool njsUtils_isBuffer(napi_env env, napi_value value)
{
    napi_status status;
    bool isBuffer;

    status = napi_is_buffer(env, value, &isBuffer);
    if (status != napi_ok)
        return false;
    return isBuffer;
}


//-----------------------------------------------------------------------------
// njsUtils_setPropBool()
//   Sets a property to a boolean value. If the value is not a boolean, an
// error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_setPropBool(napi_env env, napi_value value, const char *name,
        bool *result)
{
    if (!njsUtils_validatePropType(env, value, napi_boolean, name))
        return false;
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, value, result))
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_setPropInt()
//   Sets a property to a signed integer value. If the value is not a signed
// integer, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_setPropInt(napi_env env, napi_value value, const char *name,
        int32_t *result)
{
    napi_valuetype valueType;
    double doubleValue;

    // verify the passed value is a number
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
    if (valueType != napi_number)
        return njsUtils_throwError(env, errInvalidPropertyValue, name);
    NJS_CHECK_NAPI(env, napi_get_value_double(env, value, &doubleValue))

    // if the value is not a signed integer, return an error
    *result = (int32_t) doubleValue;
    if ((double) *result != doubleValue)
        return njsUtils_throwError(env, errInvalidPropertyValue, name);

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_setPropString()
//   Sets a property to a string value. If the value is not a string, an
// error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_setPropString(napi_env env, napi_value value, const char *name,
        char **result, size_t *resultLength)
{
    if (!njsUtils_validatePropType(env, value, napi_string, name))
        return false;
    return njsUtils_copyStringFromJS(env, value, result, resultLength);
}


//-----------------------------------------------------------------------------
// njsUtils_setPropUnsignedInt()
//   Sets a property to an unsigned integer value. If the value is not an
// unsigned integer, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_setPropUnsignedInt(napi_env env, napi_value value,
        const char *name, uint32_t *result)
{
    napi_valuetype valueType;
    double doubleValue;

    // verify the value is a JavaScript number
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
    if (valueType != napi_number)
        return njsUtils_throwError(env, errInvalidPropertyValue, name);
    NJS_CHECK_NAPI(env, napi_get_value_double(env, value, &doubleValue))

    // if the value is not an unsigned integer, return an error
    *result = (uint32_t) doubleValue;
    if (doubleValue < 0 || (double) *result != doubleValue)
        return njsUtils_throwError(env, errInvalidPropertyValue, name);

    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_setPropUnsignedIntArray()
//   Sets a property to an unsigned integer array. If the value is not an
// array of unsigned integers, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsUtils_setPropUnsignedIntArray(napi_env env, napi_value value,
        const char *name, uint32_t *numResults, uint32_t **results,
        const uint32_t *validTypes)
{
    uint32_t i, j, numElements, *elements;
    napi_value element;
    bool isArray, ok;

    // verify value is an array
    NJS_CHECK_NAPI(env, napi_is_array(env, value, &isArray))
    if (!isArray)
        return njsUtils_throwError(env, errInvalidPropertyValue, name);

    // allocate memory for array, if applicable
    NJS_CHECK_NAPI(env, napi_get_array_length(env, value, &numElements))
    elements = calloc(numElements, sizeof(uint32_t));
    if (!elements && numElements > 0)
        return njsUtils_throwError(env, errInsufficientMemory);

    // validate values in the array
    for (i = 0; i < numElements; i++) {
        if (napi_get_element(env, value, i, &element) != napi_ok) {
            free(elements);
            return njsUtils_genericThrowError(env);
        }
        if (!njsUtils_setPropUnsignedInt(env, element, name, &elements[i])) {
            free(elements);
            return false;
        }
        ok = false;
        for (j = 0; validTypes[j] != 0; j++) {
            if (elements[i] == validTypes[j]) {
                ok = true;
                break;
            }
        }
        if (!ok) {
            free(elements);
            return njsUtils_throwError(env, errInvalidTypeForConversion);
        }
    }

    // free original array, if applicable and store results
    if (*results)
        free(*results);
    *numResults = numElements;
    *results = elements;
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_throwError()
//   Get the error message given the error number and any number of arguments.
// Throw the error as a JS error. If the error number is invalid, the error
// message is changed to indicate as much. False is returned as a convenience
// to the caller.
//-----------------------------------------------------------------------------
bool njsUtils_throwError(napi_env env, int errNum, ...)
{
    char errorMessage[NJS_MAX_ERROR_MSG_LEN + 1];
    va_list vaList;

    va_start(vaList, errNum);
    njsErrors_getMessageVaList(errorMessage, errNum, vaList);
    va_end(vaList);
    napi_throw_error(env, NULL, errorMessage);
    return false;
}


//-----------------------------------------------------------------------------
// njsUtils_throwErrorDPI()
//   Get the error message from ODPI-C and throw an equivalent JavaScript
// error. False is returned as a convenience to the caller.
//-----------------------------------------------------------------------------
bool njsUtils_throwErrorDPI(napi_env env, njsOracleDb *oracleDb)
{
    dpiErrorInfo errorInfo;
    napi_value error;

    dpiContext_getError(oracleDb->context, &errorInfo);
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
        size_t numArgs, napi_value *args, napi_value *callingObj,
        njsBaseInstance **instance)
{
    napi_value thisArg;
    size_t actualArgs;

    // get callback information and validate the number of arguments
    actualArgs = numArgs;
    NJS_CHECK_NAPI(env, napi_get_cb_info(env, info, &actualArgs, args,
            &thisArg, NULL))
    if (actualArgs != numArgs)
        return njsUtils_throwError(env, errInvalidNumberOfParameters,
                                   actualArgs, numArgs);

    // unwrap instance
    NJS_CHECK_NAPI(env, napi_unwrap(env, thisArg, (void**) instance))
    if (callingObj)
        *callingObj = thisArg;
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_validateGetter()
//   Gets the instance associated with the object.
//-----------------------------------------------------------------------------
bool njsUtils_validateGetter(napi_env env, napi_callback_info info,
        njsBaseInstance **instance)
{
    return njsUtils_validateArgs(env, info, 0, NULL, NULL, instance);
}


//-----------------------------------------------------------------------------
// njsUtils_validateSetter()
//   Gets the instance associated with the object and the value that has been
// set.
//-----------------------------------------------------------------------------
bool njsUtils_validateSetter(napi_env env, napi_callback_info info,
        njsBaseInstance **instance, napi_value *value)
{
    return njsUtils_validateArgs(env, info, 1, value, NULL, instance);
}


//-----------------------------------------------------------------------------
// njsUtils_validateArgType()
//   Gets the value from the specified JavaScript object property, if possible.
// If the given property is undefined, no error is set and the value is
// returned as NULL. If the value is null, a "value" error is thrown;
// otherwise, if the value is not the specified type, a "type" error is thrown.
//-----------------------------------------------------------------------------
bool njsUtils_validateArgType(napi_env env, napi_value *args,
        napi_valuetype expectedType, int index)
{
    napi_valuetype actualType;

    NJS_CHECK_NAPI(env, napi_typeof(env, args[index], &actualType))
    if (actualType != expectedType)
        return njsUtils_throwError(env, errInvalidParameterValue, index + 1);
    return true;
}


//-----------------------------------------------------------------------------
// njsUtils_validatePropType()
//   Verifies that the value is the correct type, and if not throws an
// exception and returns false.
//-----------------------------------------------------------------------------
bool njsUtils_validatePropType(napi_env env, napi_value value,
        napi_valuetype expectedType, const char *name)
{
    napi_valuetype actualType;

    NJS_CHECK_NAPI(env, napi_typeof(env, value, &actualType))
    if (actualType != expectedType)
        return njsUtils_throwError(env, errInvalidPropertyValue, name);
    return true;
}
