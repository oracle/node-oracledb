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
//   njsOracleDb.c
//
// DESCRIPTION
//   OracleDb class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsOracleDb_createPool);
static NJS_NAPI_METHOD(njsOracleDb_getConnection);
static NJS_NAPI_METHOD(njsOracleDb_initOracleClient);
static NJS_NAPI_METHOD(njsOracleDb_returnAccessToken);

// asynchronous methods
static NJS_ASYNC_METHOD(njsOracleDb_createPoolAsync);
static NJS_ASYNC_METHOD(njsOracleDb_getConnectionAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsOracleDb_createPoolPostAsync);
static NJS_ASYNC_POST_METHOD(njsOracleDb_getConnectionPostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsOracleDb_createPoolProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsOracleDb_getConnectionProcessArgs);

// getters
static NJS_NAPI_GETTER(njsOracleDb_getAutoCommit);
static NJS_NAPI_GETTER(njsOracleDb_getConnectionClass);
static NJS_NAPI_GETTER(njsOracleDb_getEdition);
static NJS_NAPI_GETTER(njsOracleDb_getEvents);
static NJS_NAPI_GETTER(njsOracleDb_getExtendedMetaData);
static NJS_NAPI_GETTER(njsOracleDb_getExternalAuth);
static NJS_NAPI_GETTER(njsOracleDb_getFetchArraySize);
static NJS_NAPI_GETTER(njsOracleDb_getFetchAsBuffer);
static NJS_NAPI_GETTER(njsOracleDb_getDbObjectAsPojo);
static NJS_NAPI_GETTER(njsOracleDb_getFetchAsString);
static NJS_NAPI_GETTER(njsOracleDb_getLobPrefetchSize);
static NJS_NAPI_GETTER(njsOracleDb_getMaxRows);
static NJS_NAPI_GETTER(njsOracleDb_getOracleClientVersion);
static NJS_NAPI_GETTER(njsOracleDb_getOracleClientVersionString);
static NJS_NAPI_GETTER(njsOracleDb_getOutFormat);
static NJS_NAPI_GETTER(njsOracleDb_getPoolIncrement);
static NJS_NAPI_GETTER(njsOracleDb_getPoolMax);
static NJS_NAPI_GETTER(njsOracleDb_getPoolMaxPerShard);
static NJS_NAPI_GETTER(njsOracleDb_getPoolMin);
static NJS_NAPI_GETTER(njsOracleDb_getPoolPingInterval);
static NJS_NAPI_GETTER(njsOracleDb_getPoolTimeout);
static NJS_NAPI_GETTER(njsOracleDb_getPrefetchRows);
static NJS_NAPI_GETTER(njsOracleDb_getStmtCacheSize);
static NJS_NAPI_GETTER(njsOracleDb_getVersion);
static NJS_NAPI_GETTER(njsOracleDb_getVersionString);
static NJS_NAPI_GETTER(njsOracleDb_getVersionSuffix);

// setters
static NJS_NAPI_SETTER(njsOracleDb_setAutoCommit);
static NJS_NAPI_SETTER(njsOracleDb_setConnectionClass);
static NJS_NAPI_SETTER(njsOracleDb_setEdition);
static NJS_NAPI_SETTER(njsOracleDb_setEvents);
static NJS_NAPI_SETTER(njsOracleDb_setExtendedMetaData);
static NJS_NAPI_SETTER(njsOracleDb_setExternalAuth);
static NJS_NAPI_SETTER(njsOracleDb_setFetchArraySize);
static NJS_NAPI_SETTER(njsOracleDb_setFetchAsBuffer);
static NJS_NAPI_SETTER(njsOracleDb_setDbObjectAsPojo);
static NJS_NAPI_SETTER(njsOracleDb_setFetchAsString);
static NJS_NAPI_SETTER(njsOracleDb_setLobPrefetchSize);
static NJS_NAPI_SETTER(njsOracleDb_setMaxRows);
static NJS_NAPI_SETTER(njsOracleDb_setOutFormat);
static NJS_NAPI_SETTER(njsOracleDb_setPoolIncrement);
static NJS_NAPI_SETTER(njsOracleDb_setPoolMax);
static NJS_NAPI_SETTER(njsOracleDb_setPoolMaxPerShard);
static NJS_NAPI_SETTER(njsOracleDb_setPoolMin);
static NJS_NAPI_SETTER(njsOracleDb_setPoolPingInterval);
static NJS_NAPI_SETTER(njsOracleDb_setPoolTimeout);
static NJS_NAPI_SETTER(njsOracleDb_setPrefetchRows);
static NJS_NAPI_SETTER(njsOracleDb_setStmtCacheSize);

// finalize
static NJS_NAPI_FINALIZE(njsOracleDb_finalize);

// other methods used internally
static bool njsOracleDb_initCommonCreateParams(njsBaton *baton,
        dpiCommonCreateParams *params);
static bool njsOracleDb_initDPI(njsOracleDb *oracleDb, napi_env env,
        dpiContextCreateParams *params, njsBaton *baton);
static bool njsOracleDb_commonProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args);

