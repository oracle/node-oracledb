/* Copyright (c) 2015, 2018, Oracle and/or its affiliates.
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
 *   njsConnection.cpp
 *
 * DESCRIPTION
 *   Connection class implementation.
 *
 *****************************************************************************/

#include "njsConnection.h"
#include "njsResultSet.h"
#include "njsSubscription.h"
#include "njsIntLob.h"
#include <stdlib.h>
#include <limits>

using namespace std;

// persistent Connection class handle
Nan::Persistent<FunctionTemplate> njsConnection::connectionTemplate_s;

// default value for bind option maxSize
#define NJS_MAX_OUT_BIND_SIZE 200

// max number of bytes for data converted to string with fetchAsString or fetchInfo
#define NJS_MAX_FETCH_AS_STRING_SIZE 200

//-----------------------------------------------------------------------------
// njsConnection::Init()
//   Initialization function of Connection class. Maps functions and properties
// from JS to C++.
//-----------------------------------------------------------------------------
void njsConnection::Init(Local<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);

    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("Connection").ToLocalChecked());

    Nan::SetPrototypeMethod(tpl, "execute", Execute);
    Nan::SetPrototypeMethod(tpl, "executeMany", ExecuteMany);
    Nan::SetPrototypeMethod(tpl, "getStatementInfo", GetStatementInfo);
    Nan::SetPrototypeMethod(tpl, "close", Close);
    Nan::SetPrototypeMethod(tpl, "commit", Commit);
    Nan::SetPrototypeMethod(tpl, "rollback", Rollback);
    Nan::SetPrototypeMethod(tpl, "break", Break);
    Nan::SetPrototypeMethod(tpl, "createLob", CreateLob);
    Nan::SetPrototypeMethod(tpl, "changePassword", ChangePassword);
    Nan::SetPrototypeMethod(tpl, "ping", Ping);
    Nan::SetPrototypeMethod(tpl, "subscribe", Subscribe);
    Nan::SetPrototypeMethod(tpl, "unsubscribe", Unsubscribe);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("stmtCacheSize").ToLocalChecked(),
            njsConnection::GetStmtCacheSize, njsConnection::SetStmtCacheSize);
    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("clientId").ToLocalChecked(),
            njsConnection::GetClientId, njsConnection::SetClientId);
    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("module").ToLocalChecked(),
            njsConnection::GetModule, njsConnection::SetModule);
    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("action").ToLocalChecked(),
            njsConnection::GetAction, njsConnection::SetAction);
    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("oracleServerVersion").ToLocalChecked(),
            njsConnection::GetOracleServerVersion,
            njsConnection::SetOracleServerVersion);
    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("oracleServerVersionString").ToLocalChecked(),
            njsConnection::GetOracleServerVersionString,
            njsConnection::SetOracleServerVersionString);

    connectionTemplate_s.Reset(tpl);
    Nan::Set(target, Nan::New<v8::String>("Connection").ToLocalChecked(),
            tpl->GetFunction());
}


