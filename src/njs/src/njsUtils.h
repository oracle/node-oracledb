/* Copyright (c) 2015, 2016 Oracle and/or its affiliates.
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
 *   njsUtils.h
 *
 * DESCRIPTION
 *   Utilities
 *
 *****************************************************************************/

#ifndef __NJSUTILS_H__
#define __NJSUTILS_H__

#include <node.h>

#include "nan.h"

#include "njsMessages.h"

// User specified data types for binds and defines.
typedef enum
{
  NJS_DATATYPE_UNKNOWN  = -1,
  NJS_DATATYPE_DEFAULT  = 0,  // Used in FetchInfo Context only, fetch as DB type
  NJS_DATATYPE_STR      = 2001,
  NJS_DATATYPE_NUM      = 2002,
  NJS_DATATYPE_DATE     = 2003,
  NJS_DATATYPE_CURSOR   = 2004,
  NJS_DATATYPE_BUFFER   = 2005,
  NJS_DATATYPE_CLOB     = 2006,
  NJS_DATATYPE_BLOB     = 2007
}DataType;

// User specified bind types.
typedef enum
{
  NJS_BIND_UNKNOWN  = -1,
  NJS_BIND_IN       = 3001,
  NJS_BIND_INOUT    = 3002,
  NJS_BIND_OUT      = 3003
}BindType;

// outFormat types.
typedef enum
{
  NJS_ROWS_UNKNOWN  = -1,
  NJS_ROWS_ARRAY    = 4001,
  NJS_ROWS_OBJECT   = 4002
}RowsType;

// states
typedef enum
{
  NJS_INVALID     = 0,  // Underlying DPI object freed
  NJS_ACTIVE      = 1,  // Object is busy with some operation
  NJS_INACTIVE    = 2,  // Object is free for any operation
  NJSBIND_ACTIVE  = 3,  // Object active as BIND_IN or BIND_INOUT
}State;

// args
typedef enum
{
  NJS_ARGS_ZERO  = 0,
  NJS_ARGS_ONE   = 1,
  NJS_ARGS_TWO   = 2,
  NJS_ARGS_THREE = 3,
  NJS_ARGS_FOUR  = 4
}ArgsType;

// ConnectionBusyStatus status
typedef enum
{
  NJS_CONN_NOT_BUSY     = 0,      // Connection not busy
  NJS_CONN_BUSY_LOB     = 5001,   // Connection busy with LOB operation
  NJS_CONN_BUSY_RS      = 5002,   // Connection busy with ResultSet operation
  NJS_CONN_BUSY_DB      = 5003,   // Connection busy with DB operation
}ConnectionBusyStatus;

/*
 * v8 Value Type
 */
typedef enum
{
  NJS_VALUETYPE_INVALID = -1,                     /* Types not supported now */
  NJS_VALUETYPE_NULL = 0,                               /* Null or Undefined */
  NJS_VALUETYPE_STRING,                                            /* string */
  NJS_VALUETYPE_INTEGER,                                          /* Integer */
  NJS_VALUETYPE_UINTEGER,                                /* Unsigned Integer */
  NJS_VALUETYPE_NUMBER,                                            /* Number */
  NJS_VALUETYPE_DATE,                                                /* Date */
  NJS_VALUETYPE_OBJECT,                                  /* JSON object type */
} ValueType ;


/*
 * This class used to increment LOB, ResultSet and connection operation
 * counts before each operation and decrements after finishing operation
 */
class RefCounter
{
public:
  RefCounter(unsigned int& i)
    : count_(i)
  {
    ++count_;
  }

  ~RefCounter()
  {
    --count_;
  }

private:
   unsigned int& count_;
};

/*
 *  Get the callback from the last argument.
 *  If no args or last arg is not callback, throw exception
 */
#define NJS_GET_CALLBACK( cb, args )                                          \
{                                                                             \
  string errMsg;                                                              \
  if( !args.Length() || !args[(args.Length()-1)]->IsFunction() )              \
  {                                                                           \
    errMsg = NJSMessages::getErrorMsg ( errMissingCallback );                 \
    NJS_SET_EXCEPTION ( errMsg.c_str() );                                     \
    args.GetReturnValue().SetUndefined();                                     \
    return;                                                                   \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    cb = Local<Function>::Cast(args[args.Length()-1]);                        \
  }                                                                           \
}

/*
 * Set v8 exception using passed in char*.
 * Caller is expected to return from the function after calling this macro
 * for the exception to be thrown.
 */
#define NJS_SET_EXCEPTION( str )                                              \
  Nan::ThrowError(str);

/*
 * If arguments are not in given range, set the error.
 */
#define NJS_CHECK_NUMBER_OF_ARGS( err, args, minargs, maxargs, exitCode )     \
{                                                                             \
  if( args.Length() < (minargs) || args.Length() > (maxargs) )                \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidNumberOfParameters ) ;         \
    goto exitCode ;                                                           \
  }                                                                           \
}

