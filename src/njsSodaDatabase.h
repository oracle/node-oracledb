/* Copyright (c) 2018, Oracle and/or its affiliates.  All rights reserved. */

/*****************************************************************************
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
 *  njsSodaDatabase.h
 *
 * DESCRIPTION
 *  SodaDatabase class
 *
 *****************************************************************************/

#ifndef __NJSSODADB_H__
#define __NJSSODADB_H__

#include "njsCommon.h"

//-----------------------------------------------------------------------------
// njsSodaDatabase
//   Pseudo top level object for all SODA related functionalities.
//-----------------------------------------------------------------------------
class njsSodaDatabase : public njsCommon {
public:
    static void Init(Local<Object> target);
    static Local<Object> CreateFromHandle(Local<Object> jsOracledb,
            dpiSodaDb *dbHandle);

private:
    static NAN_METHOD(New);

    static NAN_METHOD(CreateCollection);
    static void Async_CreateCollection(njsBaton *baton);
    static void Async_AfterCreateCollection(njsBaton *baton,
            Local<Value> argv[]);

    static NAN_METHOD(OpenCollection);
    static void Async_OpenCollection(njsBaton *baton);
    static void Async_AfterOpenCollection(njsBaton *baton,
            Local<Value> argv[]);

    static NAN_METHOD(GetCollectionNames);
    static void Async_GetCollectionNames(njsBaton *baton);
    static void Async_AfterGetCollectionNames(njsBaton *baton,
            Local<Value> argv[]);

    static NAN_METHOD(CreateDocument);

    bool IsValid() const { return ( true ); } // sodaDB never closes.
    njsErrorType GetInvalidErrorType() const { return errSuccess; }

    // Constructor
    njsSodaDatabase() : dpiSodaDbHandle(NULL) {}

    // Destructor
    ~njsSodaDatabase () {
        if (dpiSodaDbHandle) {
            dpiSodaDb_release(dpiSodaDbHandle);
            dpiSodaDbHandle = NULL;
        }
        jsOracledb.Reset();
    }

    // Member variables
    dpiSodaDb *dpiSodaDbHandle;                      // Top level SodaDB object
    Nan::Persistent<Object> jsOracledb;         // Oracledb object from JS land

    static Nan::Persistent<FunctionTemplate> sodaDBTemplate_s;  // template
};

#endif  // __NJSSODADB_H__
