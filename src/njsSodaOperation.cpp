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
 *   njsSodaOperation.cpp
 *
 * DESCRIPTION
 *   SodaOperation class implementation.
 *
 * NOTE:
 *   This object is a pseudo object, and encapsulates the criteria used to
 *   perform operations on a SODA collection.
 *
 ************************************************************************/

#include "njsOracle.h"
#include "njsSodaOperation.h"
#include "njsSodaDocument.h"
#include "njsSodaDocCursor.h"
#include "njsUtils.h"

// static member variable
Nan::Persistent<FunctionTemplate>
    njsSodaOperation::sodaOperationTemplate_s;


//-----------------------------------------------------------------------------
//  njsSodaOperation::Init
//    Initialization function of SodaOperation class, Maps functions and
//    properties from JS to C++
//-----------------------------------------------------------------------------
void njsSodaOperation::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);

    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("SodaOperation").ToLocalChecked());

    // Methods
    Nan::SetPrototypeMethod(tpl, "count", Count);
    Nan::SetPrototypeMethod(tpl, "getOne", GetOne);
    Nan::SetPrototypeMethod(tpl, "replaceOne", ReplaceOne);
    Nan::SetPrototypeMethod(tpl, "replaceOneAndGet", ReplaceOneAndGet);
    Nan::SetPrototypeMethod(tpl, "remove", Remove);
    Nan::SetPrototypeMethod(tpl, "getCursor", GetCursor);
    Nan::SetPrototypeMethod(tpl, "getDocuments", GetDocuments);

    sodaOperationTemplate_s.Reset(tpl);
    Nan::Set(target, Nan::New<v8::String>("SodaOperation").ToLocalChecked(),
            tpl->GetFunction());
}


