/* Copyright (c) 2015, 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   njsPool.cpp
 *
 * DESCRIPTION
 *   Pool class implementation.
 *
 *****************************************************************************/

#include "node.h"

#include <string>

#include "njsOracle.h"
#include "njsPool.h"
#include "njsConnection.h"

using namespace std;
using namespace node;
using namespace v8;

// peristent Pool class handle
Nan::Persistent<FunctionTemplate> njsPool::poolTemplate_s;


//-----------------------------------------------------------------------------
// njsPool::Init()
//   Initialization function of Pool class. Maps functions and properties
// from JS to C++.
//-----------------------------------------------------------------------------
void njsPool::Init(Local<Object> target)
{
    Nan::HandleScope scope;

    Local<FunctionTemplate> temp = Nan::New<FunctionTemplate>(New);
    temp->InstanceTemplate()->SetInternalFieldCount(1);
    temp->SetClassName(Nan::New<v8::String>("Pool").ToLocalChecked());

    Nan::SetPrototypeMethod(temp, "close", Close);
    Nan::SetPrototypeMethod(temp, "getConnection", GetConnection);

    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolMax").ToLocalChecked(),
            njsPool::GetPoolMax, njsPool::SetPoolMax);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolMin").ToLocalChecked(),
            njsPool::GetPoolMin, njsPool::SetPoolMin);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolIncrement").ToLocalChecked(),
            njsPool::GetPoolIncrement, njsPool::SetPoolIncrement);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolTimeout").ToLocalChecked(),
            njsPool::GetPoolTimeout, njsPool::SetPoolTimeout);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("connectionsOpen").ToLocalChecked(),
            njsPool::GetConnectionsOpen, njsPool::SetConnectionsOpen);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("connectionsInUse").ToLocalChecked(),
            njsPool::GetConnectionsInUse, njsPool::SetConnectionsInUse);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("stmtCacheSize").ToLocalChecked(),
            njsPool::GetStmtCacheSize, njsPool::SetStmtCacheSize);
    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("poolPingInterval").ToLocalChecked(),
            njsPool::GetPoolPingInterval, njsPool::SetPoolPingInterval);

    poolTemplate_s.Reset(temp);
    Nan::Set(target, Nan::New<v8::String>("Pool").ToLocalChecked(),
            temp->GetFunction());
}


//-----------------------------------------------------------------------------
// njsPool::CreateFromBaton()
//   Create a new pool from the baton.
//-----------------------------------------------------------------------------
Local<Object> njsPool::CreateFromBaton(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    Local<Function> func;
    Local<Object> obj;
    njsPool *pool;

    func = Nan::GetFunction(
            Nan::New<FunctionTemplate>(poolTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    pool = Nan::ObjectWrap::Unwrap<njsPool>(obj);
    pool->dpiPoolHandle = baton->dpiPoolHandle;
    baton->dpiPoolHandle = NULL;
    pool->jsOracledb.Reset(baton->jsOracledb);
    pool->poolMax = baton->poolMax;
    pool->poolMin = baton->poolMin;
    pool->poolIncrement = baton->poolIncrement;
    pool->poolTimeout = baton->poolTimeout;
    pool->poolPingInterval = baton->poolPingInterval;
    pool->stmtCacheSize = baton->stmtCacheSize;
    pool->lobPrefetchSize = baton->lobPrefetchSize;
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsPool::New()
//   Create new object accesible from JS. This is always called from within
// njsPool::CreateFromBaton() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsPool::New)
{
    njsPool *pool = new njsPool();
    pool->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsPool::GetPoolMin()
//   Get accessor of "poolMin" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetPoolMin)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (pool)
        info.GetReturnValue().Set(pool->poolMin);
}


//-----------------------------------------------------------------------------
// njsPool::GetPoolMax()
//   Get accessor of "poolMax" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetPoolMax)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (pool)
        info.GetReturnValue().Set(pool->poolMax);
}


//-----------------------------------------------------------------------------
// njsPool::GetPoolIncrement()
//   Get accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetPoolIncrement)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (pool)
        info.GetReturnValue().Set(pool->poolIncrement);
}


//-----------------------------------------------------------------------------
// njsPool::GetPoolTimeout()
//   Get accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetPoolTimeout)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (pool)
        info.GetReturnValue().Set(pool->poolTimeout);
}


