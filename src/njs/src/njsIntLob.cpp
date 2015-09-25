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
 *   njsIntLob.cpp
 *
 * DESCRIPTION
 *   ILob class implementation.
 *
 *****************************************************************************/


#include <stdlib.h>
#include <iostream>
using namespace std;


#ifndef NODE_BUFFER_H_
# include <node_buffer.h>
#endif

#ifndef DPIENV_ORACLE
# include <dpiEnv.h>
#endif


#include "njsIntLob.h"


                                        //peristent ILob class handle
Persistent<FunctionTemplate> ILob::iLobTemplate_s;



/*****************************************************************************/
/*
  DESCRIPTION
    Constructor for the ILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES

 */

ILob::ILob():
  lobLocator_(NULL), njsconn_(NULL), dpiconn_(NULL), svch_(NULL), errh_(NULL),
  isValid_(false), state_(INACTIVE), buf_(NULL), bufSize_(0), chunkSize_(0),
  length_(0), offset_(1), amountRead_(0)
{

}



/*****************************************************************************/
/*
  DESCRIPTION
    Destructor for the ILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES

 */

ILob::~ILob()
{
  cleanup();
}



/*****************************************************************************/
/*
  DESCRIPTION
    Cleanup for the ILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES
    This method is called from the destructor and the release() method.
    Therefore, it should not throw any exceptions.
 */

void ILob::cleanup()
{
  if (buf_)
  {
    delete [] buf_;
    buf_ = NULL;
  }
  
  try
  {
    if (errh_)
    {
      Env::freeHandle(errh_, ErrorHandleType);
      errh_ = NULL;
    }
  }
  
  catch (...)
  {
    // don't do anything
  }
  
  try
  {
    if (lobLocator_)
    {
      Env::freeDescriptor(lobLocator_, LobDescriptorType);
      lobLocator_ = NULL;
    }
  }
  
  catch (...)
  {
    // don't do anything
  }
}



/*****************************************************************************/
/*
  DESCRIPTION
    Initialize ILob attributes after forming it.

  PARAMETERS
    executeBaton - execute baton
    lobLocator   - Lob locator

  RETURNS
    nothing

  NOTES
    The fields of protoILob are set to NULL as they are transferred to ILob.
    Any exception would cause the cleanup to free the transferred handles.

    Any handles that are not transferred are cleaned up when the protoILob is
    finally deleted.
*/

void ILob::setILob(eBaton *executeBaton, ProtoILob *protoILob)
{
      //  The try/catch block is necessary as we are making a DPI call to get
      //  the svch_ and allocating the buf_.  Both of these can throw
      //  exceptions.
  try
  {
    // Lob details
    lobLocator_            = protoILob->lobLocator_;
    protoILob->lobLocator_ = NULL;
    fetchType_             = protoILob->fetchType_;
  
    // connection
    njsconn_               = executeBaton->njsconn;
    dpiconn_               = executeBaton->dpiconn;
    svch_                  = executeBaton->dpiconn->getSvch();

    // error
    errh_                  = protoILob->errh_;
    protoILob->errh_       = NULL;

    // LOB meta data
    length_                = protoILob->length_;
    chunkSize_             = protoILob->chunkSize_;
    bufSize_               = chunkSize_;

    /*
     * we can move the allocation of buf_ to the worker thread also by
     * allocating the buf_ in ProtoILob.
     */
    if (fetchType_ == DpiClob)
    {
      // accommodate multi-byte charsets
      buf_ = new char[bufSize_ * dpiconn_->getByteExpansionRatio()];
    }
    else
    {
      buf_ = new char[bufSize_];
    }

    // Now the ILob object is valid
    isValid_ = true;
  }

  catch (dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), executeBaton->dpiconn );
    executeBaton->error = std::string(e.what());
    cleanup();
  }
}



/*****************************************************************************/
/*
  DESCRIPTION
    Init function of the ILob class.
    Initializes and maps the functions and properties of ILob class.

  PARAMETERS
    target - target environment

  RETURNS
    nothing

  NOTES
    
*/

