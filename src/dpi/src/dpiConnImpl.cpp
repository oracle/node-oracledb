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

// Error numbers to set the drop_sess flag in sessionRelease()
// Sessions are in an unusable state and needs to be dropped
#define DPI_CONNERR_INVALID_SESS                  22
#define DPI_CONNERR_SESS_KILLED                   28
#define DPI_CONNERR_SESS_MARKED_KILL              31
#define DPI_CONNERR_SESS_TERM_NO_REPLY            45
#define DPI_CONNERR_ORA_NOT_LOGGED_ON             1012
#define DPI_CONNERR_MAX_IDLE_TIMEOUT              2396
#define DPI_CONNERR_DRCP_ILLEGAL_CALL             56600

#define DPI_MAX_VERSION_SIZE                      512

using namespace std;

// Initialize the static member variable
std::string ConnImpl::s_propPingName_ =  DPI_TIME_2_PING_NAME ;


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
     connClass     - DRCP Connection class string
     dbPriv        - DB Privileges (SYSDBA or none).

   RETURNS:
     nothing
 */

ConnImpl::ConnImpl(EnvImpl *env, OCIEnv *envh, bool externalAuth,
                   unsigned int stmtCacheSize,
                   const string &user, const string &password,
                   const string &connString, const string &connClass,
                   DBPrivileges dbPriv)

