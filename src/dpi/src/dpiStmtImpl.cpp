/* Copyright (c) 2015, 2016, Oracle and/or its affiliates.
   All rights reserved. */

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
 *   dpiConnImpl.cpp - ConnImpl class implementation
 *
 * DESCRIPTION
 *   This file implements the ConnImpl class which provides the implemenation
 *   of the Conn abstract class.
 *
 * NOTES
 *   DPI layer encapsulating OCIStmt object to allow multiple parallel sql
 *   execution from same connection to go through.  Each dpiStmtImpl will have
 *   its own OCIError object and this will be destroyed at the end of execution
 *
 *****************************************************************************/

#ifndef DPISTMTIMPL_ORACLE
# include <dpiStmtImpl.h>
#endif

#ifndef DPICONNIMPL_ORACLE
# include <dpiConnImpl.h>
#endif

#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif

#ifndef DPIDATETIMEARRAYIMPL_ORACLE
#include <dpiDateTimeArrayImpl.h>
#endif

#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif

#include <stdlib.h>

#include <iostream>

using namespace std;


/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
    DESCRIPTION
      Constructor for StmtImpl class created by Connection object.

    PARAMETERS:
      envh         - OCIEnv handle
      conn         - parent connImpl object
      svch         - OCISvcCtx handle
      sql          - sql statement to execute

    RETURN
      -NONE-

    NOTE:
      wrapper of OCIStmt handle to allow multiple executions to go through
      single connection parent object from multiple thread(s).
      Each StmtImpl creates and uses OCIError handle and this will be destroyed
      at the end of the execution.
      # of parallel threads can be configured at nodejs level.
*/
StmtImpl::StmtImpl (OCIEnv *envh, ConnImpl *conn,
                    OCISvcCtx *svch, const string &sql)

  try : conn_(conn), errh_(NULL), svch_(svch),
        stmth_(NULL), numCols_ (0),meta_(NULL), stmtType_ (DpiStmtUnknown),
        isReturning_(false), isReturningSet_(false), refCursor_(false),
        state_(DPI_STMT_STATE_UNDEFINED)
{
  void *errh  = NULL;
  void *stmth = NULL;
  // create an OCIError object for this execution
  ociCallEnv (OCIHandleAlloc ((void *)envh, &errh,
                               OCI_HTYPE_ERROR, 0, (dvoid **)0), envh);
  errh_ = ( OCIError * ) errh;

  if(!sql.empty())
  {
    // Prepare OCIStmt object with given sql statement.
    ociCall (OCIStmtPrepare2 (svch_, &stmth_, errh_, (oratext *)sql.c_str(),
                              (ub4)sql.length(), NULL, 0, OCI_NTV_SYNTAX,
                              OCI_DEFAULT),
             errh_);
  }
  else
  {
    //  to build empty stmt object used for ref cursors.
    ociCall (OCIHandleAlloc ((void *)envh, (dvoid **)&stmth,
                             OCI_HTYPE_STMT,0, (dvoid **)0), errh_);
    stmth_ = ( OCIStmt * ) stmth;
    refCursor_ = true;
  }
}
catch (...)
{
  cleanup ();
  throw;
}


/*****************************************************************************/
/*
    DESCRIPTION
      Destructor for the StmtImpl class.

    PARAMETERS
      -NONE-

    RETURNS:
      -NONE_

*/
StmtImpl::~StmtImpl ()
{
  cleanup ();
}


/*****************************************************************************/
/*
    DESCRIPTION
      Get Statement type

    PARAMETERS
      -NONE_

    RETURNS
      DpiStmtType enum
*/
DpiStmtType StmtImpl::stmtType () const
{
  // Try to query the statement type only once.
  if ( stmtType_ == DpiStmtUnknown )
  {
    ociCall (OCIAttrGet (stmth_, OCI_HTYPE_STMT, (ub2 * )&stmtType_, NULL,
                         OCI_ATTR_STMT_TYPE, errh_), errh_);
  }

  return (DpiStmtType)stmtType_;
}


