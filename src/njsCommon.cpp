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
 *   njsCommon.cpp
 *
 * DESCRIPTION
 *   Implementation of common classes used throughout driver.
 *
 *****************************************************************************/

#include "njsCommon.h"
#include "njsOracle.h"
#include "njsIntLob.h"
#include "njsSubscription.h"

using namespace node;
using namespace std;
using namespace v8;

//-----------------------------------------------------------------------------
// njsVariableBuffer::~njsVariableBuffer()
//   Destructor.
//-----------------------------------------------------------------------------
njsVariableBuffer::~njsVariableBuffer()
{
    if (lobs) {
        delete [] lobs;
        lobs = NULL;
    }
    dpiVarData = NULL;
}


//-----------------------------------------------------------------------------
// njsVariable::~njsVariable()
//   Destructor.
//-----------------------------------------------------------------------------
njsVariable::~njsVariable()
{
    if (dpiVarHandle) {
        dpiVar_release(dpiVarHandle);
        dpiVarHandle = NULL;
    }
    if (dmlReturningBuffers) {
        delete [] dmlReturningBuffers;
        dmlReturningBuffers = NULL;
    }
    if (queryVars) {
        delete [] queryVars;
        queryVars = NULL;
    }
}


//-----------------------------------------------------------------------------
// njsVariable::DataType()
//   Return the data type that is being used by the variable. This is an
// enumeration that is publicly available in the oracledb module.
//-----------------------------------------------------------------------------
njsDataType njsVariable::DataType()
{
    switch (varTypeNum) {
        case DPI_ORACLE_TYPE_VARCHAR:
        case DPI_ORACLE_TYPE_NVARCHAR:
        case DPI_ORACLE_TYPE_CHAR:
        case DPI_ORACLE_TYPE_NCHAR:
        case DPI_ORACLE_TYPE_ROWID:
        case DPI_ORACLE_TYPE_LONG_VARCHAR:
            return NJS_DATATYPE_STR;
        case DPI_ORACLE_TYPE_RAW:
        case DPI_ORACLE_TYPE_LONG_RAW:
            return NJS_DATATYPE_BUFFER;
        case DPI_ORACLE_TYPE_NATIVE_FLOAT:
        case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
        case DPI_ORACLE_TYPE_NATIVE_INT:
        case DPI_ORACLE_TYPE_NUMBER:
            return NJS_DATATYPE_NUM;
        case DPI_ORACLE_TYPE_DATE:
        case DPI_ORACLE_TYPE_TIMESTAMP:
        case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
        case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
            return NJS_DATATYPE_DATE;
        case DPI_ORACLE_TYPE_CLOB:
        case DPI_ORACLE_TYPE_NCLOB:
            return NJS_DATATYPE_CLOB;
        case DPI_ORACLE_TYPE_BLOB:
            return NJS_DATATYPE_BLOB;
        default:
            break;
    }
    return NJS_DATATYPE_UNKNOWN;
}


//-----------------------------------------------------------------------------
// njsVariable::DBType()
//   Return the database data type that the variable represents. This is an
// enumeration that is publicly available in the oracledb module.
//-----------------------------------------------------------------------------
njsDBType njsVariable::DBType()
{
    switch (dbTypeNum) {
        case DPI_ORACLE_TYPE_VARCHAR:
            return NJS_DB_TYPE_VARCHAR;
        case DPI_ORACLE_TYPE_NVARCHAR:
            return NJS_DB_TYPE_NVARCHAR;
        case DPI_ORACLE_TYPE_CHAR:
            return NJS_DB_TYPE_CHAR;
        case DPI_ORACLE_TYPE_NCHAR:
          return NJS_DB_TYPE_NCHAR;
        case DPI_ORACLE_TYPE_ROWID:
            return NJS_DB_TYPE_ROWID;
        case DPI_ORACLE_TYPE_RAW:
            return NJS_DB_TYPE_RAW;
        case DPI_ORACLE_TYPE_NATIVE_FLOAT:
            return NJS_DB_TYPE_BINARY_FLOAT;
        case DPI_ORACLE_TYPE_NATIVE_DOUBLE:
            return NJS_DB_TYPE_BINARY_DOUBLE;
        case DPI_ORACLE_TYPE_NATIVE_INT:
        case DPI_ORACLE_TYPE_NUMBER:
            return NJS_DB_TYPE_NUMBER;
        case DPI_ORACLE_TYPE_DATE:
            return NJS_DB_TYPE_DATE;
        case DPI_ORACLE_TYPE_TIMESTAMP:
            return NJS_DB_TYPE_TIMESTAMP;
        case DPI_ORACLE_TYPE_TIMESTAMP_TZ:
            return NJS_DB_TYPE_TIMESTAMP_TZ;
        case DPI_ORACLE_TYPE_TIMESTAMP_LTZ:
            return NJS_DB_TYPE_TIMESTAMP_LTZ;
        case DPI_ORACLE_TYPE_CLOB:
            return NJS_DB_TYPE_CLOB;
        case DPI_ORACLE_TYPE_NCLOB:
          return NJS_DB_TYPE_NCLOB;
        case DPI_ORACLE_TYPE_BLOB:
            return NJS_DB_TYPE_BLOB;
        case DPI_ORACLE_TYPE_LONG_VARCHAR:
            return NJS_DB_TYPE_LONG;
        case DPI_ORACLE_TYPE_LONG_RAW:
            return NJS_DB_TYPE_LONG_RAW;
        default:
            break;
    }
    return NJS_DB_TYPE_UNKNOWN;
}


