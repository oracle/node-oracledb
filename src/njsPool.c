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
//   njsPool.c
//
// DESCRIPTION
//   Pool class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
NJS_NAPI_METHOD_DECL_ASYNC(njsPool_close);
NJS_NAPI_METHOD_DECL_ASYNC(njsPool_create);
NJS_NAPI_METHOD_DECL_ASYNC(njsPool_getConnection);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getConnectionsInUse);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getConnectionsOpen);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getPoolIncrement);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getPoolMax);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getPoolMaxPerShard);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getPoolMin);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getPoolPingInterval);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getPoolTimeout);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getStmtCacheSize);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_getSodaMetaDataCache);
NJS_NAPI_METHOD_DECL_ASYNC(njsPool_reconfigure);
NJS_NAPI_METHOD_DECL_SYNC(njsPool_returnAccessToken);
NJS_NAPI_METHOD_DECL_ASYNC(njsPool_setAccessToken);

// asynchronous methods
static NJS_ASYNC_METHOD(njsPool_closeAsync);
static NJS_ASYNC_METHOD(njsPool_createAsync);
static NJS_ASYNC_METHOD(njsPool_getConnectionAsync);
static NJS_ASYNC_METHOD(njsPool_reconfigureAsync);
static NJS_ASYNC_METHOD(njsPool_setAccessTokenAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsPool_createPostAsync);
static NJS_ASYNC_POST_METHOD(njsPool_getConnectionPostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsPool_createProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsPool_getConnectionProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsPool_reconfigureProcessArgs);

