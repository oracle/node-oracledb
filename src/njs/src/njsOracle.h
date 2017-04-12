/* Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved. */

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


/* Keep the version in sync with package.json */
#define NJS_NODE_ORACLEDB_MAJOR       1
#define NJS_NODE_ORACLEDB_MINOR       13
#define NJS_NODE_ORACLEDB_PATCH       1

/* Used for Oracledb.version */
#define NJS_NODE_ORACLEDB_VERSION   ( (NJS_NODE_ORACLEDB_MAJOR * 10000) + \
                                      (NJS_NODE_ORACLEDB_MINOR * 100) +   \
                                      (NJS_NODE_ORACLEDB_PATCH) )


class Oracledb: public Nan::ObjectWrap
{
 public:

  Nan::Persistent<Object> jsOracledb;

   // Oracledb class
   static void Init(Handle<Object> target);

   dpi::Env*          getDpiEnv () const           { return dpienv_; }
   bool               getAutoCommit () const       { return autoCommit_; }
   unsigned int       getOutFormat () const        { return outFormat_; }
   unsigned int       getMaxRows ()  const         { return maxRows_; }
   unsigned int       getStmtCacheSize ()  const   { return stmtCacheSize_; }
   unsigned int       getPoolMin () const          { return poolMin_; }
   unsigned int       getPoolMax () const          { return poolMax_; }
   unsigned int       getPoolIncrement () const    { return poolIncrement_; }
   unsigned int       getPoolTimeout () const      { return poolTimeout_; }
   unsigned int       getPrefetchRows () const     { return prefetchRows_; }
   const std::string& getConnectionClass () const  { return connClass_; }
   bool               getExtendedMetaData () const { return extendedMetaData_;}
   const DataType*    getFetchAsStringTypes () const;
   unsigned int       getFetchAsStringTypesCount () const
   {  return fetchAsStringTypesCount_ ;   }
   const DataType*    getFetchAsBufferTypes () const ;
   unsigned int       getFetchAsBufferTypesCount () const
   {  return fetchAsBufferTypesCount_ ;  }

private:
   const string driverName() const;

   // Define Oracledb Constructor
   static Nan::Persistent<FunctionTemplate> oracledbTemplate_s;

   static NAN_METHOD(New);

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
   static NAN_GETTER(GetAutoCommit);
   static NAN_GETTER(GetExtendedMetaData);
   static NAN_GETTER(GetMaxRows);
   static NAN_GETTER(GetOutFormat);
   static NAN_GETTER(GetVersion);
   static NAN_GETTER(GetConnectionClass);
   static NAN_GETTER(GetExternalAuth);
   static NAN_GETTER(GetPrefetchRows);
   static NAN_GETTER(GetFetchAsString);
   static NAN_GETTER(GetFetchAsBuffer);
   static NAN_GETTER(GetLobPrefetchSize);
   static NAN_GETTER(GetOracleClientVersion);
   static NAN_GETTER(GetPoolPingInterval);

   // Define Setter Accessors to Properties
   static NAN_SETTER(SetPoolMin);
   static NAN_SETTER(SetPoolMax);
   static NAN_SETTER(SetPoolIncrement);
   static NAN_SETTER(SetPoolTimeout);
   static NAN_SETTER(SetStmtCacheSize);
   static NAN_SETTER(SetAutoCommit);
   static NAN_SETTER(SetExtendedMetaData);
   static NAN_SETTER(SetMaxRows);
   static NAN_SETTER(SetOutFormat);
   static NAN_SETTER(SetVersion);
   static NAN_SETTER(SetConnectionClass);
   static NAN_SETTER(SetExternalAuth);
   static NAN_SETTER(SetPrefetchRows);
   static NAN_SETTER(SetFetchAsString);
   static NAN_SETTER(SetFetchAsBuffer);
   static NAN_SETTER(SetLobPrefetchSize);
   static NAN_SETTER(SetOracleClientVersion);
   static NAN_SETTER(SetPoolPingInterval);

   Oracledb();
   ~Oracledb();

   dpi::Env* dpienv_;
   unsigned int outFormat_;
   bool         autoCommit_;
   bool         extendedMetaData_;
   unsigned int maxRows_;

   unsigned int stmtCacheSize_;
   unsigned int prefetchRows_;

   unsigned int poolMin_;
   unsigned int poolMax_;
   unsigned int poolIncrement_;
   unsigned int poolTimeout_;

   std::string  connClass_;
   bool         externalAuth_;
   DataType     *fetchAsStringTypes_;
   unsigned int fetchAsStringTypesCount_;
   DataType     *fetchAsBufferTypes_;
   unsigned int fetchAsBufferTypesCount_;
   unsigned int lobPrefetchSize_;
   unsigned int oraClientVer_;
   int          poolPingInterval_;
};

/**
* Baton for Asynchronous Get Connection Call
**/
class Pool;

typedef struct connectionBaton
{
  uv_work_t                  req;
  std::string                user;
  std::string                pswrd;
  std::string                connStr;
  std::string                connClass;
  bool                       externalAuth;
  std::string error;

  int                        poolMax;
  int                        poolMin;
  int                        poolIncrement;
  int                        poolTimeout;
  int                        stmtCacheSize;
  unsigned int               lobPrefetchSize;

  unsigned int               maxRows;
  unsigned int               outFormat;
  int                        poolPingInterval;
  Nan::Persistent<Function>  cb;
  dpi::Env*                  dpienv;
  dpi::Conn*                 dpiconn;
  dpi::SPool*                dpipool;
  Nan::Persistent<Object>    jsOradb;

  Oracledb *oracledb;

  connectionBaton( Local<Function> callback, Local<Object> jsOradbObj ) :
                      user(""), pswrd(""), connStr(""), connClass(""),
                      externalAuth(false), error(""),
                      poolMax(0), poolMin(0), poolIncrement(0),
                      poolTimeout(0), stmtCacheSize(0), maxRows(0),
                      outFormat(0), poolPingInterval(DPI_NO_PING_INTERVAL),
                      dpienv(NULL), dpiconn(NULL), dpipool(NULL)
  {
    cb.Reset( callback );
    jsOradb.Reset ( jsOradbObj );
  }

  ~connectionBaton()
   {
     cb.Reset();
     jsOradb.Reset ();
   }

}connectionBaton;



#endif                                               /* __NJSORACLE_H__ */


