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
 *  njsILob.h
 *
 * DESCRIPTION
 *  ILob class
 *  ProtoILob class
 *
 ******************************************************************************/

#ifndef __NJSILOB_H__
#define __NJSILOB_H__

#include <node.h>
#include <string>
#include "njsOracle.h"
#include "njsConnection.h"

using namespace v8;
using namespace node;

//-----------------------------------------------------------------------------
// njsProtoILob
//   This is a helper class for ILob's contents to be mostly created in the
// worker thread. Basically, the njsProtoILob class is needed to create the
// attributes of the njsILob object in the worker thread as network round trips
// are required to get the length and the chunk size -- attributes which are
// available on the ILob object -- and no network round trips should be
// performed on the main thread (and Javascript objects cannot be created in
// worker threads).
//-----------------------------------------------------------------------------

class njsProtoILob {
friend class njsILob;
friend class njsConnection;
public:

    njsProtoILob() : dpiLobHandle(NULL), dataType(NJS_DATATYPE_DEFAULT),
            chunkSize(0), length(0), isAutoClose(false) {}
    ~njsProtoILob() {
        if (dpiLobHandle) {
            dpiLob_release(dpiLobHandle);
            dpiLobHandle = NULL;
        }
    }

    bool PopulateFromDPI(njsBaton *baton, dpiLob *dpiLobHandle, bool addRef);

protected:
    dpiLob *dpiLobHandle;
    njsDataType dataType;
    uint32_t chunkSize;
    uint64_t length;
    bool isAutoClose;
};


//-----------------------------------------------------------------------------
// njsILob
//   Class used for wrapping LOBs.
//-----------------------------------------------------------------------------
class njsILob : public njsCommon {
public:
    static void Init(Local<Object> target);
    static Local<Object> CreateFromProtoLob(njsProtoILob *protoLob);
    bool IsValid() const { return (dpiLobHandle) ? true : false; }
    njsErrorType GetInvalidErrorType() const { return errInvalidLob; }
    njsDataType GetDataType() const { return dataType; }
    dpiLob *GetDPILobHandle() const { return dpiLobHandle; }
    bool ClearDPILobHandle(njsBaton *baton);
    static njsILob *GetInstance(Local<Value> val);
    static bool HasInstance(Local<Value> val);

private:
    njsILob() : dpiLobHandle(NULL), dataType(NJS_DATATYPE_DEFAULT),
            bufferPtr(NULL), isAutoClose(false), pieceSize(0), chunkSize(0),
            length(0), offset(0) {}
    ~njsILob() {
        if (dpiLobHandle) {
            dpiLob_release(dpiLobHandle);
            dpiLobHandle = NULL;
        }
        if (bufferPtr) {
            delete [] bufferPtr;
            bufferPtr = NULL;
        }
    }

    static NAN_METHOD(New);

    // Read Method on ILob class
    static NAN_METHOD(Read);
    static void Async_Read(njsBaton *baton);
    static void Async_AfterRead(njsBaton *baton, Local<Value> argv[]);

    // Write Method on ILob class
    static NAN_METHOD(Write);
    static void Async_Write(njsBaton *baton);
    static void Async_AfterWrite(njsBaton *baton, Local<Value> argv[]);

    // Close Method on ILob class
    static NAN_METHOD(Close);
    static void Async_Close(njsBaton *baton);

    // Getters for properties
    static NAN_GETTER(GetChunkSize);
    static NAN_GETTER(GetLength);
    static NAN_GETTER(GetPieceSize);
    static NAN_GETTER(GetOffset);
    static NAN_GETTER(GetType);
    static NAN_GETTER(GetIsAutoClose);
    static NAN_GETTER(GetIsValid);

    // Setters for properties
    static NAN_SETTER(SetChunkSize);
    static NAN_SETTER(SetLength);
    static NAN_SETTER(SetPieceSize);
    static NAN_SETTER(SetOffset);
    static NAN_SETTER(SetType);
    static NAN_SETTER(SetIsAutoClose);
    static NAN_SETTER(SetIsValid);

    // attributes
    dpiLob *dpiLobHandle;
    njsDataType dataType;
    char *bufferPtr;
    bool isAutoClose;
    uint32_t pieceSize;
    uint32_t chunkSize;
    uint64_t length;
    uint64_t offset;

    // Define ILob Constructor
    static Nan::Persistent<FunctionTemplate> iLobTemplate_s;

};

#endif                       /** __NJSILOB_H__ **/
