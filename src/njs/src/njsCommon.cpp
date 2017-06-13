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
 *   njsCommon.cpp
 *
 * DESCRIPTION
 *   Implementation of common classes used throughout driver.
 *
 *****************************************************************************/

#include "njsCommon.h"
#include "njsOracle.h"
#include "njsIntLob.h"

using namespace node;
using namespace std;
using namespace v8;

//-----------------------------------------------------------------------------
// njsVariable::~njsVariable()
//   Destructor.
//-----------------------------------------------------------------------------
njsVariable::~njsVariable()
{
    if (dpiVarHandle) {
        dpiVar_Release(dpiVarHandle);
        dpiVarHandle = NULL;
    }
    if (lobs) {
        delete [] lobs;
        lobs = NULL;
    }
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
    jsBuffer.Reset();
    jsRows.Reset();
    if (dpiPoolHandle) {
        dpiPool_Release(dpiPoolHandle);
        dpiPoolHandle = NULL;
    }
    if (dpiConnHandle) {
        dpiConn_Release(dpiConnHandle);
        dpiConnHandle = NULL;
    }
    if (dpiStmtHandle) {
        dpiStmt_Release(dpiStmtHandle);
        dpiStmtHandle = NULL;
    }
    if (dpiLobHandle) {
        dpiLob_Release(dpiLobHandle);
        dpiLobHandle = NULL;
    }
    if (bindVars) {
        delete [] bindVars;
        bindVars = NULL;
    }
    if (!keepQueryInfo) {
        if (queryVars) {
            delete [] queryVars;
            queryVars = NULL;
        }
        if (fetchInfo) {
            delete [] fetchInfo;
            fetchInfo = NULL;
        }
        if (fetchAsStringTypes) {
            delete [] fetchAsStringTypes;
            fetchAsStringTypes = NULL;
        }
    }
}


//-----------------------------------------------------------------------------
// njsBaton::GetCallingObj()
//   Return the C++ object stored in the baton as the JS calling object.
//-----------------------------------------------------------------------------
njsCommon *njsBaton::GetCallingObj()
{
    Nan::HandleScope scope;
    Local<Object> obj = Nan::New(jsCallingObj);
    return Nan::ObjectWrap::Unwrap<njsCommon>(obj);
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
    Local<Value> callbackArgs[baton->numCallbackArgs];
    unsigned int i, numCallbackArgs = baton->numCallbackArgs;

    // set all parameters as undefined
    for (i = 0; i < numCallbackArgs; i++)
        callbackArgs[i] = Nan::Undefined();

    // if no error so far, call the after work callback, if needed
    if (baton->error.empty() && baton->afterWorkCallback)
        baton->afterWorkCallback(baton, callbackArgs);

    // repeat work, if needed
    if (baton->error.empty() && baton->repeat)
        baton->RequeueWork();

    // if we have an error, set it as the first parameter
    // reset all remaining parameters as undefined
    if (!baton->error.empty()) {
        baton->repeat = false;
        callbackArgs[0] = v8::Exception::Error(Nan::New<v8::String>(
                baton->error.c_str()).ToLocalChecked());
        for (i = 1; i < numCallbackArgs; i++)
            callbackArgs[i] = Nan::Undefined();
    }

    // if not repeating work, make JS callback
    if (!baton->repeat) {
        Local<Function> callback = Nan::New<Function>(baton->jsCallback);

        // if this baton is considered the active baton, clear it
        njsCommon *callingObj = baton->GetCallingObj();
        if (callingObj && baton == callingObj->activeBaton)
            callingObj->activeBaton = NULL;

        // we no longer need the baton
        delete baton;

        // make JS callback
        Nan::MakeCallback(Nan::GetCurrentContext()->Global(), callback,
                numCallbackArgs, callbackArgs);
    }

    // raise fatal exception if an exception was caught
    if (tc.HasCaught())
        Nan::FatalException(tc);
}


