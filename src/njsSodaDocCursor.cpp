/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

/*************************************************************************
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
 *   njsSodaDocCursor.cpp
 *
 * DESCRIPTION
 *   Soda Document Cursor class implementation.
 *

 ************************************************************************/

#include "njsOracle.h"
#include "njsSodaDocCursor.h"
#include "njsSodaDocument.h"

Nan::Persistent<FunctionTemplate> njsSodaDocCursor::sodaDocCursorTemplate_s;

//-----------------------------------------------------------------------------
// njsSodaDocCursor::Init()
//   Initialization function, maps functions from JS to C++.
//-----------------------------------------------------------------------------
void njsSodaDocCursor::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);

    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("SodaDocCursor").ToLocalChecked());

    // Methods
    Nan::SetPrototypeMethod(tpl, "getNext", GetNext);
    Nan::SetPrototypeMethod(tpl, "close", Close);

    sodaDocCursorTemplate_s.Reset(tpl);
    Nan::Set(target, Nan::New<v8::String>("SodaDocCursor").ToLocalChecked(),
            tpl->GetFunction());
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor::New
//   Create new object accesible from JS. This is always called from within
// CreateFromBaton() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDocCursor::New)
{
    njsSodaDocCursor *cursor = new njsSodaDocCursor();
    cursor->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor::CreateFromBaton()
//   Creates a new SODA document cursor object and wraps it for use within
// Javascript. The ODPI-C cursor reference is transferred from the baton to the
// new object.
//-----------------------------------------------------------------------------
Local<Object> njsSodaDocCursor::CreateFromBaton(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    njsSodaDocCursor *cursor;
    Local<Function> func;
    Local<Object> obj;

    func = Nan::GetFunction(Nan::New<FunctionTemplate>(
            sodaDocCursorTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    cursor = Nan::ObjectWrap::Unwrap<njsSodaDocCursor>(obj);
    cursor->dpiSodaDocCursorHandle = baton->dpiSodaDocCursorHandle;
    baton->dpiSodaDocCursorHandle = NULL;
    cursor->jsOracledb.Reset(baton->jsOracledb);

    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor::GetNext()
//   Get the next SODA document from the cursor, if one is available.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDocCursor::GetNext)
{
    njsSodaDocCursor *cursor = (njsSodaDocCursor*) ValidateArgs(info, 1, 1);
    if (!cursor)
        return;

    njsBaton *baton = cursor->CreateBaton(info);
    if (!baton)
        return;

    baton->SetDPISodaDocCursorHandle(cursor->dpiSodaDocCursorHandle);
    baton->jsOracledb.Reset(cursor->jsOracledb);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();
    baton->QueueWork("GetNextDoc", Async_GetNext, Async_AfterGetNext, 2);
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor::Async_GetNext()
//   Peform the work of obtaining the next SODA document from the cursor, if
// one is available.
//-----------------------------------------------------------------------------
void njsSodaDocCursor::Async_GetNext(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaDocCursor_getNext(baton->dpiSodaDocCursorHandle, flags,
            &baton->dpiSodaDocHandle) < 0 )
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor::Async_AfterGetNext()
//   Returns a SODA document if one was found, or undefined if not.
//-----------------------------------------------------------------------------
void njsSodaDocCursor::Async_AfterGetNext(njsBaton *baton, Local<Value> argv[])
{
    if (baton->dpiSodaDocHandle)
        argv[1] = njsSodaDocument::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor::Close()
//   Close the cursor. The reference to the ODPI-C document cursor is
// transferred to the baton so that it will be released as soon as possible. It
// is restored upon failure, however.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDocCursor::Close)
{
    njsSodaDocCursor *cursor = (njsSodaDocCursor*) ValidateArgs(info, 1, 1);
    if (!cursor)
        return;

    njsBaton *baton = cursor->CreateBaton(info);
    if (!baton)
        return;

    baton->dpiSodaDocCursorHandle = cursor->dpiSodaDocCursorHandle;
    cursor->dpiSodaDocCursorHandle = NULL;
    baton->QueueWork("Close", Async_Close, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsSodaDocCursor::Async_Close()
//   Actually closes the cursor. If the close fails, however, restore the
// ODPI-C handle. If it succeds, the baton destructor will automatically
// release the handle.
//-----------------------------------------------------------------------------
void njsSodaDocCursor::Async_Close(njsBaton *baton)
{
    if (dpiSodaDocCursor_close(baton->dpiSodaDocCursorHandle) < 0 ) {
        njsSodaDocCursor *cursor = (njsSodaDocCursor*) baton->callingObj;
        cursor->dpiSodaDocCursorHandle = baton->dpiSodaDocCursorHandle;
        baton->dpiSodaDocCursorHandle = NULL;
        baton->GetDPIError();
    }
}
