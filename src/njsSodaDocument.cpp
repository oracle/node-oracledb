/* Copyright (c) 2018, Oracle and/or its affiliates.  All rights reserved. */

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
 *   njsSodaCollection.cpp
 *
 * DESCRIPTION
 *   SodaCollection class implementation.
 *
 ****************************************************************************/

#include "njsSodaDocument.h"
#include "njsOracle.h"

using namespace std;

// persistent SodaDocument class handle
Nan::Persistent<FunctionTemplate> njsSodaDocument::sodaDocTemplate_s;


//-----------------------------------------------------------------------------
//  njsSodaDocument::Init
//    Initialization function, maps functions and properties from JS to C++
//-----------------------------------------------------------------------------
void njsSodaDocument::Init(Local<Object> target)
{
    Nan::HandleScope scope;

    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(
                                                       njsSodaDocument::New);
    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New<v8::String>("Document").ToLocalChecked());

    // Methods
    Nan::SetPrototypeMethod (tpl, "getContentAsString", GetContentAsString);
    Nan::SetPrototypeMethod (tpl, "getContentAsBuffer", GetContentAsBuffer);


    // Properties
    Nan::SetAccessor(tpl->InstanceTemplate (),
                     Nan::New<v8::String>("createdOn").ToLocalChecked(),
                     njsSodaDocument::GetCreatedOn,
                     njsSodaDocument::SetCreatedOn);
    Nan::SetAccessor(tpl->InstanceTemplate (),
                     Nan::New<v8::String>("key").ToLocalChecked(),
                     njsSodaDocument::GetKey,
                     njsSodaDocument::SetKey);
    Nan::SetAccessor(tpl->InstanceTemplate (),
                     Nan::New<v8::String>("lastModified").ToLocalChecked(),
                     njsSodaDocument::GetLastModified,
                     njsSodaDocument::SetLastModified);
    Nan::SetAccessor(tpl->InstanceTemplate (),
                     Nan::New<v8::String>("mediaType").ToLocalChecked(),
                     njsSodaDocument::GetMediaType,
                     njsSodaDocument::SetMediaType);
    Nan::SetAccessor(tpl->InstanceTemplate (),
                     Nan::New<v8::String>("version").ToLocalChecked (),
                     njsSodaDocument::GetVersion,
                     njsSodaDocument::SetVersion);

    sodaDocTemplate_s.Reset(tpl);
    Nan::Set(target, Nan::New<v8::String>("Document").ToLocalChecked(),
             tpl->GetFunction ());
}


//-----------------------------------------------------------------------------
//  njsSodaDocument::New
//    To allocate a new instance of njsSodaDocument object
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDocument::New)
{
    njsSodaDocument *doc = new njsSodaDocument();
    doc->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}


//-----------------------------------------------------------------------------
// njsSodaDocument::CreateFromBaton()
//   To create an instance of njsSodaDocument object using DPI sodaDoc object
// from baton structure.
//-----------------------------------------------------------------------------
Local<Object> njsSodaDocument::CreateFromBaton(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    Local<Object> obj =
            njsSodaDocument::CreateFromDPIDoc(baton->dpiSodaDocHandle);
    baton->dpiSodaDocHandle = NULL;
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
//  njsSodaDOcument::CreateFromDPIDoc()
//    To create an instance of njsSodaDocument from DPI-document object
//-----------------------------------------------------------------------------
Local<Object> njsSodaDocument::CreateFromDPIDoc(dpiSodaDoc *dpiSodaDocHandle)
{
    Nan::EscapableHandleScope scope;
    njsSodaDocument *doc;
    Local<Function> func;
    Local<Object> obj;

    func = Nan::GetFunction(
             Nan::New<FunctionTemplate>(sodaDocTemplate_s)).ToLocalChecked();
    obj = Nan::NewInstance(func).ToLocalChecked();
    doc = Nan::ObjectWrap::Unwrap<njsSodaDocument>(obj);
    doc->dpiSodaDocHandle = dpiSodaDocHandle;
    return scope.Escape(obj);
}


//-----------------------------------------------------------------------------
//  njsSodaDocument::CreateArrayFromBaton()
//    To create v8::Array object of DPI doc objects
//-----------------------------------------------------------------------------
Local<Object> njsSodaDocument::CreateArrayFromBaton(njsBaton *baton)
{
    Nan::EscapableHandleScope scope;
    Local<Array> docArray;

    docArray = Nan::New<v8::Array>(baton->dpiSodaDocsVec.size());
    for (unsigned int i = 0; i < baton->dpiSodaDocsVec.size(); i++) {
        Local<Object> obj = CreateFromDPIDoc(baton->dpiSodaDocsVec[i]);
        Nan::Set(docArray, i, obj);
    }
    return scope.Escape(docArray);
}


//-----------------------------------------------------------------------------
// njsSodaDOcument::GetContentAsString()
//   To obtain the content of the document as string.  (Synchronous call)
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDocument::GetContentAsString)
{
    njsSodaDocument *doc = (njsSodaDocument*) ValidateArgs(info, 0, 0);
    if (!doc)
        return;

    // get content from ODPI-C document
    const char *value, *encoding;
    uint32_t valueLength;
    if (dpiSodaDoc_getContent(doc->dpiSodaDocHandle, &value, &valueLength,
            &encoding) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }

    // convert to Javascript string
    Local<Value> jsValue;
    if (valueLength == 0) {
        jsValue = Nan::Null();
    } else if (!encoding || strcmp(encoding, "UTF-8") == 0) {
        jsValue = Nan::New<String>(value, valueLength).ToLocalChecked();
    } else {
        uint16_t *utf16Value = (uint16_t*) value;
        int utf16ValueLength = valueLength / 2;
        jsValue = Nan::New<String>(utf16Value,
                utf16ValueLength).ToLocalChecked();
    }
    info.GetReturnValue().Set(jsValue);
}