//-----------------------------------------------------------------------------
// njsBaton::~njsBaton()
//   Destructor.
//-----------------------------------------------------------------------------
njsBaton::~njsBaton()
{
    jsCallback.Reset();
    jsCallingObj.Reset();
    jsOracledb.Reset();
    jsSubscription.Reset();
    jsBuffer.Reset();
    ClearAsyncData();
}


//-----------------------------------------------------------------------------
// njsBaton::CheckJSException()
//   Check for a JavaScript exception in the TryCatch variable. If one is
// found, acquire the message and store it in the baton error so that it will
// be propagated to the callback, then reset the exception so that it will not
// be raised in JavaScript once the C++ method has completed its work.
//-----------------------------------------------------------------------------
void njsBaton::CheckJSException(Nan::TryCatch *tryCatch)
{
    if (tryCatch->HasCaught()) {
        Local<String> message = tryCatch->Message()->Get();
        Nan::Utf8String v8str(message->ToString());
        error = std::string(*v8str, static_cast<size_t>(v8str.length()));
        tryCatch->Reset();
    }
}


//-----------------------------------------------------------------------------
// njsBaton::ClearAsyncData()
//   Clear the baton of everything except for the JavaScript references which
// must be reset in the main thread.
//-----------------------------------------------------------------------------
void njsBaton::ClearAsyncData()
{
    if (dpiPoolHandle) {
        dpiPool_release(dpiPoolHandle);
        dpiPoolHandle = NULL;
    }
    if (dpiConnHandle) {
        dpiConn_release(dpiConnHandle);
        dpiConnHandle = NULL;
    }
    if (dpiStmtHandle) {
        dpiStmt_release(dpiStmtHandle);
        dpiStmtHandle = NULL;
    }
    if (dpiLobHandle) {
        dpiLob_release(dpiLobHandle);
        dpiLobHandle = NULL;
    }
    if (dpiSubscrHandle) {
        dpiSubscr_release(dpiSubscrHandle);
        dpiSubscrHandle = NULL;
    }
    if (bindVars) {
        delete [] bindVars;
        bindVars = NULL;
        numBindVars = 0;
    }
    if (protoILob) {
        delete protoILob;
        protoILob = NULL;
    }
    if (queryVars) {
        delete [] queryVars;
        queryVars = NULL;
        numQueryVars = 0;
    }
    if (fetchInfo) {
        delete [] fetchInfo;
        fetchInfo = NULL;
        numFetchInfo = 0;
    }
    if (fetchAsStringTypes) {
        delete [] fetchAsStringTypes;
        fetchAsStringTypes = NULL;
        numFetchAsStringTypes = 0;
    }
    if (fetchAsBufferTypes) {
        delete [] fetchAsBufferTypes;
        fetchAsBufferTypes = NULL;
        numFetchAsBufferTypes = 0;
    }
    if (batchErrorInfos) {
        delete [] batchErrorInfos;
        batchErrorInfos = NULL;
        numBatchErrorInfos = 0;
    }
}


