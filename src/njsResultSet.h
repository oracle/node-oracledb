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
 *   njsResultSet.h
 *
 * DESCRIPTION
 *   ResultSet class
 *
 *****************************************************************************/

#ifndef __NJSRESULTSET_H__
#define __NJSRESULTSET_H__

#include <node.h>
#include "nan.h"
#include <v8.h>
#include <string>
#include "njsOracle.h"
#include "njsConnection.h"

using namespace v8;
using namespace node;

//-----------------------------------------------------------------------------
// njsResultSet
//   Class exposed to JS for handling result sets.
//-----------------------------------------------------------------------------
class njsResultSet: public njsCommon {
public:

    static void Init(Local<Object> target);
    bool IsValid() const;
    njsErrorType GetInvalidErrorType() const { return errInvalidResultSet; }
    static Local<Object> CreateFromBaton(njsBaton *baton);
    static bool CreateFromRefCursor(njsBaton *baton, dpiStmt *dpiStmtHandle,
            njsVariable *queryVars, uint32_t numQueryVars,
            Local<Value> &value);

private:

    njsResultSet() : dpiStmtHandle(NULL), dpiConnHandle(NULL), numQueryVars(0),
            queryVars(NULL), outFormat(0), maxRows(0),
            extendedMetaData(false), autoClose(false) {}
    ~njsResultSet();

    bool GetRowsHelper(njsBaton *baton, int *moreRows);

    static NAN_METHOD(New);

    // Get Rows Methods
    static NAN_METHOD(GetRows);
    static void Async_GetRows(njsBaton *baton);
    static void Async_AfterGetRows(njsBaton *baton, Local<Value> argv[]);

    // Close Methods
    static NAN_METHOD(Close);
    static void Async_Close(njsBaton *baton);
    static void Async_AfterClose(njsBaton *baton, Local<Value> argv[]);

    // Define Getter Accessors to properties
    static NAN_GETTER(GetMetaData);

    // Define Setter Accessors to properties
    static NAN_SETTER(SetMetaData);

    dpiStmt *dpiStmtHandle;
    dpiConn *dpiConnHandle;
    uint32_t numQueryVars;
    njsVariable *queryVars;
    uint32_t outFormat;
    uint32_t maxRows;
    bool extendedMetaData;
    bool autoClose;
    Nan::Persistent<Object> jsOracledb;
    Nan::Persistent<Object> jsConnection;

    static Nan::Persistent<FunctionTemplate> resultSetTemplate_s;
};

#endif                                          /* __NJSRESULTSET_H__ */
