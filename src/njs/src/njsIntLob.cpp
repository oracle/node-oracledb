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
Nan::Persistent<FunctionTemplate> ILob::iLobTemplate_s;



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
  isValid_(false), state_(NJS_INACTIVE), buf_(NULL), bufSize_(0), chunkSize_(0),
  length_(0), offset_(1), amountRead_(0), njsLobType_(NJS_DATATYPE_UNKNOWN),
  isTempLob_(false), tempLobCount_(NULL), isAutoCloseLob_(true)
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
  this->cleanupDPI ();

  this->cleanupNJS ();
}



/*****************************************************************************/
/*
  DESCRIPTION
    Cleanup DPI/OCI handles for the ILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES
    This method is called from the destructor and the release() method.
    Therefore, it should not throw any exceptions.
 */

void ILob::cleanupDPI ()
{
  this->isValid_ = false;

  try
  {
    if ( lobLocator_ && isTempLob_ && this->njsconn_->isValid() )
    {
      Lob::freeTempLob ( svch_, errh_, lobLocator_ );
    }

  }

  catch (...)
  {
    // don't do anything
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
    Cleanup non-dpi members for the ILob class.

  PARAMETERS
    none

  RETURNS
    nothing

  NOTES
    This method is called from the destructor and the release() method.
    Therefore, it should not throw any exceptions.
 */

void ILob::cleanupNJS ()
{
  if (buf_)
  {
    free ( buf_ );
    buf_ = NULL;
  }

  if ( this->tempLobCount_ )
  {
    --( *this->tempLobCount_ );
    this->tempLobCount_ = NULL;
  }

  this->jsParent_.Reset ();
}



/*****************************************************************************/
/*
  DESCRIPTION
    Initialize ILob attributes after forming it.

  PARAMETERS
    executeBaton   - execute baton
    lobLocator     - Lob locator
    isAutoCloseLob - boolean
                     true   - Lob object closed at end of streaming operation
                     false  - otherwise

  RETURNS
    nothing

  NOTES
    The fields of protoILob are set to NULL as they are transferred to ILob.
    Any exception would cause the cleanup to free the transferred handles.

    Any handles that are not transferred are cleaned up when the protoILob is
    finally deleted.
*/

void ILob::setILob ( eBaton *executeBaton, ProtoILob *protoILob,
                     bool isAutoCloseLob )
{
      //  The try/catch block is necessary as we are making a DPI call to get
      //  the svch_ and allocating the buf_.  Both of these can throw
      //  exceptions.
  try
  {
    // Lob details
    lobLocator_            = protoILob->lobLocator_;
    protoILob->lobLocator_ = NULL;
    dpiLobType_            = protoILob->dpiLobType_;
    isAutoCloseLob_        = isAutoCloseLob;
    isTempLob_             = protoILob->isTempLob_;

    if ( isTempLob_ )
    {
      // Increment the temp LOB counter
      tempLobCount_     = executeBaton->njsconn->TempLOBCount();
      ++( *tempLobCount_ );
    }

    // connection
    njsconn_               = executeBaton->njsconn;
    dpiconn_               = executeBaton->dpiconn;
    svch_                  = executeBaton->dpiconn->getSvch();

    this->jsParent_.Reset ( executeBaton->jsConn );

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
    if (dpiLobType_ == DpiClob)
    {
      // accommodate multi-byte charsets
      buf_        = ( char *) malloc ( (size_t)
                    ( bufSize_ * dpiconn_->getLOBCharExpansionRatio () ) );
      njsLobType_ = NJS_DATATYPE_CLOB;
    }
    else if (dpiLobType_ == DpiBlob)
    {
      buf_        = ( char * ) malloc ( ( size_t ) bufSize_ );
      njsLobType_ = NJS_DATATYPE_BLOB;
    }

    // Now the ILob object is valid
    isValid_ = true;
  }

  catch (dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), executeBaton->dpiconn );
    executeBaton->error = std::string(e.what());
    cleanupDPI ();
    cleanupNJS ();
  }
}


