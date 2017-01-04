/* Copyright (c) 2015, 2016, Oracle and/or its affiliates. All rights reserved. */

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
Nan::Persistent<FunctionTemplate> Pool::poolTemplate_s;

Pool::Pool(){}
Pool::~Pool(){}

/*****************************************************************************/
/*
   DESCRIPTION
     Store the config in pool instance.
*/
void Pool::setPool( dpi::SPool *dpipool, Oracledb* oracledb,
                    unsigned int poolMax, unsigned int poolMin,
                    unsigned int poolIncrement, unsigned int poolTimeout,
                    unsigned stmtCacheSize, unsigned int lobPrefetchSize,
                    int pingInterval, Local<Object> jsOradb )
{
  this->dpipool_         = dpipool;
  this->isValid_         = true;
  this->oracledb_        = oracledb;
  this->poolMax_         = poolMax;
  this->poolMin_         = poolMin;
  this->poolIncrement_   = poolIncrement;
  this->poolTimeout_     = poolTimeout;
  this->stmtCacheSize_   = stmtCacheSize;
  this->lobPrefetchSize_ = lobPrefetchSize;
  this->pingInterval_    = pingInterval;

  this->jsParent_.Reset ( jsOradb );
}

/*****************************************************************************/
/*
   DESCRIPTION
     Init function of the Pool class.
     Initiates and maps the functions and properties of Pool class.
*/
void Pool::Init(Handle<Object> target)
{
  Nan::HandleScope scope;

  Local<FunctionTemplate> temp = Nan::New<FunctionTemplate>(New);
  temp->InstanceTemplate()->SetInternalFieldCount(1);
  temp->SetClassName(Nan::New<v8::String>("Pool").ToLocalChecked());

  Nan::SetPrototypeMethod(temp, "terminate", Terminate);
  Nan::SetPrototypeMethod(temp, "getConnection", GetConnection);

  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("poolMax").ToLocalChecked(),
    Pool::GetPoolMax,
    Pool::SetPoolMax );
  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("poolMin").ToLocalChecked(),
    Pool::GetPoolMin,
    Pool::SetPoolMin );
  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("poolIncrement").ToLocalChecked(),
    Pool::GetPoolIncrement,
    Pool::SetPoolIncrement );
  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("poolTimeout").ToLocalChecked(),
    Pool::GetPoolTimeout,
    Pool::SetPoolTimeout );
  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("connectionsOpen").ToLocalChecked(),
    Pool::GetConnectionsOpen,
    Pool::SetConnectionsOpen );
  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("connectionsInUse").ToLocalChecked(),
    Pool::GetConnectionsInUse,
    Pool::SetConnectionsInUse );
  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("stmtCacheSize").ToLocalChecked(),
    Pool::GetStmtCacheSize,
    Pool::SetStmtCacheSize );
  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("poolPingInterval").ToLocalChecked(),
    Pool::GetPoolPingInterval,
    Pool::SetPoolPingInterval );


  poolTemplate_s.Reset( temp );
  Nan::Set(target, Nan::New<v8::String>("Pool").ToLocalChecked(),
           temp->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of pool is called from JS

*/
NAN_METHOD(Pool::New)
{
  Pool *njsPool = new Pool();
  njsPool->Wrap(info.Holder());

  info.GetReturnValue().Set(info.Holder());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Abstraction to all getter accessors of properties
*/
Local<Primitive> Pool::getPoolProperty(Pool* njsPool, unsigned int poolProperty)
{
  Nan::EscapableHandleScope scope;

  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION ( msg.c_str() );
    return scope.Escape ( Nan::Undefined() ) ;
  }
  else
  {
    return scope.Escape ( Nan::New<v8::Integer>(poolProperty) ) ;
  }
  return scope.Escape ( Nan::Undefined() ) ;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Abstraction to all getter accessors of properties
*/
Local<Primitive> Pool::getPoolProperty(Pool* njsPool, int poolProperty)
{
  Nan::EscapableHandleScope scope;

  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION ( msg.c_str() );
    return scope.Escape ( Nan::Undefined() ) ;
  }
  else
  {
    return scope.Escape ( Nan::New<v8::Integer>(poolProperty) ) ;
  }
  return scope.Escape ( Nan::Undefined() ) ;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMin Property
*/
NAN_GETTER(Pool::GetPoolMin)
{
  Pool* njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());
  NJS_CHECK_OBJECT_VALID2(njsPool, info);
  info.GetReturnValue().Set(getPoolProperty( njsPool, njsPool->poolMin_));
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolMax Property
*/
NAN_GETTER(Pool::GetPoolMax)
{
  Pool* njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());
  NJS_CHECK_OBJECT_VALID2(njsPool, info);
  info.GetReturnValue().Set(getPoolProperty( njsPool, njsPool->poolMax_));
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolIncrement Property
*/
NAN_GETTER(Pool::GetPoolIncrement)
{
  Pool* njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());
  NJS_CHECK_OBJECT_VALID2(njsPool, info);
  info.GetReturnValue().Set(getPoolProperty( njsPool, njsPool->poolIncrement_));
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of poolTimeout Property
*/
NAN_GETTER(Pool::GetPoolTimeout)
{
  Pool* njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());
  NJS_CHECK_OBJECT_VALID2(njsPool, info);
  info.GetReturnValue().Set(getPoolProperty( njsPool, njsPool->poolTimeout_));
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of connectionsOpen Property
*/
NAN_GETTER(Pool::GetConnectionsOpen)
{
  Pool* njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());
  NJS_CHECK_OBJECT_VALID2(njsPool, info);
  if(!njsPool->isValid_)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPool);
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }
  try
  {
    info.GetReturnValue().Set(njsPool->dpipool_->connectionsOpen());
    return;
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), NULL );
    NJS_SET_EXCEPTION ( e.what() );
  }
  info.GetReturnValue().SetUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of connectionsInUse Property