//-----------------------------------------------------------------------------
// njsConnection::CreateFromBaton()
//   Create a new connection from the baton.
//-----------------------------------------------------------------------------
Local<Object> njsConnection::CreateFromBaton(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    njsConnection *connection;
    Local<Function> func;
    Local<Object> obj;

    func = Nan::GetFunction(
            Nan::New<FunctionTemplate>(connectionTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    connection = Nan::ObjectWrap::Unwrap<njsConnection>(obj);
    connection->dpiConnHandle = baton->dpiConnHandle;
    baton->dpiConnHandle = NULL;
    connection->jsOracledb.Reset(baton->jsOracledb);
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessQueryVars()
//   Process query variables on all of the columns in the query. The actual
// ODPI-C variable will not be created at this point, nor will it be defined.
// This is deferred until just prior to the fetch.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessQueryVars(njsBaton *baton, dpiStmt *dpiStmtHandle,
        njsVariable *vars, uint32_t numVars)
{
    dpiQueryInfo queryInfo;

    // populate variables with query metadata
    for (uint32_t i = 0; i < numVars; i++) {

        // get query information for the specified column
        vars[i].pos = i + 1;
        vars[i].isArray = false;
        vars[i].bindDir = NJS_BIND_OUT;
        if (dpiStmt_getQueryInfo(dpiStmtHandle, vars[i].pos, &queryInfo) < 0) {
            baton->GetDPIError();
            return false;
        }
        vars[i].name = std::string(queryInfo.name, queryInfo.nameLength);
        vars[i].maxArraySize = baton->fetchArraySize;
        vars[i].dbSizeInBytes = queryInfo.typeInfo.dbSizeInBytes;
        vars[i].precision = queryInfo.typeInfo.precision +
                queryInfo.typeInfo.fsPrecision;
        vars[i].scale = queryInfo.typeInfo.scale;
        vars[i].isNullable = queryInfo.nullOk;

        // determine the type of data
        vars[i].dbTypeNum = queryInfo.typeInfo.oracleTypeNum;
        vars[i].varTypeNum = queryInfo.typeInfo.oracleTypeNum;
        vars[i].nativeTypeNum = queryInfo.typeInfo.defaultNativeTypeNum;
        if (queryInfo.typeInfo.oracleTypeNum != DPI_ORACLE_TYPE_VARCHAR &&
                queryInfo.typeInfo.oracleTypeNum != DPI_ORACLE_TYPE_NVARCHAR &&
                queryInfo.typeInfo.oracleTypeNum != DPI_ORACLE_TYPE_CHAR &&
                queryInfo.typeInfo.oracleTypeNum != DPI_ORACLE_TYPE_NCHAR &&
                queryInfo.typeInfo.oracleTypeNum != DPI_ORACLE_TYPE_ROWID) {
            if (!njsConnection::MapByName(baton, &queryInfo,
                    vars[i].varTypeNum))
                njsConnection::MapByType(baton, &queryInfo,
                        vars[i].varTypeNum);
        }

        // validate data type and determine size
        if (vars[i].varTypeNum == DPI_ORACLE_TYPE_VARCHAR ||
                vars[i].varTypeNum == DPI_ORACLE_TYPE_RAW) {
            vars[i].maxSize = NJS_MAX_FETCH_AS_STRING_SIZE;
            vars[i].nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
        } else vars[i].maxSize = 0;
        switch (queryInfo.typeInfo.oracleTypeNum) {
            case DPI_ORACLE_TYPE_VARCHAR:
            case DPI_ORACLE_TYPE_NVARCHAR:
            case DPI_ORACLE_TYPE_CHAR:
            case DPI_ORACLE_TYPE_NCHAR:
            case DPI_ORACLE_TYPE_RAW:
                vars[i].maxSize = queryInfo.typeInfo.clientSizeInBytes;
                if (queryInfo.typeInfo.oracleTypeNum == DPI_ORACLE_TYPE_RAW &&
                        vars[i].varTypeNum == DPI_ORACLE_TYPE_VARCHAR)
                    vars[i].maxSize *= 2;
                break;
            case DPI_ORACLE_TYPE_DATE:
            case DPI_ORACLE_TYPE_TIMESTAMP:
            case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
            case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
                if (vars[i].varTypeNum != DPI_ORACLE_TYPE_VARCHAR) {
                    vars[i].varTypeNum = DPI_ORACLE_TYPE_TIMESTAMP_LTZ;
                    vars[i].nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
                }
                break;
            case DPI_ORACLE_TYPE_CLOB:
            case DPI_ORACLE_TYPE_NCLOB:
                if (vars[i].varTypeNum == DPI_ORACLE_TYPE_VARCHAR)
                    vars[i].maxSize = (uint32_t) -1;
                break;
            case DPI_ORACLE_TYPE_BLOB:
                if (vars[i].varTypeNum == DPI_ORACLE_TYPE_RAW)
                    vars[i].maxSize = (uint32_t) -1;
                break;
            case DPI_ORACLE_TYPE_LONG_VARCHAR:
            case DPI_ORACLE_TYPE_LONG_RAW:
                vars[i].maxSize = (uint32_t) -1;
                break;
            case DPI_ORACLE_TYPE_NUMBER:
            case DPI_ORACLE_TYPE_NATIVE_INT:
            case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            case DPI_ORACLE_TYPE_ROWID:
                break;
            default:
                baton->error = njsMessages::Get(errUnsupportedDataType,
                        queryInfo.typeInfo.oracleTypeNum, i + 1);
                baton->ClearAsyncData();
                return false;
        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessVars()
//   Process variables used during binding or fetching. REF cursors must have
// their query variables defined and LOBs must be initially processed in order
// to have as much work as possible done in the worker thread and to avoid any
// round trips.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessVars(njsBaton *baton, njsVariable *vars,
        uint32_t numVars, uint32_t numRows)
{
    for (uint32_t col = 0; col < numVars; col++) {
        njsVariable *var = &vars[col];
        var->buffer.numElements = numRows;
        if (var->bindDir == NJS_BIND_IN)
            continue;
        if (var->dmlReturningBuffers) {
            delete [] var->dmlReturningBuffers;
            var->dmlReturningBuffers = NULL;
        }

        // for arrays, determine the number of elements in the array
        if (var->isArray) {
            if (dpiVar_getNumElementsInArray(var->dpiVarHandle,
                    &var->buffer.numElements) < 0) {
                baton->GetDPIError();
                return false;
            }

        // for DML returning statements, each row has its own set of rows, so
        // acquire those from ODPI-C and store them in variable buffers for
        // later processing
        } else if (baton->isReturning && var->bindDir == NJS_BIND_OUT) {
            var->dmlReturningBuffers = new njsVariableBuffer[numRows];
            for (uint32_t row = 0; row < numRows; row++) {
                njsVariableBuffer *buffer = &var->dmlReturningBuffers[row];
                if (dpiVar_getReturnedData(var->dpiVarHandle, row,
                        &buffer->numElements, &buffer->dpiVarData) < 0) {
                    baton->GetDPIError();
                    return false;
                }
                if (!ProcessVarBuffer(baton, var, buffer))
                    return false;
            }
        }

        // process the main buffer if DML returning is not in effect
        if (!var->dmlReturningBuffers &&
                !ProcessVarBuffer(baton, var, &var->buffer))
            return false;

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessVarBuffer()
//   Process a variable buffer. REF cursors must have their query variables
// defined and LOBs must be initially processed in order to have as much work
// as possible done in the worker thread and avoid any round trips.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessVarBuffer(njsBaton *baton, njsVariable *var,
        njsVariableBuffer *buffer)
{
    dpiStmt *stmt;

    switch (var->varTypeNum) {
        case DPI_ORACLE_TYPE_CLOB:
        case DPI_ORACLE_TYPE_NCLOB:
        case DPI_ORACLE_TYPE_BLOB:
            buffer->lobs = new njsProtoILob[buffer->numElements];
            for (uint32_t i = 0; i < buffer->numElements; i++) {
                njsProtoILob *lob = &buffer->lobs[i];
                lob->dataType = (var->varTypeNum == DPI_ORACLE_TYPE_BLOB) ?
                        NJS_DATATYPE_BLOB : NJS_DATATYPE_CLOB;
                lob->isAutoClose = true;
                uint32_t elementIndex = baton->bufferRowIndex + i;
                dpiData *data = &buffer->dpiVarData[elementIndex];
                if (data->isNull)
                    continue;
                if (!lob->PopulateFromDPI(baton, data->value.asLOB, true))
                    return false;
            }
            break;
        case DPI_ORACLE_TYPE_STMT:
            stmt = buffer->dpiVarData->value.asStmt;
            if (dpiStmt_getNumQueryColumns(stmt, &var->numQueryVars) < 0) {
                baton->GetDPIError();
                return false;
            }
            var->queryVars = new njsVariable[var->numQueryVars];
            if (!ProcessQueryVars(baton, stmt, var->queryVars,
                    var->numQueryVars))
                return false;
            break;
        default:
            break;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::MapByName()
//   Apply "By-Name" rules, if applicable. Returns true if rules were applied
// (and targetType is set); false otherwise (and targetType is left untouched).
//-----------------------------------------------------------------------------
bool njsConnection::MapByName(njsBaton *baton, dpiQueryInfo *queryInfo,
        dpiOracleTypeNum &targetType)
{
    if (baton->fetchInfo) {
        std::string name = std::string(queryInfo->name, queryInfo->nameLength);
        for (uint32_t i = 0; i < baton->numFetchInfo; i++) {
            if (baton->fetchInfo[i].name.compare(name) == 0) {
                if (baton->fetchInfo[i].type == NJS_DATATYPE_STR)
                    targetType = DPI_ORACLE_TYPE_VARCHAR;
                else if (baton->fetchInfo[i].type == NJS_DATATYPE_BUFFER)
                    targetType = DPI_ORACLE_TYPE_RAW;
                else if (baton->fetchInfo[i].type == NJS_DATATYPE_DEFAULT)
                    targetType = queryInfo->typeInfo.oracleTypeNum;
                return true;
            }
        }
    }
    return false;
}


//-----------------------------------------------------------------------------
// njsConnection::MapByType()
//   Apply "By-Type" rules, if applicable. Returns true if rules were applied
// (and targetType is set); false otherwise (and targetType is left untouched).
//-----------------------------------------------------------------------------
bool njsConnection::MapByType(njsBaton *baton, dpiQueryInfo *queryInfo,
        dpiOracleTypeNum &targetType)
{
    uint32_t i;

    // handle fetchAsString
    for (i = 0; i < baton->numFetchAsStringTypes; i++) {
        switch (queryInfo->typeInfo.oracleTypeNum) {
            case DPI_ORACLE_TYPE_NUMBER:
            case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            case DPI_ORACLE_TYPE_NATIVE_INT:
                if (baton->fetchAsStringTypes[i] == NJS_DATATYPE_NUM) {
                    targetType = DPI_ORACLE_TYPE_VARCHAR;
                    return true;
                }
                break;
            case DPI_ORACLE_TYPE_DATE:
            case DPI_ORACLE_TYPE_TIMESTAMP:
            case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
            case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
                if (baton->fetchAsStringTypes[i] == NJS_DATATYPE_DATE) {
                    targetType = DPI_ORACLE_TYPE_VARCHAR;
                    return true;
                }
                break;
            case DPI_ORACLE_TYPE_CLOB:
            case DPI_ORACLE_TYPE_NCLOB:
                if (baton->fetchAsStringTypes[i] == NJS_DATATYPE_CLOB) {
                    targetType = DPI_ORACLE_TYPE_VARCHAR;
                    return true;
                }
                break;
            case DPI_ORACLE_TYPE_RAW:
                if (baton->fetchAsStringTypes[i] == NJS_DATATYPE_BUFFER) {
                    targetType = DPI_ORACLE_TYPE_VARCHAR;
                    return true;
                }
                break;
            default:
                break;
        }
    }

    // handle fetchAsBuffer
    for (i = 0; i < baton->numFetchAsBufferTypes; i++) {
        if (queryInfo->typeInfo.oracleTypeNum == DPI_ORACLE_TYPE_BLOB &&
                baton->fetchAsBufferTypes[i] == NJS_DATATYPE_BLOB) {
            targetType = DPI_ORACLE_TYPE_RAW;
            return true;
        }
    }

    return false;
}


//-----------------------------------------------------------------------------
// njsConnection::PrepareAndBind()
//   Prepare statement and bind data to the statement.
//-----------------------------------------------------------------------------
bool njsConnection::PrepareAndBind(njsBaton *baton)
{
    // prepare DPI statement for use
    if (dpiConn_prepareStmt(baton->dpiConnHandle, 0, baton->sql.c_str(),
            (uint32_t) baton->sql.length(), NULL, 0,
            &baton->dpiStmtHandle) < 0) {
        baton->GetDPIError();
        return false;
    }

    // determine statement information
    dpiStmtInfo stmtInfo;
    if (dpiStmt_getInfo(baton->dpiStmtHandle, &stmtInfo) < 0) {
        baton->GetDPIError();
        return false;
    }
    baton->isPLSQL = (stmtInfo.isPLSQL) ? true : false;
    baton->isReturning = (stmtInfo.isReturning) ? true : false;

    // result sets are incompatible with non-queries
    if (!stmtInfo.isQuery && baton->getRS) {
        baton->error = njsMessages::Get(errInvalidNonQueryExecution);
        baton->ClearAsyncData();
        return false;
    }

    // perform any binds necessary
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        int status;
        njsVariable *var = &baton->bindVars[i];
        if (var->name.empty())
            status = dpiStmt_bindByPos(baton->dpiStmtHandle, var->pos,
                    var->dpiVarHandle);
        else status = dpiStmt_bindByName(baton->dpiStmtHandle,
                var->name.c_str(), (uint32_t) var->name.length(),
                var->dpiVarHandle);
        if (status < 0) {
            baton->GetDPIError();
            return false;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetMetaData()
//   Populate array of metadata for JS from list of variables.
//-----------------------------------------------------------------------------
Local<Value> njsConnection::GetMetaData(njsVariable *vars, uint32_t numVars,
        bool extendedMetaData)
{
    Nan::EscapableHandleScope scope;
    Local<Array> metaArray = Nan::New<Array>(numVars);

    for (uint32_t i = 0; i < numVars; i++) {
        njsVariable *var = &vars[i];
        Local<Object> column = Nan::New<Object>();
        Nan::Set(column, Nan::New<v8::String>("name").ToLocalChecked(),
                Nan::New<v8::String>(var->name).ToLocalChecked());
        if (extendedMetaData) {
            njsDBType dbType = var->DBType();
            Nan::Set(column,
                    Nan::New<v8::String>("fetchType").ToLocalChecked(),
                    Nan::New<v8::Number>(var->DataType()));
            Nan::Set(column,
                    Nan::New<v8::String>("dbType").ToLocalChecked(),
                    Nan::New<v8::Number>(dbType));
            Nan::Set(column,
                    Nan::New<v8::String>("nullable").ToLocalChecked(),
                    Nan::New<v8::Boolean>(var->isNullable));
            switch (dbType) {
                case NJS_DB_TYPE_VARCHAR:
                case NJS_DB_TYPE_NVARCHAR:
                case NJS_DB_TYPE_CHAR:
                case NJS_DB_TYPE_NCHAR:
                case NJS_DB_TYPE_RAW:
                    Nan::Set(column,
                            Nan::New<v8::String>("byteSize").ToLocalChecked(),
                            Nan::New<v8::Number>(var->dbSizeInBytes));
                    break;
                case NJS_DB_TYPE_NUMBER:
                    Nan::Set(column,
                            Nan::New<v8::String>("precision").ToLocalChecked(),
                            Nan::New<v8::Number>(var->precision));
                    Nan::Set(column,
                            Nan::New<v8::String>("scale").ToLocalChecked(),
                            Nan::New<v8::Number>(var->scale) );
                    break;
                case NJS_DB_TYPE_TIMESTAMP:
                case NJS_DB_TYPE_TIMESTAMP_TZ:
                case NJS_DB_TYPE_TIMESTAMP_LTZ:
                    Nan::Set(column,
                            Nan::New<v8::String>("precision").ToLocalChecked(),
                            Nan::New<v8::Number>(var->precision));
                    break;
                default:
                    break;
            }
        }
        Nan::Set(metaArray, i, column);
    }
    return scope.Escape(metaArray);
}


//-----------------------------------------------------------------------------
// njsConnection::CreateVarBuffer()
//   Create ODPI-C variables used to hold the bind data.
//-----------------------------------------------------------------------------
bool njsConnection::CreateVarBuffer(njsVariable *var, njsBaton *baton)
{
    // if the variable is not an array use the bind array size
    if (!var->isArray)
        var->maxArraySize = baton->bindArraySize;

    // if the variable has no data type assume string of size 1
    if (var->bindDataType == NJS_DATATYPE_DEFAULT) {
        var->bindDataType = NJS_DATATYPE_STR;
        var->maxSize = 1;
    }

    // REF cursors are only supported as out binds currently
    if (var->bindDataType == NJS_DATATYPE_CURSOR &&
            var->bindDir != NJS_BIND_OUT) {
        baton->error = njsMessages::Get(errInvalidPropertyValueInParam,
                "type", 1);
        return false;
    }

    // max size must be specified for in/out and out binds
    if (!var->maxSize && var->bindDir != NJS_BIND_IN) {
        baton->error = njsMessages::Get(errInvalidPropertyValueInParam,
                "maxSize", 1);
        return false;
    }

    // determine ODPI-C Oracle type and native type to use
    switch (var->bindDataType) {
        case NJS_DATATYPE_STR:
            var->varTypeNum = DPI_ORACLE_TYPE_VARCHAR;
            var->nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
            break;
        case NJS_DATATYPE_NUM:
            var->varTypeNum = DPI_ORACLE_TYPE_NUMBER;
            var->nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
            break;
        case NJS_DATATYPE_INT:
            var->varTypeNum = DPI_ORACLE_TYPE_NUMBER;
            var->nativeTypeNum = DPI_NATIVE_TYPE_INT64;
            break;
        case NJS_DATATYPE_DATE:
            var->varTypeNum = DPI_ORACLE_TYPE_TIMESTAMP_LTZ;
            var->nativeTypeNum = DPI_NATIVE_TYPE_DOUBLE;
            break;
        case NJS_DATATYPE_CURSOR:
            var->varTypeNum = DPI_ORACLE_TYPE_STMT;
            var->nativeTypeNum = DPI_NATIVE_TYPE_STMT;
            break;
        case NJS_DATATYPE_BUFFER:
            var->varTypeNum = DPI_ORACLE_TYPE_RAW;
            var->nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
            break;
        case NJS_DATATYPE_CLOB:
            var->varTypeNum = DPI_ORACLE_TYPE_CLOB;
            var->nativeTypeNum = DPI_NATIVE_TYPE_LOB;
            break;
        case NJS_DATATYPE_BLOB:
            var->varTypeNum = DPI_ORACLE_TYPE_BLOB;
            var->nativeTypeNum = DPI_NATIVE_TYPE_LOB;
            break;
        default:
            baton->error= njsMessages::Get(errInvalidBindDataType, 2);
            return false;
    }

    // create ODPI-C variable
    if (dpiConn_newVar(baton->dpiConnHandle, var->varTypeNum,
            var->nativeTypeNum, var->maxArraySize, var->maxSize, 1,
            var->isArray, NULL, &var->dpiVarHandle,
            &var->buffer.dpiVarData) < 0) {
        baton->GetDPIError();
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessExecuteBinds()
//   Process binds passed through to Execute() call.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessExecuteBinds(Local<Object> binds, njsBaton *baton)
{
    Nan::HandleScope scope;
    Local<Array> bindNames;

    // determine bind names (if binding by name)
    baton->bindArraySize = 1;
    if (!binds->IsUndefined() && !binds->IsArray())
        bindNames = binds->GetOwnPropertyNames();

    // initialize variables; if there are no variables, nothing further to do!
    if (!InitBindVars(binds, bindNames, baton))
        return false;
    if (baton->numBindVars == 0)
        return true;

    // scan the execute binds and populate the bind variables
    return ScanExecuteBinds(binds, bindNames, baton);
}


//-----------------------------------------------------------------------------
// njsConnection::ScanExecuteBinds()
//   Scan the binds passed through to Execute() and determine the bind
// type and maximum size (for strings/buffers).
//-----------------------------------------------------------------------------
bool njsConnection::ScanExecuteBinds(Local<Object> binds,
        Local<Array> bindNames, njsBaton *baton)
{
    Nan::HandleScope scope;
    Local<Value> bindName, bindUnit, bindValue;
    Local<Array> byPositionValues;
    njsVariable *var;
    bool byPosition;

    // determine if binding is by position or by name
    byPosition = (baton->bindVars[0].pos > 0);
    if (byPosition)
        byPositionValues = binds.As<Array>();

    // scan each column
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        var = &baton->bindVars[i];

        // determine bind information and value
        if (byPosition)
            bindUnit = Nan::Get(byPositionValues, i).ToLocalChecked();
        else {
            bindName = Nan::Get(bindNames, i).ToLocalChecked();
            if (!Nan::Get(binds, bindName).ToLocal(&bindUnit))
                return false;
        }
        if (bindUnit->IsObject() && !bindUnit->IsDate() &&
                !Buffer::HasInstance(bindUnit) &&
                !njsILob::HasInstance(bindUnit)) {
            if (!ScanExecuteBindUnit(bindUnit.As<Object>(), var, false, baton))
                return false;
            Local<String> key = Nan::New<String>("val").ToLocalChecked();
            bindValue = Nan::Get(bindUnit.As<Object>(), key).ToLocalChecked();
        } else bindValue = bindUnit;

        // get bind information from value if it has not already been specified
        if (var->bindDataType == NJS_DATATYPE_DEFAULT || !var->maxSize ||
                var->maxSize == NJS_MAX_OUT_BIND_SIZE) {
            njsDataType defaultBindType = NJS_DATATYPE_DEFAULT;
            uint32_t defaultMaxSize = 0;
            if (!GetBindTypeAndSizeFromValue(var, bindValue, &defaultBindType,
                    &defaultMaxSize, baton))
                return false;
            if (var->bindDataType == NJS_DATATYPE_DEFAULT)
                var->bindDataType = defaultBindType;
            if (defaultMaxSize > var->maxSize)
                var->maxSize = defaultMaxSize;
        }

        // for IN binds, maxArraySize is ignored and obtained from the actual
        // array size; for INOUT binds, maxArraySize does need to be specified
        // by the application; for OUT binds, the value from the application
        // must be accepted as is as there is no way to validate it
        if (bindValue->IsArray()) {
            var->isArray = true;
            Local<Array> arrayVal = Local<Array>::Cast(bindValue);
            if (var->bindDir == NJS_BIND_IN) {
                var->maxArraySize = arrayVal->Length();
                if (var->maxArraySize == 0)
                    var->maxArraySize = 1;
            } else if (var->maxArraySize == 0) {
                baton->error = njsMessages::Get(errReqdMaxArraySize);
                return false;
            }
            if (var->bindDir == NJS_BIND_INOUT &&
                    arrayVal->Length() > var->maxArraySize) {
                baton->error = njsMessages::Get(errInvalidArraySize);
                return false;
            }
        }

        // create buffer for variable
        if (!CreateVarBuffer(var, baton))
            return false;

        // process bind value (for all except OUT)
        if (var->bindDir != NJS_BIND_OUT) {
            if (!ProcessBindValue(bindValue, var, baton))
                return false;
        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ScanExecuteBindUnit()
//   Scan the execute bind unit for bind information.
//-----------------------------------------------------------------------------
bool njsConnection::ScanExecuteBindUnit(Local<Object> bindUnit,
        njsVariable *var, bool inExecuteMany, njsBaton *baton)
{
    Nan::HandleScope scope;

    // scan all keys and verify that one of "dir", "type", "maxSize" or "val"
    // is found; if not, the bind information is considered invalid
    Local<Array> keys = bindUnit->GetOwnPropertyNames();
    bool valid = false;
    for (uint32_t i = 0; i < keys->Length(); i++) {
        Local<String> temp =
                Nan::Get(keys, i).ToLocalChecked().As<String>();
        Nan::Utf8String utf8str(temp);
        std::string key =
                std::string(*utf8str, static_cast<size_t>(utf8str.length()));
        if (key.compare("dir") == 0 || key.compare("type") == 0 ||
                key.compare("maxSize") == 0 || key.compare("val") == 0) {
            valid = true;
            break;
        }
    }
    if (!valid) {
        baton->error = njsMessages::Get(errNamedJSON);
        return false;
    }

    // get and validate bind direction
    uint32_t temp = (uint32_t) var->bindDir;
    if (!baton->GetUnsignedIntFromJSON(bindUnit, "dir", 1, &temp))
        return false;
    var->bindDir = (njsBindDir) temp;
    switch (var->bindDir) {
        case NJS_BIND_OUT:
        case NJS_BIND_IN:
        case NJS_BIND_INOUT:
            break;
        default:
            baton->error = njsMessages::Get(errInvalidBindDirection);
            return false;
    }

    // get data type
    temp = (uint32_t) var->bindDataType;
    if (!baton->GetUnsignedIntFromJSON(bindUnit, "type", 1, &temp))
        return false;
    if (!temp && inExecuteMany) {
        if (var->pos > 0)
            baton->error = njsMessages::Get(errMissingTypeByPos, var->pos);
        else baton->error = njsMessages::Get(errMissingTypeByName,
                var->name.c_str());
    }
    var->bindDataType = (njsDataType) temp;

    // get maximum size for strings/buffers; this value is only used for
    // IN/OUT and OUT binds in execute() and at all times for executeMany()
    if (var->bindDir != NJS_BIND_IN || inExecuteMany) {
        if (var->bindDir != NJS_BIND_IN)
            var->maxSize = NJS_MAX_OUT_BIND_SIZE;
        if (!baton->GetUnsignedIntFromJSON(bindUnit, "maxSize", 1,
                &var->maxSize))
            return false;
        if (inExecuteMany && var->maxSize == 0) {
            if (var->bindDataType == NJS_DATATYPE_STR ||
                    var->bindDataType == NJS_DATATYPE_BUFFER) {
                if (var->pos > 0)
                    baton->error = njsMessages::Get(errMissingMaxSizeByPos,
                            var->pos);
                else baton->error = njsMessages::Get(errMissingMaxSizeByName,
                        var->name.c_str());
                return false;
            }
        }
    }

    // get max array size (for array binds)
    if (!inExecuteMany) {
        if (!baton->GetUnsignedIntFromJSON(bindUnit, "maxArraySize", 1,
                &var->maxArraySize))
            return false;
        if (var->maxArraySize > 0)
            var->isArray = true;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessExecuteManyBinds()
//   Process binds passed through to ExecuteMany() call.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessExecuteManyBinds(Local<Array> binds,
        Local<Object> options, njsBaton *baton)
{
    Nan::HandleScope scope;
    Local<Value> bindDefs, bindName, bindUnit;
    Local<Array> bindNames;
    bool scanRequired;

    // all rows are bound at one time
    baton->bindArraySize = binds->Length();

    // determine if bind definitions have been specified
    Local<String> key = Nan::New<v8::String>("bindDefs").ToLocalChecked();
    if (!Nan::Get(options, key).ToLocal(&bindDefs))
        return false;
    scanRequired = bindDefs->IsUndefined();

    // if no bind definitions are specified, the first row is used to determine
    // the number of bind variables and types
    if (scanRequired)
        bindDefs = Nan::Get(binds, 0).ToLocalChecked();
    if (!bindDefs->IsUndefined() && !bindDefs->IsArray())
        bindNames = bindDefs.As<Object>()->GetOwnPropertyNames();

    // initialize variables; if there are no variables, nothing further to do!
    if (!InitBindVars(bindDefs.As<Object>(), bindNames, baton))
        return false;
    if (baton->numBindVars == 0)
        return true;

    // if no bind definitions are specified, scan the binds to determine type
    // and size
    if (scanRequired) {
        if (!ScanExecuteManyBinds(binds, bindNames, baton))
            return false;

    // otherwise, use the bind definitions to determine type and size
    } else {
        bool byPosition = (baton->bindVars[0].pos > 0);
        Local<Array> byPositionValues;
        if (byPosition)
            byPositionValues = bindDefs.As<Array>();
        for (uint32_t i = 0; i < baton->numBindVars; i++) {
            njsVariable *var = &baton->bindVars[i];
            if (byPosition)
                bindUnit = Nan::Get(byPositionValues, i).ToLocalChecked();
            else {
                bindName = Nan::Get(bindNames, i).ToLocalChecked();
                if (!Nan::Get(bindDefs.As<Object>(),
                        bindName).ToLocal(&bindUnit))
                    return false;
            }
            if (!ScanExecuteBindUnit(bindUnit.As<Object>(), var, true, baton))
                return false;
        }
    }

    // create the ODPI-C variables used to hold the data
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        if (!CreateVarBuffer(&baton->bindVars[i], baton))
            return false;
    }

    // populate the ODPI-C variables with the data from JavaScript binds
    if (!TransferExecuteManyBinds(binds, bindNames, baton))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ScanExecuteManyBinds()
//   Scan the binds passed through to ExecuteMany() and determine the bind
// type and maximum size (for strings/buffers).
//-----------------------------------------------------------------------------
bool njsConnection::ScanExecuteManyBinds(Local<Array> binds,
        Local<Array> bindNames, njsBaton *baton)
{
    njsDataType defaultBindType;
    uint32_t defaultMaxSize;
    bool byPosition;
    Nan::HandleScope scope;
    Local<Array> byPositionValues;
    Local<Value> bindName, val;
    Local<Object> row;
    njsVariable *var;

    byPosition = (baton->bindVars[0].pos > 0);
    for (uint32_t i = 0; i < baton->bindArraySize; i++) {
        row = Nan::Get(binds, i).ToLocalChecked().As<Object>();

        // verify that all rows are by position (array) or by name (object)
        if ((byPosition && !row->IsArray()) ||
                (!byPosition && row->IsArray())) {
            baton->error = njsMessages::Get(errMixedBind);
            return false;
        }

        // scan each of the columns in the row and determine the bind type and
        // maximum size of the input data
        if (byPosition)
            byPositionValues = row.As<Array>();
        for (uint32_t j = 0; j < baton->numBindVars; j++) {
            var = &baton->bindVars[j];
            if (byPosition)
                val = Nan::Get(byPositionValues, j).ToLocalChecked();
            else {
                bindName = Nan::Get(bindNames, j).ToLocalChecked();
                if (!Nan::Get(row, bindName).ToLocal(&val))
                    return false;
            }
            if (val->IsUndefined() || val->IsNull())
                continue;
            if (!GetBindTypeAndSizeFromValue(var, val, &defaultBindType,
                    &defaultMaxSize, baton, true))
                return false;
            if (var->bindDataType == 0)
                var->bindDataType = defaultBindType;
            if (defaultMaxSize > var->maxSize)
                var->maxSize = defaultMaxSize;
        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::TransferExecuteManyBinds()
//   Transfer the binds from JavaScript to the ODPI-C variable buffers already
// created.
//-----------------------------------------------------------------------------
bool njsConnection::TransferExecuteManyBinds(Local<Array> binds,
        Local<Array> bindNames, njsBaton *baton)
{
    bool byPosition;
    Nan::HandleScope scope;
    Local<Array> byPositionValues;
    Local<Value> bindName, val;
    Local<Object> row;
    njsVariable *var;

    // determine if we are binding by position or by name
    byPosition = (baton->bindVars[0].pos > 0);

    // process each row
    for (uint32_t i = 0; i < baton->bindArraySize; i++) {
        row = Nan::Get(binds, i).ToLocalChecked().As<Object>();

        // verify that all rows are by position (array) or by name (object)
        if ((byPosition && !row->IsArray()) ||
                (!byPosition && row->IsArray())) {
            baton->error = njsMessages::Get(errMixedBind);
            return false;
        }

        // process each column
        if (byPosition)
            byPositionValues = row.As<Array>();
        for (uint32_t j = 0; j < baton->numBindVars; j++) {
            var = &baton->bindVars[j];
            if (byPosition)
                val = Nan::Get(byPositionValues, j).ToLocalChecked();
            else {
                bindName = Nan::Get(bindNames, j).ToLocalChecked();
                if (!Nan::Get(row, bindName).ToLocal(&val))
                    return false;
            }
            if (!ProcessScalarBindValue(val, var, i, true, baton))
                return false;
        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::InitBindVars()
//   Initialize bind variables using the given bind objectd/array as a
// template. For binds performed by name, return the bind names as an array.
//-----------------------------------------------------------------------------
bool njsConnection::InitBindVars(Local<Object> bindObj,
        Local<Array> bindNames, njsBaton *baton)
{
    bool byPosition = bindObj->IsArray();

    // create bind variables (one for each element of the bind array or each
    // property of the bind object)
    if (bindObj->IsUndefined())
        baton->numBindVars = 0;
    else if (byPosition)
        baton->numBindVars = bindObj.As<Array>()->Length();
    else baton->numBindVars = bindNames->Length();
    baton->bindVars = new njsVariable[baton->numBindVars];

    // initialize bind variables (set position or name)
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        njsVariable *var = &baton->bindVars[i];
        if (byPosition)
            var->pos = i + 1;
        else {
            Local<Value> temp = Nan::Get(bindNames, i).ToLocalChecked();
            Nan::Utf8String v8str(temp->ToString());
            std::string str = std::string(*v8str,
                    static_cast<size_t>(v8str.length()));
            var->name = ":" + str;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessBindValue()
//   Process bind value from JS and copy it to the variable that was created.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessBindValue(Local<Value> value, njsVariable *var,
        njsBaton *baton)
{
    // scalar values can be handled directly
    if (!var->isArray)
        return ProcessScalarBindValue(value, var, 0, false, baton);

    // only strings and numbers are currently allowed
    if (var->varTypeNum != DPI_ORACLE_TYPE_VARCHAR &&
            var->varTypeNum != DPI_ORACLE_TYPE_NUMBER &&
            var->varTypeNum != DPI_ORACLE_TYPE_NATIVE_INT) {
        baton->error = njsMessages::Get(errInvalidTypeForArrayBind);
        return false;
    }

    /* Expecting an array value here */
    if ( !value->IsArray ()) {
        baton->error = njsMessages::Get ( errNonArrayProvided ) ;
        return false;
    }

    // set the number of actual elements in the variable
    Nan::HandleScope scope;
    Local<Array> arrayVal = Local<Array>::Cast(value);
    if (dpiVar_setNumElementsInArray(var->dpiVarHandle,
            arrayVal->Length()) < 0) {
        baton->GetDPIError();
        return false;
    }

    // process each element in the array
    for (uint32_t i = 0; i < arrayVal->Length(); i++) {
        Local<Value> elementValue = Nan::Get (arrayVal, i).ToLocalChecked ();
        if (!ProcessScalarBindValue(elementValue, var, i, false, baton))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessScalarBindValue()
//   Process scalar bind value from JS and copy it to the variable at the given
// position.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessScalarBindValue(Local<Value> value,
        njsVariable *var, uint32_t pos, bool inExecuteMany, njsBaton *baton)
{
    Nan::HandleScope scope;
    bool bindOk = false;
    dpiData *data;

    // initialization
    data = &var->buffer.dpiVarData[pos];
    data->isNull = 0;

    // nulls and undefined in JS are mapped to NULL in Oracle; no checks needed
    if (value->IsUndefined() || value->IsNull()) {
        data->isNull = 1;
        bindOk = true;

    // value is a string, variable type should be a string
    } else if (value->IsString()) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_VARCHAR ||
                var->varTypeNum == DPI_ORACLE_TYPE_CLOB);
        if (bindOk) {
            Nan::Utf8String utf8str(value);
            if (utf8str.length() == 0)
                data->isNull = 1;
            else if (inExecuteMany &&
                    (uint32_t) utf8str.length() > var->maxSize) {
                baton->error = njsMessages::Get(errMaxSizeTooSmall,
                        var->maxSize, utf8str.length(), pos);
                return false;
            } else if (dpiVar_setFromBytes(var->dpiVarHandle, pos, *utf8str,
                             static_cast<uint32_t>( utf8str.length())) < 0) {
                baton->GetDPIError();
                return false;
            }
        }

    // value is an integer
    } else if (value->IsInt32() || value->IsUint32()) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_NUMBER);
        if (bindOk) {
            if (var->nativeTypeNum == DPI_NATIVE_TYPE_INT64) {
                if (value->IsInt32())
                    data->value.asInt64 = Nan::To<int32_t>(value).FromJust();
                else data->value.asInt64 = Nan::To<uint32_t>(value).FromJust();
            } else {
                if (value->IsInt32())
                    data->value.asDouble = Nan::To<int32_t>(value).FromJust();
                else data->value.asDouble =
                        Nan::To<uint32_t>(value).FromJust();
            }
        }

    // value is a floating point number
    } else if (value->IsNumber()) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_NUMBER);
        if (bindOk)
            data->value.asDouble = value->NumberValue();

    // value is a date
    } else if (value->IsDate()) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_TIMESTAMP_LTZ);
        if (bindOk) {
            Local<Date> date = value.As<Date>();
            data->value.asDouble = date->NumberValue();
        }

    // value is a buffer
    } else if (Buffer::HasInstance(value)) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_RAW ||
                var->varTypeNum == DPI_ORACLE_TYPE_BLOB);
        if (bindOk) {
            Local<Object> obj = value->ToObject();
            if (inExecuteMany && Buffer::Length(obj) > var->maxSize) {
                baton->error = njsMessages::Get(errMaxSizeTooSmall,
                        var->maxSize, Buffer::Length(obj), pos);
                return false;
            } else if (dpiVar_setFromBytes(var->dpiVarHandle, pos,
                    Buffer::Data(obj), (uint32_t) Buffer::Length(obj)) < 0) {
                baton->GetDPIError();
                return false;
            }
        }

    // value is a LOB
    } else if (njsILob::HasInstance(value)) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_CLOB ||
                var->varTypeNum == DPI_ORACLE_TYPE_BLOB);
        if (bindOk) {
            njsILob *lob = njsILob::GetInstance(value);
            dpiLob *lobHandle = lob->GetDPILobHandle();
            dpiLob *tempLobHandle = NULL;

            // for INOUT binds a copy of the LOB is made and the copy bound
            // the original IN value is also closed
            if (var->bindDir == NJS_BIND_INOUT) {
                if (dpiLob_copy(lobHandle, &tempLobHandle) < 0) {
                    baton->GetDPIError();
                    return false;
                }
                if (!lob->ClearDPILobHandle(baton))
                    return false;
                lobHandle = tempLobHandle;
            }

            // perform the bind
            if (dpiVar_setFromLob(var->dpiVarHandle, pos, lobHandle) < 0) {
                baton->GetDPIError();
                if (tempLobHandle)
                    dpiLob_release(tempLobHandle);
                return false;
            }
            if (tempLobHandle)
                dpiLob_release(tempLobHandle);
        }
    }

    // check bind was successful
    if (!bindOk) {
        if (var->isArray && !var->name.empty())
            baton->error = njsMessages::Get(errIncompatibleTypeArrayBind,
                    pos, var->name.c_str());
        else if (var->isArray)
            baton->error = njsMessages::Get(errIncompatibleTypeArrayIndexBind,
                    pos, var->pos);
        else baton->error = njsMessages::Get(errBindValueAndTypeMismatch);
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetBindTypeAndSizeFromValue()
//   Get the bind type from the value that has been passed in. If no bind type
// is supported at this point, 0 is returned.
//-----------------------------------------------------------------------------
bool njsConnection::GetBindTypeAndSizeFromValue(njsVariable *var,
        Local<Value> value, njsDataType *bindType, uint32_t *maxSize,
        njsBaton *baton, bool scalarOnly)
{
    if (value->IsUndefined() || value->IsNull()) {
        *bindType = NJS_DATATYPE_STR;
        *maxSize = 1;
    } else if (value->IsString()) {
        *bindType = NJS_DATATYPE_STR;
        Nan::Utf8String utf8str(value->ToString());
        *maxSize = static_cast<uint32_t>(utf8str.length());
    } else if (value->IsInt32() || value->IsUint32()) {
        *bindType = NJS_DATATYPE_INT;
    } else if (value->IsNumber()) {
        *bindType = NJS_DATATYPE_NUM;
    } else if (value->IsDate()) {
        *bindType = NJS_DATATYPE_DATE;
    } else if (!scalarOnly && value->IsArray()) {
        Nan::HandleScope scope;
        Local<Array> arrayVal = Local<Array>::Cast(value);
        Local<Value> element;
        njsDataType elementBindType;
        uint32_t elementMaxSize;
        for (uint32_t i = 0; i < arrayVal->Length(); i++) {
            element = Nan::Get (arrayVal, i).ToLocalChecked ();
            if (element->IsUndefined() || element->IsNull())
                continue;
            if (!GetBindTypeAndSizeFromValue(var, element, &elementBindType,
                    &elementMaxSize, baton, true))
                return false;
            if (*bindType == 0)
                *bindType = elementBindType;
            if (elementMaxSize > *maxSize)
                *maxSize = elementMaxSize;
        }
    } else if (value->IsObject()) {
        if (Buffer::HasInstance(value)) {
            *bindType = NJS_DATATYPE_BUFFER;
            *maxSize = static_cast<uint32_t>(
                                      Buffer::Length(value->ToObject()));
        } else if (njsILob::HasInstance(value)) {
            njsILob *lob = njsILob::GetInstance(value);
            *bindType = lob->GetDataType();
        }
    } else {
        baton->error= njsMessages::Get(errInvalidBindDataType, 2);
        return false;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessExecuteOptions()
//   Processing of options for connection.execute(). If an error is detected,
// the baton error is populated and false is returned.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessExecuteOptions(Local<Object> options,
        njsBaton *baton)
{
    Nan::HandleScope scope;

    // process the basic options
    if (!baton->GetUnsignedIntFromJSON(options, "maxRows", 2, &baton->maxRows))
        return false;
    if (!baton->GetPositiveIntFromJSON(options, "fetchArraySize", 2,
            &baton->fetchArraySize))
        return false;
    if (!baton->GetUnsignedIntFromJSON(options, "outFormat", 2,
            &baton->outFormat))
        return false;
    if (baton->outFormat != NJS_ROWS_ARRAY &&
            baton->outFormat != NJS_ROWS_OBJECT) {
        baton->error = njsMessages::Get(errInvalidPropertyValue, "outFormat");
        return false;
    }
    if (!baton->GetBoolFromJSON(options, "resultSet", 2, &baton->getRS))
        return false;
    if (!baton->GetBoolFromJSON(options, "autoCommit", 2, &baton->autoCommit))
        return false;
    if (!baton->GetBoolFromJSON(options, "extendedMetaData", 2,
            &baton->extendedMetaData))
        return false;

    // process the fetchAs specifications, if applicable
    Local<Value> key = Nan::New<v8::String>("fetchInfo").ToLocalChecked();
    Local<Value> val;
    if (!Nan::Get(options, key).ToLocal(&val))
        return false;
    if (!val->IsUndefined() && !val->IsNull()) {
        Local<Object> jsFetchInfo = val->ToObject();
        Local<Array> keys = jsFetchInfo->GetOwnPropertyNames();
        baton->numFetchInfo = keys->Length();
        if (baton->numFetchInfo > 0)
            baton->fetchInfo = new njsFetchInfo[baton->numFetchInfo];
        for (uint32_t i = 0; i < baton->numFetchInfo; i++) {
            Local<Value> temp = Nan::Get(keys, i).ToLocalChecked();
            Nan::Utf8String utf8str(temp->ToString());
            baton->fetchInfo[i].name = std::string(*utf8str,
                    static_cast<size_t>(utf8str.length()));
            Local<Object> colInfo =
                    Nan::Get(jsFetchInfo, temp).ToLocalChecked()->ToObject();
            uint32_t tempType = static_cast<uint32_t>(NJS_DATATYPE_UNKNOWN);
            if (!baton->GetUnsignedIntFromJSON(colInfo, "type", 2, &tempType))
                return false;
            if (tempType == (uint32_t) NJS_DATATYPE_UNKNOWN) {
                baton->error = njsMessages::Get(errNoTypeForConversion);
                return false;
            } else if (tempType != NJS_DATATYPE_DEFAULT &&
                    tempType != NJS_DATATYPE_STR &&
                    tempType != NJS_DATATYPE_BUFFER) {
                baton->error = njsMessages::Get(errInvalidTypeForConversion);
                return false;
            }
            baton->fetchInfo[i].type = (njsDataType) tempType;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessExecuteManyOptions()
//   Processing of options for connection.executeMany(). If an error is
// detected, the baton error is populated and false is returned.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessExecuteManyOptions(Local<Object> options,
        njsBaton *baton)
{
    if (!baton->GetBoolFromJSON(options, "autoCommit", 2, &baton->autoCommit))
        return false;
    if (!baton->GetBoolFromJSON(options, "batchErrors", 2,
            &baton->batchErrors))
        return false;
    if (!baton->GetBoolFromJSON(options, "dmlRowCounts", 2,
            &baton->dmlRowCounts))
        return false;

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessSubscriptionOptions()
//   Processing of options for connection.subscribe(). If an error is detected,
// the baton error is populated and false is returned.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessSubscriptionOptions(Local<Object> options,
        njsBaton *baton)
{
    Nan::HandleScope scope;
    uint32_t temp;

    // if subscription doesn't exist, get options for creating subscription
    if (!baton->dpiSubscrHandle) {
        temp = DPI_SUBSCR_NAMESPACE_DBCHANGE;
        if (!baton->GetUnsignedIntFromJSON(options, "namespace", 1,
                &temp))
            return false;
        baton->subscription->SetNamespace((dpiSubscrNamespace) temp);
        if (!baton->GetStringFromJSON(options, "ipAddress", 1,
                baton->ipAddress))
            return false;
        if (!baton->GetUnsignedIntFromJSON(options, "port", 1,
                &baton->portNumber))
            return false;
        if (!baton->GetUnsignedIntFromJSON(options, "timeout", 1,
                &baton->timeout))
            return false;
        if (!baton->GetUnsignedIntFromJSON(options, "operations", 1,
                &baton->operations))
            return false;
        if (!baton->GetUnsignedIntFromJSON(options, "qos", 1, &baton->qos))
            return false;
        if (!baton->GetUnsignedIntFromJSON(options, "groupingClass", 1,
                &baton->subscrGroupingClass))
            return false;
        if (!baton->GetUnsignedIntFromJSON(options, "groupingValue", 1,
                &baton->subscrGroupingValue))
            return false;
        if (!baton->GetUnsignedIntFromJSON(options, "groupingType", 1,
                &baton->subscrGroupingType))
            return false;
        Local<Function> callback;
        if (!baton->GetFunctionFromJSON(options, "callback", 1, &callback))
            return false;
        if (callback.IsEmpty())
            baton->error = njsMessages::Get(errMissingSubscrCallback);
        else baton->subscription->SetCallback(callback);
    }

    // get options that are used for registering queries
    if (baton->subscription->GetNamespace() == DPI_SUBSCR_NAMESPACE_DBCHANGE) {
        if (!baton->GetStringFromJSON(options, "sql", 1, baton->sql))
            return false;
        if (baton->sql.empty()) {
            baton->error = njsMessages::Get(errMissingSubscrSql);
            return false;
        }
        Local<Value> binds;
        Local<String> key = Nan::New("binds").ToLocalChecked();
        if (!Nan::Get(options, key).ToLocal(&binds))
            return false;
        if (!ProcessExecuteBinds(binds.As<Object>(), baton))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetScalarValueFromVar()
//   Get the value from the DPI variable of the specified type at the specified
// position in the variable. Return true if the get was successful; if not, the
// baton error has been populated with the error that was received from DPI.
//-----------------------------------------------------------------------------
bool njsConnection::GetScalarValueFromVar(njsBaton *baton, njsVariable *var,
        njsVariableBuffer *buffer, uint32_t pos, Local<Value> &value)
{
    Nan::EscapableHandleScope scope;
    Local<Value> temp;

    // LOBs make use of the njsProtoILob objects created in the worker thread
    if (buffer->lobs) {
        njsProtoILob *protoLob = &buffer->lobs[pos];
        if (!protoLob->dpiLobHandle)
            temp = Nan::Null();
        else {
            Local<Value> argv[1];
            argv[0] = njsILob::CreateFromProtoLob(protoLob);
            Local<Value> key = Nan::New<String>("newLob").ToLocalChecked();
            Local<Object> jsOracledb = Nan::New(baton->jsOracledb);
            Local<Function> fn = Local<Function>::Cast(Nan::Get( jsOracledb,
                                             key).ToLocalChecked());
            temp = fn->Call(jsOracledb, 1, argv);
        }
        value = scope.Escape(temp);
        return true;
    }

    // get the value from ODPI-C
    uint32_t bufferRowIndex = baton->bufferRowIndex + pos;
    dpiData *data = &buffer->dpiVarData[bufferRowIndex];

    // transform it to a JS value
    if (data->isNull) {
        value = scope.Escape(Nan::Null());
        return true;
    }
    switch (var->nativeTypeNum) {
        case DPI_NATIVE_TYPE_INT64:
            temp = Nan::New<Number>((double) data->value.asInt64);
            break;
        case DPI_NATIVE_TYPE_FLOAT:
            temp = Nan::New<Number>(data->value.asFloat);
            break;
        case DPI_NATIVE_TYPE_DOUBLE:
            if (var->varTypeNum == DPI_ORACLE_TYPE_TIMESTAMP_LTZ)
                temp = Nan::New<Date>(data->value.asDouble).ToLocalChecked();
            else temp = Nan::New<Number>(data->value.asDouble);
            break;
        case DPI_NATIVE_TYPE_BYTES:
            if (data->value.asBytes.length > var->maxSize) {
                baton->error = njsMessages::Get(errInsufficientBufferForBinds);
                return false;
            }
            if (data->value.asBytes.length == 0)
                temp = Nan::Null();
            else if (var->varTypeNum == DPI_ORACLE_TYPE_RAW ||
                    var->varTypeNum == DPI_ORACLE_TYPE_LONG_RAW)
                temp = Nan::CopyBuffer(data->value.asBytes.ptr,
                        data->value.asBytes.length).ToLocalChecked();
            else temp = Nan::New<v8::String>(data->value.asBytes.ptr,
                    data->value.asBytes.length).ToLocalChecked();
            break;
        case DPI_NATIVE_TYPE_STMT:
            if (!njsResultSet::CreateFromRefCursor(baton, data->value.asStmt,
                    var->queryVars, var->numQueryVars, temp))
                return false;
            var->queryVars = NULL;
            var->numQueryVars = 0;
            break;
        case DPI_NATIVE_TYPE_ROWID:
            uint32_t rowidValueLength;
            const char *rowidValue;
            if (dpiRowid_getStringValue(data->value.asRowid, &rowidValue,
                    &rowidValueLength) < 0) {
                baton->GetDPIError();
                return false;
            }
            temp = Nan::New<v8::String>(rowidValue,
                    rowidValueLength).ToLocalChecked();
            break;
        default:
            break;
    }
    value = scope.Escape(temp);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetArrayValueFromVar()
//   Get the value from the DPI variable of the specified type as an array.
//-----------------------------------------------------------------------------
bool njsConnection::GetArrayValueFromVar(njsBaton *baton, njsVariable *var,
        uint32_t pos, Local<Value> &value)
{
    njsVariableBuffer *buffer = &var->buffer;

    if (var->dmlReturningBuffers)
        buffer = &var->dmlReturningBuffers[pos];
    Nan::EscapableHandleScope scope;
    Local<Array> arrayVal = Nan::New<Array>(buffer->numElements);
    for (uint32_t i = 0; i < buffer->numElements; i++) {
        Local<Value> elementValue;
        if (!GetScalarValueFromVar(baton, var, buffer, i, elementValue))
            return false;
        Nan::Set(arrayVal, i, elementValue);
    }
    value = scope.Escape(arrayVal);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetExecuteOutBinds()
//   Get the out binds as an object/array.
//-----------------------------------------------------------------------------
bool njsConnection::GetExecuteOutBinds(Local<Value> &outBinds, njsBaton *baton)
{
    uint32_t numOutBinds = baton->GetNumOutBinds();

    if (numOutBinds > 0)
        return GetOutBinds(outBinds, numOutBinds, 0, baton);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetExecuteManyOutBinds()
//   Get the out binds as an object/array.
//-----------------------------------------------------------------------------
bool njsConnection::GetExecuteManyOutBinds(Local<Value> &outBinds,
        uint32_t numOutBinds, njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    Local<Array> rows = Nan::New<Array>(baton->bindArraySize);
    Local<Value> row;

    for (uint32_t i = 0; i < baton->bindArraySize; i++) {
        if (!GetOutBinds(row, numOutBinds, i, baton))
            return false;
        Nan::Set(rows, i, row);
    }
    outBinds = scope.Escape(rows);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetOutBinds()
//   Get the out binds as an object/array.
//-----------------------------------------------------------------------------
bool njsConnection::GetOutBinds(Local<Value> &outBinds, uint32_t numOutBinds,
        uint32_t pos, njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    Local<Array> bindArray;
    Local<Object> bindObj;
    Local<Value> val;
    bool bindByPos, ok;
    njsVariable *var;

    bindByPos = baton->bindVars[0].name.empty();
    if (bindByPos)
        bindArray = Nan::New<Array>(numOutBinds);
    else bindObj = Nan::New<Object>();
    uint32_t arrayPos = 0;
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        var = &baton->bindVars[i];
        if (var->bindDir == NJS_BIND_IN)
            continue;
        if (var->isArray || baton->isReturning)
            ok = GetArrayValueFromVar(baton, var, pos, val);
        else ok = GetScalarValueFromVar(baton, var, &var->buffer, pos, val);
        if (!ok)
            return false;
        if (bindByPos)
            Nan::Set(bindArray, arrayPos++, val);
        else {
            Local<String> key = Nan::New<String>(var->name.c_str() + 1,
                    (int) var->name.length() - 1).ToLocalChecked();
            Nan::Set(bindObj, key, val);
        }
    }
    if (bindByPos)
        outBinds = scope.Escape(bindArray);
    else outBinds = scope.Escape(bindObj);

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::SetTextAttribute()
//   Set text attribute -- calls DPI passing the JS buffer provided, after
// first validating the connection.
//-----------------------------------------------------------------------------
void njsConnection::SetTextAttribute(Nan::NAN_SETTER_ARGS_TYPE args,
        const char *attributeName, Local<Value> value,
        int (*setter)(dpiConn*, const char *, uint32_t))
{
    njsConnection *connection = (njsConnection*) ValidateSetter(args);
    if (!connection)
        return;
    if (!value->IsString()) {
        string errMsg = njsMessages::Get(errInvalidPropertyValue,
                attributeName);
        Nan::ThrowError(errMsg.c_str());
        return;
    }
    Nan::Utf8String utfstr(value->ToString());
    uint32_t valueLength = static_cast<uint32_t>(utfstr.length());
    if ((*setter)(connection->dpiConnHandle, *utfstr, valueLength) < 0)
        njsOracledb::ThrowDPIError();
}


//-----------------------------------------------------------------------------
// njsConnection::New()
//   Create new object accesible from JS. This is always called from within
// Connnection::CreateFromBaton() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::New)
{
    njsConnection *connection = new njsConnection();
    connection->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsConnection::Execute()
//   Executes a statement on the connection.
//
// PARAMETERS
//   - SQL Statement
//   - Binds Object/Array (Optional)
//   - Options Object (Optional)
//   - JS callback which will receive (error, result set)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Execute)
{
    njsConnection *connection;
    njsOracledb *oracledb;
    std::string sql;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 4, 4);
    if (!connection)
        return;
    if (!connection->GetStringArg(info, 0, sql))
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    Nan::TryCatch tryCatch;
    bool ok = baton->error.empty();
    if (ok) {
        baton->sql = sql;
        baton->SetDPIConnHandle(connection->dpiConnHandle);
        baton->jsOracledb.Reset(connection->jsOracledb);
        oracledb = baton->GetOracledb();
        baton->maxRows = oracledb->getMaxRows();
        baton->fetchArraySize = oracledb->getFetchArraySize();
        oracledb->SetFetchAsStringTypesOnBaton(baton);
        oracledb->SetFetchAsBufferTypesOnBaton(baton);
        baton->outFormat = oracledb->getOutFormat();
        baton->autoCommit = oracledb->getAutoCommit();
        baton->extendedMetaData = oracledb->getExtendedMetaData();
    }
    if (ok)
        ok = ProcessExecuteBinds(info[1].As<Object>(), baton);
    if (ok)
        ProcessExecuteOptions(info[2].As<Object>(), baton);
    baton->CheckJSException(&tryCatch);
    baton->QueueWork("Execute", Async_Execute, Async_AfterExecute, 2);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Execute()
//   Worker function for njsConnection::Execute() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Execute(njsBaton *baton)
{
    dpiExecMode mode;

    // prepare statement and perform any binds that are needed
    if (!PrepareAndBind(baton))
        return;

    // execute statement
    mode = (baton->autoCommit) ? DPI_MODE_EXEC_COMMIT_ON_SUCCESS :
            DPI_MODE_EXEC_DEFAULT;
    if (dpiStmt_execute(baton->dpiStmtHandle, mode,
            &baton->numQueryVars) < 0) {
        baton->GetDPIError();
        return;
    }

    // for queries, perform defines
    if (baton->numQueryVars > 0) {

        // perform defines
        baton->queryVars = new njsVariable[baton->numQueryVars];
        if (!ProcessQueryVars(baton, baton->dpiStmtHandle, baton->queryVars,
                baton->numQueryVars))
            return;

    // for all other statements, determine the number of rows affected
    // and process any LOBS for out binds, as needed
    } else {
        if (dpiStmt_getRowCount(baton->dpiStmtHandle,
                &baton->rowsAffected) < 0) {
            baton->GetDPIError();
            return;
        }
        baton->bufferRowIndex = 0;
        if (!ProcessVars(baton, baton->bindVars, baton->numBindVars, 1))
            return;
    }
}


//-----------------------------------------------------------------------------
// njsConnection::Async_AfterExecute()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsConnection::Async_AfterExecute(njsBaton *baton, Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();
    Local<Object> callingObj, rows;
    Local<Function> callback;

    // handle queries
    if (baton->queryVars) {

        // queries do not have out binds or any rows affected
        Nan::Set(result, Nan::New<v8::String>("outBinds").ToLocalChecked(),
                Nan::Undefined());
        Nan::Set(result, Nan::New<v8::String>("rowsAffected").ToLocalChecked(),
                Nan::Undefined());

        // assign metadata
        Nan::Set(result, Nan::New<v8::String>("metaData").ToLocalChecked(),
                GetMetaData(baton->queryVars, baton->numQueryVars,
                        baton->extendedMetaData));

        // assign result set
        Local<Object> resultSet = njsResultSet::CreateFromBaton(baton);
        Nan::Set(result, Nan::New<String>("resultSet").ToLocalChecked(),
                resultSet);

    } else {
        Local<Value> outBinds = Nan::Undefined();
        GetExecuteOutBinds(outBinds, baton);
        Local<String> key = Nan::New<v8::String>("outBinds").ToLocalChecked();
        Nan::DefineOwnProperty(result, key, outBinds);
        if (baton->isPLSQL)
            Nan::Set(result,
                    Nan::New<v8::String>("rowsAffected").ToLocalChecked(),
                    Nan::Undefined());
        else Nan::DefineOwnProperty(result,
                Nan::New<v8::String>("rowsAffected").ToLocalChecked(),
                Nan::New<v8::Integer>( (unsigned int) baton->rowsAffected),
                v8::ReadOnly);

        Nan::Set(result, Nan::New<v8::String>("rows").ToLocalChecked(),
                Nan::Undefined());
        Nan::Set(result, Nan::New<v8::String>("metaData").ToLocalChecked(),
                Nan::Undefined());
    }
    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsConnection::ExecuteMany()
//   Executes a statement on the connection multiple times, once for each row
// of data that is passed.
//
// PARAMETERS
//   - SQL Statement
//   - Array of Binds
//   - Options Object (Optional)
//   - JS callback which will receive (error, result)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::ExecuteMany)
{
    njsConnection *connection;
    njsOracledb *oracledb;
    std::string sql;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 4, 4);
    if (!connection)
        return;
    if (!connection->GetStringArg(info, 0, sql))
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    Nan::TryCatch tryCatch;
    bool ok = baton->error.empty();
    if (ok) {
        baton->sql = sql;
        baton->SetDPIConnHandle(connection->dpiConnHandle);
        baton->jsOracledb.Reset(connection->jsOracledb);
        oracledb = baton->GetOracledb();
        baton->autoCommit = oracledb->getAutoCommit();
    }
    if (ok)
        ok = ProcessExecuteManyOptions(info[2].As<Object>(), baton);
    if (ok)
        ProcessExecuteManyBinds(info[1].As<Array>(), info[2].As<Object>(),
                baton);
    baton->CheckJSException(&tryCatch);
    baton->QueueWork("ExecuteMany", Async_ExecuteMany,
            Async_AfterExecuteMany, 2);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_ExecuteMany()
//   Worker function for njsConnection::ExecuteMany() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_ExecuteMany(njsBaton *baton)
{
    uint32_t mode;

    // prepare statement and perform any binds that are needed
    if (!PrepareAndBind(baton))
        return;

    // execute statement
    mode = (baton->autoCommit) ? DPI_MODE_EXEC_COMMIT_ON_SUCCESS :
            DPI_MODE_EXEC_DEFAULT;
    if (baton->batchErrors)
        mode |= DPI_MODE_EXEC_BATCH_ERRORS;
    if (baton->dmlRowCounts)
        mode |= DPI_MODE_EXEC_ARRAY_DML_ROWCOUNTS;
    if (dpiStmt_executeMany(baton->dpiStmtHandle, (dpiExecMode) mode,
            baton->bindArraySize) < 0) {
        baton->GetDPIError();
        return;
    }

    // process any LOBS for out binds, as needed
    if (dpiStmt_getRowCount(baton->dpiStmtHandle,
            &baton->rowsAffected) < 0) {
        baton->GetDPIError();
        return;
    }
    baton->bufferRowIndex = 0;
    if (!ProcessVars(baton, baton->bindVars, baton->numBindVars,
            baton->bindArraySize))
        return;

    // get DML row counts if option was enabled
    if (baton->dmlRowCounts) {
        if (dpiStmt_getRowCounts(baton->dpiStmtHandle, &baton->numRowCounts,
                &baton->rowCounts) < 0) {
            baton->GetDPIError();
            return;
        }
    }

    // get batch errors, if option was enabled
    if (baton->batchErrors) {
        if (dpiStmt_getBatchErrorCount(baton->dpiStmtHandle,
                &baton->numBatchErrorInfos) < 0) {
            baton->GetDPIError();
            return;
        }
        if (baton->numBatchErrorInfos > 0) {
            baton->batchErrorInfos =
                    new dpiErrorInfo[baton->numBatchErrorInfos];
            if (dpiStmt_getBatchErrors(baton->dpiStmtHandle,
                    baton->numBatchErrorInfos, baton->batchErrorInfos) < 0) {
                baton->GetDPIError();
                return;
            }
        }
    }

}


//-----------------------------------------------------------------------------
// njsConnection::Async_AfterExecuteMany()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsConnection::Async_AfterExecuteMany(njsBaton *baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();

    // get out binds
    uint32_t numOutBinds = baton->GetNumOutBinds();
    Local<Value> outBinds;
    if (numOutBinds > 0) {
        if (GetExecuteManyOutBinds(outBinds, numOutBinds, baton)) {
            Local<String> key = Nan::New<String>("outBinds").ToLocalChecked();
            Nan::DefineOwnProperty(result, key, outBinds, v8::ReadOnly);
        }
    }

    // get total number of rows affected
    if (!baton->isPLSQL)
        Nan::DefineOwnProperty(result,
                Nan::New<v8::String>("rowsAffected").ToLocalChecked(),
                Nan::New<v8::Integer>( (unsigned int) baton->rowsAffected),
                v8::ReadOnly);

    // get DML row counts if option was enabled
    if (baton->dmlRowCounts && baton->numRowCounts > 0) {
        Local<Array> rowCountsObj = Nan::New<Array>(baton->numRowCounts);
        for (uint32_t i = 0; i < baton->numRowCounts; i++) {
            Local<Value> rowCountObj =
                    Nan::New<Integer>((unsigned int) baton->rowCounts[i]);
            Nan::Set(rowCountsObj, i, rowCountObj);
        }
        Nan::DefineOwnProperty(result,
                Nan::New<v8::String>("dmlRowCounts").ToLocalChecked(),
                rowCountsObj, v8::ReadOnly);
    }

    // get batch errors, if option was enabled
    if (baton->batchErrors && baton->numBatchErrorInfos > 0) {
        Local<Array> batchErrorsObj =
                Nan::New<Array>(baton->numBatchErrorInfos);
        for (uint32_t i = 0; i < baton->numBatchErrorInfos; i++) {
            dpiErrorInfo *info = &baton->batchErrorInfos[i];
            std::string errorStr =
                    std::string(info->message, info->messageLength);
            Local<String> errorStrObj =
                    Nan::New<String>(errorStr).ToLocalChecked();
            Local<Object> errorObj =
                    v8::Exception::Error(errorStrObj).As<Object>();
            Nan::Set(errorObj,
                    Nan::New<v8::String>("errorNum").ToLocalChecked(),
                    Nan::New<v8::Number>(info->code));
            Nan::Set(errorObj,
                    Nan::New<v8::String>("offset").ToLocalChecked(),
                    Nan::New<v8::Number>(info->offset));
            Nan::Set(batchErrorsObj, i, errorObj);
        }
        Nan::DefineOwnProperty(result,
                Nan::New<v8::String>("batchErrors").ToLocalChecked(),
                batchErrorsObj, v8::ReadOnly);
    }

    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsConnection::GetStatementInfo()
//   Parses a statement on the connection and returns information about the
// statement.
//
// PARAMETERS
//   - SQL Statement
//   - JS callback which will receive (error, result)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::GetStatementInfo)
{
    njsConnection *connection;
    std::string sql;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 2, 2);
    if (!connection)
        return;
    if (!connection->GetStringArg(info, 0, sql))
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    if (baton->error.empty()) {
        baton->sql = sql;
        baton->extendedMetaData = true;
        baton->SetDPIConnHandle(connection->dpiConnHandle);
        baton->jsOracledb.Reset(connection->jsOracledb);
    }
    baton->QueueWork("GetStatementInfo", Async_GetStatementInfo,
            Async_AfterGetStatementInfo, 2);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_GetStatementInfo()
//   Worker function for njsConnection::GetStatementInfo() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_GetStatementInfo(njsBaton *baton)
{
    dpiExecMode mode;

    // prepare DPI statement for use
    if (dpiConn_prepareStmt(baton->dpiConnHandle, 0, baton->sql.c_str(),
            (uint32_t) baton->sql.length(), NULL, 0,
            &baton->dpiStmtHandle) < 0) {
        baton->GetDPIError();
        return;
    }

    // parse the statement
    if (dpiStmt_getInfo(baton->dpiStmtHandle, &baton->stmtInfo) < 0) {
        baton->GetDPIError();
        return;
    }
    if (!baton->stmtInfo.isDDL) {
        if (baton->stmtInfo.isQuery)
            mode = DPI_MODE_EXEC_DESCRIBE_ONLY;
        else mode = DPI_MODE_EXEC_PARSE_ONLY;
        if (dpiStmt_execute(baton->dpiStmtHandle, mode,
                &baton->numQueryVars) < 0) {
            baton->GetDPIError();
            return;
        }
    }

    // for queries, process query variables to get metadata
    if (baton->numQueryVars > 0) {
        baton->queryVars = new njsVariable[baton->numQueryVars];
        if (!ProcessQueryVars(baton, baton->dpiStmtHandle, baton->queryVars,
                baton->numQueryVars))
            return;
    }
}


//-----------------------------------------------------------------------------
// njsConnection::Async_AfterGetStatementInfo()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsConnection::Async_AfterGetStatementInfo(njsBaton *baton,
        Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Object> result = Nan::New<v8::Object>();
    Local<Object> callingObj, rows;
    Local<Function> callback;
    uint32_t numBinds;

    // add metadata (queries only)
    if (baton->queryVars) {
        Nan::Set(result, Nan::New<v8::String>("metaData").ToLocalChecked(),
                GetMetaData(baton->queryVars, baton->numQueryVars,
                        baton->extendedMetaData));
    }

    // add list of bind variable names
    if (dpiStmt_getBindCount(baton->dpiStmtHandle, &numBinds) < 0) {
        baton->GetDPIError();
        return;
    }
    uint32_t *bindNameLengths = new uint32_t[numBinds];
    const char **bindNames = new const char *[numBinds];
    if (dpiStmt_getBindNames(baton->dpiStmtHandle, &numBinds, bindNames,
            bindNameLengths) < 0) {
        baton->GetDPIError();
        delete [] bindNames;
        delete [] bindNameLengths;
        return;
    }
    Local<Array> bindNamesArray = Nan::New<Array>(numBinds);
    for (uint32_t i = 0; i < numBinds; i++) {
        Local<String> bindName = Nan::New<String>(bindNames[i],
                (int) bindNameLengths[i]).ToLocalChecked();
        Nan::Set(bindNamesArray, i, bindName);
    }
    delete [] bindNames;
    delete [] bindNameLengths;
    Nan::Set(result, Nan::New<v8::String>("bindNames").ToLocalChecked(),
            bindNamesArray);

    // add statement type
    Nan::Set(result, Nan::New<v8::String>("statementType").ToLocalChecked(),
            Nan::New(static_cast<int>(baton->stmtInfo.statementType)));

    argv[1] = scope.Escape(result);
}


//-----------------------------------------------------------------------------
// njsConnection::Close()
//   Releases the connection from use by JS. This releases the connection back
// to the pool or closes the standalone connection so further use is not
// possible. The reference to the DPI handle is transferred to the baton so
// that it will be cleared automatically upon success and so that the
// connection is marked as invalid immediately.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Close)
{
    njsConnection *connection;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 1, 1);
    if (!connection)
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    baton->dpiConnHandle = connection->dpiConnHandle;
    connection->dpiConnHandle = NULL;
    baton->QueueWork("Close", Async_Close, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Close()
//   Worker function for njsConnection::Close() method. If the attempt to
// close fails, the reference to the DPI handle is transferred back from the
// baton to the connection.
//-----------------------------------------------------------------------------
void njsConnection::Async_Close(njsBaton *baton)
{
    if (dpiConn_close(baton->dpiConnHandle, DPI_MODE_CONN_CLOSE_DEFAULT, NULL,
            0) < 0) {
        njsConnection *connection = (njsConnection*) baton->callingObj;
        connection->dpiConnHandle = baton->dpiConnHandle;
        baton->dpiConnHandle = NULL;
        baton->GetDPIError();
    }
}


//-----------------------------------------------------------------------------
// njsConnection::Async_AfterClose()
//   Finishes close by cleaning up references.
//-----------------------------------------------------------------------------
void njsConnection::Async_AfterClose(njsBaton *baton, Local<Value> argv[])
{
    njsConnection *connection = (njsConnection*) baton->callingObj;
    connection->jsOracledb.Reset();
}


//-----------------------------------------------------------------------------
// njsConnection::Commit()
//   Commits the active transaction.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Commit)
{
    njsConnection *connection;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 1, 1);
    if (!connection)
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    if (baton->error.empty())
        baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->QueueWork("Commit", Async_Commit, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Commit()
//   Worker function for njsConnection::Commit() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Commit(njsBaton *baton)
{
    if (dpiConn_commit(baton->dpiConnHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsConnection::Rollback()
//   Rolls back the active transaction.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Rollback)
{
    njsConnection *connection;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 1, 1);
    if (!connection)
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    if (baton->error.empty())
        baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->QueueWork("Rollback", Async_Rollback, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Rollback()
//   Worker function for njsConnection::Rollback() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Rollback(njsBaton *baton)
{
    if (dpiConn_rollback(baton->dpiConnHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsConnection::Break()
//   Break (interrupt) the currently executing operation.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Break)
{
    njsConnection *connection;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 1, 1);
    if (!connection)
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    if (baton->error.empty())
        baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->QueueWork("Break", Async_Break, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Break()
//   Worker function for njsConnection::Break() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Break(njsBaton *baton)
{
    if (dpiConn_breakExecution(baton->dpiConnHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsConnection::CreateLob()
//   Create a new temporary LOB and return it for use by the application.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::CreateLob)
{
    njsConnection *connection;
    uint32_t lobType;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 2, 2);
    if (!connection)
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    if (!connection->GetUnsignedIntArg(info, 0, &lobType))
        return;
    if (lobType != NJS_DATATYPE_CLOB && lobType != NJS_DATATYPE_BLOB) {
        string errMsg = njsMessages::Get(errInvalidParameterValue, 1);
        Nan::ThrowError(errMsg.c_str());
        return;
    }
    if (baton->error.empty()) {
        baton->jsOracledb.Reset(connection->jsOracledb);
        baton->SetDPIConnHandle(connection->dpiConnHandle);
        baton->protoILob = new njsProtoILob();
        baton->protoILob->dataType = (njsDataType) lobType;
    }
    baton->QueueWork("CreateLob", Async_CreateLob, Async_AfterCreateLob, 2);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_CreateLob()
//   Worker function for njsConnection::CreateLob() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_CreateLob(njsBaton *baton)
{
    dpiOracleTypeNum typeNum;
    dpiLob *tempLob;

    typeNum = (baton->protoILob->dataType == NJS_DATATYPE_CLOB) ?
            DPI_ORACLE_TYPE_CLOB : DPI_ORACLE_TYPE_BLOB;
    if (dpiConn_newTempLob(baton->dpiConnHandle, typeNum, &tempLob) < 0)
        baton->GetDPIError();
    baton->protoILob->PopulateFromDPI(baton, tempLob, false);
    baton->protoILob->isAutoClose = false;
}


//-----------------------------------------------------------------------------
// njsConnection::Async_AfterCreateLob()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsConnection::Async_AfterCreateLob(njsBaton *baton, Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    Local<Value> tempArgv[1];

    tempArgv[0] = njsILob::CreateFromProtoLob(baton->protoILob);
    Local<Value> key = Nan::New<String>("newLob").ToLocalChecked();
    Local<Object> jsOracledb = Nan::New(baton->jsOracledb);
    Local<Function> fn = Local<Function>::Cast(Nan::Get(jsOracledb,
                                                       key).ToLocalChecked());
    Local<Value> temp = fn->Call(jsOracledb, 1, tempArgv);
    argv[1] = scope.Escape(temp);
}


//-----------------------------------------------------------------------------
// njsConnection::ChangePassword()
//   Change the password on the connection.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::ChangePassword)
{
    std::string user, password, newPassword;
    njsConnection *connection;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 4, 4);
    if (!connection)
        return;
    if (!connection->GetStringArg(info, 0, user))
        return;
    if (!connection->GetStringArg(info, 1, password))
        return;
    if (!connection->GetStringArg(info, 2, newPassword))
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    if (baton->error.empty()) {
        baton->SetDPIConnHandle(connection->dpiConnHandle);
        baton->user = user;
        baton->password = password;
        baton->newPassword = newPassword;
    }
    baton->QueueWork("ChangePassword", Async_ChangePassword, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_ChangePassword()
//   Worker function for njsConnection::ChangePassword() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_ChangePassword(njsBaton *baton)
{
    if (dpiConn_changePassword(baton->dpiConnHandle, baton->user.c_str(),
            (uint32_t) baton->user.length(), baton->password.c_str(),
            (uint32_t) baton->password.length(), baton->newPassword.c_str(),
            (uint32_t) baton->newPassword.length()) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsConnection::Ping()
//   Ping the database to see if it is "alive".
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Ping)
{
    njsConnection *connection;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 1, 1);
    if (!connection)
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    if (baton->error.empty())
        baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->QueueWork("Ping", Async_Ping, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Ping()
//   Worker function for njsConnection::Ping() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Ping(njsBaton *baton)
{
    if (dpiConn_ping(baton->dpiConnHandle) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsConnection::Subscribe()
//   Subscribe to events from the database. The provided callback will be
// invoked each time a notification is received. The name is used to uniquely
// identify a subscription and a reference is stored on the oracledb instance
// for use by subsequent calls to subscribe() or unsubscribe().
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Subscribe)
{
    njsConnection *connection;
    std::string name;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 3, 3);
    if (!connection)
        return;
    if (!connection->GetStringArg(info, 0, name))
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    baton->name = name;
    baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->subscription = njsOracledb::GetSubscription(name);
    if (baton->subscription)
        baton->subscription->SetDPISubscrHandle(baton);
    else {
        Local<Object> obj = njsSubscription::Create();
        baton->subscription = Nan::ObjectWrap::Unwrap<njsSubscription>(obj);
        baton->jsSubscription.Reset(obj);
    }
    Local<Object> options = info[1].As<Object>();
    ProcessSubscriptionOptions(options, baton);
    baton->QueueWork("Subscribe", Async_Subscribe, Async_AfterSubscribe, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Subscribe()
//   Worker function for njsConnection::Subscribe() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Subscribe(njsBaton *baton)
{
    // create subscription, if necessary
    if (!baton->dpiSubscrHandle) {
        dpiSubscrCreateParams params;
        dpiContext *context = njsOracledb::GetDPIContext();
        if (dpiContext_initSubscrCreateParams(context, &params) < 0) {
            baton->GetDPIError();
            return;
        }
        params.subscrNamespace = baton->subscription->GetNamespace();
        params.name = baton->name.c_str();
        params.nameLength = baton->name.length();
        params.protocol = DPI_SUBSCR_PROTO_CALLBACK;
        params.callback = (dpiSubscrCallback) njsSubscription::EventHandler;
        params.callbackContext = baton->subscription;
        params.ipAddress = baton->ipAddress.c_str();
        params.ipAddressLength = baton->ipAddress.length();
        params.portNumber = baton->portNumber;
        params.timeout = baton->timeout;
        params.qos = (dpiSubscrQOS) baton->qos;
        params.operations = (dpiOpCode) baton->operations;
        params.groupingClass = (uint8_t) baton->subscrGroupingClass;
        params.groupingValue = baton->subscrGroupingValue;
        params.groupingType = (uint8_t) baton->subscrGroupingType;
        if (dpiConn_subscribe(baton->dpiConnHandle, &params,
                &baton->dpiSubscrHandle) < 0) {
            baton->GetDPIError();
            return;
        }
    }

    // register query if applicable
    if (!baton->sql.empty()) {

        // prepare statement for registration
        if (dpiSubscr_prepareStmt(baton->dpiSubscrHandle, baton->sql.c_str(),
                (uint32_t) baton->sql.length(), &baton->dpiStmtHandle) < 0) {
            baton->GetDPIError();
            return;
        }

        // perform any binds necessary
        for (uint32_t i = 0; i < baton->numBindVars; i++) {
            int status;
            njsVariable *var = &baton->bindVars[i];
            if (var->name.empty())
                status = dpiStmt_bindByPos(baton->dpiStmtHandle, var->pos,
                        var->dpiVarHandle);
            else status = dpiStmt_bindByName(baton->dpiStmtHandle,
                    var->name.c_str(), (uint32_t) var->name.length(),
                    var->dpiVarHandle);
            if (status < 0) {
                baton->GetDPIError();
                return;
            }
        }

        // perform execute (which registers the query)
        if (dpiStmt_execute(baton->dpiStmtHandle, DPI_MODE_EXEC_DEFAULT,
                NULL) < 0)
            baton->GetDPIError();

    }
}


//-----------------------------------------------------------------------------
// njsConnection::Async_AfterSubscribe()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsConnection::Async_AfterSubscribe(njsBaton *baton, Local<Value> argv[])
{
    baton->subscription->StartNotifications(baton);
}


//-----------------------------------------------------------------------------
// njsConnection::Unsubscribe()
//   Unsubscribe from events in the database that were originally subscribed
// with a call to connection.subscribe().
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Unsubscribe)
{
    njsConnection *connection;
    std::string name;
    njsBaton *baton;

    connection = (njsConnection*) ValidateArgs(info, 2, 2);
    if (!connection)
        return;
    if (!connection->GetStringArg(info, 0, name))
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    baton->name = name;
    baton->subscription = njsOracledb::GetSubscription(name);
    if (baton->subscription) {
        baton->subscription->SetDPISubscrHandle(baton);
        baton->SetDPIConnHandle(connection->dpiConnHandle);
    } else {
        baton->error = njsMessages::Get(errInvalidSubscription);
    }
    baton->QueueWork("Unsubscribe", Async_Unsubscribe, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Unsubscribe()
//   Worker function for njsConnection::Unsubscribe() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Unsubscribe(njsBaton *baton)
{
    if (dpiConn_unsubscribe(baton->dpiConnHandle, baton->dpiSubscrHandle) < 0)
        baton->GetDPIError();
    else {
        baton->dpiSubscrHandle = NULL;
        baton->subscription->StopNotifications();
    }
    baton->subscription = NULL;
}


//-----------------------------------------------------------------------------
// njsConnection::GetStmtCacheSize()
//   Get accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsConnection::GetStmtCacheSize)
{
    njsConnection *connection = (njsConnection*) ValidateGetter(info);
    if (!connection)
        return;
    if (!connection->IsValid()) {
        info.GetReturnValue().Set(Nan::Undefined());
        return;
    }
    uint32_t cacheSize;
    if (dpiConn_getStmtCacheSize(connection->dpiConnHandle, &cacheSize) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }
    info.GetReturnValue().Set(cacheSize);
}


//-----------------------------------------------------------------------------
// njsConnection::SetStmtCacheSize()
//   Set accessor of "stmtCacheSize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsConnection::SetStmtCacheSize)
{
    PropertyIsReadOnly("stmtCacheSize");
}


//-----------------------------------------------------------------------------
// njsConnection::GetClientId()
//   Get accessor of "clientId" property. This is a write-only property,
// returning NULL for debugging purposes in case of read.
//-----------------------------------------------------------------------------
NAN_GETTER(njsConnection::GetClientId)
{
    info.GetReturnValue().SetNull();
}


//-----------------------------------------------------------------------------
// njsConnection::SetClientId()
//   Set accessor of "clientId" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsConnection::SetClientId)
{
    SetTextAttribute(info, "clientId", value, dpiConn_setClientIdentifier);
}


//-----------------------------------------------------------------------------
// njsConnection::GetModule()
//   Get accessor of "module" property. This is a write-only property,
// returning NULL for debugging purposes in case of read.
//-----------------------------------------------------------------------------
NAN_GETTER(njsConnection::GetModule)
{
    info.GetReturnValue().SetNull();
}


//-----------------------------------------------------------------------------
// njsConnection::SetModule()
//   Set accessor of "module" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsConnection::SetModule)
{
    SetTextAttribute(info, "module", value, dpiConn_setModule);
}


//-----------------------------------------------------------------------------
// njsConnection::GetAction()
//   Get accessor of "action" property. This is a write-only property,
// returning NULL for debugging purposes in case of read.
//-----------------------------------------------------------------------------
NAN_GETTER(njsConnection::GetAction)
{
    info.GetReturnValue().SetNull();
}


//-----------------------------------------------------------------------------
// njsConnection::SetAction()
//   Set accessor of "action" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsConnection::SetAction)
{
    SetTextAttribute(info, "action", value, dpiConn_setAction);
}


//-----------------------------------------------------------------------------
// njsConnection::GetOracleServerVersion()
//   Get accessor of "oracleServerVersion" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsConnection::GetOracleServerVersion)
{
    njsConnection *connection = (njsConnection*) ValidateGetter(info);
    if (!connection)
        return;
    if (!connection->IsValid()) {
        info.GetReturnValue().Set(Nan::Undefined());
        return;
    }
    dpiVersionInfo versionInfo;
    uint32_t releaseStringLength;
    const char *releaseString;
    if (dpiConn_getServerVersion(connection->dpiConnHandle, &releaseString,
            &releaseStringLength, &versionInfo) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }
    uint32_t oracleServerVersion = static_cast<uint32_t> (
            100000000 * versionInfo.versionNum +
            1000000 * versionInfo.releaseNum + 10000 * versionInfo.updateNum +
            100 * versionInfo.portReleaseNum + versionInfo.portUpdateNum);
    info.GetReturnValue().Set(oracleServerVersion);
}


//-----------------------------------------------------------------------------
// njsConnection::SetOracleServerVersion()
//   Set accessor of "oracleServerVersion" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsConnection::SetOracleServerVersion)
{
    PropertyIsReadOnly("oracleServerVersion");
}


//-----------------------------------------------------------------------------
// njsConnection::GetOracleServerVersionString()
//   Get accessor of "oracleServerVersionString" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsConnection::GetOracleServerVersionString)
{
    njsConnection *connection = (njsConnection*) ValidateGetter(info);
    if (!connection)
        return;
    if (!connection->IsValid()) {
        info.GetReturnValue().Set(Nan::Undefined());
        return;
    }
    dpiVersionInfo versionInfo;
    uint32_t releaseStringLength;
    const char *releaseString;
    if (dpiConn_getServerVersion(connection->dpiConnHandle, &releaseString,
            &releaseStringLength, &versionInfo) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }
    char versionString[40];
    (void) sprintf(versionString, "%d.%d.%d.%d.%d", versionInfo.versionNum,
            versionInfo.releaseNum, versionInfo.updateNum,
            versionInfo.portReleaseNum, versionInfo.portUpdateNum);
    Local<String> value = Nan::New<v8::String>(versionString).ToLocalChecked();
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsConnection::SetOracleServerVersionString()
//   Set accessor of "oracleServerVersionString" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsConnection::SetOracleServerVersionString)
{
    PropertyIsReadOnly("oracleServerVersionString");
}