/*****************************************************************************/
/*
   DESCRIPTION
     Get Error number based on the status of the LOB object

   PARAMETERS:
     preBind - true  - if called from preBind ()
               false - otherwise

   RETURN:
     NJSErrorType - If there are no errors then errSuccess otherwise appropriate
                    error number
*/
inline NJSErrorType ILob::getErrNumber ( bool preBind )
{
  NJSErrorType errNum = errSuccess;

  if ( !this->isValid_ )
  {
    errNum = errInvalidLob;
  }
  else if ( this->state_ == NJS_ACTIVE )
  {
    errNum = errBusyLob;
  }
  else if ( !preBind && this->state_ == NJSBIND_ACTIVE )
  {
    errNum = errLOBBindActive;
  }

  return errNum;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Checks whether state and type are good for Bind and set the state to
     NJSBIND_ACTIVE. Check for temp LOB INOUT bind not supported

   PARAMETERS:
     bind     - Bind structure

   RETURN:
     NJSErrorType - If there are no errors then errSuccess otherwise appropriate
                    error number
*/
NJSErrorType ILob::preBind ( Bind *bind )
{
  NJSErrorType errNum = errSuccess;

  if ( bind->type && bind->type != this->njsLobType_ )
  {
    errNum = errBindValueAndTypeMismatch;
  }
  else
  {
    bind->type = this->dpiLobType_;

    if ( !this->isValid_ || this->state_ == NJS_ACTIVE )
    {
      errNum = this->getErrNumber ( true );
    }
  }

  if ( errNum == errSuccess )
  {
    this->state_ = NJSBIND_ACTIVE;
  }

  return errNum;
}


/*****************************************************************************/
/*
  DESCRIPTION
    In case of BIND_INOUT, create a duplicate LOB locator and in case of
    BIND_IN, initialize the LOB locator

  PARAMETERS
    bind - Bind structure containing LOB bind details

  RETURNS
    nothing
*/
void ILob::doBind ( Bind *bind )
{
  if ( bind->isInOut )
  {
    Lob::cacheDescriptor ( ( DpiHandle * ) this->svch_,
                           ( DpiHandle * ) this->errh_,
                           ( Descriptor * ) this->lobLocator_,
                           ( Descriptor ** ) bind->value );
  }
  else
  {
    * ( Descriptor ** ) bind->value = ( Descriptor * ) this->lobLocator_;
  }
}


/*****************************************************************************/
/*
  DESCRIPTION
    After bind call, set the state of ILob object to NJS_INACTIVE in case of
    BIND_IN and free the object in case of BIND_INOUT

  PARAMETERS
    inOut - true  - In case of BIND_INOUT
            false - otherwise

  RETURNS
    nothing
*/
void ILob::postBind ()
{
  if ( this->state_ == NJSBIND_ACTIVE )
  {
    this->state_ = NJS_INACTIVE;
  }
}


/*****************************************************************************/
/*
   DESCRIPTION
     Determines whether given v8 object has ILob instance or not

   PARAMETERS:
     obj   - v8 object

   RETURN:
     true  - if parameter obj contains ILob instance
     false - otherwise
*/
bool ILob::hasILobInstance ( Local<Object> obj )
{
  Nan::HandleScope scope;

  bool hasILob       = false;
  Local <String> key = Nan::New<v8::String>("iLob").ToLocalChecked();

  // JS script binds stream object, get it's member iLob
  Local<Value> v8value = obj->Get(key);

  // Check if bind value has iLob instance as it's key
  if ( !( v8value->IsUndefined () || v8value-> IsNull () ) &&
       v8value->IsObject () &&
       Nan::New(ILob::iLobTemplate_s)->HasInstance (
                                          v8value->ToObject () ))
  {
    hasILob = true;
  }

  return hasILob;
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
  Nan::HandleScope scope;

  Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);
  tpl->SetClassName(Nan::New<v8::String>("ILob").ToLocalChecked());

  Nan::SetPrototypeMethod(tpl, "release", Release);

  Nan::SetPrototypeMethod(tpl, "close", Close);

  Nan::SetPrototypeMethod(tpl, "read", Read);

  Nan::SetPrototypeMethod(tpl, "write", Write);

  Nan::SetAccessor(tpl->InstanceTemplate(),
    Nan::New<v8::String>("chunkSize").ToLocalChecked(),
    ILob::GetChunkSize,
    ILob::SetChunkSize);

  Nan::SetAccessor(tpl->InstanceTemplate(),
    Nan::New<v8::String>("length").ToLocalChecked(),
    ILob::GetLength,
    ILob::SetLength);

  Nan::SetAccessor(tpl->InstanceTemplate(),
    Nan::New<v8::String>("pieceSize").ToLocalChecked(),
    ILob::GetPieceSize,
    ILob::SetPieceSize);

  Nan::SetAccessor(tpl->InstanceTemplate(),
    Nan::New<v8::String>("offset").ToLocalChecked(),
    ILob::GetOffset,
    ILob::SetOffset);

  Nan::SetAccessor(tpl->InstanceTemplate(),
    Nan::New<v8::String>("type").ToLocalChecked(),
    ILob::GetType,
    ILob::SetType);

  Nan::SetAccessor(tpl->InstanceTemplate(),
    Nan::New<v8::String>("autoCloseLob").ToLocalChecked(),
    ILob::GetIsAutoCloseLob,
    ILob::SetIsAutoCloseLob);

  Nan::SetAccessor(tpl->InstanceTemplate(),
    Nan::New<v8::String>("valid").ToLocalChecked(),
    ILob::GetIsValid,
    ILob::SetIsValid);

  iLobTemplate_s.Reset(tpl);
  Nan::Set(target, Nan::New<v8::String>("ILob").ToLocalChecked(), tpl->GetFunction());
}