void ILob::Init(Handle<Object> target)
{
  NanScope();

  Local<FunctionTemplate> tpl = NanNew<FunctionTemplate>(New);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  tpl->SetClassName(NanNew<v8::String>("ILob"));

  NODE_SET_PROTOTYPE_METHOD(tpl, "release", Release);

  NODE_SET_PROTOTYPE_METHOD(tpl, "read", Read);

  NODE_SET_PROTOTYPE_METHOD(tpl, "write", Write);

  tpl->InstanceTemplate()->SetAccessor(NanNew<v8::String>("chunkSize"),
                                       ILob::GetChunkSize,
                                       ILob::SetChunkSize);

  tpl->InstanceTemplate()->SetAccessor(NanNew<v8::String>("length"),
                                       ILob::GetLength,
                                       ILob::SetLength);

  tpl->InstanceTemplate()->SetAccessor(NanNew<v8::String>("pieceSize"),
                                       ILob::GetPieceSize,
                                       ILob::SetPieceSize);

  tpl->InstanceTemplate()->SetAccessor(NanNew<v8::String>("offset"),
                                       ILob::GetOffset,
                                       ILob::SetOffset);

  NanAssignPersistent(iLobTemplate_s, tpl);
  target->Set(NanNew<v8::String>("ILob"), tpl->GetFunction());
}



/*****************************************************************************/
/*
  DESCRIPTION
    Invoked when a NewInstance() of ILob is called.

  PARAMETERS
    args - ILob template

  RETURNS
    ILob object

  NOTES
    
*/

NAN_METHOD(ILob::New)
{
  NanScope();

  ILob *iLob = new ILob();

  iLob->Wrap(args.This());

  NanReturnValue(args.This());
}



/*****************************************************************************/
/*
  DESCRIPTION
    Release method on ILob class.

  PARAMETERS
    args - ILob object

  RETURNS
    undefined

  NOTES
    The cleanup() called by Release() only frees OCI error handle and Lob
    locator.  These calls acquire mutex on OCI environment handle very briefly.
*/

NAN_METHOD(ILob::Release)
{ 
  NanScope();

  ILob *iLob = ObjectWrap::Unwrap<ILob>(args.This());
  string msg;

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION( msg.c_str(), (int) msg.length() );
    NanReturnUndefined ();
  }

  iLob->cleanup();

  NanReturnUndefined();
}



/*****************************************************************************/
/*
  DESCRIPTION
    Exception on accessing Lob properties

  PARAMETERS
    iLob     - ILob object
    err      - error
    property - property on which the error occurred


  RETURNS
    Throws an exception

  NOTES
    
*/

void ILob::lobPropertyException(ILob *iLob,
                                NJSErrorType err,
                                string property)
{
  NanScope();
  string msg;

  if (iLob->isValid_)
    msg = NJSMessages::getErrorMsg(err, property.c_str());
  else
    msg = NJSMessages::getErrorMsg(errInvalidLob);

  NJS_SET_EXCEPTION(msg.c_str(), (int)msg.length());
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of chunkSize property

  PARAMETERS
    args - ILob object

  RETURNS
    chunk size

  NOTES
    
*/

NAN_PROPERTY_GETTER(ILob::GetChunkSize)
{  
  NanScope();

  ILob *iLob = ObjectWrap::Unwrap<ILob>(args.Holder());
  string msg;

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION( msg.c_str(), (int) msg.length() );
    NanReturnUndefined ();
  }

  try
  {
    Local<Integer> value = NanNew<v8::Integer>(iLob->chunkSize_);
    
    NanReturnValue(value);
  }

  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    NanReturnUndefined();
  }

  NanReturnUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of chunkSize property - throws error as chunk size is a
    read-only property.

  PARAMETERS
    args - ILob object

  RETURNS
    throws error

  NOTES
    
*/

NAN_SETTER(ILob::SetChunkSize)
{
  lobPropertyException(ObjectWrap::Unwrap<ILob>(args.Holder()), errReadOnly,
                       "chunkSize");
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of length property

  PARAMETERS
    args - ILob object

  RETURNS
    LOB length

  NOTES
    This method returns the Lob length originally fetched when the ProtoILob
    object was created.
*/

NAN_PROPERTY_GETTER(ILob::GetLength)
{  
  NanScope();

  ILob *iLob = ObjectWrap::Unwrap<ILob>(args.Holder());
  string msg;

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION( msg.c_str(), (int) msg.length() );
    NanReturnUndefined ();
  }

  try
  {
    Local<Number> value = NanNew<v8::Number>((double)iLob->length_);
    
    NanReturnValue(value);
  }

  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    NanReturnUndefined();
  }

  NanReturnUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of length property - throws error as lenght is a read-only
    property.

  PARAMETERS
    args - ILob object

  RETURNS
    throws error

  NOTES
    
