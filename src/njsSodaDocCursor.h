/* Copyright (c) 2018, Oracle and/or its affiliates.  All rights reserved. */

/*****************************************************************************
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
 *  njsSodaDocCurosr.h
 *
 * DESCRIPTION
 *  SODA document cursor class
 *
 *****************************************************************************/

#ifndef __NJSSODADOCCURSOR_H__
#define __NJSSODADOCCURSOR_H__

#include "njsCommon.h"

class njsSodaDocCursor : public njsCommon {
public:
    static void Init (Local<Object> target);
    static Local<Object> CreateFromBaton (njsBaton *baton);

private:
    static NAN_METHOD(New);

    static NAN_METHOD(GetNext);
    static void Async_GetNext(njsBaton *baton);
    static void Async_AfterGetNext(njsBaton *baton, Local<Value> argv[]);

    static NAN_METHOD(Close);
    static void Async_Close(njsBaton *baton);

    bool IsValid() const { return (dpiSodaDocCursorHandle) ? true : false; }

    njsErrorType GetInvalidErrorType() const
            { return errInvalidSodaDocCursor; }

    // constructor
    njsSodaDocCursor() : dpiSodaDocCursorHandle(NULL) { }

    // destructor
    ~njsSodaDocCursor() {
        if (dpiSodaDocCursorHandle)  {
            dpiSodaDocCursor_release(dpiSodaDocCursorHandle);
            dpiSodaDocCursorHandle = NULL;
        }
        jsOracledb.Reset();
    }

    dpiSodaDocCursor *dpiSodaDocCursorHandle;
    Nan::Persistent<Object> jsOracledb;

    static Nan::Persistent<FunctionTemplate> sodaDocCursorTemplate_s;
};

#endif // __NJSSODADOCCURSOR_H__
