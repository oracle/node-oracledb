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
 *   njsResultSet.cpp
 *
 * DESCRIPTION
 *   ResultSet class implementation.
 *
 *****************************************************************************/
#include "node.h"
#include <string>
#include "njsResultSet.h"
#include "njsConnection.h"

#include <iostream>

using namespace std;
using namespace node;
using namespace v8;

// peristent ResultSet class handle
Nan::Persistent<FunctionTemplate> njsResultSet::resultSetTemplate_s;

//-----------------------------------------------------------------------------
// njsResultSet::~njsResultSet()
//   Destructor.
//-----------------------------------------------------------------------------
njsResultSet::~njsResultSet()
{
    jsConnection.Reset();
    jsOracledb.Reset();
    if (queryVars) {
        delete [] queryVars;
        queryVars = NULL;
    }
    if (dpiStmtHandle) {
        dpiStmt_release(dpiStmtHandle);
        dpiStmtHandle = NULL;
    }
}


//-----------------------------------------------------------------------------
// njsResultSet::Init()
//   Initialization function of ResultSet class. Maps functions and properties
// from JS to C++.
//-----------------------------------------------------------------------------
void njsResultSet::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> temp = Nan::New<FunctionTemplate>(New);

    temp->InstanceTemplate()->SetInternalFieldCount(1);
    temp->SetClassName(Nan::New<v8::String>("ResultSet").ToLocalChecked());

    Nan::SetPrototypeMethod(temp, "close", Close);
    Nan::SetPrototypeMethod(temp, "getRows", GetRows);

    Nan::SetAccessor(temp->InstanceTemplate(),
            Nan::New<v8::String>("metaData").ToLocalChecked(),
            njsResultSet::GetMetaData, njsResultSet::SetMetaData);

    resultSetTemplate_s.Reset(temp);
    Nan::Set(target, Nan::New<v8::String>("ResultSet").ToLocalChecked(),
            temp->GetFunction());
}