//-----------------------------------------------------------------------------
// njsBaton::GetDPIConnError()
//   Gets the error information from DPI and stores it in the baton.
//-----------------------------------------------------------------------------
void njsBaton::GetDPIConnError(dpiConn *handle)
{
    dpiErrorInfo errorInfo;

    dpiConn_GetError(handle, &errorInfo);
    error = std::string(errorInfo.message, errorInfo.messageLength);
}


//-----------------------------------------------------------------------------
// njsBaton::GetDPILobError()
//   Gets the error information from DPI and stores it in the baton.
//-----------------------------------------------------------------------------
void njsBaton::GetDPILobError(dpiLob *handle)
{
    dpiErrorInfo errorInfo;

    dpiLob_GetError(handle, &errorInfo);
    error = std::string(errorInfo.message, errorInfo.messageLength);
}


//-----------------------------------------------------------------------------
// njsBaton::GetDPIPoolError()
//   Gets the error information from DPI and stores it in the baton.
//-----------------------------------------------------------------------------
void njsBaton::GetDPIPoolError(dpiPool *handle)
{
    dpiErrorInfo errorInfo;

    dpiPool_GetError(handle, &errorInfo);
    error = std::string(errorInfo.message, errorInfo.messageLength);
}


//-----------------------------------------------------------------------------
// njsBaton::GetDPIStmtError()
//   Gets the error information from DPI and stores it in the baton.
//-----------------------------------------------------------------------------
void njsBaton::GetDPIStmtError(dpiStmt *handle)
{
    dpiErrorInfo errorInfo;

    dpiStmt_GetError(handle, &errorInfo);
    error = std::string(errorInfo.message, errorInfo.messageLength);
}


