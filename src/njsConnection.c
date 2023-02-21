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
//   njsConnection.c
//
// DESCRIPTION
//   Connection class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_breakExecution);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_changePassword);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_close);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_commit);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_connect);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_createLob);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_execute);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getCallTimeout);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getCurrentSchema);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_getDbObjectClass);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getExternalName);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getInternalName);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getOracleServerVersion);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getOracleServerVersionString);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_getQueue);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getSodaDatabase);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_getStatementInfo);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getStmtCacheSize);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_getTag);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_isHealthy);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_ping);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_rollback);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setAction);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setCallTimeout);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setClientId);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setClientInfo);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setCurrentSchema);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setDbOp);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setECID);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setExternalName);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setInternalName);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setModule);
NJS_NAPI_METHOD_DECL_SYNC(njsConnection_setTag);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_shutdown);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_startup);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_subscribe);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_tpcBegin);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_tpcCommit);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_tpcEnd);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_tpcForget);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_tpcPrepare);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_tpcRollback);
NJS_NAPI_METHOD_DECL_ASYNC(njsConnection_unsubscribe);

// asynchronous methods
static NJS_ASYNC_METHOD(njsConnection_breakExecutionAsync);
static NJS_ASYNC_METHOD(njsConnection_changePasswordAsync);
static NJS_ASYNC_METHOD(njsConnection_closeAsync);
static NJS_ASYNC_METHOD(njsConnection_commitAsync);
static NJS_ASYNC_METHOD(njsConnection_connectAsync);
static NJS_ASYNC_METHOD(njsConnection_createLobAsync);
static NJS_ASYNC_METHOD(njsConnection_executeAsync);
static NJS_ASYNC_METHOD(njsConnection_executeManyAsync);
static NJS_ASYNC_METHOD(njsConnection_getDbObjectClassAsync);
static NJS_ASYNC_METHOD(njsConnection_getQueueAsync);
static NJS_ASYNC_METHOD(njsConnection_getStatementInfoAsync);
static NJS_ASYNC_METHOD(njsConnection_pingAsync);
static NJS_ASYNC_METHOD(njsConnection_rollbackAsync);
static NJS_ASYNC_METHOD(njsConnection_shutdownAsync);
static NJS_ASYNC_METHOD(njsConnection_startupAsync);
static NJS_ASYNC_METHOD(njsConnection_subscribeAsync);
static NJS_ASYNC_METHOD(njsConnection_tpcBeginAsync);
static NJS_ASYNC_METHOD(njsConnection_tpcCommitAsync);
static NJS_ASYNC_METHOD(njsConnection_tpcEndAsync);
static NJS_ASYNC_METHOD(njsConnection_tpcForgetAsync);
static NJS_ASYNC_METHOD(njsConnection_tpcPrepareAsync);
static NJS_ASYNC_METHOD(njsConnection_tpcRollbackAsync);
static NJS_ASYNC_METHOD(njsConnection_unsubscribeAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsConnection_connectPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_createLobPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_executePostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_executeManyPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_getDbObjectClassPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_getQueuePostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_getStatementInfoPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_tpcPreparePostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_subscribePostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsConnection_getQueueProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_subscribeProcessArgs);

// finalize
static NJS_NAPI_FINALIZE(njsConnection_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "breakExecution", NULL, njsConnection_breakExecution, NULL, NULL, NULL,
            napi_default, NULL },
    { "changePassword", NULL, njsConnection_changePassword, NULL, NULL,
            NULL, napi_default, NULL },
    { "close", NULL, njsConnection_close, NULL, NULL, NULL,
            napi_default, NULL },
    { "commit", NULL, njsConnection_commit, NULL, NULL, NULL,
            napi_default, NULL },
    { "connect", NULL, njsConnection_connect, NULL, NULL, NULL, napi_default,
            NULL },
    { "createLob", NULL, njsConnection_createLob, NULL, NULL, NULL,
            napi_default, NULL },
    { "execute", NULL, njsConnection_execute, NULL, NULL, NULL,
            napi_default, NULL },
    { "getCallTimeout", NULL, njsConnection_getCallTimeout, NULL, NULL, NULL,
            napi_default, NULL },
    { "getCurrentSchema", NULL, njsConnection_getCurrentSchema, NULL, NULL,
            NULL, napi_default, NULL },
    { "getDbObjectClass", NULL, njsConnection_getDbObjectClass, NULL, NULL,
            NULL, napi_default, NULL },
    { "getExternalName", NULL, njsConnection_getExternalName, NULL, NULL, NULL,
            napi_default, NULL },
    { "getInternalName", NULL, njsConnection_getInternalName, NULL, NULL, NULL,
            napi_default, NULL },
    { "getOracleServerVersion", NULL, njsConnection_getOracleServerVersion,
            NULL, NULL, NULL, napi_default, NULL },
    { "getOracleServerVersionString", NULL,
            njsConnection_getOracleServerVersionString, NULL, NULL, NULL,
            napi_default, NULL },
    { "getQueue", NULL, njsConnection_getQueue, NULL, NULL, NULL,
            napi_default, NULL },
    { "getSodaDatabase", NULL, njsConnection_getSodaDatabase, NULL, NULL,
            NULL, napi_default, NULL },
    { "getStatementInfo", NULL, njsConnection_getStatementInfo, NULL,
            NULL, NULL, napi_default, NULL },
    { "getStmtCacheSize", NULL, njsConnection_getStmtCacheSize, NULL, NULL,
            NULL, napi_default, NULL },
    { "getTag", NULL, njsConnection_getTag, NULL, NULL, NULL, napi_default,
            NULL },
    { "isHealthy", NULL, njsConnection_isHealthy, NULL, NULL, NULL,
            napi_default, NULL },
    { "ping", NULL, njsConnection_ping, NULL, NULL, NULL, napi_default,
            NULL },
    { "rollback", NULL, njsConnection_rollback, NULL, NULL, NULL,
            napi_default, NULL },
    { "setAction", NULL, njsConnection_setAction, NULL, NULL, NULL,
            napi_default, NULL },
    { "setCallTimeout", NULL, njsConnection_setCallTimeout, NULL, NULL, NULL,
            napi_default, NULL },
    { "setClientId", NULL, njsConnection_setClientId, NULL, NULL, NULL,
            napi_default, NULL },
    { "setClientInfo", NULL, njsConnection_setClientInfo, NULL, NULL, NULL,
            napi_default, NULL },
    { "setCurrentSchema", NULL, njsConnection_setCurrentSchema, NULL, NULL,
            NULL, napi_default, NULL },
    { "setDbOp", NULL, njsConnection_setDbOp, NULL, NULL, NULL, napi_default,
            NULL },
    { "setECID", NULL, njsConnection_setECID, NULL, NULL, NULL, napi_default,
            NULL },
    { "setExternalName", NULL, njsConnection_setExternalName, NULL, NULL, NULL,
            napi_default, NULL },
    { "setInternalName", NULL, njsConnection_setInternalName, NULL, NULL, NULL,
            napi_default, NULL },
    { "setModule", NULL, njsConnection_setModule, NULL, NULL, NULL,
            napi_default, NULL },
    { "setTag", NULL, njsConnection_setTag, NULL, NULL, NULL, napi_default,
            NULL },
    { "shutdown", NULL, njsConnection_shutdown, NULL, NULL, NULL,
            napi_default, NULL },
    { "startup", NULL, njsConnection_startup, NULL, NULL, NULL,
            napi_default, NULL },
    { "subscribe", NULL, njsConnection_subscribe, NULL, NULL, NULL,
            napi_default, NULL },
    { "tpcBegin", NULL, njsConnection_tpcBegin, NULL, NULL, NULL,
            napi_default, NULL },
    { "tpcCommit", NULL, njsConnection_tpcCommit, NULL, NULL, NULL,
            napi_default, NULL },
    { "tpcEnd", NULL, njsConnection_tpcEnd, NULL, NULL, NULL,
            napi_default, NULL },
    { "tpcForget", NULL, njsConnection_tpcForget, NULL, NULL, NULL,
            napi_default, NULL },
    { "tpcPrepare", NULL, njsConnection_tpcPrepare, NULL, NULL, NULL,
            napi_default, NULL },
    { "tpcRollback", NULL, njsConnection_tpcRollback, NULL, NULL, NULL,
            napi_default, NULL },
    { "unsubscribe", NULL, njsConnection_unsubscribe, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefConnection = {
    "ConnectionImpl", sizeof(njsConnection), njsConnection_finalize,
    njsClassProperties, false
};

// other methods used internally
static bool njsConnection_check(njsBaton *baton);
static bool njsConnection_getBatchErrors(njsBaton *baton, napi_env env,
        napi_value *batchErrors);
static bool njsConnection_getExecuteManyOutBinds(njsBaton *baton, napi_env env,
        uint32_t numOutBinds, napi_value *outBinds);
static bool njsConnection_getExecuteOutBinds(njsBaton *baton,
        napi_env env, napi_value *outBinds);
static bool njsConnection_getImplicitResults(njsBaton *baton,
        napi_env env, napi_value *implicitResults);
static bool njsConnection_getOutBinds(njsBaton *baton, napi_env env,
        uint32_t numOutBinds, uint32_t pos, napi_value *outBinds);
static bool njsConnection_getRowCounts(njsBaton *baton, napi_env env,
        napi_value *rowCounts);
static bool njsConnection_prepareAndBind(njsConnection *conn, njsBaton *baton);
static bool njsConnection_processImplicitResults(njsBaton *baton);
static bool njsConnection_setTextAttribute(napi_env env,
        njsBaseInstance *instance, njsModuleGlobals *globals,
        napi_value value, int (*setter)(dpiConn*, const char *, uint32_t));


static bool njsConnection_processBinds(njsBaton *baton, napi_env env,
        napi_value binds);

//-----------------------------------------------------------------------------
// njsConnection_breakExecution()
//   Break (interrupt) the currently executing operation.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_breakExecution, 0, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    return njsBaton_queueWork(baton, env, "Break",
            njsConnection_breakExecutionAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_breakExecutionAsync()
//   Worker function for njsConnection_breakExecution().
//-----------------------------------------------------------------------------
static bool njsConnection_breakExecutionAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_breakExecution(conn->handle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_changePassword()
//   Change the password on the connection
//
// PARAMETERS
//   - user which will have its password changed
//   - original password
//   - new password
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_changePassword, 3, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsUtils_copyStringFromJS(env, args[0], &baton->user,
            &baton->userLength))
        return false;
    if (!njsUtils_copyStringFromJS(env, args[1], &baton->password,
            &baton->passwordLength))
        return false;
    if (!njsUtils_copyStringFromJS(env, args[2], &baton->newPassword,
            &baton->newPasswordLength))
        return false;
    return njsBaton_queueWork(baton, env, "ChangePassword",
            njsConnection_changePasswordAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_changePasswordAsync()
//   Worker function for njsConnection_changePassword().
//-----------------------------------------------------------------------------
static bool njsConnection_changePasswordAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_changePassword(conn->handle, baton->user,
            (uint32_t) baton->userLength, baton->password,
            (uint32_t) baton->passwordLength, baton->newPassword,
            (uint32_t) baton->newPasswordLength) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_check()
//   Checks to see that the connection is valid.
//-----------------------------------------------------------------------------
static bool njsConnection_check(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (!conn->handle)
        return njsBaton_setError(baton, errInvalidConnection);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_close()
//   Releases the connection from use by JS. This releases the connection back
// to the pool or closes the standalone connection so further use is not
// possible.
//
// PARAMETERS
//   - options object
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_close, 1, NULL)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "drop",
            &baton->dropSession, NULL))
        return false;
    baton->dpiConnHandle = conn->handle;
    conn->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsConnection_closeAsync,
            NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_closeAsync()
