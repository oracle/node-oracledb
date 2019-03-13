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
//   njsPool.c
//
// DESCRIPTION
//   Pool class implementation.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// class methods
static NJS_NAPI_METHOD(njsPool_close);
static NJS_NAPI_METHOD(njsPool_getConnection);

// asynchronous methods
static NJS_ASYNC_METHOD(njsPool_closeAsync);
static NJS_ASYNC_METHOD(njsPool_getConnectionAsync);

// post asynchronous methods
static NJS_ASYNC_POST_METHOD(njsPool_getConnectionPostAsync);

// processing arguments methods
static NJS_PROCESS_ARGS_METHOD(njsPool_closeProcessArgs);
static NJS_PROCESS_ARGS_METHOD(njsPool_getConnectionProcessArgs);

// getters
static NJS_NAPI_GETTER(njsPool_getConnectionsInUse);
static NJS_NAPI_GETTER(njsPool_getConnectionsOpen);
static NJS_NAPI_GETTER(njsPool_getPoolIncrement);
static NJS_NAPI_GETTER(njsPool_getPoolMax);
static NJS_NAPI_GETTER(njsPool_getPoolMin);
static NJS_NAPI_GETTER(njsPool_getPoolPingInterval);
static NJS_NAPI_GETTER(njsPool_getPoolTimeout);
static NJS_NAPI_GETTER(njsPool_getStmtCacheSize);

// setters
static NJS_NAPI_SETTER(njsPool_setConnectionsInUse);
static NJS_NAPI_SETTER(njsPool_setConnectionsOpen);
static NJS_NAPI_SETTER(njsPool_setPoolIncrement);
static NJS_NAPI_SETTER(njsPool_setPoolMax);
static NJS_NAPI_SETTER(njsPool_setPoolMin);
static NJS_NAPI_SETTER(njsPool_setPoolPingInterval);
static NJS_NAPI_SETTER(njsPool_setPoolTimeout);
static NJS_NAPI_SETTER(njsPool_setStmtCacheSize);

// finalize
static NJS_NAPI_FINALIZE(njsPool_finalize);

// properties defined by the class
static const napi_property_descriptor njsClassProperties[] = {
    { "_close", NULL, njsPool_close, NULL, NULL, NULL, napi_default, NULL },
    { "_getConnection", NULL, njsPool_getConnection, NULL, NULL, NULL,
            napi_default, NULL },
    { "connectionsInUse", NULL, NULL, njsPool_getConnectionsInUse,
            njsPool_setConnectionsInUse, NULL, napi_default, NULL },
    { "connectionsOpen", NULL, NULL, njsPool_getConnectionsOpen,
            njsPool_setConnectionsOpen, NULL, napi_default, NULL },
    { "poolIncrement", NULL, NULL, njsPool_getPoolIncrement,
            njsPool_setPoolIncrement, NULL, napi_default, NULL },
    { "poolMax", NULL, NULL, njsPool_getPoolMax, njsPool_setPoolMax, NULL,
            napi_default, NULL },
    { "poolMin", NULL, NULL, njsPool_getPoolMin, njsPool_setPoolMin, NULL,
            napi_default, NULL },
    { "poolPingInterval", NULL, NULL, njsPool_getPoolPingInterval,
            njsPool_setPoolPingInterval, NULL, napi_default, NULL },
    { "poolTimeout", NULL, NULL, njsPool_getPoolTimeout,
            njsPool_setPoolTimeout, NULL, napi_default, NULL },
    { "stmtCacheSize", NULL, NULL, njsPool_getStmtCacheSize,
            njsPool_setStmtCacheSize, NULL, napi_default, NULL },
    { NULL, NULL, NULL, NULL, NULL, NULL, napi_default, NULL }
};

// class definition
const njsClassDef njsClassDefPool = {
    "Pool", sizeof(njsPool), njsPool_finalize, njsClassProperties, NULL
};

// other methods used internally
static bool njsPool_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton);


//-----------------------------------------------------------------------------
// njsPool_close()
//   Close the pool.
//
// PARAMETERS
//   - options
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
static napi_value njsPool_close(napi_env env, napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;
    njsPool *pool;

    if (!njsPool_createBaton(env, info, 2, args, &baton))
        return NULL;
    if (!njsPool_closeProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }
    pool = (njsPool*) baton->callingInstance;
    baton->dpiPoolHandle = pool->handle;
    pool->handle = NULL;
    njsBaton_queueWork(baton, env, "Close", njsPool_closeAsync, NULL, 1);
    return NULL;
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

    if (dpiPool_close(baton->dpiPoolHandle, mode) < 0) {
        njsBaton_setErrorDPI(baton);
        pool->handle = baton->dpiPoolHandle;
        baton->dpiPoolHandle = NULL;
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_closeProcessArgs()
//   Process the arguments for njsPool_close().
//-----------------------------------------------------------------------------
static bool njsPool_closeProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "forceClose",
            &baton->force, NULL))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_createBaton()
