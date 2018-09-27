/* Copyright (c) 2018, Oracle and/or its affiliates.  All rights reserved. */

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
 *   njsSodaCollection.cpp
 *
 * DESCRIPTION
 *   SodaCollection class implementation.
 *
 ****************************************************************************/

#include "njsOracle.h"
#include "njsSodaCollection.h"
#include "njsSodaDocument.h"
#include "njsSodaOperation.h"

using namespace std;

Nan::Persistent<FunctionTemplate> njsSodaCollection::sodaCollTemplate_s;


//-----------------------------------------------------------------------------
// njsSodaCollection::Init()
//   Initialization function of SodaCollection class. Maps functions and
// properties from JS to C++.
//-----------------------------------------------------------------------------
void njsSodaCollection::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> tpl =
            Nan::New<FunctionTemplate>(njsSodaCollection::New);
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("Collection").ToLocalChecked());

    Nan::SetPrototypeMethod(tpl, "drop", DropCollection);
    Nan::SetPrototypeMethod(tpl, "insertOne", InsertOne);
    Nan::SetPrototypeMethod(tpl, "insertOneAndGet", InsertOneAndGet);
    Nan::SetPrototypeMethod(tpl, "createIndex", CreateIndex);
    Nan::SetPrototypeMethod(tpl, "dropIndex", DropIndex);
    Nan::SetPrototypeMethod(tpl, "getDataGuide", GetDataGuide);
    Nan::SetPrototypeMethod(tpl, "find", Find);

    // Properties
    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("name").ToLocalChecked(),
            njsSodaCollection::GetCollectionName,
            njsSodaCollection::SetCollectionName);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("metaData").ToLocalChecked(),
            njsSodaCollection::GetCollectionMetaData,
            njsSodaCollection::SetCollectionMetaData);

    sodaCollTemplate_s.Reset(tpl);
    Nan::Set(target, Nan::New<v8::String>("Collection").ToLocalChecked(),
            tpl->GetFunction());
}


