/* Copyright (c) 2015, 2016, Oracle and/or its affiliates.
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
#include <limits>
using namespace std;

// persistent Connection class handle
Nan::Persistent<FunctionTemplate> Connection::connectionTemplate_s;

// default value for bind option maxSize
#define NJS_MAX_OUT_BIND_SIZE 200

// max number of bytes for data converted to string with fetchAsString or fetchInfo
#define NJS_MAX_FETCH_AS_STRING_SIZE 200

// number of rows prefetched by non-ResultSet queries
#define NJS_PREFETCH_NON_RESULTSET 2 

#define NJS_SIZE_T_MAX std::numeric_limits<std::size_t>::max()

#define NJS_SIZE_T_OVERFLOW(maxSize,maxRows)                                  \
 ( ( ( maxSize != 0 ) &&                                                      \
     ( ( ( NJS_SIZE_T_MAX ) / ( (size_t)maxSize ) ) < (maxRows) ) ) ? 1 : 0)  \


/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the Connection class.
 */
Connection::Connection()
{
   dpiconn_             = (dpi::Conn *)0;
   oracledb_            = (Oracledb *)0;
   oracleServerVersion_ = 0;
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
   this->dpiconn_   = dpiconn;
   this->isValid_   = true;
   this->oracledb_  = oracledb;
   this->lobCount_  = 0;
   this->rsCount_   = 0;
   this->dbCount_   = 0;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Init function of the Connection class.
     Initiates and maps the functions and properties of Connection class.
*/
void Connection::Init(Handle<Object> target)
{
  Nan::HandleScope scope;

  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  tpl->SetClassName(Nan::New<v8::String>("Connection").ToLocalChecked());

  Nan::SetPrototypeMethod(tpl, "execute", Execute);
  Nan::SetPrototypeMethod(tpl, "release", Release);
  Nan::SetPrototypeMethod(tpl, "commit", Commit);
  Nan::SetPrototypeMethod(tpl, "rollback", Rollback);
  Nan::SetPrototypeMethod(tpl, "break", Break);

  Nan::SetAccessor(tpl->InstanceTemplate(),
                                              Nan::New<v8::String>("stmtCacheSize").ToLocalChecked(),
                                              Connection::GetStmtCacheSize,
                                              Connection::SetStmtCacheSize );
  Nan::SetAccessor(tpl->InstanceTemplate(),
                                              Nan::New<v8::String>("clientId").ToLocalChecked(),
                                              Connection::GetClientId,
                                              Connection::SetClientId );
  Nan::SetAccessor(tpl->InstanceTemplate(),
                                              Nan::New<v8::String>("module").ToLocalChecked(),
                                              Connection::GetModule,
                                              Connection::SetModule );
  Nan::SetAccessor(tpl->InstanceTemplate(),
                                              Nan::New<v8::String>("action").ToLocalChecked(),
                                              Connection::GetAction,
                                              Connection::SetAction );

  Nan::SetAccessor(tpl->InstanceTemplate(),
                 Nan::New<v8::String>("oracleServerVersion").ToLocalChecked(),
                 Connection::GetOracleServerVersion,
                 Connection::SetOracleServerVersion );
  

  connectionTemplate_s.Reset(tpl);
  Nan::Set(target, Nan::New<v8::String>("Connection").ToLocalChecked(), tpl->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of connection is called from JS
*/
NAN_METHOD(Connection::New)
{
  Connection *connection = new Connection();
  connection->Wrap(info.Holder());

  info.GetReturnValue().Set(info.Holder());
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
  Nan::HandleScope scope;

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
NAN_GETTER(Connection::GetStmtCacheSize)
{
  Connection* njsConn = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());
  NJS_CHECK_OBJECT_VALID2( njsConn, info ) ;
  if(!njsConn->isValid_)
  {
    string error = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
    info.GetReturnValue().SetUndefined();
    return;
  }
  try
  {
    info.GetReturnValue().Set(njsConn->dpiconn_->stmtCacheSize());
    return;
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS (  e.errnum(), njsConn->dpiconn_ );
    NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
  }
  info.GetReturnValue().Set(Nan::Undefined());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize property - throws error
*/
NAN_SETTER(Connection::SetStmtCacheSize)
{
  Connection *connection = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());

  NJS_CHECK_OBJECT_VALID ( connection );

  connectionPropertyException(connection, errReadOnly, "stmtCacheSize");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of clientId property - This is write-only property,
     returning NULL for debugging purpose in case of read
*/
NAN_GETTER(Connection::GetClientId)
{
  info.GetReturnValue().SetNull();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of clientId property
*/
NAN_SETTER(Connection::SetClientId)
{
  Connection* njsConn = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());
  NJS_CHECK_OBJECT_VALID(njsConn) ;

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
    try
    {
      njsConn->dpiconn_->clientId(client);
    }
    catch(dpi::Exception &e)
    {
      NJS_SET_CONN_ERR_STATUS (  e.errnum(), njsConn->dpiconn_ );
      NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    }
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of module property - This is write-only property,
     returning NULL for debugging purpose in case of read
*/
NAN_GETTER(Connection::GetModule)
{
  info.GetReturnValue().SetNull();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize property
*/
NAN_SETTER(Connection::SetModule)
{
  Connection *njsConn = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());
  NJS_CHECK_OBJECT_VALID (njsConn ) ;
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
    try
    {
      njsConn->dpiconn_->module(module);
    }
    catch(dpi::Exception &e)
    {
      NJS_SET_CONN_ERR_STATUS (  e.errnum(), njsConn->dpiconn_ );
      NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    }
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of action property - This is write-only property,
     returning NULL for debugging purpose in case of read
*/
NAN_GETTER(Connection::GetAction)
{
  info.GetReturnValue().SetNull();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of action property
*/
NAN_SETTER(Connection::SetAction)
{
  Connection *njsConn = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());
  NJS_CHECK_OBJECT_VALID ( njsConn ) ;
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
    try
    {
      njsConn->dpiconn_->action(action);
    }
    catch(dpi::Exception &e)
    {
      NJS_SET_CONN_ERR_STATUS (  e.errnum(), njsConn->dpiconn_ );
      NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    }
  }
}
/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of OracleServerVersion Property
*/
NAN_GETTER (Connection::GetOracleServerVersion)
{
  Connection *njsConn = ObjectWrap::Unwrap<Connection>(info.Holder());

  NJS_CHECK_OBJECT_VALID2 ( njsConn, info ) ;
  if ( !njsConn->isValid_ )
  {
    string error = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION(error.c_str(), error.length() );
    info.GetReturnValue().SetUndefined();
  }

  try
  {
    if ( !njsConn->oracleServerVersion_ )
    {
      /* Updating the member variable is not thread-safe, but all threads
       * will get same value from DB and update the value which is atomic
       * and so it is ok.
       */
      unsigned int ver = njsConn->dpiconn_->getServerVersion ();

      njsConn-> oracleServerVersion_ =
                        100000000 * ( ( ver >> 24 ) & 0x000000FF ) +
                          1000000 * ( ( ver >> 20 ) & 0x0000000F ) +
                            10000 * ( ( ver >> 12 ) & 0x000000FF ) +
                              100 * ( ( ver >>  8 ) & 0x0000000F ) +
                                    ( ( ver >>  0 ) & 0x000000FF ) ;
    }

    Local<Integer> value = Nan::New<v8::Integer>(
                             (unsigned int ) njsConn-> oracleServerVersion_ );
    info.GetReturnValue().Set( value );
  }
  catch ( dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), njsConn->dpiconn_ );
    NJS_SET_EXCEPTION ( e.what(), strlen (e.what () ) );
    info.GetReturnValue().SetUndefined();
  }
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of OracleServerVersion Property
*/
NAN_SETTER(Connection::SetOracleServerVersion)
{
  Connection *connection = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());
  NJS_CHECK_OBJECT_VALID(connection);
  connectionPropertyException(connection, errReadOnly, "oracleServerVersion" );
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
  Local<Function> callback;
  Local<String> sql;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, info );

  connection = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());

  /* If connection is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( connection, info ) ;

  eBaton *executeBaton = new eBaton ( connection->DBCount (), callback );

  NJS_CHECK_NUMBER_OF_ARGS ( executeBaton->error, info, 2, 4, exitExecute );

  if(!connection->isValid_)
  {
    executeBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitExecute;
  }
  NJS_GET_ARG_V8STRING (sql, executeBaton->error, info, 0, exitExecute);
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

  if(info.Length() > 2)
  {
    Connection::ProcessBinds(info, 1, executeBaton);
    if(!executeBaton->error.empty()) goto exitExecute;
  }
  if(info.Length() > 3)
  {
    Connection::ProcessOptions(info, 2, executeBaton);
     if(!executeBaton->error.empty()) goto exitExecute;
  }

  exitExecute:
  executeBaton->req.data  = (void*) executeBaton;
  int status = uv_queue_work(uv_default_loop(), &executeBaton->req,
               Async_Execute, (uv_after_work_cb)Async_AfterExecute);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete executeBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "Execute" );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
  }

  info.GetReturnValue().SetUndefined();
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
void Connection::ProcessBinds (Nan::NAN_METHOD_ARGS_TYPE args, unsigned int index,
                               eBaton* executeBaton)
{
  Nan::HandleScope scope;
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
void Connection::ProcessOptions (Nan::NAN_METHOD_ARGS_TYPE args, unsigned int index,
                                 eBaton* executeBaton)
{
  Nan::HandleScope scope;
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
    Local<Value> val = options->Get(Nan::New<v8::String>("fetchInfo").ToLocalChecked());
    if ( !val->IsUndefined () && !val->IsNull () )
    {
      Local<Object> fetchInfo = val->ToObject();
      Local<Array> keys = fetchInfo->GetOwnPropertyNames ();
      if ( keys->Length () > 0 )
      {
        FetchInfo *fInfo = executeBaton->fetchInfo = 
                           new FetchInfo[keys->Length()];
        executeBaton->fetchInfoCount = keys->Length ();

        for (unsigned int index = 0 ; index < keys->Length() ; index ++ )
        {
          unsigned int tmptype = 0 ;

          Local<String> temp = keys->Get (index).As<String>();
          NJSString (fInfo[index].name, temp );

          Local<Object> colInfo = fetchInfo->Get (Nan::New<v8::String>(
                                     fInfo[index].name ).ToLocalChecked())->ToObject();

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
  Nan::HandleScope scope;
  std::string str;
  Local<Array> array = bindobj->GetOwnPropertyNames();

  for(unsigned int index=0; index<array->Length(); index++)
  {
    Bind* bind = new Bind;
    Handle<String> temp = array->Get(index).As<String>();
    NJSString(str, temp);
    bind->key = ":"+std::string(str);
    Local<Value> val__ = bindobj->Get(Nan::New<v8::String>((char*)str.c_str(),
                           (int) str.length()).ToLocalChecked());
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
  Nan::HandleScope scope;

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
void Connection::GetBindUnit (Local<Value> val, Bind* bind,
                                       eBaton* executeBaton)
{
  Nan::HandleScope scope;
  unsigned int dir   = BIND_IN;

  if(val->IsObject() && !val->IsDate() && !Buffer::HasInstance(val))
  {
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
    
    NJS_GET_UINT_FROM_JSON(bind->maxArraySize, executeBaton->error, bind_unit,
                           "maxArraySize", 1, exitGetBindUnit);


    Local<Value> element = bind_unit->Get(
                               Nan::New<v8::String>("val").ToLocalChecked());

    /*
     * For IN binds maxArraySize is ignored and obtained from array size
     * For INOUT bind, we do need maxArraySize to be specified by application
     * For OUT bind, we can NOT determine the out value as ARRAY and so 
     * no validation done here.
     */
    if ( element->IsArray () )
    {
      Local<Array>arr = Local<Array>::Cast (element);
      
      if ( dir == BIND_INOUT && ( arr->Length() > bind->maxArraySize ) )
      {
        executeBaton->error = NJSMessages::getErrorMsg ( errInvalidArraySize );
        goto exitGetBindUnit;
      }

      /* For IN bind, empty array is not allowed */      
      if ( ( dir == BIND_IN || dir == BIND_INOUT ) && ( arr->Length () == 0 ) )
      {
        executeBaton->error = NJSMessages::getErrorMsg ( errEmptyArray ) ;
        goto exitGetBindUnit;
      }
    }
    
    /* REFCURSOR(s) are supported only as OUT Binds now */
    if ( bind->type == DATA_CURSOR && dir != BIND_OUT )
    {
      executeBaton->error = NJSMessages::getErrorMsg (
                                            errInvalidPropertyValueInParam,
                                            "type", 2 ) ;
      goto exitGetBindUnit;
    }
    
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
        executeBaton->error = NJSMessages::getErrorMsg (
                                       errInvalidBindDirection);
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
  Nan::HandleScope scope;

  if ( bind->maxArraySize > 0 )
  {
    if ( (dataType != DATA_STR ) && ( dataType != DATA_NUM ) )
    {
      executeBaton->error = NJSMessages::getErrorMsg (
                                     errInvalidTypeForArrayBind );
      goto exitGetOutBindParams;
    }
    else
    {
      bind->isArray = true;
    }
  }
  
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
      break;

    case DATA_CURSOR :
      bind->type     = dpi::DpiRSet;
      break;

    case DATA_BUFFER :
      bind->type     = dpi::DpiRaw;
      break;
      
    case DATA_CLOB : 
      bind->type    = dpi::DpiClob;
      break;

    case DATA_BLOB : 
      bind->type    = dpi::DpiBlob;
      break;

    default :
      executeBaton->error= NJSMessages::getErrorMsg(errInvalidBindDataType,2);
      break;
  }

  executeBaton->binds.push_back(bind);       

exitGetOutBindParams:
  ;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Processing in binds

   PARAMETERS:
     Handle value, bind struct, eBaton struct, Bind Type ( IN, INOUT, OUT)

   NOTE:
     For IN Bind only len field field is used, and for only a scalar value now,
     allocate for one unit.
*/
void Connection::GetInBindParams(Local<Value> v8val, Bind* bind,
                                 eBaton* executeBaton, BindType type)
{
  Nan::HandleScope scope;

  if (v8val->IsArray() )
  {
    GetInBindParamsArray(Local<Array>::Cast(v8val), bind, executeBaton, type);
  }
  else
  {
    GetInBindParamsScalar(v8val, bind, executeBaton, type);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing in binds for scalar values

   PARAMETERS:
     Handle value, bind struct, eBaton struct, BindType (IN, INOUT, OUT)

   NOTE:
     For IN Bind only len field field is used, and for only a scalar value now,
     allocate for one unit.
*/
void Connection::GetInBindParamsScalar(Local<Value> v8val, Bind* bind, 
                                       eBaton* executeBaton, BindType type)
{
  Nan::HandleScope scope;
  ValueType dataType = VALUETYPE_INVALID;

  /* Allocate for scalar indicator & length */
  bind->ind = (short *)malloc ( sizeof ( short ) );
  bind->len = (DPI_BUFLEN_TYPE *)malloc ( sizeof ( DPI_BUFLEN_TYPE ) );

  *(bind->ind)  = 0;
  
  dataType = Connection::GetValueType ( v8val );

  switch ( dataType )
  {
    case VALUETYPE_NULL:
      bind->value = NULL;
      *(bind->ind)   = -1;
      bind->type        = dpi::DpiVarChar;
      break;

    case VALUETYPE_STRING:
    {
      if( bind->type && bind->type != DATA_STR )
      {
        executeBaton->error= NJSMessages::getErrorMsg(
                               errBindValueAndTypeMismatch, 2);
        goto exitGetInBindParamsScalar;
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
        bind->value = (char*)malloc((size_t)size);
        if( !bind->value )
        {
          executeBaton->error = NJSMessages::getErrorMsg(
                                  errInsufficientMemory );
          return;
        }

        if(str.length())
          memcpy(bind->value, *str, str.length());
      }
    }
    break;
    
    case VALUETYPE_INTEGER:
      if( bind->type && bind->type != DATA_NUM )
      {
        executeBaton->error= NJSMessages::getErrorMsg(
                               errBindValueAndTypeMismatch, 2);
        goto exitGetInBindParamsScalar;
      }
      bind->type = dpi::DpiInteger;
      bind->maxSize = *(bind->len) = sizeof(int);
      bind->value = (int*)malloc(*(bind->len));
      *(int*)(bind->value) = v8val->ToInt32()->Value();
      break;
    
    case VALUETYPE_UINTEGER:
      if( bind->type && bind->type != DATA_NUM )
      {
        executeBaton->error= NJSMessages::getErrorMsg(
                               errBindValueAndTypeMismatch, 2);
        goto exitGetInBindParamsScalar;
      }
      bind->type = dpi::DpiUnsignedInteger;
      bind->maxSize = *(bind->len) = sizeof(unsigned int);
      bind->value = (unsigned int*)malloc(*(bind->len));
      *(unsigned int*)(bind->value) = v8val->ToUint32()->Value();
      break;

    case VALUETYPE_NUMBER:
      if( bind->type && bind->type != DATA_NUM )
      {
        executeBaton->error= NJSMessages::getErrorMsg(
                                            errBindValueAndTypeMismatch, 2);
        goto exitGetInBindParamsScalar;
      }
      bind->type = dpi::DpiDouble;
      bind->maxSize = *(bind->len) = sizeof(double);
      bind->value = (double*)malloc(*(bind->len));
      *(double*)(bind->value) = v8val->NumberValue();
      break;

    case VALUETYPE_DATE:
      if( bind->type && bind->type != DATA_DATE )
      {
        executeBaton->error= NJSMessages::getErrorMsg(
                                     errBindValueAndTypeMismatch, 2);
        goto exitGetInBindParamsScalar;
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
      break;

    case VALUETYPE_OBJECT:
      {
        Local<Object> obj = v8val->ToObject();
        if (Buffer::HasInstance(obj)) 
        {
          size_t bufLen = Buffer::Length(obj);
          bind->type = dpi::DpiRaw;
          if(type == BIND_INOUT)
          {
            *(bind->len) = (DPI_BUFLEN_TYPE) bufLen;
          }
          else // IN
          {
            bind->maxSize =  (DPI_SZ_TYPE ) bufLen;
            *(bind->len) = (DPI_BUFLEN_TYPE) bufLen;
          }
          DPI_SZ_TYPE size = (bind->maxSize >= *(bind->len) ) ?
                             bind->maxSize : *(bind->len);
          if(size)
          {
            bind->value = (char *)malloc((size_t) size);
            if(bufLen)
              memcpy(bind->value, Buffer::Data(obj), bufLen);
          }
        }
        else 
        {
          executeBaton->error= NJSMessages::getErrorMsg(
                                             errInvalidBindDataType,2);
          goto exitGetInBindParamsScalar; 
        }
      }
      break;
  
  default:
    executeBaton->error= NJSMessages::getErrorMsg(errInvalidBindDataType,2);
    goto exitGetInBindParamsScalar;
    break;
  }

  executeBaton->binds.push_back(bind);
  
exitGetInBindParamsScalar:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Processing in binds for PL/SQL indexed table value

   PARAMETERS:
     Handle value, bind struct, eBaton struct, Bindtype (IN, INOUT, OUT).

   NOTE:
     For IN Bind only len field field is used, and for only a scalar value now,
     allocate for one unit.
*/
void Connection::GetInBindParamsArray(Local<Array> va8vals, Bind *bind,
                                      eBaton *executeBaton, BindType type)
{
  Nan::HandleScope scope;
  size_t           arrayElementSize = 0; // actual array element size
  size_t           bufferSize = 0;
  char*            buffer = 0;
  
  //
  //  Step 1 - Analyze the bind parameter to determine if we actually can 
  //           bind the array of values
  //

  bind->curArraySize = va8vals->Length();         // # of elements in Array

  // Validate the "maxArraySize" property
  if (!bind->isInOut)
  {
    bind->maxArraySize = static_cast<unsigned int>(bind->curArraySize);
  }

  // Currently only STRING & NUMBER are supported for Array Bind(s) 
  if ( (bind->type != DATA_STR) && (bind->type != DATA_NUM) )
  {
    executeBaton->error = NJSMessages::getErrorMsg(
                                           errInvalidTypeForArrayBind);
    goto exitGetInBindParamsArray;
  }

  // Make sure that all (not NULL) elements in the array have a valid and
  // consistent type
  for (unsigned int index = 0; index < bind->curArraySize; index++)
  {
    Local<Value> value = va8vals->Get(index);
    ValueType    vtype = GetValueType (value);

    // make sure that we generally have a valid value type
    if (vtype == VALUETYPE_INVALID)
    {
      executeBaton->error = NJSMessages::getErrorMsg(
                                          errInvalidTypeForArrayBind);
      
      goto exitGetInBindParamsArray;
    }

    // make sure that all values in the array have the exact same type or are 
    // null
    switch (bind->type)
    {
      case DATA_STR:
        if (vtype != VALUETYPE_NULL && vtype != VALUETYPE_STRING)
        {
          executeBaton->error = NJSMessages::getErrorMsg(
                                     errIncompatibleTypeArrayBind);
          goto exitGetInBindParamsArray;
        }
        else
        {
          v8::String::Utf8Value str(value->ToString());
          size_t stringLength = str.length();
          if (stringLength > static_cast<size_t>(arrayElementSize))
          {
            arrayElementSize = stringLength;
          }
        }
        break;

      case DATA_NUM:
        if (vtype != VALUETYPE_NULL && vtype != VALUETYPE_INTEGER &&
            vtype != VALUETYPE_UINTEGER && vtype != VALUETYPE_NUMBER)
        {
          executeBaton->error = NJSMessages::getErrorMsg(
                                          errIncompatibleTypeArrayBind);
          goto exitGetInBindParamsArray;
        }
        break;
    }
  }

  //
  //  Step 2 - Allocate the needed buffers for the arrays of values and the 
  //           indicators
  //


  switch (bind->type)
  {
    case DATA_STR:
      bind->type       = dpi::DpiVarChar;

      // If we are dealing with an OUT binding
      if (bind->isOut)
      {
        // If we are dealing with an OUT binding, it is not allowed to have
        // am actual element largen than the maxSize argument
        if (arrayElementSize > static_cast<size_t>(bind->maxSize))
        {
          executeBaton->error = NJSMessages::getErrorMsg(errInvalidArraySize);
          goto exitGetInBindParamsArray;
        }
        else
        {
          arrayElementSize = static_cast<size_t>(bind->maxSize);
        }
      }

      if ( NJS_SIZE_T_OVERFLOW (arrayElementSize, bind->maxArraySize ) )
      {
        executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
        goto exitGetInBindParamsArray;
      }
      bufferSize       = static_cast<size_t>(arrayElementSize * 
                                             bind->maxArraySize);      
      buffer           = reinterpret_cast<char*>(malloc(bufferSize));
      bind->value      = buffer;
      break;

    case DATA_NUM:
      bind->type       = dpi::DpiDouble;
      arrayElementSize = sizeof(double);
      if ( NJS_SIZE_T_OVERFLOW (arrayElementSize, bind->maxArraySize ) )
      {
        executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
        goto exitGetInBindParamsArray;
      }
      bufferSize       = static_cast<size_t>(arrayElementSize * 
                                             bind->maxArraySize);
      buffer           = reinterpret_cast<char*>(malloc(bufferSize));
      bind->value      = buffer;
      break;

    default:
      executeBaton->error = NJSMessages::getErrorMsg (
                                     errInvalidTypeForArrayBind );
      goto exitGetInBindParamsArray;
      break;
  }

  // Initialize buffer
  if (!buffer)
  {
    executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
    goto exitGetInBindParamsArray;
  }
  memset(buffer, 0, bufferSize);

  // Allocate indicator and len arrays
  if ( NJS_SIZE_T_OVERFLOW ( sizeof (short), bind->maxArraySize ))
  {
    executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
    goto exitGetInBindParamsArray;
  }
  bind->ind = reinterpret_cast<short*>(malloc(
                                  sizeof(short) * bind->maxArraySize));

  if ( NJS_SIZE_T_OVERFLOW ( sizeof ( DPI_BUFLEN_TYPE ), bind->maxArraySize ) )
  {
    executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
    goto exitGetInBindParamsArray;
  }
  bind->len = reinterpret_cast<DPI_BUFLEN_TYPE*>(
                malloc( sizeof(DPI_BUFLEN_TYPE) * bind->maxArraySize));
  if ( NJS_SIZE_T_OVERFLOW ( sizeof ( unsigned int ), bind->maxArraySize ) )
  {
    executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
    goto exitGetInBindParamsArray;
  }
                                  
  if (!bind->ind || !bind->len)
  {
    executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
    goto exitGetInBindParamsArray;
  }

  //
  //  Step 3 - Convert and copy the values from the JavaScript values to the
  //           OCI buffers
  //

  for (unsigned int index = 0;
       index < bind->curArraySize; 
       index++, buffer += arrayElementSize)
  {
    Local<Value> value = va8vals->Get(index);
    ValueType type = GetValueType(value);

    switch (type)
    {
      case VALUETYPE_NULL:
        bind->ind[index] = -1;
        bind->len[index] = 0;
        break;

      case VALUETYPE_STRING:
        {
          v8::String::Utf8Value str(value->ToString());
          size_t stringLength = str.length();
          if (stringLength > 0)
          {
            memcpy(buffer, *str, stringLength);
          }
          bind->ind[index] = 0;
          bind->len[index] = static_cast<DPI_BUFLEN_TYPE>(stringLength);
        }
        break;

      case VALUETYPE_INTEGER:
      case VALUETYPE_UINTEGER:
      case VALUETYPE_NUMBER:
        *(reinterpret_cast<double*>(buffer)) = value->NumberValue();
        bind->ind[index] = 0;
        bind->len[index] = sizeof ( double ) ;
        break;

      default:
        executeBaton->error = NJSMessages::getErrorMsg ( 
                                          errInvalidTypeForArrayBind ) ;
        goto exitGetInBindParamsArray;
        break;
    }
  }

  //
  //  Step 4 - Finalize the bind settings
  //

  bind->isArray = true;
  bind->maxSize = (ub4) arrayElementSize;

  executeBaton->binds.push_back(bind);

exitGetInBindParamsArray:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Allocate array buffers for one bind on an PL/SQL indexed table parameter

   PARAMETERS:
     the data type, bind struct, eBaton struct, array element size

   NOTE:
*/
bool Connection::AllocateBindArray(unsigned short dataType, Bind* bind,
                                   eBaton *executeBaton,
                                   size_t *arrayElementSize)
{
  size_t           bufferSize = 0;
  char*            buffer = 0;
  bool             ret = false;

  switch (dataType)
  {
  case dpi::DpiVarChar:
    // If we are dealing with an OUT binding, it is not allowed to have
    // an actual element largen than the maxSize argument
    if (*arrayElementSize > static_cast<size_t>(bind->maxSize))
    {
      executeBaton->error = NJSMessages::getErrorMsg(errInvalidArraySize);
      goto exitAllocateBindArray;
    }
    else
    {
      *arrayElementSize = static_cast<size_t>(bind->maxSize);
    }
  
    if ( NJS_SIZE_T_OVERFLOW (*arrayElementSize, bind->maxArraySize ) )
    {
      executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
      goto exitAllocateBindArray;
    }
    bufferSize        = static_cast<size_t>(*arrayElementSize *
                                            bind->maxArraySize);
    buffer            = reinterpret_cast<char*>(malloc(bufferSize));
    bind->value       = buffer;
    ret = true;
    break;

  case dpi::DpiDouble:
    bind->type        = dpi::DpiDouble;
    *arrayElementSize = sizeof(double);
    if ( NJS_SIZE_T_OVERFLOW (*arrayElementSize, bind->maxArraySize ) )
    {
      executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
      goto exitAllocateBindArray;
    }
    bufferSize        = static_cast<size_t>(*arrayElementSize *
                                            bind->maxArraySize);
    buffer            = reinterpret_cast<char*>(malloc(bufferSize));
    bind->value       = buffer;
    ret = true;
    break;

  default:
    executeBaton->error = NJSMessages::getErrorMsg ( 
                                    errInvalidTypeForArrayBind ) ;
    goto exitAllocateBindArray;
    break;
  }

  if ( ret )
  {
    // Initialize buffer
    if (!buffer)
    {
      executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
      ret = false;
    }
  }
  if ( ret )
  {
    memset(buffer, 0, bufferSize);

    // Allocate indicator and len arrays
    if ( NJS_SIZE_T_OVERFLOW ( sizeof(short), bind->maxArraySize ) )
    {
      executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
      goto exitAllocateBindArray;
    }
    bind->ind = reinterpret_cast<short*>(malloc(
                                       sizeof(short) * bind->maxArraySize));
    if ( NJS_SIZE_T_OVERFLOW ( sizeof ( DPI_BUFLEN_TYPE ),
                               bind->maxArraySize ) )
    {
      executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
      goto exitAllocateBindArray;
    }
    bind->len = reinterpret_cast<DPI_BUFLEN_TYPE*>(
                 malloc( sizeof(DPI_BUFLEN_TYPE) * bind->maxArraySize ) );

    if (!bind->ind || !bind->len)
    {
      executeBaton->error = NJSMessages::getErrorMsg(errInsufficientMemory);
      ret = false;
    }
  }

exitAllocateBindArray:
  return ret;
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

    // In DML Returning statements, Buffer type is not allowed temporarily.
    if ( executeBaton->stmtIsReturning )
    {
      for ( unsigned int b = 0; b < executeBaton->binds.size () ; b ++ )
      {
        if ( executeBaton->binds[b]->isOut && 
             executeBaton->binds[b]->type == dpi::DpiRaw )
        {
          executeBaton->error = NJSMessages::getErrorMsg ( 
                                                  errBufferReturningInvalid );
          goto exitAsyncExecute;
          
        }
      }
    }
      

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

      // Check whether indicators were allocated as part of callback
      // Address GitHub issue #343
      if ( executeBaton->stmtIsReturning && executeBaton->rowsAffected )
      {
        for ( unsigned int b = 0; b < executeBaton->binds.size (); b++ )
        {
          if ( executeBaton->binds[b]->isOut && !executeBaton->binds[b]->ind)
          {
            executeBaton->error = NJSMessages::getErrorMsg (
                                                  errSQLSyntaxError );
            goto exitAsyncExecute;
          }
        }
      }

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

     /* For each OUT Binds of CURSOR type, get the dpistmt state */
     for ( unsigned int b = 0; b < executeBaton->binds.size (); b ++ )
     {
       Bind *bind = executeBaton->binds[b];

       /* Here bind->isOut is expected to be TRUE, and is checked earlier */
       if ( bind->type == dpi::DpiRSet )
       {
         unsigned int state = ((Stmt*)bind->value)->getState ();

         if ( state == DPI_STMT_STATE_EXECUTED )
         {
           // set the prefetch on the valid cursor object
           ((dpi::Stmt *)(bind->value))->prefetchRows ( 
                                              executeBaton->prefetchRows ) ;
         }
         else
         {
           /* Release the invalid REFCURSOR to avoid any leaks */
           ((Stmt*)bind->value)->release ();
           bind->value = NULL;
         }
       }
     }

     // process any lob descriptor out binds
     Connection::Descr2protoILob ( executeBaton, 0, 0);
    }
    //dpistmt will be released in exitAsyncExecute label in case of non-RS
  }
  catch (dpi::Exception& e)
  {
    NJS_SET_CONN_ERR_STATUS (  e.errnum(), executeBaton->dpiconn );
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
    /* Release the statement handle in case of errors or non-ResultSet
     * In case of ResultSet and no errors, statement handle will be released
     * while closing it.
     */
    if ( ( ( !(executeBaton->error).empty() ) ||
           ( !executeBaton->getRS ) ) &&
         executeBaton->dpistmt )
    {
        executeBaton->dpistmt->release ();
    }
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
        if ( executeBaton->binds[index]->isOut &&
             executeBaton->stmtIsReturning &&
             executeBaton->binds[index]->type == dpi::DpiRSet )
        {
          executeBaton->error = NJSMessages::getErrorMsg (
                                                     errInvalidResultSet ) ;
        }

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

        // Bind by name
        executeBaton->dpistmt->bind(
              (const unsigned char*)executeBaton->binds[index]->key.c_str(),
              (int) executeBaton->binds[index]->key.length(), index,
              executeBaton->binds[index]->type,
              executeBaton->binds[index]->value,
              (executeBaton->stmtIsReturning &&
                executeBaton->binds[index]->isOut &&
               (executeBaton->binds[index]->type == dpi::DpiVarChar )) ?
                (executeBaton->binds[index]->maxSize + 1) :
                executeBaton->binds[index]->maxSize,
              executeBaton->binds[index]->ind,
                executeBaton->binds[index]->len,
              (executeBaton->binds[index]->isArray) ?
                executeBaton->binds[index]->maxArraySize : 0,
              (executeBaton->binds[index]->isArray) ?
                &(executeBaton->binds[index]->curArraySize) : 0,
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

        // Bind by position
        executeBaton->dpistmt->bind(
              index+1,executeBaton->binds[index]->type,
              executeBaton->binds[index]->value,
              (executeBaton->stmtIsReturning &&
                executeBaton->binds[index]->isOut && 
               (executeBaton->binds[index]->type == dpi::DpiVarChar )) ?
                (executeBaton->binds[index]->maxSize + 1) :
                 executeBaton->binds[index]->maxSize,
              executeBaton->binds[index]->ind,
              executeBaton->binds[index]->len,
              (executeBaton->binds[index]->isArray) ?
                executeBaton->binds[index]->maxArraySize : 0,
              (executeBaton->binds[index]->isArray) ?
                &(executeBaton->binds[index]->curArraySize ) : 0,
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
  int csratio = executeBaton->dpiconn->getByteExpansionRatio ();

  // Check for maxRows must be greater than zero in case of non-resultSet
  if ( executeBaton->maxRows == 0 )
  {
    executeBaton->error = NJSMessages::getErrorMsg ( errInvalidmaxRows );
    return;
  }

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
        
        if ( NJS_SIZE_T_OVERFLOW ( defines[col].maxSize,
                                       executeBaton->maxRows ) )
        {
          executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
          return;
        }
        else
        {
          defines[col].buf = (double *)malloc( (size_t)defines[col].maxSize*
                                               executeBaton->maxRows );
 
          if( !defines[col].buf )
          {
            executeBaton->error = NJSMessages::getErrorMsg( 
                                    errInsufficientMemory );
            return;
          }
        }

        break;
      case dpi::DpiVarChar :
      case dpi::DpiFixedChar :
        defines[col].fetchType = Connection::GetTargetType ( executeBaton,
                                             executeBaton->columnNames[col],
                                             meta[col].dbType );

        /*
         * the buffer size is increased to account for possible character
         * size expansion when data is converted from the DB character set
         * to AL32UTF8
         */

        if ( meta[col].dbSize != 0 )
        {
          /* dbSize will be zero in case of "select null from dual" and
           * malloc(0) behaves diffrently on different platforms, so avoiding it
           */
          defines[col].maxSize   = (meta[col].dbSize) * csratio;
  
          if ( NJS_SIZE_T_OVERFLOW ( defines[col].maxSize,
                                         executeBaton->maxRows ) )
          {
            executeBaton->error = NJSMessages::getErrorMsg(
                                               errResultsTooLarge );
            return;
          }
          else
          {
            defines[col].buf = (char *)malloc( (size_t)defines[col].maxSize*
                                               executeBaton->maxRows );
            if( !defines[col].buf )
            {
              executeBaton->error = NJSMessages::getErrorMsg( 
                                      errInsufficientMemory );
              return;
            }
          }
        }
        /* The null scenario will have indicator as -1, so memory allocation
         * not required.
         */
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

          if ( NJS_SIZE_T_OVERFLOW ( defines[col].maxSize,
                                         executeBaton->maxRows ) )
          {
            executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
            return;
          }
          else
          {
            defines[col].buf = (char *)malloc( (size_t)defines[col].maxSize*
                                               executeBaton->maxRows );

            if( !defines[col].buf )
            {
              executeBaton->error = NJSMessages::getErrorMsg(
                                       errInsufficientMemory);
              return;
            }
          }

        }
        break;
      case dpi::DpiRaw :
        defines[col].fetchType = DpiRaw;
        defines[col].maxSize   = meta[col].dbSize;

        if ( NJS_SIZE_T_OVERFLOW ( defines[col].maxSize,
                                   executeBaton->maxRows ) )
        {
          executeBaton->error = NJSMessages::getErrorMsg (
                                                     errResultsTooLarge ) ;
          return;
        }
        defines[col].buf = (char *)malloc(defines[col].maxSize *
                                          (size_t) executeBaton->maxRows) ;
        if ( !defines[col].buf )
        {
          executeBaton->error = NJSMessages::getErrorMsg ( 
                                         errInsufficientMemory );
          return;
        }
        break;

      case dpi::DpiClob:
      case dpi::DpiBlob:
      case dpi::DpiBfile:
        defines[col].fetchType = meta[col].dbType;
        defines[col].maxSize   = sizeof(Descriptor *);

        if ( NJS_SIZE_T_OVERFLOW ( defines[col].maxSize,
                                       executeBaton->maxRows ) )
        {
          executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
          return;
        }
        else
        {
          defines[col].buf = malloc( (size_t)defines[col].maxSize*
                                     executeBaton->maxRows );

          if( !defines[col].buf )
          {
            executeBaton->error = NJSMessages::getErrorMsg( errInsufficientMemory );
            return;
          }
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

        if ( NJS_SIZE_T_OVERFLOW ( defines[col].maxSize,
                                       executeBaton->maxRows ) )
        {
          executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
          return;
        }
        else
        {
          defines[col].buf = (char *)malloc( (size_t)defines[col].maxSize*
                                             executeBaton->maxRows );

          if( !defines[col].buf )
          {
            executeBaton->error = NJSMessages::getErrorMsg(
                                    errInsufficientMemory);
            return;
          }
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
      executeBaton->error = NJSMessages::getErrorMsg( errInsufficientMemory );
      return;
    }
    defines[col].len = (DPI_BUFLEN_TYPE *)malloc(sizeof(DPI_BUFLEN_TYPE)*
                                           executeBaton->maxRows);
    if(!defines[col].len)
    {
      executeBaton->error = NJSMessages::getErrorMsg( errInsufficientMemory );
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
  Nan::HandleScope scope;

  eBaton *executeBaton = (eBaton*)req->data;
  Nan::TryCatch tc;
  Local<Value> argv[2];
  if(!(executeBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(Nan::New<v8::String>((executeBaton->error).c_str()).ToLocalChecked());
    argv[1] = Nan::Undefined();
  }
  else
  {
    argv[0] = Nan::Undefined();
    Local<Object> result = Nan::New<v8::Object>();
    Local<Value> rowArray;
    switch(executeBaton->st)
    {
      case DpiStmtSelect :
        rowArray = Connection::GetRows(executeBaton);
        if(!(executeBaton->error).empty())
        {
          argv[0] = v8::Exception::Error(Nan::New<v8::String>((executeBaton->error).c_str()).ToLocalChecked());
          argv[1] = Nan::Undefined();
          goto exitAsyncAfterExecute;
        }
        if( executeBaton->getRS )
        {
          Nan::Set(result, Nan::New<v8::String>("rows").ToLocalChecked(), Nan::Undefined());
          Local<Object> resultSet = Nan::New<FunctionTemplate>(ResultSet::resultSetTemplate_s)->
                                GetFunction() ->NewInstance();

          /* ResultSet case, the statement object is ready for fetching */
         (Nan::ObjectWrap::Unwrap<ResultSet> (resultSet))->
                                  setResultSet( executeBaton->dpistmt,
                                                executeBaton);

          Nan::Set(result, Nan::New<v8::String>("resultSet").ToLocalChecked(), resultSet);
        }
        else
        {
          Nan::Set(result, Nan::New<v8::String>("rows").ToLocalChecked(), rowArray);
          Nan::Set(result, Nan::New<v8::String>("resultSet").ToLocalChecked(), Nan::Undefined());
        }
        Nan::Set(result, Nan::New<v8::String>("outBinds").ToLocalChecked(),Nan::Undefined());
        Nan::Set(result, Nan::New<v8::String>("rowsAffected").ToLocalChecked(), Nan::Undefined());
        Nan::Set(result, Nan::New<v8::String>("metaData").ToLocalChecked(), Connection::GetMetaData(
                                                    executeBaton->columnNames,
                                                    executeBaton->numCols));
        break;
      case DpiStmtBegin :
      case DpiStmtDeclare :
      case DpiStmtCall :
        Nan::Set(result, Nan::New<v8::String>("rowsAffected").ToLocalChecked(), Nan::Undefined());
        Nan::ForceSet(result, Nan::New<v8::String>("outBinds").ToLocalChecked(),Connection::GetOutBinds(executeBaton), v8::ReadOnly);
        Nan::Set(result, Nan::New<v8::String>("rows").ToLocalChecked(), Nan::Undefined());
        Nan::Set(result, Nan::New<v8::String>("metaData").ToLocalChecked(), Nan::Undefined());
        break;
      default :
        Nan::ForceSet(result, Nan::New<v8::String>("rowsAffected").ToLocalChecked(),
                    Nan::New<v8::Integer>((unsigned int) executeBaton->rowsAffected), v8::ReadOnly);
        if( executeBaton->numOutBinds )
        {
          Nan::ForceSet(result, Nan::New<v8::String>("outBinds").ToLocalChecked(), Connection::GetOutBinds(executeBaton), v8::ReadOnly);
        }
        else
        {
          Nan::Set(result, Nan::New<v8::String>("outBinds").ToLocalChecked(),Nan::Undefined());
        }
        Nan::Set(result, Nan::New<v8::String>("rows").ToLocalChecked(), Nan::Undefined());
        Nan::Set(result, Nan::New<v8::String>("metaData").ToLocalChecked(), Nan::Undefined());
        break;
    }
    argv[1] = result;
  }
exitAsyncAfterExecute:
  Local<Function> callback = Nan::New<Function>(executeBaton->cb);
  delete executeBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(), callback, 2, argv );
  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
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
v8::Local<v8::Value> Connection::GetMetaData (std::string* columnNames,
                                       unsigned int numCols )
{
  Nan::EscapableHandleScope scope;
  Local<Array> metaArray = Nan::New<v8::Array>(numCols);
  for(unsigned int i=0; i < numCols ; i++)
  {
    Local<Object> column = Nan::New<v8::Object>();
    Nan::Set(column, Nan::New<v8::String>("name").ToLocalChecked(),
                Nan::New<v8::String>(columnNames[i].c_str()).ToLocalChecked()
                );
    Nan::Set(metaArray, i, column);
  }
  return scope.Escape(metaArray);
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
v8::Local<v8::Value> Connection::GetRows (eBaton* executeBaton)
{
  Nan::EscapableHandleScope scope;
  Local<Array> rowsArray;
  switch(executeBaton->outFormat)
  {
    case ROWS_ARRAY :
      rowsArray = Nan::New<v8::Array>(executeBaton->rowsFetched);
      for(unsigned int i = 0; i < executeBaton->rowsFetched; i++)
      {
        Local<Array> row = Nan::New<v8::Array>(executeBaton->numCols);
        for(unsigned int j = 0; j < executeBaton->numCols; j++)
        {
          Nan::Set(row, j, Connection::GetValue(executeBaton, true, j, i));
        }
        Nan::Set(rowsArray, i, row);
      }
      break;
    case ROWS_OBJECT :
      rowsArray = Nan::New<v8::Array>(executeBaton->rowsFetched);
      for(unsigned int i =0 ; i < executeBaton->rowsFetched; i++)
      {
        Local<Object> row = Nan::New<v8::Object>();

        for(unsigned int j = 0; j < executeBaton->numCols; j++)
        {
          Nan::Set(row, Nan::New<v8::String>(executeBaton->columnNames[j].c_str(),
                               (int) executeBaton->columnNames[j].length()).ToLocalChecked(),
                   Connection::GetValue(executeBaton, true, j, i));

        }
        Nan::Set(rowsArray, i, row);
      }
      break;
    default :
      executeBaton->error = NJSMessages::getErrorMsg(errInvalidPropertyValue, 
                                                     "outFormat");
      goto exitGetRows;
      break;
  }
  exitGetRows:
  return scope.Escape(rowsArray);
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

Local<Value> Connection::GetValue ( eBaton *executeBaton,
                                     bool isQuery,
                                     unsigned int col,
                                     unsigned int row )
{
  Nan::EscapableHandleScope scope;

  if(isQuery)
  {
    // SELECT queries
    Define *define = &(executeBaton->defines[col]);
    long double *dblArr = (long double *)define->buf;
    Local<Value> value = Connection::GetValueCommon(
                           executeBaton,
                           define->ind[row],
                           define->fetchType,
                           (define->fetchType == DpiTimestampLTZ ) ? 
                             (void *) &dblArr[row] : 
                             (void *) ((char *)(define->buf) +
                              ( row * (define->maxSize ))),
                           define->len[row] );
    return scope.Escape( value );
  }
  else
  {
    // DML, PL/SQL execution
    Bind *bind = executeBaton->binds[col];
    
    if(executeBaton->stmtIsReturning)
    {
      // SQL statement with RETURNING INTO clause, will return an array
      Local<Value> value = Connection::GetArrayValue (
                                        executeBaton,
                                        executeBaton->binds[col], 
                         (unsigned long)executeBaton->rowsAffected );
      return scope.Escape(value);
    }
    else if ( bind->isArray )
    {
      // PL/SQL array bind
      Local<Value> value = Connection::GetArrayValue(executeBaton, 
                                                     bind, 
                            static_cast<unsigned long>(bind->curArraySize));
      return scope.Escape(value);
    }
    else if(bind->type == DpiRSet) 
    {
      return scope.Escape ( Connection::GetValueRefCursor (
                                      executeBaton, bind ));
    }
    else if (( bind->type == DpiClob ) ||
             ( bind->type == DpiBlob ) ||
             ( bind->type == DpiBfile))
    {
      return scope.Escape ( Connection::GetValueLob (
                                      executeBaton, bind ));
    }
    else
    {
      return scope.Escape ( Connection::GetValueCommon (
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
Local<Value> Connection::GetValueRefCursor ( eBaton *executeBaton, 
                                              Bind *bind )
{
  Nan::EscapableHandleScope scope;
  Local<Object> resultSet;
  Local<Value> value;

  if(bind->ind[0] != -1)
  {
    resultSet = Nan::New<FunctionTemplate>(ResultSet::resultSetTemplate_s)->
                            GetFunction() ->NewInstance();
    /* 
     * IN case of REFCURSOR, bind->flags will indicate whether we got
     * a valid handle, based on that numCols, metaData are queried.
     */
    (Nan::ObjectWrap::Unwrap<ResultSet> (resultSet))->
                       setResultSet( (dpi::Stmt*)(bind->value),
                                     executeBaton);
    value = resultSet;
  }
  else
  {
    value = Nan::Null();
  }
  return scope.Escape(value);
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
Local<Value> Connection::GetValueLob ( eBaton *executeBaton, 
                                        Bind *bind )
{
  Nan::EscapableHandleScope scope;

  if (bind->ind && *bind->ind == -1)
    return Nan::Null();

  Local<Value> value;

  ProtoILob *protoILob = *(static_cast<ProtoILob **>(bind->value));

  // The ownership of the handles in ProtoILob is transferred to the
  // ILob object now.  If anything goes wrong, it is the
  // responsibility of the ILob class to free the OCI handles.

  value = NewLob(executeBaton, protoILob);

  // all done with ProtoILob
  delete protoILob;
  *(ProtoILob **)(bind->value) = NULL;
  return scope.Escape(value);
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
Local<Value> Connection::GetValueCommon ( eBaton *executeBaton,
                                           short ind, 
                                           unsigned short type,
                                           void* val, DPI_BUFLEN_TYPE len )
{
  Nan::EscapableHandleScope scope;
  Local<Value> value;
  Local<Date> date;

  if(ind != -1)
  {
     switch(type)
     {
       case (dpi::DpiVarChar) :
          value = Nan::New<v8::String>((char*)val, len).ToLocalChecked();
        break;
       case (dpi::DpiInteger) :
         value = Nan::New<v8::Integer>(*(int*)val);
         break;
       case (dpi::DpiDouble) :
         value = Nan::New<v8::Number>(*(double*)val);
         break;
       case (dpi::DpiTimestampLTZ) :
         date = Nan::New<v8::Date>( *(long double*)val ).ToLocalChecked();
         value = date;
        break;
       case (dpi::DpiRaw) :
         // TODO: We could use NewBuffer to save memory and CPU, but it
         // gets the ownership of buffer to itself (behaviour changed in
         // Nan 2.0)
         value = Nan::CopyBuffer((char*)val, len).ToLocalChecked();
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
    value = Nan::Null();
  }
  return scope.Escape(value);
}


/*****************************************************************************/
/*
  DESCRIPTION
    To get an array as v8-Value from Bind structure - used in DML Returning

  PARAMETERS
    eBaton   - executeBaton structure
    bind     - bind structure
    count    - row count

  Returns
    v8::Value  - this will be an array (even for 1 row, array or 1).
*/
v8::Local<v8::Value> Connection::GetArrayValue ( eBaton *executeBaton,
                                                 Bind *binds,
                                                 unsigned long count )
{
  Nan::EscapableHandleScope scope;
  Local<Date> date;
  Local<Array> arrVal;
  unsigned long index = 0;
  Local<Value> val;

  /* To return a value of array type, create one of specified size */
  arrVal = Nan::New<v8::Array>( count ) ;

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
      Nan::Set(arrVal, index, Nan::Null() );
      continue;
    }

    switch ( binds->type )
    {
    case dpi::DpiVarChar:
      Nan::Set(arrVal, index,
                    Nan::New<v8::String> ((char *)binds->value +
                                        (index * binds->maxSize ),
                                         executeBaton->stmtIsReturning ?
                                       binds->len2[index] :
                                       binds->len[index] ).ToLocalChecked());
      break;
    case dpi::DpiInteger:
      Nan::Set(arrVal, index,
                    Nan::New<v8::Integer> ( *((int *)binds->value + index )));
      break;
    case dpi::DpiDouble:
      Nan::Set(arrVal, index,
                    Nan::New<v8::Number> ( *((double *)binds->value + index )));
      break;
    case dpi::DpiTimestampLTZ:
        Nan::Set(arrVal, index, 
                      Nan::New<v8::Date> (*((long double *)binds->extvalue + index )).ToLocalChecked() );
      break;
    case dpi::DpiClob:
    case dpi::DpiBlob:
    {
      ProtoILob *protoILob = *((ProtoILob **)binds->value + index);
      val = NewLob(executeBaton, protoILob);
      Nan::Set(arrVal, index, val);
      delete protoILob;
      *(ProtoILob **)binds->value = NULL;
    }
    break;
                    
    default:
      break;
    }
  }
  return scope.Escape( arrVal ) ;
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
v8::Local<v8::Value> Connection::GetOutBinds (eBaton* executeBaton)
{
  Nan::EscapableHandleScope scope;

  if(!executeBaton->binds.empty())
  {
    if( executeBaton->binds[0]->key.empty() )
    {
      // Binds as JS array
      return scope.Escape(GetOutBindArray( executeBaton ));
    }
    else
    {
      // Binds as JS object
      return scope.Escape(GetOutBindObject( executeBaton ));
    }
  }
  return scope.Escape(Nan::Undefined());
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
v8::Local<v8::Value> Connection::GetOutBindArray ( eBaton *executeBaton )
{
  Nan::EscapableHandleScope scope;

  std::vector<Bind*>binds = executeBaton->binds;

  Local<Array> arrayBinds = Nan::New<v8::Array>( executeBaton->numOutBinds );

  unsigned int it = 0;
  for(unsigned int index = 0; index < binds.size(); index++)
  {
    if(binds[index]->isOut)
    {
      Local<Value> val ;
      val = Connection::GetValue ( executeBaton, false, index ); 
      Nan::Set(arrayBinds, it, val );
      it ++;
    }
  }
  return scope.Escape(arrayBinds);
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
v8::Local<v8::Value> Connection::GetOutBindObject ( eBaton *executeBaton )
{
  Nan::EscapableHandleScope scope;
  std::vector<Bind*>binds = executeBaton->binds;
  Local<Object> objectBinds = Nan::New<v8::Object>();
  
  for(unsigned int index = 0; index < binds.size(); index++)
  {
    if(binds[index]->isOut)
    {
      Local<Value> val;

      binds[index]->key.erase(binds[index]->key.begin());

      val = Connection::GetValue ( executeBaton, false, index );
      Nan::Set( objectBinds, Nan::New<v8::String>( binds[index]->key.c_str(),
                        (int) binds[index]->key.length() ).ToLocalChecked(),
                        val );
    }
  }
  return scope.Escape(objectBinds);
}


/****************************************************************************/
/* NAME
 *   Connection::getConnectionBusyStatus
 *
 * DESCRIPTION
 *   Checks whther connection is busy with database call or not using counters
 *
 * PARAMETERS
 *   connection      - connection object to check it's counters
 *
 * Note: Currently this function can be used only in Release () method
 */
ConnectionBusyStatus Connection::getConnectionBusyStatus ( Connection *conn )
{
  ConnectionBusyStatus connStatus = CONN_NOT_BUSY;

  if ( conn->lobCount_ != 0 )
    connStatus = CONN_BUSY_LOB;
  else if ( conn->rsCount_ != 0 )
    connStatus = CONN_BUSY_RS;
  else if ( conn->dbCount_ != 1 ) // 1 for Release operaion itself
    connStatus = CONN_BUSY_DB;

  return connStatus;
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
  Nan::EscapableHandleScope scope;
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, info );
  ConnectionBusyStatus connStat;

  connection = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());

  /* If connection is invalide from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( connection, info ) ;

  eBaton *releaseBaton = new eBaton ( connection->DBCount (), callback );

  NJS_CHECK_NUMBER_OF_ARGS ( releaseBaton->error, info, 1, 1, exitRelease );
  if(!connection->isValid_)
  {
    releaseBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitRelease;
  }


  // Check to see if database call is in progress
  connStat = getConnectionBusyStatus ( connection );
  switch ( connStat )
  {
    case CONN_NOT_BUSY:
      connection->isValid_    = false;
      releaseBaton->dpiconn   = connection->dpiconn_;
      break;
    case CONN_BUSY_LOB:
      releaseBaton->error = NJSMessages::getErrorMsg( errBusyConnLOB );
      break;
    case CONN_BUSY_RS:
      releaseBaton->error = NJSMessages::getErrorMsg( errBusyConnRS );
      break;
    case CONN_BUSY_DB:
      releaseBaton->error = NJSMessages::getErrorMsg( errBusyConnDB );
      break;
  }

exitRelease:
  releaseBaton->req.data  = (void*) releaseBaton;

  int status = uv_queue_work(uv_default_loop(), &releaseBaton->req,
               Async_Release, (uv_after_work_cb)Async_AfterRelease);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete releaseBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "Release" );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
  }
  info.GetReturnValue().SetUndefined();
  scope.Escape ( Nan::Undefined () );
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
    NJS_SET_CONN_ERR_STATUS (  e.errnum(), releaseBaton->dpiconn );
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
  Nan::HandleScope scope;
  
  eBaton *releaseBaton = (eBaton*)req->data;
  Nan::TryCatch tc;

  Local<Value> argv[1];

  if(!(releaseBaton->error).empty())
    argv[0] = v8::Exception::Error(Nan::New<v8::String>((releaseBaton->error).c_str()).ToLocalChecked());
  else
    argv[0] = Nan::Undefined();
  Local<Function> callback = Nan::New<Function>(releaseBaton->cb);
  delete releaseBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(),
                      callback, 1, argv );
  
  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
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
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, info );

  connection = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());

  /* if connection is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( connection, info ) ;

  eBaton *commitBaton = new eBaton ( connection->DBCount (), callback );

  NJS_CHECK_NUMBER_OF_ARGS ( commitBaton->error, info, 1, 1, exitCommit );
  if(!connection->isValid_)
  {
    commitBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitCommit;
  }
  commitBaton->dpiconn   = connection->dpiconn_;
exitCommit:
  commitBaton->req.data  = (void*) commitBaton;

  int status = uv_queue_work(uv_default_loop(), &commitBaton->req,
               Async_Commit, (uv_after_work_cb)Async_AfterCommit);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete commitBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "Commit" );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
  }

  info.GetReturnValue().SetUndefined();
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
    NJS_SET_CONN_ERR_STATUS (  e.errnum(), commitBaton->dpiconn );
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
  Nan::HandleScope scope;
  eBaton *commitBaton = (eBaton*)req->data;

  Nan::TryCatch tc;
  Local<Value> argv[1];

  if(!(commitBaton->error).empty())
    argv[0] = v8::Exception::Error(Nan::New<v8::String>((commitBaton->error).c_str()).ToLocalChecked());
  else
    argv[0] = Nan::Undefined();

  Local<Function> callback = Nan::New<Function>(commitBaton->cb);
  delete commitBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(),
                      callback, 1, argv );

  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
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
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, info );

  connection = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());
  /* if connection is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( connection, info );

  eBaton *rollbackBaton = new eBaton ( connection->DBCount (), callback );
  NJS_CHECK_NUMBER_OF_ARGS ( rollbackBaton->error, info, 1, 1, exitRollback );

  if(!connection->isValid_)
  {
    rollbackBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitRollback;
  }
  rollbackBaton->dpiconn   = connection->dpiconn_;
  exitRollback:
  rollbackBaton->req.data  = (void*) rollbackBaton;
  int status = uv_queue_work(uv_default_loop(), &rollbackBaton->req,
               Async_Rollback, (uv_after_work_cb)Async_AfterRollback);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete rollbackBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "Rollback" );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
  }
  info.GetReturnValue().SetUndefined();
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
    NJS_SET_CONN_ERR_STATUS (  e.errnum(), rollbackBaton->dpiconn );
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
  Nan::HandleScope scope;
  eBaton *rollbackBaton = (eBaton*)req->data;

  Nan::TryCatch tc;
  Local<Value> argv[1];

  if(!(rollbackBaton->error).empty())
    argv[0] = v8::Exception::Error(Nan::New<v8::String>((rollbackBaton->error).c_str()).ToLocalChecked());
  else
    argv[0] = Nan::Undefined();

  Local<Function> callback = Nan::New<Function>(rollbackBaton->cb);
  delete rollbackBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(),
                      callback, 1, argv );
  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
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
  Local<Function> callback;
  Connection *connection;
  NJS_GET_CALLBACK ( callback, info );

  connection = Nan::ObjectWrap::Unwrap<Connection>(info.Holder());

  /* If connection is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( connection, info );

  eBaton *breakBaton = new eBaton ( connection->DBCount (), callback );

  NJS_CHECK_NUMBER_OF_ARGS ( breakBaton->error, info, 1, 1, exitBreak );

  if(!connection->isValid_)
  {
    breakBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitBreak;
  }
  breakBaton->dpiconn   = connection->dpiconn_;
  exitBreak:
  breakBaton->req.data  = (void*) breakBaton;

  int status = uv_queue_work(uv_default_loop(), &breakBaton->req,
               Async_Break, (uv_after_work_cb)Async_AfterBreak);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete breakBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "Break" );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
  }

  info.GetReturnValue().SetUndefined();
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
    NJS_SET_CONN_ERR_STATUS (  e.errnum(), breakBaton->dpiconn );
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
  Nan::HandleScope scope;
  eBaton *breakBaton = (eBaton*)req->data;

  Nan::TryCatch tc;
  Local<Value> argv[1];

  if(!(breakBaton->error).empty()) 
    argv[0] = v8::Exception::Error(Nan::New<v8::String>((breakBaton->error).c_str()).ToLocalChecked());
  else
    argv[0] = Nan::Undefined();
  Local<Function> callback = Nan::New<Function>(breakBaton->cb);
  delete breakBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(),
                      callback, 1, argv );
  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
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
 *   bind     - bind structure to update
 *
 *
 * NOTE:
 *   This function is used for IN Bind parameters, when v8::Date value is
 *   passed, conversion to Oracle-DB Type happens here.
 *
 */
void Connection::v8Date2OraDate(v8::Local<v8::Value> val, Bind *bind)
{
  Nan::HandleScope scope;
  Local<Date> date = val.As<Date>();    // Expects to be of v8::Date type

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
 *   ebaton    - execute Baton
 *   index     - position in the binds array
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
  Bind* bind = ebaton->binds[index];

  if (bind->type == dpi::DpiTimestampLTZ)
  {
    bind->dttmarr = ebaton->dpienv->getDateTimeArray(
                                        ebaton->dpistmt->getError());
    bind->value = bind->dttmarr->init(1);
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

  if ( bind->isArray )
  {
    size_t arrayElementSize = (size_t) bind->maxSize;
    
    Connection::AllocateBindArray ( bind->type, bind, executeBaton,
                                    &arrayElementSize );
    return;
  }
  
    
  if ( NJS_SIZE_T_OVERFLOW ( sizeof ( short ), nRows ) )
  {
    executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
    return;
  }
  else
  {
    bind->ind = (short *)malloc ( (size_t)nRows * sizeof ( short ) ) ;
    if( !bind->ind )
    {
      executeBaton->error = NJSMessages::getErrorMsg( errInsufficientMemory );
      return;
    }
  }
  if ( dmlReturning )
  {
    if ( NJS_SIZE_T_OVERFLOW ( sizeof ( unsigned int ), nRows ) )
    {
      executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
      return;
    }
    else
    {
      bind->len2 = ( unsigned int *)malloc ( nRows * sizeof ( unsigned int ) );
      if( !bind->len2 )
      {
        executeBaton->error = NJSMessages::getErrorMsg( errInsufficientMemory );
        return;
      }
    }
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

    if ( NJS_SIZE_T_OVERFLOW ( (bind->maxSize + 1), nRows) )
    {
      executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
      return;
    }
    else
    {
      bind->value = (char *)malloc( (size_t)( bind->maxSize + 1) * nRows );
      if( !bind->value )
      {
        executeBaton->error = NJSMessages::getErrorMsg(
                                errInsufficientMemory);
        return;
      }
    }

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
    if ( NJS_SIZE_T_OVERFLOW ( sizeof (int), nRows) )
    {
      executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
      return;
    }
    else
    {
      bind->value = ( int *) malloc ( sizeof (int) * nRows ) ;
      if( !bind->value )
      {
        executeBaton->error = NJSMessages::getErrorMsg(
                                errInsufficientMemory);
        return;
      }
    }
    if ( !dmlReturning )
    {
      *(bind->len) = sizeof ( int ) ;
    }
    break;

  case dpi::DpiUnsignedInteger:
    if ( NJS_SIZE_T_OVERFLOW ( sizeof ( unsigned int ), nRows) )
    {
      executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
      return;
    }
    else
    {
      bind->value = ( unsigned int *)malloc ( sizeof ( unsigned int ) * nRows );
      if( !bind->value )
      {
        executeBaton->error = NJSMessages::getErrorMsg(
                                errInsufficientMemory);
        return;
      }
    }
    if ( !dmlReturning )
    {
      *(bind->len) = sizeof ( unsigned int ) ;
    }
    break;

  case dpi::DpiDouble:
    if ( NJS_SIZE_T_OVERFLOW ( sizeof ( double ), nRows) )
    {
      executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
      return;
    }
    else
    {
      bind->value = ( double *)malloc ( sizeof ( double ) * nRows );
      if( !bind->value )
      {
        executeBaton->error = NJSMessages::getErrorMsg(
                                errInsufficientMemory);
        return;
      }
    }
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
    // initialize indicator to null
    *(bind->ind) = -1;
    if (nRows > 1)
      bind->rowsReturned = nRows;
    // allocate the array of Descriptor **
    if ( NJS_SIZE_T_OVERFLOW ( sizeof ( Descriptor * ), nRows) )
    {
      executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
      return;
    }
    else
    {
      bind->value = (void *)malloc(sizeof(Descriptor *) * nRows);
      if( !bind->value )
      {
        executeBaton->error = NJSMessages::getErrorMsg(
                                errInsufficientMemory);
        return;
      }
    }
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
      if ( NJS_SIZE_T_OVERFLOW ( sizeof ( long double ), nRows) )
      {
        executeBaton->error = NJSMessages::getErrorMsg( errResultsTooLarge );
        return;
      }
      else
      {
        bind->extvalue = (long double *) malloc ( sizeof ( long double ) * 
                                                  nRows );
        if( !bind->extvalue )
        {
          executeBaton->error = NJSMessages::getErrorMsg(
                                  errInsufficientMemory);
          return;
        }
      }
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

  case dpi::DpiRSet:
    bind->value = executeBaton->dpiconn->getStmt ();
    break;

  case dpi::DpiRaw:
    if ( NJS_SIZE_T_OVERFLOW ( bind->maxSize, nRows ) )
    {
      executeBaton->error = NJSMessages::getErrorMsg ( errResultsTooLarge );
      return;
    }
    else
    {
      bind->value = (void *)malloc ( (size_t)(bind->maxSize) * nRows ) ;
      *(bind->len) = (unsigned int)bind->maxSize;
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

v8::Local<v8::Value> Connection::NewLob(eBaton* executeBaton,
                                         ProtoILob *protoILob)
{
  Nan::EscapableHandleScope scope;
  Connection     *connection = executeBaton->njsconn;
  Local<Object>  jsOracledb = Nan::New<Object>(connection->oracledb_->jsOracledb);
  Local<Value>   argv[1];

  Local<Object>  iLob = Nan::New<FunctionTemplate>(ILob::iLobTemplate_s)->GetFunction()->NewInstance();
  
  // the ownership of all handles in the ProtoILob are transferred to ILob
  // here.  Any error in initialization of ILob will cleanup the OCI
  // handles in the ILob cleanup routine.

  (Nan::ObjectWrap::Unwrap<ILob>(iLob))->setILob(executeBaton, protoILob);

  if (!executeBaton->error.empty())
    return Nan::Null();

  argv[0] = iLob;

  Local<Value>   result =
    Local<Function>::Cast(jsOracledb->Get(Nan::New<v8::String>("newLob").ToLocalChecked()))->Call(
      jsOracledb, 1, argv);

  return scope.Escape(result);
}





/* end of file njsConnection.cpp */