//   Worker function for njsConnection_close().
//-----------------------------------------------------------------------------
static bool njsConnection_closeAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    uint32_t mode = DPI_MODE_CONN_CLOSE_DEFAULT, tagLength = 0;
    const char *tag = NULL;

    if (baton->dropSession) {
        mode = DPI_MODE_CONN_CLOSE_DROP;
    } else if (conn->retag) {
        mode = DPI_MODE_CONN_CLOSE_RETAG;
        tag = conn->tag;
        tagLength = (uint32_t) conn->tagLength;
    }

    if (dpiConn_close(baton->dpiConnHandle, mode, tag, tagLength) < 0) {
        njsBaton_setErrorDPI(baton);
        conn->handle = baton->dpiConnHandle;
        baton->dpiConnHandle = NULL;
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_commit()
//   Commits the active transaction.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_commit, 0, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    return njsBaton_queueWork(baton, env, "Commit", njsConnection_commitAsync,
            NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_commitAsync()
//   Worker function for njsConnection_commit().
//-----------------------------------------------------------------------------
static bool njsConnection_commitAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_commit(conn->handle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_connect()
//   Create a standalone connection to the database.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_connect, 1, &njsClassDefConnection)
{
    napi_value callingObj;

    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &callingObj))
    if (!njsBaton_commonConnectProcessArgs(baton, env, args))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "newPassword",
            &baton->newPassword, &baton->newPasswordLength, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "privilege",
            &baton->privilege, NULL))
        return false;
    if (!njsBaton_getShardingKeyColumnsFromArg(baton, env, args, 0,
            "shardingKey", &baton->numShardingKeyColumns,
            &baton->shardingKeyColumns))
        return false;
    if (!njsBaton_getShardingKeyColumnsFromArg(baton, env, args, 0,
            "superShardingKey", &baton->numSuperShardingKeyColumns,
            &baton->superShardingKeyColumns))
        return false;
    return njsBaton_queueWork(baton, env, "Connect",
            njsConnection_connectAsync, njsConnection_connectPostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_connectAsync()
//   Worker function for Connect() performed on thread. This establishes the
// connection using the information found in the baton.
//-----------------------------------------------------------------------------
static bool njsConnection_connectAsync(njsBaton *baton)
{
    dpiCommonCreateParams commonParams;
    dpiConnCreateParams params;
    dpiAccessToken accessToken;

    if (dpiContext_initConnCreateParams(baton->globals->context, &params) < 0)
        return njsBaton_setErrorDPI(baton);
    if (baton->privilege)
        params.authMode = (dpiAuthMode) baton->privilege;
    params.externalAuth = baton->externalAuth;
    params.connectionClass = baton->connectionClass;
    params.connectionClassLength = (uint32_t) baton->connectionClassLength;
    params.newPassword = baton->newPassword;
    params.newPasswordLength = (uint32_t) baton->newPasswordLength;
    if (!njsBaton_initCommonCreateParams(baton, &commonParams))
        return false;

    // Sharding
    params.shardingKeyColumns = baton->shardingKeyColumns;
    params.numShardingKeyColumns = baton->numShardingKeyColumns;
    params.superShardingKeyColumns = baton->superShardingKeyColumns;
    params.numSuperShardingKeyColumns = baton->numSuperShardingKeyColumns;

    commonParams.edition = baton->edition;
    commonParams.editionLength = (uint32_t) baton->editionLength;
    commonParams.stmtCacheSize = baton->stmtCacheSize;

    // set token based auth parameters
    if (baton->token) {
        accessToken.token = baton->token;
        accessToken.tokenLength = baton->tokenLength;
        accessToken.privateKey = baton->privateKey;
        accessToken.privateKeyLength = baton->privateKeyLength;
        commonParams.accessToken = &accessToken;
    }

    if (dpiConn_create(baton->globals->context, baton->user,
            (uint32_t) baton->userLength, baton->password,
            (uint32_t) baton->passwordLength, baton->connectString,
            (uint32_t) baton->connectStringLength, &commonParams, &params,
            &baton->dpiConnHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_connectPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_connectPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    // transfer the ODPI-C connection handle to the new object
    conn->handle = baton->dpiConnHandle;
    baton->dpiConnHandle = NULL;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_createLob()
//   Create a new temporary LOB and return it for use by the application.
//
// PARAMETERS
//   - LOB type
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_createLob, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &baton->lobType))
    return njsBaton_queueWork(baton, env, "CreateLob",
            njsConnection_createLobAsync, njsConnection_createLobPostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_createLobAsync()
//   Worker function for njsConnection_createLob().
//-----------------------------------------------------------------------------
static bool njsConnection_createLobAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    baton->lob = calloc(1, sizeof(njsLobBuffer));
    if (!baton->lob)
        return njsBaton_setError(baton, errInsufficientMemory);
    if (dpiConn_newTempLob(conn->handle, baton->lobType,
                &baton->lob->handle) < 0)
        return njsBaton_setErrorDPI(baton);
    baton->lob->dataType = baton->lobType;
    if (!njsLob_populateBuffer(baton, baton->lob))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_createLobPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_createLobPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    napi_value connObj;

    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &connObj))
    return njsLob_new(baton->globals, baton->lob, env, connObj, result);
}