//-----------------------------------------------------------------------------
// njsSodaCollection::New()
//   Create new object accesible from JS. This is always called from within
// CreateFromBaton() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::New)
{
    njsSodaCollection *coll = new njsSodaCollection();
    coll->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsSodaCollection::CreateFromBaton()
//   Creates a new SodaCollection from the baton. The references to the ODPI-C
// SODA database and collection are transferred to the ownership of the newly
// created object.
//-----------------------------------------------------------------------------
Local<Object> njsSodaCollection::CreateFromBaton(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    njsSodaCollection *coll;
    Local<Function> func;
    Local<Object> obj;

    func = Nan::GetFunction(
            Nan::New<FunctionTemplate>(sodaCollTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    coll = Nan::ObjectWrap::Unwrap<njsSodaCollection>(obj);
    coll->dpiSodaCollHandle = baton->dpiSodaCollHandle;
    coll->dpiSodaDbHandle = baton->dpiSodaDbHandle;
    coll->jsOracledb.Reset(baton->jsOracledb);
    baton->dpiSodaCollHandle = NULL;
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::DropCollection()
//   Drops the current collection.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::DropCollection)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateArgs(info, 1, 1);
    if (!coll)
        return;

    njsBaton *baton = coll->CreateBaton(info);
    if (!baton)
        return;

    baton->SetDPISodaCollHandle(coll->dpiSodaCollHandle);
    baton->jsOracledb.Reset(coll->jsOracledb);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();
    baton->QueueWork("DropCollection", Async_DropCollection,
            Async_AfterDropCollection, 2);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_DropCollection()
//   Worker thread function to drop the SODA collection.
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_DropCollection(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_drop(baton->dpiSodaCollHandle, flags,
            &baton->isDropped) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_AfterDropCollection()
//   Creates the result object which is returned to the Javascript application.
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_AfterDropCollection(njsBaton *baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();

    Nan::Set(result, Nan::New<v8::String>("dropped").ToLocalChecked(),
            Nan::New<v8::Boolean>(baton->isDropped));
    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::InsertOne()
//   Inserts a single document into the collection.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::InsertOne)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateArgs(info, 2, 2);
    if (!coll)
        return;

    njsBaton *baton = coll->CreateBaton(info);
    if (!baton)
        return;

    baton->SetDPISodaCollHandle(coll->dpiSodaCollHandle);
    baton->jsOracledb.Reset(coll->jsOracledb);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();
    baton->GetSodaDocument(info[0].As<Object>(), coll->dpiSodaDbHandle);
    baton->QueueWork("InsertOne", Async_InsertOne, NULL, 2);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_InsertOne()
//   Worker thread function to insert a given soda-document into the current
// collection.
//----------------------------------------------------------------------------
void njsSodaCollection::Async_InsertOne(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_insertOne(baton->dpiSodaCollHandle,
            baton->dpiSodaDocHandle, flags, NULL) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
//  njsSodaCollection::InsertOneAndGet()
//    To insert a given document and return the result-document with metadata
//  of inserted document.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::InsertOneAndGet)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateArgs(info, 2, 2);
    if (!coll)
        return;

    njsBaton *baton = coll->CreateBaton (info);
    if (!baton)
        return;

    baton->SetDPISodaCollHandle(coll->dpiSodaCollHandle);
    baton->jsOracledb.Reset(coll->jsOracledb);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();
    baton->GetSodaDocument(info[0].As<Object>(), coll->dpiSodaDbHandle);
    baton->QueueWork("InsertOneAndGet", Async_InsertOneAndGet,
            Async_AfterInsertOneAndGet, 2);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_InsertOneAndGet()
//   Worker thread function to insert a given soda-document into the current
// collection. This operation also obatins the result-document.
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_InsertOneAndGet(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;
    dpiSodaDoc *resultDoc;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_insertOne(baton->dpiSodaCollHandle,
            baton->dpiSodaDocHandle, flags, &resultDoc) < 0)
        baton->GetDPIError();
    dpiSodaDoc_release(baton->dpiSodaDocHandle);
    baton->dpiSodaDocHandle = resultDoc;
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_AfterInsertOneAndGet()
//   To return the result-document of inserted document to the JS layer.
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_AfterInsertOneAndGet(njsBaton *baton,
        Local<Value> arg[])
{
    arg[1] = njsSodaDocument::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::CreateIndex()
//   To create an index on the document collection
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::CreateIndex)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateArgs(info, 2, 2);
    if (!coll)
        return;

    njsBaton *baton = coll->CreateBaton(info);
    if (!baton)
        return;

    baton->SetDPISodaCollHandle(coll->dpiSodaCollHandle);
    baton->jsOracledb.Reset(coll->jsOracledb);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();
    coll->GetStringArg(info, 0, baton->indexSpec);
    baton->QueueWork("CreateIndex", Async_CreateIndex, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_CreateIndex()
//   Worker thread function to create index on document collection
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_CreateIndex(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaColl_createIndex(baton->dpiSodaCollHandle,
            baton->indexSpec.c_str(), baton->indexSpec.length(), flags) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaCollection::DropIndex()
//   To drop an index of document collection
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::DropIndex)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateArgs(info, 3, 3);
    if (!coll)
        return;

    njsBaton *baton = coll->CreateBaton(info);
    if (!baton)
        return;

    baton->SetDPISodaCollHandle(coll->dpiSodaCollHandle);
    baton->jsOracledb.Reset(coll->jsOracledb);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();

    Local<Object> options;
    coll->GetStringArg(info, 0, baton->indexName);
    if (coll->GetObjectArg(info, 2, options))
        baton->GetBoolFromJSON(options, "force", 2, &baton->force);
    baton->QueueWork("DropIndex", Async_DropIndex, Async_AfterDropIndex, 2);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_DropIndex()
//   Worker thread function to drop index
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_DropIndex(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (baton->force)
        flags |= DPI_SODA_FLAGS_INDEX_DROP_FORCE;

    if (dpiSodaColl_dropIndex(baton->dpiSodaCollHandle,
            baton->indexName.c_str(), baton->indexName.length(), flags,
            &baton->isDropped) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
//  njsSodaCollection::Async_AfterDropIndex()
//    To package the isDropped flag to application
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_AfterDropIndex(njsBaton *baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();

    Nan::Set(result, Nan::New<v8::String>("dropped").ToLocalChecked(),
             Nan::New<v8::Boolean>(baton->isDropped));
    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::GetDataGuide()
//   To obtain dataGuide
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::GetDataGuide)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateArgs(info, 1, 1);
    if (!coll)
        return;

    njsBaton *baton = coll->CreateBaton(info);
    if (!baton)
        return;

    baton->SetDPISodaCollHandle(coll->dpiSodaCollHandle);
    baton->QueueWork("GetDataGuide", Async_GetDataGuide,
            Async_AfterGetDataGuide, 2);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_GetDataGuide()
//   Worker thread function to obtain the data guide
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_GetDataGuide(njsBaton *baton)
{
    if (dpiSodaColl_getDataGuide(baton->dpiSodaCollHandle,
            DPI_SODA_FLAGS_DEFAULT, &baton->dpiSodaDocHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Async_AfterGetDataGuide()
//   To package the dataGuide to application
//-----------------------------------------------------------------------------
void njsSodaCollection::Async_AfterGetDataGuide(njsBaton *baton,
        Local<Value> argv[])
{
    if (baton->dpiSodaDocHandle)
        argv[1] = njsSodaDocument::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::Find()
//   Create a SodaOperation object.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaCollection::Find)
{
    Nan::EscapableHandleScope scope;
    njsSodaCollection* coll = (njsSodaCollection*) ValidateArgs(info, 0, 0);
    if (!coll)
        return;

    Local<Object> obj = njsSodaOperation::Create(coll->dpiSodaCollHandle,
            coll->dpiSodaDbHandle, coll->jsOracledb);
    info.GetReturnValue().Set(obj);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::GetCollectionName()
//   To obtain the collection from from collection object
//-----------------------------------------------------------------------------
NAN_GETTER(njsSodaCollection::GetCollectionName)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateGetter(info);
    if (!coll)
        return;

    const char *name;
    uint32_t nameLen;
    if (dpiSodaColl_getName(coll->dpiSodaCollHandle, &name, &nameLen) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }
    Local<String> value = Nan::New<v8::String>(name, nameLen).ToLocalChecked();
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::SetCollectionName()
//   dummy function to handle read-only property being set
//-----------------------------------------------------------------------------
NAN_SETTER(njsSodaCollection::SetCollectionName)
{
    PropertyIsReadOnly("name");
}


//-----------------------------------------------------------------------------
// njsSodaCollection::GetCollectionMetaData()
//   To obtain collection metadata from collection
//-----------------------------------------------------------------------------
NAN_GETTER(njsSodaCollection::GetCollectionMetaData)
{
    njsSodaCollection *coll = (njsSodaCollection*) ValidateGetter(info);
    if (!coll)
        return;

    const char *metadata;
    uint32_t metadataLen;
    if (dpiSodaColl_getMetadata(coll->dpiSodaCollHandle, &metadata,
            &metadataLen) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }
    Local<String> value =
            Nan::New<v8::String>(metadata, metadataLen).ToLocalChecked();
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsSodaCollection::SetCollectionMetaData()
//   Dummy function to handle read-only property being set
//-----------------------------------------------------------------------------
NAN_SETTER(njsSodaCollection::SetCollectionMetaData)
{
    PropertyIsReadOnly("metaData");
}