*/
NAN_GETTER(Pool::GetConnectionsInUse)
{
  Pool* njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());
  NJS_CHECK_OBJECT_VALID2(njsPool, info);
  if(!njsPool->isValid_)
  {
    string error = NJSMessages::getErrorMsg ( errInvalidPool );
    NJS_SET_EXCEPTION ( error.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }
  try
  {
    info.GetReturnValue().Set(njsPool->dpipool_->connectionsInUse());
    return;
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), NULL );
    NJS_SET_EXCEPTION ( e.what() );
  }
  info.GetReturnValue().SetUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of stmtCacheSize Property
*/
NAN_GETTER(Pool::GetStmtCacheSize)
{
  Pool* njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());
  NJS_CHECK_OBJECT_VALID2(njsPool, info);
  info.GetReturnValue().Set(getPoolProperty( njsPool, njsPool->stmtCacheSize_));
}


/*****************************************************************************/
/*
  DESCRIPTION
    GetAccessor of poolPingInterval property
*/
NAN_GETTER(Pool::GetPoolPingInterval)
{
  Pool *njsPool = Nan::ObjectWrap::Unwrap<Pool>( info.Holder() );
  NJS_CHECK_OBJECT_VALID2(njsPool, info ) ;
  info.GetReturnValue().Set(getPoolProperty (njsPool,
                                             njsPool->pingInterval_));
}