/*****************************************************************************/
/*
    DESCRIPTION
      Get the numbers of rows affected by the DML operation.

    PARAMETERS
      -None-

    RETURNS:
      number of rows affected by the DML operation

*/
DPI_USZ_TYPE StmtImpl::rowsAffected () const
{
  DPI_USZ_TYPE  rowsAffected = 0;

  ociCall (OCIAttrGet (stmth_, OCI_HTYPE_STMT, &rowsAffected, NULL,
                       DPIATTRROWCOUNT, errh_), errh_);

  return rowsAffected;
}


/*****************************************************************************/
/*
  DESCRIPTION
    Number of columns that will be returned by this statement execution

  PARAMETERS
    -NONE-

  RETURNS
    # of columns

*/
unsigned int StmtImpl::numCols ()
{
  if (numCols_)
    return numCols_;

  ociCall (OCIAttrGet (stmth_, OCI_HTYPE_STMT, &numCols_, 0,
                       OCI_ATTR_PARAM_COUNT, errh_), errh_);

  return numCols_;
}


/*****************************************************************************/
/*
  DESCRIPTION
    Prefetch Rows set on statement handle

  PARAMETERS
    prefetchRows count

  RETURNS
    NONE

*/
void StmtImpl::prefetchRows (unsigned int prefetchRows)
{
  ociCall(OCIAttrSet(stmth_, OCI_HTYPE_STMT,  &prefetchRows,  0,
                     OCI_ATTR_PREFETCH_ROWS, errh_), errh_);
}




/*****************************************************************************/
/*
  DESCRIPTION
    bind the variable(s) by position

  PARAMETERS
    pos           - position of the variable 1 based
    type          - Data type
    buf (IN/OUT)  - data buffer for the variable's value
    bufSize       - size of the buffer
    ind (OUT)     - indicator
    bufLen (OUT)  - size of data reutnred
    maxarr_len    - max size of array in case of index-array bind (IN)
    curelen       - current array length in case of array bind (IN)
    ctx           - application speficied data for callback if specified.

  RETURNS
    -NONE-
*/
void StmtImpl::bind (unsigned int pos, unsigned short type, void *buf,
                     DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen,
                     unsigned int maxarr_len, unsigned int *curelen,
                     DpiBindCallbackCtx *ctx)
{
  OCIBind *b = (OCIBind *)0;

  ociCall (DPIBINDBYPOS (stmth_, &b, errh_, pos,
                         (ctx ? NULL : (type==DpiRSet) ?
                           (void *)&(((StmtImpl*)buf)->stmth_) : buf),
                         (type == DpiRSet) ? 0 : bufSize, type,
                         (ctx ? NULL : ind),
                         (ctx ? NULL : bufLen),
                         NULL, maxarr_len, curelen,
                         (ctx) ? OCI_DATA_AT_EXEC : OCI_DEFAULT),
           errh_);

  if ( ctx )
  {
    // Register callback if app specified data provided.
    ociCall (OCIBindDynamic ( b, errh_, (void*)ctx,
                              StmtImpl::inbindCallback,
                              (void*)ctx, StmtImpl::outbindCallback ),
             errh_ );
  }
}


/*****************************************************************************/
/*
    DESCRIPTION
      Bind the variable by name

    PARAMETERS
      name         - name of the variable
      nameLen      - len of name.
      bndpos       - position in array in case of DML Returning.
      type         - data type
      buf (IN/OUT) - data buffer for value
      bufSize      - size of buffer
      ind          - indicator
      bufLen       - returned buffer size
      maxarr_len   - max array len in case of PL/SQL array binds
      curelen      - current array len in case of PL/SQL array binds.
      ctx          - data for application specified callback
*/
void StmtImpl::bind (const unsigned char *name, int nameLen,
                     unsigned int bndpos,
                     unsigned short type, void *buf, DPI_SZ_TYPE bufSize,
                     short *ind, DPI_BUFLEN_TYPE *bufLen,
                     unsigned int maxarr_len, unsigned int *curelen,
                     DpiBindCallbackCtx *ctx)
{
  OCIBind *b = (OCIBind *)0;

  ociCall (DPIBINDBYNAME (stmth_, &b, errh_, name, nameLen,
                          (ctx ? NULL : (type == DpiRSet) ?
                            (void *)&((StmtImpl*)buf)->stmth_: buf),
                          (type == DpiRSet) ? 0 : bufSize, type,
                          (ctx ? NULL : ind),
                          (ctx ? NULL : bufLen),
                          NULL,
                          maxarr_len, curelen,
                          (ctx) ? OCI_DATA_AT_EXEC : OCI_DEFAULT), errh_);
  if ( ctx )
  {
    // Register callback if app specified data provided.
    ociCall (OCIBindDynamic (b, errh_, (void*)ctx, StmtImpl::inbindCallback,
                             (void *)ctx, StmtImpl::outbindCallback ),
              errh_ );
  }
}


