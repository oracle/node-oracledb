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
 *   njsSodaDatabase.cpp
 *
 * DESCRIPTION
 *   SodaDatabase class implementation.
 *
 ****************************************************************************/

#include "njsSodaDatabase.h"
#include "njsConnection.h"
#include "njsSodaCollection.h"
#include "njsSodaDocument.h"
#include "njsUtils.h"

#include <iostream>

using namespace std;

// Persistent sodaDB class handle
Nan::Persistent<FunctionTemplate> njsSodaDatabase::sodaDBTemplate_s;


//-----------------------------------------------------------------------------
// njsSodaDatabase::Init()
//   Initialization function of SodaDatabase class.  Maps functions and
//   properties from JS to C++.
//-----------------------------------------------------------------------------
void njsSodaDatabase::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);

    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("SodaDatabase").ToLocalChecked());

    Nan::SetPrototypeMethod(tpl, "createCollection", CreateCollection);
    Nan::SetPrototypeMethod(tpl, "openCollection", OpenCollection);
    Nan::SetPrototypeMethod(tpl, "getCollectionNames", GetCollectionNames);
    Nan::SetPrototypeMethod(tpl, "createDocument", CreateDocument);

    sodaDBTemplate_s.Reset(tpl);
    Nan::Set(target, Nan::New<v8::String>("SodaDB").ToLocalChecked(),
            tpl->GetFunction());
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::New()
//   To create a new instance of njsSodaDatabase object
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDatabase::New)
{
    njsSodaDatabase *sodaDB = new njsSodaDatabase();
    sodaDB->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::CreateFromHandle()
//   Create a new sodaDatabase from baton.
//-----------------------------------------------------------------------------
Local<Object> njsSodaDatabase::CreateFromHandle(Local<Object> jsOracledb,
        dpiSodaDb *dbHandle)
{
    Nan::EscapableHandleScope scope;
    Local<Function> func;
    Local<Object> obj;
    njsSodaDatabase *db;

    func = Nan::GetFunction(
            Nan::New<FunctionTemplate>(sodaDBTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    db = Nan::ObjectWrap::Unwrap<njsSodaDatabase>(obj);
    db->dpiSodaDbHandle = dbHandle;
    db->jsOracledb.Reset(jsOracledb);

    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::CreateCollection()
//   To create a new SODA Collection object.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDatabase::CreateCollection)
{
    njsBaton *baton;

    njsSodaDatabase *db = (njsSodaDatabase*) ValidateArgs(info, 3, 3);
    if (!db)
        return;

    baton = db->CreateBaton(info);
    if (!baton)
        return;

    baton->SetDPISodaDbHandle(db->dpiSodaDbHandle);
    baton->jsOracledb.Reset(db->jsOracledb);

    Local <Object> sodaProps;
    db->GetStringArg(info, 0, baton->sodaCollName);
    if (db->GetObjectArg(info, 1, sodaProps)) {
        baton->GetStringFromJSON(sodaProps, "metaData", 0,baton->sodaMetaData);
        baton->GetUnsignedIntFromJSON(sodaProps, "mode", 0,
                &baton->createCollectionMode);
    }
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();
    baton->QueueWork("CreateCollection", Async_CreateCollection,
            Async_AfterCreateCollection, 2);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::Async_CreateCollection()
//   Worker thread function to create SODA collection object
//-----------------------------------------------------------------------------
void njsSodaDatabase::Async_CreateCollection(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (baton->createCollectionMode == NJS_SODA_COLL_CREATE_MODE_MAP)
        flags |= DPI_SODA_FLAGS_CREATE_COLL_MAP;

    if (dpiSodaDb_createCollection (baton->dpiSodaDbHandle,
            baton->sodaCollName.c_str(), baton->sodaCollName.length(),
            baton->sodaMetaData.c_str(), baton->sodaMetaData.length(), flags,
            &baton->dpiSodaCollHandle) < 0) {
        baton->GetDPIError();
        return;
    }
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::Async_AfterCreateCollection()
//   Package and return the created SODA-collection object to JS land.
//-----------------------------------------------------------------------------
void njsSodaDatabase::Async_AfterCreateCollection(njsBaton *baton,
        Local<Value> argv[])
{
    argv[1] = njsSodaCollection::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::OpenCollection()
//   Open an existing soda collection
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDatabase::OpenCollection)
{
    njsSodaDatabase *db = (njsSodaDatabase*) ValidateArgs(info, 2, 2);
    if (!db)
        return;

    njsBaton *baton = db->CreateBaton(info);
    if (!baton)
        return ;

    baton->SetDPISodaDbHandle(db->dpiSodaDbHandle);
    baton->jsOracledb.Reset(db->jsOracledb);
    db->GetStringArg(info, 0, baton->sodaCollName);
    baton->autoCommit = baton->GetOracledb()->getAutoCommit();
    baton->QueueWork("OpenCollection", Async_OpenCollection,
            Async_AfterOpenCollection, 2);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::Async_OpenCollection()
//   Worker thread function to open an existing SODA collection
//-----------------------------------------------------------------------------
void njsSodaDatabase::Async_OpenCollection(njsBaton *baton)
{
    uint32_t flags = DPI_SODA_FLAGS_DEFAULT;

    if (baton->autoCommit)
        flags |= DPI_SODA_FLAGS_ATOMIC_COMMIT;
    if (dpiSodaDb_openCollection(baton->dpiSodaDbHandle,
            baton->sodaCollName.c_str(), baton->sodaCollName.length(), flags,
            &baton->dpiSodaCollHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::Async_AfterOpenCollection()
//   Returns opened SODA collection to JS land
//-----------------------------------------------------------------------------
void njsSodaDatabase::Async_AfterOpenCollection(njsBaton *baton,
        Local<Value> argv[])
{
    if (baton->dpiSodaCollHandle)
        argv[1] = njsSodaCollection::CreateFromBaton(baton);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::GetCollectionNames()
//   Returns an array of collection names
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDatabase::GetCollectionNames)
{
    njsBaton *baton = NULL;
    njsSodaDatabase *db = (njsSodaDatabase*) ValidateArgs(info, 2, 2);
    if (!db)
        return;

    baton = db->CreateBaton(info);
    if (!baton)
        return;

    Local<Object> opts;
    baton->SetDPISodaDbHandle(db->dpiSodaDbHandle);
    if (db->GetObjectArg(info, 0, opts)) {
        baton->GetIntFromJSON(opts, "limit", 1, &baton->limit);
        baton->GetStringFromJSON(opts, "startsWith", 1, baton->startsWith);
    }
    baton->QueueWork("GetCollectionNames", Async_GetCollectionNames,
            Async_AfterGetCollectionNames, 2);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::AsyncGetCollectionNames()
//   Worker thread function to get an array of collection names.
//-----------------------------------------------------------------------------
void njsSodaDatabase::Async_GetCollectionNames(njsBaton *baton)
{
    baton->sodaCollNames = new dpiSodaCollNames();
    if (dpiSodaDb_getCollectionNames(baton->dpiSodaDbHandle,
            baton->startsWith.c_str(), baton->startsWith.length(),
            (uint32_t) baton->limit, DPI_SODA_FLAGS_DEFAULT,
            baton->sodaCollNames) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::Async_AfterGetCollectionNames()
//   Returns an array of collection names on success
//-----------------------------------------------------------------------------
void njsSodaDatabase::Async_AfterGetCollectionNames(njsBaton* baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;

    dpiSodaCollNames *names = baton->sodaCollNames;
    Local<Array> arrayVal = Nan::New<Array>(names->numNames);
    for (uint32_t coll = 0; coll < names->numNames; coll++) {
        Local<String> name = Nan::New<String>(names->names[coll],
                names->nameLengths[coll]).ToLocalChecked();
        Nan::Set(arrayVal, coll, name);
    }
    argv[1] = scope.Escape(arrayVal);
}


//-----------------------------------------------------------------------------
// njsSodaDatabase::CreateDocument()
//   To create a SODA document object with the given content and atttributes.
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDatabase::CreateDocument)
{
    njsSodaDatabase *db = (njsSodaDatabase*) ValidateArgs(info, 2, 2);
    if (!db)
        return;

    // get options
    Local<Object> options;
    std::string key, mediaType, error;
    if (db->GetObjectArg(info, 1, options)) {
        if (!njsUtils::GetStringFromJSON(options, "key", 1, key, error)) {
            Nan::ThrowError(error.c_str());
            return;
        }
        if (!njsUtils::GetStringFromJSON(options, "mediaType", 1, mediaType,
                                        error)) {
            Nan::ThrowError(error.c_str());
            return;
        }
    }

    // create ODPI-C document
    dpiSodaDoc *doc;
    Local<Value> content = info[0].As<Value>();
    if (dpiSodaDb_createDocument(db->dpiSodaDbHandle, key.c_str(),
            key.length(),
            Buffer::Data(content), Buffer::Length(content), mediaType.c_str(),
            mediaType.length(), (uint32_t) DPI_SODA_FLAGS_DEFAULT, &doc) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }

    // return wrapped ODPI-C document
    Local<Object> obj = njsSodaDocument::CreateFromDPIDoc(doc);
    info.GetReturnValue().Set(obj);
}
