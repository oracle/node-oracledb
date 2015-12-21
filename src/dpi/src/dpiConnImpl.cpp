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
 *   This file implements the ConnImpl class which provides the implemenation of
 *   the Conn abstract class.
 *
 *****************************************************************************/

#ifndef DPICONNIMPL_ORACLE
# include <dpiConnImpl.h>
#endif

#ifndef DPISTMTIMPL_ORACLE
# include <dpiStmtImpl.h>
#endif


#ifndef DPIUTILS_ORACLE
# include <dpiUtils.h>
#endif

#ifndef DPIEXCEPTIONIMPL_ORACLE
# include <dpiExceptionImpl.h>
#endif

#include <iostream>

// Error numbers to set the drop_sess flag in sessionRelease()
#define DPI_CONNERR_INVALID_SESS                  22
#define DPI_CONNERR_SESS_KILLED                   28
#define DPI_CONNERR_SESS_MARKED_KILL              31
#define DPI_CONNERR_SESS_TERM_NO_REPLY            45
#define DPI_CONNERR_ORA_NOT_LOGGED_ON             1012
#define DPI_CONNERR_MAX_IDLE_TIMEOUT              2396

#define DPI_MAX_VERSION_SIZE                      512

using namespace std;


/*---------------------------------------------------------------------------
                           PUBLIC METHODS
  ---------------------------------------------------------------------------*/


/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the ConnImpl class created from an Env object.

   PARAMETERS:
     env           - parent Env object
     envh          - OCI envh
     stmtCacheSize - statement cache size
     user          - userid
     password      - password
     connString    - connect string

   RETURNS:
     nothing
 */

ConnImpl::ConnImpl(EnvImpl *env, OCIEnv *envh, bool externalAuth,
                   unsigned int stmtCacheSize,
                   const string &user, const string &password,
                   const string &connString, const string &connClass)

try :  env_(env), pool_(NULL),
       envh_(envh), errh_(NULL), auth_(NULL), svch_(NULL), sessh_(NULL),
       hasTxn_(false), srvh_(NULL), dropConn_(false)
{

  this->initConnImpl ( false, externalAuth, connClass,
                       ( OraText * ) connString.data (),
                       ( ub4 ) connString.length (), user, password );

  this->stmtCacheSize(stmtCacheSize);
}

