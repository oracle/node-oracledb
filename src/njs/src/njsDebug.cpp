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
 *   njsDebug.cpp
 *
 * DESCRIPTION
 *   Debug utilities
 *
 * NOTE
 *   Must be compiled with a USE_NJSDEBUG entry in the PreprocessorDefinitions
 *
 *****************************************************************************/
#include "node.h"
#include <string>
#include "njsDebug.h"

#include <iostream>

using namespace std;
using namespace node;
using namespace v8;

#ifdef USE_NJSDEBUG

#include <stdlib.h>
#include <sstream>
#include <limits>
#include <time.h>

/*****************************************************************************/
/*
  DESCRIPTION
    Get a time in milliseconds as string
   
  PARAMETERS
    ms - Milliseconds elapsed since 00:00 hours, Jan 1, 1970 UTC
    
  RETURNS
    String representation of the time.
*/
std::string NJSDebug::msToString(long double ms)
{
  const long double seconds = ms / 1000.0;

  time_t t = static_cast<time_t>(seconds);

  struct tm* timeptr = gmtime(&t);

  std::ostringstream s;
  if (timeptr != NULL)
  {
    std::string h = asctime(timeptr);
    s << h.substr(0, h.size() - 1);
  }
  else
  {
    s << "Invalid date value: " << ms;
  }

  return s.str();
}

/*****************************************************************************/
/*
  DESCRIPTION
    Get the local v8 value a string
   
  PARAMETERS
    value - Local v8 value
    
  RETURNS
    String representation
*/
std::string NJSDebug::toString(v8::Local<v8::Value> value)
{
  v8::String::Utf8Value utfstr(value->ToString());
  return std::string(*utfstr, utfstr.length());
}

/*****************************************************************************/
/*
  DESCRIPTION
    Get the DpiDataType as string
   
  PARAMETERS
    type - Bind type
    
  RETURNS
    String representation
*/
std::string NJSDebug::bindTypeAsString(dpi::DpiDataType type)
{
    std::ostringstream s;

    switch (type)
    {
      case dpi::DpiVarChar:
        s << "DpiVarChar";
        break;
      case dpi::DpiDouble:
        s << "DpiDouble";
        break;
      case dpi::DpiDate:
        s << "DpiDate";
        break;
    }

    s << "[" << type << "]";

    return s.str();
}

/*****************************************************************************/
/*
  DESCRIPTION
    Dump the local v8 value to the console
   
  PARAMETERS
    name - A title for the dump
    value - The local v8 value
    
  RETURNS
*/
void NJSDebug::dump(const std::string name, v8::Local<v8::Value> value, int indent /*= 0*/)
{
  if (value->IsArray()) {
    std::cout << name << " is an Array with size " << v8::Local<v8::Array>::Cast(value)->Length() << std::endl;

    Local<Array> obj = Local<Array>::Cast(value);
    Local<Array> arr = obj->GetOwnPropertyNames();

    for (unsigned int i = 0; i < arr->Length(); i++)
    {
      Handle<String> tmp = arr->Get(i).As<String>();
      std::string str;
      NJSString(str, tmp);
      Local<Value> val = obj->Get(Nan::New<v8::String>((char*)str.c_str(), (int)str.length()).ToLocalChecked());

      dump(str, val);
    }
  } else if (value->IsObject()) {
    std::cout << name << " is an Object" << std::endl;

    Local<Object> obj  = value->ToObject();
    Local<Array> arr = obj->GetOwnPropertyNames();

    for (unsigned int i = 0; i < arr->Length(); i++)
    {
      Handle<String> tmp = arr->Get(i).As<String>();
      std::string str;
      NJSString(str, tmp);
      Local<Value> val = obj->Get(Nan::New<v8::String>((char*)str.c_str(), (int)str.length()).ToLocalChecked());

      dump(str, val);
    }
  } else if (value->IsString()) {
    std::cout << name<< " is a String \"" << toString(value) << "\"" << std::endl;
  } else if (value->IsNumber()) {
    std::cout << name << " is a Number \"" << value->ToNumber()->Value() << "\"" << std::endl;
  } else if (value->IsInt32()) {
    std::cout << name << " is a Int32 = \"" << value->ToInt32()->Value() << "\"" << std::endl;
  } else if (value->IsNull()) {
    std::cout << name << " is Null" << std::endl;
  } else if (value->IsUndefined()) {
    std::cout << name << " is Undefined" << std::endl;
  }
}

/*****************************************************************************/
/*
  DESCRIPTION
    Dump the bind structure
   
  PARAMETERS
    name - A title for the dump
    bind - The bind structure
    
  RETURNS
*/
void NJSDebug::dump(const std::string title, const Bind* bind)
{
  if (!title.empty())
  {
    std::cout << "=== " << title << " ===" << std::endl;
  }

  std::cout << "   --- bind object ---" << std::endl;
  std::cout << "   key:          '" << bind->key << "'" << std::endl;
  std::cout << "   maxSize:      '" << bind->maxSize << "'" << std::endl;
  std::cout << "   type:         '" << bindTypeAsString(static_cast<dpi::DpiDataType>(bind->type)) << "'" << std::endl;
  std::cout << "   isOut:        '" << bind->isOut << "'" << std::endl;
  std::cout << "   isInOut:      '" << bind->isInOut << "'" << std::endl;
  std::cout << "   isArray:      '" << bind->isArray << "'" << std::endl;
  std::cout << "   maxArraySize: '" << bind->maxArraySize << "'" << std::endl;
  std::cout << "   curArraySize: '" << bind->curArraySize << "'" << std::endl;
  std::cout << "   rowsReturned: '" << bind->rowsReturned << "'" << std::endl;

  char* buffer = 0;
  switch (bind->type)
  {
    case dpi::DpiVarChar:
    case dpi::DpiDouble:
      buffer = reinterpret_cast<char*>(bind->value);
      break;
    case dpi::DpiTimestampLTZ:
      buffer = reinterpret_cast<char*>(bind->extvalue);
      break;
    default:
      return;
  }

  for (unsigned int index = 0; index < bind->curArraySize; index++, buffer += bind->maxSize)
  {
    // Convert the values based on its type
    std::ostringstream s;
    switch (bind->type)
    {
      case dpi::DpiVarChar:
        s << buffer;
        break;
      case dpi::DpiDouble:
        s << *(reinterpret_cast<double*>(buffer));
        break;
      case dpi::DpiTimestampLTZ:
        s << NJSDebug::msToString(*(reinterpret_cast<long double*>(buffer)));
        break;
    }

    std::cout << "   -------------------" << std::endl;
    std::cout << "   index:        '" << index << "'" << std::endl;
    std::cout << "     value/text: '" << s.str() << "'" << std::endl;
    std::cout << "     value:      '" << reinterpret_cast<void*>(bind->value) << "'" << std::endl;
    std::cout << "     extvalue:   '" << reinterpret_cast<void*>(bind->extvalue) << "'" << std::endl;
    std::cout << "     dttmarr:    '" << reinterpret_cast<void*>(bind->dttmarr) << "'" << std::endl;
    std::cout << "     ind:        '" << bind->ind[index] << "'" << std::endl;
    std::cout << "     len:        '" << bind->len[index] << "'" << std::endl;
    std::cout << "     len2:       '" << bind->len2[index] << "'" << std::endl;
  }

  std::cout << "   -------------------" << std::endl;

  std::cout << std::endl << std::flush;
}

#endif // USE_NJSDEBUG
