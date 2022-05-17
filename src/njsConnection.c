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
//   njsConnection.c
//
// DESCRIPTION
//   Connection class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsConnection_break);
static NJS_NAPI_METHOD(njsConnection_changePassword);
static NJS_NAPI_METHOD(njsConnection_close);
static NJS_NAPI_METHOD(njsConnection_commit);
static NJS_NAPI_METHOD(njsConnection_createLob);
static NJS_NAPI_METHOD(njsConnection_execute);
static NJS_NAPI_METHOD(njsConnection_executeMany);
static NJS_NAPI_METHOD(njsConnection_getDbObjectClass);
static NJS_NAPI_METHOD(njsConnection_getQueue);
static NJS_NAPI_METHOD(njsConnection_getSodaDatabase);
static NJS_NAPI_METHOD(njsConnection_getStatementInfo);
static NJS_NAPI_METHOD(njsConnection_isHealthy);
static NJS_NAPI_METHOD(njsConnection_ping);
static NJS_NAPI_METHOD(njsConnection_rollback);
static NJS_NAPI_METHOD(njsConnection_shutdown);
static NJS_NAPI_METHOD(njsConnection_startup);
static NJS_NAPI_METHOD(njsConnection_subscribe);
static NJS_NAPI_METHOD(njsConnection_tpcBegin);
static NJS_NAPI_METHOD(njsConnection_tpcCommit);
static NJS_NAPI_METHOD(njsConnection_tpcEnd);
static NJS_NAPI_METHOD(njsConnection_tpcForget);
static NJS_NAPI_METHOD(njsConnection_tpcPrepare);
static NJS_NAPI_METHOD(njsConnection_tpcRollback);
static NJS_NAPI_METHOD(njsConnection_unsubscribe);

// asynchronous methods
static NJS_ASYNC_METHOD(njsConnection_breakAsync);
static NJS_ASYNC_METHOD(njsConnection_changePasswordAsync);
static NJS_ASYNC_METHOD(njsConnection_closeAsync);
static NJS_ASYNC_METHOD(njsConnection_commitAsync);
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
static NJS_ASYNC_POST_METHOD(njsConnection_createLobPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_executePostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_executeManyPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_getDbObjectClassPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_getQueuePostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_getStatementInfoPostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_tpcPreparePostAsync);
static NJS_ASYNC_POST_METHOD(njsConnection_subscribePostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsConnection_changePasswordProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_createLobProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_executeProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_executeManyProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_getDbObjectClassProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_getQueueProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_getStatementInfoProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_startupProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_tpcBeginProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_tpcCommitProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_tpcEndProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_tpcForgetProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_tpcPrepareProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_tpcRollbackProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsConnection_subscribeProcessArgs);

// getters
static NJS_NAPI_GETTER(njsConnection_getAction);
static NJS_NAPI_GETTER(njsConnection_getCallTimeout);
static NJS_NAPI_GETTER(njsConnection_getClientId);
static NJS_NAPI_GETTER(njsConnection_getClientInfo);
static NJS_NAPI_GETTER(njsConnection_getCurrentSchema);
static NJS_NAPI_GETTER(njsConnection_getDbOp);
static NJS_NAPI_GETTER(njsConnection_getExternalName);
static NJS_NAPI_GETTER(njsConnection_getInternalName);
static NJS_NAPI_GETTER(njsConnection_getModule);
static NJS_NAPI_GETTER(njsConnection_getOracleServerVersion);
static NJS_NAPI_GETTER(njsConnection_getOracleServerVersionString);
static NJS_NAPI_GETTER(njsConnection_getStmtCacheSize);
static NJS_NAPI_GETTER(njsConnection_getTag);

// setters
static NJS_NAPI_SETTER(njsConnection_setAction);
static NJS_NAPI_SETTER(njsConnection_setCallTimeout);
static NJS_NAPI_SETTER(njsConnection_setClientId);
static NJS_NAPI_SETTER(njsConnection_setClientInfo);
static NJS_NAPI_SETTER(njsConnection_setCurrentSchema);
static NJS_NAPI_SETTER(njsConnection_setDbOp);
static NJS_NAPI_SETTER(njsConnection_setECID);
static NJS_NAPI_SETTER(njsConnection_setExternalName);
static NJS_NAPI_SETTER(njsConnection_setInternalName);
static NJS_NAPI_SETTER(njsConnection_setModule);
static NJS_NAPI_SETTER(njsConnection_setTag);

// finalize
static NJS_NAPI_FINALIZE(njsConnection_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_break", NULL, njsConnection_break, NULL, NULL, NULL,
            napi_default, NULL },
    { "_changePassword", NULL, njsConnection_changePassword, NULL, NULL,
            NULL, napi_default, NULL },
    { "_close", NULL, njsConnection_close, NULL, NULL, NULL,
            napi_default, NULL },
    { "_commit", NULL, njsConnection_commit, NULL, NULL, NULL,
            napi_default, NULL },
    { "_createLob", NULL, njsConnection_createLob, NULL, NULL, NULL,
            napi_default, NULL },
    { "_execute", NULL, njsConnection_execute, NULL, NULL, NULL,
            napi_default, NULL },
    { "_executeMany", NULL, njsConnection_executeMany, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getDbObjectClass", NULL, njsConnection_getDbObjectClass, NULL, NULL,
            NULL, napi_default, NULL },
    { "_getQueue", NULL, njsConnection_getQueue, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getSodaDatabase", NULL, njsConnection_getSodaDatabase, NULL, NULL,
            NULL, napi_default, NULL },
    { "_getStatementInfo", NULL, njsConnection_getStatementInfo, NULL,
            NULL, NULL, napi_default, NULL },
    { "_isHealthy", NULL, njsConnection_isHealthy, NULL, NULL, NULL,
            napi_default, NULL },
    { "_ping", NULL, njsConnection_ping, NULL, NULL, NULL, napi_default,
            NULL },
    { "_rollback", NULL, njsConnection_rollback, NULL, NULL, NULL,
            napi_default, NULL },
    { "_shutdown", NULL, njsConnection_shutdown, NULL, NULL, NULL,
            napi_default, NULL },
    { "_startup", NULL, njsConnection_startup, NULL, NULL, NULL,
            napi_default, NULL },
    { "_subscribe", NULL, njsConnection_subscribe, NULL, NULL, NULL,
            napi_default, NULL },
    { "_tpcBegin", NULL, njsConnection_tpcBegin, NULL, NULL, NULL,
            napi_default, NULL },
    { "_tpcCommit", NULL, njsConnection_tpcCommit, NULL, NULL, NULL,
            napi_default, NULL },
    { "_tpcEnd", NULL, njsConnection_tpcEnd, NULL, NULL, NULL,
            napi_default, NULL },
    { "_tpcForget", NULL, njsConnection_tpcForget, NULL, NULL, NULL,
            napi_default, NULL },
    { "_tpcPrepare", NULL, njsConnection_tpcPrepare, NULL, NULL, NULL,
            napi_default, NULL },
    { "_tpcRollback", NULL, njsConnection_tpcRollback, NULL, NULL, NULL,
            napi_default, NULL },
    { "_unsubscribe", NULL, njsConnection_unsubscribe, NULL, NULL, NULL,
            napi_default, NULL },
    { "action", NULL, NULL, njsConnection_getAction, njsConnection_setAction,
            NULL, napi_default, NULL },
    { "callTimeout", NULL, NULL, njsConnection_getCallTimeout,
            njsConnection_setCallTimeout, NULL, napi_default, NULL },
    { "clientId", NULL, NULL, njsConnection_getClientId,
            njsConnection_setClientId, NULL, napi_default, NULL },
    { "clientInfo", NULL, NULL, njsConnection_getClientInfo,
            njsConnection_setClientInfo, NULL, napi_default, NULL },
    { "currentSchema", NULL, NULL, njsConnection_getCurrentSchema,
            njsConnection_setCurrentSchema, NULL, napi_default, NULL },
    { "dbOp", NULL, NULL, njsConnection_getDbOp, njsConnection_setDbOp, NULL,
            napi_default, NULL },
    { "ecid", NULL, NULL, NULL, njsConnection_setECID, NULL, napi_default,
            NULL },
    { "externalName", NULL, NULL, njsConnection_getExternalName,
            njsConnection_setExternalName, NULL, napi_default, NULL },
    { "internalName", NULL, NULL, njsConnection_getInternalName,
            njsConnection_setInternalName, NULL, napi_default, NULL },
    { "module", NULL, NULL, njsConnection_getModule, njsConnection_setModule,
            NULL, napi_default, NULL },
    { "oracleServerVersion", NULL, NULL, njsConnection_getOracleServerVersion,
            NULL, NULL, napi_default, NULL },
    { "oracleServerVersionString", NULL, NULL,
            njsConnection_getOracleServerVersionString, NULL, NULL,
            napi_default, NULL },
    { "stmtCacheSize", NULL, NULL, njsConnection_getStmtCacheSize, NULL, NULL,
            napi_default, NULL },
    { "tag", NULL, NULL, njsConnection_getTag, njsConnection_setTag, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefConnection = {
    "Connection", sizeof(njsConnection), njsConnection_finalize,
    njsClassProperties, NULL, false
};

// other methods used internally
static bool njsConnection_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton);
static bool njsConnection_getBatchErrors(njsBaton *baton, napi_env env,
        napi_value *batchErrors);