// define constants exposed to JS
static njsConstant njsClassConstants[] = {

    // CQN operation codes
    { "CQN_OPCODE_ALL_OPS", DPI_OPCODE_ALL_OPS },
    { "CQN_OPCODE_ALL_ROWS", DPI_OPCODE_ALL_ROWS },
    { "CQN_OPCODE_ALTER", DPI_OPCODE_ALTER },
    { "CQN_OPCODE_DELETE", DPI_OPCODE_DELETE },
    { "CQN_OPCODE_DROP", DPI_OPCODE_DROP },
    { "CQN_OPCODE_INSERT", DPI_OPCODE_INSERT },
    { "CQN_OPCODE_UPDATE", DPI_OPCODE_UPDATE },

    // database types
    { "DB_TYPE_BFILE", DPI_ORACLE_TYPE_BFILE },
    { "DB_TYPE_BINARY_DOUBLE", DPI_ORACLE_TYPE_NATIVE_DOUBLE },
    { "DB_TYPE_BINARY_FLOAT", DPI_ORACLE_TYPE_NATIVE_FLOAT },
    { "DB_TYPE_BINARY_INTEGER", DPI_ORACLE_TYPE_NATIVE_INT },
    { "DB_TYPE_BLOB", DPI_ORACLE_TYPE_BLOB },
    { "DB_TYPE_BOOLEAN", DPI_ORACLE_TYPE_BOOLEAN },
    { "DB_TYPE_CHAR", DPI_ORACLE_TYPE_CHAR },
    { "DB_TYPE_CLOB", DPI_ORACLE_TYPE_CLOB },
    { "DB_TYPE_CURSOR", DPI_ORACLE_TYPE_STMT },
    { "DB_TYPE_DATE", DPI_ORACLE_TYPE_DATE },
    { "DB_TYPE_INTERVAL_DS", DPI_ORACLE_TYPE_INTERVAL_DS },
    { "DB_TYPE_INTERVAL_YM", DPI_ORACLE_TYPE_INTERVAL_YM },
    { "DB_TYPE_JSON", DPI_ORACLE_TYPE_JSON },
    { "DB_TYPE_LONG", DPI_ORACLE_TYPE_LONG_VARCHAR },
    { "DB_TYPE_LONG_RAW", DPI_ORACLE_TYPE_LONG_RAW },
    { "DB_TYPE_NCHAR", DPI_ORACLE_TYPE_NCHAR },
    { "DB_TYPE_NCLOB", DPI_ORACLE_TYPE_NCLOB },
    { "DB_TYPE_NUMBER", DPI_ORACLE_TYPE_NUMBER },
    { "DB_TYPE_NVARCHAR", DPI_ORACLE_TYPE_NVARCHAR },
    { "DB_TYPE_OBJECT", DPI_ORACLE_TYPE_OBJECT },
    { "DB_TYPE_RAW", DPI_ORACLE_TYPE_RAW },
    { "DB_TYPE_ROWID", DPI_ORACLE_TYPE_ROWID },
    { "DB_TYPE_TIMESTAMP", DPI_ORACLE_TYPE_TIMESTAMP },
    { "DB_TYPE_TIMESTAMP_LTZ", DPI_ORACLE_TYPE_TIMESTAMP_LTZ },
    { "DB_TYPE_TIMESTAMP_TZ", DPI_ORACLE_TYPE_TIMESTAMP_TZ },
    { "DB_TYPE_VARCHAR", DPI_ORACLE_TYPE_VARCHAR },

    // statement types
    { "STMT_TYPE_UNKNOWN", DPI_STMT_TYPE_UNKNOWN },
    { "STMT_TYPE_SELECT", DPI_STMT_TYPE_SELECT },
    { "STMT_TYPE_UPDATE", DPI_STMT_TYPE_UPDATE },
    { "STMT_TYPE_DELETE", DPI_STMT_TYPE_DELETE },
    { "STMT_TYPE_INSERT", DPI_STMT_TYPE_INSERT },
    { "STMT_TYPE_CREATE", DPI_STMT_TYPE_CREATE },
    { "STMT_TYPE_DROP", DPI_STMT_TYPE_DROP },
    { "STMT_TYPE_ALTER", DPI_STMT_TYPE_ALTER },
    { "STMT_TYPE_BEGIN", DPI_STMT_TYPE_BEGIN },
    { "STMT_TYPE_DECLARE", DPI_STMT_TYPE_DECLARE },
    { "STMT_TYPE_CALL", DPI_STMT_TYPE_CALL },
    { "STMT_TYPE_EXPLAIN_PLAN", DPI_STMT_TYPE_EXPLAIN_PLAN },
    { "STMT_TYPE_MERGE", DPI_STMT_TYPE_MERGE },
    { "STMT_TYPE_ROLLBACK", DPI_STMT_TYPE_ROLLBACK },
    { "STMT_TYPE_COMMIT", DPI_STMT_TYPE_COMMIT },

    // shutdown modes
    { "SHUTDOWN_MODE_DEFAULT", DPI_MODE_SHUTDOWN_DEFAULT },
    { "SHUTDOWN_MODE_TRANSACTIONAL", DPI_MODE_SHUTDOWN_TRANSACTIONAL },
    { "SHUTDOWN_MODE_TRANSACTIONAL_LOCAL",
            DPI_MODE_SHUTDOWN_TRANSACTIONAL_LOCAL },
    { "SHUTDOWN_MODE_IMMEDIATE", DPI_MODE_SHUTDOWN_IMMEDIATE },
    { "SHUTDOWN_MODE_ABORT", DPI_MODE_SHUTDOWN_ABORT },
    { "SHUTDOWN_MODE_FINAL", DPI_MODE_SHUTDOWN_FINAL },

    // startup modes
    { "STARTUP_MODE_DEFAULT", DPI_MODE_STARTUP_DEFAULT },
    { "STARTUP_MODE_FORCE", DPI_MODE_STARTUP_FORCE },
    { "STARTUP_MODE_RESTRICT", DPI_MODE_STARTUP_RESTRICT },

    // subscription event types
    { "SUBSCR_EVENT_TYPE_SHUTDOWN", DPI_EVENT_SHUTDOWN },
    { "SUBSCR_EVENT_TYPE_SHUTDOWN_ANY", DPI_EVENT_SHUTDOWN_ANY },
    { "SUBSCR_EVENT_TYPE_STARTUP", DPI_EVENT_STARTUP },
    { "SUBSCR_EVENT_TYPE_DEREG", DPI_EVENT_DEREG },
    { "SUBSCR_EVENT_TYPE_OBJ_CHANGE", DPI_EVENT_OBJCHANGE },
    { "SUBSCR_EVENT_TYPE_QUERY_CHANGE", DPI_EVENT_QUERYCHANGE },
    { "SUBSCR_EVENT_TYPE_AQ", DPI_EVENT_AQ },

    // subscription grouping classes
    { "SUBSCR_GROUPING_CLASS_TIME", DPI_SUBSCR_GROUPING_CLASS_TIME },

    // subscription grouping types
    { "SUBSCR_GROUPING_TYPE_SUMMARY", DPI_SUBSCR_GROUPING_TYPE_SUMMARY },
    { "SUBSCR_GROUPING_TYPE_LAST", DPI_SUBSCR_GROUPING_TYPE_LAST },

    // subscription namespaces
    { "SUBSCR_NAMESPACE_AQ", DPI_SUBSCR_NAMESPACE_AQ },
    { "SUBSCR_NAMESPACE_DBCHANGE", DPI_SUBSCR_NAMESPACE_DBCHANGE },

    // subscription quality of service flags
    { "SUBSCR_QOS_BEST_EFFORT", DPI_SUBSCR_QOS_BEST_EFFORT },
    { "SUBSCR_QOS_DEREG_NFY", DPI_SUBSCR_QOS_DEREG_NFY },
    { "SUBSCR_QOS_QUERY", DPI_SUBSCR_QOS_QUERY },
    { "SUBSCR_QOS_RELIABLE", DPI_SUBSCR_QOS_RELIABLE },
    { "SUBSCR_QOS_ROWIDS", DPI_SUBSCR_QOS_ROWIDS },

    // JS types
    { "BLOB", NJS_DATATYPE_BLOB },
    { "BUFFER", NJS_DATATYPE_BUFFER },
    { "CLOB", NJS_DATATYPE_CLOB },
    { "CURSOR", NJS_DATATYPE_CURSOR },
    { "DATE", NJS_DATATYPE_DATE },
    { "DEFAULT", NJS_DATATYPE_DEFAULT },
    { "NCLOB", NJS_DATATYPE_NCLOB },
    { "NUMBER", NJS_DATATYPE_NUM },
    { "STRING", NJS_DATATYPE_STR },

    // privileges
    { "SYSASM", DPI_MODE_AUTH_SYSASM },
    { "SYSBACKUP", DPI_MODE_AUTH_SYSBKP },
    { "SYSDBA", DPI_MODE_AUTH_SYSDBA },
    { "SYSDG", DPI_MODE_AUTH_SYSDGD },
    { "SYSKM", DPI_MODE_AUTH_SYSKMT },
    { "SYSOPER", DPI_MODE_AUTH_SYSOPER },
    { "SYSPRELIM", DPI_MODE_AUTH_PRELIM },
    { "SYSRAC", DPI_MODE_AUTH_SYSRAC },

    // bind directions
    { "BIND_IN", NJS_BIND_IN },
    { "BIND_INOUT", NJS_BIND_INOUT },
    { "BIND_OUT", NJS_BIND_OUT },

    // outFormat values
    { "OUT_FORMAT_ARRAY", NJS_ROWS_ARRAY },
    { "OUT_FORMAT_OBJECT", NJS_ROWS_OBJECT },
    { "ARRAY", NJS_ROWS_ARRAY },
    { "OBJECT", NJS_ROWS_OBJECT },

    // SODA collection creation modes
    { "SODA_COLL_MAP_MODE", NJS_SODA_COLL_CREATE_MODE_MAP },

    // pool statuses
    { "POOL_STATUS_OPEN", NJS_POOL_STATUS_OPEN },
    { "POOL_STATUS_DRAINING", NJS_POOL_STATUS_DRAINING },
    { "POOL_STATUS_CLOSED", NJS_POOL_STATUS_CLOSED },
    { "POOL_STATUS_RECONFIGURING", NJS_POOL_STATUS_RECONFIGURING },

    // AQ dequeue wait options
    { "AQ_DEQ_NO_WAIT", DPI_DEQ_WAIT_NO_WAIT },
    { "AQ_DEQ_WAIT_FOREVER", DPI_DEQ_WAIT_FOREVER },

    // AQ dequeue modes
    { "AQ_DEQ_MODE_BROWSE", DPI_MODE_DEQ_BROWSE },
    { "AQ_DEQ_MODE_LOCKED", DPI_MODE_DEQ_LOCKED },
    { "AQ_DEQ_MODE_REMOVE", DPI_MODE_DEQ_REMOVE },
    { "AQ_DEQ_MODE_REMOVE_NO_DATA", DPI_MODE_DEQ_REMOVE_NO_DATA },

    // AQ dequeue navigation flags
    { "AQ_DEQ_NAV_FIRST_MSG", DPI_DEQ_NAV_FIRST_MSG },
    { "AQ_DEQ_NAV_NEXT_TRANSACTION", DPI_DEQ_NAV_NEXT_TRANSACTION },
    { "AQ_DEQ_NAV_NEXT_MSG", DPI_DEQ_NAV_NEXT_MSG },

    // AQ message delivery modes
    { "AQ_MSG_DELIV_MODE_PERSISTENT", DPI_MODE_MSG_PERSISTENT },
    { "AQ_MSG_DELIV_MODE_BUFFERED", DPI_MODE_MSG_BUFFERED },
    { "AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED",
            DPI_MODE_MSG_PERSISTENT_OR_BUFFERED },

    // AQ message states
    { "AQ_MSG_STATE_READY", DPI_MSG_STATE_READY },
    { "AQ_MSG_STATE_WAITING", DPI_MSG_STATE_WAITING },
    { "AQ_MSG_STATE_PROCESSED", DPI_MSG_STATE_PROCESSED },
    { "AQ_MSG_STATE_EXPIRED", DPI_MSG_STATE_EXPIRED },

    // AQ visibility flags
    { "AQ_VISIBILITY_IMMEDIATE", DPI_VISIBILITY_IMMEDIATE },
    { "AQ_VISIBILITY_ON_COMMIT", DPI_VISIBILITY_ON_COMMIT },

    // TPC/XA begin flags Constants
    { "TPC_BEGIN_JOIN", DPI_TPC_BEGIN_JOIN },
    { "TPC_BEGIN_NEW", DPI_TPC_BEGIN_NEW },
    { "TPC_BEGIN_PROMOTE", DPI_TPC_BEGIN_PROMOTE },
    { "TPC_BEGIN_RESUME", DPI_TPC_BEGIN_RESUME },

    // TPC/XA two-phase commit flags
    { "TPC_END_NORMAL", DPI_TPC_END_NORMAL },
    { "TPC_END_SUSPEND", DPI_TPC_END_SUSPEND },

    // terminal
    { NULL, 0 }
};

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "autoCommit", NULL, NULL, njsOracleDb_getAutoCommit,
            njsOracleDb_setAutoCommit, NULL, napi_default, NULL },
    { "connectionClass", NULL, NULL, njsOracleDb_getConnectionClass,
            njsOracleDb_setConnectionClass, NULL, napi_default, NULL },
    { "edition", NULL, NULL, njsOracleDb_getEdition, njsOracleDb_setEdition,
            NULL, napi_default, NULL },
    { "events", NULL, NULL, njsOracleDb_getEvents, njsOracleDb_setEvents, NULL,
            napi_default, NULL },
    { "extendedMetaData", NULL, NULL, njsOracleDb_getExtendedMetaData,
            njsOracleDb_setExtendedMetaData, NULL, napi_default, NULL },
    { "externalAuth", NULL, NULL, njsOracleDb_getExternalAuth,
            njsOracleDb_setExternalAuth, NULL, napi_default, NULL },
    { "fetchArraySize", NULL, NULL, njsOracleDb_getFetchArraySize,
            njsOracleDb_setFetchArraySize, NULL, napi_default, NULL },
    { "fetchAsBuffer", NULL, NULL, njsOracleDb_getFetchAsBuffer,
            njsOracleDb_setFetchAsBuffer, NULL, napi_default, NULL },
    { "dbObjectAsPojo", NULL, NULL, njsOracleDb_getDbObjectAsPojo,
            njsOracleDb_setDbObjectAsPojo, NULL, napi_default, NULL },
    { "fetchAsString", NULL, NULL, njsOracleDb_getFetchAsString,
            njsOracleDb_setFetchAsString, NULL, napi_default, NULL },
    { "lobPrefetchSize", NULL, NULL, njsOracleDb_getLobPrefetchSize,
            njsOracleDb_setLobPrefetchSize, NULL, napi_default, NULL },
    { "maxRows", NULL, NULL, njsOracleDb_getMaxRows, njsOracleDb_setMaxRows,
            NULL, napi_default, NULL },
    { "oracleClientVersion", NULL, NULL, njsOracleDb_getOracleClientVersion,
            NULL, NULL, napi_default, NULL },
    { "oracleClientVersionString", NULL, NULL,
            njsOracleDb_getOracleClientVersionString, NULL, NULL, napi_default,
            NULL },
    { "outFormat", NULL, NULL, njsOracleDb_getOutFormat,
            njsOracleDb_setOutFormat, NULL, napi_default, NULL },
    { "poolIncrement", NULL, NULL, njsOracleDb_getPoolIncrement,
            njsOracleDb_setPoolIncrement, NULL, napi_default, NULL },
    { "poolMax", NULL, NULL, njsOracleDb_getPoolMax, njsOracleDb_setPoolMax,
            NULL, napi_default, NULL },
    { "poolMaxPerShard", NULL, NULL, njsOracleDb_getPoolMaxPerShard,
            njsOracleDb_setPoolMaxPerShard, NULL, napi_default, NULL },
    { "poolMin", NULL, NULL, njsOracleDb_getPoolMin, njsOracleDb_setPoolMin,
            NULL, napi_default, NULL },
    { "poolPingInterval", NULL, NULL, njsOracleDb_getPoolPingInterval,
            njsOracleDb_setPoolPingInterval, NULL, napi_default, NULL },
    { "poolTimeout", NULL, NULL, njsOracleDb_getPoolTimeout,
            njsOracleDb_setPoolTimeout, NULL, napi_default, NULL },
    { "prefetchRows", NULL, NULL, njsOracleDb_getPrefetchRows,
            njsOracleDb_setPrefetchRows, NULL, napi_default, NULL },
    { "stmtCacheSize", NULL, NULL, njsOracleDb_getStmtCacheSize,
            njsOracleDb_setStmtCacheSize, NULL, napi_default, NULL },
    { "version", NULL, NULL, njsOracleDb_getVersion, NULL, NULL, napi_default,
            NULL },
    { "versionString", NULL, NULL, njsOracleDb_getVersionString, NULL, NULL,
            napi_default, NULL },
    { "versionSuffix", NULL, NULL, njsOracleDb_getVersionSuffix, NULL, NULL,
            napi_default, NULL },
    { "_createPool", NULL, njsOracleDb_createPool, NULL, NULL, NULL,
            napi_default, NULL },
    { "_getConnection", NULL, njsOracleDb_getConnection, NULL, NULL, NULL,
            napi_default, NULL },
    { "_initOracleClient", NULL, njsOracleDb_initOracleClient, NULL, NULL,
            NULL, napi_default, NULL },
    { "_returnAccessToken", NULL, njsOracleDb_returnAccessToken, NULL, NULL,
            NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefOracleDb = {
    "OracleDb", sizeof(njsOracleDb), NULL, njsClassProperties,
    njsClassConstants, false
};


//-----------------------------------------------------------------------------
// njsOracleDb_commonProcessArgs()
// Combines all the process arguments common in getConnectionProcessArgs()
// and createPoolProcessArgs()
//
// PARAMETERS
//  - options
//-----------------------------------------------------------------------------
static bool njsOracleDb_commonProcessArgs(njsBaton *baton, napi_env env, napi_value * args)
{
    bool connStrFound, connectionStrFound, userFound, usernameFound;

    baton->stmtCacheSize = baton->oracleDb->stmtCacheSize;
    baton->externalAuth = baton->oracleDb->externalAuth;
    baton->events = baton->oracleDb->events;
    if (!njsUtils_copyString(env, baton->oracleDb->edition,
            baton->oracleDb->editionLength, &baton->edition,
            &baton->editionLength))
        return false;

    if (!njsBaton_getStringFromArg(baton, env, args, 0, "user", &baton->user,
            &baton->userLength, &userFound))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "username", &baton->user,
            &baton->userLength, &usernameFound))
        return false;
    if (userFound && usernameFound)
        return njsBaton_setError (baton, errDblUsername);
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "password",
            &baton->password, &baton->passwordLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "connectString",
            &baton->connectString, &baton->connectStringLength, &connStrFound))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "connectionString",
            &baton->connectString, &baton->connectStringLength,
            &connectionStrFound))
        return false;
    if (connStrFound && connectionStrFound)
        return njsBaton_setError (baton, errDblConnectionString );
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "edition",
            &baton->edition, &baton->editionLength, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "stmtCacheSize",
            &baton->stmtCacheSize, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "externalAuth",
            &baton->externalAuth, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "events", &baton->events,
            NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "privateKey",
            &baton->privateKey, &baton->privateKeyLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "token",
            &baton->token, &baton->tokenLength, NULL))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_createPool()
