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
 *   njsOracle.h
 *
 * DESCRIPTION
 *   Oracledb class
 *
 *****************************************************************************/

#ifndef __NJSORACLE_H__
#define __NJSORACLE_H__

#include <v8.h>
#include <node.h>
#include "nan.h"

#include <string>
#include <cstring>
#include <stdlib.h>
#include <stdio.h>

#include "dpi.h"
#include "njsUtils.h"

using namespace node;
using namespace v8; 


/*0.3.1.  Keep the version in sync with package.json */
/* Formula: 10000 x majorversion + 100 * minorversion + patchrelease number */
#define NJS_ORACLE_VERSION 301


class Oracledb: public ObjectWrap 
{
 public:

   // Oracledb class
   static void Init(Handle<Object> target);
   
   dpi::Env* getDpiEnv () const { return dpienv_; }
   bool     getIsAutoCommit () const  { return isAutoCommit_; }   
   unsigned int getOutFormat () const { return outFormat_; }   
   unsigned int getMaxRows ()  const  { return maxRows_; }   
   unsigned int getStmtCacheSize ()  const  { return stmtCacheSize_; }   
   unsigned int getPoolMin () const  { return poolMin_; }   
   unsigned int getPoolMax () const  { return poolMax_; }   
   unsigned int getPoolIncrement () const  { return poolIncrement_; }   
   unsigned int getPoolTimeout () const  { return poolTimeout_; }
   const std::string& getConnectionClass () const { return connClass_; }
   
   
 
private:
   // Define Oracledb Constructor
   static Persistent<FunctionTemplate> oracledbTemplate_s;

   static v8::Handle<v8::Value> New(_NAN_METHOD_ARGS);

   // Get Connection Methods
   static NAN_METHOD(GetConnection);
   static void Async_GetConnection(uv_work_t *req);
   static void Async_AfterGetConnection(uv_work_t  *req);

   // Create Pool Methods
   static NAN_METHOD(CreatePool);
   static void Async_CreatePool (uv_work_t *req );
   static void Async_AfterCreatePool (uv_work_t *req);
   
   // Define Getter Accessors to Properties
   static NAN_GETTER(GetPoolMin);
   static NAN_GETTER(GetPoolMax);
   static NAN_GETTER(GetPoolIncrement);
   static NAN_GETTER(GetPoolTimeout);
   static NAN_GETTER(GetStmtCacheSize);
   static NAN_GETTER(GetIsAutoCommit);
   static NAN_GETTER(GetMaxRows);
   static NAN_GETTER(GetOutFormat);
   static NAN_GETTER(GetVersion);
   static NAN_GETTER(GetConnectionClass);
   
   // Define Setter Accessors to Properties
   static NAN_SETTER(SetPoolMin);
   static NAN_SETTER(SetPoolMax);
   static NAN_SETTER(SetPoolIncrement);
   static NAN_SETTER(SetPoolTimeout);
   static NAN_SETTER(SetStmtCacheSize);
   static NAN_SETTER(SetIsAutoCommit);
   static NAN_SETTER(SetMaxRows);
   static NAN_SETTER(SetOutFormat);
   static NAN_SETTER(SetVersion);
   static NAN_SETTER(SetConnectionClass);
   
   
   Oracledb();
   ~Oracledb();
   
   dpi::Env* dpienv_;
   unsigned int outFormat_;
   bool         isAutoCommit_;
   unsigned int maxRows_;
   
   unsigned int stmtCacheSize_;
   
   unsigned int poolMin_;
   unsigned int poolMax_;
   unsigned int poolIncrement_;
   unsigned int poolTimeout_;

   std::string  connClass_;
};

/**
* Baton for Asynchronous Get Connection Call
**/
class Pool;

typedef struct connectionBaton 
{
  uv_work_t req;
  std::string user;
  std::string pswrd;
  std::string connStr;
  std::string connClass;  
  std::string error;
 
  int poolMax;
  int poolMin;
  int poolIncrement;
  int poolTimeout;
  int stmtCacheSize;
  
  unsigned int maxRows;
  unsigned int outFormat;
  Persistent<Function> cb;
  dpi::Env* dpienv;
  dpi::Conn* dpiconn;
  dpi::SPool* dpipool;

  Oracledb *oracledb;

  connectionBaton() : user(""), pswrd(""), connStr(""), connClass(""),
                      error("" ),
                      poolMax(0), poolMin(0), poolIncrement(0),
                      poolTimeout(0), stmtCacheSize(0), maxRows(0),
                      outFormat(0), dpienv(NULL), 
                      dpiconn(NULL), dpipool(NULL)
  {}

  ~connectionBaton()
   {
     NanDisposePersistent(cb);
   }

}connectionBaton;



#endif                                               /* __NJSORACLE_H__ */


