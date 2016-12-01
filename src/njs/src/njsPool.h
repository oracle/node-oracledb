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
 *   njsPool.h
 *
 * DESCRIPTION
 *   Pool class
 *
 *****************************************************************************/

#ifndef __NJSPOOL_H__
#define __NJSPOOL_H__

#include "dpi.h"
#include <node.h>
#include "nan.h"
#include <string>

using namespace v8;
using namespace node;


class Pool: public Nan::ObjectWrap {
public:

   static void Init(Handle<Object> target);

   void setPool ( dpi::SPool *, Oracledb* oracledb, unsigned int poolMax,
                  unsigned int poolMin, unsigned int poolIncrement,
                  unsigned int poolTimeout, unsigned stmtCacheSize,
                  unsigned int lobPrefetchSize, int pingInterval,
                  Local<Object> jsOraDB );

   // Define Pool Constructor
   static Nan::Persistent<FunctionTemplate> poolTemplate_s ;

private:

   static NAN_METHOD(New);

   // Get Connection Methods
   static NAN_METHOD(GetConnection);
   static void Async_GetConnection(uv_work_t* req);
   static void Async_AfterGetConnection(uv_work_t* req);

  // Terminate Methods
   static NAN_METHOD(Terminate);
   static void Async_Terminate(uv_work_t* req);
   static void Async_AfterTerminate(uv_work_t* req);

  // Define Getter Accessors to properties
  static NAN_GETTER(GetPoolMax);
  static NAN_GETTER(GetPoolMin);
  static NAN_GETTER(GetPoolIncrement);
  static NAN_GETTER(GetPoolTimeout);
  static NAN_GETTER(GetConnectionsOpen);
  static NAN_GETTER(GetConnectionsInUse);
  static NAN_GETTER(GetStmtCacheSize);
  static NAN_GETTER(GetPoolPingInterval);

  static Local<Primitive> getPoolProperty(Pool* njsPool,
                                          unsigned int poolProperty);
  static Local<Primitive> getPoolProperty(Pool* njsPool, int poolProperty);


  // Define Setter Accessors to properties
  static NAN_SETTER(SetPoolMax);
  static NAN_SETTER(SetPoolMin);
  static NAN_SETTER(SetPoolIncrement);
  static NAN_SETTER(SetPoolTimeout);
  static NAN_SETTER(SetConnectionsOpen);
  static NAN_SETTER(SetConnectionsInUse);
  static NAN_SETTER(SetStmtCacheSize);
  static NAN_SETTER(SetPoolPingInterval);

  static void setPoolProperty(Pool* njsPool, string property);

   Pool();
   ~Pool();

   dpi::SPool *dpipool_;
   bool isValid_;

   Oracledb*                 oracledb_;
   unsigned int              poolMin_;
   unsigned int              poolMax_;
   unsigned int              poolIncrement_;
   unsigned int              poolTimeout_;
   unsigned int              stmtCacheSize_;
   unsigned int              lobPrefetchSize_;
   int                       pingInterval_;
   Nan::Persistent<Object>   jsParent_;
};

typedef struct poolBaton
{
  uv_work_t                  req;
  std::string                error;
  std::string                connClass;
  Nan::Persistent<Function>  cb;
  dpi::Conn*                 dpiconn;
  Pool*                      njspool;
  unsigned int               lobPrefetchSize;
  Nan::Persistent<Object>    jsPool;

  poolBaton( Local<Function> callback, Local<Object> poolObj ) :
                 error(""), connClass(""),
                 dpiconn(NULL), njspool(NULL), lobPrefetchSize(0)
  {
    cb.Reset( callback );
    jsPool.Reset ( poolObj );
  }

  ~poolBaton()
   {
     cb.Reset();
     jsPool.Reset ();
   }

}poolBaton;


#endif                                          /* __NJSPOOL_H__ */