catch (...)
{
  cleanup();
  throw;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the ConnImpl class created from a Pool object.

   PARAMETERS:
     pool            - parent Pool object
     envh            - OCI envh
     stmtCacheSize   - statement cache size
     poolName        - name of the pool
     poolNameLen     - length of pool name
     connectionClass - connection class.

   RETURNS:
     nothing

   NOTES:
     This constructor to be used in session-pool scenarios.
 */

ConnImpl::ConnImpl(PoolImpl *pool, OCIEnv *envh, bool externalAuth,
                   OraText *poolName, ub4 poolNameLen, const string& connClass
                   )

try :  env_(NULL), pool_(pool),
       envh_(envh), errh_(NULL), auth_(NULL),
       svch_(NULL), sessh_(NULL), hasTxn_(false), srvh_(NULL),
       dropConn_(false)
{
  this->initConnImpl ( true, externalAuth, connClass, poolName, poolNameLen,
                       "", "" );
}

catch (...)
{
  cleanup ();
  throw;
}


/*****************************************************************************/
/*
   DESCRIPTION
     Destructor for the ConnImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

ConnImpl::~ConnImpl()
{
  cleanup();
}



/*****************************************************************************/
/*
   DESCRIPTION
     Release the connection.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::release()
{
  #if OCI_MAJOR_VERSION >= 12
    ociCall(OCIAttrGet(sessh_, OCI_HTYPE_SESSION, &hasTxn_, NULL,
                       OCI_ATTR_TRANSACTION_IN_PROGRESS, errh_), errh_);
  #endif

  if(hasTxn_)
    rollback();

  if (pool_)
    pool_->releaseConnection(this);
  else if (env_)
    env_->releaseConnection(this);
}

/****************************************************************************
 * NAME
 *   releaseStmt
 *
 * DESCRIPTION
 *   To release Stmt object created
 *
 * PARAMETERS
 *   stmt  - DPI stmt object
 *
 * RETURNS
 *   -NONE-
 ****************************************************************************/
void ConnImpl::releaseStmt ( Stmt *stmt )
{
  if (stmt )
  {
    delete stmt;
  }
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set statement cache size.

   PARAMETERS:
     stmtCacheSize - statement cache size

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::stmtCacheSize(unsigned int stmtCacheSize)
{
  ociCall(OCIAttrSet(svch_, OCI_HTYPE_SVCCTX,  &stmtCacheSize,  0,
                     OCI_ATTR_STMTCACHESIZE, errh_), errh_);
}


/*****************************************************************************/
/*
   DESCRIPTION
     Get the DBCHARSET ID

   PARAMETERS:
     -NONE-

   RETURNS:
     Byte expansion ratio (int)
 */
int ConnImpl::getByteExpansionRatio ()
{
  return csratio_;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get statement cache size.

   PARAMETERS:
     none

   RETURNS:
     statement cache size

   NOTES:

 */

unsigned int ConnImpl::stmtCacheSize() const
{
  unsigned int  stmtCacheSize = 0;

  ociCall(OCIAttrGet(svch_, OCI_HTYPE_SVCCTX, &stmtCacheSize, NULL,
                     OCI_ATTR_STMTCACHESIZE, errh_), errh_);

  return stmtCacheSize;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set Lob prefetch size.

   PARAMETERS
     lobPrefetchSize - lob prefetch size

   RETURNS
     nothing

   NOTES:

 */

void ConnImpl::lobPrefetchSize(unsigned int lobPrefetchSize)
{
// Temporarily disable this attribute.
#if 0
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION,  &lobPrefetchSize,  0,
                     OCI_ATTR_DEFAULT_LOBPREFETCH_SIZE, errh_), errh_);
#endif
}



/*****************************************************************************/
/*
   DESCRIPTION
     Get  Lob prefetch size..

   PARAMETERS
     none

   RETURNS
     lob prefetch size

   NOTES:

 */

unsigned int ConnImpl::lobPrefetchSize() const
{
  unsigned int  lobPrefetchSize = 0;

  ociCall(OCIAttrGet(sessh_, OCI_HTYPE_SESSION, &lobPrefetchSize, NULL,
                     OCI_ATTR_DEFAULT_LOBPREFETCH_SIZE, errh_), errh_);

  return lobPrefetchSize;
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set client id.

   PARAMETERS:
     clientId - client id

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::clientId(const string &clientId)
{
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)clientId.data(),
                     (ub4)clientId.length(), OCI_ATTR_CLIENT_IDENTIFIER, errh_),
          errh_);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set the module.

   PARAMETERS:
     module - module

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::module(const string &module)
{
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)module.data(),
                     (ub4) module.length(), OCI_ATTR_MODULE, errh_), errh_);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Set action.

   PARAMETERS:
     action - action

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::action(const string &action)
{
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)action.data(),
                     (ub4) action.length(), OCI_ATTR_ACTION, errh_), errh_);
}



/*****************************************************************************/
/*
   DESCRIPTION
     Prepare & return the dpiStatement object

   PARAMETERS:
     sql - SQL statement

   RETURNS:
     nothing

   NOTES:

 */

Stmt* ConnImpl::getStmt (const string &sql)
{
  StmtImpl *stmt = new StmtImpl ( env_, envh_, this, svch_, sql);

  return stmt;
}


/*****************************************************************************/
/*
  DESCRIPTION
    Commit the transaction in progress

  PARAMETERS:
    -NONE-

  RETURNS
    -NONE_
*/
void ConnImpl::commit ()
{
  ociCall (OCITransCommit (svch_, errh_, OCI_DEFAULT), errh_);
}