*/

NAN_SETTER(ILob::SetLength)
{
  lobPropertyException(ObjectWrap::Unwrap<ILob>(args.Holder()), errReadOnly,
                       "length");
}



/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of pieceSize property

  PARAMETERS
    args - ILob object

  RETURNS
    the number of bytes that will be read for each read().

  NOTES
    
*/

NAN_PROPERTY_GETTER(ILob::GetPieceSize)
{  
  NanScope();

  ILob *iLob = ObjectWrap::Unwrap<ILob>(args.Holder());
  string msg;

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION( msg.c_str(), (int) msg.length() );
    NanReturnUndefined ();
  }

  try
  {
    Local<Integer> value = NanNew<v8::Integer>(iLob->bufSize_);
    NanReturnValue(value);
  }

  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    NanReturnUndefined();
  }

  NanReturnUndefined();
}


/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of pieceSize property

  PARAMETERS
    args - ILob object and pieceSize property

  RETURNS
    nothing

  NOTES
    
*/

NAN_SETTER(ILob::SetPieceSize)
{
  NanScope();

  ILob *iLob = ObjectWrap::Unwrap<ILob>(args.Holder());
  string msg;

  NJS_SET_PROP_UINT(iLob->bufSize_, value, "pieceSize");

  if (iLob->state_ == ACTIVE)
  {
    msg = NJSMessages::getErrorMsg(errBusyLob);

    NJS_SET_EXCEPTION(msg.c_str(), (int)msg.length());
    return;
  }

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION( msg.c_str(), (int) msg.length() );
    return;
  }

  if (iLob->buf_)
    delete [] iLob->buf_;
  
  if (iLob->fetchType_ == DpiClob)
  {
    // accommodate multi-byte charsets
    iLob->buf_ = new char[iLob->bufSize_ *
                           iLob->dpiconn_->getByteExpansionRatio()];
  }
  else
    iLob->buf_ = new char[iLob->bufSize_];
}



/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of offset property

  PARAMETERS
    args - ILob object

  RETURNS
    the current offset where read or write will happen.

  NOTES
    
*/

NAN_PROPERTY_GETTER(ILob::GetOffset)
{  
  NanScope();

  ILob *iLob = ObjectWrap::Unwrap<ILob>(args.Holder());
  string msg;

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION( msg.c_str(), (int) msg.length() );
    NanReturnUndefined ();
  }

  try
  {
    Local<Number> value = NanNew<v8::Number>((unsigned long)iLob->offset_);
    NanReturnValue(value);
  }

  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION(e.what(), strlen(e.what()));
    NanReturnUndefined();
  }

  NanReturnUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
     Set Accessor of offset property

  PARAMETERS
    args - ILob object and offset property

  RETURNS
    nothing

  NOTES
    
*/

NAN_SETTER(ILob::SetOffset)
{
  NanScope();

  ILob  *iLob = ObjectWrap::Unwrap<ILob>(args.Holder());
  double offset = 0.0;
  string msg;

  NJS_SET_PROP_UINT(offset, value, "offset");

  if (offset < 1)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPropertyValue, "offset");

    NJS_SET_EXCEPTION(msg.c_str(), (int)msg.length());
  }
  
  if (iLob->state_ == ACTIVE)
  {
    msg = NJSMessages::getErrorMsg(errBusyLob);

    NJS_SET_EXCEPTION(msg.c_str(), (int)msg.length());
    return;
  }

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION( msg.c_str(), (int) msg.length() );
    return;
  }

  iLob->offset_ = (unsigned long long) offset;
}



/*****************************************************************************/
/*
  DESCRIPTION
    Read method on ILob class.

  PARAMETERS
    args - ILob object and callback

  RETURNS
    undefined

  NOTES

*/

NAN_METHOD(ILob::Read)
{ 
  NanScope();

  Local<Function>  callback;
  ILob            *iLob;
  LobBaton        *lobBaton = new LobBaton;

  NJS_GET_CALLBACK(callback, args);

  NanAssignPersistent(lobBaton->cb, callback );

  NJS_CHECK_NUMBER_OF_ARGS (lobBaton->error, args, 1, 1, exitRead);
  iLob = ObjectWrap::Unwrap<ILob>(args.This());

  if(!iLob->isValid_)
  {
    lobBaton->error = NJSMessages::getErrorMsg(errInvalidLob);
    goto exitRead;
  }

  lobBaton->iLob = iLob;

   // mark Lob as active before leaving main thread, but not in
   // case of an error.
  iLob->state_ = ACTIVE;       

  if( !iLob->njsconn_->isValid() )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitRead;
  }

 exitRead:

  lobBaton->req.data  = (void*)lobBaton;
  uv_queue_work(uv_default_loop(), &lobBaton->req,
                Async_Read, (uv_after_work_cb)Async_AfterRead);

  NanReturnUndefined();
}



