/* Copyright (c) 2015, 2016, Oracle and/or its affiliates.
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

// number of rows prefetched by non-ResultSet queries
#define NJS_PREFETCH_NON_RESULTSET 2

//-----------------------------------------------------------------------------
// njsConnection::Init()
//   Initialization function of Connection class. Maps functions and properties
// from JS to C++.
//-----------------------------------------------------------------------------
void njsConnection::Init(Handle<Object> target)
{
    Nan::HandleScope scope;
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);

    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("Connection").ToLocalChecked());

    Nan::SetPrototypeMethod(tpl, "execute", Execute);
    Nan::SetPrototypeMethod(tpl, "release", Release);
    Nan::SetPrototypeMethod(tpl, "commit", Commit);
    Nan::SetPrototypeMethod(tpl, "rollback", Rollback);
    Nan::SetPrototypeMethod(tpl, "break", Break);

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
    Local<FunctionTemplate> lft;
    njsConnection *connection;
    Local<Object> obj;

    lft = Nan::New<FunctionTemplate>(connectionTemplate_s);
    obj = lft->GetFunction()->NewInstance();
    connection = Nan::ObjectWrap::Unwrap<njsConnection>(obj);
    connection->dpiConnHandle = baton->dpiConnHandle;
    baton->dpiConnHandle = NULL;
    connection->jsOracledb.Reset(baton->jsOracledb);
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessDefines()
//   Perform defines on all of the columns in the query.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessDefines(njsBaton *baton, dpiStmt *dpiStmtHandle,
        dpiConn *dpiConnHandle, njsVariable *vars, uint32_t numVars)
{
    dpiQueryInfo queryInfo;

    // maxRows must be greater than zero in case of non-result set
    if (baton->maxRows == 0) {
        baton->error = njsMessages::Get(errInvalidmaxRows);
        return false;
    }

    // set fetch array size to the max rows that we wish to retrieve
    if (dpiStmt_SetFetchArraySize(dpiStmtHandle, baton->maxRows) < 0) {
        baton->GetDPIStmtError(dpiStmtHandle);
        return false;
    }

    // perform defines
    for (uint32_t i = 0; i < numVars; i++) {

        // get query information for the specified column
        vars[i].pos = i + 1;
        vars[i].isArray = false;
        vars[i].bindDir = NJS_BIND_OUT;
        if (dpiStmt_GetQueryInfo(dpiStmtHandle, vars[i].pos, &queryInfo) < 0) {
            baton->GetDPIStmtError(dpiStmtHandle);
            return false;
        }
        vars[i].name = std::string(queryInfo.name, queryInfo.nameLength);
        vars[i].maxArraySize = baton->maxRows;
        vars[i].dbSizeInBytes = queryInfo.dbSizeInBytes;
        vars[i].precision = queryInfo.precision;
        vars[i].scale = queryInfo.scale;
        vars[i].isNullable = queryInfo.nullOk;

        // determine the type of data
        vars[i].dbTypeNum = queryInfo.oracleTypeNum;
        vars[i].varTypeNum = queryInfo.oracleTypeNum;
        vars[i].nativeTypeNum = queryInfo.defaultNativeTypeNum;
        if (queryInfo.oracleTypeNum != DPI_ORACLE_TYPE_VARCHAR ||
                queryInfo.oracleTypeNum != DPI_ORACLE_TYPE_NVARCHAR ||
                queryInfo.oracleTypeNum != DPI_ORACLE_TYPE_CHAR ||
                queryInfo.oracleTypeNum != DPI_ORACLE_TYPE_NCHAR) {
            if (!njsConnection::MapByName(baton, &queryInfo,
                    vars[i].varTypeNum))
                njsConnection::MapByType(baton, &queryInfo,
                        vars[i].varTypeNum);
        }

        // validate data type and determine size
        if (vars[i].varTypeNum == DPI_ORACLE_TYPE_VARCHAR) {
            vars[i].maxSize = NJS_MAX_FETCH_AS_STRING_SIZE;
            vars[i].nativeTypeNum = DPI_NATIVE_TYPE_BYTES;
        } else vars[i].maxSize = 0;
        switch (queryInfo.oracleTypeNum) {
            case DPI_ORACLE_TYPE_VARCHAR:
            case DPI_ORACLE_TYPE_NVARCHAR:
            case DPI_ORACLE_TYPE_CHAR:
            case DPI_ORACLE_TYPE_NCHAR:
            case DPI_ORACLE_TYPE_RAW:
            case DPI_ORACLE_TYPE_ROWID:
                vars[i].maxSize = queryInfo.clientSizeInBytes;
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
            case DPI_ORACLE_TYPE_NUMBER:
            case DPI_ORACLE_TYPE_NATIVE_INT:
            case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            case DPI_ORACLE_TYPE_CLOB:
            case DPI_ORACLE_TYPE_NCLOB:
            case DPI_ORACLE_TYPE_BLOB:
            case DPI_ORACLE_TYPE_STMT:
                break;
            default:
                baton->error = njsMessages::Get(errUnsupportedDatType);
                return false;
        }

        // create variable and define it
        if (dpiConn_NewVar(dpiConnHandle, vars[i].varTypeNum,
                vars[i].nativeTypeNum, vars[i].maxArraySize, vars[i].maxSize,
                1, 0, queryInfo.objectType, &vars[i].dpiVarHandle,
                &vars[i].dpiVarData) < 0) {
            baton->GetDPIConnError(dpiConnHandle);
            return false;
        }
        if (dpiStmt_Define(dpiStmtHandle, i + 1, vars[i].dpiVarHandle) < 0) {
            baton->GetDPIStmtError(dpiStmtHandle);
            return false;
        }

    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessFetch()
//   Process fetch from DPI statement.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessFetch(njsBaton *baton)
{
    int moreRows;

    if (dpiStmt_FetchRows(baton->dpiStmtHandle, baton->maxRows,
            &baton->bufferRowIndex, &baton->rowsFetched, &moreRows) < 0) {
        baton->GetDPIStmtError(baton->dpiStmtHandle);
        return false;
    }
    baton->repeat = false;
    if (baton->rowsFetched < baton->maxRows && moreRows) {
        baton->repeat = true;
        baton->maxRows -= baton->rowsFetched;
    }
    return ProcessLOBs(baton, baton->queryVars, baton->numQueryVars,
            baton->rowsFetched);
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessLOBs()
//   Process LOBs. This needs to take place in the worker thread since network
// round trips are possible.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessLOBs(njsBaton *baton, njsVariable *vars,
        uint32_t numVars, uint32_t baseNumElements)
{
    uint32_t numElements;

    for (uint32_t col = 0; col < numVars; col++) {
        njsVariable *var = &vars[col];
        if (var->bindDir == NJS_BIND_IN)
            continue;
        njsDataType dataType;
        switch (var->varTypeNum) {
            case DPI_ORACLE_TYPE_CLOB:
            case DPI_ORACLE_TYPE_NCLOB:
                dataType = NJS_DATATYPE_CLOB;
                break;
            case DPI_ORACLE_TYPE_BLOB:
                dataType = NJS_DATATYPE_BLOB;
                break;
            default:
                continue;
        }
        if (baton->isReturning && var->bindDir == NJS_BIND_OUT)
            numElements = baton->rowsAffected;
        else if (!var->isArray)
            numElements = baseNumElements;
        else {
            if (dpiVar_GetNumElementsInArray(var->dpiVarHandle,
                    &numElements) < 0) {
                baton->GetDPIVarError(var->dpiVarHandle);
                return false;
            }
        }
        var->lobs = new njsProtoILob[numElements];
        for (uint32_t row = 0; row < numElements; row++) {
            njsProtoILob *lob = &var->lobs[row];
            lob->dataType = dataType;
            uint32_t elementIndex = baton->bufferRowIndex + row;
            dpiData *data = &var->dpiVarData[elementIndex];
            if (data->isNull)
                continue;
            if (dpiLob_AddRef(data->value.asLOB) < 0) {
                baton->GetDPILobError(lob->dpiLobHandle);
                return false;
            }
            lob->dpiLobHandle = data->value.asLOB;
            if (dpiLob_GetChunkSize(lob->dpiLobHandle, &lob->chunkSize) < 0) {
                baton->GetDPILobError(lob->dpiLobHandle);
                return false;
            }
            if (dpiLob_GetSize(lob->dpiLobHandle, &lob->length) < 0) {
                baton->GetDPILobError(lob->dpiLobHandle);
                return false;
            }
        }
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
                else if (baton->fetchInfo[i].type == NJS_DATATYPE_DEFAULT)
                    targetType = queryInfo->oracleTypeNum;
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
    if (baton->fetchAsStringTypes) {
        switch (queryInfo->oracleTypeNum) {
            case DPI_ORACLE_TYPE_NUMBER:
            case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            case DPI_ORACLE_TYPE_NATIVE_INT:
                for (uint32_t i = 0; i < baton->numFetchAsStringTypes; i++) {
                    if (baton->fetchAsStringTypes[i] == NJS_DATATYPE_NUM) {
                        targetType = DPI_ORACLE_TYPE_VARCHAR;
                        return true;
                    }
                }
                break;
            case DPI_ORACLE_TYPE_DATE:
            case DPI_ORACLE_TYPE_TIMESTAMP:
            case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
            case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
                for (uint32_t i = 0; i < baton->numFetchAsStringTypes; i++) {
                    if (baton->fetchAsStringTypes[i] == NJS_DATATYPE_DATE) {
                        targetType = DPI_ORACLE_TYPE_VARCHAR;
                        return true;
                    }
                }
                break;
            default:
                break;
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
    if (dpiConn_PrepareStmt(baton->dpiConnHandle, 0, baton->sql.c_str(),
            baton->sql.length(), NULL, 0, &baton->dpiStmtHandle) < 0) {
        baton->GetDPIConnError(baton->dpiConnHandle);
        return false;
    }

    // determine statement information
    dpiStmtInfo stmtInfo;
    if (dpiStmt_GetInfo(baton->dpiStmtHandle, &stmtInfo) < 0) {
        baton->GetDPIStmtError(baton->dpiStmtHandle);
        return false;
    }
    baton->isPLSQL = (stmtInfo.isPLSQL) ? true : false;
    baton->isReturning = (stmtInfo.isReturning) ? true : false;

    // result sets are incompatible with non-queries
    if (!stmtInfo.isQuery && baton->getRS) {
        baton->error = njsMessages::Get(errInvalidNonQueryExecution);
        return false;
    }

    // perform any binds necessary
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        int status;
        njsVariable *var = &baton->bindVars[i];
        if (stmtInfo.isReturning && var->bindDir == NJS_BIND_OUT &&
                var->varTypeNum == DPI_ORACLE_TYPE_RAW) {
            baton->error = njsMessages::Get(errBufferReturningInvalid);
            return false;
        }
        if (var->name.empty())
            status = dpiStmt_BindByPos(baton->dpiStmtHandle, var->pos,
                    var->dpiVarHandle);
        else status = dpiStmt_BindByName(baton->dpiStmtHandle,
                var->name.c_str(), var->name.length(), var->dpiVarHandle);
        if (status < 0) {
            baton->GetDPIStmtError(baton->dpiStmtHandle);
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
                Nan::New<v8::String>(var->name.c_str()).ToLocalChecked());
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
                case NJS_DB_TYPE_CHAR:
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
                            Nan::New<v8::Number>(var->scale));
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
// njsConnection::GetRows()
//   Populate rows array with the number of rows fetched into buffers.
//-----------------------------------------------------------------------------
bool njsConnection::GetRows(njsBaton *baton, Local<Object> &rows)
{
    Nan::EscapableHandleScope scope;
    Local<Object> rowAsObj, tempRows;
    Local<Array> rowAsArray;
    Local<Value> val, keyVal;
    uint32_t rowOffset;
    njsVariable *var;

    // check to see if we have any rows from a previous invocation
    Local<Object> origRowsObj = Nan::New(baton->jsRows);
    if (origRowsObj.IsEmpty()) {
        rowOffset = 0;
        tempRows = Nan::New<Array>(baton->rowsFetched);
    } else {
        Local<Array> origRows = Local<Array>::Cast(origRowsObj);
        uint32_t numRows = baton->rowsFetched + origRows->Length();
        tempRows = Nan::New<Array>(numRows);
        for (uint32_t row = 0; row < origRows->Length(); row++) {
            Local<Value> val = Nan::Get(origRows, row).ToLocalChecked();
            Nan::Set(tempRows, row, val);
        }
        rowOffset = origRows->Length();
    }

    // populate rows
    for (uint32_t row = 0; row < baton->rowsFetched; row++) {
        if (baton->outFormat == NJS_ROWS_ARRAY)
            rowAsArray = Nan::New<Array>(baton->numQueryVars);
        else rowAsObj = Nan::New<Object>();
        for (uint32_t col = 0; col < baton->numQueryVars; col++) {
            var = &baton->queryVars[col];
            if (!njsConnection::GetScalarValueFromVar(baton, var, row, val))
                return false;
            if (baton->outFormat == NJS_ROWS_ARRAY)
                Nan::Set(rowAsArray, col, val);
            else {
                keyVal = Nan::New<String>(var->name.c_str(),
                    var->name.length()).ToLocalChecked();
                Nan::Set(rowAsObj, keyVal, val);
            }
        }
        if (baton->outFormat == NJS_ROWS_ARRAY)
            Nan::Set(tempRows, row + rowOffset, rowAsArray);
        else Nan::Set(tempRows, row + rowOffset, rowAsObj);
    }

    rows = scope.Escape(tempRows);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessBinds()
//   Process binds passed through to execute call. A variable is created for
// each one and added to the binds array for processing during the actual
// execution.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessBinds(Nan::NAN_METHOD_ARGS_TYPE args,
        unsigned int index, njsBaton *baton)
{
    Nan::HandleScope scope;
    if (args[index]->IsArray()) {
        Local<Array> bindsArray = Local<Array>::Cast(args[index]);
        return ProcessBindsByPos(bindsArray, baton);
    }
    if (args[index]->IsObject() && !args[index]->IsFunction()) {
        Local<Object> bindsObject = args[index]->ToObject();
        return ProcessBindsByName(bindsObject, baton);
    }
    baton->error = njsMessages::Get(errInvalidParameterType, index);
    return false;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessBindsByName()
//   Get bind variables from JS (by name).
//-----------------------------------------------------------------------------
bool njsConnection::ProcessBindsByName(Handle<Object> bindObj, njsBaton *baton)
{
    Nan::HandleScope scope;
    Local<Array> array = bindObj->GetOwnPropertyNames();

    baton->numBindVars = array->Length();
    baton->bindVars = new njsVariable[baton->numBindVars];
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        njsVariable *var = &baton->bindVars[i];
        Local<String> temp = array->Get(i).As<String>();
        v8::String::Utf8Value v8str(temp->ToString());
        std::string str = std::string(*v8str, v8str.length());
        var->name = ":" + str;
        var->pos = i + 1;
        Local<Value> val = bindObj->Get(temp);
        if (!ProcessBind(val, var, false, baton))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessBindsByPos()
//   Get bind variables from JS (by position).
//-----------------------------------------------------------------------------
bool njsConnection::ProcessBindsByPos(Handle<Array> binds, njsBaton *baton)
{
    Nan::HandleScope scope;

    baton->numBindVars = binds->Length();
    baton->bindVars = new njsVariable[baton->numBindVars];
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        njsVariable *var = &baton->bindVars[i];
        var->pos = i + 1;
        Local<Value> val = binds->Get(i);
        if (!ProcessBind(val, var, true, baton))
            return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessBind()
//   Process bind variable from JS.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessBind(Local<Value> val, njsVariable *var,
        bool byPosition, njsBaton *baton)
{
    Nan::HandleScope scope;
    Local<Value> bindValue;
    uint32_t bindType;

    // default values
    var->bindDir = NJS_BIND_IN;
    var->maxSize = 0;
    var->maxArraySize = 0;
    var->isArray = false;
    bindType = 0;

    // value is an object, get information on the bind variable from it
    if (val->IsObject() && !val->IsDate() && !Buffer::HasInstance(val)) {
        Local<Object> bindUnit = val->ToObject();

        // In case of positional binds, JSON objects are expected to be
        // unnamed.  Named JSON objects gets confused as we look for "dir",
        // "type", and "maxSize" key words, but "name" will not match
        // Array (positional) binds syntax
        //    [ id, name, {type : oracledb.STRING, dir : oracledb.BIND_OUT}]
        // the 3rd parameter is unnamed JSON object.
        // [ id, n, { a: { type : oracledb.STRING, dir : oracledb.BIND_OUT} }]
        // will fail now.
        if (byPosition) {
            Local<Array> keys = bindUnit->GetOwnPropertyNames();
            bool valid = false;
            for (uint32_t i = 0; i < keys->Length(); i++) {
                Local<String> temp = keys->Get(i).As<String>();
                v8::String::Utf8Value utf8str(temp->ToString());
                std::string key = std::string(*utf8str, utf8str.length());
                if (key.compare("dir") == 0 || key.compare("type") == 0 ||
                        key.compare("maxSize") == 0) {
                    valid = true;
                    break;
                }
            }
            if (!valid) {
                baton->error = njsMessages::Get(errNamedJSON);
                return false;
            }
        }

        if (!baton->GetUnsignedIntFromJSON(bindUnit, "dir", 1, &var->bindDir))
            return false;
        if (!baton->GetUnsignedIntFromJSON(bindUnit, "type", 1, &bindType))
            return false;
        if (var->bindDir != NJS_BIND_IN)
            var->maxSize = NJS_MAX_OUT_BIND_SIZE;
        if (!baton->GetUnsignedIntFromJSON(bindUnit, "maxSize", 1,
                &var->maxSize))
            return false;
        if (!baton->GetUnsignedIntFromJSON(bindUnit, "maxArraySize", 1,
                &var->maxArraySize))
            return false;
        if (var->maxArraySize > 0)
            var->isArray = true;
        bindValue =
                bindUnit->Get(Nan::New<v8::String>("val").ToLocalChecked());

    // otherwise, bind value is directly passed and other values are defaults
    } else {
        bindValue = val;
    }

    // REF cursors are only supported as out binds currently
    if (bindType == NJS_DATATYPE_CURSOR && var->bindDir != NJS_BIND_OUT) {
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

    // validate bind type
    if (!bindType || !var->maxSize) {
        uint32_t defaultMaxSize = 0, defaultBindType = 0;
        if (!GetBindTypeAndSizeFromValue(bindValue, &defaultBindType,
                &defaultMaxSize, baton))
            return false;
        if (!bindType)
            bindType = defaultBindType;
        if (!var->maxSize)
            var->maxSize = defaultMaxSize;
    }

    // for IN binds, maxArraySize is ignored and obtained from the actual
    // array size; for INOUT binds, maxArraySize does need to be specified
    // by the application; for OUT binds, the value from the application
    // must be accepted as is as there is no way to validate it
    if (bindValue->IsArray()) {
        var->isArray = true;
        Local<Array> arrayVal = Local<Array>::Cast(bindValue);
        if (var->bindDir != NJS_BIND_OUT && arrayVal->Length() == 0) {
            baton->error = njsMessages::Get(errEmptyArray);
            return false;
        }
        if (var->bindDir == NJS_BIND_IN)
            var->maxArraySize = arrayVal->Length();
        else if (!var->maxArraySize) {
            baton->error = njsMessages::Get(errReqdMaxArraySize);
            return false;
        }
        if (var->bindDir == NJS_BIND_INOUT &&
                arrayVal->Length() > var->maxArraySize) {
            baton->error = njsMessages::Get(errInvalidArraySize);
            return false;
        }
    }

    // validate bind type and determine variable type
    switch (bindType) {
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
            baton->error= njsMessages::Get(errInvalidBindDataType);
            return false;
    }

    // create DPI variable to hold data
    if (!var->isArray)
        var->maxArraySize = 1;
    if (dpiConn_NewVar(baton->dpiConnHandle, var->varTypeNum,
            var->nativeTypeNum, var->maxArraySize, var->maxSize, 1,
            var->isArray, NULL, &var->dpiVarHandle, &var->dpiVarData) < 0) {
        baton->GetDPIConnError(baton->dpiConnHandle);
        return false;
    }

    // for in and in/out binds, copy value into buffers
    switch (var->bindDir) {
        case NJS_BIND_OUT:
            break;
        case NJS_BIND_IN:
        case NJS_BIND_INOUT:
            if (!ProcessBindValue(bindValue, var, baton))
                return false;
            break;
        default:
            baton->error = njsMessages::Get(errInvalidBindDirection);
            return false;
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
        return ProcessScalarBindValue(value, var, 0, baton);

    // only strings and numbers are currently allowed
    if (var->varTypeNum != DPI_ORACLE_TYPE_VARCHAR &&
            var->varTypeNum != DPI_ORACLE_TYPE_NUMBER &&
            var->varTypeNum != DPI_ORACLE_TYPE_NATIVE_INT) {
        baton->error = njsMessages::Get(errInvalidTypeForArrayBind);
        return false;
    }

    // set the number of actual elements in the variable
    Nan::HandleScope scope;
    Local<Array> arrayVal = Local<Array>::Cast(value);
    if (dpiVar_SetNumElementsInArray(var->dpiVarHandle,
            arrayVal->Length()) < 0) {
        baton->GetDPIVarError(var->dpiVarHandle);
        return false;
    }

    // process each element in the array
    for (uint32_t i = 0; i < arrayVal->Length(); i++) {
        Local<Value> elementValue = arrayVal->Get(i);
        if (!ProcessScalarBindValue(elementValue, var, i, baton))
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
        njsVariable *var, uint32_t pos, njsBaton *baton)
{
    Nan::HandleScope scope;
    bool bindOk = false;
    dpiData *data;

    // initialization
    data = &var->dpiVarData[pos];
    data->isNull = 0;

    // nulls and undefined in JS are mapped to NULL in Oracle; no checks needed
    if (value->IsUndefined() || value->IsNull()) {
        data->isNull = 1;
        bindOk = true;

    // value is a string, variable type should be a string
    } else if (value->IsString()) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_VARCHAR);
        if (bindOk) {
            v8::String::Utf8Value utf8str(value);
            if (dpiVar_SetFromBytes(var->dpiVarHandle, pos, *utf8str,
                    utf8str.length()) < 0) {
                baton->GetDPIVarError(var->dpiVarHandle);
                return false;
            }
        }

    // value is an integer
    } else if (value->IsInt32() || value->IsUint32()) {
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_NUMBER);
        if (bindOk) {
            if (var->nativeTypeNum == DPI_NATIVE_TYPE_INT64) {
                if (value->IsInt32())
                    data->value.asInt64 = value->ToInt32()->Value();
                else data->value.asInt64 = value->ToUint32()->Value();
            } else {
                if (value->IsInt32())
                    data->value.asDouble = value->ToInt32()->Value();
                else data->value.asDouble = value->ToUint32()->Value();
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
        bindOk = (var->varTypeNum == DPI_ORACLE_TYPE_RAW);
        if (bindOk) {
            Local<Object> obj = value->ToObject();
            if (dpiVar_SetFromBytes(var->dpiVarHandle, pos, Buffer::Data(obj),
                    Buffer::Length(obj)) < 0) {
                baton->GetDPIVarError(var->dpiVarHandle);
                return false;
            }
        }
    }

    // check bind was successful
    if (!bindOk) {
        njsErrorType errNum;
        if (var->isArray)
            errNum = errIncompatibleTypeArrayBind;
        else errNum = errBindValueAndTypeMismatch;
        baton->error = njsMessages::Get(errNum);
        return false;
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetBindTypeAndSizeFromValue()
//   Get the bind type from the value that has been passed in. If no bind type
// is supported at this point, 0 is returned.
//-----------------------------------------------------------------------------
bool njsConnection::GetBindTypeAndSizeFromValue(Local<Value> value,
        uint32_t *bindType, uint32_t *maxSize, njsBaton *baton,
        bool scalarOnly)
{
    if (value->IsUndefined() || value->IsNull()) {
        *bindType = NJS_DATATYPE_STR;
        *maxSize = 1;
    } else if (value->IsString()) {
        *bindType = NJS_DATATYPE_STR;
        v8::String::Utf8Value utf8str(value->ToString());
        *maxSize = utf8str.length();
    } else if (value->IsInt32() || value->IsUint32()) {
        *bindType = NJS_DATATYPE_INT;
    } else if (value->IsNumber()) {
        *bindType = NJS_DATATYPE_NUM;
    } else if (value->IsDate()) {
        *bindType = NJS_DATATYPE_DATE;
    } else if (value->IsObject() && Buffer::HasInstance(value->ToObject())) {
        *bindType = NJS_DATATYPE_BUFFER;
        *maxSize = Buffer::Length(value->ToObject());
    } else if (!scalarOnly && value->IsArray()) {
        Nan::HandleScope scope;
        Local<Array> arrayVal = Local<Array>::Cast(value);
        Local<Value> element;
        uint32_t elementBindType, elementMaxSize;
        for (uint32_t i = 0; i < arrayVal->Length(); i++) {
            element = arrayVal->Get(i);
            if (element->IsUndefined() || element->IsNull())
                continue;
            if (!GetBindTypeAndSizeFromValue(element, &elementBindType,
                    &elementMaxSize, baton, true))
                return false;
            if (*bindType == 0)
                *bindType = elementBindType;
            else if (*bindType != elementBindType) {
                baton->error = njsMessages::Get(errIncompatibleTypeArrayBind);
                return false;
            }
            if (elementMaxSize > *maxSize)
                *maxSize = elementMaxSize;
        }
    } else {
        baton->error= njsMessages::Get(errInvalidBindDataType);
        return false;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::ProcessOptions()
//   Processing of options. If an error is detected, the baton error is
// populated and false is returned.
//-----------------------------------------------------------------------------
bool njsConnection::ProcessOptions(Nan::NAN_METHOD_ARGS_TYPE args,
        unsigned int index, njsBaton *baton)
{
    Nan::HandleScope scope;

    // an object is expected, not an array
    if (!args[index]->IsObject() || args[index]->IsArray()) {
        baton->error = njsMessages::Get(errInvalidParameterType, index);
        return false;
    }

    // process the basic options
    Local<Object> options = args[index]->ToObject();
    if (!baton->GetUnsignedIntFromJSON(options, "maxRows", 2, &baton->maxRows))
        return false;
    if (!baton->GetUnsignedIntFromJSON(options, "prefetchRows", 2,
            &baton->prefetchRows))
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
    Local<Value> val = options->Get(key);
    if (!val->IsUndefined() && !val->IsNull()) {
        Local<Object> jsFetchInfo = val->ToObject();
        Local<Array> keys = jsFetchInfo->GetOwnPropertyNames();
        if (keys->Length() == 0) {
            baton->error = njsMessages::Get(errEmptyArrayForFetchAs, index);
            return false;
        }
        baton->numFetchInfo = keys->Length();
        baton->fetchInfo = new njsFetchInfo[baton->numFetchInfo];
        for (uint32_t i = 0; i < baton->numFetchInfo; i++) {
            Local<String> temp = keys->Get(i).As<String>();
            v8::String::Utf8Value utf8str(temp->ToString());
            baton->fetchInfo[i].name = std::string(*utf8str, utf8str.length());
            Local<Object> colInfo = jsFetchInfo->Get(temp)->ToObject();
            uint32_t tempType = NJS_DATATYPE_UNKNOWN;
            if (!baton->GetUnsignedIntFromJSON(colInfo, "type", 2, &tempType))
                return false;
            if (tempType == (uint32_t) NJS_DATATYPE_UNKNOWN) {
                baton->error = njsMessages::Get(errNoTypeForConversion);
                return false;
            } else if (tempType != NJS_DATATYPE_DEFAULT &&
                    tempType != NJS_DATATYPE_STR) {
                baton->error = njsMessages::Get(errInvalidTypeForConversion);
                return false;
            }
            baton->fetchInfo[i].type = (njsDataType) tempType;
        }
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
        uint32_t pos, Local<Value> &value)
{
    Nan::EscapableHandleScope scope;
    Local<Value> temp;

    // LOBs make use of the njsProtoILob objects created in the worker thread
    if (var->lobs) {
        njsProtoILob *protoLob = &var->lobs[pos];
        if (!protoLob->dpiLobHandle)
            temp = Nan::Null();
        else {
            Local<Value> argv[1];
            argv[0] = njsILob::CreateFromProtoLob(protoLob);
            Local<Value> key = Nan::New<String>("newLob").ToLocalChecked();
            Local<Object> jsOracledb = Nan::New(baton->jsOracledb);
            Local<Function> fn = Local<Function>::Cast(jsOracledb->Get(key));
            temp = fn->Call(jsOracledb, 1, argv);
        }
        value = scope.Escape(temp);
        return true;
    }

    // get the value from DPI
    uint32_t bufferRowIndex = baton->bufferRowIndex + pos;
    dpiData *data = &var->dpiVarData[bufferRowIndex];

    // transform it to a JS value
    if (data->isNull) {
        value = scope.Escape(Nan::Null());
        return true;
    }
    switch (var->nativeTypeNum) {
        case DPI_NATIVE_TYPE_INT64:
            temp = Nan::New<v8::Integer>( (int) data->value.asInt64);
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
            if (var->varTypeNum == DPI_ORACLE_TYPE_RAW)
                temp = Nan::CopyBuffer(data->value.asBytes.ptr,
                        data->value.asBytes.length).ToLocalChecked();
            else temp = Nan::New<v8::String>(data->value.asBytes.ptr,
                    data->value.asBytes.length).ToLocalChecked();
            break;
        case DPI_NATIVE_TYPE_STMT:
            if (!njsResultSet::CreateFromRefCursor(baton, data->value.asStmt,
                    temp))
                return false;
            break;
        default:
            break;
    }
    value = scope.Escape(temp);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetValueFromVar()
//   Get the value from the DPI variable of the specified type.
//-----------------------------------------------------------------------------
bool njsConnection::GetValueFromVar(njsBaton *baton, njsVariable *var,
        Local<Value> &value)
{
    // scalar values can be handled directly
    if (!var->isArray && !baton->isReturning)
        return GetScalarValueFromVar(baton, var, 0, value);

    // determine number of elements in output array
    uint32_t numElements;
    if (baton->isReturning) {
        if (dpiVar_GetData(var->dpiVarHandle, &var->maxArraySize,
                &var->dpiVarData) < 0) {
            baton->GetDPIVarError(var->dpiVarHandle);
            return false;
        }
        numElements = baton->rowsAffected;
    } else {
        if (dpiVar_GetNumElementsInArray(var->dpiVarHandle,
                &numElements) < 0) {
            baton->GetDPIVarError(var->dpiVarHandle);
            return false;
        }
    }

    // process each element in the array
    Nan::EscapableHandleScope scope;
    Local<Array> arrayVal = Nan::New<Array>(numElements);
    for (uint32_t i = 0; i < numElements; i++) {
        Local<Value> elementValue;
        if (!GetScalarValueFromVar(baton, var, i, elementValue))
            return false;
        Nan::Set(arrayVal, i, elementValue);
    }
    value = scope.Escape(arrayVal);
    return true;
}


//-----------------------------------------------------------------------------
// njsConnection::GetOutBinds()
//   Get the out binds as an object/array.
//-----------------------------------------------------------------------------
Local<Value> njsConnection::GetOutBinds(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    uint32_t numOutBinds;

    // determine the number of out bind variables
    numOutBinds = 0;
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        if (baton->bindVars[i].bindDir != NJS_BIND_IN)
            numOutBinds++;
    }

    // for 0 we return undefined
    if (numOutBinds == 0)
        return scope.Escape(Nan::Undefined());

    // process each of the out bind variables
    bool bindByPos = baton->bindVars[0].name.empty();
    Local<Array> bindArray;
    Local<Object> bindObj;
    Local<Value> val;
    if (bindByPos)
        bindArray = Nan::New<Array>(numOutBinds);
    else bindObj = Nan::New<Object>();
    njsVariable *var;
    uint32_t arrayPos = 0;
    for (uint32_t i = 0; i < baton->numBindVars; i++) {
        var = &baton->bindVars[i];
        if (var->bindDir == NJS_BIND_IN)
            continue;
        if (!GetValueFromVar(baton, var, val))
            return scope.Escape(Nan::Undefined());
        if (bindByPos)
            Nan::Set(bindArray, arrayPos, val);
        else {
            Local<String> key = Nan::New<String>(var->name.c_str() + 1,
                    var->name.length() - 1).ToLocalChecked();
            Nan::Set(bindObj, key, val);
        }
        arrayPos++;
    }

    if (bindByPos)
        return scope.Escape(bindArray);
    return scope.Escape(bindObj);
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
    v8::String::Utf8Value utfstr(value->ToString());
    if ((*setter)(connection->dpiConnHandle, *utfstr, utfstr.length()) < 0) {
        dpiErrorInfo errorInfo;
        dpiConn_GetError(connection->dpiConnHandle, &errorInfo);
        Nan::ThrowError(errorInfo.message);
    }
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

    connection = (njsConnection*) ValidateArgs(info, 2, 4);
    if (!connection)
        return;
    if (!connection->GetStringArg(info, 0, sql))
        return;
    baton = connection->CreateBaton(info);
    if (!baton)
        return;
    baton->sql = sql;
    baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->jsOracledb.Reset(connection->jsOracledb);
    oracledb = baton->GetOracledb();
    baton->maxRows = oracledb->getMaxRows();
    baton->prefetchRows = oracledb->getPrefetchRows();
    oracledb->SetFetchAsStringTypesOnBaton(baton);
    baton->outFormat = oracledb->getOutFormat();
    baton->autoCommit = oracledb->getAutoCommit();
    baton->extendedMetaData = oracledb->getExtendedMetaData();
    baton->getRS = false;
    bool ok = true;
    if (info.Length() > 2)
        ok = ProcessBinds(info, 1, baton);
    if (ok && info.Length() > 3)
        ProcessOptions(info, 2, baton);
    baton->QueueWork("Execute", Async_Execute, Async_AfterExecute, 2);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Execute()
//   Worker function for njsConnection::Execute() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Execute(njsBaton *baton)
{
    uint32_t mode;

    // prepare statement and perform any binds that are needed
    if (!PrepareAndBind(baton))
        return;

    // execute statement
    mode = (baton->autoCommit) ? DPI_MODE_EXEC_COMMIT_ON_SUCCESS :
            DPI_MODE_EXEC_DEFAULT;
    if (dpiStmt_Execute(baton->dpiStmtHandle, mode,
            &baton->numQueryVars) < 0) {
        baton->GetDPIStmtError(baton->dpiStmtHandle);
        return;
    }

    // for queries, perform defines and ensure that rows have been fetched
    if (baton->numQueryVars > 0) {

        // for result sets, use the default array size, if value is zero
        if (baton->getRS && baton->maxRows == 0)
            baton->maxRows = NJS_MAX_ROWS;

        // perform defines
        baton->queryVars = new njsVariable[baton->numQueryVars];
        if (!ProcessDefines(baton, baton->dpiStmtHandle, baton->dpiConnHandle,
                baton->queryVars, baton->numQueryVars))
            return;

        // when not getting a result set, process fetch completely
        if (!baton->getRS) {
            if (!ProcessFetch(baton))
                return;
        }

    // for all other statements, determine the number of rows affected
    // and process any LOBS for out binds, as needed
    } else {
        if (dpiStmt_GetRowCount(baton->dpiStmtHandle,
                &baton->rowsAffected) < 0) {
            baton->GetDPIStmtError(baton->dpiStmtHandle);
            return;
        }
        baton->bufferRowIndex = 0;
        if (!ProcessLOBs(baton, baton->bindVars, baton->numBindVars, 1))
            return;
    }

    // if not getting a result set, we no longer require the statement so
    // release it now
    if (!baton->getRS) {
        if (dpiStmt_Release(baton->dpiStmtHandle) < 0)
            baton->GetDPIStmtError(baton->dpiStmtHandle);
        baton->dpiStmtHandle = NULL;
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

        // return result set, if requested to do so
        if (baton->getRS) {
            Local<Object> resultSet = njsResultSet::CreateFromBaton(baton);
            Nan::Set(result, Nan::New<String>("rows").ToLocalChecked(),
                    Nan::Undefined());
            Nan::Set(result, Nan::New<String>("resultSet").ToLocalChecked(),
                    resultSet);

        // otherwise, return rows 
        } else {
            Local<Object> rows;
            if (!GetRows(baton, rows))
                return;
            Nan::Set(result, Nan::New<v8::String>("rows").ToLocalChecked(),
                    rows);
            Nan::Set(result,
                    Nan::New<v8::String>("resultSet").ToLocalChecked(),
                    Nan::Undefined());
        }

    } else {
        Nan::ForceSet(result,
                Nan::New<v8::String>("outBinds").ToLocalChecked(),
                GetOutBinds(baton), v8::ReadOnly);
        if (baton->isPLSQL)
            Nan::Set(result,
                    Nan::New<v8::String>("rowsAffected").ToLocalChecked(),
                    Nan::Undefined());
        else Nan::ForceSet(result,
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
// njsConnection::Release()
//   Releases the connection from use by JS. LOBs and result sets that are
// still in use will keep the connection open, however, until they have
// completed their work.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsConnection::Release)
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
    baton->QueueWork("Release", Async_Release, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Release()
//   Worker function for njsConnection::Release() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Release(njsBaton *baton)
{
    dpiConn_Release(baton->dpiConnHandle);
    baton->dpiConnHandle = NULL;
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
    baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->QueueWork("Commit", Async_Commit, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Commit()
//   Worker function for njsConnection::Commit() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Commit(njsBaton *baton)
{
    if (dpiConn_Commit(baton->dpiConnHandle) < 0)
        baton->GetDPIConnError(baton->dpiConnHandle);
}


//-----------------------------------------------------------------------------
// njsConnection::Commit()
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
    baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->QueueWork("Rollback", Async_Rollback, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Rollback()
//   Worker function for njsConnection::Rollback() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Rollback(njsBaton *baton)
{
    if (dpiConn_Rollback(baton->dpiConnHandle) < 0)
        baton->GetDPIConnError(baton->dpiConnHandle);
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
    baton->SetDPIConnHandle(connection->dpiConnHandle);
    baton->QueueWork("Break", Async_Break, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsConnection::Async_Break()
//   Worker function for njsConnection::Break() method.
//-----------------------------------------------------------------------------
void njsConnection::Async_Break(njsBaton *baton)
{
    if (dpiConn_BreakExecution(baton->dpiConnHandle) < 0)
        baton->GetDPIConnError(baton->dpiConnHandle);
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
    uint32_t cacheSize;
    if (dpiConn_GetStmtCacheSize(connection->dpiConnHandle, &cacheSize) < 0) {
        dpiErrorInfo errorInfo;
        dpiConn_GetError(connection->dpiConnHandle, &errorInfo);
        Nan::ThrowError(errorInfo.message);
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
    SetTextAttribute(info, "clientId", value, dpiConn_SetClientIdentifier);
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
    SetTextAttribute(info, "module", value, dpiConn_SetModule);
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
    SetTextAttribute(info, "action", value, dpiConn_SetAction);
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
    int versionNum, releaseNum, updateNum, portReleaseNum, portUpdateNum;
    uint32_t releaseStringLength;
    const char *releaseString;
    if (dpiConn_GetServerVersion(connection->dpiConnHandle, &releaseString,
            &releaseStringLength, &versionNum, &releaseNum, &updateNum,
            &portReleaseNum, &portUpdateNum) < 0) {
        dpiErrorInfo errorInfo;
        dpiConn_GetError(connection->dpiConnHandle, &errorInfo);
        Nan::ThrowError(errorInfo.message);
        return;
    }
    uint32_t oracleServerVersion =
            100000000 * versionNum + 1000000 * releaseNum + 10000 * updateNum +
            100 * portReleaseNum + portUpdateNum;
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