//-----------------------------------------------------------------------------
// njsBaton::GetOracledb()
//   Return the Oracledb object stored in the baton as a JS object.
//-----------------------------------------------------------------------------
njsOracledb *njsBaton::GetOracledb()
{
    Nan::HandleScope scope;
    Local<Object> obj = Nan::New(jsOracledb);
    return Nan::ObjectWrap::Unwrap<njsOracledb>(obj);
}


//-----------------------------------------------------------------------------
// njsBaton::AsyncWorkCallback()
//   Callback used during asynchronous processing that takes place on a
// separate thread. This simply calls the assigned routine directly, passing
// the baton -- but only if an error has not already taken place. Blocking
// calls should be made here.
//-----------------------------------------------------------------------------
void njsBaton::AsyncWorkCallback(uv_work_t *req)
{
    njsBaton *baton = (njsBaton*) req->data;
    if (baton->error.empty())
        baton->workCallback(baton);
}


//-----------------------------------------------------------------------------
// njsBaton::AsyncAfterWorkCallback()
//   Callback used during asynchronous processing that takes place on the main
// thread after the work on the separate thread has been completed. Blocking
// calls should be avoided. The baton is destroyed after the assigned routine
// is called. Exceptions are caught and a fatal exception is raised in such
// cases.
//-----------------------------------------------------------------------------
void njsBaton::AsyncAfterWorkCallback(uv_work_t *req, int status)
{
    Nan::HandleScope scope;
    njsBaton *baton = (njsBaton*) req->data;
    Nan::TryCatch tc;
    Local<Value> *callbackArgs = new Local<Value>[baton->numCallbackArgs];
    unsigned int i, numCallbackArgs = baton->numCallbackArgs;
    Local<Object> errorObj;

    // set all parameters but the first as undefined; the first parameter is
    // always expected to be the error and should be null
    callbackArgs[0] = Nan::Null();
    for (i = 1; i < numCallbackArgs; i++)
        callbackArgs[i] = Nan::Undefined();

    // if no error so far, call the after work callback, if needed
    if (baton->error.empty() && baton->afterWorkCallback)
        baton->afterWorkCallback(baton, callbackArgs);

    // if we have an error, set it as the first parameter
    // reset all remaining parameters as undefined
    if (!baton->error.empty()) {
        callbackArgs[0] = v8::Exception::Error(Nan::New<v8::String>(
                baton->error).ToLocalChecked());
        if (baton->dpiError) {
            errorObj = callbackArgs[0]->ToObject();
            Nan::Set(errorObj,
                    Nan::New<v8::String>("errorNum").ToLocalChecked(),
                    Nan::New<v8::Number>(baton->errorInfo.code));
            Nan::Set(errorObj, Nan::New<v8::String>("offset").ToLocalChecked(),
                    Nan::New<v8::Number>(baton->errorInfo.offset));
        }
        for (i = 1; i < numCallbackArgs; i++)
            callbackArgs[i] = Nan::Undefined();
    }

    // if this baton is considered the active baton, clear it
    if (baton->callingObj && baton == baton->callingObj->activeBaton)
        baton->callingObj->activeBaton = NULL;

    // delete the baton before the callback is made so any unnecessary
    // ODPI-C handles are released as soon as possible
    Local<Function> callback = Nan::New<Function>(baton->jsCallback);
    delete baton;

    // make JS callback
    Nan::AsyncResource *asyncResource =
            new Nan::AsyncResource("node-oracledb");
    asyncResource->runInAsyncScope(Nan::GetCurrentContext()->Global(),
            callback, static_cast<int>(numCallbackArgs), callbackArgs);
    delete asyncResource;

    // we no longer need the callback args
    delete [] callbackArgs;

    // raise fatal exception if an exception was caught
    if (tc.HasCaught())
        Nan::FatalException(tc);
}