/*****************************************************************************/
/*
  DESCRIPTION
    Invoked when a NewInstance() of ILob is called.

  PARAMETERS
    info - ILob template

  RETURNS
    ILob object

  NOTES

*/

NAN_METHOD(ILob::New)
{

  ILob *iLob = new ILob();

  iLob->Wrap(info.Holder());

  info.GetReturnValue().Set(info.Holder());
}



/*****************************************************************************/
/*
  DESCRIPTION
    Release method on ILob class.

  PARAMETERS
    info - ILob object

  RETURNS
    undefined

  NOTES
    The cleanup() called by Release() only frees OCI error handle and Lob
    locator.  These calls acquire mutex on OCI environment handle very briefly.
*/

NAN_METHOD(ILob::Release)
{

  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID2(iLob, info);
  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }

  if ( !iLob->isValid_ || iLob->state_ != NJS_INACTIVE )
  {
    msg = NJSMessages::getErrorMsg( iLob->getErrNumber( false ) );
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }

  iLob->cleanupDPI ();

  iLob->cleanupNJS ();

  info.GetReturnValue().SetUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
    Close method on ILob class.

  PARAMETERS
    info - ILob object

  RETURNS
    undefined

  NOTES
    None
*/
NAN_METHOD(ILob::Close)
{
  Nan::EscapableHandleScope scope;

  Local<Function>           callback;

  NJS_GET_CALLBACK ( callback, info );

  ILob   *iLob = Nan::ObjectWrap::Unwrap<ILob> ( info.Holder() );

  /* If iLob is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( iLob, info );

  LobBaton *lobBaton = new LobBaton ( iLob->njsconn_->LOBCount (), callback,
                                      info.Holder() );

  lobBaton->iLob = iLob;

  NJS_CHECK_NUMBER_OF_ARGS ( lobBaton->error, info, 1, 1, exitClose );

  if ( !iLob->isValid_ || iLob->state_ != NJS_INACTIVE )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( iLob->getErrNumber( false ) );
    lobBaton->errOnActiveOrInvalid = true;
    goto exitClose;
  }

  // mark Lob as active before leaving main thread, but not in
  // case of an error.
  iLob->state_ = NJS_ACTIVE;

  if( !iLob->njsconn_->isValid () )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitClose;
  }

 exitClose:
  lobBaton->req.data  = ( void* )lobBaton;
  int status = uv_queue_work ( uv_default_loop(), &lobBaton->req,
               Async_Close, ( uv_after_work_cb ) Async_AfterClose );
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete lobBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "LobClose" );
    NJS_SET_EXCEPTION ( error.c_str () );
  }

  info.GetReturnValue ().SetUndefined ();
}


/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of close  method

   PARAMETERS:
     UV queue work block

   NOTES:
     DPI call execution
*/
void ILob::Async_Close(uv_work_t *req)
{
  LobBaton *lobBaton = ( LobBaton* )req->data;
  ILob     *iLob     = lobBaton->iLob;

  if ( !lobBaton->error.empty () )
    goto exitAsyncClose;

  try
  {
    iLob->cleanupDPI ();
  }
  catch (dpi::Exception& e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    lobBaton->error = std::string(e.what());
  }

  exitAsyncClose:
  ;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of close method

   PARAMETERS:
     UV queue work block
*/
void ILob::Async_AfterClose(uv_work_t *req)
{
  Nan::HandleScope scope;

  LobBaton         *lobBaton = ( LobBaton * ) req->data;
  ILob             *iLob = lobBaton->iLob;
  Nan::TryCatch    tc;

  if ( !lobBaton->errOnActiveOrInvalid )
  {
    iLob->state_ = NJS_INACTIVE;
  }

  Local<Value> argv[1];

  if( !lobBaton->error.empty () )
    argv[0] = v8::Exception::Error(
                Nan::New<v8::String> ( lobBaton->error ).ToLocalChecked () );
  else
  {
    argv[0] = Nan::Undefined ();

    iLob->cleanupNJS ();
  }

  Local<Function> callback = Nan::New<Function> ( lobBaton->cb );
  delete lobBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(),
                      callback, 1, argv );

  if( tc.HasCaught () )
  {
    Nan::FatalException ( tc );
  }
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
  Nan::HandleScope scope;
  string msg;

  if (iLob->isValid_)
    msg = NJSMessages::getErrorMsg(err, property.c_str());
  else
    msg = NJSMessages::getErrorMsg(errInvalidLob);

  NJS_SET_EXCEPTION ( msg.c_str() );
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of chunkSize property

  PARAMETERS
    info - ILob object

  RETURNS
    chunk size

  NOTES

*/

NAN_GETTER(ILob::GetChunkSize)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID2(iLob, info);
  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }

  try
  {
    info.GetReturnValue().Set(iLob->chunkSize_);
    return;
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION ( e.what() );
  }

  info.GetReturnValue().SetUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of chunkSize property - throws error as chunk size is a
    read-only property.

  PARAMETERS
    info - ILob object

  RETURNS
    throws error

  NOTES

*/

NAN_SETTER(ILob::SetChunkSize)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  NJS_CHECK_OBJECT_VALID (iLob);
  lobPropertyException(iLob, errReadOnly, "chunkSize");
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of length property

  PARAMETERS
    info - ILob object

  RETURNS
    LOB length

  NOTES
    This method returns the Lob length originally fetched when the ProtoILob
    object was created.
*/

NAN_GETTER(ILob::GetLength)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID2(iLob, info);
  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }

  try
  {
    info.GetReturnValue().Set((double)iLob->length_);
    return;
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION ( e.what() );
  }

  info.GetReturnValue().SetUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of length property - throws error as length is a read-only
    property.

  PARAMETERS
    info - ILob object

  RETURNS
    throws error

  NOTES

