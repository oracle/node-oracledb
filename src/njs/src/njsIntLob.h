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
 *  njsILob.h
 *
 * DESCRIPTION
 *  ILob class
 *  ProtoILob class
 *
 ******************************************************************************/

#ifndef __NJSILOB_H__
#define __NJSILOB_H__

#include <node.h>
#include <string>
#include <vector>
#include "dpi.h"
#include "njsUtils.h"
#include "njsOracle.h"
#include "njsConnection.h"

using namespace v8;
using namespace node;
using namespace dpi;

class ILob;


/**
* Baton for Asynchronous ILob methods
**/

typedef struct LobBaton
{
  uv_work_t          req;
  std::string        error;
  dpi::Env          *dpienv;
  dpi::Conn         *dpiconn;

  ILob              *iLob;
  char              *writebuf;
  unsigned long long writelen;
  RefCounter         counter;
  
  Nan::Persistent<Function> cb;

  LobBaton( unsigned int& count, Local<Function> callback ):
    error(""), dpienv(NULL), dpiconn(NULL), iLob(NULL), writebuf(NULL),
    writelen(0), counter( count )
  { 
    cb.Reset( callback );
  }

  ~LobBaton ()
   { 
     cb.Reset();
   }
  
} LobBaton;
  



/******************************************************************************
 *
 * This is a helper class for ILob's contents to be mostly created in the
 * worker thread.  Basically, the ProtoILob class is needed to create the
 * attributes of the ILob object in the worker thread as there may be some
 * issues in creating the ILob object itself in the worker thread.  From
 * earlier experience, the worker thread could not create JavaScript handles
 * which is what an ILob object is.
 *
 * We want the ProtoILob to be created in the worker thread because it
 * allocates the OCI error handle and make other OCI calls such as getting the
 * Lob chunk size and Lob length.
 *
 * If we switch to one OCI error handle per thread using Thread Local Storage
 * (TLS), and make getting of chunkSize and Lob length asynchronous calls
 * (using the three step procedure where the OCI calls are done in the worker
 * thread), then the ProtoILob will not be necessary.
 *
 ******************************************************************************/

class ProtoILob
{
public:
  friend class ILob;

  ProtoILob(eBaton *executeBaton, Descriptor *lobLocator, unsigned short fetchType);

  ~ProtoILob();
  
private:
  void cleanup();

  Descriptor        *lobLocator_;
  unsigned short     fetchType_;
  DpiHandle         *errh_;
  unsigned int       chunkSize_;
  unsigned long long length_;
};

class ILob : public Nan::ObjectWrap
{
 public:
  void setILob(eBaton *executeBaton,  ProtoILob *protoILob);
  
                                // Define ILob Constructor
  static Nan::Persistent<FunctionTemplate> iLobTemplate_s;
  
  static void Init(Handle<Object> target);


 private:
  ILob();
  
  ~ILob();

  void cleanup();

  static NAN_METHOD(New);

  static NAN_METHOD(Release);

  static void lobPropertyException(ILob *iLob, NJSErrorType err,
                                   string property);

  
                                // Getters for properties
  static NAN_GETTER(GetChunkSize);
  static NAN_GETTER(GetLength);
  static NAN_GETTER(GetPieceSize);
  static NAN_GETTER(GetOffset);
  static NAN_GETTER(GetType);

  
                                // Setters for properties
  static NAN_SETTER(SetChunkSize);
  static NAN_SETTER(SetLength);
  static NAN_SETTER(SetPieceSize);
  static NAN_SETTER(SetOffset);
  static NAN_SETTER(SetType);

  
                                // Read Method on ILob class
  static NAN_METHOD(Read);
  static void Async_Read (uv_work_t *req);
  static void Async_AfterRead (uv_work_t *req);

                                // Write Method on ILob class
  static NAN_METHOD(Write);
  static void Async_Write (uv_work_t *req);
  static void Async_AfterWrite (uv_work_t *req);

  Descriptor    *lobLocator_;
  unsigned short fetchType_;
  
  Connection    *njsconn_;
  dpi::Conn     *dpiconn_;
  DpiHandle     *svch_;
  DpiHandle     *errh_;
  bool           isValid_;
  State          state_;

  char              *buf_;
  unsigned int       bufSize_;
  unsigned int       chunkSize_;
  unsigned long long length_;
  unsigned long long offset_;
  unsigned long      amountRead_;
  unsigned long long amountWritten_;
  unsigned int       type_;
};

#endif                       /** __NJSILOB_H__ **/