/****************************************************************************/
/*
    DESCRIPTION
      Execute the SQL statement.

    PARAMETERS
      autoCommit     - true/false - autocommit enabled or not
      numIterations  - iterations to repeat

    RETURNS:
      -None-
*/
void StmtImpl::execute (int numIterations,  bool autoCommit)
{
  ub4 mode = autoCommit ? OCI_COMMIT_ON_SUCCESS : OCI_DEFAULT;

  ociCall (OCIStmtExecute ( svch_, stmth_, errh_, (ub4)numIterations, (ub4)0,
                            (OCISnapshot *)NULL, (OCISnapshot *)NULL, mode),
           errh_ );

#if OCI_MAJOR_VERSION < 12
  // Rollback on connection release for all non-select transactions.
  if ( ( stmtType_ != DpiStmtSelect ) && !conn_->hasTxn () )
  {
    /* Not to be reset, till thread safety is ensured in NJS */
    conn_->hasTxn (true );
  }
#endif
}





/****************************************************************************/
/*
  DESCRIPTION
    Release the SQL statement

  PARAMETERS
    -None-

  RETURNS
    -None-
*/
void StmtImpl::release ()
{
  conn_->releaseStmt ( this ) ;
}


/*****************************************************************************/
/*
  DESCRIPTION
    Define the variable by pdpition

  PARAMETERS
    pos         - pdpition of the variable
    type        - data type
    buf         - data buffer for the value
    bufSize     - size of the buffer
    ind         - indicator
    bufLen      - returned buffer size
    ctx         - application specified data for callbacks

  RETURNS
    -None-
*/
void StmtImpl::define (unsigned int pos, unsigned short type, void *buf,
                       DPI_SZ_TYPE bufSize, short *ind,
                       DPI_BUFLEN_TYPE *bufLen, DpiDefineCallbackCtx *ctx )
{
  OCIDefine *d = (OCIDefine *)0;
  ociCall (DPIDEFINEBYPOS (stmth_, &d, errh_, pos, buf, bufSize, type,
                           (void *)ind, bufLen, NULL,
                           (ctx ? OCI_DYNAMIC_FETCH : OCI_DEFAULT) ),
           errh_);

  if ((type == DpiClob) || (type == DpiBlob) || (type == DpiBfile))
  {
    boolean isLobPrefetchLength = true;

    ociCall(OCIAttrSet(d, OCI_HTYPE_DEFINE, &isLobPrefetchLength, 0,
                       OCI_ATTR_LOBPREFETCH_LENGTH, errh_), errh_);
  }

  if ( ctx )
  {
    // Register for callback if application specified data provided
    ociCall ( OCIDefineDynamic ( d, errh_, ctx, StmtImpl::defineCallback  ),
              errh_ );
  }
}



/****************************************************************************/
/*
  DESCRIPTION
    Fetch specified number of rows

  PARAMETERS
    numRows  - number of Rows to fetch

  RETURNS
    -None-
*/
void StmtImpl::fetch (unsigned int numRows)
{
  sword rc = OCIStmtFetch2 (stmth_, errh_, numRows, OCI_FETCH_NEXT, 0,
                            OCI_DEFAULT);

  if ( rc && rc != OCI_NO_DATA )
  {
    ociCall ( rc, errh_);
  }
}