/*****************************************************************************/
/*
  DESCRIPTION
    Worker function of Read method

  PARAMETERS
    req - UV queue work block

  RETURNS
    nothing

  NOTES:
    Peform async read.
*/

void ILob::Async_Read(uv_work_t *req)
{
  LobBaton *lobBaton = (LobBaton *)req->data;
  ILob *iLob         = lobBaton->iLob;

  if(!(lobBaton->error).empty())
    goto exitAsyncRead;

  try
  {
    unsigned long long byteAmount = (unsigned long int)iLob->bufSize_;
    unsigned long long charAmount = 0; 
    
    // Clobs read by characters
    if (iLob->fetchType_ == DpiClob)
    {
      charAmount = iLob->bufSize_; 
      byteAmount = 0;
    }
    Lob::read((DpiHandle *)iLob->svch_, (DpiHandle *)iLob->errh_,
              (Descriptor *)iLob->lobLocator_, byteAmount, charAmount,
              iLob->offset_, (void *)iLob->buf_);

    // amountRead_ used in Async_AfterRead to construct string
    iLob->amountRead_ = (unsigned long)byteAmount;
    if (iLob->fetchType_ == DpiClob)
      iLob->offset_ += charAmount; // offset for CLOBS is character based
    else
      iLob->offset_ += byteAmount;
  }
  catch (dpi::Exception& e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    lobBaton->error = std::string(e.what());
  }

 exitAsyncRead:
  ;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Read method

   PARAMETERS
     req - UV queue work block

   RETURNS
     nothing

   NOTES
     Handle for string is formed and handed over to JS
*/

void ILob::Async_AfterRead(uv_work_t *req)
{ 
  NanScope();

  LobBaton     *lobBaton = (LobBaton *)req->data;
  ILob         *iLob = lobBaton->iLob;
  v8::TryCatch  tc;
  Handle<Value> argv[2];

  iLob->state_ = INACTIVE;     // mark Lob as inactive as back in main thread

  if(!(lobBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(NanNew<v8::String>((lobBaton->error).c_str()));
    argv[1] = NanUndefined();
  }
  else
  {
    argv[0] = NanUndefined();

    if (iLob->amountRead_)
    {
      if (iLob->fetchType_ == DpiClob)
      {
        Local<Value> str = NanNew<v8::String>((char *)iLob->buf_, 
                                              iLob->amountRead_);
        argv[1] = str;
      }
      else
      {
        // Blobs use buffers rather than strings
        Local<Value> buffer = NanNewBufferHandle((char *)iLob->buf_,
                                                 iLob->amountRead_);
        argv[1] = buffer;
      }


    }
    else
      argv[1] = NanNull();
  }

  Local<Function> callback = NanNew(lobBaton->cb);

  delete lobBaton;

  NanMakeCallback(NanGetCurrentContext()->Global(), callback, 2, argv);

  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
}



/*****************************************************************************/
/*
  DESCRIPTION
    Write method on ILob class.

  PARAMETERS
    args - ILob object and callback

  RETURNS
    undefined

  NOTES
*/

NAN_METHOD(ILob::Write)
{ 
  NanScope();

  Local<Function>  callback;
  Local<Object> buffer_obj;
  ILob            *iLob;
  LobBaton        *lobBaton = new LobBaton;

  NJS_GET_CALLBACK(callback, args);

  NanAssignPersistent(lobBaton->cb, callback );

  NJS_CHECK_NUMBER_OF_ARGS (lobBaton->error, args, 2, 2, exitWrite);
  iLob = ObjectWrap::Unwrap<ILob>(args.This());

  if(!iLob->isValid_)
  {
    lobBaton->error = NJSMessages::getErrorMsg(errInvalidLob);
    goto exitWrite;
  }

  lobBaton->iLob = iLob;

  buffer_obj = args[0]->ToObject();
  lobBaton->writebuf = Buffer::Data(buffer_obj);
  lobBaton->writelen = Buffer::Length(buffer_obj);

   // mark Lob as active before leaving main thread, but not in
   // case of an error
  iLob->state_ = ACTIVE;       

  if( !iLob->njsconn_->isValid() )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitWrite;
  }

 exitWrite:

  lobBaton->req.data  = (void*)lobBaton;
  uv_queue_work(uv_default_loop(), &lobBaton->req,
                Async_Write, (uv_after_work_cb)Async_AfterWrite);

  NanReturnUndefined();
}



/*****************************************************************************/
/*
  DESCRIPTION
    Worker function of Write method

  PARAMETERS
    req - UV queue work block

  RETURNS
    nothing

  NOTES:
    Peform async write.
*/

void ILob::Async_Write(uv_work_t *req)
{
  LobBaton *lobBaton = (LobBaton *)req->data;
  ILob         *iLob = lobBaton->iLob;

  if(!(lobBaton->error).empty())
    goto exitAsyncWrite;

  try
  {
    unsigned long long byteAmount = lobBaton->writelen;
    unsigned long long charAmount = 0; // interested in byte amount only
    
    Lob::write((DpiHandle *)iLob->svch_, (DpiHandle *)iLob->errh_,
              (Descriptor *)iLob->lobLocator_, byteAmount, charAmount,
              iLob->offset_, lobBaton->writebuf);

    
    iLob->amountWritten_ = (unsigned long)byteAmount;
    if (iLob->fetchType_ == DpiClob)
      iLob->offset_ += charAmount;  // offset for CLOBs is character based
    else
      iLob->offset_ += byteAmount;
  }
  catch (dpi::Exception& e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    lobBaton->error = std::string(e.what());
  }

 exitAsyncWrite:
  ;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of Write method

   PARAMETERS
     req - UV queue work block

   RETURNS
     nothing

   NOTES
     Handle for string is formed and handed over to JS
*/

void ILob::Async_AfterWrite(uv_work_t *req)
{ 
  NanScope();

  LobBaton     *lobBaton = (LobBaton *)req->data;
  ILob         *iLob = lobBaton->iLob;
  v8::TryCatch  tc;
  Handle<Value> argv[1];

  iLob->state_ = INACTIVE;     // mark Lob as inactive as back in main thread

  if(!(lobBaton->error).empty())
    argv[0] = v8::Exception::Error(NanNew<v8::String>((lobBaton->error).c_str()));
  else
    argv[0] = NanUndefined();

  Local<Function> callback = NanNew(lobBaton->cb);

  delete lobBaton;

  NanMakeCallback(NanGetCurrentContext()->Global(), callback, 1, argv);

  if(tc.HasCaught())
  {
    node::FatalException(tc);
  }
}



/*****************************************************************************/
/*
  DESCRIPTION
    Constructor for the ProtoILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES

 */

ProtoILob::ProtoILob(eBaton *executeBaton, Descriptor *lobLocator,
                     unsigned short fetchType)

try : lobLocator_(lobLocator), fetchType_(fetchType), errh_(NULL),
      chunkSize_(0), length_(0)
{
  errh_ = executeBaton->dpienv->allocHandle(ErrorHandleType);
  chunkSize_ = Lob::chunkSize(executeBaton->dpiconn->getSvch(),
                              errh_, lobLocator_);
  length_ = Lob::length(executeBaton->dpiconn->getSvch(), errh_, lobLocator_);
}
catch (dpi::Exception &e)
{
  NJS_SET_CONN_ERR_STATUS ( e.errnum(), executeBaton->dpiconn );
  executeBaton->error = std::string(e.what());
  cleanup();
}



/*****************************************************************************/
/*
  DESCRIPTION
    Destructor for the ProtoILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES

 */

ProtoILob::~ProtoILob()
{
  cleanup();
}




/*****************************************************************************/
/*
  DESCRIPTION
    Cleanup for the ProtoILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES
    Like other cleanup methods, this method should not throw any exceptions.
 */

void ProtoILob::cleanup()
{
  try
  {
    if (errh_)
    {
      Env::freeHandle(errh_, ErrorHandleType);
      errh_ = NULL;
    }
  }
  
  catch (...)
  {
    // don't do anything
  }
  
  try
  {
    if (lobLocator_)
    {
      Env::freeDescriptor(lobLocator_, LobDescriptorType);
      lobLocator_ = NULL;
    }
  }
  
  catch (...)
  {
    // don't do anything
  }
}



/* end of file njsIntLob.cpp */