//   Create a standalone connection to the database.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_createPool(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    // verify number of arguments and create baton
    if (!njsUtils_createBaton(env, info, 1, args, &baton))
        return NULL;
    baton->oracleDb = (njsOracleDb*) baton->callingInstance;

    // process arguments
    if (!njsOracleDb_createPoolProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }

    // queue work
    return njsBaton_queueWork(baton, env, "createPool",
            njsOracleDb_createPoolAsync, njsOracleDb_createPoolPostAsync);
}


//-----------------------------------------------------------------------------
// njsOracleDb_createPoolAsync()
//   Worker function for createPool() performed on thread. This establishes
// the connection using the information found in the baton.
//-----------------------------------------------------------------------------
static bool njsOracleDb_createPoolAsync(njsBaton *baton)
{
    dpiCommonCreateParams commonParams;
    dpiPoolCreateParams params;
    dpiAccessToken accessToken;

    // setup pool creation parameters
    if (dpiContext_initPoolCreateParams(baton->oracleDb->context, &params) < 0)
        return njsBaton_setErrorDPI(baton);
    params.minSessions = baton->poolMin;
    params.maxSessions = baton->poolMax;
    params.maxSessionsPerShard = baton->poolMaxPerShard;
    params.sessionIncrement = baton->poolIncrement;
    params.getMode = (baton->poolMaxPerShard > 0) ?
            DPI_MODE_POOL_GET_TIMEDWAIT : DPI_MODE_POOL_GET_WAIT;
    params.waitTimeout = baton->poolWaitTimeout;
    params.timeout = baton->poolTimeout;
    params.externalAuth = baton->externalAuth;
    params.homogeneous = baton->homogeneous;
    params.plsqlFixupCallback = baton->plsqlFixupCallback;
    params.plsqlFixupCallbackLength =
            (uint32_t) baton->plsqlFixupCallbackLength;
    if (params.externalAuth && !baton->token && !baton->privateKey)
        params.homogeneous = 0;
    params.pingInterval = baton->poolPingInterval;

    // call function for token based authentication
    if (baton->accessTokenCallback) {
        params.accessTokenCallback =
               (dpiAccessTokenCallback) njsTokenCallback_eventHandler;
        params.accessTokenCallbackContext = baton->accessTokenCallback;
    }

    // setup common creation parameters
    if (!njsOracleDb_initCommonCreateParams(baton, &commonParams))
        return false;
    commonParams.edition = baton->edition;
    commonParams.editionLength = (uint32_t) baton->editionLength;
    if (baton->sodaMetadataCache)
        commonParams.sodaMetadataCache = 1;
    commonParams.stmtCacheSize = baton->stmtCacheSize;

    // set token based auth parameters
    if (baton->token) {
        accessToken.token = baton->token;
        accessToken.tokenLength = baton->tokenLength;
        accessToken.privateKey = baton->privateKey;
        accessToken.privateKeyLength = baton->privateKeyLength;
        commonParams.accessToken = &accessToken;
    }

    // create pool
    if (dpiPool_create(baton->oracleDb->context, baton->user,
            (uint32_t) baton->userLength, baton->password,
            (uint32_t) baton->passwordLength, baton->connectString,
            (uint32_t) baton->connectStringLength, &commonParams,
            &params, &baton->dpiPoolHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_createPoolPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsOracleDb_createPoolPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    return njsPool_newFromBaton(baton, env, result);
}


//-----------------------------------------------------------------------------
// njsOracleDb_createPoolProcessArgs()
//   Process the arguments for njsOracleDb_createPool().
//-----------------------------------------------------------------------------
static bool njsOracleDb_createPoolProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    napi_value callback;
    // initialize ODPI-C library, if necessary
    if (!njsOracleDb_initDPI(baton->oracleDb, env, NULL, baton))
        return false;

    // set defaults on baton
    baton->homogeneous = true;
    baton->poolMax = baton->oracleDb->poolMax;
    baton->poolMaxPerShard = baton->oracleDb->poolMaxPerShard;
    baton->poolMin = baton->oracleDb->poolMin;
    baton->poolIncrement = baton->oracleDb->poolIncrement;
    baton->poolTimeout = baton->oracleDb->poolTimeout;
    baton->poolPingInterval = baton->oracleDb->poolPingInterval;

    // check the various options
    if (!njsOracleDb_commonProcessArgs(baton, env, args))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "sessionCallback",
            &baton->plsqlFixupCallback, &baton->plsqlFixupCallbackLength,
            NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolMax",
            &baton->poolMax, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolMaxPerShard",
            &baton->poolMaxPerShard, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolMin",
            &baton->poolMin, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolIncrement",
            &baton->poolIncrement, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolTimeout",
            &baton->poolTimeout, NULL))
        return false;
    if (!njsBaton_getIntFromArg(baton, env, args, 0, "poolPingInterval",
            &baton->poolPingInterval, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "homogeneous",
            &baton->homogeneous, NULL))
        return false;
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "queueTimeout",
            &baton->poolWaitTimeout, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "sodaMetaDataCache",
            &baton->sodaMetadataCache, NULL))
        return false;
    if (!njsBaton_getValueFromArg(baton, env, args, 0, "accessTokenCallback",
            napi_function, &callback, NULL))
        return false;
    if (callback) {
        if (!njsTokenCallback_new(baton, env))
            return false;
        NJS_CHECK_NAPI(env, napi_create_reference(env, callback, 1,
            &baton->accessTokenCallback->jsCallback))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_finalize()
//   Invoked when the njsOracleDb object is garbage collected.
//-----------------------------------------------------------------------------
static void njsOracleDb_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsOracleDb *oracleDb = (njsOracleDb*) finalizeData;

    NJS_FREE_AND_CLEAR(oracleDb->connectionClass);
    NJS_FREE_AND_CLEAR(oracleDb->edition);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsBaseDbObjectConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsDateConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsConnectionConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsLobConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsPoolConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsResultSetConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsSodaCollectionConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsSodaDatabaseConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsSodaDocCursorConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsSodaDocumentConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsSodaOperationConstructor);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsSubscriptions);
    NJS_DELETE_REF_AND_CLEAR(oracleDb->jsTokenCallbackHandler);
    if (oracleDb->context) {
        dpiContext_destroy(oracleDb->context);
        oracleDb->context = NULL;
    }
    free(oracleDb);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getAutoCommit()