//-----------------------------------------------------------------------------
// njsBaton::GetDPIError()
//   Gets the error information from DPI and stores it in the baton. It then
// clears all information from the baton. This is done here so that there are
// no possible race conditions when errors take place.
//-----------------------------------------------------------------------------
void njsBaton::GetDPIError(void)
{
    dpiContext_getError(njsOracledb::GetDPIContext(), &errorInfo);
    if (errorInfo.code == 1406)
        error = njsMessages::Get(errInsufficientBufferForBinds);
    else {
        error = std::string(errorInfo.message, errorInfo.messageLength);
        dpiError = true;
    }
    ClearAsyncData();
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPIConnHandle()
//   Set the DPI connection handle. This adds a reference to the DPI connection
// which will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPIConnHandle(dpiConn *handle)
{
    if (dpiConn_addRef(handle) < 0)
        GetDPIError();
    else dpiConnHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPIPoolHandle()
//   Set the DPI pool handle. This adds a reference to the DPI pool
// which will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPIPoolHandle(dpiPool *handle)
{
    if (dpiPool_addRef(handle) < 0)
        GetDPIError();
    else dpiPoolHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPIStmtHandle()
//   Set the DPI statement handle. This adds a reference to the DPI statement
// which will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPIStmtHandle(dpiStmt *handle)
{
    if (dpiStmt_addRef(handle) < 0)
        GetDPIError();
    else dpiStmtHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPILobHandle()
//   Set the DPI statement handle. This adds a reference to the DPI LOB which
// will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPILobHandle(dpiLob *handle)
{
    if (dpiLob_addRef(handle) < 0)
        GetDPIError();
    else dpiLobHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPISubscrHandle()
//   Set the DPI subscription handle. This adds a reference to the DPI
// subscription which will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPISubscrHandle(dpiSubscr *handle)
{
    if (dpiSubscr_addRef(handle) < 0)
        GetDPIError();
    else dpiSubscrHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::GetBoolFromJSON()
//   Gets a boolean value from the JSON object for the given key, if possible.
// If undefined, leave value alone. Index is the argument index in the caller.
// It is unused in this method as any argument passed is converted to a boolean
// value and no error is raised; the method signature remains the same, though,
// to match the equivalent string and unsigned integer methods.
//-----------------------------------------------------------------------------
bool njsBaton::GetBoolFromJSON(Local<Object> obj, const char *key, int index,
        bool *value)
{
    Nan::HandleScope scope;
    Local<Value> jsValue;

    if (!error.empty())
        return false;

    MaybeLocal<Value> mval = Nan::Get (obj, Nan::New(key).ToLocalChecked());
    if(!mval.ToLocal(&jsValue))
        return false;

    /* Undefined implies value not provided or equivalent */
    if (!jsValue->IsUndefined()) {
        if(jsValue->IsBoolean()) {
            // Get the boolean value
            *value = jsValue->ToBoolean()->Value();
        }
        else {
            // Non-Boolean value provided, report error
            error = njsMessages::Get ( errInvalidPropertyValueInParam, key,
                                       index + 1 ) ;
            return false;
        }
    }

    return true;
}


//-----------------------------------------------------------------------------
// njsBaton::GetFunctionFromJSON()
//   Gets a function from the JSON object for the given key, if possible. If
// undefined, leave value alone and do not set error; otherwise, set error.
// Index is the argument index in the caller.
//-----------------------------------------------------------------------------
bool njsBaton::GetFunctionFromJSON(Local<Object> obj, const char *key,
        int index, Local<Function> *value)
{
    Nan::EscapableHandleScope scope;
    Local<Value> jsValue;

    if (!error.empty())
        return false;
    MaybeLocal<Value> mval = Nan::Get(obj, Nan::New(key).ToLocalChecked());
    if (!mval.ToLocal(&jsValue))
        return false;
    if (jsValue->IsFunction()) {
        *value = scope.Escape(jsValue.As<Function>());
        return true;
    } else if (jsValue->IsUndefined()) {
        return true;
    }
    error = njsMessages::Get(errInvalidPropertyTypeInParam, key, index + 1);
    return false;
}


//-----------------------------------------------------------------------------
// njsBaton::GetIntFromJSON()
//   Gets a signed integer value from the JSON object for the given key, if
// possible.  If undefined, leave value alone and do not set error; otherwise,
// set error. Index is the argument index in the caller.
//-----------------------------------------------------------------------------
bool njsBaton::GetIntFromJSON(Local<Object> obj, const char *key,
        int index, int32_t *value)
{
    Nan::HandleScope scope;
    Local<Value> jsValue;

    if (!error.empty())
        return false;
    MaybeLocal<Value> mval = Nan::Get(obj, Nan::New(key).ToLocalChecked());
    if (!mval.ToLocal(&jsValue))
        return false;

    if (jsValue->IsInt32()) {
        *value = Nan::To<int32_t>(jsValue).FromJust();
        return true;
    } else if (jsValue->IsUndefined()) {
        return true;
    } else if (jsValue->IsNumber() || jsValue->IsNull()) {
        error = njsMessages::Get(errInvalidPropertyValueInParam, key,
                index + 1);
        return false;
    } else {
        error = njsMessages::Get(errInvalidPropertyTypeInParam, key,
                                 index + 1);
        return false;
    }
}


//-----------------------------------------------------------------------------
// njsBaton::GetPositiveIntFromJSON()
//   Gets a positive integer value from the JSON object for the given key, if
// possible.  If undefined, leave value alone and do not set error; otherwise,
// set error. Index is the argument index in the caller.
//-----------------------------------------------------------------------------
bool njsBaton::GetPositiveIntFromJSON(Local<Object> obj, const char *key,
        int index, uint32_t *value)
{
    uint32_t tempValue = *value;

    if (!GetUnsignedIntFromJSON(obj, key, index, &tempValue))
        return false;
    if (tempValue == 0) {
        error = njsMessages::Get(errInvalidPropertyValueInParam, key,
                index + 1);
        return false;
    }
    *value = tempValue;
    return true;
}


//-----------------------------------------------------------------------------
// njsBaton::GetStringFromJSON()
//   Gets a string value from the JSON object for the given key, if possible.
// If null or undefined, leave value alone and do not set error; otherwise, set
// error. Index is the argument index in the caller.
//-----------------------------------------------------------------------------
bool njsBaton::GetStringFromJSON(Local<Object> obj, const char *key, int index,
        string &value)
{
    Nan::HandleScope scope;
    Local<Value> jsValue;

    if (!error.empty())
        return false;

    MaybeLocal<Value> mval = Nan::Get(obj, Nan::New(key).ToLocalChecked());
    if (!mval.ToLocal (&jsValue))
        return false;

    if (jsValue->IsString()) {
        Nan::Utf8String utf8str(jsValue->ToString());
        value = std::string(*utf8str, static_cast<size_t>(utf8str.length()));
        return true;
    } else if (jsValue->IsUndefined()) {
        return true;
    } else if ( jsValue->IsNull()) {
        error = njsMessages::Get(errInvalidPropertyValueInParam, key,
                               index + 1 );
        return false;
    } else  {
        error = njsMessages::Get(errInvalidPropertyTypeInParam, key,
                                 index + 1);
        return false;
    }
}


//-----------------------------------------------------------------------------
// njsBaton::GetUnsignedIntFromJSON()
//   Gets an unsigned integer value from the JSON object for the given key, if
// possible.  If undefined, leave value alone and do not set error; otherwise,
// set error. Index is the argument index in the caller.
//-----------------------------------------------------------------------------
bool njsBaton::GetUnsignedIntFromJSON(Local<Object> obj, const char *key,
        int index, uint32_t *value)
{
    Nan::HandleScope scope;
    Local<Value> jsValue;

    if (!error.empty())
        return false;

    MaybeLocal<Value> mval = Nan::Get(obj, Nan::New(key).ToLocalChecked());
    if (!mval.ToLocal(&jsValue))
        return false;
    if (jsValue->IsUint32()) {
        *value = Nan::To<uint32_t>(jsValue).FromJust();
        return true;
    } else if (jsValue->IsUndefined()) {
        return true;
    } else if (jsValue->IsNumber() || jsValue->IsNull()) {
        error = njsMessages::Get(errInvalidPropertyValueInParam, key,
                index + 1);
        return false;
    } else {
        error = njsMessages::Get(errInvalidPropertyTypeInParam, key,
                                 index + 1);
        return false;
    }
}


//-----------------------------------------------------------------------------
// njsBaton::GetNumOutBinds()
//   Return the number of in/out and out binds created by the baton.
//-----------------------------------------------------------------------------
uint32_t njsBaton::GetNumOutBinds()
{
    uint32_t numOutBinds = 0;

    for (uint32_t i = 0; i < numBindVars; i++) {
        if (bindVars[i].bindDir != NJS_BIND_IN)
            numOutBinds++;
    }
    return numOutBinds;
}


//-----------------------------------------------------------------------------
// njsBaton::QueueWork()
//   Queue work on a separate thread. The baton is passed as context. If an
// error has already taken place, the work is not queued on a separate thread;
// instead, the after work method is called directly. If an error takes place
// while queuing the work, a JS exception is raised.
//-----------------------------------------------------------------------------
void njsBaton::QueueWork(const char *methodName,
        void (*workCallback)(njsBaton*),
        void (*afterWorkCallback)(njsBaton*, Local<Value>[]),
        unsigned int numCallbackArgs)
{
    this->methodName = methodName;
    this->workCallback = workCallback;
    this->afterWorkCallback = afterWorkCallback;
    this->numCallbackArgs = numCallbackArgs;
    if (uv_queue_work(uv_default_loop(), &req, AsyncWorkCallback,
            AsyncAfterWorkCallback)) {
        delete this;
        string errMsg = njsMessages::Get(errInternalError, "uv_queue_work",
                methodName);
        Nan::ThrowError(errMsg.c_str());
    }
}


//-----------------------------------------------------------------------------
// njsCommon::CreateBaton()
//   Creates a baton for use in asynchronous methods. In each of these cases
// the last argument passed in from JS is expected to be a JS callback. NULL is
// returned and an exception raised for JS if this is not the case.
//-----------------------------------------------------------------------------
njsBaton *njsCommon::CreateBaton(Nan::NAN_METHOD_ARGS_TYPE args)
{
    Nan::HandleScope scope;
    Local<Function> callback;
    njsBaton *baton;

    if (!args.Length() || !args[(args.Length() - 1)]->IsFunction()) {
        string errMsg = njsMessages::Get(errMissingCallback);
        Nan::ThrowError(errMsg.c_str());
        return NULL;
    }
    callback = Local<Function>::Cast(args[args.Length() - 1]);
    baton = new njsBaton(callback, args.Holder());
    if (!IsValid()) {
        njsErrorType errNum = GetInvalidErrorType();
        baton->error = njsMessages::Get(errNum);
    }
    return baton;
}


//-----------------------------------------------------------------------------
// njsCommon::GetObjectArg()
//   Gets an object from the list of arguments. If the argument is not an
// object, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::GetObjectArg(Nan::NAN_METHOD_ARGS_TYPE args,
        int index, Local<Object> &value)
{
    Nan::EscapableHandleScope scope;
    if (!args[index]->IsObject()) {
        string errMsg = njsMessages::Get(errInvalidParameterType, index + 1);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    value = scope.Escape(args[index]->ToObject());
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::GetStringArg()
//   Gets a string from the list of arguments. If the argument is not a
// string, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::GetStringArg(Nan::NAN_METHOD_ARGS_TYPE args,
        int index, std::string &value)
{
    Nan::HandleScope scope;
    if (!args[index]->IsString()) {
        string errMsg = njsMessages::Get(errInvalidParameterType, index + 1);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    Nan::Utf8String utf8str(args[index]->ToString());
    value = std::string(*utf8str, static_cast<size_t>(utf8str.length()));
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::GetUnsignedIntArg()
//   Gets a unsigned integer from the list of arguments. If the argument is not
// a string, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::GetUnsignedIntArg(Nan::NAN_METHOD_ARGS_TYPE args,
        int index, uint32_t *value)
{
    if (!args[index]->IsUint32()) {
        string errMsg = njsMessages::Get(errInvalidParameterType, index + 1);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    *value = Nan::To<uint32_t>(args[index]).FromJust();
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::SetPropBool()
//   Sets a property to a boolean value. If the value is not a boolean, an
// error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::SetPropBool(Local<Value> value, bool *valuePtr,
        const char *name)
{
    if (!value->IsBoolean()) {
        string errMsg = njsMessages::Get(errInvalidPropertyValue, name);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    *valuePtr = value->ToBoolean()->Value();
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::SetPropInt()
//   Sets a property to an integer value. If the value is not an integer, an
// error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::SetPropInt(Local<Value> value, int32_t *valuePtr,
        const char *name)
{
    if (!value->IsInt32()) {
        string errMsg = njsMessages::Get(errInvalidPropertyValue, name);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    *valuePtr = Nan::To<int32_t>(value).FromJust();
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::SetPropPositiveInt()
//   Sets a property to a positive integer value. If the value is not a
// positive integer, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::SetPropPositiveInt(Local<Value> value, uint32_t *valuePtr,
        const char *name)
{
    uint32_t tempValue = *valuePtr;

    if (!SetPropUnsignedInt(value, &tempValue, name))
        return false;
    if (tempValue == 0) {
        string errMsg = njsMessages::Get(errInvalidPropertyValue, name);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    *valuePtr = tempValue;
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::SetPropString()
//   Sets a property to a string value. If the value is not a string, an error
// is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::SetPropString(Local<Value> value, std::string *valuePtr,
        const char *name)
{
    if (!value->IsString()) {
        string errMsg = njsMessages::Get(errInvalidPropertyValue, name);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    Nan::Utf8String utfstr(value->ToString());
    *valuePtr = std::string(*utfstr, static_cast<size_t>(utfstr.length()));
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::SetPropUnsignedInt()
//   Sets a property to an unsigned integer value. If the value is not an
// unsigned integer, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::SetPropUnsignedInt(Local<Value> value, uint32_t *valuePtr,
        const char *name)
{
    if (!value->IsUint32()) {
        string errMsg = njsMessages::Get(errInvalidPropertyValue, name);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    *valuePtr = Nan::To<uint32_t>(value).FromJust();
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::Validate()
//   Validates the pointer is not NULL and that it refers to a valid object.
// If not, an exception is raised in JS.
//-----------------------------------------------------------------------------
bool njsCommon::Validate(njsCommon *obj, bool checkValid)
{
    string errMsg;

    if (!obj) {
        errMsg = njsMessages::Get(errInvalidJSObject);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    if (checkValid && !obj->IsValid()) {
        njsErrorType errNum = obj->GetInvalidErrorType();
        errMsg = njsMessages::Get(errNum);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::ValidateGetter()
//   Ensures that the JS caller is valid and returns the C++ object. NULL is
// returned and an exception raised in JS if this is not true.
//-----------------------------------------------------------------------------
njsCommon *njsCommon::ValidateGetter(Nan::NAN_GETTER_ARGS_TYPE args)
{
    njsCommon *obj;

    obj = Nan::ObjectWrap::Unwrap<njsCommon>(args.Holder());
    if (!Validate(obj, false))      // no exception for invalid object
        return NULL;
    return obj;
}


//-----------------------------------------------------------------------------
// njsCommon::ValidateSetter()
//   Ensures that the JS caller is valid and returns the C++ object. NULL is
// returned and an exception raised in JS if this is not true.
//-----------------------------------------------------------------------------
njsCommon *njsCommon::ValidateSetter(Nan::NAN_SETTER_ARGS_TYPE args)
{
    njsCommon *obj;

    obj = Nan::ObjectWrap::Unwrap<njsCommon>(args.Holder());
    if (!Validate(obj, true))       // raise exception for invalid object
        return NULL;
    return obj;
}


//-----------------------------------------------------------------------------
// njsCommon::ValidateArgs()
//   Validates the correct number of arguments have been passed from JS and
// that the caller is valid. NULL is returned and an exception raised in JS if
// any of these things are not true.
//-----------------------------------------------------------------------------
njsCommon *njsCommon::ValidateArgs(Nan::NAN_METHOD_ARGS_TYPE args,
        int minArgs, int maxArgs)
{
    njsCommon *obj;
    string errMsg;

    obj = Nan::ObjectWrap::Unwrap<njsCommon>(args.Holder());
    if (!obj) {
        errMsg = njsMessages::Get(errInvalidJSObject);
        Nan::ThrowError(errMsg.c_str());
        return NULL;
    }
    if (args.Length() < minArgs || args.Length() > maxArgs) {
        errMsg = njsMessages::Get(errInvalidNumberOfParameters);
        Nan::ThrowError(errMsg.c_str());
        return NULL;
    }

    return obj;
}


//-----------------------------------------------------------------------------
// njsCommon::PropertyIsReadOnly()
//   Raises an exception indicating that the given property is read only.
//-----------------------------------------------------------------------------
void njsCommon::PropertyIsReadOnly(const char *name)
{
    std::string errMsg = njsMessages::Get(errReadOnly, name);
    Nan::ThrowError(errMsg.c_str());
}