static bool njsConnection_getBindInfoFromArray(njsBaton *baton,
        napi_env env, napi_value value, uint32_t *bindType, uint32_t *maxSize,
        dpiObjectType **objectTypeHandle);
static bool njsConnection_getBindInfoFromValue(njsBaton *baton,
        bool scalarOnly, napi_env env, napi_value value, uint32_t *bindType,
        uint32_t *maxSize, dpiObjectType **objectTypeHandle);
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
static bool njsConnection_initBindVars(njsBaton *baton, napi_env env,
        napi_value binds, napi_value bindNames);
static bool njsConnection_prepareAndBind(njsConnection *conn, njsBaton *baton);
static bool njsConnection_processExecuteBinds(njsBaton *baton,
        napi_env env, napi_value binds);
static bool njsConnection_processExecuteManyBinds(njsBaton *baton,
        napi_env env, napi_value binds, napi_value options);
static bool njsConnection_processImplicitResults(njsBaton *baton);
static bool njsConnection_scanExecuteBinds(njsBaton *baton, napi_env env,
        napi_value binds, napi_value bindNames);
static bool njsConnection_scanExecuteBindUnit(njsBaton *baton,
        njsVariable *var, bool inExecuteMany, napi_env env,
        napi_value bindUnit, napi_value *bindValue);
static bool njsConnection_scanExecuteManyBinds(njsBaton *baton,
        napi_env env, napi_value binds, napi_value bindNames);
static napi_value njsConnection_setTextAttribute(napi_env env,
        napi_callback_info info, const char *attributeName,
        int (*setter)(dpiConn*, const char *, uint32_t));
static bool njsConnection_transferExecuteManyBinds(njsBaton *baton,
        napi_env env, napi_value binds, napi_value bindNames);


//-----------------------------------------------------------------------------
// njsConnection_break()
//   Break (interrupt) the currently executing operation.
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsConnection_break(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "Break", njsConnection_breakAsync,
            NULL);
}


//-----------------------------------------------------------------------------
// njsConnection_breakAsync()
//   Worker function for njsConnection_break().
//-----------------------------------------------------------------------------
static bool njsConnection_breakAsync(njsBaton *baton)
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
static napi_value njsConnection_changePassword(napi_env env,
        napi_callback_info info)
{
    napi_value args[3];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 3, args, &baton))
        return NULL;
    if (!njsConnection_changePasswordProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "ChangePassword",
            njsConnection_changePasswordAsync, NULL);
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
// njsConnection_changePasswordProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_changePasswordProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsUtils_getStringArg(env, args, 0, &baton->user, &baton->userLength))
        return false;
    if (!njsUtils_getStringArg(env, args, 1, &baton->password,
            &baton->passwordLength))
        return false;
    if (!njsUtils_getStringArg(env, args, 2, &baton->newPassword,
            &baton->newPasswordLength))
        return false;

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
static napi_value njsConnection_close(napi_env env, napi_callback_info info)
{
    njsConnection *conn;
    napi_value args[1];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "drop",
            &baton->dropSession, NULL)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    conn = (njsConnection*) baton->callingInstance;
    baton->dpiConnHandle = conn->handle;
    conn->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsConnection_closeAsync,
            NULL);
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
static napi_value njsConnection_commit(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "Commit", njsConnection_commitAsync,
            NULL);
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
// njsConnection_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. The connection is also checked to see if it is open. If this fails
// for some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsConnection_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsConnection *conn;
    njsBaton *tempBaton;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    conn = (njsConnection*) tempBaton->callingInstance;
    if (!conn->handle) {
        njsBaton_setError(tempBaton, errInvalidConnection);
        njsBaton_reportError(tempBaton, env);
        return false;
    }
    tempBaton->oracleDb = conn->oracleDb;

    *baton = tempBaton;
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_createLob()
//   Create a new temporary LOB and return it for use by the application.
//
// PARAMETERS
//   - LOB type
//-----------------------------------------------------------------------------
static napi_value njsConnection_createLob(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsConnection_createLobProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "CreateLob",
            njsConnection_createLobAsync, njsConnection_createLobPostAsync);
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
    return njsLob_new(baton->oracleDb, baton->lob, env, connObj, result);
}


//-----------------------------------------------------------------------------
// njsConnection_createLobProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_createLobProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->lobType))
        return false;
    if (baton->lobType != DPI_ORACLE_TYPE_CLOB &&
            baton->lobType != DPI_ORACLE_TYPE_BLOB &&
            baton->lobType != DPI_ORACLE_TYPE_NCLOB)
        return njsUtils_throwError(env, errInvalidParameterValue, 1);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_execute()
//   Executes a statement on the connection.
//
// PARAMETERS
//   - SQL statement
//   - binds object/array
//   - options
//-----------------------------------------------------------------------------
static napi_value njsConnection_execute(napi_env env,
        napi_callback_info info)
{
    napi_value args[3];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 3, args, &baton))
        return NULL;
    if (!njsConnection_executeProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Execute",
            njsConnection_executeAsync, njsConnection_executePostAsync);
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
                env, baton->extendedMetaData, &metadata))
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
// njsConnection_executeProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_executeProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    bool getResultSet = false;

    // setup defaults and define constructors for use in various checks
    baton->autoCommit = baton->oracleDb->autoCommit;
    baton->dbObjectAsPojo = baton->oracleDb->dbObjectAsPojo;
    baton->fetchArraySize = baton->oracleDb->fetchArraySize;
    baton->maxRows = baton->oracleDb->maxRows;
    baton->outFormat = baton->oracleDb->outFormat;
    baton->extendedMetaData = baton->oracleDb->extendedMetaData;
    baton->prefetchRows = baton->oracleDb->prefetchRows;
    baton->keepInStmtCache = true;

    if (!njsUtils_copyArray(env, baton->oracleDb->fetchAsBufferTypes,
            baton->oracleDb->numFetchAsBufferTypes, sizeof(uint32_t),
            (void**) &baton->fetchAsBufferTypes,
            &baton->numFetchAsBufferTypes))
        return false;
    if (!njsUtils_copyArray(env, baton->oracleDb->fetchAsStringTypes,
            baton->oracleDb->numFetchAsStringTypes, sizeof(uint32_t),
            (void**) &baton->fetchAsStringTypes,
            &baton->numFetchAsStringTypes))
        return false;
    if (!njsBaton_setJsValues(baton, env))
        return false;

    // get SQL from first argument
    if (!njsUtils_getStringArg(env, args, 0, &baton->sql, &baton->sqlLength))
        return false;

    // validate options in third argument
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 2, "maxRows",
            &baton->maxRows, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 2, "fetchArraySize",
            &baton->fetchArraySize, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 2, "prefetchRows",
            &baton->prefetchRows, NULL))
        return false;
    if (baton->fetchArraySize == 0)
        return njsBaton_setError(baton, errInvalidPropertyValueInParam,
                "fetchArraySize", 3);
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 2, "outFormat",
            &baton->outFormat, NULL))
        return false;
    if (baton->outFormat != NJS_ROWS_ARRAY &&
            baton->outFormat != NJS_ROWS_OBJECT)
        return njsBaton_setError(baton, errInvalidPropertyValue, "outFormat");
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "resultSet",
            &getResultSet, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "autoCommit",
            &baton->autoCommit, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "extendedMetaData",
            &baton->extendedMetaData, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "dbObjectAsPojo",
            &baton->dbObjectAsPojo, NULL))
        return false;
    if (!njsBaton_getFetchInfoFromArg(baton, env, args, 2, "fetchInfo",
            &baton->numFetchInfo, &baton->fetchInfo, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "keepInStmtCache",
            &baton->keepInStmtCache, NULL))
        return false;

    // validate binds in second argument; these must be done after options are
    // processed as those options may influence how bind variables are created
    if (!njsConnection_processExecuteBinds(baton, env, args[1]))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_executeMany()