*/

NAN_SETTER(ILob::SetLength)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  NJS_CHECK_OBJECT_VALID(iLob);
  lobPropertyException(iLob, errReadOnly, "length");
}



/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of pieceSize property

  PARAMETERS
    info - ILob object

  RETURNS
    the number of bytes that will be read for each read().

  NOTES

*/

NAN_GETTER(ILob::GetPieceSize)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID2(iLob, info);
  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }

  try
  {
    info.GetReturnValue().Set(iLob->bufSize_);
    return;
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION ( e.what() );
  }

  info.GetReturnValue().SetUndefined();
}


/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of pieceSize property

  PARAMETERS
    info - ILob object and pieceSize property

  RETURNS
    nothing

  NOTES

*/

NAN_SETTER(ILob::SetPieceSize)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID(iLob);
  NJS_SET_PROP_UINT(iLob->bufSize_, value, "pieceSize");

  if (iLob->state_ == NJS_ACTIVE)
  {
    msg = NJSMessages::getErrorMsg(errBusyLob);

    NJS_SET_EXCEPTION ( msg.c_str() );
    return;
  }

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION ( msg.c_str() );
    return;
  }

  if (iLob->buf_)
  {
    delete [] iLob->buf_;
    iLob->buf_ = NULL;
  }

  if (iLob->dpiLobType_ == DpiClob)
  {
    try
    {
      // accommodate multi-byte charsets
      iLob->buf_ = new char[iLob->bufSize_ *
                             iLob->dpiconn_->getLOBCharExpansionRatio ()];
    }
    catch(dpi::Exception &e)
    {
      NJS_SET_CONN_ERR_STATUS (  e.errnum(), iLob->dpiconn_ );
      NJS_SET_EXCEPTION ( e.what() );
    }
  }
  else
    iLob->buf_ = new char[iLob->bufSize_];
}