// finalize
static NJS_NAPI_FINALIZE(njsPool_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "close", NULL, njsPool_close, NULL, NULL, NULL, napi_default, NULL },
    { "create", NULL, njsPool_create, NULL, NULL, NULL, napi_default, NULL },
    { "getConnection", NULL, njsPool_getConnection, NULL, NULL, NULL,
            napi_default, NULL },
    { "getConnectionsInUse", NULL, njsPool_getConnectionsInUse, NULL, NULL,
            NULL, napi_default, NULL },
    { "getConnectionsOpen", NULL, njsPool_getConnectionsOpen, NULL, NULL, NULL,
            napi_default, NULL },
    { "getPoolIncrement", NULL, njsPool_getPoolIncrement, NULL, NULL, NULL,
            napi_default, NULL },
    { "getPoolMax", NULL, njsPool_getPoolMax, NULL, NULL, NULL, napi_default,
            NULL },
    { "getPoolMaxPerShard", NULL, njsPool_getPoolMaxPerShard, NULL, NULL, NULL,
            napi_default, NULL },
    { "getPoolMin", NULL, njsPool_getPoolMin, NULL, NULL, NULL, napi_default,
            NULL },
    { "getPoolPingInterval", NULL, njsPool_getPoolPingInterval, NULL, NULL,
            NULL, napi_default, NULL },
    { "getPoolTimeout", NULL, njsPool_getPoolTimeout, NULL, NULL, NULL,
            napi_default, NULL },
    { "getStmtCacheSize", NULL, njsPool_getStmtCacheSize, NULL, NULL, NULL,
            napi_default, NULL },
    { "getSodaMetaDataCache", NULL, njsPool_getSodaMetaDataCache, NULL, NULL,
            NULL, napi_default, NULL },
    { "reconfigure", NULL, njsPool_reconfigure, NULL, NULL, NULL,
            napi_default, NULL },
    { "returnAccessToken", NULL, njsPool_returnAccessToken, NULL, NULL, NULL,
            napi_default, NULL },
    { "setAccessToken", NULL, njsPool_setAccessToken, NULL, NULL, NULL,
            napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefPool = {
    "PoolImpl", sizeof(njsPool), njsPool_finalize, njsClassProperties, false
};


//-----------------------------------------------------------------------------
// njsPool_close()
//   Close the pool.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsPool_close, 1, NULL)
{
    njsPool *pool = (njsPool*) baton->callingInstance;

    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "forceClose",
            &baton->force, NULL))
        return false;
    baton->accessTokenCallback = pool->accessTokenCallback;
    pool->accessTokenCallback = NULL;
    baton->dpiPoolHandle = pool->handle;
    pool->handle = NULL;
    return njsBaton_queueWork(baton, env, "Close", njsPool_closeAsync, NULL,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsPool_closeAsync()
//   Worker function for njsPool_close().
//-----------------------------------------------------------------------------
static bool njsPool_closeAsync(njsBaton *baton)
{
    dpiPoolCloseMode mode = (baton->force) ? DPI_MODE_POOL_CLOSE_FORCE :
            DPI_MODE_POOL_CLOSE_DEFAULT;
    njsPool *pool = (njsPool*) baton->callingInstance;

    pool->accessTokenCallback = baton->accessTokenCallback;
    if (baton->accessTokenCallback) {
        njsTokenCallback_stopNotifications(baton->accessTokenCallback);
        baton->accessTokenCallback = NULL;
    }
    if (dpiPool_close(baton->dpiPoolHandle, mode) < 0) {
        njsBaton_setErrorDPI(baton);
        pool->handle = baton->dpiPoolHandle;
        baton->dpiPoolHandle = NULL;
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_create()
//   Create a connection pool.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsPool_create, 1, &njsClassDefPool)
{
    napi_value callingObj;

    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &callingObj))
    if (!njsPool_createProcessArgs(baton, env, args))
        return false;
    return njsBaton_queueWork(baton, env, "create", njsPool_createAsync,
            njsPool_createPostAsync, returnValue);
}


//-----------------------------------------------------------------------------
// njsPool_createAsync()
//   Worker function for createPool() performed on thread. This establishes
// the connection using the information found in the baton.
//-----------------------------------------------------------------------------
static bool njsPool_createAsync(njsBaton *baton)
{
    dpiCommonCreateParams commonParams;
    dpiPoolCreateParams params;
    dpiAccessToken accessToken;

    // setup pool creation parameters
    if (dpiContext_initPoolCreateParams(baton->globals->context, &params) < 0)
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
    if (!njsBaton_initCommonCreateParams(baton, &commonParams))
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
    if (dpiPool_create(baton->globals->context, baton->user,
            (uint32_t) baton->userLength, baton->password,
            (uint32_t) baton->passwordLength, baton->connectString,
            (uint32_t) baton->connectStringLength, &commonParams,
            &params, &baton->dpiPoolHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_createPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsPool_createPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    njsPool *pool = (njsPool*) baton->callingInstance;

    // transfer the ODPI-C pool handle to the new object
    pool->handle = baton->dpiPoolHandle;
    baton->dpiPoolHandle = NULL;

    // perform other initializations
    pool->poolMax = baton->poolMax;
    pool->poolMaxPerShard = baton->poolMaxPerShard;
    pool->poolMin = baton->poolMin;
    pool->poolIncrement = baton->poolIncrement;
    pool->poolTimeout = baton->poolTimeout;
    pool->poolPingInterval = baton->poolPingInterval;
    pool->stmtCacheSize = baton->stmtCacheSize;
    pool->sodaMetadataCache = baton->sodaMetadataCache;

    // token based authentication initialization
    if (baton->accessTokenCallback) {
        pool->accessTokenCallback = baton->accessTokenCallback;
        if (!njsTokenCallback_startNotifications(pool->accessTokenCallback,
                env))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_createProcessArgs()
//   Process the arguments for njsPool_create().
//-----------------------------------------------------------------------------
static bool njsPool_createProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    napi_value callback;

    // set defaults
    baton->homogeneous = true;
    if (!njsBaton_getGlobalSettings(baton, env,
            NJS_GLOBAL_ATTR_POOL_MAX,
            NJS_GLOBAL_ATTR_POOL_MAX_PER_SHARD,
            NJS_GLOBAL_ATTR_POOL_MIN,
            NJS_GLOBAL_ATTR_POOL_INCREMENT,
            NJS_GLOBAL_ATTR_POOL_TIMEOUT,
            NJS_GLOBAL_ATTR_POOL_PING_INTERVAL,
            0))
        return false;

    // check the various options
    if (!njsBaton_commonConnectProcessArgs(baton, env, args))
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
    if (callback && !njsTokenCallback_new(baton, env, callback))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_finalize()
//   Invoked when the njsPool object is garbage collected.
//-----------------------------------------------------------------------------
static void njsPool_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsPool *pool = (njsPool*) finalizeData;

    if (pool->handle) {
        NJS_FREE_AND_CLEAR(pool->accessTokenCallback);
        dpiPool_release(pool->handle);
        pool->handle = NULL;
    }
    free(pool);
}


//-----------------------------------------------------------------------------
// njsPool_getConnection()
//   Acquires a connection from the pool and returns it.
//
// PARAMETERS
//   - options
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsPool_getConnection, 1, NULL)
{
    njsPool *pool = (njsPool*) baton->callingInstance;

    if (!pool->handle)
        return njsBaton_setError(baton, errInvalidPool);
    if (!njsPool_getConnectionProcessArgs(baton, env, args))
        return false;
    return njsBaton_queueWork(baton, env, "GetConnection",
            njsPool_getConnectionAsync, njsPool_getConnectionPostAsync,
            returnValue);
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionAsync()
//   Worker function for njsPool_getConnection().
//-----------------------------------------------------------------------------
static bool njsPool_getConnectionAsync(njsBaton *baton)
{
    njsPool *pool = (njsPool*) baton->callingInstance;
    dpiConnCreateParams params;

    // populate connection creation parameters
    if (dpiContext_initConnCreateParams(baton->globals->context, &params) < 0)
        return njsBaton_setErrorDPI(baton);
    params.matchAnyTag = baton->matchAnyTag;
    params.connectionClass = baton->connectionClass;
    params.connectionClassLength = (uint32_t) baton->connectionClassLength;
    params.tag = baton->tag;
    params.tagLength = (uint32_t) baton->tagLength;

    // Sharding
    params.shardingKeyColumns = baton->shardingKeyColumns;
    params.numShardingKeyColumns = baton->numShardingKeyColumns;
    params.superShardingKeyColumns = baton->superShardingKeyColumns;
    params.numSuperShardingKeyColumns = baton->numSuperShardingKeyColumns;

    // acquire connection from pool
    if (dpiPool_acquireConnection(pool->handle, baton->user,
            (uint32_t) baton->userLength, baton->password,
            (uint32_t) baton->passwordLength, &params,
            &baton->dpiConnHandle) < 0)
        return njsBaton_setErrorDPI(baton);

    // keep track of return parameters
    NJS_FREE_AND_CLEAR(baton->tag);
    baton->tagLength = 0;
    if (params.outTagLength > 0) {

        baton->tag = malloc(params.outTagLength);
        if (!baton->tag)
            return njsBaton_setError(baton, errInsufficientMemory);
        strncpy(baton->tag, params.outTag, params.outTagLength);
        baton->tagLength = params.outTagLength;
    }
    baton->newSession = params.outNewSession;
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionPostAsync()
//   Defines the value returned to JS.
//-----------------------------------------------------------------------------
static bool njsPool_getConnectionPostAsync(njsBaton *baton, napi_env env,
        napi_value *result)
{
    napi_value temp;

    // create connection
    if (!njsConnection_newFromBaton(baton, env, result))
        return false;

    // store a reference to the pool on the connection
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObjRef,
            &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "_pool", temp))

    // store a boolean indicating whether a new session was created
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->newSession, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *result, "_newSession",
            temp))

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionProcessArgs()
//   Process the arguments for njsPool_getConnection().
//-----------------------------------------------------------------------------
static bool njsPool_getConnectionProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    bool userFound, usernameFound;

    // copy items used from the settings class since they may change after the
    // aysnchronous function begins
    if (!njsBaton_getGlobalSettings(baton, env,
            NJS_GLOBAL_ATTR_CONNECTION_CLASS, 0))
        return false;

    // check arguments
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "user", &baton->user,
            &baton->userLength, &userFound))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "username",
            &baton->user, &baton->userLength, &usernameFound))
        return false;
    if (userFound && usernameFound)
        return njsBaton_setError (baton, errDblUsername);
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "password",
            &baton->password, &baton->passwordLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "tag", &baton->tag,
            &baton->tagLength, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "matchAnyTag",
            &baton->matchAnyTag, NULL))
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
// njsPool_reconfigure()
//  Change the pool parameters
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsPool_reconfigure, 1, NULL)
{
    njsPool *pool = (njsPool*) baton->callingInstance;

    if (!pool->handle)
        return njsBaton_setError(baton, errInvalidPool);
    if (!njsPool_reconfigureProcessArgs(baton, env, args))
        return false;
    return njsBaton_queueWork(baton, env, "Reconfigure",
            njsPool_reconfigureAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsPool_reconfigureAsync()
//  Worker function for njsPool_reconfigure().
//-----------------------------------------------------------------------------
static bool njsPool_reconfigureAsync(njsBaton *baton)
{
    njsPool *pool = (njsPool*) baton->callingInstance;

    if ((pool->poolMin != baton->poolMin) ||
        (pool->poolMax != baton->poolMax) ||
        (pool->poolIncrement != baton->poolIncrement)) {
        // reconfigure pool-creation parameters
        if (dpiPool_reconfigure(pool->handle, baton->poolMin, baton->poolMax,
                baton->poolIncrement) < 0)
            return njsBaton_setErrorDPI(baton);

        // Update the pool creation parameters.
        pool->poolMin = baton->poolMin;
        pool->poolMax = baton->poolMax;
        pool->poolIncrement = baton->poolIncrement;
    }

    // Other pool parameters: poolPingInterval, poolTimeout, poolMaxPerShard,
    //    stmtCacheSize, sodaMetaDataCache

    if (pool->poolPingInterval != baton->poolPingInterval) {
        if (dpiPool_setPingInterval(pool->handle, baton->poolPingInterval) < 0)
            return njsBaton_setErrorDPI(baton);
        pool->poolPingInterval = baton->poolPingInterval;
    }

    if (pool->poolTimeout != baton->poolTimeout) {
        if (dpiPool_setTimeout(pool->handle, baton->poolTimeout) < 0)
            return njsBaton_setErrorDPI(baton);
        pool->poolTimeout = baton->poolTimeout;
    }

    if (pool->poolMaxPerShard != baton->poolMaxPerShard) {
        if (dpiPool_setMaxSessionsPerShard(pool->handle,
                baton->poolMaxPerShard) < 0)
            return njsBaton_setErrorDPI(baton);
        pool->poolMaxPerShard = baton->poolMaxPerShard;
    }

    if (pool->stmtCacheSize != baton->stmtCacheSize) {
        if (dpiPool_setStmtCacheSize(pool->handle, baton->stmtCacheSize) < 0)
            return njsBaton_setErrorDPI(baton);
        pool->stmtCacheSize = baton->stmtCacheSize;
    }

    if (pool->sodaMetadataCache != baton->sodaMetadataCache) {
        if (dpiPool_setSodaMetadataCache(pool->handle,
                baton->sodaMetadataCache ? 1 : 0) < 0) {
            return njsBaton_setErrorDPI(baton);
        }
        pool->sodaMetadataCache = baton->sodaMetadataCache;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_reconfigureProcessArgs()
//  Process the arguemnts for njsPool_reconfigure().
//-----------------------------------------------------------------------------
static bool njsPool_reconfigureProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    njsPool        *pool = (njsPool *) baton->callingInstance;

    baton->poolMin = pool->poolMin;
    baton->poolMax = pool->poolMax;
    baton->poolIncrement = pool->poolIncrement;
    baton->poolPingInterval = pool->poolPingInterval;
    baton->poolTimeout = pool->poolTimeout;
    baton->stmtCacheSize = pool->stmtCacheSize;
    baton->poolMaxPerShard = pool->poolMaxPerShard;
    baton->sodaMetadataCache = pool->sodaMetadataCache;

    // check arguments
    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolMin",
            &baton->poolMin, NULL))
        return false;

    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolMax",
            &baton->poolMax, NULL))
        return false;

    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolIncrement",
            &baton->poolIncrement, NULL))
        return false;

    if (!njsBaton_getIntFromArg(baton, env, args, 0, "poolPingInterval",
            &baton->poolPingInterval, NULL))
        return false;

    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolTimeout",
            &baton->poolTimeout, NULL))
        return false;

    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "stmtCacheSize",
            &baton->stmtCacheSize, NULL))
        return false;

    if (!njsBaton_getUnsignedIntFromArg(baton, env, args, 0, "poolMaxPerShard",
            &baton->poolMaxPerShard, NULL))
        return false;

    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "sodaMetaDataCache",
            &baton->sodaMetadataCache, NULL))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionsInUse()