//   Executes a statement on the connection multiple times, once for each row
// of data that is passed.
//
// PARAMETERS
//   - SQL statement
//   - array of binds (or number of rows to process)
//   - options
//-----------------------------------------------------------------------------
static napi_value njsConnection_executeMany(napi_env env,
        napi_callback_info info)
{
    napi_value args[3];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 3, args, &baton))
        return NULL;
    if (!njsConnection_executeManyProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "ExecuteMany",
            njsConnection_executeManyAsync,
            njsConnection_executeManyPostAsync);
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
// njsConnection_executeManyProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_executeManyProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    // setup defaults and set JavaScript values to simplify creation of
    // returned objects
    baton->keepInStmtCache = true;
    baton->autoCommit = baton->oracleDb->autoCommit;
    if (!njsBaton_setJsValues(baton, env))
        return false;

    // get SQL from first argument
    if (!njsUtils_getStringArg(env, args, 0, &baton->sql, &baton->sqlLength))
        return false;

    // process execute many binds
    if (!njsConnection_processExecuteManyBinds(baton, env, args[1], args[2]))
        return false;

    // process options
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "autoCommit",
            &baton->autoCommit, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "batchErrors",
            &baton->batchErrors, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "dmlRowCounts",
            &baton->dmlRowCounts, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 2, "keepInStmtCache",
            &baton->keepInStmtCache, NULL))
        return false;

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
// njsConnection_getAction()
//   Get accessor of "action" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getAction(napi_env env,
        napi_callback_info info)
{
    return njsUtils_getNull(env);
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
// njsConnection_getBindInfoFromArray()
//   Get the bind type, maximum size and object type handle from the array.
//-----------------------------------------------------------------------------
static bool njsConnection_getBindInfoFromArray(njsBaton *baton,
        napi_env env, napi_value value, uint32_t *bindType, uint32_t *maxSize,
        dpiObjectType **objectTypeHandle)
{
    uint32_t arrayLength, i, elementBindType, elementMaxSize;
    dpiObjectType *elementObjectTypeHandle;
    napi_valuetype valueType;
    napi_value element;

    // determine the length of the array
    NJS_CHECK_NAPI(env, napi_get_array_length(env, value, &arrayLength))

    // check each element of the array
    for (i = 0; i < arrayLength; i++) {
        NJS_CHECK_NAPI(env, napi_get_element(env, value, i, &element))
        NJS_CHECK_NAPI(env, napi_typeof(env, element, &valueType))
        if (valueType == napi_undefined || valueType == napi_null)
            continue;
        elementBindType = *bindType;
        elementMaxSize = *maxSize;
        elementObjectTypeHandle = *objectTypeHandle;
        if (!njsConnection_getBindInfoFromValue(baton, true, env,
                element, &elementBindType, &elementMaxSize,
                &elementObjectTypeHandle))
            return false;
        if (*bindType == NJS_DATATYPE_DEFAULT)
            *bindType = elementBindType;
        if (elementMaxSize > *maxSize)
            *maxSize = elementMaxSize;
        if (!*objectTypeHandle && elementObjectTypeHandle)
            *objectTypeHandle = elementObjectTypeHandle;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getBindInfoFromValue()
//   Get the bind type, maximum size and object type handle from the specified
// value.
//-----------------------------------------------------------------------------
static bool njsConnection_getBindInfoFromValue(njsBaton *baton,
        bool scalarOnly, napi_env env, napi_value value, uint32_t *bindType,
        uint32_t *maxSize, dpiObjectType **objectTypeHandle)
{
    napi_valuetype valueType;
    size_t tempLength;
    njsDbObject *obj;
    void *buffer;
    njsLob *lob;
    bool check;

    // determine the type of the value
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))

    // null and undefined are treated as single character strings
    if (valueType == napi_undefined || valueType == napi_null) {
        *bindType = NJS_DATATYPE_STR;
        *maxSize = 1;
        return true;
    }

    // for strings, the length of the string in bytes is determined
    if (valueType == napi_string) {
        *bindType = NJS_DATATYPE_STR;
        NJS_CHECK_NAPI(env, napi_get_value_string_utf8(env, value, NULL, 0,
                &tempLength))
        *maxSize = (uint32_t) tempLength;
        return true;
    }

    // numbers can be bound
    if (valueType == napi_number) {
        *bindType = NJS_DATATYPE_NUM;
        return true;
    }

    // booleans
    if (valueType == napi_boolean) {
        *bindType = NJS_DATATYPE_BOOLEAN;
        return true;
    }

    // dates, LOBs, buffers and arrays are all objects
    if (valueType == napi_object) {

        // dates can be bound
        if (!njsBaton_isDate(baton, env, value, &check))
            return false;
        if (check) {
            *bindType = NJS_DATATYPE_DATE;
            return true;
        }

        // buffers can be bound
        NJS_CHECK_NAPI(env, napi_is_buffer(env, value, &check))
        if (check) {
            *bindType = NJS_DATATYPE_BUFFER;
            NJS_CHECK_NAPI(env, napi_get_buffer_info(env, value, &buffer,
                    &tempLength))
            *maxSize = (uint32_t) tempLength;
            return true;
        }

        // LOBs can be bound
        NJS_CHECK_NAPI(env, napi_instanceof(env, value,
                baton->jsLobConstructor, &check))
        if (check) {
            NJS_CHECK_NAPI(env, napi_unwrap(env, value, (void**) &lob))
            *bindType = lob->dataType;
            return true;
        }

        // result sets can be bound
        NJS_CHECK_NAPI(env, napi_instanceof(env, value,
                baton->jsResultSetConstructor, &check))
        if (check) {
            *bindType = NJS_DATATYPE_CURSOR;
            return true;
        }

        // database objects can be bound
        NJS_CHECK_NAPI(env, napi_instanceof(env, value,
                baton->jsBaseDbObjectConstructor, &check))
        if (check) {
            *bindType = NJS_DATATYPE_OBJECT;
            if (!njsDbObject_getInstance(baton->oracleDb, env, value, &obj))
                return false;
            *objectTypeHandle = obj->type->handle;
            return true;
        }

        // arrays can be bound (if not already processing an array)
        if (!scalarOnly) {
            NJS_CHECK_NAPI(env, napi_is_array(env, value, &check))
            if (check)
                return njsConnection_getBindInfoFromArray(baton, env,
                        value, bindType, maxSize, objectTypeHandle);
        }

    }

    // no value that can be bound was found; only raise an exception, however
    // if no data type is already available
    if (*bindType == NJS_DATATYPE_DEFAULT)
        return njsBaton_setError(baton, errInvalidBindDataType, 2);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getCallTimeout()
//   Get accessor of "callTimeout" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getCallTimeout(napi_env env,
        napi_callback_info info)
{
    dpiVersionInfo versionInfo;
    uint32_t callTimeout;
    njsConnection *conn;

    // return undefined for an invalid connection
    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &conn))
        return NULL;
    if (!conn->handle)
        return NULL;

    // if an Oracle Client less than 18.1 is being used, return undefined
    if (dpiContext_getClientVersion(conn->oracleDb->context,
            &versionInfo) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    if (versionInfo.versionNum < 18)
        return NULL;

    // get value and return it
    if (dpiConn_getCallTimeout(conn->handle, &callTimeout) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, callTimeout);
}