//   Get accessor of "autoCommit" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getAutoCommit(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToBoolean(env, oracleDb->autoCommit);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getConnection()
//   Create a standalone connection to the database.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getConnection(napi_env env,
        napi_callback_info info)
{
    napi_value args[1];
    njsBaton *baton;

    if (!njsUtils_createBaton(env, info, 1, args, &baton))
        return NULL;
    baton->oracleDb = (njsOracleDb*) baton->callingInstance;
    if (!njsOracleDb_getConnectionProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    return njsBaton_queueWork(baton, env, "GetConnection",
            njsOracleDb_getConnectionAsync,
            njsOracleDb_getConnectionPostAsync);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getConnectionAsync()
//   Worker function for GetConnection() performed on thread. This establishes
// the connection using the information found in the baton.
//-----------------------------------------------------------------------------
static bool njsOracleDb_getConnectionAsync(njsBaton *baton)
{
    dpiCommonCreateParams commonParams;
    dpiConnCreateParams params;
    dpiAccessToken accessToken;

    if (dpiContext_initConnCreateParams(baton->oracleDb->context, &params) < 0)
        return njsBaton_setErrorDPI(baton);
    if (baton->privilege)
        params.authMode = (dpiAuthMode) baton->privilege;
    params.externalAuth = baton->externalAuth;
    params.connectionClass = baton->connectionClass;
    params.connectionClassLength = (uint32_t) baton->connectionClassLength;
    params.newPassword = baton->newPassword;
    params.newPasswordLength = (uint32_t) baton->newPasswordLength;
    if (!njsOracleDb_initCommonCreateParams(baton, &commonParams))
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

    if (dpiConn_create(baton->oracleDb->context, baton->user,
            (uint32_t) baton->userLength, baton->password,
            (uint32_t) baton->passwordLength, baton->connectString,
            (uint32_t) baton->connectStringLength, &commonParams, &params,
            &baton->dpiConnHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_getConnectionPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsOracleDb_getConnectionPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    return njsConnection_newFromBaton(baton, env, result);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getConnectionProcessArgs()
//   Process the arguments for the GetConnection() call.
//-----------------------------------------------------------------------------
static bool njsOracleDb_getConnectionProcessArgs(njsBaton *baton,
        napi_env env, napi_value *args)
{
    // initialize ODPI-C library, if necessary
    if (!njsOracleDb_initDPI(baton->oracleDb, env, NULL, baton))
        return false;

    // copy items used from the OracleDb class since they may change after
    // the asynchronous function begins
    if (!njsUtils_copyString(env, baton->oracleDb->connectionClass,
            baton->oracleDb->connectionClassLength, &baton->connectionClass,
            &baton->connectionClassLength))
        return false;

    // check the various options
    if (!njsOracleDb_commonProcessArgs(baton, env, args))
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

    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_getConnectionClass()
//   Get accessor of "connectionClass" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getConnectionClass(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToString(env, oracleDb->connectionClass,
            (uint32_t) oracleDb->connectionClassLength);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getEdition()
//   Get accessor of "edition" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getEdition(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToString(env, oracleDb->edition,
            (uint32_t) oracleDb->editionLength);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getEvents()
//   Get accessor of "events" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getEvents(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToBoolean(env, oracleDb->events);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getExtendedMetaData()
//   Get accessor of "extendedMetaData" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getExtendedMetaData(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToBoolean(env, oracleDb->extendedMetaData);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getExternalAuth()
//   Get accessor of "externalAuth" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getExternalAuth(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToBoolean(env, oracleDb->externalAuth);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getFetchArraySize()
//   Get accessor of "fetchArraySize" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getFetchArraySize(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->fetchArraySize);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getFetchAsBuffer()
//   Get accessor of "fetchAsBuffer" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getFetchAsBuffer(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedIntArray(env,
            oracleDb->numFetchAsBufferTypes, oracleDb->fetchAsBufferTypes);
}



//-----------------------------------------------------------------------------
// njsOracleDb_getDbObjectAsPojo()
//   Get accessor of "dbObjectAsPojo" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getDbObjectAsPojo(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToBoolean(env, oracleDb->dbObjectAsPojo);
}

//-----------------------------------------------------------------------------
// njsOracleDb_getFetchAsString()
//   Get accessor of "fetchAsString" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getFetchAsString(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedIntArray(env,
            oracleDb->numFetchAsStringTypes, oracleDb->fetchAsStringTypes);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getLobPrefetchSize()
