/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

/******************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file uses NAN:
 *
 * Copyright (c) 2015 NAN contributors
 *
 * NAN contributors listed at https://github.com/rvagg/nan#contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * NAME
 *   njsSubscription.cpp
 *
 * DESCRIPTION
 *   Subscription class implementation.
 *
 *****************************************************************************/

#include "njsSubscription.h"
#include "njsOracle.h"

using namespace std;
using namespace node;
using namespace v8;

// peristent ResultSet class handle
Nan::Persistent<FunctionTemplate> njsSubscription::subscriptionTemplate_s;

//-----------------------------------------------------------------------------
// njsSubscription::~njsSubscription()
//   Destructor. If notifications have been started (noted by the presence of a
// subscription handle) then notifications will be stopped.
//-----------------------------------------------------------------------------
njsSubscription::~njsSubscription()
{
    if (dpiSubscrHandle)
        StopNotifications();
}


//-----------------------------------------------------------------------------
// njsSubscription::ProcessNotification()
//   This method is called inside the event loop in the JavaScript main thread.
// It works together with the EventHandler() method and lets that function
// know when its work is complete by "waiting" for the barrier.
//-----------------------------------------------------------------------------
void njsSubscription::ProcessNotification(uv_async_t *handle)
{
    njsSubscription *subscription = (njsSubscription*) handle->data;
    Nan::HandleScope scope;

    Local<Function> callback = Nan::New<Function>(subscription->jsCallback);
    Local<Value> callbackArgs[1];
    callbackArgs[0] = subscription->CreateMessage(subscription->message);
    Nan::AsyncResource *asyncResource =
            new Nan::AsyncResource("node-oracledb:SubscrCallback");
    asyncResource->runInAsyncScope(Nan::GetCurrentContext()->Global(),
            callback, 1, callbackArgs);
    delete asyncResource;
    if (!subscription->message->registered)
        subscription->StopNotifications();
    subscription->WaitOnBarrier();
}


//-----------------------------------------------------------------------------
// njsSubscription::WaitOnBarrier()
//   Wait on barrier to ensure that only one message is being processed at a
// time.
//-----------------------------------------------------------------------------
void njsSubscription::WaitOnBarrier()
{
    if (uv_barrier_wait(&barrier) > 0) {
        uv_barrier_destroy(&barrier);
        message = NULL;
    }
}


//-----------------------------------------------------------------------------
// njsSubscription::Init()
//   Initialization function of Subscription class. Maps functions and
// properties from JS to C++.
//-----------------------------------------------------------------------------
void njsSubscription::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> temp = Nan::New<FunctionTemplate>(New);

    temp->InstanceTemplate()->SetInternalFieldCount(1);
    temp->SetClassName(Nan::New<v8::String>("Subscription").ToLocalChecked());

    subscriptionTemplate_s.Reset(temp);
    Nan::Set(target, Nan::New<v8::String>("Subscription").ToLocalChecked(),
            temp->GetFunction());
}