try :  env_(env), pool_(NULL),
       envh_(envh), errh_(NULL), auth_(NULL), svch_(NULL), sessh_(NULL),
       hasTxn_(false), csRatio_ (DPI_BEST_CASE_BYTE_CONVERSION_RATIO),
       lobCSRatio_(DPI_BEST_CASE_CHAR_CONVERSION_RATIO), srvh_(NULL),
       dropConn_(false), inTag_(""), outTag_(""), relTag_(""), retag_(false),
       tagMatched_ (false), pingInterval_(DPI_NO_PING_INTERVAL),
       lasttick_ ( NULL )
{

  this->initConnImpl ( false, externalAuth, connClass,
                       ( OraText * ) connString.c_str (),
                       ( ub4 ) connString.length (), user, password, "",
                       false, outTag_, tagMatched_, dbPriv );

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
     user            - username in case of non-homogenous pool
     password        - password in case of non-homogenous pool
     tag             - session tag name
     matchAny        - Match Tag name as MATCHANY or EXACT
     dbPriv          - DB privileges (SYSDBA or none)
     pingInterval    - duration in seconds to elapse before checking
                       the health of connection being dispensed.

   RETURNS:
     nothing

   NOTES:
     This constructor to be used in session-pool scenarios.
     For homogeneous pool, user, password should be empty string.
 */

ConnImpl::ConnImpl(PoolImpl *pool, OCIEnv *envh, bool externalAuth,
                   OraText *poolName, ub4 poolNameLen, const string& connClass,
                   const string &user, const string &password,
                   const string &tag, const boolean matchAny,
                   const DBPrivileges dbPriv, int pingInterval )

try :  env_(NULL), pool_(pool),
       envh_(envh), errh_(NULL), auth_(NULL),
       svch_(NULL), sessh_(NULL), hasTxn_(false),
       csRatio_ (DPI_BEST_CASE_BYTE_CONVERSION_RATIO),
       lobCSRatio_(DPI_BEST_CASE_CHAR_CONVERSION_RATIO), srvh_(NULL),
       dropConn_(false), inTag_ (""), outTag_(""), relTag_(""), retag_ (false),
       tagMatched_(false), pingInterval_ (pingInterval), lasttick_ ( NULL )
{
  this->initConnImpl ( true, externalAuth, connClass, poolName, poolNameLen,
                       user, password, tag, matchAny, outTag_, tagMatched_,
                       dbPriv );
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
     tag    - session tag name
     retag  - tagCLRTAG, tagNONE

   RETURNS:
     nothing

   NOTES:

 */

void ConnImpl::release( const string &tag, boolean retag )
{
  #if OCI_MAJOR_VERSION >= 12
    ociCall(OCIAttrGet(sessh_, OCI_HTYPE_SESSION, &hasTxn_, NULL,
                       OCI_ATTR_TRANSACTION_IN_PROGRESS, errh_), errh_);
  #endif

  if(hasTxn_)
    rollback();

  retag_ = retag;
  if ( retag )
  {
    relTag_ = tag; // Update release-tag with given value only if flag is set.
  }

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
     Gets the char expansion ratio for LOBs

   PARAMETERS:
     -NONE-

   RETURNS:
     Char expansion ratio (unsigned int)
 */
unsigned int ConnImpl::getLOBCharExpansionRatio ()
{
  return lobCSRatio_;
}

/*****************************************************************************/
/*
   DESCRIPTION
     Get the byte expansion ratio for non-LOB scenarios

   PARAMETERS:
     -NONE-

   RETURNS:
     Byte expansion ratio (int)
 */
unsigned int ConnImpl::getVarCharByteExpansionRatio ()
{
  return csRatio_;
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

void ConnImpl::lobPrefetchSize(unsigned int /* lobPrefetchSize */ )
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
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)clientId.c_str(),
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
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)module.c_str(),
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
  ociCall(OCIAttrSet(sessh_, OCI_HTYPE_SESSION, (void *)action.c_str(),
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
  StmtImpl *stmt = new StmtImpl ( envh_, this, svch_, sql);

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
      case DPI_CONNERR_DRCP_ILLEGAL_CALL:
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
     tag            - session tag name
     matchAny       - Match session tag name as MATCHANY or MATCHEXACT
     dbPriv         - DB Privileges (SYSDBA or none)

   RETURNS:
     nothing
 */

void ConnImpl::initConnImpl ( bool pool, bool externalAuth,
                   const string& connClass, OraText *poolNmRconnStr,
                   ub4 nameLen, const string &user, const string &password,
                   const string &tag, const boolean matchAny,
                   std::string & curTag, boolean &found, DBPrivileges dbPriv )
{
  ub4 mode           = OCI_DEFAULT;
  ub2 csid           = 0;
  void *errh         = NULL;
  void *auth         = NULL;
  OraText *retTag    = NULL ; // To fetch current tag on session
  ub4     retTagLen  = 0 ;    // current tag len
  int maxPingRetries = pool ? pool_->poolMax () + 1 : 1 ;

#if ( ( OCI_MAJOR_VERSION < 12 ) ||                             \
      ( OCI_MAJOR_VERSION == 12 && OCI_MINOR_VERSION < 2 ) )
  time_t curTime;
#endif

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
                           ( void * ) user.c_str (), ( ub4 ) user.length (),
                           OCI_ATTR_USERNAME, errh_ ), errh_ );

    ociCall ( OCIAttrSet ( ( void * ) auth_, OCI_HTYPE_AUTHINFO,
                           ( void * ) password.c_str (),
                           ( ub4 ) password.length (),
                           OCI_ATTR_PASSWORD, errh_ ), errh_ );
  }

  switch ( dbPriv )
  {
    case dbPrivSYSDBA:
      mode |= OCI_SESSGET_SYSDBA;
      break;

    case dbPrivNONE:
    default:
      break;
  }


  // If connection class provided, set it on auth handle
  if ( connClass.length () )
  {
    ociCall ( OCIAttrSet ( ( void* ) auth_, OCI_HTYPE_AUTHINFO,
                           ( void * ) connClass.c_str (),
                           ( ub4 ) connClass.length (),
                           OCI_ATTR_CONNECTION_CLASS, errh_ ), errh_ );
  }

  /* In case of Pool, we set the driver name on poolAuth_ handle in
   * Pool implimentation. For non-pooled connections we set it here.
   */
  if ( !pool &&  !(env_->drvName()).empty() )
  {
    ociCall ( OCIAttrSet ( (void*) auth_, OCI_HTYPE_AUTHINFO,
                           (OraText *) ( env_->drvName() ).c_str (),
                           ( ub4 ) ( ( env_->drvName() ).length () ),
                           OCI_ATTR_DRIVER_NAME, errh_ ), errh_);
  }

  /*
   * Applicable only on Pooled sessions - attempts to return a session with
   * specified tag
   *
   * If matchAny is false - then a session with a different tag is
   *                        never returned
   * if matchAny is true  - if such a session not available, available
   *                        untagged if no untagged is available, then any
   *                        tagged session is returned.  All returned sessions
   *                        are authenticated.
   *
   * tagMatched_ flag       will be true if such a tagged session was returned
   *                        false otherwise.
   */
  if ( pool && matchAny )
  {
    mode |= OCI_SESSGET_SPOOL_MATCHANY;
  }

#if ( ( OCI_MAJOR_VERSION < 12 ) ||                             \
      ( OCI_MAJOR_VERSION == 12 && OCI_MINOR_VERSION < 2 ) )
  curTime = time ( NULL ) ;               // current tick count
#endif

  for (int iter = 0; iter < maxPingRetries; iter ++ )
  {
    ociCall ( OCISessionGet ( envh_, errh_, &svch_, auth_, poolNmRconnStr,
                            ( ub4 ) nameLen, (OraText*)tag.c_str(),
                            (ub4) tag.length(),
                            &retTag,
                            &retTagLen,
                            &tagMatched_, mode ),
            errh_ );

    outTag_ = string ( (char *) retTag, retTagLen ) ;

    // session object from svch handle
    ociCall ( OCIAttrGet ( svch_, OCI_HTYPE_SVCCTX, &sessh_,  0,
                           OCI_ATTR_SESSION, errh_ ), errh_ );

#if ( (OCI_MAJOR_VERSION > 12)  ||   \
      ( OCI_MAJOR_VERSION == 12 && OCI_MINOR_VERSION >= 2 ) )
    break;