//   Get accessor of "lobPrefetchSize" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getLobPrefetchSize(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->lobPrefetchSize);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getMaxRows()
//   Get accessor of "maxRows" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getMaxRows(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->maxRows);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getOracleClientVersion()
//   Get accessor of "oracleClientVersion" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getOracleClientVersion(napi_env env,
        napi_callback_info info)
{
    dpiVersionInfo versionInfo;
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    if (!njsOracleDb_initDPI(oracleDb, env, NULL, NULL))
        return NULL;
    if (dpiContext_getClientVersion(oracleDb->context, &versionInfo) < 0) {
        njsUtils_throwErrorDPI(env, oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, versionInfo.fullVersionNum);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getOracleClientVersionString()
//   Get accessor of "oracleClientVersionString" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getOracleClientVersionString(napi_env env,
        napi_callback_info info)
{
    dpiVersionInfo versionInfo;
    char versionString[40];
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    if (!njsOracleDb_initDPI(oracleDb, env, NULL, NULL))
        return NULL;
    if (dpiContext_getClientVersion(oracleDb->context, &versionInfo) < 0) {
        njsUtils_throwErrorDPI(env, oracleDb);
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
// njsOracleDb_getOutFormat()
//   Get accessor of "outFormat" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getOutFormat(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->outFormat);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getPoolIncrement()
//   Get accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getPoolIncrement(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->poolIncrement);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getPoolMax()
//   Get accessor of "poolMax" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getPoolMax(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->poolMax);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getPoolMaxPerShard()
//   Get accessor of "poolMaxPerShard" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getPoolMaxPerShard(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->poolMaxPerShard);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getPoolMin()
//   Get accessor of "poolMin" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getPoolMin(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->poolMin);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getPoolPingInterval()
//   Get accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getPoolPingInterval(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToInt(env, oracleDb->poolPingInterval);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getPoolTimeout()
//   Get accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getPoolTimeout(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->poolTimeout);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getPrefetchRows()
//   Get accessor of "prefetchRows" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getPrefetchRows(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->prefetchRows);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getStmtCacheSize(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &oracleDb))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, oracleDb->stmtCacheSize);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getVersion()
//   Get accessor of "version" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getVersion(napi_env env, napi_callback_info info)
{
    return njsUtils_convertToUnsignedInt(env, NJS_NODE_ORACLEDB_VERSION);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getVersionString()
//   Get accessor of "versionString" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getVersionString(napi_env env,
        napi_callback_info info)
{
    return njsUtils_convertToString(env, NJS_VERSION_STRING,
            sizeof(NJS_VERSION_STRING)-1);
}


//-----------------------------------------------------------------------------
// njsOracleDb_getVersionSuffix()
//   Get accessor of "versionSuffix" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_getVersionSuffix(napi_env env,
        napi_callback_info info)
{
    return njsUtils_convertToString(env, NJS_NODE_ORACLEDB_SUFFIX,
            sizeof(NJS_NODE_ORACLEDB_SUFFIX)-1);
}


//-----------------------------------------------------------------------------
// njsOracleDb_initOracleClientHelper()
//   Helper method that performs the work of njsOracleDb_initOracleClient().
//-----------------------------------------------------------------------------
static bool njsOracleDb_initOracleClientHelper(napi_env env,
        napi_callback_info info)
{
    size_t libDirLength, configDirLength, errorUrlLength, driverNameLength;
    char *libDir, *configDir, *errorUrl, *driverName;
    njsBaseInstance *callingInstance;
    napi_value callingObj, args[1];
    dpiContextCreateParams params;
    njsOracleDb *oracleDb;
    bool ok;

    // process arguments
    libDir = configDir = errorUrl = driverName = NULL;
    libDirLength = configDirLength = errorUrlLength = driverNameLength = 0;
    if (!njsUtils_validateArgs(env, info, 1, args, &callingObj,
            &callingInstance))
        return false;
    if (!njsUtils_getStringFromArg(env, args, 0, "libDir", &libDir,
            &libDirLength, NULL, NULL))
        return false;
    if (!njsUtils_getStringFromArg(env, args, 0, "configDir", &configDir,
            &configDirLength, NULL, NULL))
        return false;
    if (!njsUtils_getStringFromArg(env, args, 0, "errorUrl", &errorUrl,
            &errorUrlLength, NULL, NULL))
        return false;
    if (!njsUtils_getStringFromArg(env, args, 0, "driverName", &driverName,
            &driverNameLength, NULL, NULL))
        return false;

    // initialize library
    memset(&params, 0, sizeof(params));
    if (libDirLength > 0)
        params.oracleClientLibDir = libDir;
    if (configDirLength > 0)
        params.oracleClientConfigDir = configDir;
    if (errorUrlLength > 0)
        params.loadErrorUrl = errorUrl;
    if (driverNameLength > 0)
        params.defaultDriverName = driverName;
    oracleDb = (njsOracleDb*) callingInstance;
    ok = njsOracleDb_initDPI(oracleDb, env, &params, NULL);

    // cleanup
    if (libDir)
        free(libDir);
    if (configDir)
        free(configDir);
    if (errorUrl)
        free(errorUrl);
    if (driverName)
        free(driverName);
    return ok;
}


//-----------------------------------------------------------------------------
// njsOracleDb_initOracleClient()
//   Initialize the Oracle Client library now, rather than when the first pool
// or standalone connection is created, or a request is made to determine the
// Oracle Client version. If the Oracle Client library has already been
// initialized, an exception is raised.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_initOracleClient(napi_env env,
        napi_callback_info info)
{
    njsOracleDb_initOracleClientHelper(env, info);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_returnAccessTokenHelper()
//   Helper method that performs the work of njsOracleDb_returnAccessToken().
//-----------------------------------------------------------------------------
static bool njsOracleDb_returnAccessTokenHelper(napi_env env,
        napi_callback_info info)
{
    njsBaseInstance *callingInstance;
    napi_value callingObj, args[2];
    njsTokenCallback *callback;

    if (!njsUtils_validateArgs(env, info, 2, args, &callingObj,
            &callingInstance))
        return false;
    NJS_CHECK_NAPI(env, napi_get_value_external(env, args[0],
            (void**) &callback))
    return njsTokenCallback_returnAccessToken(callback, env, args[1]);
}


//-----------------------------------------------------------------------------
// njsOracleDb_returnAccessToken()
//   Returns the access token through to the callback. This needs to be done
// independently in order to handle possible asynchronous Javascript code.
//
// PARAMETERS
//   - externalObj (contains native njsAccessToken structure)
//   - accessToken (value to be returned through callback)
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_returnAccessToken(napi_env env,
        napi_callback_info info)
{
    njsOracleDb_returnAccessTokenHelper(env, info);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_initCommonCreateParams()
//   Initialize common creation parameters for pools and standalone
// connection creation.
//-----------------------------------------------------------------------------
static bool njsOracleDb_initCommonCreateParams(njsBaton *baton,
        dpiCommonCreateParams *params)
{
    if (dpiContext_initCommonCreateParams(baton->oracleDb->context,
            params) < 0)
        return njsBaton_setErrorDPI(baton);
    params->createMode = DPI_MODE_CREATE_THREADED;
    if (baton->events)
        params->createMode = (dpiCreateMode)
                (params->createMode | DPI_MODE_CREATE_EVENTS);
    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_initDPI()
//   Initialize the ODPI-C library. This is done when the first standalone
// connection or session pool is created, rather than when the module is first
// imported so that manipulating Oracle environment variables will work as
// expected. It also has the additional benefit of reducing the number of
// errors that can take place when the module is imported.
//-----------------------------------------------------------------------------
static bool njsOracleDb_initDPI(njsOracleDb *oracleDb, napi_env env,
        dpiContextCreateParams *params, njsBaton *baton)
{
    dpiContextCreateParams localParams;
    napi_value error, message;
    dpiErrorInfo errorInfo;

    // if already initialized and parameters were passed, raise an exception;
    // otherwise do nothing as this is implicitly called when creating a
    // standalone connection or session pool and when getting the Oracle Client
    // library version
    if (oracleDb->context) {
        if (!params)
            return true;
        return njsUtils_throwError(env, errClientLibAlreadyInitialized);
    }

    // set up parameters used for initializing ODPI-C
    if (params) {
        memcpy(&localParams, params, sizeof(dpiContextCreateParams));
    } else {
        memset(&localParams, 0, sizeof(dpiContextCreateParams));
    }
    localParams.defaultEncoding = NJS_ENCODING;
    if (!localParams.defaultDriverName)
        localParams.defaultDriverName = NJS_DRIVER_NAME;
    if (!localParams.loadErrorUrl)
        localParams.loadErrorUrl =
                "https://oracle.github.io/node-oracledb/INSTALL.html";

    // create global DPI context (with baton available)
    if (baton) {
        if (dpiContext_createWithParams(DPI_MAJOR_VERSION, DPI_MINOR_VERSION,
                &localParams, &oracleDb->context, &baton->errorInfo) < 0) {
            baton->dpiError = true;
            return false;
        }

    // create global DPI context (no baton available, throw error immediately)
    } else {
        if (dpiContext_createWithParams(DPI_MAJOR_VERSION, DPI_MINOR_VERSION,
                &localParams, &oracleDb->context, &errorInfo) < 0) {
            NJS_CHECK_NAPI(env, napi_create_string_utf8(env, errorInfo.message,
                    errorInfo.messageLength, &message))
            NJS_CHECK_NAPI(env, napi_create_error(env, NULL, message, &error))
            NJS_CHECK_NAPI(env, napi_throw(env, error))
            return false;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_new()
//   Invoked when a new instance of the OracleDb class is created.
//-----------------------------------------------------------------------------
bool njsOracleDb_new(napi_env env, napi_value instanceObj,
        njsOracleDb **instance)
{
    njsOracleDb *oracleDb;
    napi_value temp;

    // allocate memory for structure and populate it with default values
    // memory is zero-ed so only non-zero values need to be set
    oracleDb = calloc(1, sizeof(njsOracleDb));
    if (!oracleDb) {
        njsUtils_throwError(env, errInsufficientMemory);
        return false;
    }
    oracleDb->outFormat = NJS_ROWS_ARRAY;
    oracleDb->maxRows = NJS_MAX_ROWS;
    oracleDb->stmtCacheSize = NJS_STMT_CACHE_SIZE;
    oracleDb->poolMax = NJS_POOL_MAX;
    oracleDb->poolMin = NJS_POOL_MIN;
    oracleDb->poolIncrement = NJS_POOL_INCR;
    oracleDb->poolTimeout = NJS_POOL_TIMEOUT;
    oracleDb->fetchArraySize = DPI_DEFAULT_FETCH_ARRAY_SIZE;
    oracleDb->prefetchRows = DPI_DEFAULT_PREFETCH_ROWS;
    oracleDb->lobPrefetchSize = NJS_LOB_PREFETCH_SIZE;
    oracleDb->poolPingInterval = NJS_POOL_DEFAULT_PING_INTERVAL;

    // wrap the structure for use by JavaScript
    if (napi_wrap(env, instanceObj, oracleDb, njsOracleDb_finalize, NULL,
            NULL) != napi_ok) {
        free(oracleDb);
        return njsUtils_genericThrowError(env);
    }

    // create object for storing subscriptions
    NJS_CHECK_NAPI(env, napi_create_object(env, &temp))
    NJS_CHECK_NAPI(env, napi_create_reference(env, temp, 1,
            &oracleDb->jsSubscriptions))

    *instance = oracleDb;
    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_prepareClass()
//   Prepares the class for use by the module. This extends the prototype of
// the named class with the specified properties.
//-----------------------------------------------------------------------------
bool njsOracleDb_prepareClass(njsOracleDb *oracleDb, napi_env env,
        napi_value instance, const njsClassDef *classDef, napi_ref *clsRef)
{
    napi_value cls, prototype, tempInstance, extendFn, tempResult;
    napi_property_descriptor *allProperties, *tempProperty;
    size_t numProperties, numBaseProperties, i;

    // get the class from the instance
    NJS_CHECK_NAPI(env, napi_get_named_property(env, instance, classDef->name,
            &cls))

    // create a new instance of the class (temporarily) and get its prototype
    NJS_CHECK_NAPI(env, napi_new_instance(env, cls, 0, NULL, &tempInstance))
    NJS_CHECK_NAPI(env, napi_get_prototype(env, tempInstance, &prototype))

    // scan each of the class properties and constants to get the total number
    // of properties to define
    numProperties = 0;
    if (!classDef->propertiesOnInstance) {
        for (i = 0; classDef->properties[i].utf8name; i++, numProperties++);
    }
    numBaseProperties = numProperties;
    if (classDef->constants)
        for (i = 0; njsClassConstants[i].name; i++, numProperties++);

    // perform define if any properties are present
    if (numProperties > 0) {

        // allocate memory for all of the properties
        allProperties = calloc(numProperties,
                sizeof(napi_property_descriptor));
        if (!allProperties) {
            njsUtils_throwError(env, errInsufficientMemory);
            return false;
        }

        // store the instance on each of the properties as a convenience
        for (i = 0; i < numProperties; i++)
            allProperties[i].data = oracleDb;

        // populate the properties
        memcpy(allProperties, classDef->properties,
                sizeof(napi_property_descriptor) * numBaseProperties);
        if (classDef->constants) {
            for (i = 0; classDef->constants[i].name; i++) {
                tempProperty = &allProperties[numBaseProperties + i];
                tempProperty->utf8name = classDef->constants[i].name;
                if (napi_create_uint32(env, classDef->constants[i].value,
                        &tempProperty->value) != napi_ok) {
                    free(allProperties);
                    return njsUtils_genericThrowError(env);
                }
                tempProperty->attributes = napi_enumerable;
            }
        }

        // define the properties on the prototype
        if (napi_define_properties(env, prototype, numProperties,
                allProperties) != napi_ok) {
            free(allProperties);
            return njsUtils_genericThrowError(env);
        }
        free(allProperties);

    }

    // and call the _extend function defined in JavaScript
    NJS_CHECK_NAPI(env, napi_get_named_property(env, prototype, "_extend",
            &extendFn))
    NJS_CHECK_NAPI(env, napi_call_function(env, prototype, extendFn, 1,
            &instance, &tempResult))

    // keep a reference to it, if requested
    if (clsRef) {
        NJS_CHECK_NAPI(env, napi_create_reference(env, cls, 1, clsRef))

    // otherwise, acquire access token callback handler and store reference
    } else {
        NJS_CHECK_NAPI(env, napi_get_named_property(env, instance,
                "_accessTokenHandler", &tempResult))
        NJS_CHECK_NAPI(env, napi_create_reference(env, tempResult, 1,
                &oracleDb->jsTokenCallbackHandler))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setAutoCommit()
//   Set accessor of "autoCommit" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setAutoCommit(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropBool(env, value, "autoCommit", &oracleDb->autoCommit))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setConnectionClass()
//   Set accessor of "connectionClass" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setConnectionClass(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropString(env, value, "connectionClass",
            &oracleDb->connectionClass, &oracleDb->connectionClassLength))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setEdition()
//   Set accessor of "edition" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setEdition(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropString(env, value, "edition", &oracleDb->edition,
            &oracleDb->editionLength))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setEvents()
//   Set accessor of "events" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setEvents(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropBool(env, value, "events", &oracleDb->events))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setExtendedMetaData()
//   Set accessor of "extendedMetaData" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setExtendedMetaData(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropBool(env, value, "extendedMetaData",
            &oracleDb->extendedMetaData))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setExternalAuth()
//   Set accessor of "externalAuth" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setExternalAuth(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropBool(env, value, "externalAuth",
            &oracleDb->externalAuth))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setFetchArraySize()
//   Set accessor of "fetchArraySize" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setFetchArraySize(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;
    uint32_t temp;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "fetchArraySize", &temp))
        return NULL;
    if (temp == 0) {
        njsUtils_throwError(env, errInvalidPropertyValue, "fetchArraySize");
        return NULL;
    }
    oracleDb->fetchArraySize = temp;
    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setFetchAsBuffer()
