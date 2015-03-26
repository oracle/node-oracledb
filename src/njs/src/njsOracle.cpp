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
  isAutoCommit_   = false;
  stmtCacheSize_  = STMT_CACHE_SIZE;
  poolMax_        = POOL_MAX;
  poolMin_        = POOL_MIN;
  poolIncrement_  = POOL_INCR;
  poolTimeout_    = POOL_TIMEOUT;
  connClass_      = "";
  isExternalAuth_ = false;
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
  HandleScope scope;

  Local<FunctionTemplate> temp = FunctionTemplate::New(New);
  oracledbTemplate_s = Persistent<FunctionTemplate>::New(temp);
  oracledbTemplate_s->InstanceTemplate()->SetInternalFieldCount(1);
  oracledbTemplate_s->SetClassName(String::New("Oracledb"));

  NODE_SET_PROTOTYPE_METHOD(oracledbTemplate_s, "getConnection", GetConnection);
  NODE_SET_PROTOTYPE_METHOD(oracledbTemplate_s, "createPool", CreatePool);
  NODE_SET_PROTOTYPE_METHOD(oracledbTemplate_s, "createPoolSync", Sync_CreatePool);

  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("poolMax"),
                                            Oracledb::GetPoolMax,
                                            Oracledb::SetPoolMax );
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("poolMin"),
                                            Oracledb::GetPoolMin,
                                            Oracledb::SetPoolMin );
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("poolIncrement"),
                                            Oracledb::GetPoolIncrement,
                                            Oracledb::SetPoolIncrement );
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("poolTimeout"),
                                            Oracledb::GetPoolTimeout,
                                            Oracledb::SetPoolTimeout );
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("stmtCacheSize"),
                                            Oracledb::GetStmtCacheSize,
                                            Oracledb::SetStmtCacheSize ); 
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("isAutoCommit"),
                                            Oracledb::GetIsAutoCommit,
                                            Oracledb::SetIsAutoCommit ); 
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("maxRows"),
                                            Oracledb::GetMaxRows,
                                            Oracledb::SetMaxRows ); 
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("outFormat"),
                                            Oracledb::GetOutFormat,
                                            Oracledb::SetOutFormat ); 
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("version"),
                                            Oracledb::GetVersion,
                                            Oracledb::SetVersion ); 
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("connectionClass"),
                                            Oracledb::GetConnectionClass,
                                            Oracledb::SetConnectionClass );
  oracledbTemplate_s->InstanceTemplate()->SetAccessor(
                                            String::New("isExternalAuth"),
                                            Oracledb::GetIsExternalAuth,
                                            Oracledb::SetIsExternalAuth ); 
  

  target->Set(String::New("Oracledb"),oracledbTemplate_s->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of oracledb is called from JS
     
*/
Handle<Value> Oracledb::New(const Arguments& args)
{
  HandleScope scope;

  Oracledb *oracledb = new Oracledb();
  oracledb->Wrap(args.This());

  return args.This();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMin Property
*/
Handle<Value> Oracledb::GetPoolMin ( Local<String> property,
                                     const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Local<Integer> value = v8::Integer::New(oracledb->poolMin_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMin Property
*/
void Oracledb::SetPoolMin ( Local<String> property, Local<Value> value,
                            const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  NJS_SET_PROP_UINT(oracledb->poolMin_, value, "poolMin");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMax Property
*/
Handle<Value> Oracledb::GetPoolMax ( Local<String> property,
                                     const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Local<Integer> value = v8::Integer::New(oracledb->poolMax_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMax Property
*/
void Oracledb::SetPoolMax ( Local<String> property, Local<Value> value,
                            const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  NJS_SET_PROP_UINT(oracledb->poolMax_, value, "poolMax");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolIncrement Property
*/
Handle<Value> Oracledb::GetPoolIncrement ( Local<String> property,
                                           const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Local<Integer> value = v8::Integer::New(oracledb->poolIncrement_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolIncrement Property
*/
void Oracledb::SetPoolIncrement ( Local<String> property, Local<Value> value,
                                  const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  NJS_SET_PROP_UINT(oracledb->poolIncrement_, value, "poolIncrement");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolTimeout Property
*/
Handle<Value> Oracledb::GetPoolTimeout ( Local<String> property,
                                         const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Local<Integer> value = v8::Integer::New(oracledb->poolTimeout_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolTimeout Property
*/
void Oracledb::SetPoolTimeout ( Local<String> property, Local<Value> value,
                                const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  NJS_SET_PROP_UINT(oracledb->poolTimeout_ , value, "poolTimeout");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of maxRows property
*/
Handle<Value> Oracledb::GetMaxRows ( Local<String> property,
                                    const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Local<Integer> value = v8::Integer::New(oracledb->maxRows_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of maxRows property
*/
void Oracledb::SetMaxRows ( Local<String> property, Local<Value> value,
                            const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  NJS_SET_PROP_UINT(oracledb->maxRows_, value, "maxRows");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of outFormat property
*/
Handle<Value> Oracledb::GetOutFormat ( Local<String> property,
                                       const AccessorInfo& info )
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  Handle<Value> value = v8::Integer::New(oracledb->outFormat_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of outFormat property
*/
void Oracledb::SetOutFormat ( Local<String> property, Local<Value> value,
                              const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  NJS_SET_PROP_UINT(oracledb->outFormat_, value, "outFormat");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of stmtCacheSize property
*/
Handle<Value> Oracledb::GetStmtCacheSize ( Local<String> property,
                                           const AccessorInfo& info ) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Local<Integer> value = v8::Integer::New(oracledb->stmtCacheSize_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize property
*/
void Oracledb::SetStmtCacheSize ( Local<String> property, Local<Value> value,
                                  const AccessorInfo& info) 
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  NJS_SET_PROP_UINT(oracledb->stmtCacheSize_, value, "stmtCacheSize");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of isAutoCommit property
*/
Handle<Value> Oracledb::GetIsAutoCommit ( Local<String> property,
                                          const AccessorInfo& info )
{
  HandleScope scope;
 
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Handle<Boolean> value = v8::Boolean::New(oracledb->isAutoCommit_);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of isAutoCommit property
*/
void Oracledb::SetIsAutoCommit ( Local<String> property, Local<Value> value,
                                 const AccessorInfo& info )
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  oracledb->isAutoCommit_ = value->ToBoolean()->Value();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of version property
*/
Handle<Value> Oracledb::GetVersion ( Local<String> property,
                                     const AccessorInfo& info ) 
{
  HandleScope scope;
  int version = NJS_NODE_ORACLEDB_VERSION;
  Local<Integer> value = v8::Integer::New(version);
  return scope.Close(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of version property
*/
void Oracledb::SetVersion ( Local<String> property, Local<Value> value,
                            const AccessorInfo& info) 
{
  HandleScope scope;
  std::string msg;
  msg = NJSMessages::getErrorMsg(errReadOnly, "version");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length()); 
}


/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of connectionClass property
*/
Handle<Value> Oracledb::GetConnectionClass ( Local<String> property,
                                             const AccessorInfo& info)
{
  HandleScope scope;
  
  Oracledb *oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  Handle<String> value = v8::String::New (oracledb->connClass_.c_str(), 
                                          (int)oracledb->connClass_.length ());
  return scope.Close(value);
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of connectionClass property
*/
void Oracledb::SetConnectionClass (Local<String> property, Local<Value> value,
                                   const AccessorInfo& info)
{
  HandleScope scope;
  
  Oracledb *oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder());
  v8::String::Utf8Value utfstr ( value->ToString () );
  
  oracledb->connClass_ = std::string ( *utfstr, utfstr.length() );
}


/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of isExternalAuth property
*/
Handle<Value> Oracledb::GetIsExternalAuth(Local<String> property,
                                          const AccessorInfo& info )
{
  HandleScope scope;
 
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  Handle<Boolean> value = v8::Boolean::New(oracledb->isExternalAuth_);
  return scope.Close(value);
}


/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of isExternalAuth property
*/
void Oracledb::SetIsExternalAuth(Local<String> property, Local<Value> value,
                                 const AccessorInfo& info )
{
  HandleScope scope;
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb>(info.Holder()); 
  oracledb->isExternalAuth_ = value->ToBoolean()->Value();
}


/*****************************************************************************/
                                                                             /*
   DESCRIPTION
     Get Connection method on Oracledb class.
  
   PARAMETERS:
     Arguments - Connection attributes as JSON object,
                 Callback
*/
Handle<Value>  Oracledb::GetConnection(const Arguments& args)
{
  HandleScope scope;
 
  Local<Function> callback;
  Local<Object> connProps;
  NJS_GET_CALLBACK ( callback, args );
   
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb> ( args.This() );
  connectionBaton *connBaton = new connectionBaton ();
  connBaton->cb = Persistent<Function>::New( callback ); 

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
  connBaton->isExternalAuth = oracledb->isExternalAuth_; 

  NJS_GET_UINT_FROM_JSON   ( connBaton->stmtCacheSize, connBaton->error,
                             connProps, "stmtCacheSize", 0, exitGetConnection );
  NJS_GET_BOOL_FROM_JSON   ( connBaton->isExternalAuth, connBaton->error,
                             connProps, "isExternalAuth", 0, exitGetConnection );

  connBaton->oracledb   =  oracledb; 
  connBaton->dpienv     =  oracledb->dpienv_; 

exitGetConnection : 
  connBaton->req.data  =  (void*) connBaton;
  // This needs to be called even in error case to make the control
  // fall through uv_after_work_cb. In case of error being present in
  // baton, the worker thread anyway returns
  uv_queue_work( uv_default_loop(), &connBaton->req, Async_GetConnection, 
                 (uv_after_work_cb) Async_AfterGetConnection );
  return Undefined();
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
                                              connBaton->isExternalAuth );

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
  HandleScope scope;
  connectionBaton *connBaton = (connectionBaton*)req->data;

  v8::TryCatch tc; 
  Handle<Value> argv[2];
  if( !(connBaton->error).empty() ) 
  {
    argv[0] = v8::Exception::Error(String::New( (connBaton->error).c_str() ));
    argv[1] = Null();
  } 
  else
  {
    argv[0] = Undefined();
    Handle<Object> connection = Connection::connectionTemplate_s->
                                GetFunction()-> NewInstance();
    (ObjectWrap::Unwrap<Connection> (connection))-> 
                                setConnection( connBaton->dpiconn,
                                               connBaton->oracledb );
    argv[1] = connection;
  }
  Local<Function> callback = Local<Function>::New(connBaton->cb);
  delete connBaton;
  node::MakeCallback( Context::GetCurrent()->Global(), 
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
Handle<Value> Oracledb::CreatePool (const Arguments &args)
{
  HandleScope scope ;
 
  Local<Function> callback;
  Local<Object> poolProps;
  NJS_GET_CALLBACK ( callback, args );
   
  Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb> ( args.This() );
  connectionBaton *poolBaton = new connectionBaton ();
  poolBaton->cb = Persistent<Function>::New( callback ); 

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
  poolBaton->isExternalAuth = oracledb->isExternalAuth_; 

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
  NJS_GET_BOOL_FROM_JSON   ( poolBaton->isExternalAuth, poolBaton->error,
                             poolProps, "isExternalAuth", 0, exitCreatePool );
  
  poolBaton->oracledb  =  oracledb;
  poolBaton->dpienv    =  oracledb->dpienv_; 

exitCreatePool:
  poolBaton->req.data = (void *)poolBaton;
  
  uv_queue_work(uv_default_loop(),
                &poolBaton->req,
                Async_CreatePool,
                (uv_after_work_cb) Async_AfterCreatePool);
  
  return Undefined();
}
/*****************************************************************************/
/*
  DESCRIPTION
    Sync CreatePool method on Oracledb class.
  PARAMETERS:
    Arguments - Pool attributes as JSON object,
*/
Handle<Value> Oracledb::Sync_CreatePool (const Arguments &args)
{
    HandleScope scope ;

    Local<Object> poolProps;

    Oracledb* oracledb = ObjectWrap::Unwrap<Oracledb> ( args.This() );
    connectionBaton *poolBaton = new connectionBaton ();

    NJS_CHECK_NUMBER_OF_ARGS ( poolBaton->error, args, 1, 1, exitCreatePool );
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

    poolBaton->oracledb  =  oracledb;
    poolBaton->dpienv    =  oracledb->dpienv_;

    exitCreatePool:



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
                poolBaton->stmtCacheSize );
    }
    catch (dpi::Exception &e)
    {
        poolBaton->error = std::string (e.what() );
    }
    exitAsyncCreatePool:
    ;



    v8::TryCatch tc;
    Handle<Value> pool;

    if (!poolBaton->error.empty())
    {
        ThrowException(v8::Exception::Error(String::New(( poolBaton->error).c_str() )));
    }
    else
    {

        Handle<Object> njsPool = Pool::poolTemplate_s->
                GetFunction() ->NewInstance();
        (ObjectWrap::Unwrap<Pool> (njsPool))-> setPool ( poolBaton->dpipool,
                poolBaton->oracledb,
                poolBaton->poolMax,
                poolBaton->poolMin,
                poolBaton->poolIncrement,
                poolBaton->poolTimeout,
                poolBaton->stmtCacheSize );
        pool = njsPool;
    }

    delete poolBaton;

    if(tc.HasCaught())
    {
        node::FatalException (tc);
    }



    return scope.Close(pool);
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
                                                  poolBaton->isExternalAuth );
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
  HandleScope scope ;
  connectionBaton *poolBaton = (connectionBaton *)req->data;
  
  v8::TryCatch tc;
  Handle<Value> argv[2];

  if (!poolBaton->error.empty())
  {
    argv[0] = v8::Exception::Error(String::New(( poolBaton->error).c_str() ));
    argv[1] = Undefined();
  }
  else
  {
    argv[0] = Undefined () ; 
    Handle<Object> njsPool = Pool::poolTemplate_s-> 
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
  Local<Function> callback = Local<Function>::New(poolBaton->cb);
  delete poolBaton;
  node::MakeCallback ( Context::GetCurrent()->Global(),
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

