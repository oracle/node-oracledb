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
//   njsBaton.c
//
// DESCRIPTION
//   Implementation of baton used by asynchronous JS methods to store data.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// methods used internally
static bool njsBaton_completeAsyncHelper(njsBaton *baton, napi_env env,
        napi_value *resolution);
static void njsBaton_freeShardingKeys(uint8_t *numShardingKeyColumns,
        dpiShardingKeyColumn **shardingKeyColumns);


//-----------------------------------------------------------------------------
// njsBaton_completeAsync()
//   Callback used during asynchronous processing that takes place on the main
// thread after the work on the separate thread has been completed. Blocking
// calls should be avoided. The baton is destroyed after the assigned routine
// is called.
//-----------------------------------------------------------------------------
static void njsBaton_completeAsync(napi_env env, napi_status ignoreStatus,
        void *data)
{
    njsBaton *baton = (njsBaton*) data;
    napi_status status;
    napi_value result;

    // call helper to perform actual work; report error if any occurs
    if (!njsBaton_completeAsyncHelper(baton, env, &result)) {
        njsBaton_reportError(baton, env);
        return;
    }

    // resolve promise
    status = napi_resolve_deferred(env, baton->deferred, result);
    if (status != napi_ok)
        njsUtils_genericThrowError(env);
    njsBaton_free(baton, env);
}