//-----------------------------------------------------------------------------
// njsConnection_getClientId()
//   Get accessor of "clientId" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getClientId(napi_env env,
        napi_callback_info info)
{
    return njsUtils_getNull(env);
}


//-----------------------------------------------------------------------------
// njsConnection_getClientInfo()
//   Get accessor of "clientInfo" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getClientInfo(napi_env env,
        napi_callback_info info)
{
    return njsUtils_getNull(env);
}


//-----------------------------------------------------------------------------
// njsConnection_getCurrentSchema()
//   Get accessor of "currentSchema" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getCurrentSchema(napi_env env,
        napi_callback_info info)
{
    uint32_t valueLength;
    njsConnection *conn;
    const char *value;

    // return undefined for an invalid connection
    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &conn))
        return NULL;
    if (!conn->handle)
        return NULL;

    // get value and return it
    if (dpiConn_getCurrentSchema(conn->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    return njsUtils_convertToString(env, value, valueLength);
}


//-----------------------------------------------------------------------------
// njsConnection_getDbObjectClass()
//   Looks up a database object type given its name and returns it to the
// caller.
//
// PARAMETERS
//   - name
//-----------------------------------------------------------------------------
static napi_value njsConnection_getDbObjectClass(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsConnection_getDbObjectClassProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetDbObjectClass",
            njsConnection_getDbObjectClassAsync,
            njsConnection_getDbObjectClassPostAsync);
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
// njsConnection_getDbObjectClassProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_getDbObjectClassProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsUtils_getStringArg(env, args, 0, &baton->name, &baton->nameLength))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getDbOp()
//   Get accessor of "dbOp" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getDbOp(napi_env env,
        napi_callback_info info)
{
    return njsUtils_getNull(env);
}


//-----------------------------------------------------------------------------
// njsConnection_getExternalName()
//   Get accessor for "externalName" property
//-----------------------------------------------------------------------------
static napi_value njsConnection_getExternalName(napi_env env,
        napi_callback_info info)
{
    njsConnection *conn;
    const char    *value;
    uint32_t       valueLength;

    // return undefined for an invalid connection
    if (!njsUtils_validateGetter(env, info, (njsBaseInstance **)&conn))
        return NULL;
    if (!conn->handle)
        return NULL;

    // get value and return it
    if (dpiConn_getExternalName(conn->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    return njsUtils_convertToString(env, value, valueLength);
}



//-----------------------------------------------------------------------------
// njsConnection_getInternalName()
//   Get accessor for "internalName" property
//-----------------------------------------------------------------------------
static napi_value njsConnection_getInternalName(napi_env env,
        napi_callback_info info)
{
    njsConnection *conn;
    const char    *value;
    uint32_t       valueLength;

    // return undefined for an invalid connection
    if (!njsUtils_validateGetter(env, info, (njsBaseInstance **)&conn))
        return NULL;
    if (!conn->handle)
        return NULL;

    // get value and return it
    if (dpiConn_getInternalName(conn->handle, &value, &valueLength) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    return njsUtils_convertToString(env, value, valueLength);
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
// njsConnection_getModule()
//   Get accessor of "module" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getModule(napi_env env,
        napi_callback_info info)
{
    return njsUtils_getNull(env);
}


//-----------------------------------------------------------------------------
// njsConnection_getOracleServerVersion()
//   Get accessor of "oracleServerVersion" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getOracleServerVersion(napi_env env,
        napi_callback_info info)
{
    dpiVersionInfo versionInfo;
    njsConnection *conn;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &conn))
        return NULL;
    if (!conn->handle)
        return NULL;
    if (dpiConn_getServerVersion(conn->handle, NULL, NULL, &versionInfo) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, versionInfo.fullVersionNum);
}


//-----------------------------------------------------------------------------
// njsConnection_getOracleServerVersionString()
//   Get accessor of "oracleServerVersionString" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getOracleServerVersionString(napi_env env,
        napi_callback_info info)
{
    dpiVersionInfo versionInfo;
    char versionString[40];
    njsConnection *conn;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &conn))
        return NULL;
    if (!conn->handle)
        return NULL;
    if (dpiConn_getServerVersion(conn->handle, NULL, NULL, &versionInfo) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    (void) snprintf(versionString, sizeof(versionString), "%d.%d.%d.%d.%d",
            versionInfo.versionNum, versionInfo.releaseNum,
            versionInfo.updateNum, versionInfo.portReleaseNum,
            versionInfo.portUpdateNum);
    return njsUtils_convertToString(env, versionString,
            (uint32_t) strlen(versionString));
}


//-----------------------------------------------------------------------------
// njsConnection_getQueue()
//   Creates an AQ queue associated with the connection.
//
// PARAMETERS
//   - name of queue to create
//   - options object
//-----------------------------------------------------------------------------
static napi_value njsConnection_getQueue(napi_env env, napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsConnection_getQueueProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetQueue",
            njsConnection_getQueueAsync, njsConnection_getQueuePostAsync);
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
    napi_value typeObj, prototype;
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
        NJS_CHECK_NAPI(env, napi_get_prototype(env, typeObj, &prototype))
        NJS_CHECK_NAPI(env, napi_strict_equals(env, prototype,
                baton->jsBaseDbObjectConstructor, &ok))
        if (ok) {
            if (!njsDbObjectType_getFromClass(env, typeObj, &objType))
                return false;
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
static napi_value njsConnection_getSodaDatabase(napi_env env,
        napi_callback_info info)
{
    napi_value dbObj, connObj;
    njsConnection *conn;
    dpiSodaDb *dbHandle;

    if (!njsUtils_validateArgs(env, info, 0, NULL, &connObj,
            (njsBaseInstance**) &conn))
        return NULL;
    if (!conn->handle) {
        njsUtils_throwError(env, errInvalidConnection);
        return NULL;
    }
    if (dpiConn_getSodaDb(conn->handle, &dbHandle) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    if (!njsSodaDatabase_createFromHandle(env, connObj, conn, dbHandle,
            &dbObj))
        return NULL;

    return dbObj;
}


//-----------------------------------------------------------------------------
// njsConnection_getStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getStmtCacheSize(napi_env env,
        napi_callback_info info)
{
    njsConnection *conn;
    uint32_t cacheSize;
    napi_value value;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &conn))
        return NULL;
    if (!conn->handle)
        return NULL;
    if (dpiConn_getStmtCacheSize(conn->handle, &cacheSize) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        return NULL;
    }
    if (napi_create_uint32(env, cacheSize, &value) != napi_ok) {
        njsUtils_genericThrowError(env);
        return NULL;
    }
    return value;
}


//-----------------------------------------------------------------------------
// njsConnection_getStatementInfo()
//   Parses a statement on the connection and returns information about the
// statement.
//
// PARAMETERS
//   - SQL statement
//-----------------------------------------------------------------------------
static napi_value njsConnection_getStatementInfo(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    baton->extendedMetaData = true;
    if (!njsConnection_getStatementInfoProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetStatementInfo",
            njsConnection_getStatementInfoAsync,
            njsConnection_getStatementInfoPostAsync);
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
                env, baton->extendedMetaData, &metadata))
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
// njsConnection_getStatementInfoProcessArgs()
//   Processes the arguments provided by the caller and place them on the
// baton.
//-----------------------------------------------------------------------------
static bool njsConnection_getStatementInfoProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    if (!njsUtils_getStringArg(env, args, 0, &baton->sql, &baton->sqlLength))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_getTag()
//   Get accessor of "tag" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_getTag(napi_env env,
        napi_callback_info info)
{
    njsConnection *conn;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &conn))
        return NULL;
    return njsUtils_convertToString(env, conn->tag,
            (uint32_t) conn->tagLength);
}