/*****************************************************************************/
/*
  DESCRIPTION
    To obtain number of rows fetched in the last fetch call

  PARAMETERS
    -NONE-

  RETURNS
    unsigned int  - # of rows fetched.
*/
unsigned int StmtImpl::rowsFetched () const
{
  unsigned int rowsFetched = 0 ;

  ociCall (OCIAttrGet (stmth_, OCI_HTYPE_STMT, &rowsFetched,
                       0, OCI_ATTR_ROWS_FETCHED, errh_), errh_);

  return rowsFetched;
}


/*****************************************************************************/
/*
  DESCRIPTION
    obtains column meta data

  PARAMETERS
    extendedMetaData -  true  - all fields are populated
                        false - only column name, db type, size  is populated.

  RETURNS
    Pointer to MetaData struct.
*/

/*
 * The returned pointer to MetaData struct should not be freed by the caller
 * since this will be freed as part of StmtImpl::release()
 */
const MetaData* StmtImpl::getMetaData ( bool extendedMetaData )
{

  if ( !meta_ )
  {
    if ( numCols () )
    {
      ub4       col = 0;
      void *colDesc = (OCIParam *) 0;
      void *colName = NULL;

      meta_ = new MetaData[numCols_];
      if ( !meta_ )
      {
        throw ExceptionImpl ( DpiErrMemAllocFail ) ;
      }

      while (col < numCols_)
      {
        ociCall(OCIParamGet((void *)stmth_, OCI_HTYPE_STMT, errh_,
                            &colDesc, (ub4) (col+1)), errh_ );
        ociCall(OCIAttrGet(colDesc, (ub4) OCI_DTYPE_PARAM, &colName,
                           (ub4 *) &(meta_[col].colNameLen),
                           (ub4) OCI_ATTR_NAME,errh_ ), errh_ );
        meta_[col].colName = (unsigned char *) colName;
        ociCall(OCIAttrGet(colDesc, (ub4) OCI_DTYPE_PARAM,
                           (void*) &(meta_[col].dbType),(ub4 *) 0,
                           (ub4) OCI_ATTR_DATA_TYPE,
                           errh_ ), errh_ );
        switch (  meta_[col].dbType )
        {
          case DpiVarChar:
          case DpiFixedChar:
          case DpiRaw:
            // byteSize in case VARCHAR, FIXEDCHAR, RAW columns
            ociCall(OCIAttrGet(colDesc, (ub4) OCI_DTYPE_PARAM,
                               (void*) &(meta_[col].dbSize),(ub4 *) 0,
                               (ub4) OCI_ATTR_DATA_SIZE,
                               errh_ ), errh_ );
            break;

          default:
            break;
        }

        if ( extendedMetaData )
        {
          ociCall(OCIAttrGet(colDesc, (ub4) OCI_DTYPE_PARAM,
                             (void*) &(meta_[col].isNullable),(ub4*) 0,
                             (ub4) OCI_ATTR_IS_NULL,
                             errh_ ), errh_ );
          switch ( meta_[col].dbType )
          {
            case DpiNumber:
              ociCall(OCIAttrGet(colDesc, (ub4) OCI_DTYPE_PARAM,
                                 (void*) &(meta_[col].precision),(ub4* ) 0,
                                 (ub4) OCI_ATTR_PRECISION,
                                 errh_ ), errh_ );
              ociCall(OCIAttrGet(colDesc, (ub4) OCI_DTYPE_PARAM,
                                 (void*) &(meta_[col].scale),(ub4*) 0,
                                 (ub4) OCI_ATTR_SCALE,
                                 errh_ ), errh_ );
              break;

            case DpiTimestamp:
            case DpiTimestampTZ:
            case DpiTimestampLTZ:
              ociCall(OCIAttrGet(colDesc, (ub4) OCI_DTYPE_PARAM,
                                 (void*) &(meta_[col].scale),(ub4*) 0,
                                 (ub4) OCI_ATTR_SCALE,
                                 errh_ ), errh_ );
              break;

            default:
              break;
          }
        }

        OCIDescriptorFree( colDesc, OCI_DTYPE_PARAM);
        col++;
      }
    }
  }

  return meta_;
}