//-----------------------------------------------------------------------------
// njsBaton_completeAsyncHelper()
//   Helper for njsBaton_completeAsync() which performs all of the work except
// for invoking the callback.
//-----------------------------------------------------------------------------
static bool njsBaton_completeAsyncHelper(njsBaton *baton, napi_env env,
        napi_value *result)
{
    // if an error already occurred during the asynchronous processing, nothing
    // to do
    if (baton->hasError)
        return false;

    // if an after work callback has been specified, call it to determine what
    // the result should be; the default value is undefined
    NJS_CHECK_NAPI(env, napi_get_undefined(env, result))
    if (baton->afterWorkCallback) {
        if (!baton->afterWorkCallback(baton, env, result))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_create()
//   Populates the baton with common information and performs common checks.
// This method should only be called by njsUtils_createBaton().
//-----------------------------------------------------------------------------
bool njsBaton_create(njsBaton *baton, napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args)
{
    napi_value callingObj;

    // validate the number of args required for the asynchronous function
    // and get the calling instance
    if (!njsUtils_validateArgs(env, info, numArgs, args, &callingObj,
            &baton->callingInstance))
        return false;

    // save a reference to the calling object so that it will not be garbage
    // collected during the asynchronous call
    NJS_CHECK_NAPI(env, napi_create_reference(env, callingObj, 1,
            &baton->jsCallingObjRef))

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_createDate()
//   Creates a JavaScript date object given its double representation.
//-----------------------------------------------------------------------------
bool njsBaton_createDate(njsBaton *baton, napi_env env, double value,
        napi_value *dateObj)
{
    napi_value temp;

    NJS_CHECK_NAPI(env, napi_create_double(env, value, &temp))
    NJS_CHECK_NAPI(env, napi_new_instance(env, baton->jsDateConstructor, 1,
            &temp, dateObj))
    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_executeAsync()
//   Callback used during asynchronous processing that takes place on a
// separate thread. This simply calls the assigned routine directly, passing
// only the baton. The Node-API environment should not be used in these
// routines. Blocking calls can be made in these routines.
//-----------------------------------------------------------------------------
static void njsBaton_executeAsync(napi_env env, void *data)
{
    njsBaton *baton = (njsBaton*) data;
    if (!baton->workCallback(baton))
        baton->hasError = true;
}


//-----------------------------------------------------------------------------
// njsBaton_free()
//   Frees the memory allocated for the baton.
//-----------------------------------------------------------------------------
void njsBaton_free(njsBaton *baton, napi_env env)
{
    uint32_t i;

    // if this baton is considered the active baton, clear it
    if (baton->callingInstance && baton == baton->callingInstance->activeBaton)
        baton->callingInstance->activeBaton = NULL;

    // free and clear strings
    NJS_FREE_AND_CLEAR(baton->sql);
    NJS_FREE_AND_CLEAR(baton->user);
    NJS_FREE_AND_CLEAR(baton->password);
    NJS_FREE_AND_CLEAR(baton->newPassword);
    NJS_FREE_AND_CLEAR(baton->connectString);
    NJS_FREE_AND_CLEAR(baton->connectionClass);
    NJS_FREE_AND_CLEAR(baton->edition);
    NJS_FREE_AND_CLEAR(baton->ipAddress);
    NJS_FREE_AND_CLEAR(baton->name);
    NJS_FREE_AND_CLEAR(baton->typeName);
    NJS_FREE_AND_CLEAR(baton->plsqlFixupCallback);
    NJS_FREE_AND_CLEAR(baton->tag);
    NJS_FREE_AND_CLEAR(baton->sodaMetaData);
    NJS_FREE_AND_CLEAR(baton->startsWith);
    NJS_FREE_AND_CLEAR(baton->indexSpec);
    NJS_FREE_AND_CLEAR(baton->key);
    NJS_FREE_AND_CLEAR(baton->filter);
    NJS_FREE_AND_CLEAR(baton->version);
    NJS_FREE_AND_CLEAR(baton->hint);
    NJS_FREE_AND_CLEAR(baton->pfile);
    NJS_FREE_AND_CLEAR(baton->token);
    NJS_FREE_AND_CLEAR(baton->privateKey);

    if (baton->xid) {
        NJS_FREE_AND_CLEAR(baton->xid->globalTransactionId);
        NJS_FREE_AND_CLEAR(baton->xid->branchQualifier);
        NJS_FREE_AND_CLEAR(baton->xid);
    }

    // free and clear various buffers
    NJS_FREE_AND_CLEAR(baton->bindNames);
    NJS_FREE_AND_CLEAR(baton->bindNameLengths);
    NJS_FREE_AND_CLEAR(baton->sodaOperOptions);
    if (baton->lob) {
        if (baton->lob->handle) {
            dpiLob_release(baton->lob->handle);
            baton->lob->handle = NULL;
        }
        free(baton->lob);
        baton->lob = NULL;
    }
    NJS_FREE_AND_CLEAR(baton->sodaCollNames);
    if (!baton->jsBufferRef) {
        NJS_FREE_AND_CLEAR(baton->bufferPtr);
    }

    // release references to ODPI-C handles
    if (baton->dpiConnHandle) {
        dpiConn_release(baton->dpiConnHandle);
        baton->dpiConnHandle = NULL;
    }
    if (baton->dpiLobHandle) {
        dpiLob_release(baton->dpiLobHandle);
        baton->dpiLobHandle = NULL;
    }
    if (baton->dpiMsgPropsHandle) {
        dpiMsgProps_release(baton->dpiMsgPropsHandle);
        baton->dpiMsgPropsHandle = NULL;
    }
    if (baton->dpiPoolHandle) {
        dpiPool_release(baton->dpiPoolHandle);
        baton->dpiPoolHandle = NULL;
    }
    if (baton->dpiStmtHandle) {
        dpiStmt_release(baton->dpiStmtHandle);
        baton->dpiStmtHandle = NULL;
    }
    if (baton->dpiObjectTypeHandle) {
        dpiObjectType_release(baton->dpiObjectTypeHandle);
        baton->dpiObjectTypeHandle = NULL;
    }
    if (baton->dpiQueueHandle) {
        dpiQueue_release(baton->dpiQueueHandle);
        baton->dpiQueueHandle = NULL;
    }
    if (baton->dpiSodaCollHandle) {
        dpiSodaColl_release(baton->dpiSodaCollHandle);
        baton->dpiSodaCollHandle = NULL;
    }
    if (baton->dpiSodaDocHandle) {
        dpiSodaDoc_release(baton->dpiSodaDocHandle);
        baton->dpiSodaDocHandle = NULL;
    }
    if (baton->dpiSodaDocCursorHandle) {
        dpiSodaDocCursor_release(baton->dpiSodaDocCursorHandle);
        baton->dpiSodaDocCursorHandle = NULL;
    }
    if (baton->sodaDocs) {
        for (i = 0; i < baton->numSodaDocs; i++) {
            if (baton->sodaDocs[i]) {
                dpiSodaDoc_release(baton->sodaDocs[i]);
                baton->sodaDocs[i] = NULL;
            }
        }
        free(baton->sodaDocs);
        baton->sodaDocs = NULL;
    }
    if (baton->msgProps) {
        for (i = 0; i < baton->numMsgProps; i++) {
            if (baton->msgProps[i]) {
                dpiMsgProps_release(baton->msgProps[i]);
                baton->msgProps[i] = NULL;
            }
        }
        free(baton->msgProps);
        baton->msgProps = NULL;
    }

    // free SODA operation keys, if applicable
    if (baton->keys) {
        for (i = 0; i < baton->numKeys; i++) {
            NJS_FREE_AND_CLEAR(baton->keys[i]);
        }
        free(baton->keys);
        baton->keys = NULL;
    }
    NJS_FREE_AND_CLEAR(baton->keysLengths);

    // free variables
    if (baton->queryVars) {
        for (i = 0; i < baton->numQueryVars; i++)
            njsVariable_free(&baton->queryVars[i]);
        free(baton->queryVars);
        baton->queryVars = NULL;
    }
    if (baton->bindVars) {
        for (i = 0; i < baton->numBindVars; i++)
            njsVariable_free(&baton->bindVars[i]);
        free(baton->bindVars);
        baton->bindVars = NULL;
    }

    // free batch errors
    NJS_FREE_AND_CLEAR(baton->batchErrorInfos);

    // free implicit results
    while (baton->implicitResults) {
        if (baton->implicitResults->stmt) {
            dpiStmt_release(baton->implicitResults->stmt);
            baton->implicitResults->stmt = NULL;
        }
        if (baton->implicitResults->queryVars) {
            for (i = 0; i < baton->implicitResults->numQueryVars; i++)
                njsVariable_free(&baton->implicitResults->queryVars[i]);
            free(baton->implicitResults->queryVars);
            baton->implicitResults->queryVars = NULL;
        }
        free(baton->implicitResults);
        baton->implicitResults = baton->implicitResults->next;
    }

    // free mapping type arrays
    if (baton->fetchInfo) {
        for (i = 0; i < baton->numFetchInfo; i++) {
            NJS_FREE_AND_CLEAR(baton->fetchInfo[i].name);
        }
        free(baton->fetchInfo);
        baton->fetchInfo = NULL;
    }

    NJS_FREE_AND_CLEAR(baton->fetchAsStringTypes);
    NJS_FREE_AND_CLEAR(baton->fetchAsBufferTypes);

    // remove references to JS objects
    NJS_DELETE_REF_AND_CLEAR(baton->jsBufferRef);
    NJS_DELETE_REF_AND_CLEAR(baton->jsCallingObjRef);
    NJS_DELETE_REF_AND_CLEAR(baton->jsSubscriptionRef);
    if (baton->asyncWork) {
        napi_delete_async_work(env, baton->asyncWork);
        baton->asyncWork = NULL;
    }

    // free sharding and super sharding keys
    njsBaton_freeShardingKeys(&baton->numShardingKeyColumns,
            &baton->shardingKeyColumns);
    njsBaton_freeShardingKeys(&baton->numSuperShardingKeyColumns,
            &baton->superShardingKeyColumns);

    free(baton);
}


//-----------------------------------------------------------------------------
// njsBaton_freeShardingKeys()
//   To clean up array of ShardingKeys
//-----------------------------------------------------------------------------
void njsBaton_freeShardingKeys(uint8_t *numShardingKeyColumns,
        dpiShardingKeyColumn **shardingKeyColumns)
{
    dpiShardingKeyColumn *shards = *shardingKeyColumns;
    uint32_t i;

    for (i = 0; i < *numShardingKeyColumns; i++) {
        if (shards[i].oracleTypeNum == DPI_ORACLE_TYPE_VARCHAR &&
                shards[i].value.asBytes.ptr) {
            free(shards[i].value.asBytes.ptr);
            shards[i].value.asBytes.ptr = NULL;
        }
    }
    free(shards);
    *numShardingKeyColumns = 0;
    *shardingKeyColumns = NULL;
}


//-----------------------------------------------------------------------------
// njsBaton_getBoolFromArg()
//   Gets a boolean value from the specified JavaScript object property, if
// possible. If the given property is undefined, no error is set and the value
// is left untouched; otherwise, if the value is not a boolean, the error is
// set on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getBoolFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, bool *result, bool *found)
{
    napi_value value;

    if (!njsBaton_getValueFromArg(baton, env, args, argIndex, propertyName,
            napi_boolean, &value, found))
        return false;
    if (!value)
        return true;
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, value, result))

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getErrorInfo()
//   Get information on the error in preparation for invoking the callback. If
// false is returned, the callback should not be invoked; instead an exception
// will be passed on to JavaScript.
//-----------------------------------------------------------------------------
static bool njsBaton_getErrorInfo(njsBaton *baton, napi_env env,
        napi_value *error)
{
    napi_value tempString, tempError;
    dpiErrorInfo *errorInfo;
    size_t tempLength;
    bool isPending;

    // check to see if an exception is pending; if so, catch the exception and
    // pass it through to the callback
    NJS_CHECK_NAPI(env, napi_is_exception_pending(env, &isPending))
    if (isPending) {
        if (!baton->deferred)
            return false;
        baton->dpiError = false;
        NJS_CHECK_NAPI(env, napi_get_and_clear_last_exception(env, &tempError))
        NJS_CHECK_NAPI(env, napi_coerce_to_string(env, tempError, &tempString))
        NJS_CHECK_NAPI(env, napi_get_value_string_utf8(env, tempString,
                baton->error, NJS_MAX_ERROR_MSG_LEN + 1, &tempLength))
    }

    // create the error object
    errorInfo = (baton->dpiError) ? &baton->errorInfo : NULL;
    if (!njsUtils_getError(env, errorInfo, baton->error, error))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getFetchInfoFromArg()
//   Gets fetchInfo data from the specified Javascript object property, if
// possible. If the given property is undefined, no error is set and the value
// is left untouched; otherwise, if the value is not valid, an error is set on
// the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getFetchInfoFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *numFetchInfo, njsFetchInfo **fetchInfo, bool *found)
{
    napi_value value, keys, key, element, tempArgs[3];
    njsFetchInfo *tempFetchInfo;
    uint32_t i, numElements;
    bool tempFound;

    // get the value from the object and verify it is an object
    if (!njsBaton_getValueFromArg(baton, env, args, argIndex, propertyName,
            napi_object, &value, found))
        return false;
    if (!value)
        return true;

    // extract the property names from the object
    if (!njsUtils_getOwnPropertyNames(env, value, &keys))
        return false;

    // allocate space for the fetchInfo based on the number of keys
    NJS_CHECK_NAPI(env, napi_get_array_length(env, keys, &numElements))
    tempFetchInfo = calloc(numElements, sizeof(njsFetchInfo));
    if (!tempFetchInfo && numElements > 0)
        return njsBaton_setError(baton, errInsufficientMemory);
    *numFetchInfo = numElements;
    *fetchInfo = tempFetchInfo;

    // process each key
    for (i = 0; i < numElements; i++) {

        // get element associated with the key
        NJS_CHECK_NAPI(env, napi_get_element(env, keys, i, &key))
        NJS_CHECK_NAPI(env, napi_get_property(env, value, key, &element))

        // save name
        if (!njsUtils_copyStringFromJS(env, key, &tempFetchInfo[i].name,
                &tempFetchInfo[i].nameLength))
            return false;

        // get type
        tempArgs[2] = element;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, tempArgs, 2,
                "type", &tempFetchInfo[i].type, &tempFound))
            return false;
        if (!tempFound)
            return njsBaton_setError(baton, errNoTypeForConversion);
        if (tempFetchInfo[i].type != NJS_DATATYPE_DEFAULT &&
                    tempFetchInfo[i].type != NJS_DATATYPE_STR &&
                    tempFetchInfo[i].type != NJS_DATATYPE_BUFFER)
            return njsBaton_setError(baton, errInvalidTypeForConversion);

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getIntFromArg()
//   Gets an integer value from the specified JavaScript object property, if
// possible. If the given property is undefined, no error is set and the value
// is left untouched; otherwise, if the value is not a number, the error is set
// on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getIntFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, int32_t *result, bool *found)
{
    double doubleValue;
    napi_value value;

    // get the value from the object and verify it is a number
    if (!njsBaton_getValueFromArg(baton, env, args, argIndex, propertyName,
            napi_number, &value, found))
        return false;
    if (!value)
        return true;
    NJS_CHECK_NAPI(env, napi_get_value_double(env, value, &doubleValue))

    // if the value is not an integer or negative, return an error
    *result = (int32_t) doubleValue;
    if ((double) *result != doubleValue)
        return njsBaton_setError(baton, errInvalidPropertyValueInParam,
                propertyName, argIndex + 1);

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton::GetNumOutBinds()
//   Return the number of IN/OUT and OUT binds created by the baton.
//-----------------------------------------------------------------------------
uint32_t njsBaton_getNumOutBinds(njsBaton *baton)
{
    uint32_t i, numOutBinds = 0;

    for (i = 0; i < baton->numBindVars; i++) {
        if (baton->bindVars[i].bindDir != NJS_BIND_IN)
            numOutBinds++;
    }
    return numOutBinds;
}


//-----------------------------------------------------------------------------
// njsBaton_getShardingKeyColumnsFromArg()
//   Gets an array of sharding key columns from the specified JavaScript object
// property, if possible. If the given property is undefined, no error is set
// and the value is left untouched; otherwise, if the value is not an array,
// the error is set on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getShardingKeyColumnsFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint8_t *numShardingKeyColumns,
        dpiShardingKeyColumn **shardingKeyColumns)
{
    napi_value asNumber, value, element;
    dpiShardingKeyColumn *shards;
    napi_valuetype valueType;
    uint32_t arrLen, i;
    size_t numBytes;
    bool check;

    // validate parameter
    if (!njsBaton_getValueFromArg(baton, env, args, argIndex, propertyName,
            napi_object, &value, NULL))
        return false;
    if (!value)
        return true;
    NJS_CHECK_NAPI(env, napi_is_array(env, value, &check))
    if (!check)
        return njsBaton_setError(baton, errNonArrayProvided);

    // allocate space for sharding key columns; if array is empty, nothing
    // further to do!
    NJS_CHECK_NAPI(env, napi_get_array_length(env, value, &arrLen))
    if (arrLen == 0)
        return true;
    shards = calloc(arrLen, sizeof(dpiShardingKeyColumn));
    if (!shards)
        return njsBaton_setError(baton, errInsufficientMemory);
    *shardingKeyColumns = shards;
    *numShardingKeyColumns = (uint8_t)arrLen;

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
            if (!njsBaton_isDate(baton, env, element, &check))
                return false;
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

        // no support for other types
        return njsBaton_setError(baton, errInvalidPropertyValueInParam,
                propertyName, argIndex + 1);
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getSodaDocument()
//   Examines the passed object. If it is a SODA document object, a reference
// to it is retained; otherwise, a buffer is assumed to be passed and a new
// SODA document is created and retained.
//-----------------------------------------------------------------------------
bool njsBaton_getSodaDocument(njsBaton *baton, njsSodaDatabase *db,
        napi_env env, napi_value obj, dpiSodaDoc **handle)
{
    napi_value constructor;
    njsSodaDocument *doc;
    size_t contentLength;
    bool isSodaDocument;
    void *content;

    // get the SODA document constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->oracleDb->jsSodaDocumentConstructor, &constructor))

    // see if the object is a SODA document
    NJS_CHECK_NAPI(env, napi_instanceof(env, obj, constructor,
            &isSodaDocument))

    // if the value is a SODA document, retain it
    if (isSodaDocument) {
        NJS_CHECK_NAPI(env, napi_unwrap(env, obj, (void**) &doc))
        if (dpiSodaDoc_addRef(doc->handle) < 0)
            return njsBaton_setErrorDPI(baton);
        *handle = doc->handle;

    // otherwise, create a new SODA document from the value (which is assumed
    // to be a buffer)
    } else {
        NJS_CHECK_NAPI(env, napi_get_buffer_info(env, obj, &content,
                &contentLength))
        if (dpiSodaDb_createDocument(db->handle, NULL, 0, content,
                (uint32_t) contentLength, NULL, 0, DPI_SODA_FLAGS_DEFAULT,
                handle) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getStringFromArg()
//   Gets a string value from the specified JavaScript object property, if
// possible. If the given property is undefined, no error is set and the value
// is left untouched; otherwise, if the value is not a string, the error is set
// on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getStringFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, char **result,
        size_t *resultLength, bool *found)
{
    if (!njsUtils_getStringFromArg(env, args, argIndex, propertyName, result,
            resultLength, found, baton->error)) {
        baton->hasError = true;
        return false;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getStringArrayFromArg()
//   Gets a string value from the specified JavaScript object property, if
// possible. If the given property is undefined, no error is set and the value
// is left untouched; otherwise, if the value is not a string, the error is set
// on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getStringArrayFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *resultNumElems, char ***resultElems,
        uint32_t **resultElemLengths, bool *found)
{
    uint32_t arrayLength, i, *tempLengths;
    napi_value array, element;
    char **tempStrings;
    size_t tempLength;

    // get array from the object
    if (!njsBaton_getValueFromArg(baton, env, args, argIndex, propertyName,
            napi_object, &array, found))
        return false;
    if (!array)
        return true;

    // get length of array; if there are no elements in the array, nothing
    // further needs to be done
    NJS_CHECK_NAPI(env, napi_get_array_length(env, array, &arrayLength))
    if (arrayLength == 0)
        return true;

    // allocate memory for the results
    tempStrings = calloc(arrayLength, sizeof(char*));
    if (!tempStrings)
        return njsBaton_setError(baton, errInsufficientMemory);
    *resultElems = tempStrings;
    tempLengths = calloc(arrayLength, sizeof(uint32_t));
    if (!tempLengths)
        return njsBaton_setError(baton, errInsufficientMemory);
    *resultElemLengths = tempLengths;

    // populate the results
    *resultNumElems = arrayLength;
    for (i = 0; i < arrayLength; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, array, i, &element))
        if (!njsUtils_getStringArg(env, &element, 0, &tempStrings[i],
                &tempLength))
            return false;
        tempLengths[i] = (uint32_t) tempLength;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getSubscription()
//   Acquires the subscription stored with the given name. If it does not
// exist, it will either be created or an error will be noted on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getSubscription(njsBaton *baton, napi_env env, napi_value name,
        bool unsubscribe)
{
    napi_value allSubscriptions, subscription;
    napi_valuetype valueType;

    // get subscription object, if it exists
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->oracleDb->jsSubscriptions, &allSubscriptions))
    NJS_CHECK_NAPI(env, napi_get_property(env, allSubscriptions, name,
            &subscription))
    NJS_CHECK_NAPI(env, napi_typeof(env, subscription, &valueType))

    // if it exists, get subscription data
    if (valueType == napi_external) {
        NJS_CHECK_NAPI(env, napi_get_value_external(env, subscription,
                (void**) &baton->subscription))

    // set an error if the subscription does not exist and it should not be
    // created
    } else if (unsubscribe) {
        return njsBaton_setError(baton, errInvalidSubscription);

    // otherwise, create a new subscription and store it in the all
    // subscriptions object
    } else {
        if (!njsSubscription_new(baton, env, &subscription,
                &baton->subscription))
            return false;
        NJS_CHECK_NAPI(env, napi_set_property(env, allSubscriptions, name,
                subscription))
    }

    // if unsubscribing, remove subscription from all subscriptions and nothing
    // further needs to be done
    if (unsubscribe) {
        NJS_CHECK_NAPI(env, napi_delete_property(env, allSubscriptions, name,
                NULL))
        return true;
    }

    // otherwise, store a reference to the subscription object on the baton
    // to ensure that it does not go out of scope
    NJS_CHECK_NAPI(env, napi_create_reference(env, subscription, 1,
            &baton->jsSubscriptionRef))

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getUnsignedIntFromArg()
//   Gets an unsigned integer value from the specified JavaScript object
// property, if possible. If the given property is undefined, no error is set
// and the value is left untouched; otherwise, if the value is not a number,
// the error is set on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getUnsignedIntFromArg(njsBaton *baton, napi_env env,
        napi_value *args, int argIndex, const char *propertyName,
        uint32_t *result, bool *found)
{
    double doubleValue;
    napi_value value;

    // get the value from the object and verify it is a number
    if (!njsBaton_getValueFromArg(baton, env, args, argIndex, propertyName,
            napi_number, &value, found))
        return false;
    if (!value)
        return true;
    NJS_CHECK_NAPI(env, napi_get_value_double(env, value, &doubleValue))

    // if the value is not an integer or negative, return an error
    *result = (uint32_t) doubleValue;
    if (doubleValue < 0 || (double) *result != doubleValue)
        return njsBaton_setError(baton, errInvalidPropertyValueInParam,
                propertyName, argIndex + 1);

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getValueFromArg()
//   Gets the value from the specified JavaScript object property, if possible.
// If the given property is undefined, no error is set and the value is
// returned as NULL. If the value is null, a "value" error is set on the baton;
// otherwise, if the value is not the specified type, a "type" error is
// set on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_getValueFromArg(njsBaton *baton, napi_env env, napi_value *args,
        int argIndex, const char *propertyName, napi_valuetype expectedType,
        napi_value *value, bool *found)
{
    if (!njsUtils_getValueFromArg(env, args, argIndex, propertyName,
            expectedType, value, found, baton->error)) {
        baton->hasError = true;
        return false;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getStrBufFromArg()
//   To obtain a string or Buffer value from the given object based on the
//   propertyName if exists.  If the given property is undefined, no error is
//   set and the value is left untouched; otherwise, if the value is not
//   string/buffer the erroris set on the baton
//-----------------------------------------------------------------------------
bool njsBaton_getStrBufFromArg(njsBaton *baton, napi_env env, napi_value *args,
         int argIndex, const char *propertyName, char **result,
         size_t *resultLength, bool *found)
{
    napi_valuetype actualType;
    napi_value     value;
    void           *buf;
    size_t          bufLen;

    // initialize found, if applicable
    if (found)
        *found = false;

    // acquire the value and get its type
    NJS_CHECK_NAPI(env, napi_get_named_property(env, args[argIndex],
            propertyName, &value))
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &actualType))

    // a value of undefined is accepted (property not defined)
    if (actualType == napi_undefined) {
        return true;
    } else if (actualType != napi_string && !njsUtils_isBuffer(env, value)) {
        njsBaton_setError(baton, errInvalidPropertyValueInParam, propertyName,
                argIndex + 1);
        return false;
    }

    if (actualType == napi_string) {
        if (!njsUtils_copyStringFromJS(env, value, result, resultLength))
            return false;
    } else {
        NJS_CHECK_NAPI(env, napi_get_buffer_info(env, value, &buf, &bufLen))
        if (!njsUtils_copyString(env, buf, bufLen, result, resultLength))
            return false;
    }

    if (found)
       *found = true;

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_getXid()
//   Populates XID structure of baton from the given argument
//-----------------------------------------------------------------------------
bool njsBaton_getXid(njsBaton *baton, napi_env env, napi_value arg)
{
    napi_valuetype vtype;
    int32_t        fmtId;
    size_t         len;

    NJS_CHECK_NAPI(env, napi_typeof(env, arg, &vtype))
    if (vtype != napi_undefined && vtype != napi_null) {
        baton->xid = calloc(1, sizeof(dpiXid));
        if (!baton->xid) {
            return njsBaton_setError(baton, errInsufficientMemory);
        }
        if (!njsBaton_getIntFromArg(baton, env, &arg, 0, "formatId", &fmtId,
                NULL))
            return false;
        baton->xid->formatId = (long) fmtId;

        if (!njsBaton_getStrBufFromArg(baton, env, &arg, 0,
                "globalTransactionId",
                (char **)&baton->xid->globalTransactionId, &len, NULL))
            return false;
        baton->xid->globalTransactionIdLength = (uint32_t)len;

        if (!njsBaton_getStrBufFromArg(baton, env, &arg, 0, "branchQualifier",
                (char **)&baton->xid->branchQualifier, &len, NULL))
            return false;
        baton->xid->branchQualifierLength = len;
    }
    return true;
}

//-----------------------------------------------------------------------------
// njsBaton_isBindValue()
//   Returns a boolean indicating if the value is one that can be bound.
//-----------------------------------------------------------------------------
bool njsBaton_isBindValue(njsBaton *baton, napi_env env, napi_value value)
{
    napi_valuetype valueType;
    napi_status status;
    bool check;

    // anything that isn't an object can be checked directly
    status = napi_typeof(env, value, &valueType);
    if (status != napi_ok)
        return false;
    if (valueType != napi_undefined && valueType != napi_null &&
            valueType != napi_number && valueType != napi_string &&
            valueType != napi_object && valueType != napi_boolean)
        return false;
    if (valueType != napi_object)
        return true;

    // arrays can be bound directly
    status = napi_is_array(env, value, &check);
    if (status != napi_ok)
        return false;
    if (check)
        return true;

    // buffers can be bound directly
    status = napi_is_buffer(env, value, &check);
    if (status != napi_ok)
        return false;
    if (check)
        return true;

    // dates can be bound directly
    if (!njsBaton_isDate(baton, env, value, &check))
        return false;
    if (check)
        return true;

    // LOBs can be bound directly
    status = napi_instanceof(env, value, baton->jsLobConstructor, &check);
    if (status != napi_ok)
        return false;
    if (check)
        return true;

    // result sets can be bound directly
    status = napi_instanceof(env, value, baton->jsResultSetConstructor,
            &check);
    if (status != napi_ok)
        return false;
    if (check)
        return true;

    // database objects can be bound directly
    status = napi_instanceof(env, value, baton->jsBaseDbObjectConstructor,
            &check);
    if (status != napi_ok)
        return false;
    if (check)
        return true;

    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_isDate()
//   Returns a boolean indicating if the value refers to a date or not. This
// can be replaced by napi_is_date() once it is available in all LTS releases.
//-----------------------------------------------------------------------------
bool njsBaton_isDate(njsBaton *baton, napi_env env, napi_value value,
        bool *isDate)
{
    napi_value isDateObj;

    if (!baton->jsIsDateObj) {
        NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                baton->jsCallingObjRef, &baton->jsIsDateObj))
        NJS_CHECK_NAPI(env, napi_get_named_property(env, baton->jsIsDateObj,
                "_isDate", &baton->jsIsDateMethod))
    }
    NJS_CHECK_NAPI(env, napi_call_function(env, baton->jsIsDateObj,
            baton->jsIsDateMethod, 1, &value, &isDateObj))
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, isDateObj, isDate))
    return true;
}


//-----------------------------------------------------------------------------
// njsBaton_queueWork()
//   Queue work on a separate thread. The baton is passed as context. If this
// method fails for some reason, the baton is destroyed and is no longer
// usable.
//-----------------------------------------------------------------------------
napi_value njsBaton_queueWork(njsBaton *baton, napi_env env,
        const char *methodName, bool (*workCallback)(njsBaton*),
        bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*))
{
    napi_value asyncResourceName, promise;

    // save the methods that will be used to perform the asynchronous work
    baton->workCallback = workCallback;
    baton->afterWorkCallback = afterWorkCallback;

    // create the async resource name
    if (napi_create_string_utf8(env, methodName, NAPI_AUTO_LENGTH,
            &asyncResourceName) != napi_ok) {
        njsUtils_genericThrowError(env);
        njsBaton_free(baton, env);
        return NULL;
    }

    // create the asynchronous work handle
    if (napi_create_async_work(env, NULL, asyncResourceName,
            njsBaton_executeAsync, njsBaton_completeAsync, baton,
            &baton->asyncWork) != napi_ok) {
        njsUtils_genericThrowError(env);
        njsBaton_free(baton, env);
        return NULL;
    }

    // create a promise which will be returned to JavaScript
    if (napi_create_promise(env, &baton->deferred, &promise) != napi_ok) {
        njsUtils_genericThrowError(env);
        njsBaton_free(baton, env);
        return NULL;
    }

    // queue the asynchronous work
    if (napi_queue_async_work(env, baton->asyncWork) != napi_ok) {
        napi_reject_deferred(env, baton->deferred, NULL);
        njsUtils_genericThrowError(env);
        njsBaton_free(baton, env);
        return NULL;
    }

    return promise;
}


//-----------------------------------------------------------------------------
// njsBaton_reportError()
//   Reports the error on the baton. When this is called it is expected that
// an error has taken place and is already set on the baton. This method will
// create an error object and, if it is an ODPI-C error, also acquire the
// error number and offset and store those as properties on the error object.
// After that the callback stored on the baton will be invoked with the error
// object as the only parameter and the baton will be freed and no longer
// usable.
//-----------------------------------------------------------------------------
void njsBaton_reportError(njsBaton *baton, napi_env env)
{
    napi_value error;
    bool ok;

    ok = njsBaton_getErrorInfo(baton, env, &error);
    if (ok) {
        if (baton->deferred) {
            if (napi_reject_deferred(env, baton->deferred, error) != napi_ok)
                njsUtils_genericThrowError(env);
        } else {
            napi_throw(env, error);
        }
    }
    njsBaton_free(baton, env);
}


//-----------------------------------------------------------------------------
// njsBaton_setError()
//   Set the error on the baton to the given error message. False is returned
// as a convenience to the caller.
//-----------------------------------------------------------------------------
bool njsBaton_setError(njsBaton *baton, int errNum, ...)
{
    va_list vaList;

    va_start(vaList, errNum);
    njsErrors_getMessageVaList(baton->error, errNum, vaList);
    va_end(vaList);
    baton->hasError = true;
    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_setErrorDPI()
//   Set the error on the baton from ODPI-C. False is returned as a convenience
// to the caller.
//-----------------------------------------------------------------------------
bool njsBaton_setErrorDPI(njsBaton *baton)
{
    dpiContext_getError(baton->oracleDb->context, &baton->errorInfo);
    if (baton->errorInfo.code == 1406) {
        njsBaton_setError(baton, errInsufficientBufferForBinds);
    } else {
        baton->dpiError = true;
        baton->hasError = true;
    }
    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_setJsValues()
//   Sets the JavaScript values on the baton. These are a number of
// constructors and also the JavaScript object that is "this" for the method
// that is currently being executed.
//-----------------------------------------------------------------------------
bool njsBaton_setJsValues(njsBaton *baton, napi_env env)
{
    napi_value global;

    // acquire the Date constructor
    NJS_CHECK_NAPI(env, napi_get_global(env, &global))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, global, "Date",
            &baton->jsDateConstructor))

    // acquire the LOB constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->oracleDb->jsLobConstructor, &baton->jsLobConstructor))

    // acquire the result set constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->oracleDb->jsResultSetConstructor,
            &baton->jsResultSetConstructor))

    // acquire the base database object constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->oracleDb->jsBaseDbObjectConstructor,
            &baton->jsBaseDbObjectConstructor))

    // acquire the value for the calling object reference
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &baton->jsCallingObj))

    return true;
}
