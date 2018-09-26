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
 *  njsSodaOperation.h
 *
 * DESCRIPTION
 *  SodaOperation class
 *
 *****************************************************************************/

#ifndef __NJSSODAOP_H__
#define __NJSSODAOP_H__

#include "njsCommon.h"

class njsSodaOperation : public njsCommon {
public:
    static void Init(Local<Object> target);
    static Local<Object> Create(dpiSodaColl *coll, dpiSodaDb *db,
            Nan::Persistent<Object> &js);

private:
    static NAN_METHOD(New);

    static NAN_METHOD(Count);
    static void Async_Count(njsBaton *baton);
    static void Async_AfterCount(njsBaton *baton, Local<Value> argv[]);

    static NAN_METHOD(GetOne);
    static void Async_GetOne(njsBaton *baton);
    static void Async_AfterGetOne(njsBaton *baton, Local<Value> argv[]);

    static NAN_METHOD(ReplaceOne);
    static void Async_ReplaceOne(njsBaton *baton);
    static void Async_AfterReplaceOne(njsBaton *baton, Local<Value> argv[]);

    static NAN_METHOD(ReplaceOneAndGet);
    static void Async_ReplaceOneAndGet(njsBaton *baton);
    static void Async_AfterReplaceOneAndGet(njsBaton *baton,
            Local<Value> argv[]);

    static NAN_METHOD(Remove);
    static void Async_Remove(njsBaton *baton);
    static void Async_AfterRemove(njsBaton *baton, Local<Value> argv[]);

    static NAN_METHOD(GetCursor);
    static void Async_GetCursor(njsBaton *baton);
    static void Async_AfterGetCursor(njsBaton *baton, Local<Value> argv[]);

    static NAN_METHOD(GetDocuments);
    static void Async_GetDocuments(njsBaton *baton);
    static void Async_AfterGetDocuments(njsBaton *baton, Local<Value> argv[]);

    bool IsValid() const { return true; }

    njsErrorType GetInvalidErrorType() const { return errSuccess; }

    // constructor
    njsSodaOperation() : dpiSodaCollHandle(NULL), dpiSodaDbHandle(NULL) { }

    // destructor; do not release SODA database handle as a separate reference
    // is not obtained for it
    ~njsSodaOperation() {
        if (dpiSodaCollHandle) {
            dpiSodaColl_release(dpiSodaCollHandle);
            dpiSodaCollHandle = NULL;
        }
        jsOracledb.Reset();
    }

    // Utility functions
    bool ProcessOptions(njsBaton *baton, Local<Object> options);

    // member variables
    dpiSodaColl *dpiSodaCollHandle;
    dpiSodaDb *dpiSodaDbHandle;
    Nan::Persistent<Object> jsOracledb;

    // static member variables
    static Nan::Persistent<FunctionTemplate> sodaOperationTemplate_s;
};

#endif    // __NJSSODAOP_H__