//----------------------------------------------------------------------------
// njsSodaDOcument::GetContentAsBuffer()
//   To obtain the content of the document as buffer.  (Synchronous call)
//-----------------------------------------------------------------------------
NAN_METHOD(njsSodaDocument::GetContentAsBuffer)
{
    njsSodaDocument *doc = (njsSodaDocument*) ValidateArgs(info, 0, 0);
    if (!doc)
        return;

    // get content from ODPI-C document
    const char *value, *encoding;
    uint32_t valueLength;
    if (dpiSodaDoc_getContent(doc->dpiSodaDocHandle, &value, &valueLength,
            &encoding) < 0) {
        njsOracledb::ThrowDPIError();
        return;
    }

    // convert to Javascript buffer
    Local<Value> jsValue = Nan::CopyBuffer(value,
            valueLength).ToLocalChecked();
    info.GetReturnValue().Set(jsValue);
}


//-----------------------------------------------------------------------------
// njsSodaDocument::GetCreatedOn()
//   Get accessor of "createdOn" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsSodaDocument::GetCreatedOn)
{
    njsSodaDocument *doc = (njsSodaDocument*) ValidateGetter(info);
    if (!doc)
        return;

    const char *createdOn;
    uint32_t createdOnLen;
    if (dpiSodaDoc_getCreatedOn(doc->dpiSodaDocHandle, &createdOn,
            &createdOnLen) < 0)
        return;

    Local<Value> value;
    if (createdOnLen > 0) {
        value = Nan::New<v8::String>(createdOn, createdOnLen).ToLocalChecked();
    } else {
        value = Nan::Null();
    }
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsSodaDocument::SetCreatedOn()
//   Set accessor of "createdOn" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsSodaDocument::SetCreatedOn)
{
    PropertyIsReadOnly("createdOn");
}


//-----------------------------------------------------------------------------
// njsSodaDocument::GetKey()
//   Get accessor of "key" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsSodaDocument::GetKey)
{
    njsSodaDocument *doc = (njsSodaDocument*) ValidateGetter(info);
    if (!doc)
        return;

    const char *key;
    uint32_t keyLen;
    if (dpiSodaDoc_getKey(doc->dpiSodaDocHandle, &key, &keyLen) < 0)
        return;

    Local<Value> value;
    if (keyLen > 0) {
        value = Nan::New<v8::String>(key, keyLen).ToLocalChecked();
    } else {
        value = Nan::Null();
    }
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsSodaDocument::SetKey()
//   Set accessor of "key" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsSodaDocument::SetKey)
{
    PropertyIsReadOnly("key");
}


//-----------------------------------------------------------------------------
// njsSodaDocument::GetLastModified()
//   Get accessor of "lastModified" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsSodaDocument::GetLastModified)
{
    njsSodaDocument *doc = (njsSodaDocument*) ValidateGetter(info);
    if (!doc)
        return;

    const char *lastModified;
    uint32_t lastModifiedLen;
    if (dpiSodaDoc_getLastModified(doc->dpiSodaDocHandle, &lastModified,
            &lastModifiedLen) < 0)
        return;

    Local<Value> value;
    if (lastModifiedLen > 0) {
        value = Nan::New<v8::String>(lastModified,
                lastModifiedLen).ToLocalChecked();
    } else {
        value = Nan::Null();
    }
    info.GetReturnValue().Set(value);
}



//-----------------------------------------------------------------------------
// njsSodaDocument::SetLastModified()
//   Set accessor of "lastModified" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsSodaDocument::SetLastModified)
{
    PropertyIsReadOnly("lastModified");
}


//-----------------------------------------------------------------------------
// njsSodaDocument::GetMediaType()
//   Get accessor of "mediaType" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsSodaDocument::GetMediaType)
{
    njsSodaDocument *doc = (njsSodaDocument*) ValidateGetter(info);
    if (!doc)
        return;

    const char *mediaType;
    uint32_t mediaTypeLen;

    if (dpiSodaDoc_getMediaType(doc->dpiSodaDocHandle, &mediaType,
            &mediaTypeLen) < 0)
        return;

    Local<Value> value;
    if (mediaTypeLen > 0) {
        value = Nan::New<v8::String>(mediaType, mediaTypeLen).ToLocalChecked();
    } else {
        value = Nan::Null();
    }
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsSodaDocument::SetMediaType()
//   Set accessor of "mediaType" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsSodaDocument::SetMediaType)
{
    PropertyIsReadOnly("mediaType");
}


//-----------------------------------------------------------------------------
// njsSodaDocument::GetVersion()
//   Get accessor of "version" property.
//-----------------------------------------------------------------------------
NAN_GETTER(njsSodaDocument::GetVersion)
{
    njsSodaDocument *doc = (njsSodaDocument*) ValidateGetter(info);
    if (!doc)
        return;

    const char *version;
    uint32_t versionLen;

    if (dpiSodaDoc_getVersion(doc->dpiSodaDocHandle, &version,
            &versionLen) < 0)
        return;

    Local<Value> value;
    if (versionLen > 0) {
        value = Nan::New<v8::String>(version, versionLen).ToLocalChecked();
    } else {
        value = Nan::Null();
    }
    info.GetReturnValue().Set(value);
}


//-----------------------------------------------------------------------------
// njsDoaDocument::SetVersion()
//   Set accessor of "version" property.
//-----------------------------------------------------------------------------
NAN_SETTER(njsSodaDocument::SetVersion)
{
    PropertyIsReadOnly("version");
}