//-----------------------------------------------------------------------------
// njsConnection_initBindVars()
//   Initialize bind variables using the given bind object/array as a
// template.
//-----------------------------------------------------------------------------
static bool njsConnection_initBindVars(njsBaton *baton, napi_env env,
        napi_value binds, napi_value bindNames)
{
    napi_value name, element;
    njsVariable *var;
    uint32_t i;

    // determine the number of bind variables; if none are provided, nothing
    // further needs to be done
    if (bindNames) {
        NJS_CHECK_NAPI(env, napi_get_array_length(env, bindNames,
                &baton->numBindVars))
    } else {
        NJS_CHECK_NAPI(env, napi_get_array_length(env, binds,
                &baton->numBindVars))
    }
    if (baton->numBindVars == 0)
        return true;

    // allocate memory for the bind variables
    baton->bindVars = calloc(baton->numBindVars, sizeof(njsVariable));
    if (!baton->bindVars)
        return njsBaton_setError(baton, errInsufficientMemory);

    // initialize bind variables by setting either the position or the name
    for (i = 0; i < baton->numBindVars; i++) {
        var = &baton->bindVars[i];
        var->bindDir = NJS_BIND_IN;
        if (!bindNames) {
            var->pos = i + 1;
        } else {
            NJS_CHECK_NAPI(env, napi_get_element(env, bindNames, i, &element))
            NJS_CHECK_NAPI(env, napi_coerce_to_string(env, element, &name))
            if (!njsUtils_copyStringFromJS(env, name, &var->name,
                    &var->nameLength))
                return false;
        }
    }

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
            baton->oracleDb->jsConnectionConstructor, connObj,
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

    // copy the oracleDb instance to the new object
    conn->oracleDb = baton->oracleDb;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_isHealthy()
//   Get the Health status - whether the current connection is usable or not
//   NOTE: If this function returns FALSE, conn.close() has to be called
//-----------------------------------------------------------------------------
static napi_value njsConnection_isHealthy(napi_env env,
        napi_callback_info info)
{
    int              value = 0;
    napi_value       connObj;
    njsConnection    *conn;

    if (njsUtils_validateArgs(env, info, 0, NULL, &connObj,
            (njsBaseInstance **)&conn)) {
        if (conn->handle) {
            dpiConn_getIsHealthy(conn->handle, &value);
        }
    }
    return njsUtils_convertToBoolean(env, value);
}


//-----------------------------------------------------------------------------
// njsConnection_ping()
//   Ping the database to see if it is "alive".
//
// PARAMETERS - NONE
//-----------------------------------------------------------------------------
static napi_value njsConnection_ping(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "Ping", njsConnection_pingAsync,
            NULL);
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
// njsConnection_processExecuteBinds()
//   Process binds passed through to the Execute() call.
//-----------------------------------------------------------------------------
static bool njsConnection_processExecuteBinds(njsBaton *baton,
        napi_env env, napi_value binds)
{
    napi_value bindNames;
    bool isArray;

    // determine if binds are an array (bind by position)
    NJS_CHECK_NAPI(env, napi_is_array(env, binds, &isArray))

    // if binding by name, get the list of bind names
    bindNames = NULL;
    if (!isArray && !njsUtils_getOwnPropertyNames(env, binds, &bindNames))
        return false;

    // initialize variables; if there are no variables, nothing further to do!
    baton->bindArraySize = 1;
    if (!njsConnection_initBindVars(baton, env, binds, bindNames))
        return false;
    if (baton->numBindVars == 0)
        return true;

    // scan the execute binds and populate the bind variables
    return njsConnection_scanExecuteBinds(baton, env, binds, bindNames);
}


//-----------------------------------------------------------------------------
// njsConnection_processExecuteManyBinds()
//   Process binds passed through to the ExecuteMany() call.
//-----------------------------------------------------------------------------
static bool njsConnection_processExecuteManyBinds(njsBaton *baton,
        napi_env env, napi_value binds, napi_value options)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    napi_value bindDefs, bindName, bindUnit, bindNames;
    bool scanRequired, bindByPos, hasBinds;
    napi_valuetype valueType;
    njsVariable *var;
    uint32_t i;

    // if the binds is specified as a simple number, no binds are specified
    NJS_CHECK_NAPI(env, napi_typeof(env, binds, &valueType))
    if (valueType == napi_number) {
        hasBinds = false;
        NJS_CHECK_NAPI(env, napi_get_value_uint32(env, binds,
                &baton->bindArraySize))

    // otherwise, an array of binds have been specified
    } else {
        NJS_CHECK_NAPI(env, napi_get_array_length(env, binds,
                &baton->bindArraySize))
        hasBinds = (baton->bindArraySize > 0);
    }

    // determine if bind definitions have been specified; if not a scan is
    // required in order to determine bind definitions
    NJS_CHECK_NAPI(env, napi_get_named_property(env, options, "bindDefs",
            &bindDefs))
    NJS_CHECK_NAPI(env, napi_typeof(env, bindDefs, &valueType))
    if (valueType != napi_object && valueType != napi_undefined)
        return njsBaton_setError(baton, errInvalidPropertyValueInParam,
                "bindDefs", 2);
    scanRequired = (valueType == napi_undefined);

    // if no bind definitions are specified, the first row is used to determine
    // the number of bind variables and types
    if (scanRequired && hasBinds) {
        NJS_CHECK_NAPI(env, napi_get_element(env, binds, 0, &bindDefs))
        NJS_CHECK_NAPI(env, napi_typeof(env, bindDefs, &valueType))
        if (valueType == napi_undefined)
            return true;
        if (valueType != napi_object)
            return njsBaton_setError(baton, errInvalidParameterValue, 2);
    }

    // if a scan is required but no binds are available, that means there are
    // no variables to bind, so nothing further to do
    if (scanRequired && !hasBinds)
        return true;

    // determine if bind definitions are an array (bind by position)
    NJS_CHECK_NAPI(env, napi_is_array(env, bindDefs, &bindByPos))

    // get the list of bind names, if binding by name
    bindNames = NULL;
    if (!bindByPos && !njsUtils_getOwnPropertyNames(env, bindDefs, &bindNames))
        return false;

    // initialize variables; if there are no variables, nothing further to do!
    if (!njsConnection_initBindVars(baton, env, bindDefs, bindNames))
        return false;
    if (baton->numBindVars == 0)
        return true;

    // if no bind definitions are specified, scan the binds to determine type
    // and size
    if (scanRequired && hasBinds) {
        if (!njsConnection_scanExecuteManyBinds(baton, env, binds, bindNames))
            return false;

    // otherwise, use the bind definitions to determine type and size
    } else {

        // process each bind variable
        for (i = 0; i < baton->numBindVars; i++) {
            var = &baton->bindVars[i];

            // get bind unit
            if (bindByPos) {
                NJS_CHECK_NAPI(env, napi_get_element(env, bindDefs, i,
                        &bindUnit))
            } else {
                NJS_CHECK_NAPI(env, napi_get_element(env, bindNames, i,
                        &bindName))
                NJS_CHECK_NAPI(env, napi_get_property(env, bindDefs, bindName,
                        &bindUnit))
            }

            // scan bind unit
            if (!njsConnection_scanExecuteBindUnit(baton, var, true, env,
                    bindUnit, NULL))
                return false;

        }

    }

    // create the ODPI-C variables used to hold the data
    for (i = 0; i < baton->numBindVars; i++) {
        if (!njsVariable_createBuffer(&baton->bindVars[i], conn, baton))
            return false;
    }

    // populate the ODPI-C variables with the data from JavaScript binds
    if (hasBinds && !njsConnection_transferExecuteManyBinds(baton, env, binds,
            bindNames))
        return false;

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
    if (dpiContext_getClientVersion(baton->oracleDb->context,
            &versionInfo) < 0)
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
static napi_value njsConnection_rollback(napi_env env, napi_callback_info info)
{
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 0, NULL, &baton))
        return NULL;
    return njsBaton_queueWork(baton, env, "Rollback",
            njsConnection_rollbackAsync, NULL);
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
// njsConnection_scanExecuteBinds()
//   Scan the binds passed through to Execute() and determine the bind
// type and maximum size (for strings/buffers).
//-----------------------------------------------------------------------------
static bool njsConnection_scanExecuteBinds(njsBaton *baton, napi_env env,
        napi_value binds, napi_value bindNames)
{
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    uint32_t i, defaultBindType, defaultMaxSize, arraySize;
    dpiObjectType *defaultObjectTypeHandle;
    napi_value name, bindUnit, bindValue;
    njsVariable *var;
    bool check;

    // scan each bind
    for (i = 0; i < baton->numBindVars; i++) {
        var = &baton->bindVars[i];

        // determine bind unit
        if (!bindNames) {
            NJS_CHECK_NAPI(env, napi_get_element(env, binds, i, &bindUnit))
        } else {
            NJS_CHECK_NAPI(env, napi_get_element(env, bindNames, i, &name))
            NJS_CHECK_NAPI(env, napi_get_property(env, binds, name, &bindUnit))
        }

        // if bind unit is a value that can be bound directly, use it;
        // otherwise, scan the bind unit for bind information and its value
        if (njsBaton_isBindValue(baton, env, bindUnit)) {
            bindValue = bindUnit;
        } else if (!njsConnection_scanExecuteBindUnit(baton, var, false, env,
                bindUnit, &bindValue)) {
            return false;
        }

        // get bind information from value if it has not already been specified
        if (var->varTypeNum == NJS_DATATYPE_DEFAULT || !var->maxSize ||
                var->maxSize == NJS_MAX_OUT_BIND_SIZE) {
            defaultBindType = var->varTypeNum;
            defaultMaxSize = var->maxSize;
            defaultObjectTypeHandle = var->dpiObjectTypeHandle;
            if (!njsConnection_getBindInfoFromValue(baton, false, env,
                    bindValue, &defaultBindType, &defaultMaxSize,
                    &defaultObjectTypeHandle))
                return false;
            if (var->varTypeNum == NJS_DATATYPE_DEFAULT)
                var->varTypeNum = defaultBindType;
            if (defaultMaxSize > var->maxSize)
                var->maxSize = defaultMaxSize;
            if (!var->dpiObjectTypeHandle && defaultObjectTypeHandle)
                var->dpiObjectTypeHandle = defaultObjectTypeHandle;
        }

        // for IN binds, maxArraySize is ignored and obtained from the
        // actual array size; for INOUT binds, maxArraySize does need to be
        // specified by the application; for OUT binds, the value from the
        // application must be accepted as is as there is no way to
        // validate it
        if (var->varTypeNum != DPI_ORACLE_TYPE_OBJECT &&
                var->varTypeNum != DPI_ORACLE_TYPE_JSON) {

            NJS_CHECK_NAPI(env, napi_is_array(env, bindValue, &check))
            if (check) {
                var->isArray = true;
                NJS_CHECK_NAPI(env, napi_get_array_length(env, bindValue,
                        &arraySize))
                if (var->bindDir == NJS_BIND_IN) {
                    var->maxArraySize = arraySize;
                    if (var->maxArraySize == 0)
                        var->maxArraySize = 1;
                } else if (var->maxArraySize == 0) {
                    return njsBaton_setError(baton, errReqdMaxArraySize);
                }
                if (var->bindDir == NJS_BIND_INOUT &&
                        arraySize > var->maxArraySize)
                    return njsBaton_setError(baton, errInvalidArraySize);
            }

        }

        // create buffer for variable
        if (!njsVariable_createBuffer(var, conn, baton))
            return false;

        // process bind value (for all except OUT)
        if (var->bindDir != NJS_BIND_OUT) {
            if (!njsVariable_setValue(var, env, bindValue, baton))
                return false;
        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_scanExecuteBindUnit()
//   Scan the bind unit for bind information. One of the keys "dir", "type",
// "maxSize" and "val" must be specified for the bind unit to be considered
// valid.
//-----------------------------------------------------------------------------
static bool njsConnection_scanExecuteBindUnit(njsBaton *baton,
        njsVariable *var, bool inExecuteMany, napi_env env,
        napi_value bindUnit, napi_value *bindValue)
{
    napi_value args[2], value, prototype, temp, connObj, dbObjectClasses, cls;
    njsConnection *conn = (njsConnection*) baton->callingInstance;
    bool okBindUnit, found, check;
    dpiObjectType *objTypeHandle;
    napi_valuetype valueType;

    // initialization
    args[1] = bindUnit;
    okBindUnit = false;

    // get and validate bind direction; if not specified, IN is assumed
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "dir",
            &var->bindDir, &found))
        return false;
    if (found) {
        okBindUnit = true;
        if (var->bindDir != NJS_BIND_IN && var->bindDir != NJS_BIND_INOUT &&
                var->bindDir != NJS_BIND_OUT)
            return njsBaton_setError(baton, errInvalidBindDirection);
    }

    // get data type; when calling executeMany(), the data type is mandatory
    // the data type will either be one of the integer constants identifying
    // types, a string identifying an object type, or a constructor function
    // identifying an object type
    NJS_CHECK_NAPI(env, napi_get_named_property(env, args[1], "type", &value));
    NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType));
    if (valueType == napi_function) {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, value, "prototype",
                &prototype))
        NJS_CHECK_NAPI(env, napi_instanceof(env, prototype,
                baton->jsBaseDbObjectConstructor, &check))
        if (!check)
            return njsBaton_setError(baton, errInvalidBindDataType, 2);
        if (!njsDbObjectType_getFromClass(env, value, &var->objectType))
            return false;
        var->dpiObjectTypeHandle = var->objectType->handle;
        var->varTypeNum = DPI_ORACLE_TYPE_OBJECT;
        okBindUnit = true;
    } else if (valueType == napi_string) {

        // first check to see if the name is already cached
        NJS_CHECK_NAPI(env, napi_get_reference_value(env,
                baton->jsCallingObjRef, &connObj))
        NJS_CHECK_NAPI(env, napi_get_named_property(env, connObj,
                "_dbObjectClasses", &dbObjectClasses))
        NJS_CHECK_NAPI(env, napi_get_property(env, dbObjectClasses, value,
                &cls))
        NJS_CHECK_NAPI(env, napi_typeof(env, cls, &valueType))
        if (valueType == napi_function) {
            if (!njsDbObjectType_getFromClass(env, cls, &var->objectType))
                return false;

        // if not, look up the type by its name
        } else {
            if (!njsUtils_copyStringFromJS(env, value, &baton->typeName,
                    &baton->typeNameLength))
                return false;
            if (dpiConn_getObjectType(conn->handle, baton->typeName,
                    (uint32_t) baton->typeNameLength, &objTypeHandle) < 0)
                return njsBaton_setErrorDPI(baton);
            if (!njsDbObject_getSubClass(baton, objTypeHandle, env, &temp,
                    &var->objectType)) {
                dpiObjectType_release(objTypeHandle);
                return false;
            }
            dpiObjectType_release(objTypeHandle);
        }
        var->dpiObjectTypeHandle = var->objectType->handle;
        var->varTypeNum = DPI_ORACLE_TYPE_OBJECT;
        okBindUnit = true;
    } else {
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "type",
                &var->varTypeNum, &found))
            return false;
        if (found) {
            okBindUnit = true;
        } else if (inExecuteMany) {
            if (var->pos > 0)
                return njsBaton_setError(baton, errMissingTypeByPos, var->pos);
            return njsBaton_setError(baton, errMissingTypeByName,
                    var->nameLength, var->name);
        }
    }

    // get maximum size for strings/buffers; this value is only used for
    // IN/OUT and OUT binds in execute() and at all times for executeMany()
    if (var->bindDir != NJS_BIND_IN || inExecuteMany) {
        if (var->bindDir != NJS_BIND_IN)
            var->maxSize = NJS_MAX_OUT_BIND_SIZE;
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1, "maxSize",
                &var->maxSize, &found))
            return false;
        if (found) {
            okBindUnit = true;
        } else if (inExecuteMany) {
            if (var->varTypeNum == DPI_ORACLE_TYPE_VARCHAR ||
                    var->varTypeNum == DPI_ORACLE_TYPE_RAW) {
                if (var->pos > 0)
                    return njsBaton_setError(baton, errMissingMaxSizeByPos,
                            var->pos);
                return njsBaton_setError(baton, errMissingMaxSizeByName,
                            var->nameLength, var->name);
            }
        }
    }

    // get max array size (for array binds, not possible in executeMany()
    if (!inExecuteMany) {
        if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 1,
                "maxArraySize", &var->maxArraySize, &found))
            return false;
        if (var->maxArraySize > 0)
            var->isArray = true;
    }

    // get value, if specified; not used in executeMany()
    if (!inExecuteMany) {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, bindUnit, "val",
                bindValue))
        NJS_CHECK_NAPI(env, napi_typeof(env, *bindValue, &valueType))
        if (valueType != napi_undefined)
            okBindUnit = true;
    }

    // if one of the keys was not found, the bind information is invalid
    if (!okBindUnit)
        return njsBaton_setError(baton, errNamedJSON);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_scanExecuteManyBinds()