#else

    // For stand alone (non-pooled) connections and pingInterval set to
    // no-ping, exit the loop to return the session.
    if ( !pool || pingInterval_ < 0 )
      break;

    //
    // PingInterval elapsed implementation is available  only for
    //   pooled-connections and
    //   pingInterval_ is specified to check (-ve never check)
    //

    // Use the last stamped time set on the session to check for elapsed
    // This implementation is only of client versions < 12.2
    if ( pingInterval_ > 0 )
    {
      // get last tick count if any set from earlier release.
      // if none, 0 will be returned.
      ociCall ( OCIContextGetValue ( sessh_,
                                     errh_,
                                     (ub1 *)s_propPingName_.c_str(),
                                     (ub1)s_propPingName_.length(),
                                     (void **)&lasttick_ ), errh_ );

      // If the session is obtained firstime from pool, context value
      // will not be there, in that case, allocate and set it.
      if ( !lasttick_ )
      {
        ociCall ( OCIMemoryAlloc ( sessh_, errh_, (void **)&lasttick_,
                                   OCI_DURATION_SESSION, sizeof (long),
                                   OCI_MEMORY_CLEARED ), errh_ );
        sword ret = OCIContextSetValue ( sessh_, errh_, OCI_DURATION_SESSION,
                                       (ub1 *) s_propPingName_.c_str(),
                                       (ub1)s_propPingName_.length(),
                                       (void *) lasttick_ ) ;
        // In case if the allocated memory could not be associated with session
        // free the memory allocated and return error.
        // In case if succeeded, then the allocated memory will be deallocated
        // internally by OCI when the session is freed.
        if ( ret != OCI_SUCCESS )
        {
          OCIMemoryFree ( sessh_, errh_, lasttick_ );
          ociCall ( ret, errh_ );
        }
      }
      else if ( *lasttick_ > curTime )
      {
        // If time not elapsed => no need to ping
        break;
      }
    }

    // Check for aliveness of session
    if ( OCIPing ( svch_, errh_, OCI_DEFAULT ) == OCI_SUCCESS )
      break;

    // If session is not good, release it and drop from pool too.
    ociCall ( OCISessionRelease ( svch_, errh_, (OraText *)"", (sword)0,
                                  OCI_SESSRLS_DROPSESS ), errh_ ) ;
#endif
  }

  // Initialize the server handle from service handle
  ociCall ( OCIAttrGet ( svch_, OCI_HTYPE_SVCCTX, ( void * ) &srvh_, 0,
                          ( ub4 ) OCI_ATTR_SERVER, errh_ ), errh_ );

  // Get the DBCHARSET from server
  ociCall ( OCIAttrGet ( srvh_, ( ub4 ) OCI_HTYPE_SERVER, ( void * ) &csid,
                         ( ub4 * ) 0, ( ub4 ) OCI_ATTR_CHARSET_ID, errh_ ),
                          errh_ );

  // Client character set is always AL32UTF8
  if ( csid != DPI_AL32UTF8 )
  {
    csRatio_ = DPI_WORST_CASE_BYTE_CONVERSION_RATIO;
  }
  // Bug in LOB code, alwasy use worst case conversion ratio
  lobCSRatio_ = DPI_WORST_CASE_CHAR_CONVERSION_RATIO;
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

#if ( ( OCI_MAJOR_VERSION < 12 ) ||                   \
      ( OCI_MAJOR_VERSION == 12 && OCI_MINOR_VERSION < 2 ) )
    // The ping Interval and last-stamped-time is used to decide whether
    // to explicitly check for aliveness of the connection.
    // In 12.2 and above OCI has a different
    // light-weight ping mechanism and is always enabled, so this
    // implementation is only for Oracle Client library versions <= 12.1

    // Set the current time on the session to be used later whether
    // this time is elapsed against pingInterval_.
    if ( sessh_ )
    {
      // For Later use, update the session with current time only
      // if ping is desired.

      if ( pingInterval_ > 0 )
      {
        time_t curTime          = time ( NULL ) ;    // Current time in seconds
        *lasttick_              = (long) curTime + pingInterval_;
      }
    }
#endif

    // Re-tagging
    if( retag_ )
    {
      relMode |= OCI_SESSRLS_RETAG;
    }

    /*
     * RETAG behavior: (same as in OCI).
     *  if retag_ is TRUE & relTag_ length is non-zero, then relTag_ is set
     *  if retag_ is TRUE & relTag_ length is zero, then session-tag is cleared
     *  if retag_ is FALSE, then no action taken
     */

    OCISessionRelease(svch_, errh_, (OraText *)relTag_.c_str (),
                      (ub4) relTag_.length (), relMode);
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

