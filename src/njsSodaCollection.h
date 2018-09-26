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
 *   njsSodaCollection.h
 *
 * DESCRIPTION
 *   Connection class implementation.
 *
 *****************************************************************************/

#ifndef __NJSSODACOLL_H__
#define __NJSSODACOLL_H__

#include "njsCommon.h"

//-----------------------------------------------------------------------------
// njsSodaCollection
//   Class exposed to JS for handling SODA collections in the database.
//-----------------------------------------------------------------------------
class njsSodaCollection : public njsCommon  {
public:
    static void Init(Local<Object> target);
    static Local<Object> CreateFromBaton(njsBaton *baton);
    dpiSodaColl *GetDPISodaColl() const { return dpiSodaCollHandle; }

private:
    static Nan::Persistent<FunctionTemplate> sodaCollTemplate_s;

    static NAN_METHOD(New);

    static NAN_METHOD(DropCollection);
    static void Async_DropCollection(njsBaton *baton);
    static void Async_AfterDropCollection(njsBaton *baton, Local<Value> arg[]);

    static NAN_METHOD(InsertOne);
    static void Async_InsertOne(njsBaton *baton);
    static void Async_AfterInsertOne(njsBaton *baton, Local<Value> arg[]);

    static NAN_METHOD(InsertOneAndGet);
    static void Async_InsertOneAndGet(njsBaton *baton);
    static void Async_AfterInsertOneAndGet(njsBaton *baton,
            Local<Value> arg[]);

    static NAN_METHOD(CreateIndex);
    static void Async_CreateIndex(njsBaton *baton);

    static NAN_METHOD(DropIndex);
    static void Async_DropIndex(njsBaton *baton);
    static void Async_AfterDropIndex(njsBaton *baton, Local<Value> argv[]);

    static NAN_METHOD(GetDataGuide);
    static void Async_GetDataGuide(njsBaton *baton);
    static void Async_AfterGetDataGuide(njsBaton *baton, Local<Value> argv[]);

    // find method
    static NAN_METHOD(Find);

    // Define Getter Accessors to Properties
    static NAN_GETTER(GetCollectionName);
    static NAN_GETTER(GetCollectionMetaData);

    // Define Setter Accessors to Properties
    static NAN_SETTER(SetCollectionName);
    static NAN_SETTER(SetCollectionMetaData);

    bool IsValid() const { return true; }

    njsErrorType GetInvalidErrorType() const { return errSuccess; }

    // Constructor
    njsSodaCollection() : dpiSodaCollHandle(NULL), dpiSodaDbHandle(NULL) { }

    // Destructor
    ~njsSodaCollection() {
        if (dpiSodaCollHandle) {
            dpiSodaColl_release(dpiSodaCollHandle);
            dpiSodaCollHandle = NULL;
        }
        jsOracledb.Reset();
    }

private:
    dpiSodaColl *dpiSodaCollHandle;  // Soda Collection
    dpiSodaDb   *dpiSodaDbHandle;    // Underlying SodaDatabase object
    Nan::Persistent<Object> jsOracledb;     // Oracledb object from JS land
};

#endif    // ++MKSSPDACOLL_H__