/*****************************************************************************/
/*
  DESCRIPTION
    Rollback the transaction in progress

  PARAMETERS
    -NONE-

  RETUNRS:
    -NONE_
*/
void ConnImpl::rollback ()
{
  ociCall (OCITransRollback (svch_, errh_, OCI_DEFAULT), errh_);
}


/*****************************************************************************/
/*
  DESCRIPTION
    break (interrupt) the currently executing operation

  PARAMETERS
    -NONE-

  RETURNS:
    -NONE_
*/
void ConnImpl::breakExecution()
{
  if(svch_)
  {
    ociCall (OCIBreak (svch_, errh_), errh_);
  }
}

/*****************************************************************************/
/*
  DESCRIPTION
    set the flag if the non-recoverable error happens to connection

  PARAMETERS
    errNum  - Error number

  RETURNS:
    -NONE_
*/
void ConnImpl::setErrState ( int errNum )
{
  /*
   * This flag applicable for only Pool, non pooled connection anyway gets
   * terminated upon release. This code is NOT thread-safe. But, we are only
   * setting the flag to TRUE - multiple threads can try and only will update
   * to TRUE only, so it is okay setting this flag.
   */

  if ( pool_ )
  {
    switch ( errNum )
    {
      // Error numbers to set drop_sess flag
      case DPI_CONNERR_INVALID_SESS:
      case DPI_CONNERR_SESS_KILLED:
      case DPI_CONNERR_SESS_MARKED_KILL:
      case DPI_CONNERR_SESS_TERM_NO_REPLY:
      case DPI_CONNERR_ORA_NOT_LOGGED_ON:
      case DPI_CONNERR_MAX_IDLE_TIMEOUT:
        dropConn_ = true;
        break;

      default:
        break;
    }
  }
}


/*****************************************************************************/
/*
  DESCRIPTION
    To obtain the Oracle Database Server version

  PARAMETERS
    -None-

  RETURNS
    version
*/
unsigned int ConnImpl::getServerVersion ()
{
  ub4  oraServerVer = 0;
  char verbuf[ DPI_MAX_VERSION_SIZE ];

  ociCall ( OCIServerRelease ( svch_, errh_, (OraText *)verbuf,
                               (ub4) sizeof ( verbuf ),
                               (ub1) OCI_HTYPE_SVCCTX, &oraServerVer ),
              errh_ ) ;

  return oraServerVer;
}


/*---------------------------------------------------------------------------
                          PRIVATE METHODS
  ---------------------------------------------------------------------------*/

/*****************************************************************************/
/*
   DESCRIPTION
     Constructor for the ConnImpl class created from an Env object.

   PARAMETERS:
     pool           - This flag says whether pool scenario or not
     externalAuth   - flag for externalAuth
     connClass      - connClass name
     poolNmRconnStr - poolName or connectString
     user           - userid in case of non-pool scenario
     password       - password in case of non-pool scenario

   RETURNS:
     nothing
 */

