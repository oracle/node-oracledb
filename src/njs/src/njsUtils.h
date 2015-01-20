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
 * NAME
 *   njsUtils.h
 *
 * DESCRIPTION
 *   Utilities 
 *
 *****************************************************************************/

#ifndef __NJSUTILS_H__
#define __NJSUTILS_H__

#include "njsMessages.h"

// User specified data types for binds and defines.
typedef enum
{
  DATA_UNKNOWN  = -1,
  DATA_STR      = 1,
  DATA_NUM      = 2,
  DATA_DATE     = 3
}DataType;

// User specified bind types.
typedef enum 
{
  BIND_UNKNOWN = -1,
  BIND_IN     = 1,
  BIND_INOUT  = 2,
  BIND_OUT    = 3
}BindType;

// outFormat types.
typedef enum
{
  ROWS_UNKNOWN = -1,
  ROWS_ARRAY  = 1,
  ROWS_OBJECT = 2
}RowsType;

// args 
typedef enum 
{
  ARGS_ZERO = 0,
  ARGS_ONE  = 1,
  ARGS_TWO  = 2,
  ARGS_THREE = 3,
  ARGS_FOUR = 4
}ArgsType;


// To be used by NJS_GET_JSON_* macros. 
typedef enum 
{
  VALIDVALUE = 0 ,  // Valid value found for the given key.
  UNDEFINEDVALUE ,  // key is missing or value is undefined.
  NULLVALUE ,       // Null value provided.
  INVALIDTYPE       // Invalid type 
}JSONValueIndicator;

/*
 *  Get the callback from the last argument.
 *  If no args or last arg is not callback, throw exception 
 */
#define NJS_GET_CALLBACK( cb, args )                                          \
{                                                                             \
  string msg;                                                                 \
  if( !args.Length() || !args[(args.Length()-1)]->IsFunction() )              \
  {                                                                           \
    msg = NJSMessages::getErrorMsg ( errMissingCallback );                    \
    NJS_SET_EXCEPTION( msg.c_str(), msg.length() );                           \
    return Undefined();                                                       \
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
#define NJS_SET_EXCEPTION( str, len )                                         \
  ThrowException(v8::Exception::Error(String::New( str, len )));                     

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
 * Get the std string value from JSON for the given key. 
 * If val is undefined or null or key is missing, return ind. 
 * index is the argument index in the caller. 
 * ind will have the state based on the value 
 * DO NOT SET ANY VALUE to val IF NULL OR UNDEFINED
 */ 
#define NJS_GET_STRING_FROM_JSON( val, err, ind, obj, key, index, exitCode )  \
{                                                                             \
  Local<Value> v8value = obj->Get(String::New(key));                          \
  err.clear();                                                                \
  if( v8value->IsString() )                                                   \
  {                                                                           \
    NJSString( val, v8value );                                                \
    ind = VALIDVALUE;                                                         \
  }                                                                           \
  else if( v8value->IsNull() )                                                \
  {                                                                           \
    ind = NULLVALUE;                                                          \
  }                                                                           \
  else if( v8value->IsUndefined() )                                           \
  {                                                                           \
    ind = UNDEFINEDVALUE;                                                     \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    ind = INVALIDTYPE;                                                        \
    err = NJSMessages::getErrorMsg ( errInvalidPropertyTypeInParam,           \
                                     key, index+1 );                          \
    goto exitCode;                                                            \
  }                                                                           \
} 

/*
 * Get the uint value from JSON for the given key. 
 * If val is undefined or null or key is missing, return ind. 
 * index is the argument index in the caller. 
 * ind will have the state based on the value 
 * DO NOT SET ANY VALUE to val IF NULL OR UNDEFINED
 */ 
#define NJS_GET_UINT_FROM_JSON( val, err, ind, obj, key, index, exitCode )    \
{                                                                             \
  Local<Value> v8value = obj->Get(String::New(key));                          \
  err.clear();                                                                \
  if( v8value->IsUint32() )                                                   \
  {                                                                           \
    val = v8value->ToUint32()->Value();                                       \
    ind = VALIDVALUE;                                                         \
  }                                                                           \
  else if( v8value->IsNull() )                                                \
  {                                                                           \
    ind = NULLVALUE;                                                          \
  }                                                                           \
  else if( v8value->IsUndefined() )                                           \
  {                                                                           \
    ind = UNDEFINEDVALUE;                                                     \
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
#define NJS_GET_BOOL_FROM_JSON( val, err, ind, obj, key, index, exitCode )    \
{                                                                             \
  Local<Value> v8value = obj->Get(String::New(key));                          \
  val = v8value->ToBoolean()->Value();                                        \
  ind = VALIDVALUE;                                                           \
} 

/*
 * Convert v8value to std string for properties. 
 * If it not a v8 string, throw exception.
 * prop is the name of the property 
 */ 
#define NJS_SET_PROP_STR( val, v8value, prop )                                \
{                                                                             \
  string msg;                                                                 \
  if( v8value->IsString() )                                                   \
  {                                                                           \
    NJSString( val, v8value );                                                \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    msg = NJSMessages::getErrorMsg ( errInvalidParameterType,                 \
                                     prop );                                  \
    NJS_SET_EXCEPTION( msg.c_str(), msg.length() );                           \
  }                                                                           \
}

/*
 * Convert v8value to unsigned int for properties. 
 * If it not a v8 uint, throw exception.
 * prop is the name of the property 
 */ 
#define NJS_SET_PROP_UINT( val, v8value, prop )                               \
{                                                                             \
  string msg;                                                                 \
  if( v8value->IsUint32() )                                                   \
  {                                                                           \
    val = v8value->ToUint32()->Value();                                       \
  }                                                                           \
  else                                                                        \
  {                                                                           \
    msg = NJSMessages::getErrorMsg ( errInvalidParameterType,                 \
                                     prop );                                  \
    NJS_SET_EXCEPTION( msg.c_str(), msg.length() );                           \
  }                                                                           \
}


#endif                     // ifdef__NJSUTILS_H__