/*****************************************************************************/
/*
   DESCRIPTION
     Abstraction to all setter accessors of properties
*/
void Pool::setPoolProperty (Pool* njsPool, string property)
{
  Nan::HandleScope scope;

  NJS_CHECK_OBJECT_VALID(njsPool);

  string msg;
  if(!njsPool->isValid_)
    msg = NJSMessages::getErrorMsg(errInvalidPool);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, property.c_str());
  NJS_SET_EXCEPTION ( msg.c_str() );
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMin Property - throws error
*/
NAN_SETTER(Pool::SetPoolMin)
{
  setPoolProperty(Nan::ObjectWrap::Unwrap<Pool>(info.Holder()), "poolMin");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolMax Property - throws error
*/
NAN_SETTER(Pool::SetPoolMax)
{
  setPoolProperty(Nan::ObjectWrap::Unwrap<Pool>(info.Holder()), "poolMax");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolIncrement Property - throws error
*/
NAN_SETTER(Pool::SetPoolIncrement)
{
  setPoolProperty(Nan::ObjectWrap::Unwrap<Pool>(info.Holder()), "poolIncrement");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of poolTimeout Property - throws error
*/
NAN_SETTER(Pool::SetPoolTimeout)
{
  setPoolProperty(Nan::ObjectWrap::Unwrap<Pool>(info.Holder()), "poolTimeout");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of connectionsOpen Property - throws error
*/
NAN_SETTER(Pool::SetConnectionsOpen)
{
  setPoolProperty(Nan::ObjectWrap::Unwrap<Pool>(info.Holder()), "connectionsOpen");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of connectionsInUse Property - throws error
*/
NAN_SETTER(Pool::SetConnectionsInUse)
{
  setPoolProperty(Nan::ObjectWrap::Unwrap<Pool>(info.Holder()), "connectionsInUse");
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of stmtCacheSize Property - throws error
*/
NAN_SETTER(Pool::SetStmtCacheSize)
{
  setPoolProperty(Nan::ObjectWrap::Unwrap<Pool>(info.Holder()),
                  "stmtCacheSize");
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of poolPingInterval property.
*/
NAN_SETTER(Pool::SetPoolPingInterval)
{
  setPoolProperty ( Nan::ObjectWrap::Unwrap<Pool>(info.Holder()),
                    "poolPingInterval" );
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
  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, info );

  Pool *njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());

  poolBaton *connBaton = new poolBaton ( callback, info.Holder() );

  NJS_CHECK_OBJECT_VALID3 ( njsPool, connBaton->error, exitGetConnection);
  NJS_CHECK_NUMBER_OF_ARGS ( connBaton->error, info, 1, 1, exitGetConnection );

  if(!njsPool->isValid_)
  {
    connBaton->error = NJSMessages::getErrorMsg ( errInvalidPool );
    goto exitGetConnection;
  }
  connBaton->njspool   = njsPool;
  connBaton->connClass = njsPool->oracledb_->getConnectionClass ();
  connBaton->lobPrefetchSize =  njsPool->lobPrefetchSize_;

exitGetConnection:
  connBaton->req.data = (void *)connBaton;

  int status = uv_queue_work(uv_default_loop(), &connBaton->req,
               Async_GetConnection,
               (uv_after_work_cb)Async_AfterGetConnection);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete connBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work",
                                              "GetConnection" );
    NJS_SET_EXCEPTION ( error.c_str() );
  }

  info.GetReturnValue().SetUndefined();
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
                         getConnection ( connBaton-> connClass );
    connBaton->dpiconn->lobPrefetchSize(connBaton->lobPrefetchSize);
  }
  catch (dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), NULL );
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
  Nan::HandleScope scope;
  poolBaton *connBaton = (poolBaton*)req->data;

  Nan::TryCatch tc;
  Local<Value> argv[2];

  if(!(connBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(
                     Nan::New<v8::String>(connBaton->error).ToLocalChecked());
    argv[1] = Nan::Undefined();
  }
  else
  {
    argv[0] = Nan::Undefined();
    Local<Object> connection = Nan::NewInstance (
                                 Local<Function>::Cast (
                                   Nan::GetFunction (
                                     Nan::New<FunctionTemplate> (
   Connection::connectionTemplate_s )).ToLocalChecked () )).ToLocalChecked ();

    (Nan::ObjectWrap::Unwrap<Connection> (connection))->
                                 setConnection( connBaton->dpiconn,
                                                connBaton->njspool->oracledb_,
                                               Nan::New( connBaton->jsPool ) );
    argv[1] = connection;
  }

  Local<Function> callback = Nan::New<Function>(connBaton->cb);
  delete connBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(),
                      callback, 2, argv );

  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
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
  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, info );

  Pool *njsPool = Nan::ObjectWrap::Unwrap<Pool>(info.Holder());

  poolBaton *terminateBaton = new poolBaton ( callback, info.Holder() );

  NJS_CHECK_OBJECT_VALID3 (njsPool, terminateBaton->error, exitTerminate);
  NJS_CHECK_NUMBER_OF_ARGS ( terminateBaton->error, info, 1, 1, exitTerminate );

  if(!njsPool->isValid_)
  {
    terminateBaton->error = NJSMessages::getErrorMsg( errInvalidPool );
    goto exitTerminate;
  }
  terminateBaton->njspool      = njsPool;

exitTerminate:
  terminateBaton->req.data = (void *)terminateBaton;

  int status = uv_queue_work(uv_default_loop(), &terminateBaton->req,
               Async_Terminate,
               (uv_after_work_cb)Async_AfterTerminate);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete terminateBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "Terminate" );
    NJS_SET_EXCEPTION ( error.c_str() );
  }

  info.GetReturnValue().SetUndefined();
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
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), NULL );
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
  Nan::HandleScope scope;
  poolBaton *terminateBaton = (poolBaton*)req->data;

  Nan::TryCatch tc;

  Local<Value> argv[1];

  if(!(terminateBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(
                Nan::New<v8::String>(terminateBaton->error).ToLocalChecked());
  }
  else
  {
    argv[0] = Nan::Undefined();
    // pool is not valid after terminate succeeds.
    terminateBaton-> njspool-> isValid_ = false;
  }

  /*
   * When we release the iLob, we have to clear the reference of
   * its parent.
   */
  terminateBaton->njspool->jsParent_.Reset ();
  Local<Function> callback = Nan::New<Function>(terminateBaton->cb);
  delete terminateBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(),
                      callback, 1, argv );
  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
}


/* end of file njsPool.cpp */

