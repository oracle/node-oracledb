// Copyright (c) 2015, 2019, Oracle and/or its affiliates. All rights reserved.

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
        napi_value *callback, napi_value *callingObj);


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
    napi_value callback, callingObj, *callbackArgs;
    njsBaton *baton = (njsBaton*) data;
    size_t numCallbackArgs;
    napi_status status;

    // call helper to perform actual work; report error if any occurs
    if (!njsBaton_completeAsyncHelper(baton, env, &callback, &callingObj)) {
        njsBaton_reportError(baton, env);
        return;
    }

    // destroy baton as it is no longer needed, but save a copy of the callback
    // arguments so they be used
    numCallbackArgs = baton->numCallbackArgs;
    callbackArgs = baton->callbackArgs;
    baton->callbackArgs = NULL;
    njsBaton_free(baton, env);

    // invoke callback
    status = napi_call_function(env, callingObj, callback, numCallbackArgs,
            callbackArgs, NULL);
    free(callbackArgs);
    if (status != napi_ok)
        njsUtils_genericThrowError(env);
}


//-----------------------------------------------------------------------------
// njsBaton_completeAsyncHelper()
//   Helper for njsBaton_completeAsync() which performs all of the work except
// for invoking the callback.
//-----------------------------------------------------------------------------
static bool njsBaton_completeAsyncHelper(njsBaton *baton, napi_env env,
        napi_value *callback, napi_value *callingObj)
{
    size_t i;

    // if an error already occurred during the asynchronous processing, nothing
    // to do
    if (baton->hasError)
        return false;

    // allocate memory for the arguments
    baton->callbackArgs = calloc(baton->numCallbackArgs, sizeof(napi_value));
    if (!baton->callbackArgs)
        return njsBaton_setError(baton, errInsufficientMemory);

    // the first parameter should always be null (the error message)
    // all other values should be undefined unless otherwise specified
    NJS_CHECK_NAPI(env, napi_get_null(env, &baton->callbackArgs[0]))
    for (i = 1; i < baton->numCallbackArgs; i++) {
        NJS_CHECK_NAPI(env, napi_get_undefined(env, &baton->callbackArgs[i]))
    }

    // call the completion callback and if an error occurred, nothing further
    // to do
    if (baton->afterWorkCallback) {
        if (!baton->afterWorkCallback(baton, env, baton->callbackArgs))
            return false;
    }

    // acquire callback from reference stored on the baton
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallback,
            callback))

    // acquire calling object from reference stored on the baton
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObj,
            callingObj))

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
    napi_valuetype argType;
    napi_value callingObj;

    // validate the number of args required for the asynchronous function
    // and get the calling instance
    if (!njsUtils_validateArgs(env, info, numArgs, args, &callingObj,
            &baton->callingInstance))
        return false;

    // verify that the final argument is a function
    argType = napi_undefined;
    if (numArgs > 0) {
        NJS_CHECK_NAPI(env, napi_typeof(env, args[numArgs - 1], &argType))
    }
    if (argType != napi_function)
        return njsUtils_throwError(env, errMissingCallback);

    // save a reference to the calling object so that it will not be garbage
    // collected during the asynchronous call
    NJS_CHECK_NAPI(env, napi_create_reference(env, callingObj, 1,
            &baton->jsCallingObj))

    // save a reference to the callback
    NJS_CHECK_NAPI(env, napi_create_reference(env, args[numArgs - 1], 1,
            &baton->jsCallback))

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
// only the baton. The N-API environment should not be used in these routines.
// Blocking calls can be made in these routines.
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
    NJS_FREE_AND_CLEAR(baton->plsqlFixupCallback);
    NJS_FREE_AND_CLEAR(baton->tag);
    NJS_FREE_AND_CLEAR(baton->sodaMetaData);
    NJS_FREE_AND_CLEAR(baton->startsWith);
    NJS_FREE_AND_CLEAR(baton->indexSpec);
    NJS_FREE_AND_CLEAR(baton->key);
    NJS_FREE_AND_CLEAR(baton->filter);
    NJS_FREE_AND_CLEAR(baton->version);

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
    if (!baton->jsBuffer) {
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
    NJS_DELETE_REF_AND_CLEAR(baton->jsBuffer);
    NJS_DELETE_REF_AND_CLEAR(baton->jsCallingObj);
    NJS_DELETE_REF_AND_CLEAR(baton->jsCallback);
    NJS_DELETE_REF_AND_CLEAR(baton->jsSubscription);
    if (baton->asyncWork) {
        napi_delete_async_work(env, baton->asyncWork);
        baton->asyncWork = NULL;
    }
    NJS_FREE_AND_CLEAR(baton->callbackArgs);

    free(baton);
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
bool njsBaton_getErrorInfo(njsBaton *baton, napi_env env, napi_value *error,
        napi_value *callingObj, napi_value *callback)
{
    napi_value tempString, tempError;
    dpiErrorInfo *errorInfo;
    size_t tempLength;
    bool isPending;

    // check to see if an exception is pending; if so, catch the exception and
    // pass it through to the callback
    NJS_CHECK_NAPI(env, napi_is_exception_pending(env, &isPending))
    if (isPending) {
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

    // acquire callback from reference stored on the baton
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallback,
            callback))

    // acquire calling object from reference stored on the baton
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObj,
            callingObj))

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
    NJS_CHECK_NAPI(env, napi_get_property_names(env, value, &keys))

    // allocate space for the fetchInfo based on the number of keys
    NJS_CHECK_NAPI(env, napi_get_array_length(env, keys, &numElements))
    tempFetchInfo = calloc(numElements, sizeof(njsFetchInfo));
    if (!tempFetchInfo)
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
                contentLength, NULL, 0, DPI_SODA_FLAGS_DEFAULT, handle) < 0)
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

    // get length of array
    NJS_CHECK_NAPI(env, napi_get_array_length(env, array, &arrayLength))

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
        if (!njsUtils_copyStringFromJS(env, element, &tempStrings[i],
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
            &baton->jsSubscription))

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
            valueType != napi_object)
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
    if (njsBaton_isDate(baton, env, value))
        return true;

    // LOBs can be bound directly
    status = napi_instanceof(env, value, baton->jsLobConstructor, &check);
    if (status != napi_ok)
        return false;
    if (check)
        return true;

    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_isDate()
