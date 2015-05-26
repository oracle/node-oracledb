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
 *   njsOracle.cpp
 *
 * DESCRIPTION
 *   Oracledb class implementation.
 *
 *****************************************************************************/

#include "node.h"

#include "njsOracle.h"
#include "njsConnection.h"
#include "njsPool.h"
#include "njsMessages.h"
                                        //peristent Oracledb class handle
Persistent<FunctionTemplate> Oracledb::oracledbTemplate_s;

#define MAX_ROWS 100
#define STMT_CACHE_SIZE 30
#define POOL_MIN 0
#define POOL_MAX 4
#define POOL_INCR 1
#define POOL_TIMEOUT 60

/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the Oracledb class.
 */
Oracledb::Oracledb()
{
  dpienv_         = dpi::Env::createEnv();
  outFormat_      = ROWS_ARRAY;
  maxRows_        = MAX_ROWS;
  autoCommit_   = false;
  stmtCacheSize_  = STMT_CACHE_SIZE;
  poolMax_        = POOL_MAX;
  poolMin_        = POOL_MIN;
  poolIncrement_  = POOL_INCR;
  poolTimeout_    = POOL_TIMEOUT;
  connClass_      = "";
  externalAuth_ = false;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the Oracledb class.
 */
Oracledb::~Oracledb()
{

  if (this->dpienv_)
  {
    dpienv_->terminate();
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Init function of the Oracledb class.
     Initiates and maps the functions and properties of Oracledb class.
*/
void Oracledb::Init(Handle<Object> target)
{
  NanScope();

  Local<FunctionTemplate> temp = NanNew<FunctionTemplate>(New);
  //Local<FunctionTemplate> temp = NanNew<FunctionTemplate>(New);
  temp->InstanceTemplate()->SetInternalFieldCount(1);
  temp->SetClassName(NanNew<v8::String>("Oracledb"));

  NODE_SET_PROTOTYPE_METHOD(temp, "getConnection", GetConnection);
  NODE_SET_PROTOTYPE_METHOD(temp, "createPool", CreatePool);

  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("poolMax"),
                              Oracledb::GetPoolMax,
                              Oracledb::SetPoolMax );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("poolMin"),
                              Oracledb::GetPoolMin,
                              Oracledb::SetPoolMin );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("poolIncrement"),
                              Oracledb::GetPoolIncrement,
                              Oracledb::SetPoolIncrement );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("poolTimeout"),
                              Oracledb::GetPoolTimeout,
                              Oracledb::SetPoolTimeout );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("stmtCacheSize"),
                              Oracledb::GetStmtCacheSize,
                              Oracledb::SetStmtCacheSize );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("autoCommit"),
                              Oracledb::GetAutoCommit,
                              Oracledb::SetAutoCommit );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("maxRows"),
                              Oracledb::GetMaxRows,
                              Oracledb::SetMaxRows );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("outFormat"),
                              Oracledb::GetOutFormat,
                              Oracledb::SetOutFormat );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("version"),
                              Oracledb::GetVersion,
                              Oracledb::SetVersion );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("connectionClass"),
                              Oracledb::GetConnectionClass,
                              Oracledb::SetConnectionClass );
  temp->InstanceTemplate()->SetAccessor(
                              NanNew<v8::String>("externalAuth"),
                              Oracledb::GetExternalAuth,
                              Oracledb::SetExternalAuth );

  NanAssignPersistent( oracledbTemplate_s, temp);
  target->Set(NanNew<v8::String>("Oracledb"),temp->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of oracledb is called from JS

*/
NAN_METHOD(Oracledb::New)
{
  NanScope();

  Oracledb *oracledb = new Oracledb();
  oracledb->Wrap(args.This());

  NanReturnValue(args.This());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMin Property
*/
NAN_PROPERTY_GETTER(Oracledb::GetPoolMin)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Local<Integer> value = NanNew<v8::Integer>(oracledb->poolMin_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMin Property
*/
NAN_SETTER(Oracledb::SetPoolMin)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  NJS_SET_PROP_UINT(oracledb->poolMin_, value, "poolMin");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMax Property
*/
NAN_PROPERTY_GETTER(Oracledb::GetPoolMax)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Local<Integer> value = NanNew<v8::Integer>(oracledb->poolMax_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMax Property
*/
NAN_SETTER(Oracledb::SetPoolMax)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  NJS_SET_PROP_UINT(oracledb->poolMax_, value, "poolMax");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolIncrement Property
*/
NAN_PROPERTY_GETTER(Oracledb::GetPoolIncrement)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Local<Integer> value = NanNew<v8::Integer>(oracledb->poolIncrement_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolIncrement Property
*/
NAN_SETTER(Oracledb::SetPoolIncrement)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  NJS_SET_PROP_UINT(oracledb->poolIncrement_, value, "poolIncrement");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolTimeout Property
*/
NAN_PROPERTY_GETTER(Oracledb::GetPoolTimeout)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Local<Integer> value = NanNew<v8::Integer>(oracledb->poolTimeout_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolTimeout Property
*/
NAN_SETTER(Oracledb::SetPoolTimeout)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  NJS_SET_PROP_UINT(oracledb->poolTimeout_ , value, "poolTimeout");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of maxRows property
*/
NAN_PROPERTY_GETTER(Oracledb::GetMaxRows)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Local<Integer> value = NanNew<v8::Integer>(oracledb->maxRows_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of maxRows property
*/
NAN_SETTER(Oracledb::SetMaxRows)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  NJS_SET_PROP_UINT(oracledb->maxRows_, value, "maxRows");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of outFormat property
*/
NAN_PROPERTY_GETTER(Oracledb::GetOutFormat)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Handle<Value> value = NanNew<v8::Integer>(oracledb->outFormat_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of outFormat property
*/
NAN_SETTER(Oracledb::SetOutFormat)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  NJS_SET_PROP_UINT(oracledb->outFormat_, value, "outFormat");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of stmtCacheSize property
*/
NAN_PROPERTY_GETTER(Oracledb::GetStmtCacheSize)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Local<Integer> value = NanNew<v8::Integer>(oracledb->stmtCacheSize_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize property
*/
NAN_SETTER(Oracledb::SetStmtCacheSize)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  NJS_SET_PROP_UINT(oracledb->stmtCacheSize_, value, "stmtCacheSize");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of autoCommit property
*/
NAN_PROPERTY_GETTER(Oracledb::GetAutoCommit)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Handle<Boolean> value = NanNew<v8::Boolean>(oracledb->autoCommit_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of autoCommit property
*/
NAN_SETTER(Oracledb::SetAutoCommit)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  oracledb->autoCommit_ = value->ToBoolean()->Value();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of version property
*/
NAN_PROPERTY_GETTER(Oracledb::GetVersion)
{
  NanScope();
  int version = NJS_NODE_ORACLEDB_VERSION;
  Local<Integer> value =  NanNew<v8::Integer>(version);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of version property
*/
NAN_SETTER(Oracledb::SetVersion)
{
  NanScope();
  std::string msg;
  msg = NJSMessages::getErrorMsg(errReadOnly, "version");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}


/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of connectionClass property
*/
NAN_PROPERTY_GETTER(Oracledb::GetConnectionClass)
{
  NanScope();

  Oracledb *oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Handle<String> value = NanNew<v8::String>(oracledb->connClass_.c_str(),
                                          (int)oracledb->connClass_.length ());
  NanReturnValue(value);
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of connectionClass property
*/
NAN_SETTER(Oracledb::SetConnectionClass)
{
  NanScope();

  Oracledb *oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  v8::String::Utf8Value utfstr ( value->ToString () );

  oracledb->connClass_ = std::string ( *utfstr, utfstr.length() );
}


/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of externalAuth property
*/
NAN_PROPERTY_GETTER(Oracledb::GetExternalAuth)
{
  NanScope();

  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  Handle<Boolean> value = NanNew<v8::Boolean>(oracledb->externalAuth_);

  NanReturnValue(value);
}


/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of externalAuth property
*/
NAN_SETTER(Oracledb::SetExternalAuth)
{
  NanScope();
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(args.Holder());
  oracledb->externalAuth_ = value->ToBoolean()->Value();
}


/*****************************************************************************/
                                                                             /*
   DESCRIPTION
     Get Connection method on Oracledb class.

   PARAMETERS:
     Arguments - Connection attributes as JSON object,
                 Callback
*/
NAN_METHOD(Oracledb::GetConnection)
{
  NanScope();

  Local<Function> callback;
  Local<Object> connProps;
  NJS_GET_CALLBACK ( callback, args );

  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb> ( args.This() );
  connectionBaton *connBaton = new connectionBaton ();
  NanAssignPersistent(connBaton->cb, callback );

  NJS_CHECK_NUMBER_OF_ARGS ( connBaton->error, args, 2, 2, exitGetConnection );
  NJS_GET_ARG_V8OBJECT ( connProps, connBaton->error, args, 0,
                         exitGetConnection );
  NJS_GET_STRING_FROM_JSON ( connBaton->user, connBaton->error,
                             connProps, "user", 0, exitGetConnection );
  NJS_GET_STRING_FROM_JSON ( connBaton->pswrd, connBaton->error,
                             connProps, "password", 0, exitGetConnection );
  NJS_GET_STRING_FROM_JSON ( connBaton->connStr, connBaton->error,
                             connProps, "connectString", 0, exitGetConnection );

  connBaton->connClass      = oracledb->connClass_;

  // the following properties will be overriden if provided as call parameters

  connBaton->stmtCacheSize  = oracledb->stmtCacheSize_;
  connBaton->externalAuth = oracledb->externalAuth_;

  NJS_GET_UINT_FROM_JSON   ( connBaton->stmtCacheSize, connBaton->error,
                             connProps, "stmtCacheSize", 0, exitGetConnection );
  NJS_GET_BOOL_FROM_JSON   ( connBaton->externalAuth, connBaton->error,
                             connProps, "externalAuth", 0, exitGetConnection );

  connBaton->oracledb   =  oracledb;
  connBaton->dpienv     =  oracledb->dpienv_;

exitGetConnection :
  connBaton->req.data  =  (void*) connBaton;
  // This needs to be called even in error case to make the control
  // fall through uv_after_work_cb. In case of error being present in
  // baton, the worker thread anyway returns
  uv_queue_work( uv_default_loop(), &connBaton->req, Async_GetConnection,
                 (uv_after_work_cb) Async_AfterGetConnection );
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of Get Connection method

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution.
*/
void Oracledb::Async_GetConnection (uv_work_t *req)
{
  connectionBaton *connBaton = (connectionBaton*)req->data;

  if(!(connBaton->error).empty()) goto exitAsync_GetConnection;
  try
  {
    connBaton->dpiconn = connBaton-> dpienv ->
                               getConnection( connBaton->user,
                                              connBaton->pswrd,
                                              connBaton->connStr,
                                              connBaton->stmtCacheSize,
                                              connBaton->connClass,
                                              connBaton->externalAuth );

  }
  catch (dpi::Exception& e)
  {
    connBaton->error = std::string(e.what());
  }
  exitAsync_GetConnection:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Get Connection method

   PARAMETERS:
     UV queue work block

   NOTES:
     Connection handle is formed and handed over to JS.

*/
void Oracledb::Async_AfterGetConnection (uv_work_t *req)
{
  NanScope();
  connectionBaton *connBaton = (connectionBaton*)req->data;

  v8::TryCatch tc;
  Handle<Value> argv[2];
  if( !(connBaton->error).empty() )
  {
    argv[0] = v8::Exception::Error(NanNew<v8::String>( (connBaton->error).c_str() ));
    argv[1] = NanNull();
  } 
  else
  {
    argv[0] = NanUndefined();
    Local<FunctionTemplate> lft = NanNew(Connection::connectionTemplate_s);
    Handle<Object> connection = lft->GetFunction()-> NewInstance();
    (ObjectWrap::Unwrap<Connection> (connection))->
                                setConnection( connBaton->dpiconn,
                                               connBaton->oracledb );
    argv[1] = connection;
  }
  Local<Function> callback = NanNew(connBaton->cb);
  delete connBaton;
  NanMakeCallback( NanGetCurrentContext()->Global(),
                      callback, 2, argv );
  if(tc.HasCaught())
    node::FatalException(tc);
}

/*****************************************************************************/
/*
   DESCRIPTION
     CreatePool method on Oracledb class.

   PARAMETERS:
     Arguments - Pool attributes as JSON object,
                 Callback
*/
NAN_METHOD(Oracledb::CreatePool)
{
  NanScope();

  Local<Function> callback;
  Local<Object> poolProps;
  NJS_GET_CALLBACK ( callback, args );

  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb> ( args.This() );
  connectionBaton *poolBaton = new connectionBaton ();

  NanAssignPersistent( poolBaton->cb, callback );

  NJS_CHECK_NUMBER_OF_ARGS ( poolBaton->error, args, 2, 2, exitCreatePool );
  NJS_GET_ARG_V8OBJECT ( poolProps, poolBaton->error, args, 0,
                         exitCreatePool );
  NJS_GET_STRING_FROM_JSON ( poolBaton->user, poolBaton->error,
                             poolProps, "user", 0, exitCreatePool );
  NJS_GET_STRING_FROM_JSON ( poolBaton->pswrd, poolBaton->error,
                             poolProps, "password", 0, exitCreatePool );
  NJS_GET_STRING_FROM_JSON ( poolBaton->connStr, poolBaton->error,
                             poolProps, "connectString", 0, exitCreatePool );

  poolBaton->poolMax       =  oracledb->poolMax_;
  poolBaton->poolMin       =  oracledb->poolMin_;
  poolBaton->poolIncrement =  oracledb->poolIncrement_;
  poolBaton->poolTimeout   =  oracledb->poolTimeout_;
  poolBaton->stmtCacheSize =  oracledb->stmtCacheSize_;
  poolBaton->externalAuth = oracledb->externalAuth_;

  NJS_GET_UINT_FROM_JSON   ( poolBaton->poolMax, poolBaton->error,
                             poolProps, "poolMax", 0, exitCreatePool );
  NJS_GET_UINT_FROM_JSON   ( poolBaton->poolMin, poolBaton->error,
                             poolProps, "poolMin", 0, exitCreatePool );
  NJS_GET_UINT_FROM_JSON   ( poolBaton->poolIncrement, poolBaton->error,
                             poolProps, "poolIncrement", 0, exitCreatePool );
  NJS_GET_UINT_FROM_JSON   ( poolBaton->poolTimeout, poolBaton->error,
                             poolProps, "poolTimeout", 0, exitCreatePool );
  NJS_GET_UINT_FROM_JSON   ( poolBaton->stmtCacheSize, poolBaton->error,
                             poolProps, "stmtCacheSize", 0, exitCreatePool );
  NJS_GET_BOOL_FROM_JSON   ( poolBaton->externalAuth, poolBaton->error,
                             poolProps, "externalAuth", 0, exitCreatePool );

  poolBaton->oracledb  =  oracledb;
  poolBaton->dpienv    =  oracledb->dpienv_;

exitCreatePool:
  poolBaton->req.data = (void *)poolBaton;

  uv_queue_work(uv_default_loop(),
                &poolBaton->req,
                Async_CreatePool,
                (uv_after_work_cb) Async_AfterCreatePool);

  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker Function of CreatePool.

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution.
*/
void Oracledb::Async_CreatePool (uv_work_t *req)
{
  connectionBaton *poolBaton = (connectionBaton *)req->data;

  if(!(poolBaton->error).empty()) goto exitAsyncCreatePool;

  try
  {
    poolBaton->dpipool = poolBaton-> dpienv ->
                                     createPool ( poolBaton->user,
                                                  poolBaton->pswrd,
                                                  poolBaton->connStr,
                                                  poolBaton->poolMax,
                                                  poolBaton->poolMin,
                                                  poolBaton->poolIncrement,
                                                  poolBaton->poolTimeout,
                                                  poolBaton->stmtCacheSize,
                                                  poolBaton->externalAuth );
  }
  catch (dpi::Exception &e)
  {
    poolBaton->error = std::string (e.what() );
  }
  exitAsyncCreatePool:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker Function of CreatePool.

   PARAMETERS:
     UV queue work block

   NOTES:
     Pool handle is created and handed over to JS.
*/
void Oracledb::Async_AfterCreatePool (uv_work_t *req)
{
  NanScope() ;
  connectionBaton *poolBaton = (connectionBaton *)req->data;

  v8::TryCatch tc;
  Handle<Value> argv[2];

  if (!poolBaton->error.empty())
  {
    argv[0] = v8::Exception::Error(NanNew<v8::String>(( poolBaton->error).c_str() ));
    argv[1] = NanUndefined();
  }
  else
  {
    argv[0] = NanUndefined ();
    Handle<Object> njsPool = NanNew(Pool::poolTemplate_s)->
                             GetFunction() ->NewInstance();
    (ObjectWrap::Unwrap<Pool> (njsPool))-> setPool ( poolBaton->dpipool,
                                                     poolBaton->oracledb,
                                                     poolBaton->poolMax,
                                                     poolBaton->poolMin,
                                                     poolBaton->poolIncrement,
                                                     poolBaton->poolTimeout,
                                                     poolBaton->stmtCacheSize );
    argv[1] = njsPool;
  }
  Local<Function> callback = NanNew(poolBaton->cb);
  delete poolBaton;
  NanMakeCallback ( NanGetCurrentContext()->Global(),
                       callback, 2, argv);
  if(tc.HasCaught())
  {
    node::FatalException (tc);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when require on oracledb is called

   PARAMETERS:
     Target Object
*/
extern "C"
{
   static void init(Handle<Object> target)
   {
      Oracledb::Init(target);
      Connection::Init(target);
      Pool::Init(target);
   }

   NODE_MODULE(oracledb, init)
}



/* end of file njsOracle.cpp */

