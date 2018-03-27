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
    static bool GetScalarValueFromVar(njsBaton *baton, njsVariable *var,
            njsVariableBuffer *buffer, uint32_t pos, Local<Value> &value);
    static bool ProcessQueryVars(njsBaton* baton, dpiStmt *dpiStmtHandle,
            njsVariable *vars, uint32_t numVars);
    static bool ProcessVars(njsBaton *baton, njsVariable *vars,
            uint32_t numVars, uint32_t numElements);
    static void Init(Local<Object> target);
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

    // ExecuteMany Method on Connection class
    static NAN_METHOD(ExecuteMany);
    static void Async_ExecuteMany(njsBaton *baton);
    static void Async_AfterExecuteMany(njsBaton *baton, Local<Value> argv[]);

    // GetStatementInfo Method on Connection class
    static NAN_METHOD(GetStatementInfo);
    static void Async_GetStatementInfo(njsBaton *baton);
    static void Async_AfterGetStatementInfo(njsBaton *baton,
            Local<Value> argv[]);

    // Close Method on Connection class
    static NAN_METHOD(Close);
    static void Async_Close(njsBaton *baton);
    static void Async_AfterClose(njsBaton *baton, Local<Value> argv[]);

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

    // ChangePassword Method on Connection class
    static NAN_METHOD(ChangePassword);
    static void Async_ChangePassword(njsBaton *baton);

    // Ping Method on Connection class
    static NAN_METHOD(Ping);
    static void Async_Ping(njsBaton *baton);

    // Define Getter Accessors to properties
    static NAN_GETTER(GetStmtCacheSize);
    static NAN_GETTER(GetClientId);
    static NAN_GETTER(GetModule);
    static NAN_GETTER(GetAction);
    static NAN_GETTER(GetOracleServerVersion);
    static NAN_GETTER(GetOracleServerVersionString);

    // Define Setter Accessors to properties
    static NAN_SETTER(SetStmtCacheSize);
    static NAN_SETTER(SetClientId);
    static NAN_SETTER(SetModule);
    static NAN_SETTER(SetAction);
    static NAN_SETTER(SetOracleServerVersion);
    static NAN_SETTER(SetOracleServerVersionString);

    // internal methods
    static bool CreateVarBuffer(njsVariable *var, njsBaton *baton);
    static bool GetBindTypeAndSizeFromValue(njsVariable *var,
            Local<Value> value, njsDataType *bindType, uint32_t *maxSize,
            njsBaton *baton, bool scalarOnly = false);
    static bool GetExecuteOutBinds(Local<Value> &outBinds, njsBaton *baton);
    static bool GetExecuteManyOutBinds(Local<Value> &outBinds,
            uint32_t numOutBinds, njsBaton *baton);
    static bool GetOutBinds(Local<Value> &outBinds, uint32_t numOutBinds,
            uint32_t pos, njsBaton *baton);
    static bool GetArrayValueFromVar(njsBaton *baton, njsVariable *var,
            uint32_t pos, Local<Value> &value);
    static bool InitBindVars(Local<Object> bindObj, Local<Array> bindNames,
            njsBaton *baton);
    static bool MapByName(njsBaton *baton, dpiQueryInfo *queryInfo,
            dpiOracleTypeNum &targetType);
    static bool MapByType(njsBaton *baton, dpiQueryInfo *queryInfo,
            dpiOracleTypeNum &targetType);
    static bool PrepareAndBind(njsBaton* baton);
    static bool ProcessBindValue(Local<Value> bindValue, njsVariable *var,
            njsBaton *baton);
    static bool ProcessExecuteBinds(Local<Object> binds, njsBaton *baton);
    static bool ProcessExecuteManyBinds(Local<Array> binds,
            Local<Object> options, njsBaton *baton);
    static bool ProcessExecuteOptions(Local<Object> options, njsBaton *baton);
    static bool ProcessExecuteManyOptions(Local<Object> options,
            njsBaton *baton);
    static bool ProcessScalarBindValue(Local<Value> bindValue,
            njsVariable *var, uint32_t pos, bool inExecuteMany,
            njsBaton *baton);
    static bool ProcessVarBuffer(njsBaton *baton, njsVariable *var,
            njsVariableBuffer *buffer);
    static bool ScanExecuteBinds(Local<Object> binds, Local<Array> bindNames,
            njsBaton *baton);
    static bool ScanExecuteBindUnit(Local<Object> bindUnit, njsVariable *var,
            bool inExecuteMany, njsBaton *baton);
    static bool ScanExecuteManyBinds(Local<Array> binds,
            Local<Array> bindNames, njsBaton *baton);
    static void SetTextAttribute(Nan::NAN_SETTER_ARGS_TYPE args,
            const char *attributeName, Local<Value> value,
            int (*setter)(dpiConn*, const char*, uint32_t));
    static bool TransferExecuteManyBinds(Local<Array> binds,
            Local<Array> bindNames, njsBaton *baton);

    static Nan::Persistent<FunctionTemplate> connectionTemplate_s;

    dpiConn *dpiConnHandle;
    Nan::Persistent<Object> jsOracledb;

};


#endif