//   Scan the binds passed through to ExecuteMany() and determine the bind
// type and maximum size (for strings/buffers).
//-----------------------------------------------------------------------------
static bool njsConnection_scanExecuteManyBinds(njsBaton *baton,
        napi_env env, napi_value binds, napi_value bindNames)
{
    uint32_t defaultBindType, defaultMaxSize, i, j;
    dpiObjectType *defaultObjectTypeHandle;
    napi_value row, bindName, value;
    bool byPosition, isArray;
    napi_valuetype valueType;
    njsVariable *var;

    byPosition = (baton->bindVars[0].pos > 0);
    for (i = 0; i < baton->bindArraySize; i++) {

        // get row from binds; verify that all rows are by position (array) or
        // by name (object)
        NJS_CHECK_NAPI(env, napi_get_element(env, binds, i, &row))
        NJS_CHECK_NAPI(env, napi_is_array(env, row, &isArray))
        if ((byPosition && !isArray) || (!byPosition && isArray))
            return njsBaton_setError(baton, errMixedBind);

        // scan each of the columns in the row and determine the bind type and
        // maximum size of the input data
        for (j = 0; j < baton->numBindVars; j++) {
            var = &baton->bindVars[j];

            // get bind value
            if (byPosition) {
                NJS_CHECK_NAPI(env, napi_get_element(env, row, j, &value))
            } else {
                NJS_CHECK_NAPI(env, napi_get_element(env, bindNames, j,
                        &bindName))
                NJS_CHECK_NAPI(env, napi_get_property(env, row, bindName,
                        &value))
            }

            // null and undefined do not require any work
            NJS_CHECK_NAPI(env, napi_typeof(env, value, &valueType))
            if (valueType == napi_undefined || valueType == napi_null)
                continue;

            // otherwise, determine bind type and size by examining the value
            defaultBindType = var->varTypeNum;
            defaultMaxSize = var->maxSize;
            defaultObjectTypeHandle = var->dpiObjectTypeHandle;
            if (!njsConnection_getBindInfoFromValue(baton, true, env,
                    value, &defaultBindType, &defaultMaxSize,
                    &defaultObjectTypeHandle))
                return false;
            if (var->varTypeNum == NJS_DATATYPE_DEFAULT)
                var->varTypeNum = defaultBindType;
            if (defaultMaxSize > var->maxSize)
                var->maxSize = defaultMaxSize;
            if (!var->dpiObjectTypeHandle && defaultObjectTypeHandle)
                var->dpiObjectTypeHandle = defaultObjectTypeHandle;

        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_setAction()
//   Set accessor of "action" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setAction(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "action",
            dpiConn_setAction);
}


//-----------------------------------------------------------------------------
// njsConnection_setCallTimeout()
//   Set accessor of "callTimeout" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setCallTimeout(napi_env env,
        napi_callback_info info)
{
    uint32_t callTimeout;
    njsConnection *conn;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &conn, &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "callTimeout", &callTimeout))
        return NULL;
    if (dpiConn_setCallTimeout(conn->handle, callTimeout) < 0)
        njsUtils_throwErrorDPI(env, conn->oracleDb);

    return NULL;
}