//-----------------------------------------------------------------------------
// njsSubscription::CreateMessage()
//   Create message object that will be passed to the callback.
//-----------------------------------------------------------------------------
Local<Object> njsSubscription::CreateMessage(dpiSubscrMessage *message)
{
    Nan::EscapableHandleScope scope;
    Local<Object> messageObj = Nan::New<Object>();
    Local<Value> temp;

    // set type, database name, transaction id and registered flag
    Nan::Set(messageObj, Nan::New<String>("type").ToLocalChecked(),
            Nan::New<Integer>(message->eventType));
    if (message->dbNameLength > 0) {
        temp = Nan::New<String>(message->dbName,
                message->dbNameLength).ToLocalChecked();
        Nan::Set(messageObj, Nan::New<String>("dbName").ToLocalChecked(),
                temp);
    }
    if (message->txIdLength > 0) {
        temp = Nan::CopyBuffer((char*) message->txId,
                message->txIdLength).ToLocalChecked();
        Nan::Set(messageObj, Nan::New<String>("txId").ToLocalChecked(), temp);
    }
    Nan::Set(messageObj, Nan::New<String>("registered").ToLocalChecked(),
            Nan::New<Boolean>(message->registered));

    // set tables, if applicable
    if (message->numTables > 0) {
        Local<Array> arr = Nan::New<Array>(message->numTables);
        Local<Object> element;
        for (uint32_t i = 0; i < message->numTables; i++) {
            element = CreateMessageTable(&message->tables[i]);
            Nan::Set(arr, i, element);
        }
        Nan::Set(messageObj, Nan::New<String>("tables").ToLocalChecked(), arr);
    }

    // set queries, if applicable
    if (message->numQueries > 0) {
        Local<Array> arr = Nan::New<Array>(message->numQueries);
        Local<Object> element;
        for (uint32_t i = 0; i < message->numQueries; i++) {
            element = CreateMessageQuery(&message->queries[i]);
            Nan::Set(arr, i, element);
        }
        Nan::Set(messageObj, Nan::New<String>("queries").ToLocalChecked(),
                arr);
    }

    // set queue name, if applicable
    if (message->queueNameLength > 0) {
        temp = Nan::New<String>(message->queueName,
                message->queueNameLength).ToLocalChecked();
        Nan::Set(messageObj, Nan::New<String>("queueName").ToLocalChecked(),
                temp);
    }

    // set consumer name, if applicable
    if (message->consumerNameLength > 0) {
        temp = Nan::New<String>(message->consumerName,
                message->consumerNameLength).ToLocalChecked();
        Nan::Set(messageObj, Nan::New<String>("consumerName").ToLocalChecked(),
                temp);
    }

    return scope.Escape(messageObj);
}


//-----------------------------------------------------------------------------
// njsSubscription::CreateMessageQuery()
//   Create message query object that will be passed to the callback.
//-----------------------------------------------------------------------------
Local<Object> njsSubscription::CreateMessageQuery(
        dpiSubscrMessageQuery *query)
{
    Nan::EscapableHandleScope scope;
    Local<Object> queryObj = Nan::New<Object>();

    // set tables, if applicable
    if (query->numTables > 0) {
        Local<Array> arr = Nan::New<Array>(query->numTables);
        Local<Object> element;
        for (uint32_t i = 0; i < query->numTables; i++) {
            element = CreateMessageTable(&query->tables[i]);
            Nan::Set(arr, i, element);
        }
        Nan::Set(queryObj, Nan::New<String>("tables").ToLocalChecked(), arr);
    }

    return scope.Escape(queryObj);
}


//-----------------------------------------------------------------------------
// njsSubscription::CreateMessageRow()
//   Create message row object that will be passed to the callback.
//-----------------------------------------------------------------------------
Local<Object> njsSubscription::CreateMessageRow( dpiSubscrMessageRow *row)
{
    Nan::EscapableHandleScope scope;
    Local<Object> rowObj = Nan::New<Object>();
    Local<Value> temp;

    // set operation and rowid
    Nan::Set(rowObj, Nan::New<String>("operation").ToLocalChecked(),
            Nan::New<Integer>(row->operation));
    temp = Nan::New<String>(row->rowid, row->rowidLength).ToLocalChecked();
    Nan::Set(rowObj, Nan::New<String>("rowid").ToLocalChecked(), temp);

    return scope.Escape(rowObj);
}


//-----------------------------------------------------------------------------
// njsSubscription::CreateMessageTable()
//   Create message table object that will be passed to the callback.
//-----------------------------------------------------------------------------
Local<Object> njsSubscription::CreateMessageTable(
        dpiSubscrMessageTable *table)
{
    Nan::EscapableHandleScope scope;
    Local<Object> tableObj = Nan::New<Object>();
    Local<Value> temp;

    // set operation and name
    Nan::Set(tableObj, Nan::New<String>("operation").ToLocalChecked(),
            Nan::New<Integer>(table->operation));
    temp = Nan::New<String>(table->name, table->nameLength).ToLocalChecked();
    Nan::Set(tableObj, Nan::New<String>("name").ToLocalChecked(), temp);

    // set rows, if applicable
    if (table->numRows > 0) {
        Local<Array> arr = Nan::New<Array>(table->numRows);
        Local<Object> element;
        for (uint32_t i = 0; i < table->numRows; i++) {
            element = CreateMessageRow(&table->rows[i]);
            Nan::Set(arr, i, element);
        }
        Nan::Set(tableObj, Nan::New<String>("rows").ToLocalChecked(), arr);
    }

    return scope.Escape(tableObj);
}


