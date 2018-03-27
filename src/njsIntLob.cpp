/* Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved. */

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
 *   njsIntLob.cpp
 *
 * DESCRIPTION
 *   ILob class implementation.
 *
 *****************************************************************************/


#include <stdlib.h>
#include <iostream>
using namespace std;


#ifndef NODE_BUFFER_H_
# include <node_buffer.h>
#endif


#include "njsIntLob.h"


// peristent ILob class handle
Nan::Persistent<FunctionTemplate> njsILob::iLobTemplate_s;

//-----------------------------------------------------------------------------
// njsILob::Init()
//   Initialization function of ILob class. Maps functions and properties from
// JS to C++.
//-----------------------------------------------------------------------------
void njsILob::Init(Local<Object> target)
{
    Nan::HandleScope scope;

    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("ILob").ToLocalChecked());

    Nan::SetPrototypeMethod(tpl, "close", Close);
    Nan::SetPrototypeMethod(tpl, "read", Read);
    Nan::SetPrototypeMethod(tpl, "write", Write);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("chunkSize").ToLocalChecked(),
            njsILob::GetChunkSize, njsILob::SetChunkSize);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("length").ToLocalChecked(),
            njsILob::GetLength, njsILob::SetLength);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("pieceSize").ToLocalChecked(),
            njsILob::GetPieceSize, njsILob::SetPieceSize);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("offset").ToLocalChecked(),
            njsILob::GetOffset, njsILob::SetOffset);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("type").ToLocalChecked(),
            njsILob::GetType, njsILob::SetType);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("autoCloseLob").ToLocalChecked(),
            njsILob::GetIsAutoClose, njsILob::SetIsAutoClose);

    Nan::SetAccessor(tpl->InstanceTemplate(),
            Nan::New<v8::String>("valid").ToLocalChecked(),
            njsILob::GetIsValid, njsILob::SetIsValid);

    iLobTemplate_s.Reset(tpl);
    Nan::Set(target, Nan::New<v8::String>("ILob").ToLocalChecked(),
            tpl->GetFunction());
}