/*
 * Convert v8 String to std string
 */
#define NJSString( str, v8value )                                             \
{                                                                             \
  v8::String::Utf8Value utfstr( v8value->ToString() );                        \
  str = std::string( *utfstr, utfstr.length() );                              \
}

/*
 * Get v8 string from provided argument.
 * If it is not a v8 string, set the error for the given index &
 * val is nullified.
 */
#define NJS_GET_ARG_V8STRING( v8val, err, args, index, exitCode)              \
{                                                                             \
  if( args[index]->IsString() )                                               \
  {                                                                           \
    v8val = args[index]->ToString();                                          \
    err.clear();                                                              \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidParameterType, index+1 ) ;     \
    goto exitCode;                                                            \
  }                                                                           \
}

/*
 * Get v8 object from provided argument.
 * If it is not a v8 object, set the error for the given index &
 * val is nullified.
 */
#define NJS_GET_ARG_V8OBJECT( v8val, err, args, index, exitCode)              \
{                                                                             \
  if( args[index]->IsObject() )                                               \
  {                                                                           \
    v8val = args[index]->ToObject();                                          \
    err.clear();                                                              \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidParameterType, index+1 ) ;     \
    goto exitCode ;                                                           \
  }                                                                           \
}

/*
 * Get v8 uint from provided argument.
 * If it is not a uint, set the error for the given index &
 * val is nullified.
 */
#define NJS_GET_ARG_V8UINT( val, err, args, index, exitCode)                  \
{                                                                             \
  if( args[index]->IsUint32() )                                               \
  {                                                                           \
    val = Nan::To<uint32_t> (args[index] ).FromJust();                        \
    err.clear();                                                              \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidParameterType, index+1 ) ;     \
    goto exitCode ;                                                           \
  }                                                                           \
}



/*
 * Get the std string value from JSON for the given key.
 * index is the argument index in the caller.
 * DO NOT SET ANY VALUE to val IF NULL OR UNDEFINED
 */
#define NJS_GET_STRING_FROM_JSON( val, err, obj, key, index, exitCode )       \
{                                                                             \
  Local<Value> v8value = obj->Get(Nan::New<v8::String>(key).ToLocalChecked()); \
  err.clear();                                                                \
  if( v8value->IsString() )                                                   \
  {                                                                           \
    NJSString( val, v8value );                                                \
  }                                                                           \
  else if(v8value->IsUndefined() || v8value->IsNull())                        \
  {                                                                           \
    ;                                                                         \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidPropertyTypeInParam,           \
                                     key, index+1 );                          \
    goto exitCode;                                                            \
  }                                                                           \
}

/*
 * Get the uint value from JSON for the given key.
 * index is the argument index in the caller.
 * DO NOT SET ANY VALUE to val IF NULL OR UNDEFINED
 */
#define NJS_GET_UINT_FROM_JSON( val, err, obj, key, index, exitCode )         \
{                                                                             \
  Local<Value> v8value = obj->Get(Nan::New<v8::String>(key).ToLocalChecked());\
  err.clear();                                                                \
  if( v8value->IsUint32() )                                                   \
  {                                                                           \
    val = Nan::To<uint32_t> (v8value).FromJust ();                            \
  }                                                                           \
  else if(v8value->IsUndefined() || v8value->IsNull () )                      \
  {                                                                           \
    ;                                                                         \
  }                                                                           \
  else if(v8value->IsNumber())                                                \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidPropertyValueInParam,          \
                                     key, index+1 );                          \
    goto exitCode;                                                            \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidPropertyTypeInParam,           \
                                     key, index+1 );                          \
    goto exitCode;                                                            \
  }                                                                           \
}


/*
 * Get the int value from JSON for the given key.
 * index is the argument index in the caller.
 * DO NOT SET ANY VALUE to val IF NULL OR UNDEFINED
 */
#define NJS_GET_INT_FROM_JSON( val, err, obj, key, index, exitCode )          \
{                                                                             \
  Local<Value> v8value = obj->Get(Nan::New<v8::String>(key).ToLocalChecked());\
  err.clear();                                                                \
  if( v8value->IsInt32() )                                                    \
  {                                                                           \
    val = ( Nan::To<int32_t> ( v8value) ).FromJust () ;                         \
  }                                                                           \
  else if(v8value->IsUndefined() || v8value->IsNull ())                       \
  {                                                                           \
    ;                                                                         \
  }                                                                           \
  else if(v8value->IsNumber())                                                \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidPropertyValueInParam,          \
                                     key, index+1 );                          \
    goto exitCode;                                                            \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    err = NJSMessages::getErrorMsg ( errInvalidPropertyTypeInParam,           \
                                     key, index+1 );                          \
    goto exitCode;                                                            \
  }                                                                           \
}


