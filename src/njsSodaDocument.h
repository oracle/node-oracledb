/* Copyright (c) 2018, Oracle and/or its affiliates. All rights reserved. */

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
 *   njsSodaDocument.h
 *
 * DESCRIPTION
 *   Connection class implementation.
 *
 *****************************************************************************/

#ifndef __NJSSODADOCUMENT_H__
#define __NJSSODADOCUMENT_H__

#include "njsCommon.h"

class njsSodaDocument : public njsCommon {
public:
    static void Init(Local<Object> target);
    static Local<Object> CreateFromBaton(njsBaton *baton);
    static Local<Object> CreateFromDPIDoc(dpiSodaDoc *doc);
    static Local<Object> CreateArrayFromBaton(njsBaton *baton);

    dpiSodaDoc *GetDPISodaDocHandle() { return dpiSodaDocHandle; }

private:
    static Nan::Persistent<FunctionTemplate> sodaDocTemplate_s;

    static NAN_METHOD(New);

    // Methods
    static NAN_METHOD(GetContentAsString);
    static NAN_METHOD(GetContentAsBuffer);

    // Define Getter Accessor for propertie
    static NAN_GETTER(GetCreatedOn);
    static NAN_GETTER(GetKey);
    static NAN_GETTER(GetLastModified);
    static NAN_GETTER(GetMediaType);
    static NAN_GETTER(GetVersion);

    // Define Setter Accessors for properties
    static NAN_SETTER(SetCreatedOn);
    static NAN_SETTER(SetKey);
    static NAN_SETTER(SetLastModified);
    static NAN_SETTER(SetMediaType);
    static NAN_SETTER(SetVersion);

    bool IsValid() const { return true; }
    njsErrorType GetInvalidErrorType() const { return errSuccess; }

    // Constructor
    njsSodaDocument() : dpiSodaDocHandle(NULL) { }

    // Destructor
    ~njsSodaDocument () {
        if (dpiSodaDocHandle) {
            dpiSodaDoc_release(dpiSodaDocHandle);
            dpiSodaDocHandle = NULL;
        }
    }

    dpiSodaDoc *dpiSodaDocHandle ;  // Soda Document object
};

#endif // __NJSSODADOCUMENT_H__