/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of offset property

  PARAMETERS
    info - ILob object

  RETURNS
    the current offset where read or write will happen.

  NOTES

*/

NAN_GETTER(ILob::GetOffset)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID2(iLob, info);
  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }

  try
  {
    info.GetReturnValue().Set((uint32_t)iLob->offset_);
    return;
  }
  catch(dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), iLob->dpiconn_ );
    NJS_SET_EXCEPTION ( e.what() );
  }

  info.GetReturnValue().SetUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
     Set Accessor of offset property

  PARAMETERS
    info - ILob object and offset property

  RETURNS
    nothing

  NOTES

*/

NAN_SETTER(ILob::SetOffset)
{
  ILob  *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  double offset = 0.0;
  string msg;

  NJS_CHECK_OBJECT_VALID(iLob);
  NJS_SET_PROP_UINT(offset, value, "offset");

  if (offset < 1)
  {
    string msg = NJSMessages::getErrorMsg(errInvalidPropertyValue, "offset");

    NJS_SET_EXCEPTION ( msg.c_str() );
  }

  if (iLob->state_ == NJS_ACTIVE)
  {
    msg = NJSMessages::getErrorMsg(errBusyLob);

    NJS_SET_EXCEPTION ( msg.c_str() );
    return;
  }

  if( !iLob->njsconn_->isValid() )
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION ( msg.c_str() );
    return;
  }

  iLob->offset_ = (unsigned long long) offset;
}


/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of type property

  PARAMETERS
    args - ILob object

  RETURNS
    the type of the LOB (either CLOB or BLOB)

  NOTES

*/

NAN_GETTER(ILob::GetType)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());

  NJS_CHECK_OBJECT_VALID2(iLob, info);
  try
  {
    Local<Number> value = Nan::New<v8::Number>(
                                           (unsigned long) iLob->njsLobType_ );
    info.GetReturnValue().Set(value);
    return;
  }

  catch(dpi::Exception &e)
  {
    NJS_SET_EXCEPTION ( e.what() );
  }

    info.GetReturnValue().SetUndefined();
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of type property - throws error as type is a read-only
    property.

  PARAMETERS
    args - ILob object

  RETURNS
    throws error

  NOTES

*/

NAN_SETTER(ILob::SetType)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());
  NJS_CHECK_OBJECT_VALID(iLob);
  lobPropertyException(iLob, errReadOnly, "type");
}



/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of autoCloseLob property

  PARAMETERS
    args - ILob object

  RETURNS
    true  - if iLob is temporaray LOB instance
    false - otherwise

  NOTES

*/
NAN_GETTER(ILob::GetIsAutoCloseLob)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob> ( info.Holder () );

  NJS_CHECK_OBJECT_VALID2( iLob, info );
  info.GetReturnValue ().Set ( Nan::New<v8::Boolean>( iLob->isAutoCloseLob_ ) );
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of autoCloseLob property - throws error as isAutoCloseLob is a read-only
    property.

  PARAMETERS
    args - ILob object

  RETURNS
    throws error

  NOTES

*/
NAN_SETTER(ILob::SetIsAutoCloseLob)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob> ( info.Holder () );
  NJS_CHECK_OBJECT_VALID ( iLob );
  lobPropertyException ( iLob, errReadOnly, "autoCloseLob" );
}


/*****************************************************************************/
/*
  DESCRIPTION
    Get Accessor of isValid_ property

  PARAMETERS
    args - ILob object

  RETURNS
    true  - if iLob is temporaray LOB instance
    false - otherwise

  NOTES

*/
NAN_GETTER(ILob::GetIsValid)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob> ( info.Holder () );

  NJS_CHECK_OBJECT_VALID2( iLob, info );
  info.GetReturnValue ().Set ( Nan::New<v8::Boolean>( iLob->isValid_ ) );
}