//-----------------------------------------------------------------------------
// njsResultSet::CreateFromBaton()
//   Create a new result set from the baton.
//-----------------------------------------------------------------------------
Local<Object> njsResultSet::CreateFromBaton(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    njsResultSet *resultSet;
    Local<Function> func;
    Local<Object> obj;

    func = Nan::GetFunction(
            Nan::New<FunctionTemplate>(resultSetTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    resultSet = Nan::ObjectWrap::Unwrap<njsResultSet>(obj);
    resultSet->dpiStmtHandle = baton->dpiStmtHandle;
    baton->dpiStmtHandle = NULL;
    resultSet->dpiConnHandle = baton->dpiConnHandle;
    resultSet->jsOracledb.Reset(baton->jsOracledb);
    resultSet->outFormat = baton->outFormat;
    resultSet->numQueryVars = baton->numQueryVars;
    resultSet->queryVars = baton->queryVars;
    if (!baton->getRS) {
        resultSet->autoClose = true;
        resultSet->maxRows = baton->maxRows;
    }
    baton->queryVars = NULL;
    resultSet->activeBaton = NULL;
    resultSet->jsConnection.Reset(baton->jsCallingObj);
    resultSet->extendedMetaData = baton->extendedMetaData;
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsResultSet::CreateFromRefCursor()
//   Create a new result set from the baton (
//-----------------------------------------------------------------------------
bool njsResultSet::CreateFromRefCursor(njsBaton *baton, dpiStmt *dpiStmtHandle,
        njsVariable *queryVars, uint32_t numQueryVars, Local<Value> &value)
{
    Nan::EscapableHandleScope scope;
    njsResultSet *resultSet;
    Local<Function> func;
    Local<Object> obj;

    func = Nan::GetFunction(
            Nan::New<FunctionTemplate>(resultSetTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    resultSet = Nan::ObjectWrap::Unwrap<njsResultSet>(obj);
    if (dpiStmt_addRef(dpiStmtHandle) < 0)
        return false;
    resultSet->dpiStmtHandle = dpiStmtHandle;
    resultSet->dpiConnHandle = baton->dpiConnHandle;
    resultSet->jsOracledb.Reset(baton->jsOracledb);
    resultSet->jsConnection.Reset(baton->jsCallingObj);
    resultSet->outFormat = baton->outFormat;
    resultSet->extendedMetaData = baton->extendedMetaData;
    resultSet->activeBaton = NULL;
    resultSet->queryVars = queryVars;
    resultSet->numQueryVars = numQueryVars;
    baton->queryVars = NULL;
    value = scope.Escape(obj);
    return true;
}


//-----------------------------------------------------------------------------
// njsResultSet::IsValid()
//   Returns whether the result set is valid.
//-----------------------------------------------------------------------------
bool njsResultSet::IsValid() const
{
    // no DPI statement implies result set is not valid
    if (!dpiStmtHandle)
        return false;

    // otherwise, check to see if the connection is valid
    Nan::HandleScope scope;
    Local<Object> obj = Nan::New(jsConnection);
    njsConnection *connection = Nan::ObjectWrap::Unwrap<njsConnection>(obj);
    if (!connection)
        return false;
    return connection->IsValid();
}


//-----------------------------------------------------------------------------
// njsResultSet::New()
//   Create new object accesible from JS. This is always called from within
// njsResultSet::CreateFromBaton() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsResultSet::New)
{
    njsResultSet *resultSet = new njsResultSet();
    resultSet->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// ResulSet::GetMetaData()
//   Get accessor of "metaData" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsResultSet::GetMetaData)
{
    njsResultSet *resultSet = (njsResultSet*) ValidateGetter(info);
    if (!resultSet)
        return;
    if (!resultSet->IsValid()) {
        info.GetReturnValue().Set(Nan::Undefined());
        return;
    }
    Local<Value> meta = njsConnection::GetMetaData(resultSet->queryVars,
            resultSet->numQueryVars, resultSet->extendedMetaData);
    info.GetReturnValue().Set(meta);
}


//-----------------------------------------------------------------------------
// njsResultSet::SetMetaData()
//   Set accessor of "metaData" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsResultSet::SetMetaData)
{
    PropertyIsReadOnly("metaData");
}


//-----------------------------------------------------------------------------
// njsResultSet::GetRows()
//   Get a number of rows from the result set.
//
// PARAMETERS
//   - max number of rows to fetch at this time
//   - JS callback which will receive (error, row)
//-----------------------------------------------------------------------------
NAN_METHOD(njsResultSet::GetRows)
{
    njsResultSet *resultSet;
    uint32_t maxRows;
    njsBaton *baton;

    resultSet = (njsResultSet*) ValidateArgs(info, 2, 2);
    if (!resultSet)
        return;
    if (!resultSet->GetUnsignedIntArg(info, 0, &maxRows))
        return;
    if (maxRows == 0) {
        string errMsg = njsMessages::Get(errInvalidParameterValue, 1);
        Nan::ThrowError(errMsg.c_str());
        return;
    }
    baton = resultSet->CreateBaton(info);
    if (!baton)
        return;
    if (resultSet->activeBaton)
        baton->error = njsMessages::Get(errBusyResultSet);
    else if (baton->error.empty()) {
        resultSet->activeBaton = baton;
        baton->outFormat = resultSet->outFormat;
        baton->jsOracledb.Reset(resultSet->jsOracledb);
        baton->fetchArraySize = maxRows;
    }
    baton->QueueWork("GetRows", Async_GetRows, Async_AfterGetRows, 2);
}


//-----------------------------------------------------------------------------
// njsResultSet::GetRowsHelper()
//   Get rows from the result set and return a boolean indicating if the
// fetch was successful or not.
//-----------------------------------------------------------------------------
bool njsResultSet::GetRowsHelper(njsBaton *baton, int *moreRows)
{
    uint32_t i, numRowsToFetch;
    njsVariable *var;

    // determine how many rows to fetch; use fetchArraySize unless it is less
    // than maxRows (no need to waste memory!)
    numRowsToFetch = baton->fetchArraySize;
    if (this->maxRows > 0 && this->maxRows < numRowsToFetch)
        numRowsToFetch = this->maxRows;

    // create ODPI-C variables and define them, if necessary
    for (i = 0; i < this->numQueryVars; i++) {
        var = &this->queryVars[i];
        if (var->dpiVarHandle && var->maxArraySize >= numRowsToFetch)
            continue;
        if (var->dpiVarHandle) {
            if (dpiVar_release(var->dpiVarHandle) < 0) {
                baton->GetDPIError();
                return false;
            }
            var->dpiVarHandle = NULL;
        }
        if (dpiConn_newVar(this->dpiConnHandle, var->varTypeNum,
                var->nativeTypeNum, numRowsToFetch, var->maxSize, 1, 0, NULL,
                &var->dpiVarHandle, &var->buffer.dpiVarData) < 0) {
            baton->GetDPIError();
            return false;
        }
        var->maxArraySize = numRowsToFetch;
        if (dpiStmt_define(this->dpiStmtHandle, i + 1,
                var->dpiVarHandle) < 0) {
            baton->GetDPIError();
            return false;
        }
    }

    // set fetch array size as requested
    if (dpiStmt_setFetchArraySize(this->dpiStmtHandle,
            numRowsToFetch) < 0) {
        baton->GetDPIError();
        return false;
    }

    // perform fetch
    if (dpiStmt_fetchRows(this->dpiStmtHandle, numRowsToFetch,
            &baton->bufferRowIndex, &baton->rowsFetched, moreRows) < 0) {
        baton->GetDPIError();
        return false;
    }

    // result sets that should be auto closed are closed if the result set
    // is exhaused or the maximum number of rows has been fetched
    if (*moreRows && this->maxRows > 0) {
        if (baton->rowsFetched == this->maxRows)
            *moreRows = 0;
        else this->maxRows -= baton->rowsFetched;
    }
    return njsConnection::ProcessVars(baton, this->queryVars,
            this->numQueryVars, baton->rowsFetched);
}


//-----------------------------------------------------------------------------
// njsResultSet::Async_GetRows()
//   Worker function for njsResultSet::GetRows() method.
//-----------------------------------------------------------------------------
void njsResultSet::Async_GetRows(njsBaton *baton)
{
    njsResultSet *resultSet = (njsResultSet*) baton->callingObj;
    int moreRows;
    bool success;

    // result sets that should be auto closed are closed if the result set
    // is exhaused or the maximum number of rows has been fetched or an error
    // has taken place
    success = resultSet->GetRowsHelper(baton, &moreRows);
    if ((!success || !moreRows) && resultSet->autoClose) {
        dpiStmt_release(resultSet->dpiStmtHandle);
        resultSet->dpiStmtHandle = NULL;
    }
}


//-----------------------------------------------------------------------------
// njsResultSet::Async_AfterGetRows()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsResultSet::Async_AfterGetRows(njsBaton *baton, Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> rowAsObj, rows;
    Local<Value> val, keyVal;
    Local<Array> rowAsArray;
    njsResultSet *resultSet;
    njsVariable *var;

    rows = Nan::New<Array>(baton->rowsFetched);
    resultSet = (njsResultSet*) baton->callingObj;
    for (uint32_t row = 0; row < baton->rowsFetched; row++) {
        if (baton->outFormat == NJS_ROWS_ARRAY)
            rowAsArray = Nan::New<Array>(resultSet->numQueryVars);
        else rowAsObj = Nan::New<Object>();
        for (uint32_t col = 0; col < resultSet->numQueryVars; col++) {
            var = &resultSet->queryVars[col];
            if (!njsConnection::GetScalarValueFromVar(baton, var, &var->buffer,
                    row, val))
                return;
            if (baton->outFormat == NJS_ROWS_ARRAY)
                Nan::Set(rowAsArray, col, val);
            else {
                keyVal = Nan::New<String>(var->name).ToLocalChecked();
                Nan::Set(rowAsObj, keyVal, val);
            }
        }
        if (baton->outFormat == NJS_ROWS_ARRAY)
            Nan::Set(rows, row, rowAsArray);
        else Nan::Set(rows, row, rowAsObj);
    }
    if (!resultSet->dpiStmtHandle) {
        delete [] resultSet->queryVars;
        resultSet->queryVars = NULL;
    }
    argv[1] = scope.Escape(rows);
}


//-----------------------------------------------------------------------------
// njsResultSet::Close()
//   Close the result set. The reference to the DPI handle is transferred to
// the baton so that it will be cleared automatically upon success and so that
// the result set is marked as invalid immediately.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsResultSet::Close)
{
    njsResultSet *resultSet;
    njsBaton *baton;

    resultSet = (njsResultSet*) ValidateArgs(info, 1, 1);
    if (!resultSet)
        return;
    baton = resultSet->CreateBaton(info);
    if (!baton)
        return;
    if (resultSet->activeBaton)
        baton->error = njsMessages::Get(errBusyResultSet);
    else {
        baton->dpiStmtHandle = resultSet->dpiStmtHandle;
        resultSet->dpiStmtHandle = NULL;
    }
    baton->QueueWork("Close", Async_Close, Async_AfterClose, 1);
}


//-----------------------------------------------------------------------------
// njsResultSet::Async_Close()
//   Worker function for njsResultSet::Close() method. If the attempt to close
// the statement fails, the reference to the DPI handle is transferred back
// from the baton to the result set.
//-----------------------------------------------------------------------------
void njsResultSet::Async_Close(njsBaton *baton)
{
    if (dpiStmt_close(baton->dpiStmtHandle, NULL, 0) < 0) {
        njsResultSet *resultSet = (njsResultSet*) baton->callingObj;
        resultSet->dpiStmtHandle = baton->dpiStmtHandle;
        baton->dpiStmtHandle = NULL;
        baton->GetDPIError();
    }
}


//-----------------------------------------------------------------------------
// njsResultSet::Async_AfterClose()
//   Finishes close by transferring variables and fetch as types to the baton
// where they will be freed.
//-----------------------------------------------------------------------------
void njsResultSet::Async_AfterClose(njsBaton *baton, Local<Value> argv[])
{
    njsResultSet *resultSet = (njsResultSet*) baton->callingObj;

    resultSet->jsConnection.Reset();
    resultSet->jsOracledb.Reset();
    baton->queryVars = resultSet->queryVars;
    baton->numQueryVars = resultSet->numQueryVars;
    resultSet->queryVars = NULL;
    resultSet->numQueryVars = 0;
}