/*
 * Get the boolean value from JSON for the given key.
 * index is the argument index in the caller.
 */
#define NJS_GET_BOOL_FROM_JSON( val, err, obj, key, index, exitCode )         \
{                                                                             \
  Local<Value> v8value = obj->Get(Nan::New<v8::String>(key).ToLocalChecked());\
  if ( !v8value->IsUndefined () && !v8value->IsNull () )                      \
  {                                                                           \
    val = v8value->ToBoolean()->Value();                                      \
  }                                                                           \
}

/*
 * Convert v8value to std string for properties.
 * If it not a v8 string, throw exception.
 * prop is the name of the property
 */
#define NJS_SET_PROP_STR( val, v8value, prop )                                \
{                                                                             \
  string errMsg;                                                              \
  if( v8value->IsString() )                                                   \
  {                                                                           \
    NJSString( val, v8value );                                                \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    errMsg = NJSMessages::getErrorMsg ( errInvalidPropertyValue,              \
                                     prop );                                  \
    NJS_SET_EXCEPTION ( errMsg.c_str() );                                     \
  }                                                                           \
}

/*
 * Convert v8value to unsigned int for properties.
 * If it not a v8 uint, throw exception.
 * prop is the name of the property
 */
#define NJS_SET_PROP_UINT( val, v8value, prop )                               \
{                                                                             \
  string errMsg;                                                              \
  if( v8value->IsUint32() )                                                   \
  {                                                                           \
    val = (Nan::To<uint32_t> (v8value) ).FromJust () ;                        \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    errMsg = NJSMessages::getErrorMsg ( errInvalidPropertyValue,              \
                                     prop );                                  \
    NJS_SET_EXCEPTION ( errMsg.c_str() );                                     \
  }                                                                           \
}

/*
 * Convert v8value to long for properties.
 * If it is not a v8 int, throw exception,
 * prop is the name of the property
 */
#define NJS_SET_PROP_INT(val, v8value, prop )                                 \
{                                                                             \
  string errMsg;                                                              \
  if ( v8value->IsInt32 () )                                                  \
  {                                                                           \
    val = (Nan::To<int32_t> ( v8value ) ).FromJust ();                        \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    errMsg = NJSMessages::getErrorMsg ( errInvalidPropertyValue, prop );      \
    NJS_SET_EXCEPTION ( errMsg.c_str () );                                    \
  }                                                                           \
}


/*
 * Convert v8value to double for properties.
 * If it not a v8 Number, throw exception.
 * prop is the name of the property
 */
#define NJS_SET_PROP_DOUBLE( val, v8value, prop )                             \
{                                                                             \
  string errMsg;                                                              \
  if( v8value->IsNUmber() )                                                   \
  {                                                                           \
    val = v8value->ToNumber()->Value();                                       \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    errMsg = NJSMessages::getErrorMsg ( errInvalidPropertyValue,              \
                                     prop );                                  \
    NJS_SET_EXCEPTION ( errMsg.c_str() );                                     \
  }                                                                           \
}

/*
 * Check if error code indicates the connection is unusable.
 * If the method does not use a connection, pass NULL as connection.
 */
#define NJS_SET_CONN_ERR_STATUS( errNum, conn )                               \
{                                                                             \
  if ( conn != NULL )                                                         \
  {                                                                           \
    ( ( dpi::Conn * ) conn ) -> setErrState ( errNum );                       \
  }                                                                           \
}



/*
 * Check whether the given object from js is valid, if not report error
 */
#define NJS_CHECK_OBJECT_VALID( p )                                           \
{                                                                             \
  if ( !p )                                                                   \
  {                                                                           \
    string error = NJSMessages::getErrorMsg ( errInvalidJSObject );           \
    NJS_SET_EXCEPTION ( error.c_str() );                                      \
    return;                                                                   \
  }                                                                           \
}


/*
 * Check whether the given object from js is valid, if not report error
 * If this is part of NJS_METHOD call(s), set the return value as Undefined
 */
#define NJS_CHECK_OBJECT_VALID2( p, info )                                    \
{                                                                             \
  if ( !p )                                                                   \
  {                                                                           \
    string error = NJSMessages::getErrorMsg ( errInvalidJSObject );           \
    NJS_SET_EXCEPTION ( error.c_str() );                                      \
    info.GetReturnValue ().SetUndefined () ;                                  \
    return;                                                                   \
  }                                                                           \
}



/*
 * Check whether the given object from js is valid, if not report error
 * If invalid, set the error and jump to label
 */
#define NJS_CHECK_OBJECT_VALID3( p, error, label )                            \
{                                                                             \
  if ( !p )                                                                   \
  {                                                                           \
    error = NJSMessages::getErrorMsg ( errInvalidJSObject );                  \
    goto label;                                                               \
  }                                                                           \
}



#endif                     // ifdef__NJSUTILS_H__

