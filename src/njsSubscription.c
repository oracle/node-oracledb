// Copyright (c) 2018, 2022, Oracle and/or its affiliates.

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
//   njsSubscription.c
//
// DESCRIPTION
//   Implementation of subscription class.
//
//-----------------------------------------------------------------------------

#include "njsModule.h"

// finalize
static NJS_NAPI_FINALIZE(njsSubscription_finalize);

// other methods
static bool njsSubscription_createMessage(napi_env env,
        dpiSubscrMessage *message, napi_value *messageObj);
static bool njsSubscription_createMessageQuery(napi_env env,
        dpiSubscrMessageQuery *query, napi_value *queryObj);
static bool njsSubscription_createMessageRow(napi_env env,
        dpiSubscrMessageRow *row, napi_value *rowObj);
static bool njsSubscription_createMessageTable(napi_env env,
        dpiSubscrMessageTable *table, napi_value *tableObj);
static void njsSubscription_onStopNotifications(uv_handle_t *handle);
static bool njsSubscription_onStopNotificationsHelper(napi_env env,
        njsSubscription *subscr);
static void njsSubscription_processNotification(uv_async_t *handle);
static bool njsSubscription_processNotificationHelper(napi_env env,
        njsSubscription *subscr);
static void njsSubscription_waitOnBarrier(njsSubscription *subscr);


//-----------------------------------------------------------------------------
// njsSubscription_createMessage()
//   Create message that will be passed to the callback.
//-----------------------------------------------------------------------------
static bool njsSubscription_createMessage(napi_env env,
        dpiSubscrMessage *message, napi_value *messageObj)
{
    napi_value temp, array;
    uint32_t i;

    // create message object
    NJS_CHECK_NAPI(env, napi_create_object(env, messageObj))

    // set type
    NJS_CHECK_NAPI(env, napi_create_uint32(env, message->eventType, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj, "type",
            temp))

    // set database name
    if (message->dbNameLength > 0) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, message->dbName,
                message->dbNameLength, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj, "dbName",
                temp))
    }

    // set transaction id
    if (message->txIdLength > 0) {
        NJS_CHECK_NAPI(env, napi_create_buffer_copy(env, message->txIdLength,
                message->txId, NULL, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj, "txId",
                temp))
    }

    // set registered flag
    NJS_CHECK_NAPI(env, napi_get_boolean(env, message->registered, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj, "registered",
            temp))

    // set queue name
    if (message->queueNameLength > 0) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, message->queueName,
                message->queueNameLength, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj,
                "queueName", temp))
    }

    // set consumer name
    if (message->consumerNameLength > 0) {
        NJS_CHECK_NAPI(env, napi_create_string_utf8(env, message->consumerName,
                message->consumerNameLength, &temp))
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj,
                "consumerName", temp))
    }

    // set tables
    if (message->numTables > 0) {
        NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                message->numTables, &array))
        for (i = 0; i < message->numTables; i++) {
            if (!njsSubscription_createMessageTable(env, &message->tables[i],
                    &temp))
                return false;
            NJS_CHECK_NAPI(env, napi_set_element(env, array, i, temp))
        }
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj, "tables",
                array))
    }

    // set queries
    if (message->numQueries > 0) {
        NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                message->numQueries, &array))
        for (i = 0; i < message->numQueries; i++) {
            if (!njsSubscription_createMessageQuery(env, &message->queries[i],
                    &temp))
                return false;
            NJS_CHECK_NAPI(env, napi_set_element(env, array, i, temp))
        }
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *messageObj,
                "queries", array))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSubscription_createMessageQuery()
//   Create message query object that will be passed to the callback.
//-----------------------------------------------------------------------------
static bool njsSubscription_createMessageQuery(napi_env env,
        dpiSubscrMessageQuery *query, napi_value *queryObj)
{
    napi_value temp, array;
    uint32_t i;

    // create object
    NJS_CHECK_NAPI(env, napi_create_object(env, queryObj))

    // populate tables
    if (query->numTables > 0) {
        NJS_CHECK_NAPI(env, napi_create_array_with_length(env,
                query->numTables, &array))
        for (i = 0; i < query->numTables; i++) {
            if (!njsSubscription_createMessageTable(env, &query->tables[i],
                    &temp))
                return false;
            NJS_CHECK_NAPI(env, napi_set_element(env, array, i, temp))
        }
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *queryObj, "tables",
                array))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSubscription_createMessageRow()
//   Create message row object that will be passed to the callback.
//-----------------------------------------------------------------------------
static bool njsSubscription_createMessageRow(napi_env env,
        dpiSubscrMessageRow *row, napi_value *rowObj)
{
    napi_value temp;

    // create object
    NJS_CHECK_NAPI(env, napi_create_object(env, rowObj))

    // set operation
    NJS_CHECK_NAPI(env, napi_create_uint32(env, row->operation, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *rowObj, "operation",
            temp))

    // set rowid
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, row->rowid,
            row->rowidLength, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *rowObj, "rowid", temp))

    return true;
}


