// Copyright (c) 2022, Oracle and/or its affiliates.

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
//   njsTokenCallback.c
//
// DESCRIPTION
//   Implementation of methods for token callback feature
//   in token based authentication.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// other methods
static void njsTokenCallback_onStopNotifications(uv_handle_t *handle);
static bool njsTokenCallback_onStopNotificationsHelper(napi_env env,
        njsTokenCallback *callback);
static void njsTokenCallback_processNotification(uv_async_t *handle);
static bool njsTokenCallback_processNotificationHelper(napi_env env,
        njsTokenCallback *callback);
static void njsTokenCallback_waitOnBarrier(njsTokenCallback *callback);

//-----------------------------------------------------------------------------
// njsTokenCallback_eventHandler()
//   This method is called by the ODPI-C as callback every time an event is
// received and is called from outside the event loop in a thread that
// Javascript does not know anything about. Since multiple calls to
// uv_async_send() result in only one call to the posted callback, at least
// until after the callback has completed, a barrier is used.
//-----------------------------------------------------------------------------
int njsTokenCallback_eventHandler(njsTokenCallback *callback,
        dpiAccessToken *tokenRefresh)
{
    uv_mutex_lock(&callback->mutex);
    uv_barrier_init(&callback->barrier, 2);
    uv_mutex_unlock(&callback->mutex);

    if (uv_async_send(&callback->async) < 0) {
         njsTokenCallback_waitOnBarrier(callback);
         return -1;
    }

    njsTokenCallback_waitOnBarrier(callback);
    if (!callback->result)
        return -1;
    tokenRefresh->token = callback->accessToken->token;
    tokenRefresh->tokenLength = callback->accessToken->tokenLength;
    tokenRefresh->privateKey =
            callback->accessToken->privateKey;
    tokenRefresh->privateKeyLength
        = callback->accessToken->privateKeyLength;
    return 0;
}


//-----------------------------------------------------------------------------
// njsTokenCallback_new()
//   This method allocates memory to structure accessTokenCallback.
//-----------------------------------------------------------------------------
bool njsTokenCallback_new(njsBaton *baton, napi_env env)
{
    baton->accessTokenCallback = calloc(1, sizeof(njsTokenCallback));
    if (!baton->accessTokenCallback)
        return njsBaton_setError(baton, errInsufficientMemory);
    baton->accessTokenCallback->accessToken = calloc(1, sizeof(dpiAccessToken));
    if (!baton->accessTokenCallback->accessToken)
        return njsBaton_setError(baton, errInsufficientMemory);
    baton->accessTokenCallback->env = env;

    return true;
}


//-----------------------------------------------------------------------------
// njsTokenCallback_startNotifications()
//   Start getting return value from callback. An async handle is
// created to ensure the event loop doesn't terminate until the callback is
// deregistered at time of pool close.
//-----------------------------------------------------------------------------
bool njsTokenCallback_startNotifications(njsTokenCallback *callback,
        napi_env env)
{
    uv_loop_t *loop;

    // initialize UV handling
    NJS_CHECK_NAPI(env, napi_get_uv_event_loop(env, &loop))
    uv_mutex_init(&callback->mutex);
    uv_async_init(loop, &callback->async,
            njsTokenCallback_processNotification);
    callback->async.data = callback;

    return true;
}


//-----------------------------------------------------------------------------
// njsTokenCallback_processNotification()
//   This method is called inside the event loop in the JavaScript main thread.
// It works together with the event handler method and lets that function know
// when its work is complete by "waiting" for the barrier.
//-----------------------------------------------------------------------------
static void njsTokenCallback_processNotification(uv_async_t *handle)
{
    njsTokenCallback *callback = (njsTokenCallback*) handle->data;
    napi_handle_scope scope;
    if (napi_open_handle_scope(callback->env, &scope) != napi_ok)
        return;

    uv_mutex_lock(&callback->mutex);
    callback->result = njsTokenCallback_processNotificationHelper(callback->env,
            callback);
    njsTokenCallback_waitOnBarrier(callback);
    uv_mutex_unlock(&callback->mutex);
    napi_close_handle_scope(callback->env, scope);
}


//-----------------------------------------------------------------------------
// njsTokenCallback_processNotificationHelper()
//   Helper method for processing notifications so that the scope that is
// opened can be easily destroyed.
//-----------------------------------------------------------------------------
static bool njsTokenCallback_processNotificationHelper(napi_env env,
        njsTokenCallback *callback)
{
    dpiAccessToken *accessToken = callback->accessToken;
    napi_value callbackRef, global, message, result, payloadObj;
    size_t tempLength;

    // acquire callback and refreshed tokens
    NJS_CHECK_NAPI(env, napi_get_global(env, &global))
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, callback->jsCallback,
            &callbackRef))

    // perform callback
    NJS_CHECK_NAPI(env, napi_make_callback(env, NULL, global, callbackRef,
            1, &message, &result));

    // Read "token" property
    NJS_CHECK_NAPI(env, napi_get_named_property(env, result, "token",
            &payloadObj))
    if (!njsUtils_setPropString(env, payloadObj, "token",
            (char**) &accessToken->token, &tempLength))
        return false;
    accessToken->tokenLength = (uint32_t) tempLength;

    // Read "privateKey" property
    NJS_CHECK_NAPI(env, napi_get_named_property(env, result, "privateKey",
            &payloadObj))
    if (!njsUtils_setPropString(env, payloadObj, "privateKey",
            (char**) &accessToken->privateKey, &tempLength))
        return false;
    accessToken->privateKeyLength = (uint32_t) tempLength;

    return true;
}


//-----------------------------------------------------------------------------
// njsTokenCallback_stopNotifications()
//   Stop sending/receiving notifications to/from the supplied callback.
//-----------------------------------------------------------------------------
bool njsTokenCallback_stopNotifications(njsTokenCallback *callback)
{
    if (!uv_is_closing((uv_handle_t*)&callback->async)) {
        uv_close((uv_handle_t*) &callback->async,
                njsTokenCallback_onStopNotifications);
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsTokenCallback_waitOnBarrier()
//   Wait on barrier
//-----------------------------------------------------------------------------
static void njsTokenCallback_waitOnBarrier(njsTokenCallback *callback)
{
    if (uv_barrier_wait(&callback->barrier) > 0) {
        uv_barrier_destroy(&callback->barrier);
    }
}


//-----------------------------------------------------------------------------
// njsTokenCallback_onStopNotifications()
//-----------------------------------------------------------------------------
static void njsTokenCallback_onStopNotifications(uv_handle_t *handle)
{
    njsTokenCallback *callback = (njsTokenCallback*) handle->data;
    napi_handle_scope scope;
    if (napi_open_handle_scope(callback->env, &scope) != napi_ok)
        return;

    njsTokenCallback_onStopNotificationsHelper(callback->env, callback);
    napi_close_handle_scope(callback->env, scope);
}


//-----------------------------------------------------------------------------
// njsTokenCallback_onStopNotificationsHelper()
//   Helper method for stopping notifications so that the scope that is opened
// can be easily destroyed.
//-----------------------------------------------------------------------------
static bool njsTokenCallback_onStopNotificationsHelper(napi_env env,
        njsTokenCallback *callback)
{
    // perform cleanup
    uv_mutex_destroy(&callback->mutex);
    NJS_DELETE_REF_AND_CLEAR(callback->jsCallback);
    if (callback->accessToken) {
        NJS_FREE_AND_CLEAR(callback->accessToken->token)
        NJS_FREE_AND_CLEAR(callback->accessToken->privateKey)
        NJS_FREE_AND_CLEAR(callback->accessToken)
    }

    return true;
}