//   Create the baton used for asynchronous methods and initialize all
// values. The pool is also checked to see if it is open. If this fails for
// some reason, an exception is thrown.
//-----------------------------------------------------------------------------
bool njsPool_createBaton(napi_env env, napi_callback_info info,
        size_t numArgs, napi_value *args, njsBaton **baton)
{
    njsPool *pool;
    njsBaton *tempBaton;

    if (!njsUtils_createBaton(env, info, numArgs, args, &tempBaton))
        return false;
    pool = (njsPool*) tempBaton->callingInstance;
    if (!pool->handle) {
        njsBaton_setError(tempBaton, errInvalidPool);
        njsBaton_reportError(tempBaton, env);
        return false;
    }
    tempBaton->oracleDb = pool->oracleDb;

    *baton = tempBaton;
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
//   - JS callback which will receive (error, connection)
//-----------------------------------------------------------------------------
static napi_value njsPool_getConnection(napi_env env,
        napi_callback_info info)
{
    napi_value args[2];
    njsBaton *baton;

    // verify number of arguments and create baton
    if (!njsPool_createBaton(env, info, 2, args, &baton))
        return NULL;

    // get information from arguments and store on the baton
    if (!njsPool_getConnectionProcessArgs(baton, env, args)) {
        njsBaton_reportError(baton, env);
        return NULL;
    }

    // queue work
    njsBaton_queueWork(baton, env, "GetConnection", njsPool_getConnectionAsync,
            njsPool_getConnectionPostAsync, 3);
    return NULL;
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
    if (dpiContext_initConnCreateParams(baton->oracleDb->context, &params) < 0)
        return njsBaton_setErrorDPI(baton);
    params.matchAnyTag = baton->matchAnyTag;
    params.connectionClass = baton->connectionClass;
    params.connectionClassLength = baton->connectionClassLength;
    params.tag = baton->tag;
    params.tagLength = baton->tagLength;

    // acquire connection from pool
    if (dpiPool_acquireConnection(pool->handle, baton->user, baton->userLength,
            baton->password, baton->passwordLength, &params,
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
//   Sets up the arguments for the callback to JS. The connection object is
// created and passed as the second argument. The first argument is always the
// error and at this point it is known that no error has taken place.
//-----------------------------------------------------------------------------
static bool njsPool_getConnectionPostAsync(njsBaton *baton, napi_env env,
        napi_value *args)
{
    napi_value conn, pool;

    // create connection
    if (!njsConnection_newFromBaton(baton, env, &conn))
        return false;
    args[1] = conn;

    // store a reference to the pool on the connection
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, baton->jsCallingObj,
            &pool))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, conn, "_pool", pool))

    // return boolean indicating whether a new session was created
    NJS_CHECK_NAPI(env, napi_get_boolean(env, baton->newSession, &args[2]))

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionProcessArgs()
//   Process the arguments for njsPool_getConnection().
//-----------------------------------------------------------------------------
static bool njsPool_getConnectionProcessArgs(njsBaton *baton, napi_env env,
        napi_value *args)
{
    // check arguments
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "user", &baton->user,
            &baton->userLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "password",
            &baton->password, &baton->passwordLength, NULL))
        return false;
    if (!njsBaton_getStringFromArg(baton, env, args, 0, "tag", &baton->tag,
            &baton->tagLength, NULL))
        return false;
    if (!njsBaton_getBoolFromArg(baton, env, args, 0, "matchAnyTag",
            &baton->matchAnyTag, NULL))
        return false;

    // copy items used from the OracleDb class since they may change after
    // the asynchronous function begins
    if (!njsUtils_copyString(env, baton->oracleDb->connectionClass,
            baton->oracleDb->connectionClassLength, &baton->connectionClass,
            &baton->connectionClassLength))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionsInUse()
