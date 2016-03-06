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
 *   njsResultSet.cpp
 *
 * DESCRIPTION
 *   ResultSet class implementation.
 *
 *****************************************************************************/
#include "node.h"
#include <string>
#include "njsResultSet.h"
#include "njsConnection.h"

#include <iostream>

using namespace std;
using namespace node;
using namespace v8;
                                        //peristent ResultSet class handle
Nan::Persistent<FunctionTemplate> ResultSet::resultSetTemplate_s;
/*****************************************************************************/
/*
   DESCRIPTION
     Store the config in pool instance.
   
   PARAMETERS
     stmt         -  dpi statement
     executeBaton - eBaton structure
*/
void ResultSet::setResultSet ( dpi::Stmt *stmt, eBaton *executeBaton )
{
  this->dpistmt_       = stmt;
  this->dpienv_        = executeBaton->dpienv;
  this->njsconn_       = executeBaton->njsconn;
  if ( stmt )
  {
    this->meta_        = stmt->getMetaData();
    this->numCols_     = this->dpistmt_->numCols();
    this->state_       = INACTIVE;
  }
  else
  {
    /* 
     * This could happen in REFCURSOR case, when the stored procedure
     * did not return a valid handle
     */
    this->numCols_     = 0;
    this->meta_        = NULL;
    this->state_       = INVALID;
  }

  this->outFormat_     = executeBaton->outFormat;
  this->fetchRowCount_ = 0;
  this->rsEmpty_       = false;
  this->defineBuffers_ = NULL;

  /* (Deep) Copy by-type conversion rules if available for later use */
  if ( executeBaton -> fetchAsStringTypes )
  {
    unsigned int count = executeBaton->fetchAsStringTypesCount;

    this->fetchAsStringTypes_ = (DataType * ) malloc (
                                                count * sizeof ( DataType ) );
    for ( unsigned int i = 0 ; i < count ; i ++ )
    {
      this->fetchAsStringTypes_[i] = executeBaton->fetchAsStringTypes[i] ;
    }
    this->fetchAsStringTypesCount_ = count;
  }
  else
  {
    this->fetchAsStringTypes_      = NULL;
    this->fetchAsStringTypesCount_ = 0;
  }

  /* (Deep) Copy by-name conversion rules if available for later use
   * The by-name conversion rules are applicable only for ResultSet
   * RefCursor require by-cursor definitions
   */
  if ( executeBaton->getRS && executeBaton->fetchInfo )
  {
    this->fetchInfo_ = new FetchInfo[executeBaton->fetchInfoCount];
    for ( unsigned int i = 0; i < executeBaton->fetchInfoCount; i ++ )
    {
      this->fetchInfo_[i].type = executeBaton->fetchInfo[i].type;
      this->fetchInfo_[i].name = executeBaton->fetchInfo[i].name;
    }
    this->fetchInfoCount_ = executeBaton->fetchInfoCount ;
  }
  else
  {
    this->fetchInfo_      = NULL;
    this->fetchInfoCount_ = 0;
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Init function of the ResultSet class.
     Initiates and maps the functions and properties of ResultSet class.
*/
void ResultSet::Init(Handle<Object> target)
{
  Nan::HandleScope scope;
  Local<FunctionTemplate> temp = Nan::New<FunctionTemplate>(New);
  temp->InstanceTemplate()->SetInternalFieldCount(1);
  temp->SetClassName(Nan::New<v8::String>("ResultSet").ToLocalChecked());

  Nan::SetPrototypeMethod(temp, "close", Close);
  Nan::SetPrototypeMethod(temp, "getRow", GetRow);
  Nan::SetPrototypeMethod(temp, "getRows", GetRows);

  Nan::SetAccessor(temp->InstanceTemplate(),
    Nan::New<v8::String>("metaData").ToLocalChecked(),
    ResultSet::GetMetaData,
    ResultSet::SetMetaData );

  resultSetTemplate_s.Reset( temp);
  Nan::Set(target, Nan::New<v8::String>("ResultSet").ToLocalChecked(), temp->GetFunction());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Invoked when new of connection is called from JS
*/
NAN_METHOD(ResultSet::New)
{

  ResultSet *resultSet = new ResultSet();
  resultSet->Wrap(info.Holder());

  info.GetReturnValue().Set(info.Holder());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Accessor of metaData Property
*/
NAN_GETTER(ResultSet::GetMetaData)
{
  ResultSet* njsResultSet  = Nan::ObjectWrap::Unwrap<ResultSet>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID2(njsResultSet, info);
  if(!njsResultSet->njsconn_->isValid())
  {
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    info.GetReturnValue().SetUndefined();
    return;
  }
  else if(njsResultSet->state_ == INVALID)
  {
    msg = NJSMessages::getErrorMsg ( errInvalidResultSet );
    NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
    info.GetReturnValue().SetUndefined();
    return;
  }
  std::string *columnNames = new std::string[njsResultSet->numCols_];
  Connection::CopyMetaData ( columnNames, njsResultSet->meta_,
                             njsResultSet->numCols_ );
  Local<Value> meta;
  meta = Connection::GetMetaData( columnNames,
                                  njsResultSet->numCols_ );
  info.GetReturnValue().Set(meta);
}

/*****************************************************************************/
/*
   DESCRIPTION
     Set Accessor of metaData Property - throws error
*/
NAN_SETTER(ResultSet::SetMetaData)
{
  ResultSet* njsResultSet = Nan::ObjectWrap::Unwrap<ResultSet>(info.Holder());
  string msg;

  NJS_CHECK_OBJECT_VALID(njsResultSet);
  if(!njsResultSet->njsconn_->isValid())
    msg = NJSMessages::getErrorMsg ( errInvalidConnection );
  else if(njsResultSet->state_ == INVALID)
    msg = NJSMessages::getErrorMsg(errInvalidResultSet);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "metaData");
  NJS_SET_EXCEPTION(msg.c_str(), (int) msg.length());
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Row method on Result Set class.

   PARAMETERS:
     info - callback
*/
NAN_METHOD(ResultSet::GetRow)
{

  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, info );

  ResultSet *njsResultSet = Nan::ObjectWrap::Unwrap<ResultSet>(info.Holder());

  /* If njsResultSet is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( njsResultSet, info );

  rsBaton   *getRowsBaton = new rsBaton ( njsResultSet->njsconn_->RSCount (),
                                          callback );
  getRowsBaton->njsRS = njsResultSet;

  if(njsResultSet->state_ == INVALID)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errInvalidResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRow;
  }
  if(njsResultSet->state_ == ACTIVE)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errBusyResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRow;
  }
  njsResultSet->state_  = ACTIVE;

  NJS_CHECK_NUMBER_OF_ARGS ( getRowsBaton->error, info, 1, 1, exitGetRow );

  getRowsBaton->numRows = 1;

exitGetRow:
  ResultSet::GetRowsCommon(getRowsBaton);
  info.GetReturnValue().SetUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get Rows method on Result Set class.

   PARAMETERS:
     info - numRows, callback
*/
NAN_METHOD(ResultSet::GetRows)
{

  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, info );

  ResultSet *njsResultSet = Nan::ObjectWrap::Unwrap<ResultSet>(info.Holder());

  /* If njsResultSet is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( njsResultSet, info );

  rsBaton   *getRowsBaton = new rsBaton ( njsResultSet->njsconn_->RSCount (),
                                          callback );
  getRowsBaton->njsRS = njsResultSet;

  if(njsResultSet->state_ == INVALID)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errInvalidResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRows;
  }
  else if(njsResultSet->state_ == ACTIVE)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errBusyResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRows;
  }
  njsResultSet->state_  = ACTIVE;

  NJS_CHECK_NUMBER_OF_ARGS ( getRowsBaton->error, info, 2, 2, exitGetRows );
  NJS_GET_ARG_V8UINT ( getRowsBaton->numRows, getRowsBaton->error,
                       info, 0, exitGetRows );
  if(!getRowsBaton->numRows)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( 
                                     errInvalidParameterValue, 1);
    goto exitGetRows;
  }

  getRowsBaton->fetchMultiple = true;
exitGetRows:
  ResultSet::GetRowsCommon(getRowsBaton);
  info.GetReturnValue().SetUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Common method for GetRow and GetRows method

   PARAMETERS:
     getRowsBaton - resultset baton
*/
void ResultSet::GetRowsCommon(rsBaton *getRowsBaton)
{
  ResultSet *njsRS;
  eBaton    *ebaton;

  if(!(getRowsBaton->error).empty()) goto exitGetRowsCommon;

  if(!getRowsBaton->njsRS->njsconn_->isValid())
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitGetRowsCommon;
  }

  ebaton                     = getRowsBaton->ebaton;
  njsRS                      = getRowsBaton->njsRS;
  ebaton->columnNames        = new std::string[njsRS->numCols_];
  ebaton->maxRows            = getRowsBaton->numRows;
  ebaton->dpistmt            = njsRS->dpistmt_;
  ebaton->getRS              = true;
  ebaton->dpienv             = njsRS->njsconn_->oracledb_->getDpiEnv();
  ebaton->outFormat          = njsRS->outFormat_;
  ebaton->njsconn            = njsRS->njsconn_;
  ebaton->dpiconn            = njsRS->njsconn_->getDpiConn();

  if ( njsRS->fetchAsStringTypesCount_ )
  {
    ebaton->fetchAsStringTypes = njsRS->fetchAsStringTypes_;
    ebaton->fetchAsStringTypesCount = njsRS->fetchAsStringTypesCount_;
  }
  else
  {
    ebaton->fetchAsStringTypes = NULL;
    ebaton->fetchAsStringTypesCount = 0;
  }

  /* Copy by-name conversion rules */
  ebaton->fetchInfoCount   = njsRS->fetchInfoCount_;
  if ( ebaton->fetchInfoCount )
  {
    ebaton->fetchInfo = njsRS->fetchInfo_;
  }
  else
  {
    ebaton->fetchInfo = NULL;
  }

exitGetRowsCommon:
  getRowsBaton->req.data  = (void *)getRowsBaton;

  int status = uv_queue_work(uv_default_loop(), &getRowsBaton->req,
               Async_GetRows, (uv_after_work_cb)Async_AfterGetRows);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete getRowsBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work",
                                              "GetRowsCommon" );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
  }

}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of GetRows method

   PARAMETERS:
     req - UV queue work block

   NOTES:
     DPI call execution.
*/
void ResultSet::Async_GetRows(uv_work_t *req)
{
  rsBaton *getRowsBaton = (rsBaton*)req->data;
  ResultSet *njsRS      = getRowsBaton->njsRS;
  eBaton    *ebaton     = getRowsBaton->ebaton;

  if(!(getRowsBaton->error).empty()) goto exitAsyncGetRows;

  if(njsRS->rsEmpty_)
  {
    ebaton->rowsFetched = 0;
    goto exitAsyncGetRows;
  }

  try
  {
    Connection::CopyMetaData ( ebaton->columnNames, njsRS->meta_,
                               njsRS->numCols_ );
    ebaton->numCols      = njsRS->numCols_;
    if( !njsRS->defineBuffers_ ||
        njsRS->fetchRowCount_  < getRowsBaton->numRows )
    {
      if( njsRS->defineBuffers_ )
      {
        ResultSet::clearFetchBuffer(njsRS->defineBuffers_, njsRS->numCols_);
        getRowsBaton-> njsRS-> defineBuffers_ = NULL;
      }
      Connection::DoDefines(ebaton, njsRS->meta_, njsRS->numCols_);
      if ( !ebaton->error.empty () )
      {
        getRowsBaton->error = ebaton->error;
        goto exitAsyncGetRows;
      }
      njsRS->fetchRowCount_ = getRowsBaton->numRows;
      njsRS->defineBuffers_ = ebaton->defines;
    }
    else
    {
      for (unsigned int col = 0; col < njsRS->numCols_; col++)
      {
        switch(njsRS->meta_[col].dbType)
        {
        case dpi::DpiClob:
        case dpi::DpiBlob:
        case dpi::DpiBfile:
          for (unsigned int j = 0; j < ebaton->maxRows; j++)
          {
            ((Descriptor **)(njsRS->defineBuffers_[col].buf))[j] =
              ebaton->dpienv->allocDescriptor(LobDescriptorType);
          }
          break;
        }
      }
    }
    ebaton->defines      = njsRS->defineBuffers_;
    Connection::DoFetch(ebaton);

    if(ebaton->rowsFetched != getRowsBaton->numRows)
      njsRS->rsEmpty_ = true;
  }
  catch (dpi::Exception &e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(), njsRS->njsconn_->getDpiConn() );
    getRowsBaton->error = std::string (e.what());
  }
  exitAsyncGetRows:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of GetRows method

   PARAMETERS:
     req - UV queue work block
*/
void ResultSet::Async_AfterGetRows(uv_work_t *req)
{
  Nan::HandleScope scope;

  rsBaton *getRowsBaton = (rsBaton*)req->data;
  Nan::TryCatch tc;
  Local<Value> argv[2];

  if(!(getRowsBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(Nan::New<v8::String>((getRowsBaton->error).c_str()).ToLocalChecked());
    argv[1] = Nan::Undefined();
  }
  else
  {
    argv[0]           = Nan::Undefined();

    eBaton* ebaton               = getRowsBaton->ebaton;
    ebaton->outFormat            = getRowsBaton->njsRS->outFormat_;
    Local<Value> rowsArray       = Nan::New<v8::Array>(0),
                 rowsArrayValue  = Nan::Null();

    if(ebaton->rowsFetched)
    {
      rowsArray = Connection::GetRows(ebaton);
      if(!(ebaton->error).empty())
      {
        argv[0] = v8::Exception::Error(Nan::New<v8::String>((ebaton->error).c_str()).ToLocalChecked());
        argv[1] = Nan::Undefined();
        goto exitAsyncAfterGetRows;
      }
      rowsArrayValue =  Local<Array>::Cast(rowsArray)->Get(0);
    }
    argv[1] = (getRowsBaton->fetchMultiple) ? rowsArray : rowsArrayValue;
  }

  exitAsyncAfterGetRows:
  if(!getRowsBaton->errOnActiveOrInvalid)
  {
    getRowsBaton->njsRS->state_ = INACTIVE;
  }

  Local<Function> callback = Nan::New(getRowsBaton->ebaton->cb);
  delete getRowsBaton;
  Nan::MakeCallback(Nan::GetCurrentContext()->Global(),
                  callback, 2, argv);
  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
     Close method

   PARAMETERS:
     info - Callback
*/
NAN_METHOD(ResultSet::Close)
{

  Local<Function> callback;
  NJS_GET_CALLBACK ( callback, info );

  ResultSet *njsResultSet = Nan::ObjectWrap::Unwrap<ResultSet>(info.Holder());

  /* If njsResultSet is invalid from JS, then throw an exception */
  NJS_CHECK_OBJECT_VALID2 ( njsResultSet, info );

  rsBaton   *closeBaton = new rsBaton ( njsResultSet->njsconn_->RSCount (),
                                        callback );
  closeBaton->njsRS = njsResultSet;

  if(njsResultSet->state_ == INVALID)
  {
    closeBaton->error = NJSMessages::getErrorMsg ( errInvalidResultSet );
    // donot alter the state while exiting
    closeBaton->errOnActiveOrInvalid = true;
    goto exitClose;
  }
  else if(njsResultSet->state_ == ACTIVE)
  {
    closeBaton->error = NJSMessages::getErrorMsg ( errBusyResultSet );
    // donot alter the state while exiting
    closeBaton->errOnActiveOrInvalid = true;
    goto exitClose;
  }
  njsResultSet->state_ = ACTIVE;

  NJS_CHECK_NUMBER_OF_ARGS ( closeBaton->error, info, 1, 1, exitClose );

  if(!njsResultSet->njsconn_->isValid())
  {
    closeBaton->error = NJSMessages::getErrorMsg ( errInvalidConnection );
    goto exitClose;
  }


exitClose:
  closeBaton->req.data = (void *)closeBaton;

  int status = uv_queue_work(uv_default_loop(), &closeBaton->req,
               Async_Close, (uv_after_work_cb)Async_AfterClose);
  // delete the Baton if uv_queue_work fails
  if ( status )
  {
    delete closeBaton;
    string error = NJSMessages::getErrorMsg ( errInternalError,
                                              "uv_queue_work",
                                              "ResultSetClose" );
    NJS_SET_EXCEPTION(error.c_str(), error.length());
  }

  info.GetReturnValue().SetUndefined();
}

/*****************************************************************************/
/*
   DESCRIPTION
     Worker function of close.

   PARAMETERS:
     req - UV queue work block

   NOTES:
     DPI call execution.
*/
void ResultSet::Async_Close(uv_work_t *req)
{
  rsBaton *closeBaton = (rsBaton*)req->data;
  if(!closeBaton->error.empty()) goto exitAsyncClose;

  try
  {
    closeBaton-> njsRS-> dpistmt_-> release ();

    Define* defineBuffers = closeBaton-> njsRS-> defineBuffers_;
    unsigned int numCols  = closeBaton-> njsRS-> numCols_;
    if(defineBuffers)
    {
      ResultSet::clearFetchBuffer(defineBuffers, numCols);
      closeBaton-> njsRS-> defineBuffers_ = NULL;
    }

    if ( closeBaton->njsRS->fetchAsStringTypes_ )
    {
      free ( closeBaton->njsRS->fetchAsStringTypes_ ) ;
      closeBaton->njsRS->fetchAsStringTypes_ = NULL;
    }
    if ( closeBaton->njsRS->fetchInfo_ )
    {
      delete [] closeBaton->njsRS->fetchInfo_;
      closeBaton->njsRS->fetchInfo_ = NULL;
    }
  }
  catch(dpi::Exception& e)
  {
    NJS_SET_CONN_ERR_STATUS ( e.errnum(),
                          closeBaton->njsRS->njsconn_->getDpiConn() );
    closeBaton->error = std::string(e.what());
  }
  exitAsyncClose:
  ;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Callback function of close

   PARAMETERS:
     req - UV queue work block
*/
void ResultSet::Async_AfterClose(uv_work_t *req)
{
  Nan::HandleScope scope;
  rsBaton *closeBaton = (rsBaton*)req->data;

  Nan::TryCatch tc;

  Local<Value> argv[1];

  if(!(closeBaton->error).empty())
  {
    argv[0] = v8::Exception::Error(Nan::New<v8::String>((closeBaton->error).c_str()).ToLocalChecked());
    if(!closeBaton->errOnActiveOrInvalid)
    {
      closeBaton->njsRS->state_ = INACTIVE;
    }
  }
  else
  {
    argv[0] = Nan::Undefined();
    // resultset is not valid after close succeeds.
    closeBaton-> njsRS-> state_ = INVALID;
  }
  Local<Function> callback = Nan::New(closeBaton->ebaton->cb);
  delete closeBaton;
  Nan::MakeCallback( Nan::GetCurrentContext()->Global(), callback, 1, argv );
  if(tc.HasCaught())
  {
    Nan::FatalException(tc);
  }
}

/*****************************************************************************/
/*
   DESCRIPTION
    Free FetchBuffers

   PARAMETERS:
    defineBuffers    -  Define bufferes from njsResultSet,
    numCols          -  # of columns
*/
void ResultSet::clearFetchBuffer( Define* defineBuffers, unsigned int numCols)
{
   for( unsigned int i=0; i<numCols; i++ )
   {
     if ( defineBuffers[i].dttmarr )
     {
       defineBuffers[i].dttmarr->release ();
       defineBuffers[i].extbuf = NULL;
     }
     free(defineBuffers[i].buf);
     free(defineBuffers[i].len);
     free(defineBuffers[i].ind);
   }
   delete [] defineBuffers;
   defineBuffers = NULL;
}

/* end of file njsPool.cpp */