//   Set accessor of "fetchAsBuffer" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setFetchAsBuffer(napi_env env,
        napi_callback_info info)
{
    const uint32_t validTypes[] = { NJS_DATATYPE_BLOB, 0 };
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    njsUtils_setPropUnsignedIntArray(env, value, "fetchAsBuffer",
            &oracleDb->numFetchAsBufferTypes, &oracleDb->fetchAsBufferTypes,
            validTypes);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setDbObjectAsPojo()
//   Set accessor of "dbObjectAsPojo" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setDbObjectAsPojo(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropBool(env, value, "dbObjectAsPojo",
            &oracleDb->dbObjectAsPojo))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setFetchAsString()
//   Set accessor of "fetchAsString" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setFetchAsString(napi_env env,
        napi_callback_info info)
{
    const uint32_t validTypes[] = { NJS_DATATYPE_NUM, NJS_DATATYPE_DATE,
            NJS_DATATYPE_BUFFER, NJS_DATATYPE_CLOB, NJS_DATATYPE_NCLOB,
            NJS_DATATYPE_JSON, 0 };
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    njsUtils_setPropUnsignedIntArray(env, value, "fetchAsString",
            &oracleDb->numFetchAsStringTypes, &oracleDb->fetchAsStringTypes,
            validTypes);
    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setLobPrefetchSize()
//   Set accessor of "lobPrefetchSize" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setLobPrefetchSize(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "lobPrefetchSize",
            &oracleDb->lobPrefetchSize))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setMaxRows()