//-----------------------------------------------------------------------------
// njsBaton::GetDPIVarError()
//   Gets the error information from DPI and stores it in the baton.
//-----------------------------------------------------------------------------
void njsBaton::GetDPIVarError(dpiVar *handle)
{
    dpiErrorInfo errorInfo;

    dpiVar_GetError(handle, &errorInfo);
    error = std::string(errorInfo.message, errorInfo.messageLength);
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPIConnHandle()
//   Set the DPI connection handle. This adds a reference to the DPI connection
// which will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPIConnHandle(dpiConn *handle)
{
    if (dpiConn_AddRef(handle) < 0) {
        GetDPIConnError(handle);
        dpiConnHandle = NULL;
    }
    dpiConnHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPIPoolHandle()
//   Set the DPI pool handle. This adds a reference to the DPI pool
// which will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPIPoolHandle(dpiPool *handle)
{
    if (dpiPool_AddRef(handle) < 0) {
        GetDPIPoolError(handle);
        dpiPoolHandle = NULL;
    }
    dpiPoolHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPIStmtHandle()
//   Set the DPI statement handle. This adds a reference to the DPI statement
// which will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPIStmtHandle(dpiStmt *handle)
{
    if (dpiStmt_AddRef(handle) < 0) {
        GetDPIStmtError(handle);
        dpiStmtHandle = NULL;
    }
    dpiStmtHandle = handle;
}


//-----------------------------------------------------------------------------
// njsBaton::SetDPILobHandle()
//   Set the DPI statement handle. This adds a reference to the DPI LOB which
// will be released in the destructor.
//-----------------------------------------------------------------------------
void njsBaton::SetDPILobHandle(dpiLob *handle)
{
    if (dpiLob_AddRef(handle) < 0) {
        GetDPILobError(handle);
        dpiLobHandle = NULL;
    }
    dpiLobHandle = handle;
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
    jsValue = obj->Get(Nan::New<v8::String>(key).ToLocalChecked());
    if (!jsValue->IsUndefined())
        *value = jsValue->ToBoolean()->Value();
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
    jsValue = obj->Get(Nan::New<v8::String>(key).ToLocalChecked());
    if (jsValue->IsString()) {
        v8::String::Utf8Value utf8str(jsValue->ToString());
        value = std::string(*utf8str, utf8str.length());
        return true;
    } else if (jsValue->IsUndefined() || jsValue->IsNull())
        return true;
    error = njsMessages::Get(errInvalidPropertyTypeInParam, key, index + 1);
    return false;
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
    jsValue = obj->Get(Nan::New<v8::String>(key).ToLocalChecked());
    if (jsValue->IsUint32()) {
        *value = jsValue->ToUint32()->Value();
        return true;
    } else if (jsValue->IsUndefined()) {
        return true;
    } else if (jsValue->IsNumber()) {
        error = njsMessages::Get(errInvalidPropertyValueInParam, key,
                index + 1);
        return false;
    }
    error = njsMessages::Get(errInvalidPropertyTypeInParam, key, index + 1);
    return false;
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
// njsBaton::RequeueWork()
//   Requeue work on a separate thread. It is assumed that the previous
// execution saved anything it needed on the baton.
//-----------------------------------------------------------------------------
void njsBaton::RequeueWork()
{
    if (uv_queue_work(uv_default_loop(), &req, AsyncWorkCallback,
            AsyncAfterWorkCallback))
        error = njsMessages::Get(errInternalError, "uv_queue_work",
                methodName);
}


//-----------------------------------------------------------------------------
// njsCommon::CreatnjsBaton()
//   Creates a baton for use in asynchronous methods. In each of these cases
// the last argument passed in from JS is expected to be a JS callback. NULL is
// returned and an exception raised for JS if this is not the case.
//-----------------------------------------------------------------------------
njsBaton *njsCommon::CreateBaton(Nan::NAN_METHOD_ARGS_TYPE args)
{
    Nan::HandleScope scope;
    Local<Function> callback;

    if (!args.Length() || !args[(args.Length() - 1)]->IsFunction()) {
        string errMsg = njsMessages::Get(errMissingCallback);
        Nan::ThrowError(errMsg.c_str());
        return NULL;
    }
    callback = Local<Function>::Cast(args[args.Length() - 1]);
    return new njsBaton(callback, args.Holder());
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
    v8::String::Utf8Value utf8str(args[index]->ToString());
    value = std::string(*utf8str, utf8str.length());
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::GetUnsignedIntArg()
//   Gets a string from the list of arguments. If the argument is not a
// string, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::GetUnsignedIntArg(Nan::NAN_METHOD_ARGS_TYPE args,
        int index, uint32_t *value)
{
    if (!args[index]->IsUint32()) {
        string errMsg = njsMessages::Get(errInvalidParameterType, index + 1);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    *value = args[index]->ToUint32()->Value();
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::SetPropUnsignedInt()
//   Gets a string from the list of arguments. If the argument is not a
// string, an error is raised and false is returned.
//-----------------------------------------------------------------------------
bool njsCommon::SetPropUnsignedInt(Local<Value> value, uint32_t *valuePtr,
        const char *name)
{
    if (!value->IsUint32()) {
        string errMsg = njsMessages::Get(errInvalidPropertyValue, name);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    *valuePtr = value->ToUint32()->Value();
    return true;
}


//-----------------------------------------------------------------------------
// njsCommon::Validate()
//   Validates the pointer is not NULL and that it refers to a valid object.
// If not, an exception is raised in JS.
//-----------------------------------------------------------------------------
bool njsCommon::Validate(njsCommon *obj)
{
    string errMsg;

    if (!obj) {
        errMsg = njsMessages::Get(errInvalidJSObject);
        Nan::ThrowError(errMsg.c_str());
        return false;
    }
    if (!obj->IsValid()) {
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
    if (!Validate(obj))
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
    if (!Validate(obj))
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
    if (!Validate(obj))
        return NULL;
    if (args.Length() < minArgs || args.Length() > maxArgs) {
        errMsg = njsMessages::Get(errInvalidNumberOfParameters);
        Nan::ThrowError(errMsg.c_str());
        return NULL;
    }

    return obj;
}


//-----------------------------------------------------------------------------
// njsCommon::ValidateArgs()
//   Raises an exception indicating that the given property is read only.
//-----------------------------------------------------------------------------
void njsCommon::PropertyIsReadOnly(const char *name)
{
    std::string errMsg = njsMessages::Get(errReadOnly, name);
    Nan::ThrowError(errMsg.c_str());
}