//-----------------------------------------------------------------------------
// njsSubscription::Create()
//   Create a new subscription object.
//-----------------------------------------------------------------------------
Local<Object> njsSubscription::Create()
{
    Nan::EscapableHandleScope scope;
    Local<Function> func = Nan::GetFunction(Nan::New<FunctionTemplate>(
            subscriptionTemplate_s)).ToLocalChecked();
    Local<Object> obj = Nan::NewInstance(func).ToLocalChecked();
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsSubscription::StartNotifications()
//   Start sending notifications to the supplied callback. An async handle is
// created to ensure the event loop doesn't terminate until the subscription is
// deregistered in some way (either directly via unsubscribe() or indirectly
// via the timeout attribute or the quality of service flag that tells a
// subscription to deregister after the first notification has been received).
//-----------------------------------------------------------------------------
void njsSubscription::StartNotifications(njsBaton *baton)
{
    if (this->name.empty()) {
        this->name = baton->name;
        uv_mutex_init(&this->mutex);
        uv_async_init(uv_default_loop(), &this->async, ProcessNotification);
        this->async.data = this;
        this->dpiSubscrHandle = baton->dpiSubscrHandle;
        baton->dpiSubscrHandle = NULL;
        baton->subscription = NULL;
        Local<Value> subscriptionObj = Nan::New(baton->jsSubscription);
        njsOracledb::SetSubscription(baton->name, subscriptionObj);
    }
}


//-----------------------------------------------------------------------------
// njsSubscription::StopNotifications()
//   Stop sending notifications to the supplied callback. This happens when the
// subscription is deregistered, either directly via a call to unsubscribe()
// or indirectly via the timeout attribute or the quality of service flag that
// tells a subscription to deregister after the first notification has been
// received.
//-----------------------------------------------------------------------------
void njsSubscription::StopNotifications()
{
    uv_close(reinterpret_cast<uv_handle_t*>(&async), OnStopNotifications);
}


//-----------------------------------------------------------------------------
// njsSubscription::OnStopNotifications()
//   This method is called when the subscription is deregistered. It is called
// in the main thread and is used to perform any clean up that is necessary.
//-----------------------------------------------------------------------------
void njsSubscription::OnStopNotifications(uv_handle_t *handle)
{
    Nan::HandleScope scope;
    njsSubscription *subscription = (njsSubscription*) handle->data;
    if (subscription->dpiSubscrHandle) {
        dpiSubscr_release(subscription->dpiSubscrHandle);
        subscription->dpiSubscrHandle = NULL;
    }
    uv_mutex_destroy(&subscription->mutex);
    subscription->jsCallback.Reset();
    njsOracledb::ClearSubscription(subscription->name);
}


//-----------------------------------------------------------------------------
// njsSubscription::EventHandler()
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
void njsSubscription::EventHandler(njsSubscription *subscription,
        dpiSubscrMessage *incomingMessage)
{
    if (subscription->dpiSubscrHandle) {
        uv_mutex_lock(&subscription->mutex);
        uv_barrier_init(&subscription->barrier, 2);
        subscription->message = incomingMessage;
        uv_async_send(&subscription->async);
        subscription->WaitOnBarrier();
        uv_mutex_unlock(&subscription->mutex);
    }
}


//-----------------------------------------------------------------------------
// njsSubscription::New()
//   Create new object accesible from JS. This is always called from within
// njsSubscription::Create() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSubscription::New)
{
    njsSubscription *subscription = new njsSubscription();
    subscription->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}