/*****************************************************************************/
/*
  DESCRIPTION
    Set Accessor of isValid_ property - throws error as isValid_ is a read-only
    property.

  PARAMETERS
    args - ILob object

  RETURNS
    throws error

  NOTES

*/
NAN_SETTER(ILob::SetIsValid)
{
  ILob *iLob = Nan::ObjectWrap::Unwrap<ILob> ( info.Holder () );
  NJS_CHECK_OBJECT_VALID ( iLob );
  lobPropertyException ( iLob, errReadOnly, "valid" );
}


/*****************************************************************************/
/*
  DESCRIPTION
    Read method on ILob class.

  PARAMETERS
    info - ILob object and callback

  RETURNS
    undefined

  NOTES

*/

NAN_METHOD(ILob::Read)
{

  Local<Function>  callback;
  ILob             *iLob;

  NJS_GET_CALLBACK(callback, info);
  iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());

  /* If iLob object is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 (iLob, info);

  LobBaton *lobBaton = new LobBaton ( iLob->njsconn_->LOBCount (), callback,
                                      info.Holder() );

  lobBaton->iLob = iLob;

  NJS_CHECK_NUMBER_OF_ARGS (lobBaton->error, info, 1, 1, exitRead);

  if ( !iLob->isValid_ || iLob->state_ != NJS_INACTIVE )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( iLob->getErrNumber ( false ) );
    lobBaton->errOnActiveOrInvalid = true;
    goto exitRead;
  }

   // mark Lob as active before leaving main thread, but not in
   // case of an error.
  iLob->state_ = NJS_ACTIVE;

  if( !iLob->njsconn_->isValid() )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitRead;
  }

 exitRead:

  lobBaton->req.data  = (void*)lobBaton;
  int status = uv_queue_work(uv_default_loop(), &lobBaton->req,
               Async_Read, (uv_after_work_cb)Async_AfterRead);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete lobBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "LobRead" );
    NJS_SET_EXCEPTION ( error.c_str() );
  }

  info.GetReturnValue().SetUndefined();
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
    unsigned long long bufLen     = 0;

    // Clobs read by characters
    if (iLob->dpiLobType_ == DpiClob)
    {
      charAmount = iLob->bufSize_;
      byteAmount = 0;
      // for CLOBs, bufLen is adjusted to handle multi-byte charsets
      bufLen = charAmount * iLob->dpiconn_->getLOBCharExpansionRatio ();
    }
    Lob::read((DpiHandle *)iLob->svch_, (DpiHandle *)iLob->errh_,
              (Descriptor *)iLob->lobLocator_, byteAmount, charAmount,
              iLob->offset_, (void *)iLob->buf_, bufLen);

    // amountRead_ used in Async_AfterRead to construct string
    iLob->amountRead_ = (unsigned long)byteAmount;
    if (iLob->dpiLobType_ == DpiClob)
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
  Nan::HandleScope scope;

  LobBaton     *lobBaton = (LobBaton *)req->data;
  ILob         *iLob = lobBaton->iLob;
  Nan::TryCatch  tc;
  Local<Value> argv[2];

  if ( !lobBaton->errOnActiveOrInvalid )
  {
    iLob->state_ = NJS_INACTIVE; // mark Lob as inactive as back in main thread
  }

  if(!(lobBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(
                    Nan::New<v8::String>(lobBaton->error).ToLocalChecked());
    argv[1] = Nan::Undefined();
  }
  else
  {
    argv[0] = Nan::Undefined();

    if (iLob->amountRead_)
    {
      if (iLob->dpiLobType_ == DpiClob)
      {
        Local<Value> str = Nan::New<v8::String>((char *)iLob->buf_,
                                         iLob->amountRead_).ToLocalChecked();
        argv[1] = str;
      }
      else
      {
        // Blobs use buffers rather than strings
        // TODO: We could use NewBuffer to save memory and CPU, but it gets the ownership of buffer to itself (behaviour changed in Nan 2.0)
        Local<Value> buffer = Nan::CopyBuffer((char *)iLob->buf_,
                                             iLob->amountRead_).ToLocalChecked();
        argv[1] = buffer;
      }


    }
    else
      argv[1] = Nan::Null();
  }

  Local<Function> callback = Nan::New<Function>(lobBaton->cb);
  delete lobBaton;

  Nan::MakeCallback(Nan::GetCurrentContext()->Global(), callback, 2, argv);

  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
}



/*****************************************************************************/
/*
  DESCRIPTION
    Write method on ILob class.

  PARAMETERS
    info - ILob object and callback

  RETURNS
    undefined

  NOTES
*/