//-----------------------------------------------------------------------------
// njsPool::GetConnectionsOpen()
//   Get accessor of "connectionsOpen" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetConnectionsOpen)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (!pool)
        return;
    if (!pool->IsValid()) {
        info.GetReturnValue().Set(Nan::Undefined());
        return;
    }
    uint32_t value;
    if (dpiPool_getOpenCount(pool->dpiPoolHandle, &value) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsPool::GetConnectionsInUse()
//   Get accessor of "connectionsInUse" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetConnectionsInUse)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (!pool)
        return;
    if (!pool->IsValid()) {
        info.GetReturnValue().Set(Nan::Undefined());
        return;
    }
    uint32_t value;
    if (dpiPool_getBusyCount(pool->dpiPoolHandle, &value) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsPool::GetPoolPingInterval()
//   Get accessor of "poolPingInterval" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetPoolPingInterval)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (pool)
        info.GetReturnValue().Set(pool->poolPingInterval);
}


//-----------------------------------------------------------------------------
// njsPool::GetStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsPool::GetStmtCacheSize)
{
    njsPool *pool = (njsPool*) ValidateGetter(info);
    if (pool)
        info.GetReturnValue().Set(pool->stmtCacheSize);
}


//-----------------------------------------------------------------------------
// njsPool::SetPoolMin()
//   Set accessor of "poolMin" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetPoolMin)
{
    PropertyIsReadOnly("poolMin");
}


//-----------------------------------------------------------------------------
// njsPool::SetPoolMax()
//   Set accessor of "poolMax" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetPoolMax)
{
    PropertyIsReadOnly("poolMax");
}


//-----------------------------------------------------------------------------
// njsPool::SetPoolIncrement()
//   Set accessor of "poolIncrement" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetPoolIncrement)
{
    PropertyIsReadOnly("poolIncrement");
}


//-----------------------------------------------------------------------------
// njsPool::SetPoolTimeout()
//   Set accessor of "poolTimeout" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetPoolTimeout)
{
    PropertyIsReadOnly("poolTimeout");
}


//-----------------------------------------------------------------------------
// njsPool::SetConnectionsOpen()
//   Set accessor of "connectionsOpen" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetConnectionsOpen)
{
    PropertyIsReadOnly("connectionsOpen");
}


//-----------------------------------------------------------------------------
// njsPool::SetConnectionsInUse()
//   Set accessor of "connectionsInUse" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetConnectionsInUse)
{
    PropertyIsReadOnly("connectionsInUse");
}


//-----------------------------------------------------------------------------
// njsPool::SetPoolPingInterval()
//   Set accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetPoolPingInterval)
{
    PropertyIsReadOnly("poolPingInterval");
}


//-----------------------------------------------------------------------------
// njsPool::SetStmtCacheSize()
//   Set accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsPool::SetStmtCacheSize)
{
    PropertyIsReadOnly("stmtCacheSize");
}


//-----------------------------------------------------------------------------
// njsPool::GetConnection()
//   Get a connection from the pool and return it.
//
// PARAMETERS
//   - JS callback which will receive (error, connection)
//-----------------------------------------------------------------------------
NAN_METHOD(njsPool::GetConnection)
{
    njsBaton *baton;
    njsPool *pool;

    pool = (njsPool*) ValidateArgs(info, 1, 1);
    if (!pool)
        return;
    baton = pool->CreateBaton(info);
    if (!baton)
        return;
    if (baton->error.empty()) {
        baton->jsOracledb.Reset(pool->jsOracledb);
        njsOracledb *oracledb = baton->GetOracledb();
        baton->connClass = oracledb->getConnectionClass();
        baton->lobPrefetchSize =  pool->lobPrefetchSize;
        baton->SetDPIPoolHandle(pool->dpiPoolHandle);
    }
    baton->QueueWork("GetConnection", Async_GetConnection,
            Async_AfterGetConnection, 2);
}


//-----------------------------------------------------------------------------
// njsPool::Async_GetConnection()
//   Worker function for njsPool::GetConnection() method.
//-----------------------------------------------------------------------------
void njsPool::Async_GetConnection(njsBaton *baton)
{
    dpiConnCreateParams params;
    dpiContext *context;

    context = njsOracledb::GetDPIContext();
    if (dpiContext_initConnCreateParams(context, &params) < 0) {
        baton->GetDPIError();
        return;
    }
    if (!baton->connClass.empty()) {
        params.connectionClass = baton->connClass.c_str();
        params.connectionClassLength = baton->connClass.length();
    }
    if (dpiPool_acquireConnection(baton->dpiPoolHandle, NULL, 0, NULL, 0,
            &params, &baton->dpiConnHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsPool::Async_AfterGetConnection()
//   Sets up the arguments for the callback to JS. The connection object is
// created and passed as the second argument. The first argument is the error
// and at this point it is known that no error has taken place.
//-----------------------------------------------------------------------------
void njsPool::Async_AfterGetConnection(njsBaton *baton, Local<Value> argv[])
{
    argv[1] = njsConnection::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsPool::Close()
//   Close the pool. The reference to the DPI handle is transferred to the
// baton so that it will cleared automatically upon success and so that the
// pool is marked as invalid immediately.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsPool::Close)
{
    njsBaton *baton;
    njsPool *pool;

    pool = (njsPool*) ValidateArgs(info, 1, 1);
    if (!pool)
        return;
    baton = pool->CreateBaton(info);
    if (!baton)
        return;
    baton->dpiPoolHandle = pool->dpiPoolHandle;
    pool->dpiPoolHandle = NULL;
    baton->QueueWork("Close", Async_Close, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsPool::Async_Close()
//   Worker function for njsPool::Close() method. If the attempt to
// close the pool fails, the reference to the DPI handle is transferred back
// from the baton to the pool.
//-----------------------------------------------------------------------------
void njsPool::Async_Close(njsBaton *baton)
{
    if (dpiPool_close(baton->dpiPoolHandle, DPI_MODE_POOL_CLOSE_DEFAULT) < 0) {
        njsPool *pool = (njsPool*) baton->callingObj;
        pool->dpiPoolHandle = baton->dpiPoolHandle;
        baton->dpiPoolHandle = NULL;
        baton->GetDPIError();
    }
}