//   Set accessor of "maxRows" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setMaxRows(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "maxRows",
            &oracleDb->maxRows))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setOutFormat()
//   Set accessor of "outFormat" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setOutFormat(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "outFormat",
            &oracleDb->outFormat))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setPoolIncrement()
//   Set accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setPoolIncrement(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "poolIncrement",
            &oracleDb->poolIncrement))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setPoolMax()
//   Set accessor of "poolMax" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setPoolMax(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "poolMax",
            &oracleDb->poolMax))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setPoolMaxPerShard()
//   Set accessor of "poolMaxPerShard" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setPoolMaxPerShard(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "poolMaxPerShard",
            &oracleDb->poolMaxPerShard))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setPoolMin()
//   Set accessor of "poolMin" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setPoolMin(napi_env env, napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "poolMin",
            &oracleDb->poolMin))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setPoolPingInterval()
//   Set accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setPoolPingInterval(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropInt(env, value, "poolPingInterval",
            &oracleDb->poolPingInterval))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setPoolTimeout()
//   Set accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setPoolTimeout(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "poolTimeout",
            &oracleDb->poolTimeout))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setPrefetchRows()
//   Set accessor of "prefetchRows" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setPrefetchRows(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "prefetchRows",
            &oracleDb->prefetchRows))
        return NULL;

    return NULL;
}


//-----------------------------------------------------------------------------
// njsOracleDb_setStmtCacheSize()
//   Set accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
static napi_value njsOracleDb_setStmtCacheSize(napi_env env,
        napi_callback_info info)
{
    njsOracleDb *oracleDb;
    napi_value value;

    if (!njsUtils_validateSetter(env, info, (njsBaseInstance**) &oracleDb,
            &value))
        return NULL;
    if (!njsUtils_setPropUnsignedInt(env, value, "stmtCacheSize",
            &oracleDb->stmtCacheSize))
        return NULL;

    return NULL;
}