/*---------------------------------------------------------------------------
                          PRIVATE METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
  DESCRIPTION
    Cleanup routine for the StmtImpl class.

  PARAMETERS
    -NONE_

  RETURNS
    void
*/
void StmtImpl::cleanup ()
{
  if(meta_)
  {
    delete [] meta_;
    meta_ = NULL;
  }
  if ( stmth_)
  {
    // Release not called for ref cursor.
    if ( refCursor_ )
      OCIHandleFree ( stmth_, OCI_HTYPE_STMT );
    else
      ociCall ( OCIStmtRelease (stmth_, errh_, NULL, 0, OCI_DEFAULT), errh_ );

    stmth_ = NULL;
  }
  if ( errh_)
  {
    OCIHandleFree (errh_, OCI_HTYPE_ERROR);
    errh_ = NULL;
  }
}

/****************************************************************************/
/*
  DESCRIPTION
    Callback function for IN binds for Dynamic Binds used for DML Return
    This is OCI specific callback.
  PARAMETERS
    ctxp    - context (IN)
    bindp   - OCIBind pointer (IN)
    iter    - iteration. (IN)
    index   - index (rowcount) (IN)
    bufpp   - buffer pointer (INOUT)
    alenpp  - actual length (INOUT)
    piecep  - piece wise flag (INOUT)
    indpp   - indicator (INOUT)

  RETURNS
    OCI_CONTINUE

  NOTE:
    This function is a dummy function, the Dynamic bind concept is not used
    for IN binds, and so this function is dummy.
*/
sb4 StmtImpl::inbindCallback ( void *ctxp, OCIBind * /*bindp*/, ub4 /*iter*/,
                               ub4 /*index*/, void **bufpp, ub4 *alenpp,
                               ub1 *piecep, void **indpp )
{
  DpiBindCallbackCtx *cbCtx = (DpiBindCallbackCtx *)ctxp;

  cbCtx->nullInd = -1; /* inbind callback for DML RETURNING myst return null */

  *bufpp = (void *)0;
  *alenpp = 0;
  *indpp = (void *)&(cbCtx->nullInd);
  *piecep = OCI_ONE_PIECE;
  return OCI_CONTINUE;
}

/****************************************************************************/
/*
  DESCRIPTION
    Callback function for OUT binds for Dynamic Binds used for DML Return
    This is OCI specific callback.
  PARAMETERS
    ctxp    - context (IN)
    bindp   - OCIBind pointer (IN)
    iter    - iteration. (IN)
    index   - index (rowcount) (IN)
    bufpp   - buffer pointer (INOUT)
    alenpp  - actual length (INOUT)
    piecep  - piece wise flag (INOUT)
    indpp   - indicator (INOUT)
    rcodepp - return code pointer (INOUT) - NOT USED

  RETURNS
    OCI_CONTINUE

  NOTE:
    This function uses specified callback to allocate and identify blocks
    of memory for each cell.  ctxp provides the application specific callback
    and maxrows.
*/
sb4 StmtImpl::outbindCallback ( void *ctxp, OCIBind *bindp, ub4 iter,
                                ub4 index, void **bufpp, ub4 **alenp,
                                ub1 *piecep, void **indpp, ub2 **rcodepp )
{
  DpiBindCallbackCtx *cbCtx = (DpiBindCallbackCtx *)ctxp;
  ub4 rows  = 0;
  int cbret = 0;

  if ( index == 0 )
  {
    ub4 sz = sizeof ( rows ) ;
    sb4 rc = OCI_SUCCESS ;
    OCIError *errh = NULL;

    rc = OCIAttrGet ( bindp, OCI_HTYPE_BIND, &rows, (ub4 *)&sz,
                      OCI_ATTR_ROWS_RETURNED,
                      ((StmtImpl *)cbCtx->dpistmt)->errh_ ) ;

    if ( rc != OCI_SUCCESS )
    {
      errh = ((StmtImpl *)cbCtx->dpistmt)->errh_ ;      // preserve err handle

      // Cleanup
      free ( cbCtx ) ;
      cbCtx = NULL;

      // bail out
      ociCall ( rc, errh ) ;
    }

    cbCtx->nrows = ( unsigned long ) rows;
    cbCtx->iter  = iter;
  }

  /*
    Call the application specific callback to allocate and identify
    buffer for each row
  */
  cbret = (cbCtx->callbackfn)(cbCtx->data, cbCtx->nrows, cbCtx->bndpos,
                              iter, index, bufpp,
                              (void **)alenp, indpp, rcodepp, piecep );

  /* If the buffer is insufficient for varchar columns, error out */
  return (cbret == -1 ) ? OCI_ROWCBK_DONE : OCI_CONTINUE ;
}


