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
 *   njsSubscription.h
 *
 * DESCRIPTION
 *   Subscription class
 *
 *****************************************************************************/

#ifndef __NJSSUBSCRIPTION_H__
#define __NJSSUBSCRIPTION_H__

#include "njsCommon.h"

using namespace v8;
using namespace node;

//-----------------------------------------------------------------------------
// njsSubscription
//   Class exposed to JS for handling subscriptions.
//-----------------------------------------------------------------------------
class njsSubscription: public njsCommon {
public:

    static void Init(Local<Object> target);
    bool IsValid() const { return true; };
    njsErrorType GetInvalidErrorType() const { return errInvalidSubscription; }
    static Local<Object> Create();
    dpiSubscrNamespace GetNamespace() const { return subscrNamespace; }
    void SetNamespace(dpiSubscrNamespace ns) { subscrNamespace = ns; }
    void SetCallback(Local<Function> callback) { jsCallback.Reset(callback); }
    void SetDPISubscrHandle(njsBaton *baton)
            { baton->SetDPISubscrHandle(dpiSubscrHandle); }
    void StartNotifications(njsBaton *baton);
    void StopNotifications();

    // event handler
    static void EventHandler(njsSubscription *subscription,
            dpiSubscrMessage *message);

private:

    njsSubscription() : dpiSubscrHandle(NULL), message(NULL) {}
    ~njsSubscription();

    Local<Object> CreateMessage(dpiSubscrMessage *message);
    Local<Object> CreateMessageQuery(dpiSubscrMessageQuery *query);
    Local<Object> CreateMessageRow(dpiSubscrMessageRow *row);
    Local<Object> CreateMessageTable(dpiSubscrMessageTable *table);

    static void ProcessNotification(uv_async_t *handle);
    static void OnStopNotifications(uv_handle_t *handle);
    void WaitOnBarrier();

    static NAN_METHOD(New);

    dpiSubscr *dpiSubscrHandle;
    uv_async_t async;
    uv_mutex_t mutex;
    uv_barrier_t barrier;
    dpiSubscrMessage *message;
    Nan::Persistent<Function> jsCallback;
    dpiSubscrNamespace subscrNamespace;
    std::string name;

    static Nan::Persistent<FunctionTemplate> subscriptionTemplate_s;
};

#endif

