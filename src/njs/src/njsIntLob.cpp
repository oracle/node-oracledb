/* Copyright (c) 2015, Oracle and/or its affiliates. All rights reserved. */

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
void njsILob::Init(Handle<Object> target)
{
    Nan::HandleScope scope;

    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("ILob").ToLocalChecked());

    Nan::SetPrototypeMethod(tpl, "release", Release);
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
    Local<FunctionTemplate> lft;
    Local<Object> obj;
    njsILob *lob;

    lft = Nan::New<FunctionTemplate>(iLobTemplate_s);
    obj = lft->GetFunction()->NewInstance();
    lob = Nan::ObjectWrap::Unwrap<njsILob>(obj);
    lob->dpiLobHandle = protoLob->dpiLobHandle;
    protoLob->dpiLobHandle = NULL;
    lob->chunkSize = protoLob->chunkSize;
    lob->pieceSize = protoLob->chunkSize;
    lob->length = protoLob->length;
    lob->dataType = protoLob->dataType;
    lob->activeBaton = NULL;
    lob->offset = 1;
    return scope.Escape(obj);
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
// njsILob::Release()
//   Release the LOB handle immediately instead of when the object is garbage
// collected.
//
// PARAMETERS
//   - none
//-----------------------------------------------------------------------------
NAN_METHOD(njsILob::Release)
{
    njsILob *lob = (njsILob*) ValidateArgs(info, 0, 0);
    if (!lob)
        return;
    dpiLob_release(lob->dpiLobHandle);
    lob->dpiLobHandle = NULL;
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
    else {
        lob->activeBaton = baton;
        if (lob->dataType == NJS_DATATYPE_BLOB)
            baton->bufferSize = lob->pieceSize;
        else if (dpiLob_getBufferSize(lob->dpiLobHandle, lob->pieceSize,
                &baton->bufferSize) < 0)
            baton->GetDPIError();
        if (!lob->bufferPtr)
            lob->bufferPtr = new char[baton->bufferSize];
        baton->bufferPtr = lob->bufferPtr;
        baton->SetDPILobHandle(lob->dpiLobHandle);
        baton->lobAmount = lob->pieceSize;
        baton->lobOffset = lob->offset;
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
}


//-----------------------------------------------------------------------------
// njsILob::Async_AfterRead()
//   Returns result to JS by invoking JS callback.
//-----------------------------------------------------------------------------
void njsILob::Async_AfterRead(njsBaton *baton, Local<Value> argv[])
{
    Nan::EscapableHandleScope scope;
    njsILob *lob = (njsILob*) baton->GetCallingObj();

    if (!baton->bufferSize)
        argv[1] = scope.Escape(Nan::Null());
    else if (lob->dataType == NJS_DATATYPE_CLOB) {
        Local<String> strValue = Nan::New<String>(baton->bufferPtr,
                baton->bufferSize).ToLocalChecked();
        lob->offset += strValue->ToString()->Length();
        argv[1] = scope.Escape(strValue);
    } else {
        Local<Value> bufferValue = Nan::CopyBuffer(baton->bufferPtr,
                baton->bufferSize).ToLocalChecked();
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
    else {
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
    baton->QueueWork("Write", Async_Write, NULL, 1);
}


//-----------------------------------------------------------------------------
// njsILob::Async_Write()
//   Worker function for njsILob::Write() method.
//-----------------------------------------------------------------------------
void njsILob::Async_Write(njsBaton *baton)
{
    if (dpiLob_writeBytes(baton->dpiLobHandle, baton->lobOffset,
            baton->bufferPtr, baton->bufferSize) < 0)
        baton->GetDPIError();
}


//-----------------------------------------------------------------------------
// njsILob::Async_AfterWrite()
//   Sets the offset after writing.
//-----------------------------------------------------------------------------
void njsILob::Async_AfterWrite(njsBaton *baton, Local<Value> argv[])
{
    njsILob *lob = (njsILob*) baton->GetCallingObj();
    lob->offset += baton->lobAmount;
}

