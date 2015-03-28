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
#include <string>

using namespace v8;
using namespace node;


class Pool: public ObjectWrap {
public:

   static void Init(Handle<Object> target);

   void setPool ( dpi::SPool *, Oracledb* oracledb, unsigned int poolMax,
                  unsigned int poolMin, unsigned int poolIncrement,
                  unsigned int poolTimeout, unsigned stmtCacheSize );

   // Define Pool Constructor
   static Persistent<FunctionTemplate> poolTemplate_s ;

private:

   static Handle<Value> New(const Arguments& args);

   // Get Connection Methods
   static Handle<Value> GetConnection(const Arguments& args);
   static void Async_GetConnection(uv_work_t* req);
   static void Async_AfterGetConnection(uv_work_t* req);

  // Terminate Methods
   static Handle<Value> Terminate(const Arguments& args);
   static void Async_Terminate(uv_work_t* req);
   static void Async_AfterTerminate(uv_work_t* req);

  // Define Getter Accessors to properties
  static Handle<Value> GetPoolMax (Local<String> property,
                                    const AccessorInfo& info);
  static Handle<Value> GetPoolMin (Local<String> property,
                                     const AccessorInfo& info);
  static Handle<Value> GetPoolIncrement (Local<String> property,
                                   const AccessorInfo& info);
  static Handle<Value> GetPoolTimeout (Local<String> property,
                                   const AccessorInfo& info);
  static Handle<Value> GetConnectionsOpen (Local<String> property,
                                   const AccessorInfo& info);
  static Handle<Value> GetConnectionsInUse (Local<String> property,
                                   const AccessorInfo& info);
  static Handle<Value> GetStmtCacheSize (Local<String> property,
                                   const AccessorInfo& info);
  static Handle<Value> getPoolProperty(Pool* njsPool, unsigned int poolProperty);

  // Define Setter Accessors to properties
  static void SetPoolMax (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);
  static void SetPoolMin (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);
  static void SetPoolIncrement (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);
  static void SetPoolTimeout (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);
  static void SetConnectionsOpen (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);
  static void SetConnectionsInUse (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);
  static void SetStmtCacheSize (Local<String> property,Local<Value> value,
                                 const AccessorInfo& info);

  static void setPoolProperty(const AccessorInfo& info, string property);

   Pool();
   ~Pool();

   dpi::SPool *dpipool_;
   bool isValid_;

   Oracledb* oracledb_;
   unsigned int poolMin_;
   unsigned int poolMax_;
   unsigned int poolIncrement_;
   unsigned int poolTimeout_;
   unsigned int stmtCacheSize_;
};

typedef struct poolBaton
{
  uv_work_t req;
  std::string error;
  std::string connClass;
  Persistent<Function> cb;
  dpi::Conn*  dpiconn;
  Pool*       njspool;

  poolBaton() :  error(""), connClass(""),
                 dpiconn(NULL), njspool(NULL)
  {}

  ~poolBaton()
   {
     cb.Dispose();
   }

}poolBaton;


#endif                                          /* __NJSPOOL_H__ */