void ConnImpl::initConnImpl ( bool pool, bool externalAuth,
                   const string& connClass, OraText *poolNmRconnStr,
                   ub4 nameLen, const string &user, const string &password )
{
  ub4 mode        = OCI_DEFAULT;
  ub2 csid        = 0;
  void *errh      = NULL;
  void *auth      = NULL;

  if ( pool )
    mode = externalAuth ? ( OCI_SESSGET_CREDEXT | OCI_SESSGET_SPOOL ) :
                            OCI_SESSGET_SPOOL;
  else
    mode = externalAuth ? OCI_SESSGET_CREDEXT : OCI_DEFAULT;

  ociCallEnv ( OCIHandleAlloc ( ( void * ) envh_, &errh,
                                OCI_HTYPE_ERROR, 0, ( dvoid ** ) 0 ), envh_ );
  errh_ = ( OCIError * ) errh;

  ociCallEnv ( OCIHandleAlloc ( ( void * ) envh_, &auth,
                                OCI_HTYPE_AUTHINFO, 0, ( dvoid ** ) 0 ),
                                envh_ );
  auth_ = ( OCIAuthInfo * ) auth;

  if ( externalAuth && ( !pool ) )
  {
    if ( password.length () || user.length () )
      throw ExceptionImpl ( DpiErrExtAuth );
  }

  if ( !pool )
  {
    ociCall ( OCIAttrSet ( ( void * ) auth_, OCI_HTYPE_AUTHINFO,
                           ( void * ) user.data (), ( ub4 ) user.length (),
                           OCI_ATTR_USERNAME, errh_ ), errh_ );

    ociCall ( OCIAttrSet ( ( void * ) auth_, OCI_HTYPE_AUTHINFO,
                           ( void * ) password.data (),
                           ( ub4 ) password.length (),
                           OCI_ATTR_PASSWORD, errh_ ), errh_ );
  }

  // If connection class provided, set it on auth handle
  if ( connClass.length () )
  {
    ociCall ( OCIAttrSet ( ( void* ) auth_, OCI_HTYPE_AUTHINFO,
                           ( void * ) connClass.data (),
                           ( ub4 ) connClass.length (),
                           OCI_ATTR_CONNECTION_CLASS, errh_ ), errh_ );
  }

  ociCall ( OCISessionGet ( envh_, errh_, &svch_, auth_, poolNmRconnStr,
                          ( ub4 ) nameLen, NULL, 0, NULL, NULL, NULL,
                          mode ), errh_ );

  ociCall ( OCIAttrGet ( svch_, OCI_HTYPE_SVCCTX, &sessh_,  0,
                         OCI_ATTR_SESSION, errh_ ), errh_ );

  // Initialize the server handle from service handle
  ociCall ( OCIAttrGet ( svch_, OCI_HTYPE_SVCCTX, ( void * ) &srvh_, 0,
                        ( ub4 ) OCI_ATTR_SERVER, errh_ ), errh_ );

  // Get the DBCHARSET from server
  ociCall ( OCIAttrGet ( srvh_, ( ub4 ) OCI_HTYPE_SERVER, ( void * ) &csid,
                         ( ub4 * ) 0, ( ub4 ) OCI_ATTR_CHARSET_ID, errh_ ),
                          errh_ );

  csratio_ = getCsRatio ( csid );
}

/*****************************************************************************/
/*
   DESCRIPTION
     Cleanup for the ConnImpl class.

   PARAMETERS:
     none

   RETURNS:
     nothing

   NOTES:
     The free OCI handles are set to NULL to so that in case someone tries to
     use a release Conn handle, they will get a reproducible seg-fault.
 */

void ConnImpl::cleanup()
{
  ub4 relMode      = OCI_DEFAULT;
  ub4 serverStatus = OCI_SERVER_NORMAL;

  if (svch_)
  {
    if ( pool_ )
    {
      // Get the connection status
      if ( !dropConn_ )
        ociCall ( OCIAttrGet ( ( void * ) srvh_, OCI_HTYPE_SERVER,
                               ( void * ) &serverStatus, ( ub4 * ) 0,
                               OCI_ATTR_SERVER_STATUS, errh_ ), errh_ );

      // Remove the session from pool in case of unusable
      if ( dropConn_ || ( serverStatus != OCI_SERVER_NORMAL ) )
        relMode |= OCI_SESSRLS_DROPSESS;
    }

    OCISessionRelease(svch_, errh_, NULL, 0, relMode);
    svch_ = NULL;
  }

  if (auth_)
  {
    OCIHandleFree (auth_, OCI_HTYPE_AUTHINFO);
    auth_ = NULL;
  }

  if (errh_)
  {
    OCIHandleFree(errh_, OCI_HTYPE_ERROR);
    errh_ = NULL;
  }
}




/* end of file dpiConnImpl.cpp */

