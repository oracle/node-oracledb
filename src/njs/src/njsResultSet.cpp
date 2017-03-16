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
     stmt         - dpi statement
     executeBaton - eBaton structure
     numCols      - number of columns
     mInfo        - an array of structs representing column info
*/
void ResultSet::setResultSet ( dpi::Stmt *stmt,   eBaton *executeBaton,
                               const unsigned int numCols,
                               const MetaInfo     *mInfo )
{
  this->dpistmt_ = stmt;
  this->dpienv_  = executeBaton->dpienv;
  this->njsconn_ = executeBaton->njsconn;
  this->numCols_ = numCols;

  this->jsParent_.Reset ( executeBaton->jsConn );

  /*
   * stmt can be NULL in REFCURSOR case, when the stored procedure
   * did not return a valid stmt handle
   */
  this->state_ = ( stmt ) ? NJS_INACTIVE : NJS_INVALID;

  this->outFormat_        = executeBaton->outFormat;
  this->fetchRowCount_    = 0;
  this->rsEmpty_          = false;
  this->defineBuffers_    = NULL;
  this->extDefines_.resize ( 0 ) ;
  this->extendedMetaData_ = executeBaton->extendedMetaData;
  this->mInfo_            = new MetaInfo [ this->numCols_ ];

  if ( !this->mInfo_ )
  {
      executeBaton->error = NJSMessages::getErrorMsg ( errInsufficientMemory );
      goto exitSetResultSet;
   }

   // In refCursor case mInfo can be NULL
  if ( mInfo )
  {
    for ( unsigned int col = 0; col < this->numCols_; col++ )
    {
      this->mInfo_[col] = mInfo[col];
    }
  }

exitSetResultSet:
  if ( !executeBaton->error.empty () )
  {
    if ( this->mInfo_ )
    {
      delete [] this -> mInfo_ ;
      this -> mInfo_ = NULL ;
    }
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
  Nan::Set(target, Nan::New<v8::String>("ResultSet").ToLocalChecked(),
           temp->GetFunction());
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
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }
  else if(njsResultSet->state_ == NJS_INVALID)
  {
    msg = NJSMessages::getErrorMsg ( errInvalidResultSet );
    NJS_SET_EXCEPTION ( msg.c_str() );
    info.GetReturnValue().SetUndefined();
    return;
  }

  Local<Value> meta = Connection::GetMetaData(
                                         njsResultSet->mInfo_,
                                         njsResultSet->numCols_,
                                         njsResultSet->extendedMetaData_ );

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
  else if(njsResultSet->state_ == NJS_INVALID)
    msg = NJSMessages::getErrorMsg(errInvalidResultSet);
  else
    msg = NJSMessages::getErrorMsg(errReadOnly, "metaData");
  NJS_SET_EXCEPTION ( msg.c_str() );
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

  Local<Object> jsConn = Nan::New ( njsResultSet->jsParent_ );
  rsBaton   *getRowsBaton = new rsBaton ( njsResultSet->njsconn_->RSCount (),
                                          callback, info.Holder(), jsConn );
  getRowsBaton->njsRS = njsResultSet;

  if(njsResultSet->state_ == NJS_INVALID)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errInvalidResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRow;
  }
  if(njsResultSet->state_ == NJS_ACTIVE)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errBusyResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRow;
  }
  njsResultSet->state_  = NJS_ACTIVE;

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

  Local<Object> jsConn = Nan::New ( njsResultSet->jsParent_ );
  rsBaton   *getRowsBaton = new rsBaton ( njsResultSet->njsconn_->RSCount (),
                                          callback, info.Holder(), jsConn );
  getRowsBaton->njsRS = njsResultSet;

  if(njsResultSet->state_ == NJS_INVALID)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errInvalidResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRows;
  }
  else if(njsResultSet->state_ == NJS_ACTIVE)
  {
    getRowsBaton->error = NJSMessages::getErrorMsg ( errBusyResultSet );
    // donot alter the state while exiting
    getRowsBaton->errOnActiveOrInvalid = true;
    goto exitGetRows;
  }
  njsResultSet->state_  = NJS_ACTIVE;

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
  ebaton->maxRows            = getRowsBaton->numRows;
  ebaton->dpistmt            = njsRS->dpistmt_;
  ebaton->getRS              = true;
  ebaton->dpienv             = njsRS->njsconn_->oracledb_->getDpiEnv();
  ebaton->outFormat          = njsRS->outFormat_;
  ebaton->njsconn            = njsRS->njsconn_;
  ebaton->dpiconn            = njsRS->njsconn_->getDpiConn();
  ebaton->numCols            = njsRS->numCols_;
  ebaton->mInfo              = njsRS->mInfo_;

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
    NJS_SET_EXCEPTION ( error.c_str() );
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
    // Allocate if not already done, or need more buffer
    if( !njsRS->defineBuffers_ ||
        njsRS->fetchRowCount_  < getRowsBaton->numRows )
    {
      if( njsRS->defineBuffers_ )
      {
        njsRS -> clearFetchBuffer( njsRS->fetchRowCount_ );
      }
      Connection::DoDefines( ebaton );
      if ( !ebaton->error.empty () )
      {
        getRowsBaton->error = ebaton->error;
        goto exitAsyncGetRows;
      }
      njsRS->fetchRowCount_ = getRowsBaton->numRows;
      njsRS->defineBuffers_ = ebaton->defines;

      njsRS->extDefines_.resize ( ebaton->numCols, NULL ) ;
      for ( unsigned int col = 0 ; col < ebaton->numCols ; col ++ )
      {
        njsRS->extDefines_[col] = ebaton->extDefines[col];
      }
    }
    else
    {
      // Buffers are reused except for LOB columns
      for (unsigned int col = 0; col < njsRS->numCols_; col++)
      {
       // In case of LOB column, descriptor would have been wrapped by
       // ProtoILob & njsIntLob and set the element to NULL, so reallocate
        switch( njsRS->mInfo_[col].dbType )
        {
        case dpi::DpiClob:
        case dpi::DpiBlob:
        case dpi::DpiBfile:
          for (unsigned int j = 0; j < ebaton->maxRows; j++)
          {
            if ( !( ((Descriptor **)(njsRS->defineBuffers_[col].buf))[j] ) )
            {
              ((Descriptor **)(njsRS->defineBuffers_[col].buf))[j] =
                ebaton->dpienv->allocDescriptor(LobDescriptorType);
            }
          }
          break;

        default:
          break;
        }
      }
    }
    ebaton->defines      = njsRS->defineBuffers_;
    ebaton->extDefines.resize ( ebaton->numCols, NULL ) ;
    for ( unsigned int col = 0 ; col < ebaton->numCols ; col ++ )
    {
      ebaton->extDefines[col] = njsRS->extDefines_[col];
      RESETEXTDEFINE4NEXTFETCH(ebaton->extDefines[col]);
    }
    Connection::DoFetch(ebaton);
    if ( !ebaton->error.empty () )
    {
      getRowsBaton->error = ebaton->error;
      goto exitAsyncGetRows;
    }

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
    argv[0] = v8::Exception::Error(
                   Nan::New<v8::String>(getRowsBaton->error).ToLocalChecked());
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
        argv[0] = v8::Exception::Error(
                        Nan::New<v8::String>(ebaton->error).ToLocalChecked());
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
    getRowsBaton->njsRS->state_ = NJS_INACTIVE;
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

  Local<Object> jsConn = Nan::New ( njsResultSet->jsParent_ );
  rsBaton   *closeBaton = new rsBaton ( njsResultSet->njsconn_->RSCount (),
                                        callback, info.Holder(), jsConn );
  closeBaton->njsRS = njsResultSet;

  if(njsResultSet->state_ == NJS_INVALID)
  {
    closeBaton->error = NJSMessages::getErrorMsg ( errInvalidResultSet );
    // donot alter the state while exiting
    closeBaton->errOnActiveOrInvalid = true;
    goto exitClose;
  }
  else if(njsResultSet->state_ == NJS_ACTIVE)
  {
    closeBaton->error = NJSMessages::getErrorMsg ( errBusyResultSet );
    // donot alter the state while exiting
    closeBaton->errOnActiveOrInvalid = true;
    goto exitClose;
  }
  njsResultSet->state_ = NJS_ACTIVE;

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
    NJS_SET_EXCEPTION ( error.c_str() );
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

    if(defineBuffers)
    {
      closeBaton -> njsRS -> clearFetchBuffer(
                                   closeBaton-> njsRS-> fetchRowCount_);
    }
    if ( closeBaton-> njsRS-> mInfo_ )
    {
      delete [] closeBaton->njsRS->mInfo_;
      closeBaton->njsRS->mInfo_ = NULL;
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
    argv[0] = v8::Exception::Error(
                   Nan::New<v8::String>(closeBaton->error).ToLocalChecked());
    if(!closeBaton->errOnActiveOrInvalid)
    {
      closeBaton->njsRS->state_ = NJS_INACTIVE;
    }
  }
  else
  {
    argv[0] = Nan::Undefined();
    // resultset is not valid after close succeeds.
    closeBaton-> njsRS-> state_ = NJS_INVALID;
  }

  /*
   * When we close the resultSet, we have to clear the reference of
   * its parent.
   */
  closeBaton->njsRS->jsParent_.Reset ();

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
void ResultSet::clearFetchBuffer( unsigned int numRows )
{
   for( unsigned int i=0; i<numCols_; i++ )
   {
     if ( defineBuffers_[i].dttmarr )
     {
       /* Date/Timestamp columns */
       defineBuffers_[i].dttmarr->release ();
       defineBuffers_[i].extbuf = NULL;
     }
     else if ( ( defineBuffers_[i].fetchType == DpiClob ) ||
                 ( defineBuffers_[i].fetchType == DpiBlob ) ||
                 ( defineBuffers_[i].fetchType == DpiBfile ) )
     {
       /* Lob columns */
       for (unsigned int j = 0; j < numRows; j++)
       {
         if (((Descriptor **)(defineBuffers_[i].buf))[j])
         {
           Env::freeDescriptor(((Descriptor **)(defineBuffers_[i].buf))[j],
                               LobDescriptorType);
         }
       }
     }
     else if ( ( ( defineBuffers_[i].fetchType == dpi::DpiVarChar ) &&
                 ( mInfo_[i].dbType == dpi::DpiClob ) ) ||
               ( ( defineBuffers_[i].fetchType == dpi::DpiRaw ) &&
                 ( mInfo_[i].dbType == dpi::DpiBlob ) ) )
     {
       /* CLOB-as-STRING or BLOB-as-BUFFER case */
       for ( unsigned int j = 0 ; j < numRows ; j ++ )
       {
         if ( ( (char **)defineBuffers_[i].buf)[j] )
         {
           free ( ( (char **)defineBuffers_[i].buf)[j] );
           ( ( char **)defineBuffers_[i].buf)[j] = NULL ;
         }
       }
     }

     free(defineBuffers_[i].buf);
     free(defineBuffers_[i].len);
     free(defineBuffers_[i].ind);

     if ( extDefines_[i] &&
          extDefines_[i]->extDefType == NJS_EXTDEFINE_CONVERT_LOB )
     {
       free ( extDefines_[i]->fields.extConvertLob.ctx ) ;
       free ( extDefines_[i]->fields.extConvertLob.len2 ) ;
       delete ( extDefines_[i] );
     }
     extDefines_.resize ( 0 ) ;
   }
   delete [] defineBuffers_;
   defineBuffers_ = NULL;
   extDefines_.clear ();
}

/* end of file njsPool.cpp */

