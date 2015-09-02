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
 *   njsConnection.cpp
 *
 * DESCRIPTION
 *   Connection class implementation.
 *
 *****************************************************************************/

#include "njsConnection.h"
#include "njsResultSet.h"
#include "njsIntLob.h"
#include <stdlib.h>
#include <iostream>
using namespace std;

// persistent Connection class handle
Persistent<FunctionTemplate> Connection::connectionTemplate_s;

// default value for bind option maxSize
#define NJS_MAX_OUT_BIND_SIZE 200

// max number of bytes for data converted to string with fetchAsString or fetchInfo
#define NJS_MAX_FETCH_AS_STRING_SIZE 200

// number of rows prefetched by non-ResultSet queries
#define NJS_PREFETCH_NON_RESULTSET 2 

// max byte size for a AL32UTF8 char is 4
#define NJS_CHAR_CONVERSION_RATIO 4

/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the Connection class.
 */
Connection::Connection()
{
   dpiconn_   = (dpi::Conn *)0;
   oracledb_  = (Oracledb *)0;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the Connection class.
 */
Connection::~Connection()
{}

/*****************************************************************************/
/*
   DESCRIPTION
     Initialize connection attributes after forming it.

   PARAMETERS:
     DPI Connection, Oracledb reference
*/
void Connection::setConnection(dpi::Conn* dpiconn, Oracledb* oracledb)
{
   this->dpiconn_  = dpiconn;
   this->isValid_  = true;
   this->oracledb_ = oracledb;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Init function of the Connection class.
     Initiates and maps the functions and properties of Connection class.
*/
void Connection::Init(Handle<Object> target)
{
  NanScope();

  Local<FunctionTemplate> tpl = NanNew<FunctionTemplate>(New);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  tpl->SetClassName(NanNew<v8::String>("Connection"));

  NODE_SET_PROTOTYPE_METHOD(tpl, "execute", Execute);
  NODE_SET_PROTOTYPE_METHOD(tpl, "release", Release);
  NODE_SET_PROTOTYPE_METHOD(tpl, "commit", Commit);
  NODE_SET_PROTOTYPE_METHOD(tpl, "rollback", Rollback);
  NODE_SET_PROTOTYPE_METHOD(tpl, "break", Break);
  NODE_SET_PROTOTYPE_METHOD(tpl, "getLob", GetLob);

  tpl->InstanceTemplate()->SetAccessor(
                                              NanNew<v8::String>("stmtCacheSize"),
                                              Connection::GetStmtCacheSize,
                                              Connection::SetStmtCacheSize );
  tpl->InstanceTemplate()->SetAccessor(
                                              NanNew<v8::String>("clientId"),
                                              Connection::GetClientId,
                                              Connection::SetClientId );
  tpl->InstanceTemplate()->SetAccessor(
                                              NanNew<v8::String>("module"),
                                              Connection::GetModule,
                                              Connection::SetModule );
  tpl->InstanceTemplate()->SetAccessor(
                                              NanNew<v8::String>("action"),
                                              Connection::GetAction,
                                              Connection::SetAction );

  NanAssignPersistent( connectionTemplate_s, tpl);
  target->Set(NanNew<v8::String>("Connection"),tpl->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of connection is called from JS
*/
NAN_METHOD(Connection::New)
{
  NanScope();

  Connection *connection = new Connection();
  connection->Wrap(args.This());

  NanReturnValue(args.This());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Abstraction for exception on accessing connection properties
*/
void Connection::connectionPropertyException(Connection* njsConn, 
                                             NJSErrorType errType,
                                             string property)
{
  NanScope();
  string msg;
  if(!njsConn->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidConnection);
  else
    msg = NJSMessages::getErrorMsg(errType, property.c_str());
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of stmtCacheSize property
*/
NAN_PROPERTY_GETTER(Connection::GetStmtCacheSize)
{
  NanScope();
  Connection* njsConn = ObjectWrap::Unwrap<Connection>(args.Holder());
  if(!njsConn->isValid_)
  {
    string error = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
    NanReturnUndefined();
  }
  try
  {
    Local<Integer> value = NanNew<v8::Integer>(njsConn->dpiconn_->stmtCacheSize());
    NanReturnValue(value);
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    NanReturnUndefined();
  }
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize property - throws error
*/
NAN_SETTER(Connection::SetStmtCacheSize)
{
  connectionPropertyException(ObjectWrap::Unwrap<Connection>(args.Holder()), errReadOnly, "stmtCacheSize");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of clientId property - throws error
*/
NAN_PROPERTY_GETTER(Connection::GetClientId)
{
  connectionPropertyException(ObjectWrap::Unwrap<Connection>(args.Holder()), errWriteOnly, "clientId");
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of clientId property
*/
NAN_SETTER(Connection::SetClientId)
{
  NanScope();
  Connection* njsConn = ObjectWrap::Unwrap<Connection>(args.Holder());
  if(!njsConn->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidConnection);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return;
  }
  else
  {
    std::string client;
    NJS_SET_PROP_STR(client, value, "clientId");
    njsConn->dpiconn_->clientId(client);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of module property - throws error
*/
NAN_PROPERTY_GETTER(Connection::GetModule)
{
  connectionPropertyException(ObjectWrap::Unwrap<Connection>(args.Holder()), errWriteOnly, "module");
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize property
*/
NAN_SETTER(Connection::SetModule)
{
  NanScope();
  Connection *njsConn = ObjectWrap::Unwrap<Connection>(args.Holder());
  if(!njsConn->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidConnection);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return;
  }
  else
  {
    std::string module;
    NJS_SET_PROP_STR( module, value, "module");
    njsConn->dpiconn_->module(module);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of action property - throws error
*/
NAN_PROPERTY_GETTER(Connection::GetAction)
{
  connectionPropertyException(ObjectWrap::Unwrap<Connection>(args.Holder()), errWriteOnly, "action");
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of action property
*/
NAN_SETTER(Connection::SetAction)
{
  NanScope();
  Connection *njsConn = ObjectWrap::Unwrap<Connection>(args.Holder());
  if(!njsConn->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidConnection);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return;
  }
  else
  {
    std::string action;
    NJS_SET_PROP_STR( action, value, "action");
    njsConn->dpiconn_->action(action);
  }
}
/*****************************************************************************/
/*
   DESCRIPTION
     Execute method on Connection class.

   PARAMETERS:
     Arguments - SQL Statement,
                 Binds Object/Array (Optional),
                 Options Object (Optional),
                 Callback
*/
NAN_METHOD(Connection::Execute)
{
  NanScope();
  Local<Function> callback;
  Local<String> sql;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, args );

  eBaton *executeBaton = new eBaton;
  NanAssignPersistent( executeBaton->cb, callback );
  NJS_CHECK_NUMBER_OF_ARGS ( executeBaton->error, args, 2, 4, exitExecute );
  connection = ObjectWrap::Unwrap<Connection>(args.This());

  if(!connection->isValid_)
  {
    executeBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitExecute;
  }
  NJS_GET_ARG_V8STRING (sql, executeBaton->error, args, 0, exitExecute);
  NJSString (executeBaton->sql, sql);

  executeBaton->maxRows      = connection->oracledb_->getMaxRows();
  executeBaton->prefetchRows = connection->oracledb_->getPrefetchRows();
  executeBaton->outFormat    = connection->oracledb_->getOutFormat();
  executeBaton->autoCommit   = connection->oracledb_->getAutoCommit();
  executeBaton->dpienv       = connection->oracledb_->getDpiEnv();
  executeBaton->fetchAsStringTypes = 
    (DataType*) connection->oracledb_->getFetchAsStringTypes ();
  executeBaton->fetchAsStringTypesCount =
    connection->oracledb_->getFetchAsStringTypesCount ();

  executeBaton->dpiconn      = connection->dpiconn_;
  executeBaton->njsconn      = connection;

  if(args.Length() > 2)
  {
    Connection::ProcessBinds(args, 1, executeBaton);
    if(!executeBaton->error.empty()) goto exitExecute;
  }
  if(args.Length() > 3)
  {
    Connection::ProcessOptions(args, 2, executeBaton);
     if(!executeBaton->error.empty()) goto exitExecute;
  }

  exitExecute:
  executeBaton->req.data  = (void*) executeBaton;
  uv_queue_work(uv_default_loop(), &executeBaton->req,
               Async_Execute, (uv_after_work_cb)Async_AfterExecute);

  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing of Binds

   PARAMETERS:
     args - Arguments to execute call,
     index- index of binds in args,
     executeBaton
 */
void Connection::ProcessBinds (_NAN_METHOD_ARGS, unsigned int index,
                               eBaton* executeBaton)
{
  NanScope();
  if(args[index]->IsArray() )
  {
    Local<Array> bindsArray  = Local<Array>::Cast(args[index]);
    Connection::GetBinds( bindsArray ,executeBaton );
  }
  else if(args[index]->IsObject() && !args[index]->IsFunction())
  {
    Local<Object> bindsObject  = args[index]->ToObject();
    Connection::GetBinds( bindsObject, executeBaton);
  }
  else
    executeBaton->error = NJSMessages::getErrorMsg(errInvalidParameterType, index);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing of options

   PARAMETERS:
     args - Arguments to execute call,
     index- index of options in args,
     executeBaton
 */
void Connection::ProcessOptions (_NAN_METHOD_ARGS, unsigned int index,
                                 eBaton* executeBaton)
{
  NanScope();
  Local<Object> options;
  if(args[index]->IsObject() && !args[index]->IsArray())
  {
    options = args[index]->ToObject();
    NJS_GET_UINT_FROM_JSON ( executeBaton->maxRows, executeBaton->error,
                             options, "maxRows", 2, exitProcessOptions );
    NJS_GET_UINT_FROM_JSON ( executeBaton->prefetchRows, executeBaton->error,
                             options, "prefetchRows", 2, exitProcessOptions );
    NJS_GET_UINT_FROM_JSON ( executeBaton->outFormat, executeBaton->error,
                             options, "outFormat", 2, exitProcessOptions );
    NJS_GET_BOOL_FROM_JSON ( executeBaton->getRS, executeBaton->error,
                             options, "resultSet", 2, exitProcessOptions );
    NJS_GET_BOOL_FROM_JSON ( executeBaton->autoCommit, executeBaton->error,
                             options, "autoCommit", 2, exitProcessOptions );

    // Optional fetchAs specifications
    Local<Value> val = options->Get(NanNew<v8::String>("fetchInfo"));
    if ( !val->IsUndefined () && !val->IsNull () )
    {
      Handle<Object> fetchInfo = val->ToObject();
      Local<Array> keys = fetchInfo->GetOwnPropertyNames ();
      if ( keys->Length () > 0 )
      {
        FetchInfo *fInfo = executeBaton->fetchInfo = 
                           new FetchInfo[keys->Length()];
        executeBaton->fetchInfoCount = keys->Length ();

        for (unsigned int index = 0 ; index < keys->Length() ; index ++ )
        {
          unsigned int tmptype = 0 ;

          Handle<String> temp = keys->Get (index).As<String>();
          NJSString (fInfo[index].name, temp );

          Handle<Object> colInfo = fetchInfo->Get (NanNew<v8::String>(
                                     fInfo[index].name ))->ToObject();

          NJS_GET_UINT_FROM_JSON (tmptype, executeBaton->error,
                                  colInfo, "type", 2, exitProcessOptions );
          fInfo[index].type = (DataType) tmptype;

          // Only Conversion to STRING allowed now. Either STRING or DB type.
          if ( ( fInfo[index].type != DATA_DEFAULT ) &&
               ( fInfo[index].type != DATA_STR ) )
          {
            executeBaton->error = NJSMessages::getErrorMsg (
                                               errInvalidTypeForConversion );
            goto exitProcessOptions;
          }
        }
      }
      else
      {
        executeBaton->error = NJSMessages::getErrorMsg (
                                                   errEmptyArrayForFetchAs,
                                                   index );
        goto exitProcessOptions;
      }
    }
  }
  else
  {
    executeBaton->error = NJSMessages::getErrorMsg(errInvalidParameterType,
                                                   index);
    goto exitProcessOptions;
  }
  exitProcessOptions:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing of Binds Object

   PARAMETERS:
     Handle Object, eBaton struct

   NOTES:
     Overloaded function
*/
void Connection::GetBinds (Handle<Object> bindobj, eBaton* executeBaton)
{
  NanScope();
  std::string str;
  Local<Array> array = bindobj->GetOwnPropertyNames();

  for(unsigned int index=0; index<array->Length(); index++)
  {
    Bind* bind = new Bind;
    Handle<String> temp = array->Get(index).As<String>();
    NJSString(str, temp);
    bind->key = ":"+std::string(str);
    Handle<Value> val__ = bindobj->Get(NanNew<v8::String>((char*)str.c_str(),
                           (int) str.length()));
    Connection::GetBindUnit(val__, bind, executeBaton);
    if(!executeBaton->error.empty())
      goto exitGetBinds;
  }
  exitGetBinds:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing of Binds Array

   PARAMETERS:
     Handle Array, eBaton struct

   NOTES:
     Overloaded function
*/
void Connection::GetBinds (Handle<Array> binds, eBaton* executeBaton)
{
  NanScope();

  for(unsigned int index = 0; index < binds->Length(); index++)
  {
    Bind* bind = new Bind;
    Local<Value> val__ = binds->Get(index);
    GetBindUnit(val__, bind, executeBaton);
    if(!executeBaton->error.empty()) goto exitGetBinds;
  }
  exitGetBinds:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing each bind varible

   PARAMETERS:
     Handle value, eBaton struct
*/
void Connection::GetBindUnit (Handle<Value> val, Bind* bind,
                                       eBaton* executeBaton)
{
  NanScope();
  unsigned int dir   = BIND_IN;

  if(val->IsObject() && !val->IsDate())
  {
    dir                     = BIND_UNKNOWN;
    Local<Object> bind_unit = val->ToObject();
    NJS_GET_UINT_FROM_JSON   ( dir, executeBaton->error,
                               bind_unit, "dir", 1, exitGetBindUnit );
    NJS_GET_UINT_FROM_JSON   ( bind->type, executeBaton->error,
                               bind_unit, "type", 1, exitGetBindUnit );
    bind->maxSize = NJS_MAX_OUT_BIND_SIZE;
    NJS_GET_UINT_FROM_JSON   ( bind->maxSize, executeBaton->error,
                               bind_unit, "maxSize", 1, exitGetBindUnit );
    if(!bind->maxSize && dir != BIND_IN)
    {
      executeBaton->error = NJSMessages::getErrorMsg (
                                           errInvalidPropertyValueInParam,
                                           "maxSize", 2 );
      goto exitGetBindUnit;
    }

    Local<Value> element = bind_unit->Get(NanNew<v8::String>("val"));
    switch(dir)
    {
      case BIND_IN    :
        bind->isOut  = false;
        bind->isInOut  = false;
        Connection::GetInBindParams(element, bind, executeBaton, BIND_IN );
        if(!executeBaton->error.empty()) goto exitGetBindUnit;
        break;
      case BIND_INOUT :
        bind->isOut  = true;
        bind->isInOut  = true;
        Connection::GetInBindParams(element, bind, executeBaton, BIND_INOUT);
        if(!executeBaton->error.empty()) goto exitGetBindUnit;
        break;
      case BIND_OUT   :
        bind->isOut  = true;
        bind->isInOut  = false;
        executeBaton->numOutBinds++;
        if ( bind->type == DATA_DEFAULT )
        {
          /* For OUT binds, if type is not specified, assume STRING */
          bind->type = DATA_STR;
        }
        Connection::GetOutBindParams(bind->type, bind, executeBaton);
        if(!executeBaton->error.empty()) goto exitGetBindUnit;
        break;
      default         :
        executeBaton->error = NJSMessages::getErrorMsg (errInvalidBindDirection);
        goto exitGetBindUnit;
        break;
    }
  }
  else
  {
    bind->isOut  = false;
    Connection::GetInBindParams(val, bind, executeBaton, BIND_IN);
    if(!executeBaton->error.empty()) goto exitGetBindUnit;
  }
  exitGetBindUnit:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing out binds

   PARAMETERS:
     dataType - datatype of the bind
     bind struct, eBaton struct
*/
void Connection::GetOutBindParams (unsigned short dataType, Bind* bind,
                                   eBaton *executeBaton)
{
  NanScope();
  switch(dataType)
  {
    case DATA_STR :
      bind->type     =  dpi::DpiVarChar;
      break;
    case DATA_NUM :
      bind->type     = dpi::DpiDouble;
      bind->maxSize  = sizeof(double);
      break;
    case DATA_DATE :
      bind->type     = dpi::DpiTimestampLTZ;
      bind->maxSize  = 0;
      break;
    case DATA_CURSOR :
      bind->type     = dpi::DpiRSet;
      bind->maxSize  = 0;
      break;
    case DATA_CLOB : 
      bind->type    = dpi::DpiClob;
      bind->maxSize  = 0;
      break;
    case DATA_BLOB : 
      bind->type    = dpi::DpiBlob;
      bind->maxSize  = 0;
      break;
    default :
      executeBaton->error= NJSMessages::getErrorMsg(errInvalidBindDataType,2);
      break;
  }
  executeBaton->binds.push_back(bind);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing in binds

   PARAMETERS:
     Handle value, bind struct, eBaton struct

   NOTE:
     For IN Bind only len field field is used, and for only a scalar value now,
     allocate for one unit.
*/
void Connection::GetInBindParams (Handle<Value> v8val, Bind* bind,
                                           eBaton* executeBaton, BindType type)
{
  /* Allocate for scalar indicator & length */
  bind->ind = (short *)malloc ( sizeof ( short ) );
  bind->len = (DPI_BUFLEN_TYPE *)malloc ( sizeof ( DPI_BUFLEN_TYPE ) );

  *(bind->ind)  = 0;

  if(v8val->IsUndefined() || v8val->IsNull())
  {
    bind->value = NULL;
    *(bind->ind)   = -1;
    bind->type        = dpi::DpiVarChar;
  }
  else if(v8val->IsString())
  {
    if( bind->type && bind->type != DATA_STR )
    {
      executeBaton->error= NJSMessages::getErrorMsg(
                             errBindValueAndTypeMismatch, 2);
      goto exitGetInBindParams;
    }

    v8::String::Utf8Value str(v8val->ToString());

    bind->type = dpi::DpiVarChar;
    if(type == BIND_INOUT)
    {
      *(bind->len) = str.length();
    }
    else // IN
    {
      bind->maxSize = *(bind->len) = str.length();
    }
    DPI_SZ_TYPE size = (bind->maxSize >= *(bind->len) ) ?
                       bind->maxSize : *(bind->len);
    if(size)
    {
      bind->value = (char*)malloc(size);
      if(str.length())
        memcpy(bind->value, *str, str.length());
    }
  }
  else if(v8val->IsInt32())
  {
    if( bind->type && bind->type != DATA_NUM )
    {
      executeBaton->error= NJSMessages::getErrorMsg(
                             errBindValueAndTypeMismatch, 2);
      goto exitGetInBindParams;
    }
    bind->type = dpi::DpiInteger;
    bind->maxSize = *(bind->len) = sizeof(int);
    bind->value = (int*)malloc(*(bind->len));
    *(int*)(bind->value) = v8val->ToInt32()->Value();
  }
  else if(v8val->IsUint32())
  {
    if( bind->type && bind->type != DATA_NUM )
    {
      executeBaton->error= NJSMessages::getErrorMsg(
                             errBindValueAndTypeMismatch, 2);
      goto exitGetInBindParams;
    }
    bind->type = dpi::DpiUnsignedInteger;
    bind->maxSize = *(bind->len) = sizeof(unsigned int);
    bind->value = (unsigned int*)malloc(*(bind->len));
    *(unsigned int*)(bind->value) = v8val->ToUint32()->Value();
  }
  else if(v8val->IsNumber())
  {
    if( bind->type && bind->type != DATA_NUM )
    {
      executeBaton->error= NJSMessages::getErrorMsg(errBindValueAndTypeMismatch, 2);
      goto exitGetInBindParams;
    }
    bind->type = dpi::DpiDouble;
    bind->maxSize = *(bind->len) = sizeof(double);
    bind->value = (double*)malloc(*(bind->len));
    *(double*)(bind->value) = v8val->NumberValue();
  }
  else if(v8val->IsDate ())
  {
    if( bind->type && bind->type != DATA_DATE )
    {
      executeBaton->error= NJSMessages::getErrorMsg(errBindValueAndTypeMismatch, 2);
      goto exitGetInBindParams;
    }
    /* This has to be allocated after stmt is initialized */
    bind->dttmarr = NULL ;
    bind->extvalue = (long double *) malloc (sizeof ( long double ) );
    bind->value = NULL;
    bind->type = dpi::DpiTimestampLTZ;
    *(bind->len) = 0;
    bind->maxSize = 0;
    /* Convert v8::Date value to long double */
    Connection::v8Date2OraDate ( v8val, bind);
  }
  else
  {
    executeBaton->error= NJSMessages::getErrorMsg(errInvalidBindDataType,2);
    goto exitGetInBindParams;
  }
  executeBaton->binds.push_back(bind);
  exitGetInBindParams:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of Execute  method

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution
*/
void Connection::Async_Execute (uv_work_t *req)
{
  eBaton *executeBaton = (eBaton*)req->data;
  if(!(executeBaton->error).empty()) goto exitAsyncExecute;

  try
  {
    Connection::PrepareAndBind(executeBaton);

    if ( !executeBaton->error.empty() )  goto exitAsyncExecute;

    if (executeBaton->st == DpiStmtSelect)
    {
      // set prefetch
      if(executeBaton->getRS)
      {
        // prefetchRows either default or value provided by user
        executeBaton->dpistmt->prefetchRows(executeBaton->prefetchRows);
      }
      else 
      {
        // OCI default prefetchRows value is 1.
        // Set default prefetchRows to 2 to cut down on additional 
        // fetch round-trip for single row non-resultset cases
        executeBaton->dpistmt->prefetchRows(NJS_PREFETCH_NON_RESULTSET);
      }      

      executeBaton->dpistmt->execute(0, executeBaton->autoCommit);
      const dpi::MetaData* meta   = executeBaton->dpistmt->getMetaData();
      executeBaton->numCols       = executeBaton->dpistmt->numCols();
      executeBaton->columnNames   = new std::string[executeBaton->numCols];
      Connection::CopyMetaData( executeBaton->columnNames, meta, 
                                executeBaton->numCols );

      if ( executeBaton->getRS ) 
        goto exitAsyncExecute;

      Connection::DoDefines(executeBaton, meta, executeBaton->numCols);
      /* If any errors while creating define structures, bail out */
      if ( !executeBaton->error.empty() )
        goto exitAsyncExecute;

      Connection::DoFetch(executeBaton);
    }
    else
    {
      if( executeBaton->getRS )
      {
        executeBaton->error = NJSMessages::getErrorMsg(
                                errInvalidNonQueryExecution );
        goto exitAsyncExecute;
      }
      executeBaton->dpistmt->execute(1, executeBaton->autoCommit);
      executeBaton->rowsAffected = executeBaton->dpistmt->rowsAffected();

      /* Check to see if the string buffer size is good in case of
       * DML Returning.
       */
      if ( executeBaton->stmtIsReturning )
      {
        for ( unsigned int b = 0; b < executeBaton->binds.size (); b ++ )
        {
          /* Interested only OUT binds with VARCHAR columns */
          if ( executeBaton->binds[b]->isOut &&
               ( executeBaton->binds[b]->type == dpi::DpiVarChar ))
          {
            bool err = false;
            for ( DPI_SZ_TYPE row = 0 ;
                  !err && ( row < executeBaton->rowsAffected) ;
                  row ++ )
            {
              if (executeBaton->binds[b]->maxSize <
                  (DPI_SZ_TYPE) executeBaton->binds[b]->len2[row])
              {
                /* Report insufficient buffer for OUT binds */
                executeBaton->error =
                  NJSMessages::getErrorMsg (errInsufficientBufferForBinds);
                err = true;
              }
            }
          }
        }
        /* Fall through the code to cleanup other objects */
      }


     /* Process date/timestamp INOUT/OUT bind values */
     for ( unsigned int b = 0; b < executeBaton->binds.size (); b++ )
     {
       Bind *bind = executeBaton->binds[b];

       /* Interested only OUT binds of date/timestamp type */
       if ( bind->isOut && bind->dttmarr)
       {
          for (unsigned int rowidx = 0; rowidx < bind->rowsReturned; rowidx++)
            ((long double *)(bind->extvalue))[rowidx] =
                              bind->dttmarr->getDateTime ( rowidx ) ;
       }

       /* DATE/Timestamp could have been allocated for IN/OUT/INOUT binds */
       if ( bind->dttmarr )
       {
         bind->dttmarr->release () ;
         bind->dttmarr = NULL;
       }
     }
     // process any lob descriptor out binds
     Connection::Descr2protoILob ( executeBaton, 0, 0);
    }
    if ( executeBaton->dpistmt )
    {    
      executeBaton->dpistmt->release ();
    }   
  }
  catch (dpi::Exception& e)
  {
    // In Case of DML Returning, if the buffer is small, and if the callback
    // is called multiple times, an ORA error 24343 was reported. Converting
    // that error to errInsufficientBufferForBinds.
    if ( !executeBaton->stmtIsReturning ||
         (e.errnum() != 24343) )
    {
      executeBaton->error = std::string(e.what ());
    }
    else
    {
      executeBaton->error = NJSMessages::getErrorMsg (
                                     errInsufficientBufferForBinds ) ;
    }
  }
  exitAsyncExecute:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Calls DPI Stmt Prepare and Bind

   PARAMETERS:
     eBaton struct
 */
void Connection::PrepareAndBind (eBaton* executeBaton)
{
    DPI_SZ_TYPE maxSize = 0; // maxSize for out bind; add 1 for dml returning
    executeBaton->dpistmt = executeBaton->dpiconn->getStmt(executeBaton->sql);
    executeBaton->st = executeBaton->dpistmt->stmtType ();
    executeBaton->stmtIsReturning = executeBaton->dpistmt->isReturning ();

    if(!executeBaton->binds.empty())
    {
      if(!executeBaton->binds[0]->key.empty())
      {
        for(unsigned int index = 0 ;index < executeBaton->binds.size();
            index++)
        {
          // Allocate for OUT Binds
          // For DML Returning, allocation happens through callback.
          if ( executeBaton->binds[index]->isOut &&
               !executeBaton->stmtIsReturning &&
               !executeBaton->binds[index]->value )
          {
            Connection::cbDynBufferAllocate ( executeBaton,
                                              false, 1, index );
            // LOBs: binds[index]->value is a pointer to a pointer
            // we need to allocate the underlying LOB descriptor
            if (executeBaton->binds[index]->type == DpiClob ||
                executeBaton->binds[index]->type == DpiBlob)
            {
              *((void **)executeBaton->binds[index]->value) =
                executeBaton->dpienv->allocDescriptor(LobDescriptorType);
            }
          }
          
          // Allocate handle for Ref Cursor
          if ( executeBaton->binds[index]->type == DpiRSet )
          { 
             executeBaton->binds[index]->value = executeBaton->dpiconn->
                                                               getStmt();
          }

          // Convert v8::Date to Oracle DB Type for IN and IN/OUT binds
          if ( executeBaton->binds[index]->type == DpiTimestampLTZ &&
              // InOut bind
              (executeBaton->binds[index]->isInOut || 
              // In bind
              (!executeBaton->binds[index]->isOut &&
               !executeBaton->binds[index]->isInOut)))
          {
            Connection::UpdateDateValue ( executeBaton, index ) ;
          }

          /* 
           * In case of DML Returning, add 1 extra byte, to check for
           * more data 
           */
          if ( ( executeBaton->binds[index]->type == dpi::DpiVarChar) &&
               ( executeBaton->stmtIsReturning ) )
          {
            maxSize = executeBaton->binds[index]->maxSize + 1;
          }
          else
          {
            maxSize = executeBaton->binds[index]->maxSize;
          }
          // Bind by name
          executeBaton->dpistmt->bind(
                (const unsigned char*)executeBaton->binds[index]->key.c_str(),
                (int) executeBaton->binds[index]->key.length(), index,
                executeBaton->binds[index]->type,
                executeBaton->binds[index]->value,
                (executeBaton->binds[index]->type == dpi::DpiVarChar ) ?
                  (executeBaton->binds[index]->maxSize + 1) :
                  executeBaton->binds[index]->maxSize,
                executeBaton->binds[index]->ind,
                executeBaton->binds[index]->len,
                (executeBaton->stmtIsReturning &&
                  executeBaton->binds[index]->isOut) ?
                (void *)executeBaton : NULL,
                (executeBaton->stmtIsReturning &&
                  executeBaton->binds[index]->isOut) ?
                Connection::cbDynBufferGet : NULL);
        }
      }
      else
      {
        for(unsigned int index = 0 ;index < executeBaton->binds.size();
            index++)
        {
          // Allocate handle for Ref Cursor
          if ( executeBaton->binds[index]->type == DpiRSet )
          {
            executeBaton->binds[index]->value = executeBaton->dpiconn->
                                                              getStmt();
          }

          // Allocate for OUT Binds
          // For DML Returning, allocation happens through callback
          if ( executeBaton->binds[index]->isOut &&
               !executeBaton->stmtIsReturning &&
               !executeBaton->binds[index]->value )
          {
            Connection::cbDynBufferAllocate ( executeBaton,
                                              false, 1, index );
          }

          // Convert v8::Date to Oracle DB Type for IN and IN/OUT binds
          if ( executeBaton->binds[index]->type == DpiTimestampLTZ &&
              // InOut bind
              (executeBaton->binds[index]->isInOut ||
              // In bind
              (!executeBaton->binds[index]->isOut &&
               !executeBaton->binds[index]->isInOut)))
          {
            Connection::UpdateDateValue ( executeBaton, index ) ;
          }

          /* 
           * In case of DML Returning, add 1 extra byte, to check for
           * more data 
           */

          if ( ( executeBaton->binds[index]->type == dpi::DpiVarChar) &&
               ( executeBaton->stmtIsReturning ) )
          {
            maxSize = executeBaton->binds[index]->maxSize + 1;
          }
          else
          {
            maxSize = executeBaton->binds[index]->maxSize;
          }
          // Bind by position
          executeBaton->dpistmt->bind(
                index+1,executeBaton->binds[index]->type,
                executeBaton->binds[index]->value,
                (executeBaton->binds[index]->type == dpi::DpiVarChar ) ?
                  (executeBaton->binds[index]->maxSize + 1) :
                   executeBaton->binds[index]->maxSize,
                executeBaton->binds[index]->ind,
                executeBaton->binds[index]->len,
                (executeBaton->stmtIsReturning &&
                  executeBaton->binds[index]->isOut ) ?
                    (void *)executeBaton : NULL,
                (executeBaton->stmtIsReturning &&
                  executeBaton->binds[index]->isOut) ?
                Connection::cbDynBufferGet : NULL);
        }
      }
    }
}

/*****************************************************************************/
/*
   DESCRIPTION
     copy column names from meta data to the string array passed as parameter. 

   PARAMETERS:
     string array  -  column names
     metaData      -  metaData info from DPI
     numCols       -  number of columns
 */
void Connection::CopyMetaData ( std::string* names, const dpi::MetaData* meta,
                                unsigned int numCols )
{
  for (unsigned int col = 0; col < numCols; col++)
  {
    names[col] = std::string( (const char*)meta[col].colName,
                            meta[col].colNameLen );
  }
}

/*****************************************************************************/
/*
  DESCRIPTION
    To convert various Oracle Database type to the one used by the driver

  PARAMETERS
    dbType - Dpi enumeration of database type
    
  RETURNS
  targetDB type (DPI enumeration)
*/
unsigned short Connection::SourceDBType2TargetDBType ( unsigned dbType )
{
  switch ( dbType )
  {
    /* Double is used for all numeric types */
  case dpi::DpiNumber:
  case dpi::DpiBinaryFloat:
  case dpi::DpiBinaryDouble:
  case dpi::DpiDouble:
    dbType = dpi::DpiDouble;
    break;

    /* VARCHAR is used for all character types */
  case dpi::DpiVarChar:
  case dpi::DpiFixedChar:
    dbType = dpi::DpiVarChar;
    break;

    /* TIMESTAMP WITH LOCAL TIME ZONE (LTZ) is used for all DATE/TIMESTAMP */
  case dpi::DpiDate:
  case dpi::DpiTimestamp:
  case dpi::DpiTimestampLTZ:
    dbType = dpi::DpiTimestampLTZ;
    break;
  }

  return dbType;
}


/*****************************************************************************/
/*
  DESCRIPTION
    Apply By-name rules if applicable

  PARAMETERS
    executeBaton          SQL Execute Baton structure
    name                  name of the column
    targetType[IN/OUT]  - db type [IN}, and fetchType [OUT] if a rules was
                          applied
    
  RETURNS
    true if rules applied and
    false if no matching column name available.
*/
boolean Connection::MapByName ( eBaton *executeBaton, std::string &name,
                                unsigned short &targetType )
{
  boolean modified = false;

  if ( executeBaton->fetchInfo && executeBaton->fetchInfoCount > 0 )
  {
    for ( unsigned int f = 0 ;
          !modified && ( f < executeBaton->fetchInfoCount ) ;
          f ++ )
    {
      /* COLUMN name should match */
      if ( executeBaton->fetchInfo[f].name.compare ( name ) == 0 )
      {
        /* Only DATA_STR & DATA_DEFAULT allowed.  For DATA_DEFAULT,
         * the type is identified from metadata and is already set.
         * In case of DATA_STR, set the return value.
         */
        if ( executeBaton->fetchInfo[f].type == DATA_STR )
        {
          targetType = dpi::DpiVarChar;
        }
        else if ( executeBaton->fetchInfo[f].type == DATA_DEFAULT )
        {
          targetType = Connection::SourceDBType2TargetDBType ( targetType );
        }
        modified = true;
      }
    }
  }

  return modified;
}



/*****************************************************************************/
/*
  DESCRIPTION
    Apply by-type conversion rules - rules are set as oracledb property

  PARAMETERS
    executeBaton  - eBaton structure for this execute call
    dbType        - database column type from metadata(IN), targetDBtype(OUT)

  RETURNS
    true if the database type is modified based on by-type rules
    false if not modified
*/
boolean Connection::MapByType ( eBaton *executeBaton, unsigned short &dbType )
{
  boolean modified = false;
  unsigned int count = 0 ;

  /* If oracledb property is set map using that */
  if ( executeBaton->fetchAsStringTypes )
  {
    count = executeBaton->fetchAsStringTypesCount;

    switch ( dbType )
    {
    case dpi::DpiNumber:
    case dpi::DpiBinaryFloat:
    case dpi::DpiBinaryDouble:
    case dpi::DpiDouble:
      /* Numeric Type */
      for ( unsigned int t = 0 ; !modified && ( t < count ) ; t++)
      {
        if ( executeBaton->fetchAsStringTypes[t] == DATA_NUM )
        {
          /* 
           * Convert all Numeric values to STRING
           */
          dbType = dpi::DpiVarChar;
          modified = true;
          break;
        }
      }
      break;

    case dpi::DpiDate:
    case dpi::DpiTimestamp:
    case dpi::DpiTimestampTZ:
    case dpi::DpiTimestampLTZ:
      /* DATE/TIMESTAMP */
      for ( unsigned int t = 0 ; !modified && ( t < count ) ; t ++ )
      {
        if ( executeBaton->fetchAsStringTypes[t] == DATA_DATE )
        {
          /* Convert all DATE/TIMESTAMP values to STRING */
          dbType = dpi::DpiVarChar;
          modified = true;
          break;
        }
      }
      break;

    default:  /* Other data types no supported and is checked earlier */
      break;
    }
  }
  
  return dbType;
}

/*****************************************************************************/
/*
   DESCRIPTION
     To map to desired database type if any specified by Column Name or
     oracledb type

   PARAMETERS
     eBaton  - executeBaton Structure
     name    - column name
     default Type - if no override provided, to return the default DB type

   RETURNS
     dbType   - As default is provided, always a DB Column type will
                      be returned.
*/
unsigned short Connection::GetTargetType ( eBaton *executeBaton,
                                            std::string &name,
                                unsigned short defaultType)
{
  unsigned short dbType = defaultType;  // Start with DB Metadata type

  /* If the Database COLUMN type is STRING type already, then nothing to
   * convert simply return
   */
  if ( dbType == dpi::DpiVarChar || dbType == dpi::DpiFixedChar )
  {
    dbType = Connection::SourceDBType2TargetDBType ( dbType );
  }
  else
  {
    if ( !Connection::MapByName ( executeBaton, name, dbType ) )
    {
      /* If no specification by-column-name provided, then check 
       * the by-type specification.
       * By-name overrides the by-type specification, and so if by-name found
       * no need to check for by-type specifications.
       */
      if ( !MapByType ( executeBaton, dbType ) )
      {
        /* No conversion rules applied, convert to target type */
        dbType = Connection::SourceDBType2TargetDBType ( dbType );
      }
    }
  }

  return dbType;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Allocate defines buffer for query output and do fetch.
     Call DPI define.

   PARAMETERS:
     eBaton struct
 */
void Connection::DoDefines ( eBaton* executeBaton, const dpi::MetaData* meta,
                             unsigned int numCols )
{
  Define *defines = executeBaton->defines = new Define[numCols];

  for (unsigned int col = 0; col < numCols; col++)
  {
    switch(meta[col].dbType)
    {
      case dpi::DpiNumber :
      case dpi::DpiBinaryFloat :
      case dpi::DpiBinaryDouble :
        defines[col].fetchType = Connection::GetTargetType ( executeBaton,
                                               executeBaton->columnNames[col],
                                                 dpi::DpiDouble) ;
        /* For VARCHAR2 type, make sure sufficient buffer is available */
        defines[col].maxSize = ( defines[col].fetchType == dpi::DpiVarChar) ?
                               NJS_MAX_FETCH_AS_STRING_SIZE : sizeof (double);
        
        defines[col].maxSize   = sizeof(double);
        defines[col].buf = (double *)malloc(defines[col].maxSize*
                                            executeBaton->maxRows);
        if(!defines[col].buf)
        {
          executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
          return;
        }
        break;
      case dpi::DpiVarChar :
      case dpi::DpiFixedChar :
        defines[col].fetchType = Connection::GetTargetType ( executeBaton,
                                             executeBaton->columnNames[col],
                                             meta[col].dbType );
        /*
         * For fetching non-ascii/utf8 characters, it may take up to
         * four times the buffer size on DB 
         * TODO: optimize ratio when DB character set is already UTF8
         */
 
        defines[col].maxSize   = (meta[col].dbSize) * NJS_CHAR_CONVERSION_RATIO;
        defines[col].buf = (char *)malloc(defines[col].maxSize*
                                          executeBaton->maxRows);
        if(!defines[col].buf)
        {
          executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
          return;
        }
        break;
      case dpi::DpiDate :
      case dpi::DpiTimestamp:
      case dpi::DpiTimestampTZ:
      case dpi::DpiTimestampLTZ:
        defines[col].fetchType = Connection::GetTargetType ( executeBaton,
                                               executeBaton->columnNames[col], 
                                               dpi::DpiTimestampLTZ );

        if ( ( meta[col].dbType == dpi::DpiTimestampTZ ) && 
             ( defines[col].fetchType != dpi::DpiVarChar ))
        {
          /* 
           * TIMESTAMP WITH TIMEZONE (TZ) column type supported only as
           * STRING value.
           */
          executeBaton->error = NJSMessages::getErrorMsg ( 
                                             errUnsupportedDatType ) ;
          return;
        }

        if ( defines[col].fetchType != dpi::DpiVarChar )
        {
          defines[col].dttmarr   = executeBaton->dpienv->getDateTimeArray (
                                     executeBaton->dpistmt->getError () );
          defines[col].maxSize   = meta[col].dbSize;
          defines[col].extbuf    = defines[col].dttmarr->init(
                                                      executeBaton->maxRows);
        }
        else
        {
          /* Fetching DATE/TIMESTAMP values as VARCHAR */
          defines[col].maxSize = NJS_MAX_FETCH_AS_STRING_SIZE ;
          defines[col].buf = (char *)malloc ( defines[col].maxSize *
                                              executeBaton->maxRows );
          if(!defines[col].buf)
          {
            executeBaton->error = NJSMessages::getErrorMsg(
                                     errInsufficientMemory);
            return;
          }
        }
        break;

      case dpi::DpiClob:
      case dpi::DpiBlob:
      case dpi::DpiBfile:
        defines[col].fetchType = meta[col].dbType;
        defines[col].maxSize   = sizeof(Descriptor *);
        defines[col].buf = malloc(defines[col].maxSize * executeBaton->maxRows);
        if(!defines[col].buf)
        {
          executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
          return;
        }

        for (unsigned int j = 0; j < executeBaton->maxRows; j++)
        {
          ((Descriptor **)(defines[col].buf))[j] = 
            executeBaton->dpienv->allocDescriptor(LobDescriptorType);
        }
        break;

      case dpi::DpiRowid:
        defines[col].fetchType = Connection::GetTargetType ( executeBaton,
                                               executeBaton->columnNames[col],
                                               dpi::DpiRowid );
        if ( defines[col].fetchType != dpi::DpiVarChar )
        {
          executeBaton->error = NJSMessages::getErrorMsg (
                                                    errUnsupportedDatType);
          return;
        }
        defines[col].maxSize = NJS_MAX_FETCH_AS_STRING_SIZE;
        defines[col].buf = (char *)malloc (defines[col].maxSize *
                                           executeBaton->maxRows );
        if(!defines[col].buf)
        {
          executeBaton->error = NJSMessages::getErrorMsg(
                                  errInsufficientMemory);
          return;
        }
        break;

      default :
        executeBaton->error = NJSMessages::getErrorMsg(errUnsupportedDatType);
        return;
        break;
    }
     
    defines[col].ind = (short*)malloc (sizeof(short)*(executeBaton->maxRows));
    if(!defines[col].ind)
    {
      executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
      return;
    }
    defines[col].len = (DPI_BUFLEN_TYPE *)malloc(sizeof(DPI_BUFLEN_TYPE)*
                                           executeBaton->maxRows);
    if(!defines[col].len)
    {
      executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
      return;
    }

    executeBaton->dpistmt->define(col+1, defines[col].fetchType,
                 (defines[col].buf) ? defines[col].buf : defines[col].extbuf,
                 defines[col].maxSize, defines[col].ind, defines[col].len);
  }
  executeBaton->numCols     = numCols;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Fetch rows into defines buffer for query output.
     Call DPI fetch.

   PARAMETERS:
     eBaton struct
 */
void Connection::DoFetch (eBaton* executeBaton)
{
  executeBaton->dpistmt->fetch ( executeBaton->maxRows );
  executeBaton->rowsFetched = executeBaton->dpistmt->rowsFetched();
  Connection::Descr2Double ( executeBaton->defines,
                             executeBaton->numCols, 
                             executeBaton->rowsFetched,
                             executeBaton->getRS );
  Connection::Descr2protoILob ( executeBaton, 
                                executeBaton->numCols, 
                                executeBaton->rowsFetched );
}

/*****************************************************************************/
/*
   DESCRIPTION
     Special processing for datetime to convert descriptors to double value.

   PARAMETERS:
     defines       - Define struct
     numCols       - # of columns
     rowsFetched   - rows fetched
     getRS         - boolean set for resultset
 */
void Connection::Descr2Double( Define* defines, unsigned int numCols,
                               unsigned int rowsFetched, bool getRS )
{
                                /* Special processing for certain data types */
  for (unsigned int col = 0; col < numCols; col ++ )
  {

    /* Special processing for datetime, as it is obtained as descriptors */

    if ( defines[col].dttmarr )
    {
      long double *dblArr = NULL;

      defines[col].buf =
      dblArr = (long double *)malloc ( sizeof ( long double ) *
                                                rowsFetched );

      for ( int row = 0; row < (int) rowsFetched; row ++ )
      {
        dblArr[row] = defines[col].dttmarr->getDateTime (row);
      }
      defines[col].buf = (void *) dblArr;
      if ( !getRS )
      {
        defines[col].dttmarr->release ();
        defines[col].extbuf = NULL;
      }
    }
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Special processing for lob descriptors

   PARAMETERS:
     executeBato   - eBaton struct
     numCols       - # of columns
     rowsFetched   - rows fetched
 */
void Connection::Descr2protoILob( eBaton *executeBaton, unsigned int numCols, 
                                  unsigned int rowsFetched )
{
  Define *defines = executeBaton->defines;
  for (unsigned int col = 0; col < numCols; col ++ )
  {
    if ((defines[col].fetchType == DpiClob) || 
        (defines[col].fetchType == DpiBlob) ||
        (defines[col].fetchType == DpiBfile))
    {
      for (unsigned int row = 0; row < rowsFetched; row++)
      {
        if ( (defines[col].ind)[row] == -1 )
          continue;           // null value, nothing to convert/transfer
        Descriptor *lobLocator = ((Descriptor **)(defines[col].buf))[row];

            // The ownership of the Lob locator is going to be transferred to
            // the ProtoILob object now.  If anything goes wrong, it is the
            // responsibility of the ProtoILob class to free the Lob locator.
            // Hence, setting the Lob Descriptor in the define buffer to NULL.

        ((Descriptor **)(defines[col].buf))[row] = NULL;
        
        
        ProtoILob *protoILob = new ProtoILob(executeBaton, lobLocator,
                                             defines[col].fetchType);
 
        if (!executeBaton->error.empty())
        {
              // we need to delete all ProtoLobs that have been created so far
              // else when the executeBaton is deleted, then the defines buf
              // cleanup will incorrectly interpret the ProtoLob as Lob
              // Descriptor and try to free it as such.

          for (unsigned int i = 0; i < col; i++)
          {
            if ((defines[col].fetchType == DpiClob) ||
                (defines[col].fetchType == DpiBlob) ||
                (defines[col].fetchType == DpiBfile))
            {
              for (unsigned int j = 0; j <  executeBaton->rowsFetched; j++)
              {
                // Skip this block for null values.  The null wasn't 
                // converted to a protoILob. The define buffer still
                // points to a descriptor which can be properly
                // freed when the executeBaton is destroyed.
                if ( (defines[i].ind)[j] != -1 )
                {  
                  protoILob = static_cast<ProtoILob **>(defines[i].buf)[j];
                  delete protoILob;
                  ((Descriptor **)(defines[i].buf))[j] = NULL;
                }
              }
            }
          }
          
              // now delete ProtoLob in the current column we were working up
              // to row that gave the error. We know that this is a Lob column
              // as the error happenned here.

          for (unsigned int j = 0; j <  row; j++)
          {
            // As before, skip this block for null values
            if ( (defines[col].ind)[j] != -1 )
            { 
              protoILob = static_cast<ProtoILob **>(defines[col].buf)[j];
              delete protoILob;
              ((Descriptor **)(defines[col].buf))[j] = NULL;
            }
          }

          return;
        } // done with error handling

            // The descriptor is now replaced by the correponding LobProto.
            // The defines buf contained a Descriptor i.e. a pointer.  We are
            // replacing that pointer by a pointer to a ProtoILob.

        ((Descriptor **)(defines[col].buf))[row] = 
          reinterpret_cast<Descriptor *>(protoILob);
      }
    }
  }
  // Now process all the OUT binds. Just as with the defines,
  // the descriptor is replaced by a pointer to a ProtoILob
  if (!executeBaton->rowsAffected)
    return;  // if no rows inserted or updated, return
  for(unsigned int obndpos = 0;  obndpos < executeBaton->binds.size(); obndpos++)
  {
    Bind *bind = executeBaton->binds[obndpos];

    if ((!bind->isOut && !bind->isInOut) || 
        ( bind->ind && *(sb2 *)bind->ind == -1))
      continue;  // we only need to process the non-null OUT binds

    if (bind->type == DpiClob || bind->type == DpiBlob)
    {
      // TODO: Update this loop when support for array binds is added.
      // For UPDATE, loop through all the rows returned for each bind
      // For INSERT, eventually we will consider the iters.  
      //             For now only 1 row will be inserted.
      for (unsigned int rowidx = 0; rowidx < bind->rowsReturned; rowidx++)
      {
        Descriptor *lobLocator = 
          (Descriptor *)((Descriptor **)bind->value)[rowidx];
        ProtoILob *protoILob = new ProtoILob(executeBaton, lobLocator, 
                                             bind->type);
        
        ((Descriptor **)(bind->value))[rowidx] = 
          reinterpret_cast<Descriptor *>(protoILob);
      }
    }
  }     
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Execute method

   PARAMETERS:
     UV queue work block

   NOTES:
     Handle for result is formed and handed over to JS
*/
void Connection::Async_AfterExecute(uv_work_t *req)
{
  NanScope();

  eBaton *executeBaton = (eBaton*)req->data;
  v8::TryCatch tc;
  Handle<Value> argv[2];
  if(!(executeBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(NanNew<v8::String>((executeBaton->error).c_str()));
    argv[1] = NanUndefined();
  }
  else
  {
    argv[0] = NanUndefined();
    Local<Object> result = NanNew<v8::Object>();
    Handle<Value> rowArray;
    switch(executeBaton->st)
    {
      case DpiStmtSelect :
        rowArray = Connection::GetRows(executeBaton);
        if(!(executeBaton->error).empty())
        {
          argv[0] = v8::Exception::Error(NanNew<v8::String>((executeBaton->error).c_str()));
          argv[1] = NanUndefined();
          goto exitAsyncAfterExecute;
        }
        if( executeBaton->getRS )
        {
          result->Set(NanNew<v8::String>("rows"), NanUndefined());
          Handle<Object> resultSet = NanNew(ResultSet::resultSetTemplate_s)->
                                GetFunction() ->NewInstance();
         (ObjectWrap::Unwrap<ResultSet> (resultSet))->
                                  setResultSet( executeBaton->dpistmt,
                                                executeBaton );
          result->Set(NanNew<v8::String>("resultSet"), resultSet );
        }
        else
        {
          result->Set(NanNew<v8::String>("rows"), rowArray);
          result->Set(NanNew<v8::String>("resultSet"), NanUndefined());
        }
        result->Set(NanNew<v8::String>("outBinds"),NanUndefined());
        result->Set(NanNew<v8::String>("rowsAffected"), NanUndefined());
        result->Set(NanNew<v8::String>("metaData"), Connection::GetMetaData(
                                                    executeBaton->columnNames,
                                                    executeBaton->numCols));
        break;
      case DpiStmtBegin :
      case DpiStmtDeclare :
      case DpiStmtCall :
        result->Set(NanNew<v8::String>("rowsAffected"), NanUndefined());
        result->Set(NanNew<v8::String>("outBinds"),Connection::GetOutBinds(executeBaton));//, v8::ReadOnly);
        result->Set(NanNew<v8::String>("rows"), NanUndefined());
        result->Set(NanNew<v8::String>("metaData"), NanUndefined());
        break;
      default :
        result->Set(NanNew<v8::String>("rowsAffected"),
                    NanNew<v8::Integer>((unsigned int) executeBaton->rowsAffected));//, v8::ReadOnly);
        if( executeBaton->numOutBinds )
        {
          result->Set(NanNew<v8::String>("outBinds"), Connection::GetOutBinds(executeBaton));//, v8::ReadOnly);
        }
        else
        {
          result->Set(NanNew<v8::String>("outBinds"),NanUndefined());
        }
        result->Set(NanNew<v8::String>("rows"), NanUndefined());
        result->Set(NanNew<v8::String>("metaData"), NanUndefined());
        break;
    }
    argv[1] = result;
  }
  exitAsyncAfterExecute:
  Local<Function> callback = NanNew(executeBaton->cb);
  delete executeBaton;
  NanMakeCallback( NanGetCurrentContext()->Global(), callback, 2, argv );
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to populate Metadata array

   PARAMETERS:
     columnNames - Column Names
     numCols     - number of columns

   RETURNS:
     MetaData Handle
*/
v8::Handle<v8::Value> Connection::GetMetaData (std::string* columnNames,
                                       unsigned int numCols )
{
  NanEscapableScope();
  Handle<Array> metaArray = NanNew<v8::Array>(numCols);
  for(unsigned int i=0; i < numCols ; i++)
  {
    Local<Object> column = NanNew<v8::Object>();
    column->Set(NanNew<v8::String>("name"),
                NanNew<v8::String>(columnNames[i].c_str())
                );
    metaArray->Set(i, column);
  }
  return NanEscapeScope(metaArray);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to populate Rows Array

   PARAMETERS:
     eBaton struct

   RETURNS:
     Rows Handle
*/
v8::Handle<v8::Value> Connection::GetRows (eBaton* executeBaton)
{
  NanEscapableScope();
  Handle<Array> rowsArray;
  switch(executeBaton->outFormat)
  {
    case ROWS_ARRAY :
      rowsArray = NanNew<v8::Array>(executeBaton->rowsFetched);
      for(unsigned int i = 0; i < executeBaton->rowsFetched; i++)
      {
        Local<Array> row = NanNew<v8::Array>(executeBaton->numCols);
        for(unsigned int j = 0; j < executeBaton->numCols; j++)
        {
          row->Set(j, Connection::GetValue(executeBaton, true, j, i));
        }
        rowsArray->Set(i, row);
      }
      break;
    case ROWS_OBJECT :
      rowsArray = NanNew<v8::Array>(executeBaton->rowsFetched);
      for(unsigned int i =0 ; i < executeBaton->rowsFetched; i++)
      {
        Local<Object> row = NanNew<v8::Object>();

        for(unsigned int j = 0; j < executeBaton->numCols; j++)
        {
          row->Set(NanNew<v8::String>(executeBaton->columnNames[j].c_str(),
                               (int) executeBaton->columnNames[j].length()),
                   Connection::GetValue(executeBaton, true, j, i));

        }
        rowsArray->Set(i, row);
      }
      break;
    default :
      executeBaton->error = NJSMessages::getErrorMsg(errInvalidPropertyValue, 
                                                     "outFormat");
      goto exitGetRows;
      break;
  }
  exitGetRows:
  return NanEscapeScope(rowsArray);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to create handle from C++ value

   PARAMETERS:
     executeBaton - eBaton struct
     isQuery      - true if define struct is to be processed
                    false if bind struct is to be processed
     index        - column index in define array /
                    index in binds vector
     row          - row index in define->buf / 
                    always 0 for bind->value

   RETURNS:
     Handle
*/

Handle<Value> Connection::GetValue ( eBaton *executeBaton,
                                     bool isQuery,
                                     unsigned int col,
                                     unsigned int row )
{
  NanEscapableScope();

  if(isQuery)
  {
    // SELECT queries
    Define *define = &(executeBaton->defines[col]);
    long double *dblArr = (long double *)define->buf;
    return NanEscapeScope( Connection::GetValueCommon(
                        executeBaton,
                        define->ind[row],
                        define->fetchType,
                        (define->fetchType == DpiTimestampLTZ ) ?
                          (void *) &dblArr[row] :
                          (void *) ((char *)(define->buf) +
                                   ( row * (define->maxSize ))),
                        define->len[row] ));
  }
  else
  {
    // DML, PL/SQL execution
    Bind *bind = executeBaton->binds[col];
    if(executeBaton->stmtIsReturning)
    {
      return NanEscapeScope(Connection::GetArrayValue (
                                        executeBaton,
                                        executeBaton->binds[col], 
                         (unsigned long)executeBaton->rowsAffected ) );
    }
    else if(bind->type == DpiRSet) 
    {
      return NanEscapeScope ( Connection::GetValueRefCursor (
                                      executeBaton, bind ));
    }
    else if (( bind->type == DpiClob ) ||
             ( bind->type == DpiBlob ) ||
             ( bind->type == DpiBfile))
    {
      return NanEscapeScope ( Connection::GetValueLob (
                                      executeBaton, bind ));
    }
    else
    {
      return NanEscapeScope ( Connection::GetValueCommon (
                                      executeBaton,
                                      bind->ind[row],
                                      bind->type,
                                      (bind->type == DpiTimestampLTZ ) ?
                                         bind->extvalue : bind->value,
                                      bind->len[row] ));
    }
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to create handle for refcursor

   PARAMETERS:
     executeBaton - struct eBaton
     bind         - struct bind

   RETURNS:
     Handle
*/
Handle<Value> Connection::GetValueRefCursor ( eBaton *executeBaton, 
                                              Bind *bind )
{
  NanEscapableScope();
  Handle<Object> resultSet;
  Handle<Value> value;

  if(bind->ind[0] != -1)
  {
    resultSet = NanNew(ResultSet::resultSetTemplate_s)->
                            GetFunction() ->NewInstance();
    (ObjectWrap::Unwrap<ResultSet> (resultSet))->
                       setResultSet( (dpi::Stmt*)(bind->value),
                                     executeBaton );

    // set the prefetch on the cursor object
    ((dpi::Stmt*)(bind->value))->prefetchRows(executeBaton->prefetchRows);
    value = resultSet;
  }
  else
  {
    value = NanNull();
  }
  return NanEscapeScope(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to create handle for lobs

   PARAMETERS:
     executeBaton - struct eBaton
     bind         - struct bind

   RETURNS:
     Handle
*/
Handle<Value> Connection::GetValueLob ( eBaton *executeBaton, 
                                        Bind *bind )
{
  NanEscapableScope();

  if (bind->ind && *bind->ind == -1)
    return NanNull();

  Handle<Value> value;

  ProtoILob *protoILob = *(static_cast<ProtoILob **>(bind->value));

  // The ownership of the handles in ProtoILob is transferred to the
  // ILob object now.  If anything goes wrong, it is the
  // responsibility of the ILob class to free the OCI handles.

  value = NewLob(executeBaton, protoILob);

  // all done with ProtoILob
  delete protoILob;
  *(ProtoILob **)(bind->value) = NULL;
  return NanEscapeScope(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to create handle from C++ value for primitive types

   PARAMETERS:
     ind  - to validate the data,
     type - data type of the value,
     val  - value,
     len  - length of the value

   RETURNS:
     Handle
*/
Handle<Value> Connection::GetValueCommon ( eBaton *executeBaton,
                                           short ind, 
                                           unsigned short type,
                                           void* val, DPI_BUFLEN_TYPE len )
{
  NanEscapableScope();
  Handle<Value> value;
  Local<Date> date;

  if(ind != -1)
  {
     switch(type)
     {
       case (dpi::DpiVarChar) :
          value = NanNew<v8::String>((char*)val, len);
        break;
       case (dpi::DpiInteger) :
         value = NanNew<v8::Integer>(*(int*)val);
         break;
       case (dpi::DpiDouble) :
         value = NanNew<v8::Number>(*(double*)val);
         break;
       case (dpi::DpiTimestampLTZ) :
         date = NanNew<v8::Date>( *(long double*)val );
         value = date;
        break;
        // The LOB types are hit only by the define code path
        // The bind code path has its own Connection::GetValueLob method
       case (dpi::DpiClob):
       case (dpi::DpiBlob):
       case (dpi::DpiBfile):
       {
         ProtoILob *protoILob = *(static_cast<ProtoILob **>(val));
         value = NewLob(executeBaton, protoILob);
         delete protoILob;
         *(ProtoILob **)val = NULL;
       }
       break;
       default :
         break;
    }
  }
  else
  {
    value = NanNull();
  }
  return NanEscapeScope(value);
}


/*****************************************************************************/
/*
  DESCRIPTION
    To get an array as v8-Value from Bind structure - used in DML Returning

  PARAMETERS
    bind     - bind structure
    count    - row count

  Returns
    v8::Value  - this will be an array (even for 1 row, array or 1).
*/
v8::Handle<v8::Value> Connection::GetArrayValue ( eBaton *executeBaton,
                                                  Bind *binds, unsigned long count )
{
  NanEscapableScope();
  Local<Date> date;
  Local<Array> arrVal;
  unsigned long index = 0;
  Handle<Value> val;

  /* To return a value of array type, create one of specified size */
  arrVal = NanNew<v8::Array>( count ) ;

  for ( index = 0 ; index < count ; index ++ )
  {
    if(
        binds->ind[index] == -1 && 
        ( 
          (binds->type == dpi::DpiVarChar) ||
          (binds->type == dpi::DpiInteger) ||
          (binds->type == dpi::DpiDouble) ||
          (binds->type == dpi::DpiTimestampLTZ ||
           binds->type == dpi::DpiClob ||
           binds->type == dpi::DpiBlob)
        )
      )
    {
      arrVal->Set( index, NanNull() );
      continue;
    }

    switch ( binds->type )
    {
    case dpi::DpiVarChar:
      arrVal->Set ( index,
                    NanNew<v8::String> ((char *)binds->value +
                                        (index * binds->maxSize ),
                                        binds->len2[index]));
      break;
    case dpi::DpiInteger:
      arrVal->Set ( index,
                    NanNew<v8::Integer> ( *((int *)binds->value + index )));
      break;
    case dpi::DpiDouble:
      arrVal->Set ( index,
                    NanNew<v8::Number> ( *((double *)binds->value + index )));
      break;
    case dpi::DpiTimestampLTZ:
        arrVal->Set ( index, 
                      NanNew<v8::Date> (*((long double *)binds->extvalue + index )) );
      break;
    case dpi::DpiClob:
    case dpi::DpiBlob:
    {
      ProtoILob *protoILob = *((ProtoILob **)binds->value + index);
      val = NewLob(executeBaton, protoILob);
      arrVal->Set ( index, NanNew<v8::Value>(val));
      delete protoILob;
      *(ProtoILob **)binds->value = NULL;
    }
    break;
                    
    default:
      break;
    }
  }
  return NanEscapeScope( arrVal ) ;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Method to populate outbinds object/array

   PARAMETERS:
     eBaton struct

   RETURNS:
     Outbinds object/array
*/
v8::Handle<v8::Value> Connection::GetOutBinds (eBaton* executeBaton)
{
  NanEscapableScope();

  if(!executeBaton->binds.empty())
  {
    if( executeBaton->binds[0]->key.empty() )
    {
      // Binds as JS array
      return NanEscapeScope(GetOutBindArray( executeBaton ));
    }
    else
    {
      // Binds as JS object 
      return NanEscapeScope(GetOutBindObject( executeBaton ));
    }
  }
  return NanUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to populate outbinds array

   PARAMETERS:
     Binds , out binds count

   RETURNS:
     Outbinds array
*/
v8::Handle<v8::Value> Connection::GetOutBindArray ( eBaton *executeBaton )
{
  NanEscapableScope();

  std::vector<Bind*>binds = executeBaton->binds;

  Local<Array> arrayBinds = NanNew<v8::Array>( executeBaton->numOutBinds );

  unsigned int it = 0;
  for(unsigned int index = 0; index < binds.size(); index++)
  {
    if(binds[index]->isOut)
    {
      Handle<Value> val ;
      val = Connection::GetValue ( executeBaton, false, index ); 
      arrayBinds->Set( it, val );
      it ++;
    }
  }
  return NanEscapeScope(arrayBinds);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Method to populate outbinds object

   PARAMETERS:
     Binds

   RETURNS:
     Outbinds object
*/
v8::Handle<v8::Value> Connection::GetOutBindObject ( eBaton *executeBaton )
{
  std::vector<Bind*>binds = executeBaton->binds;

  NanEscapableScope();
  Local<Object> objectBinds = NanNew<v8::Object>();
  for(unsigned int index = 0; index < binds.size(); index++)
  {
    if(binds[index]->isOut)
    {
      Handle<Value> val;

      binds[index]->key.erase(binds[index]->key.begin());

      val = Connection::GetValue ( executeBaton, false, index );
      objectBinds->Set( NanNew<v8::String> ( binds[index]->key.c_str(),
                        (int) binds[index]->key.length() ),
                        val );
    }
  }
  return NanEscapeScope(objectBinds);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Release method on Connection class.

   PARAMETERS:
     Arguments - Callback
*/
NAN_METHOD(Connection::Release)
{
  NanScope();
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, args );

  eBaton* releaseBaton = new eBaton;
  NanAssignPersistent( releaseBaton->cb, callback );
  NJS_CHECK_NUMBER_OF_ARGS ( releaseBaton->error, args, 1, 1, exitRelease );
  connection = ObjectWrap::Unwrap<Connection>(args.This());

  if(!connection->isValid_)
  {
    releaseBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitRelease;
  }
  connection->isValid_    = false;
  releaseBaton->dpiconn   = connection->dpiconn_;
  exitRelease:
  releaseBaton->req.data  = (void*) releaseBaton;

  uv_queue_work(uv_default_loop(), &releaseBaton->req,
               Async_Release, (uv_after_work_cb)Async_AfterRelease);
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of Release method

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution
*/
void Connection::Async_Release(uv_work_t *req)
{
  eBaton *releaseBaton = (eBaton*)req->data;
  if(!(releaseBaton->error).empty()) goto exitAsyncRelease;

  try
  {
    releaseBaton->dpiconn->release();
  }
  catch (dpi::Exception& e)
  {
    releaseBaton->error = std::string(e.what());
  }
  exitAsyncRelease:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Release method

   PARAMETERS:
     UV queue work block
*/
void Connection::Async_AfterRelease(uv_work_t *req)
{
  NanScope();
  eBaton *releaseBaton = (eBaton*)req->data;
  v8::TryCatch tc;

  Handle<Value> argv[1];

  if(!(releaseBaton->error).empty())
    argv[0] = v8::Exception::Error(NanNew<v8::String>((releaseBaton->error).c_str()));
  else
    argv[0] = NanUndefined();
  Local<Function> callback = NanNew(releaseBaton->cb);
  delete releaseBaton;
  NanMakeCallback( NanGetCurrentContext()->Global(),
                      callback, 1, argv );
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Commit method on Connection class.

   PARAMETERS:
     Arguments - Callback
*/
NAN_METHOD(Connection::Commit)
{
  NanScope();
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, args );

  eBaton* commitBaton = new eBaton;
  NanAssignPersistent( commitBaton->cb, callback );
  NJS_CHECK_NUMBER_OF_ARGS ( commitBaton->error, args, 1, 1, exitCommit );
  connection = ObjectWrap::Unwrap<Connection>(args.This());

  if(!connection->isValid_)
  {
    commitBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitCommit;
  }
  commitBaton->dpiconn   = connection->dpiconn_;
exitCommit:
  commitBaton->req.data  = (void*) commitBaton;

  uv_queue_work(uv_default_loop(), &commitBaton->req,
               Async_Commit, (uv_after_work_cb)Async_AfterCommit);

  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of Commit method

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution
*/
void Connection::Async_Commit (uv_work_t *req)
{
  eBaton *commitBaton = (eBaton*)req->data;

  if(!(commitBaton->error).empty()) goto exitAsyncCommit;

  try
  {
    commitBaton->dpiconn->commit();
  }
  catch (dpi::Exception& e)
  {
    commitBaton->error = std::string(e.what());
  }
  exitAsyncCommit:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Commit method

   PARAMETERS:
     UV queue work block
*/
void Connection::Async_AfterCommit (uv_work_t *req)
{
  NanScope();
  eBaton *commitBaton = (eBaton*)req->data;

  v8::TryCatch tc;
  Handle<Value> argv[1];

  if(!(commitBaton->error).empty())
    argv[0] = v8::Exception::Error(NanNew<v8::String>((commitBaton->error).c_str()));
  else
    argv[0] = NanUndefined();

  NanMakeCallback( NanGetCurrentContext()->Global(),
                      NanNew(commitBaton->cb), 1, argv );
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
  delete commitBaton;
}

/*****************************************************************************/
/*
   DESCRIPTION
    Rollback method on Connection class.

   PARAMETERS:
     Arguments - Callback
*/
NAN_METHOD(Connection::Rollback)
{
  NanScope();
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, args );

  eBaton* rollbackBaton = new eBaton;
  NanAssignPersistent( rollbackBaton->cb, callback );
  NJS_CHECK_NUMBER_OF_ARGS ( rollbackBaton->error, args, 1, 1, exitRollback );
  connection = ObjectWrap::Unwrap<Connection>(args.This());

  if(!connection->isValid_)
  {
    rollbackBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitRollback;
  }
  rollbackBaton->dpiconn   = connection->dpiconn_;
  exitRollback:
  rollbackBaton->req.data  = (void*) rollbackBaton;
  uv_queue_work(uv_default_loop(), &rollbackBaton->req,
                Async_Rollback, (uv_after_work_cb)Async_AfterRollback);
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of Rollback method

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution
*/
void Connection::Async_Rollback (uv_work_t *req)
{

  eBaton *rollbackBaton = (eBaton*)req->data;
  if(!(rollbackBaton->error).empty()) goto exitAsyncRollback;

  try
  {
    rollbackBaton->dpiconn->rollback();
  }
  catch (dpi::Exception& e)
  {
    rollbackBaton->error = std::string(e.what());
  }
  exitAsyncRollback:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Rollback method

   PARAMETERS:
     UV queue work block
*/
void Connection::Async_AfterRollback(uv_work_t *req)
{
  NanScope();
  eBaton *rollbackBaton = (eBaton*)req->data;

  v8::TryCatch tc;
  Handle<Value> argv[1];

  if(!(rollbackBaton->error).empty())
    argv[0] = v8::Exception::Error(NanNew<v8::String>((rollbackBaton->error).c_str()));
  else
    argv[0] = NanUndefined();

  NanMakeCallback( NanGetCurrentContext()->Global(),
                      NanNew(rollbackBaton->cb), 1, argv );
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
  delete rollbackBaton;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Break method on Connection class.

   PARAMETERS:
     Arguments - Callback
*/
NAN_METHOD(Connection::Break)
{
  NanScope();
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, args );

  eBaton* breakBaton = new eBaton;
  NanAssignPersistent( breakBaton->cb, callback );
  NJS_CHECK_NUMBER_OF_ARGS ( breakBaton->error, args, 1, 1, exitBreak );
  connection = ObjectWrap::Unwrap<Connection>(args.This());

  if(!connection->isValid_)
  {
    breakBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitBreak;
  }
  breakBaton->dpiconn   = connection->dpiconn_;
  exitBreak:
  breakBaton->req.data  = (void*) breakBaton;

  uv_queue_work(uv_default_loop(), &breakBaton->req,
               Async_Break, (uv_after_work_cb)Async_AfterBreak);

  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of Break method

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution
*/
void Connection::Async_Break(uv_work_t *req)
{

  eBaton *breakBaton = (eBaton*)req->data;

  if(!(breakBaton->error).empty()) goto exitAsyncBreak;

  try
  {
    breakBaton->dpiconn->breakExecution();
  }
  catch (dpi::Exception& e)
  {
    breakBaton->error = std::string(e.what());
  }
  exitAsyncBreak:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Break method

   PARAMETERS:
     UV queue work block
*/
void Connection::Async_AfterBreak (uv_work_t *req)
{
  NanScope();
  eBaton *breakBaton = (eBaton*)req->data;

  v8::TryCatch tc;
  Handle<Value> argv[1];

  if(!(breakBaton->error).empty()) 
    argv[0] = v8::Exception::Error(NanNew<v8::String>((breakBaton->error).c_str()));
  else
    argv[0] = NanUndefined();
  NanMakeCallback( NanGetCurrentContext()->Global(),
                      NanNew(breakBaton->cb), 1, argv );
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
  delete breakBaton;
}

/****************************************************************************/
/* NAME
 *   Connection::v8Date2OraDate
 *
 * DESCRIPTION
 *   To convert v8::Date value (double value in milli seconds) to Oracle DB Type
 *
 * PARAMETERS
 *   val      - expected to be a v8::Date Value
 *   bind     - bind structure to update.
 *
 * NOTE:
 *   This function is used for IN Bind parameters, when v8::Date value is
 *   passed, conversion to Oracle-DB Type happens here.
 *
 */
void Connection::v8Date2OraDate ( Handle<Value> val, Bind *bind)
{
  NanScope();
  Handle<Date> date = val.As<Date>();    // Expects to be of v8::Date type

  // Get the number of seconds from 1970-1-1 0:0:0
  *(long double *)(bind->extvalue) = date->NumberValue ();
}

/***************************************************************************/
/* NAME
 *   Connection::UpdateDateValue
 *
 * DESCRIPTION
 *   Update the double-date value in Bind structure
 *
 * PARAMETERS
 *   ebaton   - execute Baton
 *   index    - position in the binds array
 *
 * NOTE:
 *   When execution process starts, base date is not initialized yet,
 *   Once the stmt object is created and datetimeArray object created,
 *   conversion can happen.  This funciton is used to convert
 *   Used for IN bind to provide the v8::Date value.
 *
 */
void Connection::UpdateDateValue ( eBaton * ebaton, unsigned int index )
{
  Bind * bind = ebaton->binds[index];

  if ( bind->type == dpi::DpiTimestampLTZ )
  {
    bind->dttmarr = ebaton->dpienv->getDateTimeArray (
                                        ebaton->dpistmt->getError () );
    bind->value = bind->dttmarr->init (1);
    if (!bind->isOut)
    {
      bind->dttmarr->setDateTime( 0,
                                  (*(long double *)bind->extvalue));
    }
  }
}



/*****************************************************************************/
/*
  DESCRITION
    callback/Utility function to allocate for BIND values (IN & OUT).
    This has been consolidated to a callback/utility funciton so that
    allocation happens only once.
    For IN binds, the allocation and initialization happens in 
    GetInBindParams()
    For OUT binds the allocation happens in PrepareAndBind ().
    For OUT binds using RETURNING INTO clause, this function is used as
    callback.

  PARAMETERS
    ctx    - Pointer to Bind structure
    nRows  - number of Rows (to allocate).

  RETURNS
    -None-
*/
void Connection::cbDynBufferAllocate ( void *ctx, bool dmlReturning, 
                                       unsigned int nRows,
                                       unsigned int bndpos)
{
  eBaton *executeBaton = (eBaton *)ctx;
  Bind *bind = (Bind *)executeBaton->binds[bndpos];

  bind->ind = (short *)malloc ( nRows * sizeof ( short ) ) ;
  if ( dmlReturning )
  {
    bind->len2 = ( unsigned int *)malloc ( nRows * sizeof ( unsigned int ) );
  }
  else
  {
    bind->len = (DPI_BUFLEN_TYPE *)malloc ( nRows * 
                                            sizeof ( DPI_BUFLEN_TYPE ) );
  }

  switch ( bind->type )
  {
  case dpi::DpiVarChar:
    /* one extra char for EOS */
    bind->value = (char *)malloc ( ( bind->maxSize + 1) * nRows ) ;
    if ( dmlReturning )
    {
      *(bind->len2) = (unsigned int)bind->maxSize ;
    }
    else
    {
      *(bind->len) = (unsigned int)bind->maxSize;
    }
    break;

  case dpi::DpiInteger:
    bind->value = ( int *) malloc ( sizeof (int) * nRows ) ;
    if ( !dmlReturning )
    {
      *(bind->len) = sizeof ( int ) ;
    }
    break;

  case dpi::DpiUnsignedInteger:
    bind->value = ( unsigned int *)malloc ( sizeof ( unsigned int ) * nRows );
    if ( !dmlReturning )
    {
      *(bind->len) = sizeof ( unsigned int ) ;
    }
    break;

  case dpi::DpiDouble:
    bind->value = ( double *)malloc ( sizeof ( double ) * nRows );
    if ( !dmlReturning )
    {
      *(bind->len) = sizeof ( double ) ;
    }
    break;

  case dpi::DpiClob:
  case dpi::DpiBlob:
    // needed to post-process DML RETURNING of LOBs
    // rowsReturns for INSERT will be zero, 
    // but we still need to allocate one descriptor
    bind->rowsReturned = 1;
    if (nRows > 1)
      bind->rowsReturned = nRows;
    // allocate the array of Descriptor **
    bind->value = (void *)malloc(sizeof(Descriptor *) * bind->rowsReturned);
    // and allocate the underlying descriptor(s)
    for (unsigned int rowsidx = 0; rowsidx < bind->rowsReturned; rowsidx++)
    {
      Descriptor **lobpp = ((Descriptor **)bind->value) + rowsidx;

      *lobpp = executeBaton->dpienv->allocDescriptor(LobDescriptorType);
    }
    if ( !dmlReturning )
    {
      *(bind->len) = sizeof ( Descriptor * ) ;
    }
    break;

  case dpi::DpiTimestampLTZ:
    {
      bind->extvalue = (long double *) malloc ( sizeof ( long double ) * nRows );
      // needed to post-process DML RETURNING of TimestampLTZ
      // rowsReturns for INSERT will be zero, 
      // but we still need to allocate one descriptor
      bind->rowsReturned = 1;
      if (nRows > 1)
        bind->rowsReturned = nRows;
      bind->dttmarr = executeBaton->dpienv->getDateTimeArray (
        executeBaton->dpistmt->getError () );
      bind->value = bind->dttmarr->init(nRows);
    }
    break;
  }
}

/****************************************************************************/
/*
    DESCRIPTION
      Application (Driver) level callback used for Dynamic Binding, this
      function idenfies block of memory for each cell.
      As the driver knows the type, size based on type, buffer allocated, this
      callback is the best place to provide such data.

    PARAMETERS
      ctx   (IN)      context
      nRows (IN)      # of rows (after execution, so knows rows-affected)
      index (IN)      row index
      bufpp (INOUT)   buffer for the cell
      alenpp (INOUT)   buffer for actual length
      indpp (INOUT)   buffer for the indicator
      rcode (INOUT)   return code - not used
      piecep (INOUT)  for piece wise operations.

    RETURN
      0.  (Any non zero value to indicate errors).

    NOTE:
      1. DATE/TIMESTAMP not supported
      2. using bind->len2 for DML returning (not bind->len)
*/

int Connection::cbDynBufferGet ( void *ctx, DPI_SZ_TYPE nRows,
                                 unsigned int bndpos,
                                 unsigned long iter, unsigned long index,
                                 dvoid **bufpp, void **alenpp, void **indpp,
                                 unsigned short **rcode, unsigned char *piecep)
{
  eBaton *executeBaton = (eBaton *)ctx;
  Bind *bind = (Bind *)executeBaton->binds[bndpos];
  
  int ret = 0;

  if (*piecep == OCI_ONE_PIECE )
  {
    *piecep = OCI_ONE_PIECE ;  /* Use ONE PIECE by default */

    /*
     * NOTE:  The allocation when index == 0 has to be done for each iter
     *        when supporting ARRAY binds
     */

    // First time callback, allocate the buffer(s).
    if ( index == 0 )
    {
      Connection::cbDynBufferAllocate(ctx, true, (unsigned long)nRows, bndpos);
    }

    bind->ind[index] = -1;

    // Find block of memory for this index
    switch ( bind->type )
    {
    case dpi::DpiVarChar:
      bind->len2[index] = (unsigned int)bind->maxSize;
      /* 1 extra char for EOS, 1 extra to determine insufficient buf later */
      *bufpp = (void *)&(((char *)bind->value)[ (bind->maxSize) * index]);
      /* Buffer provided by the application could be small, in this case to
       * determine the callback is called again, we need the piecep, update
       * piece to FIRST PIECE.
       */
      *piecep = OCI_FIRST_PIECE;
      break;
    case dpi::DpiInteger:
      bind->len2[index] = sizeof ( int ) ;
      *bufpp = ( void *)&(((int *)bind->value)[index]);
      break;
    case dpi::DpiUnsignedInteger:
      bind->len2[index] = sizeof ( unsigned int ) ;
      *bufpp = ( void *)&(((unsigned int *)bind->value)[index]);
      break;

    case dpi::DpiDouble:
      bind->len2[index] = sizeof ( double ) ;
      *bufpp = (void *)&(((double *)bind->value)[index]);
      break;

    case dpi::DpiBlob:
    case dpi::DpiClob:

      // The bind variable is a pointer to a LOB descriptor pointer
      bind->len2[index] = sizeof(Descriptor *);
      // allocate the LOB descriptor 
      // *bufpp = ((void **)bind->value)[index];
      // *bufpp = (void *)*(((Descriptor **)bind->value) + index);
      *bufpp = (void *)((Descriptor **)bind->value)[index];
      break;

    case dpi::DpiTimestampLTZ:
      *bufpp = (void *)((void **)bind->value)[index];
      bind->len2[index] = sizeof(void *);
      break;
    }

    *alenpp = &(bind->len2[index]);
    *indpp  = &(bind->ind[index]);
  }
  else
  {
    /* PIECE wise opearation is not supported for NUMBER/DATE type(s)
     * only String and in future LOB, etc.
     * Currently if the user provided a small buffer, we need to stop
     * the callback being called, and report error
     */
    *piecep = OCI_LAST_PIECE ;
    ret = -1;
  }

  return ret;
}



/*****************************************************************************/
/*
  DESCRIPTION
    Create a new LOB object.

  PARAMETERS
    none

  RETURNS
    a Lob object

   NOTES
     Note that this method is called from the main thread.  Therefore, it
     should *NOT* use any blocking (OCI) calls.

     The call stack is Async_AfterExecute()->GetRows()->GetValue()->NewLob().

     The Async_After+() methods are called from the main thread.

     If we want to keep track of the number of unfreed ILobs in a connection,
     then we can increment a counter in the Connection object here.  Note that
     decrementing the counter should also happen in the main thread when an
     ILob is successfully freed (.e.g. on an error in _read(), _write(),
     etc. or at EOF in _read() or at end() when writing a Lob??

*/

v8::Handle<v8::Value> Connection::NewLob(eBaton* executeBaton,
                                         ProtoILob *protoILob)
{
  NanEscapableScope();
  Connection     *connection = executeBaton->njsconn;
  // Handle<Object>  jsOracledb = connection->oracledb_->jsOracledb;
  Handle<Object>  jsOracledb = NanNew(connection->oracledb_->jsOracledb);
  Handle<Value>   argv[1];
  
  Handle<Object>  iLob = NanNew(ILob::iLobTemplate_s)->GetFunction()->NewInstance();
  
      // the ownership of all handles in the ProtoILob are transferred to ILob
      // here.  Any error in initialization of ILob will cleanup the OCI
      // handles in the ILob cleanup routine.

  (ObjectWrap::Unwrap<ILob>(iLob))->setILob(executeBaton, protoILob);

  if (!executeBaton->error.empty())
    return NanNull();

  argv[0] = iLob;

  Handle<Value>   result =
    Local<Function>::Cast(jsOracledb->Get(NanNew<v8::String>("newLob")))->Call(
      jsOracledb, 1, argv);

  return NanEscapeScope(result);
}



/*****************************************************************************/
/*
   DESCRIPTION
     GetLob method on Connection class.

   PARAMETERS
     none

  RETURNS
    A Lob object

   NOTES
     Shows example method to call the Oracledb.newLob() method from a
     Connection class method.  That is, Connection.getLob() calls
     Oracledb.newLob().

     This method is unused as we call Oracledb.newLob() from the C++
     Connection::NewLob() method in Connection::GetValue().  This is much more
     performant than going across language boundries twice to get a Lob.
*/

NAN_METHOD(Connection::GetLob)
{
  NanScope();
  Connection     *connection = ObjectWrap::Unwrap<Connection>(args.This());
  //Handle<Object>  jsOracledb = connection->oracledb_->jsOracledb;
  Handle<Object>  jsOracledb = NanNew(connection->oracledb_->jsOracledb);
  Handle<Value>   argv[1];
  
  Handle<Value>   result =
    Local<Function>::Cast(jsOracledb->Get(NanNew<v8::String>("newLob")))->Call(
      jsOracledb, 1, argv);

  NanReturnValue(result);
}



/* end of file njsConnection.cpp */