//   Returns a boolean indicating if the value refers to a date or not.
//-----------------------------------------------------------------------------
bool njsBaton_isDate(njsBaton *baton, napi_env env, napi_value value)
{
    napi_status status;
    bool check;

    status = napi_instanceof(env, value, baton->jsDateConstructor, &check);
    if (status != napi_ok)
        return false;
    return check;
}


//-----------------------------------------------------------------------------
// njsBaton_queueWork()
//   Queue work on a separate thread. The baton is passed as context. If this
// method fails for some reason, the baton is destroyed and is no longer
// usable.
//-----------------------------------------------------------------------------
bool njsBaton_queueWork(njsBaton *baton, napi_env env, const char *methodName,
        bool (*workCallback)(njsBaton*),
        bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*),
        unsigned int numCallbackArgs)
{
    napi_value asyncResourceName;

    // save the methods that will be used to perform the asynchronous work
    baton->workCallback = workCallback;
    baton->afterWorkCallback = afterWorkCallback;
    baton->numCallbackArgs = numCallbackArgs;

    // create the async resource name
    if (napi_create_string_utf8(env, methodName, NAPI_AUTO_LENGTH,
            &asyncResourceName) != napi_ok) {
        njsUtils_genericThrowError(env);
        njsBaton_free(baton, env);
        return false;
    }

    // create the asynchronous work handle
    if (napi_create_async_work(env, NULL, asyncResourceName,
            njsBaton_executeAsync, njsBaton_completeAsync, baton,
            &baton->asyncWork) != napi_ok) {
        njsUtils_genericThrowError(env);
        njsBaton_free(baton, env);
        return false;
    }

    // queue the asynchronous work
    if (napi_queue_async_work(env, baton->asyncWork) != napi_ok) {
        njsUtils_genericThrowError(env);
        njsBaton_free(baton, env);
        return false;
    }

    return true;
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
    napi_value error, callback, callingObj;
    bool ok;

    ok = njsBaton_getErrorInfo(baton, env, &error, &callingObj, &callback);
    njsBaton_free(baton, env);
    if (ok) {
        if (napi_call_function(env, callingObj, callback, 1, &error,
                NULL) != napi_ok)
            njsUtils_genericThrowError(env);
    }
}


//-----------------------------------------------------------------------------
// njsBaton_setConstructors()
//   Sets the constructors on the baton.
//-----------------------------------------------------------------------------
bool njsBaton_setConstructors(njsBaton *baton, napi_env env)
{
    napi_value global;

    // acquire the Date constructor
    NJS_CHECK_NAPI(env, napi_get_global(env, &global))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, global, "Date",
            &baton->jsDateConstructor))

    // acquire the LOB constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->oracleDb->jsLobConstructor, &baton->jsLobConstructor))

    return true;
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