NAN_METHOD(ILob::Write)
{

  Local<Function>  callback;
  Local<Object> buffer_obj = info[0]->ToObject();
  ILob             *iLob;

  NJS_GET_CALLBACK(callback, info);
  iLob = Nan::ObjectWrap::Unwrap<ILob>(info.Holder());

  /* If iLob is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( iLob, info );

  LobBaton *lobBaton = new LobBaton ( iLob->njsconn_->LOBCount (), buffer_obj,
                                      callback, info.Holder() );

  lobBaton->iLob = iLob;

  NJS_CHECK_NUMBER_OF_ARGS (lobBaton->error, info, 2, 2, exitWrite);

  if ( !iLob->isValid_ || iLob->state_ != NJS_INACTIVE )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( iLob->getErrNumber ( false ) );
    lobBaton->errOnActiveOrInvalid = true;
    goto exitWrite;
  }

  lobBaton->writebuf = Buffer::Data(buffer_obj);
  lobBaton->writelen = Buffer::Length(buffer_obj);

   // mark Lob as active before leaving main thread, but not in
   // case of an error
  iLob->state_ = NJS_ACTIVE;

  if( !iLob->njsconn_->isValid() )
  {
    lobBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitWrite;
  }

 exitWrite:

  lobBaton->req.data  = (void*)lobBaton;
  int status = uv_queue_work(uv_default_loop(), &lobBaton->req,
               Async_Write, (uv_after_work_cb)Async_AfterWrite);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete lobBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work", "LobWrite" );
    NJS_SET_EXCEPTION ( error.c_str() );
  }

  info.GetReturnValue().SetUndefined();
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
    // for CLOBs, bufLen is adjusted to handle multi-byte charsets
    unsigned long long bufLen     = charAmount *
                                    iLob->dpiconn_->getLOBCharExpansionRatio ();

    Lob::write((DpiHandle *)iLob->svch_, (DpiHandle *)iLob->errh_,
              (Descriptor *)iLob->lobLocator_, byteAmount, charAmount,
              iLob->offset_, lobBaton->writebuf, bufLen);


    iLob->amountWritten_ = (unsigned long)byteAmount;
    if (iLob->dpiLobType_ == DpiClob)
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
  Nan::HandleScope scope;

  LobBaton     *lobBaton = (LobBaton *)req->data;
  ILob         *iLob = lobBaton->iLob;
  Nan::TryCatch  tc;
  Local<Value> argv[1];

  if ( !lobBaton->errOnActiveOrInvalid )
  {
    iLob->state_ = NJS_INACTIVE; // mark Lob as inactive as back in main thread
  }

  if(!(lobBaton->error).empty())
    argv[0] = v8::Exception::Error(
                  Nan::New<v8::String>(lobBaton->error).ToLocalChecked());
  else
    argv[0] = Nan::Undefined();

  Local<Function> callback = Nan::New<Function>(lobBaton->cb);
  delete lobBaton;

  Nan::MakeCallback(Nan::GetCurrentContext()->Global(), callback, 1, argv);

  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
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

try : lobLocator_(lobLocator), dpiLobType_(fetchType), errh_(NULL),
      chunkSize_(0), length_(0)
{
  errh_ = executeBaton->dpienv->allocHandle(ErrorHandleType);
  chunkSize_ = Lob::chunkSize(executeBaton->dpiconn->getSvch(),
                              errh_, lobLocator_);
  length_ = Lob::length(executeBaton->dpiconn->getSvch(), errh_, lobLocator_);
  isTempLob_ = ( bool ) Lob::isTempLob ( executeBaton->dpienv->envHandle(),
                                         errh_, lobLocator_ );
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