//-----------------------------------------------------------------------------
// njsConnection_setClientId()
//   Set accessor of "clientId" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setClientId(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "clientId",
            dpiConn_setClientIdentifier);
}


//-----------------------------------------------------------------------------
// njsConnection_setClientInfo()
//   Set accessor of "clientInfo" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setClientInfo(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "clientInfo",
            dpiConn_setClientInfo);
}


//-----------------------------------------------------------------------------
// njsConnection_setCurrentSchema()
//   Set accessor of "clientId" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setCurrentSchema(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "currentSchema",
            dpiConn_setCurrentSchema);
}


//-----------------------------------------------------------------------------
// njsConnection_setDbOp()
//   Set accessor of "dbOp" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setDbOp(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "dbOp", dpiConn_setDbOp);
}


//-----------------------------------------------------------------------------
// njsConnection_setECID()
//   Set accessor for "ecid" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setECID(napi_env env, napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "ecid",
            dpiConn_setEcontextId);
}


//-----------------------------------------------------------------------------
// njsConnection_setExternalName
//   Set accessor of "externalName" property
//-----------------------------------------------------------------------------
static napi_value njsConnection_setExternalName(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "externalName",
             dpiConn_setExternalName);
}


//-----------------------------------------------------------------------------
// njsConnection_setInternalName
//   Set accessor of "InternalName" property
//-----------------------------------------------------------------------------
static napi_value njsConnection_setInternalName(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "internalName",
             dpiConn_setInternalName);
}


//-----------------------------------------------------------------------------
// njsConnection_setModule()
//   Set accessor of "module" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setModule(napi_env env,
        napi_callback_info info)
{
    return njsConnection_setTextAttribute(env, info, "module",
            dpiConn_setModule);
}


//-----------------------------------------------------------------------------
// njsConnection_setTag()
//   Set accessor of "tag" property.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setTag(napi_env env,
        napi_callback_info info)
{
    njsConnection *conn;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &conn, &value))
        return NULL;
    if (!njsUtils_setPropString(env, value, "tag", &conn->tag,
            &conn->tagLength))
        return NULL;
    conn->retag = true;
    return NULL;
}


//-----------------------------------------------------------------------------
// njsConnection_setTextAttribute()
//   Sets the specified text attribute by calling the specified ODPI-C
// function, after validating the connection and the input.
//-----------------------------------------------------------------------------
static napi_value njsConnection_setTextAttribute(napi_env env,
        napi_callback_info info, const char *attributeName,
        int (*setter)(dpiConn*, const char *, uint32_t))
{
    size_t bufferLength;
    njsConnection *conn;
    napi_value value;
    char *buffer;

    // validate the arguments and the connection
    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &conn, &value))
        return NULL;
    if (!conn->handle) {
        njsUtils_throwError(env, errInvalidConnection);
        return NULL;
    }

    // get contents of string
    buffer = NULL;
    if (!njsUtils_setPropString(env, value, attributeName, &buffer,
            &bufferLength))
        return NULL;

    // call the ODPI-C function to set the value
    if ((*setter)(conn->handle, buffer, (uint32_t) bufferLength) < 0) {
        njsUtils_throwErrorDPI(env, conn->oracleDb);
        free(buffer);
        return NULL;
    }

    free(buffer);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsConnection_shutdown()