//   Get accessor of "connectionsInUse" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getConnectionsInUse(napi_env env,
        napi_callback_info info)
{
    uint32_t value;
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    if (!pool->handle)
        return NULL;
    if (dpiPool_getBusyCount(pool->handle, &value) < 0) {
        njsUtils_throwErrorDPI(env, pool->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, value);
}


//-----------------------------------------------------------------------------
// njsPool_getConnectionsOpen()
//   Get accessor of "connectionsOpen" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getConnectionsOpen(napi_env env,
        napi_callback_info info)
{
    uint32_t value;
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    if (!pool->handle)
        return NULL;
    if (dpiPool_getOpenCount(pool->handle, &value) < 0) {
        njsUtils_throwErrorDPI(env, pool->oracleDb);
        return NULL;
    }
    return njsUtils_convertToUnsignedInt(env, value);
}


//-----------------------------------------------------------------------------
// njsPool_getPoolIncrement()
//   Get accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getPoolIncrement(napi_env env,
        napi_callback_info info)
{
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, pool->poolIncrement);
}


//-----------------------------------------------------------------------------
// njsPool_getPoolMax()
//   Get accessor of "poolMax" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getPoolMax(napi_env env, napi_callback_info info)
{
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, pool->poolMax);
}


//-----------------------------------------------------------------------------
// njsPool_getPoolMin()
//   Get accessor of "poolMin" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getPoolMin(napi_env env, napi_callback_info info)
{
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, pool->poolMin);
}


//-----------------------------------------------------------------------------
// njsPool_getPoolPingInterval()
//   Get accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getPoolPingInterval(napi_env env,
        napi_callback_info info)
{
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    return njsUtils_convertToInt(env, pool->poolPingInterval);
}


//-----------------------------------------------------------------------------
// njsPool_getPoolTimeout()
//   Get accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getPoolTimeout(napi_env env, napi_callback_info info)
{
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, pool->poolTimeout);
}


//-----------------------------------------------------------------------------
// njsPool_getStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_getStmtCacheSize(napi_env env,
        napi_callback_info info)
{
    njsPool *pool;

    if (!njsUtils_validateGetter(env, info, (njsBaseInstance**) &pool))
        return NULL;
    return njsUtils_convertToUnsignedInt(env, pool->stmtCacheSize);
}


//-----------------------------------------------------------------------------
// njsPool_newFromBaton()
//   Called when a pool is being created from the baton.
//-----------------------------------------------------------------------------
bool njsPool_newFromBaton(njsBaton *baton, napi_env env, napi_value *poolObj)
{
    njsPool *pool;

    // create new instance
    if (!njsUtils_genericNew(env, &njsClassDefPool,
            baton->oracleDb->jsPoolConstructor, poolObj,
            (njsBaseInstance**) &pool))
        return false;

    // transfer the ODPI-C connection handle to the new object
    pool->handle = baton->dpiPoolHandle;
    baton->dpiPoolHandle = NULL;

    // perform other initializations
    pool->oracleDb = baton->oracleDb;
    pool->poolMax = baton->poolMax;
    pool->poolMin = baton->poolMin;
    pool->poolIncrement = baton->poolIncrement;
    pool->poolTimeout = baton->poolTimeout;
    pool->poolPingInterval = baton->poolPingInterval;
    pool->stmtCacheSize = baton->stmtCacheSize;

    return true;
}


//-----------------------------------------------------------------------------
// njsPool_setConnectionsOpen()
//   Set accessor of "connectionsOpen" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setConnectionsOpen(napi_env env,
        napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "connectionsOpen");
}


//-----------------------------------------------------------------------------
// njsPool_setConnectionsInUse()
//   Set accessor of "connectionsInUse" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setConnectionsInUse(napi_env env,
        napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "connectionsInUse");
}


//-----------------------------------------------------------------------------
// njsPool_setPoolIncrement()
//   Set accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setPoolIncrement(napi_env env,
        napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "poolIncrement");
}


//-----------------------------------------------------------------------------
// njsPool_setPoolMax()
//   Set accessor of "poolMax" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setPoolMax(napi_env env, napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "poolMax");
}


//-----------------------------------------------------------------------------
// njsPool_setPoolMin()
//   Set accessor of "poolMin" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setPoolMin(napi_env env, napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "poolMin");
}


//-----------------------------------------------------------------------------
// njsPool_setPoolPingInterval()
//   Set accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setPoolPingInterval(napi_env env,
        napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "poolPingInterval");
}


//-----------------------------------------------------------------------------
// njsPool_setPoolTimeout()
//   Set accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setPoolTimeout(napi_env env, napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "poolTimeout");
}


//-----------------------------------------------------------------------------
// njsPool_setStmtCacheSize()
//   Set accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
static napi_value njsPool_setStmtCacheSize(napi_env env,
        napi_callback_info info)
{
    return njsUtils_readOnlySetter(env, "stmtCacheSize");
}
