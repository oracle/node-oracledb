// Copyright (c) 2015, 2023, Oracle and/or its affiliates.

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
// njsBaton_commonConnectProcessArgs()
//   Process all of the arguments common to creating connections (either
// standalone connections or a pool of connections).
//-----------------------------------------------------------------------------
bool njsBaton_commonConnectProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    if (!njsUtils_getNamedPropertyString(env, args[0], "user", &baton->user,
            &baton->userLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[0], "password",
            &baton->password, &baton->passwordLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[0], "connectString",
            &baton->connectString, &baton->connectStringLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[0], "connectionClass",
            &baton->connectionClass, &baton->connectionClassLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[0], "edition",
            &baton->edition, &baton->editionLength))
        return false;
    if (!njsUtils_getNamedPropertyUnsignedInt(env, args[0], "stmtCacheSize",
            &baton->stmtCacheSize))
        return false;
    if (!njsUtils_getNamedPropertyBool(env, args[0], "externalAuth",
            &baton->externalAuth))
        return false;
    if (!njsUtils_getNamedPropertyBool(env, args[0], "events",
            &baton->events))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[0], "token",
            &baton->token, &baton->tokenLength))
        return false;
    if (!njsUtils_getNamedPropertyString(env, args[0], "privateKey",
            &baton->privateKey, &baton->privateKeyLength))
        return false;

    return true;
}


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
        njsUtils_genericThrowError(env, __FILE__, __LINE__);
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
        size_t numArgs, napi_value *args, const njsClassDef *classDef)
{
    napi_value callingObj;

    // validate the number of args required for the asynchronous function
    // and get the calling instance
    if (!njsUtils_validateArgs(env, info, numArgs, args, &baton->globals,
            &callingObj, classDef, &baton->callingInstance))
        return false;

    // save a reference to the calling object so that it will not be garbage
    // collected during the asynchronous call
    NJS_CHECK_NAPI(env, napi_create_reference(env, callingObj, 1,
            &baton->jsCallingObjRef))

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
    if (baton->sodaCollNames) {
        dpiContext_freeStringList(baton->globals->context,
                baton->sodaCollNames);
        NJS_FREE_AND_CLEAR(baton->sodaCollNames);
    }
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

    // remove references to JS objects
    NJS_DELETE_REF_AND_CLEAR(baton->jsBufferRef);
    NJS_DELETE_REF_AND_CLEAR(baton->jsCallingObjRef);
    NJS_DELETE_REF_AND_CLEAR(baton->jsSubscriptionRef);
    NJS_DELETE_REF_AND_CLEAR(baton->jsExecuteOptionsRef);
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
// njsBaton_getJsonNodeValue()
//   Return an appropriate JavaScript value for the JSON node.
//-----------------------------------------------------------------------------
bool njsBaton_getJsonNodeValue(njsBaton *baton, dpiJsonNode *node,
        napi_env env, napi_value *value)
{
    napi_value key, temp;
    dpiJsonArray *array;
    dpiJsonObject *obj;
    uint32_t i;

    // null is a special case
    if (node->nativeTypeNum == DPI_NATIVE_TYPE_NULL) {
        NJS_CHECK_NAPI(env, napi_get_null(env, value))
        return true;
    }

    // handle the other types supported in JSON nodes
    switch (node->oracleTypeNum) {
        case DPI_ORACLE_TYPE_JSON_ARRAY:
            array = &node->value->asJsonArray;
            NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                    array->numElements, value))
            for (i = 0; i < array->numElements; i++) {
                if (!njsBaton_getJsonNodeValue(baton, &array->elements[i],
                        env, &temp))
                    return false;
                NJS_CHECK_NAPI(env, napi_set_element(env, *value, i, temp))
            }
            return true;
        case DPI_ORACLE_TYPE_JSON_OBJECT:
            obj = &node->value->asJsonObject;
            NJS_CHECK_NAPI(env, napi_create_object(env, value))
            for (i = 0; i< obj->numFields; i++) {
                NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                        obj->fieldNames[i], obj->fieldNameLengths[i], &key))
                if (!njsBaton_getJsonNodeValue(baton, &obj->fields[i],
                        env, &temp))
                    return false;
                NJS_CHECK_NAPI(env, napi_set_property(env, *value, key, temp))
            }
            return true;
        case DPI_ORACLE_TYPE_VARCHAR:
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env,
                    node->value->asBytes.ptr, node->value->asBytes.length,
                    value))
            return true;
        case DPI_ORACLE_TYPE_RAW:
            NJS_CHECK_NAPI(env, napi_create_buffer_copy(env,
                    node->value->asBytes.length, node->value->asBytes.ptr,
                    NULL, value))
            return true;
        case DPI_ORACLE_TYPE_NUMBER:
            NJS_CHECK_NAPI(env, napi_create_double(env, node->value->asDouble,
                    value))
            return true;
        case DPI_ORACLE_TYPE_DATE:
        case DPI_ORACLE_TYPE_TIMESTAMP:
            return njsUtils_getDateValue(node->oracleTypeNum, env,
                baton->jsMakeDateFn, &node->value->asTimestamp, value);
            return true;
        case DPI_ORACLE_TYPE_BOOLEAN:
            NJS_CHECK_NAPI(env, napi_get_boolean(env, node->value->asBoolean,
                    value))
            return true;
        default:
            break;
    }

    return njsBaton_setErrorUnsupportedDataTypeInJson(baton,
            node->oracleTypeNum);
}


