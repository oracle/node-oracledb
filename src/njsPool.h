/* Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   njsPool.h
 *
 * DESCRIPTION
 *   Pool class
 *
 *****************************************************************************/

#ifndef __NJSPOOL_H__
#define __NJSPOOL_H__

#include "njsOracle.h"
#include <node.h>
#include "nan.h"
#include <string>

using namespace v8;
using namespace node;


//-----------------------------------------------------------------------------
// njsPool
//   Class exposed to JS for handling session pools.
//-----------------------------------------------------------------------------
class njsPool: public njsCommon {
public:

    static void Init(Handle<Object> target);
    static Local<Object> CreateFromBaton(njsBaton *baton);
    bool IsValid() const { return (dpiPoolHandle) ? true : false; }
    njsErrorType GetInvalidErrorType() const { return errInvalidPool; }

private:

    static NAN_METHOD(New);

    // Get Connection Methods
    static NAN_METHOD(GetConnection);
    static void Async_GetConnection(njsBaton *baton);
    static void Async_AfterGetConnection(njsBaton *baton, Local<Value> argv[]);

    // Terminate Methods
    static NAN_METHOD(Terminate);
    static void Async_Terminate(njsBaton *baton);

    // Define Getter Accessors to properties
    static NAN_GETTER(GetPoolMax);
    static NAN_GETTER(GetPoolMin);
    static NAN_GETTER(GetPoolIncrement);
    static NAN_GETTER(GetPoolPingInterval);
    static NAN_GETTER(GetPoolTimeout);
    static NAN_GETTER(GetConnectionsOpen);
    static NAN_GETTER(GetConnectionsInUse);
    static NAN_GETTER(GetStmtCacheSize);

    // Define Setter Accessors to properties
    static NAN_SETTER(SetPoolMax);
    static NAN_SETTER(SetPoolMin);
    static NAN_SETTER(SetPoolIncrement);
    static NAN_SETTER(SetPoolPingInterval);
    static NAN_SETTER(SetPoolTimeout);
    static NAN_SETTER(SetConnectionsOpen);
    static NAN_SETTER(SetConnectionsInUse);
    static NAN_SETTER(SetStmtCacheSize);

    njsPool() : dpiPoolHandle(NULL), poolMin(0), poolMax(0), poolIncrement(0),
            poolTimeout(0), stmtCacheSize(0), lobPrefetchSize(0),
            poolPingInterval(0) {}
    ~njsPool() {
        jsOracledb.Reset();
        if (dpiPoolHandle) {
            dpiPool_release(dpiPoolHandle);
            dpiPoolHandle = NULL;
        }
    }

    dpiPool *dpiPoolHandle;
    Nan::Persistent<Object> jsOracledb;
    uint32_t poolMin;
    uint32_t poolMax;
    uint32_t poolIncrement;
    uint32_t poolTimeout;
    uint32_t stmtCacheSize;
    uint32_t lobPrefetchSize;
    int32_t poolPingInterval;

    static Nan::Persistent<FunctionTemplate> poolTemplate_s ;
};

#endif                                          /* __NJSPOOL_H__ */