//-----------------------------------------------------------------------------
// njsILob::CreateFromProtoLob()
//   Create a new LOB from the njsProtoILob instance.
//-----------------------------------------------------------------------------
Local<Object> njsILob::CreateFromProtoLob(njsProtoILob *protoLob)
{
    Nan::EscapableHandleScope scope;
    Local<Function> func;
    Local<Object> obj;
    njsILob *lob;

    func = Nan::GetFunction(
            Nan::New<FunctionTemplate>(iLobTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    lob = Nan::ObjectWrap::Unwrap<njsILob>(obj);
    lob->dpiLobHandle = protoLob->dpiLobHandle;
    protoLob->dpiLobHandle = NULL;
    lob->chunkSize = protoLob->chunkSize;
    lob->pieceSize = protoLob->chunkSize;
    lob->length = protoLob->length;
    lob->dataType = protoLob->dataType;
    lob->isAutoClose = protoLob->isAutoClose;
    lob->activeBaton = NULL;
    lob->offset = 1;
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
// njsILob::GetInstance()
//   Return the instance associated with the value, or NULL if there is no
// instance associated with the value. Javascript code provides the stream;
// this extracts the member iLob instance which is used internally.
//-----------------------------------------------------------------------------
njsILob *njsILob::GetInstance(Local<Value> val)
{
    Nan::HandleScope scope;
    Local<Object> obj = val->ToObject();
    Local <String> key = Nan::New<v8::String>("iLob").ToLocalChecked();
    Local<Value> v8Value = Nan::Get(obj, key).ToLocalChecked();

    if (v8Value->IsObject()) {
        Local<Object> obj = v8Value->ToObject();
        if (Nan::New(iLobTemplate_s)->HasInstance(obj))
            return Nan::ObjectWrap::Unwrap<njsILob>(obj);
    }
    return NULL;
}


//-----------------------------------------------------------------------------
// njsILob::HasInstance()
//   Return boolean indicating if the specified V8 object refers to an ILob
// instance or not.
//-----------------------------------------------------------------------------
bool njsILob::HasInstance(Local<Value> val)
{
    njsILob *lob = GetInstance(val);
    return (lob) ? true : false;
}


//-----------------------------------------------------------------------------
// njsILob::ClearDPILobHandle()
//   Clear the DPI LOB handle. This is done for the IN side of an IN/OUT bind
// once the LOB has been successfully cloned.
//-----------------------------------------------------------------------------
bool njsILob::ClearDPILobHandle(njsBaton *baton)
{
    if (dpiLob_close(dpiLobHandle) < 0) {
        baton->GetDPIError();
        return false;
    }
    dpiLobHandle = NULL;
    return true;
}


//-----------------------------------------------------------------------------
// njsILob::New()
//   Create new object accesible from JS. This is always called from within
// njsILob::CreateFromBaton() and never from any external JS.
//-----------------------------------------------------------------------------
NAN_METHOD(njsILob::New)
{
    njsILob *iLob = new njsILob();
    iLob->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsILob::GetChunkSize()
//   Get accessor of "chunkSize" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsILob::GetChunkSize)
{
    njsILob *lob = (njsILob*) ValidateGetter(info);
    if (lob)
        info.GetReturnValue().Set(lob->chunkSize);
}


//-----------------------------------------------------------------------------
// njsILob::SetChunkSize()
//   Set accessor of "chunkSize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsILob::SetChunkSize)
{
    PropertyIsReadOnly("chunkSize");
}


//-----------------------------------------------------------------------------
// njsILob::GetLength()
//   Get accessor of "length" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsILob::GetLength)
{
    njsILob *lob = (njsILob*) ValidateGetter(info);
    if (lob)
        info.GetReturnValue().Set( (double) lob->length);
}


//-----------------------------------------------------------------------------
// njsILob::SetLength()
//   Set accessor of "length" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsILob::SetLength)
{
    PropertyIsReadOnly("length");
}


//-----------------------------------------------------------------------------
// njsILob::GetPieceSize()
//   Get accessor of "pieceSize" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsILob::GetPieceSize)
{
    njsILob *lob = (njsILob*) ValidateGetter(info);
    if (lob)
        info.GetReturnValue().Set(lob->pieceSize);
}


//-----------------------------------------------------------------------------
// njsILob::SetPieceSize()
//   Set accessor of "pieceSize" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsILob::SetPieceSize)
{
    njsILob *lob = (njsILob*) ValidateSetter(info);
    if (!lob)
        return;
    if (lob->bufferPtr) {
        delete [] lob->bufferPtr;
        lob->bufferPtr = NULL;
    }
    if (!lob->SetPropUnsignedInt(value, &lob->pieceSize, "pieceSize"))
        return;
}


//-----------------------------------------------------------------------------
// njsILob::GetOffset()
//   Get accessor of "offset" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsILob::GetOffset)
{
    njsILob *lob = (njsILob*) ValidateGetter(info);
    if (lob)
        info.GetReturnValue().Set((uint32_t) lob->offset);
}


//-----------------------------------------------------------------------------
// njsILob::SetOffset()
//   Set accessor of "offset" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsILob::SetOffset)
{
    njsILob *lob = (njsILob*) ValidateSetter(info);
    if (!lob)
        return;
    uint32_t offset;
    if (lob->SetPropUnsignedInt(value, &offset, "offset"))
        lob->offset = offset;
}


//-----------------------------------------------------------------------------
// njsILob::GetType()
//   Get accessor of "type" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsILob::GetType)
{
    njsILob *lob = (njsILob*) ValidateGetter(info);
    if (lob)
        info.GetReturnValue().Set(lob->dataType);
}


//-----------------------------------------------------------------------------
// njsILob::SetType()
//   Set accessor of "type" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsILob::SetType)
{
    PropertyIsReadOnly("type");
}


//-----------------------------------------------------------------------------
// njsILob::GetIsAutoClose()
//   Get accessor of "autoCloseLob" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsILob::GetIsAutoClose)
{
    njsILob *lob = (njsILob*) ValidateGetter(info);
    if (lob)
        info.GetReturnValue().Set(lob->isAutoClose);
}


//-----------------------------------------------------------------------------
// njsILob::SetIsAutoClose()
//   Set accessor of "autoCloseLob" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsILob::SetIsAutoClose)
{
    PropertyIsReadOnly("autoCloseLob");
}


//-----------------------------------------------------------------------------
// njsILob::GetIsValid()
//   Get accessor of "valid" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsILob::GetIsValid)
{
    njsILob *lob;

    lob = Nan::ObjectWrap::Unwrap<njsILob>(info.Holder());
    if (!lob) {
        std::string errMsg = njsMessages::Get(errInvalidJSObject);
        Nan::ThrowError(errMsg.c_str());
        return;
    }
    info.GetReturnValue().Set(lob->IsValid());
}


//-----------------------------------------------------------------------------
// njsILob::SetIsValid()
//   Set accessor of "valid" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsILob::SetIsValid)
{
    PropertyIsReadOnly("valid");
}


//-----------------------------------------------------------------------------
// njsILob::Read()
//   Read some data from the LOB.
//
// PARAMETERS
//   - JS callback which will receive (error, data)
//-----------------------------------------------------------------------------
NAN_METHOD(njsILob::Read)
{
    njsBaton *baton;
    njsILob *lob;

    lob = (njsILob*) ValidateArgs(info, 1, 1);
    if (!lob)
        return;
    baton = lob->CreateBaton(info);
    if (!baton)
        return;
    if (lob->activeBaton)
        baton->error = njsMessages::Get(errBusyLob);
    else if (baton->error.empty()) {
        lob->activeBaton = baton;
        if (lob->dataType == NJS_DATATYPE_BLOB)
            baton->bufferSize = lob->pieceSize;
        else if (dpiLob_getBufferSize(lob->dpiLobHandle, lob->pieceSize,
                &baton->bufferSize) < 0)
            baton->GetDPIError();
        if (baton->error.empty()) {
            if (!lob->bufferPtr)
                lob->bufferPtr = new char[baton->bufferSize];
            baton->bufferPtr = lob->bufferPtr;
            baton->SetDPILobHandle(lob->dpiLobHandle);
            baton->lobAmount = lob->pieceSize;
            baton->lobOffset = lob->offset;
        }
    }
    baton->QueueWork("Read", Async_Read, Async_AfterRead, 2);
}


//-----------------------------------------------------------------------------
// njsILob::Async_Read()
//   Worker function for njsILob::Read() method.
//-----------------------------------------------------------------------------
void njsILob::Async_Read(njsBaton *baton)
{
    if (dpiLob_readBytes(baton->dpiLobHandle, baton->lobOffset,
            baton->lobAmount, baton->bufferPtr, &baton->bufferSize) < 0)
        baton->GetDPIError();

    // if an error occurs or the end of the LOB has been reached, and the LOB
    // is marked as one that should be automatically closed, close and release
    // it, ignoring any further errors that occur during the attempt to close
    njsILob *lob = (njsILob*) baton->callingObj;
    if (lob->isAutoClose && (!baton->bufferSize || !baton->error.empty())) {
        dpiLob_close(lob->dpiLobHandle);
        dpiLob_release(lob->dpiLobHandle);
        lob->dpiLobHandle = NULL;
    }
}


//-----------------------------------------------------------------------------
// njsILob::Close()
//   Close the LOB. The reference to the DPI handle is transferred to the baton
// so that it will be cleared automatically upon success and so that the LOB
// is marked as invalid immediately.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsILob::Close)
{
    njsBaton *baton;
    njsILob *lob;

    lob = (njsILob*) ValidateArgs(info, 1, 1);
    if (!lob)
        return;
    baton = lob->CreateBaton(info);
    if (!baton)
        return;
    if (lob->activeBaton)
        baton->error = njsMessages::Get(errBusyLob);
    else {
        baton->dpiLobHandle = lob->dpiLobHandle;
        lob->dpiLobHandle = NULL;
    }
    baton->QueueWork("Close", Async_Close, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsILob::Async_Close()
//   Worker function for njsILob::Close() method. If the attempt to close
// fails, the reference to the DPI handle is transferred back from the baton to
// the LOB.
//-----------------------------------------------------------------------------
void njsILob::Async_Close(njsBaton *baton)
{
    if (dpiLob_close(baton->dpiLobHandle) < 0) {
        njsILob *lob = (njsILob*) baton->callingObj;
        lob->dpiLobHandle = baton->dpiLobHandle;
        baton->dpiLobHandle = NULL;
        baton->GetDPIError();
    }
}


//-----------------------------------------------------------------------------
// njsILob::Async_AfterRead()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsILob::Async_AfterRead(njsBaton *baton, Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    njsILob *lob = (njsILob*) baton->callingObj;

    if (!baton->bufferSize)
        argv[1] = scope.Escape(Nan::Null());
    else if (lob->dataType == NJS_DATATYPE_CLOB) {
        Local<String> strValue = Nan::New<String>(baton->bufferPtr,
                (int) baton->bufferSize).ToLocalChecked();
        lob->offset += strValue->ToString()->Length();
        argv[1] = scope.Escape(strValue);
    } else {
        Local<Value> bufferValue = Nan::CopyBuffer(baton->bufferPtr,
                (uint32_t) baton->bufferSize).ToLocalChecked();
        lob->offset += baton->bufferSize;
        argv[1] = scope.Escape(bufferValue);
    }
}


//-----------------------------------------------------------------------------
// njsILob::Write()
//   Write some data to the LOB.
//
// PARAMETERS
//   - JS callback which will receive (error)
//-----------------------------------------------------------------------------
NAN_METHOD(njsILob::Write)
{
    Local<Object> jsBuffer;
    njsBaton *baton;
    njsILob *lob;

    lob = (njsILob*) ValidateArgs(info, 2, 2);
    if (!lob)
        return;
    if (!lob->GetObjectArg(info, 0, jsBuffer))
        return;
    baton = lob->CreateBaton(info);
    if (!baton)
        return;
    if (lob->activeBaton)
        baton->error = njsMessages::Get(errBusyLob);
    else if (baton->error.empty()) {
        baton->jsBuffer.Reset(jsBuffer);
        baton->bufferPtr = Buffer::Data(jsBuffer);
        baton->bufferSize = Buffer::Length(jsBuffer);
        if (jsBuffer->IsString())
            baton->lobAmount += jsBuffer.As<String>()->Length();
        else baton->lobAmount += baton->bufferSize;
        baton->lobOffset = lob->offset;
        lob->activeBaton = baton;
        baton->SetDPILobHandle(lob->dpiLobHandle);
    }
    baton->QueueWork("Write", Async_Write, Async_AfterWrite, 1);
}


//-----------------------------------------------------------------------------
// njsILob::Async_Write()
//   Worker function for njsILob::Write() method.
//-----------------------------------------------------------------------------
void njsILob::Async_Write(njsBaton *baton)
{
    if (dpiLob_writeBytes(baton->dpiLobHandle, baton->lobOffset,
            baton->bufferPtr, baton->bufferSize) < 0) {
        baton->GetDPIError();

        // if an error occurs and the LOB is marked as one that should be
        // automatically closed, close and release it, ignoring any further
        // errors that occur during the attempt to close
        njsILob *lob = (njsILob*) baton->callingObj;
        if (lob->isAutoClose) {
            dpiLob_close(lob->dpiLobHandle);
            dpiLob_release(lob->dpiLobHandle);
            lob->dpiLobHandle = NULL;
        }
    }
}


//-----------------------------------------------------------------------------
// njsILob::Async_AfterWrite()
//   Sets the offset after writing.
//-----------------------------------------------------------------------------
void njsILob::Async_AfterWrite(njsBaton *baton, Local<Value> argv[])
{
    njsILob *lob = (njsILob*) baton->callingObj;
    lob->offset += baton->lobAmount;
}


//-----------------------------------------------------------------------------
// njsProtoILob::PopulateFromDPI()
//   Populate the proto internal LOB from DPI.
//-----------------------------------------------------------------------------
bool njsProtoILob::PopulateFromDPI(njsBaton *baton, dpiLob *dpiLobHandle,
        bool addRef)
{
    if (addRef && dpiLob_addRef(dpiLobHandle) < 0) {
        baton->GetDPIError();
        return false;
    }
    this->dpiLobHandle = dpiLobHandle;
    if (dpiLob_getChunkSize(dpiLobHandle, &this->chunkSize) < 0) {
        baton->GetDPIError();
        return false;
    }
    if (dpiLob_getSize(dpiLobHandle, &this->length) < 0) {
        baton->GetDPIError();
        return false;
    }
    return true;
}