//-----------------------------------------------------------------------------
// njsConnection_execute()
//   Executes a statement on the connection.
//
// PARAMETERS
//   - SQL statement
//   - number of iterations
//   - array of binds
//   - options
//   - executeMany flag
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_execute, 5, NULL)
{
    bool executeMany;
    napi_value temp;

    // validate connection and process arguments
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_setJsValues(baton, env))
        return false;
    if (!njsUtils_copyStringFromJS(env, args[0], &baton->sql,
            &baton->sqlLength))
        return false;
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[1],
            &baton->bindArraySize))
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, args[4], &executeMany))

    // process options
    if (executeMany) {
        if (!njsUtils_getNamedPropertyBool(env, args[3], "batchErrors",
                &baton->batchErrors))
            return false;
        if (!njsUtils_getNamedPropertyBool(env, args[3], "dmlRowCounts",
                &baton->dmlRowCounts))
            return false;
    } else {
        if (!njsBaton_getUnsignedIntArrayFromArg(baton, env, args, 3,
                "fetchAsBuffer", &baton->numFetchAsBufferTypes,
                &baton->fetchAsBufferTypes, NULL))
            return false;
        if (!njsBaton_getUnsignedIntArrayFromArg(baton, env, args, 3,
                "fetchAsString", &baton->numFetchAsStringTypes,
                &baton->fetchAsStringTypes, NULL))
            return false;
        NJS_CHECK_NAPI(env, napi_get_named_property(env, args[3],
                "fetchArraySize", &temp))
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp,
                &baton->fetchArraySize))
        NJS_CHECK_NAPI(env, napi_get_named_property(env, args[3],
                "prefetchRows", &temp))
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp,
                &baton->prefetchRows))
        if (!njsBaton_getFetchInfoFromArg(baton, env, args[3],
                &baton->numFetchInfo, &baton->fetchInfo))
            return false;
    }
    NJS_CHECK_NAPI(env, napi_get_named_property(env, args[3], "autoCommit",
            &temp))
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, temp, &baton->autoCommit))
    NJS_CHECK_NAPI(env, napi_get_named_property(env, args[3],
            "keepInStmtCache", &temp))
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, temp,
            &baton->keepInStmtCache))

    // process binds
    if (!njsConnection_processBinds(baton, env, args[2]))
        return false;

    // queue async work
    if (executeMany)
        return njsBaton_queueWork(baton, env, "ExecuteMany",
                njsConnection_executeManyAsync,
                njsConnection_executeManyPostAsync, returnValue);
    return njsBaton_queueWork(baton, env, "Execute",
            njsConnection_executeAsync, njsConnection_executePostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_executeAsync()
//   Worker function for njsConnection_execute().
//-----------------------------------------------------------------------------
static bool njsConnection_executeAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    dpiExecMode mode;

    // prepare statement and perform any binds that are needed
    if (!njsConnection_prepareAndBind(conn, baton))
        return false;

    // set prefetch rows if a value other than the default is specified
    if (baton->prefetchRows != DPI_DEFAULT_PREFETCH_ROWS) {
        if (dpiStmt_setPrefetchRows(baton->dpiStmtHandle,
                baton->prefetchRows) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // mark statement for removal from the cache, if applicable
    if (!baton->keepInStmtCache) {
        if (dpiStmt_deleteFromCache(baton->dpiStmtHandle) < 0) {
            return njsBaton_setErrorDPI(baton);
        }
    }

    // execute statement
    mode = (baton->autoCommit) ? DPI_MODE_EXEC_COMMIT_ON_SUCCESS :
            DPI_MODE_EXEC_DEFAULT;
    if (dpiStmt_execute(baton->dpiStmtHandle, mode, &baton->numQueryVars) < 0)
        return njsBaton_setErrorDPI(baton);

    // for queries, initialize query variables
    if (baton->numQueryVars > 0) {

        baton->queryVars = calloc(baton->numQueryVars, sizeof(njsVariable));
        if (!baton->queryVars)
            return njsBaton_setError(baton, errInsufficientMemory);
        if (!njsVariable_initForQuery(baton->queryVars, baton->numQueryVars,
                baton->dpiStmtHandle, baton))
            return false;

    // for all other statements, determine the number of rows affected, process
    // variables (to manage LOBs, REF cursors, PL/SQL arrays, etc.) and process
    // implicit results
    } else {
        if (dpiStmt_getRowCount(baton->dpiStmtHandle,
                &baton->rowsAffected) < 0)
            return njsBaton_setErrorDPI(baton);
        baton->bufferRowIndex = 0;
        if (!njsVariable_process(baton->bindVars, baton->numBindVars, 1,
                baton))
            return false;
        if (!njsConnection_processImplicitResults(baton))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_executePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_executePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    napi_value metadata, resultSet, rowsAffected, outBinds, lastRowid;
    napi_value implicitResults;
    uint32_t rowidValueLength;
    const char *rowidValue;
    dpiRowid *rowid;

    // set JavaScript values to simplify creation of returned objects
    if (!njsBaton_setJsValues(baton, env))
        return false;

    // create result object
    NJS_CHECK_NAPI(env, napi_create_object(env, result))

    // handle queries
    if (baton->queryVars) {

        // perform any initialization required within JavaScript
        if (!njsVariable_initForQueryJS(baton->queryVars, baton->numQueryVars,
                env, baton))
            return false;

        // return result set
        if (!njsResultSet_new(baton, env,
                (njsConnection*) baton->callingInstance, baton->dpiStmtHandle,
                baton->queryVars, baton->numQueryVars, &resultSet))
            return false;

        // set metadata for the query
        if (!njsVariable_getMetadataMany(baton->queryVars, baton->numQueryVars,
                env, &metadata))
            return false;
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "metaData",
                metadata))


        baton->dpiStmtHandle = NULL;
        baton->queryVars = NULL;
        baton->numQueryVars = 0;
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "resultSet",
                resultSet))

    } else {

        // store OUT binds, if applicable
        outBinds = NULL;
        if (!njsConnection_getExecuteOutBinds(baton, env, &outBinds))
            return false;
        if (outBinds) {
            NJS_CHECK_NAPI(env, napi_set_named_property(env, *result,
                    "outBinds", outBinds))
        }

        // for DML statements, check to see if the last rowid is available
        if (baton->stmtInfo.isDML) {
            if (dpiStmt_getLastRowid(baton->dpiStmtHandle, &rowid) < 0)
                return njsBaton_setErrorDPI(baton);
            if (rowid) {
                if (dpiRowid_getStringValue(rowid, &rowidValue,
                        &rowidValueLength) < 0)
                    return njsBaton_setErrorDPI(baton);
                NJS_CHECK_NAPI(env, napi_create_string_utf8(env, rowidValue,
                        rowidValueLength, &lastRowid))
                NJS_CHECK_NAPI(env, napi_set_named_property(env, *result,
                        "lastRowid", lastRowid))
            }
        }

        // check for implicit results when executing PL/SQL
        if (baton->stmtInfo.isPLSQL) {
            implicitResults = NULL;
            if (!njsConnection_getImplicitResults(baton, env,
                    &implicitResults))
                return false;
            if (implicitResults) {
                NJS_CHECK_NAPI(env, napi_set_named_property(env, *result,
                        "implicitResults", implicitResults))
            }

        // set rows affected if not executing PL/SQL
        } else {
            NJS_CHECK_NAPI(env, napi_create_uint32(env,
                    (uint32_t) baton->rowsAffected, &rowsAffected))
            NJS_CHECK_NAPI(env, napi_set_named_property(env, *result,
                    "rowsAffected", rowsAffected))
        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_executeManyAsync()
//   Worker function for njsConnection_executeMany().
//-----------------------------------------------------------------------------
static bool njsConnection_executeManyAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    uint32_t mode;

    // prepare statement and perform any binds that are needed
    if (!njsConnection_prepareAndBind(conn, baton))
        return false;

    // mark statement for removal from the cache, if applicable
    if (!baton->keepInStmtCache) {
        if (dpiStmt_deleteFromCache(baton->dpiStmtHandle) < 0) {
            return njsBaton_setErrorDPI(baton);
        }
    }

    // execute statement
    mode = (baton->autoCommit) ? DPI_MODE_EXEC_COMMIT_ON_SUCCESS :
            DPI_MODE_EXEC_DEFAULT;
    if (baton->batchErrors)
        mode |= DPI_MODE_EXEC_BATCH_ERRORS;
    if (baton->dmlRowCounts)
        mode |= DPI_MODE_EXEC_ARRAY_DML_ROWCOUNTS;
    if (dpiStmt_executeMany(baton->dpiStmtHandle, mode,
            baton->bindArraySize) < 0)
        return njsBaton_setErrorDPI(baton);

    // process any LOBS for out binds, as needed
    if (dpiStmt_getRowCount(baton->dpiStmtHandle, &baton->rowsAffected) < 0)
        return njsBaton_setErrorDPI(baton);
    baton->bufferRowIndex = 0;
    if (!njsVariable_process(baton->bindVars, baton->numBindVars,
            baton->bindArraySize, baton))
        return false;

    // get DML row counts if option was enabled
    if (baton->dmlRowCounts) {
        if (dpiStmt_getRowCounts(baton->dpiStmtHandle, &baton->numRowCounts,
                &baton->rowCounts) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // get batch errors, if option was enabled
    if (baton->batchErrors) {
        if (dpiStmt_getBatchErrorCount(baton->dpiStmtHandle,
                &baton->numBatchErrorInfos) < 0)
            return njsBaton_setErrorDPI(baton);
        if (baton->numBatchErrorInfos > 0) {
            baton->batchErrorInfos = calloc(baton->numBatchErrorInfos,
                    sizeof(dpiErrorInfo));
            if (!baton->batchErrorInfos)
                return njsBaton_setError(baton, errInsufficientMemory);
            if (dpiStmt_getBatchErrors(baton->dpiStmtHandle,
                    baton->numBatchErrorInfos, baton->batchErrorInfos) < 0)
                return njsBaton_setErrorDPI(baton);
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_executeManyPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_executeManyPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    uint32_t numOutBinds;
    napi_value temp;

    // set JavaScript values to simplify creation of returned objects
    if (!njsBaton_setJsValues(baton, env))
        return false;

    // create object for result
    NJS_CHECK_NAPI(env, napi_create_object(env, result))

    // get out binds
    numOutBinds = njsBaton_getNumOutBinds(baton);
    if (numOutBinds > 0) {
        if (!njsConnection_getExecuteManyOutBinds(baton, env, numOutBinds,
                &temp))
            return false;
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "outBinds",
                temp))
    }

    // get total number of rows affected
    if (!baton->stmtInfo.isPLSQL) {
        NJS_CHECK_NAPI(env, napi_create_uint32(env,
                (uint32_t) baton->rowsAffected, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result,
                "rowsAffected", temp))
    }

    // get DML row counts if option was enabled
    if (baton->dmlRowCounts && baton->numRowCounts > 0) {
        if (!njsConnection_getRowCounts(baton, env, &temp))
            return false;
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result,
                "dmlRowCounts", temp))
    }

    // get batch errors, if option was enabled
    if (baton->batchErrors && baton->numBatchErrorInfos > 0) {
        if (!njsConnection_getBatchErrors(baton, env, &temp))
            return false;
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result,
                "batchErrors", temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_finalize()
//   Invoked when the njsConnection object is garbage collected.
//-----------------------------------------------------------------------------
static void njsConnection_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    uint32_t mode = DPI_MODE_CONN_CLOSE_DEFAULT, tagLength = 0;
    njsConnection *conn = (njsConnection*) finalizeData;
    const char *tag = NULL;

    if (conn->handle) {
        if (conn->retag) {
            mode = DPI_MODE_CONN_CLOSE_RETAG;
            tag = conn->tag;
            tagLength = (uint32_t) conn->tagLength;
        }
        dpiConn_close(conn->handle, mode, tag, tagLength);
        dpiConn_release(conn->handle);
        conn->handle = NULL;
    }
    NJS_FREE_AND_CLEAR(conn->tag);
    free(conn);
}


//-----------------------------------------------------------------------------
// njsConnection_getBatchErrors()
//   Get the array of batch errors from the baton.
//-----------------------------------------------------------------------------
static bool njsConnection_getBatchErrors(njsBaton *baton, napi_env env,
        napi_value *batchErrors)
{
    napi_value temp, error, message;
    dpiErrorInfo *info;
    uint32_t i;

    NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
            baton->numBatchErrorInfos, batchErrors))
    for (i = 0; i < baton->numBatchErrorInfos; i++) {
        info = &baton->batchErrorInfos[i];

        // create error from message
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, info->message,
                info->messageLength, &message))
        NJS_CHECK_NAPI(env, napi_create_error(env, NULL, message, &error))

        // add error number
        NJS_CHECK_NAPI(env, napi_create_int32(env, info->code, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, error, "errorNum",
                temp))

        // set offset
        NJS_CHECK_NAPI(env, napi_create_uint32(env, info->offset, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, error, "offset",
                temp))

        // add error to array
        NJS_CHECK_NAPI(env, napi_set_element(env, *batchErrors, i, error))

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getCallTimeout()
//   Get accessor of "callTimeout" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getCallTimeout, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    dpiVersionInfo versionInfo;
    uint32_t callTimeout;

    // return undefined for an invalid connection
    if (!conn->handle)
        return true;

    // if an Oracle Client less than 18.1 is being used, return undefined
    if (dpiContext_getClientVersion(globals->context, &versionInfo) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    if (versionInfo.versionNum < 18)
        return true;

    // get value and return it
    if (dpiConn_getCallTimeout(conn->handle, &callTimeout) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    NJS_CHECK_NAPI(env, napi_create_uint32(env, callTimeout, returnValue))

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getCurrentSchema()
//   Get accessor of "currentSchema" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getCurrentSchema, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (conn->handle) {
        if (dpiConn_getCurrentSchema(conn->handle, &value, &valueLength) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
                returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getDbObjectClass()
//   Looks up a database object type given its name and returns it to the
// caller.
//
// PARAMETERS
//   - name
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_getDbObjectClass, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsUtils_copyStringFromJS(env, args[0], &baton->name,
            &baton->nameLength))
        return false;
    return njsBaton_queueWork(baton, env, "GetDbObjectClass",
            njsConnection_getDbObjectClassAsync,
            njsConnection_getDbObjectClassPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_getDbObjectClassAsync()
//   Worker function for njsConnection_getDbObjectClass().
//-----------------------------------------------------------------------------
static bool njsConnection_getDbObjectClassAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_getObjectType(conn->handle, baton->name,
            (uint32_t) baton->nameLength, &baton->dpiObjectTypeHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getDbObjectClassPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_getDbObjectClassPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    njsDbObjectType *objType;

    return njsDbObject_getSubClass(baton, baton->dpiObjectTypeHandle, env,
            result, &objType);
}


//-----------------------------------------------------------------------------
// njsConnection_getExternalName()
//   Get accessor for "externalName" property
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getExternalName, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (conn->handle) {
        if (dpiConn_getExternalName(conn->handle, &value, &valueLength) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
                returnValue))
    }

    return true;
}



//-----------------------------------------------------------------------------
// njsConnection_getInternalName()
//   Get accessor for "internalName" property
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getInternalName, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    uint32_t valueLength;
    const char *value;

    if (conn->handle) {
        if (dpiConn_getInternalName(conn->handle, &value, &valueLength) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, value, valueLength,
                returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getExecuteManyOutBinds()
//   Get the out binds as an array of objects/arrays.
//-----------------------------------------------------------------------------
static bool njsConnection_getExecuteManyOutBinds(njsBaton *baton, napi_env env,
        uint32_t numOutBinds, napi_value *outBinds)
{
    napi_value temp;
    uint32_t i;

    NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
            baton->bindArraySize, outBinds))
    for (i = 0; i < baton->bindArraySize; i++) {
        if (!njsConnection_getOutBinds(baton, env, numOutBinds, i, &temp))
            return false;
        NJS_CHECK_NAPI(env, napi_set_element(env, *outBinds, i, temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getExecuteOutBinds()
//   Get the out binds as an object/array.
//-----------------------------------------------------------------------------
static bool njsConnection_getExecuteOutBinds(njsBaton *baton, napi_env env,
        napi_value *outBinds)
{
    uint32_t numOutBinds;

    numOutBinds = njsBaton_getNumOutBinds(baton);
    if (numOutBinds == 0)
        return true;
    return njsConnection_getOutBinds(baton, env, numOutBinds, 0, outBinds);
}


//-----------------------------------------------------------------------------
// njsConnection_getImplicitResults()
//   Return any implicit results that were returned by a PL/SQL block.
//-----------------------------------------------------------------------------
static bool njsConnection_getImplicitResults(njsBaton *baton,
        napi_env env, napi_value *implicitResultsObj)
{
    njsImplicitResult *implicitResult;
    uint32_t i, numImplicitResults;
    napi_value resultSet;

    // determine the number of implicit results
    numImplicitResults = 0;
    implicitResult = baton->implicitResults;
    while (implicitResult) {
        numImplicitResults++;
        implicitResult = implicitResult->next;
    }
    if (numImplicitResults == 0)
        return true;

    // create an array to contain the implicit results
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, numImplicitResults,
            implicitResultsObj))
    implicitResult = baton->implicitResults;
    for (i = 0; i < numImplicitResults; i++) {
        if (!njsVariable_initForQueryJS(implicitResult->queryVars,
                implicitResult->numQueryVars, env, baton))
            return false;
        if (!njsResultSet_new(baton, env,
                (njsConnection*) baton->callingInstance, implicitResult->stmt,
                implicitResult->queryVars, implicitResult->numQueryVars,
                &resultSet))
            return false;
        implicitResult->stmt = NULL;
        implicitResult->queryVars = NULL;
        implicitResult->numQueryVars = 0;
        NJS_CHECK_NAPI(env, napi_set_element(env, *implicitResultsObj, i,
                resultSet))
        implicitResult = implicitResult->next;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getOutBinds()
//   Get the out binds as an object/array.
//-----------------------------------------------------------------------------
static bool njsConnection_getOutBinds(njsBaton *baton, napi_env env,
        uint32_t numOutBinds, uint32_t pos, napi_value *outBinds)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    napi_value tempBinds, key, val;
    uint32_t arrayPos, i;
    bool bindByPos, ok;
    njsVariable *var;

    // create object (bind by name) or array (bind by position)
    bindByPos = (baton->bindVars[0].name == NULL);
    if (bindByPos) {
        NJS_CHECK_NAPI(env, napi_create_array_with_length(env, numOutBinds,
                &tempBinds))
    } else {
        NJS_CHECK_NAPI(env, napi_create_object(env, &tempBinds))
    }

    // perform any processing required for variables
    if (!njsVariable_processJS(baton->bindVars, baton->numBindVars, env,
            baton))
        return false;

    // scan bind variables, skipping IN binds
    arrayPos = 0;
    for (i = 0; i < baton->numBindVars; i++) {
        var = &baton->bindVars[i];
        if (var->bindDir == NJS_BIND_IN)
            continue;

        // get value stored in the variable
        if (var->isArray || baton->stmtInfo.isReturning) {
            ok = njsVariable_getArrayValue(var, conn, pos, baton, env, &val);
        } else {
            ok = njsVariable_getScalarValue(var, conn, var->buffer, pos, baton,
                    env, &val);
        }
        if (!ok)
            return false;

        // store value in object (bind by name) or array (bind by position)
        if (bindByPos) {
            NJS_CHECK_NAPI(env, napi_set_element(env, tempBinds, arrayPos++,
                    val))
        } else {
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env, var->name,
                    var->nameLength, &key))
            NJS_CHECK_NAPI(env, napi_set_property(env, tempBinds, key, val))
        }

    }

    *outBinds = tempBinds;
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getOracleServerVersion()
//   Get accessor of "oracleServerVersion" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getOracleServerVersion, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    dpiVersionInfo versionInfo;

    if (conn->handle) {
        if (dpiConn_getServerVersion(conn->handle, NULL, NULL,
                &versionInfo) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        NJS_CHECK_NAPI(env, napi_create_uint32(env, versionInfo.fullVersionNum,
                returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getOracleServerVersionString()
//   Get accessor of "oracleServerVersionString" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getOracleServerVersionString, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    dpiVersionInfo versionInfo;
    char versionString[40];

    if (conn->handle) {
        if (dpiConn_getServerVersion(conn->handle, NULL, NULL,
                &versionInfo) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        (void) snprintf(versionString, sizeof(versionString), "%d.%d.%d.%d.%d",
                versionInfo.versionNum, versionInfo.releaseNum,
                versionInfo.updateNum, versionInfo.portReleaseNum,
                versionInfo.portUpdateNum);
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, versionString,
                NAPI_AUTO_LENGTH, returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getQueue()
//   Creates an AQ queue associated with the connection.
//
// PARAMETERS
//   - name of queue to create
//   - options object
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_getQueue, 2, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsConnection_getQueueProcessArgs(baton, env, args))
        return false;
    return njsBaton_queueWork(baton, env, "GetQueue",
            njsConnection_getQueueAsync, njsConnection_getQueuePostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_getQueueAsync()
//   Worker function for njsConnection_getQueue().
//-----------------------------------------------------------------------------
static bool njsConnection_getQueueAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (baton->typeName && dpiConn_getObjectType(conn->handle, baton->typeName,
            (uint32_t) baton->typeNameLength, &baton->dpiObjectTypeHandle) < 0)
        return njsBaton_setErrorDPI(baton);
    if (dpiConn_newQueue(conn->handle, baton->name,
            (uint32_t) baton->nameLength, baton->dpiObjectTypeHandle,
            &baton->dpiQueueHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getQueuePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_getQueuePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    return njsAqQueue_createFromHandle(baton, env, result);
}


//-----------------------------------------------------------------------------
// njsConnection_getQueueProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_getQueueProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    napi_value typeObj, jsObjType;
    napi_valuetype valueType;
    njsDbObjectType *objType;
    bool ok;

    // get name for queue (first argument)
    if (!njsUtils_getStringArg(env, args, 0, &baton->name, &baton->nameLength))
        return false;

    // get payload type for queue (optional second argument)
    // may be a string (identifying an object type) or an actual class
    NJS_CHECK_NAPI(env, napi_get_named_property(env, args[1], "payloadType",
            &typeObj))
    NJS_CHECK_NAPI(env, napi_typeof(env, typeObj, &valueType))
    ok = (valueType == napi_undefined || valueType == napi_string);
    if (valueType == napi_string) {
        if (!njsUtils_copyStringFromJS(env, typeObj, &baton->typeName,
                &baton->typeNameLength))
            return false;
    } else if (valueType == napi_function) {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, typeObj, "_objType",
                &jsObjType))
        ok = (napi_unwrap(env, jsObjType, (void**) &objType) == napi_ok);
        if (ok) {
            if (dpiObjectType_addRef(objType->handle) < 0)
                return njsBaton_setErrorDPI(baton);
            baton->dpiObjectTypeHandle = objType->handle;
        }
    }
    if (!ok)
        return njsBaton_setError(baton, errInvalidPropertyValueInParam,
                "payloadType", 2);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getRowCounts()
//   Get the row counts stored on the baton as an array.
//-----------------------------------------------------------------------------
static bool njsConnection_getRowCounts(njsBaton *baton, napi_env env,
        napi_value *rowCounts)
{
    napi_value temp;
    uint32_t i;

    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->numRowCounts,
            rowCounts))
    for (i = 0; i < baton->numRowCounts; i++) {
        NJS_CHECK_NAPI(env, napi_create_uint32(env,
                (uint32_t) baton->rowCounts[i], &temp))
        NJS_CHECK_NAPI(env, napi_set_element(env, *rowCounts, i, temp))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getSodaDatabase()
//   Creates a top-level SODA object (pseudo) associated with the connection.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getSodaDatabase, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    dpiSodaDb *dbHandle;

    if (dpiConn_getSodaDb(conn->handle, &dbHandle) < 0)
        return njsUtils_throwErrorDPI(env, globals);
    return njsSodaDatabase_createFromHandle(env, callingObj, globals, dbHandle,
        returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_getStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getStmtCacheSize, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    uint32_t cacheSize;

    if (conn->handle) {
        if (dpiConn_getStmtCacheSize(conn->handle, &cacheSize) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        NJS_CHECK_NAPI(env, napi_create_uint32(env, cacheSize, returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getStatementInfo()
//   Parses a statement on the connection and returns information about the
// statement.
//
// PARAMETERS
//   - SQL statement
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_getStatementInfo, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsUtils_copyStringFromJS(env, args[0], &baton->sql,
            &baton->sqlLength))
        return false;
    return njsBaton_queueWork(baton, env, "GetStatementInfo",
            njsConnection_getStatementInfoAsync,
            njsConnection_getStatementInfoPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_getStatementInfoAsync()
//   Worker function for njsConnection_getStatementInfo().
//-----------------------------------------------------------------------------
static bool njsConnection_getStatementInfoAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    dpiExecMode mode;

    // prepare statement
    if (dpiConn_prepareStmt(conn->handle, 0, baton->sql,
            (uint32_t) baton->sqlLength, NULL, 0, &baton->dpiStmtHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    // parse the statement (but not for DDL which doesn't support it)
    if (dpiStmt_getInfo(baton->dpiStmtHandle, &baton->stmtInfo) < 0)
        return njsBaton_setErrorDPI(baton);
    if (!baton->stmtInfo.isDDL) {
        if (baton->stmtInfo.isQuery) {
            mode = DPI_MODE_EXEC_DESCRIBE_ONLY;
        } else {
            mode = DPI_MODE_EXEC_PARSE_ONLY;
        }
        if (dpiStmt_execute(baton->dpiStmtHandle, mode,
                &baton->numQueryVars) < 0)
            return njsBaton_setErrorDPI(baton);
    }

    // get number of bind variables
    if (dpiStmt_getBindCount(baton->dpiStmtHandle, &baton->numBindNames) < 0)
        return njsBaton_setErrorDPI(baton);

    // process bind variable names if there are any
    if (baton->numBindNames > 0) {

        // allocate memory for the bind variable names
        baton->bindNames = calloc(baton->numBindNames, sizeof(const char*));
        if (!baton->bindNames)
            return njsBaton_setError(baton, errInsufficientMemory);

        // allocate memory for the bind variable name lengths
        baton->bindNameLengths = calloc(baton->numBindNames, sizeof(uint32_t));
        if (!baton->bindNameLengths)
            return njsBaton_setError(baton, errInsufficientMemory);

        // get bind names
        if (dpiStmt_getBindNames(baton->dpiStmtHandle, &baton->numBindNames,
                baton->bindNames, baton->bindNameLengths) < 0)
            return njsBaton_setErrorDPI(baton);

    }

    // for queries, process query variables to get metadata
    if (baton->numQueryVars > 0) {
        baton->queryVars = calloc(baton->numQueryVars, sizeof(njsVariable));
        if (!baton->queryVars)
            return njsBaton_setError(baton, errInsufficientMemory);
        if (!njsVariable_initForQuery(baton->queryVars, baton->numQueryVars,
                baton->dpiStmtHandle, baton))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getStatementInfoPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_getStatementInfoPostAsync(njsBaton *baton,
        napi_env env, napi_value *result)
{
    napi_value bindNames, metadata, temp;
    uint32_t i;

    // create object for the result
    NJS_CHECK_NAPI(env, napi_create_object(env, result))

    // add metadata (queries only)
    if (baton->queryVars) {
        if (!njsVariable_initForQueryJS(baton->queryVars, baton->numQueryVars,
                env, baton))
            return false;
        if (!njsVariable_getMetadataMany(baton->queryVars, baton->numQueryVars,
                env, &metadata))
            return false;
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "metaData",
                metadata))
    }

    // add array for the bind names
    NJS_CHECK_NAPI(env, napi_create_array_with_length(env, baton->numBindNames,
            &bindNames))
    for (i = 0; i < baton->numBindNames; i++) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, baton->bindNames[i],
                baton->bindNameLengths[i], &temp))
        NJS_CHECK_NAPI(env, napi_set_element(env, bindNames, i, temp))
    }
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "bindNames",
            bindNames))

    // add statement type to result object
    NJS_CHECK_NAPI(env, napi_create_uint32(env, baton->stmtInfo.statementType,
            &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "statementType",
            temp))

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getTag()
//   Get accessor of "tag" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_getTag, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, conn->tag,
            conn->tagLength, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_newFromBaton()
//   Called when a connection is being created from the baton.
//-----------------------------------------------------------------------------
bool njsConnection_newFromBaton(njsBaton *baton, napi_env env,
        napi_value *connObj)
{
    njsConnection *conn;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefConnection,
            baton->globals->jsConnectionConstructor, connObj,
            (njsBaseInstance**) &conn))
        return false;

    // transfer the ODPI-C connection handle to the new object
    conn->handle = baton->dpiConnHandle;
    baton->dpiConnHandle = NULL;

    // transfer the requested tag to the new object
    if (baton->tagLength > 0) {
        conn->retag = true;
        conn->tag = baton->tag;
        conn->tagLength = baton->tagLength;
        baton->tag = NULL;
        baton->tagLength = 0;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_isHealthy()
//   Get the Health status - whether the current connection is usable or not.
// NOTE: If this function returns FALSE, conn.close() should be called.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_isHealthy, 0, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    int isHealthy = 0;

    dpiConn_getIsHealthy(conn->handle, &isHealthy);
    NJS_CHECK_NAPI(env, napi_get_boolean(env, isHealthy, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_ping()
//   Ping the database to see if it is "alive".
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_ping, 0, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    return njsBaton_queueWork(baton, env, "Ping", njsConnection_pingAsync,
            NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_pingAsync()
//   Worker function for njsConnection_ping().
//-----------------------------------------------------------------------------
static bool njsConnection_pingAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_ping(conn->handle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}

//-----------------------------------------------------------------------------
// njsConnection_prepareAndBind()
//   Prepare statement and bind data to the statement.
//-----------------------------------------------------------------------------
static bool njsConnection_prepareAndBind(njsConnection *conn, njsBaton *baton)
{
    njsVariable *var;
    uint32_t i;
    int status;

    // prepare statement
    if (dpiConn_prepareStmt(conn->handle, 0, baton->sql,
            (uint32_t) baton->sqlLength, NULL, 0, &baton->dpiStmtHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    // determine statement information
    if (dpiStmt_getInfo(baton->dpiStmtHandle, &baton->stmtInfo) < 0)
        return njsBaton_setErrorDPI(baton);

    // perform any binds necessary
    for (i = 0; i < baton->numBindVars; i++) {
        var = &baton->bindVars[i];
        if (var->name) {
            status = dpiStmt_bindByName(baton->dpiStmtHandle, var->name,
                    (uint32_t) var->nameLength, var->dpiVarHandle);
        } else {
            status = dpiStmt_bindByPos(baton->dpiStmtHandle, var->pos,
                    var->dpiVarHandle);
        }
        if (status < 0)
            return njsBaton_setErrorDPI(baton);
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_processBindUnit()
//   Process a single bind unit passed through to the execute() call.
//-----------------------------------------------------------------------------
static bool njsConnection_processBindUnit(njsBaton *baton, napi_env env,
        napi_value bindUnit, njsVariable *var)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    napi_value temp, bindValues;
    uint32_t i, arrayLength;
    bool found;

    // determine name/position
    if (!njsUtils_getNamedProperty(env, bindUnit, "name", &temp, &found))
        return false;
    if (found) {
        if (!njsUtils_copyStringFromJS(env, temp, &var->name,
                &var->nameLength))
            return false;
    } else {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit, "pos",
                &temp))
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &var->pos))
    }

    // determine bind direction (IN, OUT or IN/OUT)
    NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit, "dir",
            &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &var->bindDir))

    // determine type
    NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit, "type",
            &temp))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &var->varTypeNum))
    if (var->varTypeNum == DPI_ORACLE_TYPE_OBJECT) {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit, "objType",
                &temp))
        NJS_CHECK_NAPI(env, napi_unwrap(env, temp, (void**) &var->objectType))
        var->dpiObjectTypeHandle = var->objectType->handle;
    }

    // determine maximum size (optional)
    if (!njsUtils_getNamedProperty(env, bindUnit, "maxSize", &temp, &found))
        return false;
    if (found) {
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp, &var->maxSize))
    }

    // determine if value is an array and the maximum array size
    NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit, "isArray",
            &temp))
    NJS_CHECK_NAPI(env, napi_get_value_bool(env, temp, &var->isArray))
    if (var->isArray) {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit,
                "maxArraySize", &temp))
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, temp,
                &var->maxArraySize))
    } else {
        var->maxArraySize = baton->bindArraySize;
    }

    // create buffer for variable
    if (!njsVariable_createBuffer(var, conn, baton))
        return false;

    // process bind value (except for OUT variables)
    if (var->bindDir != NJS_BIND_OUT) {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit, "values",
                &bindValues))
        if (var->isArray) {
            NJS_CHECK_NAPI(env, napi_get_array_length(env, bindValues,
                    &arrayLength))
            if (dpiVar_setNumElementsInArray(var->dpiVarHandle,
                    arrayLength) < 0)
                return njsBaton_setErrorDPI(baton);
        }
        for (i = 0; i < var->maxArraySize; i++) {
            NJS_CHECK_NAPI(env, napi_get_element(env, bindValues, i, &temp))
            if (!njsVariable_setScalarValue(var, i, env, temp, baton))
                return false;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_processBinds()
//   Process binds passed through to the execute() call.
//-----------------------------------------------------------------------------
static bool njsConnection_processBinds(njsBaton *baton, napi_env env,
        napi_value binds)
{
    napi_value bindUnit;
    uint32_t i;

    // determine the number of bind variables; if none are provided, nothing
    // further needs to be done
    NJS_CHECK_NAPI(env, napi_get_array_length(env, binds, &baton->numBindVars))
    if (baton->numBindVars == 0)
        return true;

    // allocate memory for the bind variables
    baton->bindVars = calloc(baton->numBindVars, sizeof(njsVariable));
    if (!baton->bindVars)
        return njsBaton_setError(baton, errInsufficientMemory);

    // initialize bind variables from supplied information
    for (i = 0; i < baton->numBindVars; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, binds, i, &bindUnit))
        if (!njsConnection_processBindUnit(baton, env, bindUnit,
                &baton->bindVars[i]))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_processImplicitResults()
//   Process implicit results.
//-----------------------------------------------------------------------------
static bool njsConnection_processImplicitResults(njsBaton *baton)
{
    njsImplicitResult *implicitResult = NULL, *tempImplicitResult;
    dpiVersionInfo versionInfo;
    dpiStmt *stmt;

    // clients earlier than 12.1 do not support implicit results
    if (dpiContext_getClientVersion(baton->globals->context, &versionInfo) < 0)
        return njsBaton_setErrorDPI(baton);
    if (versionInfo.versionNum < 12)
        return true;

    // process all implicit results returned
    while (1) {

        // get next implicit result
        if (dpiStmt_getImplicitResult(baton->dpiStmtHandle, &stmt) < 0)
            return njsBaton_setErrorDPI(baton);
        if (!stmt)
            break;

        // allocate memory and inject new structure into linked list
        tempImplicitResult = calloc(1, sizeof(njsImplicitResult));
        if (!tempImplicitResult) {
            dpiStmt_release(stmt);
            return njsBaton_setError(baton, errInsufficientMemory);
        }
        tempImplicitResult->stmt = stmt;
        if (implicitResult) {
            implicitResult->next = tempImplicitResult;
        } else {
            baton->implicitResults = implicitResult = tempImplicitResult;
        }
        implicitResult = tempImplicitResult;

        // prepare statement for query
        if (dpiStmt_getNumQueryColumns(stmt,
                &implicitResult->numQueryVars) < 0)
            return njsBaton_setErrorDPI(baton);
        implicitResult->queryVars = calloc(implicitResult->numQueryVars,
                sizeof(njsVariable));
        if (!implicitResult->queryVars)
            return njsBaton_setError(baton, errInsufficientMemory);
        if (!njsVariable_initForQuery(implicitResult->queryVars,
                implicitResult->numQueryVars, implicitResult->stmt, baton))
            return false;

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_rollback()
//   Rolls back the active transaction.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_rollback, 0, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    return njsBaton_queueWork(baton, env, "Rollback",
            njsConnection_rollbackAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_rollbackAsync()
//   Worker function for njsConnection_rollback().
//-----------------------------------------------------------------------------
static bool njsConnection_rollbackAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_rollback(conn->handle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_setAction()
//   Set accessor of "action" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setAction, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setAction);
}


//-----------------------------------------------------------------------------
// njsConnection_setCallTimeout()
//   Set accessor of "callTimeout" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setCallTimeout, 1, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;
    uint32_t value;

    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0], &value))
    if (dpiConn_setCallTimeout(conn->handle, value) < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_setClientId()
//   Set accessor of "clientId" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setClientId, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setClientIdentifier);
}