//-----------------------------------------------------------------------------
// njsSubscription_createMessageTable()
//   Create message table object that will be passed to the callback.
//-----------------------------------------------------------------------------
static bool njsSubscription_createMessageTable(napi_env env,
        dpiSubscrMessageTable *table, napi_value *tableObj)
{
    napi_value temp, array;
    uint32_t i;

    // create object
    NJS_CHECK_NAPI(env, napi_create_object(env, tableObj))

    // set operation
    NJS_CHECK_NAPI(env, napi_create_uint32(env, table->operation, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *tableObj, "operation",
            temp))

    // set name
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, table->name,
            table->nameLength, &temp))
    NJS_CHECK_NAPI(env, napi_set_named_property(env, *tableObj, "name", temp))

    // set rows
    if (table->numRows > 0) {
        NJS_CHECK_NAPI(env, napi_create_array_with_length(env, table->numRows,
                &array))
        for (i = 0; i < table->numRows; i++) {
            if (!njsSubscription_createMessageRow(env, &table->rows[i], &temp))
                return false;
            NJS_CHECK_NAPI(env, napi_set_element(env, array, i, temp))
        }
        NJS_CHECK_NAPI(env, napi_set_named_property(env, *tableObj, "rows",
                array))
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSubscription_eventHandler()
//   This method is called by the ODPI-C subscription every time an event is
// received and is called from outside the event loop in a thread that
// Javascript does not know anything about. Since multiple calls to
// uv_async_send() result in only one call to the posted callback, at least
// until after the callback has completed, a barrier is used. This barrier
// ensures that uv_async_send() isn't called again until after the message has
// been successfully processed by the event loop. Note as well that the
// presence of the OPDI-C subscription handle indicates the subscription is
// actually ready to receive notifications. There is a short period of time
// when the subscription is registered but not yet ready to receive
// notifications.
//-----------------------------------------------------------------------------
void njsSubscription_eventHandler(njsSubscription *subscr,
        dpiSubscrMessage *incomingMessage)
{
    if (subscr->handle && subscr->name) {
        uv_mutex_lock(&subscr->mutex);
        uv_barrier_init(&subscr->barrier, 2);
        subscr->message = incomingMessage;
        uv_mutex_unlock(&subscr->mutex);
        uv_async_send(&subscr->async);
        njsSubscription_waitOnBarrier(subscr);
    }
}


//-----------------------------------------------------------------------------
// njsSubscription_finalize()
//   Invoked when the njsResultSet object is garbage collected.
//-----------------------------------------------------------------------------
static void njsSubscription_finalize(napi_env env, void *finalizeData,
        void *finalizeHint)
{
    njsSubscription *subscr = (njsSubscription*) finalizeData;

    NJS_FREE_AND_CLEAR(subscr->name);
    if (subscr->handle) {
        dpiSubscr_release(subscr->handle);
        subscr->handle = NULL;
        njsSubscription_stopNotifications(subscr);
    }
    NJS_DELETE_REF_AND_CLEAR(subscr->jsCallback);
    free(subscr);
}


//-----------------------------------------------------------------------------
// njsSubscription_new()
//   Creates a new subscription object.
//-----------------------------------------------------------------------------
bool njsSubscription_new(njsBaton *baton, napi_env env, napi_value *obj,
        njsSubscription **subscr)
{
    njsSubscription *tempSubscr;

    tempSubscr = calloc(1, sizeof(njsSubscription));
    if (!tempSubscr)
        return njsBaton_setError(baton, errInsufficientMemory);
    if (napi_create_external(env, tempSubscr, njsSubscription_finalize,
            tempSubscr, obj) != napi_ok) {
        free(tempSubscr);
        return njsUtils_genericThrowError(env);
    }
    tempSubscr->oracleDb = baton->oracleDb;
    tempSubscr->env = env;
    tempSubscr->subscrNamespace = DPI_SUBSCR_NAMESPACE_DBCHANGE;

    *subscr = tempSubscr;
    return true;
}

//-----------------------------------------------------------------------------
// njsSubscription_onStopNotifications()
//   This method is called when the subscription is deregistered. It is called
// in the main thread and is used to perform any clean up that is necessary.
//-----------------------------------------------------------------------------
static void njsSubscription_onStopNotifications(uv_handle_t *handle)
{
    njsSubscription *subscr = (njsSubscription*) handle->data;
    napi_handle_scope scope;

    if (napi_open_handle_scope(subscr->env, &scope) != napi_ok)
        return;
    njsSubscription_onStopNotificationsHelper(subscr->env, subscr);
    napi_close_handle_scope(subscr->env, scope);
}


//-----------------------------------------------------------------------------
// njsSubscription_onStopNotificationsHelper()
//   Helper method for stopping notifications so that the scope that is opened
// can be easily destroyed.
//-----------------------------------------------------------------------------
static bool njsSubscription_onStopNotificationsHelper(napi_env env,
        njsSubscription *subscr)
{
    napi_value name, allSubscriptions;

    // delete property in all subscriptions object, if needed
    NJS_CHECK_NAPI(env, napi_create_string_utf8(env, subscr->name,
            subscr->nameLength, &name))
    NJS_CHECK_NAPI(env, napi_get_reference_value(env,
            subscr->oracleDb->jsSubscriptions, &allSubscriptions))
    NJS_CHECK_NAPI(env, napi_delete_property(env, allSubscriptions, name,
            NULL))

    // perform cleanup
    uv_mutex_destroy(&subscr->mutex);
    NJS_FREE_AND_CLEAR(subscr->name);
    if (subscr->handle) {
        dpiSubscr_release(subscr->handle);
        subscr->handle = NULL;
    }
    NJS_DELETE_REF_AND_CLEAR(subscr->jsCallback);

    return false;
}


//-----------------------------------------------------------------------------
// njsSubscription_processNotification()
//   This method is called inside the event loop in the JavaScript main thread.
// It works together with the event handler method and lets that function know
// when its work is complete by "waiting" for the barrier.
//-----------------------------------------------------------------------------
static void njsSubscription_processNotification(uv_async_t *handle)
{
    njsSubscription *subscr = (njsSubscription*) handle->data;
    napi_handle_scope scope;

    if (napi_open_handle_scope(subscr->env, &scope) != napi_ok)
        return;
    uv_mutex_lock(&subscr->mutex);
    njsSubscription_processNotificationHelper(subscr->env, subscr);
    njsSubscription_waitOnBarrier(subscr);
    uv_mutex_unlock(&subscr->mutex);
    napi_close_handle_scope(subscr->env, scope);
}


//-----------------------------------------------------------------------------
// njsSubscription_processNotificationHelper()
//   Helper method for processing notifications so that the scope that is
// opened can be easily destroyed.
//-----------------------------------------------------------------------------
static bool njsSubscription_processNotificationHelper(napi_env env,
        njsSubscription *subscr)
{
    napi_value callback, global, message, result;

    // acquire callback and message
    NJS_CHECK_NAPI(env, napi_get_global(env, &global))
    NJS_CHECK_NAPI(env, napi_get_reference_value(env, subscr->jsCallback,
            &callback))
    if (!njsSubscription_createMessage(env, subscr->message, &message))
        return false;

    // perform callback and clear any exception that occurs
    napi_make_callback(env, NULL, global, callback, 1, &message, &result);
    napi_get_and_clear_last_exception(env, &result);

    // if the message indicates that the subscription is no longer registered,
    // stop notifications from occurring
    if (!subscr->message->registered)
        njsSubscription_stopNotifications(subscr);

    return true;
}


//-----------------------------------------------------------------------------
// njsSubscription_startNotifications()
//   Start sending notifications to the supplied callback. An async handle is
// created to ensure the event loop doesn't terminate until the subscription is
// deregistered in some way (either directly via unsubscribe() or indirectly
// via the timeout attribute or the quality of service flag that tells a
// subscription to deregister after the first notification has been received).
//-----------------------------------------------------------------------------
bool njsSubscription_startNotifications(njsSubscription *subscr,
        napi_env env, njsBaton *baton)
{
    uv_loop_t *loop;

    if (!subscr->name) {

        // keep the name on the subscription
        subscr->name = baton->name;
        subscr->nameLength = baton->nameLength;
        baton->name = NULL;
        baton->nameLength = 0;

        // initialize UV handling
        NJS_CHECK_NAPI(env, napi_get_uv_event_loop(env, &loop))
        uv_mutex_init(&subscr->mutex);
        uv_async_init(loop, &subscr->async,
                njsSubscription_processNotification);
        subscr->async.data = subscr;

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsSubscription_stopNotifications()
//   Stop sending notifications to the supplied callback. This happens when the
// subscription is deregistered, either directly via a call to unsubscribe()
// or indirectly via the timeout attribute or the quality of service flag that
// tells a subscription to deregister after the first notification has been
// received. If notifications were never started (due to an error of some kind)
// nothing needs to be done at this point.
//-----------------------------------------------------------------------------
bool njsSubscription_stopNotifications(njsSubscription *subscr)
{
    if (subscr->name) {
        uv_close((uv_handle_t*) &subscr->async,
                njsSubscription_onStopNotifications);
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsSubscription_waitOnBarrier()
//   Wait on barrier to ensure that only one message is being processed at a
// time.
//-----------------------------------------------------------------------------
static void njsSubscription_waitOnBarrier(njsSubscription *subscr)
{
    if (uv_barrier_wait(&subscr->barrier) > 0) {
        uv_barrier_destroy(&subscr->barrier);
        subscr->message = NULL;
    }
}
