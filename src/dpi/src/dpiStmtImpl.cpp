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

#ifndef ORATYPES
# include <oratypes.h>
#endif

#ifndef DPISTMTIMPL_ORACLE
# include <dpiStmtImpl.h>
#endif

#ifndef DPICONNIMPL_ORACLE
# include <dpiConnImpl.h>
#endif

#ifndef DPIDATETIMEARRAYIMPL_ORACLE
#include <dpiDateTimeArrayImpl.h>
#endif

#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif


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
      env          - global env object
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
StmtImpl::StmtImpl (EnvImpl *env, OCIEnv *envh, ConnImpl *conn,
                    OCISvcCtx *svch, const string &sql)

  try : conn_(conn), errh_(NULL), svch_(svch),
        stmth_(NULL), numCols_ (0),meta_(NULL), stmtType_ (DpiStmtUnknown)

{
  // create an OCIError object for this execution
  ociCallEnv (OCIHandleAlloc ((void *)envh, (dvoid **)&errh_,
                               OCI_HTYPE_ERROR, 0, (dvoid **)0), envh);

  // Prepare OCIStmt object with given sql statement.
  ociCall (OCIStmtPrepare2 (svch_, &stmth_, errh_, (oratext *)sql.data(),
                            (ub4)sql.length(), NULL, 0, OCI_NTV_SYNTAX,
                            OCI_DEFAULT),
           errh_);
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

  return stmtType_;
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
DPI_SZ_TYPE StmtImpl::rowsAffected () const
{
  DPI_SZ_TYPE  rowsAffected = 0;

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
    bind the variable(s) by pdpition

  PARAMETERS
    pos           - pdpition of the variable 1 based
    type          - Data type
    buf (IN/OUT)  - data buffer for the variable's value
    bufSize       - size of the buffer
    ind (OUT)     - indicator
    bufLen (OUT)  - size of data reutnred

  RETURNS
    -NONE-
*/
void StmtImpl::bind (unsigned int pos, unsigned short type, void *buf,
                     DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen)
{
  OCIBind *b = (OCIBind *)0;

  ociCall (DPIBINDBYPOS (stmth_, &b, errh_, pos, buf, bufSize, type, ind,
                         bufLen, NULL, 0, NULL, OCI_DEFAULT),
           errh_);
}


/*****************************************************************************/
/*
    DESCRIPTION
      Bind the variable by name

    PARAMETERS
      name         - name of the variable
      nameLen      - len of name.
      type         - data type
      buf (IN/OUT) - data buffer for value
      bufSize      - size of buffer
      ind          - indicator
      bufLen       - returned buffer size
*/
void StmtImpl::bind (const unsigned char *name, int nameLen,
                     unsigned short type, void *buf, DPI_SZ_TYPE bufSize,
                     short *ind, DPI_BUFLEN_TYPE *bufLen)
{
  OCIBind *b = (OCIBind *)0;

  ociCall (DPIBINDBYNAME (stmth_, &b, errh_, name, nameLen,
                          buf, bufSize, type, ind, bufLen,
                          NULL, 0, NULL, OCI_DEFAULT), errh_);
}


/****************************************************************************/
/*
    DESCRIPTION
      Execute the SQL statement.

    PARAMETERS
      isAutoCommit   - true/false - autocommit enabled or not
      numIterations  - iterations to repeat

    RETURNS:
      -None-
*/
void StmtImpl::execute (int numIterations,  bool isAutoCommit)
{
  ub4 mode = isAutoCommit ? OCI_COMMIT_ON_SUCCESS : OCI_DEFAULT;

  ociCall (OCIStmtExecute ( svch_, stmth_, errh_, (ub4)numIterations, (ub4)0,
                            (OCISnapshot *)NULL, (OCISnapshot *)NULL, mode),
           errh_ );

#if OCI_MAJOR_VERSION < 12
  if ( isDML () && !conn_->hasTxn () )
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

  RETURNS
    -None-
*/
void StmtImpl::define (unsigned int pos, unsigned short type, void *buf,
                       DPI_SZ_TYPE bufSize, short *ind, DPI_BUFLEN_TYPE *bufLen)
{
  OCIDefine *d = (OCIDefine *)0;
  ociCall (DPIDEFINEBYPOS (stmth_, &d, errh_, pos, buf, bufSize, type,
                           (void *)ind, bufLen, NULL,
                           OCI_DEFAULT),
           errh_);
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
    -None-

  RETURNS
    -None-
*/
const MetaData* StmtImpl::getMetaData ()
{
  numCols();

  if (!numCols_)
    return NULL;

  ub4       col = 0;
  OCIParam *colDesc = (OCIParam *) 0;

  meta_ = new MetaData[numCols_];

  while (col < numCols_)
  {
    ociCall(OCIParamGet((void *)stmth_, OCI_HTYPE_STMT, errh_,
                        (void **)&colDesc, (ub4) (col+1)), errh_ );
    ociCall(OCIAttrGet((void*) colDesc, (ub4) OCI_DTYPE_PARAM,
                       (void**) &(meta_[col].colName),
                       (ub4 *) &(meta_[col].colNameLen),
                       (ub4) OCI_ATTR_NAME,errh_ ), errh_ );
    ociCall(OCIAttrGet((void*) colDesc, (ub4) OCI_DTYPE_PARAM,
                       (void*) &(meta_[col].dbType),(ub4 *) 0,
                       (ub4) OCI_ATTR_DATA_TYPE,
                       errh_ ), errh_ );
    ociCall(OCIAttrGet((void*) colDesc, (ub4) OCI_DTYPE_PARAM,
                       (void*) &(meta_[col].dbSize),(ub4 *) 0,
                       (ub4) OCI_ATTR_DATA_SIZE,
                       errh_ ), errh_ );
    ociCall(OCIAttrGet((void*) colDesc, (ub4) OCI_DTYPE_PARAM,
                       (void*) &(meta_[col].isNullable),(ub4*) 0,
                       (ub4) OCI_ATTR_IS_NULL,
                       errh_ ), errh_ );
    if (meta_[col].dbType == DpiNumber || meta_[col].dbType == DpiBinaryFloat
           ||meta_[col].dbType == DpiBinaryDouble )
    {
      ociCall(OCIAttrGet((void*) colDesc, (ub4) OCI_DTYPE_PARAM,
                         (void*) &(meta_[col].precision),(ub4* ) 0,
                         (ub4) OCI_ATTR_PRECISION,
                         errh_ ), errh_ );
      ociCall(OCIAttrGet((void*) colDesc, (ub4) OCI_DTYPE_PARAM,
                         (void*) &(meta_[col].scale),(ub4*) 0,
                         (ub4) OCI_ATTR_SCALE,
                         errh_ ), errh_ );
    }
    OCIDescriptorFree( colDesc, OCI_DTYPE_PARAM);
    col++;
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
    ociCall ( OCIStmtRelease (stmth_, errh_, NULL, 0, OCI_DEFAULT), errh_ );
    stmth_ = NULL;
  }
  if ( errh_)
  {
    OCIHandleFree (errh_, OCI_HTYPE_ERROR);
    errh_ = NULL;
  }
}




/* end of file dpiStmtImpl.cpp */