/*****************************************************************************/
/*
  DESCRIPTION
    Callback function for CLOB columns to fetch data as STRING
    This is OCI specific callback

  PARAMETERS
    ctxp (IN)    - context for the callback
    definep (IN) - OCIDefine pointer
    iter (IN)    - iteration
    bufpp (INOUT)- to provide application specified memory block
    alenpp(INOUT)- length of buffer (IN provide max size and OUT data size)
    piecep (OUT) - piece wise flag
    indpp (INOUT)- to provide buffer for indicator
    rcodepp(INOUT) - to provide buffer for return code pointer -NOT USED

  RETURNS
    OCI_CONTINUE

  NOTES:
    This function uses specified callback to allocate and identify blocks of
    memory for each row.
*/
sb4 StmtImpl::defineCallback ( void *ctxp, OCIDefine *definep, ub4 iter,
                           void **bufpp, ub4 **alenpp, ub1 *piecep,
                           void **indpp, ub2 **rcodepp )
{
  sb4  rc = OCI_CONTINUE;
  int  cbret = 0 ;

  DpiDefineCallbackCtx *ctx = (DpiDefineCallbackCtx *)ctxp;

  cbret = ctx->callbackfn ( ctx, iter, bufpp, (void **) alenpp, (void**)indpp,
                            rcodepp );
  *piecep = OCI_NEXT_PIECE;  // always ask for next piece

  if ( cbret )
  {
    /*
     * In case of memory allocation failures return error to OCI, which will
     * lead to ORA-24343 - user defined callback error.
     */
    rc = OCI_ERROR;
  }

  return rc;
}


/*****************************************************************************/
/*
  DESCRIPTION
    TO determine if the current SQL statement has RETURNING INTO clause or not

  PARAMETERS
    -None-

  RETURNS
    true  - if the SQL statement has RETURNING INTO clause, falose otherwise

  NOTE:
    The OCI is is called only once to determine and the state is cahced.
*/
bool StmtImpl::isReturning ()
{
  if ( !isReturningSet_)
  {
    ub1 isReturning = FALSE;

    ociCall ( OCIAttrGet ( stmth_, OCI_HTYPE_STMT, (ub1*)&isReturning, NULL,
                           OCI_ATTR_STMT_IS_RETURNING, errh_), errh_ );
    isReturning_ = ( isReturning == TRUE ) ? true : false;
    isReturningSet_ = true;
  }


  return isReturning_;
}

/*****************************************************************************/
/*
   DESCRIPTION
     To obtain the OCI statement handle state

   PARAMETERS
     -None-

   RETURNS
     One of the possible values DpiStmtState
       (DpiStmtStateInitialized, DpiStmtStateExecute, DpiStmtEndOfFetch)
*/
unsigned int StmtImpl::getState ()
{
  if ( state_ == DPI_STMT_STATE_UNDEFINED )
  {
    ociCall (OCIAttrGet (stmth_, OCI_HTYPE_STMT, &state_, NULL,
                         OCI_ATTR_STMT_STATE, errh_ ), errh_ );
  }

  return ( unsigned int ) state_;
}


/* end of file dpiStmtImpl.cpp */