//   Get accessor of "connectionsInUse" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getConnectionsInUse, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;
    uint32_t value;

    if (pool->handle) {
        if (dpiPool_getBusyCount(pool->handle, &value) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionsOpen()
//   Get accessor of "connectionsOpen" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getConnectionsOpen, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;
    uint32_t value;

    if (pool->handle) {
        if (dpiPool_getOpenCount(pool->handle, &value) < 0)
            return njsUtils_throwErrorDPI(env, globals);
        NJS_CHECK_NAPI(env, napi_create_uint32(env, value, returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getPoolIncrement()
//   Get accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getPoolIncrement, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, pool->poolIncrement,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getPoolMax()
//   Get accessor of "poolMax" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getPoolMax, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, pool->poolMax, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getPoolMaxPerShard()
//   Get accessor of "poolMaxPerShard" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getPoolMaxPerShard, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, pool->poolMaxPerShard,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getPoolMin()
//   Get accessor of "poolMin" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getPoolMin, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, pool->poolMin, returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getPoolPingInterval()
//   Get accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getPoolPingInterval, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_int32(env, pool->poolPingInterval,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getPoolTimeout()
//   Get accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getPoolTimeout, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, pool->poolTimeout,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getSodaMetaDataCache()
//   Get accessor for "sodaMetaDataCache" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getSodaMetaDataCache, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;
    int enabled;

    if (pool->handle) {
        if (dpiPool_getSodaMetadataCache(pool->handle, &enabled) < 0)
            enabled = 0;
        NJS_CHECK_NAPI(env, napi_get_boolean(env, enabled, returnValue))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_getStmtCacheSize, 0, NULL)
{
    njsPool *pool = (njsPool*) callingInstance;

    NJS_CHECK_NAPI(env, napi_create_uint32(env, pool->stmtCacheSize,
            returnValue))
    return true;
}


//-----------------------------------------------------------------------------
// njsPool_returnAccessToken()
//   Returns the access token through to the callback. This needs to be done
// independently in order to handle possible asynchronous Javascript code.
//
// PARAMETERS
//   - externalObj (contains native njsAccessToken structure)
//   - accessToken (value to be returned through callback)
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_SYNC(njsPool_returnAccessToken, 2, NULL)
{
    njsTokenCallback *callback;

    NJS_CHECK_NAPI(env, napi_get_value_external(env, args[0],
            (void**) &callback))
    return njsTokenCallback_returnAccessToken(callback, env, args[1]);
}


//-----------------------------------------------------------------------------
// njsPool_setAccessToken() [PUBLIC]
//   set access token and private key for existing pool in token
// based authentication
//-----------------------------------------------------------------------------
NJS_NAPI_METHOD_IMPL_ASYNC(njsPool_setAccessToken, 1, NULL)
{
    njsPool *pool = (njsPool*) baton->callingInstance;

    if (!pool->handle)
        return njsBaton_setError(baton, errInvalidPool);
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "token",
            &baton->token, &baton->tokenLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "privateKey",
            &baton->privateKey, &baton->privateKeyLength, NULL))
        return false;
    return njsBaton_queueWork(baton, env, "token",
            njsPool_setAccessTokenAsync, NULL, returnValue);
}


//-----------------------------------------------------------------------------
// njsPool_setAccessTokenAsync() [PUBLIC]
//   set access token and private key for existing pool in token
// based authentication
//-----------------------------------------------------------------------------
static bool njsPool_setAccessTokenAsync(njsBaton *baton)
{
    njsPool *pool = (njsPool*) baton->callingInstance;
    dpiAccessToken tokenInfo;
    tokenInfo.token = baton->token;
    tokenInfo.tokenLength = baton->tokenLength;
    tokenInfo.privateKey = baton->privateKey;
    tokenInfo.privateKeyLength = baton->privateKeyLength;

    if (dpiPool_setAccessToken(pool->handle, &tokenInfo) < 0)
        return njsBaton_setErrorDPI(baton);

    return true;
}