//   Initiates a Database Server shutdown with provided option.
//
// PARAMETERS
//   - shutdown mode to use
//-----------------------------------------------------------------------------
static napi_value njsConnection_shutdown(napi_env env, napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsUtils_getUnsignedIntArg(env, args, 0, &baton->shutdownMode)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Shutdown",
            njsConnection_shutdownAsync, NULL);
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
static napi_value njsConnection_startup(napi_env env, napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;

    if (!njsConnection_startupProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }

    return njsBaton_queueWork(baton, env, "Startup",
            njsConnection_startupAsync, NULL);
}


//-----------------------------------------------------------------------------
// njsConnection_startupProcessArgs()
//   Process the arguments provided by the caller and place them on the baton.
//-----------------------------------------------------------------------------
static bool njsConnection_startupProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    bool force = false, rest = false;

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

    return true;
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
// identify a subscription and a reference is stored on the oracledb instance
// for use by subsequent calls to subscribe() or unsubscribe().
//
// PARAMETERS
//   - name
//   - options
//-----------------------------------------------------------------------------
static napi_value njsConnection_subscribe(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsConnection_subscribeProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Subscribe",
            njsConnection_subscribeAsync, njsConnection_subscribePostAsync);
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
        if (dpiContext_initSubscrCreateParams(baton->oracleDb->context,
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
        if (binds && !njsConnection_processExecuteBinds(baton, env, binds))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_transferExecuteManyBinds()
//   Transfer the binds from JavaScript to the ODPI-C variable buffers already
// created.
//-----------------------------------------------------------------------------
static bool njsConnection_transferExecuteManyBinds(njsBaton *baton,
        napi_env env, napi_value binds, napi_value bindNames)
{
    napi_value row, bindName, value;
    bool byPosition, isArray;
    njsVariable *var;
    uint32_t i, j;

    // determine if we are binding by position or by name
    byPosition = (baton->bindVars[0].pos > 0);

    // process each row
    for (i = 0; i < baton->bindArraySize; i++) {

        // get row from binds; verify that all rows are by position (array) or
        // by name (object)
        NJS_CHECK_NAPI(env, napi_get_element(env, binds, i, &row))
        NJS_CHECK_NAPI(env, napi_is_array(env, row, &isArray))
        if ((byPosition && !isArray) || (!byPosition && isArray))
            return njsBaton_setError(baton, errMixedBind);

        // process each column
        for (j = 0; j < baton->numBindVars; j++) {
            var = &baton->bindVars[j];

            // get bind value
            if (byPosition) {
                NJS_CHECK_NAPI(env, napi_get_element(env, row, j, &value))
            } else {
                NJS_CHECK_NAPI(env, napi_get_element(env, bindNames, j,
                        &bindName))
                NJS_CHECK_NAPI(env, napi_get_property(env, row, bindName,
                        &value))
            }

            // process value
            if (!njsVariable_setScalarValue(var, i, env, value, true, baton))
                return false;

        }

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
//-----------------------------------------------------------------------------
static napi_value njsConnection_tpcBegin(napi_env env, napi_callback_info info)
{
    napi_value args[3];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 3, args, &baton))
        return NULL;
    if (!njsConnection_tpcBeginProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "tpcBegin",
        njsConnection_tpcBeginAsync, NULL);
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
// njsConnection_tpcBeginProcessArgs()
//   To obtain the values from JS layer and place it in baton structure
//-----------------------------------------------------------------------------
static bool njsConnection_tpcBeginProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    // Create XID structure
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;

    // Get the flags
    if (!njsUtils_getUnsignedIntArg(env, args, 1, &baton->tpcFlags))
        return false;

    // Get the timeout
    if (!njsUtils_getUnsignedIntArg(env, args, 2, &baton->tpcTxnTimeout))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcCommit()
//   Two-phase-commit
// PARAMETERS
//   - xid
//   - onePhase (boolean)
//-----------------------------------------------------------------------------
static napi_value njsConnection_tpcCommit(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsConnection_tpcCommitProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "tpcCommit",
        njsConnection_tpcCommitAsync, NULL);
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
// njsConnection_tpcCommitProcessArgs()
//   To obtain the values from JS layer and place it in the baton structure
//-----------------------------------------------------------------------------
static bool njsConnection_tpcCommitProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    // create XID structure
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;

    // OnePhase (true/false) for Commit
    if (!njsUtils_getBoolArg(env, args, 1, &baton->tpcOnePhase))
        return false;
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcEnd()
//   Two-phase-end
// PARAMETERS
//   Xid
//   Flags
//-----------------------------------------------------------------------------
static napi_value njsConnection_tpcEnd(napi_env env, napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 2, args, &baton))
       return NULL;
    if (!njsConnection_tpcEndProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "tpcEnd", njsConnection_tpcEndAsync,
        NULL);
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
// njsConnection_tpcEndProcessArgs()
//   To obtain the values from JS layer and place it in the baton structure
//-----------------------------------------------------------------------------
static bool njsConnection_tpcEndProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    // create XID
    if (!njsBaton_getXid(baton, env, args[0]))
        return false;

    // Get the flags if provided
    if (!njsUtils_getUnsignedIntArg(env, args, 1, &baton->tpcFlags))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection_tpcForget()
//
// PARAMETERS
//  - xid
//-----------------------------------------------------------------------------
static napi_value njsConnection_tpcForget(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton   *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsConnection_tpcForgetProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "tpcForget",
        njsConnection_tpcForgetAsync, NULL);
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
// njsConnection_tpcForgetProcessArgs()
//   To obtain the values from JS layer and place it in baton structure
//-----------------------------------------------------------------------------
static bool njsConnection_tpcForgetProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    // create XID
    return njsBaton_getXid(baton, env, args[0]);
}


//-----------------------------------------------------------------------------
// njsConnection_tpcPrepare()
//   Prepare the two-phase-commit
//-----------------------------------------------------------------------------
static napi_value njsConnection_tpcPrepare(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton   *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsConnection_tpcPrepareProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "tpcPrepare",
        njsConnection_tpcPrepareAsync, njsConnection_tpcPreparePostAsync);
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
// njsConnection_tpcPrepareProcessArgs()
//   To obtain the values from JS layer and place it baton structure
//-----------------------------------------------------------------------------
static bool njsConnection_tpcPrepareProcessArgs(njsBaton *baton, napi_env env,
                                                napi_value *args)
{
    // create XID
    return njsBaton_getXid(baton, env, args[0]);
}



//-----------------------------------------------------------------------------
// njsConnection_tpcRollback()
//   Rollbacks the two-phase-commit
//-----------------------------------------------------------------------------
static napi_value njsConnection_tpcRollback(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton   *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsConnection_tpcRollbackProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "tpcRollback",
            njsConnection_tpcRollbackAsync, NULL);
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
// njsConnection_tpcRollbackProcessArgs()
//   To obtain the values from JS layer and place it in baton structure
//-----------------------------------------------------------------------------
static bool njsConnection_tpcRollbackProcessArgs(njsBaton *baton, napi_env env, napi_value *args)
{
    return njsBaton_getXid(baton, env, args[0]);
}


//-----------------------------------------------------------------------------
// njsConnection_unsubscribe()
//   Unsubscribe from events in the database that were originally subscribed
// with a call to connection.subscribe().
//
// PARAMETERS
//   - name
//-----------------------------------------------------------------------------
static napi_value njsConnection_unsubscribe(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsConnection_createBaton(env, info, 1, args, &baton))
        return NULL;
    if (!njsBaton_getSubscription(baton, env, args[0], true)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "Unsubscribe",
            njsConnection_unsubscribeAsync, NULL);
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