//-----------------------------------------------------------------------------
// njsSodaOperation::New()
//   Create new object accesible from JS. This is always called from within
// CreateSodaOp() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::New)
{
    njsSodaOperation *op = new njsSodaOperation();
    op->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Create()
//   Creates a new SodaOperation instance.
//-----------------------------------------------------------------------------
Local<Object> njsSodaOperation::Create(dpiSodaColl *coll, dpiSodaDb *db,
        Nan::Persistent<Object> &jsOracledb)
{
    Nan::EscapableHandleScope scope;
    Local<Function> func;
    njsSodaOperation *op;
    Local<Object> obj;

    func = Nan::GetFunction(Nan::New<FunctionTemplate>(
            sodaOperationTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    op = Nan::ObjectWrap::Unwrap<njsSodaOperation>(obj);
    dpiSodaColl_addRef(coll);
    op->dpiSodaCollHandle = coll;
    op->dpiSodaDbHandle = db;
    op->jsOracledb.Reset(jsOracledb);

    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::ProcessOptions()
//   Utility function which processes the options passed through from
// Javascript and turns them into the options expected by ODPI-C.
//-----------------------------------------------------------------------------
bool njsSodaOperation::ProcessOptions(njsBaton *baton,
        Local<Object> options)
{
    // basic processing to set handles and autocommit flag
    baton->SetDPISodaCollHandle(dpiSodaCollHandle);
    baton->SetDPISodaDbHandle(dpiSodaDbHandle);
    baton->jsOracledb.Reset(jsOracledb);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();

    // initialize SODA operations options structure
    baton->sodaOperOptions = new dpiSodaOperOptions();
    memset(baton->sodaOperOptions, 0, sizeof(dpiSodaOperOptions));

    // process each of the options
    if (!baton->GetUnsignedIntFromJSON(options, "limit", 0,
            &baton->sodaOperOptions->limit))
        return false;
    if (!baton->GetUnsignedIntFromJSON(options, "skip", 0,
            &baton->sodaOperOptions->skip))
        return false;
    if (!baton->GetStringFromJSON(options, "filter", 0, baton->filter))
        return false;
    if (!baton->GetStringFromJSON(options, "version", 0, baton->version))
        return false;
    if (!baton->GetStringFromJSON(options, "key", 0, baton->key))
        return false;
    if (!njsUtils::GetStringArrayFromJSON(options, "keys", 0, baton->keysVec,
            baton->error))
        return false;

    // populate SODDA operations options structure
    baton->sodaOperOptions->filter = baton->filter.c_str();
    baton->sodaOperOptions->filterLength = baton->filter.length();
    baton->sodaOperOptions->version = baton->version.c_str();
    baton->sodaOperOptions->versionLength = baton->version.length();
    baton->sodaOperOptions->key = baton->key.c_str();
    baton->sodaOperOptions->keyLength = baton->key.length();
    if (baton->keysVec.size() > 0) {
        uint32_t count = baton->keysVec.size();
        baton->sodaOperOptions->keys = (const char **) new char*[count];
        baton->sodaOperOptions->keyLengths = new uint32_t[count];
        for (uint32_t i = 0; i < count; i++) {
            baton->sodaOperOptions->keys[i] = baton->keysVec[i].c_str();
            baton->sodaOperOptions->keyLengths[i] = baton->keysVec[i].length();
        }
        baton->sodaOperOptions->numKeys = count;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Count()
//   Returns a count of the number of documents that match the specified
// criteria.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::Count)
{
    njsSodaOperation *op = (njsSodaOperation*) ValidateArgs(info, 2, 2);
    if (!op)
        return;

    njsBaton *baton = op->CreateBaton(info);
    if (!baton)
        return;

    op->ProcessOptions(baton, info[0].As<Object>());
    baton->QueueWork("Count", Async_Count, Async_AfterCount, 2);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_Count()
//   Worker thread method to acquire the count of the number of documents that
// match the specified criteria.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_Count(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_getDocCount(baton->dpiSodaCollHandle,
            baton->sodaOperOptions, flags, &baton->docCount) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_AfterCount()
//   Returns the count of the number of documents that match the specified
// criteria.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_AfterCount(njsBaton *baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();

    Nan::Set(result, Nan::New<v8::String>("count").ToLocalChecked(),
             Nan::New<v8::Integer>((uint32_t)baton->docCount));
    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::GetOne()
//   Returns the first document that matches the specified criteria if one was
// found; otherwise, it returns undefined.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::GetOne)
{
    njsSodaOperation *op = (njsSodaOperation*) ValidateArgs(info, 2, 2);
    if (!op)
        return;

    njsBaton *baton = op->CreateBaton(info);
    if (!baton)
        return;

    op->ProcessOptions(baton, info[0].As<Object>());
    baton->QueueWork("GetOne", Async_GetOne, Async_AfterGetOne, 2);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_GetOne()
//   Worker thread function to acquire the first document that matches the
// specified criteria.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_GetOne(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;

    if (dpiSodaColl_findOne(baton->dpiSodaCollHandle, baton->sodaOperOptions,
            flags, &baton->dpiSodaDocHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_AfterGetOne()
//   Returns the first document that matches the specified criteria, or
// undefined.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_AfterGetOne(njsBaton *baton, Local<Value> argv[])
{
    if (baton->dpiSodaDocHandle)
        argv[1] = njsSodaDocument::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::ReplaceOne()
//   Replaces the document matching the specified criteria with the supplied
// content. If no document is found matching ther criteria, no changes are
// made to the database.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::ReplaceOne)
{
    njsSodaOperation *op = (njsSodaOperation*) ValidateArgs(info, 3, 3);
    if (!op)
        return;

    njsBaton *baton = op->CreateBaton(info);
    if (!baton)
        return;

    op->ProcessOptions(baton, info[0].As<Object>());
    baton->GetSodaDocument(info[1].As<Object>(), op->dpiSodaDbHandle);
    baton->QueueWork("ReplaceOne", Async_ReplaceOne, Async_AfterReplaceOne, 2);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_ReplaceOne()
//   Worker thread function which replaces the document.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_ReplaceOne(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_replaceOne(baton->dpiSodaCollHandle,
            baton->sodaOperOptions, baton->dpiSodaDocHandle, flags,
            &baton->replaced, NULL) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_AfterReplaceOne()
//   Returns a boolean indicating if a replace actually took place or not.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_AfterReplaceOne(njsBaton *baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();

    Nan::Set(result, Nan::New<v8::String>("replaced").ToLocalChecked(),
            Nan::New<v8::Boolean>((baton->replaced != 0) ? true : false));
    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::ReplaceOneAndGet()
//   Similar to ReplaceOne() but returns a wrapped SodaDocument object back in
// the event that the replace was successful.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::ReplaceOneAndGet)
{
    njsSodaOperation *op = (njsSodaOperation*) ValidateArgs(info, 3, 3);
    if (!op)
        return;

    njsBaton *baton = op->CreateBaton(info);
    if (!baton)
        return;

    op->ProcessOptions(baton, info[0].As<Object>());
    baton->GetSodaDocument(info[1].As<Object>(), op->dpiSodaDbHandle);
    baton->QueueWork("ReplaceOne", Async_ReplaceOneAndGet,
            Async_AfterReplaceOneAndGet, 2);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_ReplaceOneAndGet()
//   Worker thread function which replaces the document.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_ReplaceOneAndGet(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc *resultDoc;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_replaceOne(baton->dpiSodaCollHandle,
            baton->sodaOperOptions, baton->dpiSodaDocHandle, flags,
            &baton->replaced, &resultDoc) < 0)
        baton->GetDPIError();
    dpiSodaDoc_release(baton->dpiSodaDocHandle);
    baton->dpiSodaDocHandle = resultDoc;
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_AfterReplaceOneAndGet()
//   Returns a SodaDocument object back to the application if the replacement
// was successful. Note that this document does not contain any content.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_AfterReplaceOneAndGet(njsBaton *baton,
        Local<Value> argv[])
{
    if (baton->dpiSodaDocHandle)
        argv[1] = njsSodaDocument::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Remove()
//   Removes all documents matching the criteria.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::Remove)
{
    njsSodaOperation *op = (njsSodaOperation*) ValidateArgs(info, 2, 2);
    if (!op)
        return;

    njsBaton *baton = op->CreateBaton(info);
    if (!baton)
        return;

    op->ProcessOptions(baton, info[0].As<Object>());
    baton->QueueWork("ReplaceOne", Async_Remove, Async_AfterRemove, 2);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_Remove()
//   Worker thread function to remove all documents matching the criteria.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_Remove(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_remove(baton->dpiSodaCollHandle, baton->sodaOperOptions,
            flags, &baton->docsDeleted) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_AfterRemove()
//   Returns a count of the number of documents that were removed.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_AfterRemove(njsBaton *baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();

    Nan::Set(result, Nan::New<v8::String>("count").ToLocalChecked(),
            Nan::New<v8::Integer>((uint32_t) baton->docsDeleted));
    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::GetCursor()
//   To obtain a cursor of SODA-documents.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::GetCursor)
{
    njsSodaOperation *op = (njsSodaOperation*) ValidateArgs(info, 2, 2 );
    if (!op)
        return;

    njsBaton *baton = op->CreateBaton(info);
    if (!baton)
        return;

    op->ProcessOptions(baton, info[0].As<Object>());
    baton->QueueWork("GetCursor", Async_GetCursor, Async_AfterGetCursor, 2);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_GetCursor()
//    Worker thread function to obtain a cursor of SODA-documents.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_GetCursor(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_find(baton->dpiSodaCollHandle, baton->sodaOperOptions,
            flags, &baton->dpiSodaDocCursorHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_AfterGetCursor()
//   To package a cursor of SODA-documents for JS layer.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_AfterGetCursor(njsBaton *baton,
        Local<Value> argv[])
{
    argv[1] = njsSodaDocCursor::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::GetDocuments()
//   To obtain an array of SODA-documents. NOTE: This uses a cursor internally.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaOperation::GetDocuments)
{
    njsSodaOperation *op = (njsSodaOperation*) ValidateArgs(info, 2, 2);
    if (!op)
        return;

    njsBaton *baton = op->CreateBaton(info);
    if (!baton)
        return;

    op->ProcessOptions(baton, info[0].As<Object>());
    baton->QueueWork("GetDocuments", Async_GetDocuments,
            Async_AfterGetDocuments, 2);
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_GetDocuments()
//   Worker thread function to obtain an array of SODA-documents. NOTE: This
// uses a cursor internally.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_GetDocuments(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc *doc;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_find(baton->dpiSodaCollHandle, baton->sodaOperOptions,
            flags, &baton->dpiSodaDocCursorHandle) < 0) {
        baton->GetDPIError();
    } else {
        while (1) {
            if (dpiSodaDocCursor_getNext(baton->dpiSodaDocCursorHandle, flags,
                    &doc) < 0) {
                baton->GetDPIError();
                break;
            }
            if (!doc)
                break;
            baton->dpiSodaDocsVec.push_back(doc);
        }
    }
}


//-----------------------------------------------------------------------------
// njsSodaOperation::Async_AfterGetDocuments()
//    Return the array of documents to the Javascript application.
//-----------------------------------------------------------------------------
void njsSodaOperation::Async_AfterGetDocuments(njsBaton *baton,
            Local<Value> argv[])
{
    argv[1] = njsSodaDocument::CreateArrayFromBaton(baton);
}
