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
 *   njsPool.cpp
 *
 * DESCRIPTION
 *   Pool class implementation.
 *
 *****************************************************************************/

#include "node.h"

#include <string>

#include "njsOracle.h"
#include "njsPool.h"
#include "njsConnection.h"
#include "njsUtils.h"

using namespace std;
using namespace node;
using namespace v8;
                                        //peristent Pool class handle
Persistent<FunctionTemplate> Pool::poolTemplate_s;

Pool::Pool(){}
Pool::~Pool(){}

/*****************************************************************************/
/*
   DESCRIPTION
     Store the config in pool instance. 
*/
void Pool::setPool( dpi::SPool *dpipool, Oracledb* oracledb, unsigned int poolMax,
                    unsigned int poolMin, unsigned int poolIncrement,
                    unsigned int poolTimeout, unsigned stmtCacheSize )
{
  this->dpipool_       = dpipool;  
  this->isValid_       = true;  
  this->oracledb_      = oracledb;  
  this->poolMax_       = poolMax;  
  this->poolMin_       = poolMin;  
  this->poolIncrement_ = poolIncrement;  
  this->poolTimeout_   = poolTimeout;  
  this->stmtCacheSize_ = stmtCacheSize;  
}

/*****************************************************************************/
/*
   DESCRIPTION
     Init function of the Pool class.
     Initiates and maps the functions and properties of Pool class.
*/     
void Pool::Init(Handle<Object> target) 
{
  HandleScope scope;

  Local<FunctionTemplate> temp = FunctionTemplate::New(New);
  poolTemplate_s = Persistent<FunctionTemplate>::New(temp);
  poolTemplate_s->InstanceTemplate()->SetInternalFieldCount(1);
  poolTemplate_s->SetClassName(String::New("Pool"));

  NODE_SET_PROTOTYPE_METHOD(poolTemplate_s, "terminate", Terminate);
  NODE_SET_PROTOTYPE_METHOD(poolTemplate_s, "getConnection", GetConnection);

  poolTemplate_s->InstanceTemplate()->SetAccessor(
                                        String::New("poolMax"),
                                        Pool::GetPoolMax,
                                        Pool::SetPoolMax );
  poolTemplate_s->InstanceTemplate()->SetAccessor(
                                        String::New("poolMin"),
                                        Pool::GetPoolMin,
                                        Pool::SetPoolMin );
  poolTemplate_s->InstanceTemplate()->SetAccessor(
                                        String::New("poolIncrement"),
                                        Pool::GetPoolIncrement,
                                        Pool::SetPoolIncrement );
  poolTemplate_s->InstanceTemplate()->SetAccessor(
                                        String::New("poolTimeout"),
                                        Pool::GetPoolTimeout,
                                        Pool::SetPoolTimeout );
  poolTemplate_s->InstanceTemplate()->SetAccessor(
                                        String::New("connectionsOpen"),
                                        Pool::GetConnectionsOpen,
                                        Pool::SetConnectionsOpen );
  poolTemplate_s->InstanceTemplate()->SetAccessor(
                                        String::New("connectionsInUse"),
                                        Pool::GetConnectionsInUse,
                                        Pool::SetConnectionsInUse );
  poolTemplate_s->InstanceTemplate()->SetAccessor(
                                        String::New("stmtCacheSize"),
                                        Pool::GetStmtCacheSize,
                                        Pool::SetStmtCacheSize );

  target->Set(String::New("Pool"),poolTemplate_s->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of pool is called from JS
     
*/
Handle<Value> Pool::New(const Arguments& args) 
{
  HandleScope scope;

  Pool *njsPool = new Pool();
  njsPool->Wrap(args.This());

  return args.This();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMin Property
*/
Handle<Value> Pool::GetPoolMin (Local<String> property,
                                const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return Undefined();
  }
  else
  {
    Local<Integer> value = v8::Integer::New(njsPool->poolMin_);
    return scope.Close(value);
  }
  return Undefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMax Property
*/
Handle<Value> Pool::GetPoolMax (Local<String> property,
                                const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return Undefined();
  }
  else
  {
    Local<Integer> value = v8::Integer::New(njsPool->poolMax_);
    return scope.Close(value);
  }
  return Undefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolIncrement Property
*/
Handle<Value> Pool::GetPoolIncrement (Local<String> property,
                                      const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return Undefined();
  }
  else
  {
    Local<Integer> value = v8::Integer::New(njsPool->poolIncrement_);
    return scope.Close(value);
  }
  return Undefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolTimeout Property
*/
Handle<Value> Pool::GetPoolTimeout (Local<String> property,
                                const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return Undefined();
  }
  else
  {
    Local<Integer> value = v8::Integer::New(njsPool->poolTimeout_);
    return scope.Close(value);
  }
  return Undefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of connectionsOpen Property
*/
Handle<Value> Pool::GetConnectionsOpen (Local<String> property,
                                        const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  if(!njsPool->isValid_)
  {
    string error = NJSMessages::getErrorMsg ( errInvalidPool );
    NJS_SET_EXCEPTION(error.c_str(), (int) error.length());
    return scope.Close(Undefined());
  }
  try
  {
    Local<Integer> value = v8::Integer::New(njsPool->dpipool_->
                                            connectionsOpen());
    return scope.Close(value);
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_EXCEPTION(e.what(), (int) strlen(e.what()));
    return Undefined();
  }
  return Undefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of connectionsInUse Property
*/
Handle<Value> Pool::GetConnectionsInUse (Local<String> property,
                              const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  Local<Integer> value;
  if(!njsPool->isValid_)
  {
    string error = NJSMessages::getErrorMsg ( errInvalidPool );
    NJS_SET_EXCEPTION(error.c_str(), (int) error.length());
    return scope.Close(Undefined());
  }
  try
  {
    Local<Integer> value = v8::Integer::New(njsPool->dpipool_->
                                            connectionsInUse());
    return scope.Close(value);
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_EXCEPTION(e.what(), (int) strlen(e.what()));
    return Undefined();
  }
  return Undefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of stmtCacheSize Property
*/
Handle<Value> Pool::GetStmtCacheSize (Local<String> property,
                                      const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return Undefined();
  }
  else 
  {
    Local<Integer> value = v8::Integer::New(njsPool->stmtCacheSize_);  
    return scope.Close(value);
  }
  return Undefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMin Property - throws error
*/
void Pool::SetPoolMin (Local<String> property, Local<Value> value,
                            const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "poolMin");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMax Property - throws error
*/
void Pool::SetPoolMax (Local<String> property, Local<Value> value,
                            const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "poolMax");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolIncrement Property - throws error
*/
void Pool::SetPoolIncrement (Local<String> property, Local<Value> value,
                            const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "poolIncrement");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolTimeout Property - throws error
*/
void Pool::SetPoolTimeout (Local<String> property, Local<Value> value,
                            const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "poolTimeout");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of connectionsOpen Property - throws error
*/
void Pool::SetConnectionsOpen (Local<String> property, Local<Value> value,
                            const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "connectionsOpen");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of connectionsInUse Property - throws error
*/
void Pool::SetConnectionsInUse (Local<String> property, Local<Value> value,
                            const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "connectionsInUse");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize Property - throws error
*/
void Pool::SetStmtCacheSize(Local<String> property, Local<Value> value,
                            const AccessorInfo& info)
{
  HandleScope scope;
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(info.Holder());
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "stmtCacheSize");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Connection method on Pool class.
  
   PARAMETERS:
     Arguments - Callback 
*/
Handle<Value> Pool::GetConnection(const Arguments& args)
{
  HandleScope scope;

  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, args );

  Pool *njsPool = ObjectWrap::Unwrap<Pool>(args.This());
  poolBaton *connBaton = new poolBaton ();
  connBaton->cb = Persistent<Function>::New( callback );

  NJS_CHECK_NUMBER_OF_ARGS ( connBaton->error, args, 1, 1, exitGetConnection );

  if(!njsPool->isValid_)
  {
    connBaton->error = NJSMessages::getErrorMsg ( errInvalidPool );
    goto exitGetConnection;
  }
  connBaton->njspool   = njsPool;
  connBaton->connClass = njsPool->oracledb_->getConnectionClass ();  
  
exitGetConnection:
  connBaton->req.data = (void *)connBaton;
  
  uv_queue_work(uv_default_loop(), &connBaton->req, Async_GetConnection, 
                (uv_after_work_cb)Async_AfterGetConnection);
  
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
void Pool::Async_GetConnection(uv_work_t *req)
{
  poolBaton *connBaton = (poolBaton *)req->data;
  if(!(connBaton->error).empty()) goto exitAsyncGetConnection;

  try
  {
    connBaton->dpiconn = connBaton-> njspool -> dpipool_ ->
                                  getConnection ( connBaton-> connClass);
  }
  catch (dpi::Exception &e)
  {
    connBaton->error = std::string (e.what());
  }
  exitAsyncGetConnection:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Get Connection method
  
   PARAMETERS:
     UV queue work block 
     status - expected to be non-zero.

   NOTES:
     Connection handle is formed and handed over to JS.
*/
void Pool::Async_AfterGetConnection(uv_work_t *req)
{
  HandleScope scope;
  poolBaton *connBaton = (poolBaton*)req->data;
  v8::TryCatch tc;
  Handle<Value> argv[2];
  if(!(connBaton->error).empty()) 
  {
    argv[0] = v8::Exception::Error(String::New((connBaton->error).c_str()));
    argv[1] = Undefined();
  } 
  else
  {
    argv[0] = Undefined();
    Handle<Object> connection = Connection::connectionTemplate_s->
                                GetFunction()-> NewInstance();
    (ObjectWrap::Unwrap<Connection> (connection))->
                                 setConnection( connBaton->dpiconn,
                                                connBaton->njspool->oracledb_ );
    argv[1] = connection;
  }
  node::MakeCallback(Context::GetCurrent()->Global(), 
                     connBaton->cb, 2, argv); 
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
  delete connBaton;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Terminate method
  
   PARAMETERS:
     Arguments - Callback 
*/
Handle<Value> Pool::Terminate(const Arguments& args )
{
  HandleScope scope;

  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, args );

  Pool *njsPool = ObjectWrap::Unwrap<Pool>(args.This());
  poolBaton *terminateBaton = new poolBaton ();
  terminateBaton->cb = Persistent<Function>::New( callback );

  NJS_CHECK_NUMBER_OF_ARGS ( terminateBaton->error, args, 1, 1, exitTerminate );

  if(!njsPool->isValid_)
  {
    terminateBaton->error = NJSMessages::getErrorMsg( errInvalidPool );
    goto exitTerminate;
  }
  terminateBaton->njspool      = njsPool;

exitTerminate:
  terminateBaton->req.data = (void *)terminateBaton;
  
  uv_queue_work(uv_default_loop(), &terminateBaton->req, Async_Terminate, 
                (uv_after_work_cb)Async_AfterTerminate);
  
 return scope.Close(Undefined());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of terminate. 
  
   PARAMETERS:
     UV queue work block 

   NOTES:
     DPI call execution.
*/
void Pool::Async_Terminate(uv_work_t *req)
{
  poolBaton *terminateBaton = (poolBaton*)req->data;
  if(!terminateBaton->error.empty()) goto exitAsyncTerminate;

  try
  {
    terminateBaton-> njspool-> dpipool_-> terminate ();
  }
  catch(dpi::Exception& e)
  {
    terminateBaton->error = std::string(e.what()); 
  }
  exitAsyncTerminate:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of terminate 
  
   PARAMETERS:
     UV queue work block 
*/
void Pool::Async_AfterTerminate(uv_work_t *req)
{
  HandleScope scope;
  poolBaton *terminateBaton = (poolBaton*)req->data;

  v8::TryCatch tc;

  Handle<Value> argv[1];

  if(!(terminateBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(String::New((terminateBaton->error).c_str()));
  }
  else
  {
    argv[0] = Undefined();
    // pool is not valid after terminate succeeds.
    terminateBaton-> njspool-> isValid_ = false; 
  }

  node::MakeCallback( Context::GetCurrent()->Global(),
                      terminateBaton->cb, 1, argv );
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
  delete terminateBaton;
}


/* end of file njsPool.cpp */