//-----------------------------------------------------------------------------
// njsBaton_getNumOutBinds()
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
            baton->globals->jsSodaDocumentConstructor, &constructor))

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
// njsBaton_initCommonCreateParams()
//    Initialize common creation parameters for pools and standalone
// connection creation.
//-----------------------------------------------------------------------------
bool njsBaton_initCommonCreateParams(njsBaton *baton,
        dpiCommonCreateParams *params)
{
    if (dpiContext_initCommonCreateParams(baton->globals->context, params) < 0)
        return njsBaton_setErrorDPI(baton);
    params->createMode = DPI_MODE_CREATE_THREADED;
    if (baton->events)
        params->createMode = (dpiCreateMode)
                (params->createMode | DPI_MODE_CREATE_EVENTS);

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
    NJS_CHECK_NAPI(env, napi_is_date(env, value, &check))
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
    status = napi_instanceof(env, value, baton->jsDbObjectConstructor,
            &check);
    if (status != napi_ok)
        return false;
    if (check)
        return true;

    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_queueWork()
//   Queue work on a separate thread. The baton is passed as context. If this
// method fails for some reason, the baton is destroyed and is no longer
// usable.
//-----------------------------------------------------------------------------
bool njsBaton_queueWork(njsBaton *baton, napi_env env,
        const char *methodName, bool (*workCallback)(njsBaton*),
        bool (*afterWorkCallback)(njsBaton*, napi_env, napi_value*),
        napi_value *promise)
{
    napi_value asyncResourceName;

    // save the methods that will be used to perform the asynchronous work
    baton->workCallback = workCallback;
    baton->afterWorkCallback = afterWorkCallback;

    // set up asynchronous work handle and return promise to JavaScript
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, methodName,
            NAPI_AUTO_LENGTH, &asyncResourceName))
    NJS_CHECK_NAPI(env, napi_create_async_work(env, NULL, asyncResourceName,
            njsBaton_executeAsync, njsBaton_completeAsync, baton,
            &baton->asyncWork))
    NJS_CHECK_NAPI(env, napi_create_promise(env, &baton->deferred, promise))
    NJS_CHECK_NAPI(env, napi_queue_async_work(env, baton->asyncWork))

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
// usable. The value false is returned as a convenience.
//-----------------------------------------------------------------------------
bool njsBaton_reportError(njsBaton *baton, napi_env env)
{
    napi_value error;
    bool ok;

    ok = njsBaton_getErrorInfo(baton, env, &error);
    if (ok) {
        if (baton->deferred) {
            if (napi_reject_deferred(env, baton->deferred, error) != napi_ok)
                njsUtils_genericThrowError(env, __FILE__, __LINE__);
        } else {
            napi_throw(env, error);
        }
    }
    njsBaton_free(baton, env);
    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_setErrorInsufficientBufferForBinds()
//   Sets the error on the baton to indicate that insufficient buffer space
// was made available for an OUT bind. Returns false as a convenience to the
// caller.
//-----------------------------------------------------------------------------
bool njsBaton_setErrorInsufficientBufferForBinds(njsBaton *baton)
{
    strcpy(baton->error, NJS_ERR_INSUFFICIENT_BUFFER_FOR_BINDS);
    baton->hasError = true;
    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_setErrorInsufficientMemory()
//   Set the error on the baton to indicate insufficient memory was available.
// Returns false as a convenience to the caller.
//-----------------------------------------------------------------------------
bool njsBaton_setErrorInsufficientMemory(njsBaton *baton)
{
    strcpy(baton->error, NJS_ERR_INSUFFICIENT_MEMORY);
    baton->hasError = true;
    return false;
}


//-----------------------------------------------------------------------------
// njsBaton_setErrorUnsupportedDataTypeInJson()
//   Set the error on the baton to indicate that an unsupported data type was
// encountered in a JSON value. Returns false as a convenience to the caller.
//-----------------------------------------------------------------------------
bool njsBaton_setErrorUnsupportedDataTypeInJson(njsBaton *baton,
        uint32_t oracleTypeNum)
{
    (void) snprintf(baton->error, sizeof(baton->error),
            NJS_ERR_UNSUPPORTED_DATA_TYPE_IN_JSON, oracleTypeNum);
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
    dpiContext_getError(baton->globals->context, &baton->errorInfo);
    baton->dpiError = true;
    baton->hasError = true;
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
    // acquire the LOB constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->globals->jsLobConstructor, &baton->jsLobConstructor))

    // acquire the result set constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->globals->jsResultSetConstructor,
            &baton->jsResultSetConstructor))

    // acquire the base database object constructor
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->globals->jsDbObjectConstructor,
            &baton->jsDbObjectConstructor))

    // acquire the value for the calling object reference
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &baton->jsCallingObj))

    // acquire the _getDateComponents() function
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->globals->jsGetDateComponentsFn,
            &baton->jsGetDateComponentsFn))

    // acquire the _makeDate() function
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            baton->globals->jsMakeDateFn, &baton->jsMakeDateFn))

    return true;
}
