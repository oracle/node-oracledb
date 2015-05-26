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
  NanScope();

  Local<FunctionTemplate> temp = NanNew<FunctionTemplate>(New);
  temp->InstanceTemplate()->SetInternalFieldCount(1);
  temp->SetClassName(NanNew<v8::String>("Pool"));

  NODE_SET_PROTOTYPE_METHOD(temp, "terminate", Terminate);
  NODE_SET_PROTOTYPE_METHOD(temp, "getConnection", GetConnection);

  temp->InstanceTemplate()->SetAccessor(
                                        NanNew<v8::String>("poolMax"),
                                        Pool::GetPoolMax,
                                        Pool::SetPoolMax );
  temp->InstanceTemplate()->SetAccessor(
                                        NanNew<v8::String>("poolMin"),
                                        Pool::GetPoolMin,
                                        Pool::SetPoolMin );
  temp->InstanceTemplate()->SetAccessor(
                                        NanNew<v8::String>("poolIncrement"),
                                        Pool::GetPoolIncrement,
                                        Pool::SetPoolIncrement );
  temp->InstanceTemplate()->SetAccessor(
                                        NanNew<v8::String>("poolTimeout"),
                                        Pool::GetPoolTimeout,
                                        Pool::SetPoolTimeout );
  temp->InstanceTemplate()->SetAccessor(
                                        NanNew<v8::String>("connectionsOpen"),
                                        Pool::GetConnectionsOpen,
                                        Pool::SetConnectionsOpen );
  temp->InstanceTemplate()->SetAccessor(
                                        NanNew<v8::String>("connectionsInUse"),
                                        Pool::GetConnectionsInUse,
                                        Pool::SetConnectionsInUse );
  temp->InstanceTemplate()->SetAccessor(
                                        NanNew<v8::String>("stmtCacheSize"),
                                        Pool::GetStmtCacheSize,
                                        Pool::SetStmtCacheSize );

  NanAssignPersistent( poolTemplate_s, temp );
  target->Set(NanNew<v8::String>("Pool"),temp->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of pool is called from JS

*/
NAN_METHOD(Pool::New)
{
  NanScope();

  Pool *njsPool = new Pool();
  njsPool->Wrap(args.This());

  NanReturnValue(args.This());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Abstraction to all getter accessors of properties
*/
Handle<Value> Pool::getPoolProperty(Pool* njsPool, unsigned int poolProperty)
{
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    return NanUndefined();
  }
  else
  {
    NanEscapableScope();
    Local<Integer> value = NanNew<v8::Integer>(poolProperty);
    return NanEscapeScope(value);
  }
  return NanUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMin Property
*/
NAN_PROPERTY_GETTER(Pool::GetPoolMin)
{
  NanEscapableScope();
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(args.Holder());
  Handle<Value> value = getPoolProperty( njsPool, njsPool->poolMin_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMax Property
*/
NAN_PROPERTY_GETTER(Pool::GetPoolMax)
{
  NanEscapableScope();
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(args.Holder());
  Handle<Value> value = getPoolProperty( njsPool, njsPool->poolMax_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolIncrement Property
*/
NAN_PROPERTY_GETTER(Pool::GetPoolIncrement)
{
  NanEscapableScope();
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(args.Holder());
  Handle<Value> value = getPoolProperty( njsPool, njsPool->poolIncrement_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolTimeout Property
*/
NAN_PROPERTY_GETTER(Pool::GetPoolTimeout)
{
  NanEscapableScope();
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(args.Holder());
  Handle<Value> value = getPoolProperty( njsPool, njsPool->poolTimeout_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of connectionsOpen Property
*/
NAN_PROPERTY_GETTER(Pool::GetConnectionsOpen)
{
  NanScope();
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(args.Holder());
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    NanReturnUndefined();
  }
  try
  {
    Local<Integer> value = NanNew<v8::Integer>(njsPool->dpipool_->
                                            connectionsOpen());
    NanReturnValue(value);
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_EXCEPTION(e.what(), (int) strlen(e.what()));
    NanReturnUndefined();
  }
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of connectionsInUse Property
*/
NAN_PROPERTY_GETTER(Pool::GetConnectionsInUse)
{
  NanScope();
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(args.Holder());
  if(!njsPool->isValid_)
  {
    string error = NJSMessages::getErrorMsg ( errInvalidPool );
    NJS_SET_EXCEPTION(error.c_str(), (int) error.length());
     NanReturnUndefined();
  }
  try
  {
    Local<Integer> value = NanNew<v8::Integer>(njsPool->dpipool_->
                                            connectionsInUse());
     NanReturnValue(value);
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_EXCEPTION(e.what(), (int) strlen(e.what()));
    NanReturnUndefined();
  }
  NanReturnUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of stmtCacheSize Property
*/
NAN_PROPERTY_GETTER(Pool::GetStmtCacheSize)
{
  NanEscapableScope();
  Pool* njsPool = ObjectWrap::Unwrap<Pool>(args.Holder());
  Handle<Value> value = getPoolProperty( njsPool, njsPool->stmtCacheSize_);
  NanReturnValue(value);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Abstraction to all setter accessors of properties
*/
void Pool::setPoolProperty (Pool* njsPool, string property)
{
  NanScope();
  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, property.c_str());
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMin Property - throws error
*/
NAN_SETTER(Pool::SetPoolMin)
{
  setPoolProperty(ObjectWrap::Unwrap<Pool>(args.Holder()), "poolMin");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMax Property - throws error
*/
NAN_SETTER(Pool::SetPoolMax)
{
  setPoolProperty(ObjectWrap::Unwrap<Pool>(args.Holder()), "poolMax");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolIncrement Property - throws error
*/
NAN_SETTER(Pool::SetPoolIncrement)
{
  setPoolProperty(ObjectWrap::Unwrap<Pool>(args.Holder()), "poolIncrement");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolTimeout Property - throws error
*/
NAN_SETTER(Pool::SetPoolTimeout)
{
  setPoolProperty(ObjectWrap::Unwrap<Pool>(args.Holder()), "poolTimeout");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of connectionsOpen Property - throws error
*/
NAN_SETTER(Pool::SetConnectionsOpen)
{
  setPoolProperty(ObjectWrap::Unwrap<Pool>(args.Holder()), "connectionsOpen");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of connectionsInUse Property - throws error
*/
NAN_SETTER(Pool::SetConnectionsInUse)
{
  setPoolProperty(ObjectWrap::Unwrap<Pool>(args.Holder()), "connectionsInUse");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize Property - throws error
*/
NAN_SETTER(Pool::SetStmtCacheSize)
{
  setPoolProperty(ObjectWrap::Unwrap<Pool>(args.Holder()), "stmtCacheSize");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Connection method on Pool class.

   PARAMETERS:
     Arguments - Callback
*/
NAN_METHOD(Pool::GetConnection)
{
  NanScope();

  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, args );

  Pool *njsPool = ObjectWrap::Unwrap<Pool>(args.This());

  poolBaton *connBaton = new poolBaton ();
  NanAssignPersistent( connBaton->cb, callback );

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
  NanScope();
  poolBaton *connBaton = (poolBaton*)req->data;

  v8::TryCatch tc;
  Handle<Value> argv[2];
  if(!(connBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(NanNew<v8::String>((connBaton->error).c_str()));
    argv[1] = NanUndefined();
  } 
  else
  {
    argv[0] = NanUndefined();
    Local<FunctionTemplate> lft = NanNew(Connection::connectionTemplate_s);
    Handle<Object> connection = lft->GetFunction()-> NewInstance();
    (ObjectWrap::Unwrap<Connection> (connection))->
                                 setConnection( connBaton->dpiconn,
                                                connBaton->njspool->oracledb_ );
    argv[1] = connection;
  }
  NanMakeCallback(NanGetCurrentContext()->Global(),
                     NanNew(connBaton->cb), 2, argv);
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
NAN_METHOD(Pool::Terminate)
{
  NanScope();

  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, args );

  Pool *njsPool = ObjectWrap::Unwrap<Pool>(args.This());

  poolBaton *terminateBaton = new poolBaton ();
  NanAssignPersistent( terminateBaton->cb, callback );

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

  NanReturnUndefined();
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
  NanScope();
  poolBaton *terminateBaton = (poolBaton*)req->data;

  v8::TryCatch tc;

  Handle<Value> argv[1];

  if(!(terminateBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(NanNew<v8::String>((terminateBaton->error).c_str()));
  }
  else
  {
    argv[0] = NanUndefined();
    // pool is not valid after terminate succeeds.
    terminateBaton-> njspool-> isValid_ = false;
  }

  NanMakeCallback( NanGetCurrentContext()->Global(),
                      NanNew(terminateBaton->cb), 1, argv );
  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
  delete terminateBaton;
}


/* end of file njsPool.cpp */

