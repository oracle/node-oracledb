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
 *   njsResultSet.h
 *
 * DESCRIPTION
 *   ResultSet class
 *
 *****************************************************************************/

#ifndef __NJSRESULTSET_H__
#define __NJSRESULTSET_H__

#include "dpi.h"
#include <node.h>
#include "nan.h"
#include <v8.h>
#include <string>
#include "njsUtils.h"
#include "njsConnection.h"

using namespace v8;
using namespace node;

class ResultSet;

/**
* Baton for Asynchronous ResultSet methods
**/
typedef struct rsBaton
{
  uv_work_t                 req;
  std::string               error;
  bool                      fetchMultiple; // set for getRows() method.
  bool                      errOnActiveOrInvalid;
                                           // set if going to exit upon already
                                           // active or invalid
  eBaton                    *ebaton;
  unsigned int              numRows;       // rows to be fetched.
  ResultSet*                njsRS;         // resultset object.
  Nan::Persistent<Object>   jsRS;

  rsBaton( unsigned int& count, Local<Function> callback,
           Local<Object> jsRSObj, Local<Object> jsConn )
    :  error(""), fetchMultiple(false), errOnActiveOrInvalid(false),
       numRows(0), njsRS(NULL)
  {
    jsRS.Reset ( jsRSObj );
    ebaton = new eBaton( count, callback, jsConn );
  }

  ~rsBaton()
   {
     jsRS.Reset ();
     if(ebaton)
     {
       delete ebaton;
     }
   }

}rsBaton;

//ResultSet Class
class ResultSet: public Nan::ObjectWrap {
public:
   ResultSet(){}
   ~ResultSet(){}

   static void Init(Handle<Object> target);

   void setResultSet ( dpi::Stmt          *dpistmt, eBaton *executebaton,
                       const unsigned int numCols,
                       const MetaInfo     *mInfo );

   // Define ResultSet Constructor
   static Nan::Persistent<FunctionTemplate> resultSetTemplate_s ;

private:

   static NAN_METHOD(New);

   // Get Rows Methods
   static NAN_METHOD(GetRow);
   static NAN_METHOD(GetRows);
   static void Async_GetRows(uv_work_t *req);
   static void Async_AfterGetRows(uv_work_t  *req);
   static void GetRowsCommon(rsBaton*);

   // Close Methods
   static NAN_METHOD(Close);
   static void Async_Close(uv_work_t *req);
   static void Async_AfterClose(uv_work_t  *req);

  // Define Getter Accessors to properties
  static NAN_GETTER(GetMetaData);

  // Define Setter Accessors to properties
  static NAN_SETTER(SetMetaData);

  void clearFetchBuffer( unsigned int numRows );


  dpi::Stmt                 *dpistmt_;
  dpi::Env                  *dpienv_;
  Connection                *njsconn_;
  State                     state_;
  bool                      rsEmpty_;
  Define                    *defineBuffers_;
  std::vector<ExtDefine*>   extDefines_;
  unsigned int              numCols_;
  unsigned int              fetchRowCount_;
  unsigned int              outFormat_;
  bool                      extendedMetaData_;
  Nan::Persistent<Object>   jsParent_;
  MetaInfo                  *mInfo_;
};



#endif                                          /* __NJSRESULTSET_H__ */