//-----------------------------------------------------------------------------
// njsConnection_setClientInfo()
//   Set accessor of "clientInfo" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setClientInfo, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setClientInfo);
}


//-----------------------------------------------------------------------------
// njsConnection_setCurrentSchema()
//   Set accessor of "currentSchema" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setCurrentSchema, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setCurrentSchema);
}


//-----------------------------------------------------------------------------
// njsConnection_setDbOp()
//   Set accessor of "dbOp" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setDbOp, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setDbOp);
}


//-----------------------------------------------------------------------------
// njsConnection_setECID()
//   Set accessor for "ecid" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setECID, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setEcontextId);
}


//-----------------------------------------------------------------------------
// njsConnection_setExternalName
//   Set accessor of "externalName" property
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setExternalName, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setExternalName);
}


//-----------------------------------------------------------------------------
// njsConnection_setInternalName
//   Set accessor of "InternalName" property
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setInternalName, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setInternalName);
}


//-----------------------------------------------------------------------------
// njsConnection_setModule()
//   Set accessor of "module" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setModule, 1, NULL)
{
    return njsConnection_setTextAttribute(env, callingInstance, globals,
            args[0], dpiConn_setModule);
}


//-----------------------------------------------------------------------------
// njsConnection_setTag()
//   Set accessor of "tag" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsConnection_setTag, 1, NULL)
{
    njsConnection *conn = (njsConnection*) callingInstance;

    if (!njsUtils_copyStringFromJS(env, args[0], &conn->tag, &conn->tagLength))
        return false;
    conn->retag = true;
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_setTextAttribute()
//   Sets the specified text attribute by calling the specified ODPI-C
// function, after validating the connection and the input.
//-----------------------------------------------------------------------------
static bool njsConnection_setTextAttribute(napi_env env,
        njsBaseInstance *instance, njsModuleGlobals *globals,
        napi_value value, int (*setter)(dpiConn*, const char *, uint32_t))
{
    njsConnection *conn = (njsConnection*) instance;
    char *buffer = NULL;
    size_t bufferLength;
    int status;

    // validate connection
    if (!conn->handle)
        return njsUtils_throwError(env, errInvalidConnection);

    // get contents of string
    if (!njsUtils_copyStringFromJS(env, value, &buffer, &bufferLength))
        return false;

    // call the ODPI-C function to set the value
    status = (*setter)(conn->handle, buffer, (uint32_t) bufferLength);
    free(buffer);
    if (status < 0)
        return njsUtils_throwErrorDPI(env, globals);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_shutdown()
//   Initiates a Database Server shutdown with provided option.
//
// PARAMETERS
//   - shutdown mode to use
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_shutdown, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[0],
            &baton->shutdownMode))
    return njsBaton_queueWork(baton, env, "Shutdown",
            njsConnection_shutdownAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_shutdownAsync()
//   Worker thread function for njsConnection_shutdown().
//-----------------------------------------------------------------------------
static bool njsConnection_shutdownAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_shutdownDatabase(conn->handle, baton->shutdownMode))
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_startup()
//   Initiates a Database Server startup (mounting of Database).
//
// PARAMETERS
//   - startup mode to use
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_startup, 1, NULL)
{
    bool force = false, rest = false;

    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "force", &force, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "restrict", &rest, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "pfile", &baton->pfile,
            &baton->pfileLength, NULL))
        return false;

    if (force)
        baton->startupMode |= DPI_MODE_STARTUP_FORCE;
    if (rest)
        baton->startupMode |= DPI_MODE_STARTUP_RESTRICT;

    return njsBaton_queueWork(baton, env, "Startup",
            njsConnection_startupAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_startupAsync()
//   Worker thread function for njsConnection_startup().
//-----------------------------------------------------------------------------
static bool njsConnection_startupAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_startupDatabaseWithPfile(conn->handle, baton->pfile,
            (uint32_t) baton->pfileLength, baton->startupMode))
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_subscribe()
//   Subscribe to events from the database. The provided callback will be
// invoked each time a notification is received. The name is used to uniquely
// identify a subscription and a reference is stored on the njsModuleGlobals
// instance for use by subsequent calls to subscribe() or unsubscribe().
//
// PARAMETERS
//   - name
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_subscribe, 2, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsConnection_subscribeProcessArgs(baton, env, args))
        return false;
    return njsBaton_queueWork(baton, env, "Subscribe",
            njsConnection_subscribeAsync, njsConnection_subscribePostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_subscribeAsync()
//   Worker function for njsConnection_subscribe().
//-----------------------------------------------------------------------------
static bool njsConnection_subscribeAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    dpiSubscrCreateParams params;
    njsVariable *var;
    uint32_t i;
    int status;

    // create subscription, if necessary
    if (!baton->subscription->handle) {
        if (dpiContext_initSubscrCreateParams(baton->globals->context,
                &params) < 0)
            return njsBaton_setErrorDPI(baton);
        params.subscrNamespace = baton->subscription->subscrNamespace;
        params.name = baton->name;
        params.nameLength = (uint32_t) baton->nameLength;
        params.protocol = DPI_SUBSCR_PROTO_CALLBACK;
        params.callback = (dpiSubscrCallback) njsSubscription_eventHandler;
        params.callbackContext = baton->subscription;
        params.ipAddress = baton->ipAddress;
        params.ipAddressLength = (uint32_t) baton->ipAddressLength;
        params.portNumber = baton->portNumber;
        params.timeout = baton->timeout;
        params.qos = baton->qos;
        params.operations = baton->operations;
        params.groupingClass = (uint8_t) baton->subscrGroupingClass;
        params.groupingValue = baton->subscrGroupingValue;
        params.groupingType = (uint8_t) baton->subscrGroupingType;
        params.clientInitiated = baton->clientInitiated;
        if (dpiConn_subscribe(conn->handle, &params,
                &baton->subscription->handle) < 0)
            return njsBaton_setErrorDPI(baton);
        baton->subscription->regId = params.outRegId;
    }

    // register query if applicable
    if (baton->sqlLength > 0) {

        // prepare statement for registration
        if (dpiSubscr_prepareStmt(baton->subscription->handle, baton->sql,
                (uint32_t) baton->sqlLength, &baton->dpiStmtHandle) < 0)
            return njsBaton_setErrorDPI(baton);

        // perform any binds necessary
        for (i = 0; i < baton->numBindVars; i++) {
            var = &baton->bindVars[i];
            if (var->nameLength > 0) {
                status = dpiStmt_bindByName(baton->dpiStmtHandle,
                        var->name, (uint32_t) var->nameLength,
                        var->dpiVarHandle);
            } else {
                status = dpiStmt_bindByPos(baton->dpiStmtHandle, var->pos,
                        var->dpiVarHandle);
            }
            if (status < 0)
                return njsBaton_setErrorDPI(baton);
        }

        // perform execute (which registers the query)
        if (dpiStmt_execute(baton->dpiStmtHandle, DPI_MODE_EXEC_DEFAULT,
                NULL) < 0)
            return njsBaton_setErrorDPI(baton);

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_subscribePostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsConnection_subscribePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    napi_value regId;

    // start notifications
    if (!njsSubscription_startNotifications(baton->subscription, env,
            baton))
        return false;

    // create result object for CQN only; AQ notifications do not produce a
    // meaningful value
    if (baton->subscription->subscrNamespace ==
            DPI_SUBSCR_NAMESPACE_DBCHANGE) {
        NJS_CHECK_NAPI(env, napi_create_object(env, result))
        NJS_CHECK_NAPI(env, napi_create_uint32(env,
                (uint32_t) baton->subscription->regId, &regId))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "regId",
                regId))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_subscribeProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_subscribeProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    napi_value callback, binds;

    // first get the subscription given the name
    if (!njsUtils_getStringArg(env, args, 0, &baton->name, &baton->nameLength))
        return false;
    if (!njsBaton_getSubscription(baton, env, args[0], false))
        return false;

    // if subscription doesn't exist, get options for creating subscription
    if (!baton->subscription->handle) {
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "namespace",
                &baton->subscription->subscrNamespace, NULL))
            return false;
        if (!njsBaton_getStringFromArg(baton, env, args, 1, "ipAddress",
                &baton->ipAddress, &baton->ipAddressLength, NULL))
            return false;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "port",
                &baton->portNumber, NULL))
            return false;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "timeout",
                &baton->timeout, NULL))
            return false;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "operations",
                &baton->operations, NULL))
            return false;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "qos",
                &baton->qos, NULL))
            return false;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1,
                "groupingClass", &baton->subscrGroupingClass, NULL))
            return false;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1,
                "groupingValue", &baton->subscrGroupingValue, NULL))
            return false;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1,
                "groupingType", &baton->subscrGroupingType, NULL))
            return false;
        if (!njsBaton_getBoolFromArg(baton, env, args, 1, "clientInitiated",
                &baton->clientInitiated, NULL))
            return false;
        if (!njsBaton_getValueFromArg(baton, env, args, 1, "callback",
                napi_function, &callback, NULL))
            return false;
        if (!callback)
            return njsBaton_setError(baton, errMissingSubscrCallback);
        NJS_CHECK_NAPI(env, napi_create_reference(env, callback, 1,
                &baton->subscription->jsCallback))
    }

    // get options that are used for registering queries
    if (baton->subscription->subscrNamespace ==
            DPI_SUBSCR_NAMESPACE_DBCHANGE) {
        if (!njsBaton_getStringFromArg(baton, env, args, 1, "sql", &baton->sql,
                &baton->sqlLength, NULL))
            return false;
        if (baton->sqlLength == 0)
            return njsBaton_setError(baton, errMissingSubscrSql);
        if (!njsBaton_getValueFromArg(baton, env, args, 1, "binds",
                napi_object, &binds, NULL))
            return false;
        if (binds && !njsConnection_processBinds(baton, env, binds))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcBegin()
//   Two-phase-commit Begin transaction
//
// PARAMETERS
//   - xid
//   - flags
//   - timeout
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_tpcBegin, 3, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[1], &baton->tpcFlags))
    NJS_CHECK_NAPI(env, napi_get_value_uint32(env, args[2],
            &baton->tpcTxnTimeout))
    return njsBaton_queueWork(baton, env, "tpcBegin",
        njsConnection_tpcBeginAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_tpcBeginAsync()
//   Worker thread function for njsConnection_tpcBegin().
//-----------------------------------------------------------------------------
static bool njsConnection_tpcBeginAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_tpcBegin(conn->handle, baton->xid, baton->tpcTxnTimeout,
            baton->tpcFlags) < 0) {
        return njsBaton_setErrorDPI(baton);
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcCommit()
//   Two-phase-commit
//
// PARAMETERS
//   - xid
//   - onePhase (boolean)
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_tpcCommit, 2, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;
    if (!njsUtils_getBoolArg(env, args, 1, &baton->tpcOnePhase))
        return false;
    return njsBaton_queueWork(baton, env, "tpcCommit",
        njsConnection_tpcCommitAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_tpcCommitAsync()
//   Worker thread function for njsConnection_tpcCommit().
//-----------------------------------------------------------------------------
static bool njsConnection_tpcCommitAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection *)baton->callingInstance;

    if (dpiConn_tpcCommit(conn->handle, baton->xid, baton->tpcOnePhase)
            < 0) {
        return njsBaton_setErrorDPI(baton);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcEnd()
//   Two-phase-end
//
// PARAMETERS
//   Xid
//   Flags
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_tpcEnd, 2, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;
    if (!njsUtils_getUnsignedIntArg(env, args, 1, &baton->tpcFlags))
        return false;
    return njsBaton_queueWork(baton, env, "tpcEnd", njsConnection_tpcEndAsync,
            NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_tpcEndAsync()
//   Worker thread function for njsConnection_tpcEnd().
//-----------------------------------------------------------------------------
static bool njsConnection_tpcEndAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection *) baton->callingInstance;

    if (dpiConn_tpcEnd(conn->handle, baton->xid, baton->tpcFlags) < 0) {
        return njsBaton_setErrorDPI(baton);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcForget()
//
// PARAMETERS
//  - xid
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_tpcForget, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "tpcForget",
        njsConnection_tpcForgetAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_tpcForgetAsync()
//   Worker thread function for njsConnection_tpcForget().
//-----------------------------------------------------------------------------
static bool njsConnection_tpcForgetAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_tpcForget(conn->handle, baton->xid) < 0) {
        return njsBaton_setErrorDPI(baton);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcPrepare()
//   Prepare the two-phase-commit
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_tpcPrepare, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "tpcPrepare",
        njsConnection_tpcPrepareAsync, njsConnection_tpcPreparePostAsync,
        returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_tpcPrepareAsync()
//   Worker thread function for njsConnection_tpcPrepare().
//-----------------------------------------------------------------------------
static bool njsConnection_tpcPrepareAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection *) baton->callingInstance;

    int commitNeeded = 0;

    if (dpiConn_tpcPrepare(conn->handle, baton->xid, &commitNeeded)
            < 0) {
        return njsBaton_setErrorDPI(baton);
    }
    baton->tpcCommitNeeded = (commitNeeded) ? true : false;
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcPreparePostAsync()
//   Methoed to return the "commitNeeded" status
//-----------------------------------------------------------------------------
static bool njsConnection_tpcPreparePostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->tpcCommitNeeded, result))
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcRollback()
//   Rollbacks the two-phase-commit
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_tpcRollback, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;
    return njsBaton_queueWork(baton, env, "tpcRollback",
            njsConnection_tpcRollbackAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_tpcRollbackAsync()
//   Worker thread function for njsconnection_tpcRollback()
//-----------------------------------------------------------------------------
static bool njsConnection_tpcRollbackAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection *) baton->callingInstance;

    if (dpiConn_tpcRollback(conn->handle, baton->xid) < 0) {
        return njsBaton_setErrorDPI(baton);
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_unsubscribe()
//   Unsubscribe from events in the database that were originally subscribed
// with a call to connection.subscribe().
//
// PARAMETERS
//   - name
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsConnection_unsubscribe, 1, NULL)
{
    if (!njsConnection_check(baton))
        return false;
    if (!njsBaton_getSubscription(baton, env, args[0], true))
        return false;
    return njsBaton_queueWork(baton, env, "Unsubscribe",
            njsConnection_unsubscribeAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsConnection_unsubscribeAsync()
//   Worker function for njsConnection_unsubscribe().
//-----------------------------------------------------------------------------
static bool njsConnection_unsubscribeAsync(njsBaton *baton)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;

    if (dpiConn_unsubscribe(conn->handle, baton->subscription->handle) < 0)
        return njsBaton_setErrorDPI(baton);

    baton->subscription->handle = NULL;
    njsSubscription_stopNotifications(baton->subscription);
    baton->subscription = NULL;
    return true;
}
