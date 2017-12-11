/* Copyright (c) 2015, 2017, Oracle and/or its affiliates.
   All rights reserved. */

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
 *  njsConnection.h
 *
 * DESCRIPTION
 *  Connection class
 *
 *****************************************************************************/

#ifndef __NJSCONNECTION_H__
#define __NJSCONNECTION_H__

#include <node.h>
#include <string>
#include "njsOracle.h"

using namespace v8;
using namespace node;

class Connection;


//-----------------------------------------------------------------------------
// njsConnection
//   Class exposed to JS for handling connections to the database.
//-----------------------------------------------------------------------------
class njsConnection: public njsCommon {
public:
    static Local<Object> CreateFromBaton(njsBaton *baton);
    static Local<Value> GetMetaData(njsVariable *vars, uint32_t numVars,
            bool extendedMetaData);
    static bool GetRows(njsBaton* baton, Local<Object> &rows);
    static bool ProcessFetch(njsBaton* baton);
    static bool ProcessQueryVars(njsBaton* baton, dpiStmt *dpiStmtHandle,
            njsVariable *vars, uint32_t numVars);
    static void Init(Handle<Object> target);
    bool IsValid() const { return (dpiConnHandle) ? true : false; }
    njsErrorType GetInvalidErrorType() const { return errInvalidConnection; }

private:
    njsConnection() : dpiConnHandle(NULL) {}
    ~njsConnection() {
        jsOracledb.Reset();
        if (dpiConnHandle) {
            dpiConn_release(dpiConnHandle);
            dpiConnHandle = NULL;
        }
    }

    static NAN_METHOD(New);

    // Execute Method on Connection class
    static NAN_METHOD(Execute);
    static void Async_Execute(njsBaton *baton);
    static void Async_AfterExecute(njsBaton *baton, Local<Value> argv[]);
    static void Async_ExecuteGetMoreRows(njsBaton *baton);

    // Release Method on Connection class
    static NAN_METHOD(Release);
    static void Async_Release(njsBaton *baton);
    static void Async_AfterRelease(njsBaton *baton, Local<Value> argv[]);

    // Commit Method on Connection class
    static NAN_METHOD(Commit);
    static void Async_Commit(njsBaton *baton);

    // Rollback Method on Connection class
    static NAN_METHOD(Rollback);
    static void Async_Rollback(njsBaton *baton);

    // Break Method on Connection class
    static NAN_METHOD(Break);
    static void Async_Break(njsBaton *baton);

    // CreateLob Method on Connection class
    static NAN_METHOD(CreateLob);
    static void Async_CreateLob(njsBaton *baton);
    static void Async_AfterCreateLob(njsBaton *baton, Local<Value> argv[]);

    // Define Getter Accessors to properties
    static NAN_GETTER(GetStmtCacheSize);
    static NAN_GETTER(GetClientId);
    static NAN_GETTER(GetModule);
    static NAN_GETTER(GetAction);
    static NAN_GETTER(GetOracleServerVersion);

    // Define Setter Accessors to properties
    static NAN_SETTER(SetStmtCacheSize);
    static NAN_SETTER(SetClientId);
    static NAN_SETTER(SetModule);
    static NAN_SETTER(SetAction);
    static NAN_SETTER(SetOracleServerVersion);

    // internal methods
    static bool GetBindTypeAndSizeFromValue(njsVariable *var,
            Local<Value> value, uint32_t *bindType, uint32_t *maxSize,
            njsBaton *baton, bool scalarOnly = false);
    static Local<Value> GetOutBinds(njsBaton *baton);
    static bool GetScalarValueFromVar(njsBaton *baton, njsVariable *var,
            uint32_t pos, Local<Value> &value);
    static bool GetValueFromVar(njsBaton *baton, njsVariable *var,
            Local<Value> &value);
    static bool MapByName(njsBaton *baton, dpiQueryInfo *queryInfo,
            dpiOracleTypeNum &targetType);
    static bool MapByType(njsBaton *baton, dpiQueryInfo *queryInfo,
            dpiOracleTypeNum &targetType);
    static bool PrepareAndBind(njsBaton* baton);
    static bool ProcessBinds(Nan::NAN_METHOD_ARGS_TYPE args,
            unsigned int index, njsBaton *baton);
    static bool ProcessBindsByName(Handle<Object> bindObj, njsBaton *baton);
    static bool ProcessBindsByPos(Handle<Array> bindarray, njsBaton *baton);
    static bool ProcessBind(Local<Value> bindTypes, njsVariable *var,
            bool byPosition, njsBaton *baton);
    static bool ProcessBindValue(Local<Value> bindValue, njsVariable *var,
            njsBaton *baton);
    static bool ProcessScalarBindValue(Local<Value> bindValue,
            njsVariable *var, uint32_t pos, njsBaton *baton);
    static bool ProcessVars(njsBaton *baton, njsVariable *vars,
            uint32_t numVars, uint32_t numElements);
    static bool ProcessOptions(Nan::NAN_METHOD_ARGS_TYPE args,
            unsigned int index, njsBaton *baton);
    static void SetTextAttribute(Nan::NAN_SETTER_ARGS_TYPE args,
            const char *attributeName, Local<Value> value,
            int (*setter)(dpiConn*, const char*, uint32_t));
    static Nan::Persistent<FunctionTemplate> connectionTemplate_s;

    dpiConn *dpiConnHandle;
    Nan::Persistent<Object> jsOracledb;

};


#endif

