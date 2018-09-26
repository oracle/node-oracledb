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
 *   njsUtils.cpp
 *
 * DESCRIPTION
 *   Implementation of Utility class.
 *
 *****************************************************************************/

#include "njsCommon.h"
#include "njsSodaDocument.h"
#include "njsUtils.h"

using namespace node;
using namespace std;
using namespace v8;

//-----------------------------------------------------------------------------
// njsUtils::GetIntFromJSON()
//   Gets a signed integer value from the JSON object for the given key, if
// possible. If null or undefined, leave value alone and do not set error;
// otherwise, set error. Index is the argument index in the caller.
//-----------------------------------------------------------------------------
bool njsUtils::GetIntFromJSON(Local<Object> obj, const char *key, int index,
        int32_t *value, string &error)
{
    Nan::HandleScope scope;
    Local<Value> jsValue;

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
// njsUtils::GetStringFromJSON()
//   Gets a string value from the JSON object for the given key, if possible.
// If null or undefined, leave value alone and do not set error; otherwise, set
// error. Index is the argument index in the caller.
//-----------------------------------------------------------------------------
bool njsUtils::GetStringFromJSON(Local<Object> obj, const char *key, int index,
        string &value, string &error)
{
    Nan::HandleScope scope;
    Local<Value> jsValue;

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
// njsUtils::GetStringArrayFromJSON()
//   Utility function to obtain a string array (std::vector<std::string> from
// JSON for a given key. Index is used to repoprt error if any.
//----------------------------------------------------------------------------
bool njsUtils::GetStringArrayFromJSON(Local<Object> obj, const char *key,
        int index, std::vector<string> &vec, string &error)
{
    Nan::HandleScope scope;
    Local<Value> jsValue;

    MaybeLocal<Value> mval = Nan::Get(obj, Nan::New(key).ToLocalChecked());
    if (!mval.ToLocal(&jsValue))
        return false;

    if (jsValue->IsArray()) {
        // The value is expected to be an array (of strings).  This is
        // validated in js layer
        Local<Array> array = jsValue.As<Array>();
        for (uint32_t i = 0; i < array->Length(); i++) {
            Nan::Utf8String utf8str(Nan::Get(array,
                    i).ToLocalChecked()->ToString());
            vec.push_back(std::string(*utf8str,
                    static_cast<size_t>(utf8str.length())));
        }
    } else if (jsValue->IsUndefined()) {
        return true;
    } else if (jsValue->IsNull()) {
        error = njsMessages::Get(errInvalidPropertyValueInParam, key,
                index + 1);
        return false;
    }
    return true;
}
